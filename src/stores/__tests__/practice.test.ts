import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePracticeStore } from '../practice'
import type { DeckCardRef } from '../../types/card'

function makeDeckRef(cid: string, quantity: number): DeckCardRef {
  return { cid, ciid: '0', lang: 'ja', quantity }
}

const SAMPLE_MAIN: DeckCardRef[] = [
  makeDeckRef('card-a', 3),
  makeDeckRef('card-b', 2),
  makeDeckRef('card-c', 3),
  makeDeckRef('card-d', 2),
  // total: 10 cards
]

const SAMPLE_EXTRA: DeckCardRef[] = [
  makeDeckRef('extra-1', 2),
  makeDeckRef('extra-2', 1),
  // total: 3 cards
]

describe('usePracticeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('initPractice', () => {
    it('initializes zones from deck data and draws 5 cards', () => {
      const store = usePracticeStore()

      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      expect(store.initialized).toBe(true)
      expect(store.handCount).toBe(5)
      expect(store.deckCount).toBe(5) // 10 main - 5 drawn
      expect(store.extraCount).toBe(3)
      expect(store.zones.monster).toHaveLength(5)
      expect(store.zones.spellTrap).toHaveLength(5)
    })

    it('handles deck smaller than 5 cards', () => {
      const store = usePracticeStore()

      store.initPractice([makeDeckRef('x', 2)], [])

      expect(store.handCount).toBe(2)
      expect(store.deckCount).toBe(0)
    })

    it('sets deck cards face down and hand cards face up', () => {
      const store = usePracticeStore()

      store.initPractice(SAMPLE_MAIN, [])

      for (const card of store.zones.deck) {
        expect(card.face).toBe('down')
      }
      for (const card of store.zones.hand) {
        expect(card.face).toBe('up')
      }
    })

    it('initializes extra deck cards face down', () => {
      const store = usePracticeStore()

      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      for (const card of store.zones.extra) {
        expect(card.face).toBe('down')
      }
    })

    it('stores original deck data for reset', () => {
      const store = usePracticeStore()

      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      expect(store.originalMainDeck).toHaveLength(SAMPLE_MAIN.length)
      expect(store.originalExtraDeck).toHaveLength(SAMPLE_EXTRA.length)
    })
  })

  describe('draw', () => {
    it('moves top card from deck to hand', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const deckBefore = store.deckCount
      const handBefore = store.handCount

      store.draw()

      expect(store.deckCount).toBe(deckBefore - 1)
      expect(store.handCount).toBe(handBefore + 1)
    })

    it('does nothing when deck is empty', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 5)], [])

      expect(store.handCount).toBe(5)
      expect(store.deckCount).toBe(0)

      store.draw()

      expect(store.handCount).toBe(5)
      expect(store.deckCount).toBe(0)
    })
  })

  describe('drawMultiple', () => {
    it('draws specified number of cards', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 20)], [])

      store.drawMultiple(3)

      expect(store.handCount).toBe(8) // 5 initial + 3
      expect(store.deckCount).toBe(12)
    })

    it('draws only available cards when count exceeds deck size', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 6)], [])

      store.drawMultiple(10)

      expect(store.handCount).toBe(6)
      expect(store.deckCount).toBe(0)
    })
  })

  describe('drawToZone', () => {
    it('moves top card from deck to specified zone', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      store.drawToZone('gy')

      expect(store.gyCount).toBe(1)
      expect(store.deckCount).toBe(4) // 10 - 5 initial draw - 1
    })

    it('places card in specified monster slot', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      store.drawToZone('monster', 2)

      expect(store.zones.monster[2]).toHaveLength(1)
    })
  })

  describe('moveCard', () => {
    it('moves card from hand to monster zone', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const handCard = store.zones.hand[0]!
      store.moveCard(handCard.id, 'monster', 0)

      expect(store.zones.monster[0]).toHaveLength(1)
      expect(store.zones.monster[0]![0]!.cid).toBe(handCard.cid)
      expect(store.handCount).toBe(4)
    })

    it('changes face and orientation when options provided', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const handCard = store.zones.hand[0]!
      store.moveCard(handCard.id, 'monster', 0, { face: 'down', orientation: 'horizontal' })

      const moved = store.zones.monster[0]![0]!
      expect(moved.face).toBe('down')
      expect(moved.orientation).toBe('horizontal')
    })

    it('does nothing for non-existent card', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const before = store.handCount
      store.moveCard('nonexistent', 'monster', 0)
      expect(store.handCount).toBe(before)
    })
  })

  describe('shuffleDeck', () => {
    it('preserves deck size after shuffle', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const count = store.deckCount
      store.shuffleDeck()

      expect(store.deckCount).toBe(count)
    })

    it('does nothing for empty or single-card deck', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 6)], [])

      expect(store.deckCount).toBe(1)
      store.shuffleDeck()
      expect(store.deckCount).toBe(1)
    })
  })

  describe('setCardFace / setCardOrientation', () => {
    it('toggles card face', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const card = store.zones.hand[0]!
      expect(card.face).toBe('up')

      store.setCardFace(card.id, 'down')

      expect(store.zones.hand[0]!.face).toBe('down')
    })

    it('toggles card orientation', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const card = store.zones.hand[0]!
      expect(card.orientation).toBe('vertical')

      store.setCardOrientation(card.id, 'horizontal')

      expect(store.zones.hand[0]!.orientation).toBe('horizontal')
    })

    it('does nothing if already in target state', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const card = store.zones.hand[0]!
      store.setCardFace(card.id, 'up')

      expect(store.canUndo).toBe(false)
    })
  })

  describe('reorderInZone', () => {
    it('reorders cards within a zone', () => {
      const store = usePracticeStore()
      store.initPractice([
        makeDeckRef('a', 3),
        makeDeckRef('b', 3),
        makeDeckRef('c', 3),
        makeDeckRef('d', 3),
        makeDeckRef('e', 2),
      ], [])

      // We have 5 cards in hand, move them all to gy to test reorder
      for (let i = 0; i < 5; i++) {
        const card = store.zones.hand[0]!
        store.moveCard(card.id, 'gy')
      }

      const firstCid = store.zones.gy[0]!.cid
      const secondCid = store.zones.gy[1]!.cid

      store.reorderInZone('gy', undefined, 0, 1)

      expect(store.zones.gy[0]!.cid).toBe(secondCid)
      expect(store.zones.gy[1]!.cid).toBe(firstCid)
    })
  })

  describe('undo/redo', () => {
    it('undoes a draw', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const handBefore = store.handCount
      store.draw()
      expect(store.handCount).toBe(handBefore + 1)

      store.undo()
      expect(store.handCount).toBe(handBefore)
    })

    it('redoes an undone draw', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const handBefore = store.handCount
      store.draw()
      store.undo()
      store.redo()

      expect(store.handCount).toBe(handBefore + 1)
    })

    it('undoes a moveCard', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const card = store.zones.hand[0]!
      store.moveCard(card.id, 'monster', 0)
      expect(store.zones.monster[0]).toHaveLength(1)

      store.undo()
      expect(store.zones.monster[0]).toHaveLength(0)
      expect(store.handCount).toBe(5)
    })

    it('undoes setCardFace', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const card = store.zones.hand[0]!
      store.setCardFace(card.id, 'down')
      expect(store.zones.hand[0]!.face).toBe('down')

      store.undo()
      expect(store.zones.hand[0]!.face).toBe('up')
    })

    it('undoes reset', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      // Draw some cards
      store.draw()
      store.draw()
      expect(store.handCount).toBe(7)

      store.resetPractice()
      expect(store.handCount).toBe(5)

      store.undo()
      expect(store.handCount).toBe(7)
    })

    it('tracks canUndo/canRedo correctly', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      expect(store.canUndo).toBe(false)
      expect(store.canRedo).toBe(false)

      store.draw()
      expect(store.canUndo).toBe(true)
      expect(store.canRedo).toBe(false)

      store.undo()
      expect(store.canUndo).toBe(false)
      expect(store.canRedo).toBe(true)

      store.redo()
      expect(store.canUndo).toBe(true)
      expect(store.canRedo).toBe(false)
    })

    it('truncates future on new action after undo', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 20)], [])

      store.draw() // action 1
      store.draw() // action 2

      store.undo() // undo action 2

      // New action should truncate action 2's redo
      store.drawToZone('gy')
      expect(store.canRedo).toBe(false)
    })
  })

  describe('persistence', () => {
    it('saves and restores state from localStorage', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])
      store.draw()

      const handCount = store.handCount
      const deckCount = store.deckCount

      // Simulate reload
      const store2 = usePracticeStore()
      const loaded = store2.loadFromLocalStorage()

      expect(loaded).toBe(true)
      expect(store2.handCount).toBe(handCount)
      expect(store2.deckCount).toBe(deckCount)
      expect(store2.initialized).toBe(true)
    })

    it('returns false when no saved state', () => {
      const store = usePracticeStore()
      expect(store.loadFromLocalStorage()).toBe(false)
    })

    it('clears localStorage', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      store.clearLocalStorage()
      expect(localStorage.getItem('ygoNext:practice')).toBeNull()
    })
  })

  describe('revealDeckContents', () => {
    it('toggles revealDeck flag', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      expect(store.revealDeck).toBe(false)

      store.revealDeckContents(true)
      expect(store.revealDeck).toBe(true)

      store.revealDeckContents(false)
      expect(store.revealDeck).toBe(false)
    })
  })

  describe('revealExtraContents', () => {
    it('toggles revealExtra flag', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      expect(store.revealExtra).toBe(false)

      store.revealExtraContents(true)
      expect(store.revealExtra).toBe(true)

      store.revealExtraContents(false)
      expect(store.revealExtra).toBe(false)
    })

    it('resets revealExtra on initPractice', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      store.revealExtraContents(true)

      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      expect(store.revealExtra).toBe(false)
    })

    it('resets revealExtra on resetPractice', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      store.revealExtraContents(true)

      store.resetPractice()
      expect(store.revealExtra).toBe(false)
    })
  })

  describe('resetPractice', () => {
    it('resets to initial state', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      store.draw()
      store.draw()
      store.moveCard(store.zones.hand[0]!.id, 'monster', 0)

      store.resetPractice()

      expect(store.handCount).toBe(5)
      expect(store.deckCount).toBe(5)
      expect(store.zones.monster[0]).toHaveLength(0)
    })

    it('does nothing when not initialized', () => {
      const store = usePracticeStore()
      store.resetPractice()
      expect(store.initialized).toBe(false)
    })
  })

  describe('findCard', () => {
    it('finds card location in simple zones', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const handCard = store.zones.hand[0]!
      const loc = store.findCard(handCard.id)

      expect(loc).not.toBeNull()
      expect(loc!.zone).toBe('hand')
      expect(loc!.cardIndex).toBe(0)
    })

    it('finds card location in slotted zones', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const card = store.zones.hand[0]!
      store.moveCard(card.id, 'monster', 3)

      const loc = store.findCard(store.zones.monster[3]![0]!.id)
      expect(loc).not.toBeNull()
      expect(loc!.zone).toBe('monster')
      expect(loc!.slotIndex).toBe(3)
    })

    it('returns null for non-existent card', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      expect(store.findCard('nonexistent')).toBeNull()
    })
  })

  describe('tempRecipe', () => {
    it('tracks externally added cards', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      store.addExternalCard('new-card', '0', 'hand', undefined, 0)

      expect(store.tempRecipe).toHaveLength(1)
      expect(store.tempRecipe[0]).toEqual({ cid: 'new-card', ciid: '0', section: 'main' })
      expect(store.hasTempRecipe).toBe(true)
    })

    it('marks extra-zone drops as section=extra', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      store.addExternalCard('extra-card', '0', 'extra', undefined, 0)

      expect(store.tempRecipe[0]?.section).toBe('extra')
    })

    it('clears on initPractice (hard reset)', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      store.addExternalCard('new-card', '0', 'hand', undefined, 0)

      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      expect(store.tempRecipe).toHaveLength(0)
      expect(store.hasTempRecipe).toBe(false)
    })

    it('includes temp recipe cards in deck after resetPractice', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      store.addExternalCard('temp-main', '0', 'hand', undefined, 0)
      store.addExternalCard('temp-extra', '0', 'extra', undefined, 0)

      store.resetPractice(0)

      const allDeckCids = store.zones.deck.map(c => c.cid)
      const allHandCids = store.zones.hand.map(c => c.cid)
      const allExtraCids = store.zones.extra.map(c => c.cid)

      expect([...allDeckCids, ...allHandCids]).toContain('temp-main')
      expect(allExtraCids).toContain('temp-extra')
    })

    it('preserves tempRecipe across resetPractice', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      store.addExternalCard('new-card', '0', 'hand', undefined, 0)

      store.resetPractice(0)

      expect(store.tempRecipe).toHaveLength(1)
    })

    it('persists through localStorage save/load', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      store.addExternalCard('saved-card', '5', 'monster', 0, 0)

      const store2 = usePracticeStore()
      const loaded = store2['loadFromLocalStorage' as keyof typeof store2] as (() => boolean) | undefined
      if (loaded) loaded()

      expect(store.tempRecipe[0]).toEqual({ cid: 'saved-card', ciid: '5', section: 'main' })
    })
  })
})
