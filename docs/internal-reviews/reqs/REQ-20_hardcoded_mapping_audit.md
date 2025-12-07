# REQ-20: ハードコードされたマッピング情報の調査と統合

**作成日**: 2025-12-07
**優先度**: 🟡 中
**ステータス**: 未着手
**担当**: 未定

---

## 背景

SearchInputBar.vueにおいて、`MONSTER_TYPE_ID_TO_SHORTNAME`が`card-maps.ts`に定義されているにも関わらず、ハードコードされた重複定義が存在していた。

```typescript
// SearchInputBar.vue（重複定義 - 修正済み）
const labels: Record<string, string> = {
  normal: '通', effect: '効', fusion: '融', ritual: '儀', synchro: 'S', xyz: 'X',
  pendulum: 'P', link: 'L', tuner: 'T', flip: 'R', toon: 'ト', spirit: 'ス',
  union: 'U', gemini: 'D', special: '特'
}

// filter-icons.ts（重複定義 - 未修正）
const monsterTypeLabels: Record<string, string> = {
  normal: '通', effect: '効', fusion: '融', ritual: '儀', synchro: 'S', xyz: 'X',
  // ...
}
```

このような重複定義が他にも存在する可能性が高い。

---

## 目的

1. `card-maps.ts`で定義されているマッピング定数のハードコード重複を全て洗い出す
2. 重複を排除し、`card-maps.ts`の定数を一元的に使用するようにリファクタリング
3. 今後の重複発生を防ぐガイドラインを策定する

---

## 調査対象のマッピング定数

`src/types/card-maps.ts`には以下の定数が定義されている：

### 1. 種族（Race）
- `RACE_ID_TO_INT`: 種族ID → 整数ID
- `RACE_ID_TO_NAME`: 種族ID → 日本語フルネーム（例: 'dragon' → 'ドラゴン族'）
- `RACE_ID_TO_SHORTNAME`: 種族ID → 日本語短名称（例: 'dragon' → '龍'）

### 2. 属性（Attribute）
- `ATTRIBUTE_ID_TO_INT`: 属性ID → 整数ID
- `ATTRIBUTE_ID_TO_NAME`: 属性ID → 日本語表示名（例: 'light' → '光'）
- `ATTRIBUTE_ID_TO_PATH`: 属性ID → HTMLパス（例: 'light' → 'light'）

### 3. モンスタータイプ（MonsterType）
- `MONSTER_TYPE_ID_TO_INT`: モンスタータイプID → 整数ID
- `MONSTER_TYPE_ID_TO_NAME`: モンスタータイプID → 日本語表示名（例: 'xyz' → 'エクシーズ'）
- `MONSTER_TYPE_ID_TO_SHORTNAME`: モンスタータイプID → 日本語短名称（例: 'xyz' → 'X'） ← 既に重複発見

### 4. 魔法効果タイプ（SpellEffectType）
- `SPELL_EFFECT_TYPE_ID_TO_INT`: 魔法効果タイプID → 整数ID
- `SPELL_EFFECT_TYPE_ID_TO_NAME`: 魔法効果タイプID → 日本語表示名
- `SPELL_EFFECT_TYPE_ID_TO_LABEL`: 魔法効果タイプID → ラベル
- `SPELL_EFFECT_TYPE_ID_TO_PATH`: 魔法効果タイプID → HTMLパス

### 5. 罠効果タイプ（TrapEffectType）
- `TRAP_EFFECT_TYPE_ID_TO_INT`: 罠効果タイプID → 整数ID
- `TRAP_EFFECT_TYPE_ID_TO_NAME`: 罠効果タイプID → 日本語表示名
- `TRAP_EFFECT_TYPE_ID_TO_LABEL`: 罠効果タイプID → ラベル
- `TRAP_EFFECT_TYPE_ID_TO_PATH`: 罠効果タイプID → HTMLパス

### 6. カードタイプ（CardType）
- `CARD_TYPE_ID_TO_INT`: カードタイプID → 整数ID
- `CARD_TYPE_ID_TO_NAME`: カードタイプID → 日本語表示名（例: 'monster' → 'モンスター'）
- `CARD_TYPE_ID_TO_SHORTNAME`: カードタイプID → 日本語短名称（例: 'monster' → 'M'）

---

## 調査方法

### Phase 1: 重複定義の検出

以下のパターンでハードコード定義を検索：

```bash
# 1. 種族の短名称（例: '龍', '魔使', '戦士' 等）
grep -r "['\"]\(龍\|魔使\|戦士\|機械\|悪魔\|天使\|不死\|獣戦\|植物\)" src/ --include="*.ts" --include="*.vue"

# 2. 属性の日本語名（例: '光', '闇', '水', '炎', '地', '風', '神'）
grep -r "light.*['\"]光['\"]|dark.*['\"]闇['\"]" src/ --include="*.ts" --include="*.vue"

# 3. モンスタータイプの短名称（例: 'xyz' → 'X', 'synchro' → 'S'）
grep -r "xyz.*['\"]X['\"]|synchro.*['\"]S['\"]" src/ --include="*.ts" --include="*.vue"

# 4. カードタイプの短名称（例: 'monster' → 'M', 'spell' → '魔', 'trap' → '罠'）
grep -r "monster.*['\"]M['\"]|spell.*['\"]魔['\"]|trap.*['\"]罠['\"]" src/ --include="*.ts" --include="*.vue"

# 5. オブジェクト形式のマッピング定義
grep -r "Record<string, string>.*=.*{" src/ --include="*.ts" --include="*.vue" | grep -E "(normal|effect|fusion|ritual|synchro|xyz|light|dark|dragon|warrior)"
```

### Phase 2: ファイル別の重複箇所リスト化

検出された各ファイルについて：
1. 該当行番号
2. 重複しているマッピング定数名
3. 使用箇所の数

### Phase 3: インポート状況の確認

各ファイルで既に`card-maps.ts`をインポートしているか確認：

```bash
grep -r "from.*card-maps" src/ --include="*.ts" --include="*.vue"
```

---

## 期待される成果物

### 1. 調査レポート（`docs/internal-reviews/reports/REQ-20_report.md`）

以下の情報を含むレポート：

#### A) 重複定義一覧表

| ファイルパス | 行番号 | 重複定数 | 現在のインポート状況 | 影響範囲 |
|------------|--------|---------|---------------------|---------|
| src/components/SearchInputBar.vue | 914-918 | MONSTER_TYPE_ID_TO_SHORTNAME | ✅ 修正済み | getChipLabel関数 |
| src/utils/filter-icons.ts | 44-48 | MONSTER_TYPE_ID_TO_SHORTNAME | ❌ 未インポート | convertFiltersToIcons関数 |
| ... | ... | ... | ... | ... |

#### B) 優先度別修正リスト

- **🔴 高優先度**: 複数箇所で使用され、不整合のリスクが高いもの
- **🟡 中優先度**: 1-2箇所のみで使用されているもの
- **🟢 低優先度**: 今後の拡張時に統合すべきもの

#### C) リファクタリング影響分析

- 修正が必要なファイル数
- 各修正の複雑度（簡単 / 中程度 / 複雑）
- テストカバレッジ状況

### 2. リファクタリングプラン（`docs/internal-reviews/plans/REQ-20_refactor_plan.md`）

段階的なリファクタリング計画：

- **Phase 1**: 高優先度の重複を修正
- **Phase 2**: 中優先度の重複を修正
- **Phase 3**: 低優先度の重複を修正
- **Phase 4**: テスト・ドキュメント整備

### 3. 開発ガイドライン更新（`CLAUDE.md` 追記）

今後の重複を防ぐためのルール：

```markdown
## マッピング定数の使用ルール

**禁止**: マッピング定数のハードコード

❌ 悪い例:
```typescript
const labels = { monster: 'M', spell: '魔', trap: '罠' }
```

✅ 良い例:
```typescript
import { CARD_TYPE_ID_TO_SHORTNAME } from '@/types/card-maps'
const label = CARD_TYPE_ID_TO_SHORTNAME[cardType]
```
```

---

## 既知の重複箇所

### 確認済み

1. **SearchInputBar.vue:914-918** - `MONSTER_TYPE_ID_TO_SHORTNAME` の重複 ✅ **修正済み**
2. **filter-icons.ts:44-48** - `MONSTER_TYPE_ID_TO_SHORTNAME` の重複 ❌ **未修正**

### 調査中

- 属性のマッピング（`ATTRIBUTE_ID_TO_NAME`）
- 種族の短名称（`RACE_ID_TO_SHORTNAME`）
- カードタイプの短名称（`CARD_TYPE_ID_TO_SHORTNAME`）
- 魔法・罠の効果タイプマッピング

---

## 作業見積もり

- **調査**: 1-2時間
- **レポート作成**: 1時間
- **リファクタリング**: 2-3時間（重複の数による）
- **テスト**: 1時間

**合計**: 5-7時間

---

## 備考

- この調査は、コードの保守性向上とバグ防止のために重要
- 特にモンスタータイプの「エクシーズ → エ」のような表示バグを防ぐため
- 多言語対応を進める上で、マッピングの一元管理は必須
