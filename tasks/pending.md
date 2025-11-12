# PENDING

検討中・保留のタスク

- [ ] API レート制限の詳細確認（必要に応じて対策を設計）
- [ ] CORS 回避の最適解（拡張権限 or サーバー中継）
- [ ] OAuth を使う場合のユーザー承認フロー検討
- [ ] CardList.vueのlist表示時の高さ可変化
  - 現状: search areaでは4行省略表示（一時的な対応）
  - 理想: related tabのように内容に応じてボックスの高さが可変になるべき
  - 原因: `.card-result-item`の高さ制限が正しく機能していない
  - 対策検討: flex-grow、height: auto、またはgridレイアウトへの変更を検討
