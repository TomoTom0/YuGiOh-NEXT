import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getTempCardDB,
  resetTempCardDB,
  initTempCardDBFromStorage,
  saveTempCardDBToStorage,
  clearTempCardDBStorage,
  recordDeckOpen,
  getCardTier,
  getCacheStats
} from '@/utils/temp-card-db'
import type { CardInfo } from '@/types/card'

// Mock UnifiedCacheDB
vi.mock('@/utils/unified-cache-db', () => {
  const mockUnifiedDB = {
    isInitialized: vi.fn(() => true),
    setCardInfo: vi.fn(),
    getAllCardInfos: vi.fn(() => new Map()),
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

  return {
    getUnifiedCacheDB: vi.fn(() => mockUnifiedDB),
    initUnifiedCacheDB: vi.fn(async () => {}),
    saveUnifiedCacheDB: vi.fn(async () => {}),
    mockUnifiedDB
  }
})

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

describe('utils/temp-card-db', () => {
  beforeEach(() => {
    resetTempCardDB()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetTempCardDB()
  })

  describe('getTempCardDB', () => {
    it('シングルトンインスタンスを返す', () => {
      const db1 = getTempCardDB()
      const db2 = getTempCardDB()
      expect(db1).toBe(db2)
    })

    it('初期状態でサイズ0である', () => {
      const db = getTempCardDB()
      expect(db.size).toBe(0)
    })
  })

  describe('resetTempCardDB', () => {
    it('インスタンスをリセットする', () => {
      const db1 = getTempCardDB()
      const card = createTestCard()
      db1.set('1', card)
      expect(db1.size).toBe(1)

      resetTempCardDB()
      const db2 = getTempCardDB()
      expect(db2.size).toBe(0)
      expect(db1).not.toBe(db2)
    })

    it('既存データをクリアしてから新しいインスタンスを作成', () => {
      const db = getTempCardDB()
      const card1 = createTestCard('1')
      const card2 = createTestCard('2')
      db.set('1', card1)
      db.set('2', card2)

      resetTempCardDB()
      const newDb = getTempCardDB()
      expect(newDb.size).toBe(0)
      expect(newDb.has('1')).toBe(false)
      expect(newDb.has('2')).toBe(false)
    })
  })

  describe('TempCardDB.get / set', () => {
    it('カード情報を設定して取得できる', () => {
      const db = getTempCardDB()
      const card = createTestCard()
      db.set('1', card)

      const retrieved = db.get('1')
      expect(retrieved).toEqual(card)
    })

    it('存在しないカードはundefinedを返す', () => {
      const db = getTempCardDB()
      expect(db.get('nonexistent')).toBeUndefined()
    })

    it('複数のカードを独立して管理できる', () => {
      const db = getTempCardDB()
      const card1 = createTestCard('1', 'Card 1')
      const card2 = createTestCard('2', 'Card 2')

      db.set('1', card1)
      db.set('2', card2)

      expect(db.get('1')).toEqual(card1)
      expect(db.get('2')).toEqual(card2)
    })

    it('キャッシュTTL内の場合は更新しない', () => {
      const db = getTempCardDB()
      db.setCacheTTL(1000) // 1秒

      const card1 = createTestCard('1', 'Original')
      const card2 = createTestCard('1', 'Updated')

      const result1 = db.set('1', card1)
      expect(result1).toBe(true)

      // TTL内で再度setすると更新されない
      const result2 = db.set('1', card2, false)
      expect(result2).toBe(false)
      expect(db.get('1')?.name).toBe('Original')
    })

    it('forceUpdate=trueの場合はTTLを無視して更新', () => {
      const db = getTempCardDB()
      db.setCacheTTL(1000)

      const card1 = createTestCard('1', 'Original')
      const card2 = createTestCard('1', 'Updated')

      db.set('1', card1)
      const result = db.set('1', card2, true)

      expect(result).toBe(true)
      expect(db.get('1')?.name).toBe('Updated')
    })

    it('TTL期限切れ後は更新できる', async () => {
      const db = getTempCardDB()
      db.setCacheTTL(10) // 10ms

      const card1 = createTestCard('1', 'Original')
      const card2 = createTestCard('1', 'Updated')

      db.set('1', card1)
      await new Promise(resolve => setTimeout(resolve, 20))

      const result = db.set('1', card2, false)
      expect(result).toBe(true)
      expect(db.get('1')?.name).toBe('Updated')
    })
  })

  describe('TempCardDB.has / delete', () => {
    it('カード存在確認ができる', () => {
      const db = getTempCardDB()
      const card = createTestCard()

      expect(db.has('1')).toBe(false)
      db.set('1', card)
      expect(db.has('1')).toBe(true)
    })

    it('カード削除ができる', () => {
      const db = getTempCardDB()
      const card = createTestCard()

      db.set('1', card)
      expect(db.has('1')).toBe(true)

      const deleted = db.delete('1')
      expect(deleted).toBe(true)
      expect(db.has('1')).toBe(false)
    })

    it('存在しないカード削除はfalseを返す', () => {
      const db = getTempCardDB()
      const result = db.delete('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('TempCardDB.clear', () => {
    it('全てのカードをクリアできる', () => {
      const db = getTempCardDB()
      const card1 = createTestCard('1', 'Card 1')
      const card2 = createTestCard('2', 'Card 2')

      db.set('1', card1)
      db.set('2', card2)
      expect(db.size).toBe(2)

      db.clear()
      expect(db.size).toBe(0)
      expect(db.has('1')).toBe(false)
      expect(db.has('2')).toBe(false)
    })
  })

  describe('TempCardDB.size', () => {
    it('保持するカード数を返す', () => {
      const db = getTempCardDB()
      expect(db.size).toBe(0)

      db.set('1', createTestCard('1'))
      expect(db.size).toBe(1)

      db.set('2', createTestCard('2'))
      expect(db.size).toBe(2)

      db.delete('1')
      expect(db.size).toBe(1)
    })
  })

  describe('TempCardDB.keys / values / entries', () => {
    it('keys()で全てのカードIDを取得', () => {
      const db = getTempCardDB()
      db.set('1', createTestCard('1'))
      db.set('2', createTestCard('2'))
      db.set('3', createTestCard('3'))

      const keys = Array.from(db.keys())
      expect(keys).toContain('1')
      expect(keys).toContain('2')
      expect(keys).toContain('3')
      expect(keys.length).toBe(3)
    })

    it('values()で全てのカード情報を取得', () => {
      const db = getTempCardDB()
      const card1 = createTestCard('1', 'Card 1')
      const card2 = createTestCard('2', 'Card 2')

      db.set('1', card1)
      db.set('2', card2)

      const values = Array.from(db.values())
      expect(values.length).toBe(2)
      expect(values).toContainEqual(card1)
      expect(values).toContainEqual(card2)
    })

    it('entries()で[cid, card]ペアを取得', () => {
      const db = getTempCardDB()
      const card1 = createTestCard('1', 'Card 1')
      const card2 = createTestCard('2', 'Card 2')

      db.set('1', card1)
      db.set('2', card2)

      const entries = Array.from(db.entries())
      expect(entries.length).toBe(2)
      expect(entries).toContainEqual(['1', card1])
      expect(entries).toContainEqual(['2', card2])
    })
  })

  describe('TempCardDB.getImageHash', () => {
    it('指定されたカードの画像ハッシュを取得', () => {
      const db = getTempCardDB()
      const card = createTestCard('1', 'Test', '1')
      db.set('1', card)

      const hash1 = db.getImageHash('1', '1')
      expect(hash1).toBe('testhash1')

      const hash2 = db.getImageHash('1', '2')
      expect(hash2).toBe('testhash2')
    })

    it('存在しないカードはundefinedを返す', () => {
      const db = getTempCardDB()
      expect(db.getImageHash('nonexistent', '1')).toBeUndefined()
    })

    it('存在しない画像IDはundefinedを返す', () => {
      const db = getTempCardDB()
      const card = createTestCard('1')
      db.set('1', card)

      expect(db.getImageHash('1', '999')).toBeUndefined()
    })
  })

  describe('TempCardDB.setMany', () => {
    it('複数のカードを一括登録', () => {
      const db = getTempCardDB()
      const cards: Array<[string, CardInfo]> = [
        ['1', createTestCard('1', 'Card 1')],
        ['2', createTestCard('2', 'Card 2')],
        ['3', createTestCard('3', 'Card 3')]
      ]

      db.setMany(cards)

      expect(db.size).toBe(3)
      expect(db.has('1')).toBe(true)
      expect(db.has('2')).toBe(true)
      expect(db.has('3')).toBe(true)
    })

    it('setMany()もTTL制御に従う', async () => {
      const db = getTempCardDB()
      db.setCacheTTL(10)

      const cards1: Array<[string, CardInfo]> = [
        ['1', createTestCard('1', 'Original')]
      ]

      db.setMany(cards1)
      await new Promise(resolve => setTimeout(resolve, 20))

      const cards2: Array<[string, CardInfo]> = [
        ['1', createTestCard('1', 'Updated')]
      ]

      db.setMany(cards2)
      expect(db.get('1')?.name).toBe('Updated')
    })
  })

  describe('TempCardDB.toMap', () => {
    it('Map形式でエクスポート', () => {
      const db = getTempCardDB()
      const card1 = createTestCard('1', 'Card 1')
      const card2 = createTestCard('2', 'Card 2')

      db.set('1', card1)
      db.set('2', card2)

      const map = db.toMap()
      expect(map).toBeInstanceOf(Map)
      expect(map.get('1')).toEqual(card1)
      expect(map.get('2')).toEqual(card2)
    })

    it('toMap()は独立したMapを返す', () => {
      const db = getTempCardDB()
      const card = createTestCard('1')
      db.set('1', card)

      const map = db.toMap()
      map.set('2', createTestCard('2'))

      expect(db.has('2')).toBe(false)
    })
  })

  describe('TempCardDB.saveToStorage / loadFromStorage / clearStorage', () => {
    it('saveToStorage()はUnifiedCacheDBに保存', async () => {
      const { saveUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      const db = getTempCardDB()
      const card = createTestCard('1')

      db.set('1', card)
      await db.saveToStorage()

      expect(saveUnifiedCacheDB).toHaveBeenCalled()
    })

    it('loadFromStorage()はUnifiedCacheDBから読み込む', async () => {
      const { initUnifiedCacheDB, getUnifiedCacheDB } = await import(
        '@/utils/unified-cache-db'
      )
      const mockCard = createTestCard('1', 'Loaded Card')

      vi.mocked(getUnifiedCacheDB).mockReturnValue({
        isInitialized: () => true,
        getAllCardInfos: () => new Map([['1', mockCard]]),
        setCardInfo: vi.fn(),
        recordDeckOpen: vi.fn(),
        getCardTier: vi.fn(),
        getStats: vi.fn(),
        clearAll: vi.fn()
      } as any)

      const db = getTempCardDB()
      const count = await db.loadFromStorage()

      expect(initUnifiedCacheDB).toHaveBeenCalled()
      expect(count).toBe(1)
      expect(db.get('1')).toEqual(mockCard)
    })

    it('clearStorage()はUnifiedCacheDBをクリア', async () => {
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      const db = getTempCardDB()

      const card = createTestCard('1')
      db.set('1', card)
      expect(db.size).toBe(1)

      const mockUnified = {
        isInitialized: () => true,
        clearAll: vi.fn(async () => {}),
        setCardInfo: vi.fn(),
        getAllCardInfos: () => new Map(),
        recordDeckOpen: vi.fn(),
        getCardTier: vi.fn(),
        getStats: vi.fn()
      }

      vi.mocked(getUnifiedCacheDB).mockReturnValue(mockUnified as any)

      await db.clearStorage()

      expect(mockUnified.clearAll).toHaveBeenCalled()
      expect(db.size).toBe(0)
    })

    it('loadFromStorageで読み込み失敗時は0を返す', async () => {
      const { initUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      vi.mocked(initUnifiedCacheDB).mockRejectedValue(new Error('Storage error'))

      const db = getTempCardDB()
      const count = await db.loadFromStorage()

      expect(count).toBe(0)
    })

    it('saveToStorageで保存失敗時はエラーをthrow', async () => {
      const { saveUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      vi.mocked(saveUnifiedCacheDB).mockRejectedValue(
        new Error('Save failed')
      )

      const db = getTempCardDB()
      const card = createTestCard('1')

      db.set('1', card)

      await expect(db.saveToStorage()).rejects.toThrow('Save failed')
    })

    it('clearStorageで削除失敗時はエラーをthrow', async () => {
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      const mockUnified = {
        isInitialized: () => true,
        clearAll: vi.fn(async () => {
          throw new Error('Clear failed')
        }),
        setCardInfo: vi.fn(),
        getAllCardInfos: () => new Map(),
        recordDeckOpen: vi.fn(),
        getCardTier: vi.fn(),
        getStats: vi.fn()
      }

      vi.mocked(getUnifiedCacheDB).mockReturnValue(mockUnified as any)

      const db = getTempCardDB()
      await expect(db.clearStorage()).rejects.toThrow('Clear failed')
    })
  })

  describe('initTempCardDBFromStorage', () => {
    it('ファイル関数としてloadFromStorageをコール', async () => {
      const { getUnifiedCacheDB, initUnifiedCacheDB } = await import(
        '@/utils/unified-cache-db'
      )
      const mockCard = createTestCard('1')

      vi.mocked(initUnifiedCacheDB).mockResolvedValue(undefined)
      vi.mocked(getUnifiedCacheDB).mockReturnValue({
        isInitialized: () => true,
        getAllCardInfos: () => new Map([['1', mockCard]]),
        setCardInfo: vi.fn(),
        recordDeckOpen: vi.fn(),
        getCardTier: vi.fn(),
        getStats: vi.fn(),
        clearAll: vi.fn()
      } as any)

      resetTempCardDB()
      const count = await initTempCardDBFromStorage()

      expect(count).toBe(1)
      expect(initUnifiedCacheDB).toHaveBeenCalled()
    })
  })

  describe('saveTempCardDBToStorage', () => {
    it('ファイル関数としてsaveToStorageをコール', async () => {
      const { saveUnifiedCacheDB } = await import('@/utils/unified-cache-db')

      // Reset the mock to not reject
      vi.mocked(saveUnifiedCacheDB).mockResolvedValue(undefined)

      const db = getTempCardDB()
      const card = createTestCard('1')

      db.set('1', card)
      await saveTempCardDBToStorage()

      expect(saveUnifiedCacheDB).toHaveBeenCalled()
    })
  })

  describe('clearTempCardDBStorage', () => {
    it('ファイル関数としてclearStorageをコール', async () => {
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      const db = getTempCardDB()

      const mockUnified = {
        isInitialized: () => true,
        clearAll: vi.fn(async () => {}),
        setCardInfo: vi.fn(),
        getAllCardInfos: () => new Map(),
        recordDeckOpen: vi.fn(),
        getCardTier: vi.fn(),
        getStats: vi.fn()
      }

      vi.mocked(getUnifiedCacheDB).mockReturnValue(mockUnified as any)

      db.set('1', createTestCard('1'))
      await clearTempCardDBStorage()

      expect(mockUnified.clearAll).toHaveBeenCalled()
      expect(db.size).toBe(0)
    })
  })

  describe('recordDeckOpen', () => {
    it('UnifiedCacheDBにデッキオープンを記録', async () => {
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      const mockUnified = {
        isInitialized: () => true,
        recordDeckOpen: vi.fn(),
        setCardInfo: vi.fn(),
        getAllCardInfos: () => new Map(),
        getCardTier: vi.fn(),
        getStats: vi.fn(),
        clearAll: vi.fn()
      }

      vi.mocked(getUnifiedCacheDB).mockReturnValue(mockUnified as any)

      recordDeckOpen(1, ['card1', 'card2', 'card3'])

      expect(mockUnified.recordDeckOpen).toHaveBeenCalledWith(1, [
        'card1',
        'card2',
        'card3'
      ])
    })

    it('UnifiedCacheDBが初期化されていない場合は何もしない', async () => {
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      const mockUnified = {
        isInitialized: () => false,
        recordDeckOpen: vi.fn(),
        setCardInfo: vi.fn(),
        getAllCardInfos: () => new Map(),
        getCardTier: vi.fn(),
        getStats: vi.fn(),
        clearAll: vi.fn()
      }

      vi.mocked(getUnifiedCacheDB).mockReturnValue(mockUnified as any)

      recordDeckOpen(1, ['card1'])

      expect(mockUnified.recordDeckOpen).not.toHaveBeenCalled()
    })
  })

  describe('getCardTier', () => {
    it('UnifiedCacheDBからカードのTier値を取得', async () => {
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      const mockUnified = {
        isInitialized: () => true,
        getCardTier: vi.fn((cardId: string) => {
          return cardId === 'popular' ? 5 : 2
        }),
        setCardInfo: vi.fn(),
        getAllCardInfos: () => new Map(),
        recordDeckOpen: vi.fn(),
        getStats: vi.fn(),
        clearAll: vi.fn()
      }

      vi.mocked(getUnifiedCacheDB).mockReturnValue(mockUnified as any)

      expect(getCardTier('popular')).toBe(5)
      expect(getCardTier('obscure')).toBe(2)
    })

    it('UnifiedCacheDBが初期化されていない場合は0を返す', async () => {
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      const mockUnified = {
        isInitialized: () => false,
        getCardTier: vi.fn(),
        setCardInfo: vi.fn(),
        getAllCardInfos: () => new Map(),
        recordDeckOpen: vi.fn(),
        getStats: vi.fn(),
        clearAll: vi.fn()
      }

      vi.mocked(getUnifiedCacheDB).mockReturnValue(mockUnified as any)

      expect(getCardTier('anycard')).toBe(0)
      expect(mockUnified.getCardTier).not.toHaveBeenCalled()
    })
  })

  describe('getCacheStats', () => {
    it('キャッシュ統計情報を取得', async () => {
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      const stats = {
        cardTierCount: 100,
        deckHistoryCount: 5,
        cardTableACount: 50,
        cardTableBCount: 60,
        productTableACount: 20,
        faqTableACount: 30
      }

      const mockUnified = {
        isInitialized: () => true,
        getStats: vi.fn(() => stats),
        setCardInfo: vi.fn(),
        getAllCardInfos: () => new Map(),
        recordDeckOpen: vi.fn(),
        getCardTier: vi.fn(),
        clearAll: vi.fn()
      }

      vi.mocked(getUnifiedCacheDB).mockReturnValue(mockUnified as any)

      const result = getCacheStats()
      expect(result).toEqual(stats)
    })

    it('UnifiedCacheDBが初期化されていない場合はnullを返す', async () => {
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      const mockUnified = {
        isInitialized: () => false,
        getStats: vi.fn(),
        setCardInfo: vi.fn(),
        getAllCardInfos: () => new Map(),
        recordDeckOpen: vi.fn(),
        getCardTier: vi.fn(),
        clearAll: vi.fn()
      }

      vi.mocked(getUnifiedCacheDB).mockReturnValue(mockUnified as any)

      expect(getCacheStats()).toBeNull()
      expect(mockUnified.getStats).not.toHaveBeenCalled()
    })
  })

  describe('TempCardDB with UnifiedCacheDB integration', () => {
    it('set()でUnifiedCacheDBにもカードを登録', async () => {
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      const mockUnified = {
        isInitialized: () => true,
        setCardInfo: vi.fn(),
        setCardTier: vi.fn(),
        getAllCardInfos: () => new Map(),
        recordDeckOpen: vi.fn(),
        getCardTier: vi.fn(),
        getStats: vi.fn(),
        clearAll: vi.fn()
      }

      vi.mocked(getUnifiedCacheDB).mockReturnValue(mockUnified as any)

      const db = getTempCardDB()
      const card = createTestCard('1')

      db.set('1', card, false)

      expect(mockUnified.setCardInfo).toHaveBeenCalledWith(card, false)
    })

    it('set()でUnifiedCacheDBが初期化されていない場合はスキップ', async () => {
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db')
      const mockUnified = {
        isInitialized: () => false,
        setCardInfo: vi.fn(),
        getAllCardInfos: () => new Map(),
        recordDeckOpen: vi.fn(),
        getCardTier: vi.fn(),
        getStats: vi.fn(),
        clearAll: vi.fn()
      }

      vi.mocked(getUnifiedCacheDB).mockReturnValue(mockUnified as any)

      const db = getTempCardDB()
      const card = createTestCard('1')

      db.set('1', card)

      expect(mockUnified.setCardInfo).not.toHaveBeenCalled()
    })
  })

  describe('setCacheTTL', () => {
    it('キャッシュTTLを変更できる', () => {
      const db = getTempCardDB()
      db.setCacheTTL(5000)

      const card1 = createTestCard('1', 'Original')
      const card2 = createTestCard('1', 'Updated')

      db.set('1', card1)

      // 新しいTTL内で更新を試みる
      const result = db.set('1', card2)
      expect(result).toBe(false)
      expect(db.get('1')?.name).toBe('Original')
    })

    it('TTLを0に設定すると常に更新される', () => {
      const db = getTempCardDB()
      db.setCacheTTL(0)

      const card1 = createTestCard('1', 'Original')
      const card2 = createTestCard('1', 'Updated')

      db.set('1', card1)
      const result = db.set('1', card2)

      expect(result).toBe(true)
      expect(db.get('1')?.name).toBe('Updated')
    })
  })
})
