#!/bin/bash
# カードテキスト一括処理スクリプト

set -eu

# .env からAPI Keyを読み込み
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

API_URL="https://api.z.ai/api/coding/paas/v4/chat/completions"

PROMPT="遊戯王のカードテキストから検索可能な条件を抽出してください。

## 出力形式（JSONのみ）
{
  \"conditions\": [
    {
      \"text\": \"戦士族\",
      \"filters\": {
        \"races\": [\"warrior\"],
        \"cardTypes\": [\"monster\"]
      },
      \"logic\": \"and\",
      \"negated\": false,
      \"startIndex\": 9,
      \"endIndex\": 12
    }
  ]
}

## 抽出ルール
1. **text**: 原文から抽出した条件部分のテキスト（正確に一致させること）
2. **filters**: 以下のキーを使用（該当するもののみ含める、すべて小文字）
   - **cardTypes**: [\"monster\", \"spell\", \"trap\"]
   - **monsterTypes**: [\"normal\", \"effect\", \"fusion\", \"synchro\", \"xyz\", \"link\", \"ritual\", \"pendulum\"]
   - **races**: [\"warrior\", \"dragon\", \"spellcaster\", \"fiend\", \"fairy\", \"machine\", \"zombie\", \"psychic\"]
   - **attributes**: [\"light\", \"dark\", \"fire\", \"water\", \"wind\", \"earth\", \"divine\"]
   - **level**: {\"operator\": \"<=\", \"value\": 4}
   - **rank**: {\"operator\": \"==\", \"value\": 4}
   - **linkRating**: {\"operator\": \"==\", \"value\": 3}
   - **attack**: {\"operator\": \"<=\", \"value\": 2000}
   - **defense**: {\"operator\": \">=\", \"value\": 1000}
   - **nameQuery**: \"カード名の一部\"
3. **logic\": \"and\" または \"or\"
4. **negated**: 否定条件の場合は true
5. **startIndex/endIndex**: 原文での文字位置（0始まり）

## 重要
- textは原文から正確に抽出し、改変しない
- すべてのフィルター値は小文字にする
- モンスターの種族・属性・レベル等が指定されている場合、cardTypesには\"monster\"を含める
- 複合条件（例：\"光属性ドラゴン族\"）は1つのconditionとして抽出し、filtersに複数指定
- \"～以外\"という否定表現は negated: true で表現
- \"カード名\"カードのような表現は nameQuery に抽出

## 対象テキスト
EOF

# プロンプトにカードテキストを追加
FULL_PROMPT="$PROMPT"$'\n\n## 対象テキスト\n'"$card_text"$'\n\n## 出力\nJSONのみで出力してください。"'

# 出力先ディレクトリ
OUTPUT_DIR="tmp/reports/llm-test-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

# テストカードのJSONファイル
CARDS_JSON="$1"

if [ ! -f "$CARDS_JSON" ]; then
  echo "Error: Cards JSON file not found"
  echo "Usage: $0 <cards.json>"
  exit 1
fi

# カードデータを読み込んで一括処理
jq -c '.[]' "$CARDS_JSON" | while read -r card; do
  card_id=$(echo "$card" | jq -r '.cardId')
  card_name=$(echo "$card" | jq -r '.name')
  card_text=$(echo "$card" | jq -r '.text')

  echo "Testing: $card_name ($card_id)"

  # APIリクエスト
  REQUEST_JSON=$(jq -n \
    --arg model "glm-4.7" \
    --arg content "$FULL_PROMPT" \
    '{
      model: $model,
      messages: [{role: "user", content: $content}],
      temperature: 0.0
    }')

  response=$(curl -s "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ZAI_API_KEY" \
    -d "$REQUEST_JSON")

  # 結果をJSONファイルに保存
  echo "$response" | jq -r '.choices[0].message.content // empty' > "$OUTPUT_DIR/${card_id}.json"

  # 元データも保存
  echo "$card" > "$OUTPUT_DIR/${card_id}_input.json"

  echo "Saved: $OUTPUT_DIR/${card_id}.json"
  echo ""
done

echo "Results saved to: $OUTPUT_DIR"
echo ""
echo "Summary:"
ls -la "$OUTPUT_DIR"
