# 使い方ドキュメント用画像

## ディレクトリ構造

```
docs/usage/images/
├── deck-edit/       # デッキ編集機能のスクリーンショット
├── shuffle-sort/    # シャッフル・ソート機能のスクリーンショット
├── deck-image/      # デッキ画像作成機能のスクリーンショット
└── README.md        # このファイル
```

## 各ディレクトリの内容

### deck-edit/

デッキ編集機能（`#/ytomo/edit`）のスクリーンショット

- `01-initial-state.png`: 初期状態（デッキ読み込み完了）
- `02-deck-name-input.webp`: デッキ名入力状態
- `03-card-detail-info.png`: カード詳細（Infoタブ）
- `04-card-detail-related.webp`: カード詳細（Relatedタブ）
- `05-card-detail-products.webp`: カード詳細（Productsタブ）
- `06-card-detail-qa.webp`: カード詳細（Q&Aタブ）
- `07-search-function.png`: カード検索機能

### shuffle-sort/

シャッフル・ソート機能のスクリーンショット

- `shuffle-sort-animation.gif`: シャッフル・ソート・固定機能のデモアニメーション
- `shuffle-sort-buttons.png`: シャッフルボタンとソートボタン
- `card-lock-feature.png`: カードのロック機能（クリック位置）
- `card-locked-state.png`: ロックされたカード

### deck-image/

デッキ画像作成機能のスクリーンショット

- `deck-image-button.png`: デッキ画像作成ボタン
- `deck-image-dialog.gif`: デッキ画像作成ダイアログのデモアニメーション
- `image-dialog-overview.webp`: ダイアログ全体
- `image-dialog-deck-name.webp`: デッキ名入力欄
- `image-dialog-color-red.png`: 赤背景のプレビュー画像
- `image-dialog-color-blue.png`: 青背景のプレビュー画像
- `image-dialog-qr-on.png`: QRトグルボタン（ON状態）
- `image-dialog-qr-off.png`: QRトグルボタン（OFF状態）
- `image-dialog-download-button.png`: ダウンロードボタン

## 画像撮影時の注意事項

- **URL**: `tests/sample/url.md` に記載された公開デッキURLを使用
- **フォーマット**: PNG（アニメーションはGIF）
- **解像度**: 実際のブラウザ表示サイズ
- **環境**: 日本語環境（`?request_locale=ja`）
- **ブラウザ**: Chromium（CDP経由）

## スクリーンショット撮影スクリプト

デッキ編集機能のスクリーンショットは自動撮影スクリプトで生成されています：

- `scripts/screenshots/deck-edit/capture-screenshots.js`

実行方法：
```bash
# Chromiumを起動（リモートデバッグモード）
./scripts/debug/setup/start-chrome.sh

# スクリーンショット撮影
node scripts/screenshots/deck-edit/capture-screenshots.js
```
