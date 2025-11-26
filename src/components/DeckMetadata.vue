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
  background: white;
  color: #333;
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

.deck-type-selector,
.deck-style-selector {
  position: relative;
}

.deck-type-button,
.deck-style-button,
.action-button {
  height: 24px;
  padding: 0 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #333;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: #999;
    background: #f9f9f9;
  }

  &:active {
    background: #f0f0f0;
  }
}

.deck-type-button {
  min-width: 50px;
  padding: 2px 4px;
  border: none;
  background: transparent;

  &:hover {
    background: transparent;
    opacity: 0.8;
  }

  &:active {
    background: transparent;
    opacity: 0.6;
  }
}

.deck-style-button {
  min-width: 50px;
}

.action-button {
  min-width: 36px;
  flex-shrink: 0;
}

.public-button {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef5350;
  border-radius: 12px;
  font-weight: 500;
  min-width: 44px;

  &:hover {
    background: #ffcdd2;
    border-color: #e53935;
  }

  &:active {
    background: #ef9a9a;
  }

  &.is-public {
    background: #e8f5e9;
    color: #2e7d32;
    border-color: #66bb6a;

    &:hover {
      background: #c8e6c9;
      border-color: #4caf50;
    }

    &:active {
      background: #a5d6a7;
    }
  }
}

.tag-button {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #66bb6a;
  border-radius: 12px;
  font-weight: 500;
  
  &:hover {
    background: #c8e6c9;
    border-color: #4caf50;
  }
  
  &:active {
    background: #a5d6a7;
  }
}

.category-button {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ff9800;
  border-radius: 12px;
  font-weight: 500;
  
  &:hover {
    background: #ffe0b2;
    border-color: #f57c00;
  }
  
  &:active {
    background: #ffcc80;
  }
}

.deck-style-button {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #42a5f5;
  border-radius: 12px;
  font-weight: 500;
  
  &:hover {
    background: #bbdefb;
    border-color: #1976d2;
  }
  
  &:active {
    background: #90caf9;
  }
}

.deck-type-icon {
  height: 20px;
  width: auto;
  display: block;
  border-radius: 3px;
}

.deck-type-placeholder {
  font-size: 10px;
  color: #999;
  padding: 0 4px;
  border: 1px solid #ddd;
  border-radius: 3px;
  background: white;
  height: 20px;
  display: flex;
  align-items: center;
}

.text-bold {
  font-weight: 700;
}

.deck-type-unset {
  font-size: 13px;
  color: #666;
  padding: 0 8px;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
  align-items: flex-start;
  padding-top: 4px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.chip.tag-chip {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #66bb6a;
}

.chip.tag-chip:hover {
  background: #c8e6c9;
  border-color: #4caf50;
}

.chip.tag-chip[data-type="fusion"] {
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
  color: #4a148c;
  border-color: #ba68c8;
}

.chip.tag-chip[data-type="synchro"] {
  background: 
    repeating-linear-gradient(
      135deg,
      transparent,
      transparent 8px,
      rgba(158, 158, 158, 0.12) 8px,
      rgba(158, 158, 158, 0.12) 9px
    ),
    linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
  color: #424242;
  border-color: #9e9e9e;
}

.chip.tag-chip[data-type="xyz"] {
  background: linear-gradient(135deg, #616161 0%, #424242 100%);
  color: #fff;
  border-color: #757575;
}

.chip.tag-chip[data-type="link"] {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #0d47a1;
  border-color: #64b5f6;
}

.chip.tag-chip[data-type="ritual"] {
  background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
  color: #006064;
  border-color: #4dd0e1;
}

.chip.tag-chip[data-type="pendulum"] {
  background: linear-gradient(180deg, #ffb74d 0%, #ffb74d 35%, #4db6ac 65%, #4db6ac 100%);
  color: #4a148c;
  border-color: #ff9800;
}

.chip.category-chip {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ff9800;
}

.chip.category-chip:hover {
  background: #ffe0b2;
  border-color: #f57c00;
}

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

.deck-type-dropdown,
.deck-style-dropdown,
.tag-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: white;
  border: 1px solid #ddd;
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
  background: white;
  border: 1px solid #ddd;
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
  background: #f5f5f5;
  border: 1px solid #ddd;
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
      fill: #333;
    }
  }
  
  &:hover {
    background: #e8e8e8;
  }
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
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
  background: white;
  color: #333;
  
  &:focus {
    background: #f9f9f9;
  }
}

.search-button {
  padding: 6px 12px;
  background: #f5f5f5;
  border: none;
  border-left: 1px solid #ddd;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    display: block;
    
    path {
      fill: #333;
    }
  }
  
  &:hover {
    background: #e8e8e8;
  }
}

.dialog-selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
  padding: 6px;
  background: #f9f9f9;
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
  background: #e8f0fe;
  border: 1px solid #c5d9f7;
  border-radius: 4px;
  font-size: 11px;
  color: #333;
  white-space: nowrap;
  
  &.selected {
    background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
    color: white;
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
  color: white;
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

.deck-type-option,
.deck-style-option,
.dropdown-option {
  padding: 10px 14px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  
  &:hover {
    background: #f5f5f5;
  }
  
  input[type="checkbox"] {
    margin: 0;
    cursor: pointer;
  }
}

.deck-type-icon-small {
  width: 36px;
  height: auto;
  flex-shrink: 0;
}

.dropdown-search {
  width: 100%;
  padding: 10px;
  border: none;
  border-bottom: 1px solid #ddd;
  font-size: 13px;
  color: #333;
  background: white;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    background: #f9f9f9;
  }
  
  &::placeholder {
    color: #999;
  }
}

.dropdown-options {
  max-height: 250px;
  overflow-y: auto;
}

.dropdown-enter-active {
  transition: all 0.2s ease-out;
}

.dropdown-leave-active {
  transition: all 0.15s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.description-section {
  margin-top: 8px;
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.description-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  width: 100%;
}

.metadata-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  text-align: left;
}

.char-count {
  font-size: 12px;
  color: #999;
  text-align: right;
}

.metadata-textarea {
  width: 100%;
  max-width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #333;
  background: white;
  resize: none;
  flex: 1;
  min-height: 0;
  line-height: 1.6;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: var(--theme-gradient-start, #00d9b8);
    box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px rgba(0, 217, 184, 0.1);
  }
  
  &:hover {
    border-color: #999;
  }
  
  &::placeholder {
    color: #aaa;
  }
}
</style>
