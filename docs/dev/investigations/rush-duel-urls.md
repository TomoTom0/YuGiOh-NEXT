# Rush Duel対応: URL使用箇所調査結果

**調査日**: 2025-11-18
**目的**: OCG/Rush Duel両対応化のため、`yugiohdb`をハードコードしている箇所を洗い出す

## 📊 調査結果サマリー

### 変更が必要な箇所: 合計 **29ファイル**

- **ページ判定**: 1ファイル
- **API定義**: 4ファイル
- **コンポーネント**: 6ファイル
- **Content Scripts**: 6ファイル
- **ユーティリティ**: 2ファイル
- **バックグラウンド**: 2ファイル
- **その他**: 8ファイル（テスト、オプション、ポップアップ）

---

## 🔍 詳細調査結果

### 1. **ページ判定** (src/utils/page-detector.ts)

最重要ファイル。全ての正規表現で `/yugiohdb/` が使用されている。

```typescript
// 現在の実装
isDeckDisplayPage(): return /\/yugiohdb\/member_deck\.action\?.*ope=1/.test(url);
isDeckEditPage(): return /\/yugiohdb\/member_deck\.action\?.*ope=2/.test(url);
isDeckListPage(): return /\/yugiohdb\/member_deck\.action\?.*ope=4/.test(url);
isCustomDeckEditPage(): return /^https:\/\/www\.db\.yugioh-card\.com\/yugiohdb\/#\/ytomo\/edit/.test(url);
isCardSearchPage(): return /\/yugiohdb\/card_search\.action/.test(url);
isCardDetailPage(): return /\/yugiohdb\/card_search\.action\?.*ope=2/.test(url);
isFaqSearchPage(): return /\/yugiohdb\/faq_search\.action/.test(url);
isFaqDetailPage(): return /\/yugiohdb\/faq_search\.action\?.*ope=5/.test(url);
isDeckSearchPage(): return /\/yugiohdb\/deck_search\.action/.test(url);
isYugiohDbPage(): return /^https:\/\/www\.db\.yugioh-card\.com\/yugiohdb\//.test(url);
```

**修正方針**: 
- `detectCardGameType()` 関数を追加してゲームタイプを自動判定
- `getGamePath(cardGameType)` 関数で 'ocg' → 'yugiohdb', 'rush' → 'rushdb' を返す
- 各判定関数に `cardGameType?: CardGameType` オプション引数を追加

---

### 2. **API定義ファイル**

#### 2.1 src/api/deck-operations.ts
```typescript
const API_ENDPOINT = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action';
```

#### 2.2 src/api/card-search.ts
```typescript
const SEARCH_URL = 'https://www.db.yugioh-card.com/yugiohdb/card_search.action';
```

#### 2.3 src/api/card-faq.ts
```typescript
const FAQ_SEARCH_URL = 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action';
```

#### 2.4 src/api/image-utils.ts
```typescript
const BASE_IMAGE_URL = 'https://www.db.yugioh-card.com/yugiohdb/external/image/parts'
```

**修正方針**: 
- 定数をゲームタイプベースの関数に変更
- 例: `getApiEndpoint(gameType: CardGameType): string`

---

### 3. **コンポーネント** (src/components/)

#### 3.1 CardInfo.vue (line 217)
```typescript
return `https://www.db.yugioh-card.com/yugiohdb/get_image.action?type=1&cid=${card.value.cardId}&ciid=${img.ciid}&enc=${img.imgHash}&osplang=1`
```

#### 3.2 CardProducts.vue (line 130)
```typescript
const url = `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&pid=${packId}&rp=99999`
```

#### 3.3 DeckCard.vue (line 125, 268)
```typescript
return `https://www.db.yugioh-card.com${relativeUrl}`
const url = `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${this.card.cardId}&request_locale=ja`
```

#### 3.4 RightArea.vue (line 150)
```typescript
const imageUrl = relativeUrl ? `https://www.db.yugioh-card.com${relativeUrl}` : undefined
```

#### 3.5 DeckSection.vue
（現時点で直接URLを使用していないが、間接的に影響を受ける可能性あり）

#### 3.6 DeckMetadata.vue
（現時点で直接URLを使用していないが、間接的に影響を受ける可能性あり）

**修正方針**: 
- コンポーネント内でゲームタイプを取得（props経由またはストアから）
- URLビルダー関数を使用

---

### 4. **Content Scripts** (src/content/)

#### 4.1 content/session/session.ts (line 31, 65)
```typescript
const mydeckLink = document.querySelector<HTMLAnchorElement>('a[href*="member_deck.action"][href*="cgid="]');
const edit_url = `/yugiohdb/member_deck.action?ope=2&wname=MemberDeck&cgid=${cgid}&dno=${dno}&${request_locale}`;
```

#### 4.2 content/parser/deck-list-parser.ts (line 52)
```typescript
// value="/yugiohdb/member_deck.action?...&dno=8" からdnoを抽出
```

#### 4.3 content/deck-recipe/downloadDeckRecipeImage.ts (line 29)
```typescript
const url = `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=${cgid}&dno=${options.dno}`;
```

#### 4.4 content/deck-recipe/createDeckRecipeImage.ts (line 56, 424, 463)
```typescript
return `https://www.db.yugioh-card.com${url}`;
'Referer': 'https://www.db.yugioh-card.com/yugiohdb/',
const qrUrl = `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=${cgid}&dno=${dno}`;
```

#### 4.5 content/edit-ui/DeckEditLayout.vue (line 236)
```typescript
const imageUrl = relativeUrl ? `https://www.db.yugioh-card.com${relativeUrl}` : undefined
```

#### 4.6 content/card/detector.ts
（画像パスの判定に `/yugiohdb/icon/` を使用している可能性）

**修正方針**: 
- 現在のページURLからゲームタイプを判定
- パーサーに渡すか、パーサー内で判定

---

### 5. **ユーティリティ** (src/utils/)

#### 5.1 utils/deck-metadata-loader.ts (line 84)
```typescript
const SEARCH_PAGE_URL = 'https://www.db.yugioh-card.com/yugiohdb/deck_search.action?request_locale=ja';
```

#### 5.2 utils/page-detector.ts
（前述）

**修正方針**: 
- 定数を関数化してゲームタイプを引数に取る

---

### 6. **バックグラウンド** (src/background/)

#### 6.1 background/mapping-updater.ts (line 13)
```typescript
const SEARCH_FORM_URL = 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1';
```

#### 6.2 background/main.ts (line 51)
```typescript
url: 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit'
```

**修正方針**: 
- OCGとRush Duel両方に対応する必要があるか検討
- デフォルトをOCGにするか、ユーザー設定に基づくか決定

---

### 7. **オプション・ポップアップ**

#### 7.1 options/App.vue (line 72, 110, 210)
```typescript
URL: <code>https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit</code>
URL: <code>https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&...</code>
url: 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit'
```

#### 7.2 popup/index.ts (line 34)
```typescript
url: 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit'
```

**修正方針**: 
- ドキュメント内の例示URLはOCGのままでOK（参考情報として）
- 実際の遷移先は動的に生成

---

### 8. **型定義** (src/types/)

#### 8.1 types/card.ts (line 52)
```typescript
return `/yugiohdb/get_image.action?type=1&cid=${card.cardId}&ciid=${card.ciid}&enc=${imageInfo.imgHash}&osplang=1`;
```

**修正方針**: 
- ゲームタイプを引数に追加

---

### 9. **テストファイル**

以下のテストファイルで `/yugiohdb/` が使用されている（合計8ファイル）：
- `content/card/__tests__/detector.test.ts`
- `content/parser/__tests__/deck-parser.test.ts`
- `api/__tests__/card-search.test.ts`
- `api/__tests__/deck-operations.test.ts`

**修正方針**: 
- テストデータにゲームタイプを追加
- OCGとRush Duel両方のテストケースを作成（必要に応じて）

---

## 📋 実装計画

### Phase 1: 基盤整備（優先度：最高）

#### 1.1 型定義の追加
- [ ] `src/types/common.ts` に `CardGameType = 'ocg' | 'rush'` を定義

#### 1.2 ページ判定ユーティリティの拡張
- [ ] `src/utils/page-detector.ts` の修正
  - `detectCardGameType(url?: string): CardGameType` - URLからゲームタイプを自動判定
  - `getGamePath(cardGameType: CardGameType): string` - 'ocg' → 'yugiohdb', 'rush' → 'rushdb'
  - 各判定関数に `cardGameType?: CardGameType` 引数を追加

#### 1.3 URLビルダーユーティリティの作成
- [ ] `src/utils/url-builder.ts` を新規作成
  - `buildApiUrl(path: string, gameType: CardGameType): string`
  - `buildImageUrl(cid: number, ciid: number, imgHash: string, gameType: CardGameType): string`
  - `buildDeckUrl(params: object, gameType: CardGameType): string`

### Phase 2: API修正（優先度：高）

- [ ] `src/api/deck-operations.ts` - API_ENDPOINTを関数化
- [ ] `src/api/card-search.ts` - SEARCH_URLを関数化
- [ ] `src/api/card-faq.ts` - FAQ_SEARCH_URLを関数化
- [ ] `src/api/image-utils.ts` - BASE_IMAGE_URLを関数化

### Phase 3: コンポーネント修正（優先度：高）

- [ ] `src/components/CardInfo.vue`
- [ ] `src/components/CardProducts.vue`
- [ ] `src/components/DeckCard.vue`
- [ ] `src/components/RightArea.vue`

### Phase 4: Content Scripts修正（優先度：中）

- [ ] `src/content/session/session.ts`
- [ ] `src/content/parser/deck-list-parser.ts`
- [ ] `src/content/deck-recipe/downloadDeckRecipeImage.ts`
- [ ] `src/content/deck-recipe/createDeckRecipeImage.ts`
- [ ] `src/content/edit-ui/DeckEditLayout.vue`

### Phase 5: その他修正（優先度：中）

- [ ] `src/utils/deck-metadata-loader.ts`
- [ ] `src/types/card.ts`
- [ ] `src/background/mapping-updater.ts`
- [ ] `src/background/main.ts`

### Phase 6: テスト修正（優先度：低）

- [ ] 全テストファイルのURL更新
- [ ] Rush Duelのテストケース追加（必要に応じて）

---

## 🚨 注意事項

### Rush Duel URLの確認が必要

現時点でRush DuelのURL構造が以下のように想定されているが、実際のURLで確認が必要：
- `https://www.db.yugioh-card.com/rushdb/member_deck.action?...`
- `https://www.db.yugioh-card.com/rushdb/card_search.action?...`
- `https://www.db.yugioh-card.com/rushdb/get_image.action?...`

### 画像パスの差異

アイコン画像のパス（`/yugiohdb/icon/attribute_icon_*.png`）がRush Duelでも同じか確認が必要。

### APIパラメータの差異

Rush DuelのAPIがOCGと同じパラメータを受け取るか検証が必要。

---

## ✅ 次のアクション

1. **型定義の追加** (`src/types/common.ts`)
2. **page-detector.tsの拡張** （ゲームタイプ判定関数追加）
3. **url-builder.tsの作成** （URLビルダーユーティリティ）
4. **API修正開始** （deck-operations.ts から）

---

## 📝 実装完了レポート（2025-11-18）

### Phase 1: 基盤整備 ✅ 完了
- 型定義: `CardGameType` in `src/types/settings.ts`
- ページ判定: `detectCardGameType()`, `getGamePath()` in `src/utils/page-detector.ts`
- URLビルダー: 11関数 in `src/utils/url-builder.ts`

### Phase 2: デッキ表示機能 ✅ 完了
- シャッフル・ソート: `src/content/shuffle/addShuffleButtons.ts`
- デッキ画像作成: `src/content/deck-recipe/*.ts`
- 全機能でゲームタイプ自動判定を実装

### バグ修正 ✅ 完了
- `getCardImageUrl()`: gameTypeパラメータ追加
- `isDeckDisplayPage()`: ope=1省略対応
- 全コンポーネント: 画像URL動的生成

### コミット
- `565a848`: Phase 1 - 基盤整備
- `0b88de8`: Phase 2 - デッキ表示機能対応
- `c0389e8`: バグ修正

### 残タスク
Phase 3以降（必要に応じて）:
- API修正（card-search, card-faq, deck-operations）
- 他コンポーネント修正
- テスト作成

---

**調査者**: GitHub Copilot CLI
**ステータス**: Phase 1-2完了、デプロイ済み
