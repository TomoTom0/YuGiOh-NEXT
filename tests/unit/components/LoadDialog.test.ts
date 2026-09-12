/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import LoadDialog from '@/components/LoadDialog.vue';
import { useDeckEditStore } from '@/stores/deck-edit';
import { useSettingsStore } from '@/stores/settings';
import * as deckCache from '@/utils/deck-cache';
import { isHTMLElement, isHTMLButtonElement, isHTMLImageElement } from '@/utils/type-guards';

// deck-cacheのモック（部分的なモック）: generateThumbnailsInBackground のみ差し替え
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
  let mountedWrapper: ReturnType<typeof mountDialog> | undefined;

  // 全itで共通するmount boilerplateの集約（デフォルト isVisible: true）
  // errorHandler指定時はapp.config.errorHandlerとして適用する（rejectを伝播させるitで
  // Vue dev既定のlogError再throwによるunhandled rejectionを防ぐため）
  const mountDialog = (
    props?: { isVisible?: boolean },
    options?: { errorHandler?: (err: unknown) => void }
  ) => {
    mountedWrapper = mount(LoadDialog, {
      props: {
        isVisible: props?.isVisible ?? true,
      },
      global: {
        plugins: [pinia],
        ...(options?.errorHandler ? { config: { errorHandler: options.errorHandler } } : {}),
      },
      attachTo: container,
    });
    return mountedWrapper;
  };

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();

    // Teleport用のコンテナを作成
    container = document.createElement('div');
    document.body.appendChild(container);

    // localStorageのモック（Storage型を完全実装するためキャスト不要）
    const localStorageMock: Storage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      key: vi.fn(() => null),
    };
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    // DOM のクリーンアップ
    if (mountedWrapper) {
      mountedWrapper.unmount();
      mountedWrapper = undefined;
    }
    if (container) {
      container.remove();
    }
    // body の直接の子要素もクリーンアップ（Teleport による。unmountで消えない残留への保険）
    document.body.querySelectorAll('.ygo-next').forEach(el => {
      el.remove();
    });
    document.body.querySelectorAll('.base-dialog-overlay').forEach(el => {
      el.remove();
    });
    vi.unstubAllGlobals();
  });

  // ============================================================
  // 1. 基本的なレンダリング
  // ============================================================
  describe('基本的なレンダリング', () => {
    it('[covers:load-dialog.visibility-controlled-by-is-visible-prop] isVisible=falseの場合は表示されない', () => {
      mountDialog({ isVisible: false });

      expect(document.body.querySelector('.base-dialog-overlay')).toBe(null);
    });

    it('[covers:load-dialog.visibility-controlled-by-is-visible-prop] isVisible=trueの場合は表示される', () => {
      mountDialog();

      expect(document.body.querySelector('.base-dialog-overlay')).not.toBe(null);
      expect(document.body.querySelector('.dialog-title')?.textContent).toBe('Load Deck');
    });

    it('[covers:load-dialog.empty-deck-list-renders-no-decks] デッキリストが空の場合は「デッキがありません」と表示される', () => {
      const store = useDeckEditStore();
      store.deckList = [];

      mountDialog();

      expect(document.body.querySelector('.no-decks')).not.toBe(null);
      expect(document.body.querySelector('.no-decks p')?.textContent).toBe('デッキがありません');
    });
  });

  // ============================================================
  // 2. デッキリストの表示
  // ============================================================
  describe('デッキリストの表示', () => {
    it('[covers:load-dialog.deck-list-renders-card-name-and-dno] デッキリストを正しく表示する', () => {
      const store = useDeckEditStore();
      store.deckList = [
        { dno: 1, name: 'Deck 1' },
        { dno: 2, name: 'Deck 2' },
        { dno: 3, name: 'Deck 3' },
      ];

      mountDialog();

      const deckCards = document.body.querySelectorAll('.deck-card');
      expect(deckCards).toHaveLength(3);
    });

    it('[covers:load-dialog.deck-list-renders-card-name-and-dno] デッキ名が表示される', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];

      mountDialog();

      expect(document.body.querySelector('.deck-name-text')?.textContent).toBe('Test Deck');
    });

    it('[covers:load-dialog.unnamed-deck-falls-back-to-placeholder] デッキ名がない場合は「(名称未設定)」と表示される', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '' }];

      mountDialog();

      expect(document.body.querySelector('.deck-name-text')?.textContent).toBe('(名称未設定)');
    });

    it('[covers:load-dialog.deck-list-renders-card-name-and-dno] dnoチップが表示される', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 123, name: 'Test Deck' }];

      mountDialog();

      expect(document.body.querySelector('.dno-chip')?.textContent).toBe('123');
    });

    it('[covers:load-dialog.card-count-shown-when-cached] カード枚数が表示される', () => {
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

      mountDialog();

      expect(document.body.querySelector('.deck-count')?.textContent?.trim()).toBe('[40/15/15]');
    });

    it('[covers:load-dialog.card-count-shown-when-cached] カード枚数がない場合は表示されない', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];

      mountDialog();

      expect(document.body.querySelector('.deck-count')).toBe(null);
    });

    it('[covers:load-dialog.current-deck-class-marks-loaded-deck] 現在のデッキはcurrent-deckクラスが付く', () => {
      const store = useDeckEditStore();
      store.deckList = [
        { dno: 1, name: 'Deck 1' },
        { dno: 2, name: 'Deck 2' },
      ];
      store.deckInfo.dno = 1;

      mountDialog();

      const deckCards = document.body.querySelectorAll('.deck-card');
      expect(deckCards[0].querySelector('.deck-name')?.classList.contains('current-deck')).toBe(true);
      expect(deckCards[0].querySelector('.dno-chip')?.classList.contains('current-deck')).toBe(true);
      expect(deckCards[1].querySelector('.deck-name')?.classList.contains('current-deck')).toBe(false);
      expect(deckCards[1].querySelector('.dno-chip')?.classList.contains('current-deck')).toBe(false);
    });
  });

  // ============================================================
  // 3. サムネイル表示
  // ============================================================
  describe('サムネイル表示', () => {
    it('[covers:load-dialog.thumbnail-src-depends-on-update-thumbnail-without-fetch] サムネイルがある場合はimg要素が表示される', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];
      store.deckThumbnails.set(1, 'data:image/png;base64,mock');

      mountDialog();

      const img = document.body.querySelector('.thumbnail-image');
      if (!isHTMLImageElement(img)) throw new Error('thumbnail image not found');
      expect(img.src).toBe('data:image/png;base64,mock');
    });

    it('[covers:load-dialog.thumbnail-src-depends-on-update-thumbnail-without-fetch] updateThumbnailWithoutFetch=falseの場合はサムネイルがあってもimgが表示されない', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];
      store.deckThumbnails.set(1, 'data:image/png;base64,mock');

      const settingsStore = useSettingsStore();
      settingsStore.appSettings.updateThumbnailWithoutFetch = false;

      mountDialog();

      expect(document.body.querySelector('.thumbnail-image')).toBe(null);
      const deckCard = document.body.querySelector('.deck-card');
      expect(deckCard?.classList.contains('with-thumbnail')).toBe(false);
    });

    it('[covers:load-dialog.empty-string-thumbnail-treated-as-absent] 空文字列のサムネイルは未設定扱いでimg非表示', () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];
      // 設定は既定trueのまま
      store.deckThumbnails.set(1, '');

      mountDialog();

      // .with-thumbnail は設定値のみで付与されるため付いたままであり、その不在は期待しない
      expect(document.body.querySelector('.thumbnail-image')).toBe(null);
    });
  });

  // ============================================================
  // 4. ページネーション
  // ============================================================
  describe('ページネーション', () => {
    it('[covers:load-dialog.total-pages-computed-by-ceiling-24] デッキが24枚以下の場合はページネーションが表示されない', () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 24 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      mountDialog();

      expect(document.body.querySelector('.dialog-footer')).toBe(null);
    });

    it('[covers:load-dialog.total-pages-computed-by-ceiling-24] デッキが25枚以上の場合はページネーションが表示される', () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 25 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      mountDialog();

      expect(document.body.querySelector('.dialog-footer')).not.toBe(null);
    });

    it('[covers:load-dialog.prev-page-guarded-at-first-page] 最初のページでは「<」ボタンがdisabled', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      mountDialog();

      const prevBtn = document.body.querySelectorAll('.pagination-btn')[0];
      if (!isHTMLButtonElement(prevBtn)) throw new Error('prev pagination button not found');
      expect(prevBtn.disabled).toBe(true);

      // ガード本体（currentPageの減分が起こらない）を検証: dispatchEventはdisabled要素でも
      // ハンドラを実行し得るため、クリック後もページ表示が変化しないことを確認
      prevBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();
      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('1 / 3');
    });

    it('[covers:load-dialog.next-page-guarded-at-last-page] 最後のページでは「次のページ」ボタンがdisabled', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 48 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      mountDialog();

      // 2ページ目に移動
      const nextBtn = document.body.querySelectorAll('.pagination-btn')[1];
      if (!isHTMLButtonElement(nextBtn)) throw new Error('next pagination button not found');
      nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      const nextBtnAfter = document.body.querySelectorAll('.pagination-btn')[1];
      if (!isHTMLButtonElement(nextBtnAfter)) throw new Error('next pagination button not found');
      expect(nextBtnAfter.disabled).toBe(true);

      // ガード本体（currentPageの増分が起こらない）を検証: dispatchEventはdisabled要素でも
      // ハンドラを実行し得るため、クリック後もページ表示が変化しないことを確認
      nextBtnAfter.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();
      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('2 / 2');
    });

    it('[covers:load-dialog.go-to-next-page-increments-page] 「次のページ」ボタンでページが移動する', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      mountDialog();

      // 初回表示のcurrentPage初期値0の観測的検証
      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('1 / 3');

      const nextBtn = document.body.querySelectorAll('.pagination-btn')[1];
      if (!isHTMLButtonElement(nextBtn)) throw new Error('next pagination button not found');
      nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('2 / 3');
    });

    it('[covers:load-dialog.go-to-prev-page-decrements-page] 「前のページ」ボタンでページが移動する', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      mountDialog();

      // まず次のページへ移動
      const nextBtn = document.body.querySelectorAll('.pagination-btn')[1];
      if (!isHTMLButtonElement(nextBtn)) throw new Error('next pagination button not found');
      nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('2 / 3');

      // 前のページに戻る
      const prevBtn = document.body.querySelectorAll('.pagination-btn')[0];
      if (!isHTMLButtonElement(prevBtn)) throw new Error('prev pagination button not found');
      prevBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('1 / 3');
    });

    it('[covers:load-dialog.next-page-generates-thumbnails-in-background] ページ移動時にgenerateThumbnailsInBackgroundが呼ばれる', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      mountDialog();

      const nextBtn = document.body.querySelectorAll('.pagination-btn')[1];
      if (!isHTMLButtonElement(nextBtn)) throw new Error('next pagination button not found');
      nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(vi.mocked(deckCache.generateThumbnailsInBackground)).toHaveBeenCalledWith(
        24,
        24,
        store.deckList,
        expect.any(Function),
        store.headPlacementCardIds,
        store.deckThumbnails,
        store.cachedDeckInfos
      );
    });

    it('[covers:load-dialog.go-to-next-page-increments-page] ページ移動時に正しいデッキが表示される', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      mountDialog();
      await nextTick();

      // 1ページ目: dno 1-24
      let deckCards = document.body.querySelectorAll('.deck-card');
      expect(deckCards).toHaveLength(24);
      expect(deckCards[0].querySelector('.dno-chip')?.textContent).toBe('1');

      // 2ページ目に移動: dno 25-48
      const nextBtn = document.body.querySelectorAll('.pagination-btn')[1];
      if (!isHTMLButtonElement(nextBtn)) throw new Error('next pagination button not found');
      nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
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
    it('[covers:load-dialog.load-deck-invokes-callback-with-dno-and-emits-deck-loaded] デッキカードをクリックするとonLoadCallbackが呼ばれdeckLoadedが発火する', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];
      const onLoadSpy = vi.fn().mockResolvedValue(undefined);
      store.onLoadCallback = onLoadSpy;

      const wrapper = mountDialog();
      await nextTick();
      await flushPromises();

      const deckCard = document.body.querySelector('.deck-card');
      if (!isHTMLElement(deckCard)) throw new Error('deck card not found');
      deckCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(onLoadSpy).toHaveBeenCalledWith(1);
      expect(wrapper.emitted('deckLoaded')).toHaveLength(1);
    });

    it('[covers:load-dialog.load-deck-invokes-callback-with-dno-and-emits-deck-loaded] デッキロード時にonLoadCallbackが正しいdnoで呼ばれる', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 123, name: 'Test Deck' }];
      const onLoadSpy = vi.fn().mockResolvedValue(undefined);
      store.onLoadCallback = onLoadSpy;

      mountDialog();
      await nextTick();
      await flushPromises();

      const deckCard = document.body.querySelector('.deck-card');
      if (!isHTMLElement(deckCard)) throw new Error('deck card not found');
      deckCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(onLoadSpy).toHaveBeenCalledWith(123);
    });

    it('[covers:load-dialog.load-deck-closes-dialog-immediately] デッキロード時にダイアログが閉じる', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];
      store.onLoadCallback = vi.fn().mockResolvedValue(undefined);
      store.showLoadDialog = true;

      mountDialog();
      await nextTick();
      await flushPromises();

      const deckCard = document.body.querySelector('.deck-card');
      if (!isHTMLElement(deckCard)) throw new Error('deck card not found');
      deckCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(store.showLoadDialog).toBe(false);
    });

    it('[covers:load-dialog.load-deck-without-callback-logs-error-and-skips] onLoadCallback未設定時はconsole.errorを出して処理を中断する', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];
      store.onLoadCallback = undefined;
      store.showLoadDialog = true;

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const wrapper = mountDialog();
      await nextTick();
      await flushPromises();

      const deckCard = document.body.querySelector('.deck-card');
      if (!isHTMLElement(deckCard)) throw new Error('deck card not found');
      deckCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(consoleErrorSpy).toHaveBeenCalledWith('LoadDialog: onLoadCallback is not set');
      // ダイアログは先に閉じている
      expect(store.showLoadDialog).toBe(false);
      // 以降の処理はスキップされdeckLoaded emitは発火しない
      expect(wrapper.emitted('deckLoaded')).toBeUndefined();

      consoleErrorSpy.mockRestore();
    });

    it('[covers:load-dialog.load-deck-catch-logs-error] デッキロードエラー時にconsole.errorが呼ばれる', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];
      store.onLoadCallback = vi.fn().mockRejectedValue(new Error('Load failed'));
      store.showLoadDialog = true;

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mountDialog();
      await nextTick();
      await flushPromises();

      const deckCard = document.body.querySelector('.deck-card');
      if (!isHTMLElement(deckCard)) throw new Error('deck card not found');
      deckCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Load error:', expect.any(Error));
      // エラー時も先の代入は維持されダイアログは閉じたまま
      expect(store.showLoadDialog).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================
  // 6. ダイアログ閉じる
  // ============================================================
  describe('ダイアログ閉じる', () => {
    it('[covers:load-dialog.close-btn-click-emits-close] 閉じるボタンをクリックするとcloseイベントが発火する', async () => {
      const wrapper = mountDialog();
      await nextTick();

      const closeBtn = document.body.querySelector('.close-btn');
      if (!isHTMLElement(closeBtn)) throw new Error('close button not found');
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[covers:load-dialog.overlay-self-click-emits-close] オーバーレイをクリックするとcloseイベントが発火する', async () => {
      const wrapper = mountDialog();
      await nextTick();

      // overlay自身をclickすると @click.self が成立する
      const overlay = document.body.querySelector('.base-dialog-overlay');
      if (!isHTMLElement(overlay)) throw new Error('base-dialog-overlay not found');
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[covers:load-dialog.content-click-does-not-emit-close] ダイアログコンテンツをクリックしてもcloseイベントが発火しない', async () => {
      const wrapper = mountDialog();
      await nextTick();

      const content = document.body.querySelector('.dialog-content');
      if (!isHTMLElement(content)) throw new Error('dialog content not found');
      content.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();

      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('[covers:load-dialog.close-resets-current-page-to-first] ダイアログを閉じるとページがリセットされる', async () => {
      const store = useDeckEditStore();
      store.deckList = Array.from({ length: 50 }, (_, i) => ({
        dno: i + 1,
        name: `Deck ${i + 1}`,
      }));

      const wrapper = mountDialog();

      // 2ページ目に移動
      const nextBtn = document.body.querySelectorAll('.pagination-btn')[1];
      if (!isHTMLButtonElement(nextBtn)) throw new Error('next pagination button not found');
      nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('2 / 3');

      // ダイアログを閉じる
      const closeBtn = document.body.querySelector('.close-btn');
      if (!isHTMLElement(closeBtn)) throw new Error('close button not found');
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();

      // 再度開く（propsを更新）
      await wrapper.setProps({ isVisible: false });
      await nextTick();
      await wrapper.setProps({ isVisible: true });
      await nextTick();

      // ページが1に戻っている
      expect(document.body.querySelector('.pagination-info')?.textContent).toBe('1 / 3');
    });
  });

  // ============================================================
  // 7. デッキ名のフォントサイズ調整
  // ============================================================
  describe('デッキ名のフォントサイズ調整', () => {
    it('[covers:load-dialog.deck-name-class-lg-up-to-10-chars] 10文字以下: deck-name-lg', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '1234567890' }];

      mountDialog();
      await nextTick();

      const deckNameEl = document.body.querySelector('.deck-name');
      expect(deckNameEl).not.toBe(null);
      if (!deckNameEl) throw new Error('deck name element not found');
      expect(deckNameEl.classList.contains('deck-name-lg')).toBe(true);
    });

    it('[covers:load-dialog.deck-name-class-md-11-to-15-chars] 11-15文字: deck-name-md', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '12345678901' }];

      mountDialog();
      await nextTick();

      const deckNameEl = document.body.querySelector('.deck-name');
      expect(deckNameEl).not.toBe(null);
      if (!deckNameEl) throw new Error('deck name element not found');
      expect(deckNameEl.classList.contains('deck-name-md')).toBe(true);
    });

    it('[covers:load-dialog.deck-name-class-sm-16-to-20-chars] 16-20文字: deck-name-sm', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '1234567890123456' }];

      mountDialog();
      await nextTick();

      const deckNameEl = document.body.querySelector('.deck-name');
      expect(deckNameEl).not.toBe(null);
      if (!deckNameEl) throw new Error('deck name element not found');
      expect(deckNameEl.classList.contains('deck-name-sm')).toBe(true);
    });

    it('[covers:load-dialog.deck-name-class-xs-over-20-chars] 21文字以上: deck-name-xs', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: '123456789012345678901' }];

      mountDialog();
      await nextTick();

      const deckNameEl = document.body.querySelector('.deck-name');
      expect(deckNameEl).not.toBe(null);
      if (!deckNameEl) throw new Error('deck name element not found');
      expect(deckNameEl.classList.contains('deck-name-xs')).toBe(true);
    });
  });

  // ============================================================
  // 8. サムネイル再生成（リフレッシュ）
  // ============================================================
  describe('サムネイル再生成（リフレッシュ）', () => {
    it('[covers:load-dialog.refresh-forces-current-page-regeneration] リフレッシュボタンで現在ページのサムネイルを強制再生成する', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];

      mountDialog();
      await nextTick();

      const refreshBtn = document.body.querySelector('.refresh-btn');
      if (!isHTMLElement(refreshBtn)) throw new Error('refresh button not found');
      refreshBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(vi.mocked(deckCache.generateThumbnailsInBackground)).toHaveBeenCalledWith(
        0,
        24,
        store.deckList,
        expect.any(Function),
        store.headPlacementCardIds,
        store.deckThumbnails,
        store.cachedDeckInfos,
        true
      );
    });

    it('[covers:load-dialog.refresh-guarded-while-refreshing,load-dialog.refresh-restores-flag-in-finally] リフレッシュ中は再実行されず完了後にボタンが復帰する', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];

      // 未解決のPromiseで完了を制御するmock実装
      let resolveGeneration: () => void = () => {};
      vi.mocked(deckCache.generateThumbnailsInBackground).mockImplementationOnce(
        () => new Promise<void>(resolve => { resolveGeneration = resolve; })
      );

      mountDialog();
      await nextTick();

      const refreshBtn = document.body.querySelector('.refresh-btn');
      if (!isHTMLElement(refreshBtn)) throw new Error('refresh button not found');
      refreshBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();

      // 生成中: disabled + refreshingクラス
      const refreshBtnDuring = document.body.querySelector('.refresh-btn');
      if (!isHTMLButtonElement(refreshBtnDuring)) throw new Error('refresh button not found');
      expect(refreshBtnDuring.disabled).toBe(true);
      expect(refreshBtnDuring.classList.contains('refreshing')).toBe(true);

      // disabled中に再clickしても二重実行しない
      refreshBtnDuring.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(vi.mocked(deckCache.generateThumbnailsInBackground)).toHaveBeenCalledTimes(1);

      // 完了後: disabled解除・refreshingクラス解除
      resolveGeneration();
      await flushPromises();
      await nextTick();

      const refreshBtnAfter = document.body.querySelector('.refresh-btn');
      if (!isHTMLButtonElement(refreshBtnAfter)) throw new Error('refresh button not found');
      expect(refreshBtnAfter.disabled).toBe(false);
      expect(refreshBtnAfter.classList.contains('refreshing')).toBe(false);
      expect(vi.mocked(deckCache.generateThumbnailsInBackground)).toHaveBeenCalledTimes(1);
    });

    it('[covers:load-dialog.refresh-restores-flag-in-finally] リフレッシュ生成がrejectされても完了後はボタンが復帰する', async () => {
      const store = useDeckEditStore();
      store.deckList = [{ dno: 1, name: 'Test Deck' }];

      // finally検証のreject経路: 生成がrejectされてもisRefreshingが解除される
      vi.mocked(deckCache.generateThumbnailsInBackground).mockImplementationOnce(
        async () => { throw new Error('generation failed'); }
      );
      // refreshCurrentPageにcatchは無くrejectはVueのイベントハンドラ経由で伝播する。
      // app.config.errorHandler未設定だとVue devのlogErrorがエラーを再throwし
      // unhandled rejectionになるため、errorHandlerで捕捉する
      const errorHandlerCalls: unknown[] = [];
      mountDialog(undefined, { errorHandler: err => { errorHandlerCalls.push(err); } });
      await nextTick();

      const refreshBtn = document.body.querySelector('.refresh-btn');
      if (!isHTMLElement(refreshBtn)) throw new Error('refresh button not found');
      refreshBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();

      // 生成中: disabled + refreshingクラス
      const refreshBtnDuring = document.body.querySelector('.refresh-btn');
      if (!isHTMLButtonElement(refreshBtnDuring)) throw new Error('refresh button not found');
      expect(refreshBtnDuring.disabled).toBe(true);
      expect(refreshBtnDuring.classList.contains('refreshing')).toBe(true);

      // reject後もfinallyでisRefreshing=falseに戻る
      await flushPromises();
      await nextTick();

      const refreshBtnAfter = document.body.querySelector('.refresh-btn');
      if (!isHTMLButtonElement(refreshBtnAfter)) throw new Error('refresh button not found');
      expect(refreshBtnAfter.disabled).toBe(false);
      expect(refreshBtnAfter.classList.contains('refreshing')).toBe(false);

      // rejectがVueのエラー経路へ伝播したことの確認
      expect(errorHandlerCalls).toHaveLength(1);
    });
  });
});
