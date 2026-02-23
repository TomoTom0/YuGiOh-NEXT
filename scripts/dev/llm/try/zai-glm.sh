#!/bin/bash
# z.ai GLM API テストスクリプト
# 使用方法: ./scripts/dev/llm/try/zai-glm.sh

set -eu

# .env からAPI Keyを読み込み
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "Error: .env file not found"
  echo "Please create .env with ZAI_API_KEY=your_api_key"
  exit 1
fi

# API Key の確認
if [ -z "${ZAI_API_KEY:-}" ]; then
  echo "Error: ZAI_API_KEY not found in .env"
  echo "Please add: ZAI_API_KEY=your_api_key"
  exit 1
fi

# API エンドポイント
API_URL="https://open.bigmodel.cn/api/paas/v4/chat/completions"

# プロンプト（カードテキストから検索条件を抽出）
PROMPT='遊戯王のカードテキストから検索条件を抽出してください。

## 出力形式
{
  "conditions": [
    {
      "text": "条件部分のテキスト",
      "filters": {
        "races": ["warrior"],
        "cardTypes": ["monster"]
      },
      "startIndex": 0,
      "endIndex": 10
    }
  ]
}

## 重要
- textは条件部分のみ（「モンスター」「カード」「～体」「～枚」「～場合」等は含めない）

## 対象テキスト
「自分フィールドに戦士族モンスターが存在する場合に発動できる。」

## 出力
JSONのみで出力してください。'

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
  -d "$REQUEST_JSON" | jq -r '.choices[0].message.content // empty' || echo "API Error"

echo ""
