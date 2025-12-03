import { describe, it, expect } from 'vitest';
import { CardDetail, CardInfo } from '../../../src/types/card';

// Mock of the trigger logic in CardDetail.vue
function shouldTriggerRevalidation(cacheResult: { fromCache: boolean; isFresh: boolean; detail: CardDetail }): boolean {
  return cacheResult.fromCache && (!cacheResult.isFresh || !cacheResult.detail.card.ruby);
}

describe('Flow: Revalidation Trigger Logic', () => {
  it('should trigger revalidation on stale cache', async () => {
    const cardWithRuby: CardInfo = {
      cardId: '4007',
      name: '青眼の白龍',
      ruby: 'ブルーアイズ・ホワイト・ドラゴン',
      ciid: '1',
      imgs: [],
      cardType: 'monster',
      attribute: 'light',
      levelType: 'level',
      levelValue: 8,
      race: 'dragon',
      types: ['normal'],
      atk: 3000,
      def: 2500
    };

    const detailWithRuby: CardDetail = { card: cardWithRuby, packs: [], relatedCards: [], qaList: [] };

    const result = shouldTriggerRevalidation({ fromCache: true, isFresh: false, detail: detailWithRuby });
    expect(result).toBe(true);
  });

  it('should NOT trigger revalidation on fresh cache with ruby', async () => {
    const cardWithRuby: CardInfo = {
      cardId: '4007',
      name: '青眼の白龍',
      ruby: 'ブルーアイズ・ホワイト・ドラゴン',
      ciid: '1',
      imgs: [],
      cardType: 'monster',
      attribute: 'light',
      levelType: 'level',
      levelValue: 8,
      race: 'dragon',
      types: ['normal'],
      atk: 3000,
      def: 2500
    };

    const detailWithRuby: CardDetail = { card: cardWithRuby, packs: [], relatedCards: [], qaList: [] };

    const result = shouldTriggerRevalidation({ fromCache: true, isFresh: true, detail: detailWithRuby });
    expect(result).toBe(false);
  });

  it('should trigger revalidation on fresh cache without ruby', async () => {
    const cardNoRuby: CardInfo = {
      cardId: '4007',
      name: '青眼の白龍',
      ruby: undefined,
      ciid: '1',
      imgs: [],
      cardType: 'monster',
      attribute: 'light',
      levelType: 'level',
      levelValue: 8,
      race: 'dragon',
      types: ['normal'],
      atk: 3000,
      def: 2500
    };

    const detailNoRuby: CardDetail = { card: cardNoRuby, packs: [], relatedCards: [], qaList: [] };

    const result = shouldTriggerRevalidation({ fromCache: true, isFresh: true, detail: detailNoRuby });
    expect(result).toBe(true);
  });
});
