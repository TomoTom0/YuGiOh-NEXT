# 次期バージョン（未リリース）

## New Features

- **PR-68**: Right Area 幅とフォントサイズの設定を追加
  - オプションページに「Right Area の幅」設定を追加（S/M/L/XL、デフォルトM）
  - オプションページに「Right Area のフォントサイズ」設定を追加（s/m/l/xl、デフォルトm）
  - Right Area内の全てのハードコードされたフォントサイズを相対値（calc）に変換
- **TASK-82**: デッキ画像プレビュースケールを0.25から0.5に増加。プレビューに表示されるカード数の見易性を向上
- **TASK-84**: 検索条件ダイアログのヘッダーチップをクリック可能にして、クリックで対応するフィルターを削除できるように実装。チップにホバー・クリック時のスタイル変化を追加
- **TASK-85**: スラッシュコマンド/searchの値入力時に候補が表示されるようにaliasesを追加。各検索モード（name, text, pend, mydeck）にショートカット（n, t, p, m）と日本語部分一致を追加
- **TASK-89**: デッキ表示画面で画像作成ダイアログのスタイルを適用。src/content/index.tsに themes.scssと common.scssをインポート追加
- **TASK-99**: useDeckUndoRedo.ts に MAX_COMMAND_HISTORY 容量制限を実装（既に実装済み確認）
- **TASK-107**: DeckMetadata.vueで型ガード関数 isDeckTypeValue/isDeckStyleValue を実装して、不正な値の検出と拒否を実現

## Bug Fixes

（変更内容をここに記載）

## Refactoring

（変更内容をここに記載）

## Internal Improvements

（変更内容をここに記載）

---

**合計変更**: （リリース時に記載）
