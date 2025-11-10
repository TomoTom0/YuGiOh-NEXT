# Deck Detail Parser API

デッキ詳細ページのパース関連API。

## 主要な関数

### `parseDeckDetail(doc: Document): DeckInfo`

デッキ詳細ページ（表示ページ、ope=1）からデッキ情報を抽出する。

**パラメータ:**
- `doc: Document` - パース済みのHTMLドキュメント（デッキ表示ページ）

**戻り値:**
- `DeckInfo` - デッキ情報

**エラーハンドリング:**
- DOM構造が不正な場合、エラーを投げます
- 呼び出し元でtry-catchが必要です

**DOM階層の検証:**

この関数は以下の完全な階層を検証します：
```
#main980 > #article_body > #deck_detailtext > #detailtext_main > .t_body > .t_row
```

**検証項目:**
1. `#main980`の存在
2. `#main980 > #article_body`の存在
3. `#main980 > #article_body > #deck_detailtext`の存在
4. `#main980 > #article_body > #deck_detailtext > #detailtext_main`の存在
5. 必須のカードセクション（`.t_body.mlist_m`, `.t_body.mlist_s`, `.t_body.mlist_t`）の存在
6. 各セクション内の`.t_row`構造の検証
7. `.t_row`内の`.card_name`と`input.link_value`の検証
8. metaタグの検証
9. h1タグの検証
10. デッキ番号情報の検証

**使用例:**
```typescript
const response = await axios.get(deckUrl, { withCredentials: true });
const parser = new DOMParser();
const doc = parser.parseFromString(response.data, 'text/html');

try {
  const deckInfo = parseDeckDetail(doc);
  console.log(`デッキ名: ${deckInfo.name}`);
  console.log(`メインデッキ: ${deckInfo.mainDeck.length}枚`);
} catch (error) {
  console.error('パースエラー:', error.message);
}
```

**投げられるエラー:**
```typescript
// DOM階層エラー
throw new Error('#main980が見つかりません。デッキ表示ページではありません。');
throw new Error('#main980 > #article_bodyが見つかりません。デッキ表示ページではありません。');
throw new Error('#main980 > #article_body > #deck_detailtextが見つかりません。デッキ表示ページではありません。');
throw new Error('#main980 > #article_body > #deck_detailtext > #detailtext_mainが見つかりません。デッキ表示ページではありません。');

// セクションエラー
throw new Error('デッキ表示ページのDOM構造が不正です:\n  - モンスターカードセクション(.t_body.mlist_m)が#detailtext_main配下に見つかりません\n  ...');

// metaタグエラー
throw new Error('head配下にデッキ名取得用のmetaタグが見つかりません');

// その他
throw new Error('body配下にページタイトル（h1要素）が見つかりません');
throw new Error('デッキ表示ページではありません。デッキ番号情報が見つかりません。');
```

---

### `validateDeckDetailPageStructure(doc: Document): void`

デッキ表示ページのDOM構造を検証する。

**パラメータ:**
- `doc: Document` - ドキュメント

**戻り値:**
- `void`

**例外:**
- デッキ表示ページでない場合はエラーを投げる

**検証内容:**

1. **DOM階層の検証**
   ```
   #main980 > #article_body > #deck_detailtext > #detailtext_main
   ```

2. **必須セクションの検証**
   - `.t_body.mlist_m` (モンスターカードセクション)
   - `.t_body.mlist_s` (魔法カードセクション)
   - `.t_body.mlist_t` (罠カードセクション)

3. **各セクション内の構造検証**
   - `.t_row`要素が取得可能か
   - `.t_row`内に`.card_name`が存在するか
   - `.t_row`内に`input.link_value`が存在するか

4. **メタ情報の検証**
   - `head`要素の存在
   - `meta[name="description"]`または`meta[property="og:description"]`の存在
   - `body`要素の存在
   - `h1`要素の存在
   - デッキ番号情報の存在

---

### `parseCardSection(doc: Document, imageInfoMap: Map, sectionId: 'main' | 'extra' | 'side'): DeckCard[]`

カードセクションからカード情報を抽出する。

**パラメータ:**
- `doc: Document` - ドキュメント
- `imageInfoMap: Map<string, { ciid?: string; imgHash?: string }>` - 画像情報マップ
- `sectionId: 'main' | 'extra' | 'side'` - セクションID

**戻り値:**
- `DeckCard[]` - デッキ内カード配列

**内部動作:**

**メインデッキの場合 (`sectionId === 'main'`)**:
1. `#detailtext_main`を取得
2. `.t_body.mlist_m`, `.t_body.mlist_s`, `.t_body.mlist_t`を取得
3. 各セクションの`.t_row`を取得してパース

**エクストラデッキの場合 (`sectionId === 'extra'`)**:
1. `#detailtext_main`内の"Extra Deck"見出しを探す
2. 見出しの親コンテナ内の`.t_body`を取得
3. `.t_row`を取得してパース

**サイドデッキの場合 (`sectionId === 'side'`)**:
1. `#detailtext_main`内の"Side Deck"見出しを探す
2. 見出しの親コンテナ内の`.t_body`を取得
3. `.t_row`を取得してパース

**注意:**
- 各`.t_row`は1枚のカードを表します（quantity: 1）
- `parseSearchResultRow()`を使用してカード情報を抽出

---

### `extractDnoFromPage(doc: Document): number`

ページからデッキ番号（dno）を抽出する。

**パラメータ:**
- `doc: Document` - ドキュメント

**戻り値:**
- `number` - デッキ番号（見つからない場合は0）

**抽出方法:**
1. JavaScriptコードから`$('#dno').val('4')`を探す
2. 見つからない場合、URLパラメータから`dno=`を探す

---

### `extractDeckNameFromMeta(doc: Document): string`

metaタグからデッキ名を抽出する。

**パラメータ:**
- `doc: Document` - ドキュメント

**戻り値:**
- `string` - デッキ名（見つからない場合は'デッキ'）

**抽出方法:**
1. `<meta name="description" content="完全版テスト成功/ ">`から取得
   - "デッキ名/ "の形式から"デッキ名"を抽出
2. 見つからない場合、`<meta property="og:description">`から取得
   - "デッキ名 | 遊戯王ニューロン..."の形式から"デッキ名"を抽出

---

### `extractIsPublicFromTitle(doc: Document): boolean`

タイトルから公開/非公開を判定する。

**パラメータ:**
- `doc: Document` - ドキュメント

**戻り値:**
- `boolean` - 公開デッキの場合true

**判定方法:**
- `<h1>【 非公開 】</h1>`の存在を確認
- "非公開"を含む場合: `false`
- "公開"を含む場合: `true`
- どちらでもない場合: `false`（デフォルトは非公開）

---

## 型定義

### `DeckInfo`

```typescript
interface DeckInfo {
  dno: number;              // デッキ番号
  name: string;             // デッキ名
  mainDeck: DeckCard[];     // メインデッキ
  extraDeck: DeckCard[];    // エクストラデッキ
  sideDeck: DeckCard[];     // サイドデッキ
  isPublic: boolean;        // 公開/非公開
}
```

### `DeckCard`

```typescript
interface DeckCard {
  card: CardInfo;  // カード情報
  quantity: 1;     // 枚数（常に1）
}
```

---

## エラーハンドリング

`parseDeckDetail()`はエラーを投げます。呼び出し元でtry-catchが必要です。

**良い例:**
```typescript
try {
  const deckInfo = parseDeckDetail(doc);
  // 処理を続行
} catch (error) {
  console.error('パースエラー:', error.message);
  // ユーザーにエラーを表示
}
```

**悪い例（エラーハンドリングなし）:**
```typescript
const deckInfo = parseDeckDetail(doc);  // エラー時に例外が投げられる
```

---

## DOM階層図

```
#main980
  └─ #article_body
      └─ #deck_detailtext
          └─ #detailtext_main
              ├─ .subcatergory (Main Deck)
              │   └─ #main_m_list
              │       └─ .t_body.mlist_m
              │           └─ .t_row (各カード)
              │               ├─ .card_name
              │               └─ input.link_value
              ├─ .subcatergory (Extra Deck)
              │   └─ .t_body
              │       └─ .t_row
              └─ .subcatergory (Side Deck)
                  └─ .t_body
                      └─ .t_row
```

---

## 注意事項

1. **エラーハンドリング必須**: `parseDeckDetail()`はエラーを投げるため、必ずtry-catchで囲む必要があります。

2. **DOM階層の厳密な検証**: すべての親要素が存在することを確認してからパースを実行します。

3. **カード枚数は常に1**: デッキ表示ページでは、各`.t_row`が1枚のカードを表します。

4. **検索結果パーサーとの連携**: カード情報の抽出には`parseSearchResultRow()`を使用します。

5. **画像情報の取得**: `extractImageInfo()`で事前に画像情報マップを作成してから使用します。
