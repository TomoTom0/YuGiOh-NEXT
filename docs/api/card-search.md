# Card Search API

カード検索・パース・詳細取得関連のAPI（`src/api/card-search.ts`）。

型定義は `src/types/api/search-types.ts` にある。

## 主要な検索関数

### `searchCards(options: SearchOptions): Promise<CardInfo[]>`

`card_search.action` を1回呼び出し、結果をパースして返す最も基本的な検索関数。

**パラメータ:**
- `options: SearchOptions` - 検索オプション（下記参照）

**戻り値:**
- `Promise<CardInfo[]>` - カード情報の配列（HTTPエラー・パースエラー時は空配列）

**使用例:**
```typescript
import { searchCards } from '@/api/card-search';

const cards = await searchCards({
  keyword: 'Blue-Eyes',
  searchType: '1', // カード名検索
  monsterTypes: ['fusion', 'synchro'],
  monsterTypeLogic: 'OR',
  sort: 21,
  resultsPerPage: 100
});
```

内部的には `buildSearchParams(options)` でクエリパラメータを組み立て、
`buildApiUrl('card_search.action', gameType, params)` で最終URLを構築し、`queuedFetch` で取得する。

---

### `searchCardsAuto(options: SearchOptions): Promise<SearchAutoResult>`

「auto」検索モード用。キーワードの長さに応じて検索方式を自動選択する。

**動作:**
- キーワード1文字: カード名検索（`searchType: '1'`）のみ実行
- キーワード2文字以上: カード名・テキスト・ペンデュラム効果（`searchType: '1'|'2'|'3'`）を`Promise.all`で並列実行し、
  カード名検索が100件以上ヒットした場合はカード名検索の結果のみを返す（呼び出し側がname検索へ委譲して
  追加ページを取得するため）。100件未満ならname > text > pendulumの優先順で`cardId`をキーにマージする

**戻り値:**
- `Promise<SearchAutoResult>` - `{ cards: CardInfo[] }`

**注意:** `searchCardsAuto`自体はモンスタータイプ等のAND/OR絞り込みをクライアント側で適用しない。
呼び出し側（`useSearchExecution.ts`の`handleSearch`）が`applyClientSideFilters`で明示的に適用する必要がある
（サーバー側の`othercon`パラメータだけでは正しく絞り込まれないケースがあるため。TASK-373参照）。

---

### `searchCardById(cardId: string): Promise<CardInfo | null>`

カードIDで1件検索する（`ope=2&cid=<id>`）。

**戻り値:**
- `Promise<CardInfo | null>` - カード情報（見つからない場合はnull）

---

### `searchCardsByPackId(packId: string): Promise<CardInfo[]>`

パック（商品）IDに含まれる全カードを取得する（`pid=<packId>&rp=99999`）。

**使用例:**
```typescript
const cards = await searchCardsByPackId('1000009524000');
```

---

### `buildSearchParams(options: SearchOptions): URLSearchParams`

`SearchOptions` を実際のAPIクエリパラメータ（`URLSearchParams`）に変換する。
`searchCards`/`searchCardsAuto`が内部的に使用する。単体でテストする場合や、
実際に送信されるパラメータを確認したい場合に直接呼び出せる。

---

## `SearchOptions` 型

`src/types/api/search-types.ts` で定義。主なプロパティ（全て`buildSearchParams`が対応するAPIパラメータへ変換する）:

| プロパティ | 型 | 対応するAPIパラメータ |
|-----------|-----|----------------------|
| `keyword` | `string`（必須） | `keyword` |
| `searchType` | `'1'\|'2'\|'3'\|'4'` | `stype`（1=カード名, 2=テキスト, 3=ペンデュラム効果, 4=カード番号） |
| `cardType` | `CardType` | `ctype` |
| `attributes` | `Attribute[]` | `attr`（複数） |
| `races` | `Race[]` | `species`（複数） |
| `monsterTypes` | `MonsterType[]` | `other`（複数） |
| `monsterTypeLogic` | `'AND'\|'OR'` | `othercon`（1=AND, 2=OR） |
| `excludeMonsterTypes` | `MonsterType[]` | `jogai`（複数） |
| `levels` | `number[]` | `level0`〜`level13` |
| `atk` / `def` | `{from?, to?}` | `atkfr`/`atkto`, `deffr`/`defto` |
| `pendulumScales` | `number[]` | `Pscale0`〜`Pscale13` |
| `linkNumbers` | `number[]` | `Link1`〜`Link6` |
| `linkMarkers` | `number[]` | `linkbtn<N>`（複数） |
| `linkMarkerLogic` | `'AND'\|'OR'` | `link_m`（1=AND, 2=OR） |
| `spellEffectTypes` / `trapEffectTypes` | 配列 | `effe`（複数） |
| `sort` | `number` | `sort`（下記「sort値の注意」参照） |
| `resultsPerPage` | `number` | `rp` |
| `releaseDate` | `{start?, end?}` | `releaseYStart`等 |

**sort値の注意（非直感的）:** `sort`の実際の意味は名称から連想しにくい。
`SORT_ORDER_TO_API_VALUE`（`src/api/mappers/card-search-mapper.ts`）でラベル→API値への
マッピングを一元管理しているため、直接数値を指定せずこのマッピングを経由すること。
実際のAPI値の意味は `docs/dev/official-api.md` の「sort パラメータの実際の意味」を参照
（`sort=20`は最古、`sort=21`は最新のカードを返す）。

**複数選択パラメータ(`other`/`attr`/`species`等)の注意:** これらは同じキーを複数回指定する形式。
最終URL構築を担う`buildApiUrl`（`src/utils/url-builder.ts`）が同名キーを正しく全て保持する実装に
なっていることが前提（TASK-373で一度この前提が壊れていたことがある）。

---

## パース関数

### `parseSearchResults(doc: Document): CardInfo[]`

検索結果ページのHTMLドキュメントから全カード情報を抽出する。

**DOM階層の検証:**
```
#main980 > #article_body > #card_list > .t_row
```
各親要素が存在しない場合、空配列を返す。

### `parseSearchResultRow(row: HTMLElement, imageInfoMap): CardInfo | null`

`.t_row`要素1行から、`detectCardType`でカードタイプを判定した上で
`parseMonsterCard`/`parseSpellCard`/`parseTrapCard`のいずれかに委譲する。

### `parseCardBase(row, imageInfoMap): CardBase | null`

カード共通情報（`name`, `cardId`, `ruby`, `ciid`, `imgHash`等）を抽出する。
カードIDは `input.link_value` の値（例: `/yugiohdb/card_search.action?ope=2&cid=13903`）から
正規表現 `/[?&]cid=(\d+)/` で抽出する。

### `extractImageInfo(doc: Document): Map<string, { ciid?, imgHash? }>`

HTML内のインラインJavaScriptから、カードIDごとの画像識別子（`ciid`）と画像ハッシュ（`imgHash`）を
正規表現で抽出する。`parseSearchResults`が事前に呼び出し、各行のパース時に参照する。

---

## ページング・詳細取得

### `fetchAdditionalPages(baseParams, parseFunc, logPrefix): Promise<CardInfo[]>`

`rp=2000`で2000件ずつページングしながら全件取得する共通ヘルパー（バックグラウンド処理用）。
`hasMore`（検索結果100件到達時の拡張フェッチ）や関連カード全件取得で使用される。

### `getCardDetail(cardId, lang?, sortOrder?, fromFAQ?): Promise<CardDetail | null>`

カード詳細ページから、複数画像・ふりがな・収録情報・関連カード・関連FAQ・関連商品などの
補足情報を取得する。基本情報（名前・ステータス等）は検索結果やデッキ読み込みで既にキャッシュ済み
という前提で、詳細ページからは補足情報のみを取得する。

### `getCardDetailWithCache(cardId, lang?, autoRefresh?, sortOrder?, fromFAQ?): Promise<CardDetailCacheResult>`

`getCardDetail`のキャッシュ対応版。キャッシュの仕組み自体の詳細は
`docs/dev/cache-system.md` / `docs/design/card-info-cache.md` を参照。

---

## エラーハンドリング

すべての公開関数は内部的にtry-catchを実装しており、エラー時は空配列または`null`を返す
（例外を上位に投げない）。エラーは`console.error`に出力される。

## 注意事項

1. **DOM階層の重要性**: `parseSearchResults()`は正確なDOM階層を前提とする。違うページを渡すと空配列を返す
2. **カードID取得**: 全てのカード行は`input.link_value`を持つ前提
3. **画像情報**: `ciid`と`imgHash`はオプション。取得できない場合は`undefined`
4. **AND/OR絞り込みの二重実装**: サーバー側の`othercon`/`link_m`だけに頼らず、
   `useSearchExecution.ts`の`applyClientSideFilters`でクライアント側でも同じ条件を再適用している
   （TASK-373参照）
5. **カードテキストの`<br>`/`<a>`エスケープ**: 一部カードは`<br>`/`<a href="...cid=...">`が
   HTMLエンティティとして二重エスケープされたまま格納されており、実要素として存在しない。
   `parseCardBase`等のテキスト抽出は必ず`src/utils/card-link-template.ts`の
   `convertCardLinksToTemplate()`を経由すること（詳細は`docs/dev/official-api.md`参照、TASK-437）
