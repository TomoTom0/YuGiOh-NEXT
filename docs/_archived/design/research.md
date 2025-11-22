## intro

これから新たに遊戯王公式のneuronサイトを効率的に利用するアプリを作成するにあたり、公式サイトのapiや制限を調べる。

## product

### 形態

下記のいずれか。
cors制限や認証情報の取得制限によっては、chrome拡張機能が最適解となる可能性が高い。

- chrome拡張機能
- 静的webアプリ

### 機能

- guiでの快適なデッキ編集 (快適でスムーズなux)
- デッキのインポート/エクスポート
- デッキの差分履歴管理
- デッキの共有
- カード検索
- 公式サービスとの密なデータ連携

## research

### カード検索

カード検索(および一覧でのカード情報取得)は可能なことが分かっている。
apiは存在せず、生成htmlをパースする形になる。

- https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&rp=10&mode=&sort=1&keyword=&stype=1&ctype=&attr=15&species=1&othercon=2&other=1&jogai=2&starfr=&starto=&level8=on&pscalefr=&pscaleto=&linkmarkerfr=&linkmarkerto=&link_m=2&atkfr=&atkto=&deffr=&defto=&releaseDStart=1&releaseMStart=1&releaseYStart=1999&releaseDEnd=&releaseMEnd=&releaseYEnd=

### カード画像

cors制限あったかも

```html
<img id="card_image_0_1" alt="アモルファージ・イリテュム" title="アモルファージ・イリテュム" class="none ui-draggable ui-draggable-handle" src="/yugiohdb/get_image.action?type=1&amp;osplang=1&amp;cid=12303&amp;ciid=1&amp;enc=bVhQ0ccEZZjBgr9btCE9dA" style="position: relative; display: inline;">
```

### カード情報個別

- https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=12303

### カード情報個別FAQ

- https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=12303

### マイデッキ一覧

- https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4&wname=MemberDeck&cgid=87999bd183514004b8aa8afa1ff1bdb9

### 個別デッキ

https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=fc078c7fa46938e2b20f3c998792bedf7bef5f7229a0132e3071c7f761120d80&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=214

### デッキ編集

- https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=2&wname=MemberDeck&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=214&request_locale=ja

### login

要調査
apiやapikey, oidcでのログインがあればいいが難しいか。
konami idでの認証情報に関して調べよ。

