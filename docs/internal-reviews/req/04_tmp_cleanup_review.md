# tmp/フォルダ整理レビュー依頼書

**作成日時**: 2025-11-18  
**対象**: `tmp/` ディレクトリ全体  
**レビュー目的**: 残すべき情報の特定と適切な保管場所の提案  
**レポート出力先**: `docs/internal-reviews/reports/tmp-cleanup-report.md`

## 前提情報

- **`tmp/` 内のファイルは原則削除可**
- **`tmp/_archived/` は完全削除可**
- 価値ある情報のみ適切な場所へ移動

## 重要

本依頼の目的は**価値ある情報の救出**です。tmp/ディレクトリは原則削除対象ですが、以下を救出する必要があります：
- 他の場所にバックアップがない貴重なデータ
- 将来の開発・デバッグに有用な情報
- ドキュメント化すべき調査結果や知見

## 背景

`tmp/`ディレクトリは開発中の一時ファイル保存場所として使用されていますが、PR #10のマージにより多くの開発作業が完了しました。不要なファイルを削除し、必要なファイルは適切な場所へ移動または保管する必要があります。

## 現状分析

### ディレクトリサイズ概要

```
合計容量: 約382MB

主要ディレクトリ:
- _archived/       347MB (scraping関連の大量キャッシュ含む)
- browser/          31MB (Playwright自動テストスクリーンショット)
- image-optimization/ 3.7MB (画像最適化作業ファイル)
- requests/         32KB (本レビュー依頼書含む)
- wip/              96KB (作業中調査ドキュメント)
- export-samples/   48KB (エクスポート形式サンプル)
```

### ファイル分類

#### A. テスト・デバッグ用ファイル (ルート直下)

**HTMLスナップショット** (合計 約1MB):
- `deck-8-loaded.html` (272KB) - デッキ8のロード後状態
- `deck-8-multi-ciid.html` (314KB) - 複数ciid問題調査用
- `deck-8-edit-page.html` (89KB) - デッキ編集ページ
- `deck-95-display.html` (290KB) - デッキ95表示ページ
- `member_deck_dno8.html` (266KB) - メンバーデッキNo.8

**テストスクリプト** (約20個、各4-8KB):
- `test-png-*.ts` (3ファイル) - PNG形式テスト
- `test-extract-ciid*.js` (5ファイル) - ciid抽出ロジックテスト
- `test-parse-*.js` (3ファイル) - パース処理テスト
- `test-*.js` (その他多数) - 各種機能テスト
- `check-multi-ciid.js` - 複数ciid問題チェック

**テスト結果・ログ** (各4KB以下):
- `test-output*.log` (3ファイル)
- `test-existing-card.log`
- `test-result.txt`
- `drag-drop-test-result.txt`
- `chromium-debug.log` (244KB) - Chromiumデバッグログ

**解析結果**:
- `parse-result-multi-ciid.json` (8KB)

**ドキュメント**:
- `test-status-report.md` (4KB)
- `ciid-fix-manual-test.md` (3KB)

**スクリーンショット**:
- `popup-screenshot.png` (393KB)
- `test-deck-with-metadata.png` (161B) - 極小サイズ、不完全？

#### B. _archived/ ディレクトリ (347MB)

**scraping/ サブディレクトリ**:
- スクレイピング関連スクリプト (fetch-*.ts, parse-*.ts)
- TSVデータファイル (cards-all.tsv, qa-all-*.tsv, faq-all-*.tsv)
- HTMLキャプチャ (faq-list-page*.html)
- Cookieファイル (cookies.txt, cookies-faq.txt)
- `.npm-cache/` - **340MB以上** のnpmキャッシュ

**その他**:
- `analyze-search-form.js`
- `parameter-understanding-analysis.md`
- `scraping/analyze/intro.md`

#### C. browser/ ディレクトリ (31MB)

Playwright自動テストで生成されたスクリーンショット・スクリプト多数:
- `*.png` - 各種キャプチャ (after-click.png: 673KB等)
- `*.js` - 自動テストスクリプト (capture-*.js, check-*.js, add-*.js等)

**スクリプト例**:
- `capture-screenshots-final.js`
- `add-40-cards.js`
- `check-animation.js`
- `change-settings.js`
- 他50個以上

#### D. image-optimization/ ディレクトリ (3.7MB)

最適化済み画像ファイル:
- `*.webp` - WebP変換済み画像
- `*.png` - 元画像
- `shuffle-sort-animation.mp4` - 動画ファイル

**注**: これらは `public/images/` へ反映済みの可能性が高い

#### E. export-samples/ ディレクトリ (48KB)

エクスポート形式のサンプルファイル:
- README.md - 説明文書
- `deck-with-name.*` - 7形式 (CSV, JSON, TOML, TSV, TXT, XML, YAML)
- `deck-without-name.csv`, `deck-without-name.json`
- `deck-ydk-format.ydk`

**用途**: 各種エクスポート形式の参照用サンプル

#### F. wip/ ディレクトリ (96KB)

作業中の調査・テストファイル:
- `rush-duel-url-investigation.md` (11KB) - Rush Duel対応調査
- `v0.4.0-investigation.md` (8KB) - v0.4.0機能調査
- `v0.4.0-phase1-design.md` (31KB) - v0.4.0フェーズ1設計書
- `test-edit-uuid-fix.js` (8KB) - UUID修正テスト
- `check-*.js` (複数) - 各種チェックスクリプト

#### G. requests/ ディレクトリ (32KB)

本レビュー依頼書を含む:
- `01_refactoring_review.md`
- `02_test_doc_obsolescence.md`
- `03_test_doc_addition.md`
- (将来) `04_tmp_cleanup_review.md` (本ファイル)

## レビュー依頼項目

### 1. 保存価値のあるファイルの特定（最優先）

#### 1-1. 調査・設計ドキュメントの価値判定

**対象**: `tmp/wip/` および ルート直下の `.md` ファイル

**確認観点**:
- [ ] `rush-duel-url-investigation.md` (11KB)
  - Rush Duel対応の実装に必要だった調査結果
  - 将来の機能拡張・保守で参照価値があるか
  - → `docs/dev/investigations/` へ移動すべきか
  
- [ ] `v0.4.0-phase1-design.md` (31KB)
  - フェーズ1の設計判断が記録されている
  - 設計の背景・理由が理解できる貴重な資料か
  - → `docs/design/v0.4.0/` へ移動すべきか
  
- [ ] `v0.4.0-investigation.md` (8KB)
  - 初期調査の記録
  - 設計判断の根拠として保存価値があるか
  
- [ ] `test-status-report.md`, `ciid-fix-manual-test.md`
  - テスト記録として価値があるか
  - 将来の類似バグ対応時に参照できるか

#### 1-2. テストコード・スクリプトの価値判定

**対象**: テストスクリプト約20個

**確認観点**:
- [ ] `test-png-*.ts` (3ファイル)
  - PNG機能のテストパターンが含まれているか
  - 正式なテストスイートに統合すべき内容か
  - 統合価値がなければ削除
  
- [ ] `browser/` 内の自動テストスクリプト (50個以上)
  - Playwrightテストのサンプルとして保存価値があるか
  - E2E環境構築時の参考になるか
  - いくつかの代表的なスクリプトのみ残すべきか

#### 1-3. データファイルの価値判定

**対象**: `tmp/_archived/scraping/` および `tmp/export-samples/`

**確認観点**:
- [ ] TSVデータファイル (cards-all.tsv, qa-all-*.tsv, faq-all-*.tsv)
  - 他の場所にバックアップが存在するか
  - 再スクレイピングのコストはどの程度か
  - `src/data/` 等に統合済みか確認
  - **削除前に必ずバックアップの有無を確認**
  
- [ ] スクレイピングスクリプト (fetch-*.ts, parse-*.ts)
  - 将来の再実行・改修で必要になる可能性
  - Git履歴に残っているか
  - ドキュメント化して手順を残すべきか
  
- [ ] `export-samples/` ディレクトリ
  - 各種エクスポート形式のリファレンス
  - テストフィクスチャとして保存価値があるか
  - → `tests/fixtures/` へ移動すべきか

**セキュリティリスク**:
- [ ] **Cookieファイル** (cookies.txt, cookies-faq.txt)
  - 認証情報が含まれる → **即座に削除**
  - 削除前に内容を確認し、Git履歴にも残っていないか確認

#### 1-4. HTMLスナップショット・ログファイルの価値判定

**対象**: HTMLファイル5個、ログファイル多数

**確認観点**:
- [ ] HTMLスナップショット
  - 特定の問題（ciid問題等）の再現・検証に必要か
  - ドキュメント化する価値のある事例が含まれているか
  - 削除前に重要な情報が含まれていないか確認
  
- [ ] ログファイル・デバッグログ
  - エラーパターンの記録として保存価値があるか
  - トラブルシューティングドキュメント作成の参考になるか
  - 個人情報・認証情報が含まれていないか

#### 1-5. 画像ファイルの価値判定

**対象**: `image-optimization/` および ルートの画像ファイル

**確認観点**:
- [ ] `image-optimization/` ディレクトリ
  - `public/images/` への反映状況を確認
  - 反映済みでも、変換前の高品質版として保存価値があるか
  
- [ ] `popup-screenshot.png` (393KB)
  - ドキュメント未使用なら価値ある可能性
  - `docs/` へ移動して使用すべきか

#### 1-6. キャッシュファイルの判定

**対象**: `tmp/_archived/.npm-cache/` (340MB)

**確認観点**:
- [ ] npmキャッシュは完全に再生成可能 → 削除可
- [ ] ただし親ディレクトリ内のデータを削除しないよう注意

### 2. 保管場所の提案

#### 2-1. 文書化価値のあるファイル

**候補**:
- [ ] `wip/rush-duel-url-investigation.md`
  - Rush Duel対応調査結果
  - → `docs/dev/` または `docs/_archived/` へ移動？
- [ ] `wip/v0.4.0-investigation.md`
  - v0.4.0機能調査
  - → `docs/design/` へ移動？
- [ ] `wip/v0.4.0-phase1-design.md`
  - フェーズ1設計書
  - → `docs/design/v0.4.0-phase1.md` へ移動？
- [ ] `test-status-report.md`
  - テスト状況報告
  - → `docs/testing/` へ移動？
- [ ] `ciid-fix-manual-test.md`
  - 手動テスト記録
  - → `docs/testing/manual/` へ移動？

#### 2-2. サンプルとして保存すべきファイル

**候補**:
- [ ] `export-samples/` ディレクトリ全体
  - エクスポート形式のリファレンス
  - → `tests/fixtures/export-samples/` へ移動？
  - → `docs/examples/export-formats/` へ移動？
  - → または削除してREADMEだけ残す？

#### 2-3. テストスイートへの統合候補

**候補**:
- [ ] `test-png-*.ts` (3ファイル)
  - → `tests/unit/utils/png-metadata.test.ts` へ統合
- [ ] `browser/` 内の有用なテストスクリプト
  - → `tests/e2e/` へ移動（E2E環境構築後）

### 3. 整理後の tmp/ 構造提案

#### 提案A: 完全クリーンアップ

```
tmp/
├── .gitkeep         # ディレクトリ保持用
└── requests/        # レビュー依頼書のみ残す（一時的）
    ├── 01_refactoring_review.md
    ├── 02_test_doc_obsolescence.md
    ├── 03_test_doc_addition.md
    └── 04_tmp_cleanup_review.md
```

**方針**: 
- 全ての一時ファイルを削除
- 価値あるドキュメントは適切な場所へ移動済み
- requests/ は作業完了後に削除

#### 提案B: 最小限保持

```
tmp/
├── .gitkeep
├── requests/        # レビュー依頼書（一時）
└── samples/         # 新設: 長期保存するサンプル
    └── export-formats/  # export-samples/ から移動・リネーム
        ├── README.md
        ├── deck-with-name.ydk
        ├── deck-with-name.json
        └── deck-with-name.csv
```

**方針**:
- サンプルファイルのみ残す
- `samples/` は `.gitignore` 対象外として管理
- または `tests/fixtures/` へ移動を検討

#### 提案C: アーカイブ保持

```
tmp/
├── .gitkeep
├── _investigation/  # wip/ からリネーム
│   ├── rush-duel-url-investigation.md
│   └── v0.4.0-phase1-design.md
└── requests/
```

**方針**:
- 調査ドキュメントをアーカイブとして保持
- 将来の参照用
- ただし `docs/_archived/` の方が適切かも

### 4. .gitignore の確認

**確認事項**:
- [ ] 現在の `.gitignore` に `tmp/` が含まれているか
- [ ] `tmp/requests/` を一時的に例外とすべきか
- [ ] サンプルファイルを Git管理下に置くべきか

### 5. セキュリティリスクの確認

**確認観点**:
- [ ] Cookieファイル (`tmp/_archived/scraping/cookies*.txt`)
  - 認証情報が含まれる可能性 → 即座に削除
- [ ] デバッグログ (`chromium-debug.log`)
  - 個人情報・認証トークンが含まれていないか確認後削除
- [ ] HTMLスナップショット
  - セッション情報・個人情報が含まれていないか
  - 問題なければ削除、あれば慎重に削除

## 期待する成果物

### 出力先ディレクトリ

```
docs/internal-reviews/
├── reports/
│   └── tmp-cleanup-report.md    # 本レビューの成果物
└── req/
    └── 04_tmp_cleanup_review.md # 本依頼書（移動後）
```

### 1. 保存推奨リスト（優先度順）

**出力**: `docs/internal-reviews/reports/tmp-cleanup-report.md`

形式:
```markdown
# tmp/ ディレクトリ整理レポート

**作成日**: 2025-11-18  
**レビュー対象**: tmp/ ディレクトリ全体

## 前提

- `tmp/` 内は原則削除対象
- `tmp/_archived/` は完全削除
- 以下は価値ある情報として救出対象

---

## 🔴 高優先度: 必ず救出すべき

### 貴重なデータ（他にバックアップなし）
- [ ] `tmp/_archived/scraping/cards-all.tsv` - カードデータ全量
  - 保存先: 要確認（src/data/に統合済みか？）
  - 確認方法: src/data/ と内容比較
  - **バックアップ確認必須**

### 設計・調査ドキュメント
- [ ] `tmp/wip/v0.4.0-phase1-design.md` - 設計判断の記録
  - 移動先: `docs/design/v0.4.0/phase1.md`
  - 理由: 設計背景の理解に必須
  - 処理: 内容確認後に移動

## 🟡 中優先度: 救出を検討すべき

### 参考資料
- [ ] `tmp/export-samples/` - エクスポート形式サンプル
  - 移動先: `tests/fixtures/deck-export-samples/`
  - 理由: テストフィクスチャとして有用
  - 処理: 内容確認後に移動

## 🟢 低優先度: 削除推奨（念のため内容確認）

### HTMLスナップショット
- [ ] `tmp/deck-*.html` (5ファイル)
  - 確認: 特殊な問題ケースが含まれていないか
  - 処理: 確認後削除

### テストスクリプト
- [ ] `tmp/test-png-*.ts` (3ファイル)
  - 確認: tests/unit/に統合されているか
  - 処理: 統合済みなら削除、未統合なら統合後削除

---

## ❌ 即座に削除（確認不要）

### セキュリティリスク
- `tmp/_archived/scraping/cookies.txt` - 認証情報
- `tmp/_archived/scraping/cookies-faq.txt` - 認証情報
- 処理: 即座に削除（Git履歴からも削除推奨）

### 大容量キャッシュ
- `tmp/_archived/.npm-cache/` (340MB) - npmキャッシュ
- 処理: 即座に削除

### 一時ファイル
- `tmp/*.log` - 各種ログファイル
- `tmp/chromium-debug.log` - デバッグログ
- 処理: 即座に削除
```

### 2. 救出実行コマンド集

形式:
```markdown
## 即座に削除してよいファイル (合計約350MB削減)

### 大容量ディレクトリ
- [ ] `tmp/_archived/.npm-cache/` (340MB) - npmキャッシュ、再生成可能
- [ ] `tmp/browser/` (31MB) - 一時テストスクリプト・スクリーンショット

### HTMLスナップショット (約1MB)
- [ ] `tmp/deck-*.html` (5ファイル)
- [ ] `tmp/member_deck_dno8.html`

### ログファイル (約250KB)
- [ ] `tmp/test-output*.log` (3ファイル)
- [ ] `tmp/chromium-debug.log`
- [ ] `tmp/test-existing-card.log`
- [ ] `tmp/test-result.txt`
- [ ] `tmp/drag-drop-test-result.txt`

### テストスクリプト (約100KB)
- [ ] `tmp/test-*.js` (約15ファイル)
- [ ] `tmp/test-*.ts` (3ファイル)
- [ ] `tmp/check-*.js`
- [ ] `tmp/parse-*.js`

### その他
- [ ] `tmp/popup-screenshot.png` (393KB)
- [ ] `tmp/test-deck-with-metadata.png` (破損?)
- [ ] `tmp/image-optimization/` (3.7MB) - 反映済みの場合
```

### 2. 移動リスト

形式:
```markdown
## 適切な場所へ移動すべきファイル

### ドキュメント化推奨
- [ ] `tmp/wip/rush-duel-url-investigation.md` → `docs/dev/investigations/rush-duel-urls.md`
- [ ] `tmp/wip/v0.4.0-phase1-design.md` → `docs/design/v0.4.0/phase1.md`
- [ ] `tmp/ciid-fix-manual-test.md` → `docs/testing/manual/ciid-fix-verification.md`

### テスト統合推奨
- [ ] `tmp/test-png-*.ts` → `tests/unit/utils/png-metadata.test.ts` へ統合

### サンプルファイル
- [ ] `tmp/export-samples/` → `tests/fixtures/deck-export-samples/`
  - または `docs/examples/export-formats/`
```

### 3. 保留リスト

```markdown
## 判断保留（オーナー確認必要）

- [ ] `tmp/_archived/scraping/` 内のTSVデータファイル
  - cards-all.tsv, qa-all-*.tsv, faq-all-*.tsv
  - 他の場所にバックアップがあるか確認
  - 再スクレイピングのコストはどうか
```

### 4. 実行コマンド例

```bash
# 即座に削除（約350MB削減）
rm -rf tmp/_archived/.npm-cache
rm -rf tmp/browser
rm -rf tmp/image-optimization  # 反映確認後
rm tmp/*.html
rm tmp/*.log
rm tmp/test-*.js tmp/test-*.ts
rm tmp/check-*.js tmp/parse-*.js
rm tmp/*.png

# ディレクトリ移動
mkdir -p docs/dev/investigations docs/design/v0.4.0 docs/testing/manual
mv tmp/wip/rush-duel-url-investigation.md docs/dev/investigations/rush-duel-urls.md
mv tmp/wip/v0.4.0-phase1-design.md docs/design/v0.4.0/phase1.md
mv tmp/ciid-fix-manual-test.md docs/testing/manual/ciid-fix-verification.md

# サンプルファイル移動
mkdir -p tests/fixtures
mv tmp/export-samples tests/fixtures/deck-export-samples

# 最終確認後、残りを削除
rm -rf tmp/_archived tmp/wip
```

## 備考

- 削除前に `du -sh tmp/` でサイズ確認推奨
- 大容量ファイルは個別に確認してから削除
- Git未追跡ファイルは `git clean -n` で事前確認
- バックアップが必要な場合は `tmp.backup.tar.gz` を作成
- `.gitignore` に `tmp/` が含まれている場合、削除してもGit履歴に影響なし
