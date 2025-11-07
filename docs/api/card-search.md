# Card Search API

カード検索とパース関連のAPI。

## 主要な関数

### `searchCards(options: SearchOptions): Promise<CardInfo[]>`

カードを検索して結果を返す。

**パラメータ:**
- `options: SearchOptions` - 検索オプション

**戻り値:**
- `Promise<CardInfo[]>` - カード情報の配列（エラー時は空配列）

**エラーハンドリング:**
- HTTP通信エラー: 空配列を返す
- パースエラー: 空配列を返す

**使用例:**
```typescript
const cards = await searchCards({
  cardName: 'Blue-Eyes',
  cardType: 'モンスター'
});
```

---

### `searchCardsByName(keyword: string, ctype?: CardType): Promise<CardInfo[]>`

カード名でカードを検索する。

**パラメータ:**
- `keyword: string` - 検索キーワード
- `ctype?: CardType` - カードタイプ（オプション）

**戻り値:**
- `Promise<CardInfo[]>` - カード情報の配列（エラー時は空配列）

**エラーハンドリング:**
- HTTP通信エラー: 空配列を返す
- パースエラー: 空配列を返す

**使用例:**
```typescript
const cards = await searchCardsByName('Blue-Eyes', 'モンスター');
```

---

### `searchCardById(cardId: string): Promise<CardInfo | null>`

カードIDでカードを検索する。

**パラメータ:**
- `cardId: string` - カードID

**戻り値:**
- `Promise<CardInfo | null>` - カード情報（見つからない場合はnull）

**エラーハンドリング:**
- HTTP通信エラー: nullを返す
- パースエラー: nullを返す

**使用例:**
```typescript
const card = await searchCardById('14953');
```

---

### `parseSearchResults(doc: Document): CardInfo[]`

検索結果ページのHTMLドキュメントからカード情報を抽出する。

**パラメータ:**
- `doc: Document` - パース済みのHTMLドキュメント

**戻り値:**
- `CardInfo[]` - カード情報の配列

**DOM階層の検証:**

この関数は以下の階層を検証します：
```
#main980 > #article_body > #card_list > .t_row
```

各親要素が存在しない場合、警告を出力して空配列を返します。

**内部動作:**
1. `#main980`の存在確認
2. `#main980 > #article_body`の存在確認
3. `#main980 > #article_body > #card_list`の存在確認
4. `.t_row`要素を取得してパース

**使用例:**
```typescript
const response = await fetch('...');
const html = await response.text();
const parser = new DOMParser();
const doc = parser.parseFromString(html, 'text/html');
const cards = parseSearchResults(doc);
```

---

### `parseSearchResultRow(row: HTMLElement, imageInfoMap: Map): CardInfo | null`

検索結果の1行からカード情報を抽出する。

**パラメータ:**
- `row: HTMLElement` - `.t_row`要素
- `imageInfoMap: Map<string, { ciid?: string; imgHash?: string }>` - 画像情報マップ

**戻り値:**
- `CardInfo | null` - カード情報（パースできない場合はnull）

**抽出する情報:**
- カード名（`.card_name`）
- カードID（`input.link_value`から抽出）
- ふりがな（`.card_ruby`）
- 効果テキスト（`.box_card_text`）
- カードタイプ固有情報（モンスター/魔法/罠）

**カードID抽出:**
```typescript
// input.link_value の値から cid= を抽出
// 例: "/yugiohdb/card_search.action?ope=2&cid=13903" から "13903"
const match = linkValueInput.value.match(/[?&]cid=(\d+)/);
const cardId = match[1];
```

---

### `extractImageInfo(doc: Document): Map<string, { ciid?: string; imgHash?: string }>`

HTMLドキュメントから画像URL情報を抽出する。

**パラメータ:**
- `doc: Document` - HTMLドキュメント

**戻り値:**
- `Map<string, { ciid?: string; imgHash?: string }>` - カードIDをキーとする画像情報マップ

**抽出パターン:**
```javascript
// get_image.action?...cid=123&ciid=1&enc=xxxxx
const regex = /get_image\.action\?[^'"]*cid=(\d+)(?:&ciid=(\d+))?(?:&enc=([^&'"\s]+))?/g;
```

---

## 型定義

### `CardInfo`

```typescript
type CardInfo = MonsterCard | SpellCard | TrapCard;
```

### `CardBase`

```typescript
interface CardBase {
  name: string;           // カード名
  ruby?: string;          // ふりがな
  cardId: string;         // カードID
  imageId: string;        // 画像ID（デフォルト: '1'）
  ciid?: string;          // 画像識別子
  imgHash?: string;       // 画像ハッシュ
  text?: string;          // 効果テキスト
}
```

### `SearchOptions`

```typescript
interface SearchOptions {
  cardName?: string;
  cardType?: CardType;
  attribute?: Attribute;
  race?: Race;
  // ... その他のオプション
}
```

---

## エラーハンドリング

すべての公開関数は内部的にtry-catchを実装しており、エラー時に適切な値（空配列またはnull）を返します。

```typescript
try {
  return parseSearchResults(doc);
} catch (error) {
  console.error('Failed to search cards:', error);
  return [];
}
```

---

## 注意事項

1. **DOM階層の重要性**: `parseSearchResults()`は正確なDOM階層を使用します。間違ったページを渡すと空配列を返します。

2. **カードID取得**: すべてのカード行は`input.link_value`を持っていることを前提としています。

3. **画像情報**: `ciid`と`imgHash`はオプションです。取得できない場合は`undefined`になります。

4. **エラーログ**: パースエラーは`console.error`に出力されますが、例外は投げられません。
