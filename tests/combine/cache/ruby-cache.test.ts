
import { UnifiedCacheDB } from '../../../src/utils/unified-cache-db';
import { CardInfo } from '../../../src/types/card';

// Mock chrome.storage.local
const storageMock = new Map<string, any>();
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

async function testRubyCache() {
    console.log('=== Testing Ruby Cache Persistence ===\n');

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

    console.log('Saving card with ruby:', ruby);
    await db.setCardInfo(card);

    console.log('Retrieving card info...');
    const retrieved = db.reconstructCardInfo(cardId);

    if (!retrieved) {
        console.error('ERROR: Failed to retrieve card info');
        process.exit(1);
    }

    console.log('Retrieved Name:', retrieved.name);
    console.log('Retrieved Ruby:', retrieved.ruby);

    if (retrieved.ruby !== ruby) {
        console.error(`ERROR: Expected ruby "${ruby}", got "${retrieved.ruby}"`);
        process.exit(1);
    } else {
        console.log('✓ Ruby correctly persisted in cache');
    }

    console.log('\n=== Test Passed ===');
}

testRubyCache().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
