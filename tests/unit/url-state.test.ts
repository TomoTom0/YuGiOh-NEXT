import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { URLStateManager } from '@/utils/url-state';
import type { DeckEditUIState } from '@/types/settings';

describe('url-state', () => {
  // 元のwindow.locationを保存
  let originalLocation: Location;

  beforeEach(() => {
    // window.location のモック
    originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      hash: '',
      pathname: '/test',
      search: ''
    } as Location;

    // window.history のモック
    window.history.replaceState = vi.fn();
  });

  afterEach(() => {
    // 元に戻す
    window.location = originalLocation;
  });

  describe('getParams', () => {
    it('should return empty params when no hash query', () => {
      window.location.hash = '#/edit';
      const params = URLStateManager.getParams();

      expect(params.toString()).toBe('');
    });

    it('should parse params from hash query', () => {
      window.location.hash = '#/edit?mode=list&sort=name';
      const params = URLStateManager.getParams();

      expect(params.get('mode')).toBe('list');
      expect(params.get('sort')).toBe('name');
    });

    it('should handle empty hash', () => {
      window.location.hash = '';
      const params = URLStateManager.getParams();

      expect(params.toString()).toBe('');
    });

    it('should handle hash with only question mark', () => {
      window.location.hash = '#/edit?';
      const params = URLStateManager.getParams();

      expect(params.toString()).toBe('');
    });
  });

  describe('setParams', () => {
    it('should update URL params', () => {
      window.location.hash = '#/edit';
      URLStateManager.setParams({ mode: 'list', sort: 'name' });

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/test#/edit?mode=list&sort=name'
      );
    });

    it('should delete params with null value', () => {
      window.location.hash = '#/edit?mode=list&sort=name';
      URLStateManager.setParams({ mode: null });

      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).not.toContain('mode=');
      expect(callArgs[2]).toContain('sort=name');
    });

    it('should delete params with undefined value', () => {
      window.location.hash = '#/edit?mode=list';
      URLStateManager.setParams({ mode: undefined });

      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toBe('/test#/edit');
    });

    it('should convert boolean to string', () => {
      window.location.hash = '#/edit';
      URLStateManager.setParams({ detail: true });

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/test#/edit?detail=true'
      );
    });

    it('should convert number to string', () => {
      window.location.hash = '#/edit';
      URLStateManager.setParams({ dno: 123 });

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/test#/edit?dno=123'
      );
    });
  });

  describe('syncUIStateToURL', () => {
    it('should sync view mode', () => {
      window.location.hash = '#/edit';
      URLStateManager.syncUIStateToURL({ viewMode: 'list' });

      expect(window.history.replaceState).toHaveBeenCalled();
      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toContain('mode=list');
    });

    it('should sync sort order', () => {
      window.location.hash = '#/edit';
      URLStateManager.syncUIStateToURL({ sortOrder: 'name' });

      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toContain('sort=name');
    });

    it('should sync active tab', () => {
      window.location.hash = '#/edit';
      URLStateManager.syncUIStateToURL({ activeTab: 'search' });

      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toContain('tab=search');
    });

    it('should sync card tab', () => {
      window.location.hash = '#/edit';
      URLStateManager.syncUIStateToURL({ cardTab: 'qa' });

      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toContain('ctab=qa');
    });

    it('should sync showDetail as 1 or 0', () => {
      window.location.hash = '#/edit';
      URLStateManager.syncUIStateToURL({ showDetail: true });

      let callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toContain('detail=1');

      URLStateManager.syncUIStateToURL({ showDetail: false });
      callArgs = (window.history.replaceState as any).mock.calls[1];
      expect(callArgs[2]).toContain('detail=0');
    });

    it('should sync multiple state properties', () => {
      window.location.hash = '#/edit';
      URLStateManager.syncUIStateToURL({
        viewMode: 'grid',
        sortOrder: 'type',
        activeTab: 'card'
      });

      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toContain('mode=grid');
      expect(callArgs[2]).toContain('sort=type');
      expect(callArgs[2]).toContain('tab=card');
    });
  });

  describe('restoreUIStateFromURL', () => {
    it('should restore view mode', () => {
      window.location.hash = '#/edit?mode=list';
      const state = URLStateManager.restoreUIStateFromURL();

      expect(state.viewMode).toBe('list');
    });

    it('should restore sort order', () => {
      window.location.hash = '#/edit?sort=name';
      const state = URLStateManager.restoreUIStateFromURL();

      expect(state.sortOrder).toBe('name');
    });

    it('should restore active tab', () => {
      window.location.hash = '#/edit?tab=search';
      const state = URLStateManager.restoreUIStateFromURL();

      expect(state.activeTab).toBe('search');
    });

    it('should restore card tab', () => {
      window.location.hash = '#/edit?ctab=qa';
      const state = URLStateManager.restoreUIStateFromURL();

      expect(state.cardTab).toBe('qa');
    });

    it('should restore showDetail as boolean', () => {
      window.location.hash = '#/edit?detail=1';
      let state = URLStateManager.restoreUIStateFromURL();
      expect(state.showDetail).toBe(true);

      window.location.hash = '#/edit?detail=0';
      state = URLStateManager.restoreUIStateFromURL();
      expect(state.showDetail).toBe(false);
    });

    it('should ignore invalid mode values', () => {
      window.location.hash = '#/edit?mode=invalid';
      const state = URLStateManager.restoreUIStateFromURL();

      expect(state.viewMode).toBeUndefined();
    });

    it('should ignore invalid tab values', () => {
      window.location.hash = '#/edit?tab=invalid';
      const state = URLStateManager.restoreUIStateFromURL();

      expect(state.activeTab).toBeUndefined();
    });

    it('should restore multiple properties', () => {
      window.location.hash = '#/edit?mode=grid&sort=type&tab=card&detail=1';
      const state = URLStateManager.restoreUIStateFromURL();

      expect(state.viewMode).toBe('grid');
      expect(state.sortOrder).toBe('type');
      expect(state.activeTab).toBe('card');
      expect(state.showDetail).toBe(true);
    });

    it('should return empty object when no valid params', () => {
      window.location.hash = '#/edit';
      const state = URLStateManager.restoreUIStateFromURL();

      expect(state).toEqual({});
    });
  });

  describe('syncSettingsToURL', () => {
    it('should sync card size', () => {
      window.location.hash = '#/edit';
      URLStateManager.syncSettingsToURL('medium', undefined, undefined);

      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toContain('size=medium');
    });

    it('should sync theme', () => {
      window.location.hash = '#/edit';
      URLStateManager.syncSettingsToURL(undefined, 'dark', undefined);

      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toContain('theme=dark');
    });

    it('should sync language', () => {
      window.location.hash = '#/edit';
      URLStateManager.syncSettingsToURL(undefined, undefined, 'ja');

      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toContain('lang=ja');
    });

    it('should sync multiple settings', () => {
      window.location.hash = '#/edit';
      URLStateManager.syncSettingsToURL('large', 'light', 'en');

      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toContain('size=large');
      expect(callArgs[2]).toContain('theme=light');
      expect(callArgs[2]).toContain('lang=en');
    });
  });

  describe('restoreSettingsFromURL', () => {
    it('should restore card size', () => {
      window.location.hash = '#/edit?size=large';
      const settings = URLStateManager.restoreSettingsFromURL();

      expect(settings.size).toBe('large');
    });

    it('should restore theme', () => {
      window.location.hash = '#/edit?theme=dark';
      const settings = URLStateManager.restoreSettingsFromURL();

      expect(settings.theme).toBe('dark');
    });

    it('should restore language', () => {
      window.location.hash = '#/edit?lang=ja';
      const settings = URLStateManager.restoreSettingsFromURL();

      expect(settings.lang).toBe('ja');
    });

    it('should ignore invalid size values', () => {
      window.location.hash = '#/edit?size=invalid';
      const settings = URLStateManager.restoreSettingsFromURL();

      expect(settings.size).toBeUndefined();
    });

    it('should ignore invalid theme values', () => {
      window.location.hash = '#/edit?theme=invalid';
      const settings = URLStateManager.restoreSettingsFromURL();

      expect(settings.theme).toBeUndefined();
    });

    it('should ignore invalid lang values', () => {
      window.location.hash = '#/edit?lang=invalid';
      const settings = URLStateManager.restoreSettingsFromURL();

      expect(settings.lang).toBeUndefined();
    });

    it('should restore multiple settings', () => {
      window.location.hash = '#/edit?size=xlarge&theme=system&lang=ko';
      const settings = URLStateManager.restoreSettingsFromURL();

      expect(settings.size).toBe('xlarge');
      expect(settings.theme).toBe('system');
      expect(settings.lang).toBe('ko');
    });

    it('should return empty object when no valid params', () => {
      window.location.hash = '#/edit';
      const settings = URLStateManager.restoreSettingsFromURL();

      expect(settings).toEqual({});
    });
  });

  describe('getDno', () => {
    it('should return dno from URL', () => {
      window.location.hash = '#/edit?dno=123';
      const dno = URLStateManager.getDno();

      expect(dno).toBe(123);
    });

    it('should return null when dno is not present', () => {
      window.location.hash = '#/edit';
      const dno = URLStateManager.getDno();

      expect(dno).toBeNull();
    });

    it('should return null for invalid dno', () => {
      window.location.hash = '#/edit?dno=abc';
      const dno = URLStateManager.getDno();

      expect(dno).toBeNull();
    });

    it('should parse negative dno', () => {
      window.location.hash = '#/edit?dno=-1';
      const dno = URLStateManager.getDno();

      expect(dno).toBe(-1);
    });
  });

  describe('setDno', () => {
    it('should set dno in URL', () => {
      window.location.hash = '#/edit';
      URLStateManager.setDno(456);

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/test#/edit?dno=456'
      );
    });

    it('should remove dno when set to null', () => {
      window.location.hash = '#/edit?dno=123';
      URLStateManager.setDno(null);

      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toBe('/test#/edit');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple question marks in hash', () => {
      window.location.hash = '#/edit?param1=value1?param2=value2';
      const params = URLStateManager.getParams();

      expect(params.get('param1')).toBe('value1?param2=value2');
    });

    it('should handle URL encoded values', () => {
      window.location.hash = '#/edit?name=%E7%81%B0%E6%B5%81%E3%81%86%E3%82%89%E3%82%89';
      const params = URLStateManager.getParams();

      expect(params.get('name')).toBe('灰流うらら');
    });

    it('should preserve existing params when updating', () => {
      window.location.hash = '#/edit?existing=value';
      URLStateManager.setParams({ new: 'param' });

      const callArgs = (window.history.replaceState as any).mock.calls[0];
      expect(callArgs[2]).toContain('existing=value');
      expect(callArgs[2]).toContain('new=param');
    });
  });
});
