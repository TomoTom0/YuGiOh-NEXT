# 作業中のタスク

## 2025-11-19: 内部レビュー対応（リファクタリング分析）

### 対応中のレポート

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
