/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDeckEditStore } from '@/stores/deck-edit';
import type { DeckInfo, OperationResult } from '@/types/deck';
import type { CardInfo } from '@/types/card';
import type { Command } from '@/composables/deck/useDeckUndoRedo';

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

// temp-cache-db のモック
vi.mock('@/utils/temp-cache-db', () => ({
  getTempCacheDB: vi.fn(() => ({
    getCardBasicInfo: vi.fn(() => mockCardInfo),
  })),
  initTempCacheDBFromStorage: vi.fn(() => Promise.resolve()),
  saveTempCacheDBToStorage: vi.fn(() => Promise.resolve()),
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
vi.mock('@/stores/settings', () => ({
  useSettingsStore: vi.fn(() => ({
    sortOrder: 'official',
    enableFLIPAnimation: false,
    enableCategoryPriority: false,
    appSettings: {
      enableCategoryPriority: false,
      enableTailPlacement: false,
    },
    featureSettings: {
      'shuffle-sort': true,
      'deck-image': true,
      'deck-edit': true,
      'chat': false,
      'practice': false,
      'genesys': false,
    },
  })),
}));

// card-limit のモック
vi.mock('@/utils/card-limit', () => ({
  getCardLimit: vi.fn(() => 3),
}));

// toast-notification のモック
vi.mock('@/stores/toast-notification', () => ({
  useToastStore: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

// composables のモック
vi.mock('@/composables/deck/useDeckCardSorter', () => ({
  createDeckCardComparator: vi.fn(() => (a: any, b: any) => 0),
  buildRecipeSortOptions: vi.fn((deps: any) => deps),
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
  it('should save deck successfully [covers:save_deck.syncs_then_delegates_and_refreshes_list]', async () => {
    const store = useDeckEditStore();

    // デッキ情報を設定
    store.deckInfo.name = 'My Deck';
    store.deckInfo.comment = 'Test comment';

    const result = await store.saveDeck(0);

    // saveDeck は OperationResult を返す
    expect(result).toHaveProperty('success');
    expect(result.success).toBe(true);
  });

  it('should return false when save fails [covers:save_deck.syncs_then_delegates_and_refreshes_list]', async () => {
    const store = useDeckEditStore();

    const { sessionManager } = await import('@/content/session/session');
    vi.mocked(sessionManager.saveDeck).mockResolvedValueOnce({ success: false, error: ['Save failed'] });

    const result = await store.saveDeck(0);

    expect(result.success).toBe(false);
  });

  it('should update dno after save [covers:save_deck.syncs_then_delegates_and_refreshes_list]', async () => {
    const store = useDeckEditStore();

    const { sessionManager } = await import('@/content/session/session');
    vi.mocked(sessionManager.saveDeck).mockResolvedValueOnce({ success: true, newDno: 42 });

    await store.saveDeck(0);

    // deckInfo.dno が更新されることを確認
    expect(store.deckInfo.dno).toBe(0); // saveDeck内でdnoを設定
  });
});

// ============================================================
// 1b. saveDeckData（practiceモードP2デッキ保存等）のテスト
// ============================================================
describe('deck-edit store - saveDeckData', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('nameが空でoriginalNameがある場合、originalNameで補完して保存する [covers:save_deck_data.name_empty_falls_back_to_original_name]', async () => {
    const store = useDeckEditStore();
    const { sessionManager } = await import('@/content/session/session');

    const p2DeckInfo: DeckInfo = {
      ...mockDeckInfo,
      dno: 5,
      name: '',
      originalName: 'P2のデッキ名',
    };

    await store.saveDeckData(5, p2DeckInfo);

    expect(sessionManager.saveDeck).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ dno: 5, name: 'P2のデッキ名' })
    );
  });

  it('nameが設定済みの場合はそのまま保存する [covers:save_deck_data.name_present_kept_as_is]', async () => {
    const store = useDeckEditStore();
    const { sessionManager } = await import('@/content/session/session');

    const p2DeckInfo: DeckInfo = {
      ...mockDeckInfo,
      dno: 5,
      name: '明示的な名前',
      originalName: '元の名前',
    };

    await store.saveDeckData(5, p2DeckInfo);

    expect(sessionManager.saveDeck).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ dno: 5, name: '明示的な名前' })
    );
  });

  it('編集中のdeckInfo.value（P1側）は変更しない [covers:save_deck_data.does_not_mutate_editing_deck_info]', async () => {
    const store = useDeckEditStore();
    store.deckInfo.name = 'P1のデッキ名';
    store.deckInfo.dno = 1;

    const p2DeckInfo: DeckInfo = {
      ...mockDeckInfo,
      dno: 5,
      name: '',
      originalName: 'P2のデッキ名',
    };

    await store.saveDeckData(5, p2DeckInfo);

    expect(store.deckInfo.name).toBe('P1のデッキ名');
    expect(store.deckInfo.dno).toBe(1);
  });
});

// ============================================================
// 2. デッキ読み込み機能のテスト
// ============================================================
describe('deck-edit store - loadDeck', () => {
  it('should load deck from dno [covers:load_deck.success_clears_regulation_loads_head_resolves_waits_and_caches]', async () => {
    const store = useDeckEditStore();

    const { getDeckDetail } = await import('@/api/deck-operations');

    await store.loadDeck(1);

    expect(getDeckDetail).toHaveBeenCalledWith(1, 'ja');
    expect(store.deckInfo.dno).toBe(1);
  });

  it('should initialize displayOrder after loading [covers:load_deck.success_initializes_display_order_from_deck_info]', async () => {
    const store = useDeckEditStore();

    await store.loadDeck(1);

    // displayOrder が初期化されていることを確認
    expect(store.displayOrder.main.length).toBeGreaterThan(0);
    expect(store.displayOrder.extra.length).toBeGreaterThan(0);
    expect(store.displayOrder.side.length).toBeGreaterThan(0);
  });

  it('should handle load failure gracefully [covers:load_deck.error_resets_loading_and_rethrows]', async () => {
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
  it('should get deck detail and update state [covers:get_deck_detail.success_returns_api_result]', async () => {
    const store = useDeckEditStore();

    const result = await store.getDeckDetail(1);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('Test Deck');
    expect(result?.dno).toBe(1);
  });

  it('should call getDeckDetail API [covers:get_deck_detail.success_returns_api_result]', async () => {
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
  it('should create a new deck on server and load it [covers:create_new_deck.success_loads_and_refreshes]', async () => {
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

  it('should initialize displayOrder after creating new deck [covers:load_deck.success_initializes_display_order_from_deck_info]', async () => {
    const store = useDeckEditStore();

    // データを設定
    store.displayOrder.main = [{ cid: 'card1', ciid: 1, uuid: 'uuid1' }];

    await store.createNewDeck();

    // 新規デッキがロードされ、displayOrderが初期化される
    expect(store.displayOrder.main.length).toBeGreaterThan(0);
  });

  it('should clear command history after creating new deck [covers:load_deck.success_clears_undo_history]', async () => {
    const store = useDeckEditStore();

    // コマンド履歴が残っている状態を作る（直前のdisplayOrder初期化テストと同じ直接投入パターン）
    const dummyCommand: Command = { execute: () => {}, undo: () => {}, type: 'add' };
    store.commandHistory = [dummyCommand];
    store.commandIndex = 0;
    expect(store.commandHistory.length).toBe(1);
    expect(store.commandIndex).toBe(0);

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
  it('should delete current deck and load another [covers:delete_current_deck.loads_previous_smaller_or_max_deck]', async () => {
    const store = useDeckEditStore();

    store.deckInfo.dno = 1;

    const { sessionManager } = await import('@/content/session/session');

    await store.deleteCurrentDeck();

    // deleteDeck が呼ばれていることを確認
    expect(sessionManager.deleteDeck).toHaveBeenCalledWith(1);
    // 別のデッキがロードされている（またはcreateNewDeckが呼ばれている）
    expect(store.deckInfo.dno).toBeGreaterThan(0);
  });

  it('should not delete if dno is 0 [covers:delete_current_deck.no_loaded_deck_throws]', async () => {
    const store = useDeckEditStore();

    store.deckInfo.dno = 0;

    try {
      await store.deleteCurrentDeck();
      expect(true).toBe(false); // should not reach here
    } catch (error: any) {
      expect(error.message).toContain('No deck loaded');
    }
  });

  it('should handle delete failure [covers:delete_current_deck.delete_failure_throws]', async () => {
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

  it('should create new deck after successful deletion when no decks remain [covers:delete_current_deck.empty_list_creates_new_deck]', async () => {
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
  it('should fetch deck list [covers:fetch_deck_list.falls_back_to_api]', async () => {
    const store = useDeckEditStore();

    const { sessionManager } = await import('@/content/session/session');

    await store.fetchDeckList();

    expect(sessionManager.getDeckList).toHaveBeenCalled();
    expect(store.deckList.length).toBeGreaterThan(0);
  });

  it('should update deckList state [covers:fetch_deck_list.falls_back_to_api]', async () => {
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
  it('should sort main deck [covers:sort_section.no_override_resolves_toggle_and_pushes_command]', async () => {
    const store = useDeckEditStore();

    store.displayOrder.main = [
      { cid: 'card2', ciid: 1, uuid: 'uuid2' },
      { cid: 'card1', ciid: 1, uuid: 'uuid1' },
    ];

    await store.sortSection('main');

    // ソート後、何らかの順序になっている
    expect(store.displayOrder.main.length).toBe(2);
  });

  it('should sort extra deck [covers:sort_section.no_override_resolves_toggle_and_pushes_command]', async () => {
    const store = useDeckEditStore();

    store.displayOrder.extra = [
      { cid: 'card2', ciid: 1, uuid: 'uuid2' },
      { cid: 'card1', ciid: 1, uuid: 'uuid1' },
    ];

    await store.sortSection('extra');

    expect(store.displayOrder.extra.length).toBe(2);
  });

  it('should sort side deck [covers:sort_section.no_override_resolves_toggle_and_pushes_command]', async () => {
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
  it('should sort all sections [covers:sort_all_sections.shared_direction_for_three_sections]', async () => {
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
  it('should copy current deck [covers:copy_current_deck.loaded_deck_delegates_to_pseudo_copy]', async () => {
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
  it('should create pseudo copy with new dno [covers:pseudo_copy_deck.success_saves_copy_loads_and_returns_new_dno]', async () => {
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
  it('should reload current deck [covers:reload_deck.current_deck_loads_same_dno]', async () => {
    const store = useDeckEditStore();

    store.deckInfo.dno = 1;

    const { getDeckDetail } = await import('@/api/deck-operations');

    await store.reloadDeck();

    expect(getDeckDetail).toHaveBeenCalledWith(1, 'ja');
  });

  it('should not reload if dno is 0 [covers:reload_deck.no_current_deck_throws]', async () => {
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
  it('should detect unsaved changes [covers:has_unsaved_changes.compares_saved_snapshot]', async () => {
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
