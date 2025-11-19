# Accessibility Review Report

**対象**: `src/components/DeckMetadata.vue`（主に）、`ExportDialog.vue`, `ImportDialog.vue`, `OptionsDialog.vue` の確認を推奨

**作成日時**: 2025-11-18
**作成者**: automated-reviewer

## 概要

DeckMetadata.vue を中心に軽いアクセシビリティ監査を行った。主に以下の領域で改善余地があると判断した。

- キーボード操作（タブ順、フォーカス移動、エスケープでの閉じる等）
- ARIA / セマンティック要素の不足（ダイアログ、トグル、メニュー）
- スクリーンリーダー向けの読み上げ改善（ラベル、aria-live 等）
- カラーコントラストと視覚的フォーカス指示の明示化

以下、検出した問題点と優先度付き修正案、及び具体的なコード例を示す。

## 主要な発見と推奨（優先度: 高）

1) ダイアログ（カテゴリ/タグ選択）にフォーカストラップがない

- 問題点: `showCategoryDropdown` 等で表示するダイアログは DOM 内で focus を奪わないため、キーボードフォーカスがダイアログ外へ移動してしまい、エスケープで閉じる等のキーボード操作が未整備。
- 影響: キーボードのみで操作する利用者がダイアログから抜けられない、または意図しない場所へ移動する。
- 対策: 表示時に最初のフォーカス可能要素へフォーカスを移動し、Tab をループさせる（フォーカストラッピング）。`Escape` キーで閉じるハンドラを追加。

コード例（概念）:

- ダイアログ表示時に `onMounted` 相当で以下を実行:
  - 1) ダイアログ内の最初と最後の focusable 要素を検出
  - 2) `keydown` イベントで Tab/Shift+Tab を監視してループさせる
  - 3) `keydown` で `Escape` を検出したらダイアログを閉じる

例（簡略）:

```js
function trapFocus(dialogEl, onClose) {
  const focusable = dialogEl.querySelectorAll('a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  function keydown(e) {
    if (e.key === 'Escape') return onClose();
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  dialogEl.addEventListener('keydown', keydown);
  first.focus();
  return () => dialogEl.removeEventListener('keydown', keydown);
}
```

2) ダイアログとトグルに適切な ARIA 属性が不足

- 問題点: ダイアログ要素に `role="dialog"` や `aria-modal="true"`、ラベルとなる `aria-labelledby`/`aria-label` がない。公開トグルも input が hidden 表示のためラベルの紐付けが不十分。
- 影響: スクリーンリーダー利用者がダイアログの開始と終了、及び要素の意味を把握しづらい。
- 対策: ダイアログ container に `role="dialog" aria-modal="true" aria-labelledby="..."` を付与。トグルは `input` と `label` の紐付けを維持しつつ、`aria-pressed` や `role="switch"` を追加検討。

例:

```html
<div role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" class="category-dialog">
  <h2 id="category-dialog-title" class="visually-hidden">カテゴリ選択</h2>
  ...
</div>
```

3) キーボードフォーカスが見えにくい / カラーコントラスト不足

- 問題点: カスタムボタンやチップのホバーはあるがフォーカス時の視覚指示が一貫していない。選択済みチップの背景がグラデーションでコントラストが下がる恐れがある。
- 影響: キーボード利用者がどこにフォーカスがあるか認識しづらい。低視力ユーザにとって判別困難。
- 対策: `:focus` スタイルを明示的に追加し、最低コントラスト比を満たす配色（WCAG AA: 4.5:1 テキスト、小さいテキストは 7:1 を推奨）にする。選択済みのチップは境界線/明確な色で判別する。

CSS 例:

```css
.action-button:focus, .deck-type-button:focus {
  outline: 3px solid #ffbf47; /* 高コントラストのフォーカス輪郭 */
  outline-offset: 2px;
}
```

## 中等度の発見（優先度: 中）

4) 画像（SVG）に `aria-hidden` や `role` の明示がない

- 問題点: 装飾用 SVG はスクリーンリーダーへ不要な情報を伝える可能性あり。
- 対策: 装飾SVG に `aria-hidden="true" focusable="false"` を付与。情報を伝える必要がある場合は `title` と `aria-labelledby` を用いる。

5) テキストエリアや検索入力に明示的なラベルが抜けている箇所がある

- 問題点: 例えばカテゴリ検索 `input` にラベル要素がなく placeholder だけで提供されている。
- 対策: 隠しの視覚ラベル（`.visually-hidden`）を用意して `label for` を追加。placeholder は補助的に利用する。

## 低優先度（優先度: 低）

6) 動的更新（aria-live）: メタデータ更新時にフィードバックがない

- 対策: 操作後に画面上部へ通知する仕組みがある場合は `role="status" aria-live="polite"` を付与して非表示でも読み上げさせると親切。

## 具体的な修正候補（コードパッチ例）

以下は DeckMetadata.vue に対する最低限の修正案の抜粋例。

1) カテゴリダイアログに role/label および focus trap を追加する例:

```diff
@@
- <div 
-   v-if="showCategoryDropdown" 
-   ref="categoryDropdown"
-   class="category-dialog"
-   @click.stop
- >
+ <div 
+   v-if="showCategoryDropdown" 
+   ref="categoryDropdown"
+   class="category-dialog"
+   role="dialog" aria-modal="true" aria-labelledby="category-dialog-title"
+   @click.stop
+ >
+   <h2 id="category-dialog-title" class="visually-hidden">カテゴリ選択ダイアログ</h2>
```

2) 装飾 SVG を `aria-hidden` にする:

```diff
@@
- <svg v-else-if="localDeckType === '0'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
+ <svg v-else-if="localDeckType === '0'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108" aria-hidden="true" focusable="false">
```

3) 検索 input に隠しラベルを追加:

```diff
@@
- <input
-   v-model="categorySearchQuery"
-   type="text"
-   class="dialog-search-input"
-   placeholder="カテゴリを検索..."
-   @click.stop
- />
+ <label class="visually-hidden" for="category-search-input">カテゴリ検索</label>
+ <input
+   id="category-search-input"
+   v-model="categorySearchQuery"
+   type="text"
+   class="dialog-search-input"
+   placeholder="カテゴリを検索..."
+   @click.stop
+ />
```

（補足）`.visually-hidden` の CSS 例はプロジェクトの共通スタイルに追加する:

```css
.visually-hidden {
  position: absolute !important;
  height: 1px; width: 1px;
  overflow: hidden; clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap; border: 0; padding: 0; margin: -1px;
}
```

## テストと検証の提案

- 手動: キーボードのみで主要な操作（開閉、選択、保存）を実行してフォーカス管理を検証する。
- スクリーンリーダー: NVDA/VoiceOver でダイアログの読み上げ順を確認。
- 自動: aXe-core を用いた E2E/ユニットのアクセシビリティチェックを CI に組み込む。

## 最終推奨アクション（短期ロードマップ）

1. まず `role="dialog"`, `aria-modal`, ラベル、Escape ハンドラを実装する（最重要）
2. ダイアログのフォーカストラップを実装する
3. フォーカス可視化（:focus スタイル）の整備とカラーパレットの見直し
4. 装飾的な SVG に `aria-hidden` を追加
5. placeholder だけの入力へラベルを追加
6. aXe を CI に組み込む（中期）

---

このレポートは `DeckMetadata.vue` の初期スキャンに基づくもので、同様のパターンが `ExportDialog.vue`, `ImportDialog.vue`, `OptionsDialog.vue` にも存在する可能性が高い。該当コンポーネントへ上記修正パターンを横展開することを推奨する。

