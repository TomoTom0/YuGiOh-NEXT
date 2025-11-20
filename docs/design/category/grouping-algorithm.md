# カテゴリのグループ判定アルゴリズム

## 概要

デッキ検索画面のカテゴリを50音順グループに自動分類するアルゴリズム。

## データ構造

```typescript
interface CategoryEntry {
  value: string;        // 内部値（例: "4", "517"）
  label: string;        // 表示名（例: "アクアアクトレス"）
  originalIndex: number; // オリジナルの並び順（公式順）
  group: string[];      // 所属グループ（複数可）例: ["ruby_ア"] or ["ruby_レ", "ruby_ロ", "ruby_ワ"]
}
```

## 並び順の規則

### オリジナル順序
公式のデッキ検索画面での並び順を保持。王家の神殿が先頭。

### 50音順ルール

1. **濁点は清音の直後**
   - カ → ガ → キ → ギ → ク → グ...

2. **拗音は普通の文字として扱う**
   - シ → シャ → シュ → ショ → ス...

3. **具体例**
   ```
   シカ, シマ, 釈迦, しら, 時価, 砂利, スシ
   ```

## グループ判定アルゴリズム

### ルール1: 最初のカテゴリ（王家の神殿）

```typescript
// 先頭は常に ruby_オ
categories[0].group = ['ruby_オ'];
```

### ルール2: 次の要素

```typescript
// 2番目は常に ruby_ア
categories[1].group = ['ruby_ア'];
```

### ルール3: 一文字目がひらがな/カタカナ

その文字を使用（カタカナに統一）

```typescript
const firstChar = label[0];

if (isHiragana(firstChar)) {
  // ひらがな → カタカナに変換
  const katakana = hiraganaToKatakana(firstChar);
  group = [`ruby_${katakana}`];
}
else if (isKatakana(firstChar)) {
  // カタカナ → そのまま使用
  group = [`ruby_${firstChar}`];
}
```

**例**:
- 「アーティファクト」→ `['ruby_ア']`
- 「しらぬい」→ `['ruby_シ']`
- 「ヴァレット」→ `['ruby_ヴ']`

### ルール4: 漢字等で読みが不明な場合

前後を探索して読みが自明なものを探し、その間のグループすべてに所属。

#### アルゴリズム

```typescript
function determineGroupForKanji(
  index: number,
  categories: CategoryEntry[]
): string[] {
  // 前方を探索（読みが自明な要素を探す）
  let prevGroup: string | null = null;
  for (let i = index - 1; i >= 0; i--) {
    const prevLabel = categories[i].label;
    const firstChar = prevLabel[0];
    
    if (isKanaReadable(firstChar)) {
      prevGroup = getKanaGroup(firstChar);
      break;
    }
  }
  
  // 後方を探索（読みが自明な要素を探す）
  let nextGroup: string | null = null;
  for (let i = index + 1; i < categories.length; i++) {
    const nextLabel = categories[i].label;
    const firstChar = nextLabel[0];
    
    if (isKanaReadable(firstChar)) {
      nextGroup = getKanaGroup(firstChar);
      break;
    }
  }
  
  // グループを決定
  if (prevGroup && nextGroup && prevGroup === nextGroup) {
    // 前後が同じ → 同じグループ
    return [prevGroup];
  }
  else if (prevGroup && nextGroup && prevGroup !== nextGroup) {
    // 前後が異なる → その間のすべてのグループ
    return getGroupsBetween(prevGroup, nextGroup);
  }
  else if (prevGroup) {
    // 前のみ判明 → 前と同じ
    return [prevGroup];
  }
  else if (nextGroup) {
    // 後のみ判明 → 後と同じ
    return [nextGroup];
  }
  else {
    // 不明 → その他
    return ['ruby_その他'];
  }
}
```

#### getGroupsBetween の実装

50音順でグループの間にあるすべてのグループを返す。

```typescript
function getGroupsBetween(start: string, end: string): string[] {
  const kanaOrder = [
    'ア', 'カ', 'サ', 'タ', 'ナ',
    'ハ', 'マ', 'ヤ', 'ラ', 'ワ'
  ];
  
  // ruby_ プレフィックスを除去
  const startKana = start.replace('ruby_', '');
  const endKana = end.replace('ruby_', '');
  
  const startIndex = kanaOrder.indexOf(startKana);
  const endIndex = kanaOrder.indexOf(endKana);
  
  if (startIndex === -1 || endIndex === -1) {
    return [start, end];
  }
  
  const result: string[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    result.push(`ruby_${kanaOrder[i]}`);
  }
  
  return result;
}
```

**例**:
- 前が `ruby_レ`、後が `ruby_ワ` → `['ruby_レ', 'ruby_ロ', 'ruby_ワ']`
- 前が `ruby_カ`、後が `ruby_サ` → `['ruby_カ', 'ruby_サ']`
- 前が `ruby_ア`、後が `ruby_タ` → `['ruby_ア', 'ruby_カ', 'ruby_サ', 'ruby_タ']`

## 実装の流れ

1. デッキ検索画面からカテゴリリストを取得
2. originalIndex を保持
3. 各カテゴリについて順番にグループを判定
   - index 0: `ruby_オ`
   - index 1: `ruby_ア`
   - index 2以降: ルール3またはルール4を適用
4. 結果を CategoryEntry[] として返す

## テストケース

### 基本的なケース

```typescript
// ひらがな/カタカナ
'アーティファクト' → ['ruby_ア']
'しらぬい' → ['ruby_シ']

// 漢字（前後が同じグループ）
前: 'シャドール', 対象: '甲虫装機', 後: 'シンクロン'
→ ['ruby_シ']

// 漢字（前後が異なるグループ）
前: 'レアル', 対象: '六武衆', 後: 'ワーム'
→ ['ruby_レ', 'ruby_ロ', 'ruby_ワ']
```

## 注意点

1. **濁点・半濁点の扱い**
   - 「ガ」は「カ」グループに含まれる
   - 「パ」は「ハ」グループに含まれる

2. **拗音の扱い**
   - 「シャ」は「シ」として扱い、「サ」グループ

3. **特殊文字**
   - 「ヴ」は独立した行として扱う

4. **英数字**
   - 該当する場合は先頭文字をそのまま使用
   - 例: 「A・O・J」→ `['ruby_A']`

## 今後の改善案

1. 読み仮名データベースの整備
2. 機械学習による読み推定
3. ユーザーによる手動修正機能
