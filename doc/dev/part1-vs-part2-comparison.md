# applyAttributeToField() - Part 1 vs Part 2 比較

## 概要

`applyAttributeToField()` 関数は2つの重要な処理ステップで構成されています。

| 項目 | Part 1 | Part 2 |
|------|--------|--------|
| 行番号 | 321-356 | 358-407 |
| 名称 | 属性が選択された場合の項目無効化 | 属性が無効になった場合の項目無効化 |
| トリガー | 属性が enabled=true かつ selected=true | 属性が enabled=false |
| 対象ルール | `attributeToField` の `negative` | `fieldToAttribute` の `target` の逆引き |

---

## Part 1: 属性が有効かつ選択された場合の項目無効化

### 実装位置
```typescript
// 1. 属性が有効かつ選択されている場合、negative項目を無効化
for (const rule of rules.attributeToField) {
  const attrState = result.attributeStates.get(rule.trigger);

  // ORモードの場合、直接選択された属性（required=false）は項目を無効化しない
  const shouldApplyToField = attrState && attrState.selected &&
    (state.monsterTypeMode === 'and' || attrState.required);

  if (shouldApplyToField) {
    for (const field of rule.negative) {
      // 項目を無効化
    }
  }
}
```

### ルール例

```json
{
  "title": "monster-type_link-negative",
  "trigger": "monster-type_link",
  "negative": ["def", "level-rank"]
}
```

**意味**: 
- `monster-type_link` が有効かつ選択されたら
- → `def` と `level-rank` を無効化（Linkモンスターには攻守がないため）

### 条件

- ✅ 属性が enabled=true
- ✅ 属性が selected=true
- ✅ AND モード OR 属性が必須（required=true）

### 処理例

```
monster-type_link を選択（AND モード）
  ↓
  shouldApplyToField = true
  ↓
  def を無効化 （理由: "monster-type_link-negative: monster-type_linkにより無効"）
  level-rank を無効化
```

---

## Part 2: 属性が無効になった場合の項目無効化

### 実装位置
```typescript
// 2. 属性が無効になった場合、それを必須とする項目も無効化
for (const [attr, attrState] of result.attributeStates) {
  if (attrState.enabled) continue;

  const requiresThisAttr = rules.fieldToAttribute.filter((r) => r.target?.includes(attr));

  for (const req of requiresThisAttr) {
    for (const fieldPattern of req.triggerItems) {
      // 項目を無効化
    }
  }
}
```

### ルール例

```json
{
  "title": "monster-type_link-necessary",
  "triggerItems": ["link-value", "link-marker"],
  "target": ["monster-type_link"]
}
```

**意味**:
- `link-value` または `link-marker` に入力があったら
- → `monster-type_link` は必須（逆引き: `monster-type_link` が無効なら link-value/link-marker も無効）

### 条件

- ✅ 属性が enabled=false
- ✅ その属性を target に持つ `fieldToAttribute` ルールが存在

### 処理例

```
level-rank 入力
  ↓
  monster-type_link が無効化される（notTarget で排除）
  ↓ (Part 2 開始)
  monster-type_link が disabled な属性を検出
  ↓
  monster-type_link を target とするルール検索
  ↓
  "monster-type_link-necessary" ルール発見
    - triggerItems: ["link-value", "link-marker"]
  ↓
  link-value を無効化 （理由: "monster-type_linkが選択不可のため無効"）
  link-marker を無効化
```

---

## Part 1 vs Part 2 の違い

### 1. ルールの向き

| Part | ルール方向 | ルール名 | 例 |
|------|-----------|---------|-----|
| Part 1 | 属性 → 項目（直接） | `attributeToField` | `monster-type_link` → `def, level-rank` |
| Part 2 | 属性 ← 項目（逆引き） | `fieldToAttribute` を逆引き | `monster-type_link` ← `link-value, link-marker` |

### 2. トリガー条件

| Part | トリガー | 説明 |
|------|--------|------|
| Part 1 | enabled=true + selected=true | 属性が「選択されている」状態 |
| Part 2 | enabled=false | 属性が「無効化された」状態 |

### 3. ルール対象

| Part | 対象フィール | 説明 |
|------|------------|------|
| Part 1 | `negative` フィールド | その属性が選択されたら無効にする項目 |
| Part 2 | `target` フィールド（逆引き） | その属性が無効になったら、それを必須とする項目を無効化 |

---

## 具体例で理解する

### シナリオ: Link モンスターに関する処理フロー

#### 初期状態
```
monster-type_link: enabled=true, selected=false
def: enabled=true
level-rank: enabled=true
link-value: enabled=true
link-marker: enabled=true
```

#### ケース 1: monster-type_link を直接選択した場合

```
Step 1: applyFieldToAttribute()
  - 項目入力なし → 処理なし

Step 2: applyAttributeExclusion()
  - monster-type_link が single selected → 他の monster-type と排他

Step 3: applyAttributeToField() - Part 1
  - monster-type_link が enabled=true かつ selected=true
  - "monster-type_link-negative" ルール適用
  - def → disabled （Link モンスターは DEF がない）
  - level-rank → disabled （Link モンスターは Level がない）

結果:
  - monster-type_link: selected=true, enabled=true
  - def: disabled （無効化の理由: Part 1）
  - level-rank: disabled （無効化の理由: Part 1）
  - link-value: enabled ✅
  - link-marker: enabled ✅
```

#### ケース 2: level-rank に入力した場合

```
Step 1: applyFieldToAttribute()
  - level-rank が triggerItems
  - notTarget に "monster-type_link" を含むルール検索
  - "monster-type_has-level-rank-necessary" ルール適用
  - monster-type_link → disabled （Level を持たないため無効）

Step 2: applyAttributeExclusion()
  - monster-type_link は disabled なので処理なし

Step 3: applyAttributeToField() - Part 1
  - monster-type_link は disabled なので処理なし

Step 3: applyAttributeToField() - Part 2 ← ここが重要
  - monster-type_link が disabled な属性を発見
  - "monster-type_link-necessary" ルール検索（逆引き）
  - triggerItems: ["link-value", "link-marker"]
  - link-value → disabled （理由: monster-type_link が無効）
  - link-marker → disabled （理由: monster-type_link が無効）

結果:
  - monster-type_link: disabled （無効化の理由: Step 1 で不要）
  - def: enabled ✅
  - level-rank: enabled ✅ （入力中）
  - link-value: disabled （無効化の理由: Part 2）
  - link-marker: disabled （無効化の理由: Part 2）
```

---

## Part 2 が必要な理由

Part 2 がなかった場合、ケース 2 では以下の矛盾が発生:

```
矛盾:
  1. link-value と link-marker は monster-type_link を必須とする
  2. しかし monster-type_link は無効化されている
  3. つまり link-value/link-marker は入力できないはずなのに有効

Part 2 の処理:
  - この矛盾を防ぐために、disabled な属性を必須とする項目も
    无効化する
```

---

## ワイルドカード対応

両パートともワイルドカード（`*`）をサポート:

### Part 1
```json
{
  "title": "spell-type-monster-type-exclude",
  "trigger": "spell-type*",
  "negative": ["monster-type*"]
}
```

- `spell-type_*` が選択されたら
- → `monster-type_*` の全て無効化

### Part 2
```json
{
  "title": "card-type_monster-necessary",
  "triggerItems": ["monster-type*", "attribute", ...],
  "target": ["card-type_monster"]
}
```

- `monster-type_*` 等の入力が있으면
- → `card-type_monster` は必須
- 逆: `card-type_monster` が無効なら → `monster-type_*` の全て無効

---

## まとめ

| 項目 | Part 1 | Part 2 |
|------|--------|--------|
| 目的 | 属性を選択したら相反する項目を無効化 | 属性が無効化されたら、それを必須とする項目も無効化 |
| ルール向き | 属性 → 項目 | 属性 ← 項目（逆引き） |
| トリガー | enabled=true かつ selected=true | enabled=false |
| 実装複雑度 | 低 | 中（ルール逆引き + ワイルドカード） |
| テスト | ✅ PASS | ✅ PASS |
| 問題 | なし | **なし** |

