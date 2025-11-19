 # LLMコンテキスト改善レビュー報告書

**作成日**: 2025-11-18
**元要求**: `docs/internal-reviews/req/06_llm_context_improvement.md`

概要
- 目的: `CLAUDE.md` および `.claude/` 配下のドキュメントを、LLM（Claude/ChatGPT等）が参照した際に有益になるよう改善するための実務的提案と優先度付きタスクリストを作成。

主要所見（要約）
- ドキュメント構成案は妥当で網羅的。ただし「実データに基づく分析（git履歴・PRコメント・Issue集計）」の成果が欠けており、現状は設計上の提案に留まっている。
- 直ちに追加すべき具体情報: 頻出バグパターンの短い一覧（例: UUID/ciid問題、DOMアクセスタイミング、型アサーション乱用）、および改善の優先アクション（pre-commit, ESLintルール, テスト追加）

詳細指摘と推奨アクション

1) Git履歴分析（実行必須）
- 理由: ドキュメントに「過去の実例」を反映することで、LLMがより具体的かつ再現性のある提案を出せる。
- やること（コマンド例）:
  - 変更頻度上位ファイル: `git log --format=format: --name-only | egrep -v '^$' | sort | uniq -c | sort -rg | head -20`
  - fix/revert/refactor等の検索: `git log --all --oneline --grep="fix"` など
- 期待成果物: `tmp/reports/git-history-analysis.md`（TOP10ファイル、再発バグ一覧、重要PRの要約）

2) PRレビューコメントの集計（実行優先）
- 理由: レビュー指摘の頻出項目は即時のルール化（lint、テスト、チェックリスト）で対処可能。
- 方法: GitHub CLI等でPRのcomments/reviewsを取得し、頻出ワードで集計（`gh api` + `jq` を推奨）。
- 期待成果物: `tmp/reports/pr-review-summary.md`（指摘頻度ランキング、対応案）

3) .claude/ のテンプレ化と最低限の内容投入（短期）
- 推奨構成（優先順）:
  1. `common-mistakes.md` — 再現性の高いミスを短いコード例付きで列挙（必須）
  2. `git-lessons.md` — Git解析から得た教訓（要作成）
  3. `coding-standards.md` — 最低限の命名・import順・JSDoc基準
  4. `architecture.md` — Store責務と主要モジュール図（簡潔でOK）
- 目的: LLMが迅速に参照して具体的修正案を出せるようにする。

4) CLAUDE.md の改善（構造化と抜粋）
- 現行案をベースに、各セクションに「短い箇条書き（3〜6項目）」で要点を置く。長文はLLMがノイズと判断することがあるため、FAQ化を推奨。

5) 自動チェック（中期）
- ESLintルール強化（`no-console`, `@typescript-eslint/no-explicit-any`等）と、pre-commitフックでの簡易チェックを導入。
- 目的: 人為的ミスの再発をコードレベルで防ぐ。

優先度付きタスクリスト（短期→中期）
- 高 (今週〜2週間):
  - `tmp/reports/git-history-analysis.md` を作成（gitコマンドで自動生成→レビュー）
  - `.claude/common-mistakes.md` に10個程度の明確なミス例を追加
  - CLAUDE.md を「概要＋TL;DR + 参照先リンク」形式に更新
- 中 (1〜2ヶ月):
  - PRレビュー集計を実施して `tmp/reports/pr-review-summary.md` を作成
  - ESLint/Prettierのルール調整とpre-commit設定
- 低 (2ヶ月〜):
  - LLM向けの定期更新ワークフローを確立（四半期ごと）

実行コマンドとテンプレ（参考）
- 変更頻度上位ファイル: `git log --format=format: --name-only | egrep -v '^$' | sort | uniq -c | sort -rg | head -20`
- PRコメント取得（例）: `gh api repos/<org>/<repo>/pulls?state=all | jq -r '.[] | .number' | xargs -I {} gh pr view {} --json comments,reviews`

リスクと注意点
- 機密情報（APIキーや個人情報）をドキュメントに含めないこと。
- LLM用文書は冗長すぎると効果が下がるため、要点の粒度を「短い箇条書き＋1例」に保つ。

次の具体的ステップ（私が実行可能な範囲）
1. 指示があれば、`git`の履歴分析コマンドを実行して `tmp/reports/git-history-analysis.md` を生成します（実行して良いですか？）。
2. GitHub PRコメントの集計も行えますが、`gh` CLIの認証が必要です。実行許可があれば進めます。

参考ファイル
- 要求元: `docs/internal-reviews/req/06_llm_context_improvement.md`

