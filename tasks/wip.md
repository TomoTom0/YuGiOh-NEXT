# 作業中のタスク

## デッキ編集ページ (#/ytomo/edit) の実装

### 現在の状況
- ✅ プロトタイプから本実装へ移行完了
- ✅ 基本的なレイアウト構築完了
- ✅ レスポンシブデザイン実装完了
- ✅ テーマカラー（青緑→赤紫グラデーション）適用完了
- ⏳ 機能拡張とバグ修正中

### 完了した項目
1. ✅ ページルーティング (#/ytomo/edit)
2. ✅ デッキ編集ストア (deckEditStore) 作成
3. ✅ 基本コンポーネント構成
   - TopBar (DNO入力、デッキ名、Load/Saveボタン)
   - DeckAreas (Main/Extra/Side/Trashセクション)
   - RightArea (Deck/Search/Cardタブ - レスポンシブ対応)
4. ✅ Load/Save機能の基本実装
5. ✅ カード検索機能の基本実装
6. ✅ カード画像URL生成（共通関数使用）
7. ✅ リスト/グリッド表示切り替え
8. ✅ 詳細表示ON/OFF切り替え
9. ✅ リンクマーカー表示の修正（2025-11-11）
   - ビット位置マッピング修正（ビット0=位置1(左下)）
   - すべてのマーカーを直角二等辺三角形に統一（clip-path使用）
   - 非アクティブマーカーを薄いグレー(#ccc)に変更
   - マーカーの向きを正しく修正（中心から外向き）
   - マーカー間隔を密接に配置（24px×24px）
   - マーカーボックスのボーダー削除
10. ✅ レスポンシブデザイン実装（2025-11-11）
   - 画面幅768px以下でDeckタブを表示
   - モバイル時はDeckタブ内にデッキエリアを配置
   - right-areaが画面幅100%に拡大
   - 検索入力エリアの右側余白を削除
11. ✅ テーマカラー統一（2025-11-11）
   - CSS変数で青緑→赤紫グラデーションを定義
   - activeタブに統一グラデーション適用
   - card-detail-tabsの幅を親要素に合わせて調整
12. ✅ UI改善（2025-11-12）
   - deck-areasに下部65pxのmargin-bottom追加（検索エリアで隠れない対策）
   - DeckSectionの.drop-zone-endのmin-heightを86px→0に変更（余計な空白削除）
   - 検索結果をCardListコンポーネントに統一
   - .search-contentにoverflow-y: autoとpadding追加（スクロール可能に）
   - CardList.vueの.card-textにテキストはみ出し防止スタイル追加（4行省略表示）
13. ✅ CardListコンポーネント統一とスタイル整理（2025-11-13）
   - CardList.vueから height: 100% を削除（内容に合わせた高さに）
   - CardList.vueに width: 100%, box-sizing, min-height: 90px を追加
   - RightArea.vueから重複した検索結果用スタイルを削除
   - CardDetail.vueから重複したカードリスト用スタイルを削除
   - search tabとrelated tabでCardListのスタイルを統一
   - CardQAコンポーネントを新規作成（Q&Aタブの分離準備）
14. ✅ コンポーネント分離完了（2025-11-13）
   - CardQAコンポーネント作成（Q&Aタブ専用）
   - CardProductsコンポーネント作成（Productsタブ専用）
   - CardDetail.vueからQA/Products関連のロジックとスタイルを分離
   - 各コンポーネントは独立して動作可能に
15. ✅ UI改善（2025-11-13）
   - Grid表示時のカード画像サイズ拡大（36px→60px）
   - Search areaで四行省略表示を有効化（一時対応）
   - CardQA.vueのレイアウト改善
     - 日付と展開ボタンを同じ行に配置（展開:左、日付:右）
     - ボタンを四角形に変更（border-radius: 4px）
     - ボタンサイズとアイコンを拡大（展開:24px/14px、縮小:32px/16px）
   - CardProducts.vueのボタンスタイルも統一
   - main-contentのpadding/gap削除
16. ✅ 型リファクタリング（2025-11-13）
   - imageIdをciidに統一、ciid/imgs必須化
   - getCardImageUrl関数をcard.tsに追加（型と密結合）
   - buildCardImageUrlは非推奨化、getCardImageUrlに委譲
   - 全箇所でgetCardImageUrlに統一

### PR#2レビュー対応（2025-11-13）
#### High Priority
- ✅ card-search.ts: request_localeのハードコード修正
  - getCardDetailに言語引数を追加（省略時は自動検出）
  - detectLanguageユーティリティの活用
  - deck-operations.tsの全API呼び出しも対応

#### Medium Priority
- ✅ .gitignoreに.drawio.dtmpを追加
- ✅ deck-operations.ts: imgsパラメータ修正（ciid使用）
- ✅ console.log削除（DeckCard.vue, CardList.vue）
- ✅ deck-operations.ts: コメントアウトコード削除
- ✅ CardList.vue: scrollToTopをemitベースに変更
- [ ] RightArea.vue: 無限スクロール実装改善（最適化タスク）
- ✅ deck-edit.ts: sortDisplayOrderForOfficialにコメント追加

**全てのレビュー対応完了！**（無限スクロール改善は最適化タスクとしてpending.mdへ）

### 現在対応中のバグ・課題
1. ✅ UI改善と翻訳
   - ✅ infoタブのカード画像サイズ調整（90px）
   - ✅ 属性・種族・effectType・monsterTypeの日本語表示
   - ✅ Q&A展開/折りたたみ機能
   - ✅ Q&A展開/折りたたみのアニメーション
   - ✅ カード変更時のQA展開状態リセット
   - ✅ QA折りたたみ時の自動スクロール調整（スムーズスクロール）
   - ✅ レアリティバッジの色表示
   - ✅ relatedタブのsort/list/grid/順次読み込み
   - ✅ ボタン色分け（info:オレンジ、link:水色、M/E:青、S:紫）
   - ✅ タブ切り替えアニメーション（fadeIn 0.2s）
   - ✅ stat-box-typeの横スクロール問題修正（95%幅）
   - ✅ Productsタブの展開機能（パック内カード一覧表示）
     - ✅ パック名の左下に展開ボタン配置
     - ✅ `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&pid=パックID&rp=99999`
     - ✅ 検索結果をパースしてlist/grid切り替え可能に表示
   - ✅ CardListコンポーネントに上スクロールボタン追加
     - ✅ related/productsの展開ブロック最上部へのスクロール機能
     - ✅ .card-tab-contentを正しくスクロール対象に設定
   - ✅ QA/Products縮小時の自動上スクロール機能
     - ✅ 縮小で減った高さ分だけ上にスクロール調整
     - ✅ .card-tab-contentを正しいスクロールコンテナとして使用
   - ✅ スクロールバーの常時表示（レイアウトずれ防止）
     - ✅ .card-tab-contentに overflow-y: scroll を設定
     - ✅ width: 100% と box-sizing: border-box を追加
     - ✅ .card-list-results は overflow-y: visible（親がスクロール担当）
     - ✅ pack-details のオーバーフロー防止（text-overflow: ellipsis）
     - ✅ pack-details のグリッド列幅調整（60px 100px 1fr）

### 残課題
- ✅ CardQAとCardProductsコンポーネントの分離完成
- ⏭️ Load時のデッキ情報反映確認
- ⏭️ Save機能のダイアログ実装
- ⏭️ カードドラッグ＆ドロップ機能
- ⏭️ 全体的な動作確認とテスト
- ⏭️ docs/usage/index.mdの更新（デッキ編集ページの使い方を追加）

---

## Phase 3: 他言語対応（i18n）

### 現在の作業: 一時中断（prototype作業を優先）

**ブランチ構成**:
- ✅ main → dev にマージ完了
- ✅ feature/i18n-support ブランチ作成

**調査タスク**:
1. ✅ 言語ごとのテキスト差異を調査（Phase 1完了）
   - ✅ 括弧: 日本語【】→ 英語[]
   - ✅ スラッシュ: 両言語とも全角「／」
   - ✅ 種族: ドラゴン族→Dragon、機械族→Machine
   - ✅ タイプ: 通常→Normal、効果→Effect
2. ⏸️ 調査結果をドキュメント化（一時中断）
   - ✅ 記号の違いを確認
   - ⏸️ 検索フォームから全マッピングを取得
3. ⏭️ 他言語対応の実装方針決定
   - ⏭️ 言語検出方法の確定
   - ⏭️ マッピングテーブル設計
4. ⏭️ パーサーの多言語対応実装
   - ⏭️ 括弧除去の正規表現修正
   - ⏭️ 多言語マッピングテーブル実装

**Phase 2完了内容**:
- ✅ デッキ画像作成機能（v0.1.0）
- ✅ シャッフル・ソート・固定機能（v0.2.0）
- ✅ オプションページによる機能制御
- ✅ 画像ベースの効果タイプ判定

**Phase 2のPR状況**:
- ✅ Geminiレビューコメントに対応（4件）
- ✅ 各コメントに個別に返信
- ✅ 設定制御機能の追加
- ✅ 効果タイプ判定の画像ベース化
- ⏭️ feature/deck-recipe-image のマージ待ち（別途対応予定）

#### 完了済み機能
- [x] デッキ画像作成機能
  - [x] API層実装（Canvas、QRコード）
  - [x] ダイアログUI実装
  - [x] ダウンロード機能実装
  - [x] 処理中アニメーション実装
  - [x] Node.js環境での画像生成対応
  - [ ] オプションページでscale設定（将来的な拡張）

- [x] シャッフル機能
  - [x] デッキ表示ページのDOM構造調査
  - [x] ボタン追加機能の実装
  - [x] シャッフル機能の実装
  - [x] ソート機能の実装
  - [x] カード固定機能の実装
  - [x] QRコード修正（URLパラメータ正規化）

- [x] オプションページ
  - [x] 機能一覧表示（TOC）
  - [x] 機能説明と使い方
  - [x] ON/OFF切り替え
  - [x] content scriptでの設定読み込み

---

## 最近完了したタスク

### 2025-11-09: Phase 1完了
- ✅ CardType型を英語識別子に統一
- ✅ 全パーサー実装完了（カード詳細、FAQ一覧、FAQ詳細）
- ✅ tests/combine/parser/ 全テスト成功
- ✅ デバッグ表示削除・ポップアップUI実装

### 2025-11-07: デッキレシピ画像作成機能の完成（API層）
- ✅ Canvas描画、カードレイアウト
- ✅ QRコード生成（公開デッキ用）
- ✅ カードバック画像
- ✅ 全カラーバリエーション（赤/青、QR有無）

詳細は `tasks/done.md` を参照

---

## ブランチ構成
- `main`: 安定版
- `feature/deck-recipe-image`: デッキレシピ画像機能の実装ブランチ（現在）
