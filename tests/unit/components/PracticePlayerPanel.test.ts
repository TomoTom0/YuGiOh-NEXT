/**
 * components/practice/PracticePlayerPanel のユニットテスト
 *
 * tests/design/practice-player-panel/conditions.toml（TASK-568 × TASK-331 Tier C第19号）の
 * 7条件をカバーする。unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - PracticePlayerPanelを直接mount + pinia実物（DeckMetadata.test.tsと同一手法）
 * - practice/deck-editの両storeは実物。resetPracticeはspyで呼び出し引数を観測し、
 *   表示はstoreの公開状態をseedして検証する（store本体の挙動は各storeの条件書が保証）
 * - 観測対象は描画結果（デッキ名・プレビュー・disabled）とemit・store呼び出し引数。
 *   vm内部computedは直接参照しない
 * - load-deck-p2はTASK-550の判断待ち論点のため本テストでは扱わない（条件書excluded参照）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import PracticePlayerPanel from '@/components/practice/PracticePlayerPanel.vue';
import { usePracticeStore } from '@/stores/practice';
import { useDeckEditStore } from '@/stores/deck-edit';
import { isHTMLElement } from '@/utils/type-guards';

const THUMB_P1 = 'https://example.test/thumb-p1.png';
const THUMB_P2 = 'https://example.test/thumb-p2.png';

type PracticeStore = ReturnType<typeof usePracticeStore>;
type DeckEditStore = ReturnType<typeof useDeckEditStore>;

describe('components/practice/PracticePlayerPanel', () => {
  let wrapper: VueWrapper | undefined;
  let practiceStore: PracticeStore;
  let deckStore: DeckEditStore;

  function mountPanel(setup?: (p: PracticeStore, d: DeckEditStore) => void): VueWrapper {
    const pinia = createPinia();
    setActivePinia(pinia);
    practiceStore = usePracticeStore();
    deckStore = useDeckEditStore();
    setup?.(practiceStore, deckStore);
    return mount(PracticePlayerPanel, { global: { plugins: [pinia] } });
  }

  function section(name: 'p1' | 'p2') {
    return wrapper!.find(`.${name}-section`);
  }

  function buttonIn(name: 'p1' | 'p2', title: string) {
    return section(name).findAll('button').find((b) => b.attributes('title') === title);
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  // --- P1のデッキ名・プレビュー ---

  it.each([
    { name: 'My Deck', expected: 'My Deck' },
    { name: '', expected: '(No Name)' },
  ])(
    '[covers:practice-player-panel.p1-deck-name-display] deckInfo.name=$name のときP1デッキ名は$expected',
    ({ name, expected }) => {
      wrapper = mountPanel((_, d) => {
        d.deckInfo.name = name;
      });

      expect(section('p1').find('.deck-name').text()).toBe(expected);
    },
  );

  it('[covers:practice-player-panel.p1-preview-images] dnoのサムネイルがあればP1プレビュー画像を表示する', () => {
    wrapper = mountPanel((_, d) => {
      d.deckInfo.dno = 42;
      d.deckThumbnails.set(42, THUMB_P1);
    });

    const img = section('p1').find('img.deck-preview-card');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe(THUMB_P1);
    expect(section('p1').findAll('img.deck-preview-card')).toHaveLength(1);
    if (!isHTMLElement(img.element)) throw new Error('preview img is not an HTMLElement');
    expect(img.element.style.left).toBe('0px');
    expect(img.element.style.zIndex).toBe('1');
    expect(section('p1').find('.deck-preview-empty').exists()).toBe(false);
  });

  it.each([
    { caseName: 'サムネイル未登録', setup: (d: DeckEditStore) => { d.deckInfo.dno = 42; } },
    { caseName: 'dno=0', setup: (d: DeckEditStore) => { d.deckInfo.dno = 0; d.deckThumbnails.set(42, THUMB_P1); } },
  ])(
    '[covers:practice-player-panel.p1-preview-images] $caseNameではP1プレビューが空表示になる',
    ({ setup }) => {
      wrapper = mountPanel((_, d) => setup(d));

      expect(section('p1').find('img.deck-preview-card').exists()).toBe(false);
      expect(section('p1').find('.deck-preview-empty').exists()).toBe(true);
    },
  );

  // --- P1のボタン群 ---

  it('[covers:practice-player-panel.p1-action-buttons] P1の4ボタンがemitとresetPractice(0)を呼ぶ', async () => {
    wrapper = mountPanel();
    const resetPractice = vi.spyOn(practiceStore, 'resetPractice').mockImplementation(() => {});

    await buttonIn('p1', 'Open Deck')!.trigger('click');
    expect(wrapper.emitted('open-deck')).toEqual([[]]);

    await buttonIn('p1', 'Save Deck')!.trigger('click');
    expect(wrapper.emitted('save-deck')).toEqual([[0]]);

    await buttonIn('p1', 'Reset')!.trigger('click');
    expect(resetPractice).toHaveBeenCalledTimes(1);
    expect(resetPractice).toHaveBeenCalledWith(0);

    await buttonIn('p1', 'Hard Reset')!.trigger('click');
    expect(wrapper.emitted('hard-reset')).toEqual([[]]);
    expect(resetPractice).toHaveBeenCalledTimes(1);
  });

  // --- P2（未初期化） ---

  it('[covers:practice-player-panel.p2-uninitialized-state] 未初期化では(No Deck)表示で3ボタンがdisabled、Openはemitする', async () => {
    wrapper = mountPanel();

    expect(section('p2').find('.deck-name').text()).toBe('(No Deck)');
    expect(section('p2').find('.deck-preview-empty').exists()).toBe(true);
    for (const title of ['Save Deck', 'Reset', 'Hard Reset']) {
      expect(buttonIn('p2', title)?.attributes('disabled')).toBe('');
    }
    expect(buttonIn('p2', 'Open Deck')?.attributes('disabled')).toBeUndefined();

    await buttonIn('p2', 'Open Deck')!.trigger('click');
    expect(wrapper.emitted('open-deck-p2')).toEqual([[]]);
  });

  // --- P2（初期化済み）のデッキ名・プレビュー ---

  it('[covers:practice-player-panel.p2-deck-name-and-clear] P2デッキ名が表示され、クリアボタンでstore名が空になる', async () => {
    wrapper = mountPanel((p) => {
      p.initialized2 = true;
      p.p2DeckName = 'Rival Deck';
    });

    expect(section('p2').find('.deck-name').text()).toBe('Rival Deck');
    const clearBtn = section('p2').find('.clear-deck-name-btn');
    expect(clearBtn.exists()).toBe(true);

    await clearBtn.trigger('click');
    await nextTick();

    expect(practiceStore.p2DeckName).toBe('');
    expect(section('p2').find('.deck-name').text()).toBe('(No Name)');
    expect(section('p2').find('.clear-deck-name-btn').exists()).toBe(false);
  });

  it('[covers:practice-player-panel.p2-deck-name-and-clear] P2デッキ名が空では(No Name)表示でクリアボタンが無い', () => {
    wrapper = mountPanel((p) => {
      p.initialized2 = true;
      p.p2DeckName = '';
    });

    expect(section('p2').find('.deck-name').text()).toBe('(No Name)');
    expect(section('p2').find('.clear-deck-name-btn').exists()).toBe(false);
  });

  it('[covers:practice-player-panel.p2-preview-images] p2DeckDnoのサムネイルがあればP2プレビュー画像を表示する', () => {
    wrapper = mountPanel((p, d) => {
      p.initialized2 = true;
      p.p2DeckDno = 77;
      d.deckThumbnails.set(77, THUMB_P2);
    });

    const img = section('p2').find('img.deck-preview-card');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe(THUMB_P2);
    expect(section('p2').findAll('img.deck-preview-card')).toHaveLength(1);
  });

  it('[covers:practice-player-panel.p2-preview-images] p2DeckDnoのサムネイルが無ければP2プレビューが空表示になる', () => {
    wrapper = mountPanel((p) => {
      p.initialized2 = true;
      p.p2DeckDno = 77;
    });

    expect(section('p2').find('img.deck-preview-card').exists()).toBe(false);
    expect(section('p2').find('.deck-preview-empty').exists()).toBe(true);
  });

  // --- P2（初期化済み）のボタン群 ---

  it('[covers:practice-player-panel.p2-action-buttons] P2の4ボタンがemitとresetPractice(1)を呼ぶ（Hard ResetもresetPractice直呼び）', async () => {
    wrapper = mountPanel((p) => {
      p.initialized2 = true;
    });
    const resetPractice = vi.spyOn(practiceStore, 'resetPractice').mockImplementation(() => {});

    await buttonIn('p2', 'Open Deck')!.trigger('click');
    expect(wrapper.emitted('open-deck-p2')).toEqual([[]]);

    await buttonIn('p2', 'Save Deck')!.trigger('click');
    expect(wrapper.emitted('save-deck')).toEqual([[1]]);

    await buttonIn('p2', 'Reset')!.trigger('click');
    expect(resetPractice).toHaveBeenCalledTimes(1);
    expect(resetPractice).toHaveBeenCalledWith(1);

    await buttonIn('p2', 'Hard Reset')!.trigger('click');
    expect(resetPractice).toHaveBeenCalledTimes(2);
    expect(resetPractice).toHaveBeenNthCalledWith(2, 1);
    expect(wrapper.emitted('hard-reset')).toBeUndefined();
  });
});
