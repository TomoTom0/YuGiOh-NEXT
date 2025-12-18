/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LoadDialog from '../LoadDialog.vue';
import { useDeckEditStore } from '@/stores/deck-edit';
import * as deckCache from '@/utils/deck-cache';

// deck-cacheのモック（部分的なモック）
vi.mock('@/utils/deck-cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/deck-cache')>();
  return {
    ...actual,
    generateThumbnailsInBackground: vi.fn(),
  };
});

describe('LoadDialog.vue', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();

    // localStorageのモック
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    } as any;
  });

  // ============================================================
  // 1. 基本的なレンダリング
  // ============================================================
  describe('基本的なレンダリング', () => {
    it('isVisible=falseの場合は表示されない', () => {
      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.dialog-overlay').exists()).toBe(false);
    });

    it('isVisible=trueの場合は表示される', () => {
      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.dialog-overlay').exists()).toBe(true);
      expect(wrapper.find('.dialog-title').text()).toBe('Load Deck');
    });

    it('デッキリストが空の場合は「デッキがありません」と表示される', () => {
      const store = useDeckEditStore();
      store.deckList = [];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.no-decks').exists()).toBe(true);
      expect(wrapper.find('.no-decks p').text()).toBe('デッキがありません');
    });

    it('デッキリストがnullの場合も「デッキがありません」と表示される', () => {
      const store = useDeckEditStore();
      store.deckList = null as any;

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.no-decks').exists()).toBe(true);
    });
  });

  // ============================================================
  // 2. デッキリストの表示
  // ============================================================
  describe('デッキリストの表示', () => {
    it('デッキリストを正しく表示する', () => {
      const store = useDeckEditStore();
      store.deckList = [
        { dno: 1, name: 'Deck 1' },
        { dno: 2, name: 'Deck 2' },
        { dno: 3, name: 'Deck 3' },
      ];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      const deckCards = wrapper.findAll('.deck-card');
      expect(deckCards).toHaveLength(3);
    });

    it('デッキ名が表示される', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.deck-name-text').text()).toBe('Test Deck');
    });

    it('デッキ名がない場合は「(名称未設定)」と表示される', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.deck-name-text').text()).toBe('(名称未設定)');
    });

    it('dnoチップが表示される', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 123, name: 'Test Deck' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.dno-chip').text()).toBe('123');
    });

    it('カード枚数が表示される', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];
      store.cachedDeckInfos.set(1, {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        lastUpdated: Date.now(),
        hash: 'abc123',
        cardCount: { main: 40, extra: 15, side: 15 },
      });

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.deck-count').text()).toBe('[40/15/15]');
    });

    it('カード枚数がない場合は表示されない', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.deck-count').exists()).toBe(false);
    });

    it('現在のデッキはcurrent-deckクラスが付く', () => {
      const store = useDeckEditStore();
      store.deckList = [
        { dno: 1, name: 'Deck 1' },
        { dno: 2, name: 'Deck 2' },
      ];
      store.deckInfo.dno = 1;

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      const deckCards = wrapper.findAll('.deck-card');
      expect(deckCards[0].find('.deck-name').classes()).toContain('current-deck');
      expect(deckCards[1].find('.deck-name').classes()).not.toContain('current-deck');
    });
  });

  // ============================================================
  // 3. サムネイル表示
  // ============================================================
  describe('サムネイル表示', () => {
    it('サムネイルがある場合はimg要素が表示される', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];
      store.deckThumbnails.set(1, 'data:image/png;base64,mock');

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.thumbnail-image').exists()).toBe(true);
      expect(wrapper.find('.thumbnail-image').attributes('src')).toBe('data:image/png;base64,mock');
      expect(wrapper.find('.thumbnail-gradient').exists()).toBe(false);
    });

    it('サムネイルがない場合はグラデーション背景が表示される', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.thumbnail-gradient').exists()).toBe(true);
      expect(wrapper.find('.thumbnail-image').exists()).toBe(false);
    });
  });

  // ============================================================
  // 4. ページネーション
  // ============================================================
  describe('ページネーション', () => {
    it('デッキが24枚以下の場合はページネーションが表示されない', () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 24 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.pagination-controls').exists()).toBe(false);
    });

    it('デッキが25枚以上の場合はページネーションが表示される', () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 25 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.pagination-controls').exists()).toBe(true);
    });

    it('最初のページでは「前のページ」ボタンがdisabled', () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      const prevBtn = wrapper.findAll('.pagination-btn')[0];
      expect(prevBtn.attributes('disabled')).toBeDefined();
    });

    it('最後のページでは「次のページ」ボタンがdisabled', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 48 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      // 2ページ目に移動
      const nextBtn = wrapper.findAll('.pagination-btn')[1];
      await nextBtn.trigger('click');
      await flushPromises();

      expect(nextBtn.attributes('disabled')).toBeDefined();
    });

    it('「次のページ」ボタンでページが移動する', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.pagination-info').text()).toBe('1 / 3');

      const nextBtn = wrapper.findAll('.pagination-btn')[1];
      await nextBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.pagination-info').text()).toBe('2 / 3');
    });

    it('「前のページ」ボタンでページが移動する', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      // まず次のページへ移動
      const nextBtn = wrapper.findAll('.pagination-btn')[1];
      await nextBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.pagination-info').text()).toBe('2 / 3');

      // 前のページに戻る
      const prevBtn = wrapper.findAll('.pagination-btn')[0];
      await prevBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.pagination-info').text()).toBe('1 / 3');
    });

    it('ページ移動時にgenerateThumbnailsInBackgroundが呼ばれる', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      const nextBtn = wrapper.findAll('.pagination-btn')[1];
      await nextBtn.trigger('click');
      await flushPromises();

      expect(deckCache.generateThumbnailsInBackground).toHaveBeenCalled();
    });

    it('ページ移動時に正しいデッキが表示される', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      // 1ページ目: dno 1-24
      let deckCards = wrapper.findAll('.deck-card');
      expect(deckCards).toHaveLength(24);
      expect(deckCards[0].find('.dno-chip').text()).toBe('1');

      // 2ページ目に移動: dno 25-48
      const nextBtn = wrapper.findAll('.pagination-btn')[1];
      await nextBtn.trigger('click');
      await flushPromises();

      deckCards = wrapper.findAll('.deck-card');
      expect(deckCards).toHaveLength(24);
      expect(deckCards[0].find('.dno-chip').text()).toBe('25');
    });
  });

  // ============================================================
  // 5. デッキロード機能
  // ============================================================
  describe('デッキロード機能', () => {
    it('デッキカードをクリックするとloadDeckが呼ばれる', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];
      store.loadDeck = vi.fn().mockResolvedValue(undefined);

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      const deckCard = wrapper.find('.deck-card');
      await deckCard.trigger('click');
      await flushPromises();

      expect(store.loadDeck).toHaveBeenCalledWith(1);
    });

    it('デッキロード時にlocalStorageに保存される', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 123, name: 'Test Deck' }];
      store.loadDeck = vi.fn().mockResolvedValue(undefined);

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      const deckCard = wrapper.find('.deck-card');
      await deckCard.trigger('click');
      await flushPromises();

      expect(localStorage.setItem).toHaveBeenCalledWith('ygo_last_deck_dno', '123');
    });

    it('デッキロード時にダイアログが閉じる', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];
      store.loadDeck = vi.fn().mockResolvedValue(undefined);
      store.showLoadDialog = true;

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      const deckCard = wrapper.find('.deck-card');
      await deckCard.trigger('click');
      await flushPromises();

      expect(store.showLoadDialog).toBe(false);
    });

    it('デッキロードエラー時にconsole.errorが呼ばれる', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];
      store.loadDeck = vi.fn().mockRejectedValue(new Error('Load failed'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      const deckCard = wrapper.find('.deck-card');
      await deckCard.trigger('click');
      await flushPromises();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Load error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================
  // 6. ダイアログ閉じる
  // ============================================================
  describe('ダイアログ閉じる', () => {
    it('閉じるボタンをクリックするとcloseイベントが発火する', async () => {
      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      const closeBtn = wrapper.find('.close-btn');
      await closeBtn.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('オーバーレイをクリックするとcloseイベントが発火する', async () => {
      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      const overlay = wrapper.find('.dialog-overlay');
      await overlay.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('ダイアログコンテンツをクリックしてもcloseイベントが発火しない', async () => {
      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      const content = wrapper.find('.dialog-content');
      await content.trigger('click');

      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('ダイアログを閉じるとページがリセットされる', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      // 2ページ目に移動
      const nextBtn = wrapper.findAll('.pagination-btn')[1];
      await nextBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.pagination-info').text()).toBe('2 / 3');

      // ダイアログを閉じる
      const closeBtn = wrapper.find('.close-btn');
      await closeBtn.trigger('click');

      // 再度開く（propsを更新）
      await wrapper.setProps({ isVisible: false });
      await wrapper.setProps({ isVisible: true });

      // ページが1に戻っている
      expect(wrapper.find('.pagination-info').text()).toBe('1 / 3');
    });
  });

  // ============================================================
  // 7. デッキ名のフォントサイズ調整
  // ============================================================
  describe('デッキ名のフォントサイズ調整', () => {
    it('10文字以下: deck-name-lg', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '短い名前' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.deck-name').classes()).toContain('deck-name-lg');
    });

    it('11-15文字: deck-name-md', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '12345678901' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.deck-name').classes()).toContain('deck-name-md');
    });

    it('16-20文字: deck-name-sm', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '1234567890123456' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.deck-name').classes()).toContain('deck-name-sm');
    });

    it('21文字以上: deck-name-xs', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '123456789012345678901' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.deck-name').classes()).toContain('deck-name-xs');
    });
  });
});
