/**
 * components/practice/PracticeSharedEMZRow のユニットテスト
 *
 * tests/design/practice-shared-emz-row/conditions.toml（TASK-560 × TASK-331 Tier C第14号）の
 * 5条件をカバーする。unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - PracticeSharedEMZRowを直接mount + pinia実物（DeckMetadata.test.tsと同一手法）
 * - 子PracticeSlotはカスタムstub: 受け取ったpropsをdata属性へ描画し、ボタンで親がlistenする
 *   イベント（card-action/card-drop/deck-card-drop）を発火する。子の内部挙動はPracticeSlot
 *   自身の条件書（後続号）が保証
 * - 転送先composable（usePracticeActions/usePracticeDropHandler）はmodule mockで置き換え、
 *   呼び出し引数を観測する（composable本体は各条件書へ委譲）
 * - practice/settingsの実storeの公開状態は直接観測・操作する（DeckMetadataテストと同水準）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import PracticeSharedEMZRow from '@/components/practice/PracticeSharedEMZRow.vue';
import { usePracticeStore } from '@/stores/practice';
import { useSettingsStore } from '@/stores/settings';
import type { PracticeCard } from '@/stores/practice';

// ============================================================
// module mock（転送先composable）
// ============================================================

const actionMocks = vi.hoisted(() => ({
  executeAction: vi.fn(),
  handleCardDrop: vi.fn(),
  handleExternalCardDrop: vi.fn(),
}));

vi.mock('../../../src/composables/practice/usePracticeActions', () => ({
  usePracticeActions: () => ({ executeAction: actionMocks.executeAction }),
}));

vi.mock('../../../src/composables/practice/usePracticeDropHandler', () => ({
  usePracticeDropHandler: () => ({
    handleCardDrop: actionMocks.handleCardDrop,
    handleExternalCardDrop: actionMocks.handleExternalCardDrop,
  }),
}));

// ============================================================
// PracticeSlot カスタムstub
// ============================================================

const PracticeSlotStub = defineComponent({
  name: 'PracticeSlot',
  props: {
    cards: { type: Array, required: true },
    zone: { type: String, required: true },
    slotIndex: { type: Number, required: true },
    stackDirection: { type: String, required: true },
    cardWidth: { type: Number, required: true },
    cardHeight: { type: Number, required: true },
  },
  emits: ['card-action', 'card-drop', 'deck-card-drop'],
  template: `
    <div class="practice-slot-stub"
      :data-zone="zone"
      :data-slot-index="slotIndex"
      :data-stack-direction="stackDirection"
      :data-card-width="cardWidth"
      :data-card-height="cardHeight"
      :data-cards-count="cards.length"
      :data-first-card-id="cards.length > 0 ? cards[0].cardId : ''">
      <button class="emit-action" @click="$emit('card-action', 'flip', 'card-xyz')">action</button>
      <button class="emit-drop" @click="$emit('card-drop', 'card-xyz', 'hand', 3, { isRight: false, isTop: true })">drop</button>
      <button class="emit-deck-drop" @click="$emit('deck-card-drop', '12345', '12345-1', { isRight: true, isTop: false })">deck-drop</button>
    </div>
  `,
});

const CARD_FIXTURE: PracticeCard = {
  cardId: 'monster-a',
  ciid: 'monster-a-1',
  name: 'Monster A',
  lang: 'ja',
  imgs: [{ ciid: 'monster-a-1', imgHash: 'monster-a-hash' }],
  cardType: 'monster',
  empty: false,
  atk: 1800,
  def: 1200,
  levelType: 'level',
  levelValue: 4,
  attribute: 'light',
  race: 'warrior',
  types: ['effect'],
  isExtraDeck: true,
};

describe('components/practice/PracticeSharedEMZRow', () => {
  let wrapper: VueWrapper | undefined;

  function mountRow(): VueWrapper {
    const pinia = createPinia();
    setActivePinia(pinia);
    return mount(PracticeSharedEMZRow, {
      global: { plugins: [pinia], stubs: { PracticeSlot: PracticeSlotStub } },
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  // --- EMZスロットの描画・props束縛 ---

  it('[covers:practice-shared-emz-row.renders-two-emz-slots-bound-to-extra-monster-zones] EMZスロットを2件描画し各PracticeSlotへzone/slot-index/stack-direction/cardSizeとstoreのcardsを渡す', async () => {
    wrapper = mountRow();
    const practiceStore = usePracticeStore();

    const stubs = wrapper.findAllComponents(PracticeSlotStub);
    expect(stubs).toHaveLength(2);
    for (const [i, stub] of stubs.entries()) {
      expect(stub.props('zone')).toBe('extraMonster');
      expect(stub.props('slotIndex')).toBe(i);
      expect(stub.props('stackDirection')).toBe('right-up');
      expect(stub.props('cardWidth')).toBe(36);
      expect(stub.props('cardHeight')).toBe(53);
      expect(stub.props('cards')).toEqual([]);
    }

    // storeのextraMonster[1]へカードを置くと2件目のcardsへ反映される
    practiceStore.zones.extraMonster[1] = [CARD_FIXTURE];
    await nextTick();

    const after = wrapper.findAllComponents(PracticeSlotStub);
    expect(after[0]?.props('cards')).toEqual([]);
    expect(after[1]?.props('cards')).toEqual([CARD_FIXTURE]);
    expect(after[1]?.attributes('data-first-card-id')).toBe('monster-a');
  });

  // --- 根源要素のCSS変数 ---

  it('[covers:practice-shared-emz-row.root-style-vars-from-settings-card-size] 根源要素のCSS変数がsettingsのカードサイズに従い、設定変更で変わる', async () => {
    wrapper = mountRow();
    const settingsStore = useSettingsStore();
    const root = wrapper.element as HTMLElement;

    expect(root.style.getPropertyValue('--practice-card-width')).toBe('36px');
    expect(root.style.getPropertyValue('--practice-card-height')).toBe('53px');

    settingsStore.appSettings.practiceCardSize = 'medium';
    await nextTick();

    expect(root.style.getPropertyValue('--practice-card-width')).toBe('60px');
    expect(root.style.getPropertyValue('--practice-card-height')).toBe('88px');
  });

  // --- card-actionの転送 ---

  it('[covers:practice-shared-emz-row.card-action-forwarded-to-execute-action-with-field-zero] card-actionはexecuteAction(action, cardId, 0)へ転送される', async () => {
    wrapper = mountRow();

    await wrapper.findAllComponents(PracticeSlotStub)[0]!.find('.emit-action').trigger('click');

    expect(actionMocks.executeAction).toHaveBeenCalledTimes(1);
    expect(actionMocks.executeAction).toHaveBeenCalledWith('flip', 'card-xyz', 0);
  });

  // --- card-dropの転送 ---

  it('[covers:practice-shared-emz-row.card-drop-forwarded-with-emz-context] card-dropはEMZコンテキスト付きでhandleCardDropへ転送される（fromZone/fromSlotIndexは使わない）', async () => {
    wrapper = mountRow();

    await wrapper.findAllComponents(PracticeSlotStub)[1]!.find('.emit-drop').trigger('click');

    expect(actionMocks.handleCardDrop).toHaveBeenCalledTimes(1);
    expect(actionMocks.handleCardDrop).toHaveBeenCalledWith(
      'card-xyz',
      { targetZone: 'extraMonster', targetSlotIndex: 1, fieldIndex: 0 },
      { isRight: false, isTop: true },
    );
  });

  // --- deck-card-dropの転送 ---

  it('[covers:practice-shared-emz-row.deck-card-drop-forwarded-with-emz-context] deck-card-dropはEMZコンテキスト付きでhandleExternalCardDropへ転送される', async () => {
    wrapper = mountRow();

    await wrapper.findAllComponents(PracticeSlotStub)[0]!.find('.emit-deck-drop').trigger('click');

    expect(actionMocks.handleExternalCardDrop).toHaveBeenCalledTimes(1);
    expect(actionMocks.handleExternalCardDrop).toHaveBeenCalledWith(
      '12345',
      '12345-1',
      { targetZone: 'extraMonster', targetSlotIndex: 0, fieldIndex: 0 },
      { isRight: true, isTop: false },
    );
  });
});
