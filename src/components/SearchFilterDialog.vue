<template>
  <div v-if="isVisible" class="dialog-overlay" @click="$emit('close')">
    <div class="dialog" @click.stop>
      <!-- タイトルバー -->
      <div class="dialog-header">
        <div class="dialog-header-inner">
          <h2>検索条件指定</h2>
          <div class="header-actions">
            <button v-if="hasActiveFilters" class="clear-btn" @click="clearFilters">クリア</button>
            <button class="close-btn" @click="$emit('close')">×</button>
          </div>
        </div>
      </div>

      <div class="dialog-content">
        <!-- カードタイプタブと属性/魔法タイプ/罠タイプ -->
        <div class="card-type-section">
          <div class="card-type-tabs">
            <div class="card-type-tab-wrapper monster-wrapper">
              <div class="tab-header">
                <button
                  class="card-type-tab"
                  :class="{ active: filters.cardType === 'monster' }"
                  :disabled="isMonsterTabDisabled"
                  @click="selectCardType('monster')"
                >
                  モンスター
                </button>
                <div v-show="selectedAttributeChips.length > 0" class="selected-chips-inline">
                  <span v-for="chip in selectedAttributeChips" :key="chip" class="selected-chip-inline">
                    {{ chip }}
                  </span>
                </div>
              </div>
              <div class="type-detail-content">
                <div class="type-detail-grid">
                  <button
                    v-for="attr in (['water', 'fire', 'wind', 'earth', 'light', 'dark', 'divine'] as Attribute[])"
                    :key="attr"
                    class="chip chip-attr"
                    :class="{ active: filters.attributes.includes(attr) }"
                    :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                    @click="toggleAttribute(attr)"
                  >
                    <img :src="getAttributeIconUrl(attr)" class="attr-icon" :alt="getAttributeLabel(attr)">
                    {{ getAttributeLabel(attr) }}
                  </button>
                </div>
              </div>
            </div>

            <div class="card-type-tab-wrapper spell-wrapper">
              <div class="tab-header">
                <button
                  class="card-type-tab"
                  :class="{ active: filters.cardType === 'spell' }"
                  :disabled="isSpellTabDisabled"
                  @click="selectCardType('spell')"
                >
                  <img :src="getSpellIconUrl()" class="tab-icon" alt="魔法">
                  魔法
                </button>
                <div v-show="selectedSpellTypeChips.length > 0" class="selected-chips-inline">
                  <span v-for="chip in selectedSpellTypeChips" :key="chip" class="selected-chip-inline">
                    {{ chip }}
                  </span>
                </div>
              </div>
              <div class="type-detail-content">
                <div class="type-detail-row">
                  <button
                    v-for="type in (['normal', 'quick', 'ritual'] as SpellEffectType[])"
                    :key="type"
                    class="chip"
                    :class="{ active: filters.spellTypes.includes(type) }"
                    :disabled="filters.cardType !== null && filters.cardType !== 'spell'"
                    @click="toggleSpellType(type)"
                  >
                    {{ getSpellTypeLabel(type) }}
                  </button>
                </div>
                <div class="type-detail-row">
                  <button
                    v-for="type in (['continuous', 'equip', 'field'] as SpellEffectType[])"
                    :key="type"
                    class="chip"
                    :class="{ active: filters.spellTypes.includes(type) }"
                    :disabled="filters.cardType !== null && filters.cardType !== 'spell'"
                    @click="toggleSpellType(type)"
                  >
                    {{ getSpellTypeLabel(type) }}
                  </button>
                </div>
              </div>
            </div>

            <div class="card-type-tab-wrapper trap-wrapper">
              <div class="tab-header">
                <button
                  class="card-type-tab"
                  :class="{ active: filters.cardType === 'trap' }"
                  :disabled="isTrapTabDisabled"
                  @click="selectCardType('trap')"
                >
                  <img :src="getTrapIconUrl()" class="tab-icon" alt="罠">
                  罠
                </button>
                <div v-show="selectedTrapTypeChips.length > 0" class="selected-chips-inline">
                  <span v-for="chip in selectedTrapTypeChips" :key="chip" class="selected-chip-inline">
                    {{ chip }}
                  </span>
                </div>
              </div>
              <div class="type-detail-content">
                <div class="type-detail-row">
                  <button
                    v-for="type in (['normal', 'continuous', 'counter'] as TrapEffectType[])"
                    :key="type"
                    class="chip"
                    :class="{ active: filters.trapTypes.includes(type) }"
                    :disabled="filters.cardType !== null && filters.cardType !== 'trap'"
                    @click="toggleTrapType(type)"
                  >
                    {{ getTrapTypeLabel(type) }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 種族 -->
        <div class="filter-section">
          <div class="section-header">
            <span class="section-title" :class="{ disabled: filters.cardType !== null && filters.cardType !== 'monster' }">種族</span>
            <div v-if="selectedRaceChips.length > 0" class="selected-chips-inline">
              <span v-for="chip in selectedRaceChips" :key="chip" class="selected-chip-inline">
                {{ chip }}
              </span>
            </div>
          </div>
          <div class="race-rows">
            <button
              v-for="race in racesOrdered"
              :key="race"
              class="chip chip-fixed"
              :class="{ active: filters.races.includes(race) }"
              :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
              @click="toggleRace(race)"
            >
              {{ getRaceButtonLabel(race) }}
            </button>
          </div>
        </div>

        <!-- モンスタータイプ -->
        <div class="filter-section">
          <div class="section-header">
            <span class="section-title" :class="{ disabled: filters.cardType !== null && filters.cardType !== 'monster' }">モンスタータイプ</span>
            <div v-if="selectedMonsterTypeChips.length > 0" class="selected-chips-inline">
              <span v-for="chip in selectedMonsterTypeChips" :key="chip" class="selected-chip-inline">
                {{ chip }}
              </span>
            </div>
          </div>
          <div class="monster-type-rows">
            <div class="type-row">
              <button
                class="chip chip-mode"
                :class="{ active: filters.monsterTypeMatchMode === 'and' }"
                :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                @click="filters.monsterTypeMatchMode = filters.monsterTypeMatchMode === 'and' ? 'or' : 'and'"
              >
                {{ filters.monsterTypeMatchMode === 'and' ? 'AND' : 'OR' }}
              </button>
              <button
                v-for="type in (['normal', 'effect', 'special'] as MonsterType[])"
                :key="type"
                class="chip chip-fixed"
                :class="getMonsterTypeClass(type)"
                :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                @click="cycleMonsterTypeState(type)"
              >
                {{ getMonsterTypeButtonLabel(type) }}
              </button>
            </div>
            <div class="type-row">
              <button
                v-for="type in (['fusion', 'synchro', 'xyz', 'link', 'pendulum', 'ritual'] as MonsterType[])"
                :key="type"
                class="chip chip-fixed"
                :class="getMonsterTypeClass(type)"
                :data-type="type"
                :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                @click="cycleMonsterTypeState(type)"
              >
                {{ getMonsterTypeButtonLabel(type) }}
              </button>
            </div>
            <div class="type-row">
              <button
                v-for="type in (['spirit', 'tuner', 'gemini', 'toon', 'union', 'flip'] as MonsterType[])"
                :key="type"
                class="chip chip-fixed"
                :class="getMonsterTypeClass(type)"
                :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                @click="cycleMonsterTypeState(type)"
              >
                {{ getMonsterTypeButtonLabel(type) }}
              </button>
            </div>
          </div>
        </div>

        <!-- レベル/ランク/リンク/Pスケール -->
        <div class="filter-section">
          <div class="level-section-wrapper" :class="`level-type-${filters.levelType}`">
            <div class="level-type-tabs">
            <div class="tab-header">
              <button
                class="level-tab"
                :class="{ active: filters.levelType === 'level' }"
                :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                @click="filters.levelType = 'level'"
              >
                レベル/ランク
              </button>
              <div v-show="selectedLevelChips.length > 0" class="selected-chips-inline">
                <span v-for="chip in selectedLevelChips" :key="chip" class="selected-chip-inline">
                  {{ chip }}
                </span>
              </div>
            </div>
            <div class="tab-header">
              <button
                class="level-tab"
                :class="{ active: filters.levelType === 'link' }"
                :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                @click="filters.levelType = 'link'"
              >
                リンク
              </button>
              <div v-show="selectedLinkChips.length > 0" class="selected-chips-inline">
                <span v-for="chip in selectedLinkChips" :key="chip" class="selected-chip-inline">
                  {{ chip }}
                </span>
              </div>
            </div>
            <div class="tab-header">
              <button
                class="level-tab"
                :class="{ active: filters.levelType === 'scale' }"
                :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                @click="filters.levelType = 'scale'"
              >
                Pスケール
              </button>
              <div v-show="selectedScaleChips.length > 0" class="selected-chips-inline">
                <span v-for="chip in selectedScaleChips" :key="chip" class="selected-chip-inline">
                  {{ chip }}
                </span>
              </div>
            </div>
          </div>

          <!-- レベル/ランク/Pスケールの数字 -->
          <div v-if="filters.levelType !== 'link'" class="level-numbers">
            <div class="number-row">
              <button
                v-for="num in [0, 1, 2, 3, 4, 5, 6]"
                :key="num"
                class="chip chip-num"
                :class="{ active: isLevelValueActive(num) }"
                :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                @click="toggleLevelValue(num)"
              >
                {{ num }}
              </button>
            </div>
            <div class="number-row">
              <button
                v-for="num in [7, 8, 9, 10, 11, 12, 13]"
                :key="num"
                class="chip chip-num"
                :class="{ active: isLevelValueActive(num) }"
                :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                @click="toggleLevelValue(num)"
              >
                {{ num }}
              </button>
            </div>
          </div>

          <!-- リンクの数字とマーカー -->
          <div v-if="filters.levelType === 'link'" class="link-section">
            <div class="link-numbers-container">
              <div class="link-numbers">
                <div class="number-row">
                  <button
                    v-for="num in [1, 2, 3]"
                    :key="num"
                    class="chip chip-num"
                    :class="{ active: filters.linkValues.includes(num) }"
                    :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                    @click="toggleLinkValue(num)"
                  >
                    {{ num }}
                  </button>
                </div>
                <div class="number-row">
                  <button
                    v-for="num in [4, 5, 6]"
                    :key="num"
                    class="chip chip-num"
                    :class="{ active: filters.linkValues.includes(num) }"
                    :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                    @click="toggleLinkValue(num)"
                  >
                    {{ num }}
                  </button>
                </div>
              </div>
              <div class="link-markers-container">
                <div class="icon_img_set" :class="{ disabled: filters.cardType !== null && filters.cardType !== 'monster' }">
                  <span
                    v-for="pos in [7, 8, 9, 4, 6, 1, 2, 3]"
                    :key="pos"
                    :class="['i_i_' + pos, { active: isLinkMarkerActive(pos) }]"
                    @click="(filters.cardType === null || filters.cardType === 'monster') && toggleLinkMarker(pos)"
                  ></span>
                  <button
                    class="chip chip-mode-small link-mode-btn"
                    :class="{ active: filters.linkMarkerMatchMode === 'and' }"
                    :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                    @click="filters.linkMarkerMatchMode = filters.linkMarkerMatchMode === 'and' ? 'or' : 'and'"
                  >
                    {{ filters.linkMarkerMatchMode === 'and' ? 'AND' : 'OR' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        <!-- ATK/DEF -->
        <div class="filter-section">
          <div class="atk-def-section-wrapper" :class="`stat-type-${activeStatTab}`">
            <div class="atk-def-tabs">
            <div class="tab-header">
              <button
                class="stat-tab"
                :class="{ active: activeStatTab === 'atk' }"
                :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                @click="activeStatTab = 'atk'"
              >
                ATK
              </button>
              <div v-show="selectedAtkChips.length > 0" class="selected-chips-inline">
                <span v-for="chip in selectedAtkChips" :key="chip" class="selected-chip-inline">
                  {{ chip }}
                </span>
              </div>
            </div>
            <div class="tab-header">
              <button
                class="stat-tab"
                :class="{ active: activeStatTab === 'def' }"
                :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                @click="activeStatTab = 'def'"
              >
                DEF
              </button>
              <div v-show="selectedDefChips.length > 0" class="selected-chips-inline">
                <span v-for="chip in selectedDefChips" :key="chip" class="selected-chip-inline">
                  {{ chip }}
                </span>
              </div>
            </div>
          </div>

          <div class="stat-controls">
            <div class="stat-row-with-checkboxes">
              <div class="stat-checkboxes">
                <button
                  class="chip chip-toggle"
                  :class="{ active: getStatFilter(activeStatTab).exact }"
                  :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                  @click="toggleStatExact(activeStatTab)"
                >
                  完全一致
                </button>
                <button
                  class="chip chip-toggle"
                  :class="{ active: getStatFilter(activeStatTab).unknown }"
                  :disabled="filters.cardType !== null && filters.cardType !== 'monster'"
                  @click="toggleStatUnknown(activeStatTab)"
                >
                  ?
                </button>
              </div>
              <div class="stat-inputs">
                <input
                  :value="getStatFilter(activeStatTab).min ?? ''"
                  type="text"
                  placeholder="Min"
                  :disabled="filters.cardType === 'spell' || filters.cardType === 'trap' || getStatFilter(activeStatTab).unknown"
                  @input="validateStatInput($event, activeStatTab, 'min')"
                >
                <span>-</span>
                <input
                  :value="getStatFilter(activeStatTab).max ?? ''"
                  type="text"
                  placeholder="Max"
                  :disabled="filters.cardType === 'spell' || filters.cardType === 'trap' || getStatFilter(activeStatTab).unknown || getStatFilter(activeStatTab).exact"
                  @input="validateStatInput($event, activeStatTab, 'max')"
                >
              </div>
            </div>
          </div>
          </div>
        </div>

        <!-- 発売日 -->
        <div class="filter-section">
          <div class="date-range">
            <input v-model="filters.releaseDate.from" type="date" min="1999-01-01" :max="maxDate" placeholder="1999-01-01">
            <span>-</span>
            <input v-model="filters.releaseDate.to" type="date" min="1999-01-01" :max="maxDate">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue';
import type { Attribute, Race, MonsterType, CardType, SpellEffectType, TrapEffectType } from '../types/card';
import type { SearchFilters } from '../types/search-filters';
import { getAttributeIconUrl, getSpellIconUrl, getTrapIconUrl } from '../api/image-utils';
import {
  getAttributeLabel,
  getSpellTypeLabel,
  getTrapTypeLabel,
  getRaceLabel,
  getMonsterTypeLabel
} from '../utils/filter-label';
import {
  RACE_OPTIONS,
  MONSTER_TYPE_OPTIONS
} from '../constants/filter-options';

defineProps<{
  isVisible: boolean;
  initialFilters?: SearchFilters;
}>();

const emit = defineEmits<{
  close: [];
  apply: [filters: SearchFilters];
}>();

const filters = reactive<SearchFilters>({
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
});

const activeStatTab = ref<'atk' | 'def'>('atk');

// レベル/リンク数を統合表示するヘルパー関数（SearchInputBarと同じ）
const formatNumberRange = (numbers: number[], prefix: string): string => {
  if (numbers.length === 0) return '';
  const sorted = [...numbers].sort((a, b) => a - b);

  // 連続した数値をグループ化
  const groups: number[][] = [];
  let currentGroup: number[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [sorted[i]];
    }
  }
  groups.push(currentGroup);

  // グループを文字列に変換
  const parts = groups.map(group => {
    if (group.length >= 3) {
      return `${group[0]}-${group[group.length - 1]}`;
    } else {
      return group.join(',');
    }
  });

  return `${prefix}${parts.join(',')}`;
};

// 種族の順序（名前順、幻神獣族と創造神族は最後）
const racesOrdered: Race[] = [
  'zombie', 'fiend', 'dinosaur', 'seaserpent', 'machine', 'rock', 'insect',
  'psychic', 'cyberse', 'beast', 'beastwarrior', 'warrior', 'fairy', 'windbeast',
  'dragon', 'reptile', 'fish', 'pyro', 'wyrm', 'illusion', 'spellcaster', 'aqua',
  'thunder', 'plant', 'divine', 'creatorgod'
];

// ボタン表示用のラベル取得関数
const getRaceButtonLabel = (race: string) => {
  const option = RACE_OPTIONS.find(opt => opt.value === race);
  return option ? option.label : race;
};

const getMonsterTypeButtonLabel = (type: string) => {
  const option = MONSTER_TYPE_OPTIONS.find(opt => opt.value === type);
  return option ? option.label : type;
};

// 最大日付（来年末）
const maxDate = computed(() => {
  const nextYear = new Date().getFullYear() + 1;
  return `${nextYear}-12-31`;
});

// タブタイトル横の選択済みチップ（共通関数を使用）
const selectedAttributeChips = computed(() => {
  return filters.attributes.map(attr => getAttributeLabel(attr));
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

// SearchInputBarと同じ形式でチップを表示
const selectedLevelChips = computed(() => {
  if (filters.levelValues.length === 0) return [];
  return [formatNumberRange(filters.levelValues, '★')];
});

const selectedLinkChips = computed(() => {
  if (filters.linkValues.length === 0) return [];
  return [formatNumberRange(filters.linkValues, 'L')];
});

const selectedScaleChips = computed(() => {
  if (filters.scaleValues.length === 0) return [];
  return [formatNumberRange(filters.scaleValues, 'Scale')];
});

const selectedAtkChips = computed(() => {
  const f = filters.atk;
  // SearchInputBarと同じ形式：? が選択されている場合は「ATK?」、それ以外は「ATK」
  if (f.unknown) {
    return ['ATK?'];
  }
  if (f.exact || f.min !== undefined || f.max !== undefined) {
    return ['ATK'];
  }
  return [];
});

const selectedDefChips = computed(() => {
  const f = filters.def;
  // SearchInputBarと同じ形式：? が選択されている場合は「DEF?」、それ以外は「DEF」
  if (f.unknown) {
    return ['DEF?'];
  }
  if (f.exact || f.min !== undefined || f.max !== undefined) {
    return ['DEF'];
  }
  return [];
});

// 選択中の条件チップ
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
  const levelCount = filters.levelValues.length + filters.linkValues.length + filters.scaleValues.length;
  if (levelCount > 0) chips.push(`レベル等:${levelCount}件`);
  if (filters.linkMarkers.length > 0) chips.push(`マーカー:${filters.linkMarkers.length}件`);
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

// タブボタンの disabled 状態（排他的に制御）
const hasMonsterOnlyFilters = computed(() => {
  return filters.attributes.length > 0 ||
    filters.races.length > 0 ||
    filters.monsterTypes.length > 0 ||
    filters.levelValues.length > 0 ||
    filters.linkValues.length > 0 ||
    filters.scaleValues.length > 0 ||
    filters.linkMarkers.length > 0 ||
    filters.atk.exact || filters.atk.unknown || filters.atk.min !== undefined || filters.atk.max !== undefined ||
    filters.def.exact || filters.def.unknown || filters.def.min !== undefined || filters.def.max !== undefined;
});

const hasSpellOnlyFilters = computed(() => {
  return filters.spellTypes.length > 0;
});

const hasTrapOnlyFilters = computed(() => {
  return filters.trapTypes.length > 0;
});

const isMonsterTabDisabled = computed(() => {
  if (filters.cardType === 'spell' || filters.cardType === 'trap') return true;
  return hasSpellOnlyFilters.value || hasTrapOnlyFilters.value;
});

const isSpellTabDisabled = computed(() => {
  if (filters.cardType === 'monster' || filters.cardType === 'trap') return true;
  return hasMonsterOnlyFilters.value || hasTrapOnlyFilters.value;
});

const isTrapTabDisabled = computed(() => {
  if (filters.cardType === 'monster' || filters.cardType === 'spell') return true;
  return hasMonsterOnlyFilters.value || hasSpellOnlyFilters.value;
});

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
  emit('apply', { ...filters });
}

function toggleStatUnknown(stat: 'atk' | 'def') {
  filters[stat].unknown = !filters[stat].unknown;
  if (filters[stat].unknown) {
    filters[stat].exact = false;
    filters[stat].min = undefined;
    filters[stat].max = undefined;
  }
  emit('apply', { ...filters });
}

function validateStatInput(event: Event, stat: 'atk' | 'def', field: 'min' | 'max') {
  const input = event.target as HTMLInputElement;
  const value = input.value.trim();

  // 空文字列は許可
  if (value === '') {
    filters[stat][field] = undefined;
    emit('apply', { ...filters });
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

  emit('apply', { ...filters });
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
  emit('apply', { ...filters });
}

function toggleAttribute(attr: Attribute) {
  const index = filters.attributes.indexOf(attr);
  if (index >= 0) {
    filters.attributes.splice(index, 1);
  } else {
    filters.attributes.push(attr);
  }
  emit('apply', { ...filters });
}

function toggleSpellType(type: SpellEffectType) {
  const index = filters.spellTypes.indexOf(type);
  if (index >= 0) {
    filters.spellTypes.splice(index, 1);
  } else {
    filters.spellTypes.push(type);
  }
  emit('apply', { ...filters });
}

function toggleTrapType(type: TrapEffectType) {
  const index = filters.trapTypes.indexOf(type);
  if (index >= 0) {
    filters.trapTypes.splice(index, 1);
  } else {
    filters.trapTypes.push(type);
  }
  emit('apply', { ...filters });
}

function toggleRace(race: Race) {
  const index = filters.races.indexOf(race);
  if (index >= 0) {
    filters.races.splice(index, 1);
  } else {
    filters.races.push(race);
  }
  emit('apply', { ...filters });
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
    if (current.state === 'normal') {
      current.state = 'not';
    } else {
      filters.monsterTypes.splice(index, 1);
    }
  } else {
    filters.monsterTypes.push({ type, state: 'normal' });
  }
  emit('apply', { ...filters });
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
  emit('apply', { ...filters });
}

function toggleLinkValue(num: number) {
  const index = filters.linkValues.indexOf(num);
  if (index >= 0) {
    filters.linkValues.splice(index, 1);
  } else {
    filters.linkValues.push(num);
  }
  emit('apply', { ...filters });
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
  emit('apply', { ...filters });
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
  emit('apply', { ...filters });
}
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.dialog {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  border-bottom: 1px solid #e0e0e0;
  width: 100%;
}

.dialog-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #202124;
    white-space: nowrap;
  }
}

.header-actions {
  display: flex;
  gap: 6px;
  width: 100%;
  justify-content: flex-end;
}

.clear-btn,
.close-btn {
  background: transparent;
  border: 1px solid #dadce0;
  color: #5f6368;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #f8f9fa;
    border-color: #4caf50;
    color: #4caf50;
  }
}

.close-btn {
  font-size: 16px;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.card-type-section {
  margin-bottom: 16px;
  border: 1px solid #dadce0;
  border-radius: 6px;
  background: #ffffff;
  overflow: hidden;
}

.card-type-tabs {
  display: flex;
  flex-direction: row;
  gap: 0;
  background: transparent;
  padding: 0;
  position: relative;
}

.card-type-tab-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 2px solid #dadce0;
  background: transparent;
  position: relative;

  &:last-child {
    border-right: none;
  }

  .tab-header {
    border-bottom: 2px solid #008cff;
  }
}

.tab-header {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
  min-height: 32px;
  padding: 0;
  background: transparent;
  flex-wrap: nowrap;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  width: 100%;
}

.card-type-tab-wrapper .tab-header:hover:not(:has(.card-type-tab:disabled)) {
  background: #f5f5f5;
}

.monster-wrapper .tab-header:has(.card-type-tab.active) {
  background: #fff9e6;
}

.monster-wrapper .tab-header:has(.card-type-tab.active):hover {
  background: rgba(255, 249, 230, 0.7);
}

.spell-wrapper .tab-header:has(.card-type-tab.active) {
  background: #b2dfdb;
}

.spell-wrapper .tab-header:has(.card-type-tab.active):hover {
  background: rgba(178, 223, 219, 0.7);
}

.trap-wrapper .tab-header:has(.card-type-tab.active) {
  background: #f8bbd0;
}

.trap-wrapper .tab-header:has(.card-type-tab.active):hover {
  background: rgba(248, 187, 208, 0.7);
}

.selected-chips-inline {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
  z-index: 1;
}

.monster-wrapper .selected-chips-inline {
  background: rgba(255, 249, 230, 0.9);
}

.spell-wrapper .selected-chips-inline {
  background: rgba(178, 223, 219, 0.9);
}

.trap-wrapper .selected-chips-inline {
  background: rgba(248, 187, 208, 0.9);
}

.selected-chip-inline {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  background: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.card-type-tab {
  padding: 8px;
  border: none;
  background: transparent;
  color: #3c4043;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  border-radius: 0;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  width: 100%;

  &:hover:not(.active):not(:disabled) {
    background: transparent;
  }

  &:disabled {
    background: transparent;
    color: #9aa0a6;
    cursor: not-allowed;
  }

  &.active {
    background: transparent;
    color: #3c4043;
  }

  .tab-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    object-fit: contain;
  }
}

.type-detail-content {
  padding: 8px;
  background: #ffffff;
}

.type-detail-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.type-detail-row {
  display: flex;
  gap: 6px;
  justify-content: flex-start;
  flex-wrap: wrap;

  &:not(:last-child) {
    margin-bottom: 6px;
  }
}

.filter-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 12px;
  min-height: 24px;
  background: #fff9e6;
  border-radius: 6px 6px 0 0;
  margin-bottom: 0;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: #008cff;
  }
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #202124;
  white-space: nowrap;
}

.filter-title {
  font-size: 13px;
  font-weight: 700;
  color: #202124;
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid #e0e0e0;
}

.chip {
  padding: 6px 12px;
  border: 1.5px solid #5f6368;
  background: #ffffff;
  color: #202124;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
  text-align: center;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
  user-select: text;

  &:hover:not(:disabled) {
    background: #e8f5e9;
    border-color: #4caf50;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(76, 175, 80, 0.25);
  }

  &.active:not(:disabled) {
    background: linear-gradient(135deg, #66bb6a 0%, #43a047 50%, #2e7d32 100%);
    color: white;
    border: 1.5px solid #1b5e20;
    box-shadow: 0 3px 10px rgba(46, 125, 50, 0.5);
    font-weight: 700;
  }

  &.not:not(:disabled) {
    background: linear-gradient(135deg, #ef5350 0%, #e53935 50%, #d32f2f 100%);
    color: white;
    border: 1.5px solid #b71c1c;
    box-shadow: 0 3px 10px rgba(211, 47, 47, 0.6);
    font-weight: 700;
    font-size: 10px;

    &::before {
      content: 'N-';
      font-weight: 900;
    }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background: #f5f5f5;
    color: #9aa0a6;
    border-color: #dadce0;
  }

  &.chip-fixed {
    width: 85px;
  }

  &.chip-num {
    width: 40px;
    padding: 6px 4px;
  }

  &.chip-mode {
    width: 85px;
    font-weight: 700;
    background: #fff3e0;
    border: 2px solid #ff9800;
    color: #e65100;

    &:hover:not(:disabled) {
      background: #ffe0b2;
      border-color: #f57c00;
      box-shadow: 0 3px 8px rgba(255, 152, 0, 0.35);
    }

    &.active:not(:disabled) {
      background: #ff9800;
      color: white;
      border-color: #f57c00;
      box-shadow: 0 2px 6px rgba(255, 152, 0, 0.5);
    }
  }

  &.chip-mode-small {
    padding: 2px 8px;
    font-size: 9px;
    font-weight: 700;
    width: auto;
    min-width: 32px;
    background: #fff3e0;
    border: 1.5px solid #ff9800;
    border-radius: 12px;
    color: #e65100;

    &:hover:not(:disabled) {
      background: #ffe0b2;
      border-color: #f57c00;
      box-shadow: 0 3px 8px rgba(255, 152, 0, 0.35);
    }

    &.active:not(:disabled) {
      background: linear-gradient(135deg, #ffb74d 0%, #ff9800 50%, #f57c00 100%);
      color: white;
      border: 1.5px solid #e65100;
      box-shadow: 0 2px 6px rgba(255, 152, 0, 0.5);
    }
  }

  &.chip-toggle {
    width: auto;
    min-width: 60px;
    padding: 6px 12px;
  }

  &.chip-attr {
    width: auto;
    padding: 6px 10px;

    .attr-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      object-fit: contain;
    }
  }
}

.race-rows {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  background: #ffffff;
  border: 1px solid #dadce0;
  border-top: none;
  border-radius: 0 0 6px 6px;

  .chip {
    border-radius: 12px;
  }
}

.monster-type-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: #ffffff;
  border: 1px solid #dadce0;
  border-top: none;
  border-radius: 0 0 6px 6px;

  .chip[data-type="fusion"] {
    &:not(:disabled) {
      background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
      border-color: #ba68c8;
    }
    &.active:not(:disabled) {
      background: linear-gradient(135deg, #e1bee7 0%, #ba68c8 100%);
      border-color: #9c27b0;
      color: #4a148c;
    }
    &.not:not(:disabled) {
      background: linear-gradient(135deg, #e1bee7 0%, #e1bee7 40%, #ffcdd2 70%, #ef5350 100%);
      border: 1.5px solid #d32f2f;
      color: #4a148c;
    }
  }

  .chip[data-type="synchro"] {
    &:not(:disabled) {
      background:
        repeating-linear-gradient(
          135deg,
          transparent,
          transparent 8px,
          rgba(189, 189, 189, 0.12) 8px,
          rgba(189, 189, 189, 0.12) 9px
        ),
        linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
      border-color: #bdbdbd;
    }
    &.active:not(:disabled) {
      background:
        repeating-linear-gradient(
          135deg,
          transparent,
          transparent 8px,
          rgba(117, 117, 117, 0.2) 8px,
          rgba(117, 117, 117, 0.2) 9px
        ),
        linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%);
      border-color: #757575;
      color: #424242;
    }
    &.not:not(:disabled) {
      background:
        repeating-linear-gradient(
          135deg,
          transparent,
          transparent 8px,
          rgba(211, 47, 47, 0.15) 8px,
          rgba(211, 47, 47, 0.15) 9px
        ),
        linear-gradient(135deg, #f5f5f5 0%, #f5f5f5 40%, #ffcdd2 70%, #ef5350 100%);
      border: 1.5px solid #d32f2f;
      color: #424242;
    }
  }

  .chip[data-type="xyz"] {
    &:not(:disabled) {
      background: linear-gradient(135deg, #757575 0%, #616161 100%);
      border-color: #9e9e9e;
      color: #fff;
    }
    &.active:not(:disabled) {
      background: linear-gradient(135deg, #616161 0%, #424242 100%);
      border-color: #757575;
      color: #fff;
    }
    &.not:not(:disabled) {
      background: linear-gradient(135deg, #616161 0%, #616161 40%, #e57373 70%, #d32f2f 100%);
      border: 1.5px solid #b71c1c;
      color: #fff;
    }
  }

  .chip[data-type="link"] {
    &:not(:disabled) {
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      border-color: #64b5f6;
    }
    &.active:not(:disabled) {
      background: linear-gradient(135deg, #bbdefb 0%, #42a5f5 100%);
      border-color: #1976d2;
      color: #0d47a1;
    }
    &.not:not(:disabled) {
      background: linear-gradient(135deg, #bbdefb 0%, #bbdefb 40%, #ffcdd2 70%, #ef5350 100%);
      border: 1.5px solid #d32f2f;
      color: #0d47a1;
    }
  }

  .chip[data-type="ritual"] {
    &:not(:disabled) {
      background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
      border-color: #4dd0e1;
    }
    &.active:not(:disabled) {
      background: linear-gradient(135deg, #b2ebf2 0%, #00bcd4 100%);
      border-color: #0097a7;
      color: #006064;
    }
    &.not:not(:disabled) {
      background: linear-gradient(135deg, #b2ebf2 0%, #b2ebf2 40%, #ffcdd2 70%, #ef5350 100%);
      border: 1.5px solid #d32f2f;
      color: #006064;
    }
  }

  .chip[data-type="pendulum"] {
    &:not(:disabled) {
      background: linear-gradient(180deg,
        #fff3e0 0%,
        #fff3e0 30%,
        #b2dfdb 70%,
        #b2dfdb 100%
      );
      border-color: #ffb74d;
    }
    &.active:not(:disabled) {
      background: linear-gradient(180deg,
        #ffcc80 0%,
        #ffcc80 30%,
        #4db6ac 70%,
        #4db6ac 100%
      );
      border-color: #ff9800;
      color: #4a148c;
    }
    &.not:not(:disabled) {
      background: linear-gradient(180deg,
        #ffcc80 0%,
        #ffcc80 25%,
        #ffcdd2 50%,
        #ef5350 75%,
        #ef5350 100%
      );
      border: 1.5px solid #d32f2f;
      color: #e65100;
    }
  }
}

.type-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.level-section-wrapper {
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #dadce0;
}

.level-type-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 0;
  background: transparent;
  padding: 0;
  border-radius: 6px 6px 0 0;
  overflow: visible;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: #008cff;
  }

  .tab-header {
    flex: 1;
    display: flex;
    align-items: stretch;
    gap: 0;
    min-height: 24px;
    padding: 0;
    background: transparent;
    border-right: 2px solid #dadce0;
    cursor: pointer;
    position: relative;

    &:last-child {
      border-right: none;
    }

    &:has(.level-tab.active) {
      background: #fff9e6;
    }

    &:hover:not(:has(.level-tab:disabled)) {
      background: #f5f5f5;
    }

    &:has(.level-tab.active):hover {
      background: #fff9e6;
    }

    .selected-chips-inline {
      background: rgba(255, 249, 230, 0.9);
    }
  }
}

.level-tab {
  padding: 8px;
  border: none;
  background: transparent;
  color: #3c4043;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  flex: 1;
  width: 100%;

  &:hover:not(.active):not(:disabled) {
    background: transparent;
  }

  &.active {
    background: transparent;
    color: #3c4043;
  }

  &:disabled {
    background: transparent;
    color: #9aa0a6;
    cursor: not-allowed;
  }
}

.selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
  padding: 6px;
  background: #ffffff;
  border: 1px solid #dadce0;
  border-radius: 4px;
  min-height: 30px;
}

.selected-chip {
  padding: 2px 8px;
  background: #4caf50;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.level-numbers {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 0 0 6px 6px;
}

.number-row {
  display: flex;
  gap: 6px;
  justify-content: flex-start;
}

.link-section {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border-radius: 0 0 6px 6px;
}

.link-numbers-container {
  display: flex;
  gap: 16px;
  align-items: center;
}

.link-numbers {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.link-markers-container {
  display: flex;
  align-items: center;
  justify-content: center;

  .icon_img_set {
    display: inline-block;
    position: relative;
    width: 48px;
    height: 48px;
    background: transparent;

    &.disabled span {
      opacity: 0.4;
      cursor: not-allowed;

      &:hover {
        background: #dadce0;
      }
    }

    span {
      position: absolute;
      width: 16px;
      height: 16px;
      clip-path: polygon(0 0, 100% 100%, 0 100%);
      background: #dadce0;
      cursor: pointer;

      &.active {
        background: #4caf50;
      }

      &:hover {
        background: #81c784;
      }

      // 位置1: 左下 (中心から左下向き ↙) bit 0
      &.i_i_1 {
        bottom: 0px;
        left: 0px;
        transform: rotate(0deg);
      }
      // 位置2: 下 (中心から下向き ↓) bit 1
      &.i_i_2 {
        bottom: 0px;
        left: 50%;
        transform: translateX(-50%) rotate(-45deg);
      }
      // 位置3: 右下 (中心から右下向き ↘) bit 2
      &.i_i_3 {
        bottom: 0px;
        right: 0px;
        transform: rotate(-90deg);
      }
      // 位置4: 左 (中心から左向き ←) bit 3
      &.i_i_4 {
        top: 50%;
        left: 0px;
        transform: translateY(-50%) rotate(45deg);
      }
      // 位置6: 右 (中心から右向き →) bit 5
      &.i_i_6 {
        top: 50%;
        right: 0px;
        transform: translateY(-50%) rotate(-135deg);
      }
      // 位置7: 左上 (中心から左上向き ↖) bit 6
      &.i_i_7 {
        top: 0px;
        left: 0px;
        transform: rotate(90deg);
      }
      // 位置8: 上 (中心から上向き ↑) bit 7
      &.i_i_8 {
        top: 0px;
        left: 50%;
        transform: translateX(-50%) rotate(135deg);
      }
      // 位置9: 右上 (中心から右上向き ↗) bit 8
      &.i_i_9 {
        top: 0px;
        right: 0px;
        transform: rotate(180deg);
      }
    }

    .link-mode-btn {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
    }
  }
}

.atk-def-section-wrapper {
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #dadce0;

  &.stat-type-atk,
  &.stat-type-def {
    background: #ffffff;
  }
}

.atk-def-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 0;
  background: transparent;
  padding: 0;
  border-radius: 6px 6px 0 0;
  overflow: visible;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: #008cff;
  }

  .tab-header {
    flex: 1;
    display: flex;
    align-items: stretch;
    gap: 0;
    min-height: 24px;
    padding: 0;
    background: transparent;
    border-right: 2px solid #dadce0;
    cursor: pointer;
    position: relative;
    width: 100%;

    &:last-child {
      border-right: none;
    }

    &:has(.stat-tab.active) {
      background: #fff9e6;
    }

    &:hover:not(:has(.stat-tab:disabled)) {
      background: #f5f5f5;
    }

    &:has(.stat-tab.active):hover {
      background: #fff9e6;
    }

    .selected-chips-inline {
      background: rgba(255, 249, 230, 0.9);
    }
  }
}

.stat-tab {
  padding: 8px;
  border: none;
  background: transparent;
  color: #3c4043;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
  flex: 1;
  width: 100%;
  white-space: nowrap;
  display: flex;
  align-items: center;

  &:hover:not(.active):not(:disabled) {
    background: transparent;
  }

  &.active {
    background: transparent;
    color: #3c4043;
  }

  &:disabled {
    background: transparent;
    color: #9aa0a6;
    cursor: not-allowed;
  }
}

.stat-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border-radius: 0 0 6px 6px;
}

.stat-row-with-checkboxes {
  display: flex;
  gap: 12px;
  align-items: center;
}

.stat-checkboxes {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #5f6368;
  cursor: pointer;
  font-weight: 500;

  input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: #4caf50;
    border-radius: 3px;
  }

  .checkbox-text {
    user-select: none;
  }
}

.stat-inputs {
  display: flex;
  align-items: center;
  gap: 8px;

  input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-size: 12px;
    background: #ffffff;
    color: #3c4043;
    text-align: center;

    &:disabled {
      background: #f1f3f4;
      color: #9aa0a6;
      cursor: not-allowed;
    }

    &:focus {
      outline: none;
      border-color: #4caf50;
    }
  }

  span {
    color: #5f6368;
    font-weight: 600;
    font-size: 14px;
  }
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #ffffff;
  border: 1px solid #dadce0;
  border-radius: 4px;

  input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-size: 12px;
    background: #ffffff;
    text-align: center;

    &:focus {
      outline: none;
      border-color: #4caf50;
    }
  }

  span {
    color: #5f6368;
    font-weight: 600;
    font-size: 14px;
  }
}
</style>
