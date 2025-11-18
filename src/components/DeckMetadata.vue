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
          <span class="toggle-text">公開</span>
          <span class="toggle-text">非公開</span>
        </label>
      </div>

      <div class="deck-type-selector" ref="deckTypeSelector">
        <button 
          class="deck-type-button"
          @click="toggleDeckTypeDropdown"
        >
          <div v-if="localDeckType === '-1'" class="deck-type-placeholder">DeckType</div>
          <svg v-else-if="localDeckType === '0'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#0053c3" width="148" height="108" rx="11.25"></rect>
            <polygon fill="#00204b" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
            <path fill="#fff" d="M40.94,65.78l-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Zm-3.34-33,24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67ZM67,85h33V47H81V38h19V24H67ZM81,61h5V71H81Zm23-37V85h33V24Zm19,47h-5V38h5Z"></path>
          </svg>
          <svg v-else-if="localDeckType === '1'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#6ec300" width="148" height="108" rx="11.25"></rect>
            <polygon fill="#2a4a00" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
            <path fill="#fff" d="M67,38H86V48H67V85h33V71H81V62h19V24H67Zm37-14V85h33V24Zm19,47h-5V38h5ZM37.6,32.74l24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67Zm3.34,33-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Z"></path>
          </svg>
          <svg v-else-if="localDeckType === '2'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#00b9da" width="148" height="108" rx="11.25"></rect>
            <path fill="#004c59" d="M101.37,66.88l-6.05-6V20h-23V33.3L58.74,20H7.85V89.85H58.74l14.14-14,13.72,14h39.81l13.24-15v-8Zm-50.92-6-5.76,6H30.82V42.93H44.69l5.76,5.75Z"></path>
            <path fill="#fff" d="M97.37,70.88l-6.05-6V24h-15v47.3L90.6,85.85h31.81l13.24-15ZM11.85,24V85.85H54.74L69.42,71.26V38.35L54.74,24Zm42.6,40.88-5.76,6H26.82V38.93H48.69l5.76,5.75Z"></path>
          </svg>
          <svg v-else-if="localDeckType === '3'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#5c00da" width="148" height="108" rx="11.25"></rect>
            <path fill="#2b0067" d="M120.12,16.12H63.72L43.56,45.4,23.39,16.12h-8v88.81h8L37,85H71.72L71.63,38h38.88v21h-8.46v-18H80.21V85h39.91c4.79,0,12.53-5.16,12.53-12.53V28.65C132.65,21.28,124.54,16.12,120.12,16.12Z"></path>
            <path fill="#fff" d="M19.39,20.12v80.81L33,81V66.15L43.56,80.27l5.74-7.71L67.72,45.82V20.12L43.56,55.21ZM54.09,81H67.72V58L54.09,77.78Zm62-60.86H70.86l7,13.92h36.63v29H98.05v-18H84.21V81h31.91c4.79,0,12.53-5.16,12.53-12.53V32.65C128.65,25.28,120.54,20.12,116.12,20.12Z"></path>
          </svg>
        </button>
        <Transition name="dropdown">
          <div 
            v-if="showDeckTypeDropdown" 
            ref="deckTypeDropdown"
            class="deck-type-dropdown"
            :class="{ 'align-right': deckTypeDropdownAlignRight }"
          >
            <div class="deck-type-option" @click="selectDeckType('0')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#0053c3" width="148" height="108" rx="11.25"></rect>
                <polygon fill="#00204b" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
                <path fill="#fff" d="M40.94,65.78l-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Zm-3.34-33,24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67ZM67,85h33V47H81V38h19V24H67ZM81,61h5V71H81Zm23-37V85h33V24Zm19,47h-5V38h5Z"></path>
              </svg>
              OCG（マスタールール）
            </div>
            <div class="deck-type-option" @click="selectDeckType('1')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#6ec300" width="148" height="108" rx="11.25"></rect>
                <polygon fill="#2a4a00" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
                <path fill="#fff" d="M67,38H86V48H67V85h33V71H81V62h19V24H67Zm37-14V85h33V24Zm19,47h-5V38h5ZM37.6,32.74l24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67Zm3.34,33-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Z"></path>
              </svg>
              OCG（スピードルール）
            </div>
            <div class="deck-type-option" @click="selectDeckType('2')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#00b9da" width="148" height="108" rx="11.25"></rect>
                <path fill="#004c59" d="M101.37,66.88l-6.05-6V20h-23V33.3L58.74,20H7.85V89.85H58.74l14.14-14,13.72,14h39.81l13.24-15v-8Zm-50.92-6-5.76,6H30.82V42.93H44.69l5.76,5.75Z"></path>
                <path fill="#fff" d="M97.37,70.88l-6.05-6V24h-15v47.3L90.6,85.85h31.81l13.24-15ZM11.85,24V85.85H54.74L69.42,71.26V38.35L54.74,24Zm42.6,40.88-5.76,6H26.82V38.93H48.69l5.76,5.75Z"></path>
              </svg>
              デュエルリンクス
            </div>
            <div class="deck-type-option" @click="selectDeckType('3')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#5c00da" width="148" height="108" rx="11.25"></rect>
                <path fill="#2b0067" d="M120.12,16.12H63.72L43.56,45.4,23.39,16.12h-8v88.81h8L37,85H71.72L71.63,38h38.88v21h-8.46v-18H80.21V85h39.91c4.79,0,12.53-5.16,12.53-12.53V28.65C132.65,21.28,124.54,16.12,120.12,16.12Z"></path>
                <path fill="#fff" d="M19.39,20.12v80.81L33,81V66.15L43.56,80.27l5.74-7.71L67.72,45.82V20.12L43.56,55.21ZM54.09,81H67.72V58L54.09,77.78Zm62-60.86H70.86l7,13.92h36.63v29H98.05v-18H84.21V81h31.91c4.79,0,12.53-5.16,12.53-12.53V32.65C128.65,25.28,120.54,20.12,116.12,20.12Z"></path>
              </svg>
              マスターデュエル
            </div>
          </div>
        </Transition>
      </div>

      <div class="deck-style-selector" ref="deckStyleSelector">
        <button 
          class="deck-style-button"
          @click="toggleDeckStyleDropdown"
        >
          {{ getDeckStyleLabel() }}
        </button>
        <Transition name="dropdown">
          <div 
            v-if="showDeckStyleDropdown" 
            ref="deckStyleDropdown"
            class="deck-style-dropdown"
            :class="{ 'align-right': deckStyleDropdownAlignRight }"
          >
            <div class="deck-style-option" @click="selectDeckStyle('0')">Chara</div>
            <div class="deck-style-option" @click="selectDeckStyle('1')">Tourn</div>
            <div class="deck-style-option" @click="selectDeckStyle('2')">Concep</div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 2行目: Tagボタン（左半分）+ Categoryボタン（右半分の左寄せ） -->
    <div class="metadata-row">
      <div class="left-half">
        <button class="action-button" @click.stop="showTagDropdown = !showTagDropdown">Tag</button>
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
      <div class="right-half">
        <button 
          ref="categoryButton"
          class="action-button" 
          @click.stop="showCategoryDropdown = !showCategoryDropdown"
        >Category</button>
        <Transition name="dropdown">
          <div 
            v-if="showCategoryDropdown" 
            ref="categoryDropdown"
            class="category-dialog"
            @click.stop
          >
            <!-- 1行目: フィルターボタン + 検索入力 + 検索ボタン -->
            <div class="dialog-search-row">
              <button class="filter-button" @click.stop="onFilterClick">Filter</button>
              <div class="search-input-wrapper">
                <input
                  v-model="categorySearchQuery"
                  type="text"
                  class="dialog-search-input"
                  placeholder="カテゴリを検索..."
                  @click.stop
                />
                <button class="search-button" @click.stop>🔍</button>
              </div>
            </div>
            
            <!-- 2行目: 選択済みチップ -->
            <div class="dialog-selected-chips">
              <span
                v-for="catId in localCategory"
                :key="'selected-' + catId"
                class="dialog-chip selected"
              >
                {{ categories[catId] }}
                <button class="dialog-chip-remove" @click="removeCategory(catId)">×</button>
              </span>
            </div>
            
            <!-- 3行目以降: カテゴリ選択グリッド（スクロール可能） -->
            <div class="dialog-options-grid">
              <div
                v-for="(label, id) in filteredCategories"
                :key="id"
                class="dialog-chip clickable"
                :class="{ selected: localCategory.includes(id) }"
                @click="toggleCategory(id)"
              >
                {{ label }}
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 3行目: タグとカテゴリのチップ表示 -->
    <div class="metadata-row chips-row">
      <div class="chips-container">
        <span
          v-for="tagId in localTags"
          :key="'tag-' + tagId"
          class="chip"
        >
          {{ tags[tagId] }}
          <button class="chip-remove" @click="removeTag(tagId)">×</button>
        </span>
        <span
          v-for="catId in localCategory"
          :key="'cat-' + catId"
          class="chip"
        >
          {{ categories[catId] }}
          <button class="chip-remove" @click="removeCategory(catId)">×</button>
        </span>
      </div>
    </div>

    <!-- 4行目: デッキ説明 -->
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
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
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

// ドロップダウン位置調整
const deckTypeDropdownAlignRight = ref(false);
const deckStyleDropdownAlignRight = ref(false);

// DOM参照
const deckTypeSelector = ref<HTMLElement | null>(null);
const deckTypeDropdown = ref<HTMLElement | null>(null);
const deckStyleSelector = ref<HTMLElement | null>(null);
const deckStyleDropdown = ref<HTMLElement | null>(null);

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
  
  // 外クリックでドロップダウンを閉じる
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 外クリックでドロップダウンを閉じる
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.deck-type-selector')) {
    showDeckTypeDropdown.value = false;
  }
  if (!target.closest('.deck-style-selector')) {
    showDeckStyleDropdown.value = false;
  }
  if (!target.closest('.chips-row')) {
    showCategoryDropdown.value = false;
    showTagDropdown.value = false;
  }
}

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

// ドロップダウン位置調整関数
function adjustDropdownPosition(
  selector: HTMLElement | null,
  dropdown: HTMLElement | null,
  alignRightRef: { value: boolean }
) {
  if (!selector || !dropdown) return;
  
  setTimeout(() => {
    const rect = selector.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    // 右端からはみ出る場合
    if (rect.left + dropdownRect.width > viewportWidth) {
      alignRightRef.value = true;
    } else {
      alignRightRef.value = false;
    }
  }, 0);
}

function toggleDeckTypeDropdown() {
  showDeckTypeDropdown.value = !showDeckTypeDropdown.value;
  if (showDeckTypeDropdown.value) {
    adjustDropdownPosition(
      deckTypeSelector.value,
      deckTypeDropdown.value,
      deckTypeDropdownAlignRight
    );
  }
}

function toggleDeckStyleDropdown() {
  showDeckStyleDropdown.value = !showDeckStyleDropdown.value;
  if (showDeckStyleDropdown.value) {
    adjustDropdownPosition(
      deckStyleSelector.value,
      deckStyleDropdown.value,
      deckStyleDropdownAlignRight
    );
  }
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

function onFilterClick() {
  // TODO: フィルター機能を実装
  console.log('Filter button clicked');
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

// カテゴリダイアログの位置調整
watch(showCategoryDropdown, async (newVal) => {
  if (newVal) {
    await nextTick();
    const dropdown = document.querySelector('.category-dialog') as HTMLElement;
    if (dropdown) {
      setTimeout(() => {
        const dropdownRect = dropdown.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        
        if (dropdownRect.right > viewportWidth) {
          dropdown.style.left = 'auto';
          dropdown.style.right = '0';
        }
      }, 0);
    }
  }
});

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
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.metadata-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.left-half,
.right-half {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.row-main {
  height: 28px;
  align-items: center;
}

.chips-row {
  align-items: flex-start;
  min-height: 28px;
  justify-content: flex-start;
  margin-top: 4px;
}

// 公開/非公開スイッチ - テキストを左右に配置
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
  justify-content: space-between;
  cursor: pointer;
  width: 80px;
  height: 28px;
  border: 1px solid #ddd;
  border-radius: 14px;
  background: #e0e0e0;
  transition: all 0.3s;
  user-select: none;
  position: relative;
  padding: 0 8px;
  
  .toggle-text {
    font-size: 11px;
    font-weight: 600;
    z-index: 1;
    transition: color 0.3s;
    
    &:first-child {
      color: white;
    }
    
    &:last-child {
      color: #666;
    }
  }
  
  &:before {
    content: "";
    position: absolute;
    left: 2px;
    top: 2px;
    width: 36px;
    height: 24px;
    background-color: white;
    border-radius: 12px;
    transition: 0.3s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
}

.toggle-checkbox:checked + .toggle-slider {
  background: #4CAF50;
  
  .toggle-text {
    &:first-child {
      color: #666;
    }
    
    &:last-child {
      color: white;
    }
  }
  
  &:before {
    transform: translateX(40px);
  }
}

.deck-type-selector,
.deck-style-selector {
  position: relative;
}

.deck-type-button,
.deck-style-button,
.action-button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #333;
  cursor: pointer;
  font-size: 12px;
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
  min-width: 60px;
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
  min-width: 60px;
}

.action-button {
  min-width: 70px;
  flex-shrink: 0;
}

.deck-type-icon {
  height: 24px;
  width: auto;
  display: block;
  border-radius: 4px;
}

.deck-type-placeholder {
  font-size: 11px;
  color: #999;
  padding: 0 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  height: 24px;
  display: flex;
  align-items: center;
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
  gap: 2px;
  padding: 0px 3px;
  background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
  color: white;
  border-radius: 2px;
  font-size: 8px;
  font-weight: 400;
  height: 12px;
  line-height: 1;
}

.chip-remove {
  display: none;
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
}

.category-dialog {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
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
}

.dialog-search-input {
  flex: 1;
  padding: 6px 8px;
  border: none;
  font-size: 12px;
  outline: none;
  
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
  gap: 8px;
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
  min-height: 400px;
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
