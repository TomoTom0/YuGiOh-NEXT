# テストとドキュメント追加計画レポート

作成日時: 2025-11-18
元依頼: `docs/internal-reviews/req/03_test_doc_addition.md`

目的: PR #10 で導入された新規機能に対して、優先度を付けたテスト追加計画とドキュメント整備計画を提示する。

1) 要約（即対応推奨）
- 高優先度ユニットテスト: `png-metadata.ts`, `deck-import.ts`, `deck-export.ts`, `url-state.ts` を優先して追加。
- ストアテスト: `stores/settings.ts` の永続化とURL連携をカバー。
- ドキュメント: ユーザー向けの `docs/usage/import-export.md` と `docs/usage/deck-metadata.md` を最優先で作成。

2) 推奨テスト実装ガイド（優先度順）

- png-metadata.ts (高)
  - 期待挙動: tEXtチャンクの読み書き、複数チャンク対応、CRCの検証、エラー処理。
  - テスト手法: バイナリPNGフィクスチャを用意（小さな正常PNG、不正PNG、複数tEXt含むPNG）。
  - 成果物: `png-metadata.test.ts`。

- deck-import.ts (高)
  - 期待挙動: YDK/JSON/PNGのパース、フォーマット検証、カードID検証と枚数チェック、Rush判定。
  - テスト手法: 代表的なインプットフィクスチャ群（正常・不正）を用意。モックストアで副作用を検証。
  - 成果物: `deck-import.test.ts`。

- deck-export.ts (高)
  - 期待挙動: 各形式出力の整合性、エスケープ、メタデータ保持。
  - テスト手法: エクスポート→インポートの往復テスト、特殊文字ケース。
  - 成果物: `deck-export.test.ts`。

- url-state.ts (高)
  - 期待挙動: シリアライズ/デシリアライズ、デフォルトの復元、不正パラメータ対処。
  - テスト手法: 複数のURLパラメータ例と境界値。
  - 成果物: `url-state.test.ts`。

- stores/settings.ts (中)
  - 期待挙動: localStorage永続化、デフォルト適用、テーマ連携。
  - テスト手法: localStorage のモック、初期値検証、更新→永続化確認。
  - 成果物: `stores/settings.test.ts`。

- その他ユーティリティ/コンポーネント (低〜中)
  - `url-builder.ts`, `card-limit.ts`, `page-detector.ts` の単体テストを順次追加。
  - Vueコンポーネントテストはロジック重要部分に限定。

3) E2E テスト計画（並行検討）
- 検討優先: 基本操作フロー（デッキ編集→エクスポート→インポート）、Rush Duel 表示、テーマ切替。
- ツール: Playwright 推奨（既存表示の有無を確認のこと）。
- スコープ: まずは 2-3 のクリティカルパスを自動化。

4) ドキュメント優先度と初期テンプレート
- 高優先度（即作成）
  - `docs/usage/import-export.md`: 各フォーマットの説明、操作手順、トラブルシューティング簡易版。
  - `docs/usage/deck-metadata.md`: メタデータ各項目の説明とUI操作。
- 中優先度
  - `docs/usage/settings.md`, `docs/usage/rush-duel.md`, `docs/usage/faq.md`。
- 開発者向け
  - `docs/dev/png-format-spec.md`（PNG tEXt 使用規約）、`docs/dev/data-models.md`（DeckMetadata 型）を早めに整備。

5) 作業分解（短期ロードマップ）
- Week 1: `png-metadata` テスト、`deck-import` の主要ケース、`docs/usage/import-export.md` の草案。
- Week 2: `deck-export`、`url-state` のテスト完了、`docs/usage/deck-metadata.md` の草案。
- Week 3: `stores/settings` テスト、E2E 基本フローの初期実装。

6) リスク・注記
- PNGバイナリフィクスチャの管理: テスト資産は `tests/fixtures/png/` 以下に格納すること。
- localStorage の実装差異: Node 環境でのテストは localStorage モックが必要。
- E2E 実行にはブラウザバイナリが必要。CI 環境確認要。

7) 次のアクション（提案）
- この計画を承認後、`png-metadata.test.ts` とテスト用PNGフィクスチャを PR で提出します。
- ドキュメントは `docs/usage/` に草案を追加し、ユーザーテスト担当にレビューを依頼します。

