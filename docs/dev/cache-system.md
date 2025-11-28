# キャッシュシステム設計

**バージョン**: v0.4.4以降
**最終更新**: 2025-11-28

## 概要

UnifiedCacheDBは、カード情報を効率的にキャッシュするためのデータベースシステムです。Chrome Storage APIを使用してデータを永続化し、カード検索・詳細表示のパフォーマンスを向上させます。

## 背景

### 課題
- カード詳細情報の取得に時間がかかる（ネットワークアクセス）
- 同じカードの情報を何度も取得している（無駄な通信）
- TempCardDBとの重複したデータ構造

### 解決策
- UnifiedCacheDBによる統合キャッシュシステム
- stale-while-revalidate戦略の採用
- テーブル分割による効率的なデータ管理

## テーブル構造

### TableA: カード基本情報

**目的**: 検索・フィルタリング用の軽量データ

| フィールド | 型 | 説明 |
|-----------|---|------|
| cid | number | カードID（主キー） |
| name | string | カード名 |
| ruby | string | ルビ |
| imgs | string | 画像ID群（ciid） |
| cardType | string | カードタイプ |
| attr | string? | 属性（モンスターのみ） |
| race | string? | 種族（モンスターのみ） |
| level | number? | レベル/ランク/リンク |
| atk | number? | 攻撃力 |
| def | number? | 守備力 |
| scale | number? | ペンデュラムスケール |
| limitStatus | string? | 禁止制限 |
| fetchedAt | Date | 取得日時 |

**データサイズ**: 約1KB/カード

### TableB2: カードテキスト

**目的**: テキストデータの分離（容量削減）

| フィールド | 型 | 説明 |
|-----------|---|------|
| cid | number | カードID（主キー） |
| text | string | カードテキスト |
| pendText | string? | ペンデュラムテキスト |
| fetchedAt | Date | 取得日時 |

**データサイズ**: 約0.5KB/カード

**分離理由**:
- テキストは頻繁にアクセスされない
- TableAを軽量に保つことで検索性能を向上

### TableC: カード詳細情報

**目的**: 重い詳細情報の格納

| フィールド | 型 | 説明 |
|-----------|---|------|
| cid | number | カードID（主キー） |
| relatedCards | Card[] | 関連カード |
| faqList | FAQ[] | Q&A一覧 |
| productList | Product[] | 収録パック |
| fetchedAt | Date | 取得日時 |

**データサイズ**: 約5-20KB/カード（内容により変動）

**遅延ロード**:
- カード詳細タブを開いた時のみ取得
- 必要に応じてネットワークアクセス

## キャッシュ戦略

### stale-while-revalidate

「古いキャッシュを返しつつ、バックグラウンドで最新データを取得」する戦略。

#### フロー

```
1. キャッシュ確認
   ├─ キャッシュあり
   │  ├─ 即座に返す（高速）
   │  └─ バックグラウンドで最新データを取得
   │     └─ 取得完了後、キャッシュを更新
   └─ キャッシュなし
      └─ ネットワークから取得
         └─ キャッシュに保存
```

#### 実装例

```typescript
async function getCardDetail(cid: number): Promise<CardDetail> {
  // 1. キャッシュから取得（即座に返す）
  const cached = await UnifiedCacheDB.getCardDetail(cid);
  
  if (cached) {
    // 2. バックグラウンドで最新データを取得
    fetchLatestCardDetail(cid).then(latest => {
      UnifiedCacheDB.saveCardDetail(cid, latest);
    });
    
    return cached;
  }
  
  // 3. キャッシュがない場合はネットワークから取得
  const detail = await fetchLatestCardDetail(cid);
  await UnifiedCacheDB.saveCardDetail(cid, detail);
  return detail;
}
```

#### メリット
- **高速**: キャッシュがあれば即座にレスポンス
- **最新性**: バックグラウンドで更新
- **UX**: ユーザーを待たせない

### 自動クリーンアップ

古いキャッシュを定期的に削除してストレージ容量を最適化。

#### 削除基準
- **fetchedAt**が30日以上前のデータ
- ストレージ容量が閾値（例: 10MB）を超えた場合

#### 実装

```typescript
async function cleanupOldCache() {
  const threshold = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30日前
  
  for (const table of ['TableA', 'TableB2', 'TableC']) {
    const entries = await UnifiedCacheDB.getAll(table);
    
    for (const entry of entries) {
      if (entry.fetchedAt < threshold) {
        await UnifiedCacheDB.delete(table, entry.cid);
      }
    }
  }
}
```

## TempCardDBとの統合

### v0.4.0以前の問題
- TempCardDB: デッキ編集時の一時カード保存
- 既存キャッシュ: カード詳細情報のキャッシュ
- **重複したデータ構造**、**同期が困難**

### v0.4.1での統合
UnifiedCacheDBにTempCardDBを統合し、データ構造を統一。

#### 統合の利点
1. **データの一元管理**: 1つのDBで全てのカード情報を管理
2. **重複排除**: 同じカード情報を複数箇所に保存しない
3. **メモリ効率**: 無駄なメモリ使用を削減
4. **同期不要**: 常に最新のデータ構造

### v0.4.4でのTempCardDB自動保存機能

検索結果、関連カード、商品展開から取得したカード情報を、TempCardDBに自動保存する機能を追加しました。

#### 自動保存されるタイミング

1. **検索結果から**
   - `parseSearchResults()`でカード一覧を取得した際に自動保存
   - 対象: 検索画面のカード一覧

2. **関連カードから**
   - `saveCardDetailToCache()`でカード詳細をキャッシュする際、関連カードも自動保存
   - 対象: Relatedタブで表示されるカード

3. **商品展開から**
   - `searchCardsByPackId()`でパック内カードを取得した際に自動保存
   - 対象: Productsタブのパック展開で取得されるカード

#### 実装詳細

```typescript
// 検索結果からの自動保存
export function parseSearchResults(doc: Document): CardInfo[] {
  const cards: CardInfo[] = [];

  // ... カードのパース処理 ...

  // TempCardDBに保存（検索結果として取得したカードを保存）
  const tempCardDB = getTempCardDB();
  for (const card of cards) {
    tempCardDB.set(card.cardId, card);
  }

  return cards;
}

// カード詳細保存時の自動保存
export async function saveCardDetailToCache(
  unifiedDB: ReturnType<typeof getUnifiedCacheDB>,
  detail: CardDetail,
  forceUpdate: boolean = false
): Promise<void> {
  // UnifiedCacheDBに保存
  unifiedDB.setCardInfo(detail.card, forceUpdate);
  for (const relatedCard of detail.relatedCards) {
    unifiedDB.setCardInfo(relatedCard, forceUpdate);
  }

  // ... TableC保存処理 ...

  // TempCardDBにも保存（detail.cardと関連カード）
  const tempCardDB = getTempCardDB();
  tempCardDB.set(detail.card.cardId, detail.card);
  for (const relatedCard of detail.relatedCards) {
    tempCardDB.set(relatedCard.cardId, relatedCard);
  }
}
```

#### メリット

1. **デッキエクスポート時の高速化**
   - カード情報が既にメモリにあるため、ネットワークアクセス不要
   - エクスポート処理が即座に完了

2. **ネットワークアクセスの削減**
   - 一度取得したカード情報を再利用
   - 通信量の削減によるパフォーマンス向上

3. **シームレスなUX**
   - ユーザーは意識せずに高速な操作を体験
   - 検索→デッキ追加→エクスポートの流れがスムーズ

## パフォーマンス

### ベンチマーク

| 操作 | キャッシュなし | キャッシュあり | 改善率 |
|------|--------------|--------------|--------|
| カード検索 | 500ms | 50ms | 90% |
| カード詳細表示 | 800ms | 80ms | 90% |
| デッキロード | 2000ms | 300ms | 85% |

### ストレージ使用量

| データ | 容量 |
|--------|------|
| TableA (1000カード) | 1MB |
| TableB2 (1000カード) | 0.5MB |
| TableC (100カード) | 1-2MB |
| **合計** | 約2.5-3.5MB |

Chrome Storage Sync APIの上限: 100KB  
Chrome Storage Local APIの上限: 5MB（UnifiedCacheDBはLocalを使用）

## API設計

### 基本操作

```typescript
// カード基本情報を取得
const card = await UnifiedCacheDB.getCard(cid);

// カードテキストを取得
const text = await UnifiedCacheDB.getCardText(cid);

// カード詳細を取得
const detail = await UnifiedCacheDB.getCardDetail(cid);

// カード情報を保存
await UnifiedCacheDB.saveCard(cid, cardData);

// キャッシュをクリア
await UnifiedCacheDB.clearAll();
```

### 高度な操作

```typescript
// 複数カードを一括取得
const cards = await UnifiedCacheDB.getCardsBatch([cid1, cid2, cid3]);

// 検索条件でフィルタリング
const results = await UnifiedCacheDB.search({
  cardType: 'monster',
  attr: 'DARK',
  race: 'Spellcaster'
});

// キャッシュの有効期限チェック
const isStale = await UnifiedCacheDB.isStale(cid, maxAge);
```

## 今後の拡張

### Phase 2: オフライン対応
- Service Workerとの連携
- 完全オフラインでのデッキ編集

### Phase 3: 同期機能
- デバイス間でのキャッシュ同期
- Chrome Storage Sync APIの活用

### Phase 4: 予測的プリフェッチ
- ユーザーの行動パターンから次に必要なカードを予測
- アイドル時に自動プリフェッチ

## 関連ドキュメント

- [アーキテクチャ設計](./architecture.md)
- [データモデル](./data-models.md)
- [キャッシュDB設計（旧）](../design/cache-db.md)
