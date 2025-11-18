<template>
  <div class="deck-metadata">
    <!-- 1行目: 公開/非公開 + デッキタイプアイコン -->
    <div class="metadata-row row-main">
      <div class="toggle-switch">
        <input
          id="public-toggle"
          v-model="localIsPublic"
          type="checkbox"
          class="toggle-checkbox"
          @change="updatePublicStatus"
        />
        <label for="public-toggle" class="toggle-slider">
          <span class="toggle-text">{{ localIsPublic ? '公開' : '非公開' }}</span>
        </label>
      </div>

      <div class="deck-type-selector">
        <button 
          class="deck-type-button"
          @click="showDeckTypeDropdown = !showDeckTypeDropdown"
        >
          <div v-if="localDeckType === '-1'" class="deck-type-placeholder">DeckType</div>
          <svg v-else-if="localDeckType === '0'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect style="fill:#0053c3;" width="148" height="108" rx="11.25"></rect>
          </svg>
          <svg v-else-if="localDeckType === '1'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect style="fill:#6ec300;" width="148" height="108" rx="11.25"></rect>
          </svg>
          <svg v-else-if="localDeckType === '2'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect style="fill:#00b9da;" width="148" height="108" rx="11.25"></rect>
          </svg>
          <svg v-else-if="localDeckType === '3'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect style="fill:#5c00da;" width="148" height="108" rx="11.25"></rect>
          </svg>
        </button>
        <Transition name="dropdown">
          <div v-if="showDeckTypeDropdown" class="deck-type-dropdown">
            <div class="deck-type-option" @click="selectDeckType('0')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect style="fill:#0053c3;" width="148" height="108" rx="11.25"></rect>
              </svg>
              OCG（マスタールール）
            </div>
            <div class="deck-type-option" @click="selectDeckType('1')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect style="fill:#6ec300;" width="148" height="108" rx="11.25"></rect>
              </svg>
              OCG（スピードルール）
            </div>
            <div class="deck-type-option" @click="selectDeckType('2')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect style="fill:#00b9da;" width="148" height="108" rx="11.25"></rect>
              </svg>
              デュエルリンクス
            </div>
            <div class="deck-type-option" @click="selectDeckType('3')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect style="fill:#5c00da;" width="148" height="108" rx="11.25"></rect>
              </svg>
              マスターデュエル
            </div>
          </div>
        </Transition>
      </div>

      <div class="deck-style-selector">
        <button 
          class="deck-style-button"
          @click="showDeckStyleDropdown = !showDeckStyleDropdown"
        >
          {{ getDeckStyleLabel() }}
        </button>
        <Transition name="dropdown">
          <div v-if="showDeckStyleDropdown" class="deck-style-dropdown">
            <div class="deck-style-option" @click="selectDeckStyle('0')">Chara</div>
            <div class="deck-style-option" @click="selectDeckStyle('1')">Tourn</div>
            <div class="deck-style-option" @click="selectDeckStyle('2')">Concep</div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 2行目: Tagボタン + 選択タグチップ -->
    <div class="metadata-row chips-row">
      <button class="action-button" @click.stop="showTagDropdown = !showTagDropdown">Tag</button>
      <div class="chips-container">
        <span
          v-for="tagId in localTags"
          :key="tagId"
          class="chip"
        >
          {{ tags[tagId] }}
          <button class="chip-remove" @click="removeTag(tagId)">×</button>
        </span>
      </div>
      <Transition name="dropdown">
        <div v-if="showTagDropdown" class="tag-dropdown">
          <input
            v-model="tagSearchQuery"
            type="text"
            class="dropdown-search"
            placeholder="タグを検索..."
            @click.stop
          />
          <div class="dropdown-options">
            <div
              v-for="(label, id) in filteredTags"
              :key="id"
              class="dropdown-option"
              @click="toggleTag(id)"
            >
              <input
                type="checkbox"
                :checked="localTags.includes(id)"
                @click.stop
              />
              <span>{{ label }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 3行目: Categoryボタン + 選択カテゴリチップ -->
    <div class="metadata-row chips-row">
      <button class="action-button" @click.stop="showCategoryDropdown = !showCategoryDropdown">Category</button>
      <div class="chips-container">
        <span
          v-for="catId in localCategory"
          :key="catId"
          class="chip"
        >
          {{ categories[catId] }}
          <button class="chip-remove" @click="removeCategory(catId)">×</button>
        </span>
      </div>
      <Transition name="dropdown">
        <div v-if="showCategoryDropdown" class="category-dropdown">
          <input
            v-model="categorySearchQuery"
            type="text"
            class="dropdown-search"
            placeholder="カテゴリを検索..."
            @click.stop
          />
          <div class="dropdown-options">
            <div
              v-for="(label, id) in filteredCategories"
              :key="id"
              class="dropdown-option"
              @click="toggleCategory(id)"
            >
              <input
                type="checkbox"
                :checked="localCategory.includes(id)"
                @click.stop
              />
              <span>{{ label }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- デッキ説明 -->
    <div class="description-section">
      <div class="description-header">
        <label class="metadata-label">説明</label>
        <span class="char-count">{{ localComment.length }}/1000</span>
      </div>
      <textarea
        v-model="localComment"
        class="metadata-textarea"
        :maxlength="1000"
        placeholder="デッキの説明を入力..."
        @input="updateComment"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useDeckEditStore } from '../stores/deck-edit';
import type { DeckTypeValue, DeckStyleValue } from '../types/deck-metadata';
import { getDeckMetadata } from '../utils/deck-metadata-loader';

const deckStore = useDeckEditStore();

// メタデータ（カテゴリ・タグマスター）
const categories = ref<Record<string, string>>({});
const tags = ref<Record<string, string>>({});

// ローカル状態
const localIsPublic = ref(deckStore.deckInfo.isPublic ?? false);
const localDeckType = ref<DeckTypeValue>(deckStore.deckInfo.deckType ?? '-1');
const localDeckStyle = ref<DeckStyleValue>(deckStore.deckInfo.deckStyle ?? '-1');
const localCategory = ref<string[]>([...(deckStore.deckInfo.category ?? [])]);
const localTags = ref<string[]>([...(deckStore.deckInfo.tags ?? [])]);
const localComment = ref(deckStore.deckInfo.comment ?? '');

// ドロップダウン表示状態
const showDeckTypeDropdown = ref(false);
const showDeckStyleDropdown = ref(false);
const showCategoryDropdown = ref(false);
const showTagDropdown = ref(false);

// カテゴリ・タグ検索用
const categorySearchQuery = ref('');
const tagSearchQuery = ref('');

// カテゴリ検索フィルタ
const filteredCategories = computed(() => {
  if (!categorySearchQuery.value) {
    return categories.value;
  }
  const query = categorySearchQuery.value.toLowerCase();
  return Object.fromEntries(
    Object.entries(categories.value).filter(([_, label]) =>
      label.toLowerCase().includes(query)
    )
  );
});

// タグ検索フィルタ
const filteredTags = computed(() => {
  if (!tagSearchQuery.value) {
    return tags.value;
  }
  const query = tagSearchQuery.value.toLowerCase();
  return Object.fromEntries(
    Object.entries(tags.value).filter(([_, label]) =>
      label.toLowerCase().includes(query)
    )
  );
});

// マウント時にメタデータを読み込み
onMounted(async () => {
  const metadata = await getDeckMetadata();
  categories.value = metadata.categories;
  // タグは現時点ではメタデータに含まれていないため、空のままにする
  // TODO: updateDeckMetadata() でタグマスターも取得するように修正が必要
  tags.value = {};
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
function updatePublicStatus() {
  deckStore.deckInfo.isPublic = localIsPublic.value;
}

function selectDeckType(value: string) {
  localDeckType.value = value as DeckTypeValue;
  deckStore.deckInfo.deckType = localDeckType.value;
  showDeckTypeDropdown.value = false;
}

function selectDeckStyle(value: string) {
  localDeckStyle.value = value as DeckStyleValue;
  deckStore.deckInfo.deckStyle = localDeckStyle.value;
  showDeckStyleDropdown.value = false;
}

function getDeckStyleLabel() {
  if (localDeckStyle.value === '-1') return 'Style';
  if (localDeckStyle.value === '0') return 'Chara';
  if (localDeckStyle.value === '1') return 'Tourn';
  if (localDeckStyle.value === '2') return 'Concep';
  return 'Style';
}

function updateComment() {
  deckStore.deckInfo.comment = localComment.value;
}

function toggleCategory(catId: string) {
  const index = localCategory.value.indexOf(catId);
  if (index >= 0) {
    localCategory.value.splice(index, 1);
  } else {
    localCategory.value.push(catId);
  }
  deckStore.deckInfo.category = [...localCategory.value];
}

function removeCategory(catId: string) {
  const index = localCategory.value.indexOf(catId);
  if (index >= 0) {
    localCategory.value.splice(index, 1);
    deckStore.deckInfo.category = [...localCategory.value];
  }
}

function toggleTag(tagId: string) {
  const index = localTags.value.indexOf(tagId);
  if (index >= 0) {
    localTags.value.splice(index, 1);
  } else {
    localTags.value.push(tagId);
  }
  deckStore.deckInfo.tags = [...localTags.value];
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
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
}

// 1行目のレイアウト
.metadata-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

// チップを含む行
.chips-row {
  align-items: flex-start;
  position: relative;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.chip-remove {
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

// 公開/非公開トグル
.toggle-switch {
  position: relative;
  
  input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .toggle-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 4px;
    background: #f0f0f0;
    transition: background 0.2s;
    font-size: 12px;
    
    input:checked + & {
      background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
      color: white;
    }
  }
}

// デッキタイプアイコンボタン
.deck-type-button,
.deck-style-button,
.action-button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  
  &:hover {
    border-color: #999;
  }
  
  &.selected {
    border-color: var(--theme-gradient-start, #00d9b8);
  }
}

.deck-type-button {
  padding: 4px 8px;
  min-width: 60px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.deck-type-icon {
  width: 48px;
  height: auto;
}

.deck-type-placeholder {
  font-size: 11px;
  color: #999;
}

// ドロップダウン
.deck-type-dropdown,
.deck-style-dropdown,
.tag-dropdown,
.category-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  z-index: 100;
  min-width: 200px;
  max-height: 300px;
  overflow-y: auto;
}

.deck-type-option,
.deck-style-option,
.dropdown-option {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: #f5f5f5;
  }
}

.deck-type-icon-small {
  width: 32px;
  height: auto;
}

.dropdown-search {
  width: 100%;
  padding: 8px;
  border: none;
  border-bottom: 1px solid #ddd;
  font-size: 12px;
  
  &:focus {
    outline: none;
  }
}

.dropdown-options {
  max-height: 250px;
  overflow-y: auto;
}

// ドロップダウンアニメーション
.dropdown-enter-active {
  transition: all 0.2s ease-out;
}

.dropdown-leave-active {
  transition: all 0.15s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

// デッキ説明
.description-section {
  margin-top: 8px;
}

.description-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metadata-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.char-count {
  font-size: 11px;
  color: #999;
}

.metadata-textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  
  &:focus {
    outline: none;
    border-color: var(--theme-gradient-start, #00d9b8);
  }
}

// 保存ボタン
.save-section {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.save-button {
  padding: 8px 24px;
  background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  
  &:hover {
    opacity: 0.9;
  }
}
</style>

<style scoped lang="scss">
.deck-metadata {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
  background: white;
  color: #333;
}

.metadata-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.row-main {
  height: 36px;
  align-items: center;
}

.chips-row {
  align-items: flex-start;
  min-height: 36px;
  justify-content: flex-start;
}

// 公開/非公開スイッチ - コンパクト版
.toggle-switch {
  position: relative;
  display: inline-block;
}

.toggle-checkbox {
  display: none;
}

.toggle-slider {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  transition: all 0.2s;
  user-select: none;
  
  .toggle-text {
    font-size: 13px;
    color: #333;
    white-space: nowrap;
  }
  
  &:before {
    content: "";
    display: inline-block;
    width: 36px;
    height: 18px;
    background-color: #ccc;
    border-radius: 9px;
    position: relative;
    transition: 0.3s;
  }
  
  &:after {
    content: "";
    position: absolute;
    left: 14px;
    top: 9px;
    height: 14px;
    width: 14px;
    background-color: white;
    border-radius: 50%;
    transition: 0.3s;
  }
}

.toggle-checkbox:checked + .toggle-slider {
  &:before {
    background-color: #4CAF50;
  }
  
  &:after {
    transform: translateX(18px);
  }
}

.deck-type-selector,
.deck-style-selector {
  position: relative;
}

.deck-type-button,
.deck-style-button,
.action-button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #333;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  
  &:hover {
    border-color: #999;
    background: #f9f9f9;
  }
  
  &:active {
    background: #f0f0f0;
  }
}

.action-button {
  min-width: 90px;
  flex-shrink: 0;
}

.deck-type-icon {
  width: 60px;
  height: auto;
  display: block;
}

.deck-type-placeholder {
  font-size: 12px;
  color: #999;
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
  padding: 4px 10px;
  background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  height: 24px;
}

.chip-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
  
  &:hover {
    opacity: 0.8;
  }
}

.deck-type-dropdown,
.deck-style-dropdown,
.tag-dropdown,
.category-dropdown {
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
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  color: #333;
  background: white;
  resize: vertical;
  min-height: 200px;
  height: auto;
  line-height: 1.6;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: var(--theme-gradient-start, #00d9b8);
  }
  
  &::placeholder {
    color: #999;
  }
}
</style>
