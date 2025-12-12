# exclusion engine の fieldToAttribute ルール調査報告書

## 実行サマリー

本調査では、`exclusion engine` の `fieldToAttribute` ルールがフィールド（link-value, link-marker）の無効化にどう反映されるかを分析しました。

**結論**: `fieldToAttribute` ルールは**属性（attribute）の状態**を制御しますが、**フィールド（field）の無効状態**には直接反映されません。フィールドの無効化は `attributeToField` ルールで別途定義する必要があります。

---

## 1. 現在の実装メカニズム

### 1.1 推論エンジンの3つのルール体系

`search-exclusion-engine.ts` では以下の3つのルール体系が順次適用されます：

```
[1] applyFieldToAttribute() - 項目から属性への決定性
    ↓ (反復)
[2] applyAttributeExclusion() - 属性同士の排他
    ↓ (反復)
[3] applyAttributeToField() - 属性から項目への無効化
```

### 1.2 fieldToAttribute ルールの動作

ファイル: `search-exclusion-engine.ts` の `applyFieldToAttribute()` (行 101-195)

**トリガーチェック（行 110-122）**:
- triggerItems（例: `link-value`, `link-marker`）に入力があるか確認
- 入力あり → rule を適用、なし → スキップ

**target 属性を必須化（行 124-159）**:
- rule.target（例: `monster-type_link`）の属性に `required=true` をセット
- 属性が有効なら `selected=true` もセット

**notTarget 属性を無効化（行 161-191）**:
- rule.notTarget（例: `monster-type_link` を除く他の属性）を `enabled=false` にセット

**重要**: このステップで変更されるのは `result.attributeStates` のみ。`result.fieldStates` は直接変更されません。

### 1.3 具体例: link-value/link-marker の場合

ルール定義（`search-exclusion-rules.json`行 78-86）:
```json
{
  "title": "monster-type_link-necessary",
  "triggerItems": ["link-value", "link-marker"],
  "target": ["monster-type_link"]
}
```

動作：
1. ユーザーが `link-value` または `link-marker` に入力
2. `fieldInputs['link-value']` または `fieldInputs['link-marker']` が `true`
3. `applyFieldToAttribute()` で `monster-type_link` 属性が「必須化」
4. ★ この時点ではフィールド状態は何も変わらない

---

## 2. フィールド無効化の実装

### 2.1 フィールドが無効化される2つの場所

#### [場所1] attributeToField ルールによる無効化
ファイル: `search-exclusion-engine.ts` の `applyAttributeToField()` (行 321-355)

```typescript
// 属性が「選択済みかつ有効」の場合、negative フィールドを無効化
for (const rule of rules.attributeToField) {
  const attrState = result.attributeStates.get(rule.trigger);
  const shouldApplyToField = attrState && attrState.selected &&
    (state.monsterTypeMode === 'and' || attrState.required);

  if (shouldApplyToField) {
    for (const field of rule.negative) {
      fieldState.enabled = false;  // ← フィールドを無効化
    }
  }
}
```

#### [場所2] 必須属性が無効化された場合のフィールド無効化
ファイル: `search-exclusion-engine.ts` の `applyAttributeToField()` (行 358-407)

```typescript
// 属性が無効になった場合、それを target とする fieldToAttribute ルールも調べる
for (const [attr, attrState] of result.attributeStates) {
  if (attrState.enabled) continue;  // 無効な属性だけ処理

  const requiresThisAttr = rules.fieldToAttribute.filter((r) => 
    r.target?.includes(attr)  // ← target にのみ対応
  );

  for (const req of requiresThisAttr) {
    for (const fieldPattern of req.triggerItems) {
      fieldState.enabled = false;  // ← フィールドを無効化
    }
  }
}
```

---

## 3. 現在の問題点

### 3.1 問題シナリオ: level-rank と link-value/link-marker の関係

**ルール定義（現在）**:
```json
[
  {
    "title": "monster-type_has-level-rank-necessary",
    "triggerItems": ["level-rank", "def"],
    "notTarget": ["monster-type_link"]
  },
  {
    "title": "monster-type_link-negative",
    "trigger": "monster-type_link",
    "negative": ["def", "level-rank"]
  }
]
```

**問題**:
1. ユーザーが `level-rank` に入力 → `monster-type_link` が notTarget で無効化される ✓
2. ユーザーが `monster-type_link` を選択 → `level-rank` が negative で無効化される ✓
3. しかし逆に、`monster-type_link` が無効化 → `link-value`/`link-marker` が無効化されない ✗

### 3.2 なぜ自動無効化が起きないのか

`applyAttributeToField()` (行 358-407) では:

```typescript
const requiresThisAttr = rules.fieldToAttribute.filter((r) => 
  r.target?.includes(attr)  // ← target にのみ対応
);
```

つまり、以下のルールは処理される：
```json
{
  "triggerItems": ["link-value", "link-marker"],
  "target": ["monster-type_link"]
}
```
（monster-type_link が無効化 → link-value/link-marker が無効化）

しかし、以下のルールは処理されない：
```json
{
  "triggerItems": ["level-rank", "def"],
  "notTarget": ["monster-type_link"]
}
```
（monster-type_link が無効化 → level-rank/def は... 有効のままになるべき？）

**notTarget の reverse ロジックが複雑なため、実装されていない**

---

## 4. 正しいルール定義方法

### 4.1 推奨: notTarget ではなく別の attributeToField を使う

**現在の問題のある定義**:
```json
{
  "title": "monster-type_has-level-rank-necessary",
  "triggerItems": ["level-rank", "def"],
  "notTarget": ["monster-type_link"]
}
```

**改善案A（推奨）**: attributeToField ルールで明示的に定義

```json
[
  {
    "title": "monster-type_link-negative-fields",
    "trigger": "monster-type_link",
    "negative": ["link-value", "link-marker"]
  }
]
```

**動作**:
1. `monster-type_link` が選択 → `link-value`/`link-marker` が無効化 ✓
2. `monster-type_link` が無効化 → `link-value`/`link-marker` は自動的に有効 ✓
   （なぜなら trigger の条件を満たさなくなるため）

### 4.2 改善案B: bidirectional ルール定義（将来の拡張）

ルール定義に逆方向を明記：

```json
{
  "title": "monster-type_link-necessary",
  "triggerItems": ["link-value", "link-marker"],
  "target": ["monster-type_link"],
  "relatedFields": {
    "disableWhen": "monster-type_link is disabled",
    "fields": ["link-value", "link-marker"]
  }
}
```

**注意**: 現在のエンジンはこれをサポートしていません。

---

## 5. 検証: 実装コードの流れ

### 5.1 ユーザーが link-value に入力した場合

```
1. toSearchConditionState()
   → fieldInputs['link-value'] = true

2. applyFieldToAttribute() iteration 1
   rule: monster-type_link-necessary (triggerItems: [link-value, link-marker])
   → monster-type_link を required=true, selected=true に設定

3. applyAttributeExclusion() iteration 1
   monster-type_link と monster-type_normal は排他グループ
   → monster-type_normal を enabled=false に設定

4. applyAttributeToField() iteration 1
   - monster-type_link が selected → def, level-rank を無効化
   - monster-type_normal が disabled → level-rank は... 何もしない

5. iteration 2,3... (変化なし)

★ 結果: link-value, link-marker は有効なまま
```

### 5.2 逆方向: monster-type_link が無効化された場合

```
1. 他のルール（例: monster-type_normal 選択）で monster-type_link が無効化

2. applyAttributeToField() line 358-407
   monster-type_link が disabled になったか確認

   const requiresThisAttr = rules.fieldToAttribute.filter((r) =>
     r.target?.includes('monster-type_link')  // ← ここに該当するルール
   );

   rule: monster-type_link-necessary
   → triggerItems: [link-value, link-marker] を無効化

★ 結果: link-value, link-marker が自動無効化される ✓
（ただし、このルールがあれば）
```

---

## 6. UI での disable 反映

### 6.1 FilterTab.vue での無効化表示

```typescript
// 行 236-237
:disabled="isFieldDisabled('link-value') || isFieldDisabled('link-marker')"

// 行 304
:disabled="isFieldDisabled('link-value')"
```

### 6.2 useFilterLogic.ts での判定

```typescript
// 行 184-206
function isFieldDisabled(field: string): boolean {
  const fieldState = exclusionResult.value.fieldStates.get(field);
  if (fieldState) {
    return !fieldState.enabled;  // ← exclusionResult の fieldStates を参照
  }
  // フィールド未登録の場合は、card-type から推論
  if (filters.cardType !== null) {
    const monsterOnlyFields = ['attribute', 'race', 'level-rank', 'link-value', 'link-marker', 'p-scale', 'atk', 'def'];
    if (monsterOnlyFields.includes(field) && filters.cardType !== 'monster') {
      return true;
    }
  }
  return false;
}
```

**メカニズム**:
- exclusionResult.fieldStates に登録なし → isFieldDisabled = false
- exclusionResult.fieldStates に enabled=false で登録 → isFieldDisabled = true

---

## 7. 実装結論

### 結論1: fieldToAttribute の役割は「属性」の制御

`fieldToAttribute` ルールは：
- **属性**の `required` フラグをセット（必須化）
- **属性**の `enabled` フラグをリセット（notTarget で無効化）
- **フィールド**の状態は直接変更しない

### 結論2: フィールド無効化は attributeToField で定義

フィールド無効化は：
- `attributeToField` ルールの `negative` で定義
- または、`fieldToAttribute` で target となった属性が無効化された時に自動無効化

### 結論3: 双方向制御には別途ルール定義が必要

`monster-type_link` が無効化 → `link-value`/`link-marker` が無効化されるには：

**必須**: attributeToField ルールに以下を追加
```json
{
  "title": "monster-type_link-negative-related",
  "trigger": "monster-type_link",
  "negative": ["link-value", "link-marker"]
}
```

---

## 8. 推奨修正

### アプローチA（推奨・最小限）

`search-exclusion-rules.json` の `attributeToField` に追加：

```json
{
  "title": "monster-type_link-disable-link-fields",
  "trigger": "monster-type_link",
  "negative": ["link-value", "link-marker"]
}
```

**効果**:
- monster-type_link が選択 → link-value/link-marker が無効化 ✓
- monster-type_link が無効化 → link-value/link-marker が有効化 ✓（自動）

### アプローチB（完全な bidirectional サポート）

エンジンとルール定義を拡張。将来の課題。

---

## 9. テストケース

以下のシナリオをテストすべき：

1. **link-value 入力 → monster-type_link 必須化**
2. **monster-type_link 選択 → link-value/link-marker 無効化** 
3. **monster-type_link 無効化 → link-value/link-marker も無効化** (現在未対応)
4. **level-rank 入力 → monster-type_link 無効化**
5. **monster-type_normal 選択 → monster-type_link 無効化 → link-value/link-marker 無効化**

