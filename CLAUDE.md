# プロジェクト固有のルール

## ブラウザ制御の方針

### ⚠️ 重要な制約

**Playwrightのブラウザではログインできない制約があります。**

そのため、本プロジェクトでは以下の方針で開発を進めます：

### ✅ 正しい方法: Chrome DevTools Protocol（CDP）を使用

普通のGoogle Chromeをリモートデバッグモードで起動し、WebSocket経由で制御します。

#### 起動方法

```bash
# Chrome起動（リモートデバッグモード + 拡張機能ロード）
./scripts/debug/setup/start-chrome.sh

# 停止
./scripts/debug/setup/stop-chrome.sh
```

#### 接続方法

```javascript
const WebSocket = require('ws');
const fs = require('fs');

// WebSocket URLを読み込み（start-chrome.shが自動生成）
const wsUrl = fs.readFileSync('.chrome_playwright_ws', 'utf8').trim();
const ws = new WebSocket(wsUrl);

// Chrome DevTools Protocolでコマンド送信
function sendCommand(method, params = {}) {
  return new Promise((resolve) => {
    const id = messageId++;
    const handler = (data) => {
      const message = JSON.parse(data);
      if (message.id === id) {
        ws.off('message', handler);
        resolve(message.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

// ページ操作例
await sendCommand('Page.navigate', { url: 'https://...' });
await sendCommand('Runtime.evaluate', { expression: 'document.title' });
```

#### この方法の利点

1. **ログイン可能**: 普通のChromeブラウザなので、ユーザーが手動でログインできる
2. **セッション永続化**: `--user-data-dir=.chrome_cache` でログイン状態を保持
3. **拡張機能ロード**: `--load-extension` でChrome拡張を読み込める
4. **実機での動作確認**: 本番環境と同じブラウザで動作確認できる

### ❌ 避けるべき方法

#### 1. Google Chromeの使用

```bash
# これは動作しない！
google-chrome --load-extension=... --remote-debugging-port=9222
```

**理由**:
- Google Chromeは `--load-extension` フラグを無視する
- ログに `WARNING: --load-extension is not allowed in Google Chrome, ignoring.` が出力される

#### 2. Playwright persistentContext

```javascript
// これは使わない！
const browser = await chromium.launchPersistentContext(userDataDir, {
  args: ['--load-extension=...']
});
```

**理由**:
- Playwrightが使用するChromiumはログイン制約がある
- 本番環境との動作差異が発生する可能性

### 参考ドキュメント

- **調査手法の詳細**: `docs/research/investigation-methodology.md`
- **セットアップスクリプト**: `scripts/debug/setup/`

## Build & Deploy

```bash
# ビルド（TypeScript → JavaScript）
npm run build

# デプロイ（dist/ を本番環境にコピー）
./scripts/deploy.sh
```

### デプロイ先

- WSL環境: `/home/tomo/user/Mine/_chex/src_ygoNeuronHelper`
- Windows環境: `C:\Users\tomo\Mine\_chex\src_ygoNeuronHelper`

## テスト

```bash
# ユニットテスト（Jest）
npm test

# E2Eテスト（Chrome CDP経由）
node tmp/test-*.js
```

### テストページ

拡張機能は `https://www.db.yugioh-card.com/yugiohdb/#/ytomo/test` でテストUIを表示します。

## ファイル構成の重要なルール

### `.gitignore` 管理

以下のディレクトリは`.gitignore`に含まれています：
- `tmp/` - 一時的なテストスクリプトやデバッグファイル
- `.chrome_cache/` - Chromeのユーザープロファイル
- `dist/` - ビルド出力
- `node_modules/` - npmパッケージ

### `tmp/` と `/tmp/` の区別

- `./tmp/` : プロジェクトルートのtmpディレクトリ（一時的なテストスクリプト）
- `/tmp/` : システムのtmpディレクトリ

**必ずプロジェクトルートの`./tmp/`を使用すること！**

## バージョン管理

現在のバージョン番号は `version.dat` に記載されています。

更新時の基準：
- **メジャー**: 大きな変更や互換性のない変更
- **マイナー**: 新機能の追加や改善
- **パッチ**: バグ修正や小さな変更
