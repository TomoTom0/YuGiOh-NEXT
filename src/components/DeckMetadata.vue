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
      :deck-card-refs="allDeckCardRefs"
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
import { filterValidCategoryIds, filterValidTagIds } from '../types/deck-metadata';
import { isDeckTypeValue, isDeckStyleValue } from '../utils/type-guards';
import type { CategoryEntry } from '../types/dialog';
import CategoryDialog from './CategoryDialog.vue';
import TagDialog from './TagDialog.vue';
import DeckMetadataDescription from './DeckMetadataDescription.vue';
import DeckMetadataTags from './DeckMetadataTags.vue';
import DeckMetadataHeader from './DeckMetadataHeader.vue';
import { getCardInfoFromUnifiedDB } from '../utils/card-utils';

const deckStore = useDeckEditStore();

// メタデータ（カテゴリ・タグマスター）
const categories = ref<CategoryEntry[]>([]);
const tags = ref<Record<string, string>>({});
const tagList = computed(() => {
  return Object.entries(tags.value).map(([value, label]) => ({ value, label }));
});

// デフォルト値の定義（統一）
const DEFAULT_DECK_TYPE: DeckTypeValue = '-1';
const DEFAULT_DECK_STYLE: DeckStyleValue = '-1';

// ローカル状態
const localIsPublic = ref(deckStore.deckInfo.isPublic ?? false);
const localDeckType = ref<DeckTypeValue>(deckStore.deckInfo.deckType ?? DEFAULT_DECK_TYPE);
const localDeckStyle = ref<DeckStyleValue>(deckStore.deckInfo.deckStyle ?? DEFAULT_DECK_STYLE);
const localCategory = ref<string[]>([...(deckStore.deckInfo.category ?? [])]);
const localTags = ref<string[]>([...(deckStore.deckInfo.tags ?? [])]);
const localComment = ref(deckStore.deckInfo.comment ?? '');

// ダイアログ表示状態
const showCategoryDialog = ref(false);
const showTagDialog = ref(false);

// デッキ内の全カード参照（主に数量情報のため）
const allDeckCardRefs = computed(() => {
  return [
    ...deckStore.deckInfo.mainDeck,
    ...deckStore.deckInfo.extraDeck,
    ...deckStore.deckInfo.sideDeck
  ];
});

// デッキ内の全カード情報を取得
const allDeckCards = computed(() => {
  const cards: any[] = [];

  // mainDeck, extraDeck, sideDeckからカードIDを取得
  const allCardRefs = [
    ...deckStore.deckInfo.mainDeck,
    ...deckStore.deckInfo.extraDeck,
    ...deckStore.deckInfo.sideDeck
  ];

  // 重複を除いてCardInfoを取得（Table B2=attribute, race, typesが必要）
  const uniqueCardIds = new Set(allCardRefs.map(ref => ref.cid));
  for (const cid of uniqueCardIds) {
    // UnifiedCacheDBから取得（完全情報が必要）
    const cardInfo = getCardInfoFromUnifiedDB(cid);
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
  localDeckType.value = newDeckInfo.deckType ?? DEFAULT_DECK_TYPE;
  localDeckStyle.value = newDeckInfo.deckStyle ?? DEFAULT_DECK_STYLE;

  // カテゴリ・タグは無効な ID をフィルタリング
  // ただし、categories/tags が初期化されていない場合はフィルタリングしない
  if (categories.value && categories.value.length > 0) {
    const categoryMap: Record<string, string> = {};
    categories.value.forEach(cat => {
      categoryMap[cat.value] = cat.label;
    });
    localCategory.value = filterValidCategoryIds([...(newDeckInfo.category ?? [])], categoryMap);
  } else {
    // categories がまだロードされていない場合は、フィルタリングなしで設定
    localCategory.value = [...(newDeckInfo.category ?? [])];
  }

  if (tags.value && Object.keys(tags.value).length > 0) {
    const tagMap: Record<string, string> = {};
    Object.entries(tags.value).forEach(([key, label]) => {
      tagMap[key] = label;
    });
    localTags.value = filterValidTagIds([...(newDeckInfo.tags ?? [])], tagMap);
  } else {
    // tags がまだロードされていない場合は、フィルタリングなしで設定
    localTags.value = [...(newDeckInfo.tags ?? [])];
  }

  localComment.value = newDeckInfo.comment ?? '';
}, { deep: true });

// 更新関数
function togglePublicStatus() {
  localIsPublic.value = !localIsPublic.value;
  deckStore.deckInfo.isPublic = localIsPublic.value;
}

function selectDeckType(value: string) {
  // 型ガード関数で値を検証
  if (isDeckTypeValue(value)) {
    localDeckType.value = value;
    deckStore.deckInfo.deckType = localDeckType.value;
  } else {
    console.error(`[DeckMetadata] Invalid deck type value: ${value}. Expected one of: 0, 1, 2, 3`);
  }
}

function selectDeckStyle(value: string) {
  // 型ガード関数で値を検証
  if (isDeckStyleValue(value)) {
    localDeckStyle.value = value;
    deckStore.deckInfo.deckStyle = localDeckStyle.value;
  } else {
    console.error(`[DeckMetadata] Invalid deck style value: ${value}. Expected one of: -1, 0, 1, 2`);
  }
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

/* TagDialog.vue と CategoryDialog.vue の子コンポーネントにスタイルが移譲済み */

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
