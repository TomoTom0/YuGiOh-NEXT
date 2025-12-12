/**
 * card-maps.ts から逆引きマップを動的生成するユーティリティ（REQ-20対応）
 *
 * 日本語/英語 → 内部ID の逆引きマップを生成
 */

import {
  ATTRIBUTE_ID_TO_NAME,
  CARD_TYPE_ID_TO_NAME,
  MONSTER_TYPE_ID_TO_NAME
} from '../types/card-maps'

/**
 * ID→名前マップから逆引きマップを生成
 *
 * 例: { light: '光', dark: '闇' } → { '光': 'light', 'light': 'light', '闇': 'dark', 'dark': 'dark' }
 */
function createReverseMap<T extends Record<string, string>>(
  idToNameMap: T,
  additionalMappings?: Record<string, string>
): Record<string, string> {
  const reverseMap: Record<string, string> = {}

  // 日本語 → ID のマッピング
  for (const [id, name] of Object.entries(idToNameMap)) {
    reverseMap[name] = id
    reverseMap[id] = id  // 英語 → ID のマッピングも追加
  }

  // 追加のマッピング（短縮形など）
  if (additionalMappings) {
    Object.assign(reverseMap, additionalMappings)
  }

  return reverseMap
}

/**
 * 属性の逆引きマップ
 * 日本語/英語 → 内部ID（例: '光' → 'light', 'light' → 'light'）
 */
export const ATTRIBUTE_REVERSE_MAP = createReverseMap(ATTRIBUTE_ID_TO_NAME)

/**
 * カードタイプの逆引きマップ
 * 日本語/英語/短縮形 → 内部ID（例: 'モンスター' → 'monster', 'm' → 'monster'）
 */
export const CARD_TYPE_REVERSE_MAP = createReverseMap(
  CARD_TYPE_ID_TO_NAME,
  {
    // 短縮形
    'm': 'monster',
    's': 'spell',
    't': 'trap'
  }
)

/**
 * モンスタータイプの逆引きマップ
 * 日本語/英語 → 内部ID（例: '通常' → 'normal', 'normal' → 'normal'）
 */
export const MONSTER_TYPE_REVERSE_MAP = createReverseMap(
  MONSTER_TYPE_ID_TO_NAME,
  {
    // 表記ゆれ対応
    'dual': 'gemini',    // デュアル の英語表記
    'reverse': 'flip'    // リバース の英語表記
  }
)
