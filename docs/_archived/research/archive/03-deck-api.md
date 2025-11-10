# デッキ管理API調査レポート

## 既知のエンドポイント（docs/design/pre/research.mdより）

### 1. マイデッキ一覧
```
GET /yugiohdb/member_deck.action?ope=4&wname=MemberDeck&cgid={cgid}
```

### 2. 個別デッキ表示
```
GET /yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn={ytkn}&cgid={cgid}&dno={deck_number}
```

### 3. デッキ編集
```
GET /yugiohdb/member_deck.action?ope=2&wname=MemberDeck&cgid={cgid}&dno={deck_number}&request_locale=ja
```

### 4. デッキ検索（公開デッキ）
```
GET /yugiohdb/deck_search.action?wname=MemberDeck
```

## パラメータ解析

### ope (Operation)
- `1`: デッキ表示
- `2`: デッキ編集
- `4`: デッキ一覧

### wname (Window Name?)
- `MemberDeck`: マイデッキ関連
- `MyCard`: マイカード関連

### cgid (認証ID?)
- 例: `87999bd183514004b8aa8afa1ff1bdb9`
- 形式: 32文字の16進数（MD5ハッシュっぽい）
- 推測: ユーザーまたはセッションの識別子

### ytkn (CSRF Token)
- 例: `fc078c7fa46938e2b20f3c998792bedf7bef5f7229a0132e3071c7f761120d80`
- 形式: 64文字の16進数（SHA-256ハッシュっぽい）
- 用途: CSRF保護トークン

### dno (Deck Number)
- 例: `214`
- 用途: デッキID

## 調査すべき項目

### 最優先
- [ ] cgidの取得方法
  - ログイン後のレスポンスヘッダー？
  - Cookie？
  - HTMLに埋め込まれている？
  
- [ ] ytknの取得方法
  - デッキ一覧ページのHTML内？
  - 専用APIエンドポイント？
  - JavaScriptで動的生成？

### 高優先度
- [ ] デッキ作成のリクエスト形式
  - POST /yugiohdb/member_deck.action?
  - 必要なパラメータ
  - リクエストボディの形式

- [ ] デッキ更新のリクエスト形式
  - カード追加・削除の方法
  - 送信するデータ構造

- [ ] デッキ削除のリクエスト形式

### 中優先度
- [ ] デッキ名の最大文字数
- [ ] デッキ数の上限
- [ ] カード枚数制限の実装方法
- [ ] エラーレスポンスの形式

## 次の調査アクション

実際にログインして以下を確認:
1. ログイン後のページHTMLからcgid, ytknを探す
2. ブラウザ開発者ツールでデッキ編集時のネットワークリクエストを記録
3. デッキ作成・更新・削除の実際のリクエストを観察
4. レスポンスの形式を確認

## 調査方法

### 手順
1. Chrome DevToolsを開く
2. Networkタブを有効化
3. 遊戯王公式サイトにログイン
4. マイデッキページへ移動
5. HTMLソースからcgid, ytknを検索
6. デッキ編集操作を実施
7. 全てのリクエスト/レスポンスを記録
