import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { URLStateManager } from '@/utils/url-state';

describe('url-state', () => {
  let originalLocation: Location;
  let originalHistory: History;

  beforeEach(() => {
    // locationとhistoryを保存
    originalLocation = window.location;
    originalHistory = window.history;

    // モックオブジェクトを作成
    delete (window as any).location;
    delete (window as any).history;

    (window as any).location = {
      hash: '',
      pathname: '/test',
      toString: function() { return this.pathname + this.hash; }
    };

    (window as any).history = {
      replaceState: vi.fn((state, title, url) => {
        if (typeof url === 'string') {
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            window.location.hash = url.substring(hashIndex);
          }
        }
      })
    };
  });

  afterEach(() => {
    // 元に戻す
    (window as any).location = originalLocation;
    (window as any).history = originalHistory;
  });

  describe('getParams', () => {
    it('URLパラメータがない場合は空のURLSearchParamsを返す', () => {
      window.location.hash = '#/page';
      const params = URLStateManager.getParams();
      expect(params.toString()).toBe('');
    });

    it('URLパラメータを正しく取得できる', () => {
      window.location.hash = '#/page?mode=list&sort=name';
      const params = URLStateManager.getParams();
      expect(params.get('mode')).toBe('list');
      expect(params.get('sort')).toBe('name');
    });

    it('複数のパラメータを取得できる', () => {
      window.location.hash = '#/page?a=1&b=2&c=3';
      const params = URLStateManager.getParams();
      expect(params.get('a')).toBe('1');
      expect(params.get('b')).toBe('2');
      expect(params.get('c')).toBe('3');
    });

    it('ハッシュのみの場合も動作する', () => {
      window.location.hash = '#';
      const params = URLStateManager.getParams();
      expect(params.toString()).toBe('');
    });
  });

  describe('setParams', () => {
    beforeEach(() => {
      window.location.hash = '#/page';
    });

    it('パラメータを設定できる', () => {
      URLStateManager.setParams({ mode: 'list' });
      expect(window.history.replaceState).toHaveBeenCalled();
      expect(window.location.hash).toContain('mode=list');
    });

    it('複数のパラメータを設定できる', () => {
      URLStateManager.setParams({ mode: 'list', sort: 'name', tab: 'search' });
      expect(window.location.hash).toContain('mode=list');
      expect(window.location.hash).toContain('sort=name');
      expect(window.location.hash).toContain('tab=search');
    });

    it('数値を設定できる', () => {
      URLStateManager.setParams({ dno: 123 });
      expect(window.location.hash).toContain('dno=123');
    });

    it('真偽値を設定できる', () => {
      URLStateManager.setParams({ flag: true });
      expect(window.location.hash).toContain('flag=true');
    });

    it('nullの場合はパラメータを削除する', () => {
      window.location.hash = '#/page?mode=list&sort=name';
      URLStateManager.setParams({ mode: null });
      expect(window.location.hash).not.toContain('mode');
      expect(window.location.hash).toContain('sort=name');
    });

    it('undefinedの場合はパラメータを削除する', () => {
      window.location.hash = '#/page?mode=list';
      URLStateManager.setParams({ mode: undefined });
      expect(window.location.hash).not.toContain('mode');
    });

    it('既存のパラメータと新しいパラメータを統合できる', () => {
      window.location.hash = '#/page?a=1';
      URLStateManager.setParams({ b: '2' });
      expect(window.location.hash).toContain('a=1');
      expect(window.location.hash).toContain('b=2');
    });
  });

  describe('syncUIStateToURL', () => {
    beforeEach(() => {
      window.location.hash = '#/page';
    });

    it('viewModeを同期できる', () => {
      URLStateManager.syncUIStateToURL({ viewMode: 'grid' });
      expect(window.location.hash).toContain('mode=grid');
    });

    it('sortOrderを同期できる', () => {
      URLStateManager.syncUIStateToURL({ sortOrder: 'name' });
      expect(window.location.hash).toContain('sort=name');
    });

    it('activeTabを同期できる', () => {
      URLStateManager.syncUIStateToURL({ activeTab: 'deck' });
      expect(window.location.hash).toContain('tab=deck');
    });

    it('cardTabを同期できる', () => {
      URLStateManager.syncUIStateToURL({ cardTab: 'qa' });
      expect(window.location.hash).toContain('ctab=qa');
    });

    it('showDetailを同期できる（true）', () => {
      URLStateManager.syncUIStateToURL({ showDetail: true });
      expect(window.location.hash).toContain('detail=1');
    });

    it('showDetailを同期できる（false）', () => {
      URLStateManager.syncUIStateToURL({ showDetail: false });
      expect(window.location.hash).toContain('detail=0');
    });

    it('複数の状態を同時に同期できる', () => {
      URLStateManager.syncUIStateToURL({
        viewMode: 'list',
        sortOrder: 'type',
        activeTab: 'search',
        showDetail: true
      });
      expect(window.location.hash).toContain('mode=list');
      expect(window.location.hash).toContain('sort=type');
      expect(window.location.hash).toContain('tab=search');
      expect(window.location.hash).toContain('detail=1');
    });
  });

  describe('restoreUIStateFromURL', () => {
    it('viewModeを復元できる', () => {
      window.location.hash = '#/page?mode=grid';
      const state = URLStateManager.restoreUIStateFromURL();
      expect(state.viewMode).toBe('grid');
    });

    it('sortOrderを復元できる', () => {
      window.location.hash = '#/page?sort=name';
      const state = URLStateManager.restoreUIStateFromURL();
      expect(state.sortOrder).toBe('name');
    });

    it('activeTabを復元できる', () => {
      window.location.hash = '#/page?tab=deck';
      const state = URLStateManager.restoreUIStateFromURL();
      expect(state.activeTab).toBe('deck');
    });

    it('cardTabを復元できる', () => {
      window.location.hash = '#/page?ctab=related';
      const state = URLStateManager.restoreUIStateFromURL();
      expect(state.cardTab).toBe('related');
    });

    it('showDetailを復元できる（1）', () => {
      window.location.hash = '#/page?detail=1';
      const state = URLStateManager.restoreUIStateFromURL();
      expect(state.showDetail).toBe(true);
    });

    it('showDetailを復元できる（0）', () => {
      window.location.hash = '#/page?detail=0';
      const state = URLStateManager.restoreUIStateFromURL();
      expect(state.showDetail).toBe(false);
    });

    it('不正な値は無視される', () => {
      window.location.hash = '#/page?mode=invalid&tab=invalid';
      const state = URLStateManager.restoreUIStateFromURL();
      expect(state.viewMode).toBeUndefined();
      expect(state.activeTab).toBeUndefined();
    });

    it('detailの不正な値はfalseとして扱われる', () => {
      window.location.hash = '#/page?detail=invalid';
      const state = URLStateManager.restoreUIStateFromURL();
      expect(state.showDetail).toBe(false);
    });

    it('複数の状態を同時に復元できる', () => {
      window.location.hash = '#/page?mode=list&sort=type&tab=search&detail=1';
      const state = URLStateManager.restoreUIStateFromURL();
      expect(state.viewMode).toBe('list');
      expect(state.sortOrder).toBe('type');
      expect(state.activeTab).toBe('search');
      expect(state.showDetail).toBe(true);
    });

    it('パラメータがない場合は空のオブジェクトを返す', () => {
      window.location.hash = '#/page';
      const state = URLStateManager.restoreUIStateFromURL();
      expect(Object.keys(state).length).toBe(0);
    });
  });

  describe('syncSettingsToURL', () => {
    beforeEach(() => {
      window.location.hash = '#/page';
    });

    it('カードサイズを同期できる', () => {
      URLStateManager.syncSettingsToURL('large');
      expect(window.location.hash).toContain('size=large');
    });

    it('テーマを同期できる', () => {
      URLStateManager.syncSettingsToURL(undefined, 'dark');
      expect(window.location.hash).toContain('theme=dark');
    });

    it('言語を同期できる', () => {
      URLStateManager.syncSettingsToURL(undefined, undefined, 'ja');
      expect(window.location.hash).toContain('lang=ja');
    });

    it('複数の設定を同時に同期できる', () => {
      URLStateManager.syncSettingsToURL('medium', 'light', 'en');
      expect(window.location.hash).toContain('size=medium');
      expect(window.location.hash).toContain('theme=light');
      expect(window.location.hash).toContain('lang=en');
    });
  });

  describe('restoreSettingsFromURL', () => {
    it('カードサイズを復元できる', () => {
      window.location.hash = '#/page?size=xlarge';
      const settings = URLStateManager.restoreSettingsFromURL();
      expect(settings.size).toBe('xlarge');
    });

    it('テーマを復元できる', () => {
      window.location.hash = '#/page?theme=system';
      const settings = URLStateManager.restoreSettingsFromURL();
      expect(settings.theme).toBe('system');
    });

    it('言語を復元できる', () => {
      window.location.hash = '#/page?lang=ko';
      const settings = URLStateManager.restoreSettingsFromURL();
      expect(settings.lang).toBe('ko');
    });

    it('不正な値は無視される', () => {
      window.location.hash = '#/page?size=invalid&theme=invalid&lang=invalid';
      const settings = URLStateManager.restoreSettingsFromURL();
      expect(settings.size).toBeUndefined();
      expect(settings.theme).toBeUndefined();
      expect(settings.lang).toBeUndefined();
    });

    it('複数の設定を同時に復元できる', () => {
      window.location.hash = '#/page?size=small&theme=dark&lang=cn';
      const settings = URLStateManager.restoreSettingsFromURL();
      expect(settings.size).toBe('small');
      expect(settings.theme).toBe('dark');
      expect(settings.lang).toBe('cn');
    });

    it('パラメータがない場合は空のオブジェクトを返す', () => {
      window.location.hash = '#/page';
      const settings = URLStateManager.restoreSettingsFromURL();
      expect(Object.keys(settings).length).toBe(0);
    });
  });
});
