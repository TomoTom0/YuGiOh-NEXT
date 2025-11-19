# アクセシビリティ (a11y) レビュー依頼書

**作成日時**: 2025-11-18
**対象**: UI コンポーネント（特に `DeckMetadata.vue`, `ExportDialog.vue`, `ImportDialog.vue`, `OptionsDialog.vue`）
**レビュー目的**: アクセシビリティ基準（WCAG）との整合性確認と改善提案
**レポート出力先**: `docs/internal-reviews/reports/accessibility-review.md`

## レビュー依頼項目

- A. キーボード操作の検証
  - 確認事項: タブ移動順、フォーカスの可視化、ショートカットの競合

- B. 色彩・コントラスト
  - 確認事項: テキストと背景のコントラスト比、色盲対応の確認

- C. ARIA 属性とセマンティック HTML
  - 確認事項: 適切な role/aria-* の使用、ダイアログのフォーカス管理

- D. スクリーンリーダーでの動作確認
  - 確認事項: 主要操作（インポート/エクスポート/メタデータ編集）の読み上げ順と意味の一貫性

## 期待する成果物

- `docs/internal-reviews/reports/accessibility-review.md` - 問題点の一覧と優先度付き修正案
- 重要な修正箇所に対するコード例（HTML/ARIA の修正サンプル）

