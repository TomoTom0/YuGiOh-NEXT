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

.deck-type-selector,
.deck-style-selector {
  position: relative;
}

.deck-type-button,
.deck-style-button,
.action-button {
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: var(--text-tertiary);
    background: var(--bg-secondary);
  }

  &:active {
    background: var(--bg-tertiary);
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
  background: var(--color-error-bg);
  color: var(--color-error-text);
  border: 1px solid var(--color-error);
  border-radius: 12px;
  font-weight: 500;
  min-width: 44px;

  &:hover {
    background: var(--color-error-hover-bg);
    border-color: var(--color-error);
  }

  &:active {
    background: var(--color-error);
  }

  &.is-public {
    background: var(--color-success-bg);
    color: var(--color-success);
    border-color: var(--color-success);

    &:hover {
      background: var(--color-success-hover-bg);
      border-color: var(--color-success);
    }

    &:active {
      background: var(--color-success);
    }
  }
}

.tag-button {
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid var(--color-success);
  border-radius: 12px;
  font-weight: 500;
  
  &:hover {
    background: var(--color-success-hover-bg);
    border-color: var(--color-success);
  }
  
  &:active {
    background: var(--color-success);
  }
}

.category-button {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
  border-radius: 12px;
  font-weight: 500;
  
  &:hover {
    background: var(--color-warning-hover-bg);
    border-color: var(--color-warning);
  }
  
  &:active {
    background: var(--color-warning);
  }
}

.deck-style-button {
  background: var(--color-info-bg);
  color: var(--color-info);
  border: 1px solid var(--color-info);
  border-radius: 12px;
  font-weight: 500;
  
  &:hover {
    background: var(--color-info-hover-bg);
    border-color: var(--color-info);
  }
  
  &:active {
    background: var(--color-info);
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
  color: var(--text-tertiary);
  padding: 0 4px;
  border: 1px solid var(--border-primary);
  border-radius: 3px;
  background: var(--bg-primary);
  height: 20px;
  display: flex;
  align-items: center;
}

.text-bold {
  font-weight: 700;
}

.deck-type-unset {
  font-size: 13px;
  color: var(--text-secondary);
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
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid var(--color-success);

  &:hover {
    filter: brightness(0.95);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &[data-type="fusion"] {
    background: var(--monster-fusion-bg);
    color: var(--monster-fusion-badge-text);
    border-color: var(--monster-fusion-border);
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(156, 39, 176, 0.3);

    &:hover {
      filter: brightness(0.9);
      box-shadow: 0 2px 6px rgba(156, 39, 176, 0.5);
    }
  }

  &[data-type="synchro"] {
    background: var(--monster-synchro-bg);
    color: var(--monster-synchro-badge-text);
    border-color: var(--monster-synchro-border);
    font-weight: 600;

    &:hover {
      filter: brightness(0.95);
    }
  }

  &[data-type="xyz"] {
    background: var(--monster-xyz-active);
    color: var(--monster-xyz-badge-text);
    border-color: var(--monster-xyz-active-border);
    font-weight: 600;

    &:hover {
      filter: brightness(0.9);
    }
  }

  &[data-type="link"] {
    background: var(--monster-link-bg);
    color: var(--monster-link-badge-text);
    border-color: var(--monster-link-border);
    font-weight: 600;

    &:hover {
      filter: brightness(0.95);
    }
  }

  &[data-type="ritual"] {
    background: var(--monster-ritual-bg);
    color: var(--monster-ritual-badge-text);
    border-color: var(--monster-ritual-border);
    font-weight: 600;

    &:hover {
      filter: brightness(0.95);
    }
  }

  &[data-type="pendulum"] {
    background: var(--monster-pendulum-bg);
    color: var(--monster-pendulum-badge-text);
    border-color: var(--monster-pendulum-border);
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

    &:hover {
      filter: brightness(0.95);
    }
  }
}

.chip.category-chip {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
}

.chip.category-chip:hover {
  background: var(--color-warning-hover-bg);
  border-color: var(--color-warning);
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

.deck-type-option,
.deck-style-option,
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

.deck-type-icon-small {
  width: 36px;
  height: auto;
  flex-shrink: 0;
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
  color: var(--text-primary);
  text-align: left;
}

.char-count {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: right;
}

.metadata-textarea {
  width: 100%;
  max-width: 100%;
  padding: 12px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--text-primary);
  background: var(--bg-primary);
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
    border-color: var(--text-tertiary);
  }
  
  &::placeholder {
    color: var(--text-tertiary);
  }
}

/* ダークモード用: 背景色グラデーションのみ変更 */
:global(.dark-theme) {
  .tag-chip {
    &[data-type="fusion"] {
      background: linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%);
    }

    &[data-type="synchro"] {
      background:
        repeating-linear-gradient(
          135deg,
          transparent,
          transparent 8px,
          rgba(255, 255, 255, 0.12) 8px,
          rgba(255, 255, 255, 0.12) 9px
        ),
        linear-gradient(135deg, #757575 0%, #616161 100%);
    }

    &[data-type="xyz"] {
      background: linear-gradient(135deg, #616161 0%, #424242 100%);
    }

    &[data-type="link"] {
      background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);
    }

    &[data-type="ritual"] {
      background: linear-gradient(135deg, #0097a7 0%, #00838f 100%);
    }

    &[data-type="pendulum"] {
      background: linear-gradient(180deg, #ff6f00 0%, #ff6f00 35%, #00796b 65%, #00796b 100%);
    }
  }
}
</style>
