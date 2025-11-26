## intro

### card-tier

- 5: 直近の五回で開いたデッキに含まれるカード
- 4: 直近一週間でデッキに追加、カード詳細を表示したカード
- 3: 直近一か月以内にデッキに追加、カード詳細を表示したカード
- 2: 直近一週間以内に検索で表示されたカード
- 1: 直近一か月以内に検索で表示されたカード
- 0: その他全てのカード


#### table tier

- card id, pk
- tier: 0-5
- last-added: date
- last-shown-detail: date
- last-searched: date

## card

### table a

tier 0以上

- card id, pk
- name
- ruby
- imgs: ciid, img_hash
- fetched-at

### table b

tier 0以上

- card id, pk
- type
- attr
- race
- level
- atk
- def
- scale
- limit-status
- fetched-at

### table b2

tier 0以上

- card id, pk
- text
- pend-text

### table c

- tier: 3以上なら確保

今日検索で表示されたカードはtemp db(chrome storageには保存しない)

以下、構造

- card id, pk
- suppl
- pend-suppl
- suppl-date
- pend-suppl-date
- related-card: [card id]
- related-product: [product id]

- fetched-at

## proruct

### table a
related-productで取得された情報

- pack-id, pk
- pack-name
- pack-date
- pack-shortid
- fetched-at

### table b
展開された情報

- pack-id, pk
- [{card-id, rarerity}]
- fetched-at

## faq

### table a
表示したFAQの質問一覧
- faq id, pk
- question
- updated-at
- fetched-at

### table b
展開したFAQの回答一覧
- faq id, pk
- answer
- fetched-at
