import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ref } from 'vue';
import { useDeckPersistence } from '@/composables/deck/useDeckPersistence';
import type { DeckInfo, OperationResult } from '@/types/deck';

// API モック
vi.mock('@/api/deck-operations', () => ({
  getDeckDetail: vi.fn()
}));

// URLStateManager モック
vi.mock('@/utils/url-state', () => ({
  URLStateManager: {
    setDno: vi.fn()
  }
}));

// recordDeckOpen モック
vi.mock('@/utils/temp-card-db', () => ({
  recordDeckOpen: vi.fn()
}));

// useToastStore モック
vi.mock('@/stores/toast-notification', () => ({
  useToastStore: vi.fn(() => ({
    showToast: vi.fn()
  }))
}));

// unified-cache-db モック
vi.mock('@/utils/unified-cache-db', () => ({
  saveUnifiedCacheDB: vi.fn().mockResolvedValue(undefined)
}));

describe('useDeckPersistence', () => {
  let mockSessionManager: any;
  let deckInfo: any;
  let lastUsedDno: any;
  let savedDeckSnapshot: any;
  let initializeDisplayOrderCalled: boolean;
  let clearHistoryCalled: boolean;
  let captureDeckSnapshotCalled: number;

  beforeEach(() => {
    initializeDisplayOrderCalled = false;
    clearHistoryCalled = false;
    captureDeckSnapshotCalled = 0;

    deckInfo = ref<DeckInfo>({
      dno: 0,
      name: 'Test Deck',
      originalName: 'Original Deck Name',
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      mainDeckCount: 0,
      extraDeckCount: 0,
      sideDeckCount: 0,
      createdBy: 'testuser'
    });

    lastUsedDno = ref<number | null>(null);
    savedDeckSnapshot = ref<string | null>(null);

    mockSessionManager = {
      getCgid: vi.fn().mockResolvedValue('test-cgid'),
      saveDeck: vi.fn().mockResolvedValue({ success: true })
    };

    // localStorage モック
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // window.ygo properties をクリア
    delete (window as any).ygoNextPreloadedDeckDetail;
    delete (window as any).ygoNextPreloadedDeckDetailPromise;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadDeck', () => {
    it('プリロード済みデータがある場合、それを使用して状態を更新', async () => {
      const mockDeckInfo: DeckInfo = {
        dno: 123,
        name: 'Loaded Deck',
        originalName: 'Original Name',
        mainDeck: [
          { cid: 'card1', name: 'Card 1' },
          { cid: 'card2', name: 'Card 2' }
        ],
        extraDeck: [],
        sideDeck: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        mainDeckCount: 2,
        extraDeckCount: 0,
        sideDeckCount: 0,
        createdBy: 'testuser'
      };

      mockSessionManager.getCgid.mockResolvedValue('cgid-123');
      (window as any).ygoNextPreloadedDeckDetail = mockDeckInfo;

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo,
        lastUsedDno,
        initializeDisplayOrder: () => { initializeDisplayOrderCalled = true; },
        clearHistory: () => { clearHistoryCalled = true; },
        captureDeckSnapshot: () => { captureDeckSnapshotCalled++; return 'snapshot'; },
        savedDeckSnapshot
      });

      await persistence.loadDeck(123);

      expect(mockSessionManager.getCgid).toHaveBeenCalled();
      expect(initializeDisplayOrderCalled).toBe(true);
      expect(clearHistoryCalled).toBe(true);
      expect(lastUsedDno.value).toBe(123);
      expect((window as any).ygoNextPreloadedDeckDetail).toBeNull();
    });

    it('localStorage に lastUsedDno を保存する', async () => {
      mockSessionManager.getCgid.mockResolvedValue('cgid');

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo,
        lastUsedDno,
        initializeDisplayOrder: () => {},
        clearHistory: () => {},
        captureDeckSnapshot: () => 'snapshot',
        savedDeckSnapshot
      });

      // プリロード済みデータを設定
      const mockDeckInfo: DeckInfo = { ...deckInfo.value, dno: 456 };
      (window as any).ygoNextPreloadedDeckDetail = mockDeckInfo;

      await persistence.loadDeck(456);

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'ygo-deck-helper:lastUsedDno',
        '456'
      );
    });

    it('プリロード済みデータがある場合、それを使用する', async () => {
      const mockDeckInfo: DeckInfo = {
        ...deckInfo.value,
        dno: 789,
        name: 'Preloaded Deck'
      };

      (window as any).ygoNextPreloadedDeckDetail = mockDeckInfo;

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo,
        lastUsedDno,
        initializeDisplayOrder: () => { initializeDisplayOrderCalled = true; },
        clearHistory: () => { clearHistoryCalled = true; },
        captureDeckSnapshot: () => 'snapshot',
        savedDeckSnapshot
      });

      await persistence.loadDeck(789);

      // プリロードデータが使用されたため、getCgid は呼ばれるが getDeckDetailAPI は呼ばれない
      expect(mockSessionManager.getCgid).toHaveBeenCalled();
      expect(initializeDisplayOrderCalled).toBe(true);
      expect((window as any).ygoNextPreloadedDeckDetail).toBeNull();
    });

    it('スナップショットをキャプチャする', async () => {
      (window as any).ygoNextPreloadedDeckDetail = deckInfo.value;

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo,
        lastUsedDno,
        initializeDisplayOrder: () => {},
        clearHistory: () => {},
        captureDeckSnapshot: () => { captureDeckSnapshotCalled++; return 'snapshot-' + captureDeckSnapshotCalled; },
        savedDeckSnapshot
      });

      await persistence.loadDeck(100);

      expect(captureDeckSnapshotCalled).toBe(1);
      expect(savedDeckSnapshot.value).toBe('snapshot-1');
    });

  });

  describe('saveDeck', () => {
    it('デッキを保存して結果を返す', async () => {
      const saveResult: OperationResult = { success: true };
      mockSessionManager.saveDeck.mockResolvedValue(saveResult);

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo,
        lastUsedDno,
        initializeDisplayOrder: () => {},
        clearHistory: () => {},
        captureDeckSnapshot: () => { captureDeckSnapshotCalled++; return 'snapshot-' + captureDeckSnapshotCalled; },
        savedDeckSnapshot
      });

      const result = await persistence.saveDeck(100);

      expect(result).toEqual(saveResult);
      expect(mockSessionManager.saveDeck).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          dno: 100
        })
      );
    });

    it('保存成功時にスナップショットを更新', async () => {
      mockSessionManager.saveDeck.mockResolvedValue({ success: true });

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo,
        lastUsedDno,
        initializeDisplayOrder: () => {},
        clearHistory: () => {},
        captureDeckSnapshot: () => { captureDeckSnapshotCalled++; return 'snapshot-' + captureDeckSnapshotCalled; },
        savedDeckSnapshot
      });

      await persistence.saveDeck(100);

      expect(captureDeckSnapshotCalled).toBe(1);
      expect(savedDeckSnapshot.value).toBe('snapshot-1');
    });

    it('保存失敗時はスナップショットを更新しない', async () => {
      mockSessionManager.saveDeck.mockResolvedValue({ success: false, error: ['Save failed'] });

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo,
        lastUsedDno,
        initializeDisplayOrder: () => {},
        clearHistory: () => {},
        captureDeckSnapshot: () => { captureDeckSnapshotCalled++; return 'snapshot-' + captureDeckSnapshotCalled; },
        savedDeckSnapshot
      });

      savedDeckSnapshot.value = 'old-snapshot';

      await persistence.saveDeck(100);

      expect(savedDeckSnapshot.value).toBe('old-snapshot');
    });

    it('例外をキャッチして結果を返す', async () => {
      mockSessionManager.saveDeck.mockRejectedValue(new Error('Save error'));

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo,
        lastUsedDno,
        initializeDisplayOrder: () => {},
        clearHistory: () => {},
        captureDeckSnapshot: () => 'snapshot',
        savedDeckSnapshot
      });

      const result = await persistence.saveDeck(100);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('デッキ名がない場合、originalName を使用', async () => {
      const deckWithoutName = ref<DeckInfo>({
        ...deckInfo.value,
        name: '',
        originalName: 'Original Name'
      });

      mockSessionManager.saveDeck.mockResolvedValue({ success: true });

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo: deckWithoutName,
        lastUsedDno,
        initializeDisplayOrder: () => {},
        clearHistory: () => {},
        captureDeckSnapshot: () => 'snapshot',
        savedDeckSnapshot
      });

      await persistence.saveDeck(100);

      const callArgs = mockSessionManager.saveDeck.mock.calls[0];
      expect(callArgs[1].name).toBe('Original Name');
    });

    it('デッキ名と originalName の両方がない場合、空文字を使用', async () => {
      const deckWithoutNames = ref<DeckInfo>({
        ...deckInfo.value,
        name: '',
        originalName: undefined as any
      });

      mockSessionManager.saveDeck.mockResolvedValue({ success: true });

      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo: deckWithoutNames,
        lastUsedDno,
        initializeDisplayOrder: () => {},
        clearHistory: () => {},
        captureDeckSnapshot: () => 'snapshot',
        savedDeckSnapshot
      });

      await persistence.saveDeck(100);

      const callArgs = mockSessionManager.saveDeck.mock.calls[0];
      expect(callArgs[1].name).toBe('');
    });
  });

  describe('Facade パターンの効果', () => {
    it('返り値は loadDeck と saveDeck のみ', () => {
      const persistence = useDeckPersistence({
        sessionManager: mockSessionManager,
        deckInfo,
        lastUsedDno,
        initializeDisplayOrder: () => {},
        clearHistory: () => {},
        captureDeckSnapshot: () => 'snapshot',
        savedDeckSnapshot
      });

      expect(persistence).toHaveProperty('loadDeck');
      expect(persistence).toHaveProperty('saveDeck');
      expect(Object.keys(persistence)).toHaveLength(2);
    });
  });
});
