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

  it('selects zones and returns field-specific helpers [covers:select-zone.records-zone-slot-and-field] [covers:get-zones-ref.returns-field2-only-for-index-1] [covers:get-deck-count.returns-by-field-index]', () => {
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

  it('initializes cards from cache, unknown fallback, shuffle result, and up to five opening hand [covers:init-practice.resets-target-field-and-originals-then-draws-up-to-five] [covers:init-practice.unknown-cache-card-creates-unknown-card] [covers:init-practice.cached-monster-card-copies-monster-fields] [covers:init-practice.cached-spell-or-trap-card-copies-effect-type]', () => {
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

  it('draws all cards into hand when deck has fewer than five cards [covers:init-practice.resets-target-field-and-originals-then-draws-up-to-five]', () => {
    const store = usePracticeStore();

    store.initPractice([deckRef('monster-a', 3)], []);

    expect(store.handCount).toBe(3);
    expect(store.deckCount).toBe(0);
  });

  it('returns zone arrays and empty arrays for invalid slots [covers:get-cards.monster-valid-slot-returns-slot] [covers:get-cards.monster-invalid-slot-returns-empty-array] [covers:get-cards.spell-trap-valid-slot-returns-slot] [covers:get-cards.spell-trap-invalid-slot-returns-empty-array] [covers:get-cards.extra-monster-valid-slot-returns-slot] [covers:get-cards.extra-monster-invalid-slot-returns-empty-array] [covers:get-cards.simple-zone-returns-zone-array]', () => {
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

  it('finds cards in simple/slotted zones and across both fields [covers:find-card.simple-zone-match-returns-location] [covers:find-card.slotted-zone-match-returns-location] [covers:find-card.no-match-returns-null] [covers:find-card-global.prefers-field1-then-field2]', () => {
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

  it('resets only initialized fields and preserves temp recipe through rebuild [covers:reset-practice.not-initialized-is-noop] [covers:reset-practice.rebuilds-from-original-and-temp-recipe]', () => {
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

  it('draws one card or noops on empty deck [covers:draw.empty-deck-is-noop] [covers:draw.moves-top-deck-card-to-hand-face-up]', () => {
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

  it('draws to target zone and draws multiple with min(count, deck length) [covers:draw-to-zone.empty-deck-is-noop] [covers:draw-to-zone.unshift-top-deck-card-to-target-face-up] [covers:draw-multiple.empty-deck-is-noop] [covers:draw-multiple.draws-min-count-and-deck-length]', () => {
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

  it('draws the requested count when it is smaller than the remaining deck [covers:draw-multiple.draws-min-count-and-deck-length]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 20)], []);

    store.drawMultiple(3);

    expect(store.handCount).toBe(8);
    expect(store.deckCount).toBe(12);
  });

  it('moves cards with face/orientation and position variants [covers:move-card.no-location-is-noop] [covers:move-card.applies-face-orientation-and-top-position] [covers:move-card.bottom-position-pushes] [covers:move-card.numeric-position-is-clamped]', () => {
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

  it('moves a card into deck, shuffles, and forces deck cards down [covers:move-card-to-deck-and-shuffle.no-location-is-noop] [covers:move-card-to-deck-and-shuffle.inserts-down-vertical-and-sets-all-deck-down]', () => {
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

  it('shuffles deck, hand, and extra only when size is greater than one [covers:shuffle-deck.length-zero-or-one-is-noop] [covers:shuffle-deck.uses-fisher-yates-return-value] [covers:shuffle-hand.length-zero-or-one-is-noop] [covers:shuffle-hand.uses-fisher-yates-return-value] [covers:shuffle-extra.length-zero-or-one-is-noop] [covers:shuffle-extra.uses-fisher-yates-return-value]', () => {
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

  it('sets face and orientation only when changed [covers:set-card-face.no-location-or-same-face-is-noop] [covers:set-card-face.changes-face-and-pushes-command] [covers:set-card-orientation.no-location-or-same-orientation-is-noop] [covers:set-card-orientation.changes-orientation-and-pushes-command]', () => {
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

  it('reorders with guard clauses and valid moves [covers:reorder-in-zone.invalid-indices-or-same-index-are-noop] [covers:reorder-in-zone.moves-card-and-pushes-command]', () => {
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

  it('adds external cards at positions and records temp recipe section [covers:add-external-card.inserts-top-bottom-or-clamped-numeric-position] [covers:add-external-card.records-temp-recipe-section]', () => {
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

  it('classifies temp recipe sections by intrinsic card type regardless of drop zone [covers:add-external-card.records-temp-recipe-section]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 5)], []);
    mocks.cards.set('extra-mon', {
      cardId: 'extra-mon',
      name: 'Extra Mon',
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
    mocks.cards.set('main-mon', {
      cardId: 'main-mon',
      name: 'Main Mon',
      lang: 'ja',
      imgs: [],
      cardType: 'monster',
      levelType: 'level',
      levelValue: 4,
      attribute: 'light',
      race: 'warrior',
      types: ['effect'],
      isExtraDeck: false,
    });

    store.addExternalCard('extra-mon', '0', 'hand', undefined);
    store.addExternalCard('main-mon', '0', 'extra', undefined);

    expect(store.tempRecipe.find(card => card.cid === 'extra-mon')?.section).toBe('extra');
    expect(store.tempRecipe.find(card => card.cid === 'main-mon')?.section).toBe('main');
  });

  it('sets reveal flags for both fields [covers:reveal-deck-contents.sets-field-flag] [covers:reveal-extra-contents.sets-field-flag]', () => {
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

  it('saves stripped state and loads field1/field2/defaults/errors [covers:save-to-local-storage.strips-cards-and-persists-dual-field-state] [covers:load-from-local-storage.no-raw-returns-false] [covers:load-from-local-storage.missing-zones-returns-false] [covers:load-from-local-storage.rehydrates-field1-and-defaults] [covers:load-from-local-storage.rehydrates-field2-when-initialized2-or-legacy-two-deck-mode] [covers:load-from-local-storage.parse-or-rehydrate-error-returns-false]', () => {
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

  it('persists temp recipe through save and reload [covers:save-to-local-storage.strips-cards-and-persists-dual-field-state] [covers:load-from-local-storage.rehydrates-field1-and-defaults]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 5)], []);
    store.addExternalCard('saved-card', '5', 'monster', 0);

    setActivePinia(createPinia());
    const reloaded = usePracticeStore();
    const loaded = reloaded.loadFromLocalStorage();

    expect(loaded).toBe(true);
    expect(reloaded.tempRecipe[0]).toEqual({ cid: 'saved-card', ciid: '5', section: 'main' });
    expect(reloaded.hasTempRecipe).toBe(true);
  });

  it('clears field2 and localStorage according to implementation [covers:clear-field2.resets-field2-state-but-not-reveal-extra2-or-temp-recipe2] [covers:clear-local-storage.removes-key-and-swallows-errors]', () => {
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

  it('undoes/redoes snapshot commands and saves even when unavailable [covers:undo.delegates-to-undo-command-then-saves] [covers:redo.delegates-to-redo-command-then-saves]', () => {
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

  it('undo restores state after moveCard and setCardFace [covers:undo.delegates-to-undo-command-then-saves]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 10)], []);
    const card = store.zones.hand[0]!;

    store.moveCard(card.instanceId!, 'monster', 0);
    expect(store.zones.monster[0]).toHaveLength(1);
    store.undo();
    expect(store.zones.monster[0]).toHaveLength(0);
    expect(store.handCount).toBe(5);

    store.setCardFace(card.instanceId!, 'down');
    expect(store.zones.hand[0]!.face).toBe('down');
    store.undo();
    expect(store.zones.hand[0]!.face).toBe('up');
  });

  it('undo restores state before resetPractice [covers:reset-practice.rebuilds-from-original-and-temp-recipe] [covers:undo.delegates-to-undo-command-then-saves]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 10)], []);

    store.draw();
    store.draw();
    expect(store.handCount).toBe(7);

    store.resetPractice();
    expect(store.handCount).toBe(5);

    store.undo();
    expect(store.handCount).toBe(7);
  });

  it('tracks canUndo/canRedo flags across the undo/redo cycle [covers:undo-redo-flags.transition-with-command-history] [covers:draw-to-zone.unshift-top-deck-card-to-target-face-up]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 10)], []);

    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);

    store.draw();
    expect(store.canUndo).toBe(true);
    expect(store.canRedo).toBe(false);

    store.undo();
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(store.canUndo).toBe(true);
    expect(store.canRedo).toBe(false);

    // undo後に新しい操作を行うとredo未来が切り捨てられ、store.canRedoはfalseのままになる
    store.draw();
    store.undo();
    expect(store.canRedo).toBe(true);
    store.drawToZone('monster', 2);
    expect(store.canRedo).toBe(false);

    // drawToZoneのslotted zone宛: getCards('monster', 2)の戻り配列先頭へ配置される
    expect(store.zones.monster[2]).toHaveLength(1);
  });
  it('getCards returns an array for every ZoneType so drawToZone always has a target [covers:draw-to-zone.target-missing-is-unreachable-for-typed-zone]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 9)], []);

    const zones = ['field', 'monster', 'spellTrap', 'gy', 'banish', 'deck', 'extra', 'extraMonster', 'hand', 'temp'] as const;
    for (const zone of zones) {
      expect(Array.isArray(store.getCards(zone))).toBe(true);
    }

    const firstDeck = store.zones.deck[0]!;
    store.drawToZone('monster', 1);
    expect(store.zones.monster[1][0]).toMatchObject({ instanceId: firstDeck.instanceId, face: 'up' });
  });

  it('findCard location always points at an existing card so moveCard proceeds [covers:move-card.source-array-invalid-is-unreachable-after-find-card]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 9)], []);

    const card = store.zones.hand[0]!;
    const loc = store.findCard(card.instanceId!);
    expect(loc).not.toBeNull();
    const cards = store.getCards(loc!.zone, loc!.slotIndex, loc!.fieldIndex);
    expect(cards[loc!.cardIndex]).toMatchObject({ instanceId: card.instanceId });

    store.moveCard(card.instanceId!, 'gy');
    expect(store.zones.gy[0]).toMatchObject({ instanceId: card.instanceId });
  });

  it('moveCard target is always an array for typed zones [covers:move-card.target-missing-is-unreachable-for-typed-zone]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 9)], []);

    const first = store.zones.hand[0]!;
    store.moveCard(first.instanceId!, 'monster', 2);
    expect(store.zones.monster[2][0]).toMatchObject({ instanceId: first.instanceId });

    const second = store.zones.hand[0]!;
    store.moveCard(second.instanceId!, 'temp');
    expect(store.zones.temp[0]).toMatchObject({ instanceId: second.instanceId });
  });

  it('findCard location always points at an existing card so moveCardToDeckAndShuffle proceeds [covers:move-card-to-deck-and-shuffle.source-array-invalid-is-unreachable-after-find-card]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 7)], []);

    const card = store.zones.hand[0]!;
    const loc = store.findCard(card.instanceId!);
    expect(loc).not.toBeNull();
    const cards = store.getCards(loc!.zone, loc!.slotIndex, loc!.fieldIndex);
    expect(cards[loc!.cardIndex]).toMatchObject({ instanceId: card.instanceId });

    store.moveCardToDeckAndShuffle(card.instanceId!);
    expect(store.zones.deck.some((c) => c.instanceId === card.instanceId)).toBe(true);
    expect(store.zones.hand.some((c) => c.instanceId === card.instanceId)).toBe(false);
  });

  it('setCardFace always resolves the card array for a found card [covers:set-card-face.cards-ref-missing-is-unreachable-after-find-card]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 6)], []);

    const card = store.zones.hand[0]!;
    expect(store.findCard(card.instanceId!)).not.toBeNull();
    store.setCardFace(card.instanceId!, 'down');
    expect(store.zones.hand[0]).toMatchObject({ instanceId: card.instanceId, face: 'down' });
  });

  it('setCardOrientation always resolves the card array for a found card [covers:set-card-orientation.cards-ref-missing-is-unreachable-after-find-card]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 6)], []);

    const card = store.zones.hand[0]!;
    expect(store.findCard(card.instanceId!)).not.toBeNull();
    store.setCardOrientation(card.instanceId!, 'horizontal');
    expect(store.zones.hand[0]).toMatchObject({ instanceId: card.instanceId, orientation: 'horizontal' });
  });

  it('reorderInZone always splices out an existing card after the range check [covers:reorder-in-zone.moved-missing-is-unreachable-after-range-check]', () => {
    const store = usePracticeStore();
    store.initPractice([deckRef('monster-a', 6)], []);

    const before = store.zones.hand.map((c) => c.instanceId);
    store.reorderInZone('hand', undefined, 0, 2);
    const after = store.zones.hand.map((c) => c.instanceId);
    expect(after[2]).toBe(before[0]);
    expect(after[0]).toBe(before[1]);
    expect(store.canUndo).toBe(true);
  });
});
