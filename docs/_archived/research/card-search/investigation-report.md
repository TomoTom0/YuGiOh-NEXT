# カード検索機能 調査レポート

**調査日**: 2025-10-30
**調査対象**: 遊戯王公式データベース カード検索機能
**ベースURL**: https://www.db.yugioh-card.com/yugiohdb/card_search.action

## 調査概要

遊戯王DBのカード検索機能について、以下の項目を徹底的に調査しました：
1. 検索フォームの構造（140フィールド）
2. 実際の検索実行時のURLパラメータ
3. UIに表示されない隠しパラメータ
4. 複数選択パラメータの動作
5. 範囲指定パラメータの動作
6. リンクマーカー指定の仕組み

## 主な発見事項

### 1. 隠しパラメータの発見

#### rp（Results Per Page）
- **UIに表示される値**: 10, 25, 50, 100
- **実際に使用可能な値**: 1 〜 2000
- **重要性**: `rp=2000`を指定すると全結果を1ページに表示可能
- **検証方法**: 実際のテスト検索で154件の結果を`rp=2000`で全取得に成功

#### sort（ソート順）
- **UIに表示される選択肢**: 13個
- **値の範囲**: 1-9, 11-12, 20-21（合計13種類）
- **注意点**: sort=10は存在しない（欠番）

### 2. 複数選択パラメータの仕様

以下のパラメータは複数値を指定可能で、同じパラメータ名を繰り返す方式で実装：

```
attr=11&attr=12&attr=14  # 光、闇、炎属性
species=1&species=15     # ドラゴン族、戦士族
other=1&other=9          # 効果、シンクロ
jogai=2&jogai=10         # 融合、エクシーズを除外
linkbtn1=1&linkbtn2=2    # リンクマーカー：左下、下
```

#### 複数選択可能なパラメータ一覧
- `attr` (7種類の属性)
- `species` (26種類の種族)
- `other` (15種類のモンスタータイプ)
- `jogai` (15種類の除外条件)
- `linkbtn1`〜`linkbtn9` (9方向のリンクマーカー、ただし5番は存在しない)

### 3. リンクマーカーの仕組み

リンクマーカーは9方向のチェックボックスで表現されます：

```
linkbtn7   linkbtn8   linkbtn9
   ↖️        ⬆️        ↗️
linkbtn4    [中央]    linkbtn6
   ⬅️                 ➡️
linkbtn1   linkbtn2   linkbtn3
   ↙️        ⬇️        ↘️
```

- 選択されたボタンのみURLパラメータに含まれる
- `link_m`パラメータで条件結合を指定：
  - `link_m=1`: AND（すべてのマーカーを持つ）
  - `link_m=2`: OR（いずれかのマーカーを持つ、デフォルト）

### 4. 範囲指定パラメータ

以下のパラメータは範囲指定が可能：

| カテゴリ | 開始パラメータ | 終了パラメータ | 用途 |
|---------|---------------|---------------|------|
| レベル/ランク | `starfr` | `starto` | 例: 4〜7 |
| 攻撃力 | `atkfr` | `atkto` | 例: 2000〜3000 |
| 守備力 | `deffr` | `defto` | 例: 0〜2000 |
| Pスケール | `pscalefr` | `pscaleto` | 例: 1〜5 |
| リンク数 | `linkmarkerfr` | `linkmarkerto` | 通常は空 |
| 発売日 | `releaseYStart`, `releaseMStart`, `releaseDStart` | `releaseYEnd`, `releaseMEnd`, `releaseDEnd` | 年月日 |

### 5. 条件結合パラメータ

複数条件を結合する方法：

- `othercon`: `other`および`jogai`の条件結合
  - `1`: AND（すべての条件を満たす）
  - `2`: OR（いずれかの条件を満たす、デフォルト）

- `link_m`: リンクマーカーの条件結合
  - `1`: AND（すべてのマーカーを持つ）
  - `2`: OR（いずれかのマーカーを持つ、デフォルト）

### 6. フォーム構造の詳細

検索フォームには140個のフィールドが存在：

| フィールドタイプ | 数量 |
|-----------------|------|
| hidden | 11 |
| text | 5 |
| select | 8 |
| checkbox | 112 |
| radio | 4 |

## 検証済みテストケース

### 属性検索
```
# 単一属性
attr=11  # 光属性

# 複数属性
attr=11&attr=12&attr=14  # 光、闇、炎
```

### 種族検索
```
species=1&species=15&species=18  # ドラゴン、戦士、魔法使い
```

### 攻撃力・守備力範囲
```
atkfr=2000&atkto=3000  # 攻撃力2000〜3000
deffr=0&defto=2000     # 守備力0〜2000
```

### レベル範囲
```
starfr=4&starto=7  # レベル4〜7
```

### ペンデュラムスケール
```
pscalefr=1&pscaleto=5  # スケール1〜5
```

### リンクマーカー
```
# 複数方向（OR条件）
linkbtn1=1&linkbtn2=2&linkbtn4=4&link_m=2

# AND条件
linkbtn1=1&linkbtn3=3&link_m=1
```

### モンスタータイプ
```
# OR条件
other=1&other=2&other=9&othercon=2  # 効果、融合、シンクロのいずれか

# AND条件
other=1&other=9&othercon=1  # 効果かつシンクロ（効果シンクロ）
```

### カードタイプと効果
```
# 魔法カード + 通常魔法
ctype=2&effe=20

# 罠カード + 永続罠
ctype=3&effe=24
```

### 除外条件
```
jogai=2&jogai=10  # 融合とエクシーズを除外
```

### 全結果取得
```
rp=2000&sort=21  # 全結果を発売日新しい順で取得
```

## URLパラメータの完全な順序

実際のURLでは以下の順序でパラメータが送信されます：

```
?ope=1                    # 操作コード（検索実行）
&sess=1                   # セッションID
&rp=10                    # 結果数/ページ
&mode=                    # モード（通常は空）
&sort=1                   # ソート順
&keyword=                 # 検索キーワード
&stype=1                  # 検索タイプ
&ctype=                   # カードタイプ
&attr=11&attr=12          # 属性（複数選択可）
&species=1&species=15     # 種族（複数選択可）
&effe=20                  # 魔法・罠効果
&othercon=2               # その他条件の結合方法
&other=1&other=9          # その他条件（複数選択可）
&jogai=2&jogai=10         # 除外条件（複数選択可）
&starfr=&starto=          # レベル範囲
&pscalefr=&pscaleto=      # Pスケール範囲
&linkmarkerfr=&linkmarkerto=  # リンク数範囲
&linkbtn1=1&linkbtn2=2    # リンクマーカー方向
&link_m=2                 # リンクマーカー結合方法
&atkfr=&atkto=            # 攻撃力範囲
&deffr=&defto=            # 守備力範囲
&releaseDStart=1          # 発売日開始（日）
&releaseMStart=1          # 発売日開始（月）
&releaseYStart=1999       # 発売日開始（年）
&releaseDEnd=             # 発売日終了（日）
&releaseMEnd=             # 発売日終了（月）
&releaseYEnd=             # 発売日終了（年）
```

## デフォルト値

以下のパラメータにはデフォルト値が設定されています：

| パラメータ | デフォルト値 | 説明 |
|-----------|------------|------|
| ope | 1 | 検索実行 |
| sess | 1 | セッションID |
| rp | 10 | 10件/ページ |
| mode | "" | 空文字列 |
| sort | 1 | 50音順 |
| keyword | "" | 空文字列 |
| stype | 1 | カード名検索 |
| ctype | "" | すべてのカード |
| othercon | 2 | OR条件 |
| link_m | 2 | OR条件 |
| releaseDStart | 1 | 1日 |
| releaseMStart | 1 | 1月 |
| releaseYStart | 1999 | 1999年 |

## 生成データファイル

調査の過程で以下のデータファイルを生成しました：

### JSON形式のデータ
1. `tmp/search-form-fields.json` - 全140フィールドの生データ
2. `tmp/search-field-label-mappings.json` - パラメータ値とラベルのマッピング
3. `tmp/sort-options.json` - ソート選択肢（13種類）
4. `tmp/other-jogai-labels.json` - otherとjogaiのラベル情報
5. `tmp/attribute-search-results-v2.json` - 属性検索のテスト結果
6. `tmp/multiple-params-test-results.json` - 複数パラメータテスト結果
7. `tmp/linkmarker-test-results.json` - リンクマーカーテスト結果
8. `tmp/linkmarker-checked-results.json` - リンクマーカー選択テスト結果
9. `tmp/multiple-checkbox-results.json` - 複数チェックボックステスト結果

### 多言語対応データ
10. `tmp/wip/card-search-params-i18n.json` - 日本語ロケールのi18nデータ
    - すべてのパラメータ値とラベルのマッピング
    - メタデータ（複数選択可能パラメータ、範囲パラメータ、デフォルト値）

### テストスクリプト
11. `tmp/test-attribute-search-v2.js` - 属性検索テスト
12. `tmp/test-multiple-params.js` - 複数パラメータテスト
13. `tmp/test-linkmarker-checked.js` - リンクマーカーテスト
14. `tmp/test-multiple-checkbox-values.js` - 複数選択テスト
15. `tmp/extract-sort-options.js` - ソート選択肢抽出
16. `tmp/extract-other-jogai-labels.js` - その他条件ラベル抽出

## 実装への示唆

### 1. パラメータビルダーの実装
複数選択パラメータは配列で保持し、URLParams生成時に展開する必要があります：

```typescript
// 良い例
const params = new URLSearchParams();
attributes.forEach(attr => params.append('attr', attr));
// 結果: attr=11&attr=12&attr=14

// 悪い例（動作しない）
params.append('attr', attributes.join(','));
// 結果: attr=11,12,14  ← これは不正
```

### 2. デフォルト値の処理
空文字列もパラメータとして送信する必要があります：

```typescript
// 正しい実装
params.append('keyword', keyword || '');
params.append('ctype', ctype || '');
```

### 3. rp=2000の活用
- 全件取得が必要な場合は`rp=2000`を使用
- ただし、大量のデータ取得になるため、キャッシュ戦略が重要

### 4. 多言語対応
- `request_locale`パラメータで言語を指定
- i18nデータファイルを活用してラベル表示を切り替え
- 現在は日本語（ja）のみだが、英語（en）などの追加も可能

### 5. バリデーション
- `sort`の値は1-9, 11-12, 20-21のみ（10は無効）
- `rp`は1-2000の範囲
- 日付パラメータは有効な日付である必要がある

## 今後の調査項目

1. **セッション管理**
   - `sess`パラメータの生成ロジック
   - セッション有効期限
   - ログイン状態との関係

2. **ページネーション**
   - 2ページ目以降へのアクセス方法
   - ページ番号パラメータの有無

3. **他言語での動作**
   - 英語（en）、韓国語（ko）、中国語（zh-CN）での検索
   - 各言語でのラベル取得

4. **エラーハンドリング**
   - 不正なパラメータ値の場合の挙動
   - エラーメッセージの種類

5. **API制限**
   - レート制限の有無
   - 大量リクエストへの対策

## 結論

遊戯王DBのカード検索APIは非常に複雑ですが、体系的な調査により以下が明らかになりました：

1. **140個のフィールド**を持つ包括的な検索システム
2. **UIに表示されない隠しパラメータ**（rp=2000など）の存在
3. **複数選択パラメータ**の独特な実装方式（パラメータ名の繰り返し）
4. **リンクマーカー**の9方向指定と条件結合
5. **範囲指定**による柔軟な絞り込み機能

これらの知見により、完全な検索機能を実装するための基盤が整いました。
