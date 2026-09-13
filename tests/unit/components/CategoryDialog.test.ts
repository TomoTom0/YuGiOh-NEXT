/**
 * CategoryDialog.vue のテスト
 *
 * tests/design/category-dialog/conditions.toml（TASK-488 × TASK-331 Tier C）の
 * 16条件をカバーする。16条件=1条件1it原則だが filter-seven-plus-uses-fallback-count は
 * TASK-478から移植した温存2itでカバーするため、合計17it構成。
 *
 * 検証方針（設計書 tmp/20260913_design_category-dialog_task488.md 2章）:
 * - BaseDialog実物（stubしない）: Teleport to="body" + v-if のため、観測はすべて
 *   document.body.querySelector(All) 経由で行う
 * - composable実物（useCategoryMatcher.countCardsForCategoryLabel はmockしない）
 * - DOMイベント経由の操作（vm内部関数呼び出し・vm内部状態の直接読み取りはしない）
 * - 取得要素は必ず存在assertしてから操作する（requireElement系ヘルパー。
 *   optional chaining / ifガードによる操作スキップはしない）
 * - wrapperのunmountはafterEachに一元化（mountDialogが管理帳簿へ登録し、assert失敗時も
 *   必ず全wrapperをunmountしてからbodyを初期化する。it末尾での直書きはしない）
 * - 状態切替は1mount内のsetPropsで行う（mountし直さない）
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mount, DOMWrapper } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import CategoryDialog from '@/components/CategoryDialog.vue';
import type { CategoryEntry } from '@/types/dialog';

// ============================================================
// 要素取得ヘルパー（設計書2.1: 存在assert必須・取得失敗時は即fail）
// ============================================================

/** セレクタでbody直下の要素を取得する。存在しない場合はその場でfailする */
function requireElement<T extends Element>(selector: string): T {
  const el = document.body.querySelector<T>(selector);
  expect(el).not.toBeNull();
  if (el === null) {
    throw new Error(`[CategoryDialog.test] element not found: ${selector}`);
  }
  return el;
}

/** セレクタ+テキスト完全一致で要素を取得する（.category-item / .tab-btn 等、
 *  textContentがラベルのみの要素用）。存在しない場合はその場でfailする */
function requireElementWithText<T extends Element>(selector: string, text: string): T {
  const found = Array.from(document.body.querySelectorAll<T>(selector))
    .find(el => (el.textContent ?? '').trim() === text);
  expect(found).toBeDefined();
  if (found === undefined) {
    throw new Error(`[CategoryDialog.test] element not found: ${selector} (text="${text}")`);
  }
  return found;
}

/** セレクタ+テキスト部分一致で要素を取得する（.category-chip のように削除マーク
 *  （×）をtextContentに含む要素用）。存在しない場合はその場でfailする */
function requireElementContainingText<T extends Element>(selector: string, text: string): T {
  const found = Array.from(document.body.querySelectorAll<T>(selector))
    .find(el => (el.textContent ?? '').includes(text));
  expect(found).toBeDefined();
  if (found === undefined) {
    throw new Error(`[CategoryDialog.test] element not found: ${selector} (contains "${text}")`);
  }
  return found;
}

/** 表示中のカテゴリ項目ラベル一覧（絞り込み結果の観測用。0件も観測結果として扱う） */
function categoryItemLabels(): string[] {
  return Array.from(document.body.querySelectorAll('.category-item'))
    .map(el => (el.textContent ?? '').trim());
}

/** 選択済みチップのテキスト一覧（ラベル+削除マークを含む。0件も観測結果として扱う） */
function chipTexts(): string[] {
  return Array.from(document.body.querySelectorAll('.category-chip'))
    .map(el => (el.textContent ?? '').trim());
}

// ============================================================
// fixture（設計書2.3）
// ============================================================

/** 実装のdeckCards propはany[]型のためname/text欠損カードが混入し得る。
 *  欠損カード検証のためname/textはoptionalとする */
interface DeckCardFixture {
  cardId: string;
  name?: string;
  text?: string;
}

/** deckCardRefs propの消費契約（CategoryDialogはcid/quantityのみ使用する） */
interface DeckCardRefFixture {
  cid: string;
  quantity: number;
}

/** 五十音group付きベースカテゴリ（タブ絞り込み検証に十分な構成） */
const baseCategories: CategoryEntry[] = [
  { value: 'cat-kaos', label: 'カオス', originalIndex: 0, group: ['ruby_カ'] }, // カ行・カ
  { value: 'cat-kaiser', label: 'カイザー', originalIndex: 1, group: ['ruby_キ'] }, // カ行・キ（ruby_カタブで表示される行内展開の確認用）
  { value: 'cat-dragon', label: 'ドラゴン', originalIndex: 2, group: ['ruby_タ'] }, // タ行（ruby_カタブで非表示）
  { value: 'cat-abc', label: 'ABC', originalIndex: 3, group: ['ruby_ア'] }, // 大文字ラベル（検索の大文字小文字無視用）
  { value: 'cat-zero', label: 'ゼット', originalIndex: 4, group: ['ruby_ワ'] } // 第二行タブ側
];

/** カオスのみのカテゴリ（欠損フィールド・委譲優先の検証用） */
const kaosOnlyCategories: CategoryEntry[] = [
  { value: 'cat-kaos', label: 'カオス', originalIndex: 0, group: ['ruby_カ'] }
];

/** ドラゴン/レアカードのカテゴリ（7+境界とフィルタトグルの検証用） */
const dragonRareCategories: CategoryEntry[] = [
  { value: 'cat-dragon', label: 'ドラゴン', originalIndex: 0, group: ['ruby_タ'] },
  { value: 'cat-rare', label: 'レアカード', originalIndex: 1, group: ['ruby_ラ'] }
];

// フォールバックカウント用deckCards:
// 'ドラゴン' = name含有6枚 + text含有1枚 = 7（境界の上側・text含有もカウントされる確認）
// 'レアカード' = name含有6枚 = 6（境界の下側）
const fallbackDeckCards: DeckCardFixture[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ cardId: `d${i}`, name: `ドラゴン${i}`, text: '' })),
  { cardId: 't1', name: 'その他', text: 'ドラゴンを破壊する効果' },
  ...Array.from({ length: 6 }, (_, i) => ({ cardId: `r${i}`, name: `レアカード${i}`, text: '' }))
];

// 委譲優先検証用: フォールバックなら3枚（name/text含有3エントリ）だが、
// refsのquantity合計（3+4=7）が効く構成
const delegationCards: DeckCardFixture[] = [
  { cardId: 'kc1', name: 'カオスソルジャー', text: '' }, // name含有
  { cardId: 'kc2', name: 'ふつうのカード', text: 'カオスを利用する効果' }, // text含有
  { cardId: 'kc3', name: 'カオスの騎士', text: '' } // name含有 → フォールバック計3枚
];
const delegationRefs: DeckCardRefFixture[] = [
  { cid: 'kc1', quantity: 3 },
  { cid: 'kc2', quantity: 4 } // 委譲カウント = 3+4 = 7
];

// 欠損フィールドカード（条件 missing-name-text-treated-as-no-match 検証用）
// (a) name含有6枚 + name欠損かつtext含有1枚 → カウント7（name欠損でもtext含有なら一致・例外なし）
const missingFieldCardsA: DeckCardFixture[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ cardId: `m${i}`, name: `カオス${i}`, text: '' })),
  { cardId: 'mt1', text: 'カオスを操る効果' } // name欠損
];
// (b) name含有6枚 + name・text両方欠損1枚 → カウント6（両方欠損は不一致扱い・カウント0寄与）
const missingFieldCardsB: DeckCardFixture[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ cardId: `m${i}`, name: `カオス${i}`, text: '' })),
  { cardId: 'mx1' } // name・text両方欠損
];

// ============================================================
// 共通setup（設計書2.2）
// ============================================================

interface MountOverrides {
  isVisible?: boolean;
  modelValue?: string[];
  categories?: CategoryEntry[];
  deckCards?: DeckCardFixture[];
  deckCardRefs?: DeckCardRefFixture[];
}

/** mountDialogで生成したwrapperの管理帳簿（afterEachで必ずunmountするためのもの。
 *  1it内で複数回mountDialogを呼んだ場合もすべて蓄積され、全てunmountされる） */
const mountedWrappers: Array<ReturnType<typeof mountDialog>> = [];

/** 既定props（isVisible: true / modelValue: [] / baseCategories / fallbackDeckCards）
 *  を上書き可能にしてmountする。生成したwrapperはmountedWrappersへ登録する */
function mountDialog(overrides: MountOverrides = {}) {
  const wrapper = mount(CategoryDialog, {
    props: {
      isVisible: true,
      modelValue: [],
      categories: baseCategories,
      deckCards: fallbackDeckCards,
      ...overrides
    }
  });
  mountedWrappers.push(wrapper);
  return wrapper;
}

/** emitted('update:modelValue')の末尾イベントのpayload（第1引数）を取得する。
 *  VTUのemitted()はイベントごとの「引数配列」を返すため、payloadはその第1要素 */
function lastEmittedModelValue(wrapper: ReturnType<typeof mountDialog>): string[] | undefined {
  const events = wrapper.emitted<string[][]>('update:modelValue');
  return events?.at(-1)?.[0];
}

afterEach(() => {
  // it内のassert失敗に関わらず必ず全wrapperをunmountする。
  // body.innerHTML=''だけではTeleport先DOMの除去のみでコンポーネントのwatcher等が残留し
  // 後続テストへ干渉する（TASK-497のflaky要因）ため、unmountを先に実行する。
  // body初期化は失敗時残留に対する最終的な保険。
  for (const wrapper of mountedWrappers) {
    wrapper.unmount();
  }
  mountedWrappers.length = 0;
  document.body.innerHTML = '';
});

// ============================================================
// テスト本体
// ============================================================

describe('components/CategoryDialog', () => {
  describe('選択とemit', () => {
    it('[covers:category-dialog.initial-selection-from-model-value] modelValueの初期選択がチップとselectedクラスに反映される', async () => {
      const wrapper = mountDialog({ modelValue: ['cat-kaos'] });
      await nextTick();

      // 初期選択は選択済みチップとして表示される
      expect(chipTexts()).toEqual([expect.stringContaining('カオス')]);

      // 選択カテゴリの項目にselectedクラス・未選択カテゴリには付かない
      const kaosItem = requireElementWithText<HTMLButtonElement>('.category-item', 'カオス');
      expect(kaosItem.classList.contains('selected')).toBe(true);
      const dragonItem = requireElementWithText<HTMLButtonElement>('.category-item', 'ドラゴン');
      expect(dragonItem.classList.contains('selected')).toBe(false);
    });

    it('[covers:category-dialog.toggle-category-add-and-remove] カテゴリ項目クリックで選択追加・再クリックで解除し即時emitする', async () => {
      const wrapper = mountDialog({ modelValue: [] });

      const kaosItem = requireElementWithText<HTMLButtonElement>('.category-item', 'カオス');

      // 1回目のクリック: 選択追加 + 全選択のコピーを即時emit
      await new DOMWrapper(kaosItem).trigger('click');
      expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
      expect(lastEmittedModelValue(wrapper)).toEqual(['cat-kaos']);
      expect(kaosItem.classList.contains('selected')).toBe(true);

      // 同一項目の再クリック: 解除 + 空配列をemit
      await new DOMWrapper(kaosItem).trigger('click');
      expect(wrapper.emitted('update:modelValue')).toHaveLength(2);
      expect(lastEmittedModelValue(wrapper)).toEqual([]);
      expect(kaosItem.classList.contains('selected')).toBe(false);
    });

    it('[covers:category-dialog.chip-click-removes-selection] 選択済みチップのクリックで当該カテゴリを解除する', async () => {
      const wrapper = mountDialog({ modelValue: ['cat-kaos', 'cat-dragon'] });
      await nextTick();
      expect(chipTexts()).toHaveLength(2);

      // 'カオス'のチップ自体をクリックして当該カテゴリのみ解除する
      const kaosChip = requireElementContainingText<HTMLSpanElement>('.category-chip', 'カオス');
      await new DOMWrapper(kaosChip).trigger('click');

      expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
      expect(lastEmittedModelValue(wrapper)).toEqual(['cat-dragon']);
      expect(chipTexts()).toEqual([expect.stringContaining('ドラゴン')]);
    });

    it('[covers:category-dialog.clear-all-button-visibility-and-emit] クリアボタンは選択あり時のみ表示され全選択解除をemitする', async () => {
      const wrapper = mountDialog({ modelValue: [] });

      // 選択なし: クリアボタンは描画されない
      expect(document.body.querySelectorAll('.btn-clear-action')).toHaveLength(0);

      // 選択ありへ切替（配列置換で同期）
      await wrapper.setProps({ modelValue: ['cat-kaos'] });
      const clearButton = requireElement<HTMLButtonElement>('.btn-clear-action');
      expect(chipTexts()).toHaveLength(1);

      // クリックで全選択解除 + 空配列emit + v-ifによるボタン消失
      await new DOMWrapper(clearButton).trigger('click');
      expect(lastEmittedModelValue(wrapper)).toEqual([]);
      expect(chipTexts()).toHaveLength(0);
      expect(document.body.querySelectorAll('.btn-clear-action')).toHaveLength(0);
    });

    it('[covers:category-dialog.close-button-emits-close] ×ボタンでcloseイベントをemitする', async () => {
      const wrapper = mountDialog({});

      await new DOMWrapper(requireElement<HTMLButtonElement>('.close-btn')).trigger('click');

      // closeのみ発火し、選択の変更はemitしない
      expect(wrapper.emitted('close')).toHaveLength(1);
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('[covers:category-dialog.model-value-change-syncs-selection] 親のmodelValue配列置換に選択状態が同期する', async () => {
      const wrapper = mountDialog({ modelValue: [] });
      expect(chipTexts()).toHaveLength(0);

      // 親からの配列置換（setProps）で選択状態が同期される
      await wrapper.setProps({ modelValue: ['cat-kaos'] });
      expect(chipTexts()).toEqual([expect.stringContaining('カオス')]);

      // 同期後の選択を基準にtoggle操作のemitが行われる
      const dragonItem = requireElementWithText<HTMLButtonElement>('.category-item', 'ドラゴン');
      await new DOMWrapper(dragonItem).trigger('click');
      expect(lastEmittedModelValue(wrapper)).toEqual(['cat-kaos', 'cat-dragon']);
    });

    it('[covers:category-dialog.model-value-deep-watch-syncs-element-change] reactive配列への要素追加（push）でも選択状態が同期する', async () => {
      // modelValueのwatchはdeep: true。素配列のpushではwatchが発火しないためreactiveを使用する
      const selected = reactive(['cat-kaos']);
      const wrapper = mountDialog({ modelValue: selected });
      await nextTick();
      expect(chipTexts()).toHaveLength(1);

      // 同一reactive配列への要素追加（配列置換ではない）でも同期される
      selected.push('cat-dragon');
      await nextTick();
      expect(chipTexts()).toHaveLength(2);

      // 同期後の選択を基準にtoggle操作のemitが行われる
      const kaosItem = requireElementWithText<HTMLButtonElement>('.category-item', 'カオス');
      await new DOMWrapper(kaosItem).trigger('click');
      expect(lastEmittedModelValue(wrapper)).toEqual(['cat-dragon']);
    });
  });

  describe('開き直しの状態リセット', () => {
    it('[covers:category-dialog.reopen-resets-filter-and-search] 再オープンで検索語と7+フィルタをリセットする', async () => {
      const wrapper = mountDialog();

      // 検索語で絞り込み
      await new DOMWrapper(requireElement<HTMLInputElement>('.search-input')).setValue('カオ');
      expect(categoryItemLabels()).toEqual(['カオス']);

      // 7+フィルタON（検索語'カオ'との併用で0件。この時点ではactiveクラス）
      const filterButton = requireElement<HTMLButtonElement>('.search-row .btn-icon');
      await new DOMWrapper(filterButton).trigger('click');
      expect(filterButton.classList.contains('active')).toBe(true);
      expect(categoryItemLabels()).toHaveLength(0);

      // ダイアログを閉じて再オープン（isVisible false → true）
      await wrapper.setProps({ isVisible: false });
      await wrapper.setProps({ isVisible: true });
      await nextTick();

      // 検索語・フィルタともリセットされ、隠れていたカテゴリも再表示される
      expect(requireElement<HTMLInputElement>('.search-input').value).toBe('');
      const reopenedFilterButton = requireElement<HTMLButtonElement>('.search-row .btn-icon');
      expect(reopenedFilterButton.classList.contains('active')).toBe(false);
      expect(categoryItemLabels()).toEqual(['カオス', 'カイザー', 'ドラゴン', 'ABC', 'ゼット']);
    });

    // TASK-498（再オープン時にselectedGroupを'all'へ戻すべきか現行維持かの仕様確認）の
    // 暫定条件。仕様確定時に本条件は見直される（条件書 reopen-keeps-selected-group 参照）
    it('[covers:category-dialog.reopen-keeps-selected-group] 現行挙動: 再オープンでも五十音タブ選択は維持される（TASK-498暫定）', async () => {
      const wrapper = mountDialog();

      // ruby_カタブ（カ行）へ切替
      const kaTab = requireElementWithText<HTMLButtonElement>('.tab-btn', 'カ');
      await new DOMWrapper(kaTab).trigger('click');
      expect(categoryItemLabels()).toEqual(['カオス', 'カイザー']);

      // ダイアログを閉じて再オープン
      await wrapper.setProps({ isVisible: false });
      await wrapper.setProps({ isVisible: true });
      await nextTick();

      // allタブへは戻らず、カ行の選択が維持される
      expect(categoryItemLabels()).toEqual(['カオス', 'カイザー']);
      expect(requireElementWithText<HTMLButtonElement>('.tab-btn', 'カ').classList.contains('active')).toBe(true);
      expect(requireElementWithText<HTMLButtonElement>('.tab-btn', 'all').classList.contains('active')).toBe(false);
    });
  });

  describe('カテゴリ絞り込み', () => {
    it('[covers:category-dialog.group-tab-filters-by-row-chars] 五十音タブは行内文字へ展開して絞り込む', async () => {
      const wrapper = mountDialog();

      // allタブ: 全カテゴリ表示
      const allTab = requireElementWithText<HTMLButtonElement>('.tab-btn', 'all');
      await new DOMWrapper(allTab).trigger('click');
      expect(categoryItemLabels()).toEqual(['カオス', 'カイザー', 'ドラゴン', 'ABC', 'ゼット']);
      expect(allTab.classList.contains('active')).toBe(true);

      // ruby_カタブ: 行内文字（カ/キ/ク/ケ/コ）へ展開し、groupがruby_カ(カオス)と
      // ruby_キ(カイザー)のカテゴリのみ表示。ruby_タ(ドラゴン)等は非表示
      const kaTab = requireElementWithText<HTMLButtonElement>('.tab-btn', 'カ');
      await new DOMWrapper(kaTab).trigger('click');
      expect(categoryItemLabels()).toEqual(['カオス', 'カイザー']);
      expect(kaTab.classList.contains('active')).toBe(true);
      expect(requireElementWithText<HTMLButtonElement>('.tab-btn', 'all').classList.contains('active')).toBe(false);
    });

    it('[covers:category-dialog.search-filters-label-case-insensitive] 検索はラベル部分一致・大文字小文字無視・空白のみは全件', async () => {
      const wrapper = mountDialog();
      const searchInput = new DOMWrapper(requireElement<HTMLInputElement>('.search-input'));

      // 大文字小文字無視の部分一致
      await searchInput.setValue('abc');
      expect(categoryItemLabels()).toEqual(['ABC']);

      await searchInput.setValue('カオ');
      expect(categoryItemLabels()).toEqual(['カオス']);

      // 空白のみの入力はフィルタしない（全件表示）
      await searchInput.setValue('  ');
      expect(categoryItemLabels()).toEqual(['カオス', 'カイザー', 'ドラゴン', 'ABC', 'ゼット']);
    });

    // src/components/__tests__/CategoryDialog.test.ts (TASK-478) から移植。
    // 旧テストはcountCardsWithCategoryと同じロジックのシミュレーション関数で検証していたが、
    // ここではmount実体でCategoryDialog.vueのフォールバック分岐
    // （deckCardRefs未指定時にdeckCardsからname/text含有件数をカウント）を検証する
    it('[covers:category-dialog.filter-seven-plus-uses-fallback-count] deckCardRefs未指定時はdeckCardsのフォールバックカウントで7枚以上のカテゴリのみ表示する', async () => {
      const categories: CategoryEntry[] = [
        { value: '1', label: 'ドラゴン', originalIndex: 0, group: ['ruby_タ'] },
        { value: '2', label: 'レアカード', originalIndex: 1, group: ['ruby_ラ'] }
      ];
      const deckCards = [
        ...Array.from({ length: 6 }, (_, i) => ({ cardId: `d${i}`, name: `ドラゴン${i}`, text: '' })),
        { cardId: 't1', name: 'その他', text: 'ドラゴンを破壊する効果' }, // text含有でもカウント
        { cardId: 'r1', name: 'レアカード', text: '' }
      ];

      const wrapper = mountDialog({ categories, deckCards });

      await nextTick();
      expect(document.body.querySelectorAll('.category-item').length).toBe(2);

      requireElement<HTMLButtonElement>('.search-row .btn-icon').click();
      await nextTick();

      const labels = Array.from(document.body.querySelectorAll('.category-item'))
        .map(el => el.textContent?.trim());
      expect(labels).toEqual(['ドラゴン']);
    });

    // src/components/__tests__/CategoryDialog.test.ts (TASK-478) から移植（上記itと対になる境界下側）
    it('[covers:category-dialog.filter-seven-plus-uses-fallback-count] フォールバックカウントが7枚未満のカテゴリはフィルター時に非表示になる', async () => {
      const categories: CategoryEntry[] = [
        { value: '1', label: 'レアカード', originalIndex: 0, group: ['ruby_ラ'] }
      ];
      const deckCards = Array.from({ length: 6 }, (_, i) => ({
        cardId: `r${i}`,
        name: `レアカード${i}`,
        text: ''
      }));

      const wrapper = mountDialog({ categories, deckCards });

      await nextTick();

      requireElement<HTMLButtonElement>('.search-row .btn-icon').click();
      await nextTick();

      expect(document.body.querySelectorAll('.category-item').length).toBe(0);
    });

    it('[covers:category-dialog.missing-name-text-treated-as-no-match] name/text欠損カードは例外なく不一致扱いとなりカウントに寄与しない', async () => {
      // (a) name含有6枚 + name欠損かつtext含有1枚 → カウント7（name欠損でもtext含有なら一致）
      const wrapper = mountDialog({ categories: kaosOnlyCategories, deckCards: missingFieldCardsA });

      await new DOMWrapper(requireElement<HTMLButtonElement>('.search-row .btn-icon')).trigger('click');
      expect(categoryItemLabels()).toEqual(['カオス']);

      // (b) name含有6枚 + name・text両方欠損1枚 → カウント6（両方欠損はカウント0寄与）
      await wrapper.setProps({ deckCards: missingFieldCardsB });
      await nextTick();
      expect(categoryItemLabels()).toHaveLength(0);
    });

    it('[covers:category-dialog.filter-count-prefers-deck-card-refs] deckCardRefs指定時はquantity合計の委譲カウントを優先する', async () => {
      const wrapper = mountDialog({ categories: kaosOnlyCategories, deckCards: delegationCards });

      // refsなし: フォールバックカウント3（<7）のため非表示
      await new DOMWrapper(requireElement<HTMLButtonElement>('.search-row .btn-icon')).trigger('click');
      expect(categoryItemLabels()).toHaveLength(0);

      // refsあり: 委譲カウント7（quantity 3+4 >= 7）のため表示。
      // quantity合計とcid→deckCardsのcardId解決が効くことの間接観測
      await wrapper.setProps({ deckCardRefs: delegationRefs });
      await nextTick();
      expect(categoryItemLabels()).toEqual(['カオス']);
    });

    it('[covers:category-dialog.filter-button-toggles-on-off] フィルタボタンはON/OFFをトグルし絞り込みと連動する', async () => {
      const wrapper = mountDialog({ categories: dragonRareCategories });

      expect(categoryItemLabels()).toEqual(['ドラゴン', 'レアカード']);

      // 1回目のクリック: ON（activeクラス + 7枚カテゴリのみ表示）
      const filterButton = requireElement<HTMLButtonElement>('.search-row .btn-icon');
      await new DOMWrapper(filterButton).trigger('click');
      expect(filterButton.classList.contains('active')).toBe(true);
      expect(categoryItemLabels()).toEqual(['ドラゴン']);

      // 2回目のクリック: OFF（active解除 + 全カテゴリ復帰）
      await new DOMWrapper(filterButton).trigger('click');
      expect(filterButton.classList.contains('active')).toBe(false);
      expect(categoryItemLabels()).toEqual(['ドラゴン', 'レアカード']);
    });
  });

  describe('ラベル解決', () => {
    it('[covers:category-dialog.chip-label-falls-back-to-id] categoriesに不存在なidはid値自身でチップ表示する', () => {
      // cat-unknownはcategoriesに存在しないvalue
      const wrapper = mountDialog({ modelValue: ['cat-kaos', 'cat-unknown'] });

      expect(chipTexts()).toEqual([
        expect.stringContaining('カオス'), // 解決済みラベル
        expect.stringContaining('cat-unknown') // idフォールバック
      ]);
    });
  });
});
