# 次期バージョン（未リリース）

## New Features

- チャット機能: searchDeckCardsにkind=text（効果テキスト検索）を追加。kindに配列指定（例: ["name","text"]）で複数フィールドのOR検索に対応
- チャット機能: getChatHistoryツールを追加。セッション内の過去のtool実行結果を取得可能に
- チャット機能: 会話履歴の引き継ぎ対応。前回のtool実行結果（生データ含む）を次回のLLM呼び出しに引き継ぎ、フォローアップ質問に対応
- GENESYSポイント: howtoページからカード名ベースでGENESYSポイントを取得・キャッシュ（30日TTL、複数リスト対応）
- リミットレギュレーション: デッキ名タグ（[OCG-YYMM]/[GENESYS-YYMM]）による適用制限リストの自動判定。fallback時は修正提案、無視設定の永続化にも対応
- リミットレギュレーション: デッキ名入力欄右上にレギュレーションバッジ（OCG/GENESYS）を表示。詳細はツールチップで表示しレイアウトに影響しない
- リミットレギュレーション: デッキ名冒頭の `[` / `【` 入力時に実在する制限リスト版を候補表示・補完
- リミットレギュレーション: GENESYS表記の省略形 `[GENE]` を許容
- デッキ名入力欄: クリアボタンを追加（デッキ名がある時のみ表示）
- UI: undo/redo・save・load・practice各ボタンをネイティブtitle属性から独自HoverTooltipに置き換え

## Bug Fixes

- Practice mode: デッキの表向きカード（上/下）をそれぞれ1枚のみ表示するよう修正（裏向きカードを重ねて表示しない）
- Practice mode: ドラッグ中のカードサイズが実際の表示サイズと異なる問題を修正（2Pモードで顕著）
- デッキ編集画面: ヘッダーが遅延ロード（画像・バナー等）で成長した際、下部までスクロールしても見切れる問題を修正（ヘッダー高さをResizeObserverで追従）
- GENESYS: GENESYS適用時にポイントが表示されない問題を修正（listParam省略時の現在有効リスト確保）
- GENESYS: ポイントの名前解決前にUnifiedCacheDBの初期化を待機するよう修正（未解決カードは次回再解決）
- リミットレギュレーション: タグ解決前に実在一覧のdiscovery完了を待機するよう修正
- デッキ保存: data.errorが配列以外の場合にTypeErrorで失敗する問題を修正（配列判定・正規化）
- デッキ保存: 先読みytkn失効によるscreen transition errorを自動リトライで解消、リトライ中の一時エラー表示を抑制
- 未ログイン時: デッキロード/保存でcgid未検出時にログインページへリダイレクト
- デッキ編集画面: デッキ名入力欄がpractice/saveボタンと重なる問題を修正（box-sizing: border-box）
- デッキ編集画面: レギュレーションバッジの上半分が見切れる問題を修正

## Changes

- Practice mode: menu内容をdeck-edit/practiceで切替（practice時はOptionsのみ表示）
- Practice mode: 2P modeのカードサイズを1P modeとは別に設定可能に（デフォルト: small）
- デッキ名入力欄: ロード直後の初期表示をロード済みのデッキ名に変更（これまでは空欄+プレースホルダ）
- UI: 検索欄・デッキ名欄のクリアボタンアイコンをバツ（mdiCloseCircle）に統一

## Performance

（変更内容をここに記載）

## Refactoring

- PracticeZoneInfoPanelのPracticeCard→CardListCard変換をtyped adapterに分離（CardListCard interface + practiceCardToCardListCards utility）
- 既存のtsc error 30件・15ファイルを解消（noUncheckedIndexedAccess対応、未使用変数削除、as anyの型ガード化）
- 未整備な設定項目を解消（孤立のDeckEditSettings.vue削除、enableHeadPlacement/saveDelayMs/saveWithAutoFullSortにUIを追加）

## Repository Management

- パッケージマネージャをbunからpnpmに移行（bun.lock削除、pnpm-lock.yaml追加、CI/CLAUDE.md/CONTRIBUTING.md等のコマンド表記を更新）
- mise.tomlを新規作成し、package.jsonの全scriptsをmise taskとして登録（mise run build-and-deploy等）
- LLM調査用スクリプト（`scripts/try/`）を `tmp/` に移動し、リポジトリ追跡から除外（一時スクリプトは `tmp/` 配下とする規約に統合）

## Internal Improvements

- 機能フラグレジストリ（docs/feature/*.toml）を整備。featureSettings/appSettings/uxの全設定項目を分類・棚卸し
- ブラウザテストをESM環境（`"type":"module"`）に合わせて `.cjs` 化し、実行不能だったテスト14個を修復

## Known Issues

（変更内容をここに記載）
