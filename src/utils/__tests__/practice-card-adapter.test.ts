import { describe, it, expect, vi, beforeEach } from 'vitest'
import { practiceCardToCardListCard, practiceCardsToCardListCards } from '../practice-card-adapter'
import type { PracticeCard } from '../../stores/practice'
import type { CardInfo } from '../../types/card'

vi.mock('../unified-cache-db', () => ({
  getUnifiedCacheDB: vi.fn(),
}))

import { getUnifiedCacheDB } from '../unified-cache-db'

const mockGetCardInfo = vi.fn()
const mockGetUnifiedCacheDB = getUnifiedCacheDB as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockGetUnifiedCacheDB.mockReturnValue({ getCardInfo: mockGetCardInfo })
  mockGetCardInfo.mockReset()
})

function makePracticeCard(cid: string, ciid = '0'): PracticeCard {
  return {
    id: `id-${cid}`,
    cid,
    ciid,
    face: 'up',
    orientation: 'vertical',
  }
}

const mockMonsterInfo = {
  cardId: '100',
  name: 'Test Monster',
  ciid: '0',
  lang: 'ja',
  imgs: [{ ciid: '0', imgHash: 'abc' }],
  cardType: 'monster' as const,
  limitRegulation: undefined,
  text: 'Test effect',
  pendulumText: undefined,
  atk: 2500,
  def: 2100,
  levelType: 'level' as const,
  levelValue: 8,
  attribute: 'dark',
  race: 'dragon',
  types: ['effect'],
  isExtraDeck: false,
}

const mockSpellInfo = {
  cardId: '200',
  name: 'Test Spell',
  ciid: '0',
  lang: 'ja',
  imgs: [{ ciid: '0', imgHash: 'def' }],
  cardType: 'spell' as const,
  limitRegulation: 'limited' as const,
  text: 'Spell effect',
  pendulumText: undefined,
  effectType: 'normal',
}

describe('practiceCardToCardListCard', () => {
  it('returns unknown card when info not found', () => {
    mockGetCardInfo.mockReturnValue(null)
    const card = makePracticeCard('unknown')

    const result = practiceCardToCardListCard(card)

    expect(result).toEqual({
      cardId: 'unknown',
      name: '',
      ciid: '0',
      lang: 'ja',
      imgs: [],
      cardType: 'unknown',
      empty: false,
    })
  })

  it('converts monster card with all fields', () => {
    mockGetCardInfo.mockReturnValue(mockMonsterInfo)
    const card = makePracticeCard('100')

    const result = practiceCardToCardListCard(card)

    expect(result.cardId).toBe('100')
    expect(result.name).toBe('Test Monster')
    expect(result.cardType).toBe('monster')
    expect(result.atk).toBe(2500)
    expect(result.def).toBe(2100)
    expect(result.levelType).toBe('level')
    expect(result.levelValue).toBe(8)
    expect(result.attribute).toBe('dark')
    expect(result.race).toBe('dragon')
    expect(result.types).toEqual(['effect'])
    expect(result.isExtraDeck).toBe(false)
    expect(result.empty).toBe(false)
  })

  it('converts spell card with effectType', () => {
    mockGetCardInfo.mockReturnValue(mockSpellInfo)
    const card = makePracticeCard('200')

    const result = practiceCardToCardListCard(card)

    expect(result.cardId).toBe('200')
    expect(result.cardType).toBe('spell')
    expect(result.effectType).toBe('normal')
    expect(result.limitRegulation).toBe('limited')
    expect(result.atk).toBeUndefined()
  })

  it('uses practiceCard ciid over info ciid', () => {
    mockGetCardInfo.mockReturnValue(mockMonsterInfo)
    const card = makePracticeCard('100', '99')

    const result = practiceCardToCardListCard(card)

    expect(result.ciid).toBe('99')
  })
})

describe('practiceCardsToCardListCards', () => {
  it('converts empty array', () => {
    const result = practiceCardsToCardListCards([])
    expect(result).toEqual([])
  })

  it('converts multiple cards', () => {
    mockGetCardInfo
      .mockReturnValueOnce(mockMonsterInfo)
      .mockReturnValueOnce(mockSpellInfo)

    const cards = [makePracticeCard('100'), makePracticeCard('200')]
    const result = practiceCardsToCardListCards(cards)

    expect(result).toHaveLength(2)
    expect(result[0].cardType).toBe('monster')
    expect(result[1].cardType).toBe('spell')
  })

  it('handles mix of found and not-found cards', () => {
    mockGetCardInfo
      .mockReturnValueOnce(mockMonsterInfo)
      .mockReturnValueOnce(null)

    const cards = [makePracticeCard('100'), makePracticeCard('unknown')]
    const result = practiceCardsToCardListCards(cards)

    expect(result).toHaveLength(2)
    expect(result[0].cardType).toBe('monster')
    expect(result[1].cardType).toBe('unknown')
  })
})
