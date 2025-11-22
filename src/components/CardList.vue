<template>
  <div class="card-list-wrapper">
    <div class="floating-buttons">
      <button
        class="floating-btn"
        @click="$emit('scroll-to-top')"
        title="トップへ"
      >
        <svg width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z" />
        </svg>
      </button>
      <button
        v-if="showCollapseButton"
        class="floating-btn"
        @click="$emit('collapse')"
        title="縮小"
      >
        <svg width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19,13H5V11H19V13Z" />
        </svg>
      </button>
    </div>
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
            v-if="item.card.text || item.card.pendulumEffect"
            class="card-text"
            :class="{ expanded: expandedCards.has(item.uuid), clickable: true }"
            @click="toggleCardExpand(item.uuid)"
          >{{ item.card.text }}<template v-if="expandedCards.has(item.uuid) && item.card.pendulumEffect">
------
[Pendulum]
{{ item.card.pendulumEffect }}</template></div>
          <div class="card-stats">
            <!-- モンスターカード -->
            <template v-if="item.card.cardType === 'monster'">
              <span class="stat-item attribute">{{ getAttributeLabel(item.card.attribute) }}</span>
              <span class="stat-item race">{{ getRaceLabel(item.card.race) }}</span>
              <span class="stat-item level">{{ getLevelLabel(item.card) }}</span>
              <span class="stat-item atk">ATK {{ item.card.atk ?? '?' }}</span>
              <span class="stat-item def" v-if="item.card.levelType !== 'link'">DEF {{ item.card.def ?? '?' }}</span>
              <span class="stat-item type" v-for="type in item.card.types" :key="type">{{ getMonsterTypeLabel(type) }}</span>
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
import { ref, watch, computed, reactive } from 'vue'
import DeckCard from './DeckCard.vue'

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
    const localViewMode = ref(props.viewMode)

    // 展開状態のカードUUIDセット
    const expandedCards = reactive(new Set())

    // カードテキストの展開/折りたたみ切り替え
    const toggleCardExpand = (uuid) => {
      if (expandedCards.has(uuid)) {
        expandedCards.delete(uuid)
      } else {
        expandedCards.add(uuid)
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
      return sorted.map((card) => ({
        card,
        // cardIdとciidを組み合わせてユニークなキーを生成（検索リストでの重複対応）
        uuid: `${card.cardId}-${card.ciid || '0'}`
      }))
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

    // ラベル変換関数
    const getAttributeLabel = (attr) => {
      const labels = {
        light: '光', dark: '闇', water: '水', fire: '炎',
        earth: '地', wind: '風', divine: '神'
      }
      return labels[attr] || attr
    }

    const getRaceLabel = (race) => {
      const labels = {
        dragon: '龍', spellcaster: '魔法', warrior: '戦士', machine: '機械',
        fiend: '悪魔', fairy: '天使', zombie: '不死', beast: '獣',
        beastwarrior: '獣戦', plant: '植物', insect: '昆虫', aqua: '水',
        fish: '魚', seaserpent: '海竜', reptile: '爬虫', dinosaur: '恐竜',
        windbeast: '鳥獣', rock: '岩石', pyro: '炎', thunder: '雷',
        psychic: '念動', wyrm: '幻竜', cyberse: '電脳', illusion: '幻想',
        divine: '神獣', creatorgod: '創造'
      }
      return labels[race] || race
    }

    const getMonsterTypeLabel = (type) => {
      const labels = {
        normal: '通常', effect: '効果', fusion: '融合', ritual: '儀式',
        synchro: 'シンクロ', xyz: 'エクシーズ', pendulum: 'ペンデュラム', link: 'リンク',
        tuner: 'チューナー', flip: 'リバース', toon: 'トゥーン', spirit: 'スピリット',
        union: 'ユニオン', gemini: 'デュアル', special: '特殊召喚'
      }
      return labels[type] || type
    }

    const getLevelLabel = (card) => {
      const value = card.levelValue
      switch (card.levelType) {
        case 'level': return `Lv.${value}`
        case 'rank': return `Rank ${value}`
        case 'link': return `LINK-${value}`
        default: return `Lv.${value}`
      }
    }

    const getSpellTypeLabel = (effectType) => {
      const labels = {
        normal: '通常魔法', continuous: '永続魔法', equip: '装備魔法',
        quickplay: '速攻魔法', field: 'フィールド魔法', ritual: '儀式魔法'
      }
      return labels[effectType] || '魔法'
    }

    const getTrapTypeLabel = (effectType) => {
      const labels = {
        normal: '通常罠', continuous: '永続罠', counter: 'カウンター罠'
      }
      return labels[effectType] || '罠'
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

.floating-buttons {
  position: sticky;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: row;
  gap: 4px;
  z-index: 20;
  margin: 0 0 -28px 8px;
  width: 52px;
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
  color: white;
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
  transition: all 0.2s ease;

  &.clickable {
    cursor: pointer;
    border-radius: 4px;
    padding: 4px;
    margin: -4px;

    &:hover {
      background: var(--bg-secondary, #f5f5f5);
    }
  }

  &.expanded {
    max-height: none;
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
    background: #e3f2fd;
    color: #1565c0;
  }

  &.race {
    background: #f3e5f5;
    color: #7b1fa2;
  }

  &.type {
    background: #fff3e0;
    color: #e65100;
  }

  &.level {
    background: #e8f5e9;
    color: #2e7d32;
  }

  &.atk, &.def {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-secondary, #666);
  }

  &.spell-type {
    background: #e8f5e9;
    color: #2e7d32;
  }

  &.trap-type {
    background: #ffebee;
    color: #c62828;
  }
}

</style>
