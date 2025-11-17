# public/images/ ディレクトリ

このディレクトリには、Vueビルドシステム（オプションページ）で使用する最適化済み画像が格納されています。

## 画像ファイル一覧

ビルドサイズ削減のため、元画像（PNG/GIF）をWebP/MP4に変換して配置：

```
public/images/
├── deck-edit-01-initial-state.webp (75KB, 元: 332KB PNG)
├── deck-edit-03-card-detail-info.webp (75KB, 元: 333KB PNG)
├── deck-edit-07-search-function.webp (78KB, 元: 341KB PNG)
├── deck-recipe-sample.webp (119KB, 元: 835KB PNG)
└── shuffle-sort-animation.mp4 (254KB, 元: 950KB GIF)
```

**合計削減**: 約2.8MB → 約600KB（約78%削減）

## 使用箇所

これらの画像は `src/options/App.vue` で使用されています：

- **shuffle-sort-animation.mp4**: シャッフル・ソート・固定機能のデモ（動画）
- **deck-recipe-sample.webp**: デッキ画像作成機能の見本
- **deck-edit-01-initial-state.webp**: デッキ編集画面の全体UI
- **deck-edit-07-search-function.webp**: カード検索機能
- **deck-edit-03-card-detail-info.webp**: カード詳細表示

## 新しい画像の追加方法

1. 元画像を `docs/usage/images/` の適切なサブディレクトリに配置（GitHub Markdown用）
2. WebP/MP4に変換してこのディレクトリに配置：
   ```bash
   # PNG → WebP変換（品質85%）
   convert source.png -quality 85 public/images/output.webp

   # GIF → MP4変換（CRF 23）
   ffmpeg -i source.gif -movflags faststart -pix_fmt yuv420p -c:v libx264 -crf 23 public/images/output.mp4
   ```
3. `src/options/App.vue` で参照：
   - 静止画: `{ src: '/images/output.webp', alt: '...' }`
   - 動画: `{ src: '/images/output.mp4', alt: '...', isVideo: true }`

## 注意事項

- **オプションページで使用しない画像は配置しない**（ビルドサイズ削減のため）
- 元画像（PNG/GIF）は `docs/usage/images/` に保持（GitHub Markdown用）
- Chrome拡張には最適化済み画像（WebP/MP4）のみを含める
- ビルド時、Webpackはこれらのファイルを `dist/images/` にコピーします
