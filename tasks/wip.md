# 作業中のタスク

## デッキ編集画面の無限ループ問題調査 (2025-11-20)

**問題発生**:
- デッキ編集画面で無限ループが発生
- build-and-deploy後も問題が継続
- 正常なcommitに戻ると問題解消

**正常動作commit**: `af0cbac` (origin/dev)
- 現在のブランチ: `feature/stable-base` (commit: 2b9e084)
- これは`af0cbac`から10個のcommitが追加されたもの

**無限ループが発生したcommit範囲**:
- devブランチ (commit: a37897d)
- backup/infinite-loop-fix-20251120-094954ブランチ

**commit履歴**:
1. `af0cbac` ✅ 正常動作 (origin/dev)
2. `ba33ed0` - カテゴリ/タグ自動分類機能の実装
3. `86c0a6a` - CategoryDialog/TagDialog実装中（ビルドエラーあり）
4. `644f7ae` - カテゴリにグループ情報を事前計算してJSON保存
5. `7b21f61` - UI/UX改善（ダイアログとチップ）
6. `3715a2b` - モンスタータイプのチップ色とペンデュラムのグラデーション調整
7. `85fe3b4` - wip.md更新
8. `3a9ff4c` - ダイアログヘッダーとペンデュラムのグラデーション修正
9. `d3adb32` - filter/clearボタンを水平配置維持
10. `0ad4f1a` - ペンデュラムのグラデーションとチップ高さ一貫性
11. `2b9e084` ✅ 正常動作 (feature/stable-base, HEAD)

**devブランチの追加commit（無限ループ発生）**:
- `f735068` - CategoryDialogコンポーネント追加
- `87205c0` - TagDialogコンポーネント追加  
- `3ba43fb` - DeckMetadataにCategoryDialog/TagDialogを統合
- `a37897d` - 無限ループ修正試行（失敗）

**無限ループの原因（推定）**:
- `src/stores/deck-edit.ts`での`watch`による無限ループ
- `DeckMetadata.vue`で`v-model`による双方向バインディングと`watch`の組み合わせ
- URLStateManager.syncUIStateToURL()が繰り返し呼ばれる

**devブランチ(a37897d)での修正試行**:
```typescript
// deck-edit.ts
let isUpdatingFromURL = false;
watch([viewMode, sortOrder, activeTab, cardTab, showDetail], () => {
  if (isUpdatingFromURL) return; // 無限ループ防止
  URLStateManager.syncUIStateToURL({...});
}, { flush: 'post' });
```

しかしこの修正でも無限ループが解消されず。

**現在の正常なブランチとの主な差分**:
- CategoryDialog.vue: 完全に異なる実装
- TagDialog.vue: 完全に異なる実装  
- DeckMetadata.vue: `v-model`の使い方、`watch`の追加
- deck-edit.ts: `isUpdatingFromURL`フラグ追加、`flush: 'post'`追加

**次のステップ**: devブランチの実装内容と仕様を調査・把握

---

## devブランチで実装された機能の仕様調査

devブランチ（無限ループ発生）で追加された新機能の仕様を把握し、再実装のための設計を行う。

### 1. CategoryDialogコンポーネント (f735068)

**目的**: カテゴリ選択UIの改善（既存ドロップダウンを置き換え）

**ファイル構成**:
- `src/components/CategoryDialog.vue` (500行)
- `tests/unit/components/CategoryDialog.test.ts`
- `docs/components/category-dialog.md`
- `docs/components/category-dialog-example.html`

**UI構成**:
- ヘッダー: "Category"タイトル、選択済みチップ（×で削除可）、閉じるボタン
- フィルタタブ（二行表示）:
  - 1行目: `all | ア | カ | サ | タ | ナ`
  - 2行目: `ハ | マ | ヤ | ラ | ワ`
- 音フィルタボタン（丸型、all選択時のみ表示）
- カテゴリリスト: 三列グリッド表示、縦スクロール対応
- フッター: "Clear All"、"Apply"ボタン
- カラー: 青系（`#1976d2`）

**Props/Events**:
- Props: `isVisible`, `categories: CategoryEntry[]`, `modelValue: string[]`
- Events: `update:modelValue`, `close`
- データ構造: `CategoryEntry { value, label, originalIndex, group[] }`

**副次的変更**:
- `src/stores/deck-edit.ts`: エラー表示時間 1秒→0.6秒
- `AGENTS.md`: 大量削除防止ルール追加

---

### 2. TagDialogコンポーネント (87205c0)

**目的**: タグ選択UIの改善（既存ドロップダウンを置き換え）

**ファイル構成**:
- `src/components/TagDialog.vue` (418行)
- `tests/unit/components/TagDialog.test.ts` (16個中15個成功)
- `docs/components/tag-dialog.md`

**UI構成**:
- ヘッダー: "Tag"タイトル、選択済みチップ、閉じるボタン
- フィルタタブ（一行表示）: `all | others | attr | race | type`
  - all: すべて
  - others: その他（マスターデータに存在しないタグ）
  - attr: 属性マスターデータに含まれるタグ（例: 闇属性、光属性）
  - race: 種族マスターデータに含まれるタグ（例: ドラゴン族、戦士族）
  - type: モンスタータイプマスターデータに含まれるタグ（融合、シンクロ、エクシーズ、リンク、ペンデュラム、儀式、通常、効果）
- タグリスト: 三列グリッド表示、縦スクロール対応
- フッター: "Clear All"、"Apply"ボタン
- カラー: 緑系（`#2e7d32`）

**自動分類機能**:
- ラベルに基づいて自動的にgroup判定
- **重要**: 元の実装には仕様誤りがある
  - 誤った実装: `endsWith('族')` や `endsWith('属性')` で判定
  - 問題: 種族以外の単語でも「族」で終われば誤判定される
- **正しい仕様**:
  - race/attr/typeの実際のマスターデータ（表示名リスト）が存在する
  - タグラベルをマスターデータと照合して判定する
  - race: マスターデータの種族リストに含まれているか（例: ドラゴン族、戦士族）
  - attr: マスターデータの属性リストに含まれているか（例: 闇属性、光属性）
  - type: マスターデータのモンスタータイプリストに含まれているか（融合、シンクロ、エクシーズ、リンク、ペンデュラム、儀式、通常、効果）
  - others: 上記マスターデータに存在しないもの

**Props/Events**:
- Props: `isVisible`, `tags: TagEntry[]`, `modelValue: string[]`
- Events: `update:modelValue`, `close`
- データ構造: `TagEntry { value, label, group }`

---

### 3. DeckMetadata統合 (3ba43fb)

**変更内容**:
- DeckMetadata.vueから230行削除（既存ドロップダウンコード）
- CategoryDialog/TagDialogをインポート
- ボタンクリックで専用ダイアログ表示
- v-modelで選択状態を自動同期
- 新規ファイル: `src/types/dialog.ts` (共通型定義)

**問題発生箇所**: この統合時に無限ループ発生
- 推測: v-modelの双方向バインディングでの循環参照
- 推測: watchの無限トリガー

---

**結論**:
- **機能価値**: カテゴリ/タグ選択UIの大幅な改善（フィルタ、自動分類、視覚的改善）
- **実装規模**: 約1,000行の新規コード + テスト + ドキュメント
- **問題**: DeckMetadata統合時の実装バグ（無限ループ）
- **対応方針**: 実装はゼロから作り直す（仕様は参考として活用）

**実装設計完了** (2025-11-20 11:40 - 12:46):
- マスターデータ分析: 54個のタグを4グループに分類
  - attr: 7個（属性）
  - race: 25個（種族）
  - type: 12個（モンスタータイプ）
  - others: 11個（その他）
- カテゴリ50音順グループ分け設計
  - ア、カ、サ、タ、ナ、ハ、マ、ヤ、ラ、ワ の10グループ
  - カタカナ/ひらがなの最初の文字で判定
- 設計ドキュメント: `tmp/wip/tag-classification-design.md`
- 実装方針: 
  - タグ: IDベースの照合（文字列パターンマッチは使わない）
  - カテゴリ: 最初の文字から50音判定
- 無限ループ対策: v-model循環参照の回避、適切なwatchオプション

**カテゴリグループ判定アルゴリズム設計完了** (2025-11-20 13:03):
- 設計ドキュメント: `docs/design/category/grouping-algorithm.md`
- 実装: `tmp/wip/category-grouping-implementation.ts`
- 機能:
  - 50音順グループ自動判定（ア、カ、サ...）
  - 濁点・拗音の正しい扱い
  - 漢字読みの前後探索アルゴリズム
  - デッキ検索画面からの自動取得関数

**コアファイル実装完了** (2025-11-20 14:07):
- ✅ `src/constants/tag-master-data.ts`: タググループ定数・判定関数
- ✅ `src/types/dialog.ts`: CategoryEntry/TagEntry型定義
- ✅ `src/utils/category-grouping.ts`: カテゴリグループ判定ロジック
- ✅ `src/utils/deck-metadata-loader.ts`: ExtendedDeckMetadata対応

**ユニットテスト実装完了** (2025-11-20 14:10):
- ✅ `tests/unit/constants/tag-master-data.test.ts`: 8テスト全パス
- ✅ `tests/unit/utils/category-grouping.test.ts`: 9テスト全パス
- 合計17テスト全合格

**次のステップ**:
1. ✅ マスターデータ分析・設計完了
2. ✅ カテゴリグループ判定アルゴリズム設計・実装完了
3. ✅ コアファイル実装完了
4. ✅ ユニットテスト作成（17テスト全パス）
5. ✅ CategoryDialog/TagDialog実装（無限ループ対策版）
6. ✅ DeckMetadata統合（無限ループ対策版）
7. ✅ build-and-deploy & 動作確認

**UI/UXデザイン改善実装完了** (2025-11-20 19:24):
- ✅ チップ領域の上部マージン調整（metadata tab）
- ✅ Tag/Categoryボタンのチップ風デザイン化
  - Tag: 緑系（#e8f5e9, #66bb6a）
  - Category: オレンジ系（#fff3e0, #ff9800）
- ✅ Deck Styleボタンのチップ風デザイン化（青系 #e3f2fd, #42a5f5）
- ✅ Monster typeタグに特殊カラー適用（DeckMetadata.vue）:
  - 融合: 紫グラデーション（#e1bee7 → #ba68c8）
  - シンクロ: 白グラデーション（#ffffff → #f5f5f5）
  - エクシーズ: 紫グラデーション（同上）
  - リンク: 青グラデーション（#bbdefb → #42a5f5）
  - 儀式: 青グラデーション（同上）
  - ペンデュラム: 縦グラデーション（オレンジ#ffb74d → 青緑#4db6ac、30%位置で切り替え）
- ✅ タブボタン間に境界線追加（1px solid #e0e0e0）
- ✅ ダイアログ上部のチップサイズ縮小（padding: 4px 8px, font-size: 12px）
- ✅ Filter/Clearアイコンボタンのスタイル改善（縦並び、28x28px、シンプルグレー）
- ✅ category-itemのスタイル改善（padding増、border強化、shadow追加）
- ✅ オプションページに検索入力欄位置設定追加（settings.ts, DeckEditSettings.vue）

**色の調整** (2025-11-20 20:51):
- ✅ Monster typeの選択時の色を淡くする（濃すぎる問題を修正）
  - 融合/エクシーズ: 選択時 #f3e5f5 → #e1bee7
  - リンク/儀式: 選択時 #e3f2fd → #bbdefb
- ✅ ペンデュラムのグラデーションを正しく修正
  - 0-30%: オレンジ (#fff3e0)
  - 30-70%: グラデーション（オレンジ → 青緑）
  - 70-100%: 青緑 (#b2dfdb)
  - チップとダイアログ選択肢の両方で統一

**UI修正完了** (2025-11-20 21:30):
1. ダイアログヘッダーのレイアウト:
   - ✅ タイトル（Category/Tag）を左上に配置
   - ✅ バツボタンを右上に配置
   - ✅ ヘッダーを2行構造に変更（1行目: タイトルとバツボタン、2行目: 選択チップ）
   - ✅ 選択チップ行にmin-height設定で高さ変動を防止
2. スタイル改善:
   - ✅ Monster typeの色適用（融合、シンクロ、エクシーズ、リンク、儀式、ペンデュラム）
   - ✅ ペンデュラムのグラデーション修正（30-70%範囲で遷移）
   - ✅ すべてのタグタイプでhover効果追加（others, attr, race, type）
   - ✅ Filter/Clearボタンを横並びに配置

**最終デザイン修正** (2025-11-20 22:00):
- ✅ ペンデュラムのグラデーション完全修正
  - チップ: 0-30%オレンジ (#ffb74d) → 70-100%青緑 (#4db6ac)、中央30-70%で不連続（グラデーション風）
  - 選択肢: 同様の配色で統一
  - hover時とselected時でも正しくグラデーション維持
- ✅ 選択時の色を濃くする（Monster type）
  - 融合/エクシーズ: selected時 #e1bee7 → #ba68c8
  - リンク/儀式: selected時 #bbdefb → #42a5f5  
  - シンクロ: border-width: 2px追加
- ✅ チップ表示行の高さ固定
  - height: 28px固定、overflow-y: autoで複数行対応
  - チップ0個でも1個以上でも高さ変動なし
- ✅ タブタイトル周りの余白調整
  - filter-and-actions padding: 8px → 6px

**未実装**:
- ⏭️ カード検索入力欄のMain Sectionタイトル内配置機能（UI側実装が必要）
  - オプション設定は完了（searchInputPosition: 'default' | 'section-title'）
  - DeckEditLayout/DeckEditTopBarの調査・実装が必要

---

## 完了済みタスク

完了済みタスクの詳細は `done.md` を参照してください。
