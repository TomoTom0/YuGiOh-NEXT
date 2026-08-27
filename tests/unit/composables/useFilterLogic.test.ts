import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFilterLogic } from '@/composables/search-filter/useFilterLogic';
import { useSearchStore } from '@/stores/search';
import type { AttributeState } from '@/types/search-exclusion';
import {
  getAttributeLabel,
  getMonsterTypeLabel,
  getRaceLabel,
  getSpellTypeLabel,
  getTrapTypeLabel
} from '@/utils/filter-label';
import { formatLinkMarkerLabel, formatNumberRange, formatStatLabel } from '@/utils/filter-chip-formatter';
import { convertFiltersToIcons } from '@/utils/filter-icons';

describe('useFilterLogic', () => {
  let pageLanguage: { value: string };
  let searchStore: ReturnType<typeof useSearchStore>;

  beforeEach(() => {
    // Piniaを初期化
    setActivePinia(createPinia());
    searchStore = useSearchStore();

    // searchStoreのフィルタを初期化
    searchStore.searchFilters = {
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
      releaseDate: {}
    };

    // exclusionResult は computed なので、初期化不要
    pageLanguage = { value: 'ja' };
  });

  describe('selectCardType', () => {
    it('[covers:use_filter_logic.returns_public_members] モンスターカードタイプを選択できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.selectCardType('monster');

      expect(searchStore.searchFilters.cardType).toBe('monster');
    });

    it('[covers:use_filter_logic.select_card_type_clear_incompatible] スペル選択時に他のカードタイプのフィルタがクリアされる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.attributes = ['FIRE'];
      searchStore.searchFilters.races = ['Zombie'];
      searchStore.searchFilters.spellTypes = ['normal'];
      searchStore.searchFilters.trapTypes = ['continuous'];
      searchStore.searchFilters.monsterTypes = [{ type: 'fusion', state: 'normal' }];
      searchStore.searchFilters.levelValues = [4];
      searchStore.searchFilters.linkValues = [2];
      searchStore.searchFilters.scaleValues = [8];
      searchStore.searchFilters.linkMarkers = [1];
      searchStore.searchFilters.atk = { exact: true, unknown: false, min: 1000, max: 1000 };
      searchStore.searchFilters.def = { exact: false, unknown: true };

      const logic = useFilterLogic(pageLanguage);

      logic.selectCardType('spell');

      expect(searchStore.searchFilters.cardType).toBe('spell');
      expect(searchStore.searchFilters.attributes).toEqual([]);
      expect(searchStore.searchFilters.races).toEqual([]);
      expect(searchStore.searchFilters.spellTypes).toEqual(['normal']);
      expect(searchStore.searchFilters.trapTypes).toEqual([]);
      expect(searchStore.searchFilters.monsterTypes).toEqual([]); // モンスター専用フィルタもクリア
      expect(searchStore.searchFilters.levelValues).toEqual([]);
      expect(searchStore.searchFilters.linkValues).toEqual([]);
      expect(searchStore.searchFilters.scaleValues).toEqual([]);
      expect(searchStore.searchFilters.linkMarkers).toEqual([]);
      expect(searchStore.searchFilters.atk).toEqual({ exact: false, unknown: false });
      expect(searchStore.searchFilters.def).toEqual({ exact: false, unknown: false });
    });

    it('[covers:use_filter_logic.select_card_type_clear_incompatible] 罠選択時に他のカードタイプのフィルタがクリアされる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.spellTypes = ['normal'];
      searchStore.searchFilters.trapTypes = ['continuous'];
      searchStore.searchFilters.monsterTypes = [{ type: 'fusion', state: 'normal' }];

      const logic = useFilterLogic(pageLanguage);

      logic.selectCardType('trap');

      expect(searchStore.searchFilters.cardType).toBe('trap');
      expect(searchStore.searchFilters.trapTypes).toEqual(['continuous']);
      expect(searchStore.searchFilters.spellTypes).toEqual([]);
      expect(searchStore.searchFilters.monsterTypes).toEqual([]); // モンスター専用フィルタもクリア
    });

    it('[covers:use_filter_logic.select_card_type_toggle_off] 同じカードタイプを選択すると解除される', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'monster';
      searchStore.searchFilters.attributes = ['FIRE'];

      const logic = useFilterLogic(pageLanguage);

      logic.selectCardType('monster');

      expect(searchStore.searchFilters.cardType).toBeNull();
      expect(searchStore.searchFilters.attributes).toEqual(['FIRE']);
    });
  });

  describe('無効化状態の判定', () => {
    it('[covers:use_filter_logic.monster_type_field_attr_state] モンスタータイプフィールドが有効な場合', () => {
      const attrState: AttributeState = { enabled: true };
      searchStore.exclusionResult.attributeStates.set('card-type_monster', attrState);

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isMonsterTypeFieldDisabled.value).toBe(false);
    });

    it('[covers:use_filter_logic.monster_type_field_attr_state] モンスタータイプフィールドが無効な場合', () => {
      const attrState: AttributeState = { enabled: false, disabledReason: '理由' };
      searchStore.exclusionResult.attributeStates.set('card-type_monster', attrState);

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isMonsterTypeFieldDisabled.value).toBe(true);
    });

    it('[covers:use_filter_logic.monster_type_field_fallback] cardTypeのフォールバックでモンスタータイプフィールドを判定する', () => {
      // searchStoreのフィルタを事前に設定
      const logic = useFilterLogic(pageLanguage);

      searchStore.searchFilters.cardType = null;
      expect(logic.isMonsterTypeFieldDisabled.value).toBe(false);
      searchStore.searchFilters.cardType = 'monster';
      expect(logic.isMonsterTypeFieldDisabled.value).toBe(false);
      searchStore.searchFilters.cardType = 'spell';
      expect(logic.isMonsterTypeFieldDisabled.value).toBe(true);
    });

    it('[covers:use_filter_logic.attribute_disabled_state] [covers:use_filter_logic.monster_type_attribute_disabled_precedence] 属性とモンスタータイプ属性の無効化を判定する', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.isAttributeDisabled('monster-type_fusion')).toBe(false);

      searchStore.exclusionResult.attributeStates.set('monster-type_fusion', { enabled: false });
      expect(logic.isAttributeDisabled('monster-type_fusion')).toBe(true);
      expect(logic.isMonsterTypeAttributeDisabled('fusion')).toBe(true);

      searchStore.exclusionResult.attributeStates.set('monster-type_fusion', { enabled: true });
      searchStore.searchFilters.cardType = 'spell';
      expect(logic.isMonsterTypeAttributeDisabled('fusion')).toBe(true);
    });

    it('[covers:use_filter_logic.disabled_reasons] [covers:use_filter_logic.monster_type_reason_precedence] 無効化理由を実装の優先順で返す', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.getFieldDisabledReason('attribute')).toBeUndefined();
      expect(logic.getAttributeDisabledReason('monster-type_fusion')).toBeUndefined();

      searchStore.exclusionResult.fieldStates.set('attribute', { enabled: false, disabledReason: 'field reason' });
      searchStore.exclusionResult.attributeStates.set('monster-type_fusion', { enabled: false, disabledReason: 'type reason' });
      expect(logic.getFieldDisabledReason('attribute')).toBe('field reason');
      expect(logic.getAttributeDisabledReason('monster-type_fusion')).toBe('type reason');
      expect(logic.getMonsterTypeDisabledReason('fusion')).toBe('type reason');

      searchStore.exclusionResult.attributeStates.delete('monster-type_fusion');
      searchStore.exclusionResult.attributeStates.set('card-type_monster', { enabled: false, disabledReason: 'card type reason' });
      expect(logic.getMonsterTypeDisabledReason('fusion')).toBe('card type reason');

      searchStore.exclusionResult.attributeStates.set('card-type_monster', { enabled: false });
      expect(logic.getMonsterTypeDisabledReason('fusion')).toBe('モンスターカードタイプが選択されていません');
    });

    it('[covers:use_filter_logic.tab_disabled_states] カードタイプタブの無効化をattributeStateから判定する', () => {
      searchStore.exclusionResult.attributeStates.set('card-type_monster', { enabled: false });
      searchStore.exclusionResult.attributeStates.set('card-type_spell', { enabled: false });
      searchStore.exclusionResult.attributeStates.set('card-type_trap', { enabled: false });
      const logic = useFilterLogic(pageLanguage);

      expect(logic.isMonsterTabDisabled.value).toBe(true);
      expect(logic.isSpellTabDisabled.value).toBe(true);
      expect(logic.isTrapTabDisabled.value).toBe(true);
    });

    it('[covers:use_filter_logic.tab_disabled_states] attributeState未登録のカードタイプタブは有効扱いになる', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.isMonsterTabDisabled.value).toBe(false);
      expect(logic.isSpellTabDisabled.value).toBe(false);
      expect(logic.isTrapTabDisabled.value).toBe(false);
    });
  });

  describe('属性フィルタ操作', () => {
    it('[covers:use_filter_logic.toggle_simple_arrays] 属性を追加できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.toggleAttribute('FIRE');

      expect(searchStore.searchFilters.attributes).toContain('FIRE');
    });

    it('[covers:use_filter_logic.toggle_simple_arrays] 属性を削除できる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.attributes = ['FIRE', 'WATER'];

      const logic = useFilterLogic(pageLanguage);

      logic.toggleAttribute('FIRE');

      expect(searchStore.searchFilters.attributes).not.toContain('FIRE');
      expect(searchStore.searchFilters.attributes).toContain('WATER');
    });

    it('[covers:use_filter_logic.toggle_simple_arrays] 魔法・罠・種族を追加削除できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.toggleSpellType('normal');
      logic.toggleTrapType('continuous');
      logic.toggleRace('Zombie');
      expect(searchStore.searchFilters.spellTypes).toEqual(['normal']);
      expect(searchStore.searchFilters.trapTypes).toEqual(['continuous']);
      expect(searchStore.searchFilters.races).toEqual(['Zombie']);

      logic.toggleSpellType('normal');
      logic.toggleTrapType('continuous');
      logic.toggleRace('Zombie');
      expect(searchStore.searchFilters.spellTypes).toEqual([]);
      expect(searchStore.searchFilters.trapTypes).toEqual([]);
      expect(searchStore.searchFilters.races).toEqual([]);
    });
  });

  describe('フィルタクリア', () => {
    it('[covers:use_filter_logic.clear_filters] 全てのフィルタをクリアできる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters = {
        cardType: 'monster',
        attributes: ['FIRE'],
        spellTypes: ['normal'],
        trapTypes: ['continuous'],
        races: ['Zombie'],
        monsterTypes: [{ type: 'fusion', state: 'normal' }],
        monsterTypeMatchMode: 'and',
        levelType: 'level',
        levelValues: [1, 2],
        linkValues: [2],
        scaleValues: [5],
        linkMarkers: [1],
        linkMarkerMatchMode: 'and',
        atk: { exact: true, unknown: false, min: 1000, max: 2000 },
        def: { exact: false, unknown: true },
        releaseDate: { from: '2020-01-01', to: '2020-12-31' }
      };

      const logic = useFilterLogic(pageLanguage);

      logic.clearFilters();

      expect(searchStore.searchFilters.cardType).toBeNull();
      expect(searchStore.searchFilters.attributes).toEqual([]);
      expect(searchStore.searchFilters.spellTypes).toEqual([]);
      expect(searchStore.searchFilters.trapTypes).toEqual([]);
      expect(searchStore.searchFilters.races).toEqual([]);
      expect(searchStore.searchFilters.monsterTypes).toEqual([]);
      expect(searchStore.searchFilters.levelValues).toEqual([]);
      expect(searchStore.searchFilters.linkValues).toEqual([]);
      expect(searchStore.searchFilters.scaleValues).toEqual([]);
      expect(searchStore.searchFilters.linkMarkers).toEqual([]);
      expect(searchStore.searchFilters.atk.exact).toBe(false);
      expect(searchStore.searchFilters.def.exact).toBe(false);
      expect(searchStore.searchFilters.releaseDate).toEqual({});
    });
  });

  describe('モンスタータイプ操作', () => {
    it('[covers:use_filter_logic.cycle_monster_type_state] モンスタータイプを追加できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.cycleMonsterTypeState('fusion');

      expect(searchStore.searchFilters.monsterTypes).toHaveLength(1);
      expect(searchStore.searchFilters.monsterTypes[0]).toEqual({ type: 'fusion', state: 'normal' });
    });

    it('[covers:use_filter_logic.get_monster_type_class] モンスタータイプのクラス取得ができる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.monsterTypes = [
        { type: 'fusion', state: 'normal' },
        { type: 'synchro', state: 'not' }
      ];

      const logic = useFilterLogic(pageLanguage);

      expect(logic.getMonsterTypeClass('fusion')).toBe('active');
      expect(logic.getMonsterTypeClass('synchro')).toBe('not');
      expect(logic.getMonsterTypeClass('xyz')).toBe('');
    });

    it('[covers:use_filter_logic.cycle_monster_type_state] モンスタータイプの状態を normal から not に切り替えられる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.monsterTypes = [{ type: 'fusion', state: 'normal' }];

      const logic = useFilterLogic(pageLanguage);

      logic.cycleMonsterTypeState('fusion');

      expect(searchStore.searchFilters.monsterTypes[0].state).toBe('not');
    });

    it('[covers:use_filter_logic.cycle_monster_type_state] モンスタータイプの状態を not から削除できる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.monsterTypes = [{ type: 'fusion', state: 'not' }];

      const logic = useFilterLogic(pageLanguage);

      logic.cycleMonsterTypeState('fusion');

      expect(searchStore.searchFilters.monsterTypes).toHaveLength(0);
    });

    it('[covers:use_filter_logic.toggle_match_modes] モンスタータイプのマッチモードを切り替えられる', () => {
      // Removed filtersRef initialization (now using searchStore)

      const logic = useFilterLogic(pageLanguage);

      logic.toggleMonsterTypeMatchMode();

      expect(searchStore.searchFilters.monsterTypeMatchMode).toBe('and');

      logic.toggleMonsterTypeMatchMode();

      expect(searchStore.searchFilters.monsterTypeMatchMode).toBe('or');
    });
  });

  describe('レベル値アクティブ判定', () => {
    it('[covers:use_filter_logic.level_value_active] levelType が level の場合、levelValues をチェック', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.levelType = 'level';
      searchStore.searchFilters.levelValues = [1, 3];

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isLevelValueActive(1)).toBe(true);
      expect(logic.isLevelValueActive(3)).toBe(true);
      expect(logic.isLevelValueActive(2)).toBe(false);
    });

    it('[covers:use_filter_logic.level_value_active] levelType が scale の場合、scaleValues をチェック', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.levelType = 'scale';
      searchStore.searchFilters.scaleValues = [3, 7];

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isLevelValueActive(3)).toBe(true);
      expect(logic.isLevelValueActive(7)).toBe(true);
      expect(logic.isLevelValueActive(5)).toBe(false);
    });
  });

  describe('レベル・リンク・スケール操作', () => {
    it('[covers:use_filter_logic.toggle_level_value] レベル値を追加・削除できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.toggleLevelValue(1);
      expect(searchStore.searchFilters.levelValues).toContain(1);

      logic.toggleLevelValue(1);
      expect(searchStore.searchFilters.levelValues).not.toContain(1);
    });

    it('[covers:use_filter_logic.toggle_level_value] スケール値を追加・削除できる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.levelType = 'scale';

      const logic = useFilterLogic(pageLanguage);

      logic.toggleLevelValue(5);
      expect(searchStore.searchFilters.scaleValues).toContain(5);

      logic.toggleLevelValue(5);
      expect(searchStore.searchFilters.scaleValues).not.toContain(5);
    });

    it('[covers:use_filter_logic.toggle_level_value] levelType が level の場合、toggleLevelValue は levelValues を変更', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.levelType = 'level';
      searchStore.searchFilters.scaleValues = [5];

      const logic = useFilterLogic(pageLanguage);

      logic.toggleLevelValue(1);

      expect(searchStore.searchFilters.levelValues).toContain(1);
      expect(searchStore.searchFilters.scaleValues).toEqual([5]); // scaleValues は変更されない
    });

    it('[covers:use_filter_logic.toggle_level_value] levelType が scale の場合、toggleLevelValue は scaleValues を変更', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.levelType = 'scale';

      const logic = useFilterLogic(pageLanguage);

      logic.toggleLevelValue(5);

      expect(searchStore.searchFilters.scaleValues).toContain(5);
      expect(searchStore.searchFilters.levelValues).toEqual([]); // levelValues は変更されない
    });

    it('[covers:use_filter_logic.toggle_link_value] リンク値を追加・削除できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.toggleLinkValue(2);
      expect(searchStore.searchFilters.linkValues).toContain(2);

      logic.toggleLinkValue(2);
      expect(searchStore.searchFilters.linkValues).not.toContain(2);
    });
  });

  describe('リンクマーカー操作', () => {
    it('[covers:use_filter_logic.toggle_link_marker] リンクマーカーを追加・削除できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.toggleLinkMarker(1);
      expect(searchStore.searchFilters.linkMarkers).toContain(1);

      logic.toggleLinkMarker(1);
      expect(searchStore.searchFilters.linkMarkers).not.toContain(1);
    });

    it('[covers:use_filter_logic.toggle_match_modes] リンクマーカーのマッチモードを切り替えられる', () => {
      // Removed filtersRef initialization (now using searchStore)

      const logic = useFilterLogic(pageLanguage);

      logic.toggleLinkMarkerMatchMode();
      expect(searchStore.searchFilters.linkMarkerMatchMode).toBe('and');

      logic.toggleLinkMarkerMatchMode();
      expect(searchStore.searchFilters.linkMarkerMatchMode).toBe('or');
    });

    it('[covers:use_filter_logic.link_marker_active] pos=5のリンクマーカーは常に非アクティブ', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.isLinkMarkerActive(5)).toBe(false);
    });

    it('[covers:use_filter_logic.toggle_link_marker] toggleLinkMarkerはpos=5も追加対象にする', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.toggleLinkMarker(5);

      expect(searchStore.searchFilters.linkMarkers).toEqual([5]);
      expect(logic.isLinkMarkerActive(5)).toBe(false);
    });
  });

  describe('フィールド無効化判定', () => {
    it('[covers:use_filter_logic.field_disabled_card_type_fallback] モンスター以外が選択された時、モンスター専用フィールドは無効', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'spell';

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isFieldDisabled('attribute')).toBe(true);
      expect(logic.isFieldDisabled('race')).toBe(true);
      expect(logic.isFieldDisabled('level-rank')).toBe(true);
    });

    it('[covers:use_filter_logic.field_disabled_card_type_fallback] モンスターが選択された時、モンスター専用フィールドは有効', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'monster';

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isFieldDisabled('attribute')).toBe(false);
      expect(logic.isFieldDisabled('race')).toBe(false);
    });

    it('[covers:use_filter_logic.field_disabled_card_type_fallback] 魔法以外が選択された時、魔法タイプフィールドは無効', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'trap';

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isFieldDisabled('spell-type')).toBe(true);
    });

    it('[covers:use_filter_logic.field_disabled_state_precedence] fieldStateがある場合はcardType推論よりfieldStateを優先する', () => {
      searchStore.searchFilters.cardType = 'spell';
      searchStore.exclusionResult.fieldStates.set('attribute', { enabled: true });
      searchStore.exclusionResult.fieldStates.set('spell-type', { enabled: false });

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isFieldDisabled('attribute')).toBe(false);
      expect(logic.isFieldDisabled('spell-type')).toBe(true);
    });

    it('[covers:use_filter_logic.field_disabled_card_type_fallback] cardTypeがnullまたは専用外フィールドの場合は無効にしない', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.isFieldDisabled('attribute')).toBe(false);
      searchStore.searchFilters.cardType = 'monster';
      expect(logic.isFieldDisabled('spell-type')).toBe(true);
      expect(logic.isFieldDisabled('trap-type')).toBe(true);
      expect(logic.isFieldDisabled('free-word')).toBe(false);
    });
  });

  describe('リンクマーカーアクティブ判定', () => {
    it('[covers:use_filter_logic.link_marker_active] pos=5のリンクマーカーは常に非アクティブ（既テスト）', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.isLinkMarkerActive(5)).toBe(false);
    });

    it('[covers:use_filter_logic.link_marker_active] pos≠5でリンクマーカーが追加されている場合はアクティブ', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.linkMarkers = [1, 3];

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isLinkMarkerActive(1)).toBe(true);
      expect(logic.isLinkMarkerActive(3)).toBe(true);
      expect(logic.isLinkMarkerActive(7)).toBe(false);
      expect(logic.isLinkMarkerActive(2)).toBe(false);
    });
  });

  describe('レベルタイプ設定', () => {
    it('[covers:use_filter_logic.set_level_type] レベルタイプをスケールに変更できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.setLevelType('scale');

      expect(searchStore.searchFilters.levelType).toBe('scale');
    });

    it('[covers:use_filter_logic.set_level_type] レベルタイプをリンクに変更できる', () => {
      const logic = useFilterLogic(pageLanguage);
      searchStore.searchFilters.levelValues = [4];
      searchStore.searchFilters.linkValues = [2];
      searchStore.searchFilters.scaleValues = [8];

      logic.setLevelType('link');

      expect(searchStore.searchFilters.levelType).toBe('link');
      expect(searchStore.searchFilters.levelValues).toEqual([4]);
      expect(searchStore.searchFilters.linkValues).toEqual([2]);
      expect(searchStore.searchFilters.scaleValues).toEqual([8]);
    });
  });

  describe('アクティブフィルタ表示', () => {
    it('[covers:use_filter_logic.has_active_filters] フィルタがない場合、hasActiveFilters は false', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.hasActiveFilters.value).toBe(false);
      expect(logic.activeConditionChips.value).toEqual([]);
    });

    it('[covers:use_filter_logic.active_condition_chips] [covers:use_filter_logic.has_active_filters] cardType が設定されている場合、activeConditionChips に含まれる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'monster';

      const logic = useFilterLogic(pageLanguage);

      expect(logic.hasActiveFilters.value).toBe(true);
      expect(logic.activeConditionChips.value).toContain('モンスター');
    });

    it('[covers:use_filter_logic.active_condition_chips] 複数のフィルタが設定されている場合、全て activeConditionChips に含まれる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'monster';
      searchStore.searchFilters.attributes = ['FIRE', 'WATER'];
      searchStore.searchFilters.races = ['Dragon'];

      const logic = useFilterLogic(pageLanguage);

      expect(logic.hasActiveFilters.value).toBe(true);
      expect(logic.activeConditionChips.value).toContain('モンスター');
      expect(logic.activeConditionChips.value).toContain('属性:2件');
      expect(logic.activeConditionChips.value).toContain('種族:1件');
    });

    it('[covers:use_filter_logic.active_condition_chips] 件数・リンクマーカー・ATK/DEF・発売日条件を実装順で表示する', () => {
      searchStore.searchFilters = {
        ...searchStore.searchFilters,
        cardType: 'trap',
        attributes: ['FIRE'],
        spellTypes: ['normal'],
        trapTypes: ['continuous'],
        races: ['Dragon'],
        monsterTypes: [{ type: 'fusion', state: 'not' }],
        levelValues: [1, 2],
        linkValues: [3],
        scaleValues: [4],
        linkMarkers: [1, 6],
        atk: { exact: false, unknown: false, min: 1000 },
        def: { exact: false, unknown: true },
        releaseDate: { from: '2020-01-01' }
      };
      const logic = useFilterLogic(pageLanguage);

      expect(logic.activeConditionChips.value).toEqual([
        '罠',
        '属性:1件',
        '魔法:1件',
        '罠:1件',
        '種族:1件',
        'タイプ:1件',
        'レベル:2件',
        'リンク数:1件',
        'Pスケール:1件',
        formatLinkMarkerLabel([1, 6]),
        'ATK指定',
        'DEF指定',
        '発売日指定'
      ]);
    });
  });

  describe('チップ表示computed', () => {
    it('[covers:use_filter_logic.selected_label_chips] ラベル系チップを各変換関数と同じ値で返す', () => {
      searchStore.searchFilters.attributes = ['FIRE'];
      searchStore.searchFilters.spellTypes = ['normal'];
      searchStore.searchFilters.trapTypes = ['continuous'];
      searchStore.searchFilters.races = ['Dragon'];
      searchStore.searchFilters.monsterTypes = [
        { type: 'fusion', state: 'normal' },
        { type: 'synchro', state: 'not' }
      ];
      const logic = useFilterLogic(pageLanguage);

      expect(logic.selectedAttributeChips.value).toEqual([getAttributeLabel('FIRE', pageLanguage.value)]);
      expect(logic.selectedSpellTypeChips.value).toEqual([getSpellTypeLabel('normal')]);
      expect(logic.selectedTrapTypeChips.value).toEqual([getTrapTypeLabel('continuous')]);
      expect(logic.selectedRaceChips.value).toEqual([getRaceLabel('Dragon')]);
      expect(logic.selectedMonsterTypeChips.value).toEqual([
        getMonsterTypeLabel('fusion'),
        `N-${getMonsterTypeLabel('synchro')}`
      ]);
    });

    it('[covers:use_filter_logic.selected_number_chips] 数値・リンクマーカーチップを空または整形ラベルで返す', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.selectedLevelChips.value).toEqual([]);
      expect(logic.selectedScaleChips.value).toEqual([]);
      expect(logic.selectedLinkChips.value).toEqual([]);

      searchStore.searchFilters.levelValues = [3, 1, 2];
      searchStore.searchFilters.linkValues = [2];
      searchStore.searchFilters.scaleValues = [1, 3];
      searchStore.searchFilters.linkMarkers = [1, 6];

      expect(logic.selectedLevelChips.value).toEqual([formatNumberRange([3, 1, 2], '★')]);
      expect(logic.selectedScaleChips.value).toEqual([formatNumberRange([1, 3], 'PS')]);
      expect(logic.selectedLinkChips.value).toEqual([
        formatNumberRange([2], 'L'),
        formatLinkMarkerLabel([1, 6])
      ]);
    });

    it('[covers:use_filter_logic.selected_stat_chips] [covers:use_filter_logic.header_filter_icons_delegates] ステータスチップとヘッダーアイコンを返す', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.selectedAtkChips.value).toEqual([]);
      expect(logic.selectedDefChips.value).toEqual([]);

      searchStore.searchFilters.cardType = 'monster';
      searchStore.searchFilters.attributes = ['FIRE'];
      searchStore.searchFilters.atk = { exact: true, unknown: false, min: 1000 };
      searchStore.searchFilters.def = { exact: false, unknown: true };

      expect(logic.selectedAtkChips.value).toEqual([formatStatLabel('ATK', searchStore.searchFilters.atk)]);
      expect(logic.selectedDefChips.value).toEqual([formatStatLabel('DEF', searchStore.searchFilters.def)]);
      expect(logic.headerFilterIcons.value).toEqual(convertFiltersToIcons(searchStore.searchFilters));
    });
  });

  describe('ステータスフィルタ操作', () => {
    it('[covers:use_filter_logic.get_stat_filter] getStatFilterはstore内の同一オブジェクトを返す', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.getStatFilter('atk')).toBe(searchStore.searchFilters.atk);
      expect(logic.getStatFilter('def')).toBe(searchStore.searchFilters.def);
    });

    it('[covers:use_filter_logic.toggle_stat_exact_on] [covers:use_filter_logic.toggle_stat_exact_off] exactを切り替える', () => {
      searchStore.searchFilters.atk = { exact: false, unknown: true, min: 1000 };
      const logic = useFilterLogic(pageLanguage);

      logic.toggleStatExact('atk');
      expect(searchStore.searchFilters.atk).toEqual({ exact: true, unknown: false, min: 1000, max: 1000 });

      logic.toggleStatExact('atk');
      expect(searchStore.searchFilters.atk).toEqual({ exact: false, unknown: false, min: 1000, max: 1000 });
    });

    it('[covers:use_filter_logic.toggle_stat_unknown_on] [covers:use_filter_logic.toggle_stat_unknown_off] unknownを切り替える', () => {
      searchStore.searchFilters.def = { exact: true, unknown: false, min: 500, max: 1000 };
      const logic = useFilterLogic(pageLanguage);

      logic.toggleStatUnknown('def');
      expect(searchStore.searchFilters.def).toEqual({ exact: false, unknown: true, min: undefined, max: undefined });

      logic.toggleStatUnknown('def');
      expect(searchStore.searchFilters.def).toEqual({ exact: false, unknown: false, min: undefined, max: undefined });
    });

    it('[covers:use_filter_logic.validate_stat_empty] [covers:use_filter_logic.validate_stat_sanitize] [covers:use_filter_logic.validate_stat_exact_min_sync] 入力値をtrim/sanitizeしてstoreへ反映する', () => {
      const logic = useFilterLogic(pageLanguage);

      const emptyInput = { value: '   ' } as HTMLInputElement;
      searchStore.searchFilters.atk.min = 1000;
      logic.validateStatInput({ target: emptyInput } as unknown as Event, 'atk', 'min');
      expect(searchStore.searchFilters.atk.min).toBeUndefined();
      expect(emptyInput.value).toBe('   ');

      const sanitizedInput = { value: '12a3' } as HTMLInputElement;
      logic.validateStatInput({ target: sanitizedInput } as unknown as Event, 'atk', 'max');
      expect(sanitizedInput.value).toBe('123');
      expect(searchStore.searchFilters.atk.max).toBe(123);

      const nonDigitInput = { value: 'abc' } as HTMLInputElement;
      logic.validateStatInput({ target: nonDigitInput } as unknown as Event, 'def', 'min');
      expect(nonDigitInput.value).toBe('');
      expect(searchStore.searchFilters.def.min).toBeUndefined();

      searchStore.searchFilters.atk.exact = true;
      const exactInput = { value: '1500' } as HTMLInputElement;
      logic.validateStatInput({ target: exactInput } as unknown as Event, 'atk', 'min');
      expect(searchStore.searchFilters.atk.min).toBe(1500);
      expect(searchStore.searchFilters.atk.max).toBe(1500);
    });
  });
});
