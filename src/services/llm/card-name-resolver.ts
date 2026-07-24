import type { CardInfo } from '@/types/card';
import type { CardResolution, DeckSections } from './types';
import { searchCards } from '@/api/card-search';

function matchCards(query: string, cards: CardInfo[]): CardInfo[] {
  const q = query.toLowerCase();
  return cards.filter(c => {
    const name = (c.name ?? '').toLowerCase();
    const ruby = (c.ruby ?? '').toLowerCase();
    return name.includes(q) || ruby.includes(q);
  });
}

function toResolution(card: CardInfo): CardResolution {
  return {
    cardId: card.cardId,
    ciid: card.ciid,
    name: card.name,
    isAmbiguous: false,
  };
}

export async function resolveCardName(
  query: string,
  deckSections: DeckSections
): Promise<CardResolution | { ambiguous: true; candidates: Array<{ cardId: string; ciid: string; name: string }> } | { notFound: true }> {
  const stages: CardInfo[][] = [
    [...deckSections.main, ...deckSections.extra],
    [...deckSections.side],
    [...deckSections.trash],
    [...deckSections.searchResults],
  ];

  for (const pool of stages) {
    const hits = matchCards(query, pool);
    if (hits.length === 1) {
      return toResolution(hits[0]!);
    }
    if (hits.length > 1) {
      return {
        ambiguous: true,
        candidates: hits.slice(0, 5).map(c => ({ cardId: c.cardId, ciid: c.ciid, name: c.name })),
      };
    }
  }

  // 公式APIで検索
  const apiResults = await searchCards({ keyword: query, searchType: '1' });
  if (apiResults.length === 1) {
    return toResolution(apiResults[0]!);
  }
  if (apiResults.length > 1) {
    return {
      ambiguous: true,
      candidates: apiResults.slice(0, 5).map(c => ({ cardId: c.cardId, ciid: c.ciid, name: c.name })),
    };
  }

  return { notFound: true };
}
