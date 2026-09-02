# 公式API 仕様書

遊戯王DB公式サイトの API エンドポイント仕様、パラメータ順序、注意事項をまとめたドキュメントです。

## 重要な注意点

### ⚠️ パラメータ順序は厳密に守る必要があります

**これは v0.5.0+ で発生したバグの根本原因です**。

公式APIは URLパラメータの順序に依存しています。URLクラスの `searchParams` を使うと、パラメータが再構築される際に順序が変わる可能性があるため、以下の方法でURLを構築してください：

```typescript
// ❌ 悪い例: URLクラスは順序を保証しない
const url = new URL('https://www.db.yugioh-card.com/yugiohdb/member_deck.action');
url.searchParams.set('ope', '6');
url.searchParams.set('wname', 'MemberDeck');
url.searchParams.set('cgid', cgid);
url.searchParams.set('ytkn', ytkn);
// 結果: パラメータが再構築されて順序が変わる可能性あり

// ✅ 良い例: 文字列連結で順序を保証
const url = `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=6&wname=MemberDeck&cgid=${cgid}&ytkn=${ytkn}`;
```

---

## エンドポイント仕様

### member_deck.action

デッキ操作用のメインエンドポイント。`ope` パラメータで操作内容を指定します。

#### ope=1: デッキ表示ページ

指定したデッキの詳細情報を取得します。

**URL 例**:
```
/yugiohdb/member_deck.action?ope=1&cgid=xxxxx&dno=1
```

**パラメータ** (推奨順序):
1. `ope=1` - 操作コード（必須）
2. `cgid` - ユーザー識別子（必須）
3. `dno` - デッキ番号（必須）

**応答**: デッキ内容を含むHTMLページ

**request_locale**: 付与可能（オプション）

---

#### ope=2: デッキ編集フォーム

デッキ編集フォームを取得（ytkn トークン用）。

**URL 例**:
```
/yugiohdb/member_deck.action?ope=2&wname=MemberDeck&cgid=xxxxx&dno=1&request_locale=ja
```

**パラメータ** (推奨順序):
1. `ope=2` - 操作コード（必須）
2. `wname=MemberDeck` - ウィンドウ名（必須・固定値）
3. `cgid` - ユーザー識別子（必須）
4. `dno` - デッキ番号（必須）
5. `request_locale` - 言語コード（オプション）

**応答**: ytkn 入力フィールドを含むHTMLページ

**request_locale**: 付与可能（オプション）

**重要**: `wname=MemberDeck` は固定値で、常に第2パラメータでなければならない可能性がある

---

#### ope=3: デッキ保存

デッキ内容を保存します（`saveDeckInternal`、`src/api/deck-operations.ts`）。

**リクエスト**: POST、`application/x-www-form-urlencoded`

**`imgs` / `imgsSide` フィールドの形式（TASK-354で判明）**:

公式サイトのネイティブ編集フォーム(`member_deck.action?ope=2`)の「イラスト変更」モーダル(`#card_image_modal`)を実機調査した結果、判明した仕様：

```
imgs = "{cid}_{コピー1のciid}_{コピー2のciid}_{コピー3のciid}"
```

- 1カード種類（`cid`）につき、テーブルの行は**1行のみ**（`monm`/`spnm`/`trnm`/`exnm`/`sinm`等の名前フィールドと`imgs`/`imgsSide`も1行につき1組）
- 数量フィールド（`monum`/`spnum`/`trnum`/`exnum`/`sinum`）は物理コピーの合計枚数
- `imgs`は3枚積みの上限に合わせて常に3つのciidスロットを持つ。各スロットは「その行の中で何枚目の物理コピーか」に対応する実際のciidを表す（3枚に満たない場合は残りのスロットを最後のciidで埋める）
- 例: 同一cidにciid=2を2枚、ciid=1を1枚（計3枚）→ `imgs = "{cid}_2_2_1"`
- 空き枠の数（`monm`等に空文字を送る回数）は「行数」を基準に計算する（quantity合計ではない。1cid=1行のため）

**実機証拠**: 既存カード（3枚所持）のモーダルを開くと3つの選択肢が表示され、対応する隠しinput `imgs_mo_N` の値が3選択肢と完全一致することを確認済み。

**過去の誤り**: 以前の実装は「1つの(cid,ciid)ペア=1行」という誤ったモデルだった。同一cidに複数のciidバリエーションが混在すると、各行のimgsが独立して送られ、非デフォルトciidの2枚目以降が代表イラスト（ciid=1）や意図しないciidに化ける不具合があった（ユーザーが繰り返し報告）。詳細は `TASK-354` 参照。

**実装**: `appendCardGroupToFormData()` が `groupByCid()` で同一cidをグループ化し、上記フォーマットで送信する。

---

#### ope=4: デッキ一覧取得

ユーザーが所有するすべてのデッキ一覧を取得します。

**URL 例**:
```
/yugiohdb/member_deck.action?ope=4&wname=MemberDeck&cgid=xxxxx
```

**パラメータ** (推奨順序) - **この順序は絶対**:
1. `ope=4` - 操作コード（必須）
2. `wname=MemberDeck` - ウィンドウ名（必須・固定値）
3. `cgid` - ユーザー識別子（必須）

**応答**: デッキ一覧HTMLページ（ytkn トークンも含む）

**request_locale**: **付与してはいけない** ⚠️

**注意**:
- この操作時は `request_locale` を付与しないこと
- パラメータ順序を厳密に守ること（v0.5.1で発生したバグの原因）

---

#### ope=6: 新規デッキ作成

新しいデッキを作成します。

**URL 例**:
```
/yugiohdb/member_deck.action?ope=6&wname=MemberDeck&cgid=xxxxx&ytkn=yyyyy
```

**パラメータ** (推奨順序) - **この順序は絶対**:
1. `ope=6` - 操作コード（必須）
2. `wname=MemberDeck` - ウィンドウ名（必須・固定値）
3. `cgid` - ユーザー識別子（必須）
4. `ytkn` - CSRF トークン（必須）

**応答**: HTTP 200 + 新規作成されたデッキを含むHTMLページ

**request_locale**: **付与してはいけない** ⚠️

**重要なポイント**:
- `ytkn` は ope=4 で事前に取得する必要がある
- パラメータ順序は**絶対に守る必要があります**
- この操作は他のすべてのデッキ作成方法より優先される

**v0.5.1バグについて**:
v0.5.0+ ではこのURLを buildApiUrl() 経由で構築していたため、URLクラスの searchParams がパラメータを再構築し、順序が変わってしまいました。結果として、公式APIはHTTP 200を返してもデッキが作成されないという問題が発生しました。

修正方法: buildApiUrl() で `noLocale: true` を指定し、手動で文字列連結でパラメータを追加:
```typescript
const baseUrl = buildApiUrl('member_deck.action', gameType, undefined, true);
const url = `${baseUrl}?ope=6&wname=MemberDeck&cgid=${cgid}&ytkn=${ytkn}`;
```

---

### card_search.action

カード情報検索用エンドポイント。

**URL 例**:
```
/yugiohdb/card_search.action?ope=1&sort=21&page=1&mode=1&stype=1&link_m=2&othercon=2&releaseYStart=1999&releaseMStart=1&releaseDStart=1&rp=2000&request_locale=ja
```

**パラメータ順序**: 比較的柔軟（多くの場合）

**request_locale**: 付与可能（推奨: 'ja'）

**sort パラメータの実際の意味（要注意・非直感的）**:

実サーバーへ直接fetchしてcid（カードID。値が大きいほど新しいカード）を比較検証した結果：

| API値 | 実際の挙動 |
|------|-----------|
| `sort=20` | **最古**のカードから返る（release_asc相当） |
| `sort=21` | **最新**のカードから返る（release_desc相当） |

名前から連想される「昇順/降順」の直感（20→古い方が小さい値だから昇順、のような類推）とは対応しないため、
`src/api/mappers/card-search-mapper.ts` の `SORT_ORDER_TO_API_VALUE` でこの値を直接ハードコードする際は
必ずこの表を参照すること。過去に `release_desc`/`release_asc` へ逆の値を割り当ててしまい、
デフォルト検索が常に最古のカードを表示するバグ（TASK-373）が発生している。

**other / othercon パラメータ（複数選択パラメータ）に関する注意**:

`other`（モンスタータイプ等）のように同じキーを複数回指定するパラメータを`URLSearchParams`経由で
最終URLへマージする際、`.set()`を使うと後勝ちで上書きされ最後の1つ以外が消える。
`src/utils/url-builder.ts` の `buildApiUrl()` は同名キーの最初の出現時のみクリアし、以降は`.append()`で
積み増す実装になっているため、この関数を経由せず独自にURLを組み立てるコードを追加する場合は同じ罠に注意すること
（TASK-373で発覚。融合+シンクロ等2種類選択してもAND/ORの絞り込みが機能していないように見えた）。

**カードテキスト内の`<br>`/`<a>`がHTMLエンティティとして二重エスケープされている場合がある**:

`.box_card_text`（検索結果）/`.item_box_text`（詳細ページ）/FAQ補足情報の一部カードでは、
本来HTML要素であるべき`<br>`や`<a href="...cid=...">カード名</a>`が、データ登録時に
`&lt;br&gt;`のようにHTMLエンティティとしてエスケープされたまま格納されている。
ブラウザのHTMLパーサーはこれを実要素化せず、文字列 `<br>` / `<a href="...">カード名</a>` として
`textContent`に残すため、`querySelectorAll('br')`や`querySelectorAll('a[href*="cid="]')`のような
実要素ベースの変換では検出できない（実際に「ドラゴン」等での検索結果の1〜5割程度がこの現象に該当することを確認）。

`src/utils/card-link-template.ts`の`convertCardLinksToTemplate()`は、実要素の変換に加えて、
残った文字列パターンとしての`<br>`/`<a>`も正規表現で変換する処理を持つ（TASK-437）。
カードテキスト・補足情報を抽出する新しいコードを追加する場合は、必ずこの関数を経由すること。

---

## パラメータの詳細

### 共通パラメータ

#### cgid (ユーザー識別子)

```
値: 32文字の16進数 (例: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6")
```

ユーザーセッション時にHTMLから抽出されます。マイデッキリンクの href から取得可能：
```javascript
const match = href.match(/cgid=([a-f0-9]{32})/);
const cgid = match[1];
```

#### ytkn (CSRF トークン)

```
値: ランダム文字列 (例: "3x5y8z2w4q7r1t6u9v0s")
```

ope=4 のレスポンスに含まれる `<input type="hidden" name="ytkn" value="...">` から抽出：
```javascript
const ytknInput = doc.querySelector('input[name="ytkn"]');
const ytkn = ytknInput.value;
```

#### wname (ウィンドウ名)

```
値: "MemberDeck" (固定値)
```

常に "MemberDeck" を使用してください。

#### ope (操作コード)

デッキ操作の種類を指定：
- `1`: デッキ表示
- `2`: 編集フォーム取得
- `4`: デッキ一覧取得
- `6`: 新規デッキ作成
- `13`: デッキコード発行

#### request_locale (言語コード)

```
値: "ja" | "en" | "ko" | "de" | ... (ISO 639-1コード)
デフォルト: "ja"
```

ope=4, ope=6 では付与してはいけません。

---

## URL構築のベストプラクティス

### buildApiUrl() ユーティリティの使用

```typescript
import { buildApiUrl } from '@/utils/url-builder';
import { detectCardGameType } from '@/utils/page-detector';

const gameType = detectCardGameType();

// 例1: ope=4 (デッキ一覧取得)
const baseUrl = buildApiUrl('member_deck.action', gameType, undefined, true);
const url = `${baseUrl}?ope=4&wname=MemberDeck&cgid=${cgid}`;

// 例2: ope=6 (新規デッキ作成)
const baseUrl = buildApiUrl('member_deck.action', gameType, undefined, true);
const url = `${baseUrl}?ope=6&wname=MemberDeck&cgid=${cgid}&ytkn=${ytkn}`;

// 例3: ope=2 (編集フォーム取得、request_locale付与)
const url = buildApiUrl(`member_deck.action?ope=2&wname=MemberDeck&cgid=${cgid}&dno=${dno}`, gameType);
```

### noLocale フラグの使い方

`buildApiUrl()` の第4パラメータに `true` を指定すると、`request_locale` が絶対に付与されません：

```typescript
buildApiUrl(path, gameType, undefined, true)
//                                    ↑ request_locale を付与しない
```

**使い分け**:
- `noLocale: true` → ope=4, ope=6
- `noLocale: false` (デフォルト) → ope=1, ope=2, card_search など

---

## トラブルシューティング

### デッキ作成失敗（HTTP 200 だがデッキが作成されない）

**原因**:
- パラメータ順序が正しくない
- `ytkn` トークンが無効（期限切れ）
- URLクラスで自動的にパラメータが再構築されている

**解決方法**:
1. パラメータ順序を確認（ope→wname→cgid→ytkn）
2. ytkn を新しく取得してから試す
3. URLクラスを使わず、文字列連結でURL構築

### ope=4 で request_locale を付与するとエラー

**原因**:
- デッキ一覧取得時に `request_locale` を付与している
- public/API の仕様では `request_locale` は不要

**解決方法**:
```typescript
// ❌ 悪い
const url = buildApiUrl(`member_deck.action?ope=4&wname=MemberDeck&cgid=${cgid}&request_locale=ja`, gameType);

// ✅ 良い
const baseUrl = buildApiUrl('member_deck.action', gameType, undefined, true);
const url = `${baseUrl}?ope=4&wname=MemberDeck&cgid=${cgid}`;
```

---

## 参考資料

- 関連コード: `src/api/deck-operations.ts`
- 関連ユーティリティ: `src/utils/url-builder.ts`
- 関連テスト: `tests/unit/api/deck-operations.test.ts`
- v0.5.1バグ修正: `docs/changelog/v0.5.3.md`
