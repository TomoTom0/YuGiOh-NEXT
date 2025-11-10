# 開発用ツール

このディレクトリには、開発・テスト用のスクリプトが含まれています。

## ファイル

### session.example.env
セッション情報のテンプレート。
これをコピーして `.env.local` を作成し、実際のセッション情報を設定します。

### test-api.ts
APIの動作確認用スクリプト。
ブラウザから取得したセッション情報を使って、ローカル環境からAPIをテストできます。

## 使い方

### 1. セッション情報の取得

1. Chromeで遊戯王公式サイトにログイン
2. F12でDevToolsを開く
3. Consoleタブで以下を実行:
```javascript
// セッション情報をコピー
copy(document.cookie)

// cgidを取得（デッキページで）
console.log('cgid:', document.querySelector('[name="cgid"]')?.value);

// ytknを取得（デッキ編集ページで）
console.log('ytkn:', document.querySelector('[name="ytkn"]')?.value);
```

### 2. .env.local の作成

```bash
cp dev/session.example.env .env.local
# エディタで .env.local を開いて、取得した値を設定
```

### 3. テストスクリプトの実行

```bash
# 必要なパッケージをインストール
npm install -D tsx dotenv

# テスト実行
npx tsx dev/test-api.ts
```

## 注意事項

⚠️ **セキュリティ**
- `.env.local` は絶対にGitにコミットしないこと
- セッション情報は個人情報なので厳重に管理
- 他人と共有しないこと

⚠️ **有効期限**
- セッション情報には有効期限があります
- 「セッションが無効」エラーが出たら再取得が必要

## 出力ファイル

テストスクリプトは `tmp/` ディレクトリにHTMLファイルを保存します:
- `tmp/card-search.html` - カード検索結果
- `tmp/deck-list.html` - デッキ一覧

これらのファイルを使ってHTMLパーサーの開発・デバッグができます。
