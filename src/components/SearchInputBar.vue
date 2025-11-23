<template>
  <div class="search-input-wrapper">
    <div class="search-input-bar" :class="{ compact: compact }">
      <button class="menu-btn" :class="{ active: hasActiveFilters }" @click.stop="showFilterDialog = true" title="フィルター">
        <span class="menu-icon">...</span>
        <span v-if="filterCount > 0" class="filter-count-badge">{{ filterCount }}</span>
      </button>
      <button class="search-mode-btn" @click.stop="showSearchModeDropdown = !showSearchModeDropdown">
        <span class="mode-icon">▼</span>
        <span class="mode-text">{{ searchModeLabel }}</span>
      </button>
      <div v-if="showSearchModeDropdown" class="mode-dropdown-overlay" @click="showSearchModeDropdown = false"></div>
      <Transition name="dropdown">
        <div v-if="showSearchModeDropdown" class="mode-dropdown">
          <div class="mode-option" @click="selectSearchMode('name')">カード名で検索</div>
          <div class="mode-option" @click="selectSearchMode('text')">テキストで検索</div>
          <div class="mode-option" @click="selectSearchMode('pendulum')">ペンデュラムテキストで検索</div>
        </div>
      </Transition>
      <button class="search-btn" @click="handleSearch">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
        </svg>
      </button>
      <div class="input-container" :class="{ 'command-mode': isCommandMode || pendingCommand }">
        <!-- 適用済みフィルターチップ -->
        <div v-if="filterChips.length > 0" class="filter-chips">
          <span
            v-for="(chip, index) in filterChips"
            :key="index"
            class="filter-chip"
            @click="removeFilterChip(index)"
          >
            {{ chip.label }}
            <span class="chip-remove">x</span>
          </span>
        </div>
        <!-- コマンドモード表示 -->
        <span v-if="pendingCommand" class="command-prefix">{{ pendingCommand.command }}</span>
        <input
          ref="inputRef"
          v-model="deckStore.searchQuery"
          type="text"
          class="search-input"
          :class="{
            'has-prefix': pendingCommand,
            'valid-input': isValidCommandInput
          }"
          :placeholder="currentPlaceholder"
          @input="handleInput"
          @keyup.enter="handleSearch"
          @keydown.escape="handleEscape(); $emit('escape')"
          @keydown="handleKeydown"
        >
      </div>
      <!-- フィルター条件表示（二行均等配置） -->
      <div v-if="hasActiveFilters" class="filter-icons">
        <div class="filter-row">
          <span
            v-for="(icon, index) in filterIconsRow1"
            :key="'r1-' + index"
            class="filter-icon-item"
            :class="icon.type"
          >{{ icon.label }}</span>
        </div>
        <div v-if="filterIconsRow2.length > 0" class="filter-row">
          <span
            v-for="(icon, index) in filterIconsRow2"
            :key="'r2-' + index"
            class="filter-icon-item"
            :class="icon.type"
          >{{ icon.label }}</span>
          <span v-if="displayFilterIcons.length > maxVisibleIcons" class="filter-more">+</span>
        </div>
        <span v-if="filterIconsRow2.length === 0 && displayFilterIcons.length > maxVisibleIcons" class="filter-more">+</span>
      </div>

      <button
        v-if="deckStore.searchQuery"
        class="clear-btn"
        @click="deckStore.searchQuery = ''"
      >x</button>

      <SearchFilterDialog
        :is-visible="showFilterDialog"
        :initial-filters="searchFilters"
        @close="showFilterDialog = false"
        @apply="handleFilterApply"
      />
    </div>

  </div>
</template>

<script lang="ts">
import { ref, computed, nextTick, defineComponent, onMounted, onUnmounted } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { searchCards, SearchOptions, SORT_ORDER_TO_API_VALUE } from '../api/card-search'
import SearchFilterDialog from './SearchFilterDialog.vue'

interface SearchFilters {
  cardType: string | null
  attributes: string[]
  races: string[]
  levels: number[]
  atk: { from: number | undefined; to: number | undefined }
  def: { from: number | undefined; to: number | undefined }
  monsterTypes: string[]
  linkNumbers: number[]
}

// コマンド定義
const COMMANDS: Record<string, { filterType: string; description: string }> = {
  '/attr': { filterType: 'attributes', description: '属性' },
  '/race': { filterType: 'races', description: '種族' },
  '/level': { filterType: 'levels', description: 'レベル/ランク' },
  '/atk': { filterType: 'atk', description: 'ATK' },
  '/def': { filterType: 'def', description: 'DEF' },
  '/type': { filterType: 'cardType', description: 'カードタイプ' },
  '/link': { filterType: 'linkNumbers', description: 'リンク数' },
  '/mtype': { filterType: 'monsterTypes', description: 'モンスタータイプ' }
}

// 属性マッピング（日本語/英語 -> APIキー）
const ATTRIBUTE_MAP: Record<string, string> = {
  '光': 'light', 'light': 'light',
  '闇': 'dark', 'dark': 'dark',
  '炎': 'fire', 'fire': 'fire',
  '水': 'water', 'water': 'water',
  '風': 'wind', 'wind': 'wind',
  '地': 'earth', 'earth': 'earth',
  '神': 'divine', 'divine': 'divine'
}

// カードタイプマッピング
const CARD_TYPE_MAP: Record<string, string> = {
  'モンスター': 'monster', 'monster': 'monster', 'm': 'monster',
  '魔法': 'spell', 'spell': 'spell', 's': 'spell',
  '罠': 'trap', 'trap': 'trap', 't': 'trap'
}

// モンスタータイプマッピング
const MONSTER_TYPE_MAP: Record<string, string> = {
  '通常': 'normal', 'normal': 'normal',
  '効果': 'effect', 'effect': 'effect',
  'チューナー': 'tuner', 'tuner': 'tuner',
  'スピリット': 'spirit', 'spirit': 'spirit',
  'ユニオン': 'union', 'union': 'union',
  'デュアル': 'dual', 'dual': 'dual',
  'リバース': 'reverse', 'reverse': 'reverse',
  'トゥーン': 'toon', 'toon': 'toon',
  '特殊召喚': 'special', 'special': 'special',
  'ペンデュラム': 'pendulum', 'pendulum': 'pendulum',
  '儀式': 'ritual', 'ritual': 'ritual',
  '融合': 'fusion', 'fusion': 'fusion',
  'シンクロ': 'synchro', 'synchro': 'synchro',
  'エクシーズ': 'xyz', 'xyz': 'xyz',
  'リンク': 'link', 'link': 'link'
}

export default defineComponent({
  name: 'SearchInputBar',
  components: {
    SearchFilterDialog
  },
  props: {
    compact: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: 'カード名を検索...'
    },
    autoFocus: {
      type: Boolean,
      default: false
    }
  },
  emits: ['escape'],
  setup(props, { expose }) {
    const deckStore = useDeckEditStore()
    const inputRef = ref<HTMLInputElement | null>(null)
    const searchMode = ref('name')
    const showSearchModeDropdown = ref(false)
    const showFilterDialog = ref(false)
    const searchFilters = ref<SearchFilters>({
      cardType: null,
      attributes: [],
      races: [],
      levels: [],
      atk: { from: undefined, to: undefined },
      def: { from: undefined, to: undefined },
      monsterTypes: [],
      linkNumbers: []
    })

    // チップベースフィルターシステム
    interface FilterChip {
      type: string
      value: string
      label: string
    }

    interface PendingCommand {
      command: string
      filterType: string
    }

    const filterChips = ref<FilterChip[]>([])
    const pendingCommand = ref<PendingCommand | null>(null)

    const searchModeLabel = computed(() => {
      switch (searchMode.value) {
        case 'name': return 'name'
        case 'text': return 'text'
        case 'pendulum': return 'pend'
        default: return 'name'
      }
    })

    const hasActiveFilters = computed(() => {
      const f = searchFilters.value
      return f.cardType !== null ||
        f.attributes.length > 0 ||
        f.races.length > 0 ||
        f.levels.length > 0 ||
        f.atk.from !== undefined ||
        f.atk.to !== undefined ||
        f.def.from !== undefined ||
        f.def.to !== undefined ||
        f.monsterTypes.length > 0 ||
        f.linkNumbers.length > 0
    })

    const filterCount = computed(() => {
      const f = searchFilters.value
      let count = 0
      if (f.cardType) count++
      count += f.attributes.length
      count += f.races.length
      count += f.levels.length
      if (f.atk.from !== undefined || f.atk.to !== undefined) count++
      if (f.def.from !== undefined || f.def.to !== undefined) count++
      count += f.monsterTypes.length
      count += f.linkNumbers.length
      return count
    })

    // レベル/リンク数を統合表示するヘルパー関数
    const formatNumberRange = (numbers: number[], prefix: string): string => {
      if (numbers.length === 0) return ''
      const sorted = [...numbers].sort((a, b) => a - b)

      // 連続した数値をグループ化
      const groups: number[][] = []
      let currentGroup: number[] = [sorted[0]]

      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
          currentGroup.push(sorted[i])
        } else {
          groups.push(currentGroup)
          currentGroup = [sorted[i]]
        }
      }
      groups.push(currentGroup)

      // グループを文字列に変換
      const parts = groups.map(group => {
        if (group.length >= 3) {
          return `${group[0]}-${group[group.length - 1]}`
        } else {
          return group.join(',')
        }
      })

      return `${prefix}${parts.join(',')}`
    }

    // 表示用フィルターアイコン - 画面サイズに応じて表示
    const displayFilterIcons = computed(() => {
      const icons: { type: string; label: string }[] = []
      const f = searchFilters.value

      // カードタイプ
      if (f.cardType) {
        const typeLabels: Record<string, string> = { monster: 'M', spell: '魔', trap: '罠' }
        icons.push({ type: 'cardType', label: typeLabels[f.cardType] || f.cardType })
      }

      // 属性
      const attrLabels: Record<string, string> = { light: '光', dark: '闇', water: '水', fire: '炎', earth: '地', wind: '風', divine: '神' }
      f.attributes.forEach(attr => {
        icons.push({ type: 'attr', label: attrLabels[attr] || attr })
      })

      // 種族（短縮表示）
      const raceLabels: Record<string, string> = {
        dragon: '龍', spellcaster: '魔', warrior: '戦', machine: '機', fiend: '悪', fairy: '天',
        zombie: '死', beast: '獣', beastwarrior: '獣戦', plant: '植', insect: '昆', aqua: '水',
        fish: '魚', seaserpent: '海', reptile: '爬', dinosaur: '恐', windbeast: '鳥', rock: '岩',
        pyro: '炎', thunder: '雷', psychic: '念', wyrm: '幻', cyberse: '電', illusion: '幻想',
        divine: '神', creatorgod: '創'
      }
      f.races.forEach(race => {
        icons.push({ type: 'race', label: raceLabels[race] || race.slice(0, 1) })
      })

      // レベル（統合表示）
      if (f.levels.length > 0) {
        icons.push({ type: 'level', label: formatNumberRange(f.levels, '★') })
      }

      // ATK/DEF
      if (f.atk.from !== undefined || f.atk.to !== undefined) {
        icons.push({ type: 'atk', label: 'ATK' })
      }
      if (f.def.from !== undefined || f.def.to !== undefined) {
        icons.push({ type: 'def', label: 'DEF' })
      }

      // モンスタータイプ
      const monsterTypeLabels: Record<string, string> = {
        normal: '通', effect: '効', fusion: '融', ritual: '儀', synchro: 'S', xyz: 'X',
        pendulum: 'P', link: 'L', tuner: 'T', flip: 'R', toon: 'ト', spirit: 'ス',
        union: 'U', gemini: 'D', special: '特'
      }
      f.monsterTypes.forEach(mtype => {
        icons.push({ type: 'monsterType', label: monsterTypeLabels[mtype] || mtype.slice(0, 1) })
      })

      // リンク数（統合表示）
      if (f.linkNumbers.length > 0) {
        icons.push({ type: 'link', label: formatNumberRange(f.linkNumbers, 'L') })
      }

      return icons
    })

    // 画面幅に応じた一行あたりの表示数
    // 実際の幅はCSSで制御、ここでは目安を設定
    const iconsPerRow = ref(4) // デフォルト値

    // 画面幅を監視して一行あたりの表示数を更新
    const updateIconsPerRow = () => {
      const width = window.innerWidth
      if (width >= 500) {
        iconsPerRow.value = 6
      } else if (width >= 400) {
        iconsPerRow.value = 5
      } else {
        iconsPerRow.value = 4
      }
    }

    // マウント時とリサイズ時に更新
    onMounted(() => {
      updateIconsPerRow()
      window.addEventListener('resize', updateIconsPerRow)
    })
    onUnmounted(() => {
      window.removeEventListener('resize', updateIconsPerRow)
    })

    // 最大表示数（二行分）
    const maxVisibleIcons = computed(() => iconsPerRow.value * 2)

    // 一行目（一行分をフル表示）
    const filterIconsRow1 = computed(() => {
      return displayFilterIcons.value.slice(0, iconsPerRow.value)
    })

    // 二行目（残りを表示）
    const filterIconsRow2 = computed(() => {
      return displayFilterIcons.value.slice(iconsPerRow.value, maxVisibleIcons.value)
    })

    // コマンドモードの検出
    const commandMatch = computed(() => {
      const query = deckStore.searchQuery
      if (!query.startsWith('/')) return null

      // コマンド + スペースのパターンを検索
      for (const cmd of Object.keys(COMMANDS)) {
        if (query.startsWith(cmd + ' ')) {
          return {
            command: cmd,
            value: query.substring(cmd.length + 1)
          }
        }
      }
      return null
    })

    const isCommandMode = computed(() => commandMatch.value !== null)
    const commandPrefix = computed(() => commandMatch.value?.command || '')

    // 現在の入力が有効かどうかを判定
    const isValidCommandInput = computed(() => {
      if (!pendingCommand.value) return false
      const value = deckStore.searchQuery.trim().toLowerCase()
      if (!value) return false

      switch (pendingCommand.value.filterType) {
        case 'attributes':
          return ATTRIBUTE_MAP[value] !== undefined
        case 'cardType':
          return CARD_TYPE_MAP[value] !== undefined
        case 'monsterTypes':
          return MONSTER_TYPE_MAP[value] !== undefined
        case 'levels':
          const level = parseInt(value)
          return !isNaN(level) && level >= 1 && level <= 12
        case 'linkNumbers':
          const link = parseInt(value)
          return !isNaN(link) && link >= 1 && link <= 6
        case 'atk':
        case 'def':
          // 数値または範囲形式（1000-2000）
          return /^\d+(-\d+)?$/.test(value)
        case 'races':
          // 種族は何でも受け入れる（後で検証）
          return value.length > 0
        default:
          return false
      }
    })

    // 動的プレースホルダー
    const currentPlaceholder = computed(() => {
      if (pendingCommand.value) {
        const cmd = COMMANDS[pendingCommand.value.command]
        if (cmd) {
          return `${cmd.description}を入力...`
        }
      }
      return props.placeholder
    })

    // チップのラベルを取得
    const getChipLabel = (type: string, value: string): string => {
      switch (type) {
        case 'attributes': {
          const labels: Record<string, string> = { light: '光', dark: '闇', water: '水', fire: '炎', earth: '地', wind: '風', divine: '神' }
          return labels[value] || value
        }
        case 'cardType': {
          const labels: Record<string, string> = { monster: 'M', spell: '魔', trap: '罠' }
          return labels[value] || value
        }
        case 'monsterTypes': {
          const labels: Record<string, string> = {
            normal: '通', effect: '効', fusion: '融', ritual: '儀', synchro: 'S', xyz: 'X',
            pendulum: 'P', link: 'L', tuner: 'T', flip: 'R', toon: 'ト', spirit: 'ス',
            union: 'U', gemini: 'D', special: '特'
          }
          return labels[value] || value
        }
        case 'levels':
          return `Lv${value}`
        case 'linkNumbers':
          return `L${value}`
        case 'atk':
          return `ATK:${value}`
        case 'def':
          return `DEF:${value}`
        case 'races':
          return value
        default:
          return value
      }
    }

    // 入力ハンドラ
    const handleInput = () => {
      const query = deckStore.searchQuery

      // ペンディングコマンドがある場合は値入力モード
      if (pendingCommand.value) {
        return
      }

      // コマンドパターンを検出：/cmd + スペース
      for (const cmd of Object.keys(COMMANDS)) {
        if (query === cmd + ' ') {
          // コマンド + スペースで値入力モードに移行
          pendingCommand.value = {
            command: cmd,
            filterType: COMMANDS[cmd].filterType
          }
          deckStore.searchQuery = ''
          return
        }
      }
    }

    // キー入力ハンドラ
    const handleKeydown = (event: KeyboardEvent) => {
      // Spaceキーで有効な入力をチップに変換
      if (event.key === ' ' && pendingCommand.value && isValidCommandInput.value) {
        event.preventDefault()
        addFilterChip()
        return
      }

      // Backspaceで空の入力時にチップを削除
      if (event.key === 'Backspace') {
        if (deckStore.searchQuery === '' && pendingCommand.value) {
          // ペンディングコマンドをキャンセル
          event.preventDefault()
          pendingCommand.value = null
          return
        }
        if (deckStore.searchQuery === '' && !pendingCommand.value && filterChips.value.length > 0) {
          // 最後のチップを削除
          event.preventDefault()
          removeFilterChip(filterChips.value.length - 1)
          return
        }
      }
    }

    // フィルターチップを追加
    const addFilterChip = () => {
      if (!pendingCommand.value) return

      const value = deckStore.searchQuery.trim().toLowerCase()
      if (!value) return

      const filterType = pendingCommand.value.filterType
      let mappedValue = value

      // 値をマッピング
      switch (filterType) {
        case 'attributes':
          mappedValue = ATTRIBUTE_MAP[value] || value
          break
        case 'cardType':
          mappedValue = CARD_TYPE_MAP[value] || value
          break
        case 'monsterTypes':
          mappedValue = MONSTER_TYPE_MAP[value] || value
          break
      }

      // チップを追加
      filterChips.value.push({
        type: filterType,
        value: mappedValue,
        label: getChipLabel(filterType, mappedValue)
      })

      // 実際のフィルターにも適用
      applyChipToFilters(filterType, mappedValue)

      // 入力をクリア
      deckStore.searchQuery = ''
      pendingCommand.value = null
    }

    // チップをフィルターに適用
    const applyChipToFilters = (type: string, value: string) => {
      const f = searchFilters.value

      switch (type) {
        case 'attributes':
          if (!f.attributes.includes(value)) {
            f.attributes.push(value)
          }
          break
        case 'races':
          if (!f.races.includes(value)) {
            f.races.push(value)
          }
          break
        case 'levels': {
          const level = parseInt(value)
          if (!isNaN(level) && !f.levels.includes(level)) {
            f.levels.push(level)
          }
          break
        }
        case 'atk': {
          const parts = value.split('-')
          if (parts.length === 2) {
            const from = parts[0] ? parseInt(parts[0]) : undefined
            const to = parts[1] ? parseInt(parts[1]) : undefined
            if (!isNaN(from as number)) f.atk.from = from
            if (!isNaN(to as number)) f.atk.to = to
          } else {
            const val = parseInt(value)
            if (!isNaN(val)) {
              f.atk.from = val
              f.atk.to = val
            }
          }
          break
        }
        case 'def': {
          const parts = value.split('-')
          if (parts.length === 2) {
            const from = parts[0] ? parseInt(parts[0]) : undefined
            const to = parts[1] ? parseInt(parts[1]) : undefined
            if (!isNaN(from as number)) f.def.from = from
            if (!isNaN(to as number)) f.def.to = to
          } else {
            const val = parseInt(value)
            if (!isNaN(val)) {
              f.def.from = val
              f.def.to = val
            }
          }
          break
        }
        case 'cardType':
          f.cardType = value
          break
        case 'linkNumbers': {
          const link = parseInt(value)
          if (!isNaN(link) && !f.linkNumbers.includes(link)) {
            f.linkNumbers.push(link)
          }
          break
        }
        case 'monsterTypes':
          if (!f.monsterTypes.includes(value)) {
            f.monsterTypes.push(value)
          }
          break
      }
    }

    // チップを削除
    const removeFilterChip = (index: number) => {
      const chip = filterChips.value[index]
      if (!chip) return

      // フィルターから削除
      removeChipFromFilters(chip.type, chip.value)

      // チップ配列から削除
      filterChips.value.splice(index, 1)
    }

    // チップをフィルターから削除
    const removeChipFromFilters = (type: string, value: string) => {
      const f = searchFilters.value

      switch (type) {
        case 'attributes': {
          const idx = f.attributes.indexOf(value)
          if (idx !== -1) f.attributes.splice(idx, 1)
          break
        }
        case 'races': {
          const idx = f.races.indexOf(value)
          if (idx !== -1) f.races.splice(idx, 1)
          break
        }
        case 'levels': {
          const level = parseInt(value)
          const idx = f.levels.indexOf(level)
          if (idx !== -1) f.levels.splice(idx, 1)
          break
        }
        case 'atk':
          f.atk = { from: undefined, to: undefined }
          break
        case 'def':
          f.def = { from: undefined, to: undefined }
          break
        case 'cardType':
          f.cardType = null
          break
        case 'linkNumbers': {
          const link = parseInt(value)
          const idx = f.linkNumbers.indexOf(link)
          if (idx !== -1) f.linkNumbers.splice(idx, 1)
          break
        }
        case 'monsterTypes': {
          const idx = f.monsterTypes.indexOf(value)
          if (idx !== -1) f.monsterTypes.splice(idx, 1)
          break
        }
      }
    }

    // エスケープハンドラ
    const handleEscape = () => {
      if (pendingCommand.value) {
        pendingCommand.value = null
        deckStore.searchQuery = ''
      }
      // 常に親コンポーネントに伝播（emit('escape')はテンプレートで処理）
    }

    // コマンドからフィルタを適用
    const applyCommandFilter = () => {
      const match = commandMatch.value
      if (!match) return

      const cmd = COMMANDS[match.command]
      if (!cmd) return

      const value = match.value.trim().toLowerCase()
      if (!value) return

      const f = searchFilters.value

      switch (cmd.filterType) {
        case 'attributes': {
          const attr = ATTRIBUTE_MAP[value]
          if (attr && !f.attributes.includes(attr)) {
            f.attributes.push(attr)
          }
          break
        }
        case 'races': {
          // 種族は部分一致で検索（TODO: 種族マッピングを追加）
          // 型安全のためにstringとしてキャスト
          const raceValue = value as string
          if (raceValue && !f.races.includes(raceValue)) {
            f.races.push(raceValue)
          }
          break
        }
        case 'levels': {
          const level = parseInt(value)
          if (!isNaN(level) && level >= 1 && level <= 12 && !f.levels.includes(level)) {
            f.levels.push(level)
          }
          break
        }
        case 'atk': {
          // ATK:1000-2000 または ATK:1000 形式
          const parts = value.split('-')
          if (parts.length === 2) {
            const from = parts[0] ? parseInt(parts[0]) : undefined
            const to = parts[1] ? parseInt(parts[1]) : undefined
            if (!isNaN(from as number)) f.atk.from = from
            if (!isNaN(to as number)) f.atk.to = to
          } else if (parts.length === 1) {
            const val = parseInt(parts[0])
            if (!isNaN(val)) {
              f.atk.from = val
              f.atk.to = val
            }
          }
          break
        }
        case 'def': {
          const parts = value.split('-')
          if (parts.length === 2) {
            const from = parts[0] ? parseInt(parts[0]) : undefined
            const to = parts[1] ? parseInt(parts[1]) : undefined
            if (!isNaN(from as number)) f.def.from = from
            if (!isNaN(to as number)) f.def.to = to
          } else if (parts.length === 1) {
            const val = parseInt(parts[0])
            if (!isNaN(val)) {
              f.def.from = val
              f.def.to = val
            }
          }
          break
        }
        case 'cardType': {
          const type = CARD_TYPE_MAP[value]
          if (type) {
            f.cardType = type
          }
          break
        }
        case 'linkNumbers': {
          const link = parseInt(value)
          if (!isNaN(link) && link >= 1 && link <= 6 && !f.linkNumbers.includes(link)) {
            f.linkNumbers.push(link)
          }
          break
        }
        case 'monsterTypes': {
          const mtype = MONSTER_TYPE_MAP[value]
          if (mtype && !f.monsterTypes.includes(mtype)) {
            f.monsterTypes.push(mtype)
          }
          break
        }
      }

      // コマンドをクリアして検索クエリを空に
      deckStore.searchQuery = ''
    }

    const selectSearchMode = (mode: string) => {
      searchMode.value = mode
      showSearchModeDropdown.value = false
    }

    const handleFilterApply = (filters: typeof searchFilters.value) => {
      searchFilters.value = filters
      if (deckStore.searchQuery.trim()) {
        handleSearch()
      }
    }

    const handleSearch = async () => {
      // コマンドモードの場合はフィルタを適用
      if (isCommandMode.value) {
        applyCommandFilter()
        // フィルタ適用後に検索を実行
        if (hasActiveFilters.value) {
          // 検索クエリがクリアされているので、フィルタのみで検索
        } else {
          return
        }
      }

      if (!deckStore.searchQuery.trim() && !hasActiveFilters.value) {
        deckStore.searchResults = []
        deckStore.allResults = []
        deckStore.hasMore = false
        deckStore.currentPage = 0
        return
      }

      deckStore.activeTab = 'search'
      deckStore.isLoading = true

      const searchTypeMap: Record<string, string> = {
        'name': '1',
        'text': '2',
        'pendulum': '3'
      }
      const searchType = searchTypeMap[searchMode.value] || '1'

      try {
        const apiSort = SORT_ORDER_TO_API_VALUE[deckStore.sortOrder] || 1

        const searchOptions: SearchOptions = {
          keyword: deckStore.searchQuery.trim(),
          searchType: searchType as '1' | '2' | '3' | '4',
          resultsPerPage: 100,
          sort: apiSort
        }

        const f = searchFilters.value
        if (f.cardType) searchOptions.cardType = f.cardType as SearchOptions['cardType']
        if (f.attributes.length > 0) searchOptions.attributes = f.attributes as SearchOptions['attributes']
        if (f.races.length > 0) searchOptions.races = f.races as SearchOptions['races']
        if (f.levels.length > 0) searchOptions.levels = f.levels
        if (f.atk.from !== undefined || f.atk.to !== undefined) searchOptions.atk = f.atk
        if (f.def.from !== undefined || f.def.to !== undefined) searchOptions.def = f.def
        if (f.monsterTypes.length > 0) searchOptions.monsterTypes = f.monsterTypes as SearchOptions['monsterTypes']
        if (f.linkNumbers.length > 0) searchOptions.linkNumbers = f.linkNumbers

        const results = await searchCards(searchOptions)

        // 検索結果をstore用の形式に変換
        deckStore.searchResults = results as unknown as typeof deckStore.searchResults
        deckStore.allResults = results as unknown as typeof deckStore.allResults

        if (results.length >= 100) {
          deckStore.hasMore = true
          setTimeout(async () => {
            try {
              const moreResults = await searchCards({
                ...searchOptions,
                resultsPerPage: 2000
              })
              if (moreResults.length > 100) {
                deckStore.searchResults = moreResults as unknown as typeof deckStore.searchResults
                deckStore.allResults = moreResults as unknown as typeof deckStore.allResults
                deckStore.hasMore = moreResults.length >= 2000
                deckStore.currentPage = 1
              } else {
                deckStore.hasMore = false
              }
            } catch (error) {
              console.error('Extended search error:', error)
              deckStore.hasMore = false
            }
          }, 1000)
        } else {
          deckStore.hasMore = false
        }
      } catch (error) {
        console.error('Search error:', error)
        deckStore.searchResults = []
        deckStore.allResults = []
        deckStore.hasMore = false
      } finally {
        deckStore.isLoading = false
        deckStore.isGlobalSearchMode = false
      }
    }

    const focus = () => {
      nextTick(() => {
        if (inputRef.value) {
          inputRef.value.focus()
        }
      })
    }

    // autoFocusがtrueの場合、マウント時にフォーカス
    if (props.autoFocus) {
      focus()
    }

    expose({ focus, inputRef })

    return {
      deckStore,
      inputRef,
      searchMode,
      searchModeLabel,
      showSearchModeDropdown,
      showFilterDialog,
      searchFilters,
      hasActiveFilters,
      filterCount,
      displayFilterIcons,
      filterIconsRow1,
      filterIconsRow2,
      maxVisibleIcons,
      isCommandMode,
      commandPrefix,
      filterChips,
      pendingCommand,
      isValidCommandInput,
      currentPlaceholder,
      selectSearchMode,
      handleFilterApply,
      handleSearch,
      handleInput,
      handleKeydown,
      handleEscape,
      removeFilterChip
    }
  }
})
</script>

<style lang="scss" scoped>
.search-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

/* フィルターアイコンスタイル - 二行均等配置 */
.filter-icons {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-right: 4px;
  flex-shrink: 1;
  min-width: 0;
  max-width: 80px;
}

.filter-row {
  display: flex;
  gap: 2px;
  overflow: hidden;
}

/* 画面サイズに応じて表示幅を調整 */
@media (min-width: 400px) {
  .filter-icons {
    max-width: 120px;
  }
}

@media (min-width: 500px) {
  .filter-icons {
    max-width: 160px;
  }
}

.filter-icon-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 3px;
  font-size: 8px;
  font-weight: 500;
  border-radius: 2px;
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-primary, #ddd);
  white-space: nowrap;
  max-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  line-height: 1;
  height: 10px;
}

.filter-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 10px;
  font-size: 8px;
  font-weight: 600;
  border-radius: 2px;
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-primary, #ddd);
  flex-shrink: 0;
}

.input-container {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  position: relative;

  &.command-mode {
    background: rgba(0, 217, 184, 0.1);
    border-radius: 4px;
    padding: 2px 4px;
    margin: 0 4px;
  }
}

/* フィルターチップ */
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-right: 4px;
  max-width: 50%;
  overflow: hidden;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  background: var(--theme-color-start, #00d9b8);
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--theme-color-end, #00b894);
  }

  .chip-remove {
    font-size: 10px;
    opacity: 0.7;
    margin-left: 2px;

    &:hover {
      opacity: 1;
    }
  }
}

/* 有効入力の視覚フィードバック */
.search-input.valid-input {
  color: var(--theme-color-start, #00d9b8);
  font-weight: 600;
}

.command-prefix {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  margin-right: 4px;
  background: var(--theme-color-start, #00d9b8);
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
  font-weight: bold;
  white-space: nowrap;
}

.search-input-bar {
  display: flex;
  align-items: center;
  position: relative;
  background: white;
  border: 2px solid transparent;
  border-radius: 20px;
  padding: 0 10px;
  height: 44px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover,
  &:focus-within {
    border-color: var(--theme-color-start, #00d9b8);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  &.compact {
    height: 28px;
    border-radius: 4px;
    padding: 4px 8px;
    box-shadow: none;
    border-color: var(--border-primary, #ddd);

    &:hover,
    &:focus-within {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .search-input {
      font-size: 13px;
      padding: 4px 6px;
    }

    .menu-btn {
      padding: 4px 6px;
      font-size: 14px;
    }

    .search-mode-btn {
      padding: 2px 6px;
      min-width: 36px;

      .mode-icon {
        font-size: 8px;
      }

      .mode-text {
        font-size: 10px;
      }
    }

    .search-btn {
      padding: 4px;

      svg {
        width: 12px;
        height: 12px;
      }
    }

    .clear-btn {
      padding: 0 4px;
      font-size: 16px;
    }

    .mode-dropdown {
      top: 100%;
      bottom: auto;
      margin-top: 2px;
      margin-bottom: 0;
    }
  }
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  padding: 8px;
  background: transparent;
  color: var(--text-primary, #333);
  height: 100%;
  line-height: 1.5;
  min-width: 80px;

  &::placeholder {
    color: var(--text-tertiary, #999);
  }
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  &.active {
    color: var(--theme-color-start, #00d9b8);
  }

  .menu-icon {
    font-size: 16px;
    font-weight: bold;
    line-height: 1;
  }
}

.filter-count-badge {
  position: absolute;
  top: -2px;
  right: -4px;
  min-width: 12px;
  height: 12px;
  padding: 0 2px;
  font-size: 8px;
  font-weight: 600;
  line-height: 12px;
  text-align: center;
  background: var(--text-secondary, #666);
  color: white;
  border-radius: 6px;
}

.search-mode-btn {
  background: transparent;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: var(--text-secondary, #666);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 48px;
  min-width: 48px;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary);
  }

  .mode-icon {
    font-size: 10px;
    line-height: 1;
  }

  .mode-text {
    font-size: 8px;
    line-height: 1;
    color: var(--text-tertiary, #999);
  }
}

.mode-dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
}

.mode-dropdown {
  position: absolute;
  bottom: 100%;
  left: 40px;
  background: white;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  margin-bottom: 4px;
  z-index: 101;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 160px;
}

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

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.mode-option {
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
  color: var(--text-primary, #333);

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  &:first-child {
    border-radius: 8px 8px 0 0;
  }

  &:last-child {
    border-radius: 0 0 8px 8px;
  }
}

.search-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  svg {
    display: block;
  }
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--text-tertiary, #999);
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }
}
</style>
