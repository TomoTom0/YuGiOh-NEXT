# ブラウザテスト

Chrome拡張機能の実装された機能に関する動作確認を行うテストスイートです。

Chrome DevTools Protocol（CDP）を使用して、Chromiumブラウザ上で拡張機能が正しく動作することを確認します。

## 前提条件

### 1. Chromiumの起動

テストを実行する前に、拡張機能をロードした状態でChromiumを起動する必要があります。

```bash
# Chromium起動（リモートデバッグモード + 拡張機能ロード）
./scripts/debug/setup/start-chrome.sh
```

このスクリプトは以下を実行します：
- Chromiumをリモートデバッグモードで起動
- 拡張機能を自動ロード
- WebSocket URLを `.chrome_playwright_ws` に保存

### 2. 依存パッケージのインストール

WebSocket通信のため、`ws` パッケージが必要です。

```bash
npm install
```

## テストファイル一覧

### `cdp-helper.js`

Chrome DevTools Protocolを使用するための共通ヘルパー関数です。

**主な機能**:
- `connectCDP()`: WebSocket接続を確立
- `evaluate(expression)`: JavaScriptコードを評価
- `navigate(url)`: ページに移動
- `wait(ms)`: 指定時間待機
- `close()`: 接続を閉じる

### `test-buttons.js`

ボタンの表示状態を確認するテストです。

**確認項目**:
1. シャッフルボタンの存在
2. ソートボタンの存在
3. デッキ画像作成ボタンの存在
4. カメラアイコンのSVG塗りつぶしがないこと（`fill: none`）
5. ボタンの配置位置

**実行方法**:
```bash
node tests/browser/test-buttons.js
```

### `test-shuffle.js`

カードシャッフル・ソート機能の動作確認テストです。

**確認項目**:
1. シャッフルボタンをクリックしてカードの順序が変わること
2. ソートボタンをクリックしてカードが元の順序に戻ること
3. アニメーションクラス（`animating`）が適用されること

**実行方法**:
```bash
node tests/browser/test-shuffle.js
```

### `test-lock.js`

Lock機能（sortfix）の動作確認テストです。

**確認項目**:
1. カード右上1/4エリアをクリックしてロック状態になること
2. ロック状態のカードに視覚的フィードバックがあること
   - `data-sortfix` 属性の付与
   - 青緑色の背景
   - 右上に南京錠アイコン
3. ロックされたカードがデッキ先頭に移動すること
4. シャッフル時にロックされたカードの順序が保持されること
5. もう一度クリックするとロックが解除されること

**実行方法**:
```bash
node tests/browser/test-lock.js
```

### `test-dialog.js`

デッキ画像作成ダイアログの動作確認テストです。

**確認項目**:
1. カメラボタンをクリックしてダイアログが表示されること
2. デッキ名入力フィールドが存在すること
3. ダイアログをクリックして背景色が切り替わること（赤↔青）
4. QRトグルボタンでQRコードのON/OFF切り替えができること
5. ダウンロードボタンが存在すること
6. オーバーレイをクリックしてダイアログが閉じること

**実行方法**:
```bash
node tests/browser/test-dialog.js
```

## テスト対象URL

すべてのテストは以下の公開デッキURLでテストを実行します（認証不要）：

```
https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95
```

## 全テストの実行

すべてのテストを順番に実行する場合：

```bash
node tests/browser/test-buttons.js && \
node tests/browser/test-shuffle.js && \
node tests/browser/test-lock.js && \
node tests/browser/test-dialog.js
```

## トラブルシューティング

### `Error: ENOENT: no such file or directory, open '.chrome_playwright_ws'`

Chromiumが起動していません。以下のコマンドでChromiumを起動してください：

```bash
./scripts/debug/setup/start-chrome.sh
```

### `WebSocket connection error`

Chromiumが終了している可能性があります。Chromiumを再起動してください：

```bash
./scripts/debug/setup/stop-chrome.sh
./scripts/debug/setup/start-chrome.sh
```

### テストが途中で失敗する

ページのロード時間が不足している可能性があります。各テストの `wait` 時間を調整してください。

```javascript
await cdp.wait(5000); // 5秒待機（必要に応じて延長）
```

## テストの追加

新しいテストを追加する場合：

1. `cdp-helper.js` をインポート
2. `connectCDP()` で接続を確立
3. `navigate(url)` でページに移動
4. `evaluate(expression)` でDOM操作・確認
5. テスト終了時に `close()` で接続を閉じる

**テンプレート**:

```javascript
const { connectCDP } = require('./cdp-helper');

async function testExample() {
  console.log('【テスト名】\n');

  const cdp = await connectCDP();

  try {
    await cdp.navigate('https://...');
    await cdp.wait(5000);

    const result = await cdp.evaluate(`
      // JavaScriptコード
      document.title
    `);

    console.log('結果:', result);

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

testExample();
```

## 参考資料

- [Chrome DevTools Protocol Documentation](https://chromedevtools.github.io/devtools-protocol/)
- [WebSocket (ws) npm package](https://www.npmjs.com/package/ws)
