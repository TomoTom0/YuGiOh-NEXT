/**
 * AIテキストリンク抽出用プロンプトビルダー
 */

import type { ExtractResult } from '@/types/ai-text-link'

/**
 * JSON Schema for Gemini Nano
 */
export const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    conditions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['attribute', 'race', 'level', 'rank', 'link', 'atk', 'def', 'cardName', 'category', 'composite']
          },
          text: { type: 'string' },
          value: { type: ['string', 'number'] },
          operator: {
            type: 'string',
            enum: ['exact', 'at_least', 'at_most', 'not']
          },
          filters: { type: 'object' },
          startIndex: { type: 'number' },
          endIndex: { type: 'number' }
        },
        required: ['type', 'text', 'value', 'operator', 'startIndex', 'endIndex']
      }
    }
  }
} as const

/**
 * 抽出用プロンプトを構築
 * @param cardText カードテキスト
 * @param lang 言語コード
 * @returns プロンプト文字列
 */
export function buildExtractPrompt(cardText: string, lang: string): string {
  if (lang === 'ja') {
    return buildJapanesePrompt(cardText)
  }
  return buildEnglishPrompt(cardText)
}

/**
 * 日本語プロンプト
 */
function buildJapanesePrompt(cardText: string): string {
  return `
遊戯王のカードテキストから、検索条件として使用できる部分を抽出してください。

## 抽出対象
- カード名: 「ブラック・マジシャン」
- 属性: 光、闇、地、水、炎、風（「〜属性」「〜」単独）
- 種族: ドラゴン族、魔法使い族、戦士族等（「〜族」）
- レベル: レベルN、レベルN以上、レベルN以下、レベルN以外
- ランク: ランクN、ランクN以上、ランクN以下、ランンクN以外
- リンク: リンクN、リンクN以上、リンクN以下、リンクN以外
- 攻撃力: 攻撃力N、攻撃力N以上、攻撃力N以下
- 守備力: 守備力N、守備力N以上、守備力N以下
- カテゴリ: 「」「」で囲まれたカテゴリ名（V（ヴァレット）、アルバスの落胤等）
- 複合条件: 光属性ドラゴン族、レベル4の戦士族、攻撃力2000以下の光属性モンスター等

## 抽出しないもの
- 「自分の手札」「フィールド」「墓地」「デッキ」などの領域指定
- 「1体をリリース」「破壊する」「手札に加える」などのアクション
- 「発動できる」「できる」「できる場合」などの効果条件
- 「このカード」「相手」「自分」などの相対指定
- 数値のみ（「1体」「2枚」「3回」）

## operatorの使い分け
- exact: 完全一致（「レベル7」「ドラゴン族」「光属性」）
- at_least: 以上（「レベル5以上」「攻撃力2000以上」）
- at_most: 以下（「レベル4以下」「守備力1000以下」）
- not: 以外（「レベル5以外」「光属性以外」「ドラゴン族以外」）

## 重要なルール
1. テキスト内の各条件を個別に抽出してください（重複しないように）
2. 複合条件（「光属性ドラゴン族」）は、type='composite'として抽出し、filtersに各条件を含めてください
   - 例: {"type":"composite","text":"光属性ドラゴン族","filters":{"attributes":["light"],"races":["dragon"]}}
3. 「レベル5以外」は operator='not' で抽出してください
4. カード名は「」で囲まれている場合に抽出してください
5. startIndexとendIndexは正確に設定してください（クリック対象となるテキスト範囲）

## 対象テキスト
${cardText}

## 出力
JSON形式で出力してください。
`.trim()
}

/**
 * 英語プロンプト
 */
function buildEnglishPrompt(cardText: string): string {
  return `
Extract searchable conditions from the Yu-Gi-Oh! card text.

## Extraction Targets
- Card names: "Dark Magician"
- Attributes: Light, Dark, Earth, Water, Fire, Wind
- Races: Dragon, Spellcaster, Warrior, etc.
- Level: Level N, Level N or higher, Level N or lower, except Level N
- Rank: Rank N, Rank N or higher, Rank N or lower, except Rank N
- Link: Link N, Link N or higher, Link N or lower, except Link N
- ATK: ATK N, ATK N or higher, ATK N or lower
- DEF: DEF N, DEF N or higher, DEF N or lower
- Categories: Names in "" (e.g., "V(")""V", "Albaz"")

## Do NOT Extract
- Zone specifications: "hand", "field", "GY", "deck"
- Actions: "tribute", "destroy", "add to hand"
- Effect conditions: "can activate", "you can"
- Relative references: "this card", "opponent", "you"
- Numbers only: "1 monster", "2 cards"

## Operator Usage
- exact: Exact match ("Level 7", "Dragon", "LIGHT")
- at_least: N or higher ("Level 5 or higher", "ATK 2000 or higher")
- at_most: N or lower ("Level 4 or lower", "DEF 1000 or lower")
- not: Except N ("except Level 5", "except LIGHT")

## Important Rules
1. Extract each condition individually (no duplicates)
2. For composite conditions (e.g., "LIGHT Dragon"), use type='composite' with filters
3. For "except" conditions, use operator='not'
4. Extract card names only when enclosed in ""
5. Set startIndex and endIndex accurately

## Target Text
${cardText}

## Output
Return JSON only.
`.trim()
}

/**
 * AI出力をパース
 * @param jsonString AIからのJSON出力
 * @returns 抽出結果
 */
export function parseExtractResult(jsonString: string): ExtractResult {
  try {
    return JSON.parse(jsonString) as ExtractResult
  } catch (error) {
    console.error('[ai-prompt-builder] Failed to parse AI output:', error)
    return { conditions: [] }
  }
}

/**
 * 抽出結果をテキストパーツに変換
 * @param text 元のテキスト
 * @param result 抽出結果
 * @returns テキストパーツ配列
 */
export function resultToTextParts(
  text: string,
  result: ExtractResult
) {
  const { conditions } = result

  // 条件を開始位置でソート
  const sortedConditions = [...conditions].sort((a, b) => a.startIndex - b.startIndex)

  const parts: Array<{ type: 'text' | 'link'; text: string; condition?: any }> = []
  let lastIndex = 0

  for (const condition of sortedConditions) {
    // 条件前のテキストを追加
    if (condition.startIndex > lastIndex) {
      parts.push({
        type: 'text',
        text: text.substring(lastIndex, condition.startIndex)
      })
    }

    // 条件部分をリンクとして追加
    parts.push({
      type: 'link',
      text: condition.text,
      condition
    })

    lastIndex = condition.endIndex
  }

  // 残りのテキストを追加
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      text: text.substring(lastIndex)
    })
  }

  return parts
}
