# セキュリティ & シークレット監査依頼書

**作成日時**: 2025-11-18
**対象**: リポジトリ全体（特に `tmp/`, `scripts/`, CI 設定ファイル）
**レビュー目的**: 秘密情報の混入防止、依存ライブラリの脆弱性確認、公開リスクの低減
**レポート出力先**: `docs/internal-reviews/reports/security-secrets-audit.md`

## 背景

最近の開発作業で `tmp/` に Cookie やログが残っていることが確認されました。CI / CD 設定やスクリプト内にシークレットが埋め込まれていないか、依存パッケージに既知脆弱性がないかを早急に確認する必要があります。

## レビュー依頼項目

- A. リポジトリ内のシークレット検出
  - 対象: `tmp/`, `scripts/`, `.github/workflows/`, `Dockerfile*`, `*.env*`
  - 確認事項: トークン、APIキー、Cookie、個人情報の有無

- B. CI 設定の確認
  - 対象: `.github/workflows/` 配下ワークフロー
  - 確認事項: secrets の参照方法（actions/checkout の使い方など）、不要な権限付与、トークン露出リスク

- C. 依存パッケージの脆弱性スキャン
  - 対象: `package.json`, `package-lock.json`
  - 確認事項: 既知の重大脆弱性、メンテナンス状況、署名不在のパッケージ

- D. ログ・キャッシュファイルの取り扱い
  - 対象: `tmp/_archived/`, `tmp/` 以下のログ、cookie ファイル
  - 確認事項: 個人情報の有無、直ちに削除が必要なファイルの特定

## 期待する成果物

- `docs/internal-reviews/reports/security-secrets-audit.md` - 発見事項と対処案
- 削除・秘匿化が必要なファイルリスト（推奨コマンド付き）
- 依存脆弱性の要約（CVSS 高スコアの項目）

