# public/images/ ディレクトリ

このディレクトリには、Vueビルドシステム（オプションページ）で使用する画像のシンボリックリンクが格納されています。

## シンボリックリンク構造

実際の画像ファイルは `docs/usage/images/` に格納されており、このディレクトリにはシンボリックリンクのみが配置されています。

```
public/images/
├── shuffle-sort-animation.gif -> ../../docs/usage/images/shuffle-sort/shuffle-sort-animation.gif
├── deck-recipe-sample.png -> ../../docs/usage/images/deck-image/deck-recipe-sample.png
├── deck-edit-initial-state.png -> ../../docs/usage/images/deck-edit/01-initial-state.png
├── deck-edit-search-function.png -> ../../docs/usage/images/deck-edit/07-search-function.png
└── deck-edit-card-detail-info.png -> ../../docs/usage/images/deck-edit/03-card-detail-info.png
```

## 使用箇所

これらの画像は `src/options/App.vue` で使用されています：

- **shuffle-sort-animation.gif**: シャッフル・ソート・固定機能のデモ
- **deck-recipe-sample.png**: デッキ画像作成機能の見本
- **deck-edit-initial-state.png**: デッキ編集画面の全体UI
- **deck-edit-search-function.png**: カード検索機能
- **deck-edit-card-detail-info.png**: カード詳細表示

## 新しい画像の追加方法

1. 実際の画像ファイルを `docs/usage/images/` の適切なサブディレクトリに配置
2. このディレクトリにシンボリックリンクを作成：
   ```bash
   ln -s ../../docs/usage/images/サブディレクトリ/ファイル名.png public/images/リンク名.png
   ```
3. `src/options/App.vue` で `/images/リンク名.png` として参照

## 注意事項

- このディレクトリには直接画像ファイルを配置しないこと（シンボリックリンクのみ）
- 画像の単一ソースは `docs/usage/images/` であることを維持
- ビルド時、Webpackはシンボリックリンクを追跡して実際のファイルを `dist/images/` にコピーします
