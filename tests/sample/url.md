
### 個別デッキ詳細

- 公開url例: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95
- イラスト違いを含む公開デッキ: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=3d839f01a4d87b01928c60f262150bec&dno=8&request_locale=ja
- 非公開url例: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=9a5ed34d78cac56bbc223bc3f10bb904f5668e5bc8a3fdaa72a36954883c383a&cgid=3d839f01a4d87b01928c60f262150bec&dno=3


公開デッキなら認証不要

### マイデッキ一覧

url: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4&wname=MemberDeck&cgid=3d839f01a4d87b01928c60f262150bec

認証必要

### 編集ページ

url例: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&wname=MemberDeck&cgid=3d839f01a4d87b01928c60f262150bec&dno=3&request_locale=ja

認証必要

## カード

以下は認証不要

### 検索

url: https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=2&rp=100&page=1&mode=1&stype=1&level4=on&level5=on&level6=on&level7=on&level8=on&link_m=2&othercon=2&releaseYStart=1999&releaseMStart=1&releaseDStart=1&sort=21&page=1


#### カード詳細情報

url例: https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=12976&sess=2&sort=21&rp=10&page=1

#### カードQA一覧取得

url例: https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=5533&sort=1&page=8


#### 個別QA詳細取得

url例: https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=115&keyword=&tag=-1


## research

### init and cgid

認証済みページ調査の際はログイン済みである必要がある。

`#footer_menu > ul > li.my.menu_my_decks.sab_menu > a`
のurlのuspにcgidが含まれているので、ここからcgidを取得する。
含まれていなければ、ログインされていないので、
ブラウザを開いてユーザーにログインを要求する。

また、基本の言語は日本語である必要がある。

認証不要ページは単にcurlすればよい。