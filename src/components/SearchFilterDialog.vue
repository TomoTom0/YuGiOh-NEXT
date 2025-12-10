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

      <!-- スクロール可能なボディー -->
      <div class="dialog-body">
        <!-- フィルタタブ -->
        <FilterTab
          v-if="activeDialogTab === 'filter'"
          :filters="filters"
          :exclusion-result="exclusionResult"
          :page-language="pageLanguage"
          :is-monster-type-field-disabled="isMonsterTypeFieldDisabled"
          :is-monster-tab-disabled="isMonsterTabDisabled"
          :is-spell-tab-disabled="isSpellTabDisabled"
          :is-trap-tab-disabled="isTrapTabDisabled"
          :selected-attribute-chips="selectedAttributeChips"
          :selected-spell-type-chips="selectedSpellTypeChips"
          :selected-trap-type-chips="selectedTrapTypeChips"
          :selected-race-chips="selectedRaceChips"
          :selected-monster-type-chips="selectedMonsterTypeChips"
          :selected-level-chips="selectedLevelChips"
          :selected-link-chips="selectedLinkChips"
          :selected-scale-chips="selectedScaleChips"
          :selected-atk-chips="selectedAtkChips"
          :selected-def-chips="selectedDefChips"
          @select-card-type="selectCardType"
          @toggle-attribute="toggleAttribute"
          @toggle-spell-type="toggleSpellType"
          @toggle-trap-type="toggleTrapType"
          @toggle-race="toggleRace"
          @cycle-monster-type-state="cycleMonsterTypeState"
          @toggle-monster-type-match-mode="toggleMonsterTypeMatchMode"
          @set-level-type="setLevelType"
          @toggle-level-value="toggleLevelValue"
          @toggle-link-value="toggleLinkValue"
          @toggle-link-marker="toggleLinkMarker"
          @toggle-link-marker-match-mode="toggleLinkMarkerMatchMode"
          @toggle-stat-exact="toggleStatExact"
          @toggle-stat-unknown="toggleStatUnknown"
          @validate-stat-input="validateStatInput"
        />

        <!-- 検索履歴タブ -->
        <HistoryTab
          v-if="activeDialogTab === 'history'"
          :history-items="searchHistory.historyItems.value"
          @execute="handleHistoryExecute"
          @toggle-favorite="handleHistoryToggleFavorite"
          @remove="handleHistoryRemove"
        />
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
import type { SearchFilters } from '../types/search-filters';
import type { CardInfo } from '../types/card';
import SearchInputBar from './searchInputBar/SearchInputBar.vue';
import FilterTab from './search-filter/FilterTab.vue';
import HistoryTab from './search-filter/HistoryTab.vue';
import { inferExclusions, loadExclusionRules } from '../utils/search-exclusion-engine';
import { toSearchConditionState } from '../utils/search-exclusion-adapter';
import { detectLanguage } from '../utils/language-detector';
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
  isMonsterTabDisabled,
  isSpellTabDisabled,
  isTrapTabDisabled,
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
  toggleStatExact,
  toggleStatUnknown,
  validateStatInput,
  selectCardType,
  toggleAttribute,
  toggleSpellType,
  toggleTrapType,
  toggleRace,
  cycleMonsterTypeState,
  toggleMonsterTypeMatchMode,
  setLevelType,
  toggleLinkMarkerMatchMode,
  toggleLevelValue,
  toggleLinkValue,
  toggleLinkMarker,
  clearFilters,
} = filterLogic;

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

// 履歴から検索を実行
function handleHistoryExecute(item: any) {
  const index = searchHistory.historyItems.value.indexOf(item);
  if (index >= 0) {
    executeHistorySearch(index);
  }
}

// 履歴のお気に入り状態を切り替え
function handleHistoryToggleFavorite(item: any) {
  const index = searchHistory.historyItems.value.indexOf(item);
  if (index >= 0) {
    searchHistory.toggleFavorite(index);
  }
}

// 履歴から削除
function handleHistoryRemove(item: any) {
  const index = searchHistory.historyItems.value.indexOf(item);
  if (index >= 0) {
    searchHistory.removeFromHistory(index);
  }
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
  flex-shrink: 0;

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

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  box-sizing: border-box;
  width: 100%;
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

.dialog-footer {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-top: 1px solid var(--border-primary, #ddd);
  box-sizing: border-box;

  .search-input-wrapper {
    flex: 1;
    min-width: 0;
  }

  .footer-close-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    margin: 0;
    font-size: 20px;
    font-weight: 300;
    line-height: 1;
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid var(--border-primary);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
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
</style>
