<template>
  <div v-if="isVisible" class="tag-dialog-overlay" @click.self="close">
    <div class="tag-dialog">
      <!-- ヘッダー -->
      <div class="dialog-header">
        <div class="header-row">
          <h3>Tag</h3>
          <!-- 選択済みチップ（タイトルの右に配置） -->
          <div class="selected-chips-row">
            <span
              v-for="id in selectedTags"
              :key="id"
              class="tag-chip"
              :data-type="getTagType(id)"
              @click="toggleTag(id)"
            >
              {{ getTagLabel(id) }}
              <span class="chip-remove">×</span>
            </span>
          </div>
          <!-- クリアボタン（選択済みチップがある場合のみ表示） -->
          <button v-if="selectedTags.length > 0" class="btn-icon btn-clear-action" @click="clearAll" title="Clear All">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
            </svg>
          </button>
          <button class="close-btn" @click="close" title="Close">×</button>
        </div>
      </div>

      <!-- 検索行 -->
      <div class="search-row">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Search tags..."
        />
        <button class="btn btn-icon" :class="{ active: isFilterEnabled }" @click="toggleFilter" title="Filter (枚数基準)">
          <svg viewBox="0 0 24 24">
            <path fill="currentColor" d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z" />
          </svg>
        </button>
      </div>

      <!-- タブ -->
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
          :data-type="getTagType(tag.value)"
          :data-group="tag.group"
          @click="toggleTag(tag.value)"
        >
          <span class="tag-label">{{ tag.label }}</span>
          <img 
            v-if="tag.group === 'attr' && getAttrIcon(tag.value)" 
            :src="getAttrIcon(tag.value)" 
            class="attr-icon"
            :alt="tag.label"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { TagEntry } from '@/types/dialog';
import { classifyTagById, getMonsterTypeFromLabel, type TagGroup } from '@/constants/tag-master-data';
import { getAttributeIconUrl } from '@/api/image-utils';

const props = defineProps<{
  isVisible: boolean;
  tags: Array<{ value: string; label: string }>;
  modelValue: string[];
  deckCards: any[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  'close': [];
}>();

const selectedTags = ref<string[]>([...props.modelValue]);
const selectedGroup = ref<TagGroup | 'all'>('all');
const isFilterEnabled = ref<boolean>(false);
const searchQuery = ref<string>('');

// ダイアログが開かれた時にフィルタをリセット
watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    isFilterEnabled.value = false;
    searchQuery.value = '';
  }
});

// デッキ内のモンスター総数を取得
const totalMonsterCount = computed(() => {
  return props.deckCards.filter(card => card.cardType === 'monster').length;
});

// グループの表示順序
const GROUP_ORDER: (TagGroup | 'all')[] = ['attr', 'race', 'type', 'others'];

// タグにグループ情報を付与し、グループごとにソート
const tagsWithGroups = computed<TagEntry[]>(() => {
  const tagged = props.tags.map(tag => ({
    ...tag,
    group: classifyTagById(tag.value)
  }));

  // グループ順でソート
  return tagged.sort((a, b) => {
    const aIndex = GROUP_ORDER.indexOf(a.group);
    const bIndex = GROUP_ORDER.indexOf(b.group);
    return aIndex - bIndex;
  });
});

// タグに一致するモンスターの枚数をカウント
function countMonstersWithTag(tag: TagEntry): number {
  return props.deckCards.filter(card => {
    if (card.cardType !== 'monster') return false;
    
    const monsterCard = card as any;
    switch (tag.group) {
      case 'attr':
        return monsterCard.attribute === tag.value;
      case 'race':
        return monsterCard.race === tag.value;
      case 'type':
        // typesは配列なので、含まれているかチェック
        return monsterCard.types && monsterCard.types.includes(tag.value);
      default:
        return false;
    }
  }).length;
}

// フィルタされたタグ
const filteredTags = computed(() => {
  let tags = tagsWithGroups.value;
  
  // グループフィルタ
  if (selectedGroup.value !== 'all') {
    tags = tags.filter(tag => tag.group === selectedGroup.value);
  }
  
  // 検索フィルタ
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    tags = tags.filter(tag => tag.label.toLowerCase().includes(query));
  }
  
  // 枚数フィルタ: 各グループごとに基準を満たすもののみ表示
  if (isFilterEnabled.value) {
    tags = tags.filter(tag => {
      // モンスター関連以外のタグは除外
      if (tag.group === 'others') {
        return false;
      }
      
      const count = countMonstersWithTag(tag);
      
      switch (tag.group) {
        case 'attr':
          // 神属性かつ1枚以上、または全体の1/4以上
          if (tag.value === '7') { // 神属性
            return count >= 1;
          }
          return count >= totalMonsterCount.value / 4;
          
        case 'race':
          // 幻獣神族または創造神族かつ1枚以上、または全体の1/4以上
          if (tag.value === '23' || tag.value === '27') { // 幻獣神族、創造神族
            return count >= 1;
          }
          return count >= totalMonsterCount.value / 4;
          
        case 'type': {
          // モンスタータイプ別の処理
          const monsterType = getMonsterTypeFromLabel(tag.label);
          
          // エクストラデッキタイプ: エクストラデッキで7枚以上
          if (['fusion', 'synchro', 'xyz', 'link'].includes(monsterType)) {
            // countMonstersWithTag()がtag.valueで判定しているため、
            // エクストラデッキのこのタイプの枚数を再カウント
            const extraCount = props.deckCards.filter(card => {
              if (card.cardType !== 'monster') return false;
              const monsterCard = card as any;
              if (!monsterCard.isExtraDeck) return false;
              
              // tag.valueと一致するかチェック
              const cardTypes = monsterCard.types || [];
              return cardTypes.includes(tag.value);
            }).length;
            return extraCount >= 7;
          }
          
          // その他のモンスタータイプ: 7枚以上
          return count >= 7;
        }
        
        default:
          return false;
      }
    });
  }
  
  return tags;
});

// フィルタトグル
function toggleFilter(): void {
  isFilterEnabled.value = !isFilterEnabled.value;
  console.log('Tag filter:', isFilterEnabled.value ? 'ON' : 'OFF');
}

// タグラベルを取得
function getTagLabel(tagId: string): string {
  const tag = props.tags.find(t => t.value === tagId);
  return tag?.label || tagId;
}

function getTagType(tagId: string): string {
  const tag = props.tags.find(t => t.value === tagId);
  if (!tag) return '';
  return getMonsterTypeFromLabel(tag.label);
}

function getAttrIcon(tagId: string): string {
  const attrNameMap: Record<string, string> = {
    '1': 'dark',      // 闇属性
    '2': 'light',     // 光属性
    '3': 'water',     // 水属性
    '4': 'fire',      // 炎属性
    '5': 'earth',     // 地属性
    '6': 'wind',      // 風属性
    '7': 'divine'     // 神属性
  };
  
  const attrName = attrNameMap[tagId];
  return attrName ? getAttributeIconUrl(attrName) : '';
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
  align-items: center;
  overflow-y: auto;
  flex: 1;
  max-height: 56px;
}

.btn-clear-action {
  background: #f5f5f5;
  border-color: #e0e0e0;
}

.btn-clear-action:hover {
  background: #ffebee;
  border-color: #ef5350;
  color: #c62828;
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

.tag-chip[data-type="fusion"] {
  background: linear-gradient(135deg, #e1bee7 0%, #ba68c8 100%);
  color: #4a148c;
  border-color: #9c27b0;
}

.tag-chip[data-type="synchro"] {
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

.tag-chip[data-type="xyz"] {
  background: linear-gradient(135deg, #616161 0%, #424242 100%);
  color: #fff;
  border-color: #757575;
}

.tag-chip[data-type="link"] {
  background: linear-gradient(135deg, #bbdefb 0%, #42a5f5 100%);
  color: #0d47a1;
  border-color: #1976d2;
}

.tag-chip[data-type="ritual"] {

  background: linear-gradient(135deg, #bbdefb 0%, #42a5f5 100%);
  color: #0d47a1;
  border-color: #1976d2;
}

.tag-chip[data-type="pendulum"] {
  background: linear-gradient(180deg, 
    #ffb74d 0%, 
    #ffb74d 30%, 
    #4db6ac 70%,
    #4db6ac 100%
  );
  color: #4a148c;
  border-color: #ff9800;
}

.tag-chip[data-type="pendulum"]:hover {
  background: linear-gradient(180deg, 
    #ff9800 0%, 
    #ff9800 30%, 
    #00897b 70%,
    #00897b 100%
  );
  border-color: #f57c00;
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
  flex-shrink: 0;
}

.close-btn:hover {
  color: var(--text-color, #333);
}

.filter-and-actions {
  padding: 6px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-shrink: 0;
}

.action-buttons-left {
  display: flex;
  flex-direction: row;
  gap: 6px;
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

.filter-tabs {
  display: flex;
  gap: 8px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
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
  width: 100%;
  box-sizing: border-box;
}

.tag-list > .tag-item {
  width: 100%;
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
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.tag-label {
  flex: 1;
}

.attr-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  object-fit: contain;
}

/* others グループ: 長方形（角丸なし） */
.tag-item[data-group="others"] {
  border-radius: 2px;
}

/* attr グループ: 平行四辺形 */
.tag-item[data-group="attr"] {
  transform: skewX(-8deg);
  border-radius: 4px;
}

.tag-item[data-group="attr"] .tag-label,
.tag-item[data-group="attr"] .attr-icon {
  transform: skewX(8deg);
}

/* race グループ: 角丸大きめ（丸みのある長方形） */
.tag-item[data-group="race"] {
  border-radius: 12px;
}

/* type グループ: 端だけ丸（pill形状） */
.tag-item[data-group="type"] {
  border-radius: 21px;
}

/* 共通のホバー・選択スタイル（個別スタイルがないもの） */
.tag-item:hover {
  background: #f8f9fa;
  border-color: #1976d2;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.1);
}

.tag-item.selected {
  background: #e3f2fd;
  border-color: #1976d2;
  color: #1565c0;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(25, 118, 210, 0.2), inset 0 0 0 1px #1976d2;
}

.tag-item[data-type="fusion"] {
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
  border-color: #ba68c8;
  border-radius: 21px;
}

.tag-item[data-type="fusion"]:hover {
  background: linear-gradient(135deg, #e1bee7 0%, #ba68c8 100%);
  border-color: #9c27b0;
  box-shadow: 0 2px 6px rgba(156, 39, 176, 0.3);
}

.tag-item[data-type="fusion"].selected {
  background: linear-gradient(135deg, #e1bee7 0%, #ba68c8 100%);
  border-color: #9c27b0;
  color: #4a148c;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(156, 39, 176, 0.3), inset 0 0 0 1px #9c27b0;
}

.tag-item[data-type="synchro"] {
  background:
    repeating-linear-gradient(
      135deg,
      transparent,
      transparent 8px,
      rgba(189, 189, 189, 0.12) 8px,
      rgba(189, 189, 189, 0.12) 9px
    ),
    linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
  border-color: #bdbdbd;
  border-radius: 21px;
}

.tag-item[data-type="synchro"]:hover {
  background: 
    repeating-linear-gradient(
      135deg,
      transparent,
      transparent 8px,
      rgba(117, 117, 117, 0.15) 8px,
      rgba(117, 117, 117, 0.15) 9px
    ),
    linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%);
  border-color: #757575;
  box-shadow: 0 2px 6px rgba(117, 117, 117, 0.3);
}

.tag-item[data-type="synchro"].selected {
  background:
    repeating-linear-gradient(
      135deg,
      transparent,
      transparent 8px,
      rgba(117, 117, 117, 0.2) 8px,
      rgba(117, 117, 117, 0.2) 9px
    ),
    linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%);
  border-color: #757575;
  color: #424242;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(117, 117, 117, 0.3), inset 0 0 0 1px #757575;
}

.tag-item[data-type="xyz"] {
  background: linear-gradient(135deg, #757575 0%, #616161 100%);
  border-color: #9e9e9e;
  border-radius: 21px;
  color: #fff;
}

.tag-item[data-type="xyz"]:hover {
  background: linear-gradient(135deg, #616161 0%, #424242 100%);
  border-color: #757575;
  box-shadow: 0 2px 6px rgba(97, 97, 97, 0.3);
}

.tag-item[data-type="xyz"].selected {
  background: linear-gradient(135deg, #616161 0%, #424242 100%);
  border-color: #757575;
  color: #fff;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(97, 97, 97, 0.3), inset 0 0 0 1px #757575;
}

.tag-item[data-type="link"] {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-color: #64b5f6;
  border-radius: 21px;
}

.tag-item[data-type="link"]:hover {
  background: linear-gradient(135deg, #bbdefb 0%, #42a5f5 100%);
  border-color: #1976d2;
  box-shadow: 0 2px 6px rgba(25, 118, 210, 0.3);
}

.tag-item[data-type="link"].selected {
  background: linear-gradient(135deg, #bbdefb 0%, #42a5f5 100%);
  border-color: #1976d2;
  color: #0d47a1;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(25, 118, 210, 0.3), inset 0 0 0 1px #1976d2;
}

.tag-item[data-type="ritual"] {
  background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
  border-color: #4dd0e1;
  border-radius: 21px;
}

.tag-item[data-type="ritual"]:hover {
  background: linear-gradient(135deg, #b2ebf2 0%, #00bcd4 100%);
  border-color: #0097a7;
  box-shadow: 0 2px 6px rgba(0, 151, 167, 0.3);
}

.tag-item[data-type="ritual"].selected {
  background: linear-gradient(135deg, #b2ebf2 0%, #00bcd4 100%);
  border-color: #0097a7;
  color: #006064;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 151, 167, 0.3), inset 0 0 0 1px #0097a7;
}

.tag-item[data-type="pendulum"] {
  background: linear-gradient(180deg,
    #fff3e0 0%,
    #fff3e0 30%,
    #b2dfdb 70%,
    #b2dfdb 100%
  );
  border-color: #ffb74d;
  border-radius: 21px;
}

.tag-item[data-type="pendulum"]:hover {
  background: linear-gradient(180deg, 
    #ffcc80 0%, 
    #ffcc80 30%, 
    #80cbc4 70%, 
    #80cbc4 100%
  );
  border-color: #ff9800;
  box-shadow: 0 2px 6px rgba(255, 152, 0, 0.3);
}

.tag-item[data-type="pendulum"].selected {
  background: linear-gradient(180deg,
    #ffcc80 0%,
    #ffcc80 30%,
    #4db6ac 70%,
    #4db6ac 100%
  );
  border-color: #ff9800;
  color: #4a148c;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(255, 152, 0, 0.3), inset 0 0 0 1px #ff9800;
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
