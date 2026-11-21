/**
 * カードのリミットレギュレーションに基づく制限レベルコードを取得
 * @param card カード情報
 * @returns 制限レベルコード（0=禁止, 1=制限, 2=準制限, 3=無制限）。許容枚数への変換は呼び出し側が行う
 */
import type { CardInfo } from '../types/card';

export function getCardLimit(card: CardInfo): number {
  // limitRegulationフィールドがない場合は無制限として扱う
  if (!card.limitRegulation) {
    return 3;
  }

  switch (card.limitRegulation) {
    case 'forbidden':
      return 0;
    case 'limited':
      return 1;
    case 'semi-limited':
      return 2;
    default:
      return 3;
  }
}
