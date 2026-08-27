import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePracticeStore } from '@/stores/practice';
import type { DeckCardRef } from '@/types/card';

const mocks = vi.hoisted(() => {
  const cards = new Map<string, any>();
  return {
    cards,
    getCardInfo: vi.fn((cid: string) => cards.get(cid)),
    shuffle: vi.fn(<T>(array: T[]) => [...array]),
  };
});

vi.mock('@/utils/unified-cache-db', () => ({
  getUnifiedCacheDB: () => ({ getCardInfo: mocks.getCardInfo }),
}));

vi.mock('@/utils/array-shuffle', () => ({
  fisherYatesShuffle: mocks.shuffle,
}));

function deckRef(cid: string, quantity: number, ciid = `${cid}-ciid`): DeckCardRef {
  return { cid, ciid, lang: 'ja', quantity };
}

function seedCardInfo() {
  mocks.cards.set('monster-a', {
    cardId: 'monster-a',
    name: 'Monster A',
    lang: 'ja',
    imgs: ['monster-a.jpg'],
    cardType: 'monster',
    atk: 1800,
    def: 1200,
    levelType: 'level',
    levelValue: 4,
    attribute: 'light',
    race: 'warrior',
    types: ['effect'],
    isExtraDeck: false,
  });
  mocks.cards.set('spell-a', {
    cardId: 'spell-a',
    name: 'Spell A',
    lang: 'ja',
    imgs: [],
    cardType: 'spell',
    effectType: 'normal',
  });
  mocks.cards.set('trap-a', {
    cardId: 'trap-a',
    name: 'Trap A',
    lang: 'ja',
    imgs: [],
    cardType: 'trap',
    effectType: 'counter',
  });
}

describe('stores/practice', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    mocks.cards.clear();
    mocks.getCardInfo.mockClear();
    mocks.shuffle.mockClear();
    mocks.shuffle.mockImplementation(<T>(array: T[]) => [...array]);
    seedCardInfo();

    let uuid = 0;
    vi.stubGlobal('crypto', {
      ...globalThis.crypto,
      randomUUID: vi.fn(() => `practice-uuid-${++uuid}`),
    });
  });

  it('selects zones and returns field-specific helpers [covers:select_zone.records_zone_slot_and_field] [covers:get_zones_ref.returns_field2_only_for_index_1] [covers:get_deck_count.returns_by_field_index]', () => {
    const store = usePracticeStore();

    store.selectZone('monster', 3);
    expect(store.selectedZone).toBe('monster');
    expect(store.selectedSlotIndex).toBe(3);
    expect(store.selectedFieldIndex).toBe(0);

    store.selectZone('spellTrap', 2, 1);
    expect(store.selectedZone).toBe('spellTrap');
    expect(store.selectedSlotIndex).toBe(2);
    expect(store.selectedFieldIndex).toBe(1);

    store.initPractice([deckRef('monster-a', 7)], [], 0);
    store.initPractice([deckRef('spell-a', 6)], [], 1);
    expect(store.getZonesRef(0).value).toBe(store.zones);
    expect(store.getZonesRef(1).value).toBe(store.zones2);
    expect(store.getDeckCount(0)).toBe(store.deckCount);
    expect(store.getDeckCount(1)).toBe(store.deckCount2);
  });

  it('initializes cards from cache, unknown fallback, shuffle result, and up to five opening hand [covers:init_practice.resets_target_field_and_originals_then_draws_up_to_five] [covers:init_practice.unknown_cache_card_creates_unknown_card] [covers:init_practice.cached_monster_card_copies_monster_fields] [covers:init_practice.cached_spell_or_trap_card_copies_effect_type]', () => {
    const store = usePracticeStore();

    store.addExternalCard('old-temp', '0', 'hand', undefined);
    store.revealDeckContents(true);
    store.revealExtraContents(true);
    store.initPractice(
      [deckRef('monster-a', 2), deckRef('spell-a', 2), deckRef('missing-a', 2)],
      [deckRef('trap-a', 1)],
    );

    expect(store.initialized).toBe(true);
    expect(store.revealDeck).toBe(false);
    expect(store.revealExtra).toBe(false);
    expect(store.tempRecipe).toEqual([]);
    expect(store.originalMainDeck).toEqual([
      deckRef('monster-a', 2),
      deckRef('spell-a', 2),
      deckRef('missing-a', 2),
    ]);
    expect(mocks.shuffle).toHaveBeenCalled();
    expect(store.handCount).toBe(5);
    expect(store.deckCount).toBe(1);
    expect(store.extraCount).toBe(1);
    expect(store.zones.hand.every(card => card.face === 'up')).toBe(true);
    expect(store.zones.deck.every(card => card.face === 'down')).toBe(true);

    const monster = [...store.zones.hand, ...store.zones.deck].find(card => card.cardId === 'monster-a')!;
    expect(monster).toMatchObject({ name: 'Monster A', atk: 1800, def: 1200, attribute: 'light', race: 'warrior' });

    const spell = [...store.zones.hand, ...store.zones.deck].find(card => card.cardId === 'spell-a')!;
    expect(spell.effectType).toBe('normal');

    expect(store.zones.extra[0]).toMatchObject({ cardId: 'trap-a', effectType: 'counter', face: 'down' });

    const unknown = [...store.zones.hand, ...store.zones.deck].find(card => card.cardId === 'missing-a')!;
    expect(unknown).toMatchObject({ name: '', lang: 'ja', imgs: [], cardType: 'unknown', face: 'up' });
  });

  it('returns zone arrays and empty arrays for invalid slots [covers:get_cards.monster_valid_slot_returns_slot] [covers:get_cards.monster_invalid_slot_returns_empty_array] [covers:get_cards.spell_trap_valid_slot_returns_slot] [covers:get_cards.spell_trap_invalid_slot_returns_empty_array] [covers:get_cards.extra_monster_valid_slot_returns_slot] [covers:get_cards.extra_monster_invalid_slot_returns_empty_array] [covers:get_cards.simple_zone_returns_zone_array]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 6)], []);

    expect(store.getCards('hand')).toBe(store.zones.hand);
    expect(store.getCards('monster', 0)).toBe(store.zones.monster[0]);
    expect(store.getCards('monster')).toBe(store.zones.monster[0]);
    expect(store.getCards('monster', -1)).toEqual([]);
    expect(store.getCards('monster', 5)).toEqual([]);
    expect(store.getCards('spellTrap', 1)).toBe(store.zones.spellTrap[1]);
    expect(store.getCards('spellTrap', -1)).toEqual([]);
    expect(store.getCards('spellTrap', 5)).toEqual([]);
    expect(store.getCards('extraMonster', 1)).toBe(store.zones.extraMonster[1]);
    expect(store.getCards('extraMonster', -1)).toEqual([]);
    expect(store.getCards('extraMonster', 2)).toEqual([]);
  });

  it('finds cards in simple/slotted zones and across both fields [covers:find_card.simple_zone_match_returns_location] [covers:find_card.slotted_zone_match_returns_location] [covers:find_card.no_match_returns_null] [covers:find_card_global_prefers_field1_then_field2]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 7)], [], 0);
    store.initPractice([deckRef('spell-a', 7)], [], 1);

    const handCard = store.zones.hand[0]!;
    expect(store.findCard(handCard.instanceId!)).toEqual({ zone: 'hand', cardIndex: 0, fieldIndex: 0 });

    store.moveCard(handCard.instanceId!, 'monster', 2);
    const monsterCard = store.zones.monster[2]![0]!;
    expect(store.findCard(monsterCard.instanceId!)).toEqual({ zone: 'monster', slotIndex: 2, cardIndex: 0, fieldIndex: 0 });

    const field2Card = store.zones2.hand[0]!;
    expect(store.findCard(field2Card.instanceId!, 1)).toEqual({ zone: 'hand', cardIndex: 0, fieldIndex: 1 });
    expect(store.findCardGlobal(field2Card.instanceId!)).toEqual({ zone: 'hand', cardIndex: 0, fieldIndex: 1 });
    expect(store.findCard('missing')).toBeNull();
  });

  it('resets only initialized fields and preserves temp recipe through rebuild [covers:reset_practice.not_initialized_is_noop] [covers:reset_practice.rebuilds_from_original_and_temp_recipe]', () => {
    const store = usePracticeStore();
    mocks.cards.set('temp-extra', {
      cardId: 'temp-extra',
      name: 'Temp Extra',
      lang: 'ja',
      imgs: [],
      cardType: 'monster',
      levelType: 'rank',
      levelValue: 4,
      attribute: 'light',
      race: 'warrior',
      types: ['xyz'],
      isExtraDeck: true,
    });

    store.resetPractice();
    expect(store.initialized).toBe(false);
    expect(store.canUndo).toBe(false);

    store.initPractice([deckRef('monster-a', 8)], [deckRef('trap-a', 1)]);
    store.addExternalCard('temp-main', 'tm', 'hand', undefined);
    store.addExternalCard('temp-extra', 'te', 'extra', undefined);
    store.draw();
    store.revealDeckContents(true);
    store.revealExtraContents(true);

    store.resetPractice();

    const mainCids = [...store.zones.hand, ...store.zones.deck].map(card => card.cardId);
    expect(mainCids).toContain('temp-main');
    expect(store.zones.extra.map(card => card.cardId)).toContain('temp-extra');
    expect(store.tempRecipe).toEqual([
      { cid: 'temp-main', ciid: 'tm', section: 'main' },
      { cid: 'temp-extra', ciid: 'te', section: 'extra' },
    ]);
    expect(store.revealDeck).toBe(false);
    expect(store.revealExtra).toBe(false);
    expect(store.canUndo).toBe(true);
    expect(store.getUndoDescription()).toBe('リセット');
  });

  it('draws one card or noops on empty deck [covers:draw.empty_deck_is_noop] [covers:draw.moves_top_deck_card_to_hand_face_up]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 6)], []);

    const deckCard = store.zones.deck[0]!;
    store.draw();
    expect(store.zones.hand.at(-1)).toMatchObject({ instanceId: deckCard.instanceId, face: 'up' });
    expect(store.deckCount).toBe(0);
    expect(store.handCount).toBe(6);
    expect(store.getUndoDescription()).toBe('ドロー');

    store.clearHistory();
    store.draw();
    expect(store.deckCount).toBe(0);
    expect(store.handCount).toBe(6);
    expect(store.canUndo).toBe(false);
  });

  it('draws to target zone and draws multiple with min(count, deck length) [covers:draw_to_zone.empty_deck_is_noop] [covers:draw_to_zone.unshift_top_deck_card_to_target_face_up] [covers:draw_multiple.empty_deck_is_noop] [covers:draw_multiple.draws_min_count_and_deck_length]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 9)], []);

    const firstDeck = store.zones.deck[0]!;
    store.drawToZone('gy');
    expect(store.zones.gy[0]).toMatchObject({ instanceId: firstDeck.instanceId, face: 'up' });
    expect(store.deckCount).toBe(3);

    store.drawMultiple(10);
    expect(store.deckCount).toBe(0);
    expect(store.handCount).toBe(8);
    expect(store.getUndoDescription()).toBe('3枚ドロー');

    store.clearHistory();
    store.drawToZone('banish');
    store.drawMultiple(1);
    expect(store.zones.banish).toHaveLength(0);
    expect(store.canUndo).toBe(false);
  });

  it('moves cards with face/orientation and position variants [covers:move_card.no_location_is_noop] [covers:move_card.applies_face_orientation_and_top_position] [covers:move_card.bottom_position_pushes] [covers:move_card.numeric_position_is_clamped]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 9)], []);

    store.moveCard('missing', 'gy');
    expect(store.handCount).toBe(5);
    expect(store.canUndo).toBe(false);

    const first = store.zones.hand[0]!;
    store.moveCard(first.instanceId!, 'gy', undefined, { face: 'down', orientation: 'horizontal' });
    expect(store.zones.gy[0]).toMatchObject({ instanceId: first.instanceId, face: 'down', orientation: 'horizontal' });

    const second = store.zones.hand[0]!;
    store.moveCard(second.instanceId!, 'gy', undefined, { position: 'bottom' });
    expect(store.zones.gy.at(-1)!.instanceId).toBe(second.instanceId);

    const third = store.zones.hand[0]!;
    store.moveCard(third.instanceId!, 'gy', undefined, { position: -10 });
    expect(store.zones.gy[0]!.instanceId).toBe(third.instanceId);

    const fourth = store.zones.hand[0]!;
    store.moveCard(fourth.instanceId!, 'gy', undefined, { position: 99 });
    expect(store.zones.gy.at(-1)!.instanceId).toBe(fourth.instanceId);
  });

  it('moves a card into deck, shuffles, and forces deck cards down [covers:move_card_to_deck_and_shuffle.no_location_is_noop] [covers:move_card_to_deck_and_shuffle_inserts_down_vertical_and_sets_all_deck_down]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 7)], []);

    store.moveCardToDeckAndShuffle('missing');
    expect(store.handCount).toBe(5);
    expect(store.deckCount).toBe(2);
    expect(store.canUndo).toBe(false);

    const handCard = store.zones.hand[0]!;
    store.setCardOrientation(handCard.instanceId!, 'horizontal');
    store.setCardFace(handCard.instanceId!, 'down');
    store.clearHistory();

    store.moveCardToDeckAndShuffle(handCard.instanceId!);
    expect(store.handCount).toBe(4);
    expect(store.deckCount).toBe(3);
    expect(store.zones.deck.every(card => card.face === 'down')).toBe(true);
    expect(store.zones.deck.find(card => card.instanceId === handCard.instanceId)).toMatchObject({
      orientation: 'vertical',
      face: 'down',
    });
    expect(store.getUndoDescription()).toBe('デッキにシャッフル挿入');
  });

  it('shuffles deck, hand, and extra only when size is greater than one [covers:shuffle_deck.length_zero_or_one_is_noop] [covers:shuffle_deck.uses_fisher_yates_return_value] [covers:shuffle_hand.length_zero_or_one_is_noop] [covers:shuffle_hand.uses_fisher_yates_return_value] [covers:shuffle_extra.length_zero_or_one_is_noop] [covers:shuffle_extra.uses_fisher_yates_return_value]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 7)], [deckRef('trap-a', 2)]);
    store.clearHistory();
    mocks.shuffle.mockImplementation(<T>(array: T[]) => [...array].reverse());

    const deckBefore = store.zones.deck.map(card => card.instanceId);
    store.shuffleDeck();
    expect(store.zones.deck.map(card => card.instanceId)).toEqual([...deckBefore].reverse());
    expect(store.getUndoDescription()).toBe('デッキシャッフル');

    const handBefore = store.zones.hand.map(card => card.instanceId);
    store.shuffleHand();
    expect(store.zones.hand.map(card => card.instanceId)).toEqual([...handBefore].reverse());

    const extraBefore = store.zones.extra.map(card => card.instanceId);
    store.shuffleExtra();
    expect(store.zones.extra.map(card => card.instanceId)).toEqual([...extraBefore].reverse());

    store.initPractice([deckRef('monster-a', 6)], [deckRef('trap-a', 1)]);
    store.clearHistory();
    store.shuffleDeck();
    store.shuffleExtra();
    expect(store.canUndo).toBe(false);

    while (store.handCount > 1) {
      store.moveCard(store.zones.hand[0]!.instanceId!, 'gy');
    }
    store.clearHistory();
    store.shuffleHand();
    expect(store.canUndo).toBe(false);
  });

  it('sets face and orientation only when changed [covers:set_card_face.no_location_or_same_face_is_noop] [covers:set_card_face.changes_face_and_pushes_command] [covers:set_card_orientation.no_location_or_same_orientation_is_noop] [covers:set_card_orientation.changes_orientation_and_pushes_command]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 6)], []);
    const card = store.zones.hand[0]!;

    store.setCardFace('missing', 'down');
    store.setCardFace(card.instanceId!, 'up');
    store.setCardOrientation('missing', 'horizontal');
    store.setCardOrientation(card.instanceId!, 'vertical');
    expect(store.canUndo).toBe(false);

    store.setCardFace(card.instanceId!, 'down');
    expect(store.zones.hand[0]!.face).toBe('down');
    expect(store.getUndoDescription()).toBe('表裏切替');

    store.setCardOrientation(card.instanceId!, 'horizontal');
    expect(store.zones.hand[0]!.orientation).toBe('horizontal');
    expect(store.getUndoDescription()).toBe('縦横切替');
  });

  it('reorders with guard clauses and valid moves [covers:reorder_in_zone.invalid_indices_or_same_index_are_noop] [covers:reorder_in_zone.moves_card_and_pushes_command]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 8)], []);
    for (let i = 0; i < 3; i++) {
      store.moveCard(store.zones.hand[0]!.instanceId!, 'gy', undefined, { position: 'bottom' });
    }
    store.clearHistory();
    const order = store.zones.gy.map(card => card.instanceId);

    store.reorderInZone('gy', undefined, 0, 0);
    store.reorderInZone('gy', undefined, -1, 1);
    store.reorderInZone('gy', undefined, 0, 3);
    expect(store.zones.gy.map(card => card.instanceId)).toEqual(order);
    expect(store.canUndo).toBe(false);

    store.reorderInZone('gy', undefined, 0, 2);
    expect(store.zones.gy.map(card => card.instanceId)).toEqual([order[1], order[2], order[0]]);
    expect(store.getUndoDescription()).toBe('並び替え');
  });

  it('adds external cards at positions and records temp recipe section [covers:add_external_card.inserts_top_bottom_or_clamped_numeric_position] [covers:add_external_card.records_temp_recipe_section]', () => {
    const store = usePracticeStore();
    mocks.cards.set('new-extra', {
      cardId: 'new-extra',
      name: 'New Extra',
      lang: 'ja',
      imgs: [],
      cardType: 'monster',
      levelType: 'rank',
      levelValue: 4,
      attribute: 'light',
      race: 'warrior',
      types: ['xyz'],
      isExtraDeck: true,
    });
    store.initPractice([deckRef('monster-a', 5)], [deckRef('trap-a', 1)]);

    store.addExternalCard('new-bottom', 'b', 'gy', undefined, 0, 'down', 'bottom');
    store.addExternalCard('new-top', 't', 'gy', undefined, 0, 'up', 'top');
    store.addExternalCard('new-mid', 'm', 'gy', undefined, 0, 'up', 1);
    store.addExternalCard('new-extra', 'e', 'extra', undefined);

    expect(store.zones.gy.map(card => card.cardId)).toEqual(['new-top', 'new-mid', 'new-bottom']);
    expect(store.zones.gy[0]!.face).toBe('up');
    expect(store.zones.gy[2]!.face).toBe('down');
    expect(store.tempRecipe).toEqual([
      { cid: 'new-bottom', ciid: 'b', section: 'main' },
      { cid: 'new-top', ciid: 't', section: 'main' },
      { cid: 'new-mid', ciid: 'm', section: 'main' },
      { cid: 'new-extra', ciid: 'e', section: 'extra' },
    ]);
    expect(store.hasTempRecipe).toBe(true);
  });

  it('sets reveal flags for both fields [covers:reveal_deck_contents_sets_field_flag] [covers:reveal_extra_contents_sets_field_flag]', () => {
    const store = usePracticeStore();

    store.revealDeckContents(true);
    store.revealExtraContents(true);
    store.revealDeckContents(true, 1);
    store.revealExtraContents(true, 1);

    expect(store.revealDeck).toBe(true);
    expect(store.revealExtra).toBe(true);
    expect(store.revealDeck2).toBe(true);
    expect(store.revealExtra2).toBe(true);
  });

  it('saves stripped state and loads field1/field2/defaults/errors [covers:save_to_local_storage_strips_cards_and_persists_dual_field_state] [covers:load_from_local_storage.no_raw_returns_false] [covers:load_from_local_storage.missing_zones_returns_false] [covers:load_from_local_storage.rehydrates_field1_and_defaults] [covers:load_from_local_storage.rehydrates_field2_when_initialized2_or_legacy_two_deck_mode] [covers:load_from_local_storage.parse_or_rehydrate_error_returns_false]', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = usePracticeStore();
    expect(store.loadFromLocalStorage()).toBe(false);

    localStorage.setItem('ygoNext:practice', JSON.stringify({ revealDeck: true }));
    expect(store.loadFromLocalStorage()).toBe(false);

    store.initPractice([deckRef('monster-a', 6)], [], 0);
    store.initPractice([deckRef('spell-a', 6)], [], 1);
    store.revealDeckContents(true);
    store.revealExtraContents(true, 1);
    store.p2DeckDno = 42;
    store.p2DeckName = 'P2';
    store.saveToLocalStorage();

    const saved = JSON.parse(localStorage.getItem('ygoNext:practice')!);
    expect(saved.zones.hand[0]).toEqual({
      instanceId: expect.any(String),
      cardId: 'monster-a',
      ciid: 'monster-a-ciid',
      face: 'up',
      orientation: 'vertical',
    });
    expect(saved.zones.hand[0].name).toBeUndefined();

    setActivePinia(createPinia());
    const loadedStore = usePracticeStore();
    expect(loadedStore.loadFromLocalStorage()).toBe(true);
    expect(loadedStore.initialized).toBe(true);
    expect(loadedStore.revealDeck).toBe(true);
    expect(loadedStore.revealExtra).toBe(false);
    expect(loadedStore.initialized2).toBe(true);
    expect(loadedStore.revealExtra2).toBe(true);
    expect(loadedStore.p2DeckDno).toBe(42);
    expect(loadedStore.p2DeckName).toBe('P2');
    expect(loadedStore.zones.hand[0]).toMatchObject({ cardId: 'monster-a', name: 'Monster A' });

    localStorage.setItem('ygoNext:practice', '{bad json');
    expect(loadedStore.loadFromLocalStorage()).toBe(false);
    expect(consoleError).toHaveBeenCalled();
  });

  it('clears field2 and localStorage according to implementation [covers:clear_field2_resets_field2_state_but_not_reveal_extra2_or_temp_recipe2] [covers:clear_local_storage_removes_key_and_swallows_errors]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('spell-a', 6)], [], 1);
    store.addExternalCard('field2-temp', '2', 'hand', undefined, 1);
    store.revealDeckContents(true, 1);
    store.revealExtraContents(true, 1);
    store.p2DeckDno = 7;
    store.p2DeckName = 'Other';
    store.saveToLocalStorage();

    store.clearField2();
    expect(store.zones2.hand).toEqual([]);
    expect(store.initialized2).toBe(false);
    expect(store.originalMainDeck2).toEqual([]);
    expect(store.originalExtraDeck2).toEqual([]);
    expect(store.revealDeck2).toBe(false);
    expect(store.p2DeckDno).toBeNull();
    expect(store.p2DeckName).toBe('');
    expect(store.revealExtra2).toBe(true);
    expect(store.tempRecipe2).toEqual([{ cid: 'field2-temp', ciid: '2', section: 'main' }]);

    store.clearLocalStorage();
    expect(localStorage.getItem('ygoNext:practice')).toBeNull();
  });

  it('undoes/redoes snapshot commands and saves even when unavailable [covers:undo_delegates_to_undo_command_then_saves] [covers:redo_delegates_to_redo_command_then_saves]', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = usePracticeStore();
    const setItem = vi.spyOn(localStorage, 'setItem');
    store.initPractice([deckRef('monster-a', 6)], []);
    const handBefore = store.handCount;
    const callsAfterInit = setItem.mock.calls.length;

    store.undo();
    store.redo();
    expect(setItem.mock.calls.length).toBe(callsAfterInit + 2);
    expect(consoleWarn).toHaveBeenCalledTimes(2);

    store.draw();
    expect(store.handCount).toBe(handBefore + 1);
    store.undo();
    expect(store.handCount).toBe(handBefore);
    store.redo();
    expect(store.handCount).toBe(handBefore + 1);
  });
});
