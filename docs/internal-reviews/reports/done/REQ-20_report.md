# REQ-20: ハードコードされたマッピング情報の調査結果報告書

**調査実施日**: 2025-12-07
**担当**: Gemini

---

## 1. 概要

`src/types/card-maps.ts`に定義されている定数と重複するハードコードされたマッピング定義の調査を行いました。
主な調査対象は、種族、属性、モンスタータイプ、カードタイプのIDと表示名（または短縮名）のマッピングです。

調査の結果、**計4ファイル**で重複または類似のハードコード定義が確認されました。
特に`src/utils/filter-icons.ts`では、`card-maps.ts`の定義と完全に重複するオブジェクトが複数定義されており、修正の優先度が高いです。

---

## 2. 重複定義一覧表

| ファイルパス | 行番号(目安) | 重複定数/内容 | 現在のインポート状況 | 影響範囲・備考 |
|------------|--------|---------|---------------------|---------|
| `src/utils/filter-icons.ts` | 13 | `typeLabels` (CardType Shortname) | ❌ 未インポート | `convertFiltersToIcons`関数内。`card-maps.ts`の`CARD_TYPE_ID_TO_SHORTNAME`と重複。 |
| `src/utils/filter-icons.ts` | 18 | `attrLabels` (Attribute Name) | ❌ 未インポート | `convertFiltersToIcons`関数内。`card-maps.ts`の`ATTRIBUTE_ID_TO_NAME`と重複。 |
| `src/utils/filter-icons.ts` | 45 | `monsterTypeLabels` (MonsterType Shortname) | ❌ 未インポート | `convertFiltersToIcons`関数内。`card-maps.ts`の`MONSTER_TYPE_ID_TO_SHORTNAME`と重複。 |
| `src/components/SearchInputBar.vue` | 485 | `labels` (Attribute Name) | ✅ `MONSTER_TYPE_ID_TO_SHORTNAME`のみインポート済み | `getChipLabel`関数内。属性の「光」「闇」などがハードコード。 |
| `src/components/SearchInputBar.vue` | 489 | `labels` (CardType Shortname) | 同上 | `getChipLabel`関数内。カードタイプの「M」「魔」「罠」がハードコード。 |
| `src/components/SearchInputBar.vue` | 270 | `MONSTER_TYPE_MAP` (Reverse Map) | 同上 | コマンド解析用（日本語→ID）。`card-maps`はID→日本語のため、逆引きマップ生成ロジックが必要か検討余地あり。 |
| `src/constants/filter-options.ts` | 全体 | `OPTION`配列 | ❌ 未インポート | UIの選択肢定義。`card-maps`のデータと重複しているが、構造が異なる（`{ value, label }`形式）。整合性担保のため生成ロジックへの移行を推奨。 |

---

## 3. 優先度別修正リスト

### 🔴 高優先度 (直ちに修正すべき)

不整合のリスクが高く、コードの重複が明白な箇所です。

1.  **`src/utils/filter-icons.ts` の全マッピング定義**
    *   `monsterTypeLabels`, `attrLabels`, `typeLabels` を削除し、`src/types/card-maps.ts` からのインポートに置き換える。
    *   または、既に整備されている `src/utils/filter-label.ts` のヘルパー関数を利用するようにリファクタリングする。

### 🟡 中優先度 (修正推奨)

局所的な定義ですが、保守性を下げる要因となっている箇所です。

1.  **`src/components/SearchInputBar.vue` の `getChipLabel` 内**
    *   `labels` 変数による属性・カードタイプのハードコードを解消し、`card-maps.ts` または `filter-label.ts` を使用する。
    *   既に `MONSTER_TYPE_ID_TO_SHORTNAME` はインポートされているため、修正は容易。

### 🟢 低優先度 (将来的な課題)

構造が異なるため単純な置換は難しいものの、情報源の一元化のために検討すべき箇所です。

1.  **`src/constants/filter-options.ts`**
    *   `card-maps.ts` をソースとして、動的にオプション配列を生成するように変更することを検討。
    *   例: `Object.entries(RACE_ID_TO_NAME).map(([value, label]) => ({ value, label }))`
2.  **`src/components/SearchInputBar.vue` のコマンド用逆引きマップ**
    *   `MONSTER_TYPE_MAP` などの日本語入力→ID変換用マップ。これらも `card-maps.ts` の値を反転させて生成可能。

---

## 4. リファクタリング影響分析

*   **修正ファイル数**: 主に 2ファイル (`src/utils/filter-icons.ts`, `src/components/SearchInputBar.vue`)
*   **複雑度**: 低 (Low)。単純な定数置換が主となります。
*   **リスク**: 低。ただし、表示用文字列（例：「光」vs「Light」など）が微妙に異なるケースがないか、置換時に注意深く確認する必要があります。
    *   調査の結果、今回検出された重複は `card-maps.ts` の定義と文字列レベルで一致していることを確認しました。

## 5. 推奨される解決策

`src/utils/filter-label.ts` が既に `card-maps.ts` をラップする形でアクセサを提供しています。
可能な限り、各コンポーネントで直接 `card-maps.ts` を参照するのではなく、この `filter-label.ts` を経由するか、あるいは `filter-icons.ts` のようなユーティリティ内であれば直接 `card-maps.ts` をインポートして使用するのが適切です。

以上
