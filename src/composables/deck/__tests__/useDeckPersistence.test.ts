import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { useDeckPersistence } from '../useDeckPersistence';
import { DeckInfo } from '@/types/deck';
import * as deckOperations from '@/api/deck-operations';
import { URLStateManager } from '@/utils/url-state';
import * as tempCardDb from '@/utils/temp-card-db';
import * as unifiedCacheDb from '@/utils/unified-cache-db';
import { useToastStore } from '@/stores/toast-notification';

// モックの設定
vi.mock('@/api/deck-operations');
vi.mock('@/utils/url-state');
vi.mock('@/utils/temp-card-db');
vi.mock('@/utils/unified-cache-db');
vi.mock('@/stores/toast-notification');

describe('useDeckPersistence', () => {
  let mockSessionManager: any;
  let mockDeckInfo: any;
  let mockLastUsedDno: any;
  let mockSavedDeckSnapshot: any;
  let initializeDisplayOrderMock: any;
  let clearHistoryMock: any;
  let captureDeckSnapshotMock: any;

  const createMockDeckInfo = (): DeckInfo => ({
    dno: 123,
    name: 'Test Deck',
    originalName: 'Test Deck',
    mainDeck: [{ cid: 1001, name: 'Card 1' }],
    extraDeck: [{ cid: 2001, name: 'Card 2' }],
    sideDeck: [{ cid: 3001, name: 'Card 3' }],
    skippedCards: [],
    skippedCardsCount: 0
  });

  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks();

    // DOMのクリア
    document.body.innerHTML = '';

    // localStorage のモック
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        clear: () => { store = {}; }
      };
    })();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

    // window プロパティのリセット
    window.ygoNextPreloadedDeckDetail = null;
    window.ygoNextPreloadedDeckDetailPromise = null;

    // SessionManager のモック
    mockSessionManager = {
      getCgid: vi.fn().mockResolvedValue('test-cgid-123'),
      saveDeck: vi.fn().mockResolvedValue({ success: true, error: [] })
    };

    // Ref のモック
    mockDeckInfo = ref<DeckInfo>(createMockDeckInfo());
    mockLastUsedDno = ref<number | null>(null);
    mockSavedDeckSnapshot = ref<string | null>(null);

    // 関数のモック
    initializeDisplayOrderMock = vi.fn();
    clearHistoryMock = vi.fn();
    captureDeckSnapshotMock = vi.fn().mockReturnValue('snapshot-data');

    // API モックの設定
    vi.mocked(deckOperations.getDeckDetail).mockResolvedValue(createMockDeckInfo());
    vi.mocked(URLStateManager.setDno).mockImplementation(() => {});
    vi.mocked(tempCardDb.recordDeckOpen).mockResolvedValue(undefined);
    vi.mocked(unifiedCacheDb.saveUnifiedCacheDB).mockResolvedValue(undefined);

    // Toast Store のモック
    const mockToastStore = {
      showToast: vi.fn()
    };
    vi.mocked(useToastStore).mockReturnValue(mockToastStore as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('loadDeck', () => {
    it('プリロードデータがない場合、APIからデッキを取得する', async () => {
      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo: mockDeckInfo,
        lastUsedDno: mockLastUsedDno,
        initializeDisplayOrder: initializeDisplayOrderMock,
        clearHistory: clearHistoryMock,
        captureDeckSnapshot: captureDeckSnapshotMock,
        savedDeckSnapshot: mockSavedDeckSnapshot
      });

      await persistence.loadDeck(123);

      // API が呼ばれたことを確認
      expect(mockSessionManager.getCgid).toHaveBeenCalled();
      expect(deckOperations.getDeckDetail).toHaveBeenCalledWith(123, 'test-cgid-123');

      // deckInfo が更新されたことを確認
      expect(mockDeckInfo.value.dno).toBe(123);
      expect(mockDeckInfo.value.name).toBe(''); // 名前は空にされる
      expect(mockDeckInfo.value.originalName).toBe('Test Deck');

      // 副作用が呼ばれたことを確認
      expect(URLStateManager.setDno).toHaveBeenCalledWith(123);
      expect(initializeDisplayOrderMock).toHaveBeenCalled();
      expect(clearHistoryMock).toHaveBeenCalled();
      expect(tempCardDb.recordDeckOpen).toHaveBeenCalledWith(123, [1001, 2001, 3001]);

      // localStorage が更新されたことを確認
      expect(localStorage.getItem('ygo-deck-helper:lastUsedDno')).toBe('123');
      expect(mockLastUsedDno.value).toBe(123);

      // スナップショットが保存されたことを確認
      expect(captureDeckSnapshotMock).toHaveBeenCalled();
      expect(mockSavedDeckSnapshot.value).toBe('snapshot-data');
    });

    it('プリロードデータがある場合、それを使用する', async () => {
      const preloadedDeck = createMockDeckInfo();
      preloadedDeck.name = 'Preloaded Deck';
      window.ygoNextPreloadedDeckDetail = preloadedDeck;

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo: mockDeckInfo,
        lastUsedDno: mockLastUsedDno,
        initializeDisplayOrder: initializeDisplayOrderMock,
        clearHistory: clearHistoryMock,
        captureDeckSnapshot: captureDeckSnapshotMock,
        savedDeckSnapshot: mockSavedDeckSnapshot
      });

      await persistence.loadDeck(123);

      // API が呼ばれていないことを確認
      expect(deckOperations.getDeckDetail).not.toHaveBeenCalled();

      // プリロードデータが使用されたことを確認
      expect(mockDeckInfo.value.originalName).toBe('Preloaded Deck');

      // プリロードデータが削除されたことを確認
      expect(window.ygoNextPreloadedDeckDetail).toBeNull();
    });

    it('プリロードPromiseがある場合、それを待つ', async () => {
      const preloadedDeck = createMockDeckInfo();
      let resolvePreload: any;
      const preloadPromise = new Promise<void>((resolve) => {
        resolvePreload = resolve;
      });

      window.ygoNextPreloadedDeckDetailPromise = preloadPromise;

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo: mockDeckInfo,
        lastUsedDno: mockLastUsedDno,
        initializeDisplayOrder: initializeDisplayOrderMock,
        clearHistory: clearHistoryMock,
        captureDeckSnapshot: captureDeckSnapshotMock,
        savedDeckSnapshot: mockSavedDeckSnapshot
      });

      // 非同期でプリロードデータを設定
      setTimeout(() => {
        window.ygoNextPreloadedDeckDetail = preloadedDeck;
        resolvePreload();
      }, 100);

      await persistence.loadDeck(123);

      // プリロードPromiseが削除されたことを確認
      expect(window.ygoNextPreloadedDeckDetailPromise).toBeNull();
    });

    it('スキップカードがある場合、通知を表示する', async () => {
      const deckWithSkipped = createMockDeckInfo();
      deckWithSkipped.skippedCardsCount = 2;
      deckWithSkipped.skippedCards = [
        { cid: 4001, name: 'Skipped Card 1' },
        { cid: 4002, name: 'Skipped Card 2' }
      ];

      vi.mocked(deckOperations.getDeckDetail).mockResolvedValue(deckWithSkipped);

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo: mockDeckInfo,
        lastUsedDno: mockLastUsedDno,
        initializeDisplayOrder: initializeDisplayOrderMock,
        clearHistory: clearHistoryMock,
        captureDeckSnapshot: captureDeckSnapshotMock,
        savedDeckSnapshot: mockSavedDeckSnapshot
      });

      await persistence.loadDeck(123);

      // Toast が表示されたことを確認
      const toastStore = useToastStore();
      expect(toastStore.showToast).toHaveBeenCalledWith(
        '2枚の未発売カードをスキップしました',
        'warning',
        'Skipped Card 1\nSkipped Card 2'
      );
    });

    it('スキップカードが4枚以上ある場合、最初の3枚+残り枚数を表示する', async () => {
      const deckWithSkipped = createMockDeckInfo();
      deckWithSkipped.skippedCardsCount = 5;
      deckWithSkipped.skippedCards = [
        { cid: 4001, name: 'Card 1' },
        { cid: 4002, name: 'Card 2' },
        { cid: 4003, name: 'Card 3' },
        { cid: 4004, name: 'Card 4' },
        { cid: 4005, name: 'Card 5' }
      ];

      vi.mocked(deckOperations.getDeckDetail).mockResolvedValue(deckWithSkipped);

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo: mockDeckInfo,
        lastUsedDno: mockLastUsedDno,
        initializeDisplayOrder: initializeDisplayOrderMock,
        clearHistory: clearHistoryMock,
        captureDeckSnapshot: captureDeckSnapshotMock,
        savedDeckSnapshot: mockSavedDeckSnapshot
      });

      await persistence.loadDeck(123);

      const toastStore = useToastStore();
      expect(toastStore.showToast).toHaveBeenCalledWith(
        '5枚の未発売カードをスキップしました',
        'warning',
        'Card 1\nCard 2\nCard 3\nほか2枚'
      );
    });

    it('API呼び出しが失敗した場合、エラーをthrowする', async () => {
      const error = new Error('API Error');
      vi.mocked(deckOperations.getDeckDetail).mockRejectedValue(error);

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo: mockDeckInfo,
        lastUsedDno: mockLastUsedDno,
        initializeDisplayOrder: initializeDisplayOrderMock,
        clearHistory: clearHistoryMock,
        captureDeckSnapshot: captureDeckSnapshotMock,
        savedDeckSnapshot: mockSavedDeckSnapshot
      });

      await expect(persistence.loadDeck(123)).rejects.toThrow('API Error');
    });
  });

  describe('saveDeck', () => {
    it('デッキを正常に保存できる', async () => {
      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo: mockDeckInfo,
        lastUsedDno: mockLastUsedDno,
        initializeDisplayOrder: initializeDisplayOrderMock,
        clearHistory: clearHistoryMock,
        captureDeckSnapshot: captureDeckSnapshotMock,
        savedDeckSnapshot: mockSavedDeckSnapshot
      });

      const result = await persistence.saveDeck(123);

      // sessionManager.saveDeck が呼ばれたことを確認
      expect(mockSessionManager.saveDeck).toHaveBeenCalledWith(123, expect.objectContaining({
        dno: 123,
        name: 'Test Deck'
      }));

      // 結果が成功であることを確認
      expect(result.success).toBe(true);

      // スナップショットが更新されたことを確認
      expect(captureDeckSnapshotMock).toHaveBeenCalled();
      expect(mockSavedDeckSnapshot.value).toBe('snapshot-data');
    });

    it('deckInfo.nameが空の場合、originalNameを使用する', async () => {
      mockDeckInfo.value.name = '';
      mockDeckInfo.value.originalName = 'Original Name';

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo: mockDeckInfo,
        lastUsedDno: mockLastUsedDno,
        initializeDisplayOrder: initializeDisplayOrderMock,
        clearHistory: clearHistoryMock,
        captureDeckSnapshot: captureDeckSnapshotMock,
        savedDeckSnapshot: mockSavedDeckSnapshot
      });

      await persistence.saveDeck(123);

      // originalName が使用されたことを確認
      expect(mockSessionManager.saveDeck).toHaveBeenCalledWith(123, expect.objectContaining({
        name: 'Original Name'
      }));
    });

    it('保存が失敗した場合、エラーを返す', async () => {
      mockSessionManager.saveDeck.mockResolvedValue({ success: false, error: ['Save failed'] });

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo: mockDeckInfo,
        lastUsedDno: mockLastUsedDno,
        initializeDisplayOrder: initializeDisplayOrderMock,
        clearHistory: clearHistoryMock,
        captureDeckSnapshot: captureDeckSnapshotMock,
        savedDeckSnapshot: mockSavedDeckSnapshot
      });

      const result = await persistence.saveDeck(123);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(['Save failed']);

      // 失敗時はスナップショットが更新されないことを確認
      expect(mockSavedDeckSnapshot.value).toBeNull();
    });

    it('例外が発生した場合、エラー結果を返す', async () => {
      const error = new Error('Exception occurred');
      mockSessionManager.saveDeck.mockRejectedValue(error);

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo: mockDeckInfo,
        lastUsedDno: mockLastUsedDno,
        initializeDisplayOrder: initializeDisplayOrderMock,
        clearHistory: clearHistoryMock,
        captureDeckSnapshot: captureDeckSnapshotMock,
        savedDeckSnapshot: mockSavedDeckSnapshot
      });

      const result = await persistence.saveDeck(123);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(['Error: Exception occurred']);
    });
  });
});
