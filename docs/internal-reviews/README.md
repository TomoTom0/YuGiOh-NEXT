# Internal Reviews

このディレクトリは、プロジェクトの内部レビュー依頼とその結果レポートを管理します。

## ディレクトリ構成

```
docs/internal-reviews/
├── req/        # レビュー依頼書
└── reports/    # レビュー結果レポート
```

## レビュー依頼一覧

### コード品質・リファクタリング

1. **リファクタリングレビュー** (`req/01_refactoring_review.md`)
   - 対象: PR #10マージ後のコードベース
   - レポート: `reports/refactoring-analysis.md`
   - 目的: コード品質向上、保守性改善

### テスト・ドキュメント

2. **テスト・ドキュメント陳腐化調査** (`req/02_test_doc_obsolescence.md`)
   - レポート: `reports/test-doc-obsolescence.md`
   - 目的: 既存テスト・ドキュメントの更新箇所特定

3. **テスト・ドキュメント追加検討** (`req/03_test_doc_addition.md`)
   - レポート: `reports/test-doc-addition-plan.md`
   - 目的: 新機能のテストカバレッジ計画

4. **tmp/フォルダ整理** (`req/04_tmp_cleanup_review.md`)
   - レポート: `reports/tmp-cleanup-report.md`
   - 目的: 一時ファイルからの価値ある情報救出

5. **ブラウザ自動テスト方針** (`req/05_browser_test_strategy.md`)
   - レポート: `reports/browser-test-strategy.md`
   - 目的: E2Eテスト体制確立

### プロジェクト運用

6. **LLM向けコンテキスト改善** (`req/06_llm_context_improvement.md`)
   - レポート: `reports/llm-context-improvement.md`
   - 目的: CLAUDE.md等の最適化

7. **GitHub ツール導入検討** (`req/07_github_tools_investigation.md`)
   - レポート: `reports/github-tools-analysis.md`
   - 目的: GitHub操作の効率化

## 使い方

### レビュー依頼者

1. `req/` ディレクトリの該当する依頼書を確認
2. レビューを実施
3. 結果を `reports/` ディレクトリに指定されたファイル名で出力

### レビュー結果の参照

`reports/` ディレクトリ内のレポートを参照してください。

## 注意事項

- レビュー依頼書は `req/` に配置
- レビュー結果は必ず `reports/` に出力
- ファイル名は依頼書で指定されたものを使用
