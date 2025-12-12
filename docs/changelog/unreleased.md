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

- **TASK-66**: CardDetail.vueのタブボタンにhover効果を追加
- **TASK-67**: 検索条件ダイアログのモンスタータイプボタンラベルを修正
- **TASK-68**: mappingManagerでモンスタータイプのマッピング取得ロジックを改善（デバッグログ追加、初期化タイミング改善、コメント明確化）
- **TASK-75**: Search tab のソートのデフォルトが前回の値に復元されていた問題を修正。sortOrder を常に release_desc（発売日降順）に初期化するように変更
- **TASK-79**: 検索条件ダイアログで spell-type と trap-type が選ばれている場合、monster-type が同時に選べないようにする排他ルールを追加
- **TASK-80**: 検索条件ダイアログでATK/DEFセクション内のチップの周りの謎の背景色を削除
- **TASK-81**: カテゴリダイアログのフィルターボタンの条件を修正。7枚超え（>7）から7枚以上（>=7）に変更し、ちょうど7枚のカテゴリも表示されるようにした
- **TASK-83**: DeckCard.vue のリンクボタンが反応しない問題を修正。v-if="card" をテンプレートから削除して、card が未定義でもテンプレートがレンダリングされるように対応
- **TASK-86**: グローバル検索の検索入力欄のテキストアライメントを左詰め（left）に修正。SearchInputField.vueの.search-inputクラスにtext-align: leftを適用
- **TASK-87**: card-listで種族/属性ソート時の魔法・罠の配置順を修正。モンスター固有のソート時に、魔法・罠は末尾に配置されるようになった
- **TASK-88**: デッキ表示画面のシャッフル・ソートボタンが反応しない問題を修正。ボタンIDの不一致を解決し、スタイルも正しく適用されるようになりました
- **TASK-90**: デッキコピー時にメインデッキが空になる問題を修正。TempCardDB のフォールバック機能を追加し、UnifiedCacheDB から cardType を取得できるようにしました
- **TASK-91**: デッキ編集画面の設定ダイアログから不要な「Card List View Mode」セクションを削除
- **TASK-92**: デッキトップメニューを開いている時に、他の要素に対するホバー反応が消える問題を修正（pointer-events: noneを追加）
- **TASK-93**: デッキトップバーの要素や検索入力欄が公式のメニューより手前に表示される問題を修正（z-indexレイヤーの最適化）
- **TASK-94**: デッキ保存時の重複toast通知を修正。API層（deck-operations.ts）でのhandleSuccessのshowToastをfalseに設定し、UI層（DeckEditTopBar.vue）の通知のみを表示
- **TASK-101**: disabled ボタンの tooltip が半透明で表示される問題を修正
- **TASK-102**: disabled reason フォーマット機能の根本的な設計改善
- **TASK-103**: formatDisabledReason() の無効なパターンマッチバグを修正
- **TASK-104**: DeckEditLayout.vue でハッシュチェンジイベントリスナーが onMounted 外で登録されていたメモリリーク問題を修正。全てのイベントリスナー登録を onMounted 内に統一
- **TASK-105**: DeckEditLayout.vue で非同期処理中にコンポーネントがアンマウントされた場合の状態更新を防止。isComponentMounted フラグで マウント状態を追跡し、Vue 警告とメモリリークを解決
- **TASK-106**: DeckMetadata.vue でデッキタイプのデフォルト値が初期化時と watch 時で異なっていた問題を修正。デフォルト値の統一とカテゴリ・タグの無効 ID フィルタリング機能を実装
- **TASK-108**: CategoryDialogのフィルターボタン機能を修正
- **TASK-109**: monsterType 選択時に spell-type/trap-type が選択可能なままになっていた問題を修正

## UI Improvements

- **TASK-76**: 検索履歴タブのテーブルスタイルを大幅改善。パディング、フォントサイズ、要素サイズ、間隔を全体的に拡大して可読性・操作性を向上
- **TASK-77**: 検索条件ダイアログの否定状態（spirit, tuner, gemini, toon, union, flip）にスタイルを追加。赤いグラデーション背景で視覚的に否定状態を表現。getMonsterTypeClass関数を修正してstate.stateを正しくチェック
- **TASK-78**: 検索条件ダイアログのフッター領域を拡大。パディングを6px 8px → 12px 16pxに増加、要素間隔を6px → 12pxに拡大、閉じるボタンを28px → 32pxに拡大して入力欄の視認性を向上

## Refactoring

- **TASK-70**: SearchInputBar.vueのuseMydeckOperations Composableへの統合を完了
- **TASK-71**: SearchInputBar.vueのuseFilterInput Composableへの統合を完了（TASK-43-3~5を一括統合）。約443行の削減（1437行 → 994行、31%削減）

## Internal Improvements

- **TASK-58**: SessionManagerとWindowオブジェクトの型定義作成
- **TASK-59**: querySelector のnullチェック強化（safe-dom-query.ts活用）
- **TASK-60**: エラーハンドリングの統一（useToastStore活用）
- **TASK-61**: APIパラメータの定数化（src/constants/api-params.ts作成）
- **TASK-62**: E2Eテストのdata-testid属性導入
- **TASK-63**: バージョン番号の統一（README.md, project_overview.md → 0.5.5）
- **TASK-64**: メモリのクリーンアップ（.serena/memories/内の古い日付ファイル整理）
- **TASK-65**: card-limit.tsのTODO分析完了
- **TASK-95**: v0.5.5リファクタリングの影響分析を完了
- **TASK-96**: v0.5.5リファクタで削除された要素の調査・整理
- **TASK-97**: TASK-76～94 の詳細調査が完了。各TASKの完全な原因分析と修正方法を整理した
- **TASK-98**: DeckEditTopBar.vue のtoast通知二重表示を修正

---

**合計変更**: 52個のタスク（新機能4個、バグ修正38個、UI改善3個、リファクタリング2個、内部改善5個）
