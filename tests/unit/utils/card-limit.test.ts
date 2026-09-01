import { describe, it, expect } from 'vitest'
import { getCardLimit } from '@/utils/card-limit'
import type { CardInfo } from '@/types/card'

describe('utils/card-limit', () => {
  describe('getCardLimit', () => {
    // [covers:get_card_limit.forbidden_returns_0]
    it('禁止カードは0を返す', () => {
      const card: CardInfo = {
        name: 'テストカード',
        cardId: '12345',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash' }],
        limitRegulation: 'forbidden'
      }
      const result = getCardLimit(card)
      expect(result).toBe(0)
    })

    // [covers:get_card_limit.limited_returns_1]
    it('制限カードは1を返す', () => {
      const card: CardInfo = {
        name: 'テストカード',
        cardId: '12346',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash' }],
        limitRegulation: 'limited'
      }
      const result = getCardLimit(card)
      expect(result).toBe(1)
    })

    // [covers:get_card_limit.semi_limited_returns_2]
    it('準制限カードは2を返す', () => {
      const card: CardInfo = {
        name: 'テストカード',
        cardId: '12347',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash' }],
        limitRegulation: 'semi-limited'
      }
      const result = getCardLimit(card)
      expect(result).toBe(2)
    })

    // [covers:get_card_limit.missing_limit_regulation_returns_unlimited]
    it('limitRegulationがない場合は無制限（3）を返す', () => {
      const card: CardInfo = {
        name: 'テストカード',
        cardId: '12348',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash' }]
        // limitRegulation は設定しない
      }
      const result = getCardLimit(card)
      expect(result).toBe(3)
    })

    // [covers:get_card_limit.missing_limit_regulation_returns_unlimited]
    it('limitRegulationが undefined の場合は無制限（3）を返す', () => {
      const card: CardInfo = {
        name: 'テストカード',
        cardId: '12349',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash' }],
        limitRegulation: undefined
      }
      const result = getCardLimit(card)
      expect(result).toBe(3)
    })

    // [covers:get_card_limit.unknown_value_falls_to_default]
    it('未知の limitRegulation 値は無制限（3）を返す', () => {
      const card: CardInfo = {
        name: 'テストカード',
        cardId: '12350',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash' }],
        limitRegulation: 'unknown' as any
      }
      const result = getCardLimit(card)
      expect(result).toBe(3)
    })

    // [covers:get_card_limit.forbidden_returns_0,get_card_limit.limited_returns_1,get_card_limit.semi_limited_returns_2,get_card_limit.missing_limit_regulation_returns_unlimited]
    it('複数のカードで異なる制限レベルを処理できる', () => {
      const forbiddenCard: CardInfo = {
        name: 'カード1',
        cardId: '1',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash' }],
        limitRegulation: 'forbidden'
      }

      const limitedCard: CardInfo = {
        name: 'カード2',
        cardId: '2',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash' }],
        limitRegulation: 'limited'
      }

      const semiLimitedCard: CardInfo = {
        name: 'カード3',
        cardId: '3',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash' }],
        limitRegulation: 'semi-limited'
      }

      const unlimitedCard: CardInfo = {
        name: 'カード4',
        cardId: '4',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash' }]
      }

      expect(getCardLimit(forbiddenCard)).toBe(0)
      expect(getCardLimit(limitedCard)).toBe(1)
      expect(getCardLimit(semiLimitedCard)).toBe(2)
      expect(getCardLimit(unlimitedCard)).toBe(3)
    })

    // [covers:get_card_limit.limited_returns_1]
    it('カード名や言語が異なってもカード制限には影響しない', () => {
      const card1: CardInfo = {
        name: 'ブラック・マジシャン',
        cardId: '12345',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash1' }],
        limitRegulation: 'limited'
      }

      const card2: CardInfo = {
        name: 'Black Magician',
        cardId: '12345',
        ciid: '1',
        lang: 'en',
        imgs: [{ ciid: '1', imgHash: 'hash2' }],
        limitRegulation: 'limited'
      }

      expect(getCardLimit(card1)).toBe(1)
      expect(getCardLimit(card2)).toBe(1)
    })

    // [covers:get_card_limit.forbidden_returns_0,get_card_limit.limited_returns_1]
    it('同じカード（cardId）でも limitRegulation が異なると異なる制限値を返す', () => {
      const cardV1: CardInfo = {
        name: 'テストカード',
        cardId: '12345',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash' }],
        limitRegulation: 'forbidden'
      }

      const cardV2: CardInfo = {
        name: 'テストカード',
        cardId: '12345',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash' }],
        limitRegulation: 'limited'
      }

      expect(getCardLimit(cardV1)).toBe(0)
      expect(getCardLimit(cardV2)).toBe(1)
    })
  })
})
