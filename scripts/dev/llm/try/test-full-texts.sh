#!/bin/bash
# 実際のカードテキスト全文でテスト

set -eu

# .env からAPI Keyを読み込み
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

API_URL="https://api.z.ai/api/coding/paas/v4/chat/completions"

CARD_TEXT="$1"

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
   - **level**: {\"operator\": \"<=\", \"value\": 4} (operator: \"==\", \"!=\", \">\", \">=\", \"<\", \"<=\", \"between\")
   - **rank**: {\"operator\": \"==\", \"value\": 4}
   - **linkRating**: {\"operator\": \"==\", \"value\": 3}
   - **attack**: {\"operator\": \"<=\", \"value\": 2000}
   - **defense**: {\"operator\": \">=\", \"value\": 1000}
   - **nameQuery\": \"カード名の一部\" (「XX」カードのような名前検索)
3. **logic**: 条件の論理関係（\"and\" または \"or\"）
4. **negated**: 否定条件の場合は true (例：\"戦士族以外\"の場合 true)
5. **startIndex/endIndex**: 原文での文字位置（0始まり）

## 重要
- textは原文から正確に抽出し、改変しない
- すべてのフィルター値は小文字にする
- モンスターの種族・属性・レベル等が指定されている場合、cardTypesには\"monster\"を含める
- 複合条件（例：\"光属性ドラゴン族\"）は1つのconditionとして抽出し、filtersに複数指定
- \"～以外\"という否定表現は negated: true で表現
- \"カード名\"カードのような表現は nameQuery に抽出

## 対象テキスト
${CARD_TEXT}

## 出力
JSONのみで出力してください。"

echo "===== Card Text ====="
echo "$CARD_TEXT"
echo ""
echo "===== API Response ====="

REQUEST_JSON=$(jq -n \
  --arg model "glm-4.7" \
  --arg content "$PROMPT" \
  '{
    model: $model,
    messages: [{role: "user", content: $content}],
    temperature: 0.0
  }')

curl -s "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ZAI_API_KEY" \
  -d "$REQUEST_JSON" | jq -r '.choices[0].message.content // empty'

echo ""
