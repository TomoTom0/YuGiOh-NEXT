import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getTempCacheDB,
  resetTempCacheDB,
  initTempCacheDBFromStorage,
  saveTempCacheDBToStorage,
  clearTempCacheDBStorage,
  recordDeckOpen,
  getCardTier,
  getCacheStats
} from '@/utils/temp-cache-db'
import type { CardInfo } from '@/types/card'

const { mockUnifiedDB, mockInitUnifiedCacheDB, mockSaveUnifiedCacheDB } = vi.hoisted(() => {
  const mockUnifiedDB = {
    isInitialized: vi.fn(() => true),
    setCardInfoFull: vi.fn(() => true),
    getCardInfo: vi.fn(),
    hasCardInfo: vi.fn(() => false),
    clearCardInfoCache: vi.fn(),
    recordDeckOpen: vi.fn(),
    getCardTier: vi.fn(() => 3),
    getStats: vi.fn(() => ({
      cardTierCount: 100,
      deckHistoryCount: 5,
      cardTableACount: 50,
      cardTableBCount: 60,
      productTableACount: 20,
      faqTableACount: 30
    })),
    clearAll: vi.fn(async () => {})
  }
  return {
    mockUnifiedDB,
    mockInitUnifiedCacheDB: vi.fn(async () => {}),
    mockSaveUnifiedCacheDB: vi.fn(async () => {})
  }
})

vi.mock('@/utils/unified-cache-db', () => ({
  getUnifiedCacheDB: () => mockUnifiedDB,
  initUnifiedCacheDB: mockInitUnifiedCacheDB,
  saveUnifiedCacheDB: mockSaveUnifiedCacheDB
}))

// Helper function to create test card
function createTestCard(
  cardId: string = '12345',
  name: string = 'Test Card',
  ciid: string = '1'
): CardInfo {
  return {
    name,
    cardId,
    ciid,
    lang: 'ja',
    imgs: [
      { ciid, imgHash: 'testhash1' },
      { ciid: '2', imgHash: 'testhash2' }
    ]
  }
}

describe('utils/temp-cache-db', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUnifiedDB.isInitialized.mockReturnValue(true)
    mockUnifiedDB.setCardInfoFull.mockReturnValue(true)
    mockUnifiedDB.getCardInfo.mockReturnValue(undefined)
    mockUnifiedDB.hasCardInfo.mockReturnValue(false)
    mockUnifiedDB.getCardTier.mockReturnValue(3)
    mockUnifiedDB.getStats.mockReturnValue({
      cardTierCount: 100,
      deckHistoryCount: 5,
      cardTableACount: 50,
      cardTableBCount: 60,
      productTableACount: 20,
      faqTableACount: 30
    })
    mockUnifiedDB.clearAll.mockResolvedValue(undefined)
    mockInitUnifiedCacheDB.mockResolvedValue(undefined)
    mockSaveUnifiedCacheDB.mockResolvedValue(undefined)
  })

  afterEach(() => {
    resetTempCacheDB()
  })

  describe('getTempCacheDB', () => {
    it('DBオブジェクトを返す [covers:get_temp_cache_db.returns_wrapper_object]', () => {
      const db = getTempCacheDB()
      expect(db).toBeDefined()
      expect(db.get).toBeInstanceOf(Function)
      expect(db.set).toBeInstanceOf(Function)
      expect(db.setAsync).toBeInstanceOf(Function)
      expect(db.has).toBeInstanceOf(Function)
    })
  })

  describe('resetTempCacheDB', () => {
    it('キャッシュをクリアする [covers:reset_temp_cache_db.clears_memory_cache]', () => {
      resetTempCacheDB()
      expect(mockUnifiedDB.clearCardInfoCache).toHaveBeenCalled()
    })
  })

  describe('TempCacheDB.get / set', () => {
    it('setでUnifiedCacheDB.setCardInfoFullを呼ぶ（初期化済み） [covers:temp_db.set_initialized_or_no_chrome_delegates]', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(true)
      const db = getTempCacheDB()
      const card = createTestCard()

      const result = db.set('1', card)

      expect(result).toBe(true)
      expect(mockUnifiedDB.setCardInfoFull).toHaveBeenCalledWith('1', card, false)
    })

    it('setAsyncで初期化済みなら初期化せず保存する [covers:with_init.already_initialized_or_no_chrome_runs_without_init] [covers:temp_db.set_async_delegates_after_with_init]', async () => {
      const db = getTempCacheDB()
      const card = createTestCard()

      const result = await db.setAsync('1', card, true)

      expect(result).toBe(true)
      expect(mockInitUnifiedCacheDB).not.toHaveBeenCalled()
      expect(mockUnifiedDB.setCardInfoFull).toHaveBeenCalledWith('1', card, true)
    })

    it('getでUnifiedCacheDB.getCardInfoを呼ぶ [covers:temp_db.get_delegates]', () => {
      mockUnifiedDB.getCardInfo.mockReturnValue(createTestCard('1', 'Test'))

      const db = getTempCacheDB()
      const result = db.get('1')

      expect(mockUnifiedDB.getCardInfo).toHaveBeenCalledWith('1')
      expect(result?.name).toBe('Test')
    })

    it('hasでUnifiedCacheDB.hasCardInfoを呼ぶ [covers:temp_db.has_delegates]', () => {
      mockUnifiedDB.hasCardInfo.mockReturnValue(true)

      const db = getTempCacheDB()
      const result = db.has('1')

      expect(mockUnifiedDB.hasCardInfo).toHaveBeenCalledWith('1')
      expect(result).toBe(true)
    })

    it('set()未初期化時にconsole.warnを出力し、非同期で初期化を試みる [covers:temp_db.set_uninitialized_chrome_warns_init_async_returns_false]', async () => {
      // chrome.storage.localをモック
      const originalChrome = global.chrome
      global.chrome = {
        storage: {
          local: {}
        }
      } as unknown as typeof chrome

      // 未初期化状態を設定
      mockUnifiedDB.isInitialized.mockReturnValue(false)

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const db = getTempCacheDB()
      const card = createTestCard()

      // set()を呼び出す（同期処理としてはfalseを返す）
      const result = db.set('1', card)

      // 即座にfalseを返す
      expect(result).toBe(false)
      expect(mockInitUnifiedCacheDB).toHaveBeenCalledTimes(1)
      // console.warnが呼ばれる
      expect(warnSpy).toHaveBeenCalledWith(
        '[TempCacheDB] set() called before initialization, data may be lost. Use setAsync() instead.'
      )

      // 非同期処理が完了するのを待つ
      await vi.waitFor(() => {
        expect(mockUnifiedDB.setCardInfoFull).toHaveBeenCalledWith('1', card, false)
      })

      // クリーンアップ
      global.chrome = originalChrome
      warnSpy.mockRestore()
    })

    it('set()未初期化時の非同期初期化rejectは握りつぶされる [covers:temp_db.set_uninitialized_init_reject_ignored]', async () => {
      vi.resetModules()
      mockUnifiedDB.isInitialized.mockReturnValue(false)
      mockUnifiedDB.setCardInfoFull.mockClear()
      mockInitUnifiedCacheDB.mockRejectedValueOnce(new Error('init failed'))

      const originalChrome = global.chrome
      global.chrome = {
        storage: {
          local: {}
        }
      } as unknown as typeof chrome
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { getTempCacheDB: getFreshTempCacheDB } = await import('@/utils/temp-cache-db')
      const db = getFreshTempCacheDB()
      const card = createTestCard()

      const result = db.set('1', card)
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(result).toBe(false)
      expect(mockInitUnifiedCacheDB).toHaveBeenCalledTimes(1)
      expect(mockUnifiedDB.setCardInfoFull).not.toHaveBeenCalled()

      global.chrome = originalChrome
      warnSpy.mockRestore()
    })

    it('setAsync()未初期化時に初期化を待機してから保存 [covers:temp_db.set_async_delegates_after_with_init]', async () => {
      // chrome.storage.localをモック
      const originalChrome = global.chrome
      global.chrome = {
        storage: {
          local: {}
        }
      } as unknown as typeof chrome

      // 未初期化状態を設定
      mockUnifiedDB.isInitialized.mockReturnValue(false)

      const db = getTempCacheDB()
      const card = createTestCard()

      // setAsync()を呼び出す
      const result = await db.setAsync('1', card, true)

      // 初期化後にsetCardInfoFullが呼ばれる
      expect(result).toBe(true)
      expect(mockUnifiedDB.setCardInfoFull).toHaveBeenCalledWith('1', card, true)

      // クリーンアップ
      global.chrome = originalChrome
    })

    it('setAsync()未初期化かつinitPromise未作成時は初期化を1回だけ開始してから保存する [covers:with_init.chrome_storage_uninitialized_initializes_once_then_runs]', async () => {
      vi.resetModules()
      mockInitUnifiedCacheDB.mockClear()
      mockUnifiedDB.setCardInfoFull.mockClear()
      mockUnifiedDB.isInitialized.mockReturnValue(false)

      const originalChrome = global.chrome
      global.chrome = {
        storage: {
          local: {}
        }
      } as unknown as typeof chrome

      const { getTempCacheDB: getFreshTempCacheDB } = await import('@/utils/temp-cache-db')
      const db = getFreshTempCacheDB()
      const card = createTestCard()

      const result = await db.setAsync('1', card, true)

      expect(result).toBe(true)
      expect(mockInitUnifiedCacheDB).toHaveBeenCalledTimes(1)
      expect(mockUnifiedDB.setCardInfoFull).toHaveBeenCalledWith('1', card, true)

      global.chrome = originalChrome
    })
  })

  describe('TempCacheDB.getImageHash', () => {
    it('指定されたカードの画像ハッシュを取得 [covers:temp_db.get_image_hash.ciid_match_or_missing]', () => {
      mockUnifiedDB.getCardInfo.mockReturnValue(createTestCard('1', 'Test', '1'))

      const db = getTempCacheDB()
      const hash1 = db.getImageHash('1', '1')
      expect(hash1).toBe('testhash1')

      const hash2 = db.getImageHash('1', '2')
      expect(hash2).toBe('testhash2')
    })

    it('存在しないカードはundefinedを返す [covers:temp_db.get_image_hash.card_missing_undefined]', () => {
      mockUnifiedDB.getCardInfo.mockReturnValue(undefined)

      const db = getTempCacheDB()
      expect(db.getImageHash('nonexistent', '1')).toBeUndefined()
    })

    it('存在しない画像IDはundefinedを返す [covers:temp_db.get_image_hash.ciid_match_or_missing]', () => {
      mockUnifiedDB.getCardInfo.mockReturnValue(createTestCard('1'))

      const db = getTempCacheDB()
      expect(db.getImageHash('1', '999')).toBeUndefined()
    })
  })

  describe('TempCacheDB.setMany', () => {
    it('複数のカードを一括登録 [covers:temp_db.set_many_delegates_each]', () => {
      const db = getTempCacheDB()
      const cards: Array<[string, CardInfo]> = [
        ['1', createTestCard('1', 'Card 1')],
        ['2', createTestCard('2', 'Card 2')],
        ['3', createTestCard('3', 'Card 3')]
      ]

      db.setMany(cards, true)

      expect(mockUnifiedDB.setCardInfoFull).toHaveBeenCalledTimes(3)
      expect(mockUnifiedDB.setCardInfoFull).toHaveBeenNthCalledWith(1, '1', cards[0][1], true)
      expect(mockUnifiedDB.setCardInfoFull).toHaveBeenNthCalledWith(2, '2', cards[1][1], true)
      expect(mockUnifiedDB.setCardInfoFull).toHaveBeenNthCalledWith(3, '3', cards[2][1], true)
    })
  })

  describe('TempCacheDB compatibility methods', () => {
    it('delete/size/keys/values/entries/toMapは未実装の互換戻り値を返す [covers:temp_db.delete_unimplemented_false] [covers:temp_db.size_unimplemented_zero] [covers:temp_db.keys_unimplemented_empty_iterator] [covers:temp_db.values_unimplemented_empty_generator] [covers:temp_db.entries_unimplemented_empty_generator] [covers:temp_db.to_map_unimplemented_empty]', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const db = getTempCacheDB()

      expect(db.delete('1')).toBe(false)
      expect(db.size).toBe(0)
      expect(Array.from(db.keys())).toEqual([])
      expect(Array.from(db.values())).toEqual([])
      expect(Array.from(db.entries())).toEqual([])
      expect(db.toMap()).toEqual(new Map())
      expect(warnSpy).toHaveBeenCalledTimes(6)

      warnSpy.mockRestore()
    })

    it('clearはメモリ上のカード情報キャッシュをクリアする [covers:temp_db.clear_delegates]', () => {
      const db = getTempCacheDB()

      db.clear()

      expect(mockUnifiedDB.clearCardInfoCache).toHaveBeenCalled()
    })
  })

  describe('TempCacheDB.saveToStorage / loadFromStorage / clearStorage', () => {
    it('saveToStorage()はUnifiedCacheDBに保存 [covers:temp_db.save_to_storage_delegates]', async () => {
      const db = getTempCacheDB()

      await db.saveToStorage()

      expect(mockSaveUnifiedCacheDB).toHaveBeenCalledTimes(1)
    })

    it('loadFromStorage()はUnifiedCacheDBを初期化し0を返す [covers:temp_db.load_from_storage_init_returns_zero]', async () => {
      const db = getTempCacheDB()
      const count = await db.loadFromStorage()

      expect(mockInitUnifiedCacheDB).toHaveBeenCalledTimes(1)
      expect(count).toBe(0)
    })

    it('clearStorage()はUnifiedCacheDBをクリア [covers:temp_db.clear_storage_clear_all_then_memory]', async () => {
      const db = getTempCacheDB()
      await db.clearStorage()

      expect(mockUnifiedDB.clearAll).toHaveBeenCalled()
      expect(mockUnifiedDB.clearCardInfoCache).toHaveBeenCalled()
    })
  })

  describe('initTempCacheDBFromStorage', () => {
    it('UnifiedCacheDBを初期化し0を返す [covers:init_temp_cache_db_from_storage.init_returns_zero]', async () => {
      const count = await initTempCacheDBFromStorage()

      expect(mockInitUnifiedCacheDB).toHaveBeenCalledTimes(1)
      expect(count).toBe(0)
    })
  })

  describe('saveTempCacheDBToStorage', () => {
    it('UnifiedCacheDBに保存 [covers:save_temp_cache_db_to_storage.delegates]', async () => {
      await saveTempCacheDBToStorage()
      expect(mockSaveUnifiedCacheDB).toHaveBeenCalledTimes(1)
    })
  })

  describe('clearTempCacheDBStorage', () => {
    it('UnifiedCacheDBをクリア [covers:clear_temp_cache_db_storage.clear_all_then_memory]', async () => {
      await clearTempCacheDBStorage()

      expect(mockUnifiedDB.clearAll).toHaveBeenCalled()
      expect(mockUnifiedDB.clearCardInfoCache).toHaveBeenCalled()
    })
  })

  describe('recordDeckOpen', () => {
    it('UnifiedCacheDBにデッキオープンを記録 [covers:record_deck_open.initialized_delegates]', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(true)

      recordDeckOpen(1, ['card1', 'card2', 'card3'])

      expect(mockUnifiedDB.recordDeckOpen).toHaveBeenCalledWith(1, [
        'card1',
        'card2',
        'card3'
      ])
    })

    it('UnifiedCacheDBが初期化されていない場合は何もしない [covers:record_deck_open.uninitialized_noop]', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(false)

      recordDeckOpen(1, ['card1'])

      expect(mockUnifiedDB.recordDeckOpen).not.toHaveBeenCalled()
    })
  })

  describe('getCardTier', () => {
    it('UnifiedCacheDBからカードのTier値を取得 [covers:get_card_tier.initialized_delegates]', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(true)
      mockUnifiedDB.getCardTier.mockImplementation((cardId: string) => {
        return cardId === 'popular' ? 5 : 2
      })

      expect(getCardTier('popular')).toBe(5)
      expect(getCardTier('obscure')).toBe(2)
    })

    it('UnifiedCacheDBが初期化されていない場合は0を返す [covers:get_card_tier.uninitialized_zero]', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(false)

      expect(getCardTier('anycard')).toBe(0)
      expect(mockUnifiedDB.getCardTier).not.toHaveBeenCalled()
    })
  })

  describe('getCacheStats', () => {
    it('キャッシュ統計情報を取得 [covers:get_cache_stats.initialized_delegates]', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(true)
      const stats = {
        cardTierCount: 100,
        deckHistoryCount: 5,
        cardTableACount: 50,
        cardTableBCount: 60,
        productTableACount: 20,
        faqTableACount: 30
      }
      mockUnifiedDB.getStats.mockReturnValue(stats)

      const result = getCacheStats()
      expect(result).toEqual(stats)
    })

    it('UnifiedCacheDBが初期化されていない場合はnullを返す [covers:get_cache_stats.uninitialized_null]', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(false)

      expect(getCacheStats()).toBeNull()
      expect(mockUnifiedDB.getStats).not.toHaveBeenCalled()
    })
  })
})
