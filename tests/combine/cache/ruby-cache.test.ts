import { describe, it, expect, beforeEach } from 'vitest';
import { UnifiedCacheDB } from '../../../src/utils/unified-cache-db';
import { CardInfo } from '../../../src/types/card';

// Mock chrome.storage.local
let storageMock = new Map<string, any>();
global.chrome = {
    storage: {
        local: {
            get: async (keys: string | string[] | null) => {
                if (keys === null) return Object.fromEntries(storageMock);
                if (typeof keys === 'string') {
                    return { [keys]: storageMock.get(keys) };
                }
                if (Array.isArray(keys)) {
                    const result: any = {};
                    keys.forEach(key => {
                        result[key] = storageMock.get(key);
                    });
                    return result;
                }
                return {};
            },
            set: async (items: { [key: string]: any }) => {
                Object.entries(items).forEach(([key, value]) => {
                    storageMock.set(key, value);
                });
            },
            remove: async (keys: string | string[]) => {
                if (typeof keys === 'string') {
                    storageMock.delete(keys);
                } else if (Array.isArray(keys)) {
                    keys.forEach(key => storageMock.delete(key));
                }
            }
        }
    }
} as any;

describe('Cache: Ruby Text Persistence', () => {
    beforeEach(() => {
        storageMock = new Map<string, any>();
    });

    it('should persist ruby text in cache', async () => {
        const db = new UnifiedCacheDB();
        await db.initialize();

        const cardId = '4007';
        const ruby = 'ブルーアイズ・ホワイト・ドラゴン';
        const card: CardInfo = {
            cardId,
            name: '青眼の白龍',
            ruby,
            ciid: '1',
            imgs: [{ ciid: '1', imgHash: 'hash' }],
            cardType: 'monster',
            attribute: 'light',
            levelType: 'level',
            levelValue: 8,
            race: 'dragon',
            types: ['normal'],
            atk: 3000,
            def: 2500,
            isExtraDeck: false
        };

        await db.setCardInfo(card);

        const retrieved = db.reconstructCardInfo(cardId);

        expect(retrieved).toBeDefined();
        expect(retrieved?.ruby).toBe(ruby);
    });
});
