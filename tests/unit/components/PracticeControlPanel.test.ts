/**
 * components/practice/PracticeControlPanel のユニットテスト
 *
 * tests/design/practice-control-panel/conditions.toml（TASK-564 × TASK-331 Tier C第17号）の
 * 7条件をカバーする。unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - PracticeControlPanelを直接mount + pinia実物（DeckMetadata.test.tsと同一手法）
 * - practice storeは実物。アクションはspy（呼び出し引数のみ観測し実動作はさせない）、
 *   件数表示・selected・twoDeckModeはstoreの公開状態をseedして検証する
 *   （store本体の挙動はpractice条件書が保証）
 * - 観測対象は描画結果とstoreアクションの呼び出し引数・emit。vm内部computedは参照しない
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PracticeControlPanel from '@/components/practice/PracticeControlPanel.vue';
import { usePracticeStore } from '@/stores/practice';
import type { PracticeCard } from '@/stores/practice';

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

function cards(n: number, prefix: string): PracticeCard[] {
  return Array.from({ length: n }, (_, i) => makeCard(`${prefix}-${i}`));
}

type PracticeStore = ReturnType<typeof usePracticeStore>;

describe('components/practice/PracticeControlPanel', () => {
  let wrapper: VueWrapper | undefined;
  let store: PracticeStore;

  function mountPanel(fieldIndex?: number): VueWrapper {
    const pinia = createPinia();
    setActivePinia(pinia);
    store = usePracticeStore();
    return mount(PracticeControlPanel, {
      props: fieldIndex !== undefined ? { fieldIndex } : {},
      global: { plugins: [pinia] },
    });
  }

  function actionButton(title: string) {
    return wrapper!.findAll('button.action-btn').find((b) => b.attributes('title') === title);
  }

  function zoneRow(label: string) {
    return wrapper!.findAll('.zone-count').find((r) => r.find('.zone-label').text() === label);
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  // --- アクションボタン ---

  it.each([0, 1])(
    '[covers:practice-control-panel.action-buttons-call-store-actions-with-field-index] fieldIndex=%s で4ボタンがstoreアクションへfieldIndexを渡す',
    async (fieldIndex) => {
      wrapper = mountPanel(fieldIndex);
      const draw = vi.spyOn(store, 'draw').mockImplementation(() => {});
      const drawMultiple = vi.spyOn(store, 'drawMultiple').mockImplementation(() => {});
      const shuffleHand = vi.spyOn(store, 'shuffleHand').mockImplementation(() => {});
      const shuffleExtra = vi.spyOn(store, 'shuffleExtra').mockImplementation(() => {});

      await actionButton('Draw 1')!.trigger('click');
      await actionButton('Draw 2')!.trigger('click');
      await actionButton('Shuffle Hand')!.trigger('click');
      await actionButton('Shuffle Extra')!.trigger('click');

      expect(draw).toHaveBeenCalledTimes(1);
      expect(draw).toHaveBeenCalledWith(fieldIndex);
      expect(drawMultiple).toHaveBeenCalledTimes(1);
      expect(drawMultiple).toHaveBeenCalledWith(2, fieldIndex);
      expect(shuffleHand).toHaveBeenCalledTimes(1);
      expect(shuffleHand).toHaveBeenCalledWith(fieldIndex);
      expect(shuffleExtra).toHaveBeenCalledTimes(1);
      expect(shuffleExtra).toHaveBeenCalledWith(fieldIndex);
    },
  );

  // --- 2Pモードボタン ---

  it('[covers:practice-control-panel.two-deck-button-only-for-field-zero] 2PボタンはfieldIndex=0でのみ表示される', () => {
    wrapper = mountPanel(0);
    expect(wrapper.find('.two-player-btn').exists()).toBe(true);

    wrapper.unmount();
    wrapper = mountPanel(1);
    expect(wrapper.find('.two-player-btn').exists()).toBe(false);
  });

  it('[covers:practice-control-panel.two-deck-button-reflects-two-deck-mode] 2PボタンのtitleとactiveがtwoDeckModeを反映する', async () => {
    wrapper = mountPanel(0);
    const { nextTick } = await import('vue');

    let btn = wrapper.find('.two-player-btn');
    expect(btn.attributes('title')).toBe('Open 2P mode');
    expect(btn.classes()).not.toContain('active');

    store.p2DeckDno = 12345;
    await nextTick();

    btn = wrapper.find('.two-player-btn');
    expect(btn.attributes('title')).toBe('Close 2P mode');
    expect(btn.classes()).toContain('active');
  });

  it('[covers:practice-control-panel.two-deck-button-click-emits-toggle] 2Pボタンのクリックがtoggle-two-deckをemitする', async () => {
    wrapper = mountPanel(0);

    await wrapper.find('.two-player-btn').trigger('click');

    expect(wrapper.emitted('toggle-two-deck')).toEqual([[]]);
  });

  // --- ゾーン件数表示 ---

  it('[covers:practice-control-panel.zone-counts-display-per-field] fieldIndex=0ではzonesの件数を表示する', () => {
    wrapper = mountPanel(0);
    store.zones.deck = cards(3, 'deck');
    store.zones.hand = cards(2, 'hand');
    store.zones.gy = cards(1, 'gy');
    store.zones.banish = cards(0, 'banish');
    store.zones.extra = cards(4, 'extra');
    store.zones.temp = cards(1, 'temp');
    store.zones.extraMonster = [[makeCard('em-0')], [makeCard('em-1'), makeCard('em-2')]];

    return wrapper.vm.$nextTick().then(() => {
      expect(zoneRow('Deck')!.find('.zone-value').text()).toBe('3');
      expect(zoneRow('Hand')!.find('.zone-value').text()).toBe('2');
      expect(zoneRow('GY')!.find('.zone-value').text()).toBe('1');
      expect(zoneRow('Banish')!.find('.zone-value').text()).toBe('0');
      expect(zoneRow('Extra')!.find('.zone-value').text()).toBe('4');
      expect(zoneRow('Temp')!.find('.zone-value').text()).toBe('1');
      expect(zoneRow('EM')!.find('.zone-value').text()).toBe('3');
    });
  });

  it('[covers:practice-control-panel.zone-counts-display-per-field] fieldIndex=1ではzones2の件数を表示する', async () => {
    wrapper = mountPanel(1);
    store.zones.deck = cards(3, 'deck');
    store.zones2.deck = cards(7, 'deck2');
    store.zones2.hand = cards(5, 'hand2');
    store.zones2.extraMonster = [[], []];

    await wrapper.vm.$nextTick();

    expect(zoneRow('Deck')!.find('.zone-value').text()).toBe('7');
    expect(zoneRow('Hand')!.find('.zone-value').text()).toBe('5');
    expect(zoneRow('EM')!.find('.zone-value').text()).toBe('0');
  });

  it('[covers:practice-control-panel.zone-row-selected-class] selectedZoneと一致する行にのみselectedクラスが付く', async () => {
    wrapper = mountPanel(0);
    store.selectedZone = 'gy';

    await wrapper.vm.$nextTick();

    const labels = ['Deck', 'Hand', 'GY', 'Banish', 'Extra', 'Temp', 'EM'];
    for (const label of labels) {
      expect(zoneRow(label)!.classes().includes('selected')).toBe(label === 'GY');
    }
  });

  it('[covers:practice-control-panel.zone-row-click-selects-zone] ゾーン行のクリックがselectZone(ゾーン名)で呼ばれる', async () => {
    wrapper = mountPanel(0);
    const selectZone = vi.spyOn(store, 'selectZone').mockImplementation(() => {});

    await zoneRow('GY')!.trigger('click');
    await zoneRow('Extra')!.trigger('click');

    expect(selectZone).toHaveBeenCalledTimes(2);
    expect(selectZone).toHaveBeenNthCalledWith(1, 'gy');
    expect(selectZone).toHaveBeenNthCalledWith(2, 'extra');
  });
});
