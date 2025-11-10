
## extension functions

### common

#### cgid取得

最初に以下の手順でcgidを取得する。
このcgidはユーザー固定であり、デッキ関連の操作で必須になる。

`#footer_menu > ul > li.my.menu_my_decks.sab_menu > a`
のurlのuspにcgidが含まれているので、ここからcgidを取得する。

- 形態: 現在ページの要素読み取り
- 引数: なし

#### 内部attribute

内部で以下の情報を少なくとも保持する

- cgid: ユーザーのcgid
- {dno, yktn, timestamp}: 直前に取得したdno, yktn

#### スクレイピング

カードのスクレイピングの際は、少なくとも
カードのすべての情報と、カード画像取得に必要なhashの取得が必要

### deck

chrome拡張機能でデッキ操作関連で実装する機能

#### 個別取得

公開url例: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95
非公開url例: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=9a5ed34d78cac56bbc223bc3f10bb904f5668e5bc8a3fdaa72a36954883c383a&cgid=3d839f01a4d87b01928c60f262150bec&dno=3

既存のデッキ個別の情報を取得する。

- 形態: デッキ個別閲覧ページのスクレイピング
- 引数: dno
- 返り値: デッキ情報

公開デッキなら認証不要

#### マイデッキ一覧取得

url: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4&wname=MemberDeck&cgid=3d839f01a4d87b01928c60f262150bec

自分のデッキ一覧のdnoとデッキ名を取得する。

- 形態: デッキ一覧ページのスクレイピング

認証必要

#### 上書き保存

編集ページurl例: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&wname=MemberDeck&cgid=3d839f01a4d87b01928c60f262150bec&dno=3&request_locale=ja

既存のデッキの上書き保存
dnoごとの直前のyktnが必要になる。

yktnが直前に取得済みでない、または失敗した場合は、
内部で個別取得して再度実行する

- 形態: api
- 引数: dno, デッキ情報

認証必要

#### 新規作成

- 形態: api
- 返り値: dno, デッキ名

認証必要

#### 複製

既存デッキを複製して新しいデッキを作成する。
新規作成、個別取得、上書き保存を組み合わせる

### カード

以下は認証不要

#### 検索

url: https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=2&rp=100&page=1&mode=1&stype=1&level4=on&level5=on&level6=on&level7=on&level8=on&link_m=2&othercon=2&releaseYStart=1999&releaseMStart=1&releaseDStart=1&sort=21&page=1

- 形態: 検索ページのスクレイピング
- 引数: queryや各種検索条件の辞書
- 引数の指定に応じて、新しい収録順で複数回取得することで全件のカード情報を取得する。

#### カード詳細 and QA取得

カード詳細情報とカードQA一覧取得の両方を実行する

#### カード詳細情報

url例: https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=12976&sess=2&sort=21&rp=10&page=1


- 形態: カード個別情報ページのスクレイピング
- 引数: cid(カードid)
- ページからは以下の情報を取得する
    - 通常のカードparseで取得されるのと同様の情報(ただしページ構造はカード検索ページなどとは異なる)
    - 収録シリーズ
    - 関連カード(デフォルトでは一ページに50音順10件ずつしか表示されないが、uspを適切に設定して複数回呼び出すことで新しい収録順で全件のカード情報を取得する)

#### カードQA一覧取得

url例: https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=5533&sort=1&page=8

- 形態: スクレイピング
- 引数: cid
- ページから取得する情報
    - カードテキスト
    - 補足情報
    - カード関連QA(これも複数回取得で参照多い順で全件取得する)

#### 個別QA詳細取得

url例: https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=115&keyword=&tag=-1

- 形態: スクレイピング
- 引数: fid
- ページから取得する情報
    - question
    - answer

## research

### init and cgid

調査の際はログイン済みである必要がある。

`#footer_menu > ul > li.my.menu_my_decks.sab_menu > a`
のurlのuspにcgidが含まれているので、ここからcgidを取得する。
含まれていなければ、ログインされていないので、
ブラウザを開いてユーザーにログインを要求する。

また、基本の言語は日本語である必要がある。
