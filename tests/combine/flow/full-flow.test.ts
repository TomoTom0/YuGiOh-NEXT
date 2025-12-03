import { describe, it, expect, beforeAll } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDeckEditStore } from '../../../src/stores/deck-edit';
import { getCardDetailWithCache } from '../../../src/api/card-search';
import { UnifiedCacheDB } from '../../../src/utils/unified-cache-db';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Flow: Full Data Flow', () => {
  beforeAll(async () => {
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

    // Init Pinia
    setActivePinia(createPinia());

    // Init Cache DB
    const db = new UnifiedCacheDB();
    await db.initialize();
    const { initUnifiedCacheDB } = await import('../../../src/utils/unified-cache-db');
    await initUnifiedCacheDB();
  });

  it('should correctly propagate card data through full flow', async () => {
    const deckStore = useDeckEditStore();
    const cardId = '4007';

    const result: any = await getCardDetailWithCache(cardId);

    expect(result).toBeDefined();
    expect(result.detail).toBeDefined();
    expect(result.detail.card).toBeDefined();

    expect(result.detail.card.ruby).toBe('ブルーアイズ・ホワイト・ドラゴン');

    // Simulate CardDetail.vue logic
    deckStore.selectedCard = result.detail.card;

    expect(deckStore.selectedCard).toBeDefined();
    expect(deckStore.selectedCard?.ruby).toBe('ブルーアイズ・ホワイト・ドラゴン');
  });
});
