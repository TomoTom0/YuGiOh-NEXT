# TASK-89 調査レポート：デッキ表示画面の画像作成ダイアログスタイル問題

## 調査概要
デッキ表示画面で画像作成ダイアログのスタイルが適用されていない問題を詳しく調査しました。

---

## 1. ImageDialogコンポーネントの使用状況

### 使用パターン
**パターン1: デッキ編集画面（Vue環境）**
- ファイル: `src/components/DeckEditTopBar.vue` (行441-444)
- 方法: 動的import（`showImageDialogWithData`）
- コンテキスト: Vue編集ページ内の機能

**パターン2: デッキ表示画面（通常のDOM環境）**
- ファイル: `src/content/deck-recipe/addImageButton.ts` (行57)
- 方法: 動的import（`showImageDialog`）
- コンテキスト: コンテンツスクリプト内で実行

---

## 2. スタイル定義の分析

### ImageDialog.vueのスタイル
**ファイル**: `src/components/ImageDialog.vue` (行275-511)

```vue
<style scoped>
  /* スタイルが scoped 属性で定義されている */
  .ygo-next-image-popup-overlay { ... }
  .ygo-next-image-popup { ... }
  /* その他のスタイル */
</style>
```

**重要な問題点**:
1. `<style scoped>` により、スタイルは Vue コンポーネントスコープに限定される
2. Teleportでbodyにマウントされるが、スコープは失われない
3. コンポーネント内のクラス名は自動的に属性付与される（例：`.ygo-next-image-popup[data-v-xxxxx]`）

### グローバルスタイルの定義
**ファイル**: `src/content/styles/buttons.scss`
- コンテンツスクリプト（`src/content/index.ts` 行11）で読み込まれる
- `.ygo-next` で nest したボタンスタイルのみ
- ImageDialogのスタイルは定義されていない

**ファイル**: `src/styles/themes.scss`, `src/styles/common.scss`
- テーマCSS変数の定義
- 編集ページで読み込まれるが、デッキ表示ページでは読み込まれない

---

## 3. スタイルロード順序の違い

### デッキ編集画面（Vue環境）
1. `src/content/index.ts` 読み込み
   - `src/content/styles/buttons.scss` 読み込み
2. `src/content/edit-ui/index.ts` 動的読み込み
   - Vue アプリケーション初期化
3. `src/content/edit-ui/DeckEditLayout.vue` マウント
   - 関連コンポーネント読み込み
4. ImageDialog.vue 動的読み込み（showImageDialogWithData経由）
   - **scoped スタイルは Vue コンポーネントスコープで機能**

### デッキ表示画面（通常のDOM環境）
1. `src/content/index.ts` 読み込み
   - `src/content/styles/buttons.scss` のみ読み込み
   - `src/styles/themes.scss`, `src/styles/common.scss` は読み込まれない
2. `src/content/deck-recipe/imageDialog.ts` 動的読み込み
3. `src/components/ImageDialog.vue` が createApp でマウント
   - **scoped スタイルは有効だが、グローバルスタイルが不足している**

---

## 4. 問題の根本原因

### Scoped スタイルの特性
- Vue の scoped スタイルは `[data-v-xxxxx]` 属性を使用して、コンポーネント内要素に限定される
- ImageDialog.vue では `<style scoped>` が使用されているため、スコープが適用される

### 問題発生メカニズム
1. **デッキ表示画面（問題あり）**:
   - グローバルスタイルロード不十分
   - CSS 変数（`--bg-primary`, `--text-primary` など）が定義されていない
   - Teleportでbodyにマウントされるが、scoped スタイルでセレクタが限定されている
   - 加えて、グローバルスタイル（`.dialog-btn`, `.toggle-btn` 等の基本スタイル）も不足している

2. **デッキ編集画面（機能している）**:
   - Vue 環境で完全に初期化される
   - 必要なグローバルスタイルが読み込まれている
   - スコープ付きスタイルが正しく機能する

### 確認された不適用スタイル
ImageDialog.vue で定義されているが、デッキ表示画面では適用されない：

```css
/* 以下が適用されない例 */
.dialog-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: #e0e0e0;
  color: #555;
  /* ... その他のスタイル */
}

.toggle-btn {
  padding: 8px 12px;
  border: 2px solid rgba(200, 200, 200, 0.5);
  border-radius: 6px;
  /* ... その他のスタイル */
}
```

---

## 5. デッキ表示画面とデッキ編集画面の差異

### 環境の違い
| 項目 | デッキ表示画面 | デッキ編集画面 |
|------|---------------|---------------|
| スタイルロード | buttons.scss のみ | buttons.scss + Vue 環境スタイル |
| Vue 初期化 | showImageDialogWithData内のみ | DeckEditLayout.vueで全体初期化 |
| スコープ適用 | 有効（data-v属性付与） | 有効だが、外部スタイル有 |
| CSS 変数 | 未定義 | themes.scss で定義 |
| グローバルスタイル | 不足 | 完全に読み込まれている |

### スタイル不足の詳細
**グローバルスタイル不足**:
1. CSS 変数（`--bg-primary`, `--text-primary` 等）
2. `common.scss` のグローバルクラス（`.btn`, `.dialog-*` 等）
3. テーマ定義（ライト/ダークモード）

---

## 6. 根本的な構造的問題

### 設計上の問題点
1. **ImageDialog.vue が scoped スタイルのみを使用**
   - グローバル環境での使用を想定していない
   - Vue コンポーネント前提の実装

2. **スタイルロード戦略の不一貫**
   - デッキ表示画面では必要なスタイルが読み込まれない
   - ボタン系スタイルのみで、ダイアログ系スタイルなし

3. **Teleport使用による予期しない動作**
   - `<Teleport to="body">` により、ダイアログが#bgの外に配置される
   - スコープスタイルがDOM位置に関係なく適用される仕様を活用していない

---

## まとめ

### 主な原因
1. **ImageDialog.vue は scoped スタイルを使用している**
2. **デッキ表示画面では、グローバルスタイル（common.scss, themes.scss）が読み込まれていない**
3. **CSS 変数が定義されていないため、ダイアログ要素がデフォルトスタイルで表示される**

### 影響を受ける要素
- ボタン（Close, Download）
- トグルボタン（Include QR, Include Side）
- 背景色、テキスト色
- テキストサイズ、フォント
- ボーダーとシャドウ

### 解決方法（次ステップ）
1. ImageDialog.vue のスタイルをグローバルスタイルに移動
2. または、デッキ表示画面でも themes.scss と common.scss を読み込む
3. または、スコープスタイルをグローバルスタイルに変更

