# デッキ編集画面の仕組み

## 調査日時
2025-10-30

## 概要

デッキ編集画面（ope=2）では、カード名と枚数を手動で入力してデッキを編集する。
この拡張機能では、この画面自体は使用しないが、データ構造の理解のために調査を行った。

## フォーム構造

### フォームID
- `form_regist` (method: GET)

### デッキメタ情報

| フィールド | name属性 | 説明 |
|-----------|---------|------|
| デッキ名 | `dnm` | デッキの名前 |
| 公開フラグ | `pflg` | 公開/非公開の選択 (select) |
| デッキタイプ | `deck_type` | OCG/スピード/DL/MD (radio) |
| デッキスタイル | `deckStyle` | デッキのスタイル (radio) |
| カテゴリー | `dckCategoryMst` | カテゴリー選択 (select multiple) |
| タグ | `dckTagMst` | タグ選択 (select multiple) |
| コメント | `biko` | デッキのコメント (textarea) |

### カード情報の入力フィールド

デッキ内の各カードは、以下の4つのフィールドで構成される：

#### 1. カード名 (monm)
```html
<input
  type="text"
  name="monm"
  id="monm_1"
  class="keyword"
  value="Vanquish Soul Caesar Valius"
/>
```

**属性:**
- `name`: `monm`（全カード共通）
- `id`: `monm_1`, `monm_2`, `monm_3`...（連番）
- `class`: `keyword`
- `type`: `text`
- `value`: カード名（英語表記）

#### 2. 枚数 (monum)
```html
<input
  type="text"
  name="monum"
  id="monum_1"
  class="cnum t_center"
  value="1"
/>
```

**属性:**
- `name`: `monum`（全カード共通）
- `id`: `monum_1`, `monum_2`, `monum_3`...（連番）
- `class`: `cnum t_center`
- `type`: `text`（数値を格納）
- `value`: 枚数（"1", "2", "3"）

#### 3. カードID (monsterCardId)
```html
<input
  type="hidden"
  name="monsterCardId"
  value="18732"
/>
```

**属性:**
- `name`: `monsterCardId`（全カード共通）
- `type`: `hidden`
- `value`: カードの一意なID

#### 4. 画像ID (imgs)
```html
<input
  type="hidden"
  name="imgs"
  value="18732_1_1_1"
/>
```

**属性:**
- `name`: `imgs`（全カード共通）
- `type`: `hidden`
- `value`: カード画像の識別子

## フィールド数

調査の結果、以下の数のフィールドが用意されている：
- `monm` (カード名): 実際に入力済みのカード数
- `monum` (枚数): 65個（総フィールド数）

※ 65個という数は、おそらく以下の構成：
- メインデッキ: 最大40枚
- エクストラデッキ: 最大15枚
- サイドデッキ: 最大15枚
- 合計: 70枠（一部は未使用）

## ID命名規則

各フィールドには連番のIDが付与される：
- カード名: `monm_1`, `monm_2`, `monm_3`...
- 枚数: `monum_1`, `monum_2`, `monum_3`...

※ IDの番号は、カード名と枚数で対応している。

## データ送信

デッキ保存時（ope=3）は、フォーム内の全データが`$('#form_regist').serialize()`でシリアライズされ、AJAX POSTで送信される。

```javascript
$.ajax({
    type: 'post',
    url: '/yugiohdb/member_deck.action?cgid={cgid}&request_locale=ja',
    data: 'ope=3&' + $('#form_regist').serialize(),
    dataType: 'json',
    success: function(data, dataType) {
        if (data.result) {
            location.href = "/yugiohdb/member_deck.action?cgid={cgid}&dno={dno}&request_locale=ja";
        }
    }
});
```

## 拡張機能での活用

この構造を理解することで、以下の実装が可能になる：

1. **カード情報の抽出**: DOM解析により、カード名・枚数・IDを取得
2. **デッキの構築**: プログラマティックにフィールドを操作してデッキを構築
3. **データの検証**: 入力されたカード名が正しいか検証
4. **インポート機能**: 外部データからデッキを復元

ただし、本拡張機能では、この手動入力画面は使用せず、カード検索機能からの追加を主に実装する予定。
