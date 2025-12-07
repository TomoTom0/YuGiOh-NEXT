# REQ-20 リファクタリング計画

**作成日**: 2025-12-07
**関連**: [調査レポート](../reports/REQ-20_report.md)

---

## Phase 1: 高優先度の重複解消 (`src/utils/filter-icons.ts`)

`src/utils/filter-icons.ts` は `SearchFilters` をアイコン配列に変換するユーティリティですが、内部でマッピングを再定義しています。これを `card-maps.ts` の利用に切り替えます。

### 手順

1.  `src/utils/filter-icons.ts` に以下のインポートを追加する。
    ```typescript
    import {
      CARD_TYPE_ID_TO_SHORTNAME,
      ATTRIBUTE_ID_TO_NAME,
      MONSTER_TYPE_ID_TO_SHORTNAME
    } from '@/types/card-maps'
    ```
2.  `convertFiltersToIcons` 関数内のローカル変数 `typeLabels`, `attrLabels`, `monsterTypeLabels` を削除する。
3.  それぞれの参照箇所をインポートした定数への参照に変更する。
    *   `typeLabels` -> `CARD_TYPE_ID_TO_SHORTNAME`
    *   `attrLabels` -> `ATTRIBUTE_ID_TO_NAME`
    *   `monsterTypeLabels` -> `MONSTER_TYPE_ID_TO_SHORTNAME`

## Phase 2: 中優先度の重複解消 (`src/components/SearchInputBar.vue`)

`SearchInputBar.vue` の `getChipLabel` 関数内にある重複を解消します。

### 手順

1.  `src/components/SearchInputBar.vue` のインポートに以下を追加（既存のインポートに追加）。
    ```typescript
    import {
      MONSTER_TYPE_ID_TO_SHORTNAME, // 既存
      CARD_TYPE_ID_TO_SHORTNAME,   // 追加
      ATTRIBUTE_ID_TO_NAME         // 追加
    } from '../types/card-maps'
    ```
2.  `getChipLabel` 関数内の `case 'attributes':` ブロック:
    *   フォールバック部分のハードコードされた `labels` オブジェクトを削除し、`ATTRIBUTE_ID_TO_NAME` を使用する。
3.  `getChipLabel` 関数内の `case 'cardType':` ブロック:
    *   `labels` オブジェクトを削除し、`CARD_TYPE_ID_TO_SHORTNAME` を使用する。

## Phase 3: テストと検証

1.  ビルド (`npm run build` または `vue-tsc`) を実行し、型エラーがないことを確認する。
2.  アプリケーションを起動し、検索フィルターのチップ表示（特に属性、カードタイプ、モンスタータイプ）が以前通り正しく表示されるか確認する。
    *   例: 属性フィルターで「光」と表示されるか。
    *   例: カードタイプで「M」「魔」「罠」と表示されるか。
    *   例: モンスタータイプで「S」「X」などの短縮形が表示されるか。

## 今後の課題 (Phase 4以降)

*   `src/constants/filter-options.ts` の定数を `card-maps.ts` から生成するようにリファクタリング。
*   `SearchInputBar.vue` のコマンド解析用逆引きマップの共通化。
