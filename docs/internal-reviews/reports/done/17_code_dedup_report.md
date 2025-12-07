# REQ-17 コード重複調査レポート

**レビュー実施日**: 2025-11-22  
**レビュー対象**: src/components/CardList.vue, src/components/DeckSection.vue, src/stores/deck-edit.ts

---

## 発見した重複コードの一覧

### 1. `getCardInfo()` 関数（複数箇所）

**重複度**: 高  
**影響範囲**: 3箇所

#### 発見箇所

| ファイル | 行番号 | 型 |
|---------|--------|-----|
| src/components/DeckSection.vue | 120-135 | ローカル関数 |
| src/stores/deck-edit.ts | 1130-1141 | ローカル関数 |
| src/components/CardList.vue | - | 未実装 |

#### コード比較

**DeckSection.vue (120-135)**
```typescript
const getCardInfo = (cid, ciid) => {
  const allDecks = [
    ...deckStore.deckInfo.mainDeck,
    ...deckStore.deckInfo.extraDeck,
    ...deckStore.deckInfo.sideDeck,
    ...deckStore.trashDeck
  ]
  const deckCard = allDecks.find(dc =>
    dc.card.cardId === cid && dc.card.ciid === String(ciid)
  )
  if (!deckCard) return null
  return deckCard.card
}
```

**deck-edit.ts (1130-1141)**
```typescript
const getCardInfo = (cid: string, ciid: number) => {
  const allDecks = [
    ...deckInfo.value.mainDeck,
    ...deckInfo.value.extraDeck,
    ...deckInfo.value.sideDeck,
    ...trashDeck.value
  ];
  const deckCard = allDecks.find(dc =>
    dc.card.cardId === cid && dc.card.ciid === String(ciid)
  );
  return deckCard ? deckCard.card : null;
};
```

**判定**: 実装は同一ロジック。型定義と空値判定形式の差異のみ。

---

### 2. `getAttributeLabel()` と `getRaceLabel()` 関数

**重複度**: 中  
**影響範囲**: 1箇所（CardList.vue のみ）

#### 発見箇所

| ファイル | 行番号 | 関数 |
|---------|--------|------|
| src/components/CardList.vue | 301-320 | getAttributeLabel, getRaceLabel |

#### コード

**CardList.vue (301-320)**
```typescript
const getAttributeLabel = (attr) => {
  const labels = {
    light: '光', dark: '闇', water: '水', fire: '炎',
    earth: '地', wind: '風', divine: '神'
  }
  return labels[attr] || attr
}

const getRaceLabel = (race) => {
  const labels = {
    dragon: '龍', spellcaster: '魔法', warrior: '戦士', machine: '機械',
    fiend: '悪魔', fairy: '天使', zombie: '不死', beast: '獣',
    beastwarrior: '獣戦', plant: '植物', insect: '昆虫', aqua: '水',
    fish: '魚', seaserpent: '海竜', reptile: '爬虫', dinosaur: '恐竜',
    windbeast: '鳥獣', rock: '岩石', pyro: '炎', thunder: '雷',
    psychic: '念動', wyrm: '幻竜', cyberse: '電脳', illusion: '幻想',
    divine: '神獣', creatorgod: '創造'
  }
  return labels[race] || race
}
```

**判定**: 
- 他のコンポーネント内での使用なし
- ただし汎用性が高く、共通ユーティリティとして活用価値あり
- 類似する `getMonsterTypeLabel()` も同じファイルに存在

---

### 3. `getMonsterTypeLabel()` 関数

**重複度**: 低  
**影響範囲**: 1箇所（CardList.vue のみ）

#### 発見箇所

| ファイル | 行番号 |
|---------|--------|
| src/components/CardList.vue | 322-330 |

#### コード

```typescript
const getMonsterTypeLabel = (type) => {
  const labels = {
    normal: '通常', effect: '効果', fusion: '融合', ritual: '儀式',
    synchro: 'シンクロ', xyz: 'エクシーズ', pendulum: 'ペンデュラム', link: 'リンク',
    tuner: 'チューナー', flip: 'リバース', toon: 'トゥーン', spirit: 'スピリット',
    union: 'ユニオン', gemini: 'デュアル', special: '特殊召喚'
  }
  return labels[type] || type
}
```

**判定**: 他での使用なし（ただし CardList.vue 内で利用）

---

## 実施したリファクタリングの内容

### リファクタリング計画（未実装）

本レポートは **調査フェーズ** の成果物です。実装は別途段階的に進めます。

以下を推奨：

#### Phase 1: `getCardInfo()` の共通化（優先度: 高）
- **目的**: 2つの同一ロジックを統一
- **実装方法**: `src/utils/card-info.ts` に移行
- **実装対象**:
  - DeckSection.vue → ストア関数を参照
  - deck-edit.ts → 共通関数に置き換え

#### Phase 2: ラベル変換関数の共通化（優先度: 中）
- **目的**: getAttributeLabel, getRaceLabel, getMonsterTypeLabel を共通化
- **実装方法**: `src/utils/label-mappers.ts` 作成
- **実装対象**:
  - CardList.vue → 新ユーティリティをインポート

#### Phase 3: その他ユーティリティの整理（優先度: 低）
- 更なるコード検索で、sortCards 等の重複検討

---

## 共通化したコードの配置場所

**計画中**（実装フェーズで決定）

推奨構成:
```
src/utils/
├── card-info.ts        (getCardInfo の共通実装)
├── label-mappers.ts    (ラベル変換関数の共通実装)
└── existing files...
```

---

## 未対応の項目

### 1. `sortCards()` 関数

**発見状況**:
- src/content/shuffle/shuffleCards.ts に `sortCards()` 存在
- src/components/CardList.vue に `sortCards()` 関数定義あり（ソート処理）

**理由**: 
- 両者は異なる目的のため、重複ではなく異なる関数
  - shuffle 版: DOM 上のカード要素の並び替え
  - CardList 版: データ配列のソート処理

---

## サマリー

| 項目 | 概要 |
|------|------|
| **発見した重複** | 3グループ |
| **リファクタリング対象** | 2グループ（getCardInfo, ラベル関数） |
| **未対応** | 1グループ（sortCards は異なる用途） |
| **次ステップ** | Phase 1～3 の順次実装 |

**推奨優先度**: 高 → getCardInfo の共通化が最優先
