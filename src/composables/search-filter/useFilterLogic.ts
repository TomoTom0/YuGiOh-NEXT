import { computed } from 'vue';
import type { Attribute, Race, MonsterType, CardType, SpellEffectType, TrapEffectType } from '@/types/card';
import { getAttributeLabel, getSpellTypeLabel, getTrapTypeLabel, getRaceLabel, getMonsterTypeLabel } from '@/utils/filter-label';
import { formatStatLabel, formatNumberRange, formatLinkMarkerLabel } from '@/utils/filter-chip-formatter';
import { convertFiltersToIcons } from '@/utils/filter-icons';
import { useSearchStore } from '@/stores/search';

/**
 * SearchFilterDialog のフィルタロジックを抽出した Composable
 *
 * 責務:
 * - フィルタの選択・解除ロジック
 * - 無効化状態の判定
 * - チップ表示用の computed
 */
export function useFilterLogic(
<<<<<<< HEAD
=======
  filters: Reactive<SearchFilters>,
  exclusionResult: { value: ExclusionResult },
>>>>>>> origin/dev-new
  pageLanguage: { value: string }
) {
  const searchStore = useSearchStore();
  const exclusionResult = computed(() => searchStore.exclusionResult);
  // ===== 無効化状態の判定 =====

  /**
   * モンスタータイプ関連フィールドの無効化状態
   */
  const isMonsterTypeFieldDisabled = computed(() => {
    const attrState = exclusionResult.value.attributeStates.get('card-type_monster');
    if (attrState) {
      return !attrState.enabled;
    }
    // フォールバック: cardTypeがmonster以外の場合は無効
    return searchStore.searchFilters.cardType !== null && searchStore.searchFilters.cardType !== 'monster';
  });

  /**
   * 属性IDが無効化されているか判定
   */
  function isAttributeDisabled(attrId: string): boolean {
    const attrState = exclusionResult.value.attributeStates.get(attrId);
    return attrState ? !attrState.enabled : false;
  }

  /**
   * モンスタータイプ属性が無効化されているか判定
   */
  function isMonsterTypeAttributeDisabled(type: MonsterType): boolean {
    const attrId = `monster-type_${type}`;
    // 推論エンジンの結果で無効化されているか
    if (isAttributeDisabled(attrId)) {
      return true;
    }
    // フィールド全体が無効化されているか
    return isMonsterTypeFieldDisabled.value;
  }

  /**
   * 無効化理由をそのまま返す（排外エンジンで既に日本語フォーマット済み）
   */
  function formatDisabledReason(reason: string | undefined): string | undefined {
    return reason;
  }

  /**
   * フィールドの無効化理由を取得
   */
  function getFieldDisabledReason(field: string): string | undefined {
    const fieldState = exclusionResult.value.fieldStates.get(field);
    return formatDisabledReason(fieldState?.disabledReason);
  }

  /**
   * 属性の無効化理由を取得
   */
  function getAttributeDisabledReason(attrId: string): string | undefined {
    const attrState = exclusionResult.value.attributeStates.get(attrId);
    return formatDisabledReason(attrState?.disabledReason);
  }

  /**
   * モンスタータイプ属性の無効化理由を取得
   */
  function getMonsterTypeDisabledReason(type: MonsterType): string | undefined {
    const attrId = `monster-type_${type}`;
    const attrReason = getAttributeDisabledReason(attrId);
    if (attrReason) {
      return attrReason;
    }
    // フィールド全体が無効化されている場合
    if (isMonsterTypeFieldDisabled.value) {
      const cardTypeReason = getAttributeDisabledReason('card-type_monster');
      return cardTypeReason || 'モンスターカードタイプが選択されていません';
    }
    return undefined;
  }

  /**
   * タブボタンの disabled 状態（推論エンジンの結果から計算）
   */
  const isMonsterTabDisabled = computed(() => {
    const attrState = exclusionResult.value.attributeStates.get('card-type_monster');
    return attrState ? !attrState.enabled : false;
  });

  const isSpellTabDisabled = computed(() => {
    const attrState = exclusionResult.value.attributeStates.get('card-type_spell');
    return attrState ? !attrState.enabled : false;
  });

  const isTrapTabDisabled = computed(() => {
    const attrState = exclusionResult.value.attributeStates.get('card-type_trap');
    return attrState ? !attrState.enabled : false;
  });

  /**
   * 各フィールドのdisabled状態を計算
   */
  function isFieldDisabled(field: string): boolean {
    const fieldState = exclusionResult.value.fieldStates.get(field);
    if (fieldState) {
      return !fieldState.enabled;
    }
    // フィールドが存在しない場合は、card-typeから推論
    if (searchStore.searchFilters.cardType !== null) {
      // monsterカードタイプ専用フィールド
      const monsterOnlyFields = ['attribute', 'race', 'level-rank', 'link-value', 'link-marker', 'p-scale', 'atk', 'def'];
      if (monsterOnlyFields.includes(field) && searchStore.searchFilters.cardType !== 'monster') {
        return true;
      }
      // spellカードタイプ専用フィールド
      if (field === 'spell-type' && searchStore.searchFilters.cardType !== 'spell') {
        return true;
      }
      // trapカードタイプ専用フィールド
      if (field === 'trap-type' && searchStore.searchFilters.cardType !== 'trap') {
        return true;
      }
    }
    return false;
  }

  // ===== チップ表示用の computed =====

  const selectedAttributeChips = computed(() => {
    return searchStore.searchFilters.attributes.map(attr => getAttributeLabel(attr, pageLanguage.value));
  });

  const selectedSpellTypeChips = computed(() => {
    return searchStore.searchFilters.spellTypes.map(type => getSpellTypeLabel(type));
  });

  const selectedTrapTypeChips = computed(() => {
    return searchStore.searchFilters.trapTypes.map(type => getTrapTypeLabel(type));
  });

  const selectedRaceChips = computed(() => {
    return searchStore.searchFilters.races.map(race => getRaceLabel(race));
  });

  const selectedMonsterTypeChips = computed(() => {
    return searchStore.searchFilters.monsterTypes.map(mt => {
      const label = getMonsterTypeLabel(mt.type);
      return mt.state === 'not' ? `N-${label}` : label;
    });
  });

  const selectedLevelChips = computed(() => {
    if (searchStore.searchFilters.levelValues.length === 0) return [];
    const label = formatNumberRange(searchStore.searchFilters.levelValues, '★');
    return label ? [label] : [];
  });

  const selectedLinkChips = computed(() => {
    const chips: string[] = [];
    if (searchStore.searchFilters.linkValues.length > 0) {
      const label = formatNumberRange(searchStore.searchFilters.linkValues, 'L');
      if (label) chips.push(label);
    }
    const linkMarkerLabel = formatLinkMarkerLabel(searchStore.searchFilters.linkMarkers);
    if (linkMarkerLabel) {
      chips.push(linkMarkerLabel);
    }
    return chips;
  });

  const selectedScaleChips = computed(() => {
    if (searchStore.searchFilters.scaleValues.length === 0) return [];
    const label = formatNumberRange(searchStore.searchFilters.scaleValues, 'PS');
    return label ? [label] : [];
  });

  const selectedAtkChips = computed(() => {
    const label = formatStatLabel('ATK', searchStore.searchFilters.atk);
    return label ? [label] : [];
  });

  const selectedDefChips = computed(() => {
    const label = formatStatLabel('DEF', searchStore.searchFilters.def);
    return label ? [label] : [];
  });

  const headerFilterIcons = computed(() => {
    return convertFiltersToIcons(searchStore.searchFilters);
  });

  const activeConditionChips = computed(() => {
    const chips: string[] = [];
    if (searchStore.searchFilters.cardType) {
      const typeLabel = { monster: 'モンスター', spell: '魔法', trap: '罠' }[searchStore.searchFilters.cardType];
      chips.push(typeLabel);
    }
    if (searchStore.searchFilters.attributes.length > 0) chips.push(`属性:${searchStore.searchFilters.attributes.length}件`);
    if (searchStore.searchFilters.spellTypes.length > 0) chips.push(`魔法:${searchStore.searchFilters.spellTypes.length}件`);
    if (searchStore.searchFilters.trapTypes.length > 0) chips.push(`罠:${searchStore.searchFilters.trapTypes.length}件`);
    if (searchStore.searchFilters.races.length > 0) chips.push(`種族:${searchStore.searchFilters.races.length}件`);
    if (searchStore.searchFilters.monsterTypes.length > 0) chips.push(`タイプ:${searchStore.searchFilters.monsterTypes.length}件`);
    if (searchStore.searchFilters.levelValues.length > 0) chips.push(`レベル:${searchStore.searchFilters.levelValues.length}件`);
    if (searchStore.searchFilters.linkValues.length > 0) chips.push(`リンク数:${searchStore.searchFilters.linkValues.length}件`);
    if (searchStore.searchFilters.scaleValues.length > 0) chips.push(`Pスケール:${searchStore.searchFilters.scaleValues.length}件`);
    const linkMarkerLabel = formatLinkMarkerLabel(searchStore.searchFilters.linkMarkers);
    if (linkMarkerLabel) {
      chips.push(linkMarkerLabel);
    }
    if (searchStore.searchFilters.atk.exact || searchStore.searchFilters.atk.unknown || searchStore.searchFilters.atk.min !== undefined || searchStore.searchFilters.atk.max !== undefined) {
      chips.push('ATK指定');
    }
    if (searchStore.searchFilters.def.exact || searchStore.searchFilters.def.unknown || searchStore.searchFilters.def.min !== undefined || searchStore.searchFilters.def.max !== undefined) {
      chips.push('DEF指定');
    }
    if (searchStore.searchFilters.releaseDate.from || searchStore.searchFilters.releaseDate.to) chips.push('発売日指定');
    return chips;
  });

  const hasActiveFilters = computed(() => activeConditionChips.value.length > 0);

  // ===== フィルタ操作関数 =====

  function getStatFilter(stat: 'atk' | 'def') {
    return searchStore.searchFilters[stat];
  }

  function toggleStatExact(stat: 'atk' | 'def') {
    searchStore.searchFilters[stat].exact = !searchStore.searchFilters[stat].exact;
    if (searchStore.searchFilters[stat].exact) {
      searchStore.searchFilters[stat].unknown = false;
      if (searchStore.searchFilters[stat].min !== undefined) {
        searchStore.searchFilters[stat].max = searchStore.searchFilters[stat].min;
      }
    }
  }

  function toggleStatUnknown(stat: 'atk' | 'def') {
    searchStore.searchFilters[stat].unknown = !searchStore.searchFilters[stat].unknown;
    if (searchStore.searchFilters[stat].unknown) {
      searchStore.searchFilters[stat].exact = false;
      searchStore.searchFilters[stat].min = undefined;
      searchStore.searchFilters[stat].max = undefined;
    }
  }

  function validateStatInput(event: Event, stat: 'atk' | 'def', field: 'min' | 'max') {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();

    // 空文字列は許可
    if (value === '') {
<<<<<<< HEAD
      searchStore.searchFilters[stat][field] = undefined;
=======
      filters[stat][field] = undefined;
>>>>>>> origin/dev-new
        return;
    }

    // 非負整数のみ許可（数字以外の文字を削除）
    const sanitized = value.replace(/[^\d]/g, '');

    if (sanitized !== value) {
      // 不正な文字があった場合、サニタイズした値をセット
      input.value = sanitized;
    }

    // 数値に変換
    if (sanitized !== '') {
      const numValue = parseInt(sanitized, 10);
      searchStore.searchFilters[stat][field] = numValue;

      // exactモードの場合は両方を同期
      if (searchStore.searchFilters[stat].exact && field === 'min') {
        searchStore.searchFilters[stat].max = numValue;
      }
    } else {
      searchStore.searchFilters[stat][field] = undefined;
    }

  }

  function selectCardType(type: CardType) {
    if (searchStore.searchFilters.cardType === type) {
      searchStore.searchFilters.cardType = null;
    } else {
      searchStore.searchFilters.cardType = type;
      if (type !== 'monster') {
        searchStore.searchFilters.attributes = [];
        searchStore.searchFilters.races = [];
        searchStore.searchFilters.monsterTypes = [];
        searchStore.searchFilters.levelValues = [];
        searchStore.searchFilters.linkValues = [];
        searchStore.searchFilters.scaleValues = [];
        searchStore.searchFilters.linkMarkers = [];
        searchStore.searchFilters.atk = { exact: false, unknown: false };
        searchStore.searchFilters.def = { exact: false, unknown: false };
      }
      if (type !== 'spell') {
        searchStore.searchFilters.spellTypes = [];
      }
      if (type !== 'trap') {
        searchStore.searchFilters.trapTypes = [];
      }
    }
  }

  function toggleAttribute(attr: Attribute) {
    const index = searchStore.searchFilters.attributes.indexOf(attr);
    if (index >= 0) {
      searchStore.searchFilters.attributes.splice(index, 1);
    } else {
      searchStore.searchFilters.attributes.push(attr);
    }
  }

  function toggleSpellType(type: SpellEffectType) {
    const index = searchStore.searchFilters.spellTypes.indexOf(type);
    if (index >= 0) {
      searchStore.searchFilters.spellTypes.splice(index, 1);
    } else {
      searchStore.searchFilters.spellTypes.push(type);
    }
  }

  function toggleTrapType(type: TrapEffectType) {
    const index = searchStore.searchFilters.trapTypes.indexOf(type);
    if (index >= 0) {
      searchStore.searchFilters.trapTypes.splice(index, 1);
    } else {
      searchStore.searchFilters.trapTypes.push(type);
    }
  }

  function toggleRace(race: Race) {
    const index = searchStore.searchFilters.races.indexOf(race);
    if (index >= 0) {
      searchStore.searchFilters.races.splice(index, 1);
    } else {
      searchStore.searchFilters.races.push(race);
    }
  }

  function getMonsterTypeClass(type: MonsterType) {
    const item = searchStore.searchFilters.monsterTypes.find(t => t.type === type);
    if (!item) return '';
    return item.state === 'normal' ? 'active' : 'not';
  }

  function cycleMonsterTypeState(type: MonsterType) {
    const index = searchStore.searchFilters.monsterTypes.findIndex(t => t.type === type);
    if (index >= 0) {
      const current = searchStore.searchFilters.monsterTypes[index];
      if (current) {
        if (current.state === 'normal') {
          current.state = 'not';
        } else {
          searchStore.searchFilters.monsterTypes.splice(index, 1);
        }
      }
    } else {
      searchStore.searchFilters.monsterTypes.push({ type, state: 'normal' });
    }
  }

  function toggleMonsterTypeMatchMode() {
<<<<<<< HEAD
    searchStore.searchFilters.monsterTypeMatchMode = searchStore.searchFilters.monsterTypeMatchMode === 'and' ? 'or' : 'and';
  }

  function toggleLinkMarkerMatchMode() {
    searchStore.searchFilters.linkMarkerMatchMode = searchStore.searchFilters.linkMarkerMatchMode === 'and' ? 'or' : 'and';
=======
    filters.monsterTypeMatchMode = filters.monsterTypeMatchMode === 'and' ? 'or' : 'and';
  }

  function toggleLinkMarkerMatchMode() {
    filters.linkMarkerMatchMode = filters.linkMarkerMatchMode === 'and' ? 'or' : 'and';
>>>>>>> origin/dev-new
  }

  function isLevelValueActive(num: number): boolean {
    if (searchStore.searchFilters.levelType === 'level') {
      return searchStore.searchFilters.levelValues.includes(num);
    } else {
      return searchStore.searchFilters.scaleValues.includes(num);
    }
  }

  function toggleLevelValue(num: number) {
    if (searchStore.searchFilters.levelType === 'level') {
      const index = searchStore.searchFilters.levelValues.indexOf(num);
      if (index >= 0) {
        searchStore.searchFilters.levelValues.splice(index, 1);
      } else {
        searchStore.searchFilters.levelValues.push(num);
      }
    } else {
      const index = searchStore.searchFilters.scaleValues.indexOf(num);
      if (index >= 0) {
        searchStore.searchFilters.scaleValues.splice(index, 1);
      } else {
        searchStore.searchFilters.scaleValues.push(num);
      }
    }
  }

  function toggleLinkValue(num: number) {
    const index = searchStore.searchFilters.linkValues.indexOf(num);
    if (index >= 0) {
      searchStore.searchFilters.linkValues.splice(index, 1);
    } else {
      searchStore.searchFilters.linkValues.push(num);
    }
  }

  function isLinkMarkerActive(pos: number): boolean {
    if (pos === 5) return false;
    return searchStore.searchFilters.linkMarkers.includes(pos);
  }

  function toggleLinkMarker(pos: number) {
    const index = searchStore.searchFilters.linkMarkers.indexOf(pos);
    if (index >= 0) {
      searchStore.searchFilters.linkMarkers.splice(index, 1);
    } else {
      searchStore.searchFilters.linkMarkers.push(pos);
    }
  }

  function setLevelType(levelType: 'level' | 'link' | 'scale') {
<<<<<<< HEAD
    searchStore.searchFilters.levelType = levelType;
  }

  function clearFilters() {
    const searchStore = useSearchStore();
    searchStore.clearAllFilters();
=======
    filters.levelType = levelType;
  }

  function clearFilters() {
    filters.cardType = null;
    filters.attributes = [];
    filters.spellTypes = [];
    filters.trapTypes = [];
    filters.races = [];
    filters.monsterTypes = [];
    filters.monsterTypeMatchMode = 'or';
    filters.levelType = 'level';
    filters.levelValues = [];
    filters.linkValues = [];
    filters.scaleValues = [];
    filters.linkMarkers = [];
    filters.linkMarkerMatchMode = 'or';
    filters.atk = { exact: false, unknown: false };
    filters.def = { exact: false, unknown: false };
    filters.releaseDate = {};
>>>>>>> origin/dev-new
  }

  return {
    // 無効化状態
    isMonsterTypeFieldDisabled,
    isAttributeDisabled,
    isMonsterTypeAttributeDisabled,
    getFieldDisabledReason,
    getAttributeDisabledReason,
    getMonsterTypeDisabledReason,
    isMonsterTabDisabled,
    isSpellTabDisabled,
    isTrapTabDisabled,
    isFieldDisabled,
    // チップ表示
    selectedAttributeChips,
    selectedSpellTypeChips,
    selectedTrapTypeChips,
    selectedRaceChips,
    selectedMonsterTypeChips,
    selectedLevelChips,
    selectedLinkChips,
    selectedScaleChips,
    selectedAtkChips,
    selectedDefChips,
    headerFilterIcons,
    activeConditionChips,
    hasActiveFilters,
    // フィルタ操作
    getStatFilter,
    toggleStatExact,
    toggleStatUnknown,
    validateStatInput,
    selectCardType,
    toggleAttribute,
    toggleSpellType,
    toggleTrapType,
    toggleRace,
    getMonsterTypeClass,
    cycleMonsterTypeState,
    toggleMonsterTypeMatchMode,
    toggleLinkMarkerMatchMode,
    isLevelValueActive,
    toggleLevelValue,
    toggleLinkValue,
    isLinkMarkerActive,
    toggleLinkMarker,
    setLevelType,
    clearFilters,
  };
}
