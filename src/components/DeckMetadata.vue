<template>
  <div class="deck-metadata">
    <!-- 1行目: 公開/非公開 + デッキタイプアイコン + Style + Tag + Cat -->
    <DeckMetadataHeader
      :is-public="localIsPublic"
      :deck-type="localDeckType"
      :deck-style="localDeckStyle"
      @toggle-public="togglePublicStatus"
      @select-deck-type="selectDeckType"
      @select-deck-style="selectDeckStyle"
      @show-tag-dialog="showTagDialog = true"
      @show-category-dialog="showCategoryDialog = true"
    />

    <!-- ダイアログコンポーネント -->
    <TagDialog
      :model-value="localTags"
      :is-visible="showTagDialog"
      :tags="tagList"
      :deck-cards="allDeckCards"
      @update:model-value="updateTags"
      @close="showTagDialog = false"
    />
    
    <CategoryDialog
      :model-value="localCategory"
      :is-visible="showCategoryDialog"
      :categories="categories"
      :deck-cards="allDeckCards"
      @update:model-value="updateCategories"
      @close="showCategoryDialog = false"
    />

    <!-- 3行目: タグとカテゴリのチップ表示 -->
    <DeckMetadataTags
      :model-tags="localTags"
      :model-categories="localCategory"
      :tags="tags"
      :categories="categories"
      @remove-tag="removeTag"
      @remove-category="removeCategory"
    />

    <!-- 4行目: デッキ説明 -->
    <DeckMetadataDescription
      v-model="localComment"
      @update:model-value="updateComment"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useDeckEditStore } from '../stores/deck-edit';
import type { DeckTypeValue, DeckStyleValue } from '../types/deck-metadata';
import { getDeckMetadata } from '../utils/deck-metadata-loader';
import type { CategoryEntry } from '../types/dialog';
import CategoryDialog from './CategoryDialog.vue';
import TagDialog from './TagDialog.vue';
import DeckMetadataDescription from './DeckMetadataDescription.vue';
import DeckMetadataTags from './DeckMetadataTags.vue';
import DeckMetadataHeader from './DeckMetadataHeader.vue';
import { getTempCardDB } from '../utils/temp-card-db';

const deckStore = useDeckEditStore();

// メタデータ（カテゴリ・タグマスター）
const categories = ref<CategoryEntry[]>([]);
const tags = ref<Record<string, string>>({});
const tagList = computed(() => {
  return Object.entries(tags.value).map(([value, label]) => ({ value, label }));
});

// ローカル状態
const localIsPublic = ref(deckStore.deckInfo.isPublic ?? false);
const localDeckType = ref<DeckTypeValue>(deckStore.deckInfo.deckType ?? '-1');
const localDeckStyle = ref<DeckStyleValue>(deckStore.deckInfo.deckStyle ?? '-1');
const localCategory = ref<string[]>([...(deckStore.deckInfo.category ?? [])]);
const localTags = ref<string[]>([...(deckStore.deckInfo.tags ?? [])]);
const localComment = ref(deckStore.deckInfo.comment ?? '');

// ダイアログ表示状態
const showCategoryDialog = ref(false);
const showTagDialog = ref(false);

// デッキ内の全カード情報を取得
const allDeckCards = computed(() => {
  const cards: any[] = [];
  const tempCardDB = getTempCardDB();
  
  // mainDeck, extraDeck, sideDeckからカードIDを取得
  const allCardRefs = [
    ...deckStore.deckInfo.mainDeck,
    ...deckStore.deckInfo.extraDeck,
    ...deckStore.deckInfo.sideDeck
  ];
  
  // 重複を除いてCardInfoを取得
  const uniqueCardIds = new Set(allCardRefs.map(ref => ref.cid));
  for (const cid of uniqueCardIds) {
    const cardInfo = tempCardDB.get(cid);
    if (cardInfo) {
      cards.push(cardInfo);
    }
  }
  
  return cards;
});

// マウント時にメタデータを読み込み
onMounted(async () => {
  const metadata = await getDeckMetadata();
  categories.value = metadata.categories;
  tags.value = metadata.tags;

  // categoryLabelMapを更新（CategoryID -> Label のマッピング）
  const labelMap: Record<string, string> = {};
  metadata.categories.forEach(cat => {
    labelMap[cat.value] = cat.label;
  });
  deckStore.categoryLabelMap = labelMap;
});

// storeの変更を監視してローカル状態を更新
watch(() => deckStore.deckInfo, (newDeckInfo) => {
  localIsPublic.value = newDeckInfo.isPublic ?? false;
  localDeckType.value = newDeckInfo.deckType ?? '0';
  localDeckStyle.value = newDeckInfo.deckStyle ?? '-1';
  localCategory.value = [...(newDeckInfo.category ?? [])];
  localTags.value = [...(newDeckInfo.tags ?? [])];
  localComment.value = newDeckInfo.comment ?? '';
}, { deep: true });

// 更新関数
function togglePublicStatus() {
  localIsPublic.value = !localIsPublic.value;
  deckStore.deckInfo.isPublic = localIsPublic.value;
}

function selectDeckType(value: string) {
  localDeckType.value = value as DeckTypeValue;
  deckStore.deckInfo.deckType = localDeckType.value;
}

function selectDeckStyle(value: string) {
  localDeckStyle.value = value as DeckStyleValue;
  deckStore.deckInfo.deckStyle = localDeckStyle.value;
}

function updateComment() {
  deckStore.deckInfo.comment = localComment.value;
}

// ダイアログからの更新（循環参照を防ぐため直接更新）
function updateCategories(newCategories: string[]) {
  localCategory.value = [...newCategories];
  deckStore.deckInfo.category = [...newCategories];
}

function updateTags(newTags: string[]) {
  localTags.value = [...newTags];
  deckStore.deckInfo.tags = [...newTags];
}

// チップから削除
function removeCategory(catId: string) {
  const index = localCategory.value.indexOf(catId);
  if (index >= 0) {
    localCategory.value.splice(index, 1);
    deckStore.deckInfo.category = [...localCategory.value];
  }
}

function removeTag(tagId: string) {
  const index = localTags.value.indexOf(tagId);
  if (index >= 0) {
    localTags.value.splice(index, 1);
    deckStore.deckInfo.tags = [...localTags.value];
  }
}
</script>

<style scoped lang="scss">
.deck-metadata {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--bg-primary);
  color: var(--text-primary);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  height: 100%;
  overflow: hidden;
}

.metadata-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.row-main {
  height: 24px;
  align-items: center;
}

.chips-row {
  align-items: flex-start;
  min-height: 28px;
  justify-content: flex-start;
  margin-top: 0px;
}

.button-group {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 4px;
}

.button-group > *,
.button-group > .deck-type-selector,
.button-group > .deck-style-selector {
  flex: 1;
  display: flex;
  justify-content: center;
}

/* DeckMetadataHeader.vue の子コンポーネントにスタイルが移譲済み */

/* DeckMetadataTags.vue の子コンポーネントにスタイルが移譲済み */

.chip-remove {
  font-size: 14px;
  font-weight: bold;
  opacity: 0.7;
  transition: opacity 0.2s;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.chip-remove:hover {
  opacity: 1;
}

/* DeckMetadataHeader.vue の子コンポーネントにスタイルが移譲済み */

.tag-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 240px;
  max-height: 300px;
  overflow-y: auto;

  &.align-right {
    left: auto;
    right: 0;
  }
}

.tag-dialog,
.category-dialog {
  position: fixed;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 10000;
  width: 400px;
  max-width: calc(100vw - 40px);
  max-height: 500px;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 8px;
}

.dialog-search-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.filter-button {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    display: block;
    
    path {
      fill: var(--text-primary);
    }
  }
  
  &:hover {
    background: var(--bg-tertiary);
  }
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  overflow: hidden;
  
  &.full-width {
    width: 100%;
  }
}

.dialog-search-input {
  flex: 1;
  padding: 6px 8px;
  border: none;
  font-size: 12px;
  outline: none;
  background: var(--bg-primary);
  color: var(--text-primary);
  
  &:focus {
    background: var(--bg-secondary);
  }
}

.search-button {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: none;
  border-left: 1px solid var(--border-primary);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    display: block;
    
    path {
      fill: var(--text-primary);
    }
  }
  
  &:hover {
    background: var(--bg-tertiary);
  }
}

.dialog-selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
  padding: 6px;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.dialog-options-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  overflow-y: auto;
  max-height: 360px;
  padding: 4px;
}

.dialog-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--color-info-bg);
  border: 1px solid var(--color-info-bg);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-primary);
  white-space: nowrap;
  
  &.selected {
    background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
    color: var(--button-text);
    border-color: transparent;
  }
  
  &.clickable {
    cursor: pointer;
    justify-content: center;
    
    &:hover {
      opacity: 0.8;
    }
  }
}

.dialog-chip-remove {
  background: none;
  border: none;
  color: var(--button-text);
  cursor: pointer;
  padding: 0;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  
  &:hover {
    opacity: 0.8;
  }
}

/* DeckMetadataHeader.vue の子コンポーネントにスタイルが移譲済み */

.dropdown-option {
  padding: 10px 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-primary);

  &:hover {
    background: var(--bg-secondary);
  }

  input[type="checkbox"] {
    margin: 0;
    cursor: pointer;
  }
}

.dropdown-search {
  width: 100%;
  padding: 10px;
  border: none;
  border-bottom: 1px solid var(--border-primary);
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-primary);
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    background: var(--bg-secondary);
  }
  
  &::placeholder {
    color: var(--text-tertiary);
  }
}

.dropdown-options {
  max-height: 250px;
  overflow-y: auto;
}

/* DeckMetadataHeader.vue の子コンポーネントにスタイルが移譲済み */

/* DeckMetadataDescription.vue の子コンポーネントにスタイルが移譲済み */

/* DeckMetadataTags.vue の子コンポーネントがテーマ変数で対応済み */
</style>
