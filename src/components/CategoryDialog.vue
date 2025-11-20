<template>
  <div v-if="isVisible" class="category-dialog-overlay" @click.self="close">
    <div class="category-dialog">
      <!-- ヘッダー -->
      <div class="dialog-header">
        <h3>Category</h3>
        <div class="selected-chips">
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
        <button class="close-btn" @click="close" title="Close">×</button>
      </div>

      <!-- フィルタタブ（二行表示） -->
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

      <!-- フッター -->
      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="clearAll">Clear All</button>
        <button class="btn btn-primary" @click="apply">Apply</button>
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
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  'close': [];
}>();

const selectedCategories = ref<string[]>([...props.modelValue]);
const selectedGroup = ref<string>('all');

// タブグループ（二行表示用）
const firstRowGroups = ['ruby_ア', 'ruby_カ', 'ruby_サ', 'ruby_タ', 'ruby_ナ'];
const secondRowGroups = ['ruby_ハ', 'ruby_マ', 'ruby_ヤ', 'ruby_ラ', 'ruby_ワ', 'ruby_ヴ'];

// フィルタされたカテゴリ
const filteredCategories = computed(() => {
  if (selectedGroup.value === 'all') {
    return props.categories;
  }
  // 選択されたグループを含むカテゴリを表示
  return props.categories.filter(cat => 
    cat.group.includes(selectedGroup.value)
  );
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
}

// すべてクリア
function clearAll(): void {
  selectedCategories.value = [];
}

// 適用
function apply(): void {
  emit('update:modelValue', [...selectedCategories.value]);
  close();
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
  padding: 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  flex-shrink: 0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-color, #333);
  min-width: 80px;
}

.selected-chips {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 60px;
  overflow-y: auto;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.category-chip:hover {
  background: #bbdefb;
}

.chip-remove {
  font-size: 16px;
  font-weight: bold;
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--text-color, #333);
}

.filter-tabs {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.tab-row {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-color, #666);
  transition: all 0.2s;
  flex: 1;
  white-space: nowrap;
  min-width: 0;
}

.tab-btn:hover {
  background: var(--bg-hover, #e0e0e0);
}

.tab-btn.active {
  background: #1976d2;
  color: white;
  border-color: #1976d2;
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
  padding: 8px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color, #333);
  text-align: left;
  transition: all 0.2s;
}

.category-item:hover {
  background: var(--bg-hover, #e0e0e0);
}

.category-item.selected {
  background: #e3f2fd;
  border-color: #1976d2;
  color: #1976d2;
  font-weight: 500;
}

.dialog-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
