import type { CardListCard } from '../types/card-list'
import type { PracticeCard } from '../stores/practice'
import { getUnifiedCacheDB } from './unified-cache-db'

export function practiceCardToCardListCard(card: PracticeCard): CardListCard {
  const db = getUnifiedCacheDB()
  const info = db.getCardInfo(card.cid)

  if (!info) {
    return {
      cardId: card.cid,
      name: '',
      ciid: card.ciid,
      lang: 'ja',
      imgs: [],
      cardType: 'unknown',
      empty: false,
    }
  }

  const base: CardListCard = {
    cardId: card.cid,
    name: info.name,
    ciid: card.ciid,
    lang: info.lang,
    imgs: info.imgs ?? [],
    cardType: info.cardType,
    limitRegulation: info.limitRegulation,
    text: info.text,
    pendulumText: info.pendulumText,
    empty: false,
  }

  if (info.cardType === 'monster') {
    base.atk = info.atk
    base.def = info.def
    base.levelType = info.levelType
    base.levelValue = info.levelValue
    base.attribute = info.attribute
    base.race = info.race
    base.types = info.types
    base.isExtraDeck = info.isExtraDeck
  } else if (info.cardType === 'spell' || info.cardType === 'trap') {
    base.effectType = info.effectType
  }

  return base
}

export function practiceCardsToCardListCards(cards: PracticeCard[]): CardListCard[] {
  return cards.map(practiceCardToCardListCard)
}
