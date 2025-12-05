# intro

カードの情報の取得、保存、読みだし、更新についての説明を行う

# 情報取得

## デッキ読み込み on デッキ表示ページ

api通信で必ず取得する
デッキ読み込みの際にデッキ表示ページから取得する(詳細は実装済み)

以下の項目は含まれない

- 複数画像(ciid=1の画像のciid,img_hashはある)
- ruby
- supply
- pend-supply
- related-cards
- related-faq
- related-products

## 検索結果 on 検索ページ

api通信で必ず取得する
検索結果からカード情報を取得する(詳細は実装済み)

以下の項目は含まれない(つまり、rubyは含まれる)

- 複数画像(ciid=1の画像のciid,img_hashはある)
- supply
- pend-supply
- related-cards
- related-faq
- related-products

## カード詳細 on カード詳細ページ

キャッシュ戦略に応じてapi通信をするか判断する。(下記参照)
カード詳細ページからカード情報を取得する(実装済み)

カードの情報はデッキ読み込みか検索結果から取得した情報がcache or temp dbにあるはずなので、
以下の項目を取得して補う

- 複数画像(ciid=1の画像のciid,img_hashはある)
- ruby
- supply
- pend-supply
- related-cards
- related-faq
- related-products

なお、infoタブを開く際はcid, ciidを引数として受け取っている
ciidはこの引数を必ず用いる。

# 情報保存

情報取得で取得された情報を、cache戦略に合わせて保存する
分岐条件の詳細はcache-db.mdを参照

情報を保存することが決まった場合、項目ごとに以下の分岐で保存する。

1. cache-dbに保存する条件を満たすなら、cache-dbに保存
2. それ以外はtemp-dbに保存する

# 情報読みだし・更新

情報を読み出す場合、以下のパターンがある

## 必ず同期api通信 and cache-dbに更新保存

- デッキ読み込み
- 検索結果
- カード詳細 and cache or temp dbに情報がない

情報自体に更新がない場合もfetch-atを更新する
ただし、fetch-atと同じ日付なら更新しない

## cache-dbから読み出し and 非同期でapi通信して情報更新 and cache-dbに更新保存
- カード詳細 and cache or temp dbに情報がある and (fetch-atが今日の日付ではない or related-productsがない)

情報を読み出す場合、まずcache or temp dbから読み出す
card tabの内容はまずその内容で表示する。

同時に非同期でapi通信を行い、情報を取得する。
cache or temp dbの情報と比較し、変更があればcache or temp dbへの保存と必要な項目の表示の更新を行う(不要な項目の更新は行わない)

## cache-db or temp-dbから読み出しのみ
- カード詳細 and cache or temp dbに情報がある and fetch-atが今日の日付