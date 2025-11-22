# ストア設計ドキュメント

Pinia ストアの設計と使用方法について説明します。

## 概要

本プロジェクトでは Pinia を使用して状態管理を行っています。主に2つのストアがあります：

- `deck-edit.ts`: デッキ編集機能の状態管理
- `settings.ts`: ユーザー設定の状態管理

## useDeckEditStore

デッキ編集機能の中心的なストア。デッキデータ、表示順序、選択状態などを管理します。

### State

```typescript
interface DeckEditState {
  // デッキ情報
  deckInfo: DeckInfo | null;

  // 表示順序（UUID付きカード配列）
  displayOrder: {
    main: DisplayCard[];
    extra: DisplayCard[];
    side: DisplayCard[];
  };

  // 検索・フィルター
  searchQuery: string;
  searchFilters: SearchFilters;
  searchResults: Card[];

  // 選択状態
  selectedCard: Card | null;

  // UI状態
  isLoading: boolean;
  error: string | null;

  // セッション情報
  cgid: string;
  ytkn: string;
}
```

### DisplayCard 構造

```typescript
interface DisplayCard {
  uuid: string;      // 一意識別子
  card: Card;        // カード情報
  quantity: number;  // 枚数
}
```

### 主要なActions

#### デッキ操作

- `loadDeck(dno: number)`: デッキを読み込む
- `saveDeck()`: デッキを保存する
- `clearDeck()`: デッキをクリアする

#### カード操作

- `addCard(card: Card, section: DeckSection)`: カードを追加
- `removeCard(uuid: string, section: DeckSection)`: カードを削除
- `moveCard(uuid: string, from: DeckSection, to: DeckSection)`: カードを移動
- `updateQuantity(uuid: string, section: DeckSection, delta: number)`: 枚数変更

#### 検索・フィルター

- `setSearchQuery(query: string)`: 検索クエリ設定
- `setSearchFilters(filters: SearchFilters)`: フィルター設定
- `searchCards()`: カード検索実行
- `clearSearch()`: 検索クリア

#### 選択状態

- `selectCard(card: Card)`: カードを選択
- `clearSelection()`: 選択解除

### Getters

```typescript
// デッキ内のカード総数
totalCards: number;

// メインデッキのカード数
mainDeckCount: number;

// エクストラデッキのカード数
extraDeckCount: number;

// サイドデッキのカード数
sideDeckCount: number;

// フィルター適用済み検索結果
filteredSearchResults: Card[];

// デッキが変更されたか
isDirty: boolean;
```

### UUID永続化ロジック

v0.4.0でUUID永続化ロジックが改善されました。新規カードには最大インデックス+1を付与し、ユニーク性を保証します。

```typescript
// 新規カードのUUID生成
const maxIndex = Math.max(
  ...displayOrder.main.map(c => parseInt(c.uuid.split('-')[1]) || 0),
  ...displayOrder.extra.map(c => parseInt(c.uuid.split('-')[1]) || 0),
  ...displayOrder.side.map(c => parseInt(c.uuid.split('-')[1]) || 0)
);
const newUuid = `card-${maxIndex + 1}`;
```

## useSettingsStore

ユーザー設定を管理するストア。設定はlocalStorageに永続化されます。

### State

```typescript
interface SettingsState {
  // 表示設定
  displayMode: 'list' | 'grid';
  defaultSortOrder: SortOrder;
  animationEnabled: boolean;

  // 検索設定
  searchBarPosition: 'default' | 'global';

  // 言語設定
  language: 'auto' | 'ja' | 'en';

  // 機能設定
  deckEditEnabled: boolean;
  shuffleEnabled: boolean;
  imageEnabled: boolean;
}
```

### SortOrder 型

```typescript
type SortOrder =
  | 'release'   // 発売日順
  | 'name'      // 名前順
  | 'atk'       // ATK順
  | 'def'       // DEF順
  | 'level'     // Lv/Rank順
  | 'attribute' // 属性順
  | 'race';     // 種族順
```

### Actions

- `setDisplayMode(mode: 'list' | 'grid')`: 表示モード設定
- `setSortOrder(order: SortOrder)`: ソート順設定
- `setAnimationEnabled(enabled: boolean)`: アニメーション設定
- `setSearchBarPosition(position: 'default' | 'global')`: 検索バー位置設定
- `setLanguage(lang: 'auto' | 'ja' | 'en')`: 言語設定
- `resetToDefaults()`: デフォルトに戻す

### 永続化

設定は自動的にlocalStorageに保存されます。

```typescript
// 保存
localStorage.setItem('ygo-deck-helper-settings', JSON.stringify(state));

// 読み込み
const saved = localStorage.getItem('ygo-deck-helper-settings');
if (saved) {
  Object.assign(state, JSON.parse(saved));
}
```

## ストア間の連携

### DeckEdit と Settings の連携

```typescript
// DeckEditストア内で設定を参照
const settingsStore = useSettingsStore();

// 設定に基づいてソート
if (settingsStore.defaultSortOrder === 'name') {
  sortByName();
}

// アニメーション設定を参照
if (settingsStore.animationEnabled) {
  playAnimation();
}
```

## 使用例

### コンポーネントでの使用

```vue
<script setup lang="ts">
import { useDeckEditStore } from '@/stores/deck-edit';
import { useSettingsStore } from '@/stores/settings';

const deckStore = useDeckEditStore();
const settingsStore = useSettingsStore();

// カード追加
const handleAddCard = (card: Card) => {
  deckStore.addCard(card, 'main');
};

// 表示モード切り替え
const toggleDisplayMode = () => {
  const newMode = settingsStore.displayMode === 'list' ? 'grid' : 'list';
  settingsStore.setDisplayMode(newMode);
};
</script>
```

### リアクティブな参照

```vue
<template>
  <div :class="{ 'grid-mode': settingsStore.displayMode === 'grid' }">
    <div v-for="card in deckStore.displayOrder.main" :key="card.uuid">
      {{ card.card.name }}
    </div>
  </div>
</template>
```

## 注意事項

### displayOrder と deckInfo の同期

`displayOrder`はUIの表示順序を管理し、`deckInfo`は保存用のデータ構造です。カード操作時は両方を更新する必要があります。

```typescript
// カード追加時
displayOrder.main.push(newDisplayCard);
deckInfo.mainDeck.push({ card: newCard, quantity: 1 });
```

### 大きなストアの分割検討

`deck-edit.ts`は多くの責務を持っています（54回の変更履歴）。将来的に以下のような分割を検討：

- `deck-data.ts`: デッキデータ管理
- `deck-search.ts`: 検索・フィルター
- `deck-ui.ts`: UI状態管理

## 関連ドキュメント

- [アーキテクチャ設計](./architecture.md)
- [データモデル](./data-models.md)
- [テスト戦略](./testing.md)
