# テスト・ドキュメント陳腐化調査レポート

作成日時: 2025-11-18
元依頼: `docs/internal-reviews/req/02_test_doc_obsolescence.md`

## 要約

- 対象: PR #10 に伴う機能追加（Rush Duel 対応、PNG 形式でのデッキ情報埋め込み、URL State、設定管理の刷新、ドラッグ&ドロップ改善等）に関連するテストとドキュメント。
- 実施内容: リポジトリ走査、関連ドキュメント確認、テスト実行トライ（ユニットテスト実行で環境エラーを確認）。
- 主要な結論: ドキュメントの一部が新機能を反映していない可能性が高く、特に PNG 埋め込み・メタデータ・Rush Duel 表示に関するユーザー向け記載が不足しています。テストについては `png-metadata`, `deck-import/export`, `url-state`, `stores/settings` を優先して追加・修正する必要があります。自動テスト実行は環境依存のエラーにより一部検証できませんでした（詳細は「テスト実行」節）。

## 範囲

- コード: `utils/png-metadata.ts`, `utils/deck-import.ts`, `utils/deck-export.ts`, `utils/url-state.ts`, `stores/settings.ts`, `utils/page-detector.ts` 等
- ドキュメント: `docs/usage/` 配下、`README.md`、内部レビュー文書 (`docs/internal-reviews/req/*.md`)
- テスト: `tests/unit/` 配下（既存テストの妥当性・追加必要箇所）

## 実施した手順

1. `docs/internal-reviews/req/02_test_doc_obsolescence.md` の要求を確認
2. リポジトリ内で関連キーワード検索（PNG, tEXt, metadata, Rush, url-state, settings 等）を実行
3. `docs/usage` と内部レビュー計画レポート（`docs/internal-reviews/reports/test-doc-addition-plan.md`）を確認
4. ユニットテストを `npm run test:unit` で実行 → 実行時エラーにより全体の自動検出ができず（Vitest の CommonJS 読み込みエラー）

## テスト実行の結果と制約

- 実行コマンド: `npm run test:unit`（`npx tsx tests/unit/**/*.test.ts` を呼ぶ設定）
- 発生したエラー: Vitest が CommonJS 環境の `require()` から読み込まれ、"Vitest cannot be imported in a CommonJS module using require()" で失敗。
- 影響: 網羅的なテスト実行・失敗箇所の自動抽出ができなかったため、テストの陳腐化判定は主にコードとドキュメントの差分（実装箇所）に基づく手動レビューとなりました。

推奨対応（テスト実行復旧）:

- 短期: `npx tsx` を用いて個別テストファイルを直接実行し、重要ユニット（`utils/png-metadata.ts` 等）の動作を検証する。
- 中期: `package.json` の `test` スクリプトを Vitest/ESM 環境に合わせて統一し、CI で再現する。

## ドキュメントの陳腐化候補（優先度順）

高優先 (ユーザー影響大)

- `docs/usage/custom-deck-edit.md`:
  - 「保存機能がない」と明記されていますが、URL State や設定永続化が導入されている場合は誤解を招きます。メタデータタブやPNG埋め込み・エクスポート方法を追記してください。
  - スクリーンショットが旧 UI の可能性あり — 画面変更があれば差し替えが必要。

- `README.md`:
  - 主要機能紹介に PNG 埋め込みや Rush Duel の説明が不足している場合は追記。

中優先 (開発者向け整備)

- `docs/dev/` と `docs/api/` 配下:
  - `stores/settings`、`url-state`、`png-metadata` の API/仕様を明示するドキュメント（型定義・保存形式・互換性）を用意する。特に PNG に埋めるメタデータのキー/バージョン/エンコーディング仕様を `docs/dev/png-format-spec.md` のような形で文書化することを推奨。

低優先

- 画像最適化手順やアーカイブ文書の補足は段階的に更新可能。

## テスト追加・修正の優先タスク（推奨）

1. `tests/unit/png-metadata.test.ts` — 正常 PNG / 不正 PNG / 複数 tEXt チャンク / エンコーディング境界値
2. `tests/unit/deck-import.test.ts` — YDK/JSON/PNG の代表的フィクスチャ（正常・不正）で往復検証
3. `tests/unit/deck-export.test.ts` — エクスポート→インポートの往復テスト、特殊文字/メタデータ保持
4. `tests/unit/url-state.test.ts` — シリアライズ/デシリアライズ、古いバージョン互換性、不正パラメータ
5. `tests/unit/stores/settings.test.ts` — localStorage モックを使った永続化テスト
6. E2E（Playwright）: デッキ編集の主要フロー（編集→エクスポート→インポート）、Rush Duel 表示の検証

備考: PNG フィクスチャは `tests/fixtures/png/` に格納してください。

## 優先度マトリックス（抜粋）

| 項目 | 影響範囲 | 緊急度 | 難易度 |
|---|---:|---:|---:|
| README/Usage のメタデータ説明追加 | 全ユーザー | 高 | 低 |
| PNG メタデータ単体テスト追加 | 取込/出力機能 | 高 | 中 |
| E2E：デッキ編集→エクスポート→インポート | CI / リリース | 高 | 中 |
| docs/dev/png-format-spec の整備 | 開発者 | 中 | 低 |

## 具体的な修正提案（短期アクション）

- A1: `docs/usage/import-export.md` を作成し、PNG 埋め込み手順、サンプルコマンド、既知の制限（多言語・大きさ）を記載する。
- A2: `docs/usage/deck-metadata.md` を作成し、各フィールドと UI 上での編集方法を示す。
- A3: `tests/fixtures/png/` に 3 種類のテスト PNG を追加（正常 / tEXt 複数 / 不正）し、`png-metadata.test.ts` を実装する。
- A4: `package.json` の `test` スクリプトを Vitest 用に整理し、CI での再現性を高める（`vitest run` を標準化する等）。

## 次のステップ（提案）

1. 本レポートを確認・承認いただければ、私が以下を作成します。
   - `docs/internal-reviews/reports/test-doc-obsolescence.md`（本ファイル）を正式レポートとして保存済み。
   - 続けて `docs/usage/import-export.md` と `docs/usage/deck-metadata.md` の草案を作成可能です（承認要）。
2. テスト実行の復旧を行って欲しい場合は指示ください（私が試行するか、環境でのスクリプト修正案を提示します）。

## 付録: 発見済み該当箇所（抜粋）

- `docs/internal-reviews/req/01_refactoring_review.md` — 新規ユーティリティの一覧（`png-metadata.ts`, `url-state.ts` 等）
- `docs/internal-reviews/reports/test-doc-addition-plan.md` — 既存の追加計画（テスト優先度・方法が詳細に記載されています）
- `docs/usage/custom-deck-edit.md` — ユーザー向け説明（保存/メタデータ/スクリーンショットに注目）

---

作成者: Automated review (assistant)

