/**
 * フィルター条件のラベル変換ユーティリティ
 * SearchInputBarとSearchFilterDialogで共通使用
 *
 * 多言語対応：mappingManagerから動的に取得、フォールバックで日本語静的マッピング使用
 */

import {
  RACE_ID_TO_SHORTNAME,
  CARD_TYPE_ID_TO_SHORTNAME,
  MONSTER_TYPE_ID_TO_SHORTNAME,
  SPELL_EFFECT_TYPE_ID_TO_NAME,
  TRAP_EFFECT_TYPE_ID_TO_NAME
} from '@/types/card-maps';
import { mappingManager } from './mapping-manager';
import { detectLanguage } from './language-detector';

/**
 * 属性のラベルを取得（チップ用・フルネーム）
 * @param value 属性ID（例: 'water', 'fire'）
 * @param lang 言語コード（省略時はdetectLanguageで検出）
 */
export function getAttributeLabel(value: string, lang?: string): string {
  const language = lang || (typeof document !== 'undefined' ? detectLanguage(document) : 'ja');
  const idToText = mappingManager.getAttributeIdToText(language);
  return (idToText as Record<string, string>)[value] || value;
}

/**
 * カードタイプのラベルを取得（チップ用短縮形）
 */
export function getCardTypeLabel(value: string): string {
  return (CARD_TYPE_ID_TO_SHORTNAME as Record<string, string>)[value] || value;
}

/**
 * モンスタータイプのラベルを取得（チップ用短縮形）
 * @param value モンスタータイプID（例: 'fusion', 'synchro'）
 */
export function getMonsterTypeLabel(value: string): string {
  // card-maps.ts のハードコードされた shortname を使用
  return (MONSTER_TYPE_ID_TO_SHORTNAME as Record<string, string>)[value] || value;
}

/**
 * 種族のラベルを取得（チップ用短縮形）
 * @param value 種族ID（例: 'dragon', 'zombie'）
 */
export function getRaceLabel(value: string): string {
  // card-maps.ts のハードコードされた shortname を使用
  return (RACE_ID_TO_SHORTNAME as Record<string, string>)[value] || value.slice(0, 2);
}

/**
 * 魔法タイプのラベルを取得（短形式）
 * @param value 魔法効果タイプID（例: 'normal', 'quick'）
 */
export function getSpellTypeLabel(value: string): string {
  // card-maps.ts の SPELL_EFFECT_TYPE_ID_TO_NAME を使用（「通常」「速攻」などの短形式）
  return (SPELL_EFFECT_TYPE_ID_TO_NAME as Record<string, string>)[value] || value;
}

/**
 * 罠タイプのラベルを取得（短形式）
 * @param value 罠効果タイプID（例: 'normal', 'continuous'）
 */
export function getTrapTypeLabel(value: string): string {
  // card-maps.ts の TRAP_EFFECT_TYPE_ID_TO_NAME を使用（「通常」「永続」などの短形式）
  return (TRAP_EFFECT_TYPE_ID_TO_NAME as Record<string, string>)[value] || value;
}

/**
 * フィルターチップのラベルを取得（SearchInputBarで使用）
 * 注意: ATK/DEFについてはformatStatLabelを使用すること
 */
export function getChipLabel(type: string, value: string): string {
  switch (type) {
    case 'attributes':
      return getAttributeLabel(value);
    case 'cardType':
      return getCardTypeLabel(value);
    case 'monsterTypes':
      return getMonsterTypeLabel(value);
    case 'levels':
      return `★${value}`;
    case 'linkNumbers':
      return `L${value}`;
    case 'atk':
    case 'def':
      // ATK/DEFは使用すべきでない - formatStatLabelを使うこと
      throw new Error(`getChipLabel should not be used for ${type}. Use formatStatLabel instead.`);
    case 'races':
      return getRaceLabel(value);
    default:
      return value;
  }
}
