/**
 * disabled reason をユーザー向けの日本語テキストにフォーマットする
 *
 * 排外エンジンから呼ばれ、直接表示用のテキストを生成する
 */

import { mappingManager } from './mapping-manager';

/**
 * 属性ID から表示用ラベルを取得
 * 例: "monster-type_fusion" → "融合モンスター"
 *     "card-type_spell" → "魔法"
 *     "attribute_water" → "水"
 *     "race_dragon" → "ドラゴン"
 */
function getAttributeDisplayLabel(attrId: string): string {
  // monster-type_* 形式
  const monsterTypeMatch = attrId.match(/^monster-type_(.+)$/);
  if (monsterTypeMatch) {
    const type = monsterTypeMatch[1];
    const idToText = mappingManager.getMonsterTypeIdToText('ja');
    return (idToText as Record<string, string>)[type] || type;
  }

  // card-type_* 形式
  const cardTypeMatch = attrId.match(/^card-type_(.+)$/);
  if (cardTypeMatch) {
    const type = cardTypeMatch[1];
    const labels: Record<string, string> = {
      'monster': 'モンスター',
      'spell': '魔法',
      'trap': '罠'
    };
    return labels[type] || type;
  }

  // attribute_* 形式
  const attributeMatch = attrId.match(/^attribute_(.+)$/);
  if (attributeMatch) {
    const attr = attributeMatch[1];
    const idToText = mappingManager.getAttributeIdToText('ja');
    const label = (idToText as Record<string, string>)[attr];
    return label || attr;
  }

  // race_* 形式
  const raceMatch = attrId.match(/^race_(.+)$/);
  if (raceMatch) {
    const race = raceMatch[1];
    const idToText = mappingManager.getRaceIdToText('ja');
    const label = (idToText as Record<string, string>)[race];
    return label || race;
  }

  // spell-type_* 形式
  const spellTypeMatch = attrId.match(/^spell-type_(.+)$/);
  if (spellTypeMatch) {
    const type = spellTypeMatch[1];
    const labels: Record<string, string> = {
      'normal': '通常魔法',
      'quick': '速攻魔法',
      'ritual': '儀式魔法',
      'continuous': '永続魔法',
      'equip': '装備魔法',
      'field': 'フィールド魔法'
    };
    return labels[type] || type;
  }

  // trap-type_* 形式
  const trapTypeMatch = attrId.match(/^trap-type_(.+)$/);
  if (trapTypeMatch) {
    const type = trapTypeMatch[1];
    const labels: Record<string, string> = {
      'normal': '通常罠',
      'continuous': '永続罠',
      'counter': 'カウンター罠'
    };
    return labels[type] || type;
  }

  return attrId;
}

/**
 * フィールド名 から表示用ラベルを取得
 * 例: "level-rank" → "レベル/ランク"
 */
function getFieldDisplayLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    'level-rank': 'レベル/ランク',
    'link-value': 'リンク数',
    'link-marker': 'リンクマーカー',
    'p-scale': 'Pスケール',
    'def': 'DEF',
    'atk': 'ATK',
    'attribute': '属性',
    'race': '種族',
    'monster-type': 'モンスタータイプ',
    'spell-type': '魔法タイプ',
    'trap-type': '罠タイプ'
  };
  return labels[fieldName] || fieldName;
}

/**
 * 無効化理由を表示用テキストにフォーマット
 *
 * @param type 理由のタイプ
 * @param source 無効化の原因（属性ID、フィールド名など）
 * @param details 詳細情報（複数フィールド、複数属性など）
 * @returns ユーザー向けの表示テキスト
 */
export function formatDisabledReason(
  type: 'field-to-attribute' | 'attribute-exclusion' | 'attribute-unavailable' | 'attribute-to-field',
  source: string | string[],
  details?: string | string[]
): string {
  switch (type) {
    case 'field-to-attribute': {
      // 項目の入力により属性が必須化された場合
      // 例: ["level-rank", "def"] → "レベル/ランク、DEFが選択/入力されているため"
      const fields = Array.isArray(source) ? source : [source];
      const labels = fields.map(f => getFieldDisplayLabel(f));
      if (labels.length > 1) {
        return `${labels.join('、')}が選択/入力されているため`;
      }
      return `${labels[0]}が選択/入力されているため`;
    }

    case 'attribute-exclusion': {
      // 排他グループにより他の属性が無効化された場合
      // 例: "monster-type_fusion" → "融合モンスターが選択されているため"
      const attrId = typeof source === 'string' ? source : source[0];
      const label = getAttributeDisplayLabel(attrId);
      return `${label}が選択されているため`;
    }

    case 'attribute-unavailable': {
      // 必須属性が選択不可になった場合
      // 例: "monster-type_link" → "リンクモンスターが選択されているため"
      const attrId = typeof source === 'string' ? source : source[0];
      const label = getAttributeDisplayLabel(attrId);
      return `${label}が選択されているため`;
    }

    case 'attribute-to-field': {
      // 属性の選択により項目が無効化された場合
      // 例: "monster-type_link" → "リンクモンスターが選択されているため"
      const attrId = typeof source === 'string' ? source : source[0];
      const label = getAttributeDisplayLabel(attrId);
      return `${label}が選択されているため`;
    }

    default:
      return '';
  }
}
