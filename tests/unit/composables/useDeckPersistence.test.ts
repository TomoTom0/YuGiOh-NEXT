import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ref } from 'vue';
import { getDeckDetail } from '@/api/deck-operations';
import { URLStateManager } from '@/utils/url-state';
import { recordDeckOpen } from '@/utils/temp-cache-db';
import { useToastStore } from '@/stores/toast-notification';
import { saveUnifiedCacheDB } from '@/utils/unified-cache-db';
import { useDeckPersistence } from '@/composables/deck/useDeckPersistence';
import type { DeckInfo, OperationResult } from '@/types/deck';

const toastMocks = vi.hoisted(() => ({
  showToast: vi.fn()
}));

vi.mock('@/api/deck-operations', () => ({
  getDeckDetail: vi.fn()
}));

vi.mock('@/utils/url-state', () => ({
  URLStateManager: {
    setDno: vi.fn()
  }
}));

vi.mock('@/utils/temp-cache-db', () => ({
  recordDeckOpen: vi.fn()
}));

vi.mock('@/stores/toast-notification', () => ({
  useToastStore: vi.fn(() => ({
    showToast: toastMocks.showToast
  }))
}));

vi.mock('@/utils/unified-cache-db', () => ({
  saveUnifiedCacheDB: vi.fn().mockResolvedValue(undefined),
  getUnifiedCacheDB: vi.fn(() => ({
    isInitialized: vi.fn(() => false),
    recordDeckOpen: vi.fn()
  }))
}));

describe('useDeckPersistence', () => {
  let mockSessionManager: {
    getCgid: ReturnType<typeof vi.fn>;
    saveDeck: ReturnType<typeof vi.fn>;
  };
  let deckInfo: ReturnType<typeof ref<DeckInfo>>;
  let lastUsedDno: ReturnType<typeof ref<number | null>>;
  let savedDeckSnapshot: ReturnType<typeof ref<string | null>>;
  let initializeDisplayOrder: ReturnType<typeof vi.fn>;
  let clearHistory: ReturnType<typeof vi.fn>;
  let captureDeckSnapshot: ReturnType<typeof vi.fn>;
  let getDeckName: ReturnType<typeof vi.fn>;

  const makeDeck = (overrides: Partial<DeckInfo> = {}): DeckInfo => ({
    dno: 1,
    name: 'Test Deck',
    originalName: 'Original Deck Name',
    mainDeck: [],
    extraDeck: [],
    sideDeck: [],
    category: [],
    tags: [],
    comment: '',
    deckCode: '',
    ...overrides
  });

  const createPersistence = () => useDeckPersistence({
    sessionManager: mockSessionManager,
    deckInfo,
    lastUsedDno,
    initializeDisplayOrder,
    clearHistory,
    captureDeckSnapshot,
    savedDeckSnapshot,
    getDeckName
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDeckDetail).mockReset();
    vi.mocked(getDeckDetail).mockResolvedValue(makeDeck());
    vi.mocked(saveUnifiedCacheDB).mockReset();
    vi.mocked(saveUnifiedCacheDB).mockResolvedValue(undefined);

    deckInfo = ref(makeDeck({ dno: 0 }));
    lastUsedDno = ref<number | null>(null);
    savedDeckSnapshot = ref<string | null>(null);
    initializeDisplayOrder = vi.fn();
    clearHistory = vi.fn();
    captureDeckSnapshot = vi.fn(() => 'snapshot');
    getDeckName = vi.fn(() => deckInfo.value.name || deckInfo.value.originalName || '');

    mockSessionManager = {
      getCgid: vi.fn().mockResolvedValue('test-cgid'),
      saveDeck: vi.fn().mockResolvedValue({ success: true })
    };

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });

    window.location.href = 'http://localhost/';
    delete (window as any).ygoNextPreloadedDeckDetail;
    delete (window as any).ygoNextPreloadedDeckDetailPromise;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('loadDeck', () => {
    it('[covers:load.preloaded_detail_used_and_cleared] プリロード済みデータがある場合、それを使用してAPI取得しない', async () => {
      const loadedDeck = makeDeck({
        dno: 123,
        name: 'Loaded Deck',
        mainDeck: [{ cid: 'card1', ciid: '1', lang: 'ja', quantity: 1 }]
      });
      (window as any).ygoNextPreloadedDeckDetail = loadedDeck;

      await createPersistence().loadDeck(123);

      expect(mockSessionManager.getCgid).toHaveBeenCalled();
      expect(getDeckDetail).not.toHaveBeenCalled();
      expect(deckInfo.value.name).toBe('Loaded Deck');
      expect((window as any).ygoNextPreloadedDeckDetail).toBeNull();
    });

    it('[covers:load.preload_promise_waited_and_cleared] プリロードPromiseを待ってからデータを使用する', async () => {
      const loadedDeck = makeDeck({ dno: 234, name: 'Resolved Preload' });
      let resolvePreload!: () => void;
      (window as any).ygoNextPreloadedDeckDetailPromise = new Promise<void>((resolve) => {
        resolvePreload = () => {
          (window as any).ygoNextPreloadedDeckDetail = loadedDeck;
          resolve();
        };
      });
      mockSessionManager.getCgid.mockImplementation(() => {
        setTimeout(resolvePreload, 0);
        return Promise.resolve('test-cgid');
      });

      await createPersistence().loadDeck(234);

      expect(deckInfo.value.name).toBe('Resolved Preload');
      expect((window as any).ygoNextPreloadedDeckDetailPromise).toBeNull();
      expect(getDeckDetail).not.toHaveBeenCalled();
    });

    it('[covers:load.preload_wait_failure_continues] [covers:load.no_preloaded_detail_fetches_api] プリロード待機失敗時はAPI取得へ進む', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(getDeckDetail).mockResolvedValue(makeDeck({ dno: 345, name: 'API Deck' }));
      (window as any).ygoNextPreloadedDeckDetailPromise = Promise.reject(new Error('preload failed'));

      await createPersistence().loadDeck(345);

      expect(warnSpy).toHaveBeenCalled();
      expect((window as any).ygoNextPreloadedDeckDetailPromise).toBeNull();
      expect(getDeckDetail).toHaveBeenCalledWith(345, 'test-cgid');
      expect(deckInfo.value.name).toBe('API Deck');
    });

    it('[covers:load.null_loaded_deck_no_state_update] API取得結果がnullなら状態更新しない', async () => {
      vi.mocked(getDeckDetail).mockResolvedValue(null as any);
      const beforeDeckInfo = deckInfo.value;

      await createPersistence().loadDeck(456);

      expect(deckInfo.value).toBe(beforeDeckInfo);
      expect(URLStateManager.setDno).not.toHaveBeenCalled();
      expect(initializeDisplayOrder).not.toHaveBeenCalled();
      expect(window.localStorage.setItem).not.toHaveBeenCalled();
      expect(recordDeckOpen).not.toHaveBeenCalled();
      expect(saveUnifiedCacheDB).not.toHaveBeenCalled();
      expect(clearHistory).not.toHaveBeenCalled();
      expect(savedDeckSnapshot.value).toBeNull();
      expect(useToastStore).not.toHaveBeenCalled();
    });

    it('[covers:load.deck_name_fallback] ロード時のnameはoriginalName、次に空文字へフォールバックする', async () => {
      (window as any).ygoNextPreloadedDeckDetail = makeDeck({
        name: '',
        originalName: 'Original From API'
      });

      await createPersistence().loadDeck(500);
      expect(deckInfo.value.name).toBe('Original From API');

      (window as any).ygoNextPreloadedDeckDetail = makeDeck({
        name: '',
        originalName: undefined
      });

      await createPersistence().loadDeck(501);
      expect(deckInfo.value.name).toBe('');
    });

    it('[covers:load.success_updates_side_effects] ロード成功時にURL・履歴・保存状態・オープン記録を更新する', async () => {
      const loadedDeck = makeDeck({
        dno: 678,
        mainDeck: [{ cid: 'main1', ciid: '1', lang: 'ja', quantity: 1 }],
        extraDeck: [{ cid: 'extra1', ciid: '2', lang: 'ja', quantity: 1 }],
        sideDeck: [{ cid: 'side1', ciid: '3', lang: 'ja', quantity: 1 }]
      });
      (window as any).ygoNextPreloadedDeckDetail = loadedDeck;

      await createPersistence().loadDeck(678);

      expect(URLStateManager.setDno).toHaveBeenCalledWith(678);
      expect(initializeDisplayOrder).toHaveBeenCalledTimes(1);
      expect(lastUsedDno.value).toBe(678);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('ygoNext:lastUsedDno', '678');
      expect(recordDeckOpen).toHaveBeenCalledWith(678, ['main1', 'extra1', 'side1']);
      expect(saveUnifiedCacheDB).toHaveBeenCalledTimes(1);
      expect(clearHistory).toHaveBeenCalledTimes(1);
      expect(captureDeckSnapshot).toHaveBeenCalledTimes(1);
      expect(savedDeckSnapshot.value).toBe('snapshot');
    });

    it('[covers:load.unified_cache_save_rejection_ignored] cache保存rejectはloadDeckを失敗させない', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(saveUnifiedCacheDB).mockRejectedValue(new Error('storage failed'));
      (window as any).ygoNextPreloadedDeckDetail = makeDeck({ dno: 700 });

      await expect(createPersistence().loadDeck(700)).resolves.toBeUndefined();
      await Promise.resolve();

      expect(savedDeckSnapshot.value).toBe('snapshot');
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to save UnifiedCacheDB to storage:',
        expect.any(Error)
      );
    });

    it('[covers:load.skipped_count_absent_no_toast] skippedCardsCountがない場合はtoastを表示しない', async () => {
      (window as any).ygoNextPreloadedDeckDetail = makeDeck({ skippedCardsCount: 0 });

      await createPersistence().loadDeck(710);

      expect(useToastStore).not.toHaveBeenCalled();
      expect(toastMocks.showToast).not.toHaveBeenCalled();
    });

    it('[covers:load.skipped_cards_toast_body_max_three] skippedCardsは最大3件と残件数をtoast本文に入れる', async () => {
      (window as any).ygoNextPreloadedDeckDetail = makeDeck({
        skippedCardsCount: 4,
        skippedCards: [
          { cid: '1', name: 'Card A', lang: 'ja' },
          { cid: '2', name: 'Card B', lang: 'ja' },
          { cid: '3', name: 'Card C', lang: 'ja' },
          { cid: '4', name: 'Card D', lang: 'ja' }
        ]
      });

      await createPersistence().loadDeck(720);

      expect(toastMocks.showToast).toHaveBeenCalledWith(
        '4枚の未発売カードをスキップしました',
        'warning',
        'Card A\nCard B\nCard C\nほか1枚'
      );
    });

    it('[covers:load.skipped_count_without_cards_empty_body] skippedCardsがない場合でも空本文でtoastを表示する', async () => {
      (window as any).ygoNextPreloadedDeckDetail = makeDeck({
        skippedCardsCount: 1,
        skippedCards: undefined
      });

      await createPersistence().loadDeck(730);

      expect(toastMocks.showToast).toHaveBeenCalledWith(
        '1枚の未発売カードをスキップしました',
        'warning',
        ''
      );
    });

    it('[covers:load.login_error_redirects_and_returns] 未ログインエラーはログインページへリダイレクトしてthrowしない', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSessionManager.getCgid.mockRejectedValue(new Error('cgid not found in page'));

      await expect(createPersistence().loadDeck(800)).resolves.toBeUndefined();

      expect(window.location.href).toBe('https://www.db.yugioh-card.com/yugiohdb/');
      expect(errorSpy).toHaveBeenCalledWith('Failed to load deck:', expect.any(Error));
    });

    it('[covers:load.non_login_error_rethrows] 未ログイン以外のloadDeckエラーは再throwする', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('network');
      vi.mocked(getDeckDetail).mockRejectedValue(error);

      await expect(createPersistence().loadDeck(810)).rejects.toBe(error);

      expect(errorSpy).toHaveBeenCalledWith('Failed to load deck:', error);
    });
  });

  describe('saveDeck', () => {
    it('[covers:save.sets_dno_and_uses_get_deck_name] dnoを更新しgetDeckNameの名前で保存する', async () => {
      getDeckName.mockReturnValue('Name From Getter');
      const saveResult: OperationResult = { success: true };
      mockSessionManager.saveDeck.mockResolvedValue(saveResult);

      const result = await createPersistence().saveDeck(100);

      expect(result).toEqual(saveResult);
      expect(deckInfo.value.dno).toBe(100);
      expect(mockSessionManager.saveDeck).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          dno: 100,
          name: 'Name From Getter'
        })
      );
    });

    it('[covers:save.success_updates_snapshot_and_returns_result] 保存成功時にスナップショットを更新して結果を返す', async () => {
      const saveResult: OperationResult = { success: true };
      mockSessionManager.saveDeck.mockResolvedValue(saveResult);
      captureDeckSnapshot.mockReturnValue('snapshot-1');

      const result = await createPersistence().saveDeck(100);

      expect(result).toBe(saveResult);
      expect(captureDeckSnapshot).toHaveBeenCalledTimes(1);
      expect(savedDeckSnapshot.value).toBe('snapshot-1');
    });

    it('[covers:save.failure_returns_result_without_snapshot] 保存失敗時はスナップショットを更新せず結果を返す', async () => {
      const saveResult: OperationResult = { success: false, error: ['Save failed'] };
      mockSessionManager.saveDeck.mockResolvedValue(saveResult);
      savedDeckSnapshot.value = 'old-snapshot';

      const result = await createPersistence().saveDeck(100);

      expect(result).toBe(saveResult);
      expect(captureDeckSnapshot).not.toHaveBeenCalled();
      expect(savedDeckSnapshot.value).toBe('old-snapshot');
    });

    it('[covers:save.login_error_redirects_and_returns_login_required] 保存時の未ログインエラーはリダイレクトしてログイン必要結果を返す', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSessionManager.saveDeck.mockRejectedValue(new Error('cgid not found in page'));

      const result = await createPersistence().saveDeck(100);

      expect(window.location.href).toBe('https://www.db.yugioh-card.com/yugiohdb/');
      expect(result).toEqual({ success: false, error: ['ログインが必要です'] });
      expect(errorSpy).toHaveBeenCalledWith('Failed to save deck:', expect.any(Error));
    });

    it('[covers:save.non_login_error_returns_stringified_error] 保存時の通常例外はString(error)をerror配列に入れて返す', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Save error');
      mockSessionManager.saveDeck.mockRejectedValue(error);

      const result = await createPersistence().saveDeck(100);

      expect(result).toEqual({ success: false, error: ['Error: Save error'] });
      expect(errorSpy).toHaveBeenCalledWith('Failed to save deck:', error);
    });
  });

  describe('Facade パターンの効果', () => {
    it('[covers:facade.returns_load_and_save_only] 返り値はloadDeckとsaveDeckのみ', () => {
      const persistence = createPersistence();

      expect(persistence).toHaveProperty('loadDeck');
      expect(persistence).toHaveProperty('saveDeck');
      expect(Object.keys(persistence)).toEqual(['loadDeck', 'saveDeck']);
    });
  });
});
