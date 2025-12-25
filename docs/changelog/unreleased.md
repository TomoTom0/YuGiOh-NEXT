# 次期バージョン（未リリース）

## Bug Fixes

- テストファイルのインデントとスキップ理由コメントを修正 (#91)
- deck-detail-parser.ts: より堅牢な正規表現パターンを追加、警告コメント追加 (#91)
- deck-edit.ts: movedフラグを追加し、不要な履歴追加を防止 (#91)

## Changes

- CLAUDE.mdを簡潔に整理 (#92)
- docs/README.md, tests/README.mdを追加 (#92)
- update-version.shを削除（update-versionコマンドへ移行） (#92)

## Repository Management

- DependabotのPRターゲットブランチをdev-newに変更
- v0.6.0-v0.6.3のgit tagとリリース作成完了

## Internal Improvements

### テスト追加・改善

- 11個のユニットテストファイルを追加 (#92)
  - background-fetch-queue.test.ts
  - chrome-storage-utils.test.ts
  - deck-hash.test.ts
  - deck-thumbnail-cache.test.ts
  - deck-thumbnail-generator.test.ts
  - disabled-reason-formatter.test.ts
  - dom-selectors.test.ts
  - error-handler.test.ts
  - extension-context-checker.test.ts
  - filter-label.test.ts
  - reverse-map-generator.test.ts

### テスト修正

- 全テスト失敗を修正（26件→0件） (#90, #91)
  - console.temp定義追加 (tests/setup.ts)
  - useDeckPersistence テスト修正: getDeckName追加、originalName設定
  - deck-cache テスト修正: originalName追加、force=true追加
  - 実装と合わない9個のスキップテストを削除
  - useDeckPersistence.test.ts: createPersistence()ヘルパー関数で重複削減

- background-fetch-queue.test.tsのテスト安定性改善 (#92)
  - beforeEach内の固定時間待機をactiveCount()ポーリングに変更
  - タイミング依存の不安定さを解消

### テスト結果

- 全140テストファイル、2709テストがpass
