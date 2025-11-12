# マッピングテーブル生成スクリプト

遊戯王公式データベースの検索フォームから、全言語のカード種族・タイプマッピングテーブルを生成します。

## 使い方

### 全自動実行

```bash
npm run setup:all
```

これで以下の処理が自動実行されます：
1. 全10言語の検索フォームをダウンロード
2. HTMLからマッピングテーブルを抽出
3. `src/types/card-maps.ts` を生成

### 個別実行

#### 1. 検索フォームのダウンロード

```bash
npm run setup:download-forms
```

出力: `./tmp/search-form-{lang}.html` (10言語分)

#### 2. マッピング抽出

```bash
npm run setup:extract-mappings
```

出力:
- `./tmp/race-mappings-all.json`
- `./tmp/monster-type-mappings-all.json`

#### 3. card-maps.ts 生成

```bash
npm run setup:generate-card-maps
```

出力: `./src/types/card-maps.ts`

## 対応言語

- `ja` - 日本語
- `ko` - 한글 (韓国語)
- `ae` - English (Asia)
- `cn` - 簡体字 (中国語簡体字)
- `en` - English
- `de` - Deutsch (ドイツ語)
- `fr` - Français (フランス語)
- `it` - Italiano (イタリア語)
- `es` - Español (スペイン語)
- `pt` - Portugues (ポルトガル語)

## 注意事項

- 検索フォームのHTML構造が変更された場合、`extract-mappings.ts`の修正が必要になる可能性があります
- 生成される`card-maps.ts`は完全に自動生成されるため、手動で編集しないでください
