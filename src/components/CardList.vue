<template>
  <div class="card-list-wrapper">
    <button
      v-if="showCollapseButton"
      class="floating-btn collapse-btn"
      @click="$emit('collapse')"
      title="縮小"
    >
      <svg width="12" height="12" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19,13H5V11H19V13Z" />
      </svg>
    </button>
    <button
      class="floating-btn scroll-top-btn"
      @click="$emit('scroll-to-top')"
      title="トップへ"
    >
      <svg width="12" height="12" viewBox="0 0 24 24">
        <path fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z" />
      </svg>
    </button>
    <div class="card-list-toolbar">
      <div class="toolbar-left">
        <div class="sort-wrapper">
          <select v-model="sortBase" class="sort-select" @change="handleSortChange">
            <option value="release">発売日</option>
            <option value="name">名前</option>
            <option value="atk">ATK</option>
            <option value="def">DEF</option>
            <option value="level">Lv/Rank</option>
            <option value="attribute">属性</option>
            <option value="race">種族</option>
          </select>
          <button class="sort-direction-btn" @click="toggleSortDirection" :title="sortDirection === 'asc' ? '昇順' : '降順'">
            <svg width="10" height="10" viewBox="0 0 24 24">
              <path v-if="sortDirection === 'asc'" fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z" />
              <path v-else fill="currentColor" d="M7.41,8.59L12,13.17L16.59,8.59L18,10L12,16L6,10L7.41,8.59Z" />
            </svg>
          </button>
          <span class="count-badge">{{ cards.length }}</span>
        </div>
      </div>
      <div class="view-switch">
        <button
          class="view-btn"
          :class="{ active: localViewMode === 'list' }"
          @click="localViewMode = 'list'"
          title="リスト表示"
        >
          <svg width="12" height="12" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3,4H21V8H3V4M3,10H21V14H3V10M3,16H21V20H3V16Z" />
          </svg>
        </button>
        <button
          class="view-btn"
          :class="{ active: localViewMode === 'grid' }"
          @click="localViewMode = 'grid'"
          title="グリッド表示"
        >
          <svg width="12" height="12" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3,3H11V11H3V3M3,13H11V21H3V13M13,3H21V11H13V3M13,13H21V21H13V13Z" />
          </svg>
        </button>
      </div>
    </div>
    <div
      :key="localSortOrder"
      class="card-list-results"
      :class="{ 'grid-view': localViewMode === 'grid' }"
      @scroll="$emit('scroll', $event)"
    >
      <div
        v-for="(item, idx) in cardsWithUuid"
        :key="item.uuid"
        class="card-result-item"
        :class="{ 'text-expanded': expandedCards.has(item.uuid) }"
      >
        <div class="card-wrapper">
          <DeckCard
            :card="item.card"
            :section-type="sectionType"
            :index="idx"
            :uuid="item.uuid"
          />
        </div>
        <div class="card-info" v-if="localViewMode === 'list'">
          <div class="card-name">{{ item.card.name }}</div>
          <div
            v-if="item.card.text || item.card.pendulumText"
            class="card-text"
            :class="{ expanded: expandedCards.has(item.uuid), clickable: true }"
            @click="toggleCardExpand(item.uuid, $event)"
          >{{ item.card.text }}<template v-if="expandedCards.has(item.uuid) && item.card.pendulumText">
------
[Pendulum]
{{ item.card.pendulumText }}</template></div>
          <div class="card-stats">
            <!-- モンスターカード -->
            <template v-if="item.card.cardType === 'monster'">
              <span class="stat-item attribute">{{ getAttributeLabel(item.card.attribute) }}</span>
              <span class="stat-item race" v-if="item.card.race">{{ getRaceLabel(item.card.race) }}</span>
              <span class="stat-item level">{{ getLevelLabel(item.card) }}</span>
              <span class="stat-item atk">ATK {{ item.card.atk ?? '?' }}</span>
              <span class="stat-item def" v-if="item.card.levelType !== 'link'">DEF {{ item.card.def ?? '?' }}</span>
              <template v-for="type in item.card.types" :key="type">
                <span class="stat-item type" v-if="type">{{ getMonsterTypeLabel(type) }}</span>
              </template>
            </template>
            <!-- 魔法カード -->
            <template v-else-if="item.card.cardType === 'spell'">
              <span class="stat-item spell-type">{{ getSpellTypeLabel(item.card.effectType) }}</span>
            </template>
            <!-- 罠カード -->
            <template v-else-if="item.card.cardType === 'trap'">
              <span class="stat-item trap-type">{{ getTrapTypeLabel(item.card.effectType) }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, computed, reactive, nextTick } from 'vue'
import DeckCard from './DeckCard.vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { useSettingsStore } from '../stores/settings'
import {
  getAttributeLabel,
  getRaceLabel,
  getMonsterTypeLabel,
  getLevelLabel,
  getSpellTypeLabel,
  getTrapTypeLabel
} from '@/utils/label-utils'

export default {
  name: 'CardList',
  components: {
    DeckCard
  },
  props: {
    cards: {
      type: Array,
      required: true
    },
    sectionType: {
      type: String,
      default: 'search'
    },
    sortOrder: {
      type: String,
      default: 'release_desc'
    },
    viewMode: {
      type: String,
      default: 'list'
    },
    uniqueId: {
      type: String,
      default: () => `list-${Math.random().toString(36).substr(2, 9)}`
    },
    showCollapseButton: {
      type: Boolean,
      default: false
    }
  },
  emits: ['sort-change', 'scroll', 'scroll-to-top', 'collapse', 'update:sortOrder', 'update:viewMode'],
  setup(props, { emit }) {
    const deckStore = useDeckEditStore()
    const settingsStore = useSettingsStore()
    const localViewMode = ref(props.viewMode)

    // 展開状態のカードUUIDセット
    const expandedCards = reactive(new Set())

    // カードごとのuuidを永続的に保持するMap
    // キー: カードオブジェクトの参照, 値: uuid文字列
    const cardUuidMap = new WeakMap()
    // 各baseKey (cardId-ciid) ごとの最大インデックスを追跡
    const maxIndexMap = reactive(new Map())

    // カードテキストの展開/折りたたみ切り替え
    const toggleCardExpand = async (uuid, event) => {
      const textElement = event.currentTarget

      if (expandedCards.has(uuid)) {
        // 折りたたみ: 実際の高さから制限された高さへ
        const currentHeight = textElement.scrollHeight
        textElement.style.maxHeight = `${currentHeight}px`

        // reflow強制
        textElement.offsetHeight

        // CSS変数の値に戻す
        textElement.style.maxHeight = null
        expandedCards.delete(uuid)
      } else {
        // 展開: まず状態を更新
        expandedCards.add(uuid)

        // DOM更新を待つ
        await nextTick()

        // 実際の高さを測定して設定
        const targetHeight = textElement.scrollHeight
        textElement.style.maxHeight = `${targetHeight}px`
      }
    }

    // sortOrderを分解してbase と direction に分ける
    const parseSortOrder = (order) => {
      if (order.endsWith('_asc')) {
        return { base: order.replace('_asc', ''), direction: 'asc' }
      } else if (order.endsWith('_desc')) {
        return { base: order.replace('_desc', ''), direction: 'desc' }
      }
      return { base: 'release', direction: 'desc' }
    }

    const initial = parseSortOrder(props.sortOrder)
    const sortBase = ref(initial.base)
    const sortDirection = ref(initial.direction)

    const localSortOrder = computed(() => `${sortBase.value}_${sortDirection.value}`)

    // ソート関数
    const sortCards = (cards, sortOrder) => {
      const sorted = [...cards]
      const getCid = (card) => parseInt(card.cardId, 10) || 0

      switch (sortOrder) {
        case 'release_desc':
          return sorted.sort((a, b) => getCid(b) - getCid(a))
        case 'release_asc':
          return sorted.sort((a, b) => getCid(a) - getCid(b))
        case 'name_asc':
          return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        case 'name_desc':
          return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
        case 'atk_desc':
          return sorted.sort((a, b) => (b.atk ?? -1) - (a.atk ?? -1))
        case 'atk_asc':
          return sorted.sort((a, b) => (a.atk ?? -1) - (b.atk ?? -1))
        case 'def_desc':
          return sorted.sort((a, b) => (b.def ?? -1) - (a.def ?? -1))
        case 'def_asc':
          return sorted.sort((a, b) => (a.def ?? -1) - (b.def ?? -1))
        case 'level_desc':
          return sorted.sort((a, b) => (b.levelValue || 0) - (a.levelValue || 0))
        case 'level_asc':
          return sorted.sort((a, b) => (a.levelValue || 0) - (b.levelValue || 0))
        case 'attribute_asc':
          return sorted.sort((a, b) => {
            const cmp = (a.attribute || '').localeCompare(b.attribute || '')
            return cmp !== 0 ? cmp : getCid(b) - getCid(a)
          })
        case 'attribute_desc':
          return sorted.sort((a, b) => {
            const cmp = (b.attribute || '').localeCompare(a.attribute || '')
            return cmp !== 0 ? cmp : getCid(b) - getCid(a)
          })
        case 'race_asc':
          return sorted.sort((a, b) => {
            const cmp = (a.race || '').localeCompare(b.race || '')
            return cmp !== 0 ? cmp : getCid(b) - getCid(a)
          })
        case 'race_desc':
          return sorted.sort((a, b) => {
            const cmp = (b.race || '').localeCompare(a.race || '')
            return cmp !== 0 ? cmp : getCid(b) - getCid(a)
          })
        default:
          return sorted
      }
    }

    // 各カードにUUIDを付与し、ソートして返す
    const cardsWithUuid = computed(() => {
      const sorted = sortCards(props.cards, localSortOrder.value)
      return sorted.map((card) => {
        // 既存のuuidがあればそれを使用
        let uuid = cardUuidMap.get(card)
        if (!uuid) {
          // 新規カードの場合、baseKeyの最大インデックス+1を付与
          const baseKey = `${card.cardId}-${card.ciid || '0'}`
          const currentMax = maxIndexMap.get(baseKey) || -1
          const newIndex = currentMax + 1
          maxIndexMap.set(baseKey, newIndex)
          uuid = `${baseKey}-${newIndex}`
          cardUuidMap.set(card, uuid)
        }
        return {
          card,
          uuid
        }
      })
    })

    watch(() => props.sortOrder, (val) => {
      const parsed = parseSortOrder(val)
      sortBase.value = parsed.base
      sortDirection.value = parsed.direction
    })

    watch(() => props.viewMode, (val) => {
      localViewMode.value = val
    })

    watch(localSortOrder, (val) => {
      emit('update:sortOrder', val)
      emit('sort-change', val)
    })

    watch(localViewMode, (val) => {
      emit('update:viewMode', val)
    })

    const handleSortChange = () => {
      // selectが変更された時、デフォルトの方向を設定
      // release, atk, def, level は desc がデフォルト
      // name, attribute, race は asc がデフォルト
      const descDefaults = ['release', 'atk', 'def', 'level']
      sortDirection.value = descDefaults.includes(sortBase.value) ? 'desc' : 'asc'
    }

    const toggleSortDirection = () => {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    }

    return {
      sortBase,
      sortDirection,
      localSortOrder,
      localViewMode,
      cardsWithUuid,
      expandedCards,
      handleSortChange,
      toggleSortDirection,
      toggleCardExpand,
      getAttributeLabel,
      getRaceLabel,
      getMonsterTypeLabel,
      getLevelLabel,
      getSpellTypeLabel,
      getTrapTypeLabel
    }
  }
}
</script>

<style scoped lang="scss">
.card-list-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
}

.collapse-btn {
  position: sticky;
  top: 4px;
  left: 4px;
  z-index: 5;
  margin: 0 0 -28px 0;
}

.scroll-top-btn {
  position: sticky;
  top: 4px;
  left: 40px;
  z-index: 5;
  margin: 0 0 -28px 0;
}

.floating-btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  padding: 0;

  &:hover {
    background: var(--bg-secondary);
    border-color: var(--border-secondary);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  svg {
    display: block;
  }
}

.card-list-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px 0;
  background: transparent;
  border-bottom: none;
  width: calc(100% - 48px);
  margin-left: 48px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.count-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  background: var(--text-secondary, #666);
  color: var(--button-text);
  font-size: 8px;
  min-width: 12px;
  height: 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;
  font-weight: 500;
}

.sort-select {
  padding: 4px 8px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 11px;
  background: var(--input-bg);
  color: var(--input-text);
  cursor: pointer;

  option {
    color: var(--text-primary);
    background: var(--bg-primary);
  }
}

.sort-direction-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  margin-left: 2px;
  border: 1px solid var(--border-primary);
  border-radius: 3px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-secondary);
    border-color: var(--border-secondary);
    color: var(--text-primary);
  }

  svg {
    display: block;
  }
}

.view-switch {
  display: flex;
  gap: 2px;
}

.view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-secondary);
    color: var(--text-secondary);
  }

  &.active {
    background: var(--button-bg);
    color: var(--button-text);
  }

  svg {
    display: block;
  }
}

.card-list-results {
  flex: 1;
  overflow-y: visible;
  overflow-x: hidden;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  animation: fadeInList 0.2s ease;

  &.grid-view {
    display: grid;
    /* グリッド表示用のCSS変数を使用 */
    grid-template-columns: repeat(auto-fill, var(--card-width-grid));
    grid-auto-rows: max-content;
    gap: 4px;
    align-content: start;
    justify-content: start;
  }
}

@keyframes fadeInList {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}

.card-result-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  background: var(--card-bg);
  cursor: move;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  /* カード高さに16px（padding上下8px×2）+ 一行分（16px）を加えた高さ */
  min-height: calc(var(--card-height-list) + 32px);
  align-items: flex-start;

  .grid-view & {
    flex-direction: column;
    min-height: auto;
    padding: 0;
    border: none;
    background: none;
    /* グリッド表示用のCSS変数を使用 */
    width: var(--card-width-grid);
  }

  &.text-expanded {
    min-height: auto;
  }
}

.card-wrapper {
  flex-shrink: 0;
  position: relative;
  /* リスト表示用のCSS変数を使用 */
  width: var(--card-width-list);

  .grid-view & {
    /* グリッド表示用のCSS変数を使用 */
    width: var(--card-width-grid);
  }
}

.card-info {
  flex: 1;
  min-width: 0;
  
  .grid-view & {
    display: none;
  }
}

.card-name {
  font-weight: bold;
  font-size: 11px;
  color: var(--text-primary);
  margin-bottom: 4px;
  word-break: break-word;
}

.card-text {
  font-size: 10px;
  color: var(--text-secondary);
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: pre-line;
  // カードの高さに連動した行数制限
  // カード高さ - 名前(15px) - stats(26px) - margins(10px) = 利用可能高さ
  // line-height 1.4 * font-size 10px = 14px per line
  max-height: calc(var(--card-height-list) - 51px);
  overflow: hidden;
  text-overflow: ellipsis;
  transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease;
  will-change: max-height;

  &.clickable {
    cursor: pointer;
    border-radius: 4px;
    padding: 4px;
    margin: -4px;
    position: relative;

    // 展開可能インジケーター（右下三角フェード）
    &:not(.expanded)::after {
      content: '';
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 40px;
      height: 40px;
      background: var(--card-bg);
      mask-image: linear-gradient(135deg,
        transparent 0%,
        transparent 40%,
        rgba(0, 0, 0, 0.3) 50%,
        rgba(0, 0, 0, 0.7) 70%,
        rgba(0, 0, 0, 1) 100%);
      -webkit-mask-image: linear-gradient(135deg,
        transparent 0%,
        transparent 40%,
        rgba(0, 0, 0, 0.3) 50%,
        rgba(0, 0, 0, 0.7) 70%,
        rgba(0, 0, 0, 1) 100%);
      pointer-events: none;
    }

    &:hover {
      background: var(--bg-secondary, #f5f5f5);

      &:not(.expanded)::after {
        background: var(--bg-secondary, #f5f5f5);
      }
    }
  }

  &.expanded {
    overflow: visible;
    background: var(--bg-secondary, #f5f5f5);
  }
}

.card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.stat-item {
  font-size: 9px;
  padding: 2px 4px;
  border-radius: 3px;
  white-space: nowrap;

  &.attribute {
    background: var(--color-info-bg);
    color: var(--color-info);
  }

  &.race {
    background: #f3e5f5;
    color: #7b1fa2;
  }

  &.type {
    background: var(--color-warning-bg);
    color: var(--color-warning);
  }

  &.level {
    background: var(--color-success-bg);
    color: var(--color-success);
  }

  &.atk, &.def {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-secondary, #666);
  }

  &.spell-type {
    background: var(--color-success-bg);
    color: var(--color-success);
  }

  &.trap-type {
    background: var(--color-error-bg);
    color: var(--color-error-text);
  }
}

</style>
