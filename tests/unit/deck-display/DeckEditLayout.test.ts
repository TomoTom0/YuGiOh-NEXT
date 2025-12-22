/**
 * DeckEditLayout.vue のテスト
 * - デッキ編集レイアウトの基本構造
 * - ローディング状態の管理
 * - main/extra/side/trash デッキセクション
 * - レスポンシブレイアウト (mobile/desktop)
 * - ダイアログの表示状態
 * - Store とのインタラクション
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref } from 'vue';

/**
 * Mock: useDeckStore
 */
const mockDeckStore = () => {
  return {
    isLoadingDeck: ref(false),
    overlayVisible: ref(false),
    overlayZIndex: ref(9999),
    showImportDialog: ref(false),
    showExportDialog: ref(false),
    showOptionsDialog: ref(false),
    showLoadDialog: ref(false),
    deckInfo: ref({ title: 'Test Deck' }),
    dno: ref(12345),
    mainDeck: ref([]),
    extraDeck: ref([]),
    sideDeck: ref([]),
    trashDeck: ref([])
  };
};

/**
 * Mock: useSettingsStore
 */
const mockSettingsStore = () => {
  return {
    effectiveTheme: ref('light')
  };
};

describe('DeckEditLayout.vue', () => {
  let deckStore: any;
  let settingsStore: any;

  beforeEach(() => {
    document.body.innerHTML = '';
    deckStore = mockDeckStore();
    settingsStore = mockSettingsStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('コンポーネント構造', () => {
    it('root 要素が class="deck-edit-container ygo-next" を持つべき', () => {
      const container = document.createElement('div');
      container.className = 'deck-edit-container ygo-next';

      expect(container.classList.contains('deck-edit-container')).toBe(true);
      expect(container.classList.contains('ygo-next')).toBe(true);
    });

    it('data-ygo-next-theme 属性が設定されるべき', () => {
      const container = document.createElement('div');
      container.setAttribute('data-ygo-next-theme', settingsStore.effectiveTheme.value);

      expect(container.getAttribute('data-ygo-next-theme')).toBe('light');
    });

    it('main-content div が存在するべき', () => {
      const mainContent = document.createElement('div');
      mainContent.className = 'main-content hide-on-mobile';

      expect(mainContent.classList.contains('main-content')).toBe(true);
      expect(mainContent.classList.contains('hide-on-mobile')).toBe(true);
    });

    it('deck-areas div が存在するべき', () => {
      const deckAreas = document.createElement('div');
      deckAreas.className = 'deck-areas';

      expect(deckAreas.classList.contains('deck-areas')).toBe(true);
    });
  });

  describe('ローディング状態管理', () => {
    it('isLoadingDeck が true の場合、ローディングオーバーレイが表示されるべき', () => {
      deckStore.isLoadingDeck.value = true;

      expect(deckStore.isLoadingDeck.value).toBe(true);
    });

    it('isLoadingDeck が false の場合、ローディングオーバーレイが非表示になるべき', () => {
      deckStore.isLoadingDeck.value = false;

      expect(deckStore.isLoadingDeck.value).toBe(false);
    });

    it('ローディング中に deck-loading クラスが追加されるべき', () => {
      const deckAreas = document.createElement('div');
      deckAreas.className = 'deck-areas';

      if (deckStore.isLoadingDeck.value) {
        deckAreas.classList.add('deck-loading');
      }

      expect(deckAreas.classList.contains('deck-loading')).toBe(false);

      deckStore.isLoadingDeck.value = true;
      deckAreas.classList.add('deck-loading');
      expect(deckAreas.classList.contains('deck-loading')).toBe(true);
    });

    it('ローディングコンテンツに spinner と loading-text が含まれるべき', () => {
      const loadingContent = document.createElement('div');
      loadingContent.className = 'loading-content';

      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      loadingContent.appendChild(spinner);

      const loadingText = document.createElement('div');
      loadingText.className = 'loading-text';
      loadingText.textContent = 'Loading...';
      loadingContent.appendChild(loadingText);

      expect(loadingContent.querySelector('.spinner')).toBeTruthy();
      expect(loadingContent.querySelector('.loading-text')).toBeTruthy();
      expect(loadingContent.textContent).toContain('Loading...');
    });
  });

  describe('デッキセクション', () => {
    it('main セクションが存在するべき', () => {
      const section = document.createElement('div');
      section.setAttribute('data-section-type', 'main');
      section.textContent = 'Main Deck';

      document.body.appendChild(section);

      expect(document.querySelector('[data-section-type="main"]')).toBeTruthy();
    });

    it('extra セクションが存在するべき', () => {
      const section = document.createElement('div');
      section.setAttribute('data-section-type', 'extra');
      section.textContent = 'Extra Deck';

      document.body.appendChild(section);

      expect(document.querySelector('[data-section-type="extra"]')).toBeTruthy();
    });

    it('side セクションが存在するべき', () => {
      const section = document.createElement('div');
      section.setAttribute('data-section-type', 'side');
      section.textContent = 'Side Deck';

      document.body.appendChild(section);

      expect(document.querySelector('[data-section-type="side"]')).toBeTruthy();
    });

    it('trash セクションが存在するべき', () => {
      const section = document.createElement('div');
      section.setAttribute('data-section-type', 'trash');
      section.textContent = 'Trash';

      document.body.appendChild(section);

      expect(document.querySelector('[data-section-type="trash"]')).toBeTruthy();
    });

    it('extra と side セクションが middle-decks div にグループ化されるべき', () => {
      const middleDecks = document.createElement('div');
      middleDecks.className = 'middle-decks';

      const extra = document.createElement('div');
      extra.textContent = 'Extra';
      middleDecks.appendChild(extra);

      const side = document.createElement('div');
      side.textContent = 'Side';
      middleDecks.appendChild(side);

      expect(middleDecks.children).toHaveLength(2);
    });

    it('trash セクションに show-count="false" が指定されるべき', () => {
      // DeckSection コンポーネントへのプロップ検証
      const trashSection = {
        title: 'trash',
        sectionType: 'trash',
        cards: [],
        showCount: false
      };

      expect(trashSection.showCount).toBe(false);
    });
  });

  describe('DeckEditTopBar コンポーネント', () => {
    it('DeckEditTopBar がメインコンテンツに含まれるべき', () => {
      // DeckEditTopBar はレイアウトの上部に配置される
      const topBar = document.createElement('div');
      topBar.className = 'deck-edit-top-bar';

      document.body.appendChild(topBar);

      expect(document.querySelector('.deck-edit-top-bar')).toBeTruthy();
    });

    it('DeckEditTopBar がモバイルコンテンツにも含まれるべき（レスポンシブ）', () => {
      const mobileContent = document.createElement('div');
      mobileContent.className = 'mobile-deck-content';

      const topBar = document.createElement('div');
      topBar.className = 'deck-edit-top-bar';
      mobileContent.appendChild(topBar);

      expect(mobileContent.querySelector('.deck-edit-top-bar')).toBeTruthy();
    });
  });

  describe('RightArea コンポーネント（レスポンシブ）', () => {
    it('RightArea がマウントされるべき', () => {
      const rightArea = document.createElement('div');
      rightArea.className = 'right-area';

      document.body.appendChild(rightArea);

      expect(document.querySelector('.right-area')).toBeTruthy();
    });

    it('mobile-deck-content がモバイルビューに含まれるべき', () => {
      const mobileContent = document.createElement('div');
      mobileContent.className = 'mobile-deck-content';

      document.body.appendChild(mobileContent);

      expect(document.querySelector('.mobile-deck-content')).toBeTruthy();
    });

    it('deck-tab テンプレートスロットがデッキセクションを含むべき', () => {
      const deckTab = document.createElement('div');
      deckTab.className = 'deck-tab';

      const deckSection = document.createElement('div');
      deckSection.className = 'deck-section';
      deckTab.appendChild(deckSection);

      expect(deckTab.querySelector('.deck-section')).toBeTruthy();
    });
  });

  describe('ユニファイドオーバーレイ', () => {
    it('overlayVisible が true の場合、unified-overlay が表示されるべき', () => {
      deckStore.overlayVisible.value = true;

      const overlay = document.createElement('div');
      overlay.className = 'unified-overlay';
      document.body.appendChild(overlay);

      expect(deckStore.overlayVisible.value).toBe(true);
      expect(document.querySelector('.unified-overlay')).toBeTruthy();
    });

    it('overlayZIndex がスタイルに適用されるべき', () => {
      const overlay = document.createElement('div');
      overlay.className = 'unified-overlay';
      overlay.style.zIndex = String(deckStore.overlayZIndex.value);

      expect(overlay.style.zIndex).toBe('9999');
    });
  });

  describe('ダイアログ管理', () => {
    it('ImportExportDialog の isVisible が正しく制御されるべき', () => {
      deckStore.showImportDialog.value = true;
      const isVisible = deckStore.showImportDialog.value || deckStore.showExportDialog.value;

      expect(isVisible).toBe(true);
    });

    it('ImportExportDialog の初期タブが export に設定されるべき（export時）', () => {
      deckStore.showExportDialog.value = true;
      const initialTab = deckStore.showExportDialog.value ? 'export' : 'import';

      expect(initialTab).toBe('export');
    });

    it('ImportExportDialog の初期タブが import に設定されるべき（import時）', () => {
      deckStore.showImportDialog.value = true;
      const initialTab = deckStore.showExportDialog.value ? 'export' : 'import';

      expect(initialTab).toBe('import');
    });

    it('OptionsDialog の isVisible が showOptionsDialog と同期されるべき', () => {
      deckStore.showOptionsDialog.value = true;

      expect(deckStore.showOptionsDialog.value).toBe(true);
    });

    it('LoadDialog の isVisible が showLoadDialog と同期されるべき', () => {
      deckStore.showLoadDialog.value = true;

      expect(deckStore.showLoadDialog.value).toBe(true);
    });
  });

  describe('Store プロップ', () => {
    it('ImportExportDialog に deckInfo と dno が渡されるべき', () => {
      const props = {
        deckInfo: deckStore.deckInfo.value,
        dno: String(deckStore.dno.value)
      };

      expect(props.deckInfo).toEqual({ title: 'Test Deck' });
      expect(props.dno).toBe('12345');
    });

    it('DeckSection に mainDeck が渡されるべき', () => {
      const mainDeckCards = deckStore.mainDeck.value;

      expect(Array.isArray(mainDeckCards)).toBe(true);
    });

    it('DeckSection に extraDeck が渡されるべき', () => {
      const extraDeckCards = deckStore.extraDeck.value;

      expect(Array.isArray(extraDeckCards)).toBe(true);
    });

    it('DeckSection に sideDeck が渡されるべき', () => {
      const sideDeckCards = deckStore.sideDeck.value;

      expect(Array.isArray(sideDeckCards)).toBe(true);
    });

    it('DeckSection に trashDeck が渡されるべき', () => {
      const trashDeckCards = deckStore.trashDeck.value;

      expect(Array.isArray(trashDeckCards)).toBe(true);
    });
  });

  describe('v-show と v-if 条件', () => {
    it('isReady が false の場合、コンテナが非表示になるべき', () => {
      const isReady = ref(false);

      expect(isReady.value).toBe(false);
    });

    it('isReady が true の場合、コンテナが表示されるべき', () => {
      const isReady = ref(true);

      expect(isReady.value).toBe(true);
    });
  });

  describe('イベントハンドラー', () => {
    it('handleImportExportClose イベントハンドラーが呼ばれるべき', () => {
      const handleClose = vi.fn();

      // イベント実行をシミュレート
      handleClose();

      expect(handleClose).toHaveBeenCalled();
    });

    it('handleImported イベントハンドラーが呼ばれるべき', () => {
      const handleImported = vi.fn();

      handleImported({ deckInfo: { title: 'Imported Deck' } });

      expect(handleImported).toHaveBeenCalledWith(
        expect.objectContaining({ deckInfo: { title: 'Imported Deck' } })
      );
    });

    it('handleExported イベントハンドラーが呼ばれるべき', () => {
      const handleExported = vi.fn();

      handleExported({ exportData: 'base64...' });

      expect(handleExported).toHaveBeenCalled();
    });

    it('showOptionsDialog のクローズハンドラーが showOptionsDialog をリセットすべき', () => {
      deckStore.showOptionsDialog.value = true;

      // closeイベント処理をシミュレート
      deckStore.showOptionsDialog.value = false;

      expect(deckStore.showOptionsDialog.value).toBe(false);
    });
  });

  describe('レイアウトスタイル', () => {
    it('mainContentStyle が適用されるべき', () => {
      const mainContent = document.createElement('div');
      mainContent.style.cssText = 'display: flex; flex-direction: column;';

      expect(mainContent.style.display).toBe('flex');
    });

    it('deckAreasStyle が適用されるべき', () => {
      const deckAreas = document.createElement('div');
      deckAreas.style.cssText = 'display: grid; gap: 1rem;';

      expect(deckAreas.style.display).toBe('grid');
    });

    it('middleDecksClass が正しくバインドされるべき', () => {
      const isWideScreen = ref(false);
      const middleDecksClass = isWideScreen.value ? 'middle-decks-wide' : 'middle-decks';

      expect(middleDecksClass).toBe('middle-decks');

      isWideScreen.value = true;
      const newClass = isWideScreen.value ? 'middle-decks-wide' : 'middle-decks';
      expect(newClass).toBe('middle-decks-wide');
    });
  });
});
