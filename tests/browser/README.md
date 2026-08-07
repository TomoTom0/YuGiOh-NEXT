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
- WebSocket URLを `configs/browser.toml` の `chrome.ws_file` に指定されたファイルに保存

### 2. 依存パッケージのインストール

WebSocket通信のため、`ws` パッケージが必要です。

```bash
npm install
```

## テストファイル一覧

### `cdp-helper.cjs`

Chrome DevTools Protocolを使用するための共通ヘルパー関数です。

**主な機能**:
- `connectCDP()`: WebSocket接続を確立
- `evaluate(expression)`: JavaScriptコードを評価
- `navigate(url)`: ページに移動
- `wait(ms)`: 指定時間待機
- `close()`: 接続を閉じる

### `test-buttons.cjs`

ボタンの表示状態を確認するテストです。

**確認項目**:
1. シャッフルボタンの存在
2. ソートボタンの存在
3. デッキ画像作成ボタンの存在
4. カメラアイコンのSVG塗りつぶしがないこと（`fill: none`）
5. ボタンの配置位置

**実行方法**:
```bash
node tests/browser/test-buttons.cjs
```

### `test-shuffle.cjs`

カードシャッフル・ソート機能の動作確認テストです。

**確認項目**:
1. シャッフルボタンをクリックしてカードの順序が変わること
2. ソートボタンをクリックしてカードが元の順序に戻ること
3. アニメーションクラス（`animating`）が適用されること

**実行方法**:
```bash
node tests/browser/test-shuffle.cjs
```

### `test-lock.cjs`

Lock機能（sortfix）の動作確認テストです。

**確認項目**:
1. `.top-right` ボタンをクリックしてロック状態になること
2. ロック状態のカードに視覚的フィードバックがあること
   - `data-ygo-next-sortfix` 属性の付与
   - `.top-right` ボタンの `.is-sortfixed` クラス
   - 南京錠アイコン（SVG）
3. シャッフル時にロックされたカードが先頭に保持されること
4. もう一度クリックするとロックが解除されること

**前提**: 公開デッキURL（認証不要）で実行。クリック対象は `<a>` ではなく子の `.ygo-next-card-btn.top-right` ボタン（DOMイベントは子孫に伝播しないため）。

**実行方法**:
```bash
node tests/browser/test-lock.cjs
```

### `test-dialog.cjs`

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
node tests/browser/test-dialog.cjs
```

### `test-scroll-to-top.cjs`

scroll-to-top機能の動作確認テストです。

**確認項目**:
1. search tabでのscroll-to-top動作
   - カード検索後、スクロール可能であることを確認
   - scroll-to-topボタンをクリックしてトップに戻ること
2. related tabでのscroll-to-top動作
   - 関連カードが多いカード（ブラック・マジシャン）で確認
   - scroll-to-topボタンをクリックしてトップに戻ること
3. products tabでのscroll-to-top動作
   - パック展開後、scroll-to-topボタンをクリックしてトップに戻ること

**実行方法**:
```bash
node tests/browser/test-scroll-to-top.cjs
```

**詳細**: [README-scroll-to-top.md](./README-scroll-to-top.md) を参照

### `test-card-add-animation.cjs`

カード追加アニメーションの動作確認テストです。

**確認項目**:
1. 左下ボタンクリックでアニメーションが発生すること
2. 右クリックでアニメーションが発生すること
3. 中クリックでアニメーションが発生すること

**実行方法**:
```bash
node tests/browser/test-card-add-animation.cjs
```

### `test-card-search-flow.cjs`

カード検索フロー（検索 → パース → キャッシュ）の完全フロー確認テストです。

**確認項目**:
- キーワード入力 → 検索実行 → 結果表示 → キャッシュ動作確認

**実行方法**:
```bash
node tests/browser/test-card-search-flow.cjs
```

### `test-cardinfo-menu.cjs`

CardInfo メニューボタンの表示テストです。

**確認項目**:
1. メニューボタンと画像選択ボタンがサイドバイサイドで表示されること（flex-row）
2. メニュー外をクリックするとメニューが閉じること
3. メニューを閉じるときにアニメーションが実行されること

**実行方法**:
```bash
node tests/browser/test-cardinfo-menu.cjs
```

### `test-deck-code-issuance.cjs`

デッキコード発行機能のテストです（PR #82）。デッキ詳細ページでデッキコードが正しく発行・ローカルストレージに保存されることを確認します。

**実行方法**:
```bash
node tests/browser/test-deck-code-issuance.cjs
```

### `test-deck-creation.cjs`

デッキ新規作成機能のテストです。デッキ編集ページ（`#/ytomo/edit`）で新規デッキが正しく作成されることを確認します。

**実行方法**:
```bash
node tests/browser/test-deck-creation.cjs
```

### `test-filter-dialog-header.cjs`

検索フィルターダイアログのヘッダー表示テストです。

**確認項目**:
1. フィルター設定後、ダイアログヘッダーにチップが表示されること
2. クリアボタンがアイコンで表示されること
3. 閉じるボタンが「×」で表示されること
4. AND/ORチップのスタイルが正しいこと（リンクマーカー、モンスタータイプ）

**実行方法**:
```bash
node tests/browser/test-filter-dialog-header.cjs
```

### `test-filter-not-condition.cjs`

検索フィルターのNOT条件・論理演算のAPIパラメータ変換テストです。

**確認項目**:
1. NOT条件（除外モンスタータイプ）が正しくAPIパラメータに変換されること
2. AND/OR論理演算が正しくAPIパラメータに変換されること
3. ペンデュラムスケール、魔法・罠タイプ、発売日等のフィルターが正しく変換されること

**実行方法**:
```bash
node tests/browser/test-filter-not-condition.cjs
```

### `test-header-resize.cjs`

デッキ編集画面のヘッダー成長時スクロール到達性の回帰テストです（TASK-286）。

**確認項目**:
1. ヘッダーが遅延ロード（画像・バナー等）で成長した際、`--header-height` がResizeObserverで追従すること
2. `.deck-edit-container` がviewport内に収まること
3. 一番下までスクロールしてもトラッシュセクションが見切れないこと

**実行方法**:
```bash
node tests/browser/test-header-resize.cjs
```

**前提**: editページでログイン済みであること

### `test-load-dialog-flow.cjs`

LoadDialog（デッキ読み込みダイアログ）の完全フロー確認テストです。

**確認項目**:
- ダイアログ表示 → デッキ一覧表示 → ページネーション → デッキ読み込み

**実行方法**:
```bash
node tests/browser/test-load-dialog-flow.cjs
```

### `test-mappings.cjs`

マッピング取得テストです。Content scriptが正常に動作し、マッピング取得とChrome Storage保存が機能するかを確認します。

**注意**: Chrome Storage APIは拡張機能内でのみアクセス可能なため、Content scriptのコンソールログでマッピング取得状況を検証します。

**実行方法**:
```bash
node tests/browser/test-mappings.cjs
```

### `test-practice-mode.cjs`

一人回し（Practice）機能の最終動作確認テストです。

**実行方法**:
```bash
node tests/browser/test-practice-mode.cjs
```

## テスト対象URL

すべてのテストは以下の公開デッキURLでテストを実行します（認証不要）：

```
https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95
```

## 全テストの実行

すべてのテストを順番に実行する場合：

```bash
node tests/browser/test-buttons.cjs && \
node tests/browser/test-shuffle.cjs && \
node tests/browser/test-lock.cjs && \
node tests/browser/test-dialog.cjs && \
node tests/browser/test-scroll-to-top.cjs
```

## トラブルシューティング

### `Error: ENOENT: no such file or directory, open '<ws_file>'`

Chromiumが起動していません。以下のコマンドでChromiumを起動してください（ws_fileのパスは `configs/browser.toml` で管理）：

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

> **ファイル拡張子は必ず `.cjs` にすること**。プロジェクトの `package.json` が `"type": "module"` (ESM) のため、`.js` では `require()` が使えず実行時に `ReferenceError` になります。`.cjs` を使うことで CommonJS 扱いとなり `require()` が動作します。

1. `cdp-helper.cjs` をインポート（`require('./cdp-helper.cjs')` のように拡張子まで明示）
2. `connectCDP()` で接続を確立
3. `navigate(url)` でページに移動
4. `evaluate(expression)` でDOM操作・確認
5. テスト終了時に `close()` で接続を閉じる

**テンプレート**:

```javascript
const { connectCDP } = require('./cdp-helper.cjs');

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
