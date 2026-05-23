import type {
  SortOrder,
  CardSize,
  Theme,
  Language,
  DeckEditUIState
} from '../types/settings';

/**
 * URLパラメータのエンコード/デコード管理
 */
export class URLStateManager {
  /**
   * 現在のURLパラメータを取得
   */
  static getParams(): URLSearchParams {
    // ハッシュルーティングを考慮
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    if (queryStart === -1) {
      return new URLSearchParams();
    }
    return new URLSearchParams(hash.substring(queryStart + 1));
  }

  /**
   * URLパラメータを更新（履歴に追加せず置き換え）
   */
  static setParams(params: Record<string, string | number | boolean | null | undefined>): void {
    const urlParams = this.getParams();

    // パラメータを更新
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        urlParams.delete(key);
      } else {
        urlParams.set(key, String(value));
      }
    });

    // URLを更新
    const hash = window.location.hash;
    const hashBase = hash.split('?')[0];
    const newHash = urlParams.toString()
      ? `${hashBase}?${urlParams.toString()}`
      : hashBase;

    window.history.replaceState(null, '', `${window.location.pathname}${newHash}`);
  }

  /**
   * UI状態をURLに同期
   */
  static syncUIStateToURL(state: Partial<DeckEditUIState>): void {
    const params: Record<string, string | number | boolean | null> = {};

    if (state.viewMode) params.mode = state.viewMode;
    if (state.sortOrder) params.sort = state.sortOrder;
    if (state.activeTab) params.tab = state.activeTab;
    if (state.cardTab) params.ctab = state.cardTab;
    if (state.showDetail !== undefined) params.detail = state.showDetail ? '1' : '0';

    this.setParams(params);
  }

  /**
   * URLからUI状態を復元
   */
  static restoreUIStateFromURL(): Partial<DeckEditUIState> {
    const params = this.getParams();
    const state: Partial<DeckEditUIState> = {};

    const mode = params.get('mode');
    if (mode === 'list' || mode === 'grid') {
      state.viewMode = mode;
    }

    const sort = params.get('sort');
    if (sort) {
      state.sortOrder = sort as SortOrder;
    }

    const tab = params.get('tab');
    if (tab === 'search' || tab === 'card' || tab === 'deck') {
      state.activeTab = tab;
    }

    const ctab = params.get('ctab');
    if (ctab === 'info' || ctab === 'qa' || ctab === 'related' || ctab === 'products') {
      state.cardTab = ctab;
    }

    const detail = params.get('detail');
    if (detail !== null) {
      state.showDetail = detail === '1';
    }

    return state;
  }

  /**
   * 設定をURLに同期
   */
  static syncSettingsToURL(size?: CardSize, theme?: Theme, lang?: Language): void {
    const params: Record<string, string | null> = {};

    if (size) params.size = size;
    if (theme) params.theme = theme;
    if (lang) params.lang = lang;

    this.setParams(params);
  }

  /**
   * URLから設定を復元
   */
  static restoreSettingsFromURL(): {
    size?: CardSize;
    theme?: Theme;
    lang?: Language;
  } {
    const params = this.getParams();
    const settings: { size?: CardSize; theme?: Theme; lang?: Language } = {};

    const size = params.get('size');
    if (size === 'small' || size === 'medium' || size === 'large' || size === 'xlarge') {
      settings.size = size;
    }

    const theme = params.get('theme');
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      settings.theme = theme;
    }

    const lang = params.get('lang');
    if (lang === 'auto' || lang === 'ja' || lang === 'en' || lang === 'ko' ||
        lang === 'ae' || lang === 'cn' || lang === 'de' || lang === 'fr' ||
        lang === 'it' || lang === 'es' || lang === 'pt') {
      settings.lang = lang as Language;
    }

    return settings;
  }

  /**
   * デッキ番号(dno)を取得
   */
  static getDno(): number | null {
    const params = this.getParams();
    const dnoStr = params.get('dno');
    if (dnoStr) {
      const dno = parseInt(dnoStr, 10);
      if (!isNaN(dno)) {
        return dno;
      }
    }
    return null;
  }

  /**
   * デッキ番号(dno)を設定
   */
  static setDno(dno: number | null): void {
    this.setParams({ dno });
  }
}
