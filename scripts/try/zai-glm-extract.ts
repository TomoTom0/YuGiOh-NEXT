/**
 * ZAI GLM API でカードテキストから検索条件を抽出するテスト
 *
 * 使用方法:
 *   pnpm exec tsx scripts/try/zai-glm-extract.ts "カードテキスト"
 *   pnpm exec tsx scripts/try/zai-glm-extract.ts --batch cards.json
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

// .env を読み込み
config({ path: resolve(process.cwd(), '.env') })

const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const API_KEY = process.env.ZAI_API_KEY

if (!API_KEY) {
  console.error('Error: ZAI_API_KEY not found in .env')
  console.error('Please add: ZAI_API_KEY=your_api_key')
  process.exit(1)
}

/**
 * 抽出条件の型定義
 */
interface ExtractedCondition {
  text: string
  filters: {
    cardTypes?: string[]
    monsterTypes?: string[]
    races?: string[]
    attributes?: string[]
    level?: { operator: string; value: number }
    rank?: { operator: string; value: number }
    linkRating?: { operator: string; value: number }
    attack?: { operator: string; value: number }
    defense?: { operator: string; value: number }
    nameQuery?: string
  }
  logic: 'and' | 'or'
  negated: boolean
  startIndex: number
  endIndex: number
}

interface ExtractResult {
  conditions: ExtractedCondition[]
}

interface CardInput {
  cardId: string
  name: string
  text: string
}

/**
 * プロンプトを構築
 */
function buildPrompt(cardText: string): string {
  return `遊戯王のカードテキストから検索可能な条件を抽出してください。

## 出力形式（JSONのみ）
{
  "conditions": [
    {
      "text": "戦士族",
      "filters": {
        "races": ["warrior"],
        "cardTypes": ["monster"]
      },
      "logic": "and",
      "negated": false,
      "startIndex": 9,
      "endIndex": 12
    }
  ]
}

## 抽出ルール
1. **text**: 原文から抽出した条件部分のテキスト（正確に一致させること）
2. **filters**: 以下のキーを使用（該当するもののみ含める、すべて小文字）
   - **cardTypes**: ["monster", "spell", "trap"]
   - **monsterTypes**: ["normal", "effect", "fusion", "synchro", "xyz", "link", "ritual", "pendulum"]
   - **races**: ["warrior", "dragon", "spellcaster", "fiend", "fairy", "machine", "zombie", "psychic"]
   - **attributes**: ["light", "dark", "fire", "water", "wind", "earth", "divine"]
   - **level**: {"operator": "<=", "value": 4}
   - **rank**: {"operator": "==", "value": 4}
   - **linkRating**: {"operator": "==", "value": 3}
   - **attack**: {"operator": "<=", "value": 2000}
   - **defense**: {"operator": ">=", "value": 1000}
   - **nameQuery**: "カード名の一部"
3. **logic**: "and" または "or"
4. **negated**: 否定条件の場合は true
5. **startIndex/endIndex**: 原文での文字位置（0始まり）

## 重要
- textは原文から正確に抽出し、改変しない
- すべてのフィルター値は小文字にする
- モンスターの種族・属性・レベル等が指定されている場合、cardTypesには"monster"を含める
- 複合条件（例："光属性ドラゴン族"）は1つのconditionとして抽出し、filtersに複数指定
- "～以外"という否定表現は negated: true で表現
- "カード名"カードのような表現は nameQuery に抽出

## 対象テキスト
${cardText}

## 出力
JSONのみで出力してください。`
}

/**
 * GLM APIを呼び出す
 */
async function callGlmApi(prompt: string, model: string = 'glm-4.7-flash'): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0
    })
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No content in API response')
  }

  return content
}

/**
 * APIレスポンスをパース
 */
function parseResult(content: string): ExtractResult {
  // markdownコードブロックを削除
  let cleaned = content.trim()
  cleaned = cleaned.replace(/^```json\s*\n/, '').replace(/\n```$/, '')
  cleaned = cleaned.trim()

  try {
    return JSON.parse(cleaned) as ExtractResult
  } catch {
    console.error('Failed to parse JSON:')
    console.error(cleaned)
    throw new Error('Invalid JSON response')
  }
}

/**
 * 単一のカードテキストを処理
 */
async function extractFromText(cardText: string): Promise<ExtractResult> {
  console.log('===== Card Text =====')
  console.log(cardText)
  console.log('')
  console.log('===== API Response =====')

  const prompt = buildPrompt(cardText)
  const startTime = Date.now()
  const content = await callGlmApi(prompt)
  const endTime = Date.now()

  console.log(`Response time: ${endTime - startTime}ms`)
  console.log('')

  return parseResult(content)
}

/**
 * バッチ処理
 */
async function batchProcess(cardsJsonPath: string): Promise<void> {
  const cards: CardInput[] = JSON.parse(readFileSync(cardsJsonPath, 'utf-8'))

  const outputDir = `tmp/reports/llm-test-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
  mkdirSync(outputDir, { recursive: true })

  console.log(`Processing ${cards.length} cards...`)
  console.log(`Output directory: ${outputDir}`)
  console.log('')

  for (const card of cards) {
    console.log(`Testing: ${card.name} (${card.cardId})`)

    try {
      const prompt = buildPrompt(card.text)
      const content = await callGlmApi(prompt)
      const result = parseResult(content)

      // 結果を保存
      const outputPath = `${outputDir}/${card.cardId}.json`
      writeFileSync(outputPath, JSON.stringify(result, null, 2))

      // 入力も保存
      writeFileSync(`${outputDir}/${card.cardId}_input.json`, JSON.stringify(card, null, 2))

      console.log(`  Saved: ${outputPath}`)
      console.log(`  Conditions: ${result.conditions.length}`)
    } catch (error) {
      console.error(`  Error: ${error}`)
    }

    console.log('')
  }

  console.log('Results saved to:', outputDir)
}

/**
 * メイン
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage:')
    console.log('  pnpm exec tsx scripts/try/zai-glm-extract.ts "カードテキスト"')
    console.log('  pnpm exec tsx scripts/try/zai-glm-extract.ts --batch cards.json')
    process.exit(1)
  }

  if (args[0] === '--batch') {
    if (!args[1]) {
      console.error('Error: Please specify cards JSON file')
      process.exit(1)
    }
    await batchProcess(args[1])
  } else {
    const cardText = args.join(' ')
    const result = await extractFromText(cardText)

    console.log('===== Extracted Conditions =====')
    for (const [index, condition] of result.conditions.entries()) {
      console.log(`\n[${index + 1}] ${condition.text}`)
      console.log(`    filters: ${JSON.stringify(condition.filters)}`)
      console.log(`    logic: ${condition.logic}, negated: ${condition.negated}`)
      console.log(`    position: ${condition.startIndex}-${condition.endIndex}`)
    }
  }
}

main().catch(console.error)
