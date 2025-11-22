# CI/CDレビュー報告書

作成日: 2025-11-18
出力先: `docs/internal-reviews/reports/ci-cd-review.md`

## サマリ

- 現状、リポジトリ内の `.github/workflows/` には `branch-protection.yml` のみが存在し、PR ブランチポリシーのチェックを行っている。(`.github/workflows/branch-protection.yml`)
- ビルド／テスト／E2E を自動化するワークフローは見当たらない（ローカル実行を前提とした `package.json` の `build` / `test` / `playwright` スクリプトは存在）。
- 大容量のキャッシュ（例: `tmp/_archived/.npm-cache/` ≒ 340MB）がリポジトリ横で管理されている痕跡があり、CI 側でのキャッシュ戦略が未整備。

目的: CI 実行の信頼性向上、不要な CI コスト削減、失敗モードの明確化。

## 現状確認ポイント（要約）

- ワークフロー: `branch-protection.yml` は PR ベースのブランチ規則チェックのみ。CI のビルド／テストジョブはなし。(`.github/workflows/branch-protection.yml:1`)
- スクリプト: `package.json` に `build` (`webpack`)、`test`（`tsx` 経由のユニット/結合テスト）、`playwright` の依存がある。つまり CI でやるべき処理は明確。(`package.json:1`)
- テスト実装: `tests/` 配下にユニット・結合テストがあり、`tmp/browser/` や `scripts/` に Playwright 用のスクリプトが多数ある（E2E 環境はドキュメント化が必要）。
- キャッシュ痕跡: `.gitignore` に `.npm-cache/`、`.chrome_cache/` などが記載されており、ローカルキャッシュをリポジトリ外で扱っている運用。CI では `actions/cache` を使った npm キャッシュや Playwright ブラウザキャッシュの活用が推奨される。

## 問題点・リスク

- CI ワークフローが無いため PR 毎の自動検証が行われず、マージ前に破壊的変更が入るリスクがある。
- E2E/Playwright テストは環境差異に弱く、デフォルトで PR 上の実行はコストが高い（頻繁に実行すると GitHub Actions の課金が増える）。
- 大きなキャッシュファイルがリポジトリ外に放置されていると、手動での再現性確保やディスク管理が煩雑になる。
- Secrets / 権限設定が不明瞭な場合、デプロイ段階で過剰な権限を与えがち（現状、`deploy` スクリプトはあるが、ワークフローは未整備）。

## 推奨改善案（短期〜中期）

- A: 基本的な CI ワークフローを追加する
  - `pull_request` と `push`（`main`,`dev`）で `build` と `test:unit` を実行するジョブを追加。
  - `concurrency` と `cancel-in-progress` を有効にして無駄な重複実行を防ぐ。

- B: キャッシュ戦略を導入する
  - `actions/setup-node@v4` の `cache: 'npm'` を利用、または `actions/cache@v4` で `~/.npm` や `node_modules/.cache` をキャッシュ。
  - Playwright のブラウザバイナリは `npx playwright install --with-deps` をジョブ内で実行するが、可能ならインストールキャッシュを検討（CI イメージにより差がある）。

- C: E2E 実行ポリシー
  - E2E（Playwright）は高コストなので、PR の短時間検証からは除外し、`workflow_dispatch` / `schedule` / `main` マージ時に実行する運用を検討する。
  - どうしても PR で実行する場合は `paths` や `labels` 条件で限定実行する（例: `paths: tests/e2e/**` または `labels: run-e2e`）。

- D: 最小権限とシークレット管理
  - ワークフロー冒頭の `permissions` を `contents: read` 等に絞る。デプロイジョブのみで `id-token` や `contents: write` を付与する。
  - デプロイ用トークンのローテーション方針をドキュメント化する。

- E: キャッシュ・一時ファイルの整理ルールを確立
  - `tmp/_archived/.npm-cache/` のような巨大キャッシュは不要なら削除、必要ならアーカイブ先（S3 等）へ移行。
  - CI 上で生成されるアーティファクトは `actions/upload-artifact@v4` で収集し、保持期間を短く（例: 7 日）設定。

## サンプル: 推奨 GitHub Actions ワークフロー（抜粋）

```yaml
name: CI

on:
  pull_request:
    branches: [ main, dev ]
  push:
    branches: [ main, dev ]
  workflow_dispatch: {}

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      - name: Install
        run: npm ci
      - name: Build
        run: npm run build
      - name: Unit tests
        run: npm run test:unit
      - uses: actions/upload-artifact@v4
        with:
          name: unit-test-logs
          path: tests/unit/test-results || ./test-logs

  e2e:
    if: github.event_name == 'workflow_dispatch' || github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: build-and-test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install deps & playwright
        run: |
          npm ci
          npx playwright install --with-deps
      - name: Run E2E (Playwright)
        run: npm run test:e2e || true
      - uses: actions/upload-artifact@v4
        with:
          name: e2e-artifacts
          path: tests/e2e/artifacts || playwright-report
          retention-days: 7
```

（注）上記は運用イメージ。`test:e2e` スクリプトの有無・出力先に合わせて調整してください。

## コスト見積り（概算）

- 単体ジョブの目安（GitHub Actions: `ubuntu-latest`）:
  - `npm ci`: 10–30s (パッケージ数に依存)
  - `npm run build` (webpack): 30s–3min（ビルド規模とキャッシュの有無による）
  - ユニット/結合テスト: 0–2min（テスト数に依存）
  - Playwright E2E: 1–10min（シナリオ数とブラウザ起動回数による）

- 運用提案:
  - PR ごとのフル E2E 実行は避け、PR は `build-and-test` のみ実行 → main マージ時に E2E を走らせる。
  - キャッシュを効かせると `npm ci` / `build` の時間を半分〜大幅短縮できる。

## 実行上の注意点と次アクション

1. `branch-protection.yml` のみではビルド/テスト実行が担保できないため、まず `CI` ワークフローを追加してください。参照ファイル: `.github/workflows/branch-protection.yml:1`。
2. Playwright の E2E を導入する場合、`tests/e2e/` の整理と `data-testid` の整備を事前に行うと安定性が向上します。
3. 大容量キャッシュの整理（`tmp/_archived/.npm-cache/`）を実行チームで検討し、不要であれば削除、必要なら外部ストレージへ移行してください。
4. シークレットの最小権限化を行い、デプロイ用アクセストークンはデプロイジョブに限定して渡すこと。

## 参考（今後の改善オプション）

- テスト並列化: テストをファイル単位で分割し `matrix` 経由で並列実行すると所要時間を短縮できる（ただし同時実行分のコストは増える）。
- キャッシュキー戦略: `cache-name-${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}` のようにロックファイルベースでキーを作る。
- モニタリング: 失敗率・実行時間を定期レポート化し、ホットパスを洗い出す。

---

作成者: 内部レビュー自動レポーター

