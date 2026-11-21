/**
 * カードのリミットレギュレーションに基づく枚数制限を取得
 * @param card カード情報
 * @returns 制限枚数（0=禁止カード, 1=制限カード, 2=準制限カード, 3=無制限）
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
