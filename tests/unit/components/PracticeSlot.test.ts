/**
 * components/practice/PracticeSlot のユニットテスト
 *
 * tests/design/practice-slot/conditions.toml（TASK-569 × TASK-331 Tier C第20号）の
 * 12条件をカバーする。unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - PracticeSlotを直接mount。子PracticeCardStackはカスタムstub（内部挙動は第16号
 *   practice-card-stack条件書が保証）
 * - useDragQuarter/usePracticeDragState/drag-dataのガードは実物を使い、共有drag状態は
 *   公開refから観測する（内部仕様は各条件書へ委譲）
 * - ドラッグ系イベントは実要素へのdispatchEventで発火する。happy-domではDragEventが
 *   EventのエイリアスのためMouseEventでinstanceof DragEventを満たす
 *   （tests/unit/utils/drag-data.test.tsの注記と同一前提）。dataTransferは
 *   definePropertyで付与し、矩形はgetBoundingClientRectを差し替えて既知値にする
 * - 観測対象は描画結果・emit・共有drag状態。vm内部computedは直接参照しない
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import PracticeSlot from '@/components/practice/PracticeSlot.vue';
import type { PracticeCard, ZoneType } from '@/stores/practice';
import { usePracticeDragState } from '@/composables/practice/usePracticeDragState';
import { isHTMLElement } from '@/utils/type-guards';

// ============================================================
// PracticeCardStack カスタムstub
// ============================================================

const stubDragEvent = { type: 'stub-dragstart' };

const PracticeCardStackStub = defineComponent({
  name: 'PracticeCardStack',
  props: {
    cards: { type: Array, required: true },
    direction: { type: String, required: true },
    maxVisible: { type: Number, required: true },
    forceReveal: { type: Boolean, required: true },
    zone: { type: String, required: true },
    slotIndex: { type: Number, default: undefined },
    dragOver: { type: Boolean, required: true },
    cardWidth: { type: Number, required: true },
    cardHeight: { type: Number, required: true },
  },
  emits: ['card-click', 'card-action', 'card-dragstart', 'card-dragend'],
  template: `
    <div class="card-stack-stub">
      <button class="emit-card-click" @click.stop="$emit('card-click', cards[0])">cc</button>
      <button class="emit-card-action" @click.stop="$emit('card-action', 'flip', 'inst-a')">ca</button>
      <button class="emit-card-dragstart" @click.stop="$emit('card-dragstart', cards[0], stubDragEvent)">cd</button>
      <button class="emit-card-dragend" @click.stop="$emit('card-dragend')">ce</button>
    </div>
  `,
  setup() {
    return { stubDragEvent };
  },
});

// ============================================================
// fixture / helpers
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
  };
}

const CARD_A = makeCard('a');

const drag = usePracticeDragState();

function resetDragState(): void {
  drag.endDrag();
  drag.draggingPos.value = { x: -9999, y: -9999 };
  drag.draggingFaceDown.value = false;
  drag.draggingStackTop.value = null;
}

interface MountOptions {
  cards: PracticeCard[];
  zone: ZoneType;
  slotIndex?: number;
  stackDirection?: 'right-up' | 'left-up' | 'right' | 'left' | 'none';
  maxVisible?: number;
  forceReveal?: boolean;
  cardWidth?: number;
  cardHeight?: number;
}

function mountSlot(opts: MountOptions): VueWrapper {
  const wrapper = mount(PracticeSlot, {
    props: {
      cards: opts.cards,
      zone: opts.zone,
      ...(opts.slotIndex !== undefined ? { slotIndex: opts.slotIndex } : {}),
      ...(opts.stackDirection !== undefined ? { stackDirection: opts.stackDirection } : {}),
      ...(opts.maxVisible !== undefined ? { maxVisible: opts.maxVisible } : {}),
      ...(opts.forceReveal !== undefined ? { forceReveal: opts.forceReveal } : {}),
      ...(opts.cardWidth !== undefined ? { cardWidth: opts.cardWidth } : {}),
      ...(opts.cardHeight !== undefined ? { cardHeight: opts.cardHeight } : {}),
    },
    global: { stubs: { PracticeCardStack: PracticeCardStackStub } },
  });
  // 矩形を既知値（100x100・原点0,0）に差し替える
  if (!isHTMLElement(wrapper.element)) throw new Error('slot element is not an HTMLElement');
  wrapper.element.getBoundingClientRect = (): DOMRect => ({
    left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
  });
  return wrapper;
}

async function dispatchDrag(
  wrapper: VueWrapper,
  type: string,
  clientX = 50,
  clientY = 50,
  dataTransfer?: { getData: (type: string) => string },
): Promise<void> {
  const event = new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true });
  if (dataTransfer) {
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  }
  if (!isHTMLElement(wrapper.element)) throw new Error('slot element is not an HTMLElement');
  wrapper.element.dispatchEvent(event);
  await nextTick();
}

function quarters(wrapper: VueWrapper) {
  return wrapper.findAll('.drop-quarter-overlay .quarter');
}

describe('components/practice/PracticeSlot', () => {
  let wrapper: VueWrapper | undefined;

  beforeEach(() => {
    resetDragState();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    resetDragState();
  });

  // --- ルートの状態表示 ---

  it('[covers:practice-slot.root-state-classes-and-empty-display] カードがある場合はhas-cardsでCardStackを描画する', () => {
    wrapper = mountSlot({ cards: [CARD_A], zone: 'monster' });

    expect(wrapper.classes()).toContain('has-cards');
    expect(wrapper.classes()).not.toContain('is-empty');
    expect(wrapper.attributes('data-zone')).toBe('monster');
    expect(wrapper.findComponent(PracticeCardStackStub).exists()).toBe(true);
    expect(wrapper.find('.slot-empty-label').exists()).toBe(false);
  });

  it('[covers:practice-slot.root-state-classes-and-empty-display] カードが0件の場合はis-emptyで空ラベルを表示する', () => {
    wrapper = mountSlot({ cards: [], zone: 'hand' });

    expect(wrapper.classes()).toContain('is-empty');
    expect(wrapper.findComponent(PracticeCardStackStub).exists()).toBe(false);
    const label = wrapper.find('.slot-empty-label');
    expect(label.exists()).toBe(true);
    expect(label.text()).toBe('0');
  });

  // --- PracticeCardStackへのprops ---

  it('[covers:practice-slot.card-stack-props-bound] CardStackへprops一式が渡り、dragOverがdragoverで追随する', async () => {
    wrapper = mountSlot({
      cards: [CARD_A], zone: 'hand', slotIndex: 1,
      stackDirection: 'left', maxVisible: 5, forceReveal: true, cardWidth: 60, cardHeight: 88,
    });

    const stub = wrapper.findComponent(PracticeCardStackStub);
    expect(stub.props('cards')).toEqual([CARD_A]);
    expect(stub.props('direction')).toBe('left');
    expect(stub.props('maxVisible')).toBe(5);
    expect(stub.props('forceReveal')).toBe(true);
    expect(stub.props('zone')).toBe('hand');
    expect(stub.props('slotIndex')).toBe(1);
    expect(stub.props('cardWidth')).toBe(60);
    expect(stub.props('cardHeight')).toBe(88);
    expect(stub.props('dragOver')).toBe(false);

    await dispatchDrag(wrapper, 'dragover', 50, 50);

    expect(wrapper.findComponent(PracticeCardStackStub).props('dragOver')).toBe(true);
  });

  // --- クリック・カードイベント ---

  it('[covers:practice-slot.slot-click-emitted] 根源要素のクリックでslot-clickが(zone, slotIndex)でemitされる', async () => {
    wrapper = mountSlot({ cards: [], zone: 'monster', slotIndex: 2 });

    await wrapper.trigger('click');

    expect(wrapper.emitted('slot-click')).toEqual([['monster', 2]]);
  });

  it('[covers:practice-slot.card-events-forwarded] CardStackの4イベントが同じ引数で再emitされる', async () => {
    wrapper = mountSlot({ cards: [CARD_A], zone: 'monster' });
    const stub = wrapper.findComponent(PracticeCardStackStub);

    await stub.find('.emit-card-click').trigger('click');
    expect(wrapper.emitted('card-click')).toEqual([[CARD_A]]);

    await stub.find('.emit-card-action').trigger('click');
    expect(wrapper.emitted('card-action')).toEqual([['flip', 'inst-a']]);

    await stub.find('.emit-card-dragstart').trigger('click');
    const dragstart = wrapper.emitted('card-dragstart');
    expect(dragstart).toHaveLength(1);
    expect(dragstart![0]![0]).toEqual(CARD_A);
    expect(dragstart![0]![1]).toBe(stubDragEvent);

    await stub.find('.emit-card-dragend').trigger('click');
    expect(wrapper.emitted('card-dragend')).toEqual([[]]);
  });

  // --- 四分円オーバーレイ ---

  it.each([
    { zone: 'deck' as ZoneType, cards: [CARD_A], count: 3, spanFull: [false, false, true] },
    { zone: 'extra' as ZoneType, cards: [CARD_A], count: 2, spanFull: [true, true] },
    { zone: 'monster' as ZoneType, cards: [], count: 2, spanFull: [true, true] },
    { zone: 'monster' as ZoneType, cards: [CARD_A], count: 4, spanFull: [false, false, false, false] },
  ])(
    '[covers:practice-slot.quarters-composition-by-zone] zone=$zone・$count件の四分円構成になる',
    async ({ zone, cards, count, spanFull }) => {
      wrapper = mountSlot({ cards, zone });

      await dispatchDrag(wrapper, 'dragover', 50, 50);

      const qs = quarters(wrapper);
      expect(qs).toHaveLength(count);
      expect(qs.map((q) => q.classes().includes('span-full'))).toEqual(spanFull);
    },
  );

  it('[covers:practice-slot.quarters-composition-by-zone] gyではドラッグオーバー中でもオーバーレイを表示しない', async () => {
    wrapper = mountSlot({ cards: [CARD_A], zone: 'gy' });

    await dispatchDrag(wrapper, 'dragover', 50, 50);

    expect(wrapper.classes()).toContain('drag-over');
    expect(wrapper.find('.drop-quarter-overlay').exists()).toBe(false);
  });

  it('[covers:practice-slot.quarter-active-and-facedown-classes] 右上ではtrのみactiveになりfacedownは付かない', async () => {
    wrapper = mountSlot({ cards: [CARD_A], zone: 'monster' });

    await dispatchDrag(wrapper, 'dragover', 75, 25);

    const qs = quarters(wrapper);
    expect(qs.map((q) => q.classes().includes('active'))).toEqual([false, true, false, false]);
    expect(qs[1]!.classes()).not.toContain('active-facedown');
  });

  it('[covers:practice-slot.quarter-active-and-facedown-classes] 左下ではblがactive+active-facedownになる', async () => {
    wrapper = mountSlot({ cards: [CARD_A], zone: 'monster' });

    await dispatchDrag(wrapper, 'dragover', 25, 75);

    const qs = quarters(wrapper);
    expect(qs.map((q) => q.classes().includes('active'))).toEqual([false, false, true, false]);
    expect(qs[2]!.classes()).toContain('active-facedown');
  });

  it('[covers:practice-slot.quarter-active-and-facedown-classes] deckの下半分ではbがactive+active-facedownになる', async () => {
    wrapper = mountSlot({ cards: [CARD_A], zone: 'deck' });

    await dispatchDrag(wrapper, 'dragover', 50, 75);

    const qs = quarters(wrapper);
    expect(qs.map((q) => q.classes().includes('active'))).toEqual([false, false, true]);
    expect(qs[2]!.classes()).toContain('active-facedown');
  });

  // --- drag状態への通知 ---

  it.each([
    { zone: 'monster' as ZoneType, y: 25, expected: false },
    { zone: 'monster' as ZoneType, y: 75, expected: true },
    { zone: 'deck' as ZoneType, y: 25, expected: false },
    { zone: 'deck' as ZoneType, y: 75, expected: true },
    { zone: 'gy' as ZoneType, y: 75, expected: false },
  ])(
    '[covers:practice-slot.drag-over-sets-drag-face-down] zone=$zone・y=$y でdraggingFaceDownが$expectedになる',
    async ({ zone, y, expected }) => {
      wrapper = mountSlot({ cards: [CARD_A], zone });

      await dispatchDrag(wrapper, 'dragover', 50, y);

      expect(drag.draggingFaceDown.value).toBe(expected);
    },
  );

  it.each([
    { zone: 'monster' as ZoneType, cards: [CARD_A], x: 75, y: 50, expected: true },
    { zone: 'monster' as ZoneType, cards: [CARD_A], x: 25, y: 50, expected: false },
    { zone: 'deck' as ZoneType, cards: [CARD_A], x: 75, y: 25, expected: true },
    { zone: 'deck' as ZoneType, cards: [CARD_A], x: 25, y: 25, expected: false },
    { zone: 'deck' as ZoneType, cards: [CARD_A], x: 50, y: 75, expected: null },
    { zone: 'extra' as ZoneType, cards: [CARD_A], x: 50, y: 25, expected: true },
    { zone: 'extra' as ZoneType, cards: [CARD_A], x: 50, y: 75, expected: false },
    { zone: 'extraMonster' as ZoneType, cards: [CARD_A], x: 50, y: 25, expected: true },
    { zone: 'monster' as ZoneType, cards: [], x: 75, y: 25, expected: null },
  ])(
    '[covers:practice-slot.drag-over-sets-drag-stack-top] zone=$zone・x=$x・y=$y でdraggingStackTopが$expectedになる',
    async ({ zone, cards, x, y, expected }) => {
      wrapper = mountSlot({ cards, zone });

      await dispatchDrag(wrapper, 'dragover', x, y);

      expect(drag.draggingStackTop.value).toBe(expected);
    },
  );

  it('[covers:practice-slot.drag-leave-resets-drag-state] dragleaveでfaceDown/stackTopがリセットされdrag-overが外れる', async () => {
    wrapper = mountSlot({ cards: [CARD_A], zone: 'monster' });

    await dispatchDrag(wrapper, 'dragover', 75, 75);
    expect(drag.draggingFaceDown.value).toBe(true);
    expect(drag.draggingStackTop.value).toBe(true);
    expect(wrapper.classes()).toContain('drag-over');

    await dispatchDrag(wrapper, 'dragleave', 0, 0);

    expect(drag.draggingFaceDown.value).toBe(false);
    expect(drag.draggingStackTop.value).toBeNull();
    expect(wrapper.classes()).not.toContain('drag-over');
  });

  // --- ドロップの転送 ---

  it('[covers:practice-slot.drop-emits-card-drop-for-practice-data] practice系データのdropでcard-dropがemitされオーバー表示がリセットされる', async () => {
    wrapper = mountSlot({ cards: [CARD_A], zone: 'hand' });
    drag.draggingPos.value = { x: 75, y: 25 };

    await dispatchDrag(wrapper, 'dragover', 50, 50);
    expect(wrapper.classes()).toContain('drag-over');

    const payload = JSON.stringify({ cardId: 'inst-x', zone: 'gy', slotIndex: 3 });
    await dispatchDrag(wrapper, 'drop', 75, 25, { getData: () => payload });

    expect(wrapper.emitted('card-drop')).toEqual([
      ['inst-x', 'gy', 3, { isRight: true, isTop: true }],
    ]);
    expect(wrapper.classes()).not.toContain('drag-over');
  });

  it.each([
    { card: { cardId: 123, ciid: 456, empty: false }, expected: ['123', '456'] },
    { card: { cid: '789', ciid: '790', empty: false }, expected: ['789', '790'] },
  ])(
    '[covers:practice-slot.drop-emits-deck-card-drop-for-deck-data] deck系データのdropでdeck-card-dropが文字列化してemitされる',
    async ({ card, expected }) => {
      wrapper = mountSlot({ cards: [CARD_A], zone: 'hand' });
      drag.draggingPos.value = { x: 25, y: 75 };

      const payload = JSON.stringify({ sectionType: 'main', card });
      await dispatchDrag(wrapper, 'drop', 25, 75, { getData: () => payload });

      expect(wrapper.emitted('deck-card-drop')).toEqual([
        [expected[0], expected[1], { isRight: false, isTop: false }],
      ]);
    },
  );

  it.each([
    { caseName: 'ドラッグデータなし', payload: '' },
    { caseName: 'practice系だがzoneが無効', payload: JSON.stringify({ cardId: 'inst-x', zone: 'invalid-zone' }) },
    { caseName: 'deck系だがcard.empty=true', payload: JSON.stringify({ sectionType: 'main', card: { cardId: '1', ciid: '2', empty: true } }) },
  ])(
    '[covers:practice-slot.drop-ignored-for-other-data] $caseNameのdropでは何もemitしない',
    async ({ payload }) => {
      wrapper = mountSlot({ cards: [CARD_A], zone: 'hand' });

      await dispatchDrag(wrapper, 'drop', 50, 50, { getData: () => payload });

      expect(wrapper.emitted('card-drop')).toBeUndefined();
      expect(wrapper.emitted('deck-card-drop')).toBeUndefined();
    },
  );
});
