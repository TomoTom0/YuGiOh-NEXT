# 次期バージョン（未リリース）

## New Features

- チャット機能: searchDeckCardsにkind=text（効果テキスト検索）を追加。kindに配列指定（例: ["name","text"]）で複数フィールドのOR検索に対応
- チャット機能: getChatHistoryツールを追加。セッション内の過去のtool実行結果を取得可能に
- チャット機能: 会話履歴の引き継ぎ対応。前回のtool実行結果（生データ含む）を次回のLLM呼び出しに引き継ぎ、フォローアップ質問に対応

## Bug Fixes

- Practice mode: デッキの表向きカード（上/下）をそれぞれ1枚のみ表示するよう修正（裏向きカードを重ねて表示しない）
- Practice mode: ドラッグ中のカードサイズが実際の表示サイズと異なる問題を修正（2Pモードで顕著）

## Changes

- Practice mode: menu内容をdeck-edit/practiceで切替（practice時はOptionsのみ表示）
- Practice mode: 2P modeのカードサイズを1P modeとは別に設定可能に（デフォルト: small）

## Performance

（変更内容をここに記載）

## Refactoring

- PracticeZoneInfoPanelのPracticeCard→CardListCard変換をtyped adapterに分離（CardListCard interface + practiceCardToCardListCards utility）

## Repository Management

- パッケージマネージャをbunからpnpmに移行（bun.lock削除、pnpm-lock.yaml追加、CI/CLAUDE.md/CONTRIBUTING.md等のコマンド表記を更新）

## Internal Improvements

（変更内容をここに記載）

## Known Issues

（変更内容をここに記載）
