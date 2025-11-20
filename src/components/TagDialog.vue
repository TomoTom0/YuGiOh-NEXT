<template>
  <div v-if="isVisible" class="tag-dialog-overlay" @click.self="close">
    <div class="tag-dialog">
      <!-- ヘッダー -->
      <div class="dialog-header">
        <div class="header-title-area">
          <h3>Tag</h3>
          <!-- 選択済みチップ -->
          <div class="selected-chips-inline">
            <span 
              v-for="id in selectedTags" 
              :key="id" 
              class="tag-chip"
              @click="toggleTag(id)"
            >
              {{ getTagLabel(id) }}
              <span class="chip-remove">×</span>
            </span>
          </div>
        </div>
        <button class="close-btn" @click="close" title="Close">×</button>
      </div>

      <!-- フィルタタブとアクションボタン -->
      <div class="filter-and-actions">
        <div class="action-buttons-left">
          <button class="btn btn-icon" @click="clearAll" title="Clear All">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>
        <div class="filter-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: selectedGroup === 'all' }"
          @click="selectedGroup = 'all'"
        >
          all
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: selectedGroup === 'others' }"
          @click="selectedGroup = 'others'"
        >
          others
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: selectedGroup === 'attr' }"
          @click="selectedGroup = 'attr'"
        >
          attr
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: selectedGroup === 'race' }"
          @click="selectedGroup = 'race'"
        >
          race
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: selectedGroup === 'type' }"
          @click="selectedGroup = 'type'"
        >
          type
        </button>
        </div>
      </div>

      <!-- タグリスト -->
      <div class="tag-list">
        <button
          v-for="tag in filteredTags"
          :key="tag.value"
          class="tag-item"
          :class="{ selected: selectedTags.includes(tag.value) }"
          @click="toggleTag(tag.value)"
        >
          {{ tag.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { TagEntry } from '@/types/dialog';
import { classifyTagById, type TagGroup } from '@/constants/tag-master-data';

const props = defineProps<{
  isVisible: boolean;
  tags: Array<{ value: string; label: string }>;
  modelValue: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  'close': [];
}>();

const selectedTags = ref<string[]>([...props.modelValue]);
const selectedGroup = ref<TagGroup | 'all'>('all');

// タグにグループ情報を付与
const tagsWithGroups = computed<TagEntry[]>(() => {
  return props.tags.map(tag => ({
    ...tag,
    group: classifyTagById(tag.value)
  }));
});

// フィルタされたタグ
const filteredTags = computed(() => {
  if (selectedGroup.value === 'all') {
    return tagsWithGroups.value;
  }
  return tagsWithGroups.value.filter(tag => tag.group === selectedGroup.value);
});

// タグラベルを取得
function getTagLabel(tagId: string): string {
  const tag = props.tags.find(t => t.value === tagId);
  return tag?.label || tagId;
}

// タグトグル
function toggleTag(tagId: string): void {
  const index = selectedTags.value.indexOf(tagId);
  if (index > -1) {
    selectedTags.value.splice(index, 1);
  } else {
    selectedTags.value.push(tagId);
  }
  // 即座に適用
  emit('update:modelValue', [...selectedTags.value]);
}

// すべてクリア
function clearAll(): void {
  selectedTags.value = [];
  // 即座に適用
  emit('update:modelValue', []);
}

// 閉じる
function close(): void {
  emit('close');
}

// propsのmodelValueが変更されたら同期
watch(() => props.modelValue, (newVal) => {
  selectedTags.value = [...newVal];
}, { deep: true });
</script>

<style scoped>
.tag-dialog-overlay {
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

.tag-dialog {
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
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-shrink: 0;
  box-sizing: border-box;
}

.header-title-area {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-color, #333);
  flex-shrink: 0;
}

.selected-chips-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #66bb6a;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-chip:hover {
  background: #c8e6c9;
  border-color: #4caf50;
}

.chip-remove {
  font-size: 14px;
  font-weight: bold;
  color: #2e7d32;
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
}

.close-btn:hover {
  color: var(--text-color, #333);
}

.filter-and-actions {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.action-buttons-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
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
}

.btn-icon:hover {
  background: #e0e0e0;
  border-color: #999;
}

.btn-icon svg {
  width: 16px;
  height: 16px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex: 1;
}

.tab-btn {
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-right: 1px solid #e0e0e0;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
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

.tag-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  align-content: start;
}

.tag-item {
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

.tag-item:hover {
  background: #f8f9fa;
  border-color: #1976d2;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.1);
}

.tag-item.selected {
  background: #e3f2fd;
  border-color: #1976d2;
  border-width: 2px;
  color: #1565c0;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(25, 118, 210, 0.2);
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
