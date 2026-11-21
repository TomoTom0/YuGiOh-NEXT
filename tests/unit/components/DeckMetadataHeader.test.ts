/**
 * components/DeckMetadataHeader のユニットテスト
 *
 * tests/design/deck-metadata-header/conditions.toml（TASK-544 × TASK-331 Tier C第8号）の
 * 23条件をカバーする（1条件1it／同種入力の列挙はfixture表でit.each集約）。
 * 旧4it（auto-rename/auto-categoryのstore呼び出しとメニュー閉鎖のみ）は全面展開に伴い廃止。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - DeckMetadataHeaderを直接mount + pinia実物（第7号DeckMetadata.test.tsと同一手法）
 * - UI操作はDOMイベント経由で検証する（vm内部状態の直接参照はしない）
 * - store公開状態（deckInfo）とemitは観測対象。storeメソッドはspyで呼び出し契約を検証
 * - error-handlerはmodule mock（トースト本体はerror-handler条件書の対象）
 * - clipboard.writeTextはstub（外部I/O境界）
 * - 右寄せ位置調整はTASK-546で修正済み。adjustAlignRightはクリック直後にdropdown要素が
 *   生成されるため、DOM rectはElement.prototype単位でstub（要素事前取得ができない）
 * - wrapperのunmountはafterEachに一元化（assert失敗時も必ず全wrapperをunmount）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import DeckMetadataHeader from '@/components/DeckMetadataHeader.vue';
import { useDeckEditStore } from '@/stores/deck-edit';

// error-handler（トースト本体は別条件書の責務。呼び出し引数のみ観測）
const hMocks = vi.hoisted(() => ({
  handleSuccess: vi.fn(),
  handleError: vi.fn(),
}));
vi.mock('@/utils/error-handler', () => ({
  handleSuccess: hMocks.handleSuccess,
  handleError: hMocks.handleError,
}));

type HeaderProps = {
  isPublic: boolean;
  deckType: '-1' | '0' | '1' | '2' | '3';
  deckStyle: '-1' | '0' | '1' | '2';
};

const DEFAULT_PROPS: HeaderProps = { isPublic: false, deckType: '-1', deckStyle: '-1' };

const styleLabelCases: Array<[HeaderProps['deckStyle'], string]> = [
  ['-1', 'Style'],
  ['0', 'Chara'],
  ['1', 'Tourn'],
  ['2', 'Concep'],
];

const outsideCases: Array<[string, string]> = [
  ['deck-type-selector', '.deck-type-dropdown'],
  ['deck-style-selector', '.deck-style-dropdown'],
  ['metadata-menu-container', '.metadata-menu-dropdown'],
];

const typeSelectCases: Array<[number, HeaderProps['deckType']]> = [
  [0, '-1'],
  [1, '0'],
  [2, '1'],
  [3, '2'],
  [4, '3'],
];

const styleSelectCases: Array<[number, '0' | '1' | '2']> = [
  [0, '0'],
  [1, '1'],
  [2, '2'],
];

const typeDisplayCases: Array<[HeaderProps['deckType'], boolean]> = [
  ['-1', false],
  ['0', true],
  ['1', true],
  ['2', true],
  ['3', true],
];

const styleBoldCases: Array<[HeaderProps['deckStyle'], boolean]> = [
  ['-1', false],
  ['0', true],
  ['1', true],
  ['2', true],
];

// align-right検証: [ラベル, 開くボタン, dropdown]（type/style/menuの3呼び出し口）
const alignRightCases: Array<[string, string, string]> = [
  ['deck-type', '.deck-type-button', '.deck-type-dropdown'],
  ['deck-style', '.deck-style-button', '.deck-style-dropdown'],
  ['metadata-menu', '.metadata-menu-button', '.metadata-menu-dropdown'],
];

describe('components/DeckMetadataHeader', () => {
  let pinia: ReturnType<typeof createPinia>;
  let store: ReturnType<typeof useDeckEditStore>;
  let writeText: ReturnType<typeof vi.fn>;
  const wrappers: VueWrapper[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
    store = useDeckEditStore();
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    while (wrappers.length) wrappers.pop()?.unmount();
    vi.restoreAllMocks();
  });

  function mountHeader(props: Partial<HeaderProps> = {}): VueWrapper {
    const wrapper = mount(DeckMetadataHeader, {
      props: { ...DEFAULT_PROPS, ...props },
      global: { plugins: [pinia] },
      // documentリスナ（handleClickOutside）へイベントを届けるためbodyへ接続
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
  }

  function inputValue(wrapper: VueWrapper, selector: string): string {
    const el = wrapper.find(selector).element;
    if (!(el instanceof HTMLInputElement)) throw new Error(`not an input: ${selector}`);
    return el.value;
  }

  async function openContainer(wrapper: VueWrapper, containerClass: string): Promise<void> {
    const buttonSelector = containerClass === 'deck-type-selector'
      ? '.deck-type-button'
      : containerClass === 'deck-style-selector'
        ? '.deck-style-button'
        : '.metadata-menu-button';
    await wrapper.find(buttonSelector).trigger('click');
  }

  function autoButton(wrapper: VueWrapper, label: string) {
    const btn = wrapper.findAll('.auto-action-btn').find((b) => b.text() === label);
    if (!btn) throw new Error(`auto action button not found: ${label}`);
    return btn;
  }

  /**
   * align-right判定に使う要素矩形をstubする。adjustAlignRightはクリックハンドラ内で
   * nextTick後にdropdown要素を解決するため、テスト側で要素を事前に取得できず
   * Element.prototype単位のmockにする（useDragQuarter.test.tsのmockRectと同様に
   * 本物のDOMRectを返しasキャスト不使用）。
   * geometry: selector左端=200px・dropdown幅=240px（min-width相当）→ 合計440px
   */
  function stubDropdownGeometry(): void {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element): DOMRect {
        const isDropdown = this.classList.contains('deck-type-dropdown')
          || this.classList.contains('deck-style-dropdown')
          || this.classList.contains('metadata-menu-dropdown');
        if (isDropdown) return new DOMRect(0, 0, 240, 100);
        const isSelector = this.classList.contains('deck-type-selector')
          || this.classList.contains('deck-style-selector')
          || this.classList.contains('metadata-menu-container');
        if (isSelector) return new DOMRect(200, 0, 60, 24);
        return new DOMRect(0, 0, 0, 0);
      },
    );
  }

  /** window.innerWidthを上書きする（happy-dom既定は1024。afterEachで既定値へ戻す） */
  function stubViewportWidth(width: number): void {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  }

  // --- computed / lifecycle / 外クリック ---

  describe('computed / lifecycle / 外クリック', () => {
    it.each(styleLabelCases)(
      '[covers:deck-metadata-header.deck-style-label-known-values] deckStyle=%s は %s と表示される',
      (value, expected) => {
        const wrapper = mountHeader({ deckStyle: value });
        expect(wrapper.find('.deck-style-button span').text()).toBe(expected);
      },
    );

    it('[covers:deck-metadata-header.document-click-listener-lifecycle] mountでclickリスナ登録・unmountで同一ハンドラ解除', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      const wrapper = mountHeader();
      const addCall = addSpy.mock.calls.find(([type]) => type === 'click');
      if (!addCall) throw new Error('document click listener not registered');
      const handler = addCall[1];

      wrapper.unmount();
      const index = wrappers.indexOf(wrapper);
      if (index >= 0) wrappers.splice(index, 1);

      expect(removeSpy.mock.calls.some(([type, fn]) => type === 'click' && fn === handler)).toBe(true);
    });

    it.each(outsideCases)(
      '[covers:deck-metadata-header.outside-click-dismisses-matching-dropdown] %s 外クリックで該当UIのみ閉じる',
      async (containerClass, dropdownSelector) => {
        const wrapper = mountHeader();

        // 外クリック（document.body）で閉じる
        await openContainer(wrapper, containerClass);
        expect(wrapper.find(dropdownSelector).exists()).toBe(true);
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await nextTick();
        expect(wrapper.find(dropdownSelector).exists()).toBe(false);

        // 自コンテナ内クリックでは閉じない
        await openContainer(wrapper, containerClass);
        wrapper.find(`.${containerClass}`).element.dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        );
        await nextTick();
        expect(wrapper.find(dropdownSelector).exists()).toBe(true);

        // 他コンテナ内クリックは「外」として扱われ閉じる（3判定が独立）
        const otherClass = containerClass === 'deck-type-selector'
          ? 'deck-style-selector'
          : 'deck-type-selector';
        wrapper.find(`.${otherClass}`).element.dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        );
        await nextTick();
        expect(wrapper.find(dropdownSelector).exists()).toBe(false);
      },
    );
  });

  // --- dropdown 開閉 / select emit ---

  describe('dropdown 開閉 / select emit', () => {
    it('[covers:deck-metadata-header.deck-type-dropdown-toggles] typeボタンでdropdownがトグルする', async () => {
      const wrapper = mountHeader();
      expect(wrapper.find('.deck-type-dropdown').exists()).toBe(false);
      await wrapper.find('.deck-type-button').trigger('click');
      expect(wrapper.find('.deck-type-dropdown').exists()).toBe(true);
      await wrapper.find('.deck-type-button').trigger('click');
      expect(wrapper.find('.deck-type-dropdown').exists()).toBe(false);
    });

    it('[covers:deck-metadata-header.deck-style-dropdown-toggles] styleボタンでdropdownがトグルする（typeと独立）', async () => {
      const wrapper = mountHeader();
      expect(wrapper.find('.deck-style-dropdown').exists()).toBe(false);
      await wrapper.find('.deck-style-button').trigger('click');
      expect(wrapper.find('.deck-style-dropdown').exists()).toBe(true);
      expect(wrapper.find('.deck-type-dropdown').exists()).toBe(false);
      await wrapper.find('.deck-style-button').trigger('click');
      expect(wrapper.find('.deck-style-dropdown').exists()).toBe(false);
    });

    it.each(typeSelectCases)(
      '[covers:deck-metadata-header.select-deck-type-emits-and-closes] タイプoption(index=%i)選択で %s をemitし閉じる',
      async (index, expected) => {
        const wrapper = mountHeader();
        await wrapper.find('.deck-type-button').trigger('click');
        const options = wrapper.findAll('.deck-type-option');
        await options[index].trigger('click');
        expect(wrapper.emitted('select-deck-type')).toEqual([[expected]]);
        expect(wrapper.find('.deck-type-dropdown').exists()).toBe(false);
      },
    );

    it.each(styleSelectCases)(
      '[covers:deck-metadata-header.select-deck-style-emits-and-closes] スタイルoption(index=%i)選択で %s をemitし閉じる',
      async (index, expected) => {
        const wrapper = mountHeader();
        await wrapper.find('.deck-style-button').trigger('click');
        const options = wrapper.findAll('.deck-style-option');
        await options[index].trigger('click');
        expect(wrapper.emitted('select-deck-style')).toEqual([[expected]]);
        expect(wrapper.find('.deck-style-dropdown').exists()).toBe(false);
      },
    );
  });

  // --- align-right位置調整（TASK-546修正） ---

  describe('align-right位置調整', () => {
    afterEach(() => {
      stubViewportWidth(1024);
    });

    it.each(alignRightCases)(
      '[covers:deck-metadata-header.dropdown-align-right-on-overflow] オーバーフロー時は %s を開くとalign-rightが付く',
      async (_label, buttonSelector, dropdownSelector) => {
        stubDropdownGeometry();
        stubViewportWidth(300); // 200 + 240 = 440 > 300 で右端はみ出し
        const wrapper = mountHeader();

        await wrapper.find(buttonSelector).trigger('click');
        await nextTick();

        expect(wrapper.find(dropdownSelector).exists()).toBe(true);
        expect(wrapper.find(dropdownSelector).classes()).toContain('align-right');
      },
    );

    it.each(alignRightCases)(
      '[covers:deck-metadata-header.dropdown-align-right-on-overflow] 非オーバーフロー時は %s を開いてもalign-rightが付かない',
      async (_label, buttonSelector, dropdownSelector) => {
        stubDropdownGeometry();
        stubViewportWidth(1024); // 200 + 240 = 440 <= 1024 で収まる
        const wrapper = mountHeader();

        await wrapper.find(buttonSelector).trigger('click');
        await nextTick();

        expect(wrapper.find(dropdownSelector).exists()).toBe(true);
        expect(wrapper.find(dropdownSelector).classes()).not.toContain('align-right');
      },
    );
  });

  // --- メニュー / デッキコード ---

  describe('メニュー / デッキコード', () => {
    it('[covers:deck-metadata-header.menu-open-reads-store-with-defaults] 開いたときstore値を読み未設定はデフォルトへ', async () => {
      store.deckInfo.favoriteCount = 7;
      store.deckInfo.issuedDeckCode = 'ABC123';
      const wrapper = mountHeader();

      await wrapper.find('.metadata-menu-button').trigger('click');
      expect(wrapper.find('.menu-value-badge').text()).toBe('7');
      expect(inputValue(wrapper, '.deck-code-display')).toBe('ABC123');

      store.deckInfo.favoriteCount = undefined;
      store.deckInfo.issuedDeckCode = undefined;
      await wrapper.find('.metadata-menu-button').trigger('click');
      await wrapper.find('.metadata-menu-button').trigger('click');
      expect(wrapper.find('.menu-value-badge').text()).toBe('0');
      expect(wrapper.find('.deck-code-display').exists()).toBe(false);
      expect(wrapper.find('.deck-code-btn').exists()).toBe(true);
    });

    it('[covers:deck-metadata-header.issue-deck-code-success] 発行成功でコード表示・store保存・成功通知', async () => {
      store.deckInfo.dno = 42;
      const issueSpy = vi.spyOn(store, 'issueDeckCode').mockResolvedValue('NEWCODE');
      const wrapper = mountHeader();
      await wrapper.find('.metadata-menu-button').trigger('click');

      await wrapper.find('.deck-code-btn').trigger('click');
      await flushPromises();

      expect(issueSpy).toHaveBeenCalledWith(42);
      expect(inputValue(wrapper, '.deck-code-display')).toBe('NEWCODE');
      expect(store.deckInfo.issuedDeckCode).toBe('NEWCODE');
      expect(hMocks.handleSuccess).toHaveBeenCalledWith(
        '[DeckMetadataHeader]',
        'デッキコードを発行しました',
      );
    });

    it('[covers:deck-metadata-header.issue-deck-code-empty-response] 空レスポンスはエラー通知しコードを保存しない', async () => {
      vi.spyOn(store, 'issueDeckCode').mockResolvedValue('');
      const wrapper = mountHeader();
      await wrapper.find('.metadata-menu-button').trigger('click');

      await wrapper.find('.deck-code-btn').trigger('click');
      await flushPromises();

      expect(hMocks.handleError).toHaveBeenCalledWith(
        '[DeckMetadataHeader]',
        'デッキコードの発行に失敗しました',
        expect.objectContaining({ message: 'Empty response' }),
        { showToast: true },
      );
      expect(store.deckInfo.issuedDeckCode).toBeUndefined();
      expect(wrapper.find('.deck-code-display').exists()).toBe(false);
      expect(wrapper.find('.deck-code-btn').exists()).toBe(true);
    });

    it('[covers:deck-metadata-header.issue-deck-code-rejection] 発行処理のthrowでクラッシュせずエラー通知', async () => {
      vi.spyOn(store, 'issueDeckCode').mockRejectedValue(new Error('boom'));
      const wrapper = mountHeader();
      await wrapper.find('.metadata-menu-button').trigger('click');

      await wrapper.find('.deck-code-btn').trigger('click');
      await flushPromises();

      expect(hMocks.handleError).toHaveBeenCalledWith(
        '[DeckMetadataHeader]',
        'デッキコードの発行に失敗しました',
        expect.objectContaining({ message: 'boom' }),
        { showToast: true },
      );
      expect(wrapper.find('.deck-code-btn').exists()).toBe(true);
    });

    it('[covers:deck-metadata-header.issue-deck-code-loading-state] 発行中はdisabled+発行中表示で完了後に戻る', async () => {
      let resolveCode: ((value: string) => void) | undefined;
      const pending = new Promise<string>((resolve) => {
        resolveCode = resolve;
      });
      vi.spyOn(store, 'issueDeckCode').mockReturnValue(pending);
      const wrapper = mountHeader();
      await wrapper.find('.metadata-menu-button').trigger('click');

      await wrapper.find('.deck-code-btn').trigger('click');
      await nextTick();
      const btn = wrapper.find('.deck-code-btn');
      expect(btn.attributes('disabled')).toBeDefined();
      expect(btn.text()).toBe('発行中');

      if (!resolveCode) throw new Error('resolveCode not initialized');
      resolveCode('CODE');
      await flushPromises();
      expect(wrapper.find('.deck-code-display').exists()).toBe(true);
      expect(wrapper.find('.deck-code-btn').exists()).toBe(false);
    });

    it('[covers:deck-metadata-header.copy-deck-code-success] コード表示クリックでclipboard書込と成功通知', async () => {
      store.deckInfo.issuedDeckCode = 'ABC123';
      const wrapper = mountHeader();
      await wrapper.find('.metadata-menu-button').trigger('click');

      await wrapper.find('.deck-code-display').trigger('click');

      expect(writeText).toHaveBeenCalledWith('ABC123');
      expect(hMocks.handleSuccess).toHaveBeenCalledWith(
        '[DeckMetadataHeader]',
        'デッキコードをコピーしました',
      );
    });

    it('[covers:deck-metadata-header.copy-deck-code-failure] clipboard書込失敗でクラッシュせずエラー通知', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      store.deckInfo.issuedDeckCode = 'ABC123';
      const wrapper = mountHeader();
      await wrapper.find('.metadata-menu-button').trigger('click');

      await wrapper.find('.deck-code-display').trigger('click');
      await flushPromises();

      expect(hMocks.handleError).toHaveBeenCalledWith(
        '[DeckMetadataHeader]',
        'コピーに失敗しました',
        expect.objectContaining({ message: 'denied' }),
        { showToast: true },
      );
    });

    it('[covers:deck-metadata-header.dno-change-clears-deck-code] dno変更で表示中コードをクリアする', async () => {
      store.deckInfo.issuedDeckCode = 'ABC123';
      const wrapper = mountHeader();
      await wrapper.find('.metadata-menu-button').trigger('click');
      expect(wrapper.find('.deck-code-display').exists()).toBe(true);

      store.deckInfo.dno = 99;
      await nextTick();

      expect(wrapper.find('.deck-code-display').exists()).toBe(false);
      expect(wrapper.find('.deck-code-btn').exists()).toBe(true);
    });
  });

  // --- auto-rename / auto-category ---

  describe('auto-rename / auto-category', () => {
    it('[covers:deck-metadata-header.auto-rename-success] 自動命名成功でデッキ名入り成功通知・メニュー閉鎖', async () => {
      const spy = vi.spyOn(store, 'autoRenameDeck').mockReturnValue({
        categories: ['cat1'],
        renamed: true,
      });
      store.deckInfo.name = '自動名';
      const wrapper = mountHeader();
      await wrapper.find('.metadata-menu-button').trigger('click');
      expect(wrapper.find('.metadata-menu-dropdown').exists()).toBe(true);

      await autoButton(wrapper, 'auto-rename').trigger('click');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(hMocks.handleSuccess).toHaveBeenCalledWith(
        '[DeckMetadataHeader]',
        expect.stringContaining('自動名'),
      );
      expect(wrapper.find('.metadata-menu-dropdown').exists()).toBe(false);
    });

    it('[covers:deck-metadata-header.auto-rename-no-match] 該当カテゴリなしでエラー通知・メニュー閉鎖', async () => {
      vi.spyOn(store, 'autoRenameDeck').mockReturnValue({ categories: [], renamed: false });
      const wrapper = mountHeader();
      await wrapper.find('.metadata-menu-button').trigger('click');

      await autoButton(wrapper, 'auto-rename').trigger('click');

      expect(hMocks.handleError).toHaveBeenCalledWith(
        '[DeckMetadataHeader]',
        '対応するカテゴリが見つからないため、デッキ名は変更されませんでした',
        expect.any(Error),
        { showToast: true },
      );
      expect(wrapper.find('.metadata-menu-dropdown').exists()).toBe(false);
    });

    it('[covers:deck-metadata-header.auto-category-found] カテゴリ自動設定で件数入り成功通知・メニュー閉鎖', async () => {
      const spy = vi.spyOn(store, 'autoSetCategory').mockReturnValue(['cat1', 'cat2']);
      const wrapper = mountHeader();
      await wrapper.find('.metadata-menu-button').trigger('click');

      await autoButton(wrapper, 'auto-category').trigger('click');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(hMocks.handleSuccess).toHaveBeenCalledWith(
        '[DeckMetadataHeader]',
        'カテゴリを自動設定しました（2件）',
      );
      expect(wrapper.find('.metadata-menu-dropdown').exists()).toBe(false);
    });

    it('[covers:deck-metadata-header.auto-category-none] 該当カテゴリ0件でも成功通知（エラーではない）・メニュー閉鎖', async () => {
      vi.spyOn(store, 'autoSetCategory').mockReturnValue([]);
      const wrapper = mountHeader();
      await wrapper.find('.metadata-menu-button').trigger('click');

      await autoButton(wrapper, 'auto-category').trigger('click');

      expect(hMocks.handleSuccess).toHaveBeenCalledWith(
        '[DeckMetadataHeader]',
        '該当するカテゴリが見つかりませんでした',
      );
      expect(hMocks.handleError).not.toHaveBeenCalled();
      expect(wrapper.find('.metadata-menu-dropdown').exists()).toBe(false);
    });
  });

  // --- template 表示契約 ---

  describe('template 表示契約', () => {
    it('[covers:deck-metadata-header.public-button-state-and-emit] 公開状態で表示を切り替えクリックでemit', async () => {
      const wrapper = mountHeader();
      expect(wrapper.find('.public-button').text()).toBe('非公開');
      expect(wrapper.find('.public-button').classes()).not.toContain('is-public');

      await wrapper.find('.public-button').trigger('click');
      expect(wrapper.emitted('toggle-public')).toHaveLength(1);

      const published = mountHeader({ isPublic: true });
      expect(published.find('.public-button').text()).toBe('公開');
      expect(published.find('.public-button').classes()).toContain('is-public');
    });

    it.each(typeDisplayCases)(
      '[covers:deck-metadata-header.deck-type-placeholder-for-unset] deckType=%s のplaceholder/アイコン表示',
      (value, hasIcon) => {
        const wrapper = mountHeader({ deckType: value });
        expect(wrapper.find('.deck-type-placeholder').exists()).toBe(!hasIcon);
        expect(wrapper.findAll('.deck-type-icon').length).toBe(hasIcon ? 1 : 0);
      },
    );

    it.each(styleBoldCases)(
      '[covers:deck-metadata-header.deck-style-bold-when-set] deckStyle=%s の太字切り替え',
      (value, bold) => {
        const wrapper = mountHeader({ deckStyle: value });
        expect(wrapper.find('.deck-style-button span').classes().includes('text-bold')).toBe(bold);
      },
    );
  });
});
