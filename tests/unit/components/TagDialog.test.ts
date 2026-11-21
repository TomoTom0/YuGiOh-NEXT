/**
 * components/TagDialog のユニットテスト
 *
 * tests/design/tag-dialog/conditions.toml（TASK-551 × TASK-331 Tier C第9号）の
 * 27条件をカバーする（1条件1it）。既存の専用テストは無く、本ファイルが新規作成。
 *
 * 検証方針（Tier C共通・CategoryDialog.test.tsと同一手法）:
 * - BaseDialog実物（stubしない）: Teleport to="body" + v-if のため、観測はすべて
 *   document.body.querySelector(All) 経由で行う
 * - tag-master-data / image-utils は実物（呼び出し結果のUI反映のみ観測し、
 *   関数本体は各モジュールの対象）
 * - UI操作はDOMイベント経由（vm内部状態の直接参照はしない）。emitは観測対象
 * - wrapperのunmountはafterEachに一元化（assert失敗時も必ず全wrapperをunmount）
 * - 状態切替は1mount内のsetPropsで行う（mountし直さない）
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mount, DOMWrapper } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import TagDialog from '@/components/TagDialog.vue';

// ============================================================
// 要素取得ヘルパー（存在assert必須・取得失敗時は即fail）
// ============================================================

function requireElement<T extends Element>(selector: string): T {
  const el = document.body.querySelector<T>(selector);
  expect(el).not.toBeNull();
  if (el === null) throw new Error(`[TagDialog.test] element not found: ${selector}`);
  return el;
}

function requireItemByLabel(label: string): Element {
  const found = Array.from(document.body.querySelectorAll('.tag-item'))
    .find(el => el.querySelector('.tag-label')?.textContent?.trim() === label);
  expect(found).toBeDefined();
  if (!found) throw new Error(`[TagDialog.test] tag-item not found: ${label}`);
  return found;
}

function requireChipByValue(value: string): Element {
  const found = Array.from(document.body.querySelectorAll('.tag-chip'))
    .find(el => el.getAttribute('data-value') === value);
  expect(found).toBeDefined();
  if (!found) throw new Error(`[TagDialog.test] tag-chip not found: ${value}`);
  return found;
}

function requireTabByText(text: string): Element {
  const found = Array.from(document.body.querySelectorAll('.tab-btn'))
    .find(el => (el.textContent ?? '').trim() === text);
  expect(found).toBeDefined();
  if (!found) throw new Error(`[TagDialog.test] tab not found: ${text}`);
  return found;
}

async function clickEl(el: Element): Promise<void> {
  await new DOMWrapper(el).trigger('click');
}

async function clickItem(label: string): Promise<void> {
  await clickEl(requireItemByLabel(label));
}

async function clickFilterButton(): Promise<void> {
  await clickEl(requireElement('.search-row .btn-icon'));
}

function tagItemLabels(): string[] {
  return Array.from(document.body.querySelectorAll('.tag-item .tag-label'))
    .map(el => (el.textContent ?? '').trim());
}

function chipLabels(): string[] {
  return Array.from(document.body.querySelectorAll('.tag-chip'))
    .map(el => el.getAttribute('data-label') ?? '');
}

function filterButton(): Element {
  return requireElement('.search-row .btn-icon');
}

async function setSearch(value: string): Promise<void> {
  await new DOMWrapper(requireElement('.search-input')).setValue(value);
}

// ============================================================
// fixture
// ============================================================

interface TagFixture { value: string; label: string }

interface DeckCardFixture {
  cardType: string;
  attribute?: string;
  race?: string;
  types?: string[];
  isExtraDeck?: boolean;
}

/** グループ混在のベースタグ（入力順はソート検証のため意図的にバラバラ） */
const baseTags: TagFixture[] = [
  { value: '900', label: '特別タグ' }, // others
  { value: '18', label: '融合' }, // type (fusion)
  { value: '20', label: 'ドラゴン族' }, // race (dragon)
  { value: '1', label: '闇' }, // attr (dark)
  { value: '2', label: '光' }, // attr (light)
  { value: '7', label: '神' }, // attr (divine)
  { value: '41', label: '幻神獣族' }, // race (divine)
  { value: '34', label: '戦士族' }, // race (warrior)
  { value: '12', label: 'チューナー' }, // type (tuner)
  { value: '11', label: 'シンクロ' }, // type (synchro)
  { value: '13', label: 'デュアル' }, // type (gemini)
  { value: '901', label: 'ABCタグ' }, // others（検索の大文字小文字無視用）
];

function monsters(n: number, attrs: Partial<DeckCardFixture>): DeckCardFixture[] {
  return Array.from({ length: n }, () => ({ cardType: 'monster', ...attrs }));
}

/** attr 1/4境界: モンスター8枚（闇2・光1・水5）+属性闇の非モンスター3枚 */
const attrQuarterCards: DeckCardFixture[] = [
  ...monsters(2, { attribute: 'dark' }),
  ...monsters(1, { attribute: 'light' }),
  ...monsters(5, { attribute: 'water' }),
  ...Array.from({ length: 3 }, () => ({ cardType: 'spell', attribute: 'dark' }) as DeckCardFixture),
];

// ============================================================
// 共通setup
// ============================================================

interface MountOverrides {
  isVisible?: boolean;
  modelValue?: string[];
  tags?: TagFixture[];
  deckCards?: DeckCardFixture[];
}

const mountedWrappers: Array<ReturnType<typeof mountDialog>> = [];

function mountDialog(overrides: MountOverrides = {}) {
  const wrapper = mount(TagDialog, {
    props: {
      isVisible: true,
      modelValue: [] as string[],
      tags: baseTags,
      deckCards: [] as DeckCardFixture[],
      ...overrides,
    },
  });
  mountedWrappers.push(wrapper);
  return wrapper;
}

function lastEmittedModelValue(wrapper: ReturnType<typeof mountDialog>): string[] | undefined {
  const events = wrapper.emitted<string[][]>('update:modelValue');
  return events?.at(-1)?.[0];
}

afterEach(() => {
  for (const wrapper of mountedWrappers) wrapper.unmount();
  mountedWrappers.length = 0;
  document.body.innerHTML = '';
});

// ============================================================
// テスト本体
// ============================================================

describe('components/TagDialog', () => {
  describe('選択状態とemit', () => {
    it('[covers:tag-dialog.initial-selection-from-model-value] modelValueの初期選択がチップとselectedクラスに反映される', () => {
      mountDialog({ modelValue: ['1', '20'] });
      expect(chipLabels()).toEqual(['闇', 'ドラゴン族']);
      expect(requireItemByLabel('闇').classList.contains('selected')).toBe(true);
      expect(requireItemByLabel('ドラゴン族').classList.contains('selected')).toBe(true);
      expect(requireItemByLabel('光').classList.contains('selected')).toBe(false);
    });

    it('[covers:tag-dialog.toggle-tag-add-and-remove] タグ項目クリックで追加/解除をトグルし即時emitする', async () => {
      const wrapper = mountDialog({ modelValue: [] });
      await clickItem('闇');
      expect(lastEmittedModelValue(wrapper)).toEqual(['1']);
      expect(requireItemByLabel('闇').classList.contains('selected')).toBe(true);
      await clickItem('闇');
      expect(lastEmittedModelValue(wrapper)).toEqual([]);
      expect(requireItemByLabel('闇').classList.contains('selected')).toBe(false);
    });

    it('[covers:tag-dialog.chip-click-removes-selection] 選択済みチップのクリックで選択解除する', async () => {
      const wrapper = mountDialog({ modelValue: ['1', '20'] });
      await clickEl(requireChipByValue('1'));
      expect(lastEmittedModelValue(wrapper)).toEqual(['20']);
      expect(chipLabels()).toEqual(['ドラゴン族']);
    });

    it('[covers:tag-dialog.clear-all-button-visibility-and-emit] クリアボタンは選択時のみ表示され全解除をemitする', async () => {
      const wrapper = mountDialog({ modelValue: [] });
      expect(document.body.querySelector('.btn-clear-action')).toBeNull();
      await wrapper.setProps({ modelValue: ['1', '20'] });
      const clearBtn = requireElement('.btn-clear-action');
      await clickEl(clearBtn);
      expect(lastEmittedModelValue(wrapper)).toEqual([]);
      expect(chipLabels()).toEqual([]);
      expect(document.body.querySelector('.btn-clear-action')).toBeNull();
    });

    it('[covers:tag-dialog.close-button-emits-close] ×ボタンでcloseをemitしmodelValueはemitしない', async () => {
      const wrapper = mountDialog({ modelValue: ['1'] });
      await clickEl(requireElement('.close-btn'));
      expect(wrapper.emitted('close')).toHaveLength(1);
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('[covers:tag-dialog.toggle-does-not-mutate-model-value-array] toggleしても親のmodelValue配列は破壊されない', async () => {
      const parentArray = ['1'];
      const wrapper = mountDialog({ modelValue: parentArray });
      await clickItem('ドラゴン族');
      expect(lastEmittedModelValue(wrapper)).toEqual(['1', '20']);
      expect(parentArray).toEqual(['1']);
    });
  });

  describe('modelValue同期', () => {
    it('[covers:tag-dialog.model-value-change-syncs-selection] modelValueの配列置換で選択が同期する', async () => {
      const wrapper = mountDialog({ modelValue: [] });
      await wrapper.setProps({ modelValue: ['1'] });
      expect(chipLabels()).toEqual(['闇']);
      await clickItem('ドラゴン族');
      expect(lastEmittedModelValue(wrapper)).toEqual(['1', '20']);
    });

    it('[covers:tag-dialog.model-value-deep-watch-syncs-element-change] reactive配列へのpushでも選択が同期する', async () => {
      const mv = reactive<string[]>(['1']);
      mountDialog({ modelValue: mv });
      expect(chipLabels()).toEqual(['闇']);
      mv.push('20');
      await nextTick();
      expect(chipLabels()).toEqual(['闇', 'ドラゴン族']);
    });
  });

  describe('再オープン時のリセット', () => {
    it('[covers:tag-dialog.reopen-resets-filter-and-search] 再オープンで検索語と枚数フィルタがリセットされる', async () => {
      const wrapper = mountDialog({ deckCards: attrQuarterCards });
      await setSearch('ドラ');
      await clickFilterButton();
      expect(filterButton().classList.contains('active')).toBe(true);
      await wrapper.setProps({ isVisible: false });
      await wrapper.setProps({ isVisible: true });
      const input = requireElement<HTMLInputElement>('.search-input');
      expect(input.value).toBe('');
      expect(filterButton().classList.contains('active')).toBe(false);
      expect(tagItemLabels()).toHaveLength(baseTags.length);
    });

    it('[covers:tag-dialog.reopen-keeps-selected-group] 再オープンしてもグループタブ選択は維持される', async () => {
      const wrapper = mountDialog();
      await clickEl(requireTabByText('race'));
      expect(tagItemLabels()).toEqual(['ドラゴン族', '幻神獣族', '戦士族']);
      await wrapper.setProps({ isVisible: false });
      await wrapper.setProps({ isVisible: true });
      expect(tagItemLabels()).toEqual(['ドラゴン族', '幻神獣族', '戦士族']);
      expect(requireTabByText('race').classList.contains('active')).toBe(true);
    });
  });

  describe('グループ・並び順・検索', () => {
    it('[covers:tag-dialog.group-tab-filters-by-group] グループタブで分類グループごとに絞り込む', async () => {
      mountDialog();
      expect(tagItemLabels()).toHaveLength(baseTags.length);
      await clickEl(requireTabByText('race'));
      expect(tagItemLabels()).toEqual(['ドラゴン族', '幻神獣族', '戦士族']);
      expect(requireTabByText('race').classList.contains('active')).toBe(true);
      await clickEl(requireTabByText('others'));
      expect(tagItemLabels()).toEqual(['特別タグ', 'ABCタグ']);
      await clickEl(requireTabByText('all'));
      expect(tagItemLabels()).toHaveLength(baseTags.length);
    });

    it('[covers:tag-dialog.tags-sorted-by-group-order] タグはグループ順（attr→race→type→others）に並ぶ', () => {
      mountDialog();
      expect(tagItemLabels()).toEqual([
        '闇', '光', '神',
        'ドラゴン族', '幻神獣族', '戦士族',
        '融合', 'チューナー', 'シンクロ', 'デュアル',
        '特別タグ', 'ABCタグ',
      ]);
    });

    it('[covers:tag-dialog.search-filters-label-case-insensitive] 検索はラベル部分一致で大文字小文字を無視し空白のみは絞らない', async () => {
      mountDialog();
      await setSearch('abc');
      expect(tagItemLabels()).toEqual(['ABCタグ']);
      await setSearch('ドラ');
      expect(tagItemLabels()).toEqual(['ドラゴン族']);
      await setSearch('  ');
      expect(tagItemLabels()).toHaveLength(baseTags.length);
    });

    it('[covers:tag-dialog.filters-compose-group-search-and-count] グループ・検索・枚数フィルタはANDで適用される', async () => {
      mountDialog({ deckCards: attrQuarterCards });
      await clickEl(requireTabByText('attr'));
      await setSearch('闇');
      await clickFilterButton();
      expect(tagItemLabels()).toEqual(['闇']);
    });
  });

  describe('枚数フィルタ', () => {
    it('[covers:tag-dialog.filter-button-toggles-on-off] フィルタボタンでON/OFFがトグルし絞り込みが連動する', async () => {
      mountDialog({ deckCards: attrQuarterCards });
      await clickFilterButton();
      expect(filterButton().classList.contains('active')).toBe(true);
      expect(tagItemLabels()).toContain('闇');
      expect(tagItemLabels()).not.toContain('光');
      await clickFilterButton();
      expect(filterButton().classList.contains('active')).toBe(false);
      expect(tagItemLabels()).toHaveLength(baseTags.length);
    });

    it('[covers:tag-dialog.attr-count-filter-quarter-threshold] attrはモンスター総数の1/4以上で表示され非モンスターは数えない', async () => {
      mountDialog({ deckCards: attrQuarterCards });
      await clickFilterButton();
      expect(tagItemLabels()).toContain('闇');
      expect(tagItemLabels()).not.toContain('光');
    });

    it('[covers:tag-dialog.attr-divine-count-filter-single-card] 神属性は1枚以上で表示される（1/4特例）', async () => {
      mountDialog({
        deckCards: [
          ...monsters(1, { attribute: 'divine' }),
          ...monsters(7, { attribute: 'water' }),
        ],
      });
      await clickFilterButton();
      expect(tagItemLabels()).toContain('神');
    });

    it('[covers:tag-dialog.race-count-filter-quarter-threshold] raceはモンスター総数の1/4以上で表示される', async () => {
      mountDialog({
        deckCards: [
          ...monsters(2, { race: 'dragon' }),
          ...monsters(1, { race: 'warrior' }),
          ...monsters(5, { race: 'spellcaster' }),
        ],
      });
      await clickFilterButton();
      expect(tagItemLabels()).toContain('ドラゴン族');
      expect(tagItemLabels()).not.toContain('戦士族');
    });

    it('[covers:tag-dialog.race-divine-count-filter-single-card] 幻神獣族は1枚以上で表示される（1/4特例）', async () => {
      mountDialog({
        deckCards: [
          ...monsters(1, { race: 'divine' }),
          ...monsters(7, { race: 'spellcaster' }),
        ],
      });
      await clickFilterButton();
      expect(tagItemLabels()).toContain('幻神獣族');
    });

    it('[covers:tag-dialog.count-filter-excludes-others-tags] 枚数フィルタONではothersタグは常に除外される', async () => {
      mountDialog({ deckCards: monsters(8, { attribute: 'dark' }) });
      expect(tagItemLabels()).toContain('特別タグ');
      await clickFilterButton();
      expect(tagItemLabels()).not.toContain('特別タグ');
      expect(tagItemLabels()).not.toContain('ABCタグ');
    });

    it('[covers:tag-dialog.type-count-filter-requires-seven] エクストラ系以外のtypeは7枚以上で表示される（境界6/7）', async () => {
      mountDialog({
        deckCards: [
          ...monsters(7, { types: ['tuner'] }),
          ...monsters(6, { types: ['gemini'] }),
        ],
      });
      await clickFilterButton();
      expect(tagItemLabels()).toContain('チューナー');
      expect(tagItemLabels()).not.toContain('デュアル');
    });

    it('[covers:tag-dialog.extra-type-count-filter-requires-seven-extra-deck] エクストラ系typeはエクストラ7枚以上でのみ表示される', async () => {
      mountDialog({
        deckCards: [
          ...monsters(7, { types: ['fusion'], isExtraDeck: true }),
          ...monsters(6, { types: ['synchro'], isExtraDeck: true }),
          ...monsters(7, { types: ['synchro'], isExtraDeck: false }),
        ],
      });
      await clickFilterButton();
      expect(tagItemLabels()).toContain('融合');
      expect(tagItemLabels()).not.toContain('シンクロ');
    });

    it('[covers:tag-dialog.type-count-ignores-monsters-without-types] types欠損モンスターはtypeカウントに寄与しない', async () => {
      mountDialog({
        deckCards: [
          ...monsters(6, { types: ['tuner'] }),
          ...monsters(3, {}),
        ],
      });
      await clickFilterButton();
      expect(tagItemLabels()).not.toContain('チューナー');
    });

    it('[covers:tag-dialog.count-filter-with-no-monsters-shows-attr-and-race] モンスター0枚ではattr/raceが表示され神・type・othersは表示されない', async () => {
      mountDialog({ deckCards: Array.from({ length: 3 }, () => ({ cardType: 'spell' }) as DeckCardFixture) });
      await clickFilterButton();
      expect(tagItemLabels()).toContain('闇');
      expect(tagItemLabels()).toContain('ドラゴン族');
      expect(tagItemLabels()).not.toContain('神');
      expect(tagItemLabels()).not.toContain('融合');
      expect(tagItemLabels()).not.toContain('特別タグ');
    });
  });

  describe('ラベル・タイプ・アイコンの解決', () => {
    it('[covers:tag-dialog.chip-label-falls-back-to-id] tagsに無いidのチップはid自身を表示する', () => {
      mountDialog({ modelValue: ['1', '999'] });
      expect(chipLabels()).toEqual(['闇', '999']);
    });

    it('[covers:tag-dialog.tag-type-derived-from-label] data-typeはラベルから導出され該当なしは空文字になる', () => {
      mountDialog({ modelValue: ['18', '999'] });
      expect(requireItemByLabel('融合').getAttribute('data-type')).toBe('fusion');
      expect(requireItemByLabel('闇').getAttribute('data-type')).toBe('');
      expect(requireChipByValue('18').getAttribute('data-type')).toBe('fusion');
      expect(requireChipByValue('999').getAttribute('data-type')).toBe('');
    });

    it('[covers:tag-dialog.attr-icon-only-for-attr-tags] 属性アイコンはattrタグにのみ表示され属性名URLになる', () => {
      mountDialog();
      const darkItem = requireItemByLabel('闇');
      const icon = darkItem.querySelector('img.attr-icon');
      expect(icon).not.toBeNull();
      expect(icon?.getAttribute('src')).toContain('attribute_icon_dark.png');
      expect(requireItemByLabel('ドラゴン族').querySelector('img')).toBeNull();
    });
  });
});
