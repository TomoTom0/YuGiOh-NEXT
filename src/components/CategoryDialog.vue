<template>
  <div v-if="isVisible" class="category-dialog-overlay" @click.self="close">
    <div class="category-dialog">
      <!-- ヘッダー -->
      <div class="dialog-header">
        <div class="header-row">
          <h3>Category</h3>
          <!-- クリアボタン（選択済みチップがある場合のみ表示） -->
          <button v-if="selectedCategories.length > 0" class="btn-clear" @click="clearAll" title="Clear All">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
            </svg>
            Clear
          </button>
          <button class="close-btn" @click="close" title="Close">×</button>
        </div>
        <!-- 選択済みチップ -->
        <div v-if="selectedCategories.length > 0" class="selected-chips-row">
          <span
            v-for="id in selectedCategories"
            :key="id"
            class="category-chip"
            @click="toggleCategory(id)"
          >
            {{ getCategoryLabel(id) }}
            <span class="chip-remove">×</span>
          </span>
        </div>
      </div>

      <!-- 検索行 -->
      <div class="search-row">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Search categories..."
        />
        <button class="btn btn-icon" :class="{ active: isFilterEnabled }" @click="onFilterClick" title="Filter (7枚超え)">
          <svg viewBox="0 0 24 24">
            <path fill="currentColor" d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z" />
          </svg>
        </button>
      </div>

      <!-- タブ -->
      <div class="filter-tabs">
        <div class="tab-row">
          <button
            class="tab-btn"
            :class="{ active: selectedGroup === 'all' }"
            @click="selectedGroup = 'all'"
          >
            all
          </button>
          <button
            v-for="group in firstRowGroups"
            :key="group"
            class="tab-btn"
            :class="{ active: selectedGroup === group }"
            @click="selectedGroup = group"
          >
            {{ group.replace('ruby_', '') }}
          </button>
        </div>
        <div class="tab-row">
          <button
            v-for="group in secondRowGroups"
            :key="group"
            class="tab-btn"
            :class="{ active: selectedGroup === group }"
            @click="selectedGroup = group"
          >
            {{ group.replace('ruby_', '') }}
          </button>
        </div>
      </div>

      <!-- カテゴリリスト -->
      <div class="category-list">
        <button
          v-for="category in filteredCategories"
          :key="category.value"
          class="category-item"
          :class="{ selected: selectedCategories.includes(category.value) }"
          @click="toggleCategory(category.value)"
        >
          {{ category.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  isVisible: boolean;
  categories: Array<{
    value: string;
    label: string;
    originalIndex: number;
    group: string[];
  }>;
  modelValue: string[];
  deckCards: any[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  'close': [];
}>();

const selectedCategories = ref<string[]>([...props.modelValue]);
const selectedGroup = ref<string>('all');
const isFilterEnabled = ref<boolean>(false);
const searchQuery = ref<string>('');

// ダイアログが開かれた時にフィルタをリセット
watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    isFilterEnabled.value = false;
    searchQuery.value = '';
  }
});

// タブグループ（二行表示用）
const firstRowGroups = ['ruby_ア', 'ruby_カ', 'ruby_サ', 'ruby_タ', 'ruby_ナ'];
const secondRowGroups = ['ruby_ハ', 'ruby_マ', 'ruby_ヤ', 'ruby_ラ', 'ruby_ワ', 'ruby_ヴ'];

// 行から五十音文字へのマッピング
const rowToCharsMap: Record<string, string[]> = {
  'ruby_ア': ['ruby_ア', 'ruby_イ', 'ruby_ウ', 'ruby_エ', 'ruby_オ'],
  'ruby_カ': ['ruby_カ', 'ruby_キ', 'ruby_ク', 'ruby_ケ', 'ruby_コ'],
  'ruby_サ': ['ruby_サ', 'ruby_シ', 'ruby_ス', 'ruby_セ', 'ruby_ソ'],
  'ruby_タ': ['ruby_タ', 'ruby_チ', 'ruby_ツ', 'ruby_テ', 'ruby_ト'],
  'ruby_ナ': ['ruby_ナ', 'ruby_ニ', 'ruby_ヌ', 'ruby_ネ', 'ruby_ノ'],
  'ruby_ハ': ['ruby_ハ', 'ruby_ヒ', 'ruby_フ', 'ruby_ヘ', 'ruby_ホ'],
  'ruby_マ': ['ruby_マ', 'ruby_ミ', 'ruby_ム', 'ruby_メ', 'ruby_モ'],
  'ruby_ヤ': ['ruby_ヤ', 'ruby_ユ', 'ruby_ヨ'],
  'ruby_ラ': ['ruby_ラ', 'ruby_リ', 'ruby_ル', 'ruby_レ', 'ruby_ロ'],
  'ruby_ワ': ['ruby_ワ', 'ruby_ヲ', 'ruby_ン'],
  'ruby_ヴ': ['ruby_ヴ']
};

// カテゴリ名を含むカードの総数をカウント
function countCardsWithCategory(categoryLabel: string): number {
  return props.deckCards.filter(card => {
    const cardAny = card as any;
    const cardName = card.name || '';
    const cardText = cardAny.text || '';
    return cardName.includes(categoryLabel) || cardText.includes(categoryLabel);
  }).length;
}

// フィルタされたカテゴリ
const filteredCategories = computed(() => {
  let categories = props.categories;
  
  // グループフィルタ
  if (selectedGroup.value !== 'all') {
    const chars = rowToCharsMap[selectedGroup.value] || [selectedGroup.value];
    categories = categories.filter(cat =>
      cat.group.some(g => chars.includes(g))
    );
  }
  
  // 検索フィルタ
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    categories = categories.filter(cat => cat.label.toLowerCase().includes(query));
  }
  
  // カテゴリ名フィルタ: 7枚超えのみ表示
  if (isFilterEnabled.value) {
    categories = categories.filter(cat => 
      countCardsWithCategory(cat.label) > 7
    );
  }
  
  return categories;
});

// カテゴリラベルを取得
function getCategoryLabel(categoryId: string): string {
  const category = props.categories.find(c => c.value === categoryId);
  return category?.label || categoryId;
}

// カテゴリトグル
function toggleCategory(categoryId: string): void {
  const index = selectedCategories.value.indexOf(categoryId);
  if (index > -1) {
    selectedCategories.value.splice(index, 1);
  } else {
    selectedCategories.value.push(categoryId);
  }
  // 即座に適用
  emit('update:modelValue', [...selectedCategories.value]);
}

// すべてクリア
function clearAll(): void {
  selectedCategories.value = [];
  // 即座に適用
  emit('update:modelValue', []);
}

// フィルタボタン
function onFilterClick(): void {
  isFilterEnabled.value = !isFilterEnabled.value;
  console.log('Category filter:', isFilterEnabled.value ? 'ON' : 'OFF');
}

// 閉じる
function close(): void {
  emit('close');
}

// propsのmodelValueが変更されたら同期
watch(() => props.modelValue, (newVal) => {
  selectedCategories.value = [...newVal];
}, { deep: true });
</script>

<style scoped>
.category-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.category-dialog {
  background: var(--bg-color, #fff);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  height: 80vh;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  width: 100%;
  padding: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  flex-shrink: 0;
  box-sizing: border-box;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-color, #333);
  flex-shrink: 0;
}

.selected-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  align-items: center;
  overflow-y: auto;
  max-height: 56px;
}

.btn-clear {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: auto;
  margin-right: 8px;
}

.btn-clear:hover {
  background: #ffebee;
  border-color: #ef5350;
  color: #c62828;
}

.btn-clear svg {
  width: 16px;
  height: 16px;
}

.search-row {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
  background: var(--bg-color, #fff);
  color: var(--text-color, #333);
}

.search-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ff9800;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.category-chip:hover {
  background: #ffe0b2;
  border-color: #f57c00;
}

.chip-remove {
  font-size: 14px;
  font-weight: bold;
  color: #e65100;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.chip-remove:hover {
  opacity: 1;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color, #666);
  padding: 0;
  width: 30px;
  height: 30px;
  line-height: 1;
  flex-shrink: 0;
}

.close-btn:hover {
  color: var(--text-color, #333);
}

.filter-tabs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.tab-row {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-right: 1px solid #e0e0e0;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
  flex: 1;
  white-space: nowrap;
  min-width: 0;
}

.tab-btn:last-child {
  border-right: none;
}

.tab-btn:hover {
  background: rgba(25, 118, 210, 0.08);
  color: #1976d2;
}

.tab-btn.active {
  color: #1976d2;
  border-bottom-color: #1976d2;
  background: rgba(25, 118, 210, 0.08);
}

.category-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  align-content: start;
}

.category-item {
  padding: 12px 16px;
  background: #ffffff;
  border: 1.5px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  text-align: left;
  transition: all 0.2s;
  min-height: 42px;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.category-item:hover {
  background: #f8f9fa;
  border-color: #1976d2;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.1);
}

.category-item.selected {
  background: #e3f2fd;
  border-color: #1976d2;
  color: #1565c0;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(25, 118, 210, 0.2), inset 0 0 0 1px #1976d2;
}

.btn-icon {
  padding: 6px;
  min-width: auto;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  transition: all 0.2s;
  color: #666;
}

.btn-icon:hover {
  background: #e0e0e0;
  border-color: #999;
  color: #333;
}

.btn-icon.active {
  background: #1976d2;
  border-color: #1565c0;
  color: #ffffff;
}

.btn-icon.active:hover {
  background: #1565c0;
  border-color: #0d47a1;
  color: #ffffff;
}

.btn-icon svg {
  width: 16px;
  height: 16px;
  min-width: 16px;
  min-height: 16px;
  flex-shrink: 0;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-color, #666);
}

.btn-secondary:hover {
  background: var(--bg-hover, #e0e0e0);
}

.btn-primary {
  background: #1976d2;
  color: white;
}

.btn-primary:hover {
  background: #1565c0;
}
</style>
