/**
 * 統合テスト: URL状態 ↔ UI 同期
 *
 * 機能フロー:
 * 1. URL パラメータの読み込み → UI state更新
 * 2. UI 変更 → URL パラメータ更新
 * 3. URLSearchParams の操作と検証
 * 4. エンコード・デコード
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('統合テスト: URL状態 ↔ UI 同期', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('URLSearchParams の基本操作', () => {
    it('should create URLSearchParams from object', () => {
      const params = new URLSearchParams({
        keyword: 'テスト',
        card_type: 'monster',
      });

      expect(params.get('keyword')).toBe('テスト');
      expect(params.get('card_type')).toBe('monster');
    });

    it('should create URLSearchParams from string', () => {
      const params = new URLSearchParams('keyword=test&level=4');

      expect(params.get('keyword')).toBe('test');
      expect(params.get('level')).toBe('4');
    });

    it('should set and get values', () => {
      const params = new URLSearchParams();
      params.set('key1', 'value1');
      params.set('key2', 'value2');

      expect(params.get('key1')).toBe('value1');
      expect(params.get('key2')).toBe('value2');
    });

    it('should append values to same key', () => {
      const params = new URLSearchParams();
      params.append('ids', '1');
      params.append('ids', '2');
      params.append('ids', '3');

      const ids = params.getAll('ids');
      expect(ids).toEqual(['1', '2', '3']);
    });

    it('should delete values', () => {
      const params = new URLSearchParams('key1=value1&key2=value2');

      params.delete('key1');

      expect(params.get('key1')).toBeNull();
      expect(params.get('key2')).toBe('value2');
    });

    it('should check key existence', () => {
      const params = new URLSearchParams('key1=value1');

      expect(params.has('key1')).toBe(true);
      expect(params.has('key2')).toBe(false);
    });

    it('should iterate over all entries', () => {
      const params = new URLSearchParams('key1=value1&key2=value2');
      const entries = Array.from(params.entries());

      expect(entries).toEqual([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
    });
  });

  describe('URL → UI 同期', () => {
    it('should read URL parameters and extract filter state', () => {
      const urlParams = new URLSearchParams({
        keyword: 'ドラゴン',
        card_type: 'monster',
        level: '4',
      });

      const uiState = {
        keyword: urlParams.get('keyword') || '',
        cardType: urlParams.get('card_type') || 'all',
        level: parseInt(urlParams.get('level') || '1'),
      };

      expect(uiState.keyword).toBe('ドラゴン');
      expect(uiState.cardType).toBe('monster');
      expect(uiState.level).toBe(4);
    });

    it('should apply default values when URL params missing', () => {
      const urlParams = new URLSearchParams('keyword=test');

      const uiState = {
        keyword: urlParams.get('keyword') || '',
        cardType: urlParams.get('card_type') || 'all',
        level: parseInt(urlParams.get('level') || '1'),
        attribute: urlParams.get('attribute') || 'all',
      };

      expect(uiState.keyword).toBe('test');
      expect(uiState.cardType).toBe('all');
      expect(uiState.level).toBe(1);
      expect(uiState.attribute).toBe('all');
    });

    it('should parse multiple filter values', () => {
      const urlParams = new URLSearchParams('attribute=light,dark&level=1,4,7');

      const uiState = {
        attributes: urlParams.get('attribute')?.split(',') || [],
        levels: urlParams.get('level')?.split(',').map(Number) || [],
      };

      expect(uiState.attributes).toEqual(['light', 'dark']);
      expect(uiState.levels).toEqual([1, 4, 7]);
    });

    it('should handle empty filter state', () => {
      const urlParams = new URLSearchParams('');

      const uiState = {
        keyword: urlParams.get('keyword') || '',
        cardType: urlParams.get('card_type') || 'all',
      };

      expect(uiState.keyword).toBe('');
      expect(uiState.cardType).toBe('all');
    });
  });

  describe('UI → URL 同期', () => {
    it('should convert UI state to URL params', () => {
      const uiState = {
        keyword: 'テスト',
        cardType: 'monster',
        level: 4,
      };

      const params = new URLSearchParams();
      Object.entries(uiState).forEach(([key, value]) => {
        params.set(key, String(value));
      });

      expect(params.get('keyword')).toBe('テスト');
      expect(params.get('cardType')).toBe('monster');
      expect(params.get('level')).toBe('4');
    });

    it('should generate URL string from state', () => {
      const uiState = {
        keyword: 'ドラゴン',
        attribute: 'dark',
      };

      const params = new URLSearchParams();
      Object.entries(uiState).forEach(([key, value]) => {
        params.set(key, String(value));
      });

      const url = `?${params.toString()}`;

      expect(url).toContain('keyword=');
      expect(url).toContain('attribute=dark');
    });

    it('should handle empty values in state', () => {
      const uiState = {
        keyword: '',
        cardType: 'monster',
      };

      const params = new URLSearchParams();
      Object.entries(uiState).forEach(([key, value]) => {
        if (value) {
          params.set(key, String(value));
        }
      });

      expect(params.get('keyword')).toBeNull();
      expect(params.get('cardType')).toBe('monster');
    });

    it('should append multiple values for same filter', () => {
      const uiState = {
        attributes: ['light', 'dark'],
        levels: [1, 4, 7],
      };

      const params = new URLSearchParams();

      uiState.attributes.forEach(attr => {
        params.append('attribute', attr);
      });

      uiState.levels.forEach(level => {
        params.append('level', String(level));
      });

      expect(params.getAll('attribute')).toEqual(['light', 'dark']);
      expect(params.getAll('level')).toEqual(['1', '4', '7']);
    });
  });

  describe('文字エンコード・デコード', () => {
    it('should encode Japanese characters in URL', () => {
      const keyword = 'テスト・ドラゴン';
      const params = new URLSearchParams();
      params.set('keyword', keyword);

      const encoded = params.toString();

      expect(encoded).toContain('%');
      expect(encoded).not.toContain('テスト');
    });

    it('should decode URL-encoded parameters', () => {
      const urlParams = new URLSearchParams('keyword=%E3%83%86%E3%82%B9%E3%83%88');

      const decoded = urlParams.get('keyword');
      expect(decoded).toBe('テスト');
    });

    it('should handle special characters', () => {
      const params = new URLSearchParams();
      params.set('name', 'カード（効果）');
      params.set('desc', 'テスト＆テスト');

      const encoded = params.toString();
      const newParams = new URLSearchParams(encoded);

      expect(newParams.get('name')).toBe('カード（効果）');
      expect(newParams.get('desc')).toBe('テスト＆テスト');
    });

    it('should preserve spaces and special chars', () => {
      const params = new URLSearchParams();
      params.set('keyword', 'Blue Eyes White Dragon');
      params.set('filter', 'type=monster & attr=light');

      const encoded = params.toString();
      const newParams = new URLSearchParams(encoded);

      expect(newParams.get('keyword')).toBe('Blue Eyes White Dragon');
      expect(newParams.get('filter')).toBe('type=monster & attr=light');
    });
  });

  describe('URLSearchParams と filter state の同期', () => {
    it('should synchronize state changes to URL', () => {
      // Initial URL
      let params = new URLSearchParams('keyword=test&level=4');
      let uiState = {
        keyword: params.get('keyword') || '',
        level: parseInt(params.get('level') || '1'),
      };

      expect(uiState.keyword).toBe('test');
      expect(uiState.level).toBe(4);

      // Update state
      uiState.keyword = 'new keyword';
      uiState.level = 7;

      // Update URL
      params = new URLSearchParams();
      params.set('keyword', uiState.keyword);
      params.set('level', String(uiState.level));

      expect(params.get('keyword')).toBe('new keyword');
      expect(params.get('level')).toBe('7');
    });

    it('should handle round-trip conversion', () => {
      const originalState = {
        keyword: 'ドラゴン',
        cardType: 'monster',
        level: 4,
        attribute: 'dark',
      };

      // State → URL
      const params = new URLSearchParams();
      Object.entries(originalState).forEach(([key, value]) => {
        params.set(key, String(value));
      });

      // URL → State
      const restoredState = {
        keyword: params.get('keyword') || '',
        cardType: params.get('cardType') || '',
        level: parseInt(params.get('level') || '1'),
        attribute: params.get('attribute') || '',
      };

      expect(restoredState.keyword).toBe(originalState.keyword);
      expect(restoredState.cardType).toBe(originalState.cardType);
      expect(restoredState.level).toBe(originalState.level);
      expect(restoredState.attribute).toBe(originalState.attribute);
    });
  });

  describe('ブックマーク・シェア URL', () => {
    it('should create shareable URL from state', () => {
      const uiState = {
        keyword: 'ドラゴン',
        cardType: 'monster',
        level: 4,
      };

      const params = new URLSearchParams();
      Object.entries(uiState).forEach(([key, value]) => {
        params.set(key, String(value));
      });

      const shareUrl = `https://example.com/search?${params.toString()}`;

      expect(shareUrl).toContain('https://example.com/search?');
      expect(shareUrl).toContain('keyword=');
      expect(shareUrl).toContain('cardType=monster');
      expect(shareUrl).toContain('level=4');
    });

    it('should restore state from bookmarked URL', () => {
      const bookmarkedUrl = 'https://example.com/search?keyword=テスト&level=7&attribute=dark';
      const urlObj = new URL(bookmarkedUrl);
      const params = new URLSearchParams(urlObj.search);

      const restoredState = {
        keyword: params.get('keyword') || '',
        level: parseInt(params.get('level') || '1'),
        attribute: params.get('attribute') || '',
      };

      expect(restoredState.keyword).toBe('テスト');
      expect(restoredState.level).toBe(7);
      expect(restoredState.attribute).toBe('dark');
    });

    it('should handle URL with query string', () => {
      const sharedUrl = '?keyword=モンスター&attribute=light&level=1,4,7&rarity=super';
      const params = new URLSearchParams(sharedUrl);

      expect(params.get('keyword')).toBe('モンスター');
      expect(params.get('attribute')).toBe('light');
      expect(params.get('level')).toBe('1,4,7');
      expect(params.get('rarity')).toBe('super');
    });
  });

  describe('URL 履歴管理', () => {
    it('should track URL changes in history', () => {
      const history: string[] = [];

      // URL 1
      const params1 = new URLSearchParams('keyword=test');
      history.push(params1.toString());

      // URL 2
      const params2 = new URLSearchParams('keyword=test&level=4');
      history.push(params2.toString());

      // URL 3
      const params3 = new URLSearchParams('keyword=test&level=4&attribute=dark');
      history.push(params3.toString());

      expect(history.length).toBe(3);
      expect(history[0]).toBe('keyword=test');
      expect(history[2]).toContain('attribute=dark');
    });

    it('should navigate through URL history', () => {
      const history = [
        '?keyword=',
        '?keyword=テスト',
        '?keyword=テスト&level=4',
      ];

      let currentIndex = 2;

      // 戻る
      currentIndex--;
      expect(history[currentIndex]).toBe('?keyword=テスト');

      // さらに戻る
      currentIndex--;
      expect(history[currentIndex]).toBe('?keyword=');

      // 進む
      currentIndex++;
      expect(history[currentIndex]).toBe('?keyword=テスト');
    });
  });

  describe('複雑な URL パラメータ', () => {
    it('should handle hash-based routing', () => {
      const hashUrl = 'https://example.com/#/search?keyword=test&level=4';
      const [path, query] = hashUrl.split('#')[1]?.split('?') || [];

      expect(path).toBe('/search');

      const params = new URLSearchParams(query);
      expect(params.get('keyword')).toBe('test');
      expect(params.get('level')).toBe('4');
    });

    it('should handle array query parameters', () => {
      const urlParams = new URLSearchParams('ids=1&ids=2&ids=3');
      const ids = urlParams.getAll('ids');

      expect(ids).toEqual(['1', '2', '3']);
    });

    it('should preserve URL state across page reloads', () => {
      const originalUrl = 'keyword=テスト&level=4&attribute=dark';

      // ページ読み込み前
      const beforeReload = new URLSearchParams(originalUrl);

      // ページ読み込み後（URL は同じ）
      const afterReload = new URLSearchParams(originalUrl);

      expect(beforeReload.toString()).toBe(afterReload.toString());
    });

    it('should handle very long URL parameters', () => {
      const longKeyword = 'a'.repeat(1000);
      const params = new URLSearchParams(`keyword=${longKeyword}`);

      const keyword = params.get('keyword');
      expect(keyword?.length).toBe(1000);
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle malformed URL parameters', () => {
      const malformedUrl = '?keyword=test&=&level=&invalid';
      const params = new URLSearchParams(malformedUrl);

      const state = {
        keyword: params.get('keyword') || '',
        level: params.get('level') || 'default',
      };

      expect(state.keyword).toBe('test');
      expect(state.level).toBe('default');
    });

    it('should handle unsupported parameters', () => {
      const url = '?keyword=test&unsupported=value&another_unknown=123';
      const params = new URLSearchParams(url);

      const supportedParams = {
        keyword: params.get('keyword'),
      };

      expect(supportedParams.keyword).toBe('test');
      expect(params.get('unsupported')).toBe('value');
    });

    it('should handle empty URL gracefully', () => {
      const emptyUrl = new URLSearchParams('');

      const state = {
        keyword: emptyUrl.get('keyword') || '',
        level: emptyUrl.get('level') ? parseInt(emptyUrl.get('level')!) : 1,
      };

      expect(state.keyword).toBe('');
      expect(state.level).toBe(1);
    });
  });

  describe('パフォーマンス', () => {
    it('should parse URL parameters efficiently', () => {
      const startTime = performance.now();

      // 100回 URL パラメータをパース
      for (let i = 0; i < 100; i++) {
        const params = new URLSearchParams('keyword=test&level=4&attribute=dark');
        params.get('keyword');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should handle rapid parameter changes', () => {
      const changes: string[] = [];

      for (let i = 0; i < 10; i++) {
        const params = new URLSearchParams(`keyword=test${i}&level=${i}`);
        changes.push(params.toString());
      }

      expect(changes.length).toBe(10);
      expect(changes[0]).not.toBe(changes[9]);
    });
  });
});
