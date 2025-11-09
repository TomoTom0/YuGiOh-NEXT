# 使い方ドキュメント用メディア作成

docs/usage/ のドキュメント用のスクリーンショット・動画・GIFを撮影・作成するスクリプト群です。

## 前提条件

### 1. Chromiumの起動

スクリーンショット撮影前に、拡張機能をロードした状態でChromiumを起動する必要があります。

```bash
# Chromium起動（リモートデバッグモード + 拡張機能ロード）
./scripts/debug/setup/start-chrome.sh
```

### 2. 依存パッケージ

- **Node.js**: WebSocket通信、スクリプト実行
- **ffmpeg**: 動画作成・GIF変換
- **ImageMagick**: 画像加工（オプション）

```bash
npm install
```

ffmpegの確認：
```bash
which ffmpeg
```

ImageMagickの確認：
```bash
which convert
```

## スクリプト一覧

### スクリーンショット撮影

#### `screenshot-helper.js`

スクリーンショット撮影用のCDPヘルパーモジュールです。

**提供機能**:
- `captureFullPage(outputPath)`: ページ全体のスクリーンショット
- `captureViewport(outputPath)`: ビューポート領域のスクリーンショット
- `captureElement(selector, outputPath, options)`: 特定要素のスクリーンショット
- `captureClip(x, y, width, height, outputPath)`: 座標指定でスクリーンショット

### `capture-deck-page.js`

デッキ表示ページのスクリーンショットを撮影します。

**撮影する画像**（5枚）:
1. `deck-display-page-overview.png` - ページ全体
2. `shuffle-sort-buttons.png` - シャッフル・ソートボタン
3. `deck-image-button.png` - デッキ画像作成ボタン
4. `card-lock-feature.png` - カードのロック機能
5. `card-locked-state.png` - ロックされたカード

**実行方法**:
```bash
node scripts/screenshots/usage/capture-deck-page.js
```

### `capture-dialog.js`

デッキ画像作成ダイアログのスクリーンショットを撮影します。

**撮影する画像**（7枚）:
6. `image-dialog-overview.png` - ダイアログ全体
7. `image-dialog-deck-name.png` - デッキ名入力欄
8. `image-dialog-color-red.png` - 赤背景のプレビュー
9. `image-dialog-color-blue.png` - 青背景のプレビュー
10. `image-dialog-qr-on.png` - QRトグルボタン（ON）
11. `image-dialog-qr-off.png` - QRトグルボタン（OFF）
12. `image-dialog-download-button.png` - ダウンロードボタン

**実行方法**:
```bash
node scripts/screenshots/usage/capture-dialog.js
```

### `capture-all.js`

全スクリーンショット（12枚）を一度に撮影します。

**実行方法**:
```bash
node scripts/screenshots/usage/capture-all.js
```

### `process-images.js`

撮影したスクリーンショットに枠線、矢印、注釈などを追加します（ImageMagick使用）。

**提供機能**:
- `addBorder(inputPath, outputPath, options)`: 枠線を追加
- `addArrow(inputPath, outputPath, arrow, options)`: 矢印を描画
- `addText(inputPath, outputPath, text, position, options)`: テキストを追加
- `addRectangle(inputPath, outputPath, rect, options)`: 矩形を描画
- `resize(inputPath, outputPath, size)`: 画像をリサイズ

**実行方法**:
```bash
# サンプル加工処理を実行
node scripts/screenshots/usage/process-images.js
```

**カスタム加工の例**:
```javascript
const { addBorder, addArrow, addText } = require('./process-images');

// 枠線を追加
await addBorder(
  'docs/usage/images/card-lock-feature.png',
  null, // 元のファイルを上書き
  { width: 3, color: '#e74c3c' }
);

// 矢印を追加
await addArrow(
  'input.png',
  'output.png',
  { x1: 10, y1: 10, x2: 100, y2: 100 },
  { strokeWidth: 3, strokeColor: '#e74c3c' }
);

// テキストを追加
await addText(
  'input.png',
  'output.png',
  'クリックしてロック',
  { x: 50, y: 50 },
  { fontSize: 20, fontColor: '#e74c3c' }
);
```

### 動画撮影

#### `video-helper.js`

動画撮影用のCDPヘルパーモジュールです。

**提供機能**:
- `recordVideo(outputPath, duration, clip, fps)`: 動画撮影（MP4）
- `getElementClip(selector, padding)`: 要素の領域を取得
- `convertToGif(inputPath, outputPath, options)`: MP4をGIFに変換

#### `record-shuffle-sort.js`

シャッフル・ソート機能の動画を撮影します。

**撮影する動画**（2本 + GIF）:
1. `shuffle-animation.mp4` / `shuffle-animation.gif` - シャッフル動作
2. `sort-animation.mp4` / `sort-animation.gif` - ソート動作

**実行方法**:
```bash
node scripts/screenshots/usage/record-shuffle-sort.js
```

#### `record-dialog.js`

デッキ画像作成ダイアログの動画を撮影します。

**撮影する動画**（2本 + GIF）:
1. `dialog-open-close.mp4` / `dialog-open-close.gif` - ダイアログの開閉
2. `dialog-color-change.mp4` / `dialog-color-change.gif` - 背景色の切り替え

**実行方法**:
```bash
node scripts/screenshots/usage/record-dialog.js
```

#### `record-all-videos.js`

全動画（4本 + GIF）を一度に撮影します。

**実行方法**:
```bash
node scripts/screenshots/usage/record-all-videos.js
```

## 出力先

すべてのスクリーンショット・動画・GIFは以下のディレクトリに保存されます：

```
docs/usage/images/
```

**スクリーンショット**: 12枚（PNG）
**動画**: 4本（MP4）
**アニメーションGIF**: 4個（GIF）

## ワークフロー

### 1. メディア作成（スクリーンショット + 動画 + GIF）

```bash
# Chromium起動
./scripts/debug/setup/start-chrome.sh

# スクリーンショット撮影（12枚）
node scripts/screenshots/usage/capture-all.js

# 動画撮影 + GIF変換（4本の動画 + 4個のGIF）
node scripts/screenshots/usage/record-all-videos.js
```

### 2. 画像加工（オプション）

```bash
# サンプル加工を実行
node scripts/screenshots/usage/process-images.js

# またはカスタム加工スクリプトを作成
```

### 3. ドキュメントに埋め込み

撮影したメディアを `docs/usage/index.md` に埋め込みます：

```markdown
# 静止画
![デッキ表示ページ](./images/deck-display-page-overview.png)

# アニメーションGIF
![シャッフル動作](./images/shuffle-animation.gif)
```

## トラブルシューティング

### `Error: ENOENT: no such file or directory, open '.chrome_playwright_ws'`

Chromiumが起動していません：

```bash
./scripts/debug/setup/start-chrome.sh
```

### `WebSocket connection error`

Chromiumが終了しています。再起動してください：

```bash
./scripts/debug/setup/stop-chrome.sh
./scripts/debug/setup/start-chrome.sh
```

### `Element not found` エラー

ページの読み込み時間が不足している可能性があります。各スクリプトの `wait` 時間を調整してください：

```javascript
await cdp.wait(5000); // 5秒待機（必要に応じて延長）
```

### ImageMagickが見つからない

ImageMagickをインストールしてください：

```bash
# Ubuntu/Debian
sudo apt-get install imagemagick

# macOS
brew install imagemagick
```

## 参考

- [Chrome DevTools Protocol Documentation](https://chromedevtools.github.io/devtools-protocol/)
- [ImageMagick Documentation](https://imagemagick.org/index.php)
- 画像計画: `docs/usage/images/README.md`
