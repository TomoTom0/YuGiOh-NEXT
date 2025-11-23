
import { createPinia, setActivePinia } from 'pinia';
import { useDeckEditStore } from '../../../src/stores/deck-edit';
import { getCardDetailWithCache } from '../../../src/api/card-search';
import { UnifiedCacheDB } from '../../../src/utils/unified-cache-db';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock window and document
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost/'
});
global.window = dom.window as any;
global.document = dom.window.document;
global.crypto = {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2)
} as any;
global.window.matchMedia = global.window.matchMedia || function () {
    return {
        matches: false,
        addListener: function () { },
        removeListener: function () { },
        addEventListener: function () { },
        removeEventListener: function () { }
    } as any;
};

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

// Mock fetch
const htmlPath = path.join(__dirname, '../../combine/data/card-detail-ruby.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

global.fetch = async (url: string | URL | Request) => {
    console.log('Mock fetch called for:', url.toString());
    if (url.toString().includes('cid=4007')) {
        return {
            ok: true,
            text: async () => html
        } as Response;
    }
    return {
        ok: false,
        status: 404,
        text: async () => ''
    } as Response;
};

// Mock DOMParser for fetchCardDetailDoc
global.DOMParser = new JSDOM().window.DOMParser;

async function testFullFlow() {
    console.log('=== Testing Full Data Flow ===\n');

    // Init Pinia
    setActivePinia(createPinia());
    const deckStore = useDeckEditStore();

    // Init Cache DB
    const db = new UnifiedCacheDB();
    await db.initialize();
    // Inject DB instance if possible, or rely on singleton if getCardDetailWithCache uses it.
    // getCardDetailWithCache uses unifiedDB singleton from unified-cache-db.ts.
    // We need to make sure the singleton is initialized.
    const { initUnifiedCacheDB } = await import('../../../src/utils/unified-cache-db');
    await initUnifiedCacheDB();

    const cardId = '4007';

    console.log('Fetching card detail...');
    const result: any = await getCardDetailWithCache(cardId);

    if (!result) {
        console.error('ERROR: getCardDetailWithCache returned null');
        process.exit(1);
    }

    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('Result keys:', Object.keys(result));

    if (!result.detail || !result.detail.card) {
        console.error('ERROR: result.detail.card is undefined');
        process.exit(1);
    }
    console.log('Result Name:', result.detail.card.name);
    console.log('Result Ruby:', result.detail.card.ruby);

    if (result.detail.card.ruby !== 'ブルーアイズ・ホワイト・ドラゴン') {
        console.error('ERROR: Ruby missing in API result');
        process.exit(1);
    }

    // Simulate CardDetail.vue logic
    console.log('Updating store...');
    deckStore.selectedCard = result.detail.card;

    console.log('Store Selected Card Name:', deckStore.selectedCard?.name);
    console.log('Store Selected Card Ruby:', deckStore.selectedCard?.ruby);

    if (deckStore.selectedCard?.ruby !== 'ブルーアイズ・ホワイト・ドラゴン') {
        console.error('ERROR: Ruby missing in Store');
        process.exit(1);
    }

    console.log('✓ Ruby correctly propagated to Store');
    console.log('\n=== Test Passed ===');
}

testFullFlow().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
