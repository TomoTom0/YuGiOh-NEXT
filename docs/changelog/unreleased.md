# 次期バージョン（未リリース）

## New Features

（変更内容をここに記載）

## Bug Fixes

- **TASK-506**: 検索条件ダイアログのフィルタータブで、モンスタータイプ欄が無効な状態でchipにhoverした際のtooltip（無効化理由）が空になる問題を修正。理由が設定されていない場合はフォールバック文言「モンスターカードタイプが選択されていません」を表示し、カードタイプ側の理由とchip個別の理由が両方ある場合はchip個別の理由を優先表示するようにした。あわせてFilterTabがローカルに重複保持していた読み取り系8関数（無効化判定・理由取得等）をuseFilterLogic composableへ集約し、表示ロジックの正本を一本化
- **TASK-504**: 検索条件ダイアログのヘッダーchip削除で、魔法タイプ・罠タイプのchipが削除されないcase欠落を修正。検索履歴キャッシュ復元時のstructuredClone(toRaw)防御コピーを追加し、as/anyキャストを解消して型安全性を改善。あわせて条件書30条件+テスト30itへの全面再設計を実施
- **TASK-507**: searchStoreのsearchResults/allResultsをCardInfo[]へ統一し、チャット機能がLLMへ渡す検索結果配列が常にundefinedになっていたバグ（LLMチャットの検索結果連携が動作しない）を修正。no-op型ガードisCardSearchResultsArrayを廃止し、型システム保証による直接代入へ移行
- **TASK-508**: 検索ダイアログの履歴バックグラウンド再検索に世代ガードが無く、(a)履歴の遅延再検索による新検索結果の上書き (b)新検索の拡張検索による履歴キャッシュ表示の上書き (c)履歴連続実行の逆順応答で最終表示が不定 (d)空クリア後の表示復活、の競合が起きうる問題を修正（通常検索と同一イディオムの世代ガードを履歴経路へ追加）

## Changes

（変更内容をここに記載）

## Performance

（変更内容をここに記載）

## Refactoring

（変更内容をここに記載）

## Repository Management

（変更内容をここに記載）

## Internal Improvements

- **TASK-505**: 検索条件ダイアログのフィルタータブ（FilterTab.vue）を全面条件化: 条件書38条件+excluded 7件・unitテスト53itを整備し、表示契約（disabled・tooltip・chip描画）とemit契約15イベントを網羅検証（実装コードは無変更）

## Known Issues

（変更内容をここに記載）
