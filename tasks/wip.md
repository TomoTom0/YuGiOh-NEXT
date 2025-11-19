# 作業中のタスク

## 2025-11-19: 内部レビュー対応（コード品質・開発環境改善）

### 対応中のレポート

#### 06_llm_context_improvement（LLMコンテキスト改善）
- **優先度**: 🔴 高（開発効率・品質向上）
- **対象**: CLAUDE.md / .claude/ ドキュメントの改善
- **主要タスク**:
  1. 高優先（今週〜2週間）:
     - Git履歴分析実行（`tmp/reports/git-history-analysis.md` 作成）
       - 変更頻度上位ファイル特定
       - fix/revert/refactor パターン検索
       - 再発バグ一覧作成
     - `.claude/common-mistakes.md` 作成（10個程度の明確なミス例）
     - `CLAUDE.md` を「概要＋TL;DR + 参照先リンク」形式に更新
  2. 中優先（1〜2ヶ月）:
     - PRレビュー集計実施（`tmp/reports/pr-review-summary.md`）
     - ESLint/Prettier ルール調整 + pre-commit設定
  3. 低優先（2ヶ月〜）:
     - LLM向け定期更新ワークフロー確立
- **備考**: 機密情報を含めない、要点を短い箇条書きに保つ
- **レポート**: `docs/internal-reviews/reports/wip/06_llm_context_improvement.md`

#### 01_refactoring_analysis（リファクタリング分析）
- **優先度**: 🟡 中（技術的負債削減）
- **対象**: PR #10 マージ後のコードベース（v0.3.10 → v0.3.11）
- **主要問題点**:
  - `src/stores/deck-edit.ts` の単一責務逸脱（ドメインロジック + displayOrder + アニメーション混在）
  - `src/components/DeckMetadata.vue` の肥大化（約1,000行）
  - パーサ/フォーマッタの散在（`deck-import.ts`, `deck-export.ts`）
  - 型の不整合（`SortOrder` 等）
- **主要タスク**:
  1. 高優先（🔴）:
     - ストア分割（deck-edit → ドメイン/display-order/アニメーション）
     - 型・定数の正規化（SortOrder等）
  2. 中優先（🟡）:
     - CSV/TXTパーサ一本化（`src/utils/parsers/` 下に集約）
     - Dropdownロジック共通化（`useDropdown()` composable）
  3. 低優先（🟢）:
     - `png-metadata` ユニットテスト追加
     - 文字列メッセージ中央化（i18n準備）
- **実施方針**: 段階的PR（テスト→parser抽出→display-order→store分割）
- **レポート**: `docs/internal-reviews/reports/wip/01_refactoring_analysis.md`

---

## 完了済みタスク

完了済みタスクの詳細は `done.md` を参照してください。
