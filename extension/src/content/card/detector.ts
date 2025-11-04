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
