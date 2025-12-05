# intro

現状のオプションページはひどいデザインと構成だ。
以下で作り直す。

また、陳腐化をわかりやすくするため、各タブごとにページの右下に更新日とversionを表示する。

# 画面構成

## top bar

左から

- アイコン
- ページ名: YuGiOh NEXT Options

## tab title bar 1

対象の画面に対応したtab切り替え

以下が左からの項目
- デッキ編集画面
- 公式デッキ表示画面
- General

## tab title bar 2 and main content

画面ごとに目次を兼ねたtab title bar2を配置して、その下にmain contentを配置する

### デッキ編集画面タブ

tab title2とmain contentは以下の通り
#### 概要とアクセス

この画面自体およびこの画面でできることの概要

アクセス手段は以下の3つ
- url:
- popupからの押下
- 公式デッキ表示画面での「NEXT編集」(opt out可能)


- 画像: store紹介用の画像1,2

#### UI

以下、設定可能項目
- 表示する画像の大きさ: s,m,l(def),xl
- 検索入力欄の位置: right top(def)/right bottom/left bottom
- side,extraセクションの配置: 縦(def)、横

#### UX

- デッキ枚数制限: no limit(def)/ current limit
- 未保存時の警告: alway(def)/ without sorting order only/ never
- 右クリックでカード移動、中クリックでカード追加: enable/ disable(def)

#### General
- opt out option: 「デッキ編集画面」タブ全体
- cache-dbリセット


### 公式デッキ表示画面タブ

tab title2とmain contentは以下の通り

#### 概要とアクセス

この画面自体およびこの画面でできることの概要

アクセスは通常の公式手段と同じ
- url: 
- マイデッキやデッキ検索でのデッキ名

- 画像: store紹介用の画像3

#### シャッフル

- opt out option: このタブ全体
- 画像: store紹介用の画像3


#### 画像作成

画像作成の説明

- opt out option: このタブ全体
- 画像: store紹介用の画像3

### Generalタブ

tab title2とmain contentは以下の通り

#### General

- 設定リセット
- カラーテーマ(現在は機能していないので非表示)
- 言語(現在は機能していないので非表示)