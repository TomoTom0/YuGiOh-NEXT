<template>
  <div v-if="isVisible" class="dialog-overlay" @click="$emit('close')">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h2>検索フィルター</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="dialog-content">
        <!-- カードタイプ -->
        <div class="filter-section">
          <h3 class="filter-title">カードタイプ</h3>
          <div class="filter-chips">
            <button
              v-for="type in cardTypes"
              :key="type.value"
              class="chip"
              :class="{ active: filters.cardType === type.value }"
              @click="toggleCardType(type.value)"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <!-- 属性 -->
        <div class="filter-section">
          <h3 class="filter-title">属性</h3>
          <div class="filter-chips">
            <button
              v-for="attr in attributes"
              :key="attr.value"
              class="chip"
              :class="{ active: filters.attributes.includes(attr.value) }"
              @click="toggleAttribute(attr.value)"
            >
              {{ attr.label }}
            </button>
          </div>
        </div>

        <!-- 種族 -->
        <div class="filter-section">
          <h3 class="filter-title">種族</h3>
          <div class="filter-chips scrollable">
            <button
              v-for="race in races"
              :key="race.value"
              class="chip"
              :class="{ active: filters.races.includes(race.value) }"
              @click="toggleRace(race.value)"
            >
              {{ race.label }}
            </button>
          </div>
        </div>

        <!-- レベル/ランク -->
        <div class="filter-section">
          <h3 class="filter-title">レベル/ランク</h3>
          <div class="filter-chips">
            <button
              v-for="level in levels"
              :key="level"
              class="chip chip-small"
              :class="{ active: filters.levels.includes(level) }"
              @click="toggleLevel(level)"
            >
              {{ level }}
            </button>
          </div>
        </div>

        <!-- ATK/DEF -->
        <div class="filter-section">
          <h3 class="filter-title">ATK / DEF</h3>
          <div class="range-inputs">
            <div class="range-group">
              <label>ATK</label>
              <div class="range-row">
                <input
                  v-model.number="filters.atk.from"
                  type="number"
                  placeholder="0"
                  min="0"
                  step="100"
                >
                <span>-</span>
                <input
                  v-model.number="filters.atk.to"
                  type="number"
                  placeholder="?"
                  min="0"
                  step="100"
                >
              </div>
            </div>
            <div class="range-group">
              <label>DEF</label>
              <div class="range-row">
                <input
                  v-model.number="filters.def.from"
                  type="number"
                  placeholder="0"
                  min="0"
                  step="100"
                >
                <span>-</span>
                <input
                  v-model.number="filters.def.to"
                  type="number"
                  placeholder="?"
                  min="0"
                  step="100"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- モンスタータイプ -->
        <div class="filter-section">
          <h3 class="filter-title">モンスタータイプ</h3>
          <div class="filter-chips scrollable">
            <button
              v-for="type in monsterTypes"
              :key="type.value"
              class="chip"
              :class="{ active: filters.monsterTypes.includes(type.value) }"
              @click="toggleMonsterType(type.value)"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <!-- リンク数 -->
        <div class="filter-section">
          <h3 class="filter-title">リンク数</h3>
          <div class="filter-chips">
            <button
              v-for="num in linkNumbers"
              :key="num"
              class="chip chip-small"
              :class="{ active: filters.linkNumbers.includes(num) }"
              @click="toggleLinkNumber(num)"
            >
              {{ num }}
            </button>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-clear" @click="clearFilters">クリア</button>
        <button class="btn btn-apply" @click="applyFilters">適用</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { Attribute, Race, MonsterType, CardType } from '../types/card';

const props = defineProps<{
  isVisible: boolean;
  initialFilters?: SearchFilters;
}>();

const emit = defineEmits<{
  close: [];
  apply: [filters: SearchFilters];
}>();

export interface SearchFilters {
  cardType: CardType | null;
  attributes: Attribute[];
  races: Race[];
  levels: number[];
  atk: { from?: number; to?: number };
  def: { from?: number; to?: number };
  monsterTypes: MonsterType[];
  linkNumbers: number[];
}

const filters = reactive<SearchFilters>({
  cardType: null,
  attributes: [],
  races: [],
  levels: [],
  atk: { from: undefined, to: undefined },
  def: { from: undefined, to: undefined },
  monsterTypes: [],
  linkNumbers: []
});

// カードタイプ
const cardTypes: { value: CardType; label: string }[] = [
  { value: 'monster', label: 'モンスター' },
  { value: 'spell', label: '魔法' },
  { value: 'trap', label: '罠' }
];

// 属性
const attributes: { value: Attribute; label: string }[] = [
  { value: 'light', label: '光' },
  { value: 'dark', label: '闇' },
  { value: 'water', label: '水' },
  { value: 'fire', label: '炎' },
  { value: 'earth', label: '地' },
  { value: 'wind', label: '風' },
  { value: 'divine', label: '神' }
];

// 種族
const races: { value: Race; label: string }[] = [
  { value: 'dragon', label: 'ドラゴン族' },
  { value: 'spellcaster', label: '魔法使い族' },
  { value: 'warrior', label: '戦士族' },
  { value: 'machine', label: '機械族' },
  { value: 'fiend', label: '悪魔族' },
  { value: 'fairy', label: '天使族' },
  { value: 'zombie', label: 'アンデット族' },
  { value: 'beast', label: '獣族' },
  { value: 'beastwarrior', label: '獣戦士族' },
  { value: 'plant', label: '植物族' },
  { value: 'insect', label: '昆虫族' },
  { value: 'aqua', label: '水族' },
  { value: 'fish', label: '魚族' },
  { value: 'seaserpent', label: '海竜族' },
  { value: 'reptile', label: '爬虫類族' },
  { value: 'dinosaur', label: '恐竜族' },
  { value: 'windbeast', label: '鳥獣族' },
  { value: 'rock', label: '岩石族' },
  { value: 'pyro', label: '炎族' },
  { value: 'thunder', label: '雷族' },
  { value: 'psychic', label: 'サイキック族' },
  { value: 'wyrm', label: '幻竜族' },
  { value: 'cyberse', label: 'サイバース族' },
  { value: 'illusion', label: '幻想魔族' },
  { value: 'divine', label: '幻神獣族' },
  { value: 'creatorgod', label: '創造神族' }
];

// モンスタータイプ
const monsterTypes: { value: MonsterType; label: string }[] = [
  { value: 'normal', label: '通常' },
  { value: 'effect', label: '効果' },
  { value: 'fusion', label: '融合' },
  { value: 'ritual', label: '儀式' },
  { value: 'synchro', label: 'シンクロ' },
  { value: 'xyz', label: 'エクシーズ' },
  { value: 'pendulum', label: 'ペンデュラム' },
  { value: 'link', label: 'リンク' },
  { value: 'tuner', label: 'チューナー' },
  { value: 'flip', label: 'リバース' },
  { value: 'toon', label: 'トゥーン' },
  { value: 'spirit', label: 'スピリット' },
  { value: 'union', label: 'ユニオン' },
  { value: 'gemini', label: 'デュアル' },
  { value: 'special', label: '特殊召喚' }
];

// レベル
const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// リンク数
const linkNumbers = [1, 2, 3, 4, 5, 6];

// 初期フィルターの適用
watch(() => props.initialFilters, (newFilters) => {
  if (newFilters) {
    Object.assign(filters, newFilters);
  }
}, { immediate: true });

function toggleCardType(type: CardType) {
  filters.cardType = filters.cardType === type ? null : type;
}

function toggleAttribute(attr: Attribute) {
  const index = filters.attributes.indexOf(attr);
  if (index >= 0) {
    filters.attributes.splice(index, 1);
  } else {
    filters.attributes.push(attr);
  }
}

function toggleRace(race: Race) {
  const index = filters.races.indexOf(race);
  if (index >= 0) {
    filters.races.splice(index, 1);
  } else {
    filters.races.push(race);
  }
}

function toggleLevel(level: number) {
  const index = filters.levels.indexOf(level);
  if (index >= 0) {
    filters.levels.splice(index, 1);
  } else {
    filters.levels.push(level);
  }
}

function toggleMonsterType(type: MonsterType) {
  const index = filters.monsterTypes.indexOf(type);
  if (index >= 0) {
    filters.monsterTypes.splice(index, 1);
  } else {
    filters.monsterTypes.push(type);
  }
}

function toggleLinkNumber(num: number) {
  const index = filters.linkNumbers.indexOf(num);
  if (index >= 0) {
    filters.linkNumbers.splice(index, 1);
  } else {
    filters.linkNumbers.push(num);
  }
}

function clearFilters() {
  filters.cardType = null;
  filters.attributes = [];
  filters.races = [];
  filters.levels = [];
  filters.atk = { from: undefined, to: undefined };
  filters.def = { from: undefined, to: undefined };
  filters.monsterTypes = [];
  filters.linkNumbers = [];
}

function applyFilters() {
  emit('apply', { ...filters });
  emit('close');
}
</script>

<style scoped lang="scss">
.dialog-overlay {
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

.dialog {
  background: var(--bg-primary, white);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-primary, #e0e0e0);

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.filter-section {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
}

.filter-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin: 0 0 10px 0;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  &.scrollable {
    max-height: 120px;
    overflow-y: auto;
    padding-right: 4px;
  }
}

.chip {
  padding: 6px 12px;
  border: 1px solid var(--border-primary, #ddd);
  background: var(--bg-primary, white);
  color: var(--text-primary, #333);
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    border-color: var(--button-bg, #4CAF50);
  }

  &.active {
    background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
    color: white;
    border-color: transparent;
  }

  &.chip-small {
    padding: 4px 10px;
    min-width: 36px;
    text-align: center;
  }
}

.range-inputs {
  display: flex;
  gap: 16px;
}

.range-group {
  flex: 1;

  label {
    display: block;
    font-size: 12px;
    color: var(--text-secondary, #666);
    margin-bottom: 6px;
  }
}

.range-row {
  display: flex;
  align-items: center;
  gap: 8px;

  input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid var(--border-primary, #ddd);
    border-radius: 4px;
    font-size: 13px;
    background: var(--bg-primary, white);
    color: var(--text-primary, #333);
    width: 60px;

    &:focus {
      outline: none;
      border-color: var(--button-bg, #4CAF50);
    }
  }

  span {
    color: var(--text-secondary, #666);
  }
}

.dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-primary, #e0e0e0);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &.btn-clear {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
    border: 1px solid var(--border-primary, #ddd);

    &:hover {
      background: var(--bg-tertiary, #e8e8e8);
    }
  }

  &.btn-apply {
    background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
    color: white;
    min-width: 100px;

    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 217, 184, 0.3);
    }
  }
}
</style>
