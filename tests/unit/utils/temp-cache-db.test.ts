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

// Mock UnifiedCacheDB
const mockUnifiedDB = {
  isInitialized: vi.fn(() => true),
  setCardInfoFull: vi.fn(() => true),
  getCardInfo: vi.fn(),
  hasCardInfo: vi.fn(() => false),
  clearCardInfoCache: vi.fn(),
  recordDeckOpen: vi.fn(),
  getCardTier: vi.fn((cardId: string) => 3),
  getStats: vi.fn(() => ({
    cardTierCount: 100,
    deckHistoryCount: 5,
    cardTableACount: 50,
    cardTableBCount: 60,
    productTableACount: 20,
    faqTableACount: 30
  })),
  clearAll: vi.fn()
}

vi.mock('@/utils/unified-cache-db', () => ({
  getUnifiedCacheDB: () => mockUnifiedDB,
  initUnifiedCacheDB: vi.fn(async () => {}),
  saveUnifiedCacheDB: vi.fn(async () => {})
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
  })

  afterEach(() => {
    resetTempCacheDB()
  })

  describe('getTempCacheDB', () => {
    it('DBオブジェクトを返す', () => {
      const db = getTempCacheDB()
      expect(db).toBeDefined()
      expect(db.get).toBeInstanceOf(Function)
      expect(db.set).toBeInstanceOf(Function)
      expect(db.setAsync).toBeInstanceOf(Function)
      expect(db.has).toBeInstanceOf(Function)
    })
  })

  describe('resetTempCacheDB', () => {
    it('キャッシュをクリアする', () => {
      resetTempCacheDB()
      expect(mockUnifiedDB.clearCardInfoCache).toHaveBeenCalled()
    })
  })

  describe('TempCacheDB.get / set', () => {
    it('setでUnifiedCacheDB.setCardInfoFullを呼ぶ（初期化済み）', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(true)
      const db = getTempCacheDB()
      const card = createTestCard()

      db.set('1', card)

      expect(mockUnifiedDB.setCardInfoFull).toHaveBeenCalledWith('1', card, false)
    })

    it('setAsyncで初期化を待機してから保存', async () => {
      const db = getTempCacheDB()
      const card = createTestCard()

      await db.setAsync('1', card, true)

      expect(mockUnifiedDB.setCardInfoFull).toHaveBeenCalledWith('1', card, true)
    })

    it('getでUnifiedCacheDB.getCardInfoを呼ぶ', () => {
      mockUnifiedDB.getCardInfo.mockReturnValue(createTestCard('1', 'Test'))

      const db = getTempCacheDB()
      const result = db.get('1')

      expect(mockUnifiedDB.getCardInfo).toHaveBeenCalledWith('1')
      expect(result?.name).toBe('Test')
    })

    it('hasでUnifiedCacheDB.hasCardInfoを呼ぶ', () => {
      mockUnifiedDB.hasCardInfo.mockReturnValue(true)

      const db = getTempCacheDB()
      const result = db.has('1')

      expect(mockUnifiedDB.hasCardInfo).toHaveBeenCalledWith('1')
      expect(result).toBe(true)
    })

    it('set()未初期化時にconsole.warnを出力し、非同期で初期化を試みる', async () => {
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

    it('setAsync()未初期化時に初期化を待機してから保存', async () => {
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
      await db.setAsync('1', card, true)

      // 初期化後にsetCardInfoFullが呼ばれる
      expect(mockUnifiedDB.setCardInfoFull).toHaveBeenCalledWith('1', card, true)

      // クリーンアップ
      global.chrome = originalChrome
    })
  })

  describe('TempCacheDB.getImageHash', () => {
    it('指定されたカードの画像ハッシュを取得', () => {
      mockUnifiedDB.getCardInfo.mockReturnValue(createTestCard('1', 'Test', '1'))

      const db = getTempCacheDB()
      const hash1 = db.getImageHash('1', '1')
      expect(hash1).toBe('testhash1')

      const hash2 = db.getImageHash('1', '2')
      expect(hash2).toBe('testhash2')
    })

    it('存在しないカードはundefinedを返す', () => {
      mockUnifiedDB.getCardInfo.mockReturnValue(undefined)

      const db = getTempCacheDB()
      expect(db.getImageHash('nonexistent', '1')).toBeUndefined()
    })

    it('存在しない画像IDはundefinedを返す', () => {
      mockUnifiedDB.getCardInfo.mockReturnValue(createTestCard('1'))

      const db = getTempCacheDB()
      expect(db.getImageHash('1', '999')).toBeUndefined()
    })
  })

  describe('TempCacheDB.setMany', () => {
    it('複数のカードを一括登録', () => {
      const db = getTempCacheDB()
      const cards: Array<[string, CardInfo]> = [
        ['1', createTestCard('1', 'Card 1')],
        ['2', createTestCard('2', 'Card 2')],
        ['3', createTestCard('3', 'Card 3')]
      ]

      db.setMany(cards)

      expect(mockUnifiedDB.setCardInfoFull).toHaveBeenCalledTimes(3)
    })
  })

  describe('TempCacheDB.saveToStorage / loadFromStorage / clearStorage', () => {
    it('saveToStorage()はUnifiedCacheDBに保存', async () => {
      const db = getTempCacheDB()
      const card = createTestCard('1')

      db.set('1', card)
      await db.saveToStorage()

      // saveUnifiedCacheDBが呼ばれることを確認（モック経由）
    })

    it('loadFromStorage()はUnifiedCacheDBを初期化', async () => {
      const db = getTempCacheDB()
      const count = await db.loadFromStorage()

      expect(count).toBe(0)
    })

    it('clearStorage()はUnifiedCacheDBをクリア', async () => {
      const db = getTempCacheDB()
      await db.clearStorage()

      expect(mockUnifiedDB.clearAll).toHaveBeenCalled()
      expect(mockUnifiedDB.clearCardInfoCache).toHaveBeenCalled()
    })
  })

  describe('initTempCacheDBFromStorage', () => {
    it('UnifiedCacheDBを初期化', async () => {
      const count = await initTempCacheDBFromStorage()

      expect(count).toBe(0)
    })
  })

  describe('saveTempCacheDBToStorage', () => {
    it('UnifiedCacheDBに保存', async () => {
      await saveTempCacheDBToStorage()
      // saveUnifiedCacheDBが呼ばれることを確認
    })
  })

  describe('clearTempCacheDBStorage', () => {
    it('UnifiedCacheDBをクリア', async () => {
      await clearTempCacheDBStorage()

      expect(mockUnifiedDB.clearAll).toHaveBeenCalled()
      expect(mockUnifiedDB.clearCardInfoCache).toHaveBeenCalled()
    })
  })

  describe('recordDeckOpen', () => {
    it('UnifiedCacheDBにデッキオープンを記録', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(true)

      recordDeckOpen(1, ['card1', 'card2', 'card3'])

      expect(mockUnifiedDB.recordDeckOpen).toHaveBeenCalledWith(1, [
        'card1',
        'card2',
        'card3'
      ])
    })

    it('UnifiedCacheDBが初期化されていない場合は何もしない', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(false)

      recordDeckOpen(1, ['card1'])

      expect(mockUnifiedDB.recordDeckOpen).not.toHaveBeenCalled()
    })
  })

  describe('getCardTier', () => {
    it('UnifiedCacheDBからカードのTier値を取得', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(true)
      mockUnifiedDB.getCardTier.mockImplementation((cardId: string) => {
        return cardId === 'popular' ? 5 : 2
      })

      expect(getCardTier('popular')).toBe(5)
      expect(getCardTier('obscure')).toBe(2)
    })

    it('UnifiedCacheDBが初期化されていない場合は0を返す', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(false)

      expect(getCardTier('anycard')).toBe(0)
      expect(mockUnifiedDB.getCardTier).not.toHaveBeenCalled()
    })
  })

  describe('getCacheStats', () => {
    it('キャッシュ統計情報を取得', () => {
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

    it('UnifiedCacheDBが初期化されていない場合はnullを返す', () => {
      mockUnifiedDB.isInitialized.mockReturnValue(false)

      expect(getCacheStats()).toBeNull()
      expect(mockUnifiedDB.getStats).not.toHaveBeenCalled()
    })
  })
})
