/**
 * components/practice/PracticeHandArea のユニットテスト
 *
 * tests/design/practice-hand-area/conditions.toml（TASK-570 × TASK-331 Tier C第21号）の
 * 12条件をカバーする。unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - PracticeHandAreaを直接mount + pinia実物（settings store用）
 * - 子DeckCardはカスタムstub: 受け取ったpropsをdata属性へ描画し、ボタンで親がlistenする
 *   イベントを発火する。子の内部挙動はDeckCard自身の条件書が保証
 * - ドラッグ系イベントは実要素へのdispatchEventで発火する（第20号practice-slotと同一手法:
 *   happy-domのDragEvent=Eventエイリアス前提、dataTransferはdefinePropertyで付与、
 *   矩形はgetBoundingClientRect差し替えで既知値にする）
 * - 観測対象は描画結果（レイアウト・props・gap・クラス）とemit。vm内部は参照しない
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import PracticeHandArea from '@/components/practice/PracticeHandArea.vue';
import type { PracticeCard } from '@/stores/practice';
import { isHTMLElement } from '@/utils/type-guards';

// ============================================================
// DeckCard カスタムstub
// ============================================================

const stubDragEvent = { type: 'stub-dragstart' };

const DeckCardStub = defineComponent({
  name: 'DeckCard',
  props: {
    card: { type: Object, required: true },
    sectionType: { type: String, required: true },
    uuid: { type: String, required: true },
    zone: { type: String, required: true },
    showFaceIndicator: { type: Boolean, required: true },
  },
  emits: ['practice-action', 'practice-dragstart', 'practice-dragend'],
  template: `
    <div class="deck-card-stub"
      :data-card-id="card.cardId"
      :data-uuid="uuid"
      :data-zone="zone"
      :data-show-face-indicator="showFaceIndicator">
      <button class="emit-practice-action" @click.stop="$emit('practice-action', 'flip', uuid)">pa</button>
      <button class="emit-practice-dragstart" @click.stop="$emit('practice-dragstart', stubDragEvent, uuid, { x: 1, y: 2 })">pd</button>
      <button class="emit-practice-dragend" @click.stop="$emit('practice-dragend')">pe</button>
    </div>
  `,
  setup() {
    return { stubDragEvent };
  },
});

// ============================================================
// fixture / helpers
// ============================================================

function htmlElement(el: Element | undefined): HTMLElement {
  if (!isHTMLElement(el)) throw new Error('element is not an HTMLElement');
  return el;
}

function makeCard(id: string, withInstanceId = true): PracticeCard {
  return {
    cardId: id,
    ciid: `${id}-ciid`,
    name: id,
    lang: 'ja',
    imgs: [],
    cardType: 'monster',
    empty: false,
    ...(withInstanceId ? { instanceId: `inst-${id}` } : {}),
  };
}

interface MountOptions {
  handCards: PracticeCard[];
  tempCards: PracticeCard[];
  reversed?: boolean;
  twoDeckMode?: boolean;
  cardWidth?: number;
  cardHeight?: number;
}

function mountArea(opts: MountOptions): VueWrapper {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(PracticeHandArea, {
    props: {
      handCards: opts.handCards,
      tempCards: opts.tempCards,
      ...(opts.reversed !== undefined ? { reversed: opts.reversed } : {}),
      ...(opts.twoDeckMode !== undefined ? { twoDeckMode: opts.twoDeckMode } : {}),
      ...(opts.cardWidth !== undefined ? { cardWidth: opts.cardWidth } : {}),
      ...(opts.cardHeight !== undefined ? { cardHeight: opts.cardHeight } : {}),
    },
    global: { plugins: [pinia], stubs: { DeckCard: DeckCardStub } },
  });
}

function stubRect(el: HTMLElement): void {
  el.getBoundingClientRect = (): DOMRect => ({
    left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
  });
}

async function dispatchDrag(
  el: HTMLElement,
  type: string,
  clientX = 50,
  clientY = 50,
  dataTransfer?: { getData: (type: string) => string },
): Promise<void> {
  const event = new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true });
  if (dataTransfer) {
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  }
  el.dispatchEvent(event);
  await nextTick();
}

function stubsByZone(wrapper: VueWrapper, zone: string) {
  return wrapper.findAllComponents(DeckCardStub).filter((s) => s.props('zone') === zone);
}

const PRACTICE_PAYLOAD = JSON.stringify({ cardId: 'inst-x', zone: 'gy', slotIndex: 3 });
const DECK_PAYLOAD = JSON.stringify({ sectionType: 'main', card: { cardId: '123', ciid: '456', empty: false } });

describe('components/practice/PracticeHandArea', () => {
  let wrapper: VueWrapper | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  // --- レイアウトモード ---

  it('[covers:practice-hand-area.layout-two-deck-mode] 2Pモードではtwo-deck-modeクラスが付きTempがHandより前に並ぶ', () => {
    wrapper = mountArea({ handCards: [makeCard('a')], tempCards: [], twoDeckMode: true });

    expect(wrapper.classes()).toContain('two-deck-mode');
    expect(wrapper.find('.temp-section-inline').exists()).toBe(true);
    expect(wrapper.find('.hand-section-inline').exists()).toBe(true);
    expect(wrapper.findAll('.area-label').map((l) => l.text())).toEqual(['Temp', 'Hand']);
  });

  it.each([
    { reversed: false, labels: ['Hand', 'Temp'] },
    { reversed: true, labels: ['Temp', 'Hand'] },
  ])(
    '[covers:practice-hand-area.layout-normal-mode-order] 通常モード reversed=$reversed ではラベルが$labelsの順になる',
    ({ reversed, labels }) => {
      wrapper = mountArea({ handCards: [makeCard('a')], tempCards: [], reversed });

      expect(wrapper.classes()).not.toContain('two-deck-mode');
      expect(wrapper.findAll('.area-label').map((l) => l.text())).toEqual(labels);
    },
  );

  // --- カード描画 ---

  it('[covers:practice-hand-area.hand-cards-rendered-with-props] 手札カードがDeckCardへprops付きで描画される', () => {
    const withId = makeCard('a');
    const withoutId = makeCard('b', false);
    wrapper = mountArea({ handCards: [withId, withoutId], tempCards: [], cardWidth: 60, cardHeight: 88 });

    const stubs = stubsByZone(wrapper, 'hand');
    expect(stubs).toHaveLength(2);
    expect(stubs[0]?.props('card')).toEqual(withId);
    expect(stubs[0]?.props('sectionType')).toBe('practice');
    expect(stubs[0]?.props('uuid')).toBe('inst-a');
    expect(stubs[0]?.props('showFaceIndicator')).toBe(false);
    expect(htmlElement(stubs[0]?.element).style.width).toBe('60px');
    expect(htmlElement(stubs[0]?.element).style.height).toBe('88px');
    expect(stubs[1]?.props('uuid')).toBe('');
  });

  it('[covers:practice-hand-area.temp-cards-rendered-with-props] Tempカードがある場合のみzone=tempで描画される', () => {
    wrapper = mountArea({ handCards: [], tempCards: [makeCard('t')] });

    const stubs = stubsByZone(wrapper, 'temp');
    expect(stubs).toHaveLength(1);
    expect(stubs[0]?.props('sectionType')).toBe('practice');
    expect(wrapper.find('.temp-cards').exists()).toBe(true);
  });

  it('[covers:practice-hand-area.temp-cards-rendered-with-props] Tempカードが0件ではtemp-cardsが描画されない', () => {
    wrapper = mountArea({ handCards: [makeCard('a')], tempCards: [] });

    expect(stubsByZone(wrapper, 'temp')).toHaveLength(0);
    expect(wrapper.find('.temp-cards').exists()).toBe(false);
  });

  it.each([
    { caseName: '両方指定', opts: { cardWidth: 60, cardHeight: 88 }, width: '60px', height: '88px' },
    { caseName: '幅のみ指定', opts: { cardWidth: 60 }, width: '36px', height: '53px' },
    { caseName: '両方未指定', opts: {}, width: '36px', height: '53px' },
  ])(
    '[covers:practice-hand-area.card-size-fallback-to-settings] $caseNameではカードサイズが$width x $heightになる',
    ({ opts, width, height }) => {
      wrapper = mountArea({ handCards: [makeCard('a')], tempCards: [], ...opts });

      const el = htmlElement(stubsByZone(wrapper, 'hand')[0]?.element);
      expect(el.style.width).toBe(width);
      expect(el.style.height).toBe(height);
    },
  );

  it.each([
    { count: 1, gap: '2px' },
    { count: 8, gap: '2px' },
    { count: 10, gap: '-4px' },
  ])(
    '[covers:practice-hand-area.hand-gap-computation] 幅36pxで手札$count件のときgapが$gapになる',
    ({ count, gap }) => {
      const cards = Array.from({ length: count }, (_, i) => makeCard(`c${i}`));
      wrapper = mountArea({ handCards: cards, tempCards: [], cardWidth: 36, cardHeight: 53 });

      expect(htmlElement(wrapper.find('.hand-cards').element).style.gap).toBe(gap);
    },
  );

  // --- drag-over表示 ---

  it('[covers:practice-hand-area.drag-over-state-classes] dragoverで手札側→Temp側へ drag-over が切り替わり、dragleaveで両方外れる', async () => {
    wrapper = mountArea({ handCards: [makeCard('a')], tempCards: [makeCard('t')] });
    const root = htmlElement(wrapper.element);

    await dispatchDrag(root, 'dragover');
    expect(wrapper.find('.hand-cards').classes()).toContain('drag-over');
    expect(wrapper.find('.temp-area').classes()).not.toContain('temp-drag-over');

    await dispatchDrag(htmlElement(wrapper.find('.temp-section').element), 'dragover');
    expect(wrapper.find('.temp-area').classes()).toContain('temp-drag-over');
    expect(wrapper.find('.hand-cards').classes()).not.toContain('drag-over');

    await dispatchDrag(root, 'dragleave');
    expect(wrapper.find('.hand-cards').classes()).not.toContain('drag-over');
    expect(wrapper.find('.temp-area').classes()).not.toContain('temp-drag-over');
  });

  // --- 手札カード上のドロップ ---

  it.each([
    { clientX: 75, insertIndex: 2 },
    { clientX: 25, insertIndex: 1 },
  ])(
    '[covers:practice-hand-area.card-drop-on-hand-card-with-insert-index] index=1のカードへx=$clientXでdropするとinsertIndex=$insertIndexになる',
    async ({ clientX, insertIndex }) => {
      wrapper = mountArea({ handCards: [makeCard('a'), makeCard('b'), makeCard('c')], tempCards: [] });
      const target = htmlElement(stubsByZone(wrapper, 'hand')[1]?.element);
      stubRect(target);

      await dispatchDrag(target, 'drop', clientX, 50, { getData: () => PRACTICE_PAYLOAD });

      expect(wrapper.emitted('card-drop')).toEqual([
        ['inst-x', 'gy', 3, { isRight: true, isTop: true, insertIndex }],
      ]);
    },
  );

  it('[covers:practice-hand-area.deck-card-drop-on-hand-card] 手札カード上のdeck系dropでdeck-card-dropがemitされる', async () => {
    wrapper = mountArea({ handCards: [makeCard('a'), makeCard('b')], tempCards: [] });
    const target = htmlElement(stubsByZone(wrapper, 'hand')[0]?.element);
    stubRect(target);

    await dispatchDrag(target, 'drop', 75, 50, { getData: () => DECK_PAYLOAD });

    expect(wrapper.emitted('deck-card-drop')).toEqual([
      ['123', '456', { isRight: true, isTop: true, insertIndex: 1 }],
    ]);
  });

  // --- 領域へのドロップ ---

  it('[covers:practice-hand-area.hand-area-drop-emits] 手札領域へのpractice系dropでcard-dropが固定dropPosでemitされdrag-overが外れる', async () => {
    wrapper = mountArea({ handCards: [makeCard('a')], tempCards: [] });
    const root = htmlElement(wrapper.element);

    await dispatchDrag(root, 'dragover');
    expect(wrapper.find('.hand-cards').classes()).toContain('drag-over');

    await dispatchDrag(root, 'drop', 50, 50, { getData: () => PRACTICE_PAYLOAD });

    expect(wrapper.emitted('card-drop')).toEqual([
      ['inst-x', 'gy', 3, { isRight: true, isTop: true }],
    ]);
    expect(wrapper.find('.hand-cards').classes()).not.toContain('drag-over');
  });

  it('[covers:practice-hand-area.hand-area-drop-emits] 手札領域へのdeck系dropでdeck-card-dropがemitされる', async () => {
    wrapper = mountArea({ handCards: [makeCard('a')], tempCards: [] });

    await dispatchDrag(htmlElement(wrapper.element), 'drop', 50, 50, { getData: () => DECK_PAYLOAD });

    expect(wrapper.emitted('deck-card-drop')).toEqual([
      ['123', '456', { isRight: true, isTop: true }],
    ]);
  });

  it('[covers:practice-hand-area.hand-area-drop-emits] 手札領域への無効データのdropでは何もemitしない', async () => {
    wrapper = mountArea({ handCards: [makeCard('a')], tempCards: [] });

    await dispatchDrag(htmlElement(wrapper.element), 'drop', 50, 50, { getData: () => '' });

    expect(wrapper.emitted('card-drop')).toBeUndefined();
    expect(wrapper.emitted('deck-card-drop')).toBeUndefined();
  });

  it('[covers:practice-hand-area.temp-area-drop-emits] Temp領域へのpractice系dropでtemp-card-dropがemitされtemp-drag-overが外れる', async () => {
    wrapper = mountArea({ handCards: [makeCard('a')], tempCards: [makeCard('t')] });
    const tempSection = htmlElement(wrapper.find('.temp-section').element);

    await dispatchDrag(tempSection, 'dragover');
    expect(wrapper.find('.temp-area').classes()).toContain('temp-drag-over');

    await dispatchDrag(tempSection, 'drop', 50, 50, { getData: () => PRACTICE_PAYLOAD });

    expect(wrapper.emitted('temp-card-drop')).toEqual([
      ['inst-x', 'gy', 3, { isRight: true, isTop: true }],
    ]);
    expect(wrapper.find('.temp-area').classes()).not.toContain('temp-drag-over');
  });

  it('[covers:practice-hand-area.temp-area-drop-emits] Temp領域へのdeck系dropでtemp-deck-card-dropがemitされる', async () => {
    wrapper = mountArea({ handCards: [makeCard('a')], tempCards: [makeCard('t')] });

    await dispatchDrag(htmlElement(wrapper.find('.temp-section').element), 'drop', 50, 50, { getData: () => DECK_PAYLOAD });

    expect(wrapper.emitted('temp-deck-card-drop')).toEqual([
      ['123', '456', { isRight: true, isTop: true }],
    ]);
  });

  // --- カードイベント転送 ---

  it('[covers:practice-hand-area.card-events-forwarded] 手札カードの4イベントが変換されて再emitされる', async () => {
    const card = makeCard('a');
    wrapper = mountArea({ handCards: [card], tempCards: [] });
    const stub = stubsByZone(wrapper, 'hand')[0]!;

    await stub.find('.deck-card-stub').trigger('click');
    expect(wrapper.emitted('card-click')).toEqual([[card]]);

    await stub.find('.emit-practice-action').trigger('click');
    expect(wrapper.emitted('card-action')).toEqual([['flip', 'inst-a']]);

    await stub.find('.emit-practice-dragstart').trigger('click');
    const dragstart = wrapper.emitted('card-dragstart');
    expect(dragstart).toHaveLength(1);
    expect(dragstart![0]![0]).toEqual(card);
    expect(dragstart![0]![1]).toBe(stubDragEvent);

    await stub.find('.emit-practice-dragend').trigger('click');
    expect(wrapper.emitted('card-dragend')).toEqual([[]]);
  });

  it('[covers:practice-hand-area.card-events-forwarded] Tempカードのpractice-dragstartもcard-dragstartへ(card, event)で変換される', async () => {
    const card = makeCard('t');
    wrapper = mountArea({ handCards: [], tempCards: [card] });
    const stub = stubsByZone(wrapper, 'temp')[0]!;

    await stub.find('.emit-practice-dragstart').trigger('click');

    const dragstart = wrapper.emitted('card-dragstart');
    expect(dragstart).toHaveLength(1);
    expect(dragstart![0]![0]).toEqual(card);
    expect(dragstart![0]![1]).toBe(stubDragEvent);
  });
});
