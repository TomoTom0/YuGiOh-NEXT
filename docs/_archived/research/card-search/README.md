# カード検索機能 調査ドキュメント

このディレクトリには、遊戯王DBのカード検索機能に関する調査結果がまとめられています。

## 📄 ドキュメント一覧

### 1. 完全仕様書 (parameters-complete-spec.md)
**最も重要なドキュメント** - カード検索APIの完全な仕様書

**内容**:
- すべてのパラメータの詳細（140フィールド）
- デフォルト値、必須/任意、型情報
- URLパラメータの順序
- 複数選択パラメータの仕様
- 検証済みテストケース
- 隠しパラメータ（rp=2000など）

**用途**: 実装時のリファレンス

---

### 2. 調査レポート (investigation-report.md)
調査プロセスと主な発見事項をまとめたレポート

**内容**:
- 調査の概要と手法
- 主な発見事項（隠しパラメータ、複数選択の仕様など）
- フォーム構造の詳細（140フィールドの内訳）
- 検証済みテストケース
- 生成データファイル一覧
- 実装への示唆

**用途**: 調査の背景や経緯を理解する

---

### 3. 再調査ガイド (reinvestigation-guide.md)
仕様変更時や他言語対応時の再調査手順書

**内容**:
- 5ステップの再調査手順
  1. フォーム構造の確認
  2. パラメータ名の確認
  3. 選択肢とラベルの抽出
  4. 隠しパラメータの動作確認
  5. 複数選択パラメータの動作確認
- 他言語対応の調査手順（en, ko, zh-CN）
- 差分確認の方法
- 実行可能なスクリプトのテンプレート

**用途**:
- 検索機能の仕様変更確認
- 他言語のi18nデータ作成
- 定期的な動作確認

---

### 4. 初期調査結果 (parameters-initial.md)
フェーズ1で作成した中間レポート（参考資料）

**内容**:
- 基本検索パラメータの解析
- 主要パラメータの特定
- 140フィールドの列挙

**用途**: 調査の初期段階を振り返る

---

## 🔗 関連ファイル

### 生成データ (../../tmp/)
調査の過程で生成されたJSONファイル：
- `search-form-fields.json` - 全140フィールド
- `search-field-label-mappings.json` - ラベルマッピング
- `sort-options.json` - ソート選択肢
- `other-jogai-labels.json` - その他条件ラベル
- `wip/card-search-params-i18n.json` - i18nデータ（日本語）

### テストスクリプト (../../tmp/)
- `test-attribute-search-v2.js`
- `test-multiple-params.js`
- `test-linkmarker-checked.js`
- `test-multiple-checkbox-values.js`
- `extract-sort-options.js`
- `extract-other-jogai-labels.js`

---

## 📚 読む順序

### 初めての場合
1. **investigation-report.md** - 調査の全体像を理解
2. **parameters-complete-spec.md** - 詳細仕様を確認

### 実装する場合
1. **parameters-complete-spec.md** - 仕様を確認
2. `../../tmp/wip/card-search-params-i18n.json` - i18nデータを参照

### 再調査する場合
1. **reinvestigation-guide.md** - 手順に従って実行
2. **parameters-complete-spec.md** - 差分を確認して更新

---

## 🔑 重要な発見

1. **隠しパラメータ**
   - `rp=2000`: 全結果を1ページに表示可能（UIには非表示）
   - `sort=10`: 存在しない（欠番）

2. **複数選択の実装**
   - パラメータ名を繰り返す方式: `attr=11&attr=12&attr=14`

3. **リンクマーカー**
   - 9方向のチェックボックス（5番は欠番）
   - AND/OR条件の指定可能

4. **フォーム構造**
   - 総フィールド数: 140個
   - 内訳: hidden(11), text(5), select(8), checkbox(112), radio(4)

---

## 📊 調査状況

- ✅ 基本検索パラメータ（完了）
- ✅ 属性・種族パラメータ（完了）
- ✅ 数値範囲パラメータ（完了）
- ✅ リンクマーカー（完了）
- ✅ モンスタータイプ・効果（完了）
- ✅ 魔法・罠効果（完了）
- ✅ 発売日パラメータ（完了）
- ✅ 隠しパラメータ（完了）
- ✅ 複数選択の動作（完了）
- ✅ i18nデータ（日本語）（完了）
- ⏳ 検索結果ページの詳細構造（未着手）
- ⏳ 他言語対応（en, ko, zh-CN）（未着手）

---

## 🛠️ メンテナンス

### 定期確認（推奨: 月1回）
```bash
cd tmp/reinvestigation-$(date +%Y%m%d)

# 5ステップを実行
node step1-check-form-structure.js
node step2-check-parameter-names.js
node step3-extract-labels.js
node step4-test-hidden-params.js
node step5-test-multi-select.js

# 差分確認
node check-differences.js
```

### 仕様変更が検出された場合
1. `parameters-complete-spec.md`を更新
2. `wip/card-search-params-i18n.json`を更新
3. `investigation-report.md`に変更履歴を追記
4. `tasks/done.md`に記録

---

最終更新: 2025-10-30
