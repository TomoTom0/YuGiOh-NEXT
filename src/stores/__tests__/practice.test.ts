import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePracticeStore } from '../practice'
import type { DeckCardRef, CardInfo } from '../../types/card'
import { getUnifiedCacheDB } from '../../utils/unified-cache-db'

function makeDeckRef(cid: string, quantity: number): DeckCardRef {
  return { cid, ciid: '0', lang: 'ja', quantity }
}

function mockMonster(cid: string, isExtraDeck: boolean): CardInfo {
  return {
    name: cid,
    cardId: cid,
    ciid: '0',
    lang: 'ja',
    imgs: [{ ciid: '0', imgHash: `${cid}_1_1_1` }],
    cardType: 'monster',
    attribute: 'dark',
    levelType: isExtraDeck ? 'rank' : 'level',
    levelValue: 4,
    race: 'spellcaster',
    types: ['normal'],
    isExtraDeck
  }
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
    it('initializes zones from deck data and draws 5 cards [covers:init_practice.resets_target_field_and_originals_then_draws_up_to_five]', () => {
      const store = usePracticeStore()

      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      expect(store.initialized).toBe(true)
      expect(store.handCount).toBe(5)
      expect(store.deckCount).toBe(5) // 10 main - 5 drawn
      expect(store.extraCount).toBe(3)
      expect(store.zones.monster).toHaveLength(5)
      expect(store.zones.spellTrap).toHaveLength(5)
    })

    it('handles deck smaller than 5 cards [covers:init_practice.resets_target_field_and_originals_then_draws_up_to_five]', () => {
      const store = usePracticeStore()

      store.initPractice([makeDeckRef('x', 2)], [])

      expect(store.handCount).toBe(2)
      expect(store.deckCount).toBe(0)
    })

    it('sets deck cards face down and hand cards face up [covers:init_practice.resets_target_field_and_originals_then_draws_up_to_five]', () => {
      const store = usePracticeStore()

      store.initPractice(SAMPLE_MAIN, [])

      for (const card of store.zones.deck) {
        expect(card.face).toBe('down')
      }
      for (const card of store.zones.hand) {
        expect(card.face).toBe('up')
      }
    })

    it('initializes extra deck cards face down [covers:init_practice.resets_target_field_and_originals_then_draws_up_to_five]', () => {
      const store = usePracticeStore()

      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      for (const card of store.zones.extra) {
        expect(card.face).toBe('down')
      }
    })

    it('stores original deck data for reset [covers:init_practice.resets_target_field_and_originals_then_draws_up_to_five]', () => {
      const store = usePracticeStore()

      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      expect(store.originalMainDeck).toHaveLength(SAMPLE_MAIN.length)
      expect(store.originalExtraDeck).toHaveLength(SAMPLE_EXTRA.length)
    })
  })

  describe('draw', () => {
    it('moves top card from deck to hand [covers:draw.moves_top_deck_card_to_hand_face_up]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const deckBefore = store.deckCount
      const handBefore = store.handCount

      store.draw()

      expect(store.deckCount).toBe(deckBefore - 1)
      expect(store.handCount).toBe(handBefore + 1)
    })

    it('does nothing when deck is empty [covers:draw.empty_deck_is_noop]', () => {
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
    it('draws specified number of cards [covers:draw_multiple.draws_min_count_and_deck_length]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 20)], [])

      store.drawMultiple(3)

      expect(store.handCount).toBe(8) // 5 initial + 3
      expect(store.deckCount).toBe(12)
    })

    it('draws only available cards when count exceeds deck size [covers:draw_multiple.draws_min_count_and_deck_length]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 6)], [])

      store.drawMultiple(10)

      expect(store.handCount).toBe(6)
      expect(store.deckCount).toBe(0)
    })
  })

  describe('drawToZone', () => {
    it('moves top card from deck to specified zone [covers:draw_to_zone.unshift_top_deck_card_to_target_face_up]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      store.drawToZone('gy')

      expect(store.gyCount).toBe(1)
      expect(store.deckCount).toBe(4) // 10 - 5 initial draw - 1
    })

    it('places card in specified monster slot [covers:draw_to_zone.unshift_top_deck_card_to_target_face_up] [covers:get_cards.monster_valid_slot_returns_slot]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      store.drawToZone('monster', 2)

      expect(store.zones.monster[2]).toHaveLength(1)
    })
  })

  describe('moveCard', () => {
    it('moves card from hand to monster zone [covers:move_card.applies_face_orientation_and_top_position]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const handCard = store.zones.hand[0]!
      store.moveCard(handCard.instanceId!, 'monster', 0)

      expect(store.zones.monster[0]).toHaveLength(1)
      expect(store.zones.monster[0]![0]!.cardId).toBe(handCard.cardId)
      expect(store.handCount).toBe(4)
    })

    it('changes face and orientation when options provided [covers:move_card.applies_face_orientation_and_top_position]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const handCard = store.zones.hand[0]!
      store.moveCard(handCard.instanceId!, 'monster', 0, { face: 'down', orientation: 'horizontal' })

      const moved = store.zones.monster[0]![0]!
      expect(moved.face).toBe('down')
      expect(moved.orientation).toBe('horizontal')
    })

    it('does nothing for non-existent card [covers:move_card.no_location_is_noop]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const before = store.handCount
      store.moveCard('nonexistent', 'monster', 0)
      expect(store.handCount).toBe(before)
    })
  })

  describe('shuffleDeck', () => {
    it('preserves deck size after shuffle [covers:shuffle_deck.uses_fisher_yates_return_value]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const count = store.deckCount
      store.shuffleDeck()

      expect(store.deckCount).toBe(count)
    })

    it('does nothing for empty or single-card deck [covers:shuffle_deck.length_zero_or_one_is_noop]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 6)], [])

      expect(store.deckCount).toBe(1)
      store.shuffleDeck()
      expect(store.deckCount).toBe(1)
    })
  })

  describe('setCardFace / setCardOrientation', () => {
    it('toggles card face [covers:set_card_face.changes_face_and_pushes_command]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const card = store.zones.hand[0]!
      expect(card.face).toBe('up')

      store.setCardFace(card.instanceId!, 'down')

      expect(store.zones.hand[0]!.face).toBe('down')
    })

    it('toggles card orientation [covers:set_card_orientation.changes_orientation_and_pushes_command]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const card = store.zones.hand[0]!
      expect(card.orientation).toBe('vertical')

      store.setCardOrientation(card.instanceId!, 'horizontal')

      expect(store.zones.hand[0]!.orientation).toBe('horizontal')
    })

    it('does nothing if already in target state [covers:set_card_face.no_location_or_same_face_is_noop]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const card = store.zones.hand[0]!
      store.setCardFace(card.instanceId!, 'up')

      expect(store.canUndo).toBe(false)
    })
  })

  describe('reorderInZone', () => {
    it('reorders cards within a zone [covers:reorder_in_zone.moves_card_and_pushes_command]', () => {
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
        store.moveCard(card.instanceId!, 'gy')
      }

      const firstCid = store.zones.gy[0]!.cardId
      const secondCid = store.zones.gy[1]!.cardId

      store.reorderInZone('gy', undefined, 0, 1)

      expect(store.zones.gy[0]!.cardId).toBe(secondCid)
      expect(store.zones.gy[1]!.cardId).toBe(firstCid)
    })
  })

  describe('undo/redo', () => {
    it('undoes a draw [covers:undo_delegates_to_undo_command_then_saves]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const handBefore = store.handCount
      store.draw()
      expect(store.handCount).toBe(handBefore + 1)

      store.undo()
      expect(store.handCount).toBe(handBefore)
    })

    it('redoes an undone draw [covers:redo_delegates_to_redo_command_then_saves]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const handBefore = store.handCount
      store.draw()
      store.undo()
      store.redo()

      expect(store.handCount).toBe(handBefore + 1)
    })

    it('undoes a moveCard [covers:undo_delegates_to_undo_command_then_saves]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const card = store.zones.hand[0]!
      store.moveCard(card.instanceId!, 'monster', 0)
      expect(store.zones.monster[0]).toHaveLength(1)

      store.undo()
      expect(store.zones.monster[0]).toHaveLength(0)
      expect(store.handCount).toBe(5)
    })

    it('undoes setCardFace [covers:undo_delegates_to_undo_command_then_saves]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const card = store.zones.hand[0]!
      store.setCardFace(card.instanceId!, 'down')
      expect(store.zones.hand[0]!.face).toBe('down')

      store.undo()
      expect(store.zones.hand[0]!.face).toBe('up')
    })

    it('undoes reset [covers:reset_practice.rebuilds_from_original_and_temp_recipe] [covers:undo_delegates_to_undo_command_then_saves]', () => {
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
    it('saves and restores state from localStorage [covers:save_to_local_storage_strips_cards_and_persists_dual_field_state] [covers:load_from_local_storage.rehydrates_field1_and_defaults]', () => {
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

    it('returns false when no saved state [covers:load_from_local_storage.no_raw_returns_false]', () => {
      const store = usePracticeStore()
      expect(store.loadFromLocalStorage()).toBe(false)
    })

    it('clears localStorage [covers:clear_local_storage_removes_key_and_swallows_errors]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      store.clearLocalStorage()
      expect(localStorage.getItem('ygoNext:practice')).toBeNull()
    })
  })

  describe('revealDeckContents', () => {
    it('toggles revealDeck flag [covers:reveal_deck_contents_sets_field_flag]', () => {
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
    it('toggles revealExtra flag [covers:reveal_extra_contents_sets_field_flag]', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      expect(store.revealExtra).toBe(false)

      store.revealExtraContents(true)
      expect(store.revealExtra).toBe(true)

      store.revealExtraContents(false)
      expect(store.revealExtra).toBe(false)
    })

    it('resets revealExtra on initPractice [covers:init_practice.resets_target_field_and_originals_then_draws_up_to_five]', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      store.revealExtraContents(true)

      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      expect(store.revealExtra).toBe(false)
    })

    it('resets revealExtra on resetPractice [covers:reset_practice.rebuilds_from_original_and_temp_recipe]', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      store.revealExtraContents(true)

      store.resetPractice()
      expect(store.revealExtra).toBe(false)
    })
  })

  describe('resetPractice', () => {
    it('resets to initial state [covers:reset_practice.rebuilds_from_original_and_temp_recipe]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      store.draw()
      store.draw()
      store.moveCard(store.zones.hand[0]!.instanceId!, 'monster', 0)

      store.resetPractice()

      expect(store.handCount).toBe(5)
      expect(store.deckCount).toBe(5)
      expect(store.zones.monster[0]).toHaveLength(0)
    })

    it('does nothing when not initialized [covers:reset_practice.not_initialized_is_noop]', () => {
      const store = usePracticeStore()
      store.resetPractice()
      expect(store.initialized).toBe(false)
    })
  })

  describe('findCard', () => {
    it('finds card location in simple zones [covers:find_card.simple_zone_match_returns_location]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const handCard = store.zones.hand[0]!
      const loc = store.findCard(handCard.instanceId!)

      expect(loc).not.toBeNull()
      expect(loc!.zone).toBe('hand')
      expect(loc!.cardIndex).toBe(0)
    })

    it('finds card location in slotted zones [covers:find_card.slotted_zone_match_returns_location]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      const card = store.zones.hand[0]!
      store.moveCard(card.instanceId!, 'monster', 3)

      const loc = store.findCard(store.zones.monster[3]![0]!.instanceId!)
      expect(loc).not.toBeNull()
      expect(loc!.zone).toBe('monster')
      expect(loc!.slotIndex).toBe(3)
    })

    it('returns null for non-existent card [covers:find_card.no_match_returns_null]', () => {
      const store = usePracticeStore()
      store.initPractice([makeDeckRef('a', 10)], [])

      expect(store.findCard('nonexistent')).toBeNull()
    })
  })

  describe('tempRecipe', () => {
    it('tracks externally added cards [covers:add_external_card.records_temp_recipe_section]', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      store.addExternalCard('new-card', '0', 'hand', undefined, 0)

      expect(store.tempRecipe).toHaveLength(1)
      expect(store.tempRecipe[0]).toEqual({ cid: 'new-card', ciid: '0', section: 'main' })
      expect(store.hasTempRecipe).toBe(true)
    })

    it('marks extra-zone drops as section=extra [covers:add_external_card.records_temp_recipe_section]', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      getUnifiedCacheDB().setCardInfo(mockMonster('extra-card', true))

      store.addExternalCard('extra-card', '0', 'extra', undefined, 0)

      expect(store.tempRecipe[0]?.section).toBe('extra')
    })

    it('classifies by intrinsic card type, not drop zone [covers:add_external_card.records_temp_recipe_section]', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      getUnifiedCacheDB().setCardInfo(mockMonster('extra-mon', true))
      getUnifiedCacheDB().setCardInfo(mockMonster('main-mon', false))

      // Extra Deckモンスターを手札(main側ゾーン)へ直接ドロップしても 'extra' になる
      store.addExternalCard('extra-mon', '0', 'hand', undefined, 0)
      // メインデッキモンスターをExtra Deckゾーンへドロップしても 'main' になる
      store.addExternalCard('main-mon', '0', 'extra', undefined, 0)

      expect(store.tempRecipe.find(c => c.cid === 'extra-mon')?.section).toBe('extra')
      expect(store.tempRecipe.find(c => c.cid === 'main-mon')?.section).toBe('main')
    })

    it('clears on initPractice (hard reset) [covers:init_practice.resets_target_field_and_originals_then_draws_up_to_five]', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      store.addExternalCard('new-card', '0', 'hand', undefined, 0)

      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)

      expect(store.tempRecipe).toHaveLength(0)
      expect(store.hasTempRecipe).toBe(false)
    })

    it('includes temp recipe cards in deck after resetPractice [covers:reset_practice.rebuilds_from_original_and_temp_recipe]', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      getUnifiedCacheDB().setCardInfo(mockMonster('temp-extra', true))
      store.addExternalCard('temp-main', '0', 'hand', undefined, 0)
      store.addExternalCard('temp-extra', '0', 'extra', undefined, 0)

      store.resetPractice(0)

      const allDeckCids = store.zones.deck.map(c => c.cardId)
      const allHandCids = store.zones.hand.map(c => c.cardId)
      const allExtraCids = store.zones.extra.map(c => c.cardId)

      expect([...allDeckCids, ...allHandCids]).toContain('temp-main')
      expect(allExtraCids).toContain('temp-extra')
    })

    it('preserves tempRecipe across resetPractice [covers:reset_practice.rebuilds_from_original_and_temp_recipe]', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      store.addExternalCard('new-card', '0', 'hand', undefined, 0)

      store.resetPractice(0)

      expect(store.tempRecipe).toHaveLength(1)
    })

    it('persists through localStorage save/load [covers:save_to_local_storage_strips_cards_and_persists_dual_field_state] [covers:load_from_local_storage.rehydrates_field1_and_defaults]', () => {
      const store = usePracticeStore()
      store.initPractice(SAMPLE_MAIN, SAMPLE_EXTRA)
      store.addExternalCard('saved-card', '5', 'monster', 0, 0)

      setActivePinia(createPinia())
      const store2 = usePracticeStore()
      const loaded = store2.loadFromLocalStorage()

      expect(loaded).toBe(true)
      expect(store2.tempRecipe[0]).toEqual({ cid: 'saved-card', ciid: '5', section: 'main' })
    })
  })
})
