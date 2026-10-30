/**
 * components/FilterTab のユニットテスト
 *
 * tests/design/filter-tab/conditions.toml（TASK-505 × TASK-331 Tier C第6号）の
 * 38条件をカバーする（うち4条件はTASK-506テスト先行Phase由来。id維持）。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - FilterTabを直接mount + pinia実物（既存useFilterLogic.test.ts /
 *   SearchFilterDialog.test.tsと同一手法）。BaseDialog等のTeleportは無いため
 *   観測はwrapper経由
 * - 読み取り系8関数（isFieldDisabled等）はuseFilterLogic実物。無効化状態は
 *   searchStore.exclusionResultのfieldStates/attributeStatesへ直接設定する
 *   （exclusionResultはsearchFilters依存のcomputedのため、searchFilters変更後に
 *   設定したエントリはsearchFiltersを変更しない限り保持される。よって
 *   「setFilters → set*State → mount」の順を守る）
 * - UI操作はDOMイベント経由で検証する（vm内部状態の直接参照はしない）
 * - emit透過ラッパー15関数はit.each集約で検証する（引数形状別の8条件）
 * - maxDate computedはvi.useFakeTimers(toFake:['Date'])でシステム時刻を固定
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { DOMWrapper, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import FilterTab from '@/components/search-filter/FilterTab.vue';
import { useSearchStore } from '@/stores/search';
import type { SearchFilters } from '@/types/search-filters';

let pinia: ReturnType<typeof createPinia>;
let searchStore: ReturnType<typeof useSearchStore>;
const mountedWrappers: VueWrapper[] = [];

type FilterTabProps = InstanceType<typeof FilterTab>['$props'];

/** FilterTab既定props（一部だけ上書きして使う） */
function baseProps(): FilterTabProps {
  return {
    pageLanguage: 'ja',
    isMonsterTabDisabled: false,
    isSpellTabDisabled: false,
    isTrapTabDisabled: false,
    selectedAttributeChips: [],
    selectedSpellTypeChips: [],
    selectedTrapTypeChips: [],
    selectedRaceChips: [],
    selectedMonsterTypeChips: [],
    selectedLevelChips: [],
    selectedLinkChips: [],
    selectedScaleChips: [],
    selectedAtkChips: [],
    selectedDefChips: []
  };
}

/** FilterTabをmountする。wrapperは管理帳簿へ登録（assert失敗時も必ずunmount） */
function mountFilterTab(propOverrides: Partial<FilterTabProps> = {}): VueWrapper {
  const wrapper = mount(FilterTab, {
    props: { ...baseProps(), ...propOverrides },
    global: {
      plugins: [pinia]
    }
  });
  mountedWrappers.push(wrapper);
  return wrapper;
}

// ============================================================
// 状態設定ヘルパー（setFilters → set*State → mount の順で使う）
// ============================================================

/** searchFiltersへ上書き（exclusionResultの再計算=手動stateの消去を伴う） */
function setFilters(overrides: Partial<SearchFilters>): void {
  Object.assign(searchStore.searchFilters, overrides);
}

/** fieldStatesへ無効化エントリを設定（理由はtooltipになる） */
function setFieldDisabled(field: string, reason?: string): void {
  const state: { enabled: boolean; hasInput: boolean; disabledReason?: string } = {
    enabled: false,
    hasInput: false
  };
  if (reason !== undefined) {
    state.disabledReason = reason;
  }
  searchStore.exclusionResult.fieldStates.set(field, state);
}

/** fieldStatesのエントリを有効へ戻す（再計算を起こさずに状態を差し替える） */
function setFieldEnabled(field: string): void {
  searchStore.exclusionResult.fieldStates.set(field, { enabled: true, hasInput: false });
}

/** attributeStatesへ無効化エントリを設定 */
function setAttrDisabled(attr: string, reason?: string): void {
  const state: { enabled: boolean; required: boolean; selected: boolean; disabledReason?: string } = {
    enabled: false,
    required: false,
    selected: false
  };
  if (reason !== undefined) {
    state.disabledReason = reason;
  }
  searchStore.exclusionResult.attributeStates.set(attr, state);
}

// ============================================================
// 要素取得ヘルパー（存在assert必須・取得失敗時は即fail）
// ============================================================

/** セレクタで1要素を取得する。存在しない場合はその場でfailする */
function requireElement(wrapper: VueWrapper, selector: string): DOMWrapper<Element> {
  const found = wrapper.find(selector);
  expect(found.exists()).toBe(true);
  if (!found.exists()) {
    throw new Error(`[FilterTab.test] element not found: ${selector}`);
  }
  return found;
}

/** セレクタ+ラベルテキスト完全一致でchip/ボタンを取得する。無い場合はfailする */
function requireChipByText(wrapper: VueWrapper, selector: string, text: string): DOMWrapper<Element> {
  const found = wrapper.findAll(selector).find(el => el.text().trim() === text);
  expect(found).toBeDefined();
  if (found === undefined) {
    throw new Error(`[FilterTab.test] chip not found: ${selector} text=${text}`);
  }
  return found;
}

/** findAll結果のindex番目を取得する。無い場合はfailする */
function requireNth(wrappers: DOMWrapper<Element>[], index: number, what: string): DOMWrapper<Element> {
  const found = wrappers[index];
  expect(found).toBeDefined();
  if (found === undefined) {
    throw new Error(`[FilterTab.test] ${what} not found: index=${index}`);
  }
  return found;
}

/** DOMWrapperの要素をHTMLInputElementとして取得する（型ガード） */
function requireInputElement(wrapper: DOMWrapper<Element>, what: string): HTMLInputElement {
  const el = wrapper.element;
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`[FilterTab.test] ${what} is not an HTMLInputElement`);
  }
  return el;
}

/** モンスタータイプ見出し（.section-titleのうちテキスト「モンスタータイプ」のもの）を取得 */
function requireMonsterTypeHeading(wrapper: VueWrapper): DOMWrapper<Element> {
  const heading = wrapper
    .findAll('.section-title')
    .find(el => el.text().trim() === 'モンスタータイプ');
  if (heading === undefined) {
    throw new Error('[FilterTab.test] monster type section-title not found');
  }
  return heading;
}

describe('components/FilterTab', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    searchStore = useSearchStore();
  });

  afterEach(() => {
    // it内のassert失敗に関わらず必ず全wrapperをunmountする（watcher残留防止）
    for (const wrapper of mountedWrappers) {
      wrapper.unmount();
    }
    mountedWrappers.length = 0;
    vi.useRealTimers();
  });

  describe('カードタイプタブ', () => {
    it('[covers:filter-tab.card-type-tab-active-follows-store-card-type] activeクラスはstoreのcardTypeと一致するタブのみ', () => {
      setFilters({ cardType: 'spell' });
      const wrapper = mountFilterTab();

      expect(requireElement(wrapper, '.spell-wrapper .card-type-tab').classes()).toContain('active');
      expect(requireElement(wrapper, '.monster-wrapper .card-type-tab').classes()).not.toContain('active');
      expect(requireElement(wrapper, '.trap-wrapper .card-type-tab').classes()).not.toContain('active');
    });

    it('[covers:filter-tab.card-type-tab-disabled-from-props-with-tooltip] propsのdisabledで無効化し固定文言をtooltip表示', () => {
      const wrapper = mountFilterTab({ isMonsterTabDisabled: true });

      const monsterTab = requireElement(wrapper, '.monster-wrapper .card-type-tab');
      expect(monsterTab.attributes('disabled')).toBeDefined();
      expect(monsterTab.attributes('title')).toBe('他のカードタイプが選択されています');

      const spellTab = requireElement(wrapper, '.spell-wrapper .card-type-tab');
      expect(spellTab.attributes('disabled')).toBeUndefined();
      expect(spellTab.attributes('title')).toBeUndefined();
      const trapTab = requireElement(wrapper, '.trap-wrapper .card-type-tab');
      expect(trapTab.attributes('disabled')).toBeUndefined();
      expect(trapTab.attributes('title')).toBeUndefined();
    });
  });

  describe('属性/魔法タイプ/罠タイプ/種族chip', () => {
    it('[covers:filter-tab.detail-chip-active-follows-selected-values] 選択値のchipがactiveになり属性chipはアイコンとラベルを表示', () => {
      setFilters({
        attributes: ['light'],
        spellTypes: ['quick'],
        trapTypes: ['counter'],
        races: ['zombie']
      });
      const wrapper = mountFilterTab();

      // 属性: light選択・fire未選択
      const lightChip = requireChipByText(wrapper, '.type-detail-grid .chip-attr', '光');
      expect(lightChip.classes()).toContain('active');
      expect(requireChipByText(wrapper, '.type-detail-grid .chip-attr', '炎').classes()).not.toContain('active');
      const icon = requireElement(lightChip, 'img.attr-icon');
      expect(icon.attributes('src')).toContain('attribute_icon_light.png');
      expect(icon.attributes('alt')).toBe('光');

      // 魔法タイプ: quick選択・normal未選択
      expect(requireChipByText(wrapper, '.spell-wrapper .type-detail-content .chip', '速攻').classes()).toContain('active');
      expect(requireChipByText(wrapper, '.spell-wrapper .type-detail-content .chip', '通常').classes()).not.toContain('active');

      // 罠タイプ: counter選択・normal未選択
      expect(requireChipByText(wrapper, '.trap-wrapper .type-detail-content .chip', 'カウンター').classes()).toContain('active');
      expect(requireChipByText(wrapper, '.trap-wrapper .type-detail-content .chip', '通常').classes()).not.toContain('active');

      // 種族: zombie選択・dragon未選択
      expect(requireChipByText(wrapper, '.race-rows .chip', 'アンデット族').classes()).toContain('active');
      expect(requireChipByText(wrapper, '.race-rows .chip', 'ドラゴン族').classes()).not.toContain('active');
    });

    it('[covers:filter-tab.race-chips-render-in-fixed-order-with-ja-labels] 26種族が固定順（幻神獣/創造神が最後）でjaラベル表示', () => {
      const wrapper = mountFilterTab();

      const chips = wrapper.findAll('.race-rows .chip');
      // FilterTab racesOrdered（L525-531）の固定順 + RACE_ID_TO_NAMEのjaラベル
      const expected = [
        'アンデット族', '悪魔族', '恐竜族', '海竜族', '機械族', '岩石族', '昆虫族',
        'サイキック族', 'サイバース族', '獣族', '獣戦士族', '戦士族', '天使族', '鳥獣族',
        'ドラゴン族', '爬虫類族', '魚族', '炎族', '幻竜族', '幻想魔族', '魔法使い族',
        '水族', '雷族', '植物族', '幻神獣族', '創造神族'
      ];
      expect(chips.map(chip => chip.text())).toEqual(expected);
      for (const chip of chips) {
        expect(chip.classes()).not.toContain('active');
      }
    });

    it('[covers:filter-tab.race-chip-label-falls-back-to-id-when-mapping-absent] マッピング無し言語では種族内部IDをそのまま表示', () => {
      const wrapper = mountFilterTab({ pageLanguage: 'en' });

      // 動的マッピング未取得のenではgetRaceIdToTextが{}を返すため内部IDへフォールバック
      expect(requireChipByText(wrapper, '.race-rows .chip', 'zombie').exists()).toBe(true);
    });

    it('[covers:filter-tab.monster-type-chip-label-uses-ja-static-fallback] モンスタータイプラベルはja静的マッピングへフォールバック', () => {
      const wrapper = mountFilterTab({ pageLanguage: 'en' });

      // 種族と異なりMONSTER_TYPE_ID_TO_NAMEのjaラベルが表示される（内部IDではない）
      const fusionChip = requireElement(wrapper, 'button.chip[data-type="fusion"]');
      expect(fusionChip.text()).toBe('融合');
    });
  });

  describe('モンスタータイプ', () => {
    it('[covers:filter-tab.monster-type-chip-state-class-follows-monster-types] stateに応じてactive/notクラスが付く', () => {
      setFilters({
        monsterTypes: [
          { type: 'fusion', state: 'normal' },
          { type: 'synchro', state: 'not' }
        ]
      });
      const wrapper = mountFilterTab();

      const fusionChip = requireElement(wrapper, 'button.chip[data-type="fusion"]');
      expect(fusionChip.classes()).toContain('active');
      expect(fusionChip.classes()).not.toContain('not');

      const synchroChip = requireElement(wrapper, 'button.chip[data-type="synchro"]');
      expect(synchroChip.classes()).toContain('not');
      expect(synchroChip.classes()).not.toContain('active');

      const xyzChip = requireElement(wrapper, 'button.chip[data-type="xyz"]');
      expect(xyzChip.classes()).not.toContain('active');
      expect(xyzChip.classes()).not.toContain('not');
    });

    it('[covers:filter-tab.monster-type-chip-disabled-by-individual-attribute-state] 個別attributeStateで該当chipのみ無効化+理由tooltip', () => {
      setAttrDisabled('monster-type_fusion', '融合の個別理由');
      const wrapper = mountFilterTab();

      const fusionChip = requireElement(wrapper, 'button.chip[data-type="fusion"]');
      expect(fusionChip.attributes('disabled')).toBeDefined();
      expect(fusionChip.attributes('title')).toBe('融合の個別理由');

      // フィールド全体（card-type_monster）は無効化していないため他chipは有効
      expect(requireElement(wrapper, 'button.chip[data-type="synchro"]').attributes('disabled')).toBeUndefined();
      expect(requireElement(wrapper, 'button.chip[data-type="xyz"]').attributes('disabled')).toBeUndefined();
    });

    it('[covers:filter-tab.monster-type-match-mode-button-label-and-state] matchModeに応じてAND/ORラベルとactiveクラスが付く', () => {
      const wrapperOr = mountFilterTab();
      const modeButtonOr = requireElement(wrapperOr, 'button.chip-mode');
      expect(modeButtonOr.text()).toBe('OR');
      expect(modeButtonOr.classes()).not.toContain('active');

      setFilters({ monsterTypeMatchMode: 'and' });
      const wrapperAnd = mountFilterTab();
      const modeButtonAnd = requireElement(wrapperAnd, 'button.chip-mode');
      expect(modeButtonAnd.text()).toBe('AND');
      expect(modeButtonAnd.classes()).toContain('active');
    });

    it('[covers:filter-tab.monster-type-heading-disabled-class] フィールド無効時は見出しにdisabledクラスが付く', () => {
      searchStore.exclusionResult.attributeStates.set(
        'card-type_monster',
        { enabled: false, required: false, selected: false }
      );
      const wrapper = mountFilterTab();

      expect(requireMonsterTypeHeading(wrapper).classes()).toContain('disabled');
    });

    it('[covers:filter-tab.monster-type-heading-disabled-class] フィールド有効時は見出しにdisabledクラスが付かない', () => {
      searchStore.exclusionResult.attributeStates.set(
        'card-type_monster',
        { enabled: true, required: false, selected: false }
      );
      const wrapper = mountFilterTab();

      expect(requireMonsterTypeHeading(wrapper).classes()).not.toContain('disabled');
    });

    it('[covers:filter-tab.monster-type-match-mode-button-disabled] フィールド無効時はAND/ORボタンがdisabledになる', () => {
      searchStore.exclusionResult.attributeStates.set(
        'card-type_monster',
        { enabled: false, required: false, selected: false }
      );
      const wrapper = mountFilterTab();

      const modeButton = requireElement(wrapper, 'button.chip-mode');
      expect(modeButton.attributes('disabled')).toBeDefined();
    });

    it('[covers:filter-tab.monster-type-match-mode-button-disabled] フィールド有効時はAND/ORボタンが押せる', () => {
      const wrapper = mountFilterTab();

      const modeButton = requireElement(wrapper, 'button.chip-mode');
      expect(modeButton.attributes('disabled')).toBeUndefined();
    });

    it('[covers:filter-tab.monster-type-chip-title-fallback-without-reason] フィールド無効かつcard-type理由なしの場合はフォールバック文言をtooltip表示する', () => {
      // D2a: tooltipが空にならない表示契約
      searchStore.exclusionResult.attributeStates.set(
        'card-type_monster',
        { enabled: false, required: false, selected: false }
      );
      const wrapper = mountFilterTab();

      const fusionChip = requireElement(wrapper, 'button.chip[data-type="fusion"]');
      // titleはchip無効時にのみ描画されるため、無効化自体を前提確認する
      expect(fusionChip.attributes('disabled')).toBeDefined();
      expect(fusionChip.attributes('title')).toBe('モンスターカードタイプが選択されていません');
    });

    it('[covers:filter-tab.monster-type-chip-title-individual-reason-preferred] 個別理由とcard-type理由の併存時は個別理由をtooltip優先表示する', () => {
      // D2b: hover対象チップ自身の理由を優先する表示方針
      searchStore.exclusionResult.attributeStates.set(
        'card-type_monster',
        { enabled: false, required: false, selected: false, disabledReason: 'カードタイプ側の理由' }
      );
      searchStore.exclusionResult.attributeStates.set(
        'monster-type_fusion',
        { enabled: false, required: false, selected: false, disabledReason: '融合の個別理由' }
      );
      const wrapper = mountFilterTab();

      const fusionChip = requireElement(wrapper, 'button.chip[data-type="fusion"]');
      expect(fusionChip.attributes('disabled')).toBeDefined();
      expect(fusionChip.attributes('title')).toBe('融合の個別理由');

      // 個別理由を持たないchipはフィールド無効のcard-type側理由を表示する
      const synchroChip = requireElement(wrapper, 'button.chip[data-type="synchro"]');
      expect(synchroChip.attributes('title')).toBe('カードタイプ側の理由');
    });
  });

  describe('フィールド無効化の配線（属性/魔法/罠/種族）', () => {
    it('[covers:filter-tab.field-disabled-wiring-disables-chips-with-reason] 各フィールド無効化で該当セクションchip全てがdisabled+理由tooltip', () => {
      setFieldDisabled('attribute', '属性の理由');
      setFieldDisabled('spell-type', '魔法タイプの理由');
      setFieldDisabled('trap-type', '罠タイプの理由');
      setFieldDisabled('race', '種族の理由');
      const wrapper = mountFilterTab();

      const lightChip = requireChipByText(wrapper, '.type-detail-grid .chip-attr', '光');
      expect(lightChip.attributes('disabled')).toBeDefined();
      expect(lightChip.attributes('title')).toBe('属性の理由');

      const quickChip = requireChipByText(wrapper, '.spell-wrapper .type-detail-content .chip', '速攻');
      expect(quickChip.attributes('disabled')).toBeDefined();
      expect(quickChip.attributes('title')).toBe('魔法タイプの理由');

      const counterChip = requireChipByText(wrapper, '.trap-wrapper .type-detail-content .chip', 'カウンター');
      expect(counterChip.attributes('disabled')).toBeDefined();
      expect(counterChip.attributes('title')).toBe('罠タイプの理由');

      const raceChip = requireChipByText(wrapper, '.race-rows .chip', 'アンデット族');
      expect(raceChip.attributes('disabled')).toBeDefined();
      expect(raceChip.attributes('title')).toBe('種族の理由');
      // 種族セクション見出しのdisabledクラスも同じフィールドに配線される
      const raceHeading = wrapper
        .findAll('.section-title')
        .find(el => el.text().trim() === '種族');
      expect(raceHeading).toBeDefined();
      expect(raceHeading?.classes()).toContain('disabled');

      // 初期状態（fieldStates全フィールドenabled）では全chip有効・titleなし
      // （手動stateを再計算なしで有効へ戻して再現）
      setFieldEnabled('attribute');
      setFieldEnabled('spell-type');
      setFieldEnabled('trap-type');
      setFieldEnabled('race');
      const wrapperEnabled = mountFilterTab();
      expect(requireChipByText(wrapperEnabled, '.type-detail-grid .chip-attr', '光').attributes('disabled')).toBeUndefined();
      expect(requireChipByText(wrapperEnabled, '.type-detail-grid .chip-attr', '光').attributes('title')).toBeUndefined();
      expect(requireChipByText(wrapperEnabled, '.spell-wrapper .type-detail-content .chip', '速攻').attributes('disabled')).toBeUndefined();
      expect(requireChipByText(wrapperEnabled, '.trap-wrapper .type-detail-content .chip', 'カウンター').attributes('disabled')).toBeUndefined();
      expect(requireChipByText(wrapperEnabled, '.race-rows .chip', 'アンデット族').attributes('disabled')).toBeUndefined();
    });
  });

  describe('レベル/リンク/Pスケール', () => {
    it('[covers:filter-tab.level-type-tab-active-follows-store-level-type] activeクラスとwrapperクラスがlevelTypeに追従', () => {
      const wrapperLevel = mountFilterTab();
      expect(requireChipByText(wrapperLevel, '.level-tab', 'レベル/ランク').classes()).toContain('active');
      expect(requireElement(wrapperLevel, '.level-section-wrapper').classes()).toContain('level-type-level');

      setFilters({ levelType: 'link' });
      const wrapperLink = mountFilterTab();
      expect(requireChipByText(wrapperLink, '.level-tab', 'リンク').classes()).toContain('active');
      expect(requireChipByText(wrapperLink, '.level-tab', 'レベル/ランク').classes()).not.toContain('active');
      expect(requireChipByText(wrapperLink, '.level-tab', 'Pスケール').classes()).not.toContain('active');
      expect(requireElement(wrapperLink, '.level-section-wrapper').classes()).toContain('level-type-link');
    });

    it('[covers:filter-tab.level-type-tab-disabled-wiring] 各タブの無効化配線（リンクは両フィールド無効時・理由はlink-value優先）', () => {
      // level-rank無効: レベル/ランクタブ
      setFieldDisabled('level-rank', 'レベルの理由');
      const wrapperLevel = mountFilterTab();
      const levelTab = requireChipByText(wrapperLevel, '.level-tab', 'レベル/ランク');
      expect(levelTab.attributes('disabled')).toBeDefined();
      expect(levelTab.attributes('title')).toBe('レベルの理由');
      expect(requireChipByText(wrapperLevel, '.level-tab', 'リンク').attributes('disabled')).toBeUndefined();

      // p-scale無効: Pスケールタブ
      setFieldEnabled('level-rank');
      setFieldDisabled('p-scale', 'スケールの理由');
      const wrapperScale = mountFilterTab();
      const scaleTab = requireChipByText(wrapperScale, '.level-tab', 'Pスケール');
      expect(scaleTab.attributes('disabled')).toBeDefined();
      expect(scaleTab.attributes('title')).toBe('スケールの理由');

      // link-value+link-marker両無効: リンクタブ（titleはlink-valueの理由優先）
      setFieldEnabled('p-scale');
      setFieldDisabled('link-value', 'リンク値の理由');
      setFieldDisabled('link-marker', 'マーカーの理由');
      const wrapperLink = mountFilterTab();
      const linkTab = requireChipByText(wrapperLink, '.level-tab', 'リンク');
      expect(linkTab.attributes('disabled')).toBeDefined();
      expect(linkTab.attributes('title')).toBe('リンク値の理由');

      // link-markerのみ無効ではリンクタブは無効化されない（&&条件）
      setFieldEnabled('link-value');
      const wrapperLinkEnabled = mountFilterTab();
      expect(requireChipByText(wrapperLinkEnabled, '.level-tab', 'リンク').attributes('disabled')).toBeUndefined();
    });

    it('[covers:filter-tab.level-type-switches-number-panel] levelTypeで数値パネルが切替わる', () => {
      const wrapperLevel = mountFilterTab();
      expect(wrapperLevel.find('.level-numbers').exists()).toBe(true);
      expect(wrapperLevel.findAll('.level-numbers .chip-num').length).toBe(14);
      expect(wrapperLevel.find('.link-section').exists()).toBe(false);

      setFilters({ levelType: 'link' });
      const wrapperLink = mountFilterTab();
      expect(wrapperLink.find('.link-section').exists()).toBe(true);
      expect(wrapperLink.findAll('.link-numbers .chip-num').length).toBe(6);
      expect(wrapperLink.find('.level-numbers').exists()).toBe(false);
    });

    it('[covers:filter-tab.level-scale-number-chip-active-and-disabled-follow-level-type] 数字chipのactive/disabledはlevelTypeに応じた配列・フィールドを参照', () => {
      // level: levelValues参照
      setFilters({ levelType: 'level', levelValues: [4] });
      const wrapperLevel = mountFilterTab();
      expect(requireChipByText(wrapperLevel, '.level-numbers .chip-num', '4').classes()).toContain('active');
      expect(requireChipByText(wrapperLevel, '.level-numbers .chip-num', '5').classes()).not.toContain('active');

      // scale: scaleValues参照（levelValues=[7]は影響しない）
      setFilters({ levelType: 'scale', levelValues: [7], scaleValues: [4] });
      const wrapperScale = mountFilterTab();
      expect(requireChipByText(wrapperScale, '.level-numbers .chip-num', '4').classes()).toContain('active');
      expect(requireChipByText(wrapperScale, '.level-numbers .chip-num', '7').classes()).not.toContain('active');

      // levelType='level'ではlevel-rankフィールド状態で無効化
      setFilters({ levelType: 'level' });
      setFieldDisabled('level-rank', 'レベルの理由');
      const wrapperLevelDisabled = mountFilterTab();
      const levelChip4 = requireChipByText(wrapperLevelDisabled, '.level-numbers .chip-num', '4');
      expect(levelChip4.attributes('disabled')).toBeDefined();
      expect(levelChip4.attributes('title')).toBe('レベルの理由');

      // levelType='scale'ではp-scaleフィールド状態で無効化（level-rankの無効は再計算で消える）
      setFilters({ levelType: 'scale' });
      setFieldDisabled('p-scale', 'スケールの理由');
      const wrapperScaleDisabled = mountFilterTab();
      const scaleChip4 = requireChipByText(wrapperScaleDisabled, '.level-numbers .chip-num', '4');
      expect(scaleChip4.attributes('disabled')).toBeDefined();
      expect(scaleChip4.attributes('title')).toBe('スケールの理由');
    });

    it('[covers:filter-tab.link-value-chip-active-and-disabled-wiring] リンク値chipはlinkValuesでactive・link-value無効化でdisabled+tooltip', () => {
      setFilters({ levelType: 'link', linkValues: [2] });
      const wrapper = mountFilterTab();
      expect(requireChipByText(wrapper, '.link-numbers .chip-num', '2').classes()).toContain('active');
      expect(requireChipByText(wrapper, '.link-numbers .chip-num', '3').classes()).not.toContain('active');

      setFieldDisabled('link-value', 'リンク値の理由');
      const wrapperDisabled = mountFilterTab();
      const linkChip3 = requireChipByText(wrapperDisabled, '.link-numbers .chip-num', '3');
      expect(linkChip3.attributes('disabled')).toBeDefined();
      expect(linkChip3.attributes('title')).toBe('リンク値の理由');
    });

    it('[covers:filter-tab.link-marker-render-and-active-class] 8方位マーカー描画（中心5なし）・linkMarkersでactive', () => {
      setFilters({ levelType: 'link', linkMarkers: [1, 4] });
      const wrapper = mountFilterTab();

      const spans = wrapper.findAll('.icon_img_set span');
      expect(spans.length).toBe(8);
      expect(wrapper.find('.icon_img_set span.i_i_5').exists()).toBe(false);
      expect(requireElement(wrapper, '.icon_img_set span.i_i_1').classes()).toContain('active');
      expect(requireElement(wrapper, '.icon_img_set span.i_i_4').classes()).toContain('active');
      expect(requireElement(wrapper, '.icon_img_set span.i_i_2').classes()).not.toContain('active');
    });

    it('[covers:filter-tab.link-marker-disabled-blocks-click] link-marker無効時はdisabledクラス+理由tooltip付きでclickがemitされない', async () => {
      setFilters({ levelType: 'link' });
      setFieldDisabled('link-marker', 'マーカーの理由');
      const wrapper = mountFilterTab();

      expect(requireElement(wrapper, '.icon_img_set').classes()).toContain('disabled');
      const markerSpan = requireElement(wrapper, '.icon_img_set span.i_i_2');
      expect(markerSpan.attributes('title')).toBe('マーカーの理由');
      await markerSpan.trigger('click');
      expect(wrapper.emitted('toggle-link-marker')).toBeUndefined();
    });

    it('[covers:filter-tab.link-marker-mode-button-label-and-state] リンクマーカーAND/ORボタンのラベル・active・無効化配線', () => {
      setFilters({ levelType: 'link', linkMarkerMatchMode: 'or' });
      const wrapperOr = mountFilterTab();
      const modeOr = requireElement(wrapperOr, 'button.link-mode-btn');
      expect(modeOr.text()).toBe('OR');
      expect(modeOr.classes()).not.toContain('active');

      setFilters({ levelType: 'link', linkMarkerMatchMode: 'and' });
      const wrapperAnd = mountFilterTab();
      const modeAnd = requireElement(wrapperAnd, 'button.link-mode-btn');
      expect(modeAnd.text()).toBe('AND');
      expect(modeAnd.classes()).toContain('active');

      setFieldDisabled('link-marker', 'マーカーの理由');
      const wrapperDisabled = mountFilterTab();
      expect(requireElement(wrapperDisabled, 'button.link-mode-btn').attributes('disabled')).toBeDefined();
    });
  });

  describe('ATK/DEF', () => {
    it('[covers:filter-tab.stat-tab-switch-local-state] タブ選択はローカル状態で初期ATK・切替でemit無し', async () => {
      const wrapper = mountFilterTab();
      expect(requireChipByText(wrapper, '.stat-tab', 'ATK').classes()).toContain('active');
      expect(requireElement(wrapper, '.atk-def-section-wrapper').classes()).toContain('stat-type-atk');

      await requireChipByText(wrapper, '.stat-tab', 'DEF').trigger('click');
      expect(requireChipByText(wrapper, '.stat-tab', 'DEF').classes()).toContain('active');
      expect(requireChipByText(wrapper, '.stat-tab', 'ATK').classes()).not.toContain('active');
      expect(requireElement(wrapper, '.atk-def-section-wrapper').classes()).toContain('stat-type-def');
      // タブ切替自体はemitしない（activeStatTabはローカルref。
      // DOM clickのbubblesはemitted()に'click'として記録されるため宣言15イベントで判定する）
      // NOTE: このリストはFilterTab.vueのdefineEmitsと手動同期が必要
      // （SFCのemits定義を実行時に取得できないため。emit追加時に更新すること）
      const declaredEvents = [
        'select-card-type', 'toggle-attribute', 'toggle-spell-type', 'toggle-trap-type',
        'toggle-race', 'cycle-monster-type-state', 'toggle-monster-type-match-mode',
        'set-level-type', 'toggle-level-value', 'toggle-link-value', 'toggle-link-marker',
        'toggle-link-marker-match-mode', 'toggle-stat-exact', 'toggle-stat-unknown',
        'validate-stat-input'
      ];
      for (const name of declaredEvents) {
        expect(wrapper.emitted(name)).toBeUndefined();
      }
    });

    it('[covers:filter-tab.stat-tab-disabled-wiring] タブのdisabledはatk/defフィールド状態に配線', () => {
      setFieldDisabled('atk', 'ATKの理由');
      const wrapper = mountFilterTab();

      const atkTab = requireChipByText(wrapper, '.stat-tab', 'ATK');
      expect(atkTab.attributes('disabled')).toBeDefined();
      expect(atkTab.attributes('title')).toBe('ATKの理由');
      expect(requireChipByText(wrapper, '.stat-tab', 'DEF').attributes('disabled')).toBeUndefined();
    });

    it('[covers:filter-tab.stat-toggle-active-follows-active-stat] 完全一致/?トグルは表示中タブのstatフィルタに追従', async () => {
      setFilters({ atk: { exact: true, unknown: false }, def: { exact: false, unknown: true } });
      const wrapper = mountFilterTab();

      expect(requireChipByText(wrapper, '.stat-checkboxes .chip-toggle', '完全一致').classes()).toContain('active');
      expect(requireChipByText(wrapper, '.stat-checkboxes .chip-toggle', '?').classes()).not.toContain('active');

      await requireChipByText(wrapper, '.stat-tab', 'DEF').trigger('click');
      expect(requireChipByText(wrapper, '.stat-checkboxes .chip-toggle', '?').classes()).toContain('active');
      expect(requireChipByText(wrapper, '.stat-checkboxes .chip-toggle', '完全一致').classes()).not.toContain('active');
    });

    it('[covers:filter-tab.stat-toggle-disabled-wiring] トグルのdisabledは表示中タブのフィールド状態に配線', () => {
      setFieldDisabled('atk', 'ATKの理由');
      const wrapper = mountFilterTab();

      const exactToggle = requireChipByText(wrapper, '.stat-checkboxes .chip-toggle', '完全一致');
      expect(exactToggle.attributes('disabled')).toBeDefined();
      expect(exactToggle.attributes('title')).toBe('ATKの理由');
      const unknownToggle = requireChipByText(wrapper, '.stat-checkboxes .chip-toggle', '?');
      expect(unknownToggle.attributes('disabled')).toBeDefined();
      expect(unknownToggle.attributes('title')).toBe('ATKの理由');
    });

    it('[covers:filter-tab.stat-input-value-binding-and-disabled-branches] Min/Maxの値バインドとunknown/exact/フィールド無効の分岐', async () => {
      // 通常: min/max値を表示し両方入力可
      setFilters({ atk: { exact: false, unknown: false, min: 100, max: 2000 } });
      const wrapper = mountFilterTab();
      const minInput = requireNth(wrapper.findAll('.stat-inputs input'), 0, 'stat min input');
      const maxInput = requireNth(wrapper.findAll('.stat-inputs input'), 1, 'stat max input');
      expect(requireInputElement(minInput, 'stat min input').value).toBe('100');
      expect(requireInputElement(maxInput, 'stat max input').value).toBe('2000');
      expect(minInput.attributes('disabled')).toBeUndefined();
      expect(maxInput.attributes('disabled')).toBeUndefined();

      // exact時: Max入力のみ排他される
      setFilters({ atk: { exact: true, unknown: false, min: 100 }, def: { exact: false, unknown: true } });
      const wrapperExact = mountFilterTab();
      const minInputExact = requireNth(wrapperExact.findAll('.stat-inputs input'), 0, 'stat min input');
      const maxInputExact = requireNth(wrapperExact.findAll('.stat-inputs input'), 1, 'stat max input');
      expect(minInputExact.attributes('disabled')).toBeUndefined();
      expect(maxInputExact.attributes('disabled')).toBeDefined();

      // unknown時: Min/Max両方disabled
      await requireChipByText(wrapperExact, '.stat-tab', 'DEF').trigger('click');
      const minInputUnknown = requireNth(wrapperExact.findAll('.stat-inputs input'), 0, 'stat min input');
      const maxInputUnknown = requireNth(wrapperExact.findAll('.stat-inputs input'), 1, 'stat max input');
      expect(minInputUnknown.attributes('disabled')).toBeDefined();
      expect(maxInputUnknown.attributes('disabled')).toBeDefined();
      expect(requireInputElement(minInputUnknown, 'stat min input').value).toBe('');

      // フィールド無効時: 両方disabled+理由tooltip
      setFieldDisabled('atk', 'ATKの理由');
      const wrapperDisabled = mountFilterTab();
      const minInputDisabled = requireNth(wrapperDisabled.findAll('.stat-inputs input'), 0, 'stat min input');
      expect(minInputDisabled.attributes('disabled')).toBeDefined();
      expect(minInputDisabled.attributes('title')).toBe('ATKの理由');
    });
  });

  describe('発売日', () => {
    it('[covers:filter-tab.release-date-vmodel-binds-store] from/to入力はstoreのreleaseDateへ直結する', async () => {
      const wrapper = mountFilterTab();
      const inputs = wrapper.findAll('.date-range input');
      const fromInput = requireNth(inputs, 0, 'date from input');
      const toInput = requireNth(inputs, 1, 'date to input');

      requireInputElement(fromInput, 'date from input').value = '2020-01-01';
      await fromInput.trigger('input');
      requireInputElement(toInput, 'date to input').value = '2021-06-30';
      await toInput.trigger('input');

      expect(searchStore.searchFilters.releaseDate.from).toBe('2020-01-01');
      expect(searchStore.searchFilters.releaseDate.to).toBe('2021-06-30');
    });

    it('[covers:filter-tab.release-date-bounds-static-min-and-computed-max] minは1999-01-01固定・maxは翌年年末', () => {
      vi.useFakeTimers({ now: new Date('2026-05-01T00:00:00Z'), toFake: ['Date'] });
      const wrapper = mountFilterTab();

      const inputs = wrapper.findAll('.date-range input');
      for (const input of inputs) {
        expect(input.attributes('min')).toBe('1999-01-01');
        expect(input.attributes('max')).toBe('2027-12-31');
      }
    });
  });

  describe('選択済みchip（props由来）', () => {
    it('[covers:filter-tab.selected-chip-labels-echo-props] props配列のラベルを描画し空なら描画しない', () => {
      const wrapper = mountFilterTab({
        selectedAttributeChips: ['光', '闇'],
        selectedSpellTypeChips: ['速攻'],
        selectedTrapTypeChips: ['永続'],
        selectedRaceChips: ['アンデット族'],
        selectedMonsterTypeChips: ['N-融合'],
        selectedLevelChips: ['4-6'],
        selectedLinkChips: ['LINK-2'],
        selectedScaleChips: ['1'],
        selectedAtkChips: ['ATK=100'],
        selectedDefChips: ['DEF=?']
      });
      const texts = wrapper.findAll('.selected-chip-inline').map(chip => chip.text());
      expect(texts).toHaveLength(11);
      expect([...texts].sort()).toEqual(
        ['光', '闇', '速攻', '永続', 'アンデット族', 'N-融合', '4-6', 'LINK-2', '1', 'ATK=100', 'DEF=?'].sort()
      );

      // 空配列propsではchipを1件も描画しない
      const wrapperEmpty = mountFilterTab();
      expect(wrapperEmpty.findAll('.selected-chip-inline')).toHaveLength(0);
    });
  });

  describe('emit透過ラッパー（15イベント・it.each集約）', () => {
    interface EmitRow {
      desc: string;
      eventName: string;
      expected: unknown[];
      filters?: Partial<SearchFilters>;
      trigger?: 'click' | 'input';
      find: (wrapper: VueWrapper) => DOMWrapper<Element>;
      preClick?: (wrapper: VueWrapper) => Promise<void>;
      validateEventArg?: boolean;
    }

    const rows: EmitRow[] = [
      // select-card-type（3タブ）
      {
        desc: '[covers:filter-tab.emit-select-card-type-relays-tab] モンスタータブclick → select-card-type monster',
        eventName: 'select-card-type',
        expected: ['monster'],
        find: w => requireElement(w, '.monster-wrapper .card-type-tab')
      },
      {
        desc: '[covers:filter-tab.emit-select-card-type-relays-tab] 魔法タブclick → select-card-type spell',
        eventName: 'select-card-type',
        expected: ['spell'],
        find: w => requireElement(w, '.spell-wrapper .card-type-tab')
      },
      {
        desc: '[covers:filter-tab.emit-select-card-type-relays-tab] 罠タブclick → select-card-type trap',
        eventName: 'select-card-type',
        expected: ['trap'],
        find: w => requireElement(w, '.trap-wrapper .card-type-tab')
      },
      // 値を持つchip（属性/魔法/罠/種族/モンスタータイプ）
      {
        desc: '[covers:filter-tab.emit-value-chip-click-relays-chip-value] 属性chip「光」click → toggle-attribute light',
        eventName: 'toggle-attribute',
        expected: ['light'],
        find: w => requireChipByText(w, '.type-detail-grid .chip-attr', '光')
      },
      {
        desc: '[covers:filter-tab.emit-value-chip-click-relays-chip-value] 魔法タイプchip「速攻」click → toggle-spell-type quick',
        eventName: 'toggle-spell-type',
        expected: ['quick'],
        find: w => requireChipByText(w, '.spell-wrapper .type-detail-content .chip', '速攻')
      },
      {
        desc: '[covers:filter-tab.emit-value-chip-click-relays-chip-value] 罠タイプchip「カウンター」click → toggle-trap-type counter',
        eventName: 'toggle-trap-type',
        expected: ['counter'],
        find: w => requireChipByText(w, '.trap-wrapper .type-detail-content .chip', 'カウンター')
      },
      {
        desc: '[covers:filter-tab.emit-value-chip-click-relays-chip-value] 種族chip「アンデット族」click → toggle-race zombie',
        eventName: 'toggle-race',
        expected: ['zombie'],
        find: w => requireChipByText(w, '.race-rows .chip', 'アンデット族')
      },
      {
        desc: '[covers:filter-tab.emit-value-chip-click-relays-chip-value] モンスタータイプ融合chip click → cycle-monster-type-state fusion',
        eventName: 'cycle-monster-type-state',
        expected: ['fusion'],
        find: w => requireElement(w, 'button.chip[data-type="fusion"]')
      },
      // AND/OR切替（引数なし）
      {
        desc: '[covers:filter-tab.emit-match-mode-toggles-have-no-args] モンスタータイプAND/OR click → 引数なしemit',
        eventName: 'toggle-monster-type-match-mode',
        expected: [],
        find: w => requireElement(w, 'button.chip-mode')
      },
      {
        desc: '[covers:filter-tab.emit-match-mode-toggles-have-no-args] リンクマーカーAND/OR click → 引数なしemit',
        eventName: 'toggle-link-marker-match-mode',
        expected: [],
        filters: { levelType: 'link' },
        find: w => requireElement(w, 'button.link-mode-btn')
      },
      // set-level-type（3タブ）
      {
        desc: '[covers:filter-tab.emit-set-level-type-relays-choice] レベル/ランクタブclick → set-level-type level',
        eventName: 'set-level-type',
        expected: ['level'],
        find: w => requireChipByText(w, '.level-tab', 'レベル/ランク')
      },
      {
        desc: '[covers:filter-tab.emit-set-level-type-relays-choice] リンクタブclick → set-level-type link',
        eventName: 'set-level-type',
        expected: ['link'],
        find: w => requireChipByText(w, '.level-tab', 'リンク')
      },
      {
        desc: '[covers:filter-tab.emit-set-level-type-relays-choice] Pスケールタブclick → set-level-type scale',
        eventName: 'set-level-type',
        expected: ['scale'],
        find: w => requireChipByText(w, '.level-tab', 'Pスケール')
      },
      // 数字chip
      {
        desc: '[covers:filter-tab.emit-number-chip-click-relays-number] レベル数字4 click → toggle-level-value 4',
        eventName: 'toggle-level-value',
        expected: [4],
        find: w => requireChipByText(w, '.level-numbers .chip-num', '4')
      },
      {
        desc: '[covers:filter-tab.emit-number-chip-click-relays-number] リンク数字3 click → toggle-link-value 3',
        eventName: 'toggle-link-value',
        expected: [3],
        filters: { levelType: 'link' },
        find: w => requireChipByText(w, '.link-numbers .chip-num', '3')
      },
      // リンクマーカー
      {
        desc: '[covers:filter-tab.emit-link-marker-click-relays-position] マーカーspan(i_i_2) click → toggle-link-marker 2',
        eventName: 'toggle-link-marker',
        expected: [2],
        filters: { levelType: 'link' },
        find: w => requireElement(w, '.icon_img_set span.i_i_2')
      },
      // statトグル（activeStatTab relay）
      {
        desc: '[covers:filter-tab.emit-stat-toggles-relay-active-stat] ATK表示中の完全一致click → toggle-stat-exact atk',
        eventName: 'toggle-stat-exact',
        expected: ['atk'],
        find: w => requireChipByText(w, '.stat-checkboxes .chip-toggle', '完全一致')
      },
      {
        desc: '[covers:filter-tab.emit-stat-toggles-relay-active-stat] ATK表示中の? click → toggle-stat-unknown atk',
        eventName: 'toggle-stat-unknown',
        expected: ['atk'],
        find: w => requireChipByText(w, '.stat-checkboxes .chip-toggle', '?')
      },
      {
        desc: '[covers:filter-tab.emit-stat-toggles-relay-active-stat] DEF切替後の完全一致click → toggle-stat-exact def',
        eventName: 'toggle-stat-exact',
        expected: ['def'],
        find: w => requireChipByText(w, '.stat-checkboxes .chip-toggle', '完全一致'),
        preClick: async w => {
          await requireChipByText(w, '.stat-tab', 'DEF').trigger('click');
        }
      },
      // stat入力バリデーション（Event + stat + field）
      {
        desc: '[covers:filter-tab.emit-validate-stat-input-relays-event-stat-field] Min入力input → validate-stat-input [Event, atk, min]',
        eventName: 'validate-stat-input',
        expected: ['atk', 'min'],
        trigger: 'input',
        validateEventArg: true,
        find: w => requireNth(w.findAll('.stat-inputs input'), 0, 'stat min input')
      },
      {
        desc: '[covers:filter-tab.emit-validate-stat-input-relays-event-stat-field] Max入力input → validate-stat-input [Event, atk, max]',
        eventName: 'validate-stat-input',
        expected: ['atk', 'max'],
        trigger: 'input',
        validateEventArg: true,
        find: w => requireNth(w.findAll('.stat-inputs input'), 1, 'stat max input')
      }
    ];

    it.each(rows)('$desc', async (row) => {
      if (row.filters !== undefined) {
        setFilters(row.filters);
      }
      const wrapper = mountFilterTab();
      if (row.preClick !== undefined) {
        await row.preClick(wrapper);
      }
      const target = row.find(wrapper);
      await target.trigger(row.trigger ?? 'click');

      const events = wrapper.emitted(row.eventName);
      expect(events).toBeDefined();
      if (events === undefined) {
        throw new Error(`[FilterTab.test] event not emitted: ${row.eventName}`);
      }
      const payload = events[events.length - 1];
      if (row.validateEventArg === true) {
        // validate-stat-input: 第1引数はDOM Eventインスタンス・残りが期待値
        expect(payload).toHaveLength(3);
        expect(payload[0]).toBeInstanceOf(Event);
        expect(payload.slice(1)).toEqual(row.expected);
      } else {
        expect(payload).toEqual(row.expected);
      }
    });
  });
});
