# 次期バージョン（未リリース）

## New Features

- デッキロードダイアログにサムネイル表示を実装。全デッキにサムネイル表示（カード画像5枚横並び）、キャッシュシステムによる高速表示。（TASK-167）
- chrome.storage.local の容量監視機能を追加。150MBを超過した場合、自動的に100MBまで縮小するようにストレージ管理を実装。requestIdleCallback を使用してページ読み込み後のアイドル時に一度だけチェック。Tier別、段階的削除で効率的に容量を回復。（TASK-207）

## Bug Fixes

- 公式デッキ表示画面でcard-tabのinfo-tabにおいて進む/戻るボタンのレイアウトと見やすさを改善。グリッドレイアウト修正、ボタンサイズ拡大20px→28px、SVGアイコン拡大10px→14px、無効時の背景・ボーダー色調整。（TASK-209）
- deck-thumbnail.ts の画像読み込み処理で無限ループが発生していた問題を修正。promiseAllConcurrent() 関数の実装を修正し、シンプルな Promise.all() + 複数ワーカーパターンに変更。これにより、サムネイル生成が正常に完了するようになった。（TASK-206）
- Dart Sass legacy JS API deprecation 警告を解消。webpack.config.js の sass-loader に implementation オプションを追加し、新しい Dart Sass JavaScript API を明示的に使用。

## Changes

- ESM base への移行完了。package.json に "type": "module" を追加し、CJS ファイル (*.js) を .cjs 拡張に変更。webpack.config.js → webpack.config.cjs、scripts/ の11個の CJS ファイル → .cjs に変更。これにより、Vite の CJS deprecation warning を完全に解消。
- LoadDialogのページネーション改善。ページ移動時にダイアログを自動的に上にスクロール、1ページあたりの表示件数を50から24に変更、デッキサムネイルにdno（デッキ番号）を表示。（TASK-167）

## Performance

- デッキサムネイルキャッシュの最適化。デッキリスト順序をlocalStorageで管理、各デッキごとに順序関係と内容をチェック、5個連続で変更なし → 早期終了でAPI呼び出しをスキップ。（TASK-167）
- deck-cache.ts の calculateDeckHash を FNV-1a ハッシュアルゴリズムに最適化。JSON.stringify() をスキップして高速化。（TASK-205）
- deck-thumbnail.ts の画像読み込みを並列数制限（最大2並列）と Image.decode() の活用で最適化。高負荷なリソース読み込みをより効率的に制御。（TASK-206）
- card-detail-ui.ts の MutationObserver に300msデバウンス処理を追加。パフォーマンス改善。（TASK-203）

## Refactoring

- deck-cache.ts の型安全性を改善。any型をDeckInfo/DeckListItem/DeckCardRef型に置き換えてIDE サポート改善。（TASK-196）
- unified-cache-db.ts の型安全性を改善。MoveHistoryEntry を定義しany型を削減。（TASK-197）
- card-detail-ui.ts の innerHTML 使用を setSafeInnerHTML に置き換え。XSS脆弱性を修正。（TASK-199）
- dom-selectors.ts の使用を徹底。card-detail-ui.ts, sortfixCards.ts等でハードコードされたセレクタを置き換え。（TASK-200）

## Repository Management

- manifest.json に unlimitedStorage パーミッションを追加。ストレージ容量監視機能に対応。

## Internal Improvements

- 全テスト失敗を完全に修正（9件 → 0件）。Test Files: 105 passed (100%)、Tests: 2261 passed | 38 skipped。（TASK-208）
- deck-cache.ts のユニットテストを作成（39テスト、93.37%カバレッジ）。localStorage操作、ハッシュ計算、サムネイル生成、バックグラウンド生成を網羅的にテスト。（TASK-184）
- LoadDialog.vue のコンポーネントテストを作成（33テスト）。ダイアログ表示、デッキリスト表示、サムネイル表示、ページネーション、デッキロード、フォントサイズ調整を網羅的にテスト。（TASK-185）
- DeckEditLayout.vue のテストを作成（18テスト）。サムネイル生成トリガー、キャッシュ連携、統合テスト風の動作確認を実施。（TASK-186）
- shuffle関連機能（shuffleCards.ts, sortfixCards.ts）の単体テストを作成（25テスト）。Fisher-Yatesアルゴリズム、sortfix機能、FLIPアニメーション、DOM操作、複数デッキセクション処理を実施。（TASK-193）
- deck-display/DeckDisplayApp.vue の単体テストを作成（27テスト）。CardDetail条件付きレンダリング、HTMLクラス管理、ライフサイクル処理、Store統合、メモリリーク対策を実施。（TASK-194）
- edit-ui/DeckEditLayout.vue の単体テストを作成（40テスト）。レイアウト構造、ローディング状態、デッキセクション、レスポンシブレイアウト、ダイアログ管理、Store統合を実施。（TASK-195）

## Known Issues

（変更内容をここに記載）
