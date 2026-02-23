#!/bin/bash
# z.ai GLM API プロンプト改善版

set -eu

# .env からAPI Keyを読み込み
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

API_URL="https://open.bigmodel.cn/api/paas/v4/chat/completions"

# テスト対象のカードテキスト
CARD_TEXT="$1"

# プロンプト
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
      \"startIndex\": 9,
      \"endIndex\": 12
    }
  ]
}

## 抽出ルール
1. **text**: 原文から抽出した条件部分のテキスト（正確に一致させること）
2. **filters**:
   - **races**: 種族（warrior, dragon, spellcaster等、すべて小文字）
   - **attributes**: 属性（light, dark, fire, water, wind, earth, divine、すべて小文字）
   - **cardTypes**: カードタイプ（monster, spell, trap、すべて小文字）
   - **monsterTypes**: モンスタータイプ（fusion, synchro, xyz, link等、すべて小文字）
3. **logic**: 条件の論理関係（\"and\" または \"or\"）
4. **startIndex/endIndex**: 原文での文字位置（0始まり）

## 重要
- textは原文から正確に抽出し、改変しない
- races/attributes/cardTypes/monsterTypesの値はすべて小文字にする
- モンスター種族・属性・レベルなどが指定されている場合、cardTypesには\"monster\"を含める
- 複合条件（例：\"光属性ドラゴン族\"）は1つのconditionとして抽出し、filtersに複数指定

## 対象テキスト
${CARD_TEXT}

## 出力
JSONのみで出力してください。"

echo "===== Testing with card text ====="
echo "$CARD_TEXT"
echo ""
echo "===== API Response ====="

# jqでJSONを構築
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
