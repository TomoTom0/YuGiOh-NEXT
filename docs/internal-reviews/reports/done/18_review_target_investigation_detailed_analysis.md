# REQ-18 追加資料：詳細コード分析

## 重点確認事項の詳細説明

### 1. src/stores/deck-edit.ts の UUID管理システム

#### UUID生成の進化（コミット履歴）

**修正1: 出現回数カウント方式 (5ac1f96)**
```
問題: UUIDが重複する可能性があった
対応: 出現回数でカウントして重複を防ぐ
```

**修正2: インデックス追加 (9826f4b)**
```
問題: 出現回数方式でも不十分
対応: インデックスを追加して一意性を保証
新UUIDフォーマット: uuid or "${cid}-${index}"
```

**修正3: 永続化対応 (32328b3)**
```
問題: ブラウザリロード時にUUIDがリセット
対応: デッキ情報に含める永続化
新規カード: maxIndex + 1 で割り当て
```

**確認すべき項目**
- [ ] displayOrder 永続化の実装（deckInfoに含まれているか）
- [ ] 既存デッキのマイグレーション（古いフォーマット対応）
- [ ] UUID重複チェックのロジック確認
- [ ] 大量カード追加時のインデックス計算正確性

#### displayOrder 状態の同期問題

**懸念点**
```typescript
// 複数の状態が存在
deckInfo.ref: { mainDeck: [], extraDeck: [], sideDeck: [] }  // DeckCard[]
displayOrder.ref: { main: [], extra: [], side: [] }           // DisplayCard[]
```

**リスク**
- deckInfo に新規カード追加 → displayOrder に反映されない
- displayOrder からカード削除 → deckInfo に反映されない
- ブラウザリロード時の再初期化で順序がリセット

**確認すべき項目**
- [ ] deckInfo 更新時の displayOrder 更新タイミング
- [ ] 削除処理での両方への反映確認
- [ ] watch() で適切に同期されているか
- [ ] 保存時のバックアップと復元の整合性

---

### 2. src/api/card-search.ts の型エラー詳細

#### エラー1-2: url.match() の undefined check

**現在のコード（推定）**
```typescript
const fetchCardDetailByURL = (url?: string) => {
  // urlが undefined の可能性がある
  const ciidMatch = url.match(/ciid=(\d+)/);  // Error TS18048
  const encMatch = url.match(/enc=([^&]+)/);  // Error TS18048
};
```

**修正案A: Early return**
```typescript
if (!url) {
  throw new Error('URL is required');
}
const ciidMatch = url.match(/ciid=(\d+)/);
const encMatch = url.match(/enc=([^&]+)/);
```

**修正案B: Optional chaining + Nullish coalescing**
```typescript
const ciidMatch = url?.match(/ciid=(\d+)/) || [];
const encMatch = url?.match(/enc=([^&]+)/) || [];
```

**推奨**: 修正案A（意図が明確）

**確認すべき項目**
- [ ] url が undefined になるケースは存在するか
- [ ] 呼び出し元での null check は適切か
- [ ] エラーメッセージは有用か

---

#### エラー3-4: 未使用パラメータ doc

**現在のコード**
```typescript
function parseSpellCardFromDetailPage(doc: Document, base: CardBase, typeText: string): SpellCard {
  // doc パラメータが使用されていない
  // base と typeText のみで実装されている
}

function parseTrapCardFromDetailPage(doc: Document, base: CardBase, typeText: string): TrapCard {
  // doc パラメータが使用されていない
}
```

**原因の推測**
- 当初は Document を解析する計画だった
- 実装段階で別の方法（base データを使用）に変更
- docパラメータの削除が漏れた

**修正方法**
1. **方法A**: パラメータ削除（推奨）
   ```typescript
   function parseSpellCardFromDetailPage(base: CardBase, typeText: string): SpellCard
   ```
   - 呼び出し元を確認して doc の不要性を確実にする

2. **方法B**: 将来の拡張を想定して残す
   ```typescript
   function parseSpellCardFromDetailPage(doc: Document, base: CardBase, typeText: string): SpellCard
   // TODO: doc を使用した拡張実装
   ```

**確認すべき項目**
- [ ] doc パラメータが実際に不要か確認
- [ ] 呼び出し元で doc を渡しているか確認
- [ ] 削除した場合のリグレッション確認

---

#### エラー5: 未使用パラメータ tab

**現在のコード**
```typescript
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // tab パラメータが使用されていない
  // info のみで実装
});
```

**修正方法（ESLint推奨）**
```typescript
// 方法1: アンダースコア接頭辞で無視を明示
chrome.contextMenus.onClicked.addListener((info, _tab) => {
  // ...
});

// 方法2: デストラクチャリングで不要パラメータを省略（TypeScriptではできない）
```

**確認すべき項目**
- [ ] tab が実際に不要か確認
- [ ] 今後の実装で tab が必要になる可能性を検討

---

### 3. src/components/DeckMetadata.vue の構造問題

#### ファイルサイズの比較

```
DeckMetadata.vue    1010 行  ← 異常に大きい
CardList.vue         707 行
DeckSection.vue      444 行
CardDetail.vue       299 行
```

#### 含まれる機能（推定）
1. デッキ基本情報入力（名前、コメント）
2. カテゴリ設定（CategoryDialog統合）
3. タグ設定（TagDialog統合）
4. deckCode生成・表示
5. 複数のメタデータUI

**分割提案**

| 新ファイル | 責務 | 予想行数 |
|-----------|------|---------|
| DeckMetadata.vue | 基本情報入力 + レイアウト | 300 |
| DeckMetadataCategory.vue | カテゴリ設定（CategoryDialog） | 300 |
| DeckMetadataTag.vue | タグ設定（TagDialog） | 300 |
| DeckMetadataCode.vue | deckCode表示 | 100 |

**メリット**
- 各コンポーネントの責務が明確化
- テストがしやすい
- 再利用性が向上
- 開発時の競合が減少

**確認すべき項目**
- [ ] 現在のstate/props の依存関係を確認
- [ ] refactoring 後の通信フローに問題がないか
- [ ] 深い ref の更新監視が必要か確認

---

### 4. src/components/DeckSection.vue とdeck-edit.ts のロジック重複

#### 重複ロジック: カード移動可否判定

**deck-edit.ts**
```typescript
function canMoveCard(fromSection: string, toSection: string, card: CardInfo): boolean {
  // searchからtrashへは移動不可
  if (fromSection === 'search' && toSection === 'trash') {
    return false;
  }
  // 詳細ロジック...
}
```

**DeckSection.vue（推定）**
```typescript
function canDropToSection(draggedCard: CardInfo, targetSection: string): boolean {
  // 同様のロジック
  // ...
}
```

**統一提案**

```typescript
// deck-edit.ts に集約
export function canMoveCardBetweenSections(
  fromSection: string,
  toSection: string,
  card: CardInfo
): boolean {
  // 実装...
}

// DeckSection.vue で使用
import { canMoveCardBetweenSections } from '../stores/deck-edit';

const canDropToSection = (card, target) => {
  return canMoveCardBetweenSections(currentSection, target, card);
};
```

**メリット**
- ロジック重複の排除
- 動作の一貫性保証
- 保守性向上（変更時に1箇所だけ修正）

**確認すべき項目**
- [ ] 両者のロジックが本当に同じか確認
- [ ] API差異がないか確認
- [ ] 統一後のリグレッション確認

---

### 5. src/components/CardList.vue のソート機能

#### ソート対象のキー

```typescript
// 推定実装
const SORT_ORDER_TO_API_VALUE = {
  'name': 'シかな',
  'atk': 'ATK値',
  'def': 'DEF値',
  'type': 'カード種別',
  'race': '種族'
};
```

#### ソート処理の複雑度

**懸念点**
- 複数キーでのソート（例: 種別 → 攻撃力）
- ソート順序の保存
- テンプレート内でのループと組み合わせ

**確認すべき項目**
- [ ] 複数ソートキーの処理順序が正しいか
- [ ] 安定ソートか不安定ソートか確認
- [ ] 大量カード（200+）でのパフォーマンス測定
- [ ] ソート順序の永続化タイミング
- [ ] displayOrder との連携確認

---

## 追加確認項目チェックリスト

### ビルド・型安全性
- [ ] npm run type-check で全エラーが解消される
- [ ] npm run build でビルドエラーが発生しない
- [ ] npm run test:vitest でテスト失敗が大幅に減少

### 機能確認
- [ ] 新規デッキ作成時のUUID初期化
- [ ] 既存デッキ読み込み時のUUID永続化確認
- [ ] ドラッグ&ドロップでのアニメーション追跡
- [ ] ソート後の順序が画面に正確に反映
- [ ] フィルター + ソート の組み合わせ動作

### パフォーマンス
- [ ] 大量カード（200枚以上）でのレスポンス時間
- [ ] displayOrder 再計算時間
- [ ] ソート実行時間

### バージョン互換性
- [ ] v0.3.x デッキの読み込み確認
- [ ] UUID永続化によるマイグレーション
- [ ] 古いdeckCode形式の互換性

---

## 結論

### 最優先課題（ブロッカー）
1. **card-search.ts の型エラー修正** → npm run type-check をクリア
2. **deck-edit.ts の UUID永続化バグ確認** → v0.3.x 互換性を確保
3. **高リスク関数のロジック確認** → リグレッション防止

### 中期課題（v0.4.0 リリース前）
1. **DeckMetadata.vue の分割重構成** → 保守性向上
2. **DeckSection.vue とdeck-edit.ts のロジック統一** → バグ減少
3. **テストカバレッジ強化** → 信頼性向上

### 長期課題（v0.5.0+）
1. **Pinia store 設計の見直し** → displayOrder の永続化方式
2. **コンポーネント分割の全体最適化** → ファイル管理性改善
