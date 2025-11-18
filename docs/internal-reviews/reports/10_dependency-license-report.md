# 依存関係 & ライセンス監査レポート

作成日: 2025-11-18

概要:
- `npm audit` と `npm outdated` の結果に基づき、依存関係の脆弱性および更新状況をまとめる。

サマリ:

- 総脆弱性数: 8 (moderate:4, high:2, critical:2)
- クリティカルな直接依存: `vitest` (critical), `happy-dom` (critical, direct)
- 主要な間接依存での修正可能な脆弱性: `esbuild`, `glob`, `js-beautify`, `vite`, `vite-node`, `@vitest/mocker`

推奨アクション (優先順):

1. テストランタイム周辺の緊急対応
   - `vitest` と `happy-dom` はクリティカルで、リモートコード実行につながる脆弱性が報告されています。
   - 直ちに `package.json` のバージョンを `vitest` の最新の安全なバージョンへ更新し、`happy-dom` も `20.0.10` など脆弱性修正済みバージョンへ更新してください。
   - 注意: `happy-dom` のメジャーアップデートになる可能性があるため、テストの互換性を確認してください。

2. ビルド/ツールチェインのアップデート
   - `esbuild` を含む `vite` 関連周辺は moderate/高の問題があるため、`vite` と `esbuild` を最新に更新することを検討してください。

3. 開発依存の整理
   - 開発依存が多数あるため、不使用のパッケージを削除し、依存関係のスコープを見直してください。

4. 自動検出と運用提案
   - Dependabot や Renovate の導入を推奨します。クリティカルや高リスクは自動で PR を作成する設定を有効にしてください。
   - CI に `npm audit --audit-level=high` を組み込み、重大度が high 以上の脆弱性でパイプラインを失敗させる検出ルールを追加することを推奨します。

ライセンス互換性チェック:

- 本リポジトリの `package.json` の `license` フィールドは `ISC` です。
- 迅速な確認として `npx license-checker --json` を利用して全依存のライセンス一覧を出力してください。商用利用や再配布に制限があるライセンスが含まれる場合は別途報告します。

付録: 現在の検出結果コマンド

- `npm audit --json` の結果を `docs/internal-reviews/reports/dependency-license-report.raw-audit.json` に保存してレビューの根拠としてください。
- `npm outdated --json` の出力を `docs/internal-reviews/reports/dependency-license-report.raw-outdated.json` に保存してください。


