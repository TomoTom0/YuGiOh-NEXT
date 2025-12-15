#!/bin/bash
# テスト用サンプルHTMLファイルをダウンロード

set -e

echo "Downloading test sample HTML files..."

# ディレクトリ作成
mkdir -p tests/sample
mkdir -p tests/combine/data

# 韓国語検索ページ
echo "  - Downloading Korean search page..."
curl -s "https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&request_locale=ko" \
  -o tests/sample/card_search_ko.html

# 日本語検索結果ページ
echo "  - Downloading Japanese search result page..."
curl -s "https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&rp=100&page=1&stype=1&sort=21" \
  -o tests/combine/data/card-search-result.html

echo "✅ Sample HTML files downloaded successfully"
echo ""
echo "Files:"
ls -lh tests/sample/card_search_ko.html tests/combine/data/card-search-result.html
