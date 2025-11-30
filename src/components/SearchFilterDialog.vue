<template>
  <div v-if="isVisible" class="dialog-overlay" @click="$emit('close')">
    <div class="dialog-content" @click.stop>
      <!-- タイトルバー -->
      <div class="dialog-header triple">
        <h2 class="dialog-title">検索条件指定</h2>
        <div class="header-selected-chips">
          <span
            v-for="(icon, index) in headerFilterIcons"
            :key="index"
            class="header-chip"
            :class="icon.type"
          >{{ icon.label }}</span>
        </div>
        <div class="header-actions">
          <button v-if="hasActiveFilters" class="clear-btn" @click="clearFilters" title="クリア">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
            </svg>
          </button>
          <button class="close-btn" @click="$emit('close')" title="閉じる">×</button>
        </div>
      </div>

      <div class="dialog-body">
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
                    :disabled="isFieldDisabled('attribute')"
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
                    :disabled="isFieldDisabled('spell-type')"
                    :title="isFieldDisabled('spell-type') ? getFieldDisabledReason('spell-type') : undefined"
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
                    :disabled="isFieldDisabled('spell-type')"
                    :title="isFieldDisabled('spell-type') ? getFieldDisabledReason('spell-type') : undefined"
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
                    :disabled="isFieldDisabled('trap-type')"
                    :title="isFieldDisabled('trap-type') ? getFieldDisabledReason('trap-type') : undefined"
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
            <span class="section-title" :class="{ disabled: isFieldDisabled('race') }">種族</span>
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
              :disabled="isFieldDisabled('race')"
              @click="toggleRace(race)"
            >
              {{ getRaceButtonLabel(race) }}
            </button>
          </div>
        </div>

        <!-- モンスタータイプ -->
        <div class="filter-section">
          <div class="section-header">
            <span class="section-title" :class="{ disabled: isMonsterTypeFieldDisabled }">モンスタータイプ</span>
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
                :disabled="isMonsterTypeFieldDisabled"
                @click="toggleMonsterTypeMatchMode"
              >
                {{ filters.monsterTypeMatchMode === 'and' ? 'AND' : 'OR' }}
              </button>
              <button
                v-for="type in (['normal', 'effect', 'special'] as MonsterType[])"
                :key="type"
                class="chip chip-fixed"
                :class="getMonsterTypeClass(type)"
                :disabled="isMonsterTypeAttributeDisabled(type)"
                :title="isMonsterTypeAttributeDisabled(type) ? getMonsterTypeDisabledReason(type) : undefined"
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
                :disabled="isMonsterTypeAttributeDisabled(type)"
                :title="isMonsterTypeAttributeDisabled(type) ? getMonsterTypeDisabledReason(type) : undefined"
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
                :disabled="isMonsterTypeAttributeDisabled(type)"
                :title="isMonsterTypeAttributeDisabled(type) ? getMonsterTypeDisabledReason(type) : undefined"
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
                :disabled="isFieldDisabled('level-rank')"
                :title="isFieldDisabled('level-rank') ? getFieldDisabledReason('level-rank') : undefined"
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
                :disabled="isFieldDisabled('link-value') && isFieldDisabled('link-marker')"
                :title="(isFieldDisabled('link-value') && isFieldDisabled('link-marker')) ? (getFieldDisabledReason('link-value') || getFieldDisabledReason('link-marker')) : undefined"
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
                :disabled="isFieldDisabled('p-scale')"
                :title="isFieldDisabled('p-scale') ? getFieldDisabledReason('p-scale') : undefined"
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
                :disabled="filters.levelType === 'level' ? isFieldDisabled('level-rank') : isFieldDisabled('p-scale')"
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
                :disabled="filters.levelType === 'level' ? isFieldDisabled('level-rank') : isFieldDisabled('p-scale')"
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
                    :disabled="isFieldDisabled('link-value')"
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
                    :disabled="isFieldDisabled('link-value')"
                    @click="toggleLinkValue(num)"
                  >
                    {{ num }}
                  </button>
                </div>
              </div>
              <div class="link-markers-container">
                <div class="icon_img_set" :class="{ disabled: isFieldDisabled('link-marker') }">
                  <span
                    v-for="pos in [7, 8, 9, 4, 6, 1, 2, 3]"
                    :key="pos"
                    :class="['i_i_' + pos, { active: isLinkMarkerActive(pos) }]"
                    @click="!isFieldDisabled('link-marker') && toggleLinkMarker(pos)"
                  ></span>
                  <button
                    class="chip chip-mode-small link-mode-btn"
                    :class="{ active: filters.linkMarkerMatchMode === 'and' }"
                    :disabled="isFieldDisabled('link-marker')"
                    @click="toggleLinkMarkerMatchMode"
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
                :disabled="isFieldDisabled('atk')"
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
                :disabled="isFieldDisabled('def')"
                :title="isFieldDisabled('def') ? getFieldDisabledReason('def') : undefined"
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
                  :disabled="isFieldDisabled(activeStatTab)"
                  @click="toggleStatExact(activeStatTab)"
                >
                  完全一致
                </button>
                <button
                  class="chip chip-toggle"
                  :class="{ active: getStatFilter(activeStatTab).unknown }"
                  :disabled="isFieldDisabled(activeStatTab)"
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
                  :disabled="isFieldDisabled(activeStatTab) || getStatFilter(activeStatTab).unknown"
                  @input="validateStatInput($event, activeStatTab, 'min')"
                >
                <span>-</span>
                <input
                  :value="getStatFilter(activeStatTab).max ?? ''"
                  type="text"
                  placeholder="Max"
                  :disabled="isFieldDisabled(activeStatTab) || getStatFilter(activeStatTab).unknown || getStatFilter(activeStatTab).exact"
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

        <!-- 閉じるボタン -->
        <div class="dialog-footer">
          <button class="close-button" @click="$emit('close')">閉じる</button>
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
import { formatStatLabel, formatNumberRange, formatLinkMarkerLabel } from '../utils/filter-chip-formatter';
import { convertFiltersToIcons } from '../utils/filter-icons';
import { inferExclusions, loadExclusionRules } from '../utils/search-exclusion-engine';
import { toSearchConditionState } from '../utils/search-exclusion-adapter';

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

// 推論エンジンのルールをロード
const exclusionRules = loadExclusionRules();

// 推論結果を計算
const exclusionResult = computed(() => {
  const state = toSearchConditionState(filters);
  return inferExclusions(state, exclusionRules);
});

// モンスタータイプ関連フィールドの無効化状態
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
 * フィールド名を日本語ラベルに変換
 */
function getFieldLabel(fieldId: string): string {
  const labels: Record<string, string> = {
    'level-rank': 'レベル/ランク',
    'link-value': 'リンク数',
    'link-marker': 'リンクマーカー',
    'p-scale': 'Pスケール',
    'def': 'DEF',
    'atk': 'ATK',
    'attribute': '属性',
    'race': '種族',
    'spell-type': '魔法タイプ',
    'trap-type': '罠タイプ',
  };
  return labels[fieldId] || fieldId;
}

/**
 * モンスタータイプ名を日本語ラベルに変換
 */
function getMonsterTypeJaLabel(type: string): string {
  const labels: Record<string, string> = {
    'normal': '通常',
    'effect': '効果',
    'fusion': '融合',
    'ritual': '儀式',
    'synchro': 'シンクロ',
    'xyz': 'エクシーズ',
    'link': 'リンク',
    'pend': 'ペンデュラム',
    'pendulum': 'ペンデュラム',
    'special-summon': '特殊召喚',
  };
  return labels[type] || type;
}

/**
 * 無効化理由をユーザーフレンドリーな日本語に変換
 */
function formatDisabledReason(reason: string | undefined): string | undefined {
  if (!reason) return undefined;

  // 「項目から属性への決定性」パターン: "monster-type_has-level-rank-necessary: level-rank,defにより無効"
  const fieldToAttrMatch = reason.match(/^[^:]+:\s*([^に]+)により無効$/);
  if (fieldToAttrMatch) {
    const fields = fieldToAttrMatch[1].split(',').map(f => f.trim());
    const labels = fields.slice(0, 2).map(f => getFieldLabel(f));
    if (fields.length > 2) {
      return `${labels.join('、')}などに入力があるため`;
    }
    return `${labels.join('、')}に入力があるため`;
  }

  // 「属性同士の排他」パターン: "monster-type-near-extraグループ: monster-type_normalと排他"
  const attrExclusionMatch = reason.match(/グループ:\s*monster-type_([^\s]+)と排他$/);
  if (attrExclusionMatch) {
    const excludingType = attrExclusionMatch[1];
    return `${getMonsterTypeJaLabel(excludingType)}モンスターが選択されているため`;
  }

  // 「属性から項目への無効化」パターン: "monster-type_linkにより無効化"
  const attrToFieldMatch = reason.match(/^monster-type_([^\s]+)により無効化$/);
  if (attrToFieldMatch) {
    const monsterType = attrToFieldMatch[1];
    return `${getMonsterTypeJaLabel(monsterType)}モンスターが選択されているため`;
  }

  // 「必須属性が選択不可」パターン: "monster-type_linkが選択不可のため無効"
  const requiredUnavailableMatch = reason.match(/^monster-type_([^\s]+)が選択不可のため無効$/);
  if (requiredUnavailableMatch) {
    const monsterType = requiredUnavailableMatch[1];
    return `${getMonsterTypeJaLabel(monsterType)}モンスターが選択できないため`;
  }

  // その他の場合はそのまま返す
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

// ヘッダー用フィルターアイコン（共通関数を使用）
const headerFilterIcons = computed(() => {
  return convertFiltersToIcons(filters);
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

// タブボタンの disabled 状態（推論エンジンの結果から計算）
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

// 各フィールドのdisabled状態を計算
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

function toggleMonsterTypeMatchMode() {
  filters.monsterTypeMatchMode = filters.monsterTypeMatchMode === 'and' ? 'or' : 'and';
  emit('apply', { ...filters });
}

function toggleLinkMarkerMatchMode() {
  filters.linkMarkerMatchMode = filters.linkMarkerMatchMode === 'and' ? 'or' : 'and';
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
  background: var(--dialog-overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.dialog-content {
  background: var(--dialog-bg, #ffffff);
  border-radius: 8px;
  border: 1px solid var(--dialog-border, #e0e0e0);
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.3));
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary, #e0e0e0);
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;

  &.common {
    justify-content: space-between;
  }

  &.triple {
    justify-content: flex-start;
    gap: 12px;
  }

  .dialog-title {
    font-size: 14px;
    white-space: nowrap;
    flex-shrink: 0;
  }
}

.header-selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  flex: 1;
}

.header-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 3px;
  font-size: 8px;
  font-weight: 500;
  border-radius: 2px;
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-secondary, var(--text-secondary));
  border: 1px solid var(--border-primary, #ddd);
  white-space: nowrap;
  max-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  line-height: 1;
  height: 10px;
}

.header-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  margin-left: auto;
}

.clear-btn,
.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, var(--text-secondary));
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  &:hover {
    background: var(--bg-secondary, var(--bg-secondary));
    color: var(--text-primary, var(--text-primary));
  }
}

.clear-btn {
  svg {
    display: block;
  }
}

.close-btn {
  font-size: 20px;
  font-weight: 300;
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.card-type-section {
  margin-bottom: 16px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
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
  border-right: 2px solid var(--border-primary);
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
  background: var(--bg-secondary);
}

.monster-wrapper .tab-header:has(.card-type-tab.active) {
  background: var(--tab-monster-active-bg);
}

.monster-wrapper .tab-header:has(.card-type-tab.active):hover {
  background: var(--tab-monster-active-bg);
  opacity: 0.85;
}

.spell-wrapper .tab-header:has(.card-type-tab.active) {
  background: var(--tab-spell-active-bg);
}

.spell-wrapper .tab-header:has(.card-type-tab.active):hover {
  background: var(--tab-spell-active-bg);
  opacity: 0.85;
}

.trap-wrapper .tab-header:has(.card-type-tab.active) {
  background: var(--tab-trap-active-bg);
}

.trap-wrapper .tab-header:has(.card-type-tab.active):hover {
  background: var(--tab-trap-active-bg);
  opacity: 0.85;
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
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.card-type-tab {
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--text-primary);
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
    color: var(--text-tertiary);
    cursor: not-allowed;
  }

  &.active {
    background: transparent;
    color: var(--text-primary);
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
  background: var(--bg-primary);
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
  background: var(--tab-monster-active-bg);
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
    background: var(--button-bg);
  }
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;

  &.disabled {
    color: var(--text-tertiary);
    opacity: 0.6;
  }
}

.filter-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-primary);
}

.chip {
  padding: 6px 12px;
  border: 1.5px solid var(--border-secondary, #9e9e9e);
  background: var(--bg-primary);
  color: var(--text-secondary, #666);
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
    background: var(--color-success-bg);
    border-color: var(--color-success);
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(76, 175, 80, 0.25);
  }

  &.active:not(:disabled) {
    background: linear-gradient(135deg, #66bb6a 0%, #43a047 50%, #2e7d32 100%);
    color: var(--button-text);
    border: 1.5px solid #1b5e20;
    box-shadow: 0 3px 10px rgba(46, 125, 50, 0.5);
    font-weight: 700;
  }

  &.not:not(:disabled) {
    background: linear-gradient(135deg, #ef5350 0%, #e53935 50%, #d32f2f 100%);
    color: var(--button-text);
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
    background: var(--bg-secondary);
    color: var(--text-tertiary);
    border-color: var(--border-primary);
    position: relative;
  }

  &:disabled[title]:hover::after {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: var(--button-text);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 400;
    white-space: nowrap;
    z-index: 10001;
    pointer-events: none;
    margin-bottom: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  &:disabled[title]:hover::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
    margin-bottom: 1px;
    z-index: 10001;
    pointer-events: none;
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
    background: var(--color-warning-bg);
    border: 1.5px solid #ff9800;
    border-radius: 12px;
    color: var(--color-warning);

    &:hover:not(:disabled) {
      background: var(--color-warning-hover-bg);
      border-color: var(--color-warning);
      box-shadow: 0 3px 8px rgba(255, 152, 0, 0.35);
    }

    &.active:not(:disabled) {
      background: var(--color-warning);
      color: var(--button-text);
      border-color: var(--color-warning);
      box-shadow: 0 2px 6px rgba(255, 152, 0, 0.5);
    }
  }

  &.chip-mode-small {
    padding: 2px 6px;
    font-size: 9px;
    font-weight: 700;
    width: auto;
    min-width: 22px;
    max-width: 22px;
    background: var(--color-warning-bg);
    border: 1.5px solid #ff9800;
    border-radius: 12px;
    color: var(--color-warning);

    &:hover:not(:disabled) {
      background: var(--color-warning-hover-bg);
      border-color: var(--color-warning);
      box-shadow: 0 3px 8px rgba(255, 152, 0, 0.35);
    }

    &.active:not(:disabled) {
      background: linear-gradient(135deg, #ffb74d 0%, #ff9800 50%, #f57c00 100%);
      color: var(--button-text);
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
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
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
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-top: none;
  border-radius: 0 0 6px 6px;

  .chip[data-type="fusion"] {
    &:not(:disabled) {
      background: var(--monster-fusion-bg);
      border-color: var(--monster-fusion-border);
    }
    &.active:not(:disabled) {
      background: var(--monster-fusion-active);
      border-color: var(--monster-fusion-active-border);
      color: var(--button-text);
    }
    &.not:not(:disabled) {
      background: var(--monster-fusion-not);
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
      border-color: var(--monster-synchro-border);
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
        linear-gradient(135deg, var(--bg-secondary) 0%, #eeeeee 100%);
      border-color: var(--monster-synchro-active-border);
      color: var(--text-primary);
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
        linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-secondary) 40%, #ffcdd2 70%, #ef5350 100%);
      border: 1.5px solid #d32f2f;
      color: var(--text-primary);
    }
  }

  .chip[data-type="xyz"] {
    &:not(:disabled) {
      background: var(--monster-xyz-bg);
      border-color: var(--monster-xyz-border);
      color: var(--text-primary);
    }
    &.active:not(:disabled) {
      background: var(--monster-xyz-active);
      border-color: var(--monster-xyz-active-border);
      color: var(--button-text);
    }
    &.not:not(:disabled) {
      background: linear-gradient(135deg, #bdbdbd 0%, #bdbdbd 40%, #e57373 70%, #d32f2f 100%);
      border: 1.5px solid #b71c1c;
      color: var(--text-primary);
    }
  }

  .chip[data-type="link"] {
    &:not(:disabled) {
      background: var(--monster-link-bg);
      border-color: var(--monster-link-border);
    }
    &.active:not(:disabled) {
      background: var(--monster-link-active);
      border-color: var(--monster-link-active-border);
      color: var(--button-text);
    }
    &.not:not(:disabled) {
      background: linear-gradient(135deg, #bbdefb 0%, #bbdefb 40%, #ffcdd2 70%, #ef5350 100%);
      border: 1.5px solid #d32f2f;
      color: var(--color-info);
    }
  }

  .chip[data-type="ritual"] {
    &:not(:disabled) {
      background: var(--monster-ritual-bg);
      border-color: var(--monster-ritual-border);
    }
    &.active:not(:disabled) {
      background: var(--monster-ritual-active);
      border-color: var(--monster-ritual-active-border);
      color: var(--button-text);
    }
    &.not:not(:disabled) {
      background: linear-gradient(135deg, #b2ebf2 0%, #b2ebf2 40%, #ffcdd2 70%, #ef5350 100%);
      border: 1.5px solid #d32f2f;
      color: #006064;
    }
  }

  .chip[data-type="pendulum"] {
    &:not(:disabled) {
      background: var(--monster-pendulum-bg);
      border-color: var(--monster-pendulum-border);
    }
    &.active:not(:disabled) {
      background: var(--monster-pendulum-active);
      border-color: var(--monster-pendulum-active-border);
      color: var(--button-text);
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
      color: var(--color-warning);
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
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
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
    background: var(--button-bg);
  }

  .tab-header {
    flex: 1;
    display: flex;
    align-items: stretch;
    gap: 0;
    min-height: 24px;
    padding: 0;
    background: transparent;
    border-right: 2px solid var(--border-primary);
    cursor: pointer;
    position: relative;

    &:last-child {
      border-right: none;
    }

    &:has(.level-tab.active) {
      background: var(--tab-monster-active-bg);
    }

    &:hover:not(:has(.level-tab:disabled)) {
      background: var(--bg-secondary);
    }

    &:has(.level-tab.active):hover {
      background: var(--tab-monster-active-bg);
      opacity: 0.85;
    }

    .selected-chips-inline {
      background: var(--tab-monster-active-bg);
    }
  }
}

.level-tab {
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--text-primary);
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
    color: var(--text-primary);
  }

  &:disabled {
    background: transparent;
    color: var(--text-tertiary);
    cursor: not-allowed;
    position: relative;
  }

  &:disabled[title]:hover::after {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: var(--button-text);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 400;
    white-space: nowrap;
    z-index: 10001;
    pointer-events: none;
    margin-bottom: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  &:disabled[title]:hover::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
    margin-bottom: 1px;
    z-index: 10001;
    pointer-events: none;
  }
}

.selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
  padding: 6px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  min-height: 30px;
}

.selected-chip {
  padding: 2px 8px;
  background: var(--color-success);
  color: var(--button-text);
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
        background: var(--border-secondary);
      }
    }

    span {
      position: absolute;
      width: 16px;
      height: 16px;
      clip-path: polygon(0 0, 100% 100%, 0 100%);
      background: var(--border-secondary);
      cursor: pointer;

      &.active {
        background: var(--color-success);
      }

      &:hover {
        background: var(--color-success);
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
      padding: 2px 6px;
      border-radius: 2px;
      font-size: 9px;
      font-weight: 700;
    }
  }
}

.atk-def-section-wrapper {
  border-radius: 6px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);

  &.stat-type-atk,
  &.stat-type-def {
    background: var(--bg-primary);
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
    background: var(--button-bg);
  }

  .tab-header {
    flex: 1;
    display: flex;
    align-items: stretch;
    gap: 0;
    min-height: 24px;
    padding: 0;
    background: transparent;
    border-right: 2px solid var(--border-primary);
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
      background: var(--bg-secondary);
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
  color: var(--text-primary);
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
    color: var(--text-primary);
  }

  &:disabled {
    background: transparent;
    color: var(--text-tertiary);
    cursor: not-allowed;
    position: relative;
  }

  &:disabled[title]:hover::after {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: var(--button-text);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 400;
    white-space: nowrap;
    z-index: 10001;
    pointer-events: none;
    margin-bottom: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  &:disabled[title]:hover::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
    margin-bottom: 1px;
    z-index: 10001;
    pointer-events: none;
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
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 500;

  input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: var(--color-success);
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
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    font-size: 12px;
    background: var(--bg-primary);
    color: var(--text-primary);
    text-align: center;

    &:disabled {
      background: var(--bg-secondary);
      color: var(--text-tertiary);
      cursor: not-allowed;
    }

    &:focus {
      outline: none;
      border-color: var(--color-success);
    }
  }

  span {
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 14px;
  }
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;

  input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    font-size: 12px;
    background: var(--bg-primary);
    text-align: center;

    &:focus {
      outline: none;
      border-color: var(--color-success);
    }
  }

  span {
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 14px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  margin-top: 8px;

  .close-button {
    padding: 10px 32px;
    font-size: 14px;
    font-weight: 600;
    color: var(--button-text);
    background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);

    &:hover {
      background: linear-gradient(135deg, #45a049 0%, #3d8b40 100%);
      box-shadow: 0 4px 8px rgba(76, 175, 80, 0.4);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
      box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
    }
  }
}
</style>
