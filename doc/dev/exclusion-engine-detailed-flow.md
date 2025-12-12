# exclusion engine メカニズム - 詳細フロー図

## A. 推論エンジンの全体フロー

```
入力: SearchFilters (ユーザーの選択)
   ↓
toSearchConditionState() で変換
   ├─ selectedAttributes: Set<string>  ← 直接選択した属性
   ├─ fieldInputs: Record<string, boolean>  ← 各フィールドに入力があるか
   └─ monsterTypeMode: 'and' | 'or'
   ↓
inferExclusions() で推論実行
   ├─ [Iteration 1]
   │  ├─ applyFieldToAttribute()  ← 項目→属性の決定性
   │  ├─ applyAttributeExclusion()  ← 属性同士の排他
   │  └─ applyAttributeToField()  ← 属性→項目の無効化
   │  ↓
   │  (変化があれば次のiterationへ)
   │
   ├─ [Iteration 2...]
   │  (同じフロー、変化なければ収束)
   │
   └─ detectConflicts()  ← 矛盾検出
   ↓
ExclusionResult を返す
   ├─ attributeStates: Map<string, AttributeState>
   │  └─ 各属性の enabled, required, selected, disabledReason
   └─ fieldStates: Map<string, FieldState>
      └─ 各フィールドの enabled, hasInput, disabledReason
   ↓
UI (useFilterLogic, FilterTab) で反映
   ├─ isFieldDisabled(field) で button :disabled を制御
   └─ getFieldDisabledReason(field) で tooltip を表示
```

---

## B. applyFieldToAttribute() の詳細フロー

**ファイル**: `search-exclusion-engine.ts` 行 101-195

```
Input: 
  - state.fieldInputs: { 'link-value': true, ... }
  - rules.fieldToAttribute: FieldToAttributeRule[]

Output:
  - result.attributeStates に変更を反映

Process:

for each rule in rules.fieldToAttribute:
  │
  ├─ 1. トリガーチェック
  │  │
  │  ├─ rule.triggerItems = ["link-value", "link-marker"]
  │  ├─ 各項目について state.fieldInputs をチェック
  │  │  ├─ fieldInputs['link-value'] = true  → トリガーON
  │  │  └─ fieldInputs['link-marker'] = false → (1つでもtrueでOK)
  │  │
  │  └─ hasInput = true ・・・if (!hasInput) continue
  │
  ├─ 2. target 属性の必須化
  │  │
  │  ├─ if (rule.target) {
  │  │    rule.target = ["monster-type_link"]
  │  │
  │  │    for each attr in rule.target:
  │  │      attrState.required = true  ← 必須フラグを立てる
  │  │      attrState.selected = true  ← (有効な場合のみ)
  │  │      changed = true
  │  │  }
  │  │
  │  └─ ★ この時点で attributeStates のみ変更
  │       fieldStates は変更なし
  │
  └─ 3. notTarget 属性の無効化
     │
     ├─ if (rule.notTarget) {
     │    rule.notTarget = ["monster-type_normal"]
     │
     │    for each attr in rule.notTarget:
     │      attrState.enabled = false  ← 無効化
     │      attrState.selected = false
     │      attrState.disabledReason = "..."
     │      changed = true
     │  }
     │
     └─ ★ やはり attributeStates のみ変更

Return: changed (boolean) ← true なら次のステップを実行
```

**重要ポイント**:
1. フィールド（fieldInputs）からトリガー
2. しかし変更対象は属性（attributeStates）
3. フィールド状態（fieldStates）は**直接変更されない**

---

## C. applyAttributeToField() の詳細フロー

**ファイル**: `search-exclusion-engine.ts` 行 311-410

```
Input:
  - result.attributeStates: Map<string, AttributeState>  ← 前ステップで更新済み
  - rules.attributeToField: AttributeToFieldRule[]

Output:
  - result.fieldStates に変更を反映

Process:

Part 1: 属性が選択/必須の場合の無効化
┌──────────────────────────────────────
│
├─ for each rule in rules.attributeToField:
│  │
│  ├─ rule.trigger = "monster-type_link"
│  ├─ rule.negative = ["def", "level-rank"]
│  │
│  ├─ 1. trigger 属性の状態をチェック
│  │  │
│  │  ├─ attrState = result.attributeStates.get("monster-type_link")
│  │  │
│  │  ├─ 条件判定:
│  │  │  ├─ attrState.selected = true  ←  ユーザーが選択した OR fieldToAttribute で必須化
│  │  │  ├─ AND (state.monsterTypeMode === 'and' OR attrState.required)
│  │  │  │  └─ ANDモード: 常に true
│  │  │  │  └─ ORモード: 必須属性（required=true）の場合のみ
│  │  │  └─ shouldApplyToField = true
│  │  │
│  │  └─ ★ クリティカル: selected = true かつ有効属性の場合のみ
│  │
│  ├─ 2. negative フィールドを無効化
│  │  │
│  │  ├─ for each field in rule.negative:
│  │  │    fieldState.enabled = false
│  │  │    fieldState.disabledReason = "..."
│  │  │    changed = true
│  │  │
│  │  └─ ★ このステップでやっと fieldStates が変更される
│  │
│  └─ end for
│
└──────────────────────────────────────

Part 2: 必須属性が無効化された場合のフィールド無効化
┌──────────────────────────────────────
│
├─ for each [attr, attrState] of result.attributeStates:
│  │
│  ├─ if (attrState.enabled) continue  ← 有効なら飛ばす（無効なものだけ処理）
│  │
│  ├─ 1. この属性を target とする fieldToAttribute ルール を探す
│  │  │
│  │  ├─ requiresThisAttr = rules.fieldToAttribute.filter((r) =>
│  │  │    r.target?.includes(attr)
│  │  │  )
│  │  │  ├─ 例: attr = "monster-type_link" (disabled)
│  │  │  ├─ → rule.target に ["monster-type_link"] を含む
│  │  │  └─ → "monster-type_link-necessary" ルールが該当
│  │  │
│  │  └─ ★ ここが重要: target にのみ対応（notTarget は非対応）
│  │
│  ├─ 2. 該当ルールの triggerItems を無効化
│  │  │
│  │  ├─ for each req of requiresThisAttr:
│  │  │    for each fieldPattern of req.triggerItems:
│  │  │      rule.triggerItems = ["link-value", "link-marker"]
│  │  │      → これらフィールドを無効化
│  │  │      fieldState.enabled = false
│  │  │      fieldState.disabledReason = "..."
│  │  │      changed = true
│  │  │
│  │  └─ ★ これで「必須属性の無効化 → フィールド無効化」が実現
│  │
│  └─ end for
│
└──────────────────────────────────────

Return: changed (boolean)
```

**クリティカルポイント**:
1. Part 1: `selected = true` かつ `trigger` 属性が有効な場合のみ `negative` フィールドが無効化
2. Part 2: `target` に含まれる属性が無効化 → `triggerItems` が自動無効化される
3. **Part 2 は `target` にのみ対応**。`notTarget` は**未対応**

---

## D. 具体的なシナリオ分析

### シナリオ1: ユーザーが link-value に入力

```
状態遷移図:

[状態0]
├─ fieldInputs: { 'link-value': true, 'monster-type_link': not selected }
├─ attributeStates: { 'monster-type_link': { enabled: true, required: false, selected: false } }
└─ fieldStates: { 'link-value': { enabled: true, hasInput: true } }

↓ applyFieldToAttribute() iteration 1
rule: "monster-type_link-necessary"
 - triggerItems: ["link-value", "link-marker"]
 - target: ["monster-type_link"]
 action: monster-type_link を required=true, selected=true に

[状態1]
├─ attributeStates: { 'monster-type_link': { enabled: true, required: true, selected: true } }  ← 変更
├─ fieldStates: { 'link-value': { enabled: true, hasInput: true } }  ← 変更なし
└─ 結果: link-value は **有効なまま**

↓ applyAttributeExclusion() iteration 1
group: "monster-type-near-extra"
 items: ["monster-type_fusion", ..., "monster-type_link", "monster-type_normal"]
 activeAttrs: ["monster-type_link"] (required=true)
 action: グループ内の他を無効化

[状態2]
├─ attributeStates: {
│    'monster-type_link': { enabled: true, required: true, selected: true },
│    'monster-type_normal': { enabled: false }  ← 変更
│  }
└─ fieldStates: { 'link-value': { enabled: true } }  ← 変更なし

↓ applyAttributeToField() iteration 1 (Part 1)
rule: "monster-type_link-negative"
 - trigger: "monster-type_link" (selected=true, enabled=true)
 - negative: ["def", "level-rank"]
 action: def, level-rank を無効化

[状態3]
├─ attributeStates: {
│    'monster-type_link': { enabled: true, required: true, selected: true },
│    'monster-type_normal': { enabled: false }
│  }
├─ fieldStates: {
│    'link-value': { enabled: true },  ← **この時点でも有効**
│    'link-marker': { enabled: true },  ← **この時点でも有効**
│    'def': { enabled: false },  ← 変更
│    'level-rank': { enabled: false }  ← 変更
│  }
└─ ★ 問題: link-value/link-marker は有効なまま

↓ applyAttributeToField() iteration 1 (Part 2)
attr: "monster-type_normal" (enabled=false)
 action: target に "monster-type_normal" を含む FieldToAttribute ルール を探す
         → 該当するルールなし
         → link-value/link-marker は処理されない

[最終状態]
└─ link-value, link-marker は **有効なままで確定**

★ 結論: link-value が入力 → monster-type_link が必須化されても、
        link-value 自体は無効化されない
```

### シナリオ2: ユーザーが monster-type_link を選択した後、monster-type_normal を選択

```
状態遷移図:

[状態0]（シナリオ1の最終状態から続く）
├─ attributeStates: {
│    'monster-type_link': { enabled: true, required: true, selected: true },
│    'monster-type_normal': { enabled: false }
│  }
├─ fieldStates: {
│    'link-value': { enabled: true },
│    'link-marker': { enabled: true },
│    'level-rank': { enabled: false }
│  }

↓ ユーザーが monster-type_normal を選択（monster-type_link を選択解除）
selectedAttributes から "monster-type_link" が削除される

↓ applyFieldToAttribute() iteration N
rule: "monster-type_link-necessary"
 - triggerItems: ["link-value", "link-marker"]
 - trigger check: fieldInputs['link-value'] = true → トリガーON
 - action: monster-type_link を required=true に（すでに設定済み）

↓ applyAttributeExclusion() iteration N
group: "monster-type-near-extra"
 activeAttrs: ["monster-type_normal"] (required=false, selected=true)
 action: グループ内の他を無効化 → monster-type_link を enabled=false に

[状態N]
├─ attributeStates: {
│    'monster-type_link': { enabled: false, required: true },  ← 変更！
│    'monster-type_normal': { enabled: true, selected: true }
│  }

↓ applyAttributeToField() Part 2
attr: "monster-type_link" (enabled=false, required=true)
 action: target に "monster-type_link" を含む FieldToAttribute ルール を探す
         rule: "monster-type_link-necessary"
         triggerItems: ["link-value", "link-marker"]
         → これらを無効化

[最終状態]
├─ fieldStates: {
│    'link-value': { enabled: false },  ← ★ 自動無効化！
│    'link-marker': { enabled: false }  ← ★ 自動無効化！
│  }
└─ ★ 成功: 必須属性が無効化 → フィールドも自動無効化
```

---

## E. 問題: notTarget の reverse が機能しないケース

```
ルール定義:
{
  "title": "monster-type_has-level-rank-necessary",
  "triggerItems": ["level-rank", "def"],
  "notTarget": ["monster-type_link"]
}

期待する動作:
1. level-rank に入力 → monster-type_link を無効化 ✓
2. monster-type_link が無効化 → level-rank は... 何もしない（notTarget の意図）

実装されている動作:
┌─────────────────────────────────────
│ Part 2: 必須属性が無効化された場合
│
│ attr = "monster-type_link" (enabled=false)
│ 
│ requiresThisAttr = rules.fieldToAttribute.filter((r) =>
│   r.target?.includes("monster-type_link")  ← target にのみ対応
│ )
│
│ notTarget については **何もしない**
│
│ ★ 理由: notTarget の reverse ロジックが複雑
│    - notTarget は「このフィールド入力時に選択不可」
│    - reverse は「属性無効化時に何をする？」→ 明確でない
└─────────────────────────────────────

現在の問題:
- notTarget を持つルールの逆向きが未実装
- しかし、ほぼ影響なし（target で十分対応可能）
```

---

## F. 解決方法の比較

### 問題: monster-type_link が無効化 → link-value/link-marker も無効化したい

#### 方法1: 新しい attributeToField ルール（推奨）

```json
{
  "title": "monster-type_link-disable-link-fields",
  "trigger": "monster-type_link",
  "negative": ["link-value", "link-marker"]
}
```

**フロー**:
```
monster-type_link が無効化
  ↓
applyAttributeToField() Part 1
 - trigger: "monster-type_link" (enabled=false)
 - shouldApplyToField = false (無効な属性だから)
 - 何もしない

なぜなら: shouldApplyToField = attrState.selected && ...
         enabled=false な属性は selected でも無視される

↓ 別の経路で無効化?
applyAttributeToField() Part 2 は...
 - monster-type_link が target な FieldToAttribute ルールを探す
 - 既存: "monster-type_link-necessary" (triggerItems: [link-value, link-marker])
 - ★ これで link-value/link-marker が無効化される ✓

結論: 既存の "monster-type_link-necessary" ルールで自動無効化される
      追加の attributeToField ルールは不要
```

**注意**: 上記の分析が正確か再検証が必要

#### 方法2: notTarget を避けて target のみを使う

```json
{
  "title": "monster-type_has-level-rank-necessary",
  "triggerItems": ["level-rank", "def"],
  "target": ["monster-type_non-link"]  ← 新しい属性を作る
}
```

**課題**: "monster-type_non-link" という属性を管理する必要がある

#### 方法3: エンジン改善（将来）

notTarget の reverse ロジックを実装。複雑なため後回し。

---

## G. テスト図

```
テストシナリオツリー:

[T1] link-value 入力後の状態
├─ A. monster-type_link は required=true ？ ✓
├─ B. monster-type_link は selected=true ？ ✓
├─ C. link-value は enabled=true ？ ✓
├─ D. level-rank は enabled=false ？ ✓
└─ E. link-value が enabled=false で上書きされていないか？ ✓

[T2] monster-type_link を選択後の状態
├─ A. level-rank は enabled=false ？
├─ B. link-value は enabled=true ？（ユーザーが入力していれば）
├─ C. link-marker は enabled=true ？
└─ D. def は enabled=false ？

[T3] monster-type_normal を選択（link を除外）後の状態
├─ A. monster-type_link は enabled=false ？
├─ B. link-value は enabled=false ？  ← 自動無効化されるはず
├─ C. link-marker は enabled=false ？  ← 自動無効化されるはず
├─ D. level-rank は enabled=true ？
└─ E. def は enabled=true ？

[T4] level-rank に入力後の状態
├─ A. monster-type_link は enabled=false ？
├─ B. link-value は enabled=true or false ？  ← 確認すべき
├─ C. link-marker は enabled=true or false ？  ← 確認すべき
├─ D. level-rank は enabled=true ？
└─ E. def は enabled=true ？
```

