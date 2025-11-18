# Security & Secrets Audit Report

**作成日**: 2025-11-18
**対象**: リポジトリ全体（重点: `tmp/`, `scripts/`, `.github/workflows/`, `package.json`）

## 検出事項サマリ

- シークレットの直接埋め込み: リポジトリ内に長いベアラートークンや秘密鍵のファイルは見つかりませんでした。ただし、`tmp/_archived/scraping/cookies.txt` と `tmp/_archived/scraping/cookies-faq.txt` にサイトのセッションCookieが保存されています。これらは認証情報を含む可能性が高く、即時削除が推奨されます。

- CI 設定: `.github/workflows/branch-protection.yml` を確認しました。外部シークレットの直接参照は無く、シンプルなブランチポリシーチェックを行うのみです。`GITHUB_TOKEN` 等を使うジョブは存在しませんでした。

- 依存関係の脆弱性: `npm audit --json` の出力によると、開発依存や直接依存に対して複数の既知脆弱性が検出されました（合計 8 件：moderate 4, high 2, critical 2）。特に注目すべきは:
  - `happy-dom`（direct devDependency） — 複数のクリティカル脆弱性。即時アップデートまたは代替ツール検討を推奨（推奨修正バージョン: `20.0.10` 以上）。
  - `vitest`（direct devDependency） — critical 脆弱性（RCE に関連）。`vitest` / 関連パッケージの更新が必要。
  - `glob`, `esbuild`, `vite` 等にも修正可能な moderate/high 脆弱性あり。詳細は `npm audit` の出力を参照してください。

- ログ・キャッシュ類: `tmp/` に多数のログ・スナップショット・HTML・cookie ファイルが保存されています。特に `tmp/_archived/scraping/cookies.txt` は実際のセッションCookieを含んでおり認証情報の漏洩リスクがあるため、削除が必要です。`tmp/_archived/.npm-cache/` は容量が大きく、削除可能です。

## 発見箇所（ファイル）

- `tmp/_archived/scraping/cookies.txt` — セッションCookie（認証情報の可能性あり）
- `tmp/_archived/scraping/cookies-faq.txt` — 同上
- `tmp/_archived/.npm-cache/` — npm キャッシュ（大容量）
- `package.json` — `happy-dom`, `vitest`, `vite`, `esbuild` 等に脆弱性あり（詳細は `npm audit`）
- `.github/workflows/branch-protection.yml` — 検査済み、問題なし

## 影響評価

- シークレット漏洩リスク: 中〜高（Cookie による認証情報が含まれるため）。公開リポジトリであれば即時対処必須。
- 依存脆弱性リスク: 高（dev 環境での RCE 脆弱性などが含まれるため、CI や開発マシンでの実行リスクがある）。

## 推奨対応

優先度別に記載します。

- 緊急（今すぐ実行）
  - `tmp/_archived/scraping/cookies.txt` と `tmp/_archived/scraping/cookies-faq.txt` を削除する（コマンド例: `rm -f tmp/_archived/scraping/cookies*.txt`）。
  - `.npm-cache` を削除してディスク容量を確保（`rm -rf tmp/_archived/.npm-cache`）。
  - 開発者に対し、今後一切のシークレットをリポジトリにコミットしないことを周知。

- 高（1営業日以内）
  - `happy-dom`, `vitest`, `vite`, `esbuild`, `glob` 等の依存を可能な限り最新の安全なバージョンへ更新する。`npm audit fix` を試した後、残る重要脆弱性は手動で更新を検討する。
  - `vitest` や `happy-dom` に関しては、破壊的変更のリスクがあるためテスト実行環境で検証後に本番ブランチへマージする。

- 中（1週間以内）
  - `tmp/` 内の重要ファイルをリポジトリ外の安全なストレージ（内部ファイルサーバ or シークレット管理ツール）に移すか、必要なものだけ `docs/` や `tests/fixtures` に移動して以降は不要ファイルを削除する。
  - CI ワークフローに `secret scanning` と `dependabot` の導入を検討する。

- 低（追って）
  - リポジトリで使用するツールのサプライチェーンレビュー（署名、メンテナンス頻度）を実施する。
  - 開発者向けのチェックリストを作成（`.env` の扱い、`.gitignore` ルール、pre-commit フックでのシークレット検出）。

## 推奨コマンド例

- Cookie ファイル削除:
  - `rm -f tmp/_archived/scraping/cookies*.txt`

- npm キャッシュ削除:
  - `rm -rf tmp/_archived/.npm-cache`

- 依存の自動修正（注意: 要コミットレビュー）:
  - `npm audit fix --package-lock-only`
  - `npm install`

- 主要依存の手動更新例:
  - `npm install --save-dev happy-dom@^20.0.10 vitest@latest`

## 追加の観察と注意点

- `document.cookie` を参照するコードは過去に調査対象として挙がっており、現在は多くが削除・修正されていますが、履歴や tmp に cookie ファイルが残っている点がリスクです。
- 当レポートはリポジトリ内部の静的検査と `npm audit` 出力に基づいて作成しています。動的検査（CI 実行、依存のローカルインストールとテスト実行）は別途推奨します。

## 次のアクション（提案）

- 今すぐ: `tmp/_archived/scraping/cookies*.txt` と `.npm-cache` を削除してください。
- 24時間以内: 依存関係の更新とテスト（特に `happy-dom` と `vitest`）。
- 1週間以内: `dependabot` のセットアップとシークレットスキャンの導入。


