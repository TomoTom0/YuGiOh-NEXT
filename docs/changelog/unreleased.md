# 次期バージョン（未リリース）

## New Features

- chrome.storage.local の容量監視機能を追加。150MBを超過した場合、自動的に100MBまで縮小するようにストレージ管理を実装。requestIdleCallback を使用してページ読み込み後のアイドル時に一度だけチェック。Tier別、段階的削除で効率的に容量を回復。（TASK-207）

## Bug Fixes

- deck-thumbnail.ts の画像読み込み処理で無限ループが発生していた問題を修正。promiseAllConcurrent() 関数の実装を修正し、シンプルな Promise.all() + 複数ワーカーパターンに変更。これにより、サムネイル生成が正常に完了するようになった。（TASK-206）
- Dart Sass legacy JS API deprecation 警告を解消。webpack.config.js の sass-loader に implementation オプションを追加し、新しい Dart Sass JavaScript API を明示的に使用。

## Changes

- ESM base への移行完了。package.json に "type": "module" を追加し、CJS ファイル (*.js) を .cjs 拡張に変更。webpack.config.js → webpack.config.cjs、scripts/ の11個の CJS ファイル → .cjs に変更。これにより、Vite の CJS deprecation warning を完全に解消。

## Performance

- deck-cache.ts の calculateDeckHash を FNV-1a ハッシュアルゴリズムに最適化。JSON.stringify() をスキップして高速化。（TASK-205）
- deck-thumbnail.ts の画像読み込みを並列数制限（最大2並列）と Image.decode() の活用で最適化。高負荷なリソース読み込みをより効率的に制御。（TASK-206）

## Refactoring

（変更内容をここに記載）

## Repository Management

- manifest.json に unlimitedStorage パーミッションを追加。ストレージ容量監視機能に対応。

## Internal Improvements

（変更内容をここに記載）

## Known Issues

（変更内容をここに記載）
