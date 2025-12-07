# SearchInputBar スタイル移譲計画

## 概要

SearchInputBar.vue の `<style scoped>` ブロック（約638行）を子コンポーネントに分割し、スタイルのカプセル化を完成させます。

## スタイル移動の詳細

### 1. SuggestionList.vue に移動（約85行）

以下のスタイルを移動：

```scss
// 候補リストドロップダウン（1842-1866行）
.suggestions-dropdown { ... }
  &.dropdown-above { ... }

// 候補アイテム（1868-1903行）
.suggestion-item { ... }
  &:hover { ... }
  &.selected { ... }
  &:first-child { ... }
  &:last-child { ... }

// 候補の値とラベル（1905-1915行）
.suggestion-value { ... }
.suggestion-label { ... }

// コマンドプレフィックス（1917-1929行）
.command-prefix { ... }

// mydeck候補リスト（2126-2128行）
.mydeck-suggestions { ... }
```

**必要な Props 追加:**
- なし（既存のpropsで対応可能）

---

### 2. SearchFilterChips.vue に移動（約145行）

以下のスタイルを移動：

```scss
// フィルターアイコン - 上部チップエリア（1716-1748行）
.filter-icons-top { ... }
  .filter-icon-item { ... }
    &.clickable:hover { ... }

// compactモードでの最大幅制限（1746-1748行）
// ※ 注意: .compact クラスは親から渡す必要がある
.compact .filter-icons-top { ... }

// フィルターチップ - 上部表示用（1786-1810行）
.filter-chip-top { ... }
  &:hover { ... }
  &.not-condition { ... }
    &:hover { ... }
    .not-prefix { ... }

// 予定チップ（1813-1830行）
.filter-chip-preview { ... }
  &.not-condition { ... }
  .not-prefix { ... }

// アニメーション（1832-1839行）
@keyframes pulse { ... }

// クリアボタン（1751-1775行）
.clear-filters-btn-top { ... }
  &:hover { ... }

// フィルターアイコン基本スタイル（1641-1676行）
.filter-icon-item { ... }
  &.clickable { ... }
    &:hover { ... }
    &:active { ... }
```

**必要な Props 追加:**
```typescript
compact: {
  type: Boolean,
  default: false
}
```

**スタイルの調整:**
`.compact .filter-icons-top` を `:deep(.compact) .filter-icons-top` または条件付きクラスバインディングで対応。

---

### 3. SearchModeSelector.vue に移動（約75行）

以下のスタイルを移動：

```scss
// モード選択ボタン（2089-2115行）
.search-mode-btn { ... }
  &:hover { ... }
  .mode-text { ... }

// ドロップダウンオーバーレイ（2117-2124行）
.mode-dropdown-overlay { ... }

// モードドロップダウン（2130-2148行）
.mode-dropdown { ... }
  &.dropdown-above { ... }

// ドロップダウンアニメーション（2150-2172行）
.dropdown-enter-active { ... }
.dropdown-leave-active { ... }
.dropdown-enter-from { ... }
.dropdown-leave-to { ... }
.dropdown-enter-to { ... }
.dropdown-leave-from { ... }

// モードオプション（2174-2192行）
.mode-option { ... }
  &:hover { ... }
  &:first-child { ... }
  &:last-child { ... }
```

**必要な Props 追加:**
- なし（既存のpropsで対応可能）

---

### 4. SearchInputBar.vue に残すスタイル（約333行）

親コンポーネント自身で使用するスタイルのみ残す：

```scss
// メインラッパー（1602-1609行）
.search-input-wrapper { ... }

// フィルターアイコン - 入力バー左側（1612-1620行）
.filter-icons { ... }

// フィルター行（1622-1626行）
.filter-row { ... }

// レスポンシブ対応（1629-1639行）
@media (min-width: 400px) { ... }
@media (min-width: 500px) { ... }

// フィルター「もっと見る」（1678-1691行）
.filter-more { ... }

// 入力コンテナ（1693-1713行）
.input-container { ... }
  &.command-mode { ... }
    &.valid { ... }

// 入力行（1778-1783行）
.input-row { ... }

// 検索入力バー本体（1931-2008行）
.search-input-bar { ... }
  &:hover { ... }
  &:focus-within { ... }
  &.compact { ... }
    &:hover { ... }
    &:focus-within { ... }
    .search-input { ... }
    .menu-btn { ... }
    .search-mode-btn { ... }
    .search-btn { ... }
    .clear-btn { ... }
    .mode-dropdown { ... }

// 検索入力フィールド（2010-2034行）
.search-input { ... }
  &::placeholder { ... }
  &.placeholder-medium::placeholder { ... }
  &.placeholder-small::placeholder { ... }

// 左側ボタングループ（2036-2041行）
.left-buttons { ... }

// メニューボタン（2043-2071行）
.menu-btn { ... }
  &:hover { ... }
  &.active { ... }
  .menu-icon { ... }

// フィルター数バッジ（2073-2087行）
.filter-count-badge { ... }

// 検索ボタン（2194-2215行）
.search-btn { ... }
  &:hover { ... }
  svg { ... }

// クリアボタン（2217-2238行）
.clear-btn { ... }
  &:hover { ... }
  svg { ... }
```

---

## 実装手順

1. **SuggestionList.vue にスタイル移譲**
   - `<style lang="scss" scoped>` ブロックを追加
   - 該当スタイルをコピー
   - SearchInputBar.vue から削除

2. **SearchFilterChips.vue にスタイル移譲**
   - `<style lang="scss" scoped>` ブロックを追加
   - `compact` prop を追加
   - 該当スタイルをコピー（`.compact` セレクタを調整）
   - SearchInputBar.vue から削除

3. **SearchModeSelector.vue にスタイル移譲**
   - `<style lang="scss" scoped>` ブロックを追加
   - 該当スタイルをコピー
   - SearchInputBar.vue から削除

4. **型チェックとビルド**
   - `bun run type-check`
   - `bun run build`

5. **動作確認**
   - デッキ編集ページでの表示確認
   - compactモードでの表示確認
   - フィルター操作の確認
   - コマンド入力の確認

---

## 注意事項

### scoped スタイルの影響

- `<style scoped>` では、子コンポーネントのルート要素にのみスタイルが適用される
- 深い階層の要素にスタイルを適用する場合は `:deep()` を使用

### compact プロパティの伝播

SearchFilterChips.vue に `compact` prop を追加し、親コンポーネントから渡す必要がある：

```vue
<!-- SearchInputBar.vue -->
<SearchFilterChips
  :compact="compact"
  :preview-chip="previewChip"
  ...
/>
```

### 既存の動作に影響しないこと

スタイルの移動は単純なコピー＆ペーストではなく、以下を確認：
- セレクタの優先度が変わらないか
- 親子間でのスタイル継承が壊れないか
- CSS変数（`var(--xxx)`）が正しく参照できるか

---

## 期待される効果

- **SearchInputBar.vue**: 2239行 → 約1900行（約340行削減、15%削減）
- **SuggestionList.vue**: 70行 → 約155行（スタイル追加）
- **SearchFilterChips.vue**: 59行 → 約204行（スタイル追加）
- **SearchModeSelector.vue**: 73行 → 約148行（スタイル追加）

**コンポーネントの独立性向上:**
- 各コンポーネントが自己完結し、単体でのメンテナンスが容易になる
- スタイルの変更時に影響範囲が明確になる
- 新しい開発者がコードを理解しやすくなる
