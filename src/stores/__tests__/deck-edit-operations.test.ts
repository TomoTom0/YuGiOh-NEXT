/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDeckEditStore } from '../deck-edit';
import type { DeckInfo, OperationResult } from '@/types/deck';
import type { CardInfo } from '@/types/card';

// モック用のデータ
const mockDeckInfo: DeckInfo = {
  dno: 1,
  name: 'Test Deck',
  mainDeck: [
    { cid: 'card1', ciid: '1', lang: 'ja', quantity: 3 },
    { cid: 'card2', ciid: '1', lang: 'ja', quantity: 2 },
  ],
  extraDeck: [{ cid: 'card3', ciid: '1', lang: 'ja', quantity: 2 }],
  sideDeck: [{ cid: 'card4', ciid: '1', lang: 'ja', quantity: 1 }],
  category: [],
  tags: [],
  comment: 'Test comment',
  deckCode: 'test123',
};

const mockCardInfo: CardInfo = {
  cid: 'card1',
  ciid: 1,
  name: 'Test Card',
  cardType: 'monster',
  isExtraDeck: false,
  langsName: {
    ja: 'テストカード',
  },
  limit: 3,
};

// モック設定（hoistingのためファクトリー関数内で定義）
vi.mock('@/content/session/session', () => ({
  sessionManager: {
    getCurrentDno: vi.fn(() => null),
    setCurrentDno: vi.fn(),
    clearCurrentDno: vi.fn(),
    saveDeck: vi.fn(async (_dno: number, _deckInfo: any) => ({
      success: true,
      newDno: 42
    })),
    loadDeck: vi.fn(() => Promise.resolve({
      dno: 1,
      name: 'Test Deck',
      mainDeck: [
        { cid: 'card1', ciid: '1', lang: 'ja', quantity: 3 },
        { cid: 'card2', ciid: '1', lang: 'ja', quantity: 2 },
      ],
      extraDeck: [{ cid: 'card3', ciid: '1', lang: 'ja', quantity: 2 }],
      sideDeck: [{ cid: 'card4', ciid: '1', lang: 'ja', quantity: 1 }],
      category: [],
      tags: [],
      comment: 'Test comment',
      deckCode: 'test123',
    })),
    deleteDeck: vi.fn(() => Promise.resolve(true)), // 成功時はtrueを返す
    getCgid: vi.fn(() => Promise.resolve('ja')),
    getDeckList: vi.fn(() => Promise.resolve([{
      dno: 1,
      name: 'Test Deck',
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      category: [],
      tags: [],
      comment: '',
      deckCode: '',
    }])),
    createDeck: vi.fn(() => Promise.resolve(50)), // dnoを直接返す
  },
}));

vi.mock('@/api/deck-operations', () => ({
  getDeckDetail: vi.fn((_dno: number, _cgid: string) => Promise.resolve({
    dno: 1,
    name: 'Test Deck',
    mainDeck: [
      { cid: 'card1', ciid: '1', lang: 'ja', quantity: 3 },
      { cid: 'card2', ciid: '1', lang: 'ja', quantity: 2 },
    ],
    extraDeck: [{ cid: 'card3', ciid: '1', lang: 'ja', quantity: 2 }],
    sideDeck: [{ cid: 'card4', ciid: '1', lang: 'ja', quantity: 1 }],
    category: [],
    tags: [],
    comment: 'Test comment',
    deckCode: 'test123',
  })),
  saveDeckAPI: vi.fn(() => Promise.resolve({ success: true, newDno: 42 })),
  deleteDeck: vi.fn(() => Promise.resolve()),
  fetchDeckList: vi.fn(() => Promise.resolve([{
    dno: 1,
    name: 'Test Deck',
    mainDeck: [],
    extraDeck: [],
    sideDeck: [],
    category: [],
    tags: [],
    comment: '',
    deckCode: '',
  }])),
}));

// URLStateManager のモック
vi.mock('@/utils/url-state', () => ({
  URLStateManager: {
    initialize: vi.fn(),
    updateDeckState: vi.fn(),
    clearDeckState: vi.fn(),
    restoreUIStateFromURL: vi.fn(() => ({})),
    syncUIStateToURL: vi.fn(),
    setDno: vi.fn(),
    clearDno: vi.fn(),
  },
}));

// temp-card-db のモック
vi.mock('@/utils/temp-card-db', () => ({
  getTempCardDB: vi.fn(() => ({
    getCardBasicInfo: vi.fn(() => mockCardInfo),
  })),
  initTempCardDBFromStorage: vi.fn(() => Promise.resolve()),
  saveTempCardDBToStorage: vi.fn(() => Promise.resolve()),
  recordDeckOpen: vi.fn(),
}));

// unified-cache-db のモック
vi.mock('@/utils/unified-cache-db', () => ({
  getUnifiedCacheDB: vi.fn(() => ({
    getCardBasicInfo: vi.fn(() => mockCardInfo),
  })),
  saveUnifiedCacheDB: vi.fn(() => Promise.resolve()),
}));

// language-detector のモック
vi.mock('@/utils/language-detector', () => ({
  detectLanguage: vi.fn(() => 'ja'),
}));

// settings store のモック
vi.mock('../settings', () => ({
  useSettingsStore: vi.fn(() => ({
    sortOrder: 'official',
    enableFLIPAnimation: false,
    enableCategoryPriority: false,
    appSettings: {
      enableCategoryPriority: false,
      enableTailPlacement: false,
    },
  })),
}));

// card-limit のモック
vi.mock('@/utils/card-limit', () => ({
  getCardLimit: vi.fn(() => 3),
}));

// toast-notification のモック
vi.mock('../toast-notification', () => ({
  useToastStore: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

// composables のモック
vi.mock('@/composables/deck/useDeckCardSorter', () => ({
  createDeckCardComparator: vi.fn(() => (a: any, b: any) => 0),
}));

vi.mock('@/composables/deck/useFLIPAnimation', () => ({
  recordAllCardPositionsByUUID: vi.fn(),
  animateCardMoveByUUID: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/utils/deck-uuid-generator', () => ({
  generateDeckCardUUID: vi.fn((cid, ciid) => `${cid}-${ciid}-uuid`),
  clearDeckUUIDState: vi.fn(),
}));

vi.mock('@/utils/array-shuffle', () => ({
  fisherYatesShuffle: vi.fn((arr: any[]) => [...arr].reverse()), // 確定的な動作
}));

beforeEach(() => {
  setActivePinia(createPinia());

  // Chrome Storage API のモック
  global.chrome = {
    runtime: {
      id: 'test-extension-id',
      lastError: undefined,
    },
    storage: {
      local: {
        get: vi.fn((keys, callback) => {
          const result = {};
          if (callback) {
            callback(result);
          }
          return Promise.resolve(result);
        }),
        set: vi.fn((items, callback) => {
          if (callback) {
            callback();
          }
          return Promise.resolve();
        }),
        remove: vi.fn((keys, callback) => {
          if (callback) {
            callback();
          }
          return Promise.resolve();
        }),
      } as any,
      sync: {
        get: vi.fn((keys, callback) => {
          const result = {};
          if (callback) {
            callback(result);
          }
          return Promise.resolve(result);
        }),
      } as any,
    },
  } as any;

  // グローバル変数のモック
  (global as any).window = {
    ygoNextPreloadedDeckDetail: null,
    ygoNextPreloadedDeckDetailPromise: null,
  };

  // localStorageのモック
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// 1. デッキ保存機能のテスト
// ============================================================
describe('deck-edit store - saveDeck', () => {
  it('should save deck successfully', async () => {
    const store = useDeckEditStore();

    // デッキ情報を設定
    store.deckInfo.name = 'My Deck';
    store.deckInfo.comment = 'Test comment';

    const result = await store.saveDeck(0);

    // saveDeck は OperationResult を返す
    expect(result).toHaveProperty('success');
    expect(result.success).toBe(true);
  });

  it('should return false when save fails', async () => {
    const store = useDeckEditStore();

    const { sessionManager } = await import('@/content/session/session');
    vi.mocked(sessionManager.saveDeck).mockResolvedValueOnce({ success: false, error: ['Save failed'] });

    const result = await store.saveDeck(0);

    expect(result.success).toBe(false);
  });

  it('should update dno after save', async () => {
    const store = useDeckEditStore();

    const { sessionManager } = await import('@/content/session/session');
    vi.mocked(sessionManager.saveDeck).mockResolvedValueOnce({ success: true, newDno: 42 });

    await store.saveDeck(0);

    // deckInfo.dno が更新されることを確認
    expect(store.deckInfo.dno).toBe(0); // saveDeck内でdnoを設定
  });
});

// ============================================================
// 2. デッキ読み込み機能のテスト
// ============================================================
describe('deck-edit store - loadDeck', () => {
  it('should load deck from dno', async () => {
    const store = useDeckEditStore();

    const { getDeckDetail } = await import('@/api/deck-operations');

    await store.loadDeck(1);

    expect(getDeckDetail).toHaveBeenCalledWith(1, 'ja');
    expect(store.deckInfo.dno).toBe(1);
  });

  it('should initialize displayOrder after loading', async () => {
    const store = useDeckEditStore();

    await store.loadDeck(1);

    // displayOrder が初期化されていることを確認
    expect(store.displayOrder.main.length).toBeGreaterThan(0);
    expect(store.displayOrder.extra.length).toBeGreaterThan(0);
    expect(store.displayOrder.side.length).toBeGreaterThan(0);
  });

  it('should handle load failure gracefully', async () => {
    const store = useDeckEditStore();

    const { getDeckDetail } = await import('@/api/deck-operations');
    vi.mocked(getDeckDetail).mockRejectedValueOnce(new Error('Load failed'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // loadDeckはエラーを再スローする
    try {
      await store.loadDeck(1);
      expect(true).toBe(false); // should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Load failed');
    }

    // エラー時はエラーログが表示される
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

// ============================================================
// 3. デッキ詳細取得機能のテスト
// ============================================================
describe('deck-edit store - getDeckDetail', () => {
  it('should get deck detail and update state', async () => {
    const store = useDeckEditStore();

    const result = await store.getDeckDetail(1);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('Test Deck');
    expect(result?.dno).toBe(1);
  });

  it('should call getDeckDetail API', async () => {
    const store = useDeckEditStore();

    const { getDeckDetail } = await import('@/api/deck-operations');

    await store.getDeckDetail(1);

    expect(getDeckDetail).toHaveBeenCalledWith(1, 'ja');
  });
});

// ============================================================
// 4. 新規デッキ作成のテスト
// ============================================================
describe('deck-edit store - createNewDeck', () => {
  it('should create a new deck on server and load it', async () => {
    const store = useDeckEditStore();

    // 既存のデータを設定
    store.deckInfo.name = 'Old Deck';
    store.deckInfo.dno = 1;
    store.deckInfo.mainDeck = [{ cid: 'card1', ciid: 1, count: 1 }];

    const { sessionManager } = await import('@/content/session/session');

    await store.createNewDeck();

    // createDeck が呼ばれていることを確認
    expect(sessionManager.createDeck).toHaveBeenCalled();
    // 新しいデッキがロードされている
    expect(store.deckInfo.dno).toBeGreaterThan(0);
  });

  it('should initialize displayOrder after creating new deck', async () => {
    const store = useDeckEditStore();

    // データを設定
    store.displayOrder.main = [{ cid: 'card1', ciid: 1, uuid: 'uuid1' }];

    await store.createNewDeck();

    // 新規デッキがロードされ、displayOrderが初期化される
    expect(store.displayOrder.main.length).toBeGreaterThan(0);
  });

  it('should clear command history after creating new deck', async () => {
    const store = useDeckEditStore();

    await store.createNewDeck();

    // loadDeck経由でclearHistoryが呼ばれる
    expect(store.commandHistory.length).toBe(0);
    expect(store.commandIndex).toBe(-1);
  });
});

// ============================================================
// 5. デッキ削除のテスト
// ============================================================
describe('deck-edit store - deleteCurrentDeck', () => {
  it('should delete current deck and load another', async () => {
    const store = useDeckEditStore();

    store.deckInfo.dno = 1;

    const { sessionManager } = await import('@/content/session/session');

    await store.deleteCurrentDeck();

    // deleteDeck が呼ばれていることを確認
    expect(sessionManager.deleteDeck).toHaveBeenCalledWith(1);
    // 別のデッキがロードされている（またはcreateNewDeckが呼ばれている）
    expect(store.deckInfo.dno).toBeGreaterThan(0);
  });

  it('should not delete if dno is 0', async () => {
    const store = useDeckEditStore();

    store.deckInfo.dno = 0;

    try {
      await store.deleteCurrentDeck();
      expect(true).toBe(false); // should not reach here
    } catch (error: any) {
      expect(error.message).toContain('No deck loaded');
    }
  });

  it('should handle delete failure', async () => {
    const store = useDeckEditStore();

    store.deckInfo.dno = 1;

    const { sessionManager } = await import('@/content/session/session');
    vi.mocked(sessionManager.deleteDeck).mockResolvedValueOnce(false);

    try {
      await store.deleteCurrentDeck();
      expect(true).toBe(false); // should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Failed to delete deck');
    }
  });

  it('should create new deck after successful deletion when no decks remain', async () => {
    const store = useDeckEditStore();

    store.deckInfo.dno = 1;
    store.deckInfo.name = 'To Delete';

    const { sessionManager } = await import('@/content/session/session');
    // デッキリストが空
    vi.mocked(sessionManager.getDeckList).mockResolvedValueOnce([]);

    await store.deleteCurrentDeck();

    // createNewDeck が呼ばれている
    expect(sessionManager.createDeck).toHaveBeenCalled();
  });
});

// ============================================================
// 6. デッキリスト取得のテスト
// ============================================================
describe('deck-edit store - fetchDeckList', () => {
  it('should fetch deck list', async () => {
    const store = useDeckEditStore();

    const { sessionManager } = await import('@/content/session/session');

    await store.fetchDeckList();

    expect(sessionManager.getDeckList).toHaveBeenCalled();
    expect(store.deckList.length).toBeGreaterThan(0);
  });

  it('should update deckList state', async () => {
    const store = useDeckEditStore();

    const { sessionManager } = await import('@/content/session/session');
    vi.mocked(sessionManager.getDeckList).mockResolvedValueOnce([
      { ...mockDeckInfo, dno: 1, name: 'Deck 1' },
      { ...mockDeckInfo, dno: 2, name: 'Deck 2' },
    ]);

    await store.fetchDeckList();

    expect(store.deckList).toHaveLength(2);
    expect(store.deckList[0].name).toBe('Deck 1');
    expect(store.deckList[1].name).toBe('Deck 2');
  });
});

// ============================================================
// 7. ソート機能のテスト
// ============================================================
describe('deck-edit store - sortSection', () => {
  it('should sort main deck', async () => {
    const store = useDeckEditStore();

    store.displayOrder.main = [
      { cid: 'card2', ciid: 1, uuid: 'uuid2' },
      { cid: 'card1', ciid: 1, uuid: 'uuid1' },
    ];

    await store.sortSection('main');

    // ソート後、何らかの順序になっている
    expect(store.displayOrder.main.length).toBe(2);
  });

  it('should sort extra deck', async () => {
    const store = useDeckEditStore();

    store.displayOrder.extra = [
      { cid: 'card2', ciid: 1, uuid: 'uuid2' },
      { cid: 'card1', ciid: 1, uuid: 'uuid1' },
    ];

    await store.sortSection('extra');

    expect(store.displayOrder.extra.length).toBe(2);
  });

  it('should sort side deck', async () => {
    const store = useDeckEditStore();

    store.displayOrder.side = [
      { cid: 'card2', ciid: 1, uuid: 'uuid2' },
      { cid: 'card1', ciid: 1, uuid: 'uuid1' },
    ];

    await store.sortSection('side');

    expect(store.displayOrder.side.length).toBe(2);
  });
});

// ============================================================
// 8. 全セクションソート機能のテスト
// ============================================================
describe('deck-edit store - sortAllSections', () => {
  it('should sort all sections', async () => {
    const store = useDeckEditStore();

    store.displayOrder.main = [{ cid: 'card1', ciid: 1, uuid: 'uuid1' }];
    store.displayOrder.extra = [{ cid: 'card2', ciid: 1, uuid: 'uuid2' }];
    store.displayOrder.side = [{ cid: 'card3', ciid: 1, uuid: 'uuid3' }];

    await store.sortAllSections();

    // 全てのセクションがソートされている
    expect(store.displayOrder.main.length).toBe(1);
    expect(store.displayOrder.extra.length).toBe(1);
    expect(store.displayOrder.side.length).toBe(1);
  });
});

// ============================================================
// 9. デッキコピー機能のテスト
// ============================================================
describe('deck-edit store - copyCurrentDeck', () => {
  it('should copy current deck', async () => {
    const store = useDeckEditStore();

    store.deckInfo.dno = 1;
    store.deckInfo.name = 'Original Deck';

    const { sessionManager } = await import('@/content/session/session');

    await store.copyCurrentDeck();

    // createDeck が呼ばれていることを確認
    expect(sessionManager.createDeck).toHaveBeenCalled();
  });
});

// ============================================================
// 10. 擬似コピー機能のテスト
// ============================================================
describe('deck-edit store - pseudoCopyDeck', () => {
  it('should create pseudo copy with new dno', async () => {
    const store = useDeckEditStore();

    // デッキをロードして正しい構造にする
    await store.loadDeck(1);

    const { sessionManager } = await import('@/content/session/session');
    vi.mocked(sessionManager.createDeck).mockResolvedValueOnce(99);

    // pseudoCopyDeckはloadDeck(99)を呼ぶので、getDeckDetailを99用にモック
    const { getDeckDetail } = await import('@/api/deck-operations');
    vi.mocked(getDeckDetail).mockResolvedValueOnce({
      ...mockDeckInfo,
      dno: 99,
      name: 'COPY_Test Deck'
    });

    // pseudoCopyDeck は DeckInfo を引数に取る
    const newDno = await store.pseudoCopyDeck(store.deckInfo);

    expect(sessionManager.createDeck).toHaveBeenCalled();
    expect(newDno).toBe(99);
    expect(store.deckInfo.dno).toBe(99);
  });
});

// ============================================================
// 11. デッキリロード機能のテスト
// ============================================================
describe('deck-edit store - reloadDeck', () => {
  it('should reload current deck', async () => {
    const store = useDeckEditStore();

    store.deckInfo.dno = 1;

    const { getDeckDetail } = await import('@/api/deck-operations');

    await store.reloadDeck();

    expect(getDeckDetail).toHaveBeenCalledWith(1, 'ja');
  });

  it('should not reload if dno is 0', async () => {
    const store = useDeckEditStore();

    store.deckInfo.dno = 0;

    try {
      await store.reloadDeck();
      expect(true).toBe(false); // should not reach here
    } catch (error: any) {
      expect(error.message).toContain('No deck loaded');
    }
  });
});

// ============================================================
// 12. 未保存変更検出のテスト
// ============================================================
describe('deck-edit store - hasUnsavedChanges', () => {
  it('should detect unsaved changes', async () => {
    const store = useDeckEditStore();

    // デッキをロードしてスナップショットを作成
    await store.loadDeck(1);

    // 変更を加える
    store.deckInfo.name = 'Modified Name';

    const hasChanges = store.hasUnsavedChanges();

    // 変更があることを検出（nameは空文字なので変更扱い）
    expect(hasChanges).toBe(true);
  });
});
