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
              :data-value="id"
              :data-label="getTagLabel(id)"
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
import { 
  classifyTagById, 
  getMonsterTypeFromLabel, 
  type TagGroup,
  TAG_ID_TO_ATTR,
  TAG_ID_TO_RACE,
  TAG_ID_TO_MONSTER_TYPE
} from '@/constants/tag-master-data';
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

// タグにグループ情報と内部キーを付与し、グループごとにソート
const tagsWithGroups = computed<TagEntry[]>(() => {
  const tagged = props.tags.map(tag => {
    const group = classifyTagById(tag.value);
    return {
      ...tag,
      group,
      internalKey: getInternalKey(tag.value, group)
    };
  });

  // グループ順でソート
  return tagged.sort((a, b) => {
    const aIndex = GROUP_ORDER.indexOf(a.group);
    const bIndex = GROUP_ORDER.indexOf(b.group);
    return aIndex - bIndex;
  });
});

// タグIDから内部キー（英語キー）を取得
function getInternalKey(tagValue: string, group: TagGroup): string | undefined {
  switch (group) {
    case 'attr':
      return TAG_ID_TO_ATTR[tagValue];
    case 'race':
      return TAG_ID_TO_RACE[tagValue];
    case 'type':
      return TAG_ID_TO_MONSTER_TYPE[tagValue];
    default:
      return undefined;
  }
}

// タグに一致するモンスターの枚数をカウント
function countMonstersWithTag(tag: TagEntry): number {
  return props.deckCards.filter(card => {
    if (card.cardType !== 'monster') return false;
    
    const monsterCard = card as any;
    
    // internalKeyを使って直接比較
    switch (tag.group) {
      case 'attr':
        return tag.internalKey ? monsterCard.attribute === tag.internalKey : false;
      case 'race':
        return tag.internalKey ? monsterCard.race === tag.internalKey : false;
      case 'type':
        // typesは英語キーの配列なので、internalKeyで比較
        return tag.internalKey ? (monsterCard.types && monsterCard.types.includes(tag.internalKey)) : false;
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
          if (tag.internalKey === 'divine') {
            return count >= 1;
          }
          return count >= totalMonsterCount.value / 4;
          
        case 'race':
          // 幻神獣族または創造神族かつ1枚以上、または全体の1/4以上
          if (tag.internalKey === 'divine' || tag.internalKey === 'creatorgod') {
            return count >= 1;
          }
          return count >= totalMonsterCount.value / 4;
          
        case 'type': {
          // モンスタータイプ別の処理
          const monsterType = getMonsterTypeFromLabel(tag.label);
          
          // エクストラデッキタイプ: エクストラデッキで7枚以上
          if (['fusion', 'synchro', 'xyz', 'link'].includes(monsterType)) {
            // エクストラデッキのこのタイプの枚数をカウント
            const extraCount = props.deckCards.filter(card => {
              if (card.cardType !== 'monster') return false;
              const monsterCard = card as any;
              if (!monsterCard.isExtraDeck) return false;
              
              // tag.internalKey（英語キー）と一致するかチェック
              const cardTypes = monsterCard.types || [];
              return tag.internalKey && cardTypes.includes(tag.internalKey);
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
  background: var(--dialog-overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.tag-dialog {
  background: var(--dialog-bg);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
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
  border-bottom: 1px solid var(--border-color, var(--border-primary));
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
  color: var(--text-color, var(--text-primary));
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
  background: var(--bg-secondary);
  border-color: var(--border-primary);
}

.btn-clear-action:hover {
  background: var(--color-error-bg);
  border-color: var(--color-error);
  color: var(--color-error-text);
}

.search-row {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, var(--border-primary));
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--input-text);
}

.search-input:focus {
  outline: none;
  border-color: var(--button-bg);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid var(--color-success);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-chip:hover {
  background: var(--color-success-hover-bg);
  border-color: var(--color-success);
}

.tag-chip[data-type="fusion"] {
  background: var(--monster-fusion-chip-active-bg);
  color: var(--monster-fusion-chip-active-text);
  border: 1px solid var(--monster-fusion-chip-active-border);
}

.tag-chip[data-type="synchro"] {
  background: var(--monster-synchro-chip-active-bg);
  color: var(--monster-synchro-chip-active-text);
  border: 1px solid var(--monster-synchro-chip-active-border);
}

.tag-chip[data-type="xyz"] {
  background: var(--monster-xyz-chip-active-bg);
  color: var(--monster-xyz-chip-active-text);
  border: 1px solid var(--monster-xyz-chip-active-border);
}

.tag-chip[data-type="link"] {
  background: var(--monster-link-chip-active-bg);
  color: var(--monster-link-chip-active-text);
  border: 1px solid var(--monster-link-chip-active-border);
}

.tag-chip[data-type="ritual"] {
  background: var(--monster-ritual-chip-active-bg);
  color: var(--monster-ritual-chip-active-text);
  border: 1px solid var(--monster-ritual-chip-active-border);
}

.tag-chip[data-type="pendulum"] {
  background: var(--monster-pendulum-chip-active-bg);
  color: var(--monster-pendulum-chip-active-text);
  border: 1px solid var(--monster-pendulum-chip-active-border);
}

.tag-chip[data-type="pendulum"]:hover {
  background: var(--monster-pendulum-chip-active-hover-bg);
  border-color: var(--monster-pendulum-chip-active-hover-border);
}

.chip-remove {
  font-size: 14px;
  font-weight: bold;
  color: var(--color-success);
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
  color: var(--text-color, var(--text-secondary));
  padding: 0;
  width: 30px;
  height: 30px;
  line-height: 1;
  flex-shrink: 0;
}

.close-btn:hover {
  color: var(--text-color, var(--text-primary));
}

.filter-and-actions {
  padding: 6px 16px;
  border-bottom: 1px solid var(--border-color, var(--border-primary));
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
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.btn-icon:hover {
  background: var(--border-primary);
  border-color: var(--text-tertiary);
  color: var(--text-primary);
}

.btn-icon.active {
  background: var(--button-bg);
  border-color: var(--button-hover-bg);
  color: var(--button-text);
}

.btn-icon.active:hover {
  background: var(--button-hover-bg);
  border-color: var(--color-info);
  color: var(--button-text);
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
  border-bottom: 1px solid var(--border-color, var(--border-primary));
}

.tab-btn {
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-right: 1px solid var(--border-primary);
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.tab-btn:last-child {
  border-right: none;
}

.tab-btn:hover {
  background: rgba(25, 118, 210, 0.08);
  color: var(--button-bg);
}

.tab-btn.active {
  color: var(--button-bg);
  border-bottom-color: var(--button-bg);
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
  background: var(--bg-primary);
  border: 1.5px solid var(--border-primary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
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

/* 共通のホバー・選択スタイル（個別スタイルがないもの用） */
.tag-item {
  background: var(--tag-item-default-bg);
  border-color: var(--tag-item-default-border);
  color: var(--tag-item-default-text);

  &:hover:not(.selected) {
    background: var(--tag-item-hover-bg);
    border-color: var(--tag-item-hover-border);
    color: var(--tag-item-hover-text);
    box-shadow: 0 2px 6px rgba(76, 175, 80, 0.2);
  }

  &.selected {
    background: var(--tag-item-active-bg);
    border-color: var(--tag-item-active-border);
    color: var(--tag-item-active-text);
    font-weight: 500;
    box-shadow: inset 0 0 0 1px var(--tag-item-active-border);

    &:hover {
      background: var(--tag-item-active-hover-bg);
      border-color: var(--tag-item-active-hover-border);
      color: var(--tag-item-active-hover-text);
      box-shadow: inset 0 0 0 1px var(--tag-item-active-hover-border), 0 2px 4px rgba(76, 175, 80, 0.2);
    }
  }
}

.tag-item[data-type="fusion"] {
  background: var(--monster-fusion-chip-default-bg);
  border-color: var(--monster-fusion-chip-default-border);
  border-radius: 21px;
  color: var(--monster-fusion-chip-default-text);

  &:hover:not(.selected) {
    background: var(--monster-fusion-chip-hover-bg);
    border-color: var(--monster-fusion-chip-hover-border);
    color: var(--monster-fusion-chip-hover-text);
    box-shadow: 0 2px 6px rgba(156, 39, 176, 0.3);
    filter: brightness(1.1);
  }

  &.selected {
    background: var(--monster-fusion-chip-active-bg);
    border-color: var(--monster-fusion-chip-active-border);
    color: var(--monster-fusion-chip-active-text);
    font-weight: 500;
    box-shadow: inset 0 0 0 1px var(--monster-fusion-chip-active-border);

    &:hover {
      background: var(--monster-fusion-chip-active-hover-bg);
      border-color: var(--monster-fusion-chip-active-hover-border);
      color: var(--monster-fusion-chip-active-hover-text);
      box-shadow: inset 0 0 0 1px var(--monster-fusion-chip-active-hover-border), 0 2px 4px rgba(156, 39, 176, 0.3);
    }
  }
}

.tag-item[data-type="synchro"] {
  background: var(--monster-synchro-chip-default-bg);
  border-color: var(--monster-synchro-chip-default-border);
  border-radius: 21px;
  color: var(--monster-synchro-chip-default-text);

  &:hover:not(.selected) {
    background: var(--monster-synchro-chip-hover-bg);
    border-color: var(--monster-synchro-chip-hover-border);
    color: var(--monster-synchro-chip-hover-text);
    box-shadow: 0 2px 6px rgba(117, 117, 117, 0.3);
    filter: brightness(1.1);
  }

  &.selected {
    background: var(--monster-synchro-chip-active-bg);
    border-color: var(--monster-synchro-chip-active-border);
    color: var(--monster-synchro-chip-active-text);
    font-weight: 500;
    box-shadow: inset 0 0 0 1px var(--monster-synchro-chip-active-border);

    &:hover {
      background: var(--monster-synchro-chip-active-hover-bg);
      border-color: var(--monster-synchro-chip-active-hover-border);
      color: var(--monster-synchro-chip-active-hover-text);
      box-shadow: inset 0 0 0 1px var(--monster-synchro-chip-active-hover-border), 0 2px 4px rgba(117, 117, 117, 0.2);
    }
  }
}

.tag-item[data-type="xyz"] {
  background: var(--monster-xyz-chip-default-bg);
  border-color: var(--monster-xyz-chip-default-border);
  border-radius: 21px;
  color: var(--monster-xyz-chip-default-text);

  &:hover:not(.selected) {
    background: var(--monster-xyz-chip-hover-bg);
    border-color: var(--monster-xyz-chip-hover-border);
    color: var(--monster-xyz-chip-hover-text);
    box-shadow: 0 2px 6px rgba(97, 97, 97, 0.3);
    filter: brightness(1.1);
  }

  &.selected {
    background: var(--monster-xyz-chip-active-bg);
    border-color: var(--monster-xyz-chip-active-border);
    color: var(--monster-xyz-chip-active-text);
    font-weight: 500;
    box-shadow: inset 0 0 0 1px var(--monster-xyz-chip-active-border);

    &:hover {
      background: var(--monster-xyz-chip-active-hover-bg);
      border-color: var(--monster-xyz-chip-active-hover-border);
      color: var(--monster-xyz-chip-active-hover-text);
      box-shadow: inset 0 0 0 1px var(--monster-xyz-chip-active-hover-border), 0 2px 4px rgba(97, 97, 97, 0.2);
    }
  }
}

.tag-item[data-type="link"] {
  background: var(--monster-link-chip-default-bg);
  border-color: var(--monster-link-chip-default-border);
  border-radius: 21px;
  color: var(--monster-link-chip-default-text);

  &:hover:not(.selected) {
    background: var(--monster-link-chip-hover-bg);
    border-color: var(--monster-link-chip-hover-border);
    color: var(--monster-link-chip-hover-text);
    box-shadow: 0 2px 6px rgba(25, 118, 210, 0.3);
    filter: brightness(1.1);
  }

  &.selected {
    background: var(--monster-link-chip-active-bg);
    border-color: var(--monster-link-chip-active-border);
    color: var(--monster-link-chip-active-text);
    font-weight: 500;
    box-shadow: inset 0 0 0 1px var(--monster-link-chip-active-border);

    &:hover {
      background: var(--monster-link-chip-active-hover-bg);
      border-color: var(--monster-link-chip-active-hover-border);
      color: var(--monster-link-chip-active-hover-text);
      box-shadow: inset 0 0 0 1px var(--monster-link-chip-active-hover-border), 0 2px 4px rgba(25, 118, 210, 0.2);
    }
  }
}

.tag-item[data-type="ritual"] {
  background: var(--monster-ritual-chip-default-bg);
  border-color: var(--monster-ritual-chip-default-border);
  border-radius: 21px;
  color: var(--monster-ritual-chip-default-text);

  &:hover:not(.selected) {
    background: var(--monster-ritual-chip-hover-bg);
    border-color: var(--monster-ritual-chip-hover-border);
    color: var(--monster-ritual-chip-hover-text);
    box-shadow: 0 2px 6px rgba(0, 151, 167, 0.3);
    filter: brightness(1.1);
  }

  &.selected {
    background: var(--monster-ritual-chip-active-bg);
    border-color: var(--monster-ritual-chip-active-border);
    color: var(--monster-ritual-chip-active-text);
    font-weight: 500;
    box-shadow: inset 0 0 0 1px var(--monster-ritual-chip-active-border);

    &:hover {
      background: var(--monster-ritual-chip-active-hover-bg);
      border-color: var(--monster-ritual-chip-active-hover-border);
      color: var(--monster-ritual-chip-active-hover-text);
      box-shadow: inset 0 0 0 1px var(--monster-ritual-chip-active-hover-border), 0 2px 4px rgba(0, 151, 167, 0.2);
    }
  }
}

.tag-item[data-type="pendulum"] {
  background: var(--monster-pendulum-chip-default-bg);
  border-color: var(--monster-pendulum-chip-default-border);
  border-radius: 21px;
  color: var(--monster-pendulum-chip-default-text);

  &:hover:not(.selected) {
    background: var(--monster-pendulum-chip-hover-bg);
    border-color: var(--monster-pendulum-chip-hover-border);
    color: var(--monster-pendulum-chip-hover-text);
    box-shadow: 0 2px 6px rgba(255, 152, 0, 0.3);
    filter: brightness(1.1);
  }

  &.selected {
    background: var(--monster-pendulum-chip-active-bg);
    border-color: var(--monster-pendulum-chip-active-border);
    color: var(--monster-pendulum-chip-active-text);
    font-weight: 500;
    box-shadow: inset 0 0 0 1px var(--monster-pendulum-chip-active-border);

    &:hover {
      background: var(--monster-pendulum-chip-active-hover-bg);
      border-color: var(--monster-pendulum-chip-active-hover-border);
      color: var(--monster-pendulum-chip-active-hover-text);
      box-shadow: inset 0 0 0 1px var(--monster-pendulum-chip-active-hover-border), 0 2px 4px rgba(255, 152, 0, 0.2);
    }
  }
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
  background: var(--bg-secondary, var(--bg-secondary));
  color: var(--text-color, var(--text-secondary));
}

.btn-secondary:hover {
  background: var(--bg-hover, var(--border-primary));
}

.btn-primary {
  background: var(--button-bg);
  color: var(--button-text);
}

.btn-primary:hover {
  background: var(--button-hover-bg);
}

/* ダークモード用: 背景色グラデーションのみ変更 */
:global(.dark-theme) {
  .tag-item {
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

  .tab-btn.active {
    background: rgba(0, 137, 255, 0.2);
  }
}
</style>
