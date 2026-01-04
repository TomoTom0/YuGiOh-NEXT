# THIRD-PARTY-LICENSES.md の自動生成

## ステータス: 完了

実装済み: TASK-13

## 実装内容

`scripts/generate-licenses.ts` を追加し、`bun run license:generate` で以下を自動生成:

1. `THIRD-PARTY-LICENSES.md` - ライセンス情報のMarkdownファイル
2. `src/generated/third-party-libraries.json` - UI用のJSONファイル

### 使用方法

```bash
bun run license:generate
```

### 技術スタック

- `license-checker-rseidelsohn` - ライセンス情報の収集
- `bunx` - パッケージ実行

## 今後の改善案（オプション）

### CI/CD への組み込み

- PR 作成時に自動でライセンスチェックを実行
- 変更があれば警告または自動コミット

## 関連

- PR: #95
- Thread ID: PRRT_kwDOQKOd3M5niQ1Y
- タスク: TASK-3, TASK-13
- 関連ファイル: THIRD-PARTY-LICENSES.md, scripts/generate-licenses.ts
