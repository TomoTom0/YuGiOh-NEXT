# PracticeSlotMenuDialog リデザイン技術設計

## 基本方針

PracticeSlotMenuDialog を刷新する。PracticeCard コンポーネントをそのまま活用し、各カードの操作は PracticeCard の既存機能（infoボタン、ドラッグ、アクションボタン）に任せる。

## コンポーネント構成

### PracticeSlotMenuDialog.vue（刷新）

ダイアログ内に以下を配置:

1. **ヘッダー**: ゾーン名 + 枚数 + 閉じるボタン（現状維持）
2. **ツールバー**:
   - カードタイプフィルタ（Monster/Spell/Trap/All）
   - 名前検索入力欄
   - ソート（名前/タイプ）
3. **カードグリッド**: フィルタ/ソート済みのカードをグリッド表示
   - 各カードは PracticeCard コンポーネントを使用
   - PracticeCard が infoボタン、ドラッグ、アクションボタンを提供

### データフロー

```
PracticeSlotMenuDialog
  ├── props: cards (PracticeCard[]), zone (ZoneType), visible (boolean)
  ├── internal: filterText, filterType, sortKey
  ├── computed: filteredCards -> PracticeCard[]
  └── template: PracticeCard v-for card in filteredCards
        ├── zone prop で操作ボタンを制御
        ├── @action -> $emit('action', key, cardId)
        ├── @dragstart -> ドラッグ開始
        └── @drop -> ドロップ受信
```

### PracticeCard の再利用

PracticeCard は既に以下の機能を持っている:
- info ボタン（常時表示、左上）
- アクションボタン（ホバー時、zone に応じて表示）
- ドラッグ＆ドロップ
- 裏側カードの半透明表示

PracticeSlotMenuDialog 内では PracticeCard をグリッド状に並べるだけ。

## フィルタ/ソートの実装

### フィルタ

PracticeCard には `cid` がある。UnifiedCacheDB からカードタイプを取得してフィルタ:

```typescript
function getCardType(cid: string): 'monster' | 'spell' | 'trap' | null {
  const info = unifiedDB.getCardInfo(cid)
  return info?.cardType ?? null
}
```

### ソート

カード名でソート。UnifiedCacheDB からカード名を取得:

```typescript
function getCardName(cid: string): string {
  return unifiedDB.getCardInfo(cid)?.name ?? ''
}
```

## UI設計

```
+------------------------------------------+
| [Zone Name]                    [X] 40枚  |
+------------------------------------------+
| [All] [Monster] [Spell] [Trap]  [Search] |
+------------------------------------------+
| [Card][Card][Card][Card][Card][Card]      |
| [Card][Card][Card][Card][Card][Card]      |
| [Card][Card][Card][Card][Card]            |
+------------------------------------------+
```

各 Card は PracticeCard コンポーネント（infoボタン付き、ホバーでアクション表示、ドラッグ可能）。

## 修正ファイル

1. `src/components/practice/PracticeSlotMenuDialog.vue` — 全面リライト
2. `src/components/practice/PracticeCard.vue` — 変更なし（既に機能充足）
