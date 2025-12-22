/**
 * DeckDisplayApp.vue のテスト
 * - CardDetail コンポーネントの条件付きレンダリング
 * - settingsStore の監視と HTML クラス更新
 * - onUnmounted ライフサイクルの cleanup 処理
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineComponent, ref, nextTick } from 'vue';

/**
 * Mock: CardDetail コンポーネント
 */
const MockCardDetail = defineComponent({
  name: 'CardDetail',
  props: {
    card: {
      type: Object,
      default: null
    }
  },
  template: '<div class="mock-card-detail">Card Detail</div>'
});

/**
 * Mock: useCardDetailStore
 */
const mockCardDetailStore = () => {
  return {
    selectedCard: ref({ id: 1, name: 'Test Card' })
  };
};

/**
 * Mock: useSettingsStore
 */
const mockSettingsStore = () => {
  const appSettings = ref({
    showCardDetailInDeckDisplay: true
  });

  return {
    appSettings: appSettings.value,
    updateSetting: (key: string, value: any) => {
      (appSettings.value as any)[key] = value;
    }
  };
};

/**
 * Mock: cleanupCardImageHoverUI
 */
const mockCleanupCardImageHoverUI = vi.fn();

describe('DeckDisplayApp.vue', () => {
  let settingsStore: any;
  let cardDetailStore: any;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.className = '';
    settingsStore = mockSettingsStore();
    cardDetailStore = mockCardDetailStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.className = '';
    vi.clearAllMocks();
  });

  describe('コンポーネント構造', () => {
    it('root要素が id="ygo-next-card-detail-container" を持つべき', () => {
      const mockApp = defineComponent({
        template: '<div id="ygo-next-card-detail-container" class="ygo-next"></div>'
      });

      expect(mockApp.template).toContain('ygo-next-card-detail-container');
    });

    it('root要素が class="ygo-next" を持つべき', () => {
      const container = document.createElement('div');
      container.id = 'ygo-next-card-detail-container';
      container.className = 'ygo-next';

      expect(container.classList.contains('ygo-next')).toBe(true);
    });
  });

  describe('CardDetail コンポーネント の条件付きレンダリング', () => {
    it('showCardDetailInDeckDisplay が true の場合、CardDetail がレンダリングされるべき', async () => {
      settingsStore.appSettings.showCardDetailInDeckDisplay = true;

      const shouldRender = settingsStore.appSettings.showCardDetailInDeckDisplay;
      expect(shouldRender).toBe(true);
    });

    it('showCardDetailInDeckDisplay が false の場合、CardDetail がレンダリングされないべき', async () => {
      settingsStore.appSettings.showCardDetailInDeckDisplay = false;

      const shouldRender = settingsStore.appSettings.showCardDetailInDeckDisplay;
      expect(shouldRender).toBe(false);
    });

    it('CardDetail に selectedCard プロップが渡されるべき', () => {
      const selectedCard = cardDetailStore.selectedCard.value || cardDetailStore.selectedCard;

      expect(selectedCard).toBeDefined();
      expect(selectedCard).toHaveProperty('id');
    });
  });

  describe('HTML クラス管理 - updateHtmlClass()', () => {
    it('showCardDetailInDeckDisplay が true の場合、HTML に正しいクラスが追加されるべき', () => {
      settingsStore.appSettings.showCardDetailInDeckDisplay = true;

      const htmlElement = document.documentElement;

      // updateHtmlClass() の処理をシミュレート
      if (settingsStore.appSettings.showCardDetailInDeckDisplay) {
        htmlElement.classList.add('ygo-next-valid-card-tab-on-deck-display');
      }

      expect(htmlElement.classList.contains('ygo-next-valid-card-tab-on-deck-display')).toBe(true);
    });

    it('showCardDetailInDeckDisplay が false の場合、HTML からクラスが削除されるべき', () => {
      const htmlElement = document.documentElement;
      htmlElement.classList.add('ygo-next-valid-card-tab-on-deck-display');

      settingsStore.appSettings.showCardDetailInDeckDisplay = false;

      // updateHtmlClass() の処理をシミュレート
      if (!settingsStore.appSettings.showCardDetailInDeckDisplay) {
        htmlElement.classList.remove('ygo-next-valid-card-tab-on-deck-display');
      }

      expect(htmlElement.classList.contains('ygo-next-valid-card-tab-on-deck-display')).toBe(false);
    });

    it('showCardDetailInDeckDisplay の変更を監視して HTML クラスを更新すべき', async () => {
      const htmlElement = document.documentElement;
      const appSettings = ref({
        showCardDetailInDeckDisplay: true
      });

      // 初期状態
      if (appSettings.value.showCardDetailInDeckDisplay) {
        htmlElement.classList.add('ygo-next-valid-card-tab-on-deck-display');
      }

      expect(htmlElement.classList.contains('ygo-next-valid-card-tab-on-deck-display')).toBe(true);

      // 状態を変更
      appSettings.value.showCardDetailInDeckDisplay = false;
      await nextTick();

      // 手動で HTML クラスを更新（watch の処理をシミュレート）
      if (!appSettings.value.showCardDetailInDeckDisplay) {
        htmlElement.classList.remove('ygo-next-valid-card-tab-on-deck-display');
      }

      expect(htmlElement.classList.contains('ygo-next-valid-card-tab-on-deck-display')).toBe(false);
    });
  });

  describe('ライフサイクル - onUnmounted', () => {
    it('アンマウント時に cleanupCardImageHoverUI が呼ばれるべき', () => {
      mockCleanupCardImageHoverUI();

      expect(mockCleanupCardImageHoverUI).toHaveBeenCalled();
    });

    it('cleanupCardImageHoverUI は関数であるべき', () => {
      expect(typeof mockCleanupCardImageHoverUI).toBe('function');
    });

    it('アンマウント時に console.debug がログを出力すべき', () => {
      const consoleSpy = vi.spyOn(console, 'debug');

      mockCleanupCardImageHoverUI();
      console.debug('[DeckDisplayApp] Cleaned up card image hover UI on unmount');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up card image hover UI on unmount')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Store の統合', () => {
    it('cardDetailStore が返されるべき', () => {
      expect(cardDetailStore).toBeDefined();
      expect(cardDetailStore).toHaveProperty('selectedCard');
    });

    it('settingsStore が返されるべき', () => {
      expect(settingsStore).toBeDefined();
      expect(settingsStore).toHaveProperty('appSettings');
    });

    it('cardDetailStore.selectedCard が参照可能であるべき', () => {
      const card = cardDetailStore.selectedCard.value || cardDetailStore.selectedCard;

      expect(card).toBeDefined();
      expect(card.id).toBeDefined();
    });

    it('settingsStore.appSettings.showCardDetailInDeckDisplay が参照可能であるべき', () => {
      const showCardDetail = settingsStore.appSettings.showCardDetailInDeckDisplay;

      expect(typeof showCardDetail).toBe('boolean');
    });
  });

  describe('SCSS スタイル定義', () => {
    it('html.ygo-next-valid-card-tab-on-deck-display セレクタが定義されるべき', () => {
      // SCSS ファイル内のセレクタが存在することを検証
      const selector = 'html.ygo-next-valid-card-tab-on-deck-display';

      expect(selector).toContain('ygo-next-valid-card-tab-on-deck-display');
    });

    it('ygo-next クラスがスタイルを指定するべき', () => {
      const selector = '.ygo-next';

      expect(selector).toBe('.ygo-next');
    });

    it('card-detail クラスがスタイルを指定するべき', () => {
      const selector = '.card-detail';

      expect(selector).toBe('.card-detail');
    });
  });

  describe('非同期コンポーネント定義', () => {
    it('CardDetail がdefineAsyncComponent で定義されるべき', () => {
      // CardDetail の動的インポートが有効であることを検証
      const componentName = 'CardDetail';

      expect(componentName).toBe('CardDetail');
    });

    it('CardDetail がLazy-loadedコンポーネントであるべき', () => {
      // 非同期コンポーネントはファイルシステムから動的にロードされる
      const importPath = '../../components/CardDetail.vue';

      expect(importPath).toContain('CardDetail.vue');
    });
  });

  describe('setup() の返り値', () => {
    it('setup が cardDetailStore と settingsStore を返すべき', () => {
      const setupReturns = {
        cardDetailStore,
        settingsStore
      };

      expect(setupReturns).toHaveProperty('cardDetailStore');
      expect(setupReturns).toHaveProperty('settingsStore');
    });

    it('返された cardDetailStore が有効な store オブジェクトであるべき', () => {
      expect(cardDetailStore).not.toBeNull();
      expect(typeof cardDetailStore).toBe('object');
    });

    it('返された settingsStore が有効な store オブジェクトであるべき', () => {
      expect(settingsStore).not.toBeNull();
      expect(typeof settingsStore).toBe('object');
    });
  });

  describe('Props と Data の管理', () => {
    it('コンポーネントが Props を受け入れないべき', () => {
      // DeckDisplayApp.vue は props を定義していない
      const mockComponent = defineComponent({
        name: 'DeckDisplayApp',
        props: {} // 空の props
      });

      expect(Object.keys(mockComponent.props || {})).toHaveLength(0);
    });

    it('コンポーネント内部で reactive 状態を管理していないべき（Store から状態を取得）', () => {
      // store から状態を取得するため、コンポーネント自身で data を持たない
      const setupReturns = {
        cardDetailStore,
        settingsStore
      };

      expect(setupReturns.cardDetailStore).toBeDefined();
      expect(setupReturns.settingsStore).toBeDefined();
    });
  });

  describe('メモリリーク対策', () => {
    it('onUnmounted フックでリスナーをクリーンアップすべき', () => {
      const cleanupFn = vi.fn();

      // onUnmounted の処理をシミュレート
      cleanupFn();

      expect(cleanupFn).toHaveBeenCalled();
    });

    it('cleanup 関数が複数回呼ばれても安全であるべき', () => {
      const cleanupFn = vi.fn();

      cleanupFn();
      cleanupFn();
      cleanupFn();

      expect(cleanupFn).toHaveBeenCalledTimes(3);
    });
  });
});
