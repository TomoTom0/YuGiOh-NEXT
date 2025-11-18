# tmp/ ディレクトリ整理レポート

**作成日**: 2025-11-18
**レビュー対象**: `tmp/` ディレクトリ全体

概要

- 現在の `tmp/` は約382MB。主な容量要因は `tmp/_archived/` のスクレイピングキャッシュと `.npm-cache`（約340MB）および `tmp/browser/`（約31MB）のテストスクリーンショットとスクリプト。
- `tmp/` 内は原則として削除対象だが、価値あるドキュメントや再利用すべきサンプル、テストのフィクスチャは救出して適切な場所へ移動するべき。

🔴 高優先度（救出必須）

- `tmp/wip/v0.4.0-phase1-design.md` — 設計判断の記録。移動先: `docs/design/v0.4.0/phase1.md`。
- `tmp/wip/rush-duel-url-investigation.md` — Rush Duel 対応調査。移動先: `docs/dev/investigations/rush-duel-urls.md`。
- `tmp/ciid-fix-manual-test.md`, `tmp/test-status-report.md` — テスト・手動検証記録。移動先: `docs/testing/manual/` 或いは `docs/testing/`。
- `tmp/export-samples/` — エクスポート形式のサンプル（テストフィクスチャ）。移動先: `tests/fixtures/deck-export-samples/`。

🟡 中優先度（検討して救出）

- `tmp/_archived/scraping/` 内の TSV データ (`cards-all.tsv`, `qa-all-*.tsv`, `faq-all-*.tsv`) はバックアップ有無を確認の上で判断。必要であれば `src/data/` もしくは `data/` に統合。
- `browser/` の Playwright スクリプトは、代表的なサンプルのみ `tests/e2e/` に保存、残りは削除。
- `image-optimization/` は `public/images/` への反映を確認後であれば削除可能（高品質元を保存する場合は `assets/images/originals/` 等へ移動）。

🟢 低優先度（削除推奨、簡易確認）

- HTML スナップショット（`tmp/deck-*.html` 等）は重要ケースが含まれていないか確認後削除。
- 小容量のテストスクリプト・ログ（`tmp/test-*.js`, `tmp/*.log` 等）は削除可。

❌ 即時削除（確認不要）

- `tmp/_archived/.npm-cache/`（約340MB） — npm キャッシュは再生成可能 → 削除推奨。
- Cookie ファイル（`tmp/_archived/scraping/cookies*.txt`） — 認証情報が含まれる可能性が高いため即時削除。

移動・削除の推奨コマンド（例）

# npm キャッシュ削除
rm -rf tmp/_archived/.npm-cache

# browser テスト出力削除（サイズ削減）
rm -rf tmp/browser

# 一時ログ・HTML 削除
rm tmp/*.html tmp/*.log || true

# エクスポートサンプルをテストフィクスチャへ移動
mkdir -p tests/fixtures/deck-export-samples
mv tmp/export-samples tests/fixtures/deck-export-samples || true

# ドキュメントの移動例
mkdir -p docs/design/v0.4.0 docs/dev/investigations docs/testing/manual
mv tmp/wip/v0.4.0-phase1-design.md docs/design/v0.4.0/phase1.md || true
mv tmp/wip/rush-duel-url-investigation.md docs/dev/investigations/rush-duel-urls.md || true
mv tmp/ciid-fix-manual-test.md docs/testing/manual/ciid-fix-verification.md || true

保留事項（要オーナー確認）

- `tmp/_archived/scraping/` の TSV データを削除してよいかは、`src/` や他のバックアップ先に同一データが存在しないかを確認する必要がある。
- `browser/` 内のテストスクリプトは E2E 環境構築計画に合わせて代表スクリプトのみを保存するか削除するかを決めるべき。

手順提案

1. 高優先度ファイルを上記の移動先へ移動する（`mv`）。
2. Cookie ファイルと `.npm-cache` を即時削除。
3. browser の不要ファイルを削除して容量を確保。
4. 残りファイルをオーナーにリストアップして最終判断を仰ぐ。

備考

- 削除作業は Git 管理外のファイルに対して行う想定。必要ならバックアップ（`tar`）を作成してから実施すること。
- 本レポートは `docs/internal-reviews/reports/tmp-cleanup-report.md` に配置済み。

