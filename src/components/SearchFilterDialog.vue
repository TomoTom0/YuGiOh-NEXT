<template>
  <div v-if="deckStore.isFilterDialogVisible" class="dialog-overlay" @click="deckStore.isFilterDialogVisible = false">
    <div class="dialog-content" @click.stop>
      <!-- タイトルバー -->
      <div class="dialog-header triple">
        <div class="dialog-tabs">
          <button
            class="dialog-tab"
            :class="{ active: activeDialogTab === 'filter' }"
            @click="activeDialogTab = 'filter'"
          >
            検索条件
          </button>
          <button
            class="dialog-tab"
            :class="{ active: activeDialogTab === 'history' }"
            @click="activeDialogTab = 'history'"
          >
            検索履歴
          </button>
        </div>
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
          <button class="close-btn" @click="deckStore.isFilterDialogVisible = false" title="閉じる">×</button>
        </div>
      </div>

      <div v-if="activeDialogTab === 'filter'" class="dialog-body">
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
      </div>

      <!-- 検索履歴タブ -->
      <div v-if="activeDialogTab === 'history'" class="dialog-body history-tab">
        <div v-if="searchHistory.historyItems.value.length === 0" class="history-empty">
          検索履歴はありません
        </div>
        <div v-else>
          <!-- お気に入り履歴 -->
          <div v-if="searchHistory.favoriteItems.value.length > 0" class="history-section">
            <div class="history-section-title">Favorites</div>
            <div class="history-list">
              <div
                v-for="(item, index) in searchHistory.favoriteItems.value"
                :key="`fav-${index}`"
                class="history-item"
              >
                <div class="history-item-content">
                  <div class="history-chips">
                    <span
                      v-for="(icon, idx) in getHistoryFilterIcons(item.filters)"
                      :key="idx"
                      class="history-chip"
                      :class="icon.type"
                    >{{ icon.label }}</span>
                  </div>
                  <div class="history-query">
                    <span class="history-mode">{{ item.searchMode }}</span>
                    <span class="history-text">{{ item.query || '(空)' }}</span>
                    <span class="history-count">{{ item.resultCount }}件</span>
                  </div>
                </div>
                <div class="history-actions">
                  <button class="history-btn search-btn" @click="executeHistorySearch(searchHistory.historyItems.value.indexOf(item))" title="検索">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button class="history-btn favorite-btn active" @click="searchHistory.toggleFavorite(searchHistory.historyItems.value.indexOf(item))" title="お気に入り">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" fill="currentColor" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </button>
                  <button class="history-btn delete-btn" @click="searchHistory.removeFromHistory(searchHistory.historyItems.value.indexOf(item))" title="削除">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 通常の履歴 -->
          <div v-if="searchHistory.regularItems.value.length > 0" class="history-section">
            <div v-if="searchHistory.favoriteItems.value.length > 0" class="history-section-title">Recent</div>
            <div class="history-list">
              <div
                v-for="(item, index) in searchHistory.regularItems.value"
                :key="`reg-${index}`"
                class="history-item"
              >
                <div class="history-item-content">
                  <div class="history-chips">
                    <span
                      v-for="(icon, idx) in getHistoryFilterIcons(item.filters)"
                      :key="idx"
                      class="history-chip"
                      :class="icon.type"
                    >{{ icon.label }}</span>
                  </div>
                  <div class="history-query">
                    <span class="history-mode">{{ item.searchMode }}</span>
                    <span class="history-text">{{ item.query || '(空)' }}</span>
                    <span class="history-count">{{ item.resultCount }}件</span>
                  </div>
                </div>
                <div class="history-actions">
                  <button class="history-btn search-btn" @click="executeHistorySearch(searchHistory.historyItems.value.indexOf(item))" title="検索">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button class="history-btn favorite-btn" @click="searchHistory.toggleFavorite(searchHistory.historyItems.value.indexOf(item))" title="お気に入り">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </button>
                  <button class="history-btn delete-btn" @click="searchHistory.removeFromHistory(searchHistory.historyItems.value.indexOf(item))" title="削除">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 固定フッター：すべてのタブで共通 -->
      <div class="dialog-footer">
        <SearchInputBar position="bottom" />
        <button class="footer-close-btn" @click="deckStore.isFilterDialogVisible = false" title="閉じる">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue';
import { useDeckEditStore } from '../stores/deck-edit';
import { useSearchStore } from '../stores/search';
import type { Attribute, Race, MonsterType, CardInfo, SpellEffectType, TrapEffectType } from '../types/card';
import type { SearchFilters } from '../types/search-filters';
import { getAttributeIconUrl, getSpellIconUrl, getTrapIconUrl } from '../api/image-utils';
import SearchInputBar from './searchInputBar/SearchInputBar.vue';
import { getAttributeLabel, getSpellTypeLabel, getTrapTypeLabel } from '../utils/filter-label';
import { convertFiltersToIcons } from '../utils/filter-icons';
import { inferExclusions, loadExclusionRules } from '../utils/search-exclusion-engine';
import { toSearchConditionState } from '../utils/search-exclusion-adapter';
import { detectLanguage } from '../utils/language-detector';
import { mappingManager } from '../utils/mapping-manager';
import { useSearchHistory } from '../composables/useSearchHistory';
import { useFilterLogic } from '../composables/search-filter/useFilterLogic';

const deckStore = useDeckEditStore();
const searchStore = useSearchStore();
const searchHistory = useSearchHistory();
const activeDialogTab = ref<'filter' | 'history'>('filter');

defineProps<{
  initialFilters?: SearchFilters;
}>();

const emit = defineEmits<{
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

// ページ言語を検出（多言語対応）
const pageLanguage = computed(() => {
  return detectLanguage(document);
});

// 推論エンジンのルールをロード
const exclusionRules = loadExclusionRules();

// 推論結果を計算
const exclusionResult = computed(() => {
  const state = toSearchConditionState(filters);
  return inferExclusions(state, exclusionRules);
});

// useFilterLogic を使用してフィルタロジックを取得
const filterLogic = useFilterLogic(filters, exclusionResult, pageLanguage, emit);

// filterLogicから必要な関数と値を展開
const {
  isMonsterTypeFieldDisabled,
  isMonsterTypeAttributeDisabled,
  getFieldDisabledReason,
  getMonsterTypeDisabledReason,
  isMonsterTabDisabled,
  isSpellTabDisabled,
  isTrapTabDisabled,
  isFieldDisabled,
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
  hasActiveFilters,
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
  clearFilters,
} = filterLogic;

// 種族の順序（名前順、幻神獣族と創造神族は最後）
const racesOrdered: Race[] = [
  'zombie', 'fiend', 'dinosaur', 'seaserpent', 'machine', 'rock', 'insect',
  'psychic', 'cyberse', 'beast', 'beastwarrior', 'warrior', 'fairy', 'windbeast',
  'dragon', 'reptile', 'fish', 'pyro', 'wyrm', 'illusion', 'spellcaster', 'aqua',
  'thunder', 'plant', 'divine', 'creatorgod'
];

// ボタン表示用のラベル取得関数（言語対応版）
const getRaceButtonLabel = (race: string) => {
  const lang = pageLanguage.value;
  const idToText = mappingManager.getRaceIdToText(lang);
  return (idToText as Record<string, string>)[race] || race;
};

const getMonsterTypeButtonLabel = (type: string) => {
  const lang = pageLanguage.value;
  const idToText = mappingManager.getMonsterTypeIdToText(lang);
  return (idToText as Record<string, string>)[type] || type;
};

// 最大日付（来年末）
const maxDate = computed(() => {
  const nextYear = new Date().getFullYear() + 1;
  return `${nextYear}-12-31`;
});

// 検索履歴から検索を実行（UnifiedCacheDBからの復元）
async function executeHistorySearch(index: number) {
  const item = searchHistory.historyItems.value[index];
  if (!item) return;

  // 検索条件を復元
  Object.assign(filters, item.filters);
  searchStore.searchQuery = item.query;

  // ダイアログを閉じる
  deckStore.isFilterDialogVisible = false;
  deckStore.activeTab = 'search';

  // UnifiedCacheDB (cache db) から検索結果を復元
  const { getUnifiedCacheDB } = await import('../utils/unified-cache-db');
  const cacheDB = getUnifiedCacheDB();

  const cachedResults: CardInfo[] = [];
  for (const cid of item.resultCids) {
    const cardInfo = cacheDB.reconstructCardInfo(cid);
    if (cardInfo) {
      cachedResults.push(cardInfo);
    }
  }

  // キャッシュから復元できた結果を即座に表示
  if (cachedResults.length > 0) {
    searchStore.searchResults = cachedResults as unknown as typeof searchStore.searchResults;
    searchStore.allResults = cachedResults as unknown as typeof searchStore.allResults;
    searchStore.isGlobalSearchMode = false;
  }

  // 日付が異なる場合は、バックグラウンドで再検索して更新
  const today = new Date().toDateString();
  const itemDate = new Date(item.timestamp).toDateString();

  if (today !== itemDate) {
    setTimeout(async () => {
      try {
        const { searchCards, searchCardsAuto } = await import('../api/card-search');
        let newResults: CardInfo[] = [];

        if (item.searchMode === 'auto') {
          const autoResult = await searchCardsAuto(item.query, 100, item.filters.cardType ?? undefined);
          newResults = autoResult.cards;
        } else {
          const searchTypeMap: Record<string, '1' | '2' | '3' | '4'> = {
            name: '1',
            text: '2',
            pendulum: '3'
          };
          const searchType = searchTypeMap[item.searchMode] || '1';

          const searchOptions = {
            keyword: item.query,
            searchType,
            resultsPerPage: 100,
            sort: 1
          };

          newResults = await searchCards(searchOptions);
        }

        // 結果が変わっていれば更新
        const newResultCids = newResults.map(card => card.cardId);
        const updated = searchHistory.updateResults(index, newResultCids);

        if (updated) {
          searchStore.searchResults = newResults as unknown as typeof searchStore.searchResults;
          searchStore.allResults = newResults as unknown as typeof searchStore.allResults;
          console.log('[YGO Helper] 検索履歴を更新しました（日付変更のため）');
        }
      } catch (error) {
        console.error('[YGO Helper] 検索履歴のバックグラウンド更新に失敗しました:', error);
      }
    }, 100);
  }
}

// 検索履歴のフィルターアイコンを取得
function getHistoryFilterIcons(historyFilters: SearchFilters) {
  return convertFiltersToIcons(historyFilters);
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
  height: 90vh;
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
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 3px;
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-primary, #ddd);
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  line-height: 1.3;
}

.dialog-tabs {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.dialog-tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    color: var(--text-primary, #000);
  }

  &.active {
    color: var(--text-primary, #000);
    border-bottom-color: var(--primary-color, #2196F3);
  }
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
  padding: 2px;
  margin: 0;
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
      background: var(--tab-monster-active-bg);
    }

    &:hover:not(:has(.stat-tab:disabled)) {
      background: var(--bg-secondary);
    }

    &:has(.stat-tab.active):hover {
      background: var(--tab-monster-active-bg);
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

.dialog-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid var(--border-primary, #ddd);

  .search-input-wrapper {
    flex: 1;
  }

  .footer-close-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    margin: 0;
    font-size: 24px;
    font-weight: 300;
    line-height: 1;
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid var(--border-primary);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border-color: var(--text-secondary);
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.95);
    }
  }
}

// 検索履歴タブのスタイル
.history-tab {
  padding: 16px;
  overflow-y: auto;
  width: 100%;
  box-sizing: border-box;
}

.history-empty {
  text-align: center;
  padding: 32px;
  color: var(--text-secondary, #666);
  font-size: 14px;
}

.history-section {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.history-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #666);
  padding: 4px 8px;
  margin-bottom: 8px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 4px;
}

.history-item {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-primary, #fff);
  border-bottom: 1px solid var(--border-primary, #e0e0e0);
  width: 100%;
  box-sizing: border-box;
  align-items: flex-start;
  min-height: 40px;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  &:last-child {
    border-bottom: none;
  }
}

.history-item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  align-items: flex-start;
}

.history-query {
  display: flex;
  gap: 8px;
  align-items: baseline;
  width: 100%;
}

.history-mode {
  color: var(--text-primary, #000);
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  font-family: monospace;
  background: var(--bg-secondary, #f0f0f0);
  padding: 2px 6px;
  border-radius: 3px;
}

.history-text {
  color: var(--text-primary, #333);
  font-size: 14px;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.history-count {
  color: var(--text-secondary, #999);
  font-size: 11px;
  flex-shrink: 0;
}

.history-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: flex-start;
  width: 100%;
  min-height: 18px;
}

.history-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 3px;
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-primary, #ddd);
  line-height: 1.3;
}

.history-actions {
  display: flex;
  gap: 4px;
  align-items: flex-start;
  padding-top: 2px;
}

.history-btn {
  width: 28px;
  height: 28px;
  padding: 4px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary, #999);
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--bg-secondary, #f0f0f0);
    color: var(--text-primary, #333);
  }

  &.favorite-btn.active {
    color: var(--color-error, #f44336);
  }

  &.delete-btn:hover {
    background: var(--color-error, #f44336);
    color: #fff;
    border-color: var(--color-error, #f44336);
  }
}
</style>
