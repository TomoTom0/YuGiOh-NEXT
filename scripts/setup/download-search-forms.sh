#!/bin/bash
# 全言語の検索フォームをダウンロード

set -e

OUTPUT_DIR="./tmp"
mkdir -p "$OUTPUT_DIR"

LANGUAGES=("ja" "ko" "ae" "cn" "en" "de" "fr" "it" "es" "pt")

echo "=== 遊戯王データベース検索フォームダウンロード ==="
echo "出力先: $OUTPUT_DIR"
echo ""

for lang in "${LANGUAGES[@]}"; do
  echo "ダウンロード中: $lang"
  curl -s "https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&request_locale=$lang" \
    -o "$OUTPUT_DIR/search-form-$lang.html"
  echo "  ✓ $OUTPUT_DIR/search-form-$lang.html"
done

echo ""
echo "✓ 全${#LANGUAGES[@]}言語のダウンロード完了"
