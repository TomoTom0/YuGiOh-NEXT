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
