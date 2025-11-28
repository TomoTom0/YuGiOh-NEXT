# カラーテーマ実装調査・レビュー依頼書

**作成日**: 2025-11-27  
**依頼者**: 開発チーム  
**担当者**: TBD  
**優先度**: 中  
**状態**: 調査中

---

## 1. 目的

現在、アプリケーションはライトテーマにのみ対応しているが、ダークテーマとライトテーマの両方に対応するために必要な修正箇所を特定し、実装計画を策定する。

---

## 2. 背景

### 2.1 現状
- CSS変数定義（`src/styles/themes.css`、`src/styles/themes.ts`）は既に両テーマに対応している
- テーマ切り替え機能（`src/stores/settings.ts`）は実装済み
- 設定UI（`src/options/SettingsPanel.vue`）でテーマ選択が可能
- **問題**: 多数のコンポーネントで色がハードコードされており、CSS変数を使用していない

### 2.2 期待される成果
- ライトテーマとダークテーマの両方で適切に表示される
- ユーザーがシステム設定に従うオプション（`theme: 'system'`）も正しく動作する
- すべてのUIコンポーネントがテーマ変更に対応する

---

## 3. 調査済み内容

### 3.1 テーマ定義の確認

**ファイル**: `src/styles/themes.css`
- `:root`（ライトテーマ）の定義: ✅ 完了
- `[data-theme="dark"]`（ダークテーマ）の定義: ✅ 完了
- 定義済みCSS変数:
  - 背景色: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
  - テキスト色: `--text-primary`, `--text-secondary`, `--text-tertiary`
  - ボーダー色: `--border-primary`, `--border-secondary`
  - アクセントカラー: `--theme-gradient`, `--theme-color-start`, `--theme-color-end`
  - 状態色: `--color-success`, `--color-warning`, `--color-error`, `--color-info`
  - カード関連: `--card-bg`, `--card-border`, `--card-hover-bg`
  - ボタン: `--button-bg`, `--button-hover-bg`, `--button-text`
  - 入力欄: `--input-bg`, `--input-border`, `--input-text`

**ファイル**: `src/styles/themes.ts`
- TypeScript型定義: ✅ 完了
- `LIGHT_THEME`定数: ✅ 完了
- `DARK_THEME`定数: ✅ 完了
- `getThemeColors()`関数: ✅ 完了

### 3.2 テーマ切り替え機能の確認

**ファイル**: `src/stores/settings.ts`
- `applyTheme()`関数: ✅ 実装済み（DOMに`data-theme`属性を設定）
- `effectiveTheme` computed: ✅ 実装済み（`system`の場合は`prefers-color-scheme`を検出）
- `watchSystemTheme()`関数: ✅ 実装済み（システムテーマ変更を監視）
- テーマ適用タイミング: `loadSettings()`時とテーマ変更時

### 3.3 ハードコードされた色の調査結果

#### 検出されたファイル（ハードコード色を含む）

**CSSファイル**:
1. `src/popup/popup.css` - ポップアップUI全体
2. `src/content/styles/buttons.css` - コンテンツスクリプトのボタン

**Vueコンポーネント（`<style>`セクション内）**:
1. `src/components/CardInfo.vue` - カード情報表示パネル
2. `src/components/DeckEditTopBar.vue` - デッキ編集トップバー
3. `src/components/DeckMetadata.vue` - デッキメタデータ
4. `src/components/CardProducts.vue` - カード商品情報
5. `src/components/Toast.vue` - トースト通知
6. `src/components/ImportDialog.vue` - インポートダイアログ
7. `src/components/DeckCard.vue` - デッキカード表示
8. `src/components/ConfirmDialog.vue` - 確認ダイアログ
9. `src/components/SearchFilterDialog.vue` - 検索フィルターダイアログ
10. `src/components/RightArea.vue` - 右側エリア
11. `src/components/CategoryDialog.vue` - カテゴリダイアログ
12. `src/components/DeckMetadataHeader.vue` - デッキメタデータヘッダー
13. `src/components/CardDetail.vue` - カード詳細
14. `src/components/DeckMetadataDescription.vue` - デッキメタデータ説明
15. `src/components/TagDialog.vue` - タグダイアログ
16. `src/components/CardList.vue` - カードリスト
17. `src/components/ExportDialog.vue` - エクスポートダイアログ
18. `src/components/DeckSection.vue` - デッキセクション
19. `src/components/OptionsDialog.vue` - オプションダイアログ
20. `src/components/SearchInputBar.vue` - 検索入力バー
21. `src/content/edit-ui/DeckEditLayout.vue` - デッキ編集レイアウト
22. `src/options/SettingsPanel.vue` - 設定パネル

#### 典型的なハードコード例

**CardInfo.vue** (Line 423, 456, 502, 576, など):
```css
background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
border: 1px solid #e0e0e0;
background: #f5f5f5;
border: 1px solid #ddd;
background: linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%);
```

---

## 4. 必要な修正内容（概要）

### 4.1 CSS変数の追加

`src/styles/themes.css`に以下のCSS変数を追加する必要がある可能性:

```css
:root {
  /* RGB値（透明度指定用） */
  --theme-color-start-rgb: 0, 217, 184;
  --theme-color-end-rgb: 184, 79, 201;
  
  /* ダイアログ/モーダル */
  --dialog-overlay-bg: rgba(0, 0, 0, 0.5);
  --dialog-bg: #ffffff;
  --dialog-border: #ddd;
  
  /* スクロールバー */
  --scrollbar-track: #f1f1f1;
  --scrollbar-thumb: #888;
  --scrollbar-thumb-hover: #555;
  
  /* シャドウ */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.16);
}

[data-theme="dark"] {
  --dialog-overlay-bg: rgba(0, 0, 0, 0.7);
  --dialog-bg: #2a2a2a;
  --dialog-border: #444;
  
  --scrollbar-track: #2a2a2a;
  --scrollbar-thumb: #555;
  --scrollbar-thumb-hover: #777;
  
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5);
}
```

### 4.2 Vueコンポーネントの修正

各コンポーネントの`<style>`セクションで以下の置き換えを実施:

| ハードコード色 | 置き換え先CSS変数 |
|---|---|
| `#ffffff` | `var(--bg-primary)` または `var(--card-bg)` |
| `#f5f5f5`, `#f0f0f0` | `var(--bg-secondary)` または `var(--card-hover-bg)` |
| `#e0e0e0` | `var(--bg-tertiary)` |
| `#333`, `#333333` | `var(--text-primary)` |
| `#666`, `#666666` | `var(--text-secondary)` |
| `#999`, `#999999` | `var(--text-tertiary)` |
| `#ddd`, `#e0e0e0` (border) | `var(--border-primary)` |
| `#444`, `#555` (border) | `var(--border-secondary)` |

### 4.3 popup.cssの修正

**ファイル**: `src/popup/popup.css`

現在のローカル変数定義を削除し、グローバルCSS変数を使用するように変更:

```css
/* 削除 */
:root {
  --popup-width: 280px;
  --primary-color: #008cff;
  --background-color: #f0f0f0;
  --text-color: #333;
  /* ... */
}

/* 追加 */
body {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.menu-button {
  background: var(--card-bg);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
}
```

### 4.4 buttons.cssの修正

**ファイル**: `src/content/styles/buttons.css`

グラデーションとハードコード色をCSS変数に置き換え:

```css
/* 現在 */
background: linear-gradient(to bottom, #00CED1, #C71585) !important;
background-color: rgba(0, 206, 209, 0.1);

/* 修正後 */
background: var(--theme-gradient);
background-color: rgba(var(--theme-color-start-rgb), 0.1);
```

---

## 5. 追加調査依頼

### 5.1 初期化処理の確認

**調査対象ファイル**:
- `src/content/edit-ui/index.ts`
- `src/popup/index.ts`（存在する場合）
- `src/options/index.ts`
- `src/background/index.ts`（必要に応じて）

**調査内容**:
1. DOM挿入時に`data-theme`属性が正しく設定されているか？
2. コンテンツスクリプトでテーマ設定を読み込んでいるか？
3. ページロード時のタイミング問題はないか？
4. Shadow DOMを使用している場合、テーマCSSが正しく注入されているか？

### 5.2 コンポーネント別の詳細調査

以下の主要コンポーネントについて、ハードコード色の完全なリストアップが必要:

**優先度: 高**
1. `CardInfo.vue` - 行数が多く、複数の色が使用されている
2. `DeckEditTopBar.vue` - ユーザーが頻繁に使用するUI
3. `RightArea.vue` - メインのレイアウトコンポーネント
4. `DeckEditLayout.vue` - メインのレイアウトコンポーネント

**優先度: 中**
5. ダイアログ系コンポーネント（Import, Export, Confirm, Category, Tag, SearchFilter, Options）
6. `CardList.vue`, `CardDetail.vue`, `DeckSection.vue`

**優先度: 低**
7. `Toast.vue`, `DeckCard.vue`, `SearchInputBar.vue`

### 5.3 既存CSS変数の使用状況確認

**調査内容**:
1. 現在どのコンポーネントがCSS変数（`var(--*)`）を使用しているか？
2. 部分的に使用している場合、その割合は？
3. CSS変数を使用しているが、フォールバック値にハードコード色を指定している箇所は？
   - 例: `var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%))`

### 5.4 アイコン・画像の対応確認

**調査内容**:
1. SVGアイコンで色がハードコードされている箇所は？
2. `fill`, `stroke`属性で色指定がある箇所のリストアップ
3. 画像ファイル（PNG/JPG）でダークテーマに対応できないものは？

### 5.5 外部サイト（db.yugioh-card.com）への影響確認

**調査内容**:
1. コンテンツスクリプト（`src/content/`）が公式サイトに注入するスタイルは？
2. 公式サイトの既存スタイルと競合しないか？
3. 公式サイト自体のテーマと整合性を保つ必要があるか？

### 5.6 パフォーマンス影響の確認

**調査内容**:
1. テーマ切り替え時のリレンダリング範囲は？
2. CSS変数の使用による描画パフォーマンスへの影響は？
3. ページロード時のCSS適用タイミングによるちらつき（FOUC）は発生しないか？

---

## 6. 実装優先順位（提案）

### Phase 1: 基盤整備（高優先度）
1. `themes.css`への不足CSS変数追加
2. `themes.ts`の型定義更新
3. 初期化処理の確認・修正（`data-theme`属性の設定）

### Phase 2: コアコンポーネント対応（高優先度）
1. `CardInfo.vue`
2. `DeckEditTopBar.vue`
3. `RightArea.vue`
4. `DeckEditLayout.vue`
5. `popup.css`

### Phase 3: ダイアログ系コンポーネント対応（中優先度）
1. 各種ダイアログコンポーネント
2. `CardList.vue`, `CardDetail.vue`, `DeckSection.vue`

### Phase 4: 細部調整（低優先度）
1. `buttons.css`
2. その他小規模コンポーネント
3. エッジケースの色調整

### Phase 5: テスト・検証
1. 視覚的回帰テスト（Playwright/VRT）
2. テーマ切り替えの動作確認
3. システム設定連動の確認
4. 各ブラウザでの表示確認

---

## 7. 期待される成果物

1. **調査レポート** (`docs/internal-reviews/reports/theme-implementation-analysis.md`):
   - 追加調査依頼の結果
   - コンポーネント別ハードコード色の完全なリスト
   - 初期化処理の問題点（あれば）
   
2. **実装計画書**:
   - 詳細な作業項目リスト
   - 各項目の工数見積もり
   - リスク評価
   
3. **CSS変数設計書**:
   - 追加するCSS変数の完全なリスト
   - 命名規則の確認
   - ダークテーマでの色の選定基準

---

## 8. 備考

- デフォルトテーマは現在`light`に設定されている（`src/types/settings.ts`）
- `system`オプションは既に実装済み（`prefers-color-scheme`を検出）
- テーマ変更時のアニメーション効果は現在考慮されていない（今後の検討事項）
- アクセシビリティ（WCAG 2.1 AA準拠のコントラスト比）も考慮する必要がある

---

## 9. 参考情報

- **既存ドキュメント**: `docs/design/ui-design.md`（存在する場合）
- **関連Issue**: TBD
- **関連PR**: TBD
- **デザインシステム**: 現在なし（今後検討）

---

**次のステップ**: セクション5の追加調査依頼を実施し、詳細な実装計画を策定する
