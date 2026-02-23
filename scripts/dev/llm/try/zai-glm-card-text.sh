#!/bin/bash
# z.ai GLM API でカードテキストから検索条件を抽出するテスト

set -eu

# .env からAPI Keyを読み込み
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# API Key の確認
if [ -z "${ZAI_API_KEY:-}" ]; then
  echo "Error: ZAI_API_KEY not found in .env"
  exit 1
fi

API_URL="https://open.bigmodel.cn/api/paas/v4/chat/completions"

# カードテキスト（キリビ・レディ）
CARD_TEXT='「自分フィールドに戦士族モンスターが存在する場合に発動できる。」'

# プロンプト
PROMPT="遊戯王のカードテキストから検索条件を抽出してください。

## 出力形式
{
  \"conditions\": [
    {
      \"text\": \"条件部分のテキスト\",
      \"filters\": {
        \"races\": [\"warrior\"],
        \"cardTypes\": [\"monster\"]
      },
      \"startIndex\": 0,
      \"endIndex\": 10
    }
  ]
}

## 重要
- textは条件部分のみ（「モンスター」「カード」「～体」「～枚」「～場合」等は含めない）

## 対象テキスト
${CARD_TEXT}

## 出力
JSONのみで出力してください。"

echo "Testing z.ai GLM API with card text..."
echo "Card text: ${CARD_TEXT}"
echo ""

# jqでJSONを構築してエスケープ問題を回避
REQUEST_JSON=$(jq -n \
  --arg model "glm-4.7-flash" \
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
