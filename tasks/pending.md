# PENDING

検討中・保留のタスク

- [ ] **ダークモードの色修正**（優先度：高）
  - 問題: ダークモードにしても一部の要素がライトモードの色のまま
  - 影響箇所:
    - 見出し（heading）
    - 入力要素（input, textarea, select）
    - ボタン（button）
    - アイコン（icon）
  - 原因: CSS変数が適用されていない、またはハードコードされた色が残っている
  - 対策: 全コンポーネントでCSS変数（--text-primary, --bg-primary等）を使用するよう修正
  - 関連ファイル:
    - `src/components/*.vue`
    - `src/content/edit-ui/*.vue`
    - `src/options/*.vue`
    - `src/popup/*.vue`（該当する場合）

- [ ] API レート制限の詳細確認（必要に応じて対策を設計）
- [ ] CORS 回避の最適解（拡張権限 or サーバー中継）
- [ ] OAuth を使う場合のユーザー承認フロー検討
- [ ] CardList.vueのlist表示時の高さ可変化
  - 現状: search areaでは4行省略表示（一時的な対応）
  - 理想: related tabのように内容に応じてボックスの高さが可変になるべき
  - 原因: `.card-result-item`の高さ制限が正しく機能していない
  - 対策検討: flex-grow、height: auto、またはgridレイアウトへの変更を検討
