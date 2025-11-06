import { CardType } from '@/types/card';

/**
 * DOM要素からカードタイプを検出する
 *
 * 検出方法（ロケール非依存）：
 * - img要素のsrc属性に 'attribute_icon_spell' が含まれる → 魔法
 * - img要素のsrc属性に 'attribute_icon_trap' が含まれる → 罠
 * - img要素のsrc属性に 'attribute_icon_' が含まれる（上記以外） → モンスター
 *
 * @param row カード行のHTML要素
 * @returns カードタイプ、検出できない場合はnull
 */
export function detectCardType(row: HTMLElement): CardType | null {
  // .box_card_attribute要素内のimg要素を取得
  const img = row.querySelector('.box_card_attribute img') as HTMLImageElement;

  if (!img) {
    return null;
  }

  const src = img.src || '';

  if (!src) {
    return null;
  }

  // src属性の文字列から判定
  if (src.includes('attribute_icon_spell')) {
    return '魔法';
  } else if (src.includes('attribute_icon_trap')) {
    return '罠';
  } else if (src.includes('attribute_icon_')) {
    // モンスターの属性アイコン（light, dark, water, fire, earth, wind, divine）
    return 'モンスター';
  }

  // 認識できないアイコンの場合
  return null;
}

/**
 * モンスターがエクストラデッキに入るかどうかを判定する
 *
 * 判定方法（構造ベース）:
 * 1. レベル/ランク要素のimgが `icon_rank.png` を含む → エクシーズ（エクストラ）
 * 2. レベル/ランク要素が存在しない → リンク（エクストラ）
 * 3. 種族・タイプに「融合」または「シンクロ」が含まれる → 融合/シンクロ（エクストラ）
 *
 * @param row カード行のHTML要素
 * @returns エクストラデッキモンスターの場合true、それ以外false
 */
export function isExtraDeckMonster(row: HTMLElement): boolean {
  // 1. レベル/ランク要素を取得
  const levelRankElem = row.querySelector('.box_card_level_rank');

  if (levelRankElem) {
    // imgのsrcを確認
    const img = levelRankElem.querySelector('img') as HTMLImageElement;
    if (img && img.src.includes('icon_rank.png')) {
      // エクシーズモンスター
      return true;
    }
  } else {
    // 2. レベル/ランク要素が存在しない → リンクモンスター
    // ただし、モンスターカードであることを確認
    const cardType = detectCardType(row);
    if (cardType === 'モンスター') {
      return true;
    }
  }

  // 3. 種族・タイプテキストで融合・シンクロを判定
  const speciesElem = row.querySelector('.card_info_species_and_other_item');
  if (speciesElem) {
    const speciesText = speciesElem.textContent || '';
    if (speciesText.includes('融合') || speciesText.includes('シンクロ')) {
      return true;
    }
  }

  // それ以外はメインデッキ
  return false;
}
