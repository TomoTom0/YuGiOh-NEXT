/**
 * components/practice/PracticeZoneInfoPanel のユニットテスト
 *
 * tests/design/practice-zone-info-panel/conditions.toml（TASK-566 × TASK-331 Tier C第18号）の
 * 11条件をカバーする。unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - PracticeZoneInfoPanelを直接mount + pinia実物（DeckMetadata.test.tsと同一手法）
 * - 子CardListはカスタムstub: 受け取ったpropsをdata属性へ描画し、ボタンで親がlistenする
 *   イベントを発火する。子の内部挙動はcard-list条件書が保証
 * - practice storeは実物（moveCardはspyで引数観測）。usePracticeDragStateも実物で、
 *   公開refからdrag状態を観測する。ドラッグイベントはdataTransfer持ちの疑似イベントを
 *   stub側で組み立てて発火する
 * - 観測対象は描画結果・CardList props・emit・drag状態・store呼び出し引数。
 *   vm内部computedは直接参照しない
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import PracticeZoneInfoPanel from '@/components/practice/PracticeZoneInfoPanel.vue';
import { usePracticeStore } from '@/stores/practice';
import type { PracticeCard, ZoneType } from '@/stores/practice';
import { usePracticeDragState } from '@/composables/practice/usePracticeDragState';

// ============================================================
// ドラッグ疑似イベント（stubが発火時に組み立て、検証用に保持）
// ============================================================

interface FakeDragEvent {
  dataTransfer: {
    setDragImage: ReturnType<typeof vi.fn>;
    setData: ReturnType<typeof vi.fn>;
    effectAllowed: string;
  };
  currentTarget: { getBoundingClientRect: () => { width: number; height: number } };
}

const dragEventHolder: { current: FakeDragEvent | null } = { current: null };

function makeDragEvent(): FakeDragEvent {
  return {
    dataTransfer: { setDragImage: vi.fn(), setData: vi.fn(), effectAllowed: '' },
    currentTarget: { getBoundingClientRect: () => ({ width: 36, height: 53 }) },
  };
}

// ============================================================
// CardList カスタムstub
// ============================================================

const CardListStub = defineComponent({
  name: 'CardList',
  props: {
    cards: { type: Array, required: true },
    sectionType: { type: String, required: true },
    sortOrder: { type: String, required: true },
    uniqueId: { type: String, required: true },
    forceReveal: { type: Boolean, required: true },
    zone: { type: String, required: true },
  },
  emits: ['update:sort-order', 'practice-dragstart', 'practice-dragend', 'practice-action'],
  setup(_, { emit }) {
    const fireDragStart = (uuid: string) => {
      const event = makeDragEvent();
      dragEventHolder.current = event;
      emit('practice-dragstart', event, uuid, { x: 3, y: 4 });
    };
    return { fireDragStart };
  },
  template: `
    <div class="card-list-stub"
      :data-sort-order="sortOrder"
      :data-unique-id="uniqueId"
      :data-force-reveal="forceReveal"
      :data-zone="zone"
      :data-cards-count="cards.length">
      <button class="emit-sort-actual" @click="$emit('update:sort-order', 'actual_asc')">sort</button>
      <button class="emit-dragstart-known" @click="fireDragStart('a-100-0')">ds</button>
      <button class="emit-dragstart-unknown" @click="fireDragStart('zzz-999-0')">dsu</button>
      <button class="emit-dragend" @click="$emit('practice-dragend')">de</button>
      <button class="emit-action-hand" @click="$emit('practice-action', 'moveToHand', 'a-100-0')">ah</button>
      <button class="emit-action-deckbottom" @click="$emit('practice-action', 'moveToDeckBottom', 'a-100-0')">ad</button>
      <button class="emit-action-flip" @click="$emit('practice-action', 'flip', 'a-100-0')">af</button>
      <button class="emit-action-hand-unknown" @click="$emit('practice-action', 'moveToHand', 'zzz-999-0')">ahu</button>
    </div>
  `,
});

// ============================================================
// fixture
// ============================================================

function makeCard(id: string, ciid: string, face?: 'up' | 'down'): PracticeCard {
  return {
    cardId: id,
    ciid,
    name: id,
    lang: 'ja',
    imgs: [],
    cardType: 'monster',
    empty: false,
    instanceId: `inst-${id}`,
    orientation: 'vertical',
    ...(face ? { face } : {}),
  };
}

const CARD_A = makeCard('a', '100');
const CARD_B = makeCard('b', '200');

type PracticeStore = ReturnType<typeof usePracticeStore>;

describe('components/practice/PracticeZoneInfoPanel', () => {
  let wrapper: VueWrapper | undefined;
  let store: PracticeStore;
  const drag = usePracticeDragState();

  function mountPanel(setup?: (store: PracticeStore) => void): VueWrapper {
    const pinia = createPinia();
    setActivePinia(pinia);
    store = usePracticeStore();
    setup?.(store);
    return mount(PracticeZoneInfoPanel, {
      global: { plugins: [pinia], stubs: { CardList: CardListStub } },
    });
  }

  function cardList() {
    return wrapper!.findComponent(CardListStub);
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    dragEventHolder.current = null;
    drag.endDrag();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    drag.endDrag();
  });

  // --- 未選択時の表示 ---

  it('[covers:practice-zone-info-panel.no-selection-when-no-zone] ゾーン未選択ではno-selectionのみ表示する', () => {
    wrapper = mountPanel();

    expect(wrapper.find('.no-selection').exists()).toBe(true);
    expect(wrapper.find('.no-selection').text()).toContain('Select a zone to view cards');
    expect(wrapper.find('.zone-header').exists()).toBe(false);
    expect(wrapper.findComponent(CardListStub).exists()).toBe(false);
  });

  // --- ヘッダー ---

  it.each([
    { zone: 'hand' as ZoneType, label: 'Hand', seed: (s: PracticeStore) => { s.zones.hand = [CARD_A, CARD_B]; }, count: '2' },
    { zone: 'gy' as ZoneType, label: 'Graveyard', seed: (s: PracticeStore) => { s.zones.gy = [CARD_A]; }, count: '1' },
    { zone: 'deck' as ZoneType, label: 'Deck', seed: (s: PracticeStore) => { s.zones.deck = [CARD_A, CARD_B, makeCard('c', '300')]; }, count: '3' },
    { zone: 'extra' as ZoneType, label: 'Extra Deck', seed: (s: PracticeStore) => { s.zones.extra = []; }, count: '0' },
    { zone: 'temp' as ZoneType, label: 'Temp', seed: (s: PracticeStore) => { s.zones.temp = [CARD_A]; }, count: '1' },
    { zone: 'banish' as ZoneType, label: 'Banished', seed: (s: PracticeStore) => { s.zones.banish = [CARD_A, CARD_B]; }, count: '2' },
    { zone: 'field' as ZoneType, label: 'Field Spell', seed: (s: PracticeStore) => { s.zones.field = [CARD_A]; }, count: '1' },
    { zone: 'monster' as ZoneType, label: 'Monster', seed: (s: PracticeStore) => { s.selectedSlotIndex = 2; s.zones.monster[2] = [CARD_A, CARD_B]; }, count: '2' },
    { zone: 'spellTrap' as ZoneType, label: 'Spell/Trap', seed: (s: PracticeStore) => { s.selectedSlotIndex = 0; s.zones.spellTrap[0] = [CARD_A]; }, count: '1' },
    { zone: 'extraMonster' as ZoneType, label: 'Extra Monster', seed: (s: PracticeStore) => { s.selectedSlotIndex = 1; s.zones.extraMonster[1] = [CARD_A]; }, count: '1' },
  ])(
    '[covers:practice-zone-info-panel.header-label-and-count] zone=$zone ではラベル$labelと件数$countを表示する',
    ({ zone, label, seed, count }) => {
      wrapper = mountPanel((s) => {
        seed(s);
        s.selectedZone = zone;
      });

      expect(wrapper.find('.zone-label').text()).toBe(label);
      expect(wrapper.find('.zone-count').text()).toBe(count);
    },
  );

  // --- CardListへのprops ---

  it('[covers:practice-zone-info-panel.card-list-props-bound] CardListへcards/section-type/unique-id/force-reveal/zoneが渡る', () => {
    wrapper = mountPanel((s) => {
      s.zones.hand = [CARD_A, CARD_B];
      s.selectedZone = 'hand';
      s.selectedSlotIndex = 0;
    });

    const list = cardList();
    expect(list.props('sectionType')).toBe('practice');
    expect(list.props('uniqueId')).toBe('zone-hand-0');
    expect(list.props('forceReveal')).toBe(true);
    expect(list.props('zone')).toBe('hand');
    expect(list.props('cards')).toEqual([CARD_A, CARD_B]);
  });

  // --- ソートorderの受け渡し ---

  it('[covers:practice-zone-info-panel.sort-order-plumbing] deckでは初期fa-br_ascで、update:sort-orderで更新される', async () => {
    wrapper = mountPanel((s) => {
      s.zones.deck = [CARD_A];
      s.selectedZone = 'deck';
    });

    expect(cardList().props('sortOrder')).toBe('fa-br_asc');

    await cardList().find('.emit-sort-actual').trigger('click');
    await nextTick();

    expect(cardList().props('sortOrder')).toBe('actual_asc');
  });

  it('[covers:practice-zone-info-panel.sort-order-plumbing] deck/extra以外ではsort-orderがactual_ascになる', () => {
    wrapper = mountPanel((s) => {
      s.zones.hand = [CARD_A];
      s.selectedZone = 'hand';
    });

    expect(cardList().props('sortOrder')).toBe('actual_asc');
  });

  // --- ソートの素通しケース ---

  it('[covers:practice-zone-info-panel.sorted-cards-pass-through-cases] 非deckゾーンではgetCardsの順序がそのまま渡る', () => {
    wrapper = mountPanel((s) => {
      s.zones.hand = [CARD_B, CARD_A];
      s.selectedZone = 'hand';
    });

    expect(cardList().props('cards')).toEqual([CARD_B, CARD_A]);
  });

  it('[covers:practice-zone-info-panel.sorted-cards-pass-through-cases] deckでactualモードでは順序がそのまま渡る', async () => {
    wrapper = mountPanel((s) => {
      s.zones.deck = [CARD_B, CARD_A];
      s.selectedZone = 'deck';
    });

    await cardList().find('.emit-sort-actual').trigger('click');
    await nextTick();

    expect(cardList().props('cards')).toEqual([CARD_B, CARD_A]);
  });

  it('[covers:practice-zone-info-panel.sorted-cards-pass-through-cases] deckのfa-brモードでも全カード表向きなら順序がそのまま渡る', () => {
    const upA = makeCard('a', '100', 'up');
    const upB = makeCard('b', '200', 'up');
    wrapper = mountPanel((s) => {
      s.zones.deck = [upB, upA];
      s.selectedZone = 'deck';
    });

    expect(cardList().props('cards')).toEqual([upB, upA]);
  });

  // --- ドラッグ開始・終了 ---

  it('[covers:practice-zone-info-panel.dragstart-starts-drag-and-emits] 既知uuidのdragstartでドラッグが開始されdragstartがemitされる', async () => {
    wrapper = mountPanel((s) => {
      s.zones.hand = [CARD_A, CARD_B];
      s.selectedZone = 'hand';
      s.selectedSlotIndex = 0;
    });

    await cardList().find('.emit-dragstart-known').trigger('click');
    await nextTick();

    expect(drag.draggingCardId.value).toBe('inst-a');
    expect(drag.draggingCardSize.value).toEqual({ width: 36, height: 53 });

    const event = dragEventHolder.current!;
    expect(event.dataTransfer.setData).toHaveBeenCalledWith(
      'text/plain',
      JSON.stringify({ cardId: 'inst-a', zone: 'hand', slotIndex: 0 }),
    );
    expect(event.dataTransfer.setDragImage).toHaveBeenCalledTimes(1);

    const emitted = wrapper.emitted('dragstart');
    expect(emitted).toHaveLength(1);
    expect(emitted![0]![0]).toEqual(CARD_A);
    expect(emitted![0]![1]).toBe(event);
  });

  it('[covers:practice-zone-info-panel.dragstart-ignored-for-unknown-uuid] 未知uuidのdragstartではドラッグが開始されない', async () => {
    wrapper = mountPanel((s) => {
      s.zones.hand = [CARD_A];
      s.selectedZone = 'hand';
    });

    await cardList().find('.emit-dragstart-unknown').trigger('click');
    await nextTick();

    expect(drag.draggingCardId.value).toBeNull();
    expect(wrapper.emitted('dragstart')).toBeUndefined();
  });

  it('[covers:practice-zone-info-panel.dragend-ends-drag] dragendでドラッグ状態が解除される', async () => {
    wrapper = mountPanel((s) => {
      s.zones.hand = [CARD_A];
      s.selectedZone = 'hand';
      s.selectedSlotIndex = 0;
    });

    await cardList().find('.emit-dragstart-known').trigger('click');
    await nextTick();
    expect(drag.draggingCardId.value).toBe('inst-a');

    await cardList().find('.emit-dragend').trigger('click');
    await nextTick();

    expect(drag.draggingCardId.value).toBeNull();
  });

  // --- practice-actionの転送 ---

  it('[covers:practice-zone-info-panel.practice-action-move-to-hand] moveToHandがmoveCard(instanceId, hand, undefined, {face:up}, fieldIndex)で呼ばれる', async () => {
    wrapper = mountPanel((s) => {
      s.zones.gy = [CARD_A];
      s.selectedZone = 'gy';
    });
    const moveCard = vi.spyOn(store, 'moveCard').mockImplementation(() => {});

    await cardList().find('.emit-action-hand').trigger('click');

    expect(moveCard).toHaveBeenCalledTimes(1);
    expect(moveCard).toHaveBeenCalledWith('inst-a', 'hand', undefined, { face: 'up' }, 0);
  });

  it('[covers:practice-zone-info-panel.practice-action-move-to-deck-bottom] moveToDeckBottomがmoveCard(instanceId, deck, undefined, {position:bottom, face:down}, fieldIndex)で呼ばれる', async () => {
    wrapper = mountPanel((s) => {
      s.zones.hand = [CARD_A];
      s.selectedZone = 'hand';
    });
    const moveCard = vi.spyOn(store, 'moveCard').mockImplementation(() => {});

    await cardList().find('.emit-action-deckbottom').trigger('click');

    expect(moveCard).toHaveBeenCalledTimes(1);
    expect(moveCard).toHaveBeenCalledWith('inst-a', 'deck', undefined, { position: 'bottom', face: 'down' }, 0);
  });

  it('[covers:practice-zone-info-panel.practice-action-ignored-otherwise] 対象外actionと未知uuidではmoveCardが呼ばれない', async () => {
    wrapper = mountPanel((s) => {
      s.zones.hand = [CARD_A];
      s.selectedZone = 'hand';
    });
    const moveCard = vi.spyOn(store, 'moveCard').mockImplementation(() => {});

    await cardList().find('.emit-action-flip').trigger('click');
    await cardList().find('.emit-action-hand-unknown').trigger('click');

    expect(moveCard).not.toHaveBeenCalled();
  });
});
