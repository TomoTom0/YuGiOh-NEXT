# 一人回し機能 技術設計

## 概要

要件定義（`docs/design/solo-practice.md`）に基づく技術設計。

---

## 1. 状態管理

### ストア: `usePracticeStore`（Pinia、独立新規）

`deck-edit.ts` とは完全に独立。現在のデッキ構成をコピーして初期化する。

### データ構造

```typescript
// カードの表示状態
type CardFace = 'up' | 'down'
type CardOrientation = 'vertical' | 'horizontal'

// フィールド上のカード1枚
interface PracticeCard {
  id: string                // crypto.randomUUID()
  cid: string               // カードID
  ciid: string              // 画像バリアントID
  face: CardFace            // 表向き/裏向き
  orientation: CardOrientation  // 縦/横
  stackIndex: number        // 重ね位置（0が一番下）
}

// ゾーンの種類
type ZoneType =
  | 'field'           // フィールド魔法
  | 'monster'         // M1-M5
  | 'spellTrap'       // ST1-ST5
  | 'gy'              // 墓地
  | 'banish'          // 除外
  | 'deck'            // メインデッキ
  | 'extra'           // エクストラデッキ
  | 'hand'            // 手札
  | 'temp'            // 一時置き場
  | 'extraMonster'    // EMZ（P1/P2共通）

// ゾーン（カードの配列で管理）
interface PracticeZone {
  type: ZoneType
  cards: PracticeCard[]
}

// プラクティス全体の状態（フィールド単位）
interface PracticeFieldState {
  zones: Map<ZoneType, PracticeZone>
  revealDeck: boolean        // デッキ内容の一時表示
  playerId: 'p1' | 'p2'
}

// プラクティス全体
interface PracticeState {
  p1: PracticeFieldState
  p2: PracticeFieldState | null  // null = P2未参加
  emz: PracticeCard[][]          // EMZ: 2スロット、P1/P2共通
  hasTemporaryRecipe: boolean     // right-areaからカード追加で発生した一時レシピ
}
```

### ゾーンとカードの対応

| ZoneType | カード配列の意味 | 重ね表示 |
|----------|-----------------|---------|
| `field` | 1枠 | 不可 |
| `monster` | 5枠（M1-M5）それぞれがPracticeCard[] | ずらし重ね |
| `spellTrap` | 5枠（ST1-ST5）それぞれがPracticeCard[] | ずらし重ね |
| `gy` | 1つの配列 | ずらし重ね（上位数枚プレビュー） |
| `banish` | 1つの配列 | ずらし重ね（上位数枚プレビュー） |
| `deck` | 1つの配列（インデックス0がトップ） | ずらさず裏向き |
| `extra` | 1つの配列（インデックス0がトップ） | ずらさず裏向き |
| `hand` | 1つの配列（右端追加） | 横並び |
| `temp` | 1つの配列 | ずらし重ね |
| `extraMonster` | 2スロット（P1/P2共通） | ずらし重ね |

※ monster/spellTrap は各5スロットでそれぞれ独立したPracticeCard[]を持つため、実際は `monster: PracticeCard[][]`（5要素の配列）とする。

### 永続化

- `localStorage`（キー: `ygoNext:practice`）に保存
- リロード時に状態を復元
- デッキ切り替え時はリセット（localStorageも上書き）
- 一時レシピは `ygoNext:practiceTemporaryRecipe` に保存

---

## 2. コンポーネント構成

```
PracticeField.vue              -- フィールド全体（fieldIndex: 0=P1, 1=P2）
  PracticeDragOverlay.vue      -- カスタムドラッグゴースト（Teleport to body、P1フィールドのみ）
  PracticeZoneRow.vue          -- 行（Row1/Row2/Row3）
    PracticeSlot.vue           -- 各スロット（M1等の各枠）
      PracticeCardStack.vue    -- カードの重ね表示
        PracticeCard.vue       -- 個別カード表示
      PracticeSlotControls.vue -- スロット操作ボタン+メニュー
  PracticeHandArea.vue         -- 手札 + 一時置き場
    PracticeCardStack.vue
      PracticeCard.vue

PracticePlayerPanel.vue        -- right-area のプレイヤー情報パネル（P1/P2）
  PracticePlayerInfo.vue       -- 各プレイヤーのサムネイル・名前・ボタン
```

### PracticeCard.vue

- 表向き: カード画像を表示
- 横向き: 90度回転して表示
- 裏向き:
  - `deck` / `extra` ゾーン: 裏面画像のみ表示
  - それ以外のゾーン: カードイラストを下層に表示し、その上に裏面を `opacity: 0.5` で重ねて表示

### PracticeCardStack.vue

- カード配列をずらしながら重ねて表示
- ずらし方向: 右上/左上/右/左
- 重なっている枚数をバッジ表示
- 最大表示は上5枚まで。それ以上はバッジ枚数のみ
- メニューダイアログで全枚確認可能

### PracticeSlotControls.vue

- カード左上にクイック操作ボタン（代表操作）
- メニューボタンでダイアログを開く

### PracticeSlotMenuDialog.vue

- 重なっているカード全体を一覧表示
- 各カードに対する操作（墓地へ、除外へ、手札に戻す等）

### PracticeDragOverlay.vue

HTML5ドラッグのデフォルトゴーストを非表示にし、`<Teleport to="body">` で body 直下に配置したカスタムオーバーレイでカーソル追従表示を行う。

```vue
<Teleport to="body">
  <div v-if="draggingCardId" class="practice-drag-overlay" :style="overlayStyle">
    <!-- 常にカードイラストを表示 -->
    <img :src="draggingImageUrl ?? backImageUrl" class="drag-overlay-img" draggable="false">
    <!-- 裏向き配置予定の場合、裏面を半透明で重ねる -->
    <img
      v-if="draggingFaceDown && draggingImageUrl && draggingImageUrl !== backImageUrl"
      :src="backImageUrl"
      class="drag-overlay-img drag-overlay-facedown"
      draggable="false"
    >
  </div>
</Teleport>
```

- `overlayStyle`: `position: fixed; left: ${x-ox}px; top: ${y-oy}px; pointer-events: none; z-index: 99999`
- `draggingRotated` が true のときは `transform: rotate(90deg); transform-origin: ${ox}px ${oy}px`

### PracticePlayerPanel.vue

right-area 上部に配置するプレイヤー情報パネル。

- P1: デッキサムネイル・デッキ名・hard-reset/reset/open/save ボタン
- P2: 初期は空（open ボタンのみ）、デッキ選択後にサムネイル・名前を表示
- P2 に open でデッキ選択ダイアログを開く（既存のデッキリストダイアログを流用）

---

## 3. ドラッグ状態管理

### usePracticeDragState composable

グローバルシングルトン（モジュールスコープの `ref`）でドラッグ状態を管理。

```typescript
// モジュールスコープ（グローバルシングルトン）
const draggingCardId = ref<string | null>(null)
const draggingRotated = ref(false)      // 回転状態（ドラッグ中のオーバーレイに反映）
const draggingFaceDown = ref(false)     // 裏向き配置予定（ドロップ先hovering時に更新）
const draggingImageUrl = ref<string | null>(null)
const draggingPos = ref({ x: -9999, y: -9999 })  // document.dragover で追跡
const draggingOffset = ref({ x: 0, y: 0 })        // カード内のクリック位置

export function usePracticeDragState() {
  function startDrag(cardId, orientation, imageUrl, offset) { ... }
  function toggleDragRotation() { ... }
  function setDraggingFaceDown(val: boolean) { ... }
  function endDrag() { ... }
  return { draggingCardId, draggingRotated, draggingFaceDown, draggingImageUrl,
           draggingPos, draggingOffset, startDrag, toggleDragRotation, setDraggingFaceDown, endDrag }
}
```

### ドラッグ位置追跡

`startDrag` 時に `document` に `dragover` リスナーを登録し、`draggingPos` を更新する。`endDrag` 時に解除。

```typescript
globalDragoverListener = (e: DragEvent) => {
  draggingPos.value = { x: e.clientX, y: e.clientY }
}
document.addEventListener('dragover', globalDragoverListener)
```

`dragover` の `clientX/Y` は `drop` イベントの `clientX/Y` より信頼性が高いため、ドロップ位置の算出にも `draggingPos` を使用する。

### ドロップ位置の算出

```typescript
function getDropPosition(event: Event): DropPosition {
  const pos = draggingPos.value
  if (!(event.currentTarget instanceof HTMLElement) || pos.x < 0) {
    return { isRight: true, isTop: true }
  }
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    isRight: pos.x >= rect.left + rect.width / 2,
    isTop: pos.y < rect.top + rect.height / 2,
  }
}
```

---

## 4. ドラッグ中の右クリック回転

Chrome では右クリックでドラッグがキャンセルされ、`contextmenu` イベントは `dragend` の直後（約200ms以内）に発火する。

```typescript
// dragstart 時
contextMenuDuringDragListener = (e: Event) => {
  e.preventDefault()
  contextMenuFiredAfterDrag = true
}
document.addEventListener('contextmenu', contextMenuDuringDragListener, { capture: true })

// dragend 時
setTimeout(() => {
  document.removeEventListener('contextmenu', listener, { capture: true })
  if (contextMenuFiredAfterDrag) {
    contextMenuFiredAfterDrag = false
    emit('action', 'toggleOrientation', props.card.id)
  }
}, 200)
```

- `canRotate` が false（GY/除外/デッキ/エクストラデッキ/手札）のゾーンではリスナー登録・回転処理をスキップ
- ドラッグ中でない通常の右クリックは `handleContextMenu` で処理

---

## 5. ドロップクォーター UI

### PracticeSlot.vue

ドラッグホバー中にゾーン内を4分割（または2/3分割）したクォーターオーバーレイを表示。

```typescript
interface QuarterDef {
  key: string
  isRight: boolean
  isTop: boolean
  icon1: string
  icon2?: string
  spanFull?: boolean  // true のとき左右に span して1行で表示
}
```

| ゾーン | クォーター構成 |
|--------|--------------|
| deck | 上段: tl（左下配置＋裏向き）/ tr（右上配置＋裏向き）、下段: b（シャッフル、spanFull）|
| extra | 上段: t（表向き、spanFull）/ 下段: b（裏向き、spanFull）|
| カードなし | 上段: t（表向き、spanFull）/ 下段: b（裏向き、spanFull）|
| カードあり | tl（下挿入＋表向き）/ tr（上挿入＋表向き）/ bl（下挿入＋裏向き）/ br（上挿入＋裏向き）|

- `spanFull` のクォーターは CSS `grid-column: 1 / -1`
- 裏向き配置になるクォーターは `active-facedown` クラスで紫色ハイライト
- `computeWouldBeFaceDown(isTop)`: `deck` ゾーンは常に `true`、それ以外は `!isTop`

### 裏向き配置予定の通知

ホバー中の各クォーターの `computeWouldBeFaceDown` を `setDraggingFaceDown` で `usePracticeDragState` に通知し、`PracticeDragOverlay` の裏面重ね表示をリアルタイム更新する。

---

## 6. ドロップ後のカード挿入位置

デッキ編集画面と同様に、ドロップした位置にカードを挿入し既存カードをずらす。

- `isTop: true` → スタックの上側（インデックス小さい側）に挿入
- `isTop: false` → スタックの下側に挿入
- `isRight: true/false` → モンスター/魔法罠ゾーンで複数スロットある場合の左右判定

---

## 7. 2デッキモード・P2フィールド

### P2フィールドの点対称変換

P2 フィールドは P1 の 180° 点対称。実装方針:

1. `PracticeField.vue` に `fieldIndex: 0 | 1` prop を追加
2. `fieldIndex === 1` の場合、`transform: rotate(180deg)` を適用するか、ゾーン配列のレンダリング順を逆転する
3. カードの `orientation: 'horizontal'` は P2 でも横向きだが、見た目上は反転するため CSS 変換で調整

### EMZ（エクストラモンスターゾーン）の共有

- EMZ は `PracticeState.emz` として P1/P2 両方のフィールドと独立して管理
- practice-area の P1/P2 フィールドの間に1列のゾーン行として配置
- どちらのプレイヤーからもドラッグ&ドロップで操作可能

### スライドインアニメーション

P2 デッキ選択時:
1. P2 フィールドが `transform: translateY(-100%)` から `translateY(0)` へ CSS transition
2. P1 フィールドが下方向へスライド（コンテナが広がる）
3. Vue の `<Transition>` または `<TransitionGroup>` を使用

### P1/P2 の practice-area 構成

```
practice-area
  [P2 Field]  ← v-if="hasP2", transition slide-from-top
  [EMZ Row]   ← v-if="hasP2", shared between both players
  [P1 Field]  ← always visible
```

---

## 8. right-areaからのカード追加（一時レシピ）

- `deck-card-drop` イベントで right-area のカードを practice フィールドへドロップ
- ドロップ処理内で `usePracticeStore.addCardFromDeck(cid, ciid, zone, dropPos)` を呼ぶ
- ストアで `hasTemporaryRecipe = true` にセット
- `hasTemporaryRecipe` が true の場合、right-area 上部に一時レシピ状態を表示
- hard-reset で `hasTemporaryRecipe = false` にリセット
- save で一時レシピを正式レシピとして保存（deck-edit ストアへ書き込み）

---

## 9. モード切替アニメーション

practice モードへの切替・復帰時にアニメーションを適用。

```vue
<Transition name="practice-slide">
  <PracticeField v-if="isPracticeMode" />
  <DeckRecipeArea v-else />
</Transition>
```

```scss
.practice-slide-enter-active,
.practice-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.practice-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.practice-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
```

---

## 10. ストアActions

```typescript
// 初期化
initPractice(deckCards: DeckCardRef[])  // デッキデータをコピー、5枚ドローで初期化
resetPractice(playerId?: 'p1' | 'p2')  // 指定プレイヤーをリセット（省略時P1のみ）
hardResetPractice()                    // P1・P2・EMZ・一時レシピを全リセット

// P2操作
initP2(deckCards: DeckCardRef[])       // P2フィールドを初期化（スライドイン開始）
removeP2()                             // P2フィールドを削除

// ドロー
draw(playerId?: 'p1' | 'p2')          // デッキトップ -> 手札右端
drawToZone(zone: ZoneType, playerId?: 'p1' | 'p2')
drawMultiple(count: number, playerId?: 'p1' | 'p2')

// 移動
moveCard(cardId, from, to, options?: { face, position })

// デッキ操作
shuffleDeck(playerId?: 'p1' | 'p2')
shuffleHand(playerId?: 'p1' | 'p2')
shuffleExtra(playerId?: 'p1' | 'p2')
revealDeckContents(show: boolean, playerId?: 'p1' | 'p2')

// カード状態変更
setCardFace(cardId, face: CardFace)
setCardOrientation(cardId, orientation: CardOrientation)

// ゾーン内並び替え
reorderInZone(zone, fromIndex, toIndex, playerId?: 'p1' | 'p2')

// right-areaからのカード追加
addCardFromDeck(cid: string, ciid: string, zone: ZoneType, dropPos: DropPosition, playerId?: 'p1' | 'p2')

// 永続化
saveToLocalStorage()
loadFromLocalStorage()
```

### Undo/Redo

全操作をUndo可能にする。最大50手まで履歴保持。リセット操作自体もUndo可能。
`deck-edit.ts` の `useDeckUndoRedo` パターンを踏襲。

---

## 11. UIの細部修正

### デッキ名フィールド

practice モード時に save/open ボタンを表示しない。`v-if="!isPracticeMode"` で制御。

### グリッドボタン

- ON/OFF 状態を正しく反映（常時青色にしない）
- サイズを他のトグルボタンと統一

---

## 12. レイアウト実装

### CSS Grid

フィールド部分はCSS Gridで実装。

```
P1 Row1: 8列  [Field] [M1] [M2] [M3] [M4] [M5] [GY] [Banish]
P1 Row2: 7列  [Extra] [ST1] [ST2] [ST3] [ST4] [ST5] [Deck]
EMZ:     2列  [EMZ1] [EMZ2]  ← 2デッキ時のみ表示
P2 Row2: 7列  [Deck] [ST5] [ST4] [ST3] [ST2] [ST1] [Extra]  ← 逆順
P2 Row1: 8列  [Banish] [GY] [M5] [M4] [M3] [M2] [M1] [Field]  ← 逆順
P2 Row3:      [Temp] [Hand cards ...]  ← 逆順
```

### モバイル対応

デスクトップと同じレイアウトを縮小表示。カードサイズ設定で調整。

---

## 13. カードサイズ設定

手動設定（プリセット選択）。`ygoNext:settings` に保存。

---

## 14. キーボードショートカット

初期リリースではなし。後で追加可能。

---

## 15. 枚数表示

| ゾーン | 表示方法 |
|--------|---------|
| デッキ | 枚数バッジ |
| 墓地 | 枚数バッジ |
| 除外 | 枚数バッジ |
| EXデッキ | 枚数バッジ |
| EMZ | なし（0-2枚） |
| モンスター/魔法罠 | 重ね枚数（複数時） |
| 手札 | 枚数表示 |
| Temp | 枚数表示 |
| フィールド魔法 | なし（0or1） |
