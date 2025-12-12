<template>
  <div class="dialog-body filter-tab">
    <!-- カードタイプタブと属性/魔法タイプ/罠タイプ -->
    <div class="card-type-section">
      <div class="card-type-tabs">
        <!-- モンスタータブ -->
        <div class="card-type-tab-wrapper monster-wrapper">
          <div class="tab-header">
            <button
              class="card-type-tab"
              :class="{ active: filters.cardType === 'monster' }"
              :disabled="isMonsterTabDisabled"
              :title="isMonsterTabDisabled ? '他のカードタイプが選択されています' : undefined"
              @click.stop="selectCardType('monster')"
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
                :title="isFieldDisabled('attribute') ? getFieldDisabledReason('attribute') : undefined"
                @click.stop="toggleAttribute(attr)"
              >
                <img :src="getAttributeIconUrl(attr)" class="attr-icon" :alt="getAttributeLabel(attr)">
                {{ getAttributeLabel(attr) }}
              </button>
            </div>
          </div>
        </div>

        <!-- 魔法タブ -->
        <div class="card-type-tab-wrapper spell-wrapper">
          <div class="tab-header">
            <button
              class="card-type-tab"
              :class="{ active: filters.cardType === 'spell' }"
              :disabled="isSpellTabDisabled"
              :title="isSpellTabDisabled ? '他のカードタイプが選択されています' : undefined"
              @click.stop="selectCardType('spell')"
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
                @click.stop="toggleSpellType(type)"
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
                @click.stop="toggleSpellType(type)"
              >
                {{ getSpellTypeLabel(type) }}
              </button>
            </div>
          </div>
        </div>

        <!-- 罠タブ -->
        <div class="card-type-tab-wrapper trap-wrapper">
          <div class="tab-header">
            <button
              class="card-type-tab"
              :class="{ active: filters.cardType === 'trap' }"
              :disabled="isTrapTabDisabled"
              :title="isTrapTabDisabled ? '他のカードタイプが選択されています' : undefined"
              @click.stop="selectCardType('trap')"
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
                @click.stop="toggleTrapType(type)"
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
          :title="isFieldDisabled('race') ? getFieldDisabledReason('race') : undefined"
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
            :data-type="type"
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
              @click="setLevelType('level')"
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
              @click="setLevelType('link')"
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
              @click="setLevelType('scale')"
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SearchFilters } from '@/types/search-filters';
import type { Attribute, Race, MonsterType, SpellEffectType, TrapEffectType } from '@/types/card-maps';
import type { ExclusionResult } from '@/types/search-exclusion';
import { getAttributeIconUrl, getSpellIconUrl, getTrapIconUrl } from '@/api/image-utils';
import { getAttributeLabel, getSpellTypeLabel, getTrapTypeLabel } from '@/utils/filter-label';
import { mappingManager } from '@/utils/mapping-manager';
import { MONSTER_TYPE_ID_TO_NAME } from '@/types/card-maps';

// Props
// @ts-ignore - Used by defineProps
interface Props {
  filters: SearchFilters;
  exclusionResult: ExclusionResult;
  pageLanguage: string;
  isMonsterTypeFieldDisabled: boolean;
  isMonsterTabDisabled: boolean;
  isSpellTabDisabled: boolean;
  isTrapTabDisabled: boolean;
  selectedAttributeChips: string[];
  selectedSpellTypeChips: string[];
  selectedTrapTypeChips: string[];
  selectedRaceChips: string[];
  selectedMonsterTypeChips: string[];
  selectedLevelChips: string[];
  selectedLinkChips: string[];
  selectedScaleChips: string[];
  selectedAtkChips: string[];
  selectedDefChips: string[];
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'select-card-type': [cardType: 'monster' | 'spell' | 'trap'];
  'toggle-attribute': [attr: Attribute];
  'toggle-spell-type': [type: SpellEffectType];
  'toggle-trap-type': [type: TrapEffectType];
  'toggle-race': [race: Race];
  'cycle-monster-type-state': [type: MonsterType];
  'toggle-monster-type-match-mode': [];
  'set-level-type': [levelType: 'level' | 'link' | 'scale'];
  'toggle-level-value': [value: number];
  'toggle-link-value': [value: number];
  'toggle-link-marker': [pos: number];
  'toggle-link-marker-match-mode': [];
  'toggle-stat-exact': [stat: 'atk' | 'def'];
  'toggle-stat-unknown': [stat: 'atk' | 'def'];
  'validate-stat-input': [event: Event, stat: 'atk' | 'def', field: 'min' | 'max'];
}>();

// State
const activeStatTab = ref<'atk' | 'def'>('atk');

// Computed
const maxDate = computed(() => {
  const nextYear = new Date().getFullYear() + 1;
  return `${nextYear}-12-31`;
});

// 種族の順序（名前順、幻神獣族と創造神族は最後）
const racesOrdered: Race[] = [
  'zombie', 'fiend', 'dinosaur', 'seaserpent', 'machine', 'rock', 'insect',
  'psychic', 'cyberse', 'beast', 'beastwarrior', 'warrior', 'fairy', 'windbeast',
  'dragon', 'reptile', 'fish', 'pyro', 'wyrm', 'illusion', 'spellcaster', 'aqua',
  'thunder', 'plant', 'divine', 'creatorgod'
];

// Methods
function selectCardType(cardType: 'monster' | 'spell' | 'trap') {
  emit('select-card-type', cardType);
}

function toggleAttribute(attr: Attribute) {
  emit('toggle-attribute', attr);
}

function toggleSpellType(type: SpellEffectType) {
  emit('toggle-spell-type', type);
}

function toggleTrapType(type: TrapEffectType) {
  emit('toggle-trap-type', type);
}

function toggleRace(race: Race) {
  emit('toggle-race', race);
}

function cycleMonsterTypeState(type: MonsterType) {
  emit('cycle-monster-type-state', type);
}

function toggleMonsterTypeMatchMode() {
  emit('toggle-monster-type-match-mode');
}

function setLevelType(levelType: 'level' | 'link' | 'scale') {
  emit('set-level-type', levelType);
}

function toggleLevelValue(value: number) {
  emit('toggle-level-value', value);
}

function toggleLinkValue(value: number) {
  emit('toggle-link-value', value);
}

function toggleLinkMarker(pos: number) {
  emit('toggle-link-marker', pos);
}

function toggleLinkMarkerMatchMode() {
  emit('toggle-link-marker-match-mode');
}

function toggleStatExact(stat: 'atk' | 'def') {
  emit('toggle-stat-exact', stat);
}

function toggleStatUnknown(stat: 'atk' | 'def') {
  emit('toggle-stat-unknown', stat);
}

function validateStatInput(event: Event, stat: 'atk' | 'def', field: 'min' | 'max') {
  emit('validate-stat-input', event, stat, field);
}

// Helper functions
function isFieldDisabled(field: string): boolean {
  const fieldState = props.exclusionResult.fieldStates.get(field);
  if (fieldState) {
    return !fieldState.enabled;
  }
  // フィールドが存在しない場合は、card-typeから推論
  if (props.filters.cardType !== null) {
    // monsterカードタイプ専用フィールド
    const monsterOnlyFields = ['attribute', 'race', 'level-rank', 'link-value', 'link-marker', 'p-scale', 'atk', 'def'];
    if (monsterOnlyFields.includes(field) && props.filters.cardType !== 'monster') {
      return true;
    }
    // spellカードタイプ専用フィールド
    if (field === 'spell-type' && props.filters.cardType !== 'spell') {
      return true;
    }
    // trapカードタイプ専用フィールド
    if (field === 'trap-type' && props.filters.cardType !== 'trap') {
      return true;
    }
  }

  return false;
}



function getFieldDisabledReason(field: string): string | undefined {
  const fieldState = props.exclusionResult.fieldStates.get(field);
  return fieldState?.disabledReason;
}

function isMonsterTypeAttributeDisabled(type: MonsterType): boolean {
  // フィールド全体が無効化されている場合（cardTypeがspell/trapの場合など）
  if (props.isMonsterTypeFieldDisabled) {
    return true;
  }

  // または個別のモンスタータイプ属性が無効化されているか
  const attrState = props.exclusionResult.attributeStates.get(`monster-type_${type}`);
  return attrState ? !attrState.enabled : false;
}

function getMonsterTypeDisabledReason(type: MonsterType): string | undefined {
  // フィールド全体が無効化されている場合
  if (props.isMonsterTypeFieldDisabled) {
    const attrState = props.exclusionResult.attributeStates.get('card-type_monster');
    return attrState?.disabledReason;
  }

  // または個別のモンスタータイプが無効化されている場合
  const attrState = props.exclusionResult.attributeStates.get(`monster-type_${type}`);
  return attrState?.disabledReason;
}

function getMonsterTypeClass(type: MonsterType) {
  const state = props.filters.monsterTypes.find(t => t.type === type);
  if (!state) return '';
  return state.state === 'not' ? 'not' : 'active';
}

function isLevelValueActive(num: number): boolean {
  if (props.filters.levelType === 'level') {
    return props.filters.levelValues.includes(num);
  } else {
    return props.filters.scaleValues.includes(num);
  }
}

function isLinkMarkerActive(pos: number): boolean {
  return props.filters.linkMarkers.includes(pos);
}

function getStatFilter(stat: 'atk' | 'def') {
  return props.filters[stat];
}

// ボタン表示用のラベル取得関数（言語対応版）
function getRaceButtonLabel(race: string) {
  const lang = props.pageLanguage;
  const idToText = mappingManager.getRaceIdToText(lang);
  return (idToText as Record<string, string>)[race] || race;
}

function getMonsterTypeButtonLabel(type: string) {
  const lang = props.pageLanguage;
  const idToText = mappingManager.getMonsterTypeIdToText(lang);
  const label = (idToText as Record<string, string>)[type];

  // mappingManagerから取得できない場合、MONSTER_TYPE_ID_TO_NAMEをフォールバックとして使用
  if (!label) {
    return (MONSTER_TYPE_ID_TO_NAME as Record<string, string>)[type] || type;
  }

  return label;
}
</script>

<style scoped lang="scss">
.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px; // フッター分のスペース確保
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
  background: var(--selected-chips-monster-bg);
}

.spell-wrapper .selected-chips-inline {
  background: var(--selected-chips-spell-bg);
}

.trap-wrapper .selected-chips-inline {
  background: var(--selected-chips-trap-bg);
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
    position: relative;
  }

  // disabled 状態のボタンで tooltip は常に opacity: 1
  &:disabled::after,
  &:disabled::before {
    opacity: 1;
  }

  &:disabled:hover::after {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: var(--button-text);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 400;
    white-space: nowrap;
    z-index: 10001;
    pointer-events: none;
    margin-bottom: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    opacity: 1;
  }

  &:disabled:hover::before {
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
    opacity: 1;
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
  height: 28px;
  line-height: 1;

  &:hover:not(:disabled) {
    background: var(--color-success-bg);
    border-color: var(--color-success);
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(76, 175, 80, 0.25);
  }

  &.active:not(:disabled) {
    background: var(--filter-button-active-bg);
    color: var(--button-text);
    border: 1.5px solid var(--filter-button-active-border);
    box-shadow: var(--filter-button-active-shadow);
    font-weight: 700;
  }

  &.not:not(:disabled) {
    background: var(--filter-button-not-bg);
    color: var(--button-text);
    border: 1.5px solid var(--filter-button-not-border);
    box-shadow: var(--filter-button-not-shadow);
    font-weight: 700;
    font-size: 10px;

    &::before {
      content: 'N-';
      font-weight: 900;
    }
  }

  &:disabled {
    cursor: not-allowed;
    background: var(--filter-button-disabled-bg);
    color: var(--filter-button-disabled-text);
    border: 1.5px dashed var(--filter-button-disabled-border);
    position: relative;
  }

  &:disabled:hover::after {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: var(--button-text);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 400;
    white-space: nowrap;
    z-index: 10001;
    pointer-events: none;
    margin-bottom: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    opacity: 1;
  }

  &:disabled:hover::before {
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
    opacity: 1;
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
      background: var(--filter-button-pendulum-active-bg);
      color: var(--button-text);
      border: 1.5px solid var(--filter-button-pendulum-active-border);
      box-shadow: var(--filter-button-pendulum-active-shadow);
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
      background: var(--monster-fusion-chip-default-bg);
      border-color: var(--monster-fusion-chip-default-border);
      color: var(--monster-fusion-chip-default-text);
    }
    &:hover:not(:disabled) {
      background: var(--monster-fusion-chip-hover-bg);
      border-color: var(--monster-fusion-chip-hover-border);
      color: var(--monster-fusion-chip-hover-text);
    }
    &.active:not(:disabled) {
      background: var(--monster-fusion-chip-active-bg);
      border-color: var(--monster-fusion-chip-active-border);
      color: var(--monster-fusion-chip-active-text);
    }
    &.active:hover:not(:disabled) {
      background: var(--monster-fusion-chip-active-hover-bg);
      border-color: var(--monster-fusion-chip-active-border);
      color: var(--monster-fusion-chip-active-hover-text);
    }
    &.not:not(:disabled) {
      background: var(--monster-fusion-chip-not-bg);
      border-color: var(--monster-fusion-chip-not-border);
      color: var(--monster-fusion-chip-not-text);
    }
    &.not:hover:not(:disabled) {
      background: var(--monster-fusion-chip-not-hover-bg);
      border-color: var(--monster-fusion-chip-not-hover-border);
      color: var(--monster-fusion-chip-not-hover-text);
    }
  }

  .chip[data-type="synchro"] {
    &:not(:disabled) {
      background: var(--monster-synchro-chip-default-bg);
      border-color: var(--monster-synchro-chip-default-border);
      color: var(--monster-synchro-chip-default-text);
    }
    &:hover:not(:disabled) {
      background: var(--monster-synchro-chip-hover-bg);
      border-color: var(--monster-synchro-chip-hover-border);
      color: var(--monster-synchro-chip-hover-text);
    }
    &.active:not(:disabled) {
      background: var(--monster-synchro-chip-active-bg);
      border-color: var(--monster-synchro-chip-active-border);
      color: var(--monster-synchro-chip-active-text);
    }
    &.active:hover:not(:disabled) {
      background: var(--monster-synchro-chip-active-hover-bg);
      border-color: var(--monster-synchro-chip-active-border);
      color: var(--monster-synchro-chip-active-hover-text);
    }
    &.not:not(:disabled) {
      background: var(--monster-synchro-chip-not-bg);
      border-color: var(--monster-synchro-chip-not-border);
      color: var(--monster-synchro-chip-not-text);
    }
    &.not:hover:not(:disabled) {
      background: var(--monster-synchro-chip-not-hover-bg);
      border-color: var(--monster-synchro-chip-not-hover-border);
      color: var(--monster-synchro-chip-not-hover-text);
    }
  }

  .chip[data-type="xyz"] {
    &:not(:disabled) {
      background: var(--monster-xyz-chip-default-bg);
      border-color: var(--monster-xyz-chip-default-border);
      color: var(--monster-xyz-chip-default-text);
    }
    &:hover:not(:disabled) {
      background: var(--monster-xyz-chip-hover-bg);
      border-color: var(--monster-xyz-chip-hover-border);
      color: var(--monster-xyz-chip-hover-text);
    }
    &.active:not(:disabled) {
      background: var(--monster-xyz-chip-active-bg);
      border-color: var(--monster-xyz-chip-active-border);
      color: var(--monster-xyz-chip-active-text);
    }
    &.active:hover:not(:disabled) {
      background: var(--monster-xyz-chip-active-hover-bg);
      border-color: var(--monster-xyz-chip-active-border);
      color: var(--monster-xyz-chip-active-hover-text);
    }
    &.not:not(:disabled) {
      background: var(--monster-xyz-chip-not-bg);
      border-color: var(--monster-xyz-chip-not-border);
      color: var(--monster-xyz-chip-not-text);
    }
    &.not:hover:not(:disabled) {
      background: var(--monster-xyz-chip-not-hover-bg);
      border-color: var(--monster-xyz-chip-not-hover-border);
      color: var(--monster-xyz-chip-not-hover-text);
    }
  }

  .chip[data-type="link"] {
    &:not(:disabled) {
      background: var(--monster-link-chip-default-bg);
      border-color: var(--monster-link-chip-default-border);
      color: var(--monster-link-chip-default-text);
    }
    &:hover:not(:disabled) {
      background: var(--monster-link-chip-hover-bg);
      border-color: var(--monster-link-chip-hover-border);
      color: var(--monster-link-chip-hover-text);
    }
    &.active:not(:disabled) {
      background: var(--monster-link-chip-active-bg);
      border-color: var(--monster-link-chip-active-border);
      color: var(--monster-link-chip-active-text);
    }
    &.active:hover:not(:disabled) {
      background: var(--monster-link-chip-active-hover-bg);
      border-color: var(--monster-link-chip-active-border);
      color: var(--monster-link-chip-active-hover-text);
    }
    &.not:not(:disabled) {
      background: var(--monster-link-chip-not-bg);
      border-color: var(--monster-link-chip-not-border);
      color: var(--monster-link-chip-not-text);
    }
    &.not:hover:not(:disabled) {
      background: var(--monster-link-chip-not-hover-bg);
      border-color: var(--monster-link-chip-not-hover-border);
      color: var(--monster-link-chip-not-hover-text);
    }
  }

  .chip[data-type="ritual"] {
    &:not(:disabled) {
      background: var(--monster-ritual-chip-default-bg);
      border-color: var(--monster-ritual-chip-default-border);
      color: var(--monster-ritual-chip-default-text);
    }
    &:hover:not(:disabled) {
      background: var(--monster-ritual-chip-hover-bg);
      border-color: var(--monster-ritual-chip-hover-border);
      color: var(--monster-ritual-chip-hover-text);
    }
    &.active:not(:disabled) {
      background: var(--monster-ritual-chip-active-bg);
      border-color: var(--monster-ritual-chip-active-border);
      color: var(--monster-ritual-chip-active-text);
    }
    &.active:hover:not(:disabled) {
      background: var(--monster-ritual-chip-active-hover-bg);
      border-color: var(--monster-ritual-chip-active-border);
      color: var(--monster-ritual-chip-active-hover-text);
    }
    &.not:not(:disabled) {
      background: var(--monster-ritual-chip-not-bg);
      border-color: var(--monster-ritual-chip-not-border);
      color: var(--monster-ritual-chip-not-text);
    }
    &.not:hover:not(:disabled) {
      background: var(--monster-ritual-chip-not-hover-bg);
      border-color: var(--monster-ritual-chip-not-hover-border);
      color: var(--monster-ritual-chip-not-hover-text);
    }
  }

  .chip[data-type="pendulum"] {
    &:not(:disabled) {
      background: var(--monster-pendulum-chip-default-bg);
      border-color: var(--monster-pendulum-chip-default-border);
      color: var(--monster-pendulum-chip-default-text);
    }
    &:hover:not(:disabled) {
      background: var(--monster-pendulum-chip-hover-bg);
      border-color: var(--monster-pendulum-chip-hover-border);
      color: var(--monster-pendulum-chip-hover-text);
    }
    &.active:not(:disabled) {
      background: var(--monster-pendulum-chip-active-bg);
      border-color: var(--monster-pendulum-chip-active-border);
      color: var(--monster-pendulum-chip-active-text);
    }
    &.active:hover:not(:disabled) {
      background: var(--monster-pendulum-chip-active-hover-bg);
      border-color: var(--monster-pendulum-chip-active-border);
      color: var(--monster-pendulum-chip-active-hover-text);
    }
    &.not:not(:disabled) {
      background: var(--monster-pendulum-chip-not-bg);
      border-color: var(--monster-pendulum-chip-not-border);
      color: var(--monster-pendulum-chip-not-text);
    }
    &.not:hover:not(:disabled) {
      background: var(--monster-pendulum-chip-not-hover-bg);
      border-color: var(--monster-pendulum-chip-not-hover-border);
      color: var(--monster-pendulum-chip-not-hover-text);
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

  // disabled 状態のボタンで tooltip は常に opacity: 1（title属性の有無に関わらず）
  &:disabled::after,
  &:disabled::before {
    opacity: 1;
  }

  &:disabled:hover::after {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: var(--button-text);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 400;
    white-space: nowrap;
    z-index: 10001;
    pointer-events: none;
    margin-bottom: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    opacity: 1;
  }

  &:disabled:hover::before {
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
    opacity: 1;
  }
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
      cursor: not-allowed;
      color: var(--text-secondary);
      background: var(--bg-tertiary);

      &:hover {
        background: var(--bg-tertiary);
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
      background: var(--tab-monster-active-bg);
    }

    &:hover:not(:has(.stat-tab:disabled)) {
      background: var(--bg-secondary);
    }

    &:has(.stat-tab.active):hover {
      background: var(--tab-monster-active-bg);
    }

    .selected-chips-inline {
      background: transparent;
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

  // disabled 状態のボタンで tooltip は常に opacity: 1（title属性の有無に関わらず）
  &:disabled::after,
  &:disabled::before {
    opacity: 1;
  }

  &:disabled:hover::after {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: var(--button-text);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 400;
    white-space: nowrap;
    z-index: 10001;
    pointer-events: none;
    margin-bottom: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    opacity: 1;
  }

  &:disabled:hover::before {
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
    opacity: 1;
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
    color: var(--input-text);
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
</style>
