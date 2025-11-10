# Chrome拡張機能の手動インストール手順

Google Chromeでは`--load-extension`フラグがサポートされていないため、手動で拡張機能を読み込む必要があります。

## 手順

### 1. 拡張機能をビルド

```bash
cd extension
npm run build
```

ビルド成果物が`extension/dist/`に生成されます。

### 2. Chromeで拡張機能を読み込む

1. Google Chromeを開く
2. アドレスバーに`chrome://extensions/`と入力してEnter
3. 右上の**「デベロッパーモード」をON**にする
4. 左上の**「パッケージ化されていない拡張機能を読み込む」**をクリック
5. `extension/dist`フォルダを選択
6. 拡張機能「遊戯王デッキヘルパー」がリストに追加される

### 3. テストUIにアクセス

以下のURLにアクセスしてテストUIが表示されることを確認：

```
https://www.db.yugioh-card.com/yugiohdb/#/ytomo/test
```

正常に動作していれば、公式サイトのコンテンツが消えて、テスト用UIが表示されます。

## デプロイ後の更新

拡張機能を更新した場合：

1. ビルド: `cd extension && npm run build`
2. デプロイ: `./scripts/deploy.sh`
3. Chrome拡張機能ページ（`chrome://extensions/`）で、拡張機能の**更新ボタン（リロードアイコン）をクリック**

## トラブルシューティング

### テストUIが表示されない

1. Chromeのデベロッパーツール（F12）を開く
2. Consoleタブで以下のログを確認：
   - `Loading test UI...` - Content scriptが実行されている
   - `Test UI loaded successfully` - UIの読み込み成功
3. ログが表示されない場合：
   - `chrome://extensions/`で拡張機能が**有効**になっているか確認
   - 拡張機能の**「エラー」**ボタンがあれば、クリックしてエラー内容を確認

### 拡張機能がリストに表示されない

1. `extension/dist/manifest.json`が存在するか確認
2. manifest.jsonの構文エラーがないか確認（Chromeがエラーメッセージを表示）

## 注意事項

- **開発モードの拡張機能は永続的ではありません**
- Chromeを再起動すると、拡張機能が無効化される場合があります
- その場合は`chrome://extensions/`で再度有効化してください
