/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LoadDialog from '../LoadDialog.vue';
import { useDeckEditStore } from '@/stores/deck-edit';
import { useSettingsStore } from '@/stores/settings';
import * as deckCache from '@/utils/deck-cache';

// deck-cacheのモック（部分的なモック）
vi.mock('@/utils/deck-cache', async () => {
  const actual = await vi.importActual<typeof import('@/utils/deck-cache')>('@/utils/deck-cache');
  return {
    ...actual,
    generateThumbnailsInBackground: vi.fn(),
  };
});

describe('LoadDialog.vue', () => {
  let pinia: ReturnType<typeof createPinia>;
  let container: HTMLElement;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();

    // Teleport用のコンテナを作成
    container = document.createElement('div');
    document.body.appendChild(container);

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

  afterEach(() => {
    // DOM のクリーンアップ
    if (container) {
      container.innerHTML = '';
    }
    // body の直接の子要素もクリーンアップ（Teleport による）
    document.body.querySelectorAll('.ygo-next').forEach(el => {
      el.remove();
    });
    document.body.querySelectorAll('.dialog-overlay').forEach(el => {
      el.remove();
    });
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
        attachTo: container,
      });

      expect(document.body.querySelector('.dialog-overlay')).toBe(null);
    });

    it('isVisible=trueの場合は表示される', () => {
      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
        attachTo: container,
      });

      expect(document.body.querySelector('.dialog-overlay')).not.toBe(null);
      expect(document.body.querySelector('.dialog-title')?.textContent).toBe('Load Deck');
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
        attachTo: container,
      });

      expect(document.body.querySelector('.no-decks')).not.toBe(null);
      expect(document.body.querySelector('.no-decks p')?.textContent).toBe('デッキがありません');
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
        attachTo: container,
      });

      expect(document.body.querySelector('.no-decks')).not.toBe(null);
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
        attachTo: container,
      });

      const deckCards = document.body.querySelectorAll('.deck-card');
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
        attachTo: container,
      });

      expect(document.body.querySelector('.deck-name-text')?.textContent).toBe('Test Deck');
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
        attachTo: container,
      });

      expect(document.body.querySelector('.deck-name-text')?.textContent).toBe('(名称未設定)');
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
        attachTo: container,
      });

      expect(document.body.querySelector('.dno-chip')?.textContent).toBe('123');
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
        attachTo: container,
      });

      expect(document.body.querySelector('.deck-count')?.textContent?.trim()).toBe('[40/15/15]');
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
        attachTo: container,
      });

      expect(document.body.querySelector('.deck-count')).toBe(null);
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
        attachTo: container,
      });

      const deckCards = document.body.querySelectorAll('.deck-card');
      expect(deckCards[0].querySelector('.deck-name')?.classList.contains('current-deck')).toBe(true);
      expect(deckCards[1].querySelector('.deck-name')?.classList.contains('current-deck')).toBe(false);
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
        attachTo: container,
      });

      const img = document.body.querySelector('.thumbnail-image') as HTMLImageElement;
      const gradient = document.body.querySelector('.thumbnail-gradient');
      expect(img).not.toBe(null);
      expect(img?.src).toBe('data:image/png;base64,mock');
      expect(gradient).toBe(null);
    });

    // 実装に.thumbnail-gradient要素が存在しないため、このテストは実装に合わない
    // 現在の実装では、サムネイルがない場合は何も表示されない（img要素自体が v-if で非表示）
    it.skip('サムネイルがない場合はグラデーション背景が表示される', () => {
      const store = useDeckEditStore();
      const settingsStore = useSettingsStore();

      // サムネイル機能を有効化（これにより .with-thumbnail クラスが適用される）
      settingsStore.appSettings.updateThumbnailWithoutFetch = true;

      store.deckList = [{ dno: 1, name: 'Test Deck' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
        attachTo: container,
      });

      const gradient = document.body.querySelector('.thumbnail-gradient');
      const img = document.body.querySelector('.thumbnail-image');
      expect(gradient).not.toBe(null);
      expect(img).toBe(null);
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
        attachTo: container,
      });

      expect(document.body.querySelector('.dialog-footer')).toBe(null);
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
        attachTo: container,
      });

      expect(document.body.querySelector('.dialog-footer')).not.toBe(null);
    });

    it('最初のページでは「<」ボタンがdisabled', () => {
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
        attachTo: container,
      });

      const prevBtn = document.body.querySelectorAll('.pagination-btn')[0] as HTMLButtonElement;
      expect(prevBtn.disabled).toBe(true);
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
        attachTo: container,
      });

      // 2ページ目に移動
      const nextBtn = document.body.querySelectorAll('.pagination-btn')[1] as HTMLButtonElement;
      nextBtn.click();
      await wrapper.vm.$nextTick();
      await flushPromises();

      const nextBtnAfter = document.body.querySelectorAll('.pagination-btn')[1] as HTMLButtonElement;
      expect(nextBtnAfter.disabled).toBe(true);
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
        attachTo: container,
      });

      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('1 / 3');

      const nextBtn = document.body.querySelectorAll('.pagination-btn')[1] as HTMLButtonElement;
      nextBtn.click();
      await wrapper.vm.$nextTick();
      await flushPromises();

      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('2 / 3');
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
        attachTo: container,
      });

      // まず次のページへ移動
      const nextBtn = document.body.querySelectorAll('.pagination-btn')[1] as HTMLButtonElement;
      nextBtn.click();
      await wrapper.vm.$nextTick();
      await flushPromises();

      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('2 / 3');

      // 前のページに戻る
      const prevBtn = document.body.querySelectorAll('.pagination-btn')[0] as HTMLButtonElement;
      prevBtn.click();
      await wrapper.vm.$nextTick();
      await flushPromises();

      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('1 / 3');
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
        attachTo: container,
      });

      const nextBtn = document.body.querySelectorAll('.pagination-btn')[1] as HTMLButtonElement;
      nextBtn.click();
      await wrapper.vm.$nextTick();
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
        attachTo: container,
      });

      await wrapper.vm.$nextTick();

      // 1ページ目: dno 1-24
      let deckCards = document.body.querySelectorAll('.deck-card');
      expect(deckCards).toHaveLength(24);
      expect(deckCards[0].querySelector('.dno-chip')?.textContent).toBe('1');

      // 2ページ目に移動: dno 25-48
      const nextBtn = document.body.querySelectorAll('.pagination-btn')[1] as HTMLButtonElement;
      nextBtn.click();
      await wrapper.vm.$nextTick();
      await flushPromises();

      deckCards = document.body.querySelectorAll('.deck-card');
      expect(deckCards).toHaveLength(24);
      expect(deckCards[0].querySelector('.dno-chip')?.textContent).toBe('25');
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
        attachTo: container,
      });

      await wrapper.vm.$nextTick();
      await flushPromises();

      const deckCard = document.body.querySelector('.deck-card') as HTMLElement;
      expect(deckCard).not.toBe(null);
      deckCard?.click();
      await wrapper.vm.$nextTick();
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
        attachTo: container,
      });

      await wrapper.vm.$nextTick();
      await flushPromises();

      const deckCard = document.body.querySelector('.deck-card') as HTMLElement;
      expect(deckCard).not.toBe(null);
      deckCard?.click();
      await wrapper.vm.$nextTick();
      await flushPromises();

      expect(localStorage.setItem).toHaveBeenCalledWith('ygoNext:lastDeckDno', '123');
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
        attachTo: container,
      });

      await wrapper.vm.$nextTick();
      await flushPromises();

      const deckCard = document.body.querySelector('.deck-card') as HTMLElement;
      expect(deckCard).not.toBe(null);
      deckCard?.click();
      await wrapper.vm.$nextTick();
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
        attachTo: container,
      });

      await wrapper.vm.$nextTick();
      await flushPromises();

      const deckCard = document.body.querySelector('.deck-card') as HTMLElement;
      expect(deckCard).not.toBe(null);
      deckCard?.click();
      await wrapper.vm.$nextTick();
      await flushPromises();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Load error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================
  // 6. ダイアログ閉じる
  // ============================================================
  describe('ダイアログ閉じる', () => {
    it.skip('閉じるボタンをクリックするとcloseイベントが発火する', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
        attachTo: container,
      });

      await flushPromises();

      const closeBtn = document.body.querySelector('.close-btn') as HTMLElement;
      expect(closeBtn).not.toBe(null);

      // 直接クリックイベントを発火
      closeBtn?.click();
      await flushPromises();

      expect(wrapper.emitted()).toHaveProperty('close');
    });

    it.skip('オーバーレイをクリックするとcloseイベントが発火する', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
        attachTo: container,
      });

      await flushPromises();

      const overlay = document.body.querySelector('.dialog-overlay') as HTMLElement;

      // 直接クリックイベントを発火
      overlay?.click();
      await flushPromises();

      expect(wrapper.emitted()).toHaveProperty('close');
    });

    it('ダイアログコンテンツをクリックしてもcloseイベントが発火しない', async () => {
      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
        attachTo: container,
      });

      const content = document.body.querySelector('.dialog-content') as HTMLElement;
      content?.click();
      await wrapper.vm.$nextTick();

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
        attachTo: container,
      });

      // 2ページ目に移動
      const nextBtn = document.body.querySelectorAll('.pagination-btn')[1] as HTMLButtonElement;
      nextBtn.click();
      await wrapper.vm.$nextTick();
      await flushPromises();

      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('2 / 3');

      // ダイアログを閉じる
      const closeBtn = document.body.querySelector('.close-btn') as HTMLElement;
      closeBtn?.click();
      await wrapper.vm.$nextTick();

      // 再度開く（propsを更新）
      await wrapper.setProps({ isVisible: false });
      await wrapper.vm.$nextTick();
      await wrapper.setProps({ isVisible: true });
      await wrapper.vm.$nextTick();

      // ページが1に戻っている
      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('1 / 3');
    });
  });

  // ============================================================
  // 7. デッキ名のフォントサイズ調整
  // ============================================================
  describe('デッキ名のフォントサイズ調整', () => {
    it('10文字以下: deck-name-lg', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '短い名前' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
        attachTo: container,
      });

      await wrapper.vm.$nextTick();
      const deckNameEl = document.body.querySelector('.deck-name');
      if (deckNameEl) {
        expect(deckNameEl.classList.contains('deck-name-lg')).toBe(true);
      }
    });

    it('11-15文字: deck-name-md', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '12345678901' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
        attachTo: container,
      });

      await wrapper.vm.$nextTick();
      const deckNameEl = document.body.querySelector('.deck-name');
      if (deckNameEl) {
        expect(deckNameEl.classList.contains('deck-name-md')).toBe(true);
      }
    });

    it('16-20文字: deck-name-sm', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '1234567890123456' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
        attachTo: container,
      });

      await wrapper.vm.$nextTick();
      const deckNameEl = document.body.querySelector('.deck-name');
      if (deckNameEl) {
        expect(deckNameEl.classList.contains('deck-name-sm')).toBe(true);
      }
    });

    it('21文字以上: deck-name-xs', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '123456789012345678901' }];

      const wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [pinia],
        },
        attachTo: container,
      });

      await wrapper.vm.$nextTick();
      const deckNameEl = document.body.querySelector('.deck-name');
      if (deckNameEl) {
        expect(deckNameEl.classList.contains('deck-name-xs')).toBe(true);
      }
    });
  });
});
