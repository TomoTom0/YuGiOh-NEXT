# 作業中のタスク

## 2025-11-19: 内部レビュー対応（リファクタリング分析）

### 対応中のレポート

#### 01_refactoring_analysis（リファクタリング分析）
- **優先度**: 🟡 中（技術的負債削減）
- **対象**: PR #10 マージ後のコードベース（v0.3.10 → v0.3.11）
- **主要問題点**:
  - `src/stores/deck-edit.ts` の単一責務逸脱（1,272行、54回変更）
  - `src/components/DeckMetadata.vue` の肥大化（約1,000行、34回変更）
  - 型の不整合（SortOrder等）
- **主要タスク**:
  1. 高優先（🔴）:
     - ✅ 型・定数の正規化（SortOrder: ハイフン→アンダースコア統一、release_desc追加）
     - ⏳ ストア分割（deck-edit → ドメイン/display-order/アニメーション）
  2. 中優先（🟡）:
     - ✅ CSV/TXTパーサ分離（既に `deck-import.ts` 内で関数分離済み）
     - Dropdownロジック共通化（`useDropdown()` composable）
  3. 低優先（🟢）:
     - ✅ `png-metadata` ユニットテスト（既存）
     - 文字列メッセージ中央化（i18n準備）
- **実施方針**: 段階的PR（✅型修正 → ⏳ストア分割検討）
- **レポート**: `docs/internal-reviews/reports/wip/01_refactoring_analysis.md`
- **進捗**: 1/3完了（型定義修正完了、コミット: b6da2c4）
- **分割調査**: 完了（`tmp/reports/store-split-analysis.md`）
  - 現状: 1,272行、35関数、5つの責務
  - 推奨: 3段階分割（アニメーション→DisplayOrder→ドメイン）
  - Phase 1のみ実施で12%削減可能

---

## 完了済みタスク

完了済みタスクの詳細は `done.md` を参照してください。
