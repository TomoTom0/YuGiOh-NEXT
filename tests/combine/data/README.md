# 統合テスト用データファイル

このディレクトリには、統合テスト用のHTMLサンプルファイルが格納されます。

## ファイル一覧

- `card-search-result.html` - 日本語カード検索結果ページ（card-search-cache テスト用）

## ダウンロード方法

統合テストを実行する前に、以下のスクリプトを実行してください：

```bash
./scripts/test/download-sample-html.sh
```

または、npmスクリプトを使用：

```bash
bun run test:download-samples
bun run test:integration  # ダウンロード + テスト実行
```

## 注意事項

- これらのHTMLファイルは `.gitignore` に含まれています
- CI/CDでは `test:integration` スクリプトで自動的にダウンロードされます
- 最軽量のテスト（`bun run test`）ではHTMLファイルは不要です（該当テストは自動的にスキップ）
