# 作業中のタスク

## Rush Duel対応（OCG/Rush両対応化）（2025-11-18）

### 背景
遊戯王公式ページには以下の2つのカードゲームがある：
- **OCG** (yugiohdb) - 現在対応中
- **Rush Duel** (rushdb) - 今後対応予定

### 対応方針

#### Phase 1: デッキ表示画面の機能のみ対応（今回）✅ 完了
- シャッフル・ソート機能
- デッキ画像作成機能

#### Phase 2以降: その他の機能も順次対応

### 実装完了内容

#### 調査フェーズ ✅ 完了（2025-11-18）
- [x] URL使用箇所の全調査（29ファイル）
- [x] 調査結果のドキュメント化（`tmp/wip/rush-duel-url-investigation.md`）

#### Phase 1: 基盤整備 ✅ 完了（2025-11-18）
- [x] 型定義の追加（`CardGameType = 'ocg' | 'rush'`）
- [x] page-detector.tsの拡張
  - `detectCardGameType()` - URLからゲームタイプを自動判定
  - `getGamePath()` - 'ocg' → 'yugiohdb', 'rush' → 'rushdb'
  - 全判定関数に`gameType?`オプション引数を追加
- [x] url-builder.tsの作成（11個のURL生成関数）

#### Phase 2: デッキ表示機能の対応 ✅ 完了（2025-11-18）
- [x] シャッフル・ソート機能でのゲームタイプ判定
- [x] デッキ画像作成機能でのゲームタイプ判定
- [x] QRコードURL、Refererヘッダーの動的生成

#### バグ修正 ✅ 完了（2025-11-18）
- [x] `getCardImageUrl()`の`/yugiohdb/`固定問題を修正
  - `gameType`パラメータを追加（デフォルト: 'ocg'）
  - 全呼び出し箇所で`detectCardGameType()`を使用
- [x] `isDeckDisplayPage()`の`ope=1`省略対応
  - `ope=1`が省略された場合もデッキ表示ページと判定
- [x] 全コンポーネントで画像URL生成を修正
  - DeckCard.vue, RightArea.vue, DeckEditLayout.vue
  - createDeckRecipeImage.ts

### 動作確認
- ✅ Rush Duelページでシャッフル・ソートボタンが表示される
- ✅ Rush Duelページでデッキ画像作成が動作する
- ✅ 画像URLが正しく`/rushdb/`になる
- ✅ `ope=1`が省略されたデッキ表示ページでも動作する

### ビルド＆デプロイ
- ✅ ビルド完了（2025-11-18 12:00 JST）
- ✅ デプロイ完了（`/home/tomo/user/Mine/_chex/src_ygoNeuronHelper`）
- ✅ コミット完了（3コミット）
  - `565a848` - Phase 1: 基盤整備
  - `0b88de8` - Phase 2: デッキ表示機能対応
  - `c0389e8` - バグ修正（画像URL、ope=1省略対応）

### 実装計画

#### 1. URL使用箇所の調査（優先度：最高）✅ 完了
- [x] src/内でURLの値を用いている箇所を全て洗い出す
  - ハードコードされたURL（`https://www.db.yugioh-card.com/yugiohdb/...`）
  - 正規表現によるURL判定（`/yugiohdb/`, `/member_deck\.action/` など）
  - API呼び出しのベースURL
  - パーサーでのURL参照
- [x] 調査結果をドキュメント化
  - 📄 `tmp/wip/rush-duel-url-investigation.md` 作成完了
  - 合計29ファイルで修正が必要
  - 6段階の実装計画を策定

#### 2. 型定義の追加 ✅ 完了
- [x] `CardGameType = 'ocg' | 'rush'` の定義
  - 配置場所: `src/types/settings.ts`
  - export追加完了

#### 3. ページ判定ユーティリティの拡張（`src/utils/page-detector.ts`）✅ 完了
- [x] `detectCardGameType(): CardGameType` - URLからゲームタイプを自動判定
- [x] `getGamePath(cardGameType: CardGameType): string` - 'ocg' → 'yugiohdb', 'rush' → 'rushdb'
- [x] 各判定関数に `cardGameType?: CardGameType` 引数を追加
  - `isDeckDisplayPage(cardGameType?: CardGameType): boolean`
  - `isDeckEditPage`, `isDeckListPage`, `isCardSearchPage`, `isCardDetailPage`
  - `isFAQSearchPage`, `isFAQDetailPage`, `isDeckSearchPage`, `isYugiohDBSite`

#### 3.1 URLビルダーユーティリティの作成 ✅ 完了
- [x] `src/utils/url-builder.ts` を新規作成
  - `buildApiUrl(path: string, gameType: CardGameType): string`
  - `buildImageUrl(cid, ciid, imgHash, gameType): string`
  - `buildFullUrl(relativePath): string`
  - `getDeckApiEndpoint(gameType): string`
  - `getCardSearchEndpoint(gameType): string`
  - `getFaqSearchEndpoint(gameType): string`
  - `getDeckSearchPageUrl(gameType, locale): string`
  - `getCardSearchFormUrl(gameType): string`
  - `getImagePartsBaseUrl(gameType): string`
  - `getVueEditUrl(gameType, dno?): string`
  - `getDeckDisplayUrl(cgid, dno, gameType): string`

#### 4. API URLの動的生成
- [ ] ベースURLをゲームタイプから生成する関数
- [ ] 各APIファイルの修正
  - `src/api/deck-operations.ts`
  - `src/api/card-search.ts`
  - `src/api/card-faq.ts`
  - その他

#### 5. デッキ表示機能の対応 ✅ 完了
- [x] シャッフル・ソート機能でのゲームタイプ判定
  - `addShuffleButtons.ts`: `detectCardGameType()`を使用
  - `isDeckDisplayPage(gameType)`でページ判定
- [x] デッキ画像作成機能でのゲームタイプ判定
  - `addImageButton.ts`: `detectCardGameType()`を使用
  - `downloadDeckRecipeImage.ts`: `getDeckDisplayUrl()`でURL生成
  - `createDeckRecipeImage.ts`: QRコードURL、Refererヘッダー、全て動的生成

#### 6. テスト
- [ ] `page-detector.ts` のテスト追加
  - Rush Duel用のテストケース
- [ ] 各機能の動作確認

### 次のアクション
Rush Duel対応（Phase 1-2）✅ 完了・動作確認済み。

デッキ表示機能（シャッフル・ソート・画像作成）がOCG/Rush Duel両対応になりました。

### 次のステップ候補：
1. ✅ **デッキ編集UI改善完了**（2025-11-18）
   - 検索入力欄の三点メニューボタンスタイル改善
   - ドロップダウンメニューの外側クリック対応
   - ドロップダウンメニューの閉じるアニメーション追加
   - Extra/Sideデッキの配置方向選択（既に実装済み確認）

2. 🔄 **メタデータUIの改善** ✅ 完了（2025-11-18）
   - [x] タブの順番変更：Card, Search, Metadata
   - [x] 初期タブをCardに変更
   - [x] メタデータUIのレイアウト変更
     - 1行目：左に公開/非公開（見出しなし）、デッキタイプをアイコン表示、デッキスタイルをボタン表示
     - 2行目：左にTagボタン、右に選択タグをチップ表示
     - 3行目：左にCategoryボタン、右に選択カテゴリをチップ表示
     - デッキ説明：見出し + 文字数カウンター (current/500)
   - ビルド＆デプロイ完了
   
3. **v0.4.0の他の機能実装**（優先度：高）
   - タグマスターデータの取得実装
   - デッキエクスポート/インポートのテスト
   - 画像サイズ切り替えのUI実装

---

## v0.4.0: デッキ編集UI改善とメタデータ編集機能（2025-11-18）

### ドラッグ&ドロップUIの改善

#### 実装内容
- [x] セクションドロップハンドラーの追加（DeckSection.vue）
  - `@drop="handleEndDrop"` を追加してセクション末尾へのドロップを処理
- [x] 背景枠線の位置ずれ修正
  - `border: 2px dashed` → `outline: 2px dashed` + `outline-offset: -2px`
  - レイアウトシフトを防止
- [x] アニメーション中のz-index修正
  - 移動中のカードに `z-index: 1000` を適用
  - アニメーション完了後にリセット
- [x] 同じセクション内の並び替えロジック修正
  - aをbにドロップ時の挙動を修正：
    - aが前 → b, a の順（aをbの後ろに挿入）
    - aが後ろ → a, b の順（aをbの前に挿入）
- [x] ビルド・デプロイ
- [x] ボタン押下時の移動アニメーション修正
  - `shuffleSection` と `sortSection` にFLIPアニメーションを追加
  - `recordAllCardPositionsByUUID()` でFirst位置を記録
  - `animateCardMoveByUUID()` でアニメーション実行
- [x] ビルド・デプロイ（アニメーション対応）
- [x] アニメーション不具合の修正
  - `reorderCard` にrequestAnimationFrame追加（タイミング修正）
  - 画像の`key`属性をUUIDベースに変更（fadeInアニメーション防止）
- [x] ビルド・デプロイ（不具合修正）
- [x] アニメーション不具合の根本原因修正
  - `moveCard`と`moveCardWithPosition`で移動元セクションを追加
  - `new Set([to])` → `new Set([from, to])`
  - 移動元のカードが詰まるアニメーションを表示
- [x] ビルド・デプロイ（根本修正）
- [x] 最後の1枚ドラッグ問題の修正
  - `.card-grid`の`min-height`をカード1枚分に変更
  - `drop-zone-end`の`min-height`をカード1枚分に変更
  - ドラッグ中にカードが`position: absolute`になっても高さを維持
- [x] ビルド・デプロイ（最後の1枚修正）
- [x] 移動不可セクションの背景色表示防止
  - `draggingCard`状態をストアに追加
  - DeckCard.vueでdragstart/dragend時に設定/クリア
  - DeckSection.vueで`canDropToSection()`関数を追加
  - 移動可能な場合のみ背景色を表示
- [x] ビルド・デプロイ（背景色表示修正）
- [x] 原因判明：ビルドが古かった（11月16日のdist、今日は18日）
- [x] 再ビルド・デプロイ
- [x] 動作確認（並び替え・移動・最後の1枚・背景色表示含む）

#### 修正完了した問題（2025-11-18）

- ✅ ボタン押下時に間違ったカードが移動する問題
- ✅ extra配置不可カードのドラッグ時の背景色表示（部分修正）

#### 現在作業中の問題（2025-11-18）

1. **ボタン押下時のちらつき**
   - 同じセクション内の無関係なカードがちらつく
   - 原因：カード移動時に他カードが詰まるアニメーションが表示される（これは正常動作の可能性）

2. ✅ **UI改善完了**（2025-11-18 12:15 JST）
   - [x] 検索入力欄の三点メニューボタン
     - 透過度追加（rgba(255, 255, 255, 0.85)）
     - 色を薄いグレーに変更（#999）
     - 位置調整（top: -2px）
   - [x] ドロップダウンメニューの外側クリック
     - クリックイベントリスナーで外側クリック時に閉じる
   - [x] Extra/Sideデッキの配置方向選択
     - SettingsPanel.vueで既に実装済み（横並び/縦並び）

2. **ボタン押下時に間違ったカードが移動** ⚠️ 重大 → ✅ **修正完了・動作確認済み**
   - 同じcidの別カードが移動して、押下したカード自体が移動しない
   - **根本原因1**: DeckCard.vueの画像keyに`uuid || ${cardId}-${ciid}`というfallbackがあった
     - 空文字列のuuidはfalsyなので、同じ(cardId, ciid)のカードが同じkeyを持ち、Vueが同一コンポーネントと認識
     - `this.uuid`が間違った値を参照していた
   - **修正1**:
     1. DeckCard.vueのuuid propsを`required: true`に変更
     2. 画像keyのfallbackを削除（`:key="uuid"`のみ）
     3. CardList.vueで各カードにcrypto.randomUUID()を生成（computed）
     4. CardInfo.vueでcrypto.randomUUID()を生成（computed）
   - **根本原因2**: deck-edit.tsのgenerateUUID()が古い実装のまま
     - `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` を使用
     - crypto.randomUUID()ではなかった
   - **修正2**: generateUUID()をcrypto.randomUUID()に変更
   - **根本原因3**: moveCardFromSide()がuuidパラメータを受け取っていない
     - DeckCard.handleTopRight() → moveCardFromSide() → moveCard() の経路でuuidが失われる
     - moveInDisplayOrder()でuuid: undefinedとなり、lastIndexOf()のfallbackが発動
   - **修正3**: moveCardFromSide(card, uuid?)にuuidパラメータを追加、moveCard()に渡す
   - ビルド・デプロイ完了（3回）
   - **テストスクリプト作成**: `tmp/wip/test-edit-uuid-fix.js`, `tmp/wip/verify-uuid-fix.js`
     - edit画面でのUUID修正動作確認用
     - tests/browser/test-buttons.jsを参考に作成
     - DOM要素のdata属性のみでアクセス（Vue appやPiniaストアに直接アクセスしない）
     - 同じcid,ciidのカード2枚をmain→sideに移動してUUID動作確認
   - **動作確認完了**（2025-11-18）:
     - cid=12950のカード3枚（ciid=2が1枚、ciid=1が2枚）がそれぞれ異なるUUIDを持つことを確認
     - UUID指定でカード移動が正しく動作することを確認
     - 移動したカードのUUIDがsideセクションに存在することを確認

3. **extra配置不可カードのドラッグ時の背景色** → ✅ **修正完了**
   - extraセクションに配置できないカードをドラッグ時にextraセクション上で背景色が表示される
   - **根本原因1**: searchからの移動時、mainとextraを区別せずに常にtrueを返していた
     - 207-209行目: `if (to === 'main' || to === 'extra') return true`
     - extraデッキカードかどうかのチェックが行われていなかった
   - **修正1** (deck-edit.ts canMoveCard関数を新規追加):
     - searchからmainへの移動: extraデッキカード（fusion/synchro/xyz/link）は拒否
     - searchからextraへの移動: extraデッキカードのみ許可
     - `card.cardType === 'monster' && card.types`で型ガード
     - ストアにエクスポートしてDeckSection/DeckCardの両方から使用可能に
   - **修正2** (DeckSection.vue):
     - `canDropToSection()`を`deckStore.canMoveCard()`を使う形に簡略化
     - `handleEndDrop()`冒頭で`canDropToSection()`をチェック、移動不可なら早期return
   - **修正3** (DeckCard.vue handleDrop):
     - カード上にドロップする場合も`deckStore.canMoveCard()`でチェック
     - 移動不可の場合は早期return
   - ビルド・デプロイ完了（2025-11-18 07:05）

4. **ドラッグ時の他カード上での色変化が消失** → ✅ **修正完了**
   - カードをドラッグ移動時に他のカードの上にいるときに、そのカードの色が変わらない
   - **根本原因**: handleDragOverで`event.preventDefault()`を呼んでいなかった
   - **修正1** (DeckCard.vue handleDragOver):
     - `event.preventDefault()`と`event.stopPropagation()`を追加
     - `isDragOver` ref変数を追加してdrag-over状態を管理
     - 自分自身の上ではハイライトしない（同じcardIdとsectionType）
   - **修正2** (DeckCard.vue handleDragLeave):
     - `event.relatedTarget`で子要素への移動を判別
     - 本当に離れた時のみハイライト解除
   - **修正3** (DeckCard.vue CSS):
     - `.drag-over`クラスで青いoutlineと半透明背景を表示
   - ビルド・デプロイ完了（2025-11-18 07:15）

5. **セクション辺付近でのドロップ判定失敗** → ✅ **修正完了**
   - 完全にカードがセクション内にあっても、セクションの辺に近い位置だと移動が判定されない
   - **根本原因**: カードの`handleDragOver`で`event.preventDefault()`を呼んでいなかった
   - **修正**: DeckCard.vue handleDragOverに`event.preventDefault()`を追加
   - これにより、カード上でもドロップが有効になり、セクション辺付近でも正常に判定される
   - ビルド・デプロイ完了（2025-11-18 07:15）

6. **検索入力欄の三点メニューボタン**
   - ボタンを少し上にずらす
   - 少し透過とグレーを入れる

7. **オプションダイアログ機能追加**
   - extra/sideを横に並べるか縦に並べるか選択可能に

8. **ドロップダウンメニューの外側クリック**
   - ドロップダウンメニュー押下後、関係ない画面内の場所がクリックされたら閉じる

#### 完了条件
- [x] セクション背景色とドロップ成功が一致
- [x] 背景枠線による位置ずれなし
- [x] アニメーション中のカードが最前面表示
- [x] 同じセクション内の並び替えが正しく動作
- [x] ボタン押下時（Shuffle/Sort）のアニメーション動作
- [x] 画像のfadeInアニメーション防止（UUID key使用）
- [x] UI改善完了
  - [x] 検索入力欄の三点メニューボタンスタイル改善
  - [x] ドロップダウンメニューの外側クリック対応
  - [x] Extra/Sideデッキの配置方向選択（既に実装済み確認）

---

### ⚠️ 緊急修正: displayOrder/deckInfo設計修正（完了）

#### 概要
displayOrderとdeckInfoの二重管理による設計不備を修正。
「displayOrder操作関数が常にdeckInfoも同時更新する」という原則を徹底。

#### 実装計画
- [x] `insertToDisplayOrder(card, section, targetUuid)`関数を新規作成
- [x] `reorderWithinSection(section, sourceUuid, targetUuid)`関数を新規作成
- [x] `moveCardWithPosition`を修正
- [x] `insertCard`を削除
- [x] DeckSection.vueの直接操作を削除
- [x] ビルド・デプロイ
- [x] CLAUDE.md/ドキュメントの陳腐化情報を調査・修正

---

### 概要
デッキ編集UIを改善し、以下の機能を実装：

1. **オプション設定のテーマ変更**
   - デフォルトテーマをライトテーマに変更（現在darkテーマが実質機能していないため）

2. **デッキメタデータ編集機能**
   - right-areaのheader tabをmetadata tabに変更
   - デッキ名、公開設定などのメタデータを編集可能に

### 実装計画

#### Phase 1: オプション設定のテーマ変更
- [x] デフォルトテーマをライトテーマに設定
- [x] 設定ファイル修正（`src/types/settings.ts`: DEFAULT_APP_SETTINGS.theme = 'light'）
- [x] ビルド・デプロイ

#### Phase 2: メタデータ編集機能の調査と実装
- [x] right-areaのheader tabの調査
- [x] header tab → metadata tab に名前変更（`src/components/RightArea.vue`）
- [x] メタデータ編集UIの設計
  - デッキ名、公開設定、タグなどの編集フォーム
  - `src/components/DeckMetadata.vue`を作成
- [x] メタデータ保存機能の実装
  - APIエンドポイント調査（既存の`saveDeck`を利用）
  - 保存ロジック実装
- [x] ビルド・デプロイ

#### Phase 3: メタデータUIの詳細改善
- [x] デッキ名フィールドを削除（ヘッダーに属するため）
- [x] カテゴリ選択UIを追加（検索・ドロップダウン・チップ表示）
- [x] タグ選択UIを追加（プリセットベース、カテゴリと同様のUI）
- [x] select要素のoption要素にスタイルを明示的に設定
- [x] todo.mdにタグマスターデータ取得タスクを追加
- [x] ビルド・デプロイ

### 完了条件
- [x] デフォルトテーマがライトテーマに設定されている
- [x] メタデータタブが表示され、編集可能
- [x] カテゴリ・タグ選択UIが実装されている
- [x] 全てのドロップダウン要素に明示的なスタイルが適用されている
- [x] ビルド・デプロイ完了

---

## v0.3.9: PNG画像へのデッキ情報埋め込み機能（2025-11-17）

### 概要
デッキ画像（PNG）にデッキ情報（section, cid, ciid, quantity）を埋め込み、
画像からデッキをインポートできる機能を追加する。

### 技術方式
- **PNGメタデータ（tEXtチャンク）方式** を採用
- ブラウザ環境でバイナリ操作を行い、PNGのIENDチャンク前にtEXtチャンクを挿入
- 画像の見た目に影響しない標準的な方法

### 実装計画

#### 1. PNG埋め込み用ユーティリティ (`src/utils/png-metadata.ts`)
- [ ] `embedDeckInfoToPNG(pngBlob: Blob, deckInfo: DeckInfo): Promise<Blob>`
  - PNGバイナリにtEXtチャンクを追加
  - キー: "DeckInfo"
  - 値: JSON.stringify({main: [...], extra: [...], side: [...]})
- [ ] `extractDeckInfoFromPNG(pngBlob: Blob): Promise<DeckInfo | null>`
  - PNGバイナリからtEXtチャンクを抽出
  - JSON.parseでデッキ情報を復元

#### 2. エクスポート機能拡張 (`src/utils/deck-export.ts`)
- [ ] `exportToPNG(deckInfo: DeckInfo, options): Promise<Blob>`
  - createDeckRecipeImage を呼び出して画像生成
  - embedDeckInfoToPNG でメタデータ埋め込み
- [ ] `downloadDeckAsPNG(deckInfo, filename, options)`
  - PNG画像をダウンロード

#### 3. インポート機能拡張 (`src/utils/deck-import.ts`)
- [ ] `importFromPNG(file: File): Promise<ImportResult>`
  - extractDeckInfoFromPNG でメタデータ抽出
  - 抽出失敗時はエラーメッセージ
- [ ] `importDeckFromFile` 修正
  - PNG形式（.png）に対応

#### 4. テスト
- [ ] ユニットテスト作成
- [ ] E2Eテスト（エクスポート→インポート）

### 完了条件
- [x] PNG埋め込みユーティリティ実装
- [x] エクスポート機能でPNG形式に対応
- [x] インポート機能でPNG形式に対応
- [x] テスト作成と実行

### 残タスク
- [x] ExportDialogにPNG形式を追加
- [x] ImportDialogでPNG形式に対応
- [x] ビルド・デプロイ
- [x] バージョン更新とコミット (v0.3.9)

### オプション（後で実装可能）
- [ ] PNG画像プレビュー表示（ImportDialog）
- [ ] PNG画像エクスポートオプション詳細設定（scale, color, QR）
- [ ] ブラウザE2Eテスト（実際のデッキ画像で検証）
