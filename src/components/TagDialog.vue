<template>
  <div v-if="isVisible" class="tag-dialog-overlay" @click.self="close">
    <div class="tag-dialog">
      <!-- ヘッダー -->
      <div class="dialog-header">
        <h3>Tag</h3>
        <div class="selected-chips">
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
        <button class="close-btn" @click="close" title="Close">×</button>
      </div>

      <!-- フィルタタブ -->
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
}

// すべてクリア
function clearAll(): void {
  selectedTags.value = [];
}

// 適用
function apply(): void {
  emit('update:modelValue', [...selectedTags.value]);
  close();
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
  max-height: 80vh;
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
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-color, #333);
  min-width: 50px;
}

.selected-chips {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 60px;
  overflow-y: auto;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.tag-chip:hover {
  background: #c8e6c9;
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
  gap: 8px;
}

.tab-btn {
  padding: 6px 16px;
  background: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-color, #666);
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--bg-hover, #e0e0e0);
}

.tab-btn.active {
  background: #2e7d32;
  color: white;
  border-color: #2e7d32;
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

.tag-item:hover {
  background: var(--bg-hover, #e0e0e0);
}

.tag-item.selected {
  background: #e8f5e9;
  border-color: #2e7d32;
  color: #2e7d32;
  font-weight: 500;
}

.dialog-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
  background: #2e7d32;
  color: white;
}

.btn-primary:hover {
  background: #1b5e20;
}
</style>
