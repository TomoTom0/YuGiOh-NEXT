# 調査ドキュメント

このディレクトリには、遊戯王公式データベース（Yu-Gi-Oh! Official Card Database）の調査結果がまとめられています。

## 📂 ディレクトリ構成

```
docs/research/
├── INVESTIGATION_SUMMARY.md       # 調査成果の総まとめ（まずはここから）
├── investigation-methodology.md   # 汎用調査手法ガイド
├── api-investigation-results.md   # デッキ編集API調査結果
├── README.md                      # このファイル
├── card-search/                   # カード検索機能の調査結果
│   ├── README.md                  # カード検索ドキュメントの目次
│   ├── parameters-complete-spec.md   # 完全仕様書
│   ├── investigation-report.md    # 調査レポート
│   ├── reinvestigation-guide.md   # 再調査ガイド
│   └── parameters-initial.md      # 初期調査結果
└── archive/                       # 古い調査ファイル（参考資料）
    ├── 01-initial-investigation.md
    ├── 02-auth-flow.md
    ├── 03-deck-api.md
    └── 04-api-key-verification.md
```

## 🚀 クイックスタート

### 初めての場合
1. **[INVESTIGATION_SUMMARY.md](INVESTIGATION_SUMMARY.md)** を読む（調査全体の概要）
2. **[investigation-methodology.md](investigation-methodology.md)** を読む（調査手法を理解）
3. 興味のある機能の詳細ドキュメントを読む

### カード検索機能を実装する場合
1. **[card-search/parameters-complete-spec.md](card-search/parameters-complete-spec.md)** で仕様を確認
2. `../../tmp/wip/card-search-params-i18n.json` でi18nデータを確認
3. [investigation-methodology.md](investigation-methodology.md) の実装パターンを参考

### 他のページを調査する場合
1. **[investigation-methodology.md](investigation-methodology.md)** の手法を参照
2. テンプレートをコピーして新規スクリプト作成
3. 調査結果をドキュメント化

### 仕様変更を確認する場合
1. **[card-search/reinvestigation-guide.md](card-search/reinvestigation-guide.md)** の手順に従う
2. 5ステップのスクリプトを実行
3. 差分を確認して必要に応じて更新

---

## 📄 主要ドキュメント

### 1. 調査成果サマリー (INVESTIGATION_SUMMARY.md)
**最も重要なドキュメント** - すべての調査結果のインデックス

- 完成した仕様書・レポート一覧
- 生成データファイル一覧
- 重要な発見事項のまとめ
- 実装への活用方法
- 次のステップ

### 2. 汎用調査手法ガイド (investigation-methodology.md)
任意のページを調査するための汎用的な手法

- Chrome Remote Debugging の使い方
- WebSocket接続の確立方法
- 5つの調査手法
- 3つのデータ抽出パターン
- テストと検証
- トラブルシューティング

**用途**: 今後の調査（デッキ一覧、カード詳細など）に活用

### 3. カード検索機能 (card-search/)
カード検索機能の完全な調査結果

- **完全仕様書**: 140フィールド、すべてのパラメータの詳細
- **調査レポート**: 調査プロセスと発見事項
- **再調査ガイド**: 仕様変更時・他言語対応時の手順
- **i18nデータ**: 日本語ロケールの完全なラベルマッピング

詳細は [card-search/README.md](card-search/README.md) を参照

### 4. デッキ編集API (api-investigation-results.md)
デッキ編集APIの調査結果

- セッション管理（JSESSIONID, cgid, ytkn）
- 操作コード（ope）の一覧
- パラメータ仕様
- デッキ保存の仕組み

---

## 🔍 調査済み機能

### ✅ 完了
- **認証フロー** - OAuth 2.0、KONAMI ID連携
- **カード検索** - 140フィールド、完全仕様
- **デッキ編集画面** - フォーム構造、入力フィールド
- **デッキ保存** - AJAX POST、パラメータ仕様

### ⏳ 部分的に完了
- **検索結果ページ** - 基本構造のみ、詳細は未調査
- **カード詳細ページ** - 未着手
- **デッキ操作** - 削除・複製・共有は未調査

### 📋 未着手
- セッション管理の詳細
- レート制限の確認
- 他言語対応（en, ko, zh-CN）
- エラーハンドリング

---

## 🛠️ 調査環境

### セットアップ
```bash
# Chrome起動（リモートデバッグモード）
./scripts/debug/setup/start-chrome.sh

# 停止
./scripts/debug/setup/stop-chrome.sh
```

### 必要なパッケージ
```bash
npm install ws
```

---

## 📊 データファイル

### 生成済みデータ (`../../tmp/`)
- `search-form-fields.json` - 全140フィールド
- `search-field-label-mappings.json` - ラベルマッピング
- `sort-options.json` - ソート選択肢
- `other-jogai-labels.json` - その他条件ラベル
- `wip/card-search-params-i18n.json` - i18nデータ（日本語）

### テストスクリプト (`../../tmp/`)
- `test-attribute-search-v2.js`
- `test-multiple-params.js`
- `test-linkmarker-checked.js`
- `test-multiple-checkbox-values.js`
- `extract-sort-options.js`
- `extract-other-jogai-labels.js`

---

## 🎯 重要な発見

### カード検索機能
1. **隠しパラメータ**: `rp=2000`で全結果を1ページに表示可能
2. **sort=10は欠番**: 1-9, 11-12, 20-21の13種類のみ
3. **複数選択**: パラメータ名を繰り返す方式（`attr=11&attr=12&attr=14`）
4. **リンクマーカー**: 9方向のチェックボックス（5番は欠番）

### 認証・セッション
1. **OAuth 2.0**: KONAMI ID連携
2. **セッション管理**: JSESSIONID, cgid, ytkn
3. **CSRFトークン**: ytknはページ遷移ごとに変わる

---

## 📚 参考資料（アーカイブ）

archive/ディレクトリには、初期調査で作成された参考資料が保管されています：

- `01-initial-investigation.md` - 基本情報とインフラ
- `02-auth-flow.md` - OAuth 2.0認証フロー詳細
- `03-deck-api.md` - デッキAPI初期調査
- `04-api-key-verification.md` - API Key検証結果

これらは現在の調査結果に統合されていますが、歴史的な経緯を確認する際に参照できます。

---

## 🔄 メンテナンス

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
1. 該当する仕様書を更新
2. i18nデータを更新（必要に応じて）
3. 調査レポートに変更履歴を追記
4. `tasks/done.md`に記録

---

## 💡 次のステップ

### 短期（調査フェーズ）
- [ ] 検索結果ページの詳細構造調査
- [ ] カード詳細ページの構造調査
- [ ] カード追加/削除操作の調査
- [ ] 他言語対応（en, ko, zh-CN）

### 中期（設計フェーズ）
- [ ] 完全なAPI仕様書の作成
- [ ] データモデル設計
- [ ] Chrome拡張機能のアーキテクチャ設計

### 長期（実装フェーズ）
- [ ] APIラッパーの実装
- [ ] HTMLパーサーの実装
- [ ] UIコンポーネントの実装

---

最終更新: 2025-10-30
