# レビュー依頼書の配置変更について

## 変更内容

このディレクトリ(`tmp/requests/`)の内容は以下に移動予定：

```
tmp/requests/*.md → docs/internal-reviews/req/*.md
```

## レポート出力先

各依頼書のレビュー結果は以下に出力：

```
docs/internal-reviews/reports/
```

## 各依頼書の出力先

1. `01_refactoring_review.md` 
   → レポート: `docs/internal-reviews/reports/refactoring-analysis.md`

2. `02_test_doc_obsolescence.md`
   → レポート: `docs/internal-reviews/reports/test-doc-obsolescence.md`

3. `03_test_doc_addition.md`
   → レポート: `docs/internal-reviews/reports/test-doc-addition-plan.md`

4. `04_tmp_cleanup_review.md`
   → レポート: `docs/internal-reviews/reports/tmp-cleanup-report.md`

5. `05_browser_test_strategy.md`
   → レポート: `docs/internal-reviews/reports/browser-test-strategy.md`

6. `06_llm_context_improvement.md`
   → レポート: `docs/internal-reviews/reports/llm-context-improvement.md`

7. `07_github_tools_investigation.md`
   → レポート: `docs/internal-reviews/reports/github-tools-analysis.md`

8. `01-2_test_doc_implementation_review.md` (2025-11-18)
   → レポート: `docs/internal-reviews/reports/test-doc-implementation-review.md`
   → 概要: テストとドキュメント実装のレビュー（122テスト + 4ドキュメント）
   → 備考: 01_refactoring_review のフォローアップとして番号を 01-2 に変更
