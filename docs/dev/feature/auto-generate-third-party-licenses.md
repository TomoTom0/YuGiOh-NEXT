# THIRD-PARTY-LICENSES.md の自動生成

## 現状

THIRD-PARTY-LICENSES.md は手動で管理しており、主要な依存ライブラリのライセンス情報を記載している。

## 問題点

- 依存関係が追加・更新されるたびに手動更新が必要
- 記載漏れのリスクがある
- 依存関係の数が増えると管理が困難になる

## 改善案

### license-checker-rseidelsohn の導入

```bash
# ライセンス情報の自動収集
npx license-checker-rseidelsohn --output THIRD-PARTY-LICENSES.md
```

### package.json への scripts 追加

```json
"scripts": {
  "license-check": "npx license-checker-rseidelsohn --markdown > THIRD-PARTY-LICENSES.md"
}
```

### CI/CD への組み込み

- PR 作成時に自動でライセンスチェックを実行
- 変更があれば警告または自動コミット

## 優先度

low

## 関連

- PR: #95
- Thread ID: PRRT_kwDOQKOd3M5niQ1Y
- タスク: TASK-3
- 関連ファイル: THIRD-PARTY-LICENSES.md
