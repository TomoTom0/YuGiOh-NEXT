# 遊戯王DB API調査結果

## 調査日時
最終更新: 2025-11-04

## 認証・セッション管理

### 認証方式
- **OAuth 2.0 Authorization Code Flow**
- 認証プロバイダー: KONAMI ID (`my1.konami.net`)

### セッション情報
- `JSESSIONID`: セッションID
- `yugiohdb_cgid`: ユーザー識別子（短縮版、10桁）
  - 例: `0043529140`
  - **HttpOnly属性付き**でJavaScriptから読み取り不可
- `yugiohdb_lt`: ログイントークン
  - **HttpOnly属性付き**でJavaScriptから読み取り不可

### 重要なパラメータ
- **cgid**: セッション/ユーザー識別子（32文字hex）
  - 例: `3d839f01a4d87b01928c60f262150bec`
  - URLパラメータとして使用
  - **⚠️ cookieからは取得できない（HttpOnly属性）**
  - **HTMLから取得する必要がある**:
    1. `input[name="cgid"]`のhidden input
    2. リンクのhref属性（`?cgid=...`）
    3. JavaScript変数やHTML内の埋め込み
- **ytkn**: CSRFトークン（64文字hex）
  - 例: `249374cb8348c2a397d469fdf0cf4f040f226bfb1bee28c86a22a1d6282064a8`
  - **ページ遷移ごとに変わる**
  - フォームのhidden inputとして埋め込まれる
  - `input[name="ytkn"]`から取得
- **dno**: デッキ番号（1, 2, 3...）

### cgid取得の実装例

```typescript
/**
 * DOMからcgid（ユーザー識別子）を取得する
 *
 * cgidはHttpOnly属性付きcookieなのでJavaScriptから読めない。
 * 代わりに、ページ内のリンクやフォーム要素から抽出する。
 */
export function getCgid(): string | null {
  // 1. hidden inputから取得を試みる
  const hiddenInput = document.querySelector('input[name="cgid"]') as HTMLInputElement;
  if (hiddenInput && hiddenInput.value) {
    return hiddenInput.value.trim();
  }

  // 2. ページ内のリンクから取得を試みる
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="cgid="]');
  for (const link of links) {
    const match = link.href.match(/cgid=([a-f0-9]{32})/);
    if (match) {
      return match[1];
    }
  }

  return null;
}
```

## デッキ管理API

### エンドポイント
`/yugiohdb/member_deck.action`

### 操作コード（ope）

| ope | 操作 | メソッド | 説明 |
|-----|------|----------|------|
| 1 | デッキ表示/詳細 | GET | デッキの詳細を表示（閲覧モード） |
| 2 | デッキ編集 | GET | デッキ編集画面を表示 |
| 3 | デッキ保存 | POST | デッキの変更を保存（AJAX） |
| 4 | デッキ一覧 | GET | マイデッキ一覧を表示 |
| 6 | デッキ新規作成 | GET | 新しいデッキを作成 |
| 7 | デッキ削除 | GET | デッキを削除（確認ダイアログあり） |
| 8 | デッキ複製 | GET | デッキをコピーして新規作成 |
| 13 | デッキコード発行 | GET | 共有用デッキコードを生成 |

### デッキ一覧ページ（ope=4）

**URL例**:
```
https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4&wname=MemberDeck&cgid={cgid}
```

**レスポンス**: HTML

**デッキ情報の取得**:
- 各デッキは`.dack_set`クラスのdiv要素
- デッキ名: `.name`クラス内
- 編集リンク: hidden input `.link_value`に格納
  ```html
  <input type="hidden" class="link_value" value="/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn={ytkn}&cgid={cgid}&dno={dno}">
  ```

### デッキ編集ページ（ope=2）

**URL例**:
```
https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&wname=MemberDeck&cgid={cgid}&dno={dno}&request_locale=ja
```

**レスポンス**: HTML

**フォーム**: `form_regist` (method: GET)

**デッキヘッダー情報**:
- `dnm`: デッキ名
- `pflg`: 公開/非公開 (select)
- `deck_type`: デッキタイプ (radio)
  - 0: OCG（マスターデュール）
  - 1, 2, 3: その他
- `deckStyle`: デッキスタイル (radio)
- `dckCategoryMst`: カテゴリー選択 (select multiple)
- `dckTagMst`: タグ選択 (select multiple)
- `biko`: コメント (textarea)

**カード情報**（各カードごと）:
- `monm`: カード名 (text input)
- `monum`: 枚数 (text input)
- `monsterCardId`: カードID (hidden input)
  - 例: `18732`
- `imgs`: 画像ID (hidden input)
  - 例: `18732_1_1_1`

### デッキ保存（ope=3）

**JavaScriptによるAJAX送信**:
```javascript
$.ajax({
    type: 'post',
    url: '/yugiohdb/member_deck.action?cgid={cgid}&request_locale=ja',
    data: 'ope=3&' + $('#form_regist').serialize(),
    dataType: 'json',
    success: function(data, dataType) {
        if (data.result) {
            // 成功時: デッキ詳細ページにリダイレクト
            location.href = "/yugiohdb/member_deck.action?cgid={cgid}&dno={dno}&request_locale=ja";
        } else {
            // エラー処理
            // data.error にエラーメッセージ配列
        }
    }
});
```

**リクエスト**:
- メソッド: POST
- Content-Type: application/x-www-form-urlencoded
- パラメータ: `ope=3` + form_registの全データ

**レスポンス**: JSON
```json
{
  "result": true,  // 成功時true
  "error": []      // エラー時、エラーメッセージの配列
}
```

## デッキデータ構造

### デッキ一覧での表示
```javascript
{
  "name": "try",
  "description": "展開は勉強中です...",
  "status": "非公開",
  "deckType": "OCG",
  "editLink": "/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn={ytkn}&cgid={cgid}&dno=3"
}
```

### デッキ詳細データ
```javascript
{
  "deckName": "try",
  "dno": 3,
  "cardCounts": {
    "main": 40,
    "extra": 15,
    "side": 0
  },
  "mainDeck": [
    {
      "name": "VS 龍帝ヴァリウス",
      "quantity": 1,
      "cardId": 18732
    },
    // ...
  ],
  "extraDeck": [...],
  "sideDeck": [...]
}
```

## UI操作

### ボタン一覧（デッキ詳細ページ）
- **デッキをコピー**: デッキ複製
- **デッキを削除**: デッキ削除
- **PDFで印刷**: PDF出力
- **デッキコードを発行**: 共有用コード生成
- **編集開始**: 編集モード（ope=2）へ遷移

### ボタン一覧（編集ページ）
- **保　存** (id: `btn_regist`): `javascript:Regist()` を実行してデッキを保存

## カード追加操作（調査完了）

### カード追加の仕組み

デッキ編集ページ（ope=2）では、**65個**のカード入力スロットが用意されています。

**各スロットの構造**:
```html
<!-- カード名 -->
<input type="text" id="monm_1" name="monm" value="カード名">

<!-- 枚数 -->
<input type="text" id="monum_1" name="monum" value="3">

<!-- カードID（hidden） -->
<input type="hidden" id="card_id_1" name="monsterCardId" value="18732">

<!-- 画像ID（hidden） -->
<input type="hidden" id="imgs_mo_1" name="imgs" value="18732_1_1_1">
```

### カードタイプ別フィールド名マッピング（重要）

**⚠️ 重大な発見**: すべてのカードタイプが同じID属性を使用しますが、**name属性が異なります**。

| カードタイプ | カード名 | 枚数 | カードID (ID属性) | カードID (name属性) | 画像ID |
|------------|---------|-----|------------------|-------------------|--------|
| モンスター | `monm` | `monum` | `card_id` | `monsterCardId` | `imgs_mo` |
| 魔法 | `spnm` | `spnum` | `card_id` | `spellCardId` | `imgs_sp` |
| 罠 | `trnm` | `trnum` | `card_id` | `trapCardId` | `imgs_tr` |

**HTML構造の例**:
```html
<!-- モンスターカードのカードIDフィールド -->
<input type="hidden" id="card_id_1" name="monsterCardId" value="">

<!-- 魔法カードのカードIDフィールド（同じID属性） -->
<input type="hidden" id="card_id_1" name="spellCardId" value="">

<!-- 罠カードのカードIDフィールド（同じID属性） -->
<input type="hidden" id="card_id_1" name="trapCardId" value="">
```

**⚠️ セレクタ使用時の注意**:
- ❌ **間違い**: `document.querySelector('#card_id_1')` → 最初に見つかったモンスターカード用フィールドを返す
- ✅ **正しい**: `document.querySelector('#card_id_1[name="spellCardId"]')` → 魔法カード用フィールドを正確に選択

**実装例**:
```javascript
// カードタイプに応じたフィールド名を返す関数
function getFieldNames(cardType) {
  if (cardType === 'モンスター') {
    return {
      name: 'monm',
      num: 'monum',
      cardIdPrefix: 'card_id',
      cardIdName: 'monsterCardId',
      imgs: 'imgs_mo'
    };
  } else if (cardType === '魔法') {
    return {
      name: 'spnm',
      num: 'spnum',
      cardIdPrefix: 'card_id',
      cardIdName: 'spellCardId',
      imgs: 'imgs_sp'
    };
  } else if (cardType === '罠') {
    return {
      name: 'trnm',
      num: 'trnum',
      cardIdPrefix: 'card_id',
      cardIdName: 'trapCardId',
      imgs: 'imgs_tr'
    };
  }
  return null;
}

// カードIDフィールドの正しい選択方法
const fieldNames = getFieldNames(cardType);
const cardIdInput = document.querySelector(
  `#${fieldNames.cardIdPrefix}_${index}[name="${fieldNames.cardIdName}"]`
);
```

### カード追加の手順

1. **空のスロットを探す**
   ```javascript
   const allInputs = Array.from(document.querySelectorAll('input[name="monm"]'));
   const emptyInput = allInputs.find(inp => !inp.value || inp.value.trim() === '');
   ```

2. **カード名と枚数を設定**
   ```javascript
   const index = emptyInput.id.replace('monm_', '');
   emptyInput.value = 'カード名';
   document.querySelector(`#monum_${index}`).value = '1';
   ```

3. **保存処理**
   - カードIDとimgsは空でも保存可能
   - サーバー側が自動的に解決するか、既存カードと統合する

### 保存API（ope=3）の実装

編集ページには`Regist()`というJavaScript関数があり、これがデッキ保存を実行します。

**Regist関数の実装**:
```javascript
function Regist() {
  $.ajax({
    type: 'post',
    url: '/yugiohdb/member_deck.action?cgid={cgid}&request_locale=ja',
    data: 'ope=3&' + $('#form_regist').serialize(),
    dataType: 'json',
    beforeSend: function(){
      $('#btn_regist').removeAttr('href');
      $('#message').hide().text('');
      $('#loader').show();
    },
    complete: function() {
      $('#loader').hide();
    },
    success: function(data, dataType) {
      if (data.result) {
        location.href = "/yugiohdb/member_deck.action?cgid={cgid}&dno={dno}&request_locale=ja";
      } else {
        if (data.error) {
          var lst = [];
          $.each(data.error, function(index, value){
            lst.push($.escapeHTML(value));
          });
          $('#message').append('<ul><li>' + lst.join('</li><li>') + '</li></ul>').show();
        }
        $('#btn_regist').attr('href', 'javascript:Regist();');
      }
    },
    error: function(xhr, status, error) {
    }
  });
}
```

**保存ボタン**:
```html
<a id="btn_regist" href="javascript:Regist();" class="btn hex orn">保　存</a>
```

### プログラムからのカード追加と保存

**実装例**（Playwright使用）:
```javascript
// 1. 編集ページにアクセスしてytknを取得
const editUrl = `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&wname=MemberDeck&cgid=${cgid}&dno=${dno}&request_locale=ja`;
await page.goto(editUrl, { waitUntil: 'networkidle' });

// 2. 空のスロットにカードを追加
await page.evaluate(() => {
  const allInputs = Array.from(document.querySelectorAll('input[name="monm"]'));
  const emptyInput = allInputs.find(inp => !inp.value || inp.value.trim() === '');

  const index = emptyInput.id.replace('monm_', '');
  emptyInput.value = '灰流うらら';
  document.querySelector(`#monum_${index}`).value = '1';
});

// 3. jQueryのAJAXで保存
const response = await page.evaluate(async ({cgid}) => {
  return new Promise((resolve) => {
    $.ajax({
      type: 'post',
      url: `/yugiohdb/member_deck.action?cgid=${cgid}&request_locale=ja`,
      data: 'ope=3&' + $('#form_regist').serialize(),
      dataType: 'json',
      success: (data) => resolve({ success: true, result: data.result }),
      error: (xhr) => resolve({ success: false, status: xhr.status })
    });
  });
}, {cgid});
```

**注意点**:
- `$('#form_regist').serialize()`でフォーム全体をシリアライズする
- `ope=3`をdataの先頭に追加する
- jQueryが必要（ページに既に読み込まれている）
- レスポンスはJSON形式: `{"result": true}` または `{"error": ["エラーメッセージ"]}`

### デッキ削除（ope=7）

**URL例**:
```
https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=7&wname=MemberDeck&ytkn={ytkn}&cgid={cgid}&dno={dno}&request_locale=ja
```

**実装方法**:
```javascript
function DeckDelete(){
    if(window.confirm('Are you sure you want to delete this Deck?')){
        location.href = "/yugiohdb/member_deck.action?ope=7&wname=MemberDeck&ytkn={ytkn}&cgid={cgid}&dno={dno}&request_locale=ja";
    }
}
```

**特徴**:
- 確認ダイアログが表示される
- GETリクエストでページ遷移
- ytknが必要（CSRF保護）
- 削除後はデッキ一覧ページ（ope=4）にリダイレクト

### デッキ複製（ope=8）

**URL例**:
```
https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=8&wname=MemberDeck&cgid={cgid}&dno={dno}&request_locale=ja
```

**特徴**:
- GETリクエストでページ遷移
- 新しいdnoは自動で割り当てられる
- 複製後は新しいデッキの編集ページ（ope=2）に遷移

### デッキコード発行（ope=13）

**URL例**:
```
https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=13&wname=MemberDeck&cgid={cgid}&dno={dno}&request_locale=ja
```

## カード検索機能（調査完了）

### 検索エンドポイント

`/yugiohdb/card_search.action`

**⚠️ 重要**: カード検索APIは**cgidパラメータ不要**です。`credentials: 'include'`でcookieが自動送信されるため、認証情報は十分です。

### 検索パラメータ

#### ctype (Card Type) - カードタイプフィルター

**⚠️ 重要**: ctypeは**selectボックス**で、ラジオボタンではありません。

```html
<select id="ctype" name="ctype">
  <option value="" class="tabset choice">Search All Cards</option>
  <option value="1" class="tabset">Monster Cards</option>
  <option value="2" class="tabset">Spell Cards</option>
  <option value="3" class="tabset">Trap Cards</option>
</select>
```

**パラメータ値とカードタイプの対応**:

| ctype値 | カードタイプ | 英語表記 |
|---------|------------|----------|
| `""` (空文字列) | すべてのカード | Search All Cards |
| `1` | モンスターカード | Monster Cards |
| `2` | 魔法カード | Spell Cards |
| `3` | 罠カード | Trap Cards |

**使用例**:
```javascript
// すべてのカードを検索
const url1 = 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&ctype=&request_locale=ja';

// モンスターカードのみ
const url2 = 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&ctype=1&request_locale=ja';

// 魔法カードのみ
const url3 = 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&ctype=2&request_locale=ja';

// 罠カードのみ
const url4 = 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&ctype=3&request_locale=ja';
```

### 検索結果の構造

検索結果ページでは、各カードが`.t_row.c_normal`クラスの要素として表示されます。

**カード要素の構造**:
```html
<div class="t_row c_normal">
  <div class="card_name">カード名</div>
  <div class="box_card_attribute">
    <img src="https://www.db.yugioh-card.com/yugiohdb/external/image/parts/attribute/attribute_icon_light.png" alt="光属性">
    <span>光属性</span>
  </div>
  <input type="hidden" class="cid" value="18732">
</div>
```

**カード情報の取得**:
```javascript
const cardRows = document.querySelectorAll('.t_row.c_normal');
cardRows.forEach(row => {
  const name = row.querySelector('.card_name')?.textContent?.trim();
  const cardId = row.querySelector('input.cid')?.value;
  // カードタイプは後述のDOM属性ベース判定方法で取得
});
```

### カードタイプ判定方法（重要）

**⚠️ 推奨される方法: DOM属性ベース**

検索結果ページでのカードタイプ判定は、**img要素のsrc属性**を使用します。

```javascript
const img = row.querySelector('.box_card_attribute img');
const src = img?.src || '';

let cardType;
if (src.includes('attribute_icon_spell')) {
  cardType = '魔法';
} else if (src.includes('attribute_icon_trap')) {
  cardType = '罠';
} else if (src.includes('attribute_icon_')) {
  // light, dark, water, fire, earth, wind, divine
  cardType = 'モンスター';
}
```

**利点**:
- **ロケール非依存**: 日本語、英語、韓国語などすべてのロケールで動作
- **保守性が高い**: テキスト変更に影響されない
- **信頼性が高い**: 画像パスはUIの中核部分で変更されにくい

**検出されるimgパターン**:

| カードタイプ | imgパターン |
|------------|-----------|
| 魔法カード | `attribute_icon_spell.png` |
| 罠カード | `attribute_icon_trap.png` |
| モンスターカード | `attribute_icon_light.png`<br>`attribute_icon_dark.png`<br>`attribute_icon_water.png`<br>`attribute_icon_fire.png`<br>`attribute_icon_earth.png`<br>`attribute_icon_wind.png`<br>`attribute_icon_divine.png` |

**❌ 非推奨: テキストベース判定**

```javascript
// ロケール依存のため非推奨
const spanText = row.querySelector('.box_card_attribute span')?.textContent?.trim();
if (spanText === '魔法') cardType = '魔法';
else if (spanText === '罠') cardType = '罠';
else cardType = 'モンスター';
```

この方法は日本語ロケール以外では動作しません。

### ブラウザJavaScriptからのFetch操作（調査完了）

**調査結果**: Chrome拡張のContent Scriptsから、ブラウザJavaScriptコンテキストでfetchを使用してHTMLを取得し、DOMParserでパースできることを確認しました。

**テスト結果**:
```javascript
// ✅ fetchは正常に動作
const response = await fetch('/yugiohdb/member_deck.action?ope=1&cgid=xxx&dno=4&request_locale=ja');
// Status: 200 OK

// ✅ DOMParserでHTML解析が可能
const parser = new DOMParser();
const doc = parser.parseFromString(html, 'text/html');

// ✅ 解析したdocからDOM操作が可能
const cards = doc.querySelectorAll('.card_name');
```

**CORSの考慮**:
- 同一オリジン内のfetchなので**CORS制限なし**
- `https://www.db.yugioh-card.com` 内のページから同じドメインのAPIを呼び出す

**Chrome拡張での実装方法**:
```typescript
// Content Script内での実装例
async function fetchDeckDetail(cgid: string, dno: number): Promise<Document> {
  const url = `/yugiohdb/member_deck.action?ope=1&cgid=${cgid}&dno=${dno}&request_locale=ja`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch deck detail: ${response.status}`);
  }

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  return doc;
}
```

## 未調査項目

1. **カード削除操作**
   - デッキからカードを削除する方法
   - 削除時のパラメータ

2. **デッキコードインポート**
   - コードからのデッキ読み込み方法

3. **カード詳細情報の取得**
   - カード詳細ページの構造
   - 効果テキスト、攻撃力・守備力などの取得方法

## Chrome拡張機能の実装方針

### Content Scriptによるアプローチ
- ページのDOMから直接データを抽出
- 既存のセッションを利用（認証処理不要）
- HTMLパーサー（Cheerio等）でカード情報を構造化

### 必要な機能
1. デッキ一覧の取得とパース
2. デッキ詳細の取得とパース
3. カード検索UIの拡張
4. デッキ編集UIの改善
5. インポート/エクスポート機能
6. 履歴管理

### 技術的課題
- HTMLレスポンスのパース（JSONAPIなし）
- ytknの動的取得と管理
- CSRFトークンの扱い
