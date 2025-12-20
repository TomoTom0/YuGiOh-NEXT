#!/bin/bash
# テスト用サンプルHTMLファイルをダウンロード

set -euo pipefail

echo "Downloading test sample HTML files..."

# ディレクトリ作成
mkdir -p tests/sample
mkdir -p tests/combine/data
mkdir -p tests/combine/data/en

# 韓国語検索ページ
echo "  - Downloading Korean search page..."
curl -s "https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&request_locale=ko" \
  -o tests/sample/card_search_ko.html

# 日本語検索結果ページ
echo "  - Downloading Japanese search result page..."
curl -s "https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&rp=100&page=1&stype=1&sort=21" \
  -o tests/combine/data/card-search-result.html

# カード詳細ページ（日本語）
echo "  - Downloading Japanese card detail page..."
curl -s "https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=7&cid=1" \
  -o tests/combine/data/card-detail.html

# カード詳細ページ（英語）
echo "  - Downloading English card detail page..."
curl -s "https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=7&cid=1&request_locale=en" \
  -o tests/combine/data/en/card-detail-en.html

# デッキ詳細ページ（日本語）- sample deck from public library
echo "  - Downloading Japanese deck detail page..."
curl -s "https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=214&request_locale=ja" \
  -o tests/combine/data/deck-detail-public.html

# デッキ詳細ページ（英語）
echo "  - Downloading English deck detail page..."
curl -s "https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=214&request_locale=en" \
  -o tests/combine/data/en/deck-detail-public-en.html

# カードFAQ一覧ページ
echo "  - Downloading card FAQ list page..."
curl -s "https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=1&cid=1" \
  -o tests/combine/data/card-faq-list.html

# FAQ詳細ページ
echo "  - Downloading FAQ detail page..."
curl -s "https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=2&fid=1" \
  -o tests/combine/data/faq-detail.html

echo "✅ Sample HTML files downloaded successfully"
echo ""
echo "Files:"
ls -lh tests/combine/data/*.html tests/combine/data/en/*.html 2>/dev/null || true
