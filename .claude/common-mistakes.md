# よくあるミスと対策

このドキュメントは、このプロジェクトで繰り返し発生したバグパターンと、それを防ぐための具体的な対策をまとめたものです。

## 1. DOM更新タイミングの問題（nextTick不足）

### 症状
- ドロップダウンやダイアログの位置が正しく計算されず、画面外にはみ出る
- 要素のサイズや位置を取得すると`0`や古い値が返される

### 悪い例
```typescript
// ❌ DOM更新前に位置を計算
isDropdownOpen.value = true;
const rect = dropdownEl.value!.getBoundingClientRect(); // まだ表示されていない！
```

### 良い例
```typescript
// ✅ nextTickでDOM更新を待つ
isDropdownOpen.value = true;
await nextTick();
const rect = dropdownEl.value!.getBoundingClientRect(); // 正しく取得できる
```

### 対策
- 状態変更後に DOM 要素のサイズ・位置を取得する場合は**必ず `nextTick()` を待つ**
- `v-if` / `v-show` で表示制御している要素は特に注意

---

## 2. ビューポートオーバーフロー（位置計算の不備）

### 症状
- ドロップダウンが画面右端・下端からはみ出る
- スクロールバーが表示されてUIが崩れる

### 悪い例
```typescript
// ❌ ビューポートチェックなし
dropdown.style.left = `${buttonRect.left}px`;
dropdown.style.top = `${buttonRect.bottom}px`;
```

### 良い例
```typescript
// ✅ ビューポートをチェックして位置を調整
const viewportWidth = window.innerWidth;
const viewportHeight = window.innerHeight;

let left = buttonRect.left;
let top = buttonRect.bottom;

if (left + dropdownWidth > viewportWidth) {
  left = viewportWidth - dropdownWidth - 16; // 右にはみ出る場合は左に寄せる
}

if (top + dropdownHeight > viewportHeight) {
  top = buttonRect.top - dropdownHeight; // 下にはみ出る場合は上に表示
}

dropdown.style.left = `${left}px`;
dropdown.style.top = `${top}px`;
```

### 対策
- **すべてのドロップダウン/ダイアログで境界チェックを実装**
- `useDropdown()` composable を作成して共通化（推奨）
- E2Eテストで画面端のケースをカバー

---

## 3. スタイル重複・競合

### 症状
- 同じスタイル定義が複数の`<style>`ブロックに存在
- 意図しないスタイルが適用される
- CSSの優先順位が不明瞭

### 悪い例
```vue
<!-- ❌ 複数のstyleブロック -->
<style scoped>
.dropdown { background: white; }
</style>

<style scoped>
.dropdown { padding: 8px; } <!-- 重複！ -->
</style>
```

### 良い例
```vue
<!-- ✅ 1つのstyleブロックにまとめる -->
<style scoped>
.dropdown {
  background: white;
  padding: 8px;
}
</style>
```

### 対策
- **コンポーネントごとに `<style>` ブロックは1つまで**
- 共通スタイルは `src/styles/` に分離
- Stylelint導入で自動チェック（検討中）

---

## 4. UUID/key属性の不備

### 症状
- 同じカードが複数あると、間違ったカードが操作される
- Vue の警告「Duplicate keys detected」が出る
- アニメーションが意図しない要素に適用される

### 悪い例
```vue
<!-- ❌ ciidをkeyにすると重複する -->
<div v-for="card in cards" :key="card.ciid">
```

```typescript
// ❌ 衝突しやすいUUID生成
const uuid = `${Date.now()}-${Math.random()}`;
```

### 良い例
```vue
<!-- ✅ 一意なUUIDをkeyにする -->
<div v-for="card in cards" :key="card.uuid">
```

```typescript
// ✅ crypto.randomUUID()を使用
const uuid = crypto.randomUUID();
```

### 対策
- **すべてのリストアイテムに一意な UUID を付与**
- `crypto.randomUUID()` を使用（`Date.now()` + `Math.random()` は禁止）
- props で `uuid: { type: String, required: true }` を強制

---

## 5. 型安全性の欠如（`any` の乱用）

### 症状
- ランタイムエラー「Cannot read property 'xxx' of undefined」
- TypeScriptの型チェックが機能しない
- リファクタリング時に壊れやすい

### 悪い例
```typescript
// ❌ anyで型チェックを回避
const card: any = getCard();
console.log(card.name); // card が undefined でもエラーにならない
```

```typescript
// ❌ 型アサーションの乱用
const element = document.querySelector('.dropdown') as HTMLElement;
element.style.display = 'block'; // element が null の可能性
```

### 良い例
```typescript
// ✅ 適切な型定義
const card: Card | undefined = getCard();
if (card) {
  console.log(card.name);
}
```

```typescript
// ✅ nullチェック + optional chaining
const element = document.querySelector('.dropdown');
if (element instanceof HTMLElement) {
  element.style.display = 'block';
}

// または
element?.setAttribute('style', 'display: block');
```

### 対策
- **`any` の使用を禁止**（ESLint: `@typescript-eslint/no-explicit-any: error`）
- Optional chaining (`?.`) と Nullish coalescing (`??`) を活用
- 型ガードを適切に使用

---

## 6. グローバル定数への直接参照

### 症状
- 「ReferenceError: MONSTER_TYPE_MAP is not defined」
- コンポーネント初期化時にエラー

### 悪い例
```vue
<script setup lang="ts">
// ❌ setup外でグローバル定数を参照
const typeMap = MONSTER_TYPE_MAP; // 初期化タイミングでエラー
</script>
```

### 良い例
```vue
<script setup lang="ts">
import { MONSTER_TYPE_MAP } from '@/constants/card-types';

// ✅ computedまたはmethods内で参照
const getTypeName = (type: string) => {
  return MONSTER_TYPE_MAP[type] || type;
};
</script>
```

### 対策
- **定数はすべて import して使用**
- setup の外で定数を直接参照しない
- computed / methods 内で使用する

---

## 7. エラーハンドリングの不備

### 症状
- ユーザーにエラーが伝わらない
- コンソールにエラーログが大量に出る
- 同じエラー処理が複数箇所に重複

### 悪い例
```typescript
// ❌ エラーを握りつぶす
try {
  await saveData();
} catch (e) {
  console.error(e); // ユーザーには何も表示されない
}
```

```typescript
// ❌ エラー処理が重複
// 11箇所で同じコードが存在していた
if (!result.success) {
  console.error('Failed to move card:', result.error);
}
```

### 良い例
```typescript
// ✅ ユーザーにフィードバック
try {
  await saveData();
} catch (e) {
  console.error('Save failed:', e);
  alert('保存に失敗しました'); // またはtoast通知
}
```

```typescript
// ✅ エラー処理を共通化
const handleMoveResult = (result: MoveResult) => {
  if (!result.success) {
    console.error('Failed to move card:', result.error);
    // 共通のエラー表示処理
  }
};
```

### 対策
- **エラーは必ずユーザーに通知**（alert / toast / banner）
- 共通エラーハンドラーを作成して重複を避ける
- エラーログには十分なコンテキストを含める

---

## 8. ドラッグ&ドロップの`preventDefault()`タイミング

### 症状
- ドロップが効かない箇所がある
- 意図しない場所でドロップできてしまう

### 悪い例
```typescript
// ❌ 常にpreventDefaultを呼ぶ
const handleDragOver = (event: DragEvent) => {
  event.preventDefault(); // 移動不可でもドロップ可能になる
};
```

### 良い例
```typescript
// ✅ 移動可能な場合のみpreventDefaultを呼ぶ
const handleDragOver = (event: DragEvent) => {
  if (deckStore.canMoveCard(draggedCard, targetSection)) {
    event.preventDefault(); // ドロップ可能にする
  }
  // 移動不可の場合はpreventDefaultを呼ばない → ドロップ無効
};
```

### 対策
- **`event.preventDefault()` は条件付きで呼ぶ**
- `canMoveCard()` などのバリデーション関数を活用
- ドロップ可能かどうかを視覚的に表示

---

## 9. FLIPアニメーションとDOM更新の同期

### 症状
- アニメーション開始前にカードが最終位置に表示される
- アニメーションがカクつく

### 悪い例
```typescript
// ❌ requestAnimationFrameを2重にネスト
updateState();
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    startAnimation(); // 2フレーム遅延で一瞬カードが見える
  });
});
```

### 良い例
```typescript
// ✅ 1フレーム待機で十分
updateState();
requestAnimationFrame(() => {
  startAnimation(); // DOM更新後すぐに開始
});
```

### 対策
- `requestAnimationFrame` の多重ネストは避ける
- FLIPアニメーションは composable に分離（推奨）
- アニメーション開始前に要素を非表示にする（`opacity: 0`）

---

## 10. テストカバレッジ不足

### 症状
- リファクタリング後に機能が壊れる
- バグ修正が別のバグを生む
- レビューで動作確認が必要になる

### 対策
- **重要な機能には必ずユニットテストを追加**
  - パーサ/フォーマッタ（`deck-import.ts`, `deck-export.ts`）
  - ストア（`deck-edit.ts`, `settings.ts`）
  - ユーティリティ（`url-state.ts`, `png-metadata.ts`）
- **E2Eテストで主要フローをカバー**
  - デッキ編集 → エクスポート → インポート
  - ドラッグ&ドロップ操作
  - メタデータ編集
- テストは「動作確認の自動化」として位置づける

---

## まとめ: 開発前のチェックリスト

新機能実装・バグ修正時に以下を確認：

- [ ] DOM更新後に要素を参照する場合は `nextTick()` を使用
- [ ] ドロップダウン/ダイアログは画面境界をチェック
- [ ] `<style>` ブロックは1コンポーネント1つまで
- [ ] リストアイテムには一意な UUID を付与（`crypto.randomUUID()`）
- [ ] `any` 型を使用しない、型ガードを適切に使用
- [ ] グローバル定数は import して使用
- [ ] エラーはユーザーに通知、共通ハンドラーで処理
- [ ] `event.preventDefault()` は条件付きで呼ぶ
- [ ] アニメーションは composable に分離
- [ ] ユニットテスト / E2Eテストを追加

---

## 11. GitHub PRレビューコメントへの返信

### 症状
- 同じ内容が複数箇所に投稿される
- PRのメインスレッドが不要なコメントで埋まる

### 悪い例
```bash
# ❌ スレッドに返信した後、さらにメインスレッドにも投稿
gh-reply draft send 18  # スレッドに返信
gh pr comment 18 --body "..."  # メインスレッドにも重複投稿
```

### 良い例
```bash
# ✅ スレッドへの返信のみ（メインスレッドへの追加投稿は不要）
gh-reply draft send 18
```

### 対策
- **レビューコメントへの返信はスレッドへの直接返信のみ**
- メインスレッドに追加で返信する必要はない
- gh-reply で送信したらそれで完了

---

**このドキュメントは Git 履歴分析に基づいて作成されています。**
**詳細**: `tmp/reports/git-history-analysis.md`
