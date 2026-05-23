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

// ゾーン（カードの配列で管理）
interface PracticeZone {
  type: ZoneType
  cards: PracticeCard[]
}

// プラクティス全体の状態
interface PracticeState {
  zones: Map<ZoneType, PracticeZone>
  revealDeck: boolean        // デッキ内容の一時表示
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
| `hand` | 1つの配列（右端追加） | ずらし重ね |
| `temp` | 1つの配列 | ずらし重ね |

※ monster/spellTrap は各5スロットでそれぞれ独立したPracticeCard[]を持つため、実際は `monster: PracticeCard[][]`（5要素の配列）とする。

### 永続化

- `localStorage`（キー: `ygoNext:practice`）に保存
- リロード時に状態を復元
- デッキ切り替え時はリセット（localStorageも上書き）

---

## 2. コンポーネント構成

```
PracticeField.vue              -- フィールド全体
  PracticeZoneRow.vue          -- 行（Row1/Row2/Row3）
    PracticeSlot.vue           -- 各スロット（M1等の各枠）
      PracticeCardStack.vue    -- カードの重ね表示
        PracticeCard.vue       -- 個別カード表示
      PracticeSlotControls.vue -- スロット操作ボタン+メニュー
  PracticeHandArea.vue         -- 手札 + 一時置き場
    PracticeCardStack.vue
      PracticeCard.vue
```

### PracticeCard.vue

- 表向き: カード画像を表示
- 横向き: 90度回転して表示
- 裏向き: 半透明のカード裏面を表示

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

---

## 3. 操作設計

### ゾーン別クイックボタン

| ゾーン | クイックボタン | メニュー内容 |
|--------|---------------|-------------|
| デッキ | ドロー(1枚)、シャッフル | 5枚ドロー、検索して追加、トップに置く、ボトムに置く |
| 手札 | 場に出す、墓地へ | 除外へ、デッキに戻す（上/下）、Tempへ |
| モンスター/魔法罠 | 墓地へ、手札に戻す | 除外へ、デッキに戻す、表裏切替、縦横切替 |
| 墓地 | 手札に戻す、場に出す | 除外へ、デッキに戻す |
| 除外 | 手札に戻す、場に出す | 墓地へ、デッキに戻す |
| EXデッキ | 場に出す、墓地へ | 手札に戻す、デッキに戻す |
| フィールド魔法 | 墓地へ | 手札に戻す、デッキに戻す |
| Temp | 手札に戻す、墓地へ | 除外へ、場に出す |

### 空ゾーンのUI

- 枚数「0」を表示
- クリックでメニューを開ける（検索して追加等）

### エラー処理

- 空デッキからのドロー: ボタン非活性化
- トースト通知で操作不可を表示

### ドラッグ&ドロップ

既存のHTML5 DnDパターンを踏襲。ゾーン間のカード移動に対応。
ドロップ先でスタックの上・下・挿入位置を決める。

---

## 4. ストアActions

```typescript
// 初期化
initPractice(deckCards: DeckCardRef[])  // デッキデータをコピー、5枚ドローで初期化
resetPractice()                         // 初期状態にリセット

// ドロー
draw()                    // デッキトップ -> 手札右端
drawToZone(zone: ZoneType) // デッキトップ -> 指定ゾーン
drawMultiple(count: number) // 指定枚数ドロー

// 移動
moveCard(cardId, from, to, options?: { face, position })
// options.position: 'top' | 'bottom' | index指定

// デッキ操作
shuffleDeck()
shuffleHand()
shuffleExtra()
revealDeckContents(show: boolean)  // デッキ内容の一時表示切替

// カード状態変更
setCardFace(cardId, face: CardFace)
setCardOrientation(cardId, orientation: CardOrientation)

// ゾーン内並び替え
reorderInZone(zone, fromIndex, toIndex)

// 永続化
saveToLocalStorage()
loadFromLocalStorage()
```

### Undo/Redo

全操作をUndo可能にする。最大50手まで履歴保持。リセット操作自体もUndo可能。
`deck-edit.ts` の `useDeckUndoRedo` パターンを踏襲。

---

## 5. モード切替

- デッキ名の右にトグルボタンを配置
- ON: デッキレシピ表示 -> 一人回しフィールドに切替
- OFF: 一人回しフィールド -> デッキレシピ表示に戻す
- 切替時にpractice状態は維持（再度ONで復帰可能）
- practice中はデッキ編集をロック（トグルOFFしないと編集不可）
- デッキ切り替え時はpractice状態をリセット

---

## 6. RightArea連携

practice中もRightAreaはそのまま活用:

| タブ | practice中の動作 |
|------|-----------------|
| Card | カードクリック・ホバーで詳細表示（既存機能そのまま） |
| Search | 検索結果のカードに「手札に追加」「場に出す」ボタンを表示 |
| Deck | practice操作パネル（リセット、1/2デッキ切替、ドロー枚数表示等） |
| Metadata | 変更なし |

---

## 7. レイアウト実装

### CSS Grid

フィールド部分はCSS Gridで実装。

```
Row1: 8列  [Field] [M1] [M2] [M3] [M4] [M5] [GY] [Banish]
Row2: 7列  [Extra] [ST1] [ST2] [ST3] [ST4] [ST5] [Deck]
Row3:      [Hand cards ..............] [Temp]
```

### モバイル対応

デスクトップと同じレイアウトを縮小表示。カードサイズ設定で調整。

### 既存資産の活用

- `DeckCard.vue` のカード表示パターンを参考に `PracticeCard.vue` を新規実装
- Fisher-Yatesシャッフルアルゴリズムは既存のものを利用
- FLIPアニメーションパターンを踏襲

---

## 8. カードサイズ設定

手動設定（プリセット選択）。`ygoNext:settings` に保存。

---

---

## 10. 2デッキモード

1デッキの対称構成。上下に同じPracticeFieldを配置。
各 PracticeField は独立したゾーンを持つ。

```typescript
interface PracticeState2Deck {
  fields: [PracticeState, PracticeState]
}
```

### 2デッキ目の選択

2デッキモード時にRightAreaにデッキ一覧を表示し、そこから2デッキ目を選択する。

---

## 11. キーボードショートカット

初期リリースではなし。後で追加可能。

---

## 12. 枚数表示

| ゾーン | 表示方法 |
|--------|---------|
| デッキ | 枚数バッジ |
| 墓地 | 枚数バッジ |
| 除外 | 枚数バッジ |
| EXデッキ | 枚数バッジ |
| モンスター/魔法罠 | 重ね枚数（複数時） |
| 手札 | 枚数表示 |
| Temp | 枚数表示 |
| フィールド魔法 | なし（0or1） |
