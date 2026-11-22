/**
 * @vitest-environment happy-dom
 *
 * deck-edit store: initializeOnPageLoad と fetchDeckList のプリロード経路の
 * 条件テスト (TASK-489)。session / API / URL状態 / chrome storage /
 * デッキメタデータをモックし、公開APIの実挙動で検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const mockGetFromStorageLocal = vi.hoisted(() => vi.fn(async () => null as unknown));
const mockGetDno = vi.hoisted(() => vi.fn(() => null as number | null));
const mockRestoreUIState = vi.hoisted(() => vi.fn(() => ({}) as Record<string, unknown>));
const mockRestoreSettings = vi.hoisted(() => vi.fn(() => ({}) as Record<string, unknown>));
const mockGetDeckList = vi.hoisted(() => vi.fn(async () => [] as unknown[]));
const mockSettingsStore = vi.hoisted(() => ({
  appSettings: {
    enableCategoryPriority: false,
    enableHeadPlacement: false,
    enableTailPlacement: false,
    deckLevelSortOrder: 'toggle-desc',
    categoryPrioritySortMode: 'level',
  },
  tailPlacementCardIds: [] as string[],
  featureSettings: {
    'shuffle-sort': true,
    'deck-image': true,
    'deck-edit': true,
    chat: false,
    practice: false,
    genesys: false,
  } as Record<string, boolean>,
  cardLimitMode: 'regulation',
  sortOrder: 'release_desc',
  loadSettings: vi.fn(async () => {}),
  setTheme: vi.fn(),
  setLanguage: vi.fn(),
  applyTheme: vi.fn(),
  applyCardSize: vi.fn(),
}));

vi.mock('@/content/session/session', () => ({
  sessionManager: {
    getCurrentDno: vi.fn(() => null),
    setCurrentDno: vi.fn(),
    clearCurrentDno: vi.fn(),
    saveDeck: vi.fn(async () => ({ success: true, newDno: 42 })),
    loadDeck: vi.fn(async (dno: number) => ({
      dno,
      name: 'Loaded Deck',
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      category: [],
      tags: [],
      comment: '',
      deckCode: '',
    })),
    deleteDeck: vi.fn(async () => true),
    getCgid: vi.fn(async () => 'ja'),
    getDeckList: mockGetDeckList,
    createDeck: vi.fn(async () => 50),
    getDeckLikes: vi.fn(async () => 0),
    issueDeckCode: vi.fn(async () => ''),
  },
}));

vi.mock('@/api/deck-operations', () => ({
  getDeckDetail: vi.fn(async (dno: number) => ({
    dno,
    name: 'Loaded Deck',
    mainDeck: [{ cid: 'card1', ciid: '1', lang: 'ja', quantity: 1 }],
    extraDeck: [],
    sideDeck: [],
    category: [],
    tags: [],
    comment: '',
    deckCode: '',
  })),
  saveDeckAPI: vi.fn(async () => ({ success: true, newDno: 42 })),
  deleteDeck: vi.fn(async () => {}),
  fetchDeckList: vi.fn(async () => []),
}));

vi.mock('@/utils/url-state', () => ({
  URLStateManager: {
    initialize: vi.fn(),
    updateDeckState: vi.fn(),
    clearDeckState: vi.fn(),
    restoreUIStateFromURL: mockRestoreUIState,
    restoreSettingsFromURL: mockRestoreSettings,
    syncUIStateToURL: vi.fn(),
    getDno: mockGetDno,
    setDno: vi.fn(),
    clearDno: vi.fn(),
  },
}));

vi.mock('@/utils/chrome-storage-utils', () => ({
  getFromStorageLocal: mockGetFromStorageLocal,
  setToStorageLocal: vi.fn(async () => {}),
}));

vi.mock('@/utils/deck-metadata-loader', () => ({
  getDeckMetadata: vi.fn(async () => ({ categories: [] })),
  updateDeckMetadata: vi.fn(async () => ({ categories: [] })),
  isDeckMetadataStale: vi.fn(async () => false),
}));

vi.mock('@/utils/unified-cache-db', () => ({
  getUnifiedCacheDB: vi.fn(() => ({
    isInitialized: vi.fn(() => false),
    getValidCiidsForLang: vi.fn(() => [] as string[]),
    reconstructCardInfo: vi.fn(() => null),
    recordMove: vi.fn(),
    initialize: vi.fn(async () => {}),
  })),
  initUnifiedCacheDB: vi.fn(async () => {}),
  saveUnifiedCacheDB: vi.fn(async () => {}),
  resetUnifiedCacheDB: vi.fn(),
}));

const mockTempCards = vi.hoisted(() => new Map<string, unknown>());
vi.mock('@/utils/temp-cache-db', () => ({
  getTempCacheDB: vi.fn(() => ({
    get: vi.fn((cid: string) => mockTempCards.get(cid) ?? null),
    set: vi.fn((cid: string, card: unknown) => {
      mockTempCards.set(cid, card);
      return true;
    }),
    getCardInfo: vi.fn((cid: string) => mockTempCards.get(cid) ?? null),
    setCardInfo: vi.fn(),
  })),
  initTempCacheDBFromStorage: vi.fn(async () => {}),
  saveTempCacheDBToStorage: vi.fn(async () => {}),
  clearTempCacheDBStorage: vi.fn(),
  resetTempCacheDB: vi.fn(),
  recordDeckOpen: vi.fn(),
}));

vi.mock('@/stores/toast-notification', () => ({
  useToastStore: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

vi.mock('@/utils/language-detector', () => ({
  detectLanguage: vi.fn(() => 'ja'),
}));

vi.mock('@/utils/deck-cache', () => ({
  loadThumbnailCache: vi.fn(() => new Map()),
  loadDeckInfoCache: vi.fn(() => new Map()),
  updateDeckInfoAndThumbnailWithData: vi.fn(async () => {}),
  saveDeckListOrder: vi.fn(),
}));

vi.mock('@/utils/extension-context-checker', () => ({
  isExtensionContextValid: vi.fn(() => true),
  safeStorageGet: vi.fn(async () => ({})),
  safeStorageSet: vi.fn(async () => {}),
  safeStorageRemove: vi.fn(async () => {}),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: vi.fn(() => mockSettingsStore),
}));

import { useDeckEditStore } from '@/stores/deck-edit';

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  mockGetFromStorageLocal.mockReset().mockResolvedValue(null);
  mockGetDno.mockReset().mockReturnValue(null);
  mockRestoreUIState.mockReset().mockReturnValue({});
  mockRestoreSettings.mockReset().mockReturnValue({});
  mockGetDeckList.mockReset().mockResolvedValue([]);
  mockSettingsStore.loadSettings.mockClear();
  mockSettingsStore.setTheme.mockClear();
  mockSettingsStore.setLanguage.mockClear();
  mockTempCards.clear();
});

describe('deck-edit store - fetchDeckList preload (TASK-489)', () => {
  it('プリロード済みデッキリストがあればAPIではなくストレージから返す [covers:fetch-deck-list.uses-preloaded-storage-when-nonempty]', async () => {
    const preloaded = [{ dno: 9, name: 'Preloaded Deck' }];
    mockGetFromStorageLocal.mockResolvedValue(JSON.stringify({ deckList: preloaded }));
    const store = useDeckEditStore();

    const result = await store.fetchDeckList();

    expect(result).toEqual(preloaded);
    expect(store.deckList).toEqual(preloaded);
    expect(mockGetDeckList).not.toHaveBeenCalled();
  });
});

describe('deck-edit store - initializeOnPageLoad (TASK-489)', () => {
  it('対象dnoが無ければデッキを読み込まずに解決する [covers:initialize-on-page-load.no-target-dno-resolves]', async () => {
    const store = useDeckEditStore();

    await expect(store.initializeOnPageLoad()).resolves.toBeUndefined();
    expect(store.deckInfo.dno).toBe(0);
  });

  it('対象dnoがあればそのデッキを読み込んで返す [covers:initialize-on-page-load.target-dno-loads-deck]', async () => {
    mockGetDno.mockReturnValue(7);
    const store = useDeckEditStore();

    await store.initializeOnPageLoad();

    expect(store.deckInfo.dno).toBe(7);
  });

  it('URLのUI状態と設定を反映し、デッキリストを取得する [covers:initialize-on-page-load.restores-async-settings-and-deck-list]', async () => {
    mockRestoreUIState.mockReturnValue({ viewMode: 'grid', cardTab: 'qa', showDetail: false });
    mockRestoreSettings.mockReturnValue({ theme: 'dark', lang: 'en' });
    mockGetDeckList.mockResolvedValue([{ dno: 3, name: 'Listed Deck' }]);
    const store = useDeckEditStore();

    await store.initializeOnPageLoad();

    // 非同期IIFE側の初期化（設定復元・デッキリスト取得）の完了を待つ
    await vi.waitFor(() => {
      expect(store.deckList).toHaveLength(1);
    });
    expect(store.viewMode).toBe('grid');
    expect(store.cardTab).toBe('qa');
    expect(store.showDetail).toBe(false);
    expect(mockSettingsStore.setTheme).toHaveBeenCalledWith('dark');
    expect(mockSettingsStore.setLanguage).toHaveBeenCalledWith('en');
  });
});
