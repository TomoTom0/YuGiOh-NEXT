/**
 * components/practice/PracticeField のユニットテスト
 *
 * tests/design/practice-field/conditions.toml（TASK-571 × TASK-331 Tier C第22号）の
 * 12条件をカバーする。unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - PracticeFieldを直接mount + pinia実物（DeckMetadata.test.tsと同一手法）
 * - 子4種（PracticeSlot/PracticeSlotControls/PracticeHandArea/PracticeDragOverlay）は
 *   カスタムstub: 受け取ったpropsをdata属性へ描画し、ボタンで親がlistenするイベントを
 *   発火する。子の内部挙動は各子の条件書が保証
 * - usePracticeActions/usePracticeDropHandlerはmodule mockで置き換え呼び出し引数を観測。
 *   practice/settings/deck-editの各storeは実物（アクションはspyで引数観測）
 * - 観測対象は描画結果・子props・store/composableの呼び出し引数。vm内部は参照しない
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import PracticeField from '@/components/practice/PracticeField.vue';
import { usePracticeStore } from '@/stores/practice';
import { useSettingsStore } from '@/stores/settings';
import { useDeckEditStore } from '@/stores/deck-edit';
import type { PracticeCard } from '@/stores/practice';

// ============================================================
// module mock（composable）
// ============================================================

const handlerMocks = vi.hoisted(() => ({
  executeAction: vi.fn(),
  handleCardDrop: vi.fn(),
  handleExternalCardDrop: vi.fn(),
}));

vi.mock('../../../src/composables/practice/usePracticeActions', () => ({
  usePracticeActions: () => ({ executeAction: handlerMocks.executeAction }),
}));

vi.mock('../../../src/composables/practice/usePracticeDropHandler', () => ({
  usePracticeDropHandler: () => ({
    handleCardDrop: handlerMocks.handleCardDrop,
    handleExternalCardDrop: handlerMocks.handleExternalCardDrop,
  }),
}));

// ============================================================
// 子コンポーネント カスタムstub
// ============================================================

const DROP_POS = { isRight: true, isTop: true };
const DROP_POS2 = { isRight: false, isTop: false };

const PracticeSlotStub = defineComponent({
  name: 'PracticeSlot',
  props: {
    cards: { type: Array, required: true },
    zone: { type: String, required: true },
    slotIndex: { type: Number, default: undefined },
    stackDirection: { type: String, required: true },
    maxVisible: { type: Number, default: undefined },
    forceReveal: { type: Boolean, default: false },
    cardWidth: { type: Number, required: true },
    cardHeight: { type: Number, required: true },
  },
  emits: ['card-click', 'slot-click', 'card-action', 'card-dragstart', 'card-dragend', 'card-drop', 'deck-card-drop'],
  template: `
    <div class="slot-stub">
      <button class="emit-slot-click" @click="$emit('slot-click', zone, slotIndex)">sc</button>
      <button class="emit-card-action" @click="$emit('card-action', 'flip', 'inst-a')">ca</button>
      <button class="emit-card-action-draw" @click="$emit('card-action', 'draw')">cad</button>
      <button class="emit-card-action-shuffle" @click="$emit('card-action', 'shuffleDeck')">cas</button>
      <button class="emit-card-drop" @click="$emit('card-drop', 'inst-x', 'hand', undefined, DROP_POS)">cd</button>
      <button class="emit-deck-card-drop" @click="$emit('deck-card-drop', '111', '222', DROP_POS2)">dcd</button>
    </div>
  `,
  setup() {
    return { DROP_POS, DROP_POS2 };
  },
});

const PracticeSlotControlsStub = defineComponent({
  name: 'PracticeSlotControls',
  props: {
    zone: { type: String, required: true },
    cards: { type: Object, required: true },
    visible: { type: Boolean, required: true },
    deckEmpty: { type: Boolean, default: undefined },
    revealExtra: { type: Boolean, default: undefined },
  },
  emits: ['action', 'open-menu'],
  template: `
    <div class="controls-stub">
      <button class="emit-action-draw" @click="$emit('action', 'draw')">ad</button>
      <button class="emit-action-shuffle" @click="$emit('action', 'shuffleDeck')">as</button>
      <button class="emit-action-reveal" @click="$emit('action', 'revealExtraToggle')">ar</button>
      <button class="emit-action-unknown" @click="$emit('action', 'somethingElse')">au</button>
      <button class="emit-open-menu" @click="$emit('open-menu')">om</button>
    </div>
  `,
});

const PracticeHandAreaStub = defineComponent({
  name: 'PracticeHandArea',
  props: {
    handCards: { type: Array, required: true },
    tempCards: { type: Array, required: true },
    reversed: { type: Boolean, required: true },
    twoDeckMode: { type: Boolean, required: true },
    cardWidth: { type: Number, required: true },
    cardHeight: { type: Number, required: true },
  },
  emits: ['card-click', 'card-action', 'card-dragstart', 'card-dragend', 'card-drop', 'deck-card-drop', 'temp-card-drop', 'temp-deck-card-drop'],
  template: `
    <div class="hand-area-stub">
      <button class="emit-card-drop" @click="$emit('card-drop', 'inst-x', 'gy', 3, DROP_POS)">cd</button>
      <button class="emit-temp-card-drop" @click="$emit('temp-card-drop', 'inst-x', 'gy', 3, DROP_POS)">tcd</button>
      <button class="emit-deck-card-drop" @click="$emit('deck-card-drop', '111', '222', DROP_POS)">dcd</button>
      <button class="emit-temp-deck-card-drop" @click="$emit('temp-deck-card-drop', '111', '222', DROP_POS)">tdcd</button>
    </div>
  `,
  setup() {
    return { DROP_POS };
  },
});

const PracticeDragOverlayStub = defineComponent({
  name: 'PracticeDragOverlay',
  template: '<div class="drag-overlay-stub" />',
});

// ============================================================
// fixture / mount
// ============================================================

function makeCard(id: string): PracticeCard {
  return {
    cardId: id,
    ciid: `${id}-ciid`,
    name: id,
    lang: 'ja',
    imgs: [],
    cardType: 'monster',
    empty: false,
    instanceId: `inst-${id}`,
  } as PracticeCard;
}

const CARD_A = makeCard('a');
const CARD_B = makeCard('b');

type PracticeStore = ReturnType<typeof usePracticeStore>;
type SettingsStore = ReturnType<typeof useSettingsStore>;
type DeckEditStore = ReturnType<typeof useDeckEditStore>;

describe('components/practice/PracticeField', () => {
  let wrapper: VueWrapper | undefined;
  let practiceStore: PracticeStore;
  let settingsStore: SettingsStore;
  let deckStore: DeckEditStore;

  function mountField(
    props: { fieldIndex?: number; hideEMZ?: boolean } = {},
    setup?: (p: PracticeStore, s: SettingsStore, d: DeckEditStore) => void,
  ): VueWrapper {
    const pinia = createPinia();
    setActivePinia(pinia);
    practiceStore = usePracticeStore();
    settingsStore = useSettingsStore();
    deckStore = useDeckEditStore();
    setup?.(practiceStore, settingsStore, deckStore);
    return mount(PracticeField, {
      props,
      global: {
        plugins: [pinia],
        stubs: {
          PracticeSlot: PracticeSlotStub,
          PracticeSlotControls: PracticeSlotControlsStub,
          PracticeHandArea: PracticeHandAreaStub,
          PracticeDragOverlay: PracticeDragOverlayStub,
        },
      },
    });
  }

  function slotStubs(zone?: string, slotIndex?: number) {
    const all = wrapper!.findAllComponents(PracticeSlotStub);
    return all.filter(
      (s) =>
        (zone === undefined || s.props('zone') === zone) &&
        (slotIndex === undefined || s.props('slotIndex') === slotIndex),
    );
  }

  function controlsStubs(zone: string) {
    return wrapper!.findAllComponents(PracticeSlotControlsStub).filter((s) => s.props('zone') === zone);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  // --- 全体ゲート ---

  it.each([0, 1])(
    '[covers:practice-field.drag-overlay-only-for-field-zero] fieldIndex=%s のときDragOverlay表示はその場合のみ',
    (fieldIndex) => {
      wrapper = mountField({ fieldIndex });

      expect(wrapper.findComponent(PracticeDragOverlayStub).exists()).toBe(fieldIndex === 0);
    },
  );

  it('[covers:practice-field.rendered-only-when-initialized] 未初期化ではフィールド本体を描画しない', () => {
    wrapper = mountField();

    expect(wrapper.find('.practice-field').exists()).toBe(false);
  });

  it('[covers:practice-field.rendered-only-when-initialized] fieldIndex=0はinitialized、1はinitialized2で描画され、1ではfield-opponentが付く', () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
    });
    expect(wrapper.find('.practice-field').exists()).toBe(true);
    expect(wrapper.find('.practice-field').classes()).not.toContain('field-opponent');
    wrapper.unmount();

    wrapper = mountField({ fieldIndex: 1 }, (p) => {
      p.initialized = true;
      p.initialized2 = false;
    });
    expect(wrapper.find('.practice-field').exists()).toBe(false);
    wrapper.unmount();

    wrapper = mountField({ fieldIndex: 1 }, (p) => {
      p.initialized2 = true;
    });
    expect(wrapper.find('.practice-field').exists()).toBe(true);
    expect(wrapper.find('.practice-field').classes()).toContain('field-opponent');
  });

  // --- カードサイズ ---

  it('[covers:practice-field.card-size-source-and-css-vars] 通常時はpracticeCardSize、2P時はpracticeCardSize2PがCSS変数になる', () => {
    wrapper = mountField({}, (p, s) => {
      p.initialized = true;
      s.appSettings.practiceCardSize = 'medium';
      s.appSettings.practiceCardSize2P = 'large';
    });
    let root = wrapper.find('.practice-field').element as HTMLElement;
    expect(root.style.getPropertyValue('--practice-card-width')).toBe('60px');
    expect(root.style.getPropertyValue('--practice-card-height')).toBe('88px');
    wrapper.unmount();

    wrapper = mountField({}, (p, s) => {
      p.initialized = true;
      p.p2DeckDno = 999;
      s.appSettings.practiceCardSize = 'medium';
      s.appSettings.practiceCardSize2P = 'large';
    });
    root = wrapper.find('.practice-field').element as HTMLElement;
    expect(root.style.getPropertyValue('--practice-card-width')).toBe('90px');
    expect(root.style.getPropertyValue('--practice-card-height')).toBe('132px');
  });

  // --- EMZ行 ---

  it('[covers:practice-field.emz-row-and-p2-banish] hideEMZ=trueではEMZ行が表示されない', () => {
    wrapper = mountField({ hideEMZ: true }, (p) => {
      p.initialized = true;
    });

    expect(wrapper.find('.row-em').exists()).toBe(false);
  });

  it('[covers:practice-field.emz-row-and-p2-banish] 通常時のEMZ行はEM2件とbanishの3スロット', () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
      p.zones.extraMonster[0] = [CARD_A];
    });

    const rowSlots = wrapper.find('.row-em').findAllComponents(PracticeSlotStub);
    expect(rowSlots).toHaveLength(3);
    expect(rowSlots.map((s) => s.props('zone'))).toEqual(['extraMonster', 'extraMonster', 'banish']);
    expect(rowSlots[0]?.props('cards')).toEqual([CARD_A]);
  });

  it('[covers:practice-field.emz-row-and-p2-banish] twoDeckModeではEMZ行の先頭にP2 banishスロットが入る', () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
      p.p2DeckDno = 999;
      p.zones2.banish = [CARD_B];
    });

    const rowSlots = wrapper.find('.row-em').findAllComponents(PracticeSlotStub);
    expect(rowSlots).toHaveLength(4);
    expect(rowSlots[0]?.props('zone')).toBe('banish');
    expect(rowSlots[0]?.props('cards')).toEqual([CARD_B]);
  });

  // --- スロット束縛 ---

  it('[covers:practice-field.slot-bindings-per-zone] 各ゾーンのスロットへ規則どおりpropsが渡される', () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
      p.zones.monster[2] = [CARD_A];
      p.revealExtra = true;
    });

    const monsters = slotStubs('monster');
    expect(monsters.map((s) => s.props('slotIndex'))).toEqual([0, 1, 2, 3, 4]);
    expect(monsters[2]?.props('cards')).toEqual([CARD_A]);
    expect(monsters.every((s) => s.props('stackDirection') === 'right-up')).toBe(true);

    expect(slotStubs('spellTrap')).toHaveLength(5);
    expect(slotStubs('extraMonster').map((s) => s.props('slotIndex'))).toEqual([0, 1]);

    const extra = slotStubs('extra')[0]!;
    expect(extra.props('stackDirection')).toBe('none');
    expect(extra.props('forceReveal')).toBe(true);

    const deck = slotStubs('deck')[0]!;
    expect(deck.props('stackDirection')).toBe('none');
    expect(deck.props('forceReveal')).toBe(false);

    expect(slotStubs('banish')[0]?.props('maxVisible')).toBe(10);
    expect(slotStubs('gy')[0]?.props('maxVisible')).toBe(10);
    expect(slotStubs('monster')[0]?.props('maxVisible')).toBeUndefined();
  });

  it('[covers:practice-field.slot-bindings-per-zone] fieldIndex=1ではzones2のカードが渡される', () => {
    wrapper = mountField({ fieldIndex: 1 }, (p) => {
      p.initialized2 = true;
      p.zones.monster[0] = [CARD_A];
      p.zones2.monster[0] = [CARD_B];
    });

    expect(slotStubs('monster', 0)[0]?.props('cards')).toEqual([CARD_B]);
  });

  // --- コントロール表示・props ---

  it('[covers:practice-field.slot-controls-visibility-on-hover] monster-2のhoverでのみそのコントロールがvisibleになる', async () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
    });

    const monsterControls = () => controlsStubs('monster');
    expect(monsterControls().every((c) => c.props('visible') === false)).toBe(true);

    await wrapper.findAll('.monster-slot')[2]!.trigger('mouseenter');
    await nextTick();
    expect(monsterControls().map((c) => c.props('visible'))).toEqual([false, false, true, false, false]);
    expect(controlsStubs('gy')[0]?.props('visible')).toBe(false);

    await wrapper.findAll('.monster-slot')[2]!.trigger('mouseleave');
    await nextTick();
    expect(monsterControls().every((c) => c.props('visible') === false)).toBe(true);
  });

  it('[covers:practice-field.slot-controls-props] deckコントロールのdeckEmptyとextraコントロールのrevealExtraがstoreを反映する', () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
      p.revealExtra = true;
    });

    expect(controlsStubs('deck')[0]?.props('deckEmpty')).toBe(true);
    expect(controlsStubs('extra')[0]?.props('revealExtra')).toBe(true);
    expect(controlsStubs('extra')[0]?.props('cards')).toEqual([]);
    wrapper.unmount();

    wrapper = mountField({}, (p) => {
      p.initialized = true;
      p.zones.deck = [CARD_A];
    });
    expect(controlsStubs('deck')[0]?.props('deckEmpty')).toBe(false);
  });

  // --- HandArea束縛 ---

  it.each([
    { fieldIndex: 0, twoDeck: false, reversed: false },
    { fieldIndex: 1, twoDeck: false, reversed: true },
    { fieldIndex: 0, twoDeck: true, reversed: false },
  ])(
    '[covers:practice-field.hand-area-bindings] fieldIndex=$fieldIndex・twoDeck=$twoDeck ではHandAreaへreversed=$reversed等が渡る',
    ({ fieldIndex, twoDeck, reversed }) => {
      wrapper = mountField({ fieldIndex }, (p) => {
        p.initialized = true;
        p.initialized2 = true;
        if (twoDeck) p.p2DeckDno = 999;
        p.zones.hand = [CARD_A];
        p.zones2.hand = [CARD_B];
      });

      const area = wrapper.findComponent(PracticeHandAreaStub);
      expect(area.props('reversed')).toBe(reversed);
      expect(area.props('twoDeckMode')).toBe(twoDeck);
      expect(area.props('handCards')).toEqual(fieldIndex === 1 ? [CARD_B] : [CARD_A]);
      expect(area.props('cardWidth')).toBe(36);
      expect(area.props('cardHeight')).toBe(53);
    },
  );

  // --- イベント処理 ---

  it('[covers:practice-field.slot-click-selects-zone] スロットのslot-clickでselectZone(zone, slotIndex, fieldIndex)とactiveTab設定が行われる', async () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
    });
    const selectZone = vi.spyOn(practiceStore, 'selectZone').mockImplementation(() => {});

    await slotStubs('monster', 2)[0]!.find('.emit-slot-click').trigger('click');

    expect(selectZone).toHaveBeenCalledTimes(1);
    expect(selectZone).toHaveBeenCalledWith('monster', 2, 0);
    expect(deckStore.activeTab).toBe('practice');
  });

  it('[covers:practice-field.slot-click-selects-zone] コントロールのopen-menuでも同じゾーン選択が行われる', async () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
    });
    const selectZone = vi.spyOn(practiceStore, 'selectZone').mockImplementation(() => {});

    await controlsStubs('gy')[0]!.find('.emit-open-menu').trigger('click');

    expect(selectZone).toHaveBeenCalledWith('gy', undefined, 0);
    expect(deckStore.activeTab).toBe('practice');
  });

  it('[covers:practice-field.action-handling] cardIdなしactionが種類で分岐し、対象外では何も呼ばれない', async () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
    });
    const draw = vi.spyOn(practiceStore, 'draw').mockImplementation(() => {});
    const shuffleDeck = vi.spyOn(practiceStore, 'shuffleDeck').mockImplementation(() => {});
    const revealExtraContents = vi.spyOn(practiceStore, 'revealExtraContents').mockImplementation(() => {});
    const deckControls = controlsStubs('deck')[0]!;

    await deckControls.find('.emit-action-draw').trigger('click');
    expect(draw).toHaveBeenCalledWith(0);

    await deckControls.find('.emit-action-shuffle').trigger('click');
    expect(shuffleDeck).toHaveBeenCalledWith(0);

    await controlsStubs('extra')[0]!.find('.emit-action-reveal').trigger('click');
    expect(revealExtraContents).toHaveBeenCalledWith(true, 0);

    await deckControls.find('.emit-action-unknown').trigger('click');
    expect(draw).toHaveBeenCalledTimes(1);
    expect(shuffleDeck).toHaveBeenCalledTimes(1);
    expect(revealExtraContents).toHaveBeenCalledTimes(1);
    expect(handlerMocks.executeAction).not.toHaveBeenCalled();
  });

  it('[covers:practice-field.action-handling] cardIdありactionはexecuteAction(action, cardId, fieldIndex)へ委譲される', async () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
    });

    await slotStubs('monster', 0)[0]!.find('.emit-card-action').trigger('click');

    expect(handlerMocks.executeAction).toHaveBeenCalledTimes(1);
    expect(handlerMocks.executeAction).toHaveBeenCalledWith('flip', 'inst-a', 0);
  });

  it('[covers:practice-field.drop-handling-to-drop-handler] スロットのcard-drop/deck-card-dropがコンテキスト付きでdropHandlerへ変換される', async () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
    });
    const slot = slotStubs('monster', 1)[0]!;

    await slot.find('.emit-card-drop').trigger('click');
    expect(handlerMocks.handleCardDrop).toHaveBeenCalledWith(
      'inst-x',
      { targetZone: 'monster', targetSlotIndex: 1, fieldIndex: 0 },
      DROP_POS,
    );

    await slot.find('.emit-deck-card-drop').trigger('click');
    expect(handlerMocks.handleExternalCardDrop).toHaveBeenCalledWith(
      '111',
      '222',
      { targetZone: 'monster', targetSlotIndex: 1, fieldIndex: 0 },
      DROP_POS2,
    );
  });

  it('[covers:practice-field.drop-handling-to-drop-handler] HandAreaのcard-dropはtargetZone=hand、temp-card-dropはtempになる', async () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
    });
    const area = wrapper.findComponent(PracticeHandAreaStub);

    await area.find('.emit-card-drop').trigger('click');
    expect(handlerMocks.handleCardDrop).toHaveBeenCalledWith(
      'inst-x',
      { targetZone: 'hand', targetSlotIndex: undefined, fieldIndex: 0 },
      DROP_POS,
    );

    await area.find('.emit-temp-card-drop').trigger('click');
    expect(handlerMocks.handleCardDrop).toHaveBeenCalledWith(
      'inst-x',
      { targetZone: 'temp', targetSlotIndex: undefined, fieldIndex: 0 },
      DROP_POS,
    );

    await area.find('.emit-temp-deck-card-drop').trigger('click');
    expect(handlerMocks.handleExternalCardDrop).toHaveBeenCalledWith(
      '111',
      '222',
      { targetZone: 'temp', targetSlotIndex: undefined, fieldIndex: 0 },
      DROP_POS,
    );
  });

  // --- P2専用ハンドラ ---

  it('[covers:practice-field.p2-banish-handlers-use-field-one] P2 banishスロットの処理はfieldIndex=1固定になる', async () => {
    wrapper = mountField({}, (p) => {
      p.initialized = true;
      p.p2DeckDno = 999;
      p.zones2.banish = [CARD_B];
    });
    const selectZone = vi.spyOn(practiceStore, 'selectZone').mockImplementation(() => {});
    const draw = vi.spyOn(practiceStore, 'draw').mockImplementation(() => {});
    const shuffleDeck = vi.spyOn(practiceStore, 'shuffleDeck').mockImplementation(() => {});
    const p2Slot = wrapper.find('.row-em').findAllComponents(PracticeSlotStub)[0]!;

    await p2Slot.find('.emit-slot-click').trigger('click');
    expect(selectZone).toHaveBeenCalledWith('banish', undefined, 1);

    await p2Slot.find('.emit-card-action-draw').trigger('click');
    expect(draw).toHaveBeenCalledWith(1);

    await p2Slot.find('.emit-card-action-shuffle').trigger('click');
    expect(shuffleDeck).not.toHaveBeenCalled();

    await p2Slot.find('.emit-card-action').trigger('click');
    expect(handlerMocks.executeAction).toHaveBeenCalledWith('flip', 'inst-a', 1);

    await p2Slot.find('.emit-card-drop').trigger('click');
    expect(handlerMocks.handleCardDrop).toHaveBeenCalledWith(
      'inst-x',
      { targetZone: 'banish', targetSlotIndex: undefined, fieldIndex: 1 },
      DROP_POS,
    );
  });
});
