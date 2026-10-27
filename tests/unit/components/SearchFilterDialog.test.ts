/**
 * SearchFilterDialog.vue のテスト
 *
 * tests/design/search-filter-dialog/conditions.toml（TASK-504 × TASK-331 Tier C）の
 * 33条件（TASK-508で3件新設・1件改名）をカバーする。1条件1it原則（計33it）。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - BaseDialog実物（stubしない）: Teleport to="body" + v-if のため、観測はすべて
 *   document.body.querySelector(All) 経由で行う
 * - FilterTab / HistoryTab / HistoryItem は実物をマウントする（タブ内容の切替・
 *   履歴操作をDOMイベント経由で検証するため）
 * - SearchInputBar（フッター配置）のみstub: 本書の対象外（条件書excluded
 *   「フッターのSearchInputBar配置」）。かつヘッダー .search-btn と同名クラスを
 *   持つためセレクタ衝突の回避も兼ねる
 * - DOMイベント経由の操作（vm内部関数呼び出し・vm内部状態の直接読み取りはしない）。
 *   HistoryTabが描画し得ないitemのemit（unknown item・空履歴へのexecute）のみ、
 *   HistoryTabの公開emit契約をfindComponent経由で発生させる（到達不能経路である旨は
 *   各itのコメントに記載）
 * - 外部I/Oはmodule mockで置き換える: @/api/card-search（検索API）・
 *   @/utils/unified-cache-db（キャッシュ復元）。buildSearchOptions は実物を
 *   delegating mock で包み、呼び出し契約（引数）を検証する
 * - wrapperのunmountはafterEachに一元化（assert失敗時も必ず全wrapperをunmountしてから
 *   bodyを初期化する）
 * - バックグラウンド再検索はsetTimeout(100)の実タイマーを待機して検証する
 *   （fake timerだと動的importのmicrotask解決と干渉するため）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import SearchFilterDialog from '@/components/SearchFilterDialog.vue';
import HistoryTab from '@/components/search-filter/HistoryTab.vue';
import { useDeckEditStore } from '@/stores/deck-edit';
import { useSearchStore } from '@/stores/search';
import { useSettingsStore } from '@/stores/settings';
import { useSearchHistory } from '@/composables/useSearchHistory';
import { buildSearchOptions } from '@/utils/search-options-builder';
import type { SearchFilters } from '@/types/search-filters';
import type { SearchHistoryItem } from '@/types/search-history';
import type { CardInfo } from '@/types/card';

// ============================================================
// module mock（外部I/Oの置き換え）
// ============================================================

// 検索API（card-search）。SearchFilterDialog.vue / useSearchExecution とも動的importで
// 受け取るsearchCards / searchCardsAutoのみ差し替える。
// SORT_ORDER_TO_API_VALUE はsearch-options-builder.tsが値としてimportするため
// 実物と同じ内容をmock側にも用意する（src/api/mappers/card-search-mapper.tsの正本写し）
const apiMocks = vi.hoisted(() => ({
  searchCards: vi.fn(),
  searchCardsAuto: vi.fn(),
}));
vi.mock('@/api/card-search', () => ({
  searchCards: apiMocks.searchCards,
  searchCardsAuto: apiMocks.searchCardsAuto,
  SORT_ORDER_TO_API_VALUE: {
    'name_asc': 1,
    'name_desc': 1,
    'release_desc': 21,
    'release_asc': 20,
    'level_desc': 2,
    'level_asc': 3,
    'atk_desc': 4,
    'atk_asc': 5,
    'def_desc': 6,
    'def_asc': 7,
    'attribute_asc': 1,
    'attribute_desc': 1,
    'race_asc': 1,
    'race_desc': 1
  }
}));

// UnifiedCacheDB。executeHistorySearchのキャッシュ復元（reconstructCardInfo）契約のみ検証
const cacheMocks = vi.hoisted(() => ({
  getUnifiedCacheDB: vi.fn(),
  reconstructCardInfo: vi.fn(),
}));
vi.mock('@/utils/unified-cache-db', () => ({
  getUnifiedCacheDB: cacheMocks.getUnifiedCacheDB,
}));

// buildSearchOptions は実物を delegating mock で包む（実挙動を変えず呼び出し引数を観測）。
// afterEachのrestoreAllMocksで実装が失われるため、actualを保持してbeforeEachで再設定する
type BuildSearchOptionsFn = typeof import('@/utils/search-options-builder')['buildSearchOptions'];
const optionsBuilderState = vi.hoisted(() => {
  const state: { spy: ReturnType<typeof vi.fn>; actual?: BuildSearchOptionsFn } = { spy: vi.fn() };
  return state;
});
vi.mock('@/utils/search-options-builder', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/search-options-builder')>();
  optionsBuilderState.actual = actual.buildSearchOptions;
  optionsBuilderState.spy.mockImplementation(actual.buildSearchOptions);
  return { buildSearchOptions: optionsBuilderState.spy };
});

// ============================================================
// 要素取得ヘルパー（存在assert必須・取得失敗時は即fail）
// ============================================================

/** セレクタでbody直下の要素を取得する。存在しない場合はその場でfailする */
function requireElement<T extends Element>(selector: string): T {
  const el = document.body.querySelector<T>(selector);
  expect(el).not.toBeNull();
  if (el === null) {
    throw new Error(`[SearchFilterDialog.test] element not found: ${selector}`);
  }
  return el;
}

/** ヘッダーチップをtypeクラス+ラベルテキスト完全一致で取得する。存在しない場合はfailする */
function requireHeaderChip(label: string, type: string): HTMLButtonElement {
  const found = Array.from(document.body.querySelectorAll<HTMLButtonElement>(`.header-chip.${type}`))
    .find(el => (el.textContent ?? '').trim() === label);
  expect(found).toBeDefined();
  if (found === undefined) {
    throw new Error(`[SearchFilterDialog.test] header chip not found: type=${type} label=${label}`);
  }
  return found;
}

/** dialog-tabボタンをタブラベル（検索条件/検索履歴）で取得する（バッジ数字は無視） */
function requireTab(label: string): HTMLButtonElement {
  const found = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.dialog-tab'))
    .find(el => (el.textContent ?? '').replace(/\d+/, '').trim() === label);
  expect(found).toBeDefined();
  if (found === undefined) {
    throw new Error(`[SearchFilterDialog.test] tab not found: ${label}`);
  }
  return found;
}

/** 実タイマーの待機（バックグラウンド再検索のsetTimeout(100)・Transitionの除去待ち等） */
function waitForMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 履歴実行・検索実行など非同期処理の完了待ち（microtask + macrotaskのフラッシュ） */
async function settle(): Promise<void> {
  await nextTick();
  await flushPromises();
  await waitForMs(20);
}

// ============================================================
// fixture
// ============================================================

/** 全フィルター未設定のSearchFilters（一部だけ上書きして使う） */
function baseFilters(overrides: Partial<SearchFilters> = {}): SearchFilters {
  return {
    cardType: null,
    attributes: [],
    spellTypes: [],
    trapTypes: [],
    races: [],
    monsterTypes: [],
    monsterTypeMatchMode: 'or',
    levelType: 'level',
    levelValues: [],
    linkValues: [],
    scaleValues: [],
    linkMarkers: [],
    linkMarkerMatchMode: 'or',
    atk: { exact: false, unknown: false },
    def: { exact: false, unknown: false },
    releaseDate: {},
    ...overrides
  };
}

/** 検索履歴item（既定は本日timestamp・resultCids空でバックグラウンド再検索を起こさない） */
function historyItem(overrides: Partial<SearchHistoryItem> = {}): SearchHistoryItem {
  return {
    query: 'ドラゴン',
    searchMode: 'name',
    filters: baseFilters(),
    resultCids: [],
    resultCount: 0,
    timestamp: Date.now(),
    isFavorite: false,
    ...overrides
  };
}

/** キャッシュ復元・再検索結果で使うCardInfo fixture（モンスター1枚） */
function cardFixture(cid: string, name: string): CardInfo {
  return {
    name,
    cardId: cid,
    ciid: `ciid-${cid}`,
    lang: 'ja',
    imgs: [{ ciid: `ciid-${cid}`, imgHash: 'hash' }],
    cardType: 'monster',
    attribute: 'light',
    levelType: 'level',
    levelValue: 4,
    race: 'dragon',
    types: ['effect']
  };
}

/** キャッシュ復元の挙動を設定する（cid→CardInfo。マップに無いcidは復元失敗=undefined） */
function setCacheRestoration(cardMap: Record<string, CardInfo>): void {
  cacheMocks.reconstructCardInfo.mockImplementation((cid: string) => cardMap[cid]);
}

// ============================================================
// 共通setup
// ============================================================

let pinia: ReturnType<typeof createPinia>;
const mountedWrappers: Array<ReturnType<typeof mountDialog>> = [];

/** SearchFilterDialogをmountする（SearchInputBarのみstub）。wrapperは管理帳簿へ登録。
 *  既定でdeckStore.isFilterDialogVisible=true（ダイアログ開いた状態） */
function mountDialog(options: { visible?: boolean } = {}) {
  const deckStore = useDeckEditStore();
  deckStore.isFilterDialogVisible = options.visible ?? true;
  const wrapper = mount(SearchFilterDialog, {
    global: {
      plugins: [pinia],
      stubs: {
        SearchInputBar: true
      }
    }
  });
  mountedWrappers.push(wrapper);
  return wrapper;
}

/** 「検索履歴」タブへ切替える（履歴系テストの共通前置） */
async function switchToHistoryTab(): Promise<void> {
  await new DOMWrapper(requireTab('検索履歴')).trigger('click');
}

/** 履歴itemの実行ボタン（.history-item .history-btn.search-btn）を取得する */
function requireHistoryExecuteButton(index = 0): HTMLButtonElement {
  const buttons = document.body.querySelectorAll<HTMLButtonElement>('.history-item .history-btn.search-btn');
  const button = buttons[index];
  expect(button).toBeDefined();
  if (button === undefined) {
    throw new Error(`[SearchFilterDialog.test] history execute button not found: index=${index}`);
  }
  return button;
}

/** クエリテキストで履歴item要素を特定する（お気に入り化でFavorites/Recentセクションへ
 *  並べ替わっても位置に依存しない特定のため） */
function requireHistoryItemElement(query: string): Element {
  const found = Array.from(document.body.querySelectorAll('.history-item'))
    .find(el => (el.querySelector('.history-text')?.textContent ?? '').trim() === query);
  expect(found).toBeDefined();
  if (found === undefined) {
    throw new Error(`[SearchFilterDialog.test] history item not found: query=${query}`);
  }
  return found;
}

/** 履歴実行後にダイアログが閉じられるため再オープンする（タブ選択は維持される） */
async function reopenDialog(): Promise<void> {
  const deckStore = useDeckEditStore();
  deckStore.isFilterDialogVisible = true;
  await nextTick();
}

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  vi.clearAllMocks();

  // API・キャッシュ・buildSearchOptionsの既定挙動（各itでOnce系で上書きする）
  apiMocks.searchCards.mockResolvedValue([]);
  apiMocks.searchCardsAuto.mockResolvedValue({ cards: [] });
  cacheMocks.getUnifiedCacheDB.mockImplementation(() => ({
    reconstructCardInfo: cacheMocks.reconstructCardInfo
  }));
  cacheMocks.reconstructCardInfo.mockImplementation(() => undefined);
  if (optionsBuilderState.actual) {
    optionsBuilderState.spy.mockImplementation(optionsBuilderState.actual);
  }

  // 検索履歴はmodule単位の共有状態のため毎テストリセット
  useSearchHistory().historyItems.value = [];
  localStorage.clear();
});

afterEach(() => {
  // it内のassert失敗に関わらず必ず全wrapperをunmountする（Teleport残留・watcher残留防止）
  for (const wrapper of mountedWrappers) {
    wrapper.unmount();
  }
  mountedWrappers.length = 0;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ============================================================
// テスト本体
// ============================================================

describe('components/SearchFilterDialog', () => {
  describe('ダイアログ開閉・タブ制御', () => {
    it('[covers:search-filter-dialog.visibility-controlled-by-store-flag] ダイアログの表示はdeckStore.isFilterDialogVisibleで制御される', async () => {
      const deckStore = useDeckEditStore();
      mountDialog({ visible: false });
      expect(document.body.querySelector('.base-dialog-overlay')).toBeNull();

      // storeフラグをtrueにするとoverlayが描画され検索条件タブが2件表示される
      deckStore.isFilterDialogVisible = true;
      await nextTick();
      requireElement('.base-dialog-overlay');
      expect(document.body.querySelectorAll('.dialog-tab')).toHaveLength(2);
    });

    it('[covers:search-filter-dialog.base-dialog-close-hides-dialog] BaseDialogのcloseイベント（overlay自クリック）でダイアログを閉じる', async () => {
      const deckStore = useDeckEditStore();
      mountDialog();
      const overlay = requireElement('.base-dialog-overlay');

      // overlay自身のclick（@click.self）でcloseが発火しstoreフラグがfalseになる
      await new DOMWrapper(overlay).trigger('click');
      expect(deckStore.isFilterDialogVisible).toBe(false);

      await nextTick();
      await waitForMs(20); // Transitionの除去完了待ち
      expect(document.body.querySelector('.base-dialog-overlay')).toBeNull();
    });

    it('[covers:search-filter-dialog.close-buttons-set-store-flag-false] ヘッダーとフッターの×ボタン両経路でダイアログを閉じる', async () => {
      const deckStore = useDeckEditStore();
      mountDialog();

      // ヘッダーの×ボタン
      await new DOMWrapper(requireElement<HTMLButtonElement>('.header-actions .close-btn')).trigger('click');
      expect(deckStore.isFilterDialogVisible).toBe(false);

      // 再オープンしてフッターの×ボタン
      deckStore.isFilterDialogVisible = true;
      await nextTick();
      await new DOMWrapper(requireElement<HTMLButtonElement>('.footer-close-btn')).trigger('click');
      expect(deckStore.isFilterDialogVisible).toBe(false);
    });

    it('[covers:search-filter-dialog.initial-active-tab-is-filter] 初期タブは検索条件でFilterTab本体を表示する', () => {
      mountDialog();

      expect(requireTab('検索条件').classList.contains('active')).toBe(true);
      expect(requireTab('検索履歴').classList.contains('active')).toBe(false);

      // dialog-body内にFilterTab由来の要素が存在しHistoryTab由来は存在しない
      expect(document.body.querySelector('.filter-tab')).not.toBeNull();
      expect(document.body.querySelector('.history-tab')).toBeNull();
      // FilterTab内のカードタイプタブ（旧テスト「card type buttons render」の吸収）
      expect(document.body.querySelectorAll('.card-type-tab').length).toBeGreaterThan(0);
    });

    it('[covers:search-filter-dialog.tab-switch-swaps-tab-content] タブクリックでactiveクラスと表示内容が連動して入れ替わる', async () => {
      mountDialog();

      // 検索履歴タブへ切替
      const historyTabBtn = requireTab('検索履歴');
      await new DOMWrapper(historyTabBtn).trigger('click');
      expect(historyTabBtn.classList.contains('active')).toBe(true);
      expect(requireTab('検索条件').classList.contains('active')).toBe(false);
      expect(document.body.querySelector('.history-tab')).not.toBeNull();
      expect(document.body.querySelector('.filter-tab')).toBeNull();

      // 検索条件タブへ戻す
      const filterTabBtn = requireTab('検索条件');
      await new DOMWrapper(filterTabBtn).trigger('click');
      expect(filterTabBtn.classList.contains('active')).toBe(true);
      expect(document.body.querySelector('.filter-tab')).not.toBeNull();
      expect(document.body.querySelector('.history-tab')).toBeNull();
    });

    it('[covers:search-filter-dialog.tab-selection-persists-across-close] 現行挙動: ダイアログを閉じてもタブ選択はリセットされない', async () => {
      const deckStore = useDeckEditStore();
      mountDialog();
      await switchToHistoryTab();
      expect(document.body.querySelector('.history-tab')).not.toBeNull();

      // ダイアログを閉じて再オープン（コンポーネントは常駐マウントのため状態は残る）
      deckStore.isFilterDialogVisible = false;
      await nextTick();
      await waitForMs(20);
      expect(document.body.querySelector('.base-dialog-overlay')).toBeNull();

      deckStore.isFilterDialogVisible = true;
      await nextTick();
      expect(requireTab('検索履歴').classList.contains('active')).toBe(true);
      expect(document.body.querySelector('.history-tab')).not.toBeNull();
      expect(document.body.querySelector('.filter-tab')).toBeNull();
    });
  });

  describe('filterCount badge（ヘッダー絞り込み件数）', () => {
    it('[covers:search-filter-dialog.filter-count-aggregates-active-filters] 絞り込み件数は設定済みフィルターの総数を集計する', () => {
      const searchStore = useSearchStore();
      searchStore.searchFilters = baseFilters({
        cardType: 'monster',
        attributes: ['light', 'dark'],
        levelValues: [4, 6],
        atk: { exact: false, unknown: false, min: 100 },
        releaseDate: { from: '2020-01-01' }
      });
      mountDialog();

      // cardType:1 + attributes:2 + levelValues:2 + atk(minのみ):1 + releaseDate:1 = 7。
      // 条件書expect_returnの総数「5」は内訳合計（7）と不一致の算術誤記（報告済み）
      expect(requireElement('.tab-badge').textContent?.trim()).toBe('7');
    });

    it('[covers:search-filter-dialog.filter-count-ignores-mode-settings-and-stat-flags] 現行挙動: モード設定とexact/unknownフラグは件数に数えない', () => {
      const searchStore = useSearchStore();
      searchStore.searchFilters = baseFilters({
        monsterTypeMatchMode: 'and',
        levelType: 'level',
        linkMarkerMatchMode: 'and',
        atk: { exact: true, unknown: false }
      });
      mountDialog();

      // filterCount=0のためバッジは非表示
      expect(document.body.querySelector('.tab-badge')).toBeNull();
      // 一方クリアボタン表示のhasActiveFilters（useFilterLogic側）はexactを数えるため表示される
      expect(document.body.querySelector('.clear-btn')).not.toBeNull();
    });

    it('[covers:search-filter-dialog.tab-badge-visible-only-when-count-positive] 件数バッジは1以上の時のみ表示する', async () => {
      const searchStore = useSearchStore();
      mountDialog();

      // 0件: バッジを描画しない
      expect(document.body.querySelector('.tab-badge')).toBeNull();

      // cardType設定で1件: バッジが描画されテキスト='1'
      searchStore.searchFilters = baseFilters({ cardType: 'monster' });
      await nextTick();
      expect(requireElement('.tab-badge').textContent?.trim()).toBe('1');
    });
  });

  describe('ヘッダーチップ表示・削除（removeHeaderChip）', () => {
    it('[covers:search-filter-dialog.header-chips-rendered-from-filter-icons] ヘッダーはfilter iconsをチップとして描画する', () => {
      const searchStore = useSearchStore();
      searchStore.searchFilters = baseFilters({ cardType: 'monster', attributes: ['light'] });
      mountDialog();

      // 2件（typeクラス cardType / attr）。テキストはアイコンのlabel
      expect(document.body.querySelectorAll('.header-chip')).toHaveLength(2);
      const cardTypeChip = requireHeaderChip('M', 'cardType');
      expect(cardTypeChip.title).toBe('Mを削除');
      const attrChip = requireHeaderChip('光', 'attr');
      expect(attrChip.title).toBe('光を削除');
    });

    it('[covers:search-filter-dialog.remove-chip-card-type-clears-card-type] カードタイプのチップ削除はcardTypeのみnullへ戻す', async () => {
      const searchStore = useSearchStore();
      searchStore.searchFilters = baseFilters({ cardType: 'monster', attributes: ['light'] });
      mountDialog();

      await new DOMWrapper(requireHeaderChip('M', 'cardType')).trigger('click');

      expect(searchStore.searchFilters.cardType).toBeNull();
      expect(searchStore.searchFilters.attributes).toEqual(['light']);
    });

    it('[covers:search-filter-dialog.remove-chip-single-value-keeps-others] 属性・モンスタータイプのチップ削除は当該値のみ除外し他の選択値を保持する', async () => {
      const searchStore = useSearchStore();
      searchStore.searchFilters = baseFilters({
        attributes: ['light', 'dark'],
        monsterTypes: [
          { type: 'fusion', state: 'normal' },
          { type: 'tuner', state: 'not' }
        ]
      });
      mountDialog();

      // attr: value一致除外
      await new DOMWrapper(requireHeaderChip('光', 'attr')).trigger('click');
      expect(searchStore.searchFilters.attributes).toEqual(['dark']);

      // mtype: monsterTypes要素のtypeフィールド一致除外。残存要素のstateは保持
      await new DOMWrapper(requireHeaderChip('融', 'mtype')).trigger('click');
      expect(searchStore.searchFilters.monsterTypes).toEqual([{ type: 'tuner', state: 'not' }]);
    });

    it('[covers:search-filter-dialog.remove-chip-clears-whole-value-group] 範囲統合表示チップの削除は当該フィルターの全値を一括クリアする', async () => {
      const searchStore = useSearchStore();
      searchStore.searchFilters = baseFilters({
        levelValues: [4, 6, 8],
        linkValues: [2, 3],
        scaleValues: [1, 7],
        linkMarkers: [1, 4]
      });
      mountDialog();

      // level チップ削除: levelValuesのみクリア、他の3配列は保持
      await new DOMWrapper(requireElement('.header-chip.level')).trigger('click');
      expect(searchStore.searchFilters.levelValues).toEqual([]);
      expect(searchStore.searchFilters.linkValues).toEqual([2, 3]);
      expect(searchStore.searchFilters.scaleValues).toEqual([1, 7]);
      expect(searchStore.searchFilters.linkMarkers).toEqual([1, 4]);

      // link チップ削除
      await new DOMWrapper(requireElement('.header-chip.link')).trigger('click');
      expect(searchStore.searchFilters.linkValues).toEqual([]);
      expect(searchStore.searchFilters.scaleValues).toEqual([1, 7]);
      expect(searchStore.searchFilters.linkMarkers).toEqual([1, 4]);

      // scale チップ削除
      await new DOMWrapper(requireElement('.header-chip.scale')).trigger('click');
      expect(searchStore.searchFilters.scaleValues).toEqual([]);
      expect(searchStore.searchFilters.linkMarkers).toEqual([1, 4]);

      // linkMarker チップ削除
      await new DOMWrapper(requireElement('.header-chip.linkMarker')).trigger('click');
      expect(searchStore.searchFilters.linkMarkers).toEqual([]);
    });

    it('[covers:search-filter-dialog.remove-chip-resets-stat-condition] 攻撃力チップ削除はatk条件を丸ごと初期化しdefは保持する', async () => {
      const searchStore = useSearchStore();
      searchStore.searchFilters = baseFilters({
        atk: { exact: true, unknown: false, min: 100, max: 2000 },
        def: { exact: false, unknown: true }
      });
      mountDialog();

      await new DOMWrapper(requireElement('.header-chip.atk')).trigger('click');

      // オブジェクト丸ごと置換のためmin/maxも消える
      expect(searchStore.searchFilters.atk).toEqual({ exact: false, unknown: false });
      expect(searchStore.searchFilters.def).toEqual({ exact: false, unknown: true });
    });

    it('[covers:search-filter-dialog.remove-chip-spell-trap-type-removes-value] 魔法タイプ・罠タイプのチップ削除は当該値のみを除外し他の選択値を保持する', async () => {
      const searchStore = useSearchStore();
      searchStore.searchFilters = baseFilters({
        spellTypes: ['normal', 'quick-play'],
        trapTypes: ['normal', 'continuous']
      });
      mountDialog();

      // spellType 'normal'（ラベル 通常）のチップをクリック
      const spellChip = requireHeaderChip('通常', 'spellType');
      await new DOMWrapper(spellChip).trigger('click');
      expect(searchStore.searchFilters.spellTypes).toEqual(['quick-play']);

      // trapType 'normal'（ラベル 通常）のチップも同様に当該値のみ除外する
      const trapChip = requireHeaderChip('通常', 'trapType');
      await new DOMWrapper(trapChip).trigger('click');
      expect(searchStore.searchFilters.trapTypes).toEqual(['continuous']);
    });
  });

  describe('ヘッダー操作（検索・クリア・検索モード）', () => {
    it('[covers:search-filter-dialog.clear-button-visibility-and-delegation] クリアボタンはフィルター有効時のみ表示しクリックで全初期化へ委譲する', async () => {
      const searchStore = useSearchStore();
      mountDialog();

      // 未設定: クリアボタン非表示
      expect(document.body.querySelector('.clear-btn')).toBeNull();

      // 設定済み: 表示され、clickでsearchFiltersが全初期値へ戻る
      searchStore.searchFilters = baseFilters({
        cardType: 'monster',
        attributes: ['light'],
        spellTypes: ['normal'],
        levelValues: [4],
        atk: { exact: false, unknown: false, min: 200 }
      });
      await nextTick();
      await new DOMWrapper(requireElement<HTMLButtonElement>('.clear-btn')).trigger('click');
      expect(searchStore.searchFilters).toEqual(baseFilters());
    });

    it('[covers:search-filter-dialog.header-search-button-invokes-search-execution] ヘッダー検索ボタンはuseSearchExecutionの検索実行を起動する', async () => {
      const searchStore = useSearchStore();
      const deckStore = useDeckEditStore();
      searchStore.searchQuery = 'ブルーアイズ';
      searchStore.searchFilters = baseFilters({ cardType: 'monster' });
      const resultCard = cardFixture('9001', 'ブルーアイズ');
      apiMocks.searchCardsAuto.mockResolvedValueOnce({ cards: [resultCard] });
      mountDialog();

      await new DOMWrapper(requireElement<HTMLButtonElement>('.header-actions .search-btn')).trigger('click');
      await settle();

      // 設定ux.defaultSearchMode='auto'（規定値）で検索APIが1回起動し結果が反映される
      expect(apiMocks.searchCardsAuto).toHaveBeenCalledTimes(1);
      expect(apiMocks.searchCards).not.toHaveBeenCalled();
      expect(searchStore.searchResults).toHaveLength(1);
      // 検索実行に付随するUI遷移（ダイアログ自動クローズ・deckタブを検索結果へ）
      expect(deckStore.isFilterDialogVisible).toBe(false);
      expect(deckStore.activeTab).toBe('search');
    });

    it('[covers:search-filter-dialog.dialog-search-mode-falls-back-to-auto] 検索モードはux.defaultSearchModeを読み空の場合autoへフォールバックする', async () => {
      const searchStore = useSearchStore();
      const deckStore = useDeckEditStore();
      const settingsStore = useSettingsStore();
      searchStore.searchQuery = 'ドラゴン';
      mountDialog();

      // 'name': searchCards経路で解釈される
      settingsStore.appSettings.ux.defaultSearchMode = 'name';
      await nextTick();
      await new DOMWrapper(requireElement<HTMLButtonElement>('.header-actions .search-btn')).trigger('click');
      await settle();
      expect(apiMocks.searchCards).toHaveBeenCalledTimes(1);
      expect(apiMocks.searchCardsAuto).not.toHaveBeenCalled();

      // 空（falsy）: 'auto'へフォールバックしsearchCardsAuto経路になる
      Object.assign(settingsStore.appSettings.ux, { defaultSearchMode: '' });
      deckStore.isFilterDialogVisible = true;
      await nextTick();
      await new DOMWrapper(requireElement<HTMLButtonElement>('.header-actions .search-btn')).trigger('click');
      await settle();
      expect(apiMocks.searchCardsAuto).toHaveBeenCalledTimes(1);
    });
  });

  describe('履歴検索実行（executeHistorySearch）', () => {
    it('[covers:search-filter-dialog.history-search-restores-filters-as-defensive-copy] 復元フィルターは防御コピーで履歴側と参照を共有しない', async () => {
      const searchStore = useSearchStore();
      const searchHistory = useSearchHistory();
      const item = historyItem({
        filters: baseFilters({ cardType: 'monster', attributes: ['light'] })
      });
      searchHistory.historyItems.value = [item];
      mountDialog();
      await switchToHistoryTab();

      await new DOMWrapper(requireHistoryExecuteButton()).trigger('click');
      await settle();

      // 復元直後は履歴item.filtersと同値
      expect(searchStore.searchFilters).toEqual(baseFilters({ cardType: 'monster', attributes: ['light'] }));

      // 復元後にstore側を変更しても履歴item.filtersは書き換わらない（参照非共有）
      searchStore.searchFilters.attributes.push('dark');
      expect(item.filters.attributes).toEqual(['light']);
    });

    it('[covers:search-filter-dialog.history-search-restores-query-and-closes-dialog] 履歴実行はクエリを復元しダイアログを閉じて検索タブへ切替える', async () => {
      const searchStore = useSearchStore();
      const deckStore = useDeckEditStore();
      const searchHistory = useSearchHistory();
      setCacheRestoration({ 'cid-1': cardFixture('cid-1', '復元カード') });
      const item = historyItem({
        query: 'ドラゴン',
        filters: baseFilters({ cardType: 'monster' }),
        resultCids: ['cid-1']
      });
      searchHistory.historyItems.value = [item];
      mountDialog();
      await switchToHistoryTab();

      await new DOMWrapper(requireHistoryExecuteButton()).trigger('click');
      await settle();

      expect(searchStore.searchQuery).toBe('ドラゴン');
      expect(searchStore.searchFilters).toEqual(baseFilters({ cardType: 'monster' }));
      expect(deckStore.isFilterDialogVisible).toBe(false);
      expect(deckStore.activeTab).toBe('search');
    });

    it('[covers:search-filter-dialog.history-search-restores-cached-results] キャッシュ復元は復元失敗cidを除外し結果へ即時反映する', async () => {
      const searchStore = useSearchStore();
      const searchHistory = useSearchHistory();
      const cardA = cardFixture('cid-a', 'カードA');
      const cardB = cardFixture('cid-b', 'カードB');
      setCacheRestoration({ 'cid-a': cardA, 'cid-b': cardB }); // cid-missingは復元不可
      const item = historyItem({ resultCids: ['cid-a', 'cid-b', 'cid-missing'] });
      searchHistory.historyItems.value = [item];
      mountDialog();
      await switchToHistoryTab();

      await new DOMWrapper(requireHistoryExecuteButton()).trigger('click');
      await settle();

      // cid-missingは結果に含まれず2件。デッキ編集内検索結果として扱われる
      expect(searchStore.searchResults).toEqual([cardA, cardB]);
      expect(searchStore.allResults).toEqual([cardA, cardB]);
      expect(searchStore.isGlobalSearchMode).toBe(false);
    });

    it('[covers:search-filter-dialog.history-search-empty-cache-keeps-results] 復元0件の場合は現在の検索結果を書き換えない', async () => {
      const searchStore = useSearchStore();
      const searchHistory = useSearchHistory();
      const existing = { card: cardFixture('pre-1', '既存カード') };
      searchStore.searchResults = [existing];
      searchStore.allResults = [existing];
      searchStore.isGlobalSearchMode = true;
      const emptyItem = historyItem({ resultCids: [] });
      const allMissingItem = historyItem({ resultCids: ['cid-missing'] });
      searchHistory.historyItems.value = [emptyItem, allMissingItem];
      mountDialog();
      await switchToHistoryTab();

      // resultCids空の履歴（0番目）を実行
      await new DOMWrapper(requireHistoryExecuteButton(0)).trigger('click');
      await settle();
      expect(searchStore.searchResults).toEqual([existing]);
      expect(searchStore.allResults).toEqual([existing]);
      expect(searchStore.isGlobalSearchMode).toBe(true);

      // 全cid復元不可の履歴（1番目。履歴itemは実行後も残る）でも同様
      await reopenDialog();
      await new DOMWrapper(requireHistoryExecuteButton(1)).trigger('click');
      await settle();
      expect(searchStore.searchResults).toEqual([existing]);
      expect(searchStore.allResults).toEqual([existing]);
      expect(searchStore.isGlobalSearchMode).toBe(true);
    });

    it('[covers:search-filter-dialog.history-search-same-date-skips-research] 履歴タイムスタンプが今日の場合はバックグラウンド再検索を行わない', async () => {
      const searchHistory = useSearchHistory();
      setCacheRestoration({ 'cid-a': cardFixture('cid-a', '当日カード') });
      const item = historyItem({ searchMode: 'auto', resultCids: ['cid-a'], timestamp: Date.now() });
      searchHistory.historyItems.value = [item];
      mountDialog();
      await switchToHistoryTab();

      await new DOMWrapper(requireHistoryExecuteButton()).trigger('click');
      await settle();
      await waitForMs(150);

      // キャッシュ復元のみ行われ、API検索は呼ばれない
      expect(apiMocks.searchCardsAuto).not.toHaveBeenCalled();
      expect(apiMocks.searchCards).not.toHaveBeenCalled();
    });

    it('[covers:search-filter-dialog.history-search-stale-date-reruns-in-background] 日付が異なる場合は100ms後にsearchMode映射でバックグラウンド再検索する', async () => {
      const searchHistory = useSearchHistory();
      const yesterday = Date.now() - 24 * 3600 * 1000;
      const autoItem = historyItem({ query: '自動検索', searchMode: 'auto', timestamp: yesterday });
      const textItem = historyItem({ query: 'テキスト検索', searchMode: 'text', timestamp: yesterday });
      searchHistory.historyItems.value = [autoItem, textItem];
      mountDialog();
      await switchToHistoryTab();

      // auto: searchCardsAutoが'1'（name相当）・'name_asc'固定・item.filtersで呼ばれる
      await new DOMWrapper(requireHistoryExecuteButton(0)).trigger('click');
      await waitForMs(150);
      expect(apiMocks.searchCardsAuto).toHaveBeenCalledTimes(1);
      expect(vi.mocked(buildSearchOptions)).toHaveBeenCalledWith('自動検索', '1', 'name_asc', autoItem.filters);

      // auto以外（text='2'）: searchCards経由。履歴itemは実行後も残るため
      // autoItem（0番目）ではなくtextItem（1番目）を実行する
      await reopenDialog();
      await new DOMWrapper(requireHistoryExecuteButton(1)).trigger('click');
      await waitForMs(150);
      expect(apiMocks.searchCards).toHaveBeenCalledTimes(1);
      expect(vi.mocked(buildSearchOptions)).toHaveBeenCalledWith('テキスト検索', '2', 'name_asc', textItem.filters);
    });

    it('[covers:search-filter-dialog.history-search-rerun-updates-store-and-history] 再検索結果はstoreへ反映され履歴の結果cidも更新される', async () => {
      const searchStore = useSearchStore();
      const searchHistory = useSearchHistory();
      const yesterday = Date.now() - 24 * 3600 * 1000;
      setCacheRestoration({ 'cid-a': cardFixture('cid-a', 'キャッシュカード') });
      const item = historyItem({ resultCids: ['cid-a'], timestamp: yesterday });
      searchHistory.historyItems.value = [item];
      const cardX = cardFixture('x-1', '再検索X');
      const cardY = cardFixture('x-2', '再検索Y');
      apiMocks.searchCards.mockResolvedValueOnce([cardX, cardY]);
      mountDialog();
      await switchToHistoryTab();

      await new DOMWrapper(requireHistoryExecuteButton()).trigger('click');
      await waitForMs(150);

      // 結果が再検索の2件へ入れ替わり、updateResults相当として履歴resultCidsも更新される
      expect(searchStore.searchResults).toEqual([cardX, cardY]);
      expect(searchStore.allResults).toEqual([cardX, cardY]);
      expect(item.resultCids).toEqual(['x-1', 'x-2']);
    });

    it('[covers:search-filter-dialog.history-search-rerun-failure-logs-error] 再検索失敗時はconsole.errorを出しキャッシュ復元結果を保持する', async () => {
      const searchStore = useSearchStore();
      const searchHistory = useSearchHistory();
      const yesterday = Date.now() - 24 * 3600 * 1000;
      const cachedCard = cardFixture('cid-a', 'キャッシュカード');
      setCacheRestoration({ 'cid-a': cachedCard });
      const item = historyItem({ resultCids: ['cid-a'], timestamp: yesterday });
      searchHistory.historyItems.value = [item];
      apiMocks.searchCards.mockRejectedValueOnce(new Error('api down'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mountDialog();
      await switchToHistoryTab();

      await new DOMWrapper(requireHistoryExecuteButton()).trigger('click');
      await waitForMs(150);

      // 未処理rejectとせずログを出す
      expect(errorSpy).toHaveBeenCalledWith('[YGO Helper] 検索履歴の再検索に失敗しました:', expect.any(Error));
      // キャッシュ復元済みの表示結果はそのまま
      expect(searchStore.searchResults).toEqual([cachedCard]);
    });

    it('[covers:search-filter-dialog.history-search-rerun-respects-generation-guard] 遅延再検索の結果は世代チェックで破棄され新検索結果を維持する', async () => {
      const searchStore = useSearchStore();
      const searchHistory = useSearchHistory();
      const yesterday = Date.now() - 24 * 3600 * 1000;
      setCacheRestoration({ 'cid-a': cardFixture('cid-a', 'キャッシュカード') });
      const item = historyItem({ query: '古いクエリ', resultCids: ['cid-a'], timestamp: yesterday });
      searchHistory.historyItems.value = [item];
      const newCard = cardFixture('new-1', '新検索結果');
      const lateCard = cardFixture('late-1', '遅延再検索結果');
      // 遅延再検索の応答を手動resolve可能にする（実タイマーとの競合順序を排他し、
      // 必ず「新検索結果表示後」に遅延応答を完了させる）
      let resolveLateSearch!: (cards: CardInfo[]) => void;
      apiMocks.searchCards.mockImplementationOnce(
        () => new Promise<CardInfo[]>(resolve => { resolveLateSearch = resolve; })
      );
      mountDialog();
      await switchToHistoryTab();

      // 履歴を実行（100msの遅延再検索タイマーが仕掛かる。応答はpendingのまま）
      await new DOMWrapper(requireHistoryExecuteButton()).trigger('click');
      await settle();

      // 100ms経過前に新検索を実行（検索世代が進む）。既定ux.defaultSearchMode='auto'のため
      // 新検索はsearchCardsAuto経由（一方で遅延再検索はitem.searchMode='name'のsearchCards経由）
      searchStore.searchQuery = '新しいクエリ';
      apiMocks.searchCardsAuto.mockResolvedValueOnce({ cards: [newCard] });
      await reopenDialog();
      await new DOMWrapper(requireElement<HTMLButtonElement>('.header-actions .search-btn')).trigger('click');
      await settle();
      expect(searchStore.searchResults).toEqual([newCard]);

      // 遅延再検索のAPI呼び出し自体は走る（タイマー発火済み・応答pending）
      await waitForMs(150);
      expect(apiMocks.searchCards).toHaveBeenCalledTimes(1);

      // ここで初めて遅延応答を完了させる。世代が新検索より古いため結果は破棄され、
      // 新検索結果の表示が維持される（現行実装では[lateCard]へ上書きされる＝red確認点）
      resolveLateSearch([lateCard]);
      await settle();
      expect(searchStore.searchResults).toEqual([newCard]);
      expect(searchStore.allResults).toEqual([newCard]);
    });

    it('[covers:search-filter-dialog.history-search-advances-generation-and-clears-loading] 履歴実行はキャッシュ復元成否に依らず検索世代を進めisLoadingを解除する', async () => {
      const searchStore = useSearchStore();
      const searchHistory = useSearchHistory();
      setCacheRestoration({ 'cid-a': cardFixture('cid-a', '当日カード') });
      const cachedItem = historyItem({ resultCids: ['cid-a'] });        // 本日・復元1件
      const missingItem = historyItem({ resultCids: ['cid-missing'] }); // 本日・全cid復元不可
      searchHistory.historyItems.value = [cachedItem, missingItem];
      searchStore.searchGeneration = 3; // 旧検索が進行中の世代を想定
      searchStore.isLoading = true;     // 旧検索がローディング中を想定
      mountDialog();
      await switchToHistoryTab();

      // 復元1件の履歴（0番目）: 即時表示あり
      await new DOMWrapper(requireHistoryExecuteButton(0)).trigger('click');
      await settle();
      expect(searchStore.searchGeneration).toBe(4);
      expect(searchStore.isLoading).toBe(false);

      // 全cid復元不可の履歴（1番目）: 即時表示なしでも世代取得・isLoading解除は無条件に行う。
      // isLoadingは1回目でfalseになっているためtrueへ戻す（「復元成功時のみ解除する」誤実装の偽green防止）
      await reopenDialog();
      searchStore.isLoading = true;
      await new DOMWrapper(requireHistoryExecuteButton(1)).trigger('click');
      await settle();
      expect(searchStore.searchGeneration).toBe(5);
      expect(searchStore.isLoading).toBe(false);
      // 本日の履歴のため再検索は発生しない
      expect(apiMocks.searchCards).not.toHaveBeenCalled();
      expect(apiMocks.searchCardsAuto).not.toHaveBeenCalled();
    });

    it('[covers:search-filter-dialog.history-search-rerun-discard-after-empty-clear] 空クリア後に遅延再検索の結果が到達しても表示は復活せず履歴も更新しない', async () => {
      const searchStore = useSearchStore();
      const searchHistory = useSearchHistory();
      const yesterday = Date.now() - 24 * 3600 * 1000;
      const cachedCard = cardFixture('cid-a', 'キャッシュカード');
      setCacheRestoration({ 'cid-a': cachedCard });
      const item = historyItem({ query: '古いクエリ', resultCids: ['cid-a'], timestamp: yesterday });
      searchHistory.historyItems.value = [item];
      const lateCard = cardFixture('late-1', '遅延再検索結果');
      let resolveLateSearch!: (cards: CardInfo[]) => void;
      apiMocks.searchCards.mockImplementationOnce(
        () => new Promise<CardInfo[]>(resolve => { resolveLateSearch = resolve; })
      );
      mountDialog();
      await switchToHistoryTab();

      // 履歴を実行（キャッシュ1件を即時表示し、100ms遅延再検索タイマーが仕掛かる）
      await new DOMWrapper(requireHistoryExecuteButton()).trigger('click');
      await settle();
      expect(searchStore.searchResults).toEqual([cachedCard]);

      // 空クエリ+フィルター無しで検索を実行（空クリア。handleSearchの空分岐が世代を進め、
      // 表示を空にする。履歴追加も履歴配列の変化も起こらないため、遅延再検索の
      // updateResults(0,...)はガードが無ければ当該itemを更新する）
      searchStore.searchQuery = '';
      await reopenDialog();
      await new DOMWrapper(requireElement<HTMLButtonElement>('.header-actions .search-btn')).trigger('click');
      await settle();
      expect(searchStore.searchResults).toEqual([]);

      // 遅延再検索の応答を完了させても、空表示の復活も履歴itemのresultCids書き換えも起きない。
      // （表示だけガードする誤実装ではresultCidsが['late-1']へ、updateResultsだけガードする
      // 誤実装では表示が[lateCard]へ変化し、それぞれfailする）
      await waitForMs(150);
      expect(apiMocks.searchCards).toHaveBeenCalledTimes(1);
      resolveLateSearch([lateCard]);
      await settle();
      expect(searchStore.searchResults).toEqual([]);
      expect(searchStore.allResults).toEqual([]);
      expect(item.resultCids).toEqual(['cid-a']);
    });

    it('[covers:search-filter-dialog.history-search-latest-run-wins-consecutive-runs] 履歴連続実行時は後発の再検索結果が維持され先発の遅延完了は破棄される', async () => {
      const searchStore = useSearchStore();
      const searchHistory = useSearchHistory();
      const yesterday = Date.now() - 24 * 3600 * 1000;
      const xCached = cardFixture('cid-x', 'X キャッシュ');
      const yCached = cardFixture('cid-y', 'Y キャッシュ');
      setCacheRestoration({ 'cid-x': xCached, 'cid-y': yCached });
      const itemX = historyItem({ query: '先発', resultCids: ['cid-x'], timestamp: yesterday });
      const itemY = historyItem({ query: '後発', resultCids: ['cid-y'], timestamp: yesterday });
      searchHistory.historyItems.value = [itemX, itemY];
      const xFresh = cardFixture('x-new', 'X 再検索');
      const yFresh = cardFixture('y-new', 'Y 再検索');
      // 両履歴の再検索応答を手動resolve可能にする（mock消費順=タイマー発火順=先発→後発）
      let resolveFirstRun!: (cards: CardInfo[]) => void;
      let resolveSecondRun!: (cards: CardInfo[]) => void;
      apiMocks.searchCards
        .mockImplementationOnce(() => new Promise<CardInfo[]>(resolve => { resolveFirstRun = resolve; }))
        .mockImplementationOnce(() => new Promise<CardInfo[]>(resolve => { resolveSecondRun = resolve; }));
      mountDialog();
      await switchToHistoryTab();

      // X → Y の順に連続実行（Yの実行で世代が進む。表示はYのキャッシュになる）
      await new DOMWrapper(requireHistoryExecuteButton(0)).trigger('click');
      await settle();
      await reopenDialog();
      await new DOMWrapper(requireHistoryExecuteButton(1)).trigger('click');
      await settle();
      expect(searchStore.searchResults).toEqual([yCached]);

      // 両タイマー発火を待ち、応答をY→Xの順（逆順）で完了させる
      await waitForMs(150);
      expect(apiMocks.searchCards).toHaveBeenCalledTimes(2);
      resolveSecondRun([yFresh]);
      await settle();
      // 後発（Y・世代最新）の再検索結果は反映される（ガードが過剰に全破棄しないことの確認）
      expect(searchStore.searchResults).toEqual([yFresh]);
      resolveFirstRun([xFresh]);
      await settle();
      // 先発（X・世代が古い）の遅延完了は破棄され、Yの結果とX/Yそれぞれの履歴状態が維持される
      expect(searchStore.searchResults).toEqual([yFresh]);
      expect(searchStore.allResults).toEqual([yFresh]);
      expect(itemX.resultCids).toEqual(['cid-x']);
      expect(itemY.resultCids).toEqual(['y-new']);
    });
  });

  describe('履歴ハンドラ（HistoryTab emitの受領）', () => {
    it('[covers:search-filter-dialog.history-execute-unknown-item-is-noop] 履歴に存在しないitemのexecuteは検索実行を起こさない', async () => {
      const searchStore = useSearchStore();
      const deckStore = useDeckEditStore();
      const searchHistory = useSearchHistory();
      const itemA = historyItem({ query: 'A' });
      const itemB = historyItem({ query: 'B' });
      searchHistory.historyItems.value = [itemA, itemB];
      const wrapper = mountDialog();
      await switchToHistoryTab();

      // historyItemsに含まれないitemC（削除済み等）でのexecute相当のemit
      wrapper.findComponent(HistoryTab).vm.$emit('execute', historyItem({ query: 'C' }));
      await settle();

      expect(searchStore.searchQuery).toBe('');
      expect(searchStore.searchFilters).toEqual(baseFilters());
      expect(deckStore.isFilterDialogVisible).toBe(true);
      expect(apiMocks.searchCards).not.toHaveBeenCalled();
      expect(apiMocks.searchCardsAuto).not.toHaveBeenCalled();
    });

    it('[covers:search-filter-dialog.history-execute-failure-logs-error] 履歴実行の失敗はconsole.errorを出し未処理rejectにしない', async () => {
      const searchHistory = useSearchHistory();
      const item = historyItem({ resultCids: ['cid-a'] });
      searchHistory.historyItems.value = [item];
      // 動的import直後のgetUnifiedCacheDBを失敗させexecuteHistorySearchをrejectさせる
      cacheMocks.getUnifiedCacheDB.mockImplementationOnce(() => {
        throw new Error('cache-db初期化失敗');
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mountDialog();
      await switchToHistoryTab();

      await new DOMWrapper(requireHistoryExecuteButton()).trigger('click');
      await settle();

      expect(errorSpy).toHaveBeenCalledWith('[YGO Helper] 検索履歴からの検索実行に失敗しました:', expect.any(Error));
    });

    it('[covers:search-filter-dialog.history-favorite-remove-delegate-by-item] toggle-favorite/removeはitemをindexへ解決して委譲し存在しないitemは無視する', async () => {
      const searchHistory = useSearchHistory();
      const itemA = historyItem({ query: 'A' });
      const itemB = historyItem({ query: 'B' });
      searchHistory.historyItems.value = [itemA, itemB];
      const wrapper = mountDialog();
      await switchToHistoryTab();

      const items = document.body.querySelectorAll('.history-item');
      expect(items).toHaveLength(2);

      // itemB（historyItems上はindex=1）のお気に入り切り替え
      const favoriteButtonB = requireHistoryItemElement('B').querySelector<HTMLButtonElement>('.favorite-btn');
      expect(favoriteButtonB).not.toBeNull();
      if (favoriteButtonB === null) {
        throw new Error('[SearchFilterDialog.test] favorite button not found');
      }
      await new DOMWrapper(favoriteButtonB).trigger('click');
      expect(itemB.isFavorite).toBe(true);
      expect(itemA.isFavorite).toBe(false);

      // お気に入り化でFavorites/Recentセクションへ並べ替わるためクエリで特定し直す
      await nextTick();
      const deleteButtonB = requireHistoryItemElement('B').querySelector<HTMLButtonElement>('.delete-btn');
      expect(deleteButtonB).not.toBeNull();
      if (deleteButtonB === null) {
        throw new Error('[SearchFilterDialog.test] delete button not found');
      }
      await new DOMWrapper(deleteButtonB).trigger('click');
      expect(searchHistory.historyItems.value).toEqual([itemA]);

      // historyItemsに存在しないitemCのtoggle-favorite / removeは無視される
      const itemC = historyItem({ query: 'C' });
      wrapper.findComponent(HistoryTab).vm.$emit('toggle-favorite', itemC);
      wrapper.findComponent(HistoryTab).vm.$emit('remove', itemC);
      await settle();
      expect(searchHistory.historyItems.value).toEqual([itemA]);
      expect(itemA.isFavorite).toBe(false);
    });
  });
});
