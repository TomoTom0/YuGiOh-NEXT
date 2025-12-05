import { describe, it, expect } from 'vitest';
import { CardDetail, CardInfo } from '../../../src/types/card';

function shouldUpdate(current: CardDetail, fresh: CardDetail): boolean {
  const currentName = current.card.name;
  const freshName = fresh.card.name;
  const currentRuby = current.card.ruby;
  const freshRuby = fresh.card.ruby;
  const currentPacks = current.packs.length;
  const freshPacks = fresh.packs.length;
  const currentRelated = current.relatedCards.length;
  const freshRelated = fresh.relatedCards.length;

  return currentName !== freshName || currentRuby !== freshRuby || currentPacks !== freshPacks || currentRelated !== freshRelated;
}

describe('Flow: Revalidation Logic', () => {
  it('should detect when card details need to be updated', async () => {
    const staleCard: CardInfo = {
      cardId: '4007',
      name: '青眼の白龍',
      ruby: undefined, // Missing ruby
      ciid: '1',
      imgs: [],
      cardType: 'monster',
      attribute: 'light',
      levelType: 'level',
      levelValue: 8,
      race: 'dragon',
      types: ['normal'],
      atk: 3000,
      def: 2500,
      isExtraDeck: false
    };

    const freshCard: CardInfo = {
      ...staleCard,
      ruby: 'ブルーアイズ・ホワイト・ドラゴン' // Has ruby
    };

    const staleDetail: CardDetail = {
      card: staleCard,
      packs: [],
      relatedCards: [],
      qaList: []
    };

    const freshDetail: CardDetail = {
      card: freshCard,
      packs: [],
      relatedCards: [],
      qaList: []
    };

    const result = shouldUpdate(staleDetail, freshDetail);

    expect(result).toBe(true);
  });
});
