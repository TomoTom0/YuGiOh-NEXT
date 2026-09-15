/**
 * DeckEditLayout.vue のテスト
 *
 * tests/design/deck-edit-layout/conditions.toml（TASK-331/487）の100条件をカバーする。
 *
 * モック構成（設計書 tmp/20260912_design_deck-edit-layout_task331.md §3）:
 * - 実pinia + 実store（deck-edit / settings / search / practice / toast / card-detail）
 * - 部分モック: @/utils/deck-cache の generateThumbnailsInBackground・@/api/card-search の
 *   searchCardById を vi.importActual で他exportは実物のまま差し替え
 * - @/composables/practice/usePracticeActions は executeAction を安定したmockへ差し替え
 * - @/utils/unified-cache-db は fake（getCardInfo/setCardInfoFull/isInitialized/
 *   getValidCiidsForLang/reconstructCardInfo/recordMove + 初期化系noop）
 *   ※ isInitialized は false 固定: 実storeの addCard は isInitialized() が true の場合
 *     require('@/utils/language-detector') を呼ぶが、Node require は vite alias を解決できず
 *     例外になるため（tests/unit/stores/deck-edit-displayorder.test.ts と同一対応）。
 *     false の場合ciid言語チェックはスキップされ、追加処理自体は実store本来の経路で動く。
 * - 子コンポーネントはスタブ（RightAreaスロット付き・DeckSectionのprops反映・
 *   Practice系パネルのemit駆動・各ダイアログのprops assert）。
 *   ConfirmDialog/BaseDialog/ToastContainer は実物でDOM実断言する。
 *
 * describe構成は条件書の条件群A〜Iに1:1対応:
 * A 表示・レイアウト / B ライフサイクル / C グローバルショートカット / D 未保存変更 /
 * E レギュレーション修正提案 / F handleImported / G ダイアログ・ロード系 / H プラクティス /
 * I resize/hashchange
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { nextTick, defineComponent, h, inject, type Component } from 'vue';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import DeckEditLayout from '@/content/edit-ui/DeckEditLayout.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useDeckEditStore } from '@/stores/deck-edit';
import { useSettingsStore } from '@/stores/settings';
import { useSearchStore } from '@/stores/search';
import { usePracticeStore } from '@/stores/practice';
import { useToastStore } from '@/stores/toast-notification';
import * as deckCache from '@/utils/deck-cache';
import { searchCardById } from '@/api/card-search';
import type { CardInfo } from '@/types/card';
import type { DeckCardRef, DeckInfo, OperationResult } from '@/types/deck';
import type { RegulationFallback, RegulationTag, ResolvedRegulation } from '@/types/regulation';
import { DEFAULT_UX_SETTINGS } from '@/types/settings';
import { EXTENSION_IDS } from '@/utils/dom-selectors';
import { isHTMLButtonElement, isHTMLElement } from '@/utils/type-guards';

// appSettings.ux は settings store が DEFAULT_APP_SETTINGS を浅いコピーで初期化するため
// モジュール共有オブジェクトを参照する。テスト内の書き換えがテスト間へリークするため、
// 既定値をモジュール評価時に退避し、書き換えテストの前に複製へ差し替える。
const KEYBOARD_SHORTCUTS_SNAPSHOT = structuredClone(DEFAULT_UX_SETTINGS.keyboardShortcuts);

// ============================================================
// モック定義
// ============================================================

// deck-cache の部分モック: generateThumbnailsInBackground のみ差し替え
vi.mock('@/utils/deck-cache', async () => {
  const actual = await vi.importActual<typeof import('@/utils/deck-cache')>('@/utils/deck-cache');
  return {
    ...actual,
    generateThumbnailsInBackground: vi.fn(),
  };
});

// card-search の部分モック: searchCardById のみ差し替え
vi.mock('@/api/card-search', async () => {
  const actual = await vi.importActual<typeof import('@/api/card-search')>('@/api/card-search');
  return {
    ...actual,
    searchCardById: vi.fn(),
  };
});

// usePracticeActions のmock: executeAction は安定したspyを返す
const executeActionMock = vi.hoisted(() => vi.fn());
vi.mock('@/composables/practice/usePracticeActions', () => ({
  usePracticeActions: () => ({ executeAction: executeActionMock }),
}));

// unified-cache-db のfake差し替え（deck-edit storeのaddCard等が呼ぶAPIのみ実装）
const fakeUnifiedDB = vi.hoisted(() => {
  type FakeCardInfo = import('@/types/card').CardInfo;
  const cardInfoTable = new Map<string, FakeCardInfo>();
  const setCardInfoFullCalls: Array<{ cid: string; card: FakeCardInfo; forceUpdate: boolean }> = [];
  return {
    cardInfoTable,
    setCardInfoFullCalls,
    getCardInfo: (cid: string) => cardInfoTable.get(cid),
    setCardInfoFull: (cid: string, card: FakeCardInfo, forceUpdate = false) => {
      setCardInfoFullCalls.push({ cid, card, forceUpdate });
      cardInfoTable.set(cid, card);
      return true;
    },
    // isInitialized=false: addCard内のrequire('@/utils/language-detector')経路を回避
    // （Node requireはvite alias '@/'を解決できないため。詳細はファイルヘッダコメント）
    isInitialized: () => false,
    // 空配列=言語ごとのciid制約なし（addCardのciidチェックを素通し）
    getValidCiidsForLang: (): string[] => [],
    reconstructCardInfo: () => undefined,
    recordMove: () => {},
  };
});
vi.mock('@/utils/unified-cache-db', () => ({
  getUnifiedCacheDB: () => fakeUnifiedDB,
  initUnifiedCacheDB: async () => {},
  saveUnifiedCacheDB: async () => {},
  resetUnifiedCacheDB: () => {},
}));

// ============================================================
// 子コンポーネントスタブ
// ============================================================

// DeckEditTopBarスタブはinject('checkUnsavedChanges')を捕捉する（D群の駆動経路）
let capturedCheckUnsavedChanges:
  | ((action: () => void | Promise<void>, actionName: string) => Promise<void>)
  | undefined;

const DeckEditTopBarStub = defineComponent({
  name: 'DeckEditTopBar',
  props: {
    practiceMode: { type: Boolean, default: false },
  },
  emits: ['toggle-practice'],
  setup(props) {
    capturedCheckUnsavedChanges = inject<(action: () => void | Promise<void>, actionName: string) => Promise<void>>('checkUnsavedChanges');
    return () => h('div', { class: 'topbar-stub', 'data-practice-mode': String(props.practiceMode) });
  },
});

const RightAreaStub = defineComponent({
  name: 'RightArea',
  setup(_, { slots }) {
    return () =>
      h('div', { class: 'right-area-stub' }, [
        slots['practice-tab'] ? slots['practice-tab']() : null,
        slots['deck-tab'] ? slots['deck-tab']() : null,
      ]);
  },
});

// DeckSectionスタブ: computedのquantity展開とshowCountをprops経由で観測
const DeckSectionStub = defineComponent({
  name: 'DeckSection',
  props: {
    title: { type: String, default: '' },
    sectionType: { type: String, default: '' },
    cards: { type: Array, default: () => [] },
    showCount: { type: Boolean, default: true },
  },
  setup(props) {
    return () =>
      h('div', {
        class: ['section-stub', props.sectionType],
        'data-count': String(props.cards.length),
        'data-show-count': String(props.showCount),
        'data-title': props.title,
      });
  },
});

const PracticeFieldStub = defineComponent({
  name: 'PracticeField',
  props: {
    fieldIndex: { type: Number, default: 0 },
    hideEMZ: { type: Boolean, default: false },
  },
  setup: () => () => h('div', { class: 'practice-field-stub' }),
});

const PracticePlayerPanelStub = defineComponent({
  name: 'PracticePlayerPanel',
  emits: ['toggle-p2', 'load-deck-p2', 'save-temp-recipe', 'hard-reset', 'open-deck', 'open-deck-p2', 'save-deck'],
  setup: () => () => h('div', { class: 'practice-player-panel-stub' }),
});

const PracticeZoneInfoPanelStub = defineComponent({
  name: 'PracticeZoneInfoPanel',
  emits: ['action'],
  setup: () => () => h('div', { class: 'practice-zone-info-panel-stub' }),
});

const ImportExportDialogStub = defineComponent({
  name: 'ImportExportDialog',
  props: {
    isVisible: { type: Boolean, default: false },
    initialTab: { type: String, default: 'import' },
    dno: { type: String, default: '' },
    deckName: { type: String, default: '' },
    theme: { type: String, default: 'light' },
    includeTimestamp: { type: Boolean, default: false },
  },
  emits: ['close', 'imported', 'exported'],
  setup: () => () => h('div', { class: 'import-export-dialog-stub' }),
});

const SettingsDialogStub = defineComponent({
  name: 'SettingsDialog',
  props: {
    isVisible: { type: Boolean, default: false },
  },
  emits: ['close'],
  setup: () => () => h('div', { class: 'settings-dialog-stub' }),
});

const LoadDialogStub = defineComponent({
  name: 'LoadDialog',
  props: {
    isVisible: { type: Boolean, default: false },
  },
  emits: ['close', 'deck-loaded'],
  setup: () => () => h('div', { class: 'load-dialog-stub' }),
});

const STUBS: Record<string, Component> = {
  RightArea: RightAreaStub,
  DeckEditTopBar: DeckEditTopBarStub,
  DeckSection: DeckSectionStub,
  PracticeField: PracticeFieldStub,
  PracticePlayerPanel: PracticePlayerPanelStub,
  PracticeZoneInfoPanel: PracticeZoneInfoPanelStub,
  ImportExportDialog: ImportExportDialogStub,
  SettingsDialog: SettingsDialogStub,
  LoadDialog: LoadDialogStub,
};

// ============================================================
// helpers
// ============================================================

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const createCardInfo = (id: string): CardInfo => ({
  name: `カード${id}`,
  cardId: id,
  ciid: '1',
  lang: 'ja',
  imgs: [{ ciid: '1', imgHash: `${id}_hash_1` }],
  cardType: 'monster',
  attribute: 'dark',
  levelType: 'level',
  levelValue: 4,
  race: 'spellcaster',
  types: ['effect'],
  isExtraDeck: false,
});

const cardRef = (cid: string, quantity: number, ciid = '1'): DeckCardRef => ({
  cid,
  ciid,
  lang: 'ja',
  quantity,
});

const createDeckInfo = (overrides: Partial<DeckInfo> = {}): DeckInfo => ({
  dno: 0,
  name: '',
  mainDeck: [],
  extraDeck: [],
  sideDeck: [],
  category: [],
  tags: [],
  comment: '',
  deckCode: '',
  ...overrides,
});

describe('DeckEditLayout.vue', () => {
  let pinia: Pinia;
  let container: HTMLElement;
  let wrapper: VueWrapper | undefined;
  let localStorageMock: Storage;
  let originalYgoChangeLanguage: ((lang: string) => void) | undefined;
  let toastSpy: ReturnType<typeof vi.fn> | undefined;
  let innerWidthOriginalDescriptor: PropertyDescriptor | undefined;

  // mount helper: initializeOnPageLoad / fetchDeckList をdeferred制御可能にspyしてmount
  const mountLayout = (options: { initDeferred?: Deferred<void>; fetchDeferred?: Deferred<void>; errorHandler?: (err: unknown) => void } = {}) => {
    const deckStore = useDeckEditStore();
    const settingsStore = useSettingsStore();
    const toastStore = useToastStore();

    const initSpy = vi.spyOn(deckStore, 'initializeOnPageLoad').mockImplementation(() =>
      options.initDeferred ? options.initDeferred.promise : Promise.resolve()
    );
    const fetchSpy = vi.spyOn(deckStore, 'fetchDeckList').mockImplementation(() =>
      options.fetchDeferred ? options.fetchDeferred.promise : Promise.resolve(undefined)
    );
    // showToastはsetupで分割代入されるため、mount前にspyする（spyは呼び出しを記録しつつ実物を通す）
    toastSpy = vi.spyOn(toastStore, 'showToast');

    wrapper = mount(DeckEditLayout, {
      global: {
        plugins: [pinia],
        stubs: STUBS,
        ...(options.errorHandler ? { config: { errorHandler: options.errorHandler } } : {}),
      },
      attachTo: container,
    });
    return { deckStore, settingsStore, initSpy, fetchSpy };
  };

  const currentWrapper = (): VueWrapper => {
    if (!wrapper) throw new Error('wrapper is not mounted');
    return wrapper;
  };

  const getRootContainer = (): HTMLElement => {
    const el = container.querySelector('.deck-edit-container');
    if (!isHTMLElement(el)) throw new Error('.deck-edit-container not found');
    return el;
  };

  const sectionStubAttr = (selector: string, attr: string): string => {
    const el = container.querySelector(selector);
    if (!isHTMLElement(el)) throw new Error(`${selector} not found`);
    const value = el.getAttribute(attr);
    if (value === null) throw new Error(`${selector} has no ${attr}`);
    return value;
  };

  // wrapper.vm上のsetup公開メンバを型ガード付きで取り出す（asキャスト不使用）
  const getVmFunction = (name: string): (...args: unknown[]) => unknown => {
    const candidate: unknown = currentWrapper().vm[name];
    if (typeof candidate !== 'function') {
      throw new Error(`vm.${name} is not exposed as a function`);
    }
    return candidate;
  };

  const getCapturedCheck = (): ((action: () => void | Promise<void>, actionName: string) => Promise<void>) => {
    if (!capturedCheckUnsavedChanges) throw new Error('checkUnsavedChanges is not provided');
    return capturedCheckUnsavedChanges;
  };

  const importExportStub = () => currentWrapper().getComponent(ImportExportDialogStub);
  const settingsDialogStub = () => currentWrapper().getComponent(SettingsDialogStub);
  const loadDialogStub = () => currentWrapper().getComponent(LoadDialogStub);
  const playerPanelStub = () => currentWrapper().getComponent(PracticePlayerPanelStub);
  const zoneInfoPanelStub = () => currentWrapper().getComponent(PracticeZoneInfoPanelStub);
  const topBarStubs = () => currentWrapper().findAllComponents(DeckEditTopBarStub);

  const emitKeydown = (init: { key: string; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }) => {
    const event = new KeyboardEvent('keydown', {
      key: init.key,
      ctrlKey: init.ctrlKey ?? false,
      shiftKey: init.shiftKey ?? false,
      altKey: init.altKey ?? false,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');
    window.dispatchEvent(event);
    return { preventDefaultSpy, stopPropagationSpy };
  };

  const clickBodyButton = async (label: string) => {
    const buttons = Array.from(document.body.querySelectorAll('.base-dialog-overlay .btn'));
    const target = buttons.find(btn => isHTMLButtonElement(btn) && (btn.textContent ?? '').trim() === label);
    if (!isHTMLButtonElement(target)) throw new Error(`dialog button not found: ${label}`);
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    return target;
  };

  const getDialogMessage = (): string => {
    const el = document.body.querySelector('.base-dialog-overlay .dialog-message');
    if (!isHTMLElement(el)) throw new Error('.dialog-message not found');
    return el.textContent ?? '';
  };

  // D群: 未保存ダイアログを開く（actionをpendingActionへ積む）
  const openUnsavedDialog = async (
    deckStore: ReturnType<typeof useDeckEditStore>,
    settingsStore: ReturnType<typeof useSettingsStore>,
    action: () => void | Promise<void>,
    actionName = 'ページ移動'
  ) => {
    settingsStore.appSettings.unsavedWarning = 'always';
    vi.spyOn(deckStore, 'hasUnsavedChanges').mockReturnValue(true);
    await getCapturedCheck()(action, actionName);
    await nextTick();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fakeUnifiedDB.cardInfoTable.clear();
    fakeUnifiedDB.setCardInfoFullCalls.length = 0;
    executeActionMock.mockClear();

    pinia = createPinia();
    setActivePinia(pinia);

    // onUnmountedがygoChangeLanguageを復元しないため、テスト側で保存・復元する
    originalYgoChangeLanguage = window.ygoChangeLanguage;

    container = document.createElement('div');
    document.body.appendChild(container);
    window.location.hash = '';

    // localStorageのモック（Storage型を完全実装するためキャスト不要）
    const mock: Storage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      key: vi.fn(() => null),
    };
    vi.stubGlobal('localStorage', mock);
    localStorageMock = mock;

    capturedCheckUnsavedChanges = undefined;
    toastSpy = undefined;
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = undefined;
    }
    if (container) container.remove();
    // Teleport等によるbody直下への残留を掃除
    document.body.querySelectorAll('.ygo-next, .base-dialog-overlay').forEach(el => {
      el.remove();
    });
    // ファビコン差し替えテストのhead残留を掃除
    document.head.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove());
    const moduleOverlay = document.getElementById(EXTENSION_IDS.loading.moduleLoadingOverlay);
    if (moduleOverlay) moduleOverlay.remove();

    // 現行実装はunmountで復元しないためテスト側で復元（TASK-495）
    window.ygoChangeLanguage = originalYgoChangeLanguage;

    if (innerWidthOriginalDescriptor) {
      Object.defineProperty(window, 'innerWidth', innerWidthOriginalDescriptor);
      innerWidthOriginalDescriptor = undefined;
    }

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const stubInnerWidth = (width: number) => {
    innerWidthOriginalDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => width });
  };

  // ============================================================
  // A. 表示・レイアウト
  // ============================================================
  describe('A. 表示・レイアウト', () => {
    it('[covers:deck-edit-layout.root-container-vshow-until-ready] isReady=falseの間はルートコンテナがDOM存在・非表示、初期化完了で表示される', async () => {
      const init = createDeferred<void>();
      mountLayout({ initDeferred: init });

      const root = getRootContainer();
      expect(root.classList.contains('ygo-next')).toBe(true);
      // v-show: DOM存在するが display:none
      expect(root.style.display).toBe('none');

      init.resolve();
      await flushPromises();
      await nextTick();

      expect(getRootContainer().style.display).toBe('');
    });

    it('[covers:deck-edit-layout.loading-overlay-states] ローディングオーバーレイはisLoadingDeck/isImportingの論理和で表示し、テキストはisImporting優先', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      await nextTick();

      // 両方false: 非表示
      expect(container.querySelector('.deck-loading-overlay')).toBe(null);

      // isLoadingDeckのみ
      deckStore.isLoadingDeck = true;
      await nextTick();
      expect(container.querySelector('.deck-loading-overlay')).not.toBe(null);
      expect(container.querySelector('.loading-text')?.textContent).toBe('Loading...');

      // 両方true: isImporting優先
      deckStore.isImporting = true;
      await nextTick();
      expect(container.querySelector('.loading-text')?.textContent).toBe('インポート中...');

      // isImportingのみ
      deckStore.isLoadingDeck = false;
      await nextTick();
      expect(container.querySelector('.loading-text')?.textContent).toBe('インポート中...');

      deckStore.isImporting = false;
      await nextTick();
      expect(container.querySelector('.deck-loading-overlay')).toBe(null);
    });

    it('[covers:deck-edit-layout.unified-overlay-zindex] 統一オーバーレイはstoreのoverlayVisible/overlayZIndexをそのまま反映する', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      await nextTick();

      deckStore.overlayZIndex = 10000;
      deckStore.overlayVisible = true;
      await nextTick();
      const overlay = container.querySelector('.unified-overlay');
      if (!isHTMLElement(overlay)) throw new Error('.unified-overlay not found');
      expect(overlay.style.zIndex).toBe('10000');

      deckStore.overlayVisible = false;
      await nextTick();
      expect(container.querySelector('.unified-overlay')).toBe(null);
    });

    it('[covers:deck-edit-layout.deck-sections-quantity-expansion] DeckSectionへ渡すcardsはquantity枚数分に展開される', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      await nextTick();

      deckStore.deckInfo.mainDeck = [cardRef('c1', 3)];
      deckStore.deckInfo.extraDeck = [cardRef('c2', 2)];
      deckStore.deckInfo.sideDeck = [cardRef('c3', 1)];
      await nextTick();

      expect(sectionStubAttr('.main-content .section-stub.main', 'data-count')).toBe('3');
      expect(sectionStubAttr('.main-content .section-stub.extra', 'data-count')).toBe('2');
      expect(sectionStubAttr('.main-content .section-stub.side', 'data-count')).toBe('1');
    });

    it('[covers:deck-edit-layout.trash-section-from-store-trash] trashセクションはdeckStore.trashDeckをquantity展開して参照する', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      await nextTick();

      deckStore.deckInfo.mainDeck = [cardRef('c1', 1)];
      deckStore.trashDeck = [cardRef('c9', 2)];
      await nextTick();

      expect(sectionStubAttr('.main-content .section-stub.trash', 'data-count')).toBe('2');
      // mainはdeckInfo由来のまま（trash参照と独立）
      expect(sectionStubAttr('.main-content .section-stub.main', 'data-count')).toBe('1');
    });

    it('[covers:deck-edit-layout.trash-section-show-count-false] trashセクションはshowCount=false、他セクションは既定値のまま', async () => {
      mountLayout();
      await flushPromises();
      await nextTick();

      expect(sectionStubAttr('.main-content .section-stub.trash', 'data-show-count')).toBe('false');
      expect(sectionStubAttr('.main-content .section-stub.main', 'data-show-count')).toBe('true');
      expect(sectionStubAttr('.main-content .section-stub.extra', 'data-show-count')).toBe('true');
      expect(sectionStubAttr('.main-content .section-stub.side', 'data-show-count')).toBe('true');
    });

    it('[covers:deck-edit-layout.middle-decks-vertical-class] middle-decksの配置クラスはmiddleDecksLayoutのverticalで切替する', async () => {
      const { settingsStore } = mountLayout();
      await flushPromises();
      await nextTick();

      settingsStore.appSettings.middleDecksLayout = 'vertical';
      await nextTick();
      const middle = container.querySelector('.main-content .middle-decks');
      if (!isHTMLElement(middle)) throw new Error('.middle-decks not found');
      expect(middle.classList.contains('vertical-layout')).toBe(true);
      expect(middle.classList.contains('middle-decks')).toBe(true);

      settingsStore.appSettings.middleDecksLayout = 'horizontal';
      await nextTick();
      const middleHorizontal = container.querySelector('.main-content .middle-decks');
      if (!isHTMLElement(middleHorizontal)) throw new Error('.middle-decks not found');
      expect(middleHorizontal.classList.contains('vertical-layout')).toBe(false);
    });

    it('[covers:deck-edit-layout.theme-attribute-binding] data-ygo-next-themeはeffectiveThemeに追従する', async () => {
      const { settingsStore } = mountLayout();
      await flushPromises();
      await nextTick();

      settingsStore.appSettings.theme = 'dark';
      await nextTick();
      expect(getRootContainer().getAttribute('data-ygo-next-theme')).toBe('dark');

      settingsStore.appSettings.theme = 'light';
      await nextTick();
      expect(getRootContainer().getAttribute('data-ygo-next-theme')).toBe('light');
    });

    it('[covers:deck-edit-layout.import-export-dialog-visibility-and-tab] ImportExportDialogのisVisibleは両フラグの論理和、initialTabはexport優先', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      await nextTick();

      expect(importExportStub().props('isVisible')).toBe(false);
      expect(importExportStub().props('initialTab')).toBe('import');

      deckStore.showImportDialog = true;
      await nextTick();
      expect(importExportStub().props('isVisible')).toBe(true);
      expect(importExportStub().props('initialTab')).toBe('import');

      deckStore.showImportDialog = false;
      deckStore.showExportDialog = true;
      await nextTick();
      expect(importExportStub().props('isVisible')).toBe(true);
      expect(importExportStub().props('initialTab')).toBe('export');

      deckStore.showExportDialog = false;
      await nextTick();
      expect(importExportStub().props('isVisible')).toBe(false);
    });

    it('[covers:deck-edit-layout.settings-dialog-visibility] SettingsDialogはshowSettingsDialogで表示されclose emitで閉じる', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      await nextTick();

      deckStore.showSettingsDialog = true;
      await nextTick();
      expect(settingsDialogStub().props('isVisible')).toBe(true);

      settingsDialogStub().vm.$emit('close');
      await nextTick();
      expect(deckStore.showSettingsDialog).toBe(false);
      expect(settingsDialogStub().props('isVisible')).toBe(false);
    });

    it('[covers:deck-edit-layout.load-dialog-visibility] LoadDialogはshowLoadDialogで表示されclose emitで閉じる', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      await nextTick();

      deckStore.showLoadDialog = true;
      await nextTick();
      expect(loadDialogStub().props('isVisible')).toBe(true);

      loadDialogStub().vm.$emit('close');
      await nextTick();
      expect(deckStore.showLoadDialog).toBe(false);
      expect(loadDialogStub().props('isVisible')).toBe(false);
    });

    it('[covers:deck-edit-layout.delete-confirm-dialog-content] 削除確認ダイアログのデッキ名はgetDeckName()が空時に(名称未設定)へフォールバックする', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      await nextTick();

      deckStore.showDeleteConfirm = true;

      // デッキ名あり
      deckStore.setDeckName('デッキA');
      await nextTick();
      let body = container.querySelector('.delete-confirm-body p');
      if (!isHTMLElement(body)) throw new Error('.delete-confirm-body p not found');
      expect(body.textContent).toBe('本当に「デッキA」を削除しますか？');

      // デッキ名空
      deckStore.setDeckName('');
      await nextTick();
      body = container.querySelector('.delete-confirm-body p');
      if (!isHTMLElement(body)) throw new Error('.delete-confirm-body p not found');
      expect(body.textContent).toBe('本当に「(名称未設定)」を削除しますか？');

      expect(container.querySelector('.btn-cancel')).not.toBe(null);
      expect(container.querySelector('.btn-delete')).not.toBe(null);
    });

    it('[covers:deck-edit-layout.practice-mode-template-switch] practiceModeでデスクトップとdeck-tabスロット両方が通常/practice表示を切替する', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      await nextTick();
      settingsStore.featureSettings.practice = true;

      const topbars = topBarStubs();
      expect(topbars.length).toBeGreaterThanOrEqual(2);

      // 通常時: deck-areas（DeckSection群）のみ
      expect(container.querySelector('.main-content .deck-areas.practice-field-container')).toBe(null);
      expect(container.querySelector('.main-content .deck-areas:not(.practice-field-container)')).not.toBe(null);
      expect(container.querySelector('.right-area-stub .deck-areas.practice-field-container')).toBe(null);

      // practice ON
      topbars[0].vm.$emit('toggle-practice');
      await nextTick();
      expect(container.querySelector('.main-content .deck-areas.practice-field-container')).not.toBe(null);
      expect(container.querySelector('.main-content .deck-areas:not(.practice-field-container)')).toBe(null);
      expect(container.querySelector('.right-area-stub .deck-areas.practice-field-container')).not.toBe(null);
      // twoDeckMode=falseではp2ラッパーなし
      expect(container.querySelector('.main-content .p2-field-wrapper')).toBe(null);

      // twoDeckMode=true(p2DeckDno設定)でp2ラッパー追加
      const practiceStore = usePracticeStore();
      practiceStore.p2DeckDno = 5;
      await nextTick();
      expect(container.querySelector('.main-content .p2-field-wrapper')).not.toBe(null);

      // practice OFF
      practiceStore.p2DeckDno = null;
      topbars[0].vm.$emit('toggle-practice');
      await nextTick();
      expect(container.querySelector('.main-content .deck-areas.practice-field-container')).toBe(null);
      expect(container.querySelector('.main-content .deck-areas:not(.practice-field-container)')).not.toBe(null);
      // 未使用参照警告回避（deckStoreは表示分岐に無関係であることを明示）
      expect(deckStore.practiceMode ?? true).toBeTruthy();
    });
  });

  // ============================================================
  // B. ライフサイクル（onMounted / onUnmounted / changeFavicon）
  // ============================================================
  describe('B. ライフサイクル', () => {
    it('[covers:deck-edit-layout.mounted-registers-listeners-before-async-init] リスナー登録は初期化await前で、完了前からkeydown/resize/hashchangeが有効', async () => {
      window.location.hash = '#/ytomo/edit?dno=1';
      const init = createDeferred<void>();
      const { deckStore, initSpy } = mountLayout({ initDeferred: init });

      // flushPromisesせず（= 初期化未解決のまま）各リスナーが発火する
      const undoSpy = vi.spyOn(deckStore, 'undo');
      emitKeydown({ key: 'z', ctrlKey: true });
      expect(undoSpy).toHaveBeenCalledTimes(1);

      deckStore.activeTab = 'deck';
      window.dispatchEvent(new Event('resize'));
      expect(deckStore.activeTab).toBe('search');

      window.location.hash = '#/ytomo/edit?dno=2';
      window.dispatchEvent(new Event('hashchange'));
      expect(initSpy).toHaveBeenCalledTimes(2);

      init.resolve();
      await flushPromises();
    });

    it('[covers:deck-edit-layout.mounted-sets-ready-after-deck-list-fetch] isReadyはinitializeOnPageLoadとfetchDeckList両方の完了後にtrueになる', async () => {
      const init = createDeferred<void>();
      const fetchDeckList = createDeferred<void>();
      mountLayout({ initDeferred: init, fetchDeferred: fetchDeckList });

      expect(getRootContainer().style.display).toBe('none');

      init.resolve();
      await flushPromises();
      await nextTick();
      // fetchDeckList未解決: まだ非表示
      expect(getRootContainer().style.display).toBe('none');

      fetchDeckList.resolve();
      await flushPromises();
      await nextTick();
      expect(getRootContainer().style.display).toBe('');
    });

    it('[covers:deck-edit-layout.mounted-removes-module-loading-overlay] isReady後nextTickを待ってモジュールローディングオーバーレイをフェードアウト後に削除する', async () => {
      vi.useFakeTimers();
      const overlay = document.createElement('div');
      overlay.id = EXTENSION_IDS.loading.moduleLoadingOverlay;
      document.body.appendChild(overlay);

      mountLayout();
      await vi.advanceTimersByTimeAsync(0);

      // nextTick後: フェードアウト開始（opacity/transition設定）し、150ms経過でremove
      expect(overlay.style.opacity).toBe('0');
      expect(overlay.style.transition).toBe('opacity 150ms ease-out');
      expect(document.body.contains(overlay)).toBe(true);

      vi.advanceTimersByTime(150);
      expect(document.body.contains(overlay)).toBe(false);
    });

    it('[covers:deck-edit-layout.mounted-overrides-ygo-change-language] mount完了時にwindow.ygoChangeLanguageがwrapperへ差し替わる（元がundefinedでも設定される）', async () => {
      const original = vi.fn();
      window.ygoChangeLanguage = original;
      mountLayout();
      await flushPromises();

      expect(typeof window.ygoChangeLanguage).toBe('function');
      expect(window.ygoChangeLanguage).not.toBe(original);

      // 元がundefinedでもwrapperは設定される
      // 前のwrapperを必ずunmountしてから再mountする（unmountしないと旧wrapperの
      // windowリスナーが残留し、以降のテストへリークする）
      currentWrapper().unmount();
      wrapper = undefined;
      delete window.ygoChangeLanguage;
      mountLayout();
      await flushPromises();
      expect(typeof window.ygoChangeLanguage).toBe('function');
    });

    it('[covers:deck-edit-layout.ygo-change-language-unsaved-shows-dialog] 未保存変更がある状態での言語変更は確認ダイアログに差し替わり即座に実行しない', async () => {
      // 元関数はmount前に設定する（onMountedがmount時点の値をキャプチャしてwrapper化する）
      const original = vi.fn();
      window.ygoChangeLanguage = original;

      const { deckStore } = mountLayout();
      await flushPromises();

      vi.spyOn(deckStore, 'hasUnsavedChanges').mockReturnValue(true);

      // mount後のwindow.ygoChangeLanguageはwrapper
      const wrapperFn = window.ygoChangeLanguage;
      if (typeof wrapperFn !== 'function') throw new Error('ygoChangeLanguage wrapper is not set');
      wrapperFn('en');
      await nextTick();

      expect(original).not.toHaveBeenCalled();
      expect(deckStore.showUnsavedChangesDialog).toBe(true);
      expect(getDialogMessage()).toBe('言語を変更するとページが再読み込みされます。保存してから変更しますか？');

      // pendingActionに言語変更実行関数が積まれている: 「保存せず続ける」で元関数が呼ばれる
      await clickBodyButton('保存せず続ける');
      await flushPromises();
      expect(original).toHaveBeenCalledWith('en');
    });

    it('[covers:deck-edit-layout.ygo-change-language-no-unsaved-executes-directly] 未保存変更がない状態での言語変更は確認なしで元関数を実行する', async () => {
      // 元関数はmount前に設定する（onMountedがmount時点の値をキャプチャしてwrapper化する）
      const original = vi.fn();
      window.ygoChangeLanguage = original;

      const { deckStore } = mountLayout();
      await flushPromises();

      vi.spyOn(deckStore, 'hasUnsavedChanges').mockReturnValue(false);

      // mount後のwindow.ygoChangeLanguageはwrapper
      const wrapperFn = window.ygoChangeLanguage;
      if (typeof wrapperFn !== 'function') throw new Error('ygoChangeLanguage wrapper is not set');
      wrapperFn('en');

      expect(original).toHaveBeenCalledWith('en');
      expect(deckStore.showUnsavedChangesDialog).toBe(false);
      expect(document.body.querySelector('.base-dialog-overlay')).toBe(null);
    });

    it('[covers:deck-edit-layout.change-favicon-when-enabled] changeFavicon=true時、既存icon linkを削除し拡張機能アイコン3件をheadへ追加する', async () => {
      const { settingsStore } = mountLayout();
      settingsStore.appSettings.ux.changeFavicon = true;

      const existing = document.createElement('link');
      existing.rel = 'icon';
      document.head.appendChild(existing);

      // mountし直し（onMounted時点でchangeFaviconが有効な状態にする）
      wrapper?.unmount();
      wrapper = undefined;
      mountLayout();
      await flushPromises();

      const links = Array.from(document.head.querySelectorAll('link[rel="icon"]'));
      expect(links).toHaveLength(3);
      // happy-domでは link.sizes= への代入が属性へ反射されないためsizesプロパティで観測する
      expect(links.map(l => String(l.sizes))).toEqual(['16x16', '48x48', '128x128']);
      // hrefは実装（chrome.runtime.getURL(path) → path）が正本
      expect(links.map(l => l.getAttribute('href'))).toEqual([
        'icons/icon16.png',
        'icons/icon48.png',
        'icons/icon128.png',
      ]);
      links.forEach(l => expect(l.getAttribute('type')).toBe('image/png'));
      expect(document.head.contains(existing)).toBe(false);
    });

    it('[covers:deck-edit-layout.change-favicon-disabled-noop] changeFavicon=false時はファビコン変更を行わない', async () => {
      const { settingsStore } = mountLayout();
      settingsStore.appSettings.ux.changeFavicon = false;

      const existing = document.createElement('link');
      existing.rel = 'icon';
      existing.setAttribute('href', 'original.ico');
      document.head.appendChild(existing);

      wrapper?.unmount();
      wrapper = undefined;
      mountLayout();
      await flushPromises();

      expect(document.head.contains(existing)).toBe(true);
      expect(Array.from(document.head.querySelectorAll('link[rel="icon"]'))).toHaveLength(1);
    });

    it('[covers:deck-edit-layout.change-favicon-catch-logs-error] ファビコン差し替え中の例外はlogして外へ伝播させない', async () => {
      vi.stubGlobal('chrome', {
        runtime: {
          getURL: () => {
            throw new Error('getURL failed');
          },
        },
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { settingsStore } = mountLayout();
      settingsStore.appSettings.ux.changeFavicon = true;
      wrapper?.unmount();
      wrapper = undefined;
      mountLayout();
      await flushPromises();

      expect(errorSpy).toHaveBeenCalledWith('Failed to change favicon:', expect.any(Error));
    });

    it('[covers:deck-edit-layout.thumbnails-generated-when-deck-list-exists] deckListが存在する場合のみ先頭24デッキのサムネイル背景生成を呼ぶ', async () => {
      const deckStore = useDeckEditStore();
      deckStore.deckList = [{ dno: 1, name: 'デッキ1' }, { dno: 2, name: 'デッキ2' }];
      mountLayout();
      await flushPromises();

      expect(vi.mocked(deckCache.generateThumbnailsInBackground)).toHaveBeenCalledWith(
        0,
        24,
        deckStore.deckList,
        expect.any(Function),
        deckStore.headPlacementCardIds,
        deckStore.deckThumbnails,
        deckStore.cachedDeckInfos
      );
    });

    it('[covers:deck-edit-layout.thumbnails-skipped-when-no-deck-list] deckListが空の場合はサムネイル背景生成を呼ばない', async () => {
      const deckStore = useDeckEditStore();
      deckStore.deckList = [];
      mountLayout();
      await flushPromises();

      expect(vi.mocked(deckCache.generateThumbnailsInBackground)).not.toHaveBeenCalled();
    });

    it('[covers:deck-edit-layout.unmounted-removes-all-listeners] unmount後のhashchange/resize/keydownでいずれのハンドラも実行されない', async () => {
      window.location.hash = '#/ytomo/edit?dno=1';
      const { deckStore, initSpy } = mountLayout();
      await flushPromises();

      const undoSpy = vi.spyOn(deckStore, 'undo');
      deckStore.activeTab = 'deck';

      currentWrapper().unmount();
      wrapper = undefined;

      emitKeydown({ key: 'z', ctrlKey: true });
      window.dispatchEvent(new Event('resize'));
      window.location.hash = '#/ytomo/edit?dno=2';
      window.dispatchEvent(new Event('hashchange'));

      expect(undoSpy).not.toHaveBeenCalled();
      expect(deckStore.activeTab).toBe('deck');
      expect(initSpy).toHaveBeenCalledTimes(1);
    });

    it('[covers:deck-edit-layout.unmounted-does-not-restore-ygo-change-language] 現行挙動: unmountしてもwindow.ygoChangeLanguageはwrapperのまま復元されない', async () => {
      const original = vi.fn();
      window.ygoChangeLanguage = original;
      mountLayout();
      await flushPromises();

      const wrapperFn = window.ygoChangeLanguage;
      expect(wrapperFn).not.toBe(original);

      currentWrapper().unmount();
      wrapper = undefined;

      // 期待仕様は復元だが、現行実装ではwrapperが残留する（TASK-495）
      expect(window.ygoChangeLanguage).toBe(wrapperFn);
      expect(window.ygoChangeLanguage).not.toBe(original);
    });
  });

  // ============================================================
  // C. グローバルキーボードショートカット
  // ============================================================
  describe('C. グローバルキーボードショートカット', () => {
    beforeEach(() => {
      // keyboardShortcutsはモジュール共有オブジェクトのため、書き換えテスト間で
      // 既定値が汚染される。各テスト前に既定値スナップショットの複製へ戻す
      const settingsStore = useSettingsStore();
      settingsStore.appSettings.ux.keyboardShortcuts = structuredClone(KEYBOARD_SHORTCUTS_SNAPSHOT);
    });

    it('[covers:deck-edit-layout.shortcut-ignored-in-global-search-mode] グローバル検索モード中のkeydownは最優先で無視する', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const searchStore = useSearchStore();
      const undoSpy = vi.spyOn(deckStore, 'undo');

      searchStore.isGlobalSearchMode = true;
      const { preventDefaultSpy, stopPropagationSpy } = emitKeydown({ key: 'z', ctrlKey: true });

      expect(undoSpy).not.toHaveBeenCalled();
      expect(searchStore.isGlobalSearchMode).toBe(true);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(stopPropagationSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-edit-layout.shortcut-ignored-while-input-focused] INPUT/TEXTAREA/contentEditableフォーカス中はショートカット判定をスキップする', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const undoSpy = vi.spyOn(deckStore, 'undo');

      const input = document.createElement('input');
      container.appendChild(input);
      input.focus();
      emitKeydown({ key: 'z', ctrlKey: true });
      expect(undoSpy).not.toHaveBeenCalled();

      const textarea = document.createElement('textarea');
      container.appendChild(textarea);
      textarea.focus();
      emitKeydown({ key: 'z', ctrlKey: true });
      expect(undoSpy).not.toHaveBeenCalled();

      const editable = document.createElement('div');
      Object.defineProperty(editable, 'contentEditable', { get: () => 'true' });
      container.appendChild(editable);
      editable.focus();
      emitKeydown({ key: 'z', ctrlKey: true });
      expect(undoSpy).not.toHaveBeenCalled();

      // 対比: input以外の要素フォーカス時は実行される
      const plain = document.createElement('div');
      container.appendChild(plain);
      plain.focus();
      emitKeydown({ key: 'z', ctrlKey: true });
      expect(undoSpy).toHaveBeenCalledTimes(1);
    });

    it('[covers:deck-edit-layout.shortcut-global-search-activates-mode] globalSearchショートカット(既定/)で検索モードを有効化し既定動作を抑止する', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const searchStore = useSearchStore();
      const undoSpy = vi.spyOn(deckStore, 'undo');

      const { preventDefaultSpy, stopPropagationSpy } = emitKeydown({ key: '/' });

      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
      expect(stopPropagationSpy).toHaveBeenCalledTimes(1);
      expect(searchStore.isGlobalSearchMode).toBe(true);
      expect(undoSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-edit-layout.shortcut-global-search-ignored-before-ready] 初期化完了前(isReady=false)のglobalSearchショートカットは無視され検索モードを有効化しない', async () => {
      const init = createDeferred<void>();
      const { deckStore } = mountLayout({ initDeferred: init });
      const searchStore = useSearchStore();
      const undoSpy = vi.spyOn(deckStore, 'undo');

      // 初期化中（isReady=false）: '/'はglobalSearch分岐を通らず素通りする
      const { preventDefaultSpy, stopPropagationSpy } = emitKeydown({ key: '/' });
      expect(searchStore.isGlobalSearchMode).toBe(false);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(stopPropagationSpy).not.toHaveBeenCalled();
      expect(undoSpy).not.toHaveBeenCalled();

      // 対比: 初期化完了（isReady=true）後は同じ'/'で検索モードが有効化される
      init.resolve();
      await flushPromises();
      const { preventDefaultSpy: readyPreventDefaultSpy } = emitKeydown({ key: '/' });
      expect(searchStore.isGlobalSearchMode).toBe(true);
      expect(readyPreventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    it('[covers:deck-edit-layout.shortcut-undo-executes-undo] undoショートカット(既定Ctrl+Z)でundoを実行する', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const undoSpy = vi.spyOn(deckStore, 'undo');
      const redoSpy = vi.spyOn(deckStore, 'redo');

      const { preventDefaultSpy } = emitKeydown({ key: 'z', ctrlKey: true });

      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
      expect(undoSpy).toHaveBeenCalledTimes(1);
      expect(redoSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-edit-layout.shortcut-redo-executes-redo] redoショートカット(既定Ctrl+Y)でredoを実行する', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const undoSpy = vi.spyOn(deckStore, 'undo');
      const redoSpy = vi.spyOn(deckStore, 'redo');

      const { preventDefaultSpy } = emitKeydown({ key: 'y', ctrlKey: true });

      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
      expect(redoSpy).toHaveBeenCalledTimes(1);
      expect(undoSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-edit-layout.shortcut-first-match-wins] 判定順はglobalSearchが先で、複数定義に一致しても先頭の1つのみ実行する', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      const searchStore = useSearchStore();
      const undoSpy = vi.spyOn(deckStore, 'undo');

      // globalSearch定義をundo定義と同じキーにする
      settingsStore.appSettings.ux.keyboardShortcuts.globalSearch = [
        { key: 'z', ctrl: true, shift: false, alt: false },
      ];
      emitKeydown({ key: 'z', ctrlKey: true });

      expect(searchStore.isGlobalSearchMode).toBe(true);
      expect(undoSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-edit-layout.matches-shortcut-null-returns-false] ショートカット定義がnullの場合はマッチせずkeydownを無視する', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      const undoSpy = vi.spyOn(deckStore, 'undo');

      const shortcutsRecord: Record<string, unknown> = settingsStore.appSettings.ux.keyboardShortcuts;
      shortcutsRecord.undo = null;
      emitKeydown({ key: 'z', ctrlKey: true });

      expect(undoSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-edit-layout.matches-shortcut-exact-modifiers] マッチ判定は修飾キーまで完全一致が必要', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      const undoSpy = vi.spyOn(deckStore, 'undo');

      settingsStore.appSettings.ux.keyboardShortcuts.undo = [
        { key: 'z', ctrl: true, shift: false, alt: false },
      ];

      emitKeydown({ key: 'z', ctrlKey: true });
      emitKeydown({ key: 'z', ctrlKey: true, shiftKey: true });
      emitKeydown({ key: 'z', ctrlKey: true, altKey: true });
      emitKeydown({ key: 'y', ctrlKey: true });

      expect(undoSpy).toHaveBeenCalledTimes(1);
    });

    it('[covers:deck-edit-layout.matches-any-shortcut-handles-object-form] ショートカット群がオブジェクト形式でも配列化して判定する', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      const undoSpy = vi.spyOn(deckStore, 'undo');

      const shortcutsRecord: Record<string, unknown> = settingsStore.appSettings.ux.keyboardShortcuts;
      shortcutsRecord.undo = { a: { key: 'z', ctrl: true, shift: false, alt: false } };
      emitKeydown({ key: 'z', ctrlKey: true });

      expect(undoSpy).toHaveBeenCalledTimes(1);
    });

    it('[covers:deck-edit-layout.matches-any-shortcut-empty-returns-false] ショートカット群が空配列の場合はマッチしない', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      const undoSpy = vi.spyOn(deckStore, 'undo');

      const shortcutsRecord: Record<string, unknown> = settingsStore.appSettings.ux.keyboardShortcuts;
      shortcutsRecord.undo = [];
      emitKeydown({ key: 'z', ctrlKey: true });

      expect(undoSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // D. 未保存変更（checkUnsavedChanges / unsavedChangesButtons / cancelUnsavedChanges）
  // ============================================================
  describe('D. 未保存変更', () => {
    it('[covers:deck-edit-layout.unsaved-never-warning-skipped] unsavedWarning=neverの場合は警告せずactionを即実行する', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      settingsStore.appSettings.unsavedWarning = 'never';
      vi.spyOn(deckStore, 'hasUnsavedChanges').mockReturnValue(true);

      const action = vi.fn().mockResolvedValue(undefined);
      await getCapturedCheck()(action, 'ページ移動');

      expect(action).toHaveBeenCalledTimes(1);
      expect(deckStore.showUnsavedChangesDialog).toBe(false);
    });

    it('[covers:deck-edit-layout.unsaved-no-changes-executes-action] 未保存変更がない場合は警告設定によらずactionを実行する', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      settingsStore.appSettings.unsavedWarning = 'always';
      vi.spyOn(deckStore, 'hasUnsavedChanges').mockReturnValue(false);

      const action = vi.fn().mockResolvedValue(undefined);
      await getCapturedCheck()(action, 'ページ移動');

      expect(action).toHaveBeenCalledTimes(1);
      expect(deckStore.showUnsavedChangesDialog).toBe(false);
    });

    it('[covers:deck-edit-layout.unsaved-sorting-only-skips-warning] without-sorting-onlyではソート順のみの変更は警告せずactionを実行する', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      settingsStore.appSettings.unsavedWarning = 'without-sorting-only';
      vi.spyOn(deckStore, 'hasUnsavedChanges').mockReturnValue(true);
      vi.spyOn(deckStore, 'hasOnlySortOrderChanges').mockReturnValue(true);

      const action = vi.fn().mockResolvedValue(undefined);
      await getCapturedCheck()(action, 'ページ移動');

      expect(action).toHaveBeenCalledTimes(1);
      expect(deckStore.showUnsavedChangesDialog).toBe(false);
    });

    it('[covers:deck-edit-layout.unsaved-changes-shows-dialog] 警告対象の未保存変更がある場合はactionを実行せずダイアログ表示とpendingAction待機へ切替える', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();

      const action = vi.fn().mockResolvedValue(undefined);
      await openUnsavedDialog(deckStore, settingsStore, action);

      expect(deckStore.showUnsavedChangesDialog).toBe(true);
      expect(action).not.toHaveBeenCalled();
      expect(getDialogMessage()).toBe('デッキに変更がありますが、保存せずにページ移動を行いますか？');
    });

    it('[covers:deck-edit-layout.unsaved-button-interrupt-closes] 「処理を中断」でダイアログを閉じpendingActionを破棄する', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();

      const action1 = vi.fn().mockResolvedValue(undefined);
      await openUnsavedDialog(deckStore, settingsStore, action1);
      await clickBodyButton('処理を中断');
      await flushPromises();

      expect(deckStore.showUnsavedChangesDialog).toBe(false);
      expect(action1).not.toHaveBeenCalled();

      // pendingAction破棄の確認: 新しいcycleでcontinueしてもaction1は実行されない
      const action2 = vi.fn().mockResolvedValue(undefined);
      await openUnsavedDialog(deckStore, settingsStore, action2);
      await clickBodyButton('保存せず続ける');
      await flushPromises();
      expect(action1).not.toHaveBeenCalled();
      expect(action2).toHaveBeenCalledTimes(1);
    });

    it('[covers:deck-edit-layout.unsaved-button-save-continue-runs-action] 「保存して続ける」は保存成功時にトーストを出し後続actionを実行してから閉じる', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      const saveDeckSpy = vi.spyOn(deckStore, 'saveDeck').mockResolvedValue({ success: true });
      const dno = deckStore.deckInfo.dno;

      const action = vi.fn().mockResolvedValue(undefined);
      await openUnsavedDialog(deckStore, settingsStore, action);
      await clickBodyButton('保存して続ける');
      await flushPromises();

      expect(saveDeckSpy).toHaveBeenCalledWith(dno);
      expect(toastSpy).toHaveBeenCalledWith('保存しました', 'success');
      expect(action).toHaveBeenCalledTimes(1);
      expect(deckStore.showUnsavedChangesDialog).toBe(false);
    });

    it('[covers:deck-edit-layout.unsaved-button-save-failure-skips-continue] 保存失敗(success=false)時は後続actionもトーストも行わずダイアログのみ閉じる', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      vi.spyOn(deckStore, 'saveDeck').mockResolvedValue({ success: false });

      const action = vi.fn().mockResolvedValue(undefined);
      await openUnsavedDialog(deckStore, settingsStore, action);
      await clickBodyButton('保存して続ける');
      await flushPromises();

      expect(toastSpy).not.toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
      expect(deckStore.showUnsavedChangesDialog).toBe(false);
    });

    it('[covers:deck-edit-layout.unsaved-button-save-throw-caught] 保存のrejectは捕捉してlogしダイアログを閉じる', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      vi.spyOn(deckStore, 'saveDeck').mockRejectedValue(new Error('save failed'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const action = vi.fn().mockResolvedValue(undefined);
      await openUnsavedDialog(deckStore, settingsStore, action);
      await clickBodyButton('保存して続ける');
      await flushPromises();

      expect(errorSpy).toHaveBeenCalledWith('Save error:', expect.any(Error));
      expect(action).not.toHaveBeenCalled();
      expect(deckStore.showUnsavedChangesDialog).toBe(false);
    });

    it('[covers:deck-edit-layout.unsaved-button-continue-without-saving] 「保存せず続ける」はダイアログを閉じてから後続actionを実行する（保存しない）', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      const saveDeckSpy = vi.spyOn(deckStore, 'saveDeck');

      const order: string[] = [];
      const action = async () => {
        order.push(`dialog:${deckStore.showUnsavedChangesDialog}`);
      };
      await openUnsavedDialog(deckStore, settingsStore, action);
      await clickBodyButton('保存せず続ける');
      await flushPromises();

      // action実行時点でダイアログは既に閉じている
      expect(order).toEqual(['dialog:false']);
      expect(saveDeckSpy).not.toHaveBeenCalled();
      expect(toastSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-edit-layout.unsaved-button-continue-without-saving-no-catch] 現行挙動: 「保存せず続ける」にcatchがなくpendingActionのrejectは外へ伝播する', async () => {
      const errorHandlerCalls: unknown[] = [];
      const { deckStore, settingsStore } = mountLayout({ errorHandler: err => { errorHandlerCalls.push(err); } });
      await flushPromises();

      const rejectError = new Error('pending rejected');
      const action = vi.fn().mockRejectedValue(rejectError);
      await openUnsavedDialog(deckStore, settingsStore, action);
      await clickBodyButton('保存せず続ける');
      await flushPromises();

      // onClick外へrejectionが伝播する（unhandled rejection。期待仕様ではなく現行挙動・TASK-494）
      expect(action).toHaveBeenCalledTimes(1);
      expect(errorHandlerCalls).toContain(rejectError);
      // ダイアログは先に閉じられている
      expect(deckStore.showUnsavedChangesDialog).toBe(false);
      // pendingAction=nullは実行されず残留するが、内部refのためDOM観測は不可（伝播とダイアログ挙動で検証）
    });

    it('[covers:deck-edit-layout.unsaved-cancel-clears-pending] ConfirmDialogのcancel（overlayクリック）でもダイアログを閉じpendingActionを破棄する', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();

      const action1 = vi.fn().mockResolvedValue(undefined);
      await openUnsavedDialog(deckStore, settingsStore, action1);

      const overlay = document.body.querySelector('.base-dialog-overlay');
      if (!isHTMLElement(overlay)) throw new Error('.base-dialog-overlay not found');
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: false }));
      await nextTick();
      await flushPromises();

      expect(deckStore.showUnsavedChangesDialog).toBe(false);
      expect(action1).not.toHaveBeenCalled();

      // pendingAction破棄の確認: 新しいcycleでcontinueしてもaction1は実行されない
      const action2 = vi.fn().mockResolvedValue(undefined);
      await openUnsavedDialog(deckStore, settingsStore, action2);
      await clickBodyButton('保存せず続ける');
      await flushPromises();
      expect(action1).not.toHaveBeenCalled();
      expect(action2).toHaveBeenCalledTimes(1);
    });

    it('[covers:deck-edit-layout.unsaved-save-keeps-dialog-open-during-action] 「保存して続ける」は保存〜action完了までダイアログを開いたままにする', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      const saveDeferred = createDeferred<OperationResult>();
      vi.spyOn(deckStore, 'saveDeck').mockImplementation(() => saveDeferred.promise);

      const actionDeferred = createDeferred<void>();
      const action = () => actionDeferred.promise;
      await openUnsavedDialog(deckStore, settingsStore, action);
      await clickBodyButton('保存して続ける');
      await nextTick();
      await nextTick();

      // 処理未解決の間はダイアログが開いたまま（ConfirmDialogのローディング表示で全ボタンdisabled）
      expect(deckStore.showUnsavedChangesDialog).toBe(true);
      const buttons = Array.from(document.body.querySelectorAll('.base-dialog-overlay .btn')).filter(isHTMLButtonElement);
      expect(buttons.length).toBeGreaterThanOrEqual(3);
      buttons.forEach(btn => expect(btn.disabled).toBe(true));

      saveDeferred.resolve({ success: true });
      actionDeferred.resolve();
      await flushPromises();
      await nextTick();
      expect(deckStore.showUnsavedChangesDialog).toBe(false);
    });
  });

  // ============================================================
  // E. レギュレーション修正提案ダイアログ
  // ============================================================
  describe('E. レギュレーション修正提案ダイアログ', () => {
    const regulationTag = (type: 'ocg' | 'genesys'): RegulationTag => ({
      type,
      yymm: '2604',
      raw: `[${type === 'ocg' ? 'OCG' : 'GENESYS'}-2604]`,
      bracket: 'square',
      position: 'prefix',
      startIndex: 0,
      endIndex: 10,
    });

    it('[covers:deck-edit-layout.regulation-fix-message-empty-without-fallback] タグ無しまたはフォールバック無しの場合はメッセージが空になる', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();

      // タグ無し
      deckStore.resolvedRegulation = {
        mode: 'none', tag: null, effectiveDate: null, listParam: null, fallback: undefined,
      };
      deckStore.showRegulationFixDialog = true;
      await nextTick();
      expect(getDialogMessage()).toBe('');

      // タグあり・フォールバック無し
      deckStore.resolvedRegulation = {
        mode: 'ocg', tag: regulationTag('ocg'), effectiveDate: '2026-01-01', listParam: null, fallback: undefined,
      };
      await nextTick();
      expect(getDialogMessage()).toBe('');
    });

    it('[covers:deck-edit-layout.regulation-fix-message-content] フォールバック時のメッセージは要求YYMMと適用YYMMを埋め込みOCG/GENESYSラベルを選ぶ', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();

      const fallback: RegulationFallback = { requestedYymm: '2604', reason: 'not-exist', appliedIdentifier: '2026-01-01', appliedYymm: '2601' };

      const ocgResolved: ResolvedRegulation = {
        mode: 'ocg', tag: regulationTag('ocg'), effectiveDate: '2026-01-01', listParam: null, fallback,
      };
      deckStore.resolvedRegulation = ocgResolved;
      deckStore.showRegulationFixDialog = true;
      await nextTick();
      expect(getDialogMessage()).toBe(
        '指定 OCG-2604 は存在しません。直近版 OCG-2601 のタグに修正しますか？（「このまま使う」で直近版を適用し続けます）'
      );

      const genesysResolved: ResolvedRegulation = {
        mode: 'genesys', tag: regulationTag('genesys'), effectiveDate: null, listParam: '202601', fallback,
      };
      deckStore.resolvedRegulation = genesysResolved;
      await nextTick();
      expect(getDialogMessage()).toBe(
        '指定 GENESYS-2604 は存在しません。直近版 GENESYS-2601 のタグに修正しますか？（「このまま使う」で直近版を適用し続けます）'
      );
    });

    it('[covers:deck-edit-layout.regulation-fix-button-keep] 「このまま使う」でignoreRegulationFixを呼ぶ', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const ignoreSpy = vi.spyOn(deckStore, 'ignoreRegulationFix').mockResolvedValue(undefined);

      deckStore.resolvedRegulation = {
        mode: 'ocg', tag: regulationTag('ocg'), effectiveDate: '2026-01-01', listParam: null,
        fallback: { requestedYymm: '2604', reason: 'not-exist', appliedIdentifier: '2026-01-01', appliedYymm: '2601' },
      };
      deckStore.showRegulationFixDialog = true;
      await nextTick();

      await clickBodyButton('このまま使う');
      expect(ignoreSpy).toHaveBeenCalledTimes(1);
    });

    it('[covers:deck-edit-layout.regulation-fix-button-fix-tag] 「タグを修正」でconfirmRegulationFixを呼ぶ', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const confirmSpy = vi.spyOn(deckStore, 'confirmRegulationFix').mockResolvedValue(undefined);

      deckStore.resolvedRegulation = {
        mode: 'ocg', tag: regulationTag('ocg'), effectiveDate: '2026-01-01', listParam: null,
        fallback: { requestedYymm: '2604', reason: 'not-exist', appliedIdentifier: '2026-01-01', appliedYymm: '2601' },
      };
      deckStore.showRegulationFixDialog = true;
      await nextTick();

      await clickBodyButton('タグを修正');
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // F. handleImported（インポート）
  // ============================================================
  describe('F. handleImported', () => {
    //ImportExportDialogスタブのimported emitでhandleImportedを駆動する
    const emitImported = async (imported: DeckInfo, mode: 'replace' | 'add' | 'new') => {
      importExportStub().vm.$emit('imported', imported, mode);
      await nextTick();
    };

    it('[covers:deck-edit-layout.import-sets-importing-flag] インポート中はisImporting=trueで、正常・例外の両経路でfinallyによりfalseへ戻す', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      deckStore.showImportDialog = true;
      await nextTick();

      // 実行中（searchCardByIdが未解決のdeferred）: isImporting=true
      const fetchDeferred = createDeferred<CardInfo>();
      vi.mocked(searchCardById).mockImplementationOnce(() => fetchDeferred.promise);
      const importing = createDeckInfo({ mainDeck: [cardRef('c1', 1)] });
      await emitImported(importing, 'add');
      expect(deckStore.isImporting).toBe(true);

      fetchDeferred.resolve(createCardInfo('c1'));
      await flushPromises();
      expect(deckStore.isImporting).toBe(false);

      // 例外経路でもfinallyによりfalseへ戻る（rejectは即完了するため
      // emit後のnextTickでcatch/finallyまで進む。「実行中true」は上記deferred経路で検証済み）
      vi.mocked(searchCardById).mockRejectedValueOnce(new Error('fetch failed'));
      const failing = createDeckInfo({ mainDeck: [cardRef('c2', 1)] });
      await emitImported(failing, 'add');
      await flushPromises();
      expect(deckStore.isImporting).toBe(false);
    });

    it('[covers:deck-edit-layout.import-mode-new-creates-deck] newモードはcreateNewDeckしてから追加する（セクションクリアなし）', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const existing = cardRef('c0', 1);
      deckStore.deckInfo.mainDeck = [existing];

      const createSpy = vi.spyOn(deckStore, 'createNewDeck').mockResolvedValue(undefined);
      const initOrderSpy = vi.spyOn(deckStore, 'initializeDisplayOrder');
      const cached = createCardInfo('c1');
      fakeUnifiedDB.cardInfoTable.set('c1', cached);

      await emitImported(createDeckInfo({ mainDeck: [cardRef('c1', 1)] }), 'new');
      await flushPromises();

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(initOrderSpy).not.toHaveBeenCalled();
      // 既存セクションはクリアされない
      expect(deckStore.deckInfo.mainDeck[0]?.cid).toBe('c0');
    });

    it('[covers:deck-edit-layout.import-mode-replace-clears-sections] replaceモードは3セクションを空にし表示順序を初期化する（createNewDeckなし）', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      deckStore.deckInfo.mainDeck = [cardRef('c0', 1)];
      deckStore.deckInfo.extraDeck = [cardRef('c0', 1)];
      deckStore.deckInfo.sideDeck = [cardRef('c0', 1)];

      const createSpy = vi.spyOn(deckStore, 'createNewDeck').mockResolvedValue(undefined);
      const initOrderSpy = vi.spyOn(deckStore, 'initializeDisplayOrder');

      await emitImported(createDeckInfo(), 'replace');
      await flushPromises();

      expect(deckStore.deckInfo.mainDeck).toEqual([]);
      expect(deckStore.deckInfo.extraDeck).toEqual([]);
      expect(deckStore.deckInfo.sideDeck).toEqual([]);
      expect(initOrderSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-edit-layout.import-mode-add-keeps-deck] addモードはデッキ作成もクリアもせず既存デッキへ追記する', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const existing = cardRef('c0', 1);
      deckStore.deckInfo.mainDeck = [existing];

      const createSpy = vi.spyOn(deckStore, 'createNewDeck').mockResolvedValue(undefined);
      const initOrderSpy = vi.spyOn(deckStore, 'initializeDisplayOrder');
      const cached = createCardInfo('c1');
      fakeUnifiedDB.cardInfoTable.set('c1', cached);

      await emitImported(createDeckInfo({ sideDeck: [cardRef('c1', 1)] }), 'add');
      await flushPromises();

      expect(createSpy).not.toHaveBeenCalled();
      expect(initOrderSpy).not.toHaveBeenCalled();
      expect(deckStore.deckInfo.mainDeck[0]?.cid).toBe('c0');
      expect(deckStore.deckInfo.sideDeck.some(dc => dc.cid === 'c1')).toBe(true);
    });

    it('[covers:deck-edit-layout.import-resolve-uses-cached-card] キャッシュ済み実カードはAPIへ問い合わせずキャッシュ値を使う', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const cached = createCardInfo('c1');
      fakeUnifiedDB.cardInfoTable.set('c1', cached);
      const addCardSpy = vi.spyOn(deckStore, 'addCard');

      await emitImported(createDeckInfo({ mainDeck: [cardRef('c1', 1)] }), 'add');
      await flushPromises();

      expect(vi.mocked(searchCardById)).not.toHaveBeenCalled();
      expect(addCardSpy).toHaveBeenCalledWith(cached, 'main');
      // ※ setCardInfoFull呼び出しの有無はここでは観測しない
      // （addCard→TempCacheDB保存がunifiedDB.setCardInfoFullを経由するため、
      //   resolveCard由来の書き込みと区別できない）
    });

    it('[covers:deck-edit-layout.import-resolve-fetches-and-merges-images] キャッシュ無し・仮データ時はAPI取得しキャッシュ側のみの画像をマージして保存する', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const placeholder = { ...createCardInfo('c1'), isImportPlaceholder: true };
      placeholder.imgs = [
        { ciid: '1', imgHash: 'h1' },
        { ciid: '2', imgHash: 'h2' },
      ];
      fakeUnifiedDB.cardInfoTable.set('c1', placeholder);

      const fetched = createCardInfo('c1');
      vi.mocked(searchCardById).mockResolvedValueOnce(fetched);
      const addCardSpy = vi.spyOn(deckStore, 'addCard');

      await emitImported(createDeckInfo({ mainDeck: [cardRef('c1', 1)] }), 'add');
      await flushPromises();

      expect(vi.mocked(searchCardById)).toHaveBeenCalledWith('c1');
      // fetched.imgs=[ciid1] をベースに、キャッシュのみのciid2をマージ
      //（マージはfetched側を優先するためciid1のimgHashはfetched側の値になる）
      const call = fakeUnifiedDB.setCardInfoFullCalls[0];
      expect(call).toBeDefined();
      expect(call.cid).toBe('c1');
      expect(call.forceUpdate).toBe(true);
      expect(call.card.imgs).toEqual([
        { ciid: '1', imgHash: 'c1_hash_1' },
        { ciid: '2', imgHash: 'h2' },
      ]);
      expect(addCardSpy).toHaveBeenCalledTimes(1);
      const addedCard = addCardSpy.mock.calls[0]?.[0];
      expect(addedCard?.imgs).toHaveLength(2);
    });

    it('[covers:deck-edit-layout.import-resolve-falls-back-to-placeholder] API取得失敗時は仮データのまま、キャッシュも無い場合はnullでフォールバックする', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const addCardSpy = vi.spyOn(deckStore, 'addCard');

      // 仮データあり + API null: 仮データをそのまま使う
      const placeholder = { ...createCardInfo('c1'), isImportPlaceholder: true };
      fakeUnifiedDB.cardInfoTable.set('c1', placeholder);
      vi.mocked(searchCardById).mockResolvedValueOnce(null);
      await emitImported(createDeckInfo({ mainDeck: [cardRef('c1', 1)] }), 'add');
      await flushPromises();
      expect(addCardSpy).toHaveBeenCalledWith(placeholder, 'main');

      // キャッシュ無し + API null: skipped行き（addCardされない）
      addCardSpy.mockClear();
      vi.mocked(searchCardById).mockResolvedValueOnce(null);
      await emitImported(createDeckInfo({ mainDeck: [cardRef('c2', 1)] }), 'add');
      await flushPromises();
      expect(addCardSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-edit-layout.import-resolves-once-per-cid] カード解決はcidごとに一度だけ行う', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const fetched = createCardInfo('c1');
      vi.mocked(searchCardById).mockResolvedValue(fetched);
      const addCardSpy = vi.spyOn(deckStore, 'addCard');

      // 同一cidがmain(quantity2)とside(quantity:1)に跨る
      await emitImported(
        createDeckInfo({ mainDeck: [cardRef('c1', 2)], sideDeck: [cardRef('c1', 1)] }),
        'add'
      );
      await flushPromises();

      expect(vi.mocked(searchCardById)).toHaveBeenCalledTimes(1);
      expect(addCardSpy).toHaveBeenCalledTimes(3);
    });

    it('[covers:deck-edit-layout.import-skips-unresolvable-card] 解決不能なカードはquantity分をスキップカウントして追加しない', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const cached = createCardInfo('c1');
      fakeUnifiedDB.cardInfoTable.set('c1', cached);
      vi.mocked(searchCardById).mockResolvedValue(null);
      const addCardSpy = vi.spyOn(deckStore, 'addCard');

      // c9は解決不能(quantity2)・c1はキャッシュ解決(quantity1)
      await emitImported(
        createDeckInfo({ mainDeck: [cardRef('c9', 2)], sideDeck: [cardRef('c1', 1)] }),
        'add'
      );
      await flushPromises();

      expect(addCardSpy).toHaveBeenCalledTimes(1);
      expect(addCardSpy.mock.calls[0]?.[1]).toBe('side');
      // skipped=2はaddモードのトースト文言で観測
      expect(toastSpy).toHaveBeenCalledWith('デッキに追加しました（2枚は上限超過等によりスキップ）', 'success');
    });

    it('[covers:deck-edit-layout.import-adds-card-per-quantity] 解決済みカードはquantity回数分addCardを呼び、cardはref.ciidを上書きしたもの', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const cached = createCardInfo('c1');
      fakeUnifiedDB.cardInfoTable.set('c1', cached);
      const addCardSpy = vi.spyOn(deckStore, 'addCard');

      await emitImported(createDeckInfo({ mainDeck: [cardRef('c1', 3, '999')] }), 'add');
      await flushPromises();

      expect(addCardSpy).toHaveBeenCalledTimes(3);
      addCardSpy.mock.calls.forEach(call => {
        expect(call[0].ciid).toBe('999');
        expect(call[1]).toBe('main');
      });
      expect(toastSpy).toHaveBeenCalledWith('デッキに追加しました', 'success');
    });

    it('[covers:deck-edit-layout.import-adds-card-per-quantity] addCard失敗分はスキップカウントに回る', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const cached = createCardInfo('c1');
      fakeUnifiedDB.cardInfoTable.set('c1', cached);
      const addCardSpy = vi.spyOn(deckStore, 'addCard');
      addCardSpy.mockImplementationOnce(() => ({ success: true }));
      addCardSpy.mockImplementation(() => ({ success: false }));

      await emitImported(createDeckInfo({ mainDeck: [cardRef('c1', 3)] }), 'add');
      await flushPromises();

      expect(addCardSpy).toHaveBeenCalledTimes(3);
      // added=1・skipped=2
      expect(toastSpy).toHaveBeenCalledWith('デッキに追加しました（2枚は上限超過等によりスキップ）', 'success');
    });

    it('[covers:deck-edit-layout.import-closes-dialog] インポート完了時にインポートダイアログを閉じる（追加0件でも・showExportDialogには触れない）', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      deckStore.showImportDialog = true;
      deckStore.showExportDialog = true;
      await nextTick();

      const cached = createCardInfo('c1');
      fakeUnifiedDB.cardInfoTable.set('c1', cached);
      await emitImported(createDeckInfo({ mainDeck: [cardRef('c1', 1)] }), 'add');
      await flushPromises();

      expect(deckStore.showImportDialog).toBe(false);
      expect(deckStore.showExportDialog).toBe(true);

      // 追加0件でも閉じる
      deckStore.showImportDialog = true;
      await nextTick();
      await emitImported(createDeckInfo(), 'add');
      await flushPromises();
      expect(deckStore.showImportDialog).toBe(false);
    });

    it('[covers:deck-edit-layout.import-toast-none-added] 1枚も追加できなかった場合は警告トーストを出す', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      vi.mocked(searchCardById).mockResolvedValue(null);

      await emitImported(createDeckInfo({ mainDeck: [cardRef('c9', 1)] }), 'add');
      await flushPromises();

      expect(toastSpy).toHaveBeenCalledWith('インポートできるカードが見つかりませんでした', 'warning');
    });

    it('[covers:deck-edit-layout.import-toast-new-mode] newモードで1枚以上追加できた場合は新規デッキ作成のトーストを出す', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      vi.spyOn(deckStore, 'createNewDeck').mockResolvedValue(undefined);
      const cached = createCardInfo('c1');
      fakeUnifiedDB.cardInfoTable.set('c1', cached);

      await emitImported(createDeckInfo({ mainDeck: [cardRef('c1', 1)] }), 'new');
      await flushPromises();

      expect(toastSpy).toHaveBeenCalledWith('新しいデッキとしてインポートしました', 'success');
    });

    it('[covers:deck-edit-layout.import-toast-replace-mode] replaceモードの完了トーストはスキップ枚数の有無で文言を分ける', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const cached = createCardInfo('c1');
      fakeUnifiedDB.cardInfoTable.set('c1', cached);

      // skipped=0
      await emitImported(createDeckInfo({ mainDeck: [cardRef('c1', 1)] }), 'replace');
      await flushPromises();
      expect(toastSpy).toHaveBeenCalledWith('デッキを置き換えました', 'success');

      // skipped=2（2回目以降のaddCardが失敗）
      toastSpy?.mockClear();
      const addCardSpy = vi.spyOn(deckStore, 'addCard');
      addCardSpy.mockImplementationOnce(() => ({ success: true }));
      addCardSpy.mockImplementation(() => ({ success: false }));
      await emitImported(createDeckInfo({ mainDeck: [cardRef('c1', 3)] }), 'replace');
      await flushPromises();
      expect(toastSpy).toHaveBeenCalledWith('デッキを置き換えました（2枚は上限超過等によりスキップ）', 'success');
    });

    it('[covers:deck-edit-layout.import-toast-add-mode] addモードの完了トーストはスキップ枚数の有無で文言を分ける', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const cached = createCardInfo('c1');
      fakeUnifiedDB.cardInfoTable.set('c1', cached);

      // skipped=0
      await emitImported(createDeckInfo({ mainDeck: [cardRef('c1', 1)] }), 'add');
      await flushPromises();
      expect(toastSpy).toHaveBeenCalledWith('デッキに追加しました', 'success');
    });

    it('[covers:deck-edit-layout.import-catch-shows-error-toast] 処理中の例外はlogとエラートーストで処理しisImportingを戻す', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      vi.mocked(searchCardById).mockRejectedValueOnce(new Error('fetch failed'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await emitImported(createDeckInfo({ mainDeck: [cardRef('c1', 1)] }), 'add');
      await flushPromises();

      expect(errorSpy).toHaveBeenCalledWith('[handleImported] Error:', expect.any(Error));
      expect(toastSpy).toHaveBeenCalledWith('インポートに失敗しました', 'error');
      expect(deckStore.isImporting).toBe(false);
    });
  });

  // ============================================================
  // G. ダイアログ・ロード系ハンドラ
  // ============================================================
  describe('G. ダイアログ・ロード系ハンドラ', () => {
    it('[covers:deck-edit-layout.import-export-close-clears-both] ImportExportDialogのcloseでインポート・エクスポート両フラグをfalseにする', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      deckStore.showImportDialog = true;
      deckStore.showExportDialog = true;
      await nextTick();

      importExportStub().vm.$emit('close');
      await nextTick();

      expect(deckStore.showImportDialog).toBe(false);
      expect(deckStore.showExportDialog).toBe(false);
    });

    it('[covers:deck-edit-layout.exported-closes-dialog] exported emitでエクスポートダイアログを閉じる', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      deckStore.showExportDialog = true;
      await nextTick();

      importExportStub().vm.$emit('exported', 'ydk');
      await nextTick();

      expect(deckStore.showExportDialog).toBe(false);
    });

    it('[covers:deck-edit-layout.load-dialog-open-sets-callback] LoadDialogを開く際はデッキ名リセット→loadDeck→lastDeckDno記録のcallbackを設定してからopenLoadDialogする', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      expect(deckStore.showLoadDialog).toBe(false);

      const setDeckNameSpy = vi.spyOn(deckStore, 'setDeckName');
      const loadDeckSpy = vi.spyOn(deckStore, 'loadDeck').mockResolvedValue(undefined);
      const openLoadDialogSpy = vi.spyOn(deckStore, 'openLoadDialog');

      getVmFunction('toggleLoadDialog')();
      expect(openLoadDialogSpy).toHaveBeenCalledTimes(1);

      const callback = deckStore.onLoadCallback;
      if (typeof callback !== 'function') throw new Error('onLoadCallback is not set');
      await callback(5);

      expect(setDeckNameSpy).toHaveBeenCalledWith('');
      expect(loadDeckSpy).toHaveBeenCalledWith(5);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ygoNext:lastDeckDno', '5');
    });

    it('[covers:deck-edit-layout.load-dialog-toggle-closes] 開いている状態でのtoggleLoadDialogはダイアログを閉じる（openLoadDialogしない）', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      deckStore.showLoadDialog = true;
      await nextTick();

      const openLoadDialogSpy = vi.spyOn(deckStore, 'openLoadDialog');
      getVmFunction('toggleLoadDialog')();

      expect(deckStore.showLoadDialog).toBe(false);
      expect(openLoadDialogSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-edit-layout.deck-loaded-scrolls-to-top] deck-loaded emit後、nextTickを待ってデッキエリアを先頭へスクロールする', async () => {
      mountLayout();
      await flushPromises();
      await nextTick();
      const scrollToSpy = vi.spyOn(Element.prototype, 'scrollTo').mockImplementation(() => {});

      loadDialogStub().vm.$emit('deck-loaded');
      await nextTick();
      await nextTick();

      expect(scrollToSpy).toHaveBeenCalledTimes(1);
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('[covers:deck-edit-layout.delete-confirm-executes] 「削除」で確認ダイアログを先に閉じ、現在デッキの削除を実行する', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      deckStore.showDeleteConfirm = true;
      await nextTick();

      const order: string[] = [];
      const deleteSpy = vi.spyOn(deckStore, 'deleteCurrentDeck').mockImplementation(async () => {
        order.push(`delete:${deckStore.showDeleteConfirm}`);
      });

      const deleteButton = container.querySelector('.btn-delete');
      if (!isHTMLButtonElement(deleteButton)) throw new Error('.btn-delete not found');
      deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(deckStore.showDeleteConfirm).toBe(false);
      expect(deleteSpy).toHaveBeenCalledTimes(1);
      // ダイアログが先に閉じている
      expect(order).toEqual(['delete:false']);
    });

    it('[covers:deck-edit-layout.delete-confirm-error-caught] 削除の例外はlogして外へ伝播させない', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      deckStore.showDeleteConfirm = true;
      await nextTick();

      vi.spyOn(deckStore, 'deleteCurrentDeck').mockRejectedValue(new Error('delete failed'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const deleteButton = container.querySelector('.btn-delete');
      if (!isHTMLButtonElement(deleteButton)) throw new Error('.btn-delete not found');
      deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      await flushPromises();

      expect(errorSpy).toHaveBeenCalledWith('Delete deck error:', expect.any(Error));
    });

    it('[covers:deck-edit-layout.delete-cancel-closes] キャンセルボタン・overlayクリックのいずれでもダイアログを閉じるのみ（削除しない）', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const deleteSpy = vi.spyOn(deckStore, 'deleteCurrentDeck').mockResolvedValue(undefined);

      // キャンセルボタン
      deckStore.showDeleteConfirm = true;
      await nextTick();
      const cancelButton = container.querySelector('.btn-cancel');
      if (!isHTMLButtonElement(cancelButton)) throw new Error('.btn-cancel not found');
      cancelButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(deckStore.showDeleteConfirm).toBe(false);

      // overlay自身クリック
      deckStore.showDeleteConfirm = true;
      await nextTick();
      const overlay = container.querySelector('.dialog-overlay');
      if (!isHTMLElement(overlay)) throw new Error('.dialog-overlay not found');
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: false }));
      await nextTick();
      expect(deckStore.showDeleteConfirm).toBe(false);

      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // H. プラクティスモード
  // ============================================================
  describe('H. プラクティスモード', () => {
    it('[covers:deck-edit-layout.practice-toggle-disabled-without-feature] practice機能が無効の場合はトグルを何もしない', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      settingsStore.featureSettings.practice = false;

      const practiceStore = usePracticeStore();
      const initPracticeSpy = vi.spyOn(practiceStore, 'initPractice');
      const activeTabBefore = deckStore.activeTab;

      topBarStubs()[0].vm.$emit('toggle-practice');
      await nextTick();

      expect(initPracticeSpy).not.toHaveBeenCalled();
      expect(container.querySelector('.main-content .deck-areas.practice-field-container')).toBe(null);
      expect(practiceStore.isActive).toBe(false);
      expect(deckStore.activeTab).toBe(activeTabBefore);
    });

    it('[covers:deck-edit-layout.practice-toggle-on-initializes] practiceモードONで現在デッキからfieldを初期化しモード・タブを切替える', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      settingsStore.featureSettings.practice = true;
      const mainRefs = [cardRef('c1', 2)];
      const extraRefs = [cardRef('c2', 1)];
      deckStore.deckInfo.mainDeck = mainRefs;
      deckStore.deckInfo.extraDeck = extraRefs;

      const practiceStore = usePracticeStore();
      const initPracticeSpy = vi.spyOn(practiceStore, 'initPractice');

      topBarStubs()[0].vm.$emit('toggle-practice');
      await nextTick();

      // fieldIndex省略（=0）: 引数は2つ
      expect(initPracticeSpy).toHaveBeenCalledTimes(1);
      expect(initPracticeSpy.mock.calls[0]).toHaveLength(2);
      expect(initPracticeSpy).toHaveBeenCalledWith(mainRefs, extraRefs);
      expect(container.querySelector('.main-content .deck-areas.practice-field-container')).not.toBe(null);
      expect(practiceStore.isActive).toBe(true);
      expect(deckStore.activeTab).toBe('practice');
    });

    it('[covers:deck-edit-layout.practice-toggle-off-clears] practiceモードOFFでpractice状態を解除しP2 fieldを破棄してsearchタブへ戻す', async () => {
      const { settingsStore } = mountLayout();
      await flushPromises();
      settingsStore.featureSettings.practice = true;

      const practiceStore = usePracticeStore();
      const initPracticeSpy = vi.spyOn(practiceStore, 'initPractice');
      const clearField2Spy = vi.spyOn(practiceStore, 'clearField2');

      topBarStubs()[0].vm.$emit('toggle-practice');
      await nextTick();
      expect(container.querySelector('.main-content .deck-areas.practice-field-container')).not.toBe(null);

      topBarStubs()[0].vm.$emit('toggle-practice');
      await nextTick();

      expect(container.querySelector('.main-content .deck-areas.practice-field-container')).toBe(null);
      expect(practiceStore.isActive).toBe(false);
      expect(clearField2Spy).toHaveBeenCalledTimes(1);
      expect(useDeckEditStore().activeTab).toBe('search');
      expect(initPracticeSpy).toHaveBeenCalledTimes(1);
    });

    it('[covers:deck-edit-layout.two-deck-toggle-on-opens-p2] twoDeckMode=falseでのトグルはP2デッキ選択（LoadDialog）を開く（ハンドラ単体条件・現在UI経路なし）', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      settingsStore.featureSettings.practice = true;
      const practiceStore = usePracticeStore();
      expect(practiceStore.twoDeckMode).toBe(false);

      const initPracticeSpy = vi.spyOn(practiceStore, 'initPractice');
      const detail = createDeckInfo({
        dno: 7,
        originalName: 'P2デッキ',
        mainDeck: [cardRef('c1', 1)],
        extraDeck: [],
      });
      const getDeckDetailSpy = vi.spyOn(deckStore, 'getDeckDetail').mockResolvedValue(detail);

      // PracticePlayerPanelのtoggle-p2 emitで駆動
      playerPanelStub().vm.$emit('toggle-p2');
      await nextTick();

      expect(deckStore.showLoadDialog).toBe(true);
      const callback = deckStore.onLoadCallback;
      if (typeof callback !== 'function') throw new Error('onLoadCallback is not set');
      await callback(7);

      expect(getDeckDetailSpy).toHaveBeenCalledWith(7);
      expect(initPracticeSpy).toHaveBeenCalledWith(detail.mainDeck, detail.extraDeck, 1);
      expect(practiceStore.p2DeckDno).toBe(7);
      expect(practiceStore.p2DeckName).toBe('P2デッキ');
      expect(practiceStore.p2DeckInfo?.originalName).toBe('P2デッキ');
    });

    it('[covers:deck-edit-layout.two-deck-toggle-off-clears] twoDeckMode=trueでのトグルはP2 fieldを破棄する（ハンドラ単体条件・現在UI経路なし）', async () => {
      const { settingsStore } = mountLayout();
      await flushPromises();
      const practiceStore = usePracticeStore();
      practiceStore.p2DeckDno = 5;
      expect(practiceStore.twoDeckMode).toBe(true);

      const clearField2Spy = vi.spyOn(practiceStore, 'clearField2');

      playerPanelStub().vm.$emit('toggle-p2');
      await nextTick();

      expect(clearField2Spy).toHaveBeenCalledTimes(1);
      expect(practiceStore.p2DeckDno).toBe(null);
    });

    it('[covers:deck-edit-layout.load-field2-with-detail] P2へのデッキロードはfield 1として初期化しP2デッキ情報を設定する', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const practiceStore = usePracticeStore();
      const initPracticeSpy = vi.spyOn(practiceStore, 'initPractice');

      const detail = createDeckInfo({
        dno: 3,
        originalName: 'P2デッキ',
        mainDeck: [cardRef('c1', 1)],
        extraDeck: [cardRef('c2', 1)],
      });
      vi.spyOn(deckStore, 'getDeckDetail').mockResolvedValue(detail);

      playerPanelStub().vm.$emit('load-deck-p2', 3);
      await flushPromises();

      expect(initPracticeSpy).toHaveBeenCalledWith(detail.mainDeck, detail.extraDeck, 1);
      expect(practiceStore.p2DeckDno).toBe(3);
      expect(practiceStore.p2DeckName).toBe('P2デッキ');
      expect(practiceStore.p2DeckInfo?.originalName).toBe('P2デッキ');
    });

    it('[covers:deck-edit-layout.load-field2-without-detail] デッキ詳細が取得できない場合はP2の初期化・状態設定を行わない', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const practiceStore = usePracticeStore();
      const initPracticeSpy = vi.spyOn(practiceStore, 'initPractice');

      vi.spyOn(deckStore, 'getDeckDetail').mockResolvedValue(null);

      playerPanelStub().vm.$emit('load-deck-p2', 3);
      await flushPromises();

      expect(initPracticeSpy).not.toHaveBeenCalled();
      expect(practiceStore.p2DeckDno).toBe(null);
      expect(practiceStore.p2DeckName).toBe('');
      expect(practiceStore.p2DeckInfo).toBe(null);
    });

    it('[covers:deck-edit-layout.hard-reset-reinitializes] ハードリセットは現在デッキからfieldを再初期化する（モード・タブは不変）', async () => {
      const { deckStore, settingsStore } = mountLayout();
      await flushPromises();
      settingsStore.featureSettings.practice = true;
      const mainRefs = [cardRef('c1', 1)];
      const extraRefs = [cardRef('c2', 1)];
      deckStore.deckInfo.mainDeck = mainRefs;
      deckStore.deckInfo.extraDeck = extraRefs;

      const practiceStore = usePracticeStore();
      const initPracticeSpy = vi.spyOn(practiceStore, 'initPractice');

      topBarStubs()[0].vm.$emit('toggle-practice');
      await nextTick();
      initPracticeSpy.mockClear();

      playerPanelStub().vm.$emit('hard-reset');
      await nextTick();

      expect(initPracticeSpy).toHaveBeenCalledTimes(1);
      expect(initPracticeSpy.mock.calls[0]).toHaveLength(2);
      expect(initPracticeSpy).toHaveBeenCalledWith(mainRefs, extraRefs);
      // practiceMode・タブ状態は不変
      expect(container.querySelector('.main-content .deck-areas.practice-field-container')).not.toBe(null);
      expect(practiceStore.isActive).toBe(true);
      expect(deckStore.activeTab).toBe('practice');
    });

    it('[covers:deck-edit-layout.open-deck-sets-callback] 自陣用デッキ選択はfield 0初期化のcallbackを設定して開く', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const practiceStore = usePracticeStore();
      const initPracticeSpy = vi.spyOn(practiceStore, 'initPractice');

      playerPanelStub().vm.$emit('open-deck');
      await nextTick();

      expect(deckStore.showLoadDialog).toBe(true);
      const detail = createDeckInfo({ dno: 9, originalName: '自陣デッキ', mainDeck: [cardRef('c1', 1)], extraDeck: [] });
      vi.spyOn(deckStore, 'getDeckDetail').mockResolvedValue(detail);

      const callback = deckStore.onLoadCallback;
      if (typeof callback !== 'function') throw new Error('onLoadCallback is not set');
      await callback(9);

      expect(initPracticeSpy).toHaveBeenCalledWith(detail.mainDeck, detail.extraDeck, 0);
    });

    it('[covers:deck-edit-layout.open-deck-p2-sets-callback] P2用デッキ選択はfield 1初期化+P2状態設定のcallbackを設定して開く', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const practiceStore = usePracticeStore();
      const initPracticeSpy = vi.spyOn(practiceStore, 'initPractice');

      playerPanelStub().vm.$emit('open-deck-p2');
      await nextTick();

      expect(deckStore.showLoadDialog).toBe(true);
      const detail = createDeckInfo({ dno: 7, originalName: 'P2デッキ', mainDeck: [cardRef('c1', 1)], extraDeck: [] });
      vi.spyOn(deckStore, 'getDeckDetail').mockResolvedValue(detail);

      const callback = deckStore.onLoadCallback;
      if (typeof callback !== 'function') throw new Error('onLoadCallback is not set');
      await callback(7);

      expect(initPracticeSpy).toHaveBeenCalledWith(detail.mainDeck, detail.extraDeck, 1);
      expect(practiceStore.p2DeckDno).toBe(7);
      expect(practiceStore.p2DeckName).toBe('P2デッキ');
      expect(practiceStore.p2DeckInfo?.originalName).toBe('P2デッキ');
    });

    it('[covers:deck-edit-layout.save-p2-missing-warns] P2未ロードでのP2保存は警告トーストのみで保存しない', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const saveDeckDataSpy = vi.spyOn(deckStore, 'saveDeckData').mockResolvedValue({ success: true });

      playerPanelStub().vm.$emit('save-deck', 1);
      await flushPromises();

      expect(toastSpy).toHaveBeenCalledWith('P2にデッキが読み込まれていません', 'warning');
      expect(saveDeckDataSpy).not.toHaveBeenCalled();
    });

    it('[covers:deck-edit-layout.save-p2-success-toast] P2デッキの保存はp2DeckDno/p2DeckInfoでsaveDeckDataを呼び成功時にトーストを出す', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const practiceStore = usePracticeStore();
      const p2Info = createDeckInfo({ dno: 7, originalName: 'P2デッキ' });
      practiceStore.p2DeckDno = 7;
      practiceStore.p2DeckInfo = p2Info;
      const saveDeckDataSpy = vi.spyOn(deckStore, 'saveDeckData').mockResolvedValue({ success: true });

      playerPanelStub().vm.$emit('save-deck', 1);
      await flushPromises();

      expect(saveDeckDataSpy).toHaveBeenCalledWith(7, p2Info);
      expect(toastSpy).toHaveBeenCalledWith('保存しました', 'success');
    });

    it('[covers:deck-edit-layout.save-p2-failure-toast] P2デッキの保存失敗時はエラートーストを出す', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const practiceStore = usePracticeStore();
      practiceStore.p2DeckDno = 7;
      practiceStore.p2DeckInfo = createDeckInfo({ dno: 7 });
      vi.spyOn(deckStore, 'saveDeckData').mockResolvedValue({ success: false });

      playerPanelStub().vm.$emit('save-deck', 1);
      await flushPromises();

      expect(toastSpy).toHaveBeenCalledWith('保存に失敗しました', 'error');
    });

    it('[covers:deck-edit-layout.save-p0-success-toast] 自陣の保存は現在デッキをsaveDeckで保存し成功時にトーストを出す', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      deckStore.deckInfo.dno = 12;
      const saveDeckSpy = vi.spyOn(deckStore, 'saveDeck').mockResolvedValue({ success: true });

      playerPanelStub().vm.$emit('save-deck');
      await flushPromises();

      expect(saveDeckSpy).toHaveBeenCalledWith(12);
      expect(toastSpy).toHaveBeenCalledWith('保存しました', 'success');
    });

    it('[covers:deck-edit-layout.save-p0-failure-toast] 自陣の保存失敗時はエラートーストを出す', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      vi.spyOn(deckStore, 'saveDeck').mockResolvedValue({ success: false });

      playerPanelStub().vm.$emit('save-deck');
      await flushPromises();

      expect(toastSpy).toHaveBeenCalledWith('保存に失敗しました', 'error');
    });

    it('[covers:deck-edit-layout.save-temp-recipe-adds-cards] tempRecipe/tempRecipe2のカードをcid解決してデッキへ追加し追加枚数をトーストする（ハンドラ単体条件・現在UI経路なし）', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const practiceStore = usePracticeStore();
      practiceStore.tempRecipe.push({ cid: 'a', ciid: '1', section: 'main' });
      practiceStore.tempRecipe2.push({ cid: 'b', ciid: '1', section: 'extra' });
      const cardA = createCardInfo('a');
      const cardB = createCardInfo('b');
      fakeUnifiedDB.cardInfoTable.set('a', cardA);
      fakeUnifiedDB.cardInfoTable.set('b', cardB);
      const addCardSpy = vi.spyOn(deckStore, 'addCard');

      playerPanelStub().vm.$emit('save-temp-recipe');
      await nextTick();

      expect(addCardSpy).toHaveBeenCalledTimes(2);
      expect(addCardSpy).toHaveBeenCalledWith(cardA, 'main');
      expect(addCardSpy).toHaveBeenCalledWith(cardB, 'extra');
      expect(toastSpy).toHaveBeenCalledWith('2枚のカードをデッキに追加しました', 'success');
    });

    it('[covers:deck-edit-layout.save-temp-recipe-none-found-warns] 1枚も解決できない場合は警告トーストのみで追加しない（ハンドラ単体条件・現在UI経路なし）', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      const practiceStore = usePracticeStore();
      practiceStore.tempRecipe.push({ cid: 'unknown', ciid: '1', section: 'main' });
      const addCardSpy = vi.spyOn(deckStore, 'addCard');

      playerPanelStub().vm.$emit('save-temp-recipe');
      await nextTick();

      expect(addCardSpy).not.toHaveBeenCalled();
      expect(toastSpy).toHaveBeenCalledWith('追加できるカードが見つかりませんでした', 'warning');
    });

    it('[covers:deck-edit-layout.practice-action-routing] actionをmoveToTemp/moveToDeckTopはpracticeStore.moveCardへ、それ以外はexecuteActionへ振り分ける', async () => {
      mountLayout();
      await flushPromises();
      const practiceStore = usePracticeStore();
      practiceStore.selectedFieldIndex = 1;
      const moveCardSpy = vi.spyOn(practiceStore, 'moveCard');
      executeActionMock.mockClear();

      zoneInfoPanelStub().vm.$emit('action', 'moveToTemp', 'c1');
      expect(moveCardSpy).toHaveBeenCalledWith('c1', 'temp', undefined, undefined, 1);

      zoneInfoPanelStub().vm.$emit('action', 'moveToDeckTop', 'c1');
      expect(moveCardSpy).toHaveBeenCalledWith('c1', 'deck', undefined, { position: 'top', face: 'down' }, 1);

      zoneInfoPanelStub().vm.$emit('action', 'flip', 'c1');
      expect(executeActionMock).toHaveBeenCalledWith('flip', 'c1', 1);
    });
  });

  // ============================================================
  // I. resize / hashchange / dno
  // ============================================================
  describe('I. resize / hashchange / dno', () => {
    it('[covers:deck-edit-layout.resize-desktop-switches-deck-tab-to-search] desktop幅でのresizeはdeckタブがactiveならsearchタブへ切替える', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      stubInnerWidth(1200);
      deckStore.activeTab = 'deck';

      window.dispatchEvent(new Event('resize'));

      expect(deckStore.activeTab).toBe('search');
    });

    it('[covers:deck-edit-layout.resize-mobile-noop] mobile幅（768px以下）でのresizeはタブ切替を行わない', async () => {
      const { deckStore } = mountLayout();
      await flushPromises();
      stubInnerWidth(768);
      deckStore.activeTab = 'deck';

      window.dispatchEvent(new Event('resize'));

      expect(deckStore.activeTab).toBe('deck');
    });

    it('[covers:deck-edit-layout.hashchange-reloads-on-dno-change] dnoパラメータが変化したhashchangeは追跡値を更新しデッキを再ロードする', async () => {
      window.location.hash = '#/ytomo/edit?dno=1';
      const { initSpy } = mountLayout();
      await flushPromises();
      expect(initSpy).toHaveBeenCalledTimes(1);

      window.location.hash = '#/ytomo/edit?dno=2';
      window.dispatchEvent(new Event('hashchange'));

      expect(initSpy).toHaveBeenCalledTimes(2);
    });

    it('[covers:deck-edit-layout.hashchange-same-dno-no-reload] dnoパラメータが同じhashchangeでは再ロードしない', async () => {
      window.location.hash = '#/ytomo/edit?dno=1';
      const { initSpy } = mountLayout();
      await flushPromises();
      expect(initSpy).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event('hashchange'));
      expect(initSpy).toHaveBeenCalledTimes(1);
    });

    it('[covers:deck-edit-layout.hashchange-same-dno-no-reload] dnoなし→dnoなしのhashchangeでも再ロードしない', async () => {
      window.location.hash = '#/ytomo/edit';
      const { initSpy } = mountLayout();
      await flushPromises();
      expect(initSpy).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event('hashchange'));
      expect(initSpy).toHaveBeenCalledTimes(1);
    });

    it('[covers:deck-edit-layout.current-dno-parses-hash-query] hash内クエリからdnoパラメータを文字列で追跡する（無い場合は空文字列）', async () => {
      // dno=123として追跡開始（同一hashのhashchangeでは再ロードしない）
      window.location.hash = '#/ytomo/edit?dno=123';
      const { initSpy } = mountLayout();
      await flushPromises();
      expect(initSpy).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event('hashchange'));
      expect(initSpy).toHaveBeenCalledTimes(1);

      // dnoが外れれば''との差分で再ロードする（'123'が正しく追跡されていたことの裏付け）
      window.location.hash = '#/ytomo/edit';
      window.dispatchEvent(new Event('hashchange'));
      expect(initSpy).toHaveBeenCalledTimes(2);
    });
  });
});
