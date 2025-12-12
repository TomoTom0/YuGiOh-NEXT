import { computed, type Reactive } from 'vue';
import type { Attribute, Race, MonsterType, CardType, SpellEffectType, TrapEffectType } from '@/types/card';
import type { SearchFilters } from '@/types/search-filters';
import type { ExclusionResult } from '@/types/search-exclusion';
import { getAttributeLabel, getSpellTypeLabel, getTrapTypeLabel, getRaceLabel, getMonsterTypeLabel } from '@/utils/filter-label';
import { formatStatLabel, formatNumberRange, formatLinkMarkerLabel } from '@/utils/filter-chip-formatter';
import { convertFiltersToIcons } from '@/utils/filter-icons';

/**
 * SearchFilterDialog のフィルタロジックを抽出した Composable
 *
 * 責務:
 * - フィルタの選択・解除ロジック
 * - 無効化状態の判定
 * - チップ表示用の computed
 */
export function useFilterLogic(
  filters: Reactive<SearchFilters>,
  exclusionResult: { value: ExclusionResult },
  pageLanguage: { value: string }
) {
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
    return filters.cardType !== null && filters.cardType !== 'monster';
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
    if (filters.cardType !== null) {
      // monsterカードタイプ専用フィールド
      const monsterOnlyFields = ['attribute', 'race', 'level-rank', 'link-value', 'link-marker', 'p-scale', 'atk', 'def'];
      if (monsterOnlyFields.includes(field) && filters.cardType !== 'monster') {
        return true;
      }
      // spellカードタイプ専用フィールド
      if (field === 'spell-type' && filters.cardType !== 'spell') {
        return true;
      }
      // trapカードタイプ専用フィールド
      if (field === 'trap-type' && filters.cardType !== 'trap') {
        return true;
      }
    }
    return false;
  }

  // ===== チップ表示用の computed =====

  const selectedAttributeChips = computed(() => {
    return filters.attributes.map(attr => getAttributeLabel(attr, pageLanguage.value));
  });

  const selectedSpellTypeChips = computed(() => {
    return filters.spellTypes.map(type => getSpellTypeLabel(type));
  });

  const selectedTrapTypeChips = computed(() => {
    return filters.trapTypes.map(type => getTrapTypeLabel(type));
  });

  const selectedRaceChips = computed(() => {
    return filters.races.map(race => getRaceLabel(race));
  });

  const selectedMonsterTypeChips = computed(() => {
    return filters.monsterTypes.map(mt => {
      const label = getMonsterTypeLabel(mt.type);
      return mt.state === 'not' ? `N-${label}` : label;
    });
  });

  const selectedLevelChips = computed(() => {
    if (filters.levelValues.length === 0) return [];
    return [formatNumberRange(filters.levelValues, '★')];
  });

  const selectedLinkChips = computed(() => {
    const chips: string[] = [];
    if (filters.linkValues.length > 0) {
      chips.push(formatNumberRange(filters.linkValues, 'L'));
    }
    const linkMarkerLabel = formatLinkMarkerLabel(filters.linkMarkers);
    if (linkMarkerLabel) {
      chips.push(linkMarkerLabel);
    }
    return chips;
  });

  const selectedScaleChips = computed(() => {
    if (filters.scaleValues.length === 0) return [];
    return [formatNumberRange(filters.scaleValues, 'PS')];
  });

  const selectedAtkChips = computed(() => {
    const label = formatStatLabel('ATK', filters.atk);
    return label ? [label] : [];
  });

  const selectedDefChips = computed(() => {
    const label = formatStatLabel('DEF', filters.def);
    return label ? [label] : [];
  });

  const headerFilterIcons = computed(() => {
    return convertFiltersToIcons(filters);
  });

  const activeConditionChips = computed(() => {
    const chips: string[] = [];
    if (filters.cardType) {
      const typeLabel = { monster: 'モンスター', spell: '魔法', trap: '罠' }[filters.cardType];
      chips.push(typeLabel);
    }
    if (filters.attributes.length > 0) chips.push(`属性:${filters.attributes.length}件`);
    if (filters.spellTypes.length > 0) chips.push(`魔法:${filters.spellTypes.length}件`);
    if (filters.trapTypes.length > 0) chips.push(`罠:${filters.trapTypes.length}件`);
    if (filters.races.length > 0) chips.push(`種族:${filters.races.length}件`);
    if (filters.monsterTypes.length > 0) chips.push(`タイプ:${filters.monsterTypes.length}件`);
    if (filters.levelValues.length > 0) chips.push(`レベル:${filters.levelValues.length}件`);
    if (filters.linkValues.length > 0) chips.push(`リンク数:${filters.linkValues.length}件`);
    if (filters.scaleValues.length > 0) chips.push(`Pスケール:${filters.scaleValues.length}件`);
    const linkMarkerLabel = formatLinkMarkerLabel(filters.linkMarkers);
    if (linkMarkerLabel) {
      chips.push(linkMarkerLabel);
    }
    if (filters.atk.exact || filters.atk.unknown || filters.atk.min !== undefined || filters.atk.max !== undefined) {
      chips.push('ATK指定');
    }
    if (filters.def.exact || filters.def.unknown || filters.def.min !== undefined || filters.def.max !== undefined) {
      chips.push('DEF指定');
    }
    if (filters.releaseDate.from || filters.releaseDate.to) chips.push('発売日指定');
    return chips;
  });

  const hasActiveFilters = computed(() => activeConditionChips.value.length > 0);

  // ===== フィルタ操作関数 =====

  function getStatFilter(stat: 'atk' | 'def') {
    return filters[stat];
  }

  function toggleStatExact(stat: 'atk' | 'def') {
    filters[stat].exact = !filters[stat].exact;
    if (filters[stat].exact) {
      filters[stat].unknown = false;
      if (filters[stat].min !== undefined) {
        filters[stat].max = filters[stat].min;
      }
    }
  }

  function toggleStatUnknown(stat: 'atk' | 'def') {
    filters[stat].unknown = !filters[stat].unknown;
    if (filters[stat].unknown) {
      filters[stat].exact = false;
      filters[stat].min = undefined;
      filters[stat].max = undefined;
    }
  }

  function validateStatInput(event: Event, stat: 'atk' | 'def', field: 'min' | 'max') {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();

    // 空文字列は許可
    if (value === '') {
      filters[stat][field] = undefined;
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
      filters[stat][field] = numValue;

      // exactモードの場合は両方を同期
      if (filters[stat].exact && field === 'min') {
        filters[stat].max = numValue;
      }
    } else {
      filters[stat][field] = undefined;
    }

  }

  function selectCardType(type: CardType) {
    if (filters.cardType === type) {
      filters.cardType = null;
    } else {
      filters.cardType = type;
      if (type !== 'monster') {
        filters.attributes = [];
        filters.races = [];
        filters.monsterTypes = [];
        filters.levelValues = [];
        filters.linkValues = [];
        filters.scaleValues = [];
        filters.linkMarkers = [];
        filters.atk = { exact: false, unknown: false };
        filters.def = { exact: false, unknown: false };
      }
      if (type !== 'spell') {
        filters.spellTypes = [];
      }
      if (type !== 'trap') {
        filters.trapTypes = [];
      }
    }
  }

  function toggleAttribute(attr: Attribute) {
    const index = filters.attributes.indexOf(attr);
    if (index >= 0) {
      filters.attributes.splice(index, 1);
    } else {
      filters.attributes.push(attr);
    }
  }

  function toggleSpellType(type: SpellEffectType) {
    const index = filters.spellTypes.indexOf(type);
    if (index >= 0) {
      filters.spellTypes.splice(index, 1);
    } else {
      filters.spellTypes.push(type);
    }
  }

  function toggleTrapType(type: TrapEffectType) {
    const index = filters.trapTypes.indexOf(type);
    if (index >= 0) {
      filters.trapTypes.splice(index, 1);
    } else {
      filters.trapTypes.push(type);
    }
  }

  function toggleRace(race: Race) {
    const index = filters.races.indexOf(race);
    if (index >= 0) {
      filters.races.splice(index, 1);
    } else {
      filters.races.push(race);
    }
  }

  function getMonsterTypeClass(type: MonsterType) {
    const item = filters.monsterTypes.find(t => t.type === type);
    if (!item) return '';
    return item.state === 'normal' ? 'active' : 'not';
  }

  function cycleMonsterTypeState(type: MonsterType) {
    const index = filters.monsterTypes.findIndex(t => t.type === type);
    if (index >= 0) {
      const current = filters.monsterTypes[index];
      if (current) {
        if (current.state === 'normal') {
          current.state = 'not';
        } else {
          filters.monsterTypes.splice(index, 1);
        }
      }
    } else {
      filters.monsterTypes.push({ type, state: 'normal' });
    }
  }

  function toggleMonsterTypeMatchMode() {
    filters.monsterTypeMatchMode = filters.monsterTypeMatchMode === 'and' ? 'or' : 'and';
  }

  function toggleLinkMarkerMatchMode() {
    filters.linkMarkerMatchMode = filters.linkMarkerMatchMode === 'and' ? 'or' : 'and';
  }

  function isLevelValueActive(num: number): boolean {
    if (filters.levelType === 'level') {
      return filters.levelValues.includes(num);
    } else {
      return filters.scaleValues.includes(num);
    }
  }

  function toggleLevelValue(num: number) {
    if (filters.levelType === 'level') {
      const index = filters.levelValues.indexOf(num);
      if (index >= 0) {
        filters.levelValues.splice(index, 1);
      } else {
        filters.levelValues.push(num);
      }
    } else {
      const index = filters.scaleValues.indexOf(num);
      if (index >= 0) {
        filters.scaleValues.splice(index, 1);
      } else {
        filters.scaleValues.push(num);
      }
    }
  }

  function toggleLinkValue(num: number) {
    const index = filters.linkValues.indexOf(num);
    if (index >= 0) {
      filters.linkValues.splice(index, 1);
    } else {
      filters.linkValues.push(num);
    }
  }

  function isLinkMarkerActive(pos: number): boolean {
    if (pos === 5) return false;
    return filters.linkMarkers.includes(pos);
  }

  function toggleLinkMarker(pos: number) {
    const index = filters.linkMarkers.indexOf(pos);
    if (index >= 0) {
      filters.linkMarkers.splice(index, 1);
    } else {
      filters.linkMarkers.push(pos);
    }
  }

  function setLevelType(levelType: 'level' | 'link' | 'scale') {
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
