/**
 * フィルター条件のラベル変換ユーティリティ
 * SearchInputBarとSearchFilterDialogで共通使用
 *
 * 多言語対応：mappingManagerから動的に取得、フォールバックで日本語静的マッピング使用
 */

import {
  RACE_ID_TO_SHORTNAME,
  CARD_TYPE_ID_TO_SHORTNAME,
  MONSTER_TYPE_ID_TO_SHORTNAME
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
 * @param lang 言語コード（省略時はdetectLanguageで検出）
 */
export function getMonsterTypeLabel(value: string, lang?: string): string {
  const language = lang || (typeof document !== 'undefined' ? detectLanguage(document) : 'ja');
  const idToText = mappingManager.getMonsterTypeIdToText(language);

  // 動的マッピングから短縮形を取得、またはカード-maps の短縮形を使用
  const dynamicLabel = (idToText as Record<string, string>)[value];
  if (dynamicLabel) {
    // 動的マッピングが見つかった場合、短縮形を作成（最初の2文字）
    return dynamicLabel.slice(0, 2);
  }

  // フォールバック：日本語静的マッピング
  return (MONSTER_TYPE_ID_TO_SHORTNAME as Record<string, string>)[value] || value;
}

/**
 * 種族のラベルを取得（チップ用短縮形）
 * @param value 種族ID（例: 'dragon', 'zombie'）
 * @param lang 言語コード（省略時はdetectLanguageで検出）
 */
export function getRaceLabel(value: string, lang?: string): string {
  const language = lang || (typeof document !== 'undefined' ? detectLanguage(document) : 'ja');
  const idToText = mappingManager.getRaceIdToText(language);

  // 動的マッピングから短縮形を取得、またはカード-maps の短縮形を使用
  const dynamicLabel = (idToText as Record<string, string>)[value];
  if (dynamicLabel) {
    // 動的マッピングが見つかった場合、短縮形を作成（最初の1文字）
    return dynamicLabel.slice(0, 1);
  }

  // フォールバック：日本語静的マッピング
  return (RACE_ID_TO_SHORTNAME as Record<string, string>)[value] || value.slice(0, 1);
}

/**
 * 魔法タイプのラベルを取得（フルネーム）
 * @param value 魔法効果タイプID（例: 'normal', 'quick'）
 * @param lang 言語コード（省略時はdetectLanguageで検出）
 */
export function getSpellTypeLabel(value: string, lang?: string): string {
  const language = lang || (typeof document !== 'undefined' ? detectLanguage(document) : 'ja');
  const idToText = mappingManager.getSpellEffectIdToText(language);
  return (idToText as Record<string, string>)[value] || value;
}

/**
 * 罠タイプのラベルを取得（フルネーム）
 * @param value 罠効果タイプID（例: 'normal', 'continuous'）
 * @param lang 言語コード（省略時はdetectLanguageで検出）
 */
export function getTrapTypeLabel(value: string, lang?: string): string {
  const language = lang || (typeof document !== 'undefined' ? detectLanguage(document) : 'ja');
  const idToText = mappingManager.getTrapEffectIdToText(language);
  return (idToText as Record<string, string>)[value] || value;
}

/**
 * フィルターチップのラベルを取得（SearchInputBarで使用）
 * 注意: ATK/DEFについてはformatStatLabelを使用すること
 * @param lang 言語コード（省略時はdetectLanguageで検出）
 */
export function getChipLabel(type: string, value: string, lang?: string): string {
  switch (type) {
    case 'attributes':
      return getAttributeLabel(value, lang);
    case 'cardType':
      return getCardTypeLabel(value);
    case 'monsterTypes':
      return getMonsterTypeLabel(value, lang);
    case 'levels':
      return `★${value}`;
    case 'linkNumbers':
      return `L${value}`;
    case 'atk':
    case 'def':
      // ATK/DEFは使用すべきでない - formatStatLabelを使うこと
      throw new Error(`getChipLabel should not be used for ${type}. Use formatStatLabel instead.`);
    case 'races':
      return getRaceLabel(value, lang);
    default:
      return value;
  }
}
