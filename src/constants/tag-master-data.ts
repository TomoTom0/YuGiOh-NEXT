/**
 * タググループのマスターデータ
 * 
 * deck-metadata.jsonから抽出したタグIDのリスト。
 * タグを race/attr/type/others の4グループに分類する。
 */

export const TAG_GROUPS = {
  // 属性（7個）
  attr: ['1', '2', '3', '4', '5', '6', '7'],
  
  // 種族（25個）
  race: [
    '20', '21', '22', '23', '24', '25', '26', '27', '28', '29',
    '30', '31', '32', '33', '34', '35', '36', '37', '38', '39',
    '40', '41', '42', '43', '100'
  ],
  
  // モンスタータイプ（12個）
  type: ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '110']
} as const;

export type TagGroup = 'attr' | 'race' | 'type' | 'others';

/**
 * タグIDからグループを判定
 * 
 * @param tagId - タグID（文字列）
 * @returns グループ名
 */
export function classifyTagById(tagId: string): TagGroup {
  if ((TAG_GROUPS.attr as readonly string[]).includes(tagId)) {
    return 'attr';
  }
  if ((TAG_GROUPS.race as readonly string[]).includes(tagId)) {
    return 'race';
  }
  if ((TAG_GROUPS.type as readonly string[]).includes(tagId)) {
    return 'type';
  }
  return 'others';
}

/**
 * モンスタータイプのタグIDマッピング
 * タグIDから直接タイプを判定（ラベル依存を排除）
 */
const MONSTER_TYPE_MAP: Record<string, string> = {
  '8': 'fusion',      // 融合
  '9': 'ritual',      // 儀式
  '10': 'spirit',     // スピリット
  '11': 'union',      // ユニオン
  '12': 'dual',       // デュアル
  '13': 'tuner',      // チューナー
  '14': 'synchro',    // シンクロ
  '15': 'xyz',        // エクシーズ
  '16': 'pendulum',   // ペンデュラム
  '17': 'flip',       // リバース
  '18': 'toon',       // トゥーン
  '110': 'link'       // リンク
};

/**
 * タグIDからモンスタータイプを取得
 *
 * @param tagId - タグID
 * @returns モンスタータイプ（fusion, synchro, xyz など）、該当しない場合は空文字
 */
export function getMonsterTypeById(tagId: string): string {
  return MONSTER_TYPE_MAP[tagId] || '';
}
