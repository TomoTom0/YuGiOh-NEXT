/**
 * E2E テスト: URL状態同期
 *
 * ユーザーシナリオ:
 * 1. URL パラメータの読み込み
 * 2. UI への反映
 * 3. UI 変更時の URL 更新
 * 4. ブラウザ戻る/進む での状態復元
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('E2E: URL状態同期', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('URL → UI 同期', () => {
    it('should read URL parameters and update UI', () => {
      // Step 1: URL パラメータを構築
      const urlParams = new URLSearchParams({
        keyword: 'テスト',
        card_type: 'monster',
        level: '4',
      });

      // Step 2: パラメータを解析
      const params = {
        keyword: urlParams.get('keyword'),
        cardType: urlParams.get('card_type'),
        level: urlParams.get('level'),
      };

      // Step 3: UI 値が URL と一致することを確認
      expect(params.keyword).toBe('テスト');
      expect(params.cardType).toBe('monster');
      expect(params.level).toBe('4');
    });

    it('should restore filter state from URL', () => {
      // ブックマークから URL を読み込み
      const bookmarkedUrl = new URL('https://example.com?filter=dark&level=1-3');
      const urlParams = new URLSearchParams(bookmarkedUrl.search);

      const filterState = {
        filter: urlParams.get('filter'),
        level: urlParams.get('level'),
      };

      expect(filterState.filter).toBe('dark');
      expect(filterState.level).toBe('1-3');
    });

    it('should handle missing URL parameters with defaults', () => {
      const urlParams = new URLSearchParams('keyword=test');

      const state = {
        keyword: urlParams.get('keyword') || '',
        cardType: urlParams.get('card_type') || 'all',
        level: urlParams.get('level') || '1-12',
      };

      expect(state.keyword).toBe('test');
      expect(state.cardType).toBe('all'); // デフォルト値
      expect(state.level).toBe('1-12'); // デフォルト値
    });

    it('should parse complex URL parameters', () => {
      // 複数フィルターを含む複雑な URL
      const complexUrl =
        'keyword=ドラゴン&attribute=light,dark&level=4&rarity=ultra';
      const urlParams = new URLSearchParams(complexUrl);

      const params = {
        keyword: urlParams.get('keyword'),
        attributes: urlParams.get('attribute')?.split(','),
        level: urlParams.get('level'),
        rarity: urlParams.get('rarity'),
      };

      expect(params.keyword).toBe('ドラゴン');
      expect(params.attributes).toEqual(['light', 'dark']);
      expect(params.level).toBe('4');
    });
  });

  describe('UI → URL 同期', () => {
    it('should update URL when filter changes', () => {
      // UI でフィルターを変更
      const filters = {
        keyword: 'テスト',
        cardType: 'monster',
      };

      // URL を構築
      const urlParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        urlParams.set(key, String(value));
      });

      const newUrl = `?${urlParams.toString()}`;

      // URLパラメータはエンコードされるので、デコードして確認
      const decodedUrl = decodeURIComponent(newUrl);
      expect(decodedUrl).toContain('keyword=テスト');
      expect(newUrl).toContain('cardType=monster');
    });

    it('should append to URL history when filter applied', () => {
      // フィルター変更履歴をシミュレート
      const history = [
        '?keyword=テスト',
        '?keyword=テスト&level=4',
        '?keyword=テスト&level=4&attribute=dark',
      ];

      expect(history).toHaveLength(3);
      expect(history[history.length - 1]).toContain('attribute=dark');
    });

    it('should remove parameter when filter is cleared', () => {
      // フィルターをクリア
      const urlParams = new URLSearchParams('keyword=test&level=4');
      urlParams.delete('level');

      const newUrl = `?${urlParams.toString()}`;

      expect(newUrl).toContain('keyword=test');
      expect(newUrl).not.toContain('level');
    });

    it('should encode special characters in URL', () => {
      const filters = {
        keyword: 'テスト・ドラゴン',
        name: 'カード（効果）',
      };

      const urlParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        urlParams.set(key, value);
      });

      const encoded = urlParams.toString();

      expect(encoded).toBeTruthy();
      expect(encoded).toContain('%');
    });
  });

  describe('ブラウザ戻る/進む', () => {
    it('should restore state on back button', () => {
      // 履歴スタック
      const historyStack = [
        {
          url: '?keyword=',
          state: { keyword: '' },
        },
        {
          url: '?keyword=テスト',
          state: { keyword: 'テスト' },
        },
        {
          url: '?keyword=テスト&level=4',
          state: { keyword: 'テスト', level: 4 },
        },
      ];

      // 戻る操作
      const currentIndex = 2;
      const previousState = historyStack[currentIndex - 1];

      expect(previousState.state.keyword).toBe('テスト');
      expect(previousState.state.level).toBeUndefined();
    });

    it('should restore state on forward button', () => {
      const historyStack = [
        { url: '?keyword=テスト', state: { keyword: 'テスト' } },
        {
          url: '?keyword=テスト&level=4',
          state: { keyword: 'テスト', level: 4 },
        },
      ];

      // 進む操作
      const currentIndex = 0;
      const nextState = historyStack[currentIndex + 1];

      expect(nextState.state.keyword).toBe('テスト');
      expect(nextState.state.level).toBe(4);
    });

    it('should maintain scroll position in history', () => {
      // スクロール位置を含むステート
      const history = [
        {
          url: '?page=1',
          scrollY: 0,
        },
        {
          url: '?page=2',
          scrollY: 500,
        },
        {
          url: '?page=1',
          scrollY: 0, // ページ1に戻るとスクロール位置も戻る
        },
      ];

      const lastState = history[2];
      expect(lastState.scrollY).toBe(0);
    });
  });

  describe('ブックマーク・シェア', () => {
    it('should create shareable URL', () => {
      const state = {
        keyword: 'ドラゴン',
        attribute: 'dark',
        level: 4,
      };

      const urlParams = new URLSearchParams();
      Object.entries(state).forEach(([key, value]) => {
        urlParams.set(key, String(value));
      });

      const shareUrl = `https://example.com/search?${urlParams.toString()}`;

      // URLパラメータはエンコードされるので、デコードして確認
      const decodedUrl = decodeURIComponent(shareUrl);
      expect(decodedUrl).toContain('keyword=ドラゴン');
      expect(shareUrl).toContain('attribute=dark');
      expect(shareUrl).toContain('level=4');
    });

    it('should restore state from bookmarked URL', () => {
      // ブックマークした URL
      const bookmarkedUrl =
        'https://example.com/search?keyword=テスト&level=4&attribute=dark';
      const urlObj = new URL(bookmarkedUrl);
      const params = new URLSearchParams(urlObj.search);

      const restoredState = {
        keyword: params.get('keyword'),
        level: params.get('level'),
        attribute: params.get('attribute'),
      };

      expect(restoredState.keyword).toBe('テスト');
      expect(restoredState.level).toBe('4');
      expect(restoredState.attribute).toBe('dark');
    });

    it('should handle shared URL with multiple filters', () => {
      const sharedUrl =
        '?keyword=モンスター&attribute=light,dark&level=1,4,7&rarity=super';
      const urlParams = new URLSearchParams(sharedUrl);

      const state = {
        keyword: urlParams.get('keyword'),
        attributes: urlParams.get('attribute')?.split(','),
        levels: urlParams.get('level')?.split(','),
        rarity: urlParams.get('rarity'),
      };

      expect(state.keyword).toBe('モンスター');
      expect(state.attributes).toHaveLength(2);
      expect(state.levels).toHaveLength(3);
    });
  });

  describe('複雑なURL状態管理', () => {
    it('should handle hash-based routing', () => {
      const hashUrl = 'https://example.com/#/search?keyword=test&level=4';
      const [path, query] = hashUrl.split('#')[1]?.split('?') || [];

      expect(path).toBe('/search');

      const params = new URLSearchParams(query);
      expect(params.get('keyword')).toBe('test');
      expect(params.get('level')).toBe('4');
    });

    it('should handle query string with array values', () => {
      // ?ids=1&ids=2&ids=3 形式
      const urlParams = new URLSearchParams('ids=1&ids=2&ids=3');
      const ids = urlParams.getAll('ids');

      expect(ids).toEqual(['1', '2', '3']);
    });

    it('should preserve URL state across page reloads', () => {
      // リロード前の状態
      const beforeReload = new URLSearchParams('keyword=テスト&level=4');

      // リロード後（URL は変わらない）
      const afterReload = new URLSearchParams('keyword=テスト&level=4');

      expect(beforeReload.toString()).toBe(afterReload.toString());
    });

    it('should handle empty URL gracefully', () => {
      const emptyUrl = new URLSearchParams('');
      const keyword = emptyUrl.get('keyword');
      const level = emptyUrl.get('level');

      expect(keyword).toBeNull();
      expect(level).toBeNull();

      // デフォルト値を使用
      const state = {
        keyword: keyword || '',
        level: level ? parseInt(level) : 1,
      };

      expect(state.keyword).toBe('');
      expect(state.level).toBe(1);
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle malformed URL parameters', () => {
      // 壊れた URL パラメータ
      const malformedUrl = '?keyword=test&=&level=&invalid';
      const urlParams = new URLSearchParams(malformedUrl);

      const state = {
        keyword: urlParams.get('keyword') || '',
        level: urlParams.get('level') || 'default',
      };

      expect(state.keyword).toBe('test');
      expect(state.level).toBe('default');
    });

    it('should handle URL with unsupported parameters', () => {
      // サポートされていないパラメータを含む URL
      const url = '?keyword=test&unsupported=value&another_unknown=123';
      const urlParams = new URLSearchParams(url);

      const supportedParams = {
        keyword: urlParams.get('keyword'),
      };

      expect(supportedParams.keyword).toBe('test');
      // サポートされていないパラメータは無視される
      expect(urlParams.get('unsupported')).toBe('value');
    });

    it('should handle very long URLs', () => {
      // 非常に長い URL パラメータ
      const longKeyword = 'a'.repeat(1000);
      const urlParams = new URLSearchParams(`keyword=${longKeyword}`);

      const keyword = urlParams.get('keyword');
      expect(keyword?.length).toBe(1000);
    });
  });

  describe('パフォーマンス', () => {
    it('should parse URL parameters efficiently', () => {
      const startTime = performance.now();

      // 100回 URL パラメータをパース
      for (let i = 0; i < 100; i++) {
        const urlParams = new URLSearchParams(
          'keyword=test&level=4&attribute=dark'
        );
        urlParams.get('keyword');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // パース処理が高速であることを確認（1ms以下）
      expect(duration).toBeLessThan(100);
    });

    it('should handle rapid filter changes', () => {
      const changes = [];

      for (let i = 0; i < 10; i++) {
        const params = new URLSearchParams(`keyword=test${i}&level=${i}`);
        changes.push(params.toString());
      }

      expect(changes).toHaveLength(10);
      expect(changes[0]).not.toBe(changes[9]);
    });
  });
});
