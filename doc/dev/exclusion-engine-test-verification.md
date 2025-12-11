# exclusion engine テスト検証ガイド

## 要件確認

このドキュメントは、実装の問題点を**コード分析のみ**で特定するためのガイドです。実際のブラウザ動作テストはしません。

---

## A. 現在の実装検証

### 検証1: fieldToAttribute が fieldStates に直接反映されないことの確認

**ファイル**: `search-exclusion-engine.ts`

```typescript
// line 101-195: applyFieldToAttribute()
function applyFieldToAttribute(...): boolean {
  let changed = false;

  for (const rule of rules.fieldToAttribute) {
    // ... triggerItems チェック ...

    // ★ ここで attributeStates を変更
    if (rule.target) {
      for (const attr of rule.target) {
        let attrState = result.attributeStates.get(attr);
        // ... attrState.required = true, attrState.selected = true ...
      }
    }

    if (rule.notTarget) {
      for (const attr of rule.notTarget) {
        let attrState = result.attributeStates.get(attr);
        // ... attrState.enabled = false ...
      }
    }

    // ★ fieldStates への変更は**一切ない**
    // 対応箇所なし
  }

  return changed;
}
```

**確認項目**:
- [ ] applyFieldToAttribute() が `result.fieldStates` に対して何もしていないことを確認
- [ ] fieldStates への変更は applyAttributeToField() でのみ行われることを確認

---

## B. フィールド無効化メカニズムの検証

### 検証2: attributeToField ルールの動作確認

**ファイル**: `search-exclusion-engine.ts` 行 321-355

```typescript
// Part 1: 属性が選択/必須の場合
for (const rule of rules.attributeToField) {
  const attrState = result.attributeStates.get(rule.trigger);

  // ★ クリティカル条件
  const shouldApplyToField = attrState && attrState.selected &&
    (state.monsterTypeMode === 'and' || attrState.required);

  if (shouldApplyToField) {
    for (const field of rule.negative) {
      fieldState.enabled = false;  // ← fieldStates が変更される
    }
  }
}
```

**確認項目**:
- [ ] `attrState.selected = true` の場合のみ `negative` フィールドが無効化されることを確認
- [ ] `attrState.selected = false` の場合は無効化されないことを確認
- [ ] ORモードで `attrState.required = false` の場合は無効化されないことを確認

### 検証3: 必須属性が無効化された場合のフィールド無効化

**ファイル**: `search-exclusion-engine.ts` 行 358-407

```typescript
// Part 2: 必須属性が無効化された場合
for (const [attr, attrState] of result.attributeStates) {
  if (attrState.enabled) continue;  // ← 無効な属性だけ処理

  // ★ ここが重要: target にのみ対応
  const requiresThisAttr = rules.fieldToAttribute.filter((r) =>
    r.target?.includes(attr)  // ← target を見ている
  );

  for (const req of requiresThisAttr) {
    for (const fieldPattern of req.triggerItems) {
      // ... fieldState.enabled = false ...
    }
  }
}
```

**確認項目**:
- [ ] `target` に含まれる属性が無効化 → triggerItems が自動無効化されることを確認
- [ ] `notTarget` に含まれる属性の場合は処理されないことを確認（未実装）
- [ ] ワイルドカードマッチングが正常に動作することを確認

---

## C. ルール定義の検証

### 検証4: 既存ルール定義の確認

**ファイル**: `search-exclusion-rules.json`

```json
// fieldToAttribute ルール
[
  {
    "title": "monster-type_link-necessary",
    "triggerItems": ["link-value", "link-marker"],
    "target": ["monster-type_link"]
  },
  {
    "title": "monster-type_has-level-rank-necessary",
    "triggerItems": ["level-rank", "def"],
    "notTarget": ["monster-type_link"]
  }
]

// attributeToField ルール
[
  {
    "title": "monster-type_link-negative",
    "trigger": "monster-type_link",
    "negative": ["def", "level-rank"]
  }
]
```

**確認項目**:
- [ ] `monster-type_link` が target の FieldToAttribute ルールが存在することを確認
- [ ] `monster-type_link` を trigger とする AttributeToField ルールが存在することを確認
  - ただし、`negative` に `["link-value", "link-marker"]` は**含まれていない**（これが問題）
- [ ] notTarget ルールが存在することを確認

### 検証5: notTarget ルールの reverse 未実装確認

**確認項目**:
- [ ] `applyAttributeToField()` の Part 2 が `notTarget` を処理していないことを確認
- [ ] これが設計上の意図（notTarget の reverse ロジックは複雑）であることを確認

---

## D. UI 反映の検証

### 検証6: useFilterLogic での isFieldDisabled() の動作

**ファイル**: `src/composables/search-filter/useFilterLogic.ts` 行 184-206

```typescript
function isFieldDisabled(field: string): boolean {
  // ★ exclusionResult.fieldStates を参照
  const fieldState = exclusionResult.value.fieldStates.get(field);
  if (fieldState) {
    return !fieldState.enabled;  // ← fieldStates に登録あり → それを使う
  }
  // fieldStates に未登録の場合は card-type から推論
  return false;
}
```

**確認項目**:
- [ ] `fieldStates` に登録されているフィールドは `enabled` フラグで判定されることを確認
- [ ] `fieldStates` に未登録のフィールドは `card-type` から推論されることを確認

### 検証7: FilterTab.vue での disabled バインディング

**ファイル**: `src/components/search-filter/FilterTab.vue`

```vue
<!-- line 236-237: リンクタブ -->
<button
  class="level-tab"
  :disabled="isFieldDisabled('link-value') || isFieldDisabled('link-marker')"
  @click="setLevelType('link')"
>
  リンク
</button>

<!-- line 304-305: リンク数ボタン -->
<button
  :disabled="isFieldDisabled('link-value')"
  @click="toggleLinkValue(num)"
>
  {{ num }}
</button>
```

**確認項目**:
- [ ] `isFieldDisabled()` が正しく呼び出されていることを確認
- [ ] 複数フィールドの OR 判定が実装されていることを確認

---

## E. 問題点の確認

### 検証8: monster-type_link 無効化時の link-value/link-marker の状態

**問題シナリオ**:
1. ユーザーが `link-value` に入力
2. `monster-type_link` が必須化される
3. ユーザーが `monster-type_normal` を選択
4. `monster-type_link` が無効化される
5. **期待**: `link-value`, `link-marker` も無効化される
6. **実装**: `link-value`, `link-marker` は有効なままになる可能性

**コード検証**:

```typescript
// applyAttributeToField() Part 2

for (const [attr, attrState] of result.attributeStates) {
  if (attrState.enabled) continue;  // monster-type_link は disabled なのでOK

  // ★ monster-type_link が target の FieldToAttribute ルール を探す
  const requiresThisAttr = rules.fieldToAttribute.filter((r) =>
    r.target?.includes(attr)  // 'target' に 'monster-type_link' を含むルール
  );

  // 該当ルール: "monster-type_link-necessary"
  //   triggerItems: ["link-value", "link-marker"]
  // ★ これらが自動無効化される

  for (const req of requiresThisAttr) {
    for (const fieldPattern of req.triggerItems) {
      // link-value, link-marker を無効化
      fieldState.enabled = false;
    }
  }
}
```

**確認項目**:
- [ ] `"monster-type_link-necessary"` が target に `["monster-type_link"]` を持つことを確認
- [ ] Part 2 で this rule が処理されることを確認
- [ ] `link-value`, `link-marker` が自動無効化されることを確認

**もし無効化されない場合**:
- [ ] `fieldInputs` に `link-value`/`link-marker` が登録されていないことを確認
  → `toSearchConditionState()` で登録されるはず（line 51-52）

---

## F. テスト シナリオと検証項目

### テスト T1: link-value 入力

**手順**:
1. フィルタダイアログを開く
2. link タブで link-value に値を入力
3. state を確認

**検証項目**:
- [ ] `fieldInputs['link-value'] = true`
- [ ] `attributeStates['monster-type_link'].required = true`
- [ ] `attributeStates['monster-type_link'].selected = true`
- [ ] `fieldStates['link-value'].enabled = true` (有効なまま)
- [ ] `fieldStates['level-rank'].enabled = false` (無効化される)

**コード確認**:
```typescript
// line 51-52 in search-exclusion-adapter.ts
const fieldInputs: Record<string, boolean> = {
  'link-value': filters.linkValues.length > 0,  // ← ここで登録
  'link-marker': filters.linkMarkers.length > 0,
  // ...
};
```

---

### テスト T2: monster-type_normal 選択→link 無効化

**手順**:
1. link-value に入力した状態で
2. モンスタータイプで normal を選択
3. monster-type_link の状態を確認

**検証項目**:
- [ ] `attributeStates['monster-type_link'].enabled = false`
- [ ] `fieldStates['link-value'].enabled = false` (自動無効化)
- [ ] `fieldStates['link-marker'].enabled = false` (自動無効化)

**検証方法**:
```typescript
// applyAttributeToField() Part 2 をトレース

// 入力: monster-type_link が disabled になった

const requiresThisAttr = rules.fieldToAttribute.filter((r) =>
  r.target?.includes("monster-type_link")
);
// 結果: ["monster-type_link-necessary"] が該当

// このルールの triggerItems を無効化
for (const req of requiresThisAttr) {  // req = monster-type_link-necessary
  for (const fieldPattern of req.triggerItems) {  // ["link-value", "link-marker"]
    // fieldState.enabled = false ← ここで無効化される
  }
}
```

---

### テスト T3: level-rank 入力

**手順**:
1. レベル/ランクタブで値を入力
2. 属性状態を確認

**検証項目**:
- [ ] `fieldInputs['level-rank'] = true`
- [ ] `attributeStates['monster-type_link'].enabled = false` (notTarget で無効化)
- [ ] `fieldStates['link-value']` は？ ← **不確定**
- [ ] `fieldStates['link-marker']` は？ ← **不確定**

**問題**: notTarget の reverse が未実装なため、link-value/link-marker の状態が不確定

---

## G. 推奨修正確認

### 修正案: attributeToField に新規ルール追加

**提案**:
```json
{
  "title": "monster-type_link-disable-link-fields",
  "trigger": "monster-type_link",
  "negative": ["link-value", "link-marker"]
}
```

**期待される効果**:
- `monster-type_link` が selected かつ有効 → `link-value`, `link-marker` が無効化（Part 1）
- `monster-type_link` が disabled → （既存の Part 2 で自動無効化されるはず）

**確認項目**:
- [ ] 既に `"monster-type_link-necessary"` で Part 2 無効化が起きるため、このルールは冗長か？
- [ ] 念のため追加しておくべきか？

---

## H. デバッグ用ログ追加

### 推奨デバッグロケーション

**ファイル**: `search-exclusion-engine.ts`

```typescript
// line 156-157: fieldToAttribute のトレース
if (enableTrace) {
  result.trace!.push({
    step: iteration,
    action: 'field-to-attribute',
    source: rule.triggerItems.join(','),
    target: attr,
    reason: `${rule.title}: ...`,
  });
}

// line 395-401: attributeToField Part 2 のトレース
if (enableTrace) {
  result.trace!.push({
    step: iteration,
    action: 'attribute-unavailable-to-field',
    source: attr,
    target: field,
    reason: '必須属性が選択不可',
  });
}
```

**デバッグ実行例**:
```typescript
const result = inferExclusions(state, rules, true);  // enableTrace=true
console.log('Inference trace:', result.trace);
console.log('Field states:', result.fieldStates);
console.log('Attribute states:', result.attributeStates);
```

---

## I. 最終チェックリスト

### 実装面での確認

- [ ] fieldToAttribute が attributeStates のみ変更することを確認
- [ ] attributeToField Part 1 で negative フィールドが無効化されることを確認
- [ ] attributeToField Part 2 で必須属性の無効化が伝播することを確認
- [ ] notTarget の reverse が未実装であることを確認（設計意図）

### ルール定義での確認

- [ ] `monster-type_link-necessary` が target に `["monster-type_link"]` を含むことを確認
- [ ] `monster-type_link-negative` が negative に `["def", "level-rank"]` を含むことを確認
- [ ] `monster-type_link-negative` に `["link-value", "link-marker"]` が**含まれていない**ことを確認

### UI 動作での確認

- [ ] FilterTab.vue が `isFieldDisabled()` を正しく呼び出していることを確認
- [ ] useFilterLogic.ts が `exclusionResult.fieldStates` を参照していることを確認

### 修正実装での確認

- [ ] 新しい attributeToField ルールが不要か必要か判定する
- [ ] notTarget reverse の実装が必要か判定する

