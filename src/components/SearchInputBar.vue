<template>
  <div class="search-input-wrapper">
    <div class="search-input-bar" :class="{ compact: compact }">
      <div class="left-buttons">
        <button class="menu-btn" :class="{ active: hasActiveFilters }" @click.stop="showFilterDialog = true" title="フィルター">
          <span class="menu-icon">...</span>
          <span v-if="filterCount > 0" class="filter-count-badge">{{ filterCount }}</span>
        </button>
        <button class="search-mode-btn" @click.stop="showSearchModeDropdown = !showSearchModeDropdown">
          <span class="mode-text">{{ searchModeLabel }}</span>
        </button>
      </div>
      <div v-if="showSearchModeDropdown" class="mode-dropdown-overlay" @click="showSearchModeDropdown = false"></div>
      <Transition name="dropdown">
        <div v-if="showSearchModeDropdown" class="mode-dropdown" :class="{ 'dropdown-above': isBottomPosition }">
          <div class="mode-option" @click="selectSearchMode('auto')">自動(カード名+テキスト+Pテキスト)</div>
          <div class="mode-option" @click="selectSearchMode('name')">カード名で検索</div>
          <div class="mode-option" @click="selectSearchMode('text')">テキストで検索</div>
          <div class="mode-option" @click="selectSearchMode('pendulum')">ペンデュラムテキストで検索</div>
          <div class="mode-option" @click="selectSearchMode('mydeck')">マイデッキから選択</div>
        </div>
      </Transition>
      <button class="search-btn" @click="handleSearch">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
        </svg>
      </button>
      <div class="input-container" :class="{ 'command-mode': isCommandMode || pendingCommand }">
        <!-- SearchFilterDialogで選択した条件（上部） -->
        <div v-if="hasActiveFilters" class="filter-icons-top">
          <span
            v-for="(icon, index) in displayFilterIcons"
            :key="index"
            class="filter-icon-item"
            :class="icon.type"
          >{{ icon.label }}</span>
        </div>
        <!-- 入力行 -->
        <div class="input-row">
          <!-- スラッシュコマンドで追加したチップ（左側） -->
          <div v-if="filterChips.length > 0" class="filter-chips">
            <span
              v-for="(chip, index) in filterChips"
              :key="index"
              class="filter-chip"
              :class="{ 'not-condition': chip.isNot }"
              @click="removeFilterChip(index)"
            >
              <span v-if="chip.isNot" class="not-prefix">!</span>{{ chip.label }}
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
          @focus="handleFocus"
          @keydown.enter.prevent="handleEnter"
          @keydown.escape="handleEscape(); $emit('escape')"
          @keydown="handleKeydown"
        >
        <!-- コマンド候補リスト -->
        <div v-if="commandSuggestions.length > 0 && !pendingCommand" class="suggestions-dropdown command-suggestions" :class="{ 'dropdown-above': isBottomPosition }">
          <div
            v-for="(cmd, index) in commandSuggestions"
            :key="cmd.command"
            class="suggestion-item"
            :class="{ selected: index === selectedCommandIndex }"
            @click="selectCommand(cmd)"
          >
            <span class="suggestion-value">{{ cmd.command }}</span>
            <span class="suggestion-label">{{ cmd.description }}</span>
          </div>
        </div>
        <!-- 候補リスト -->
        <div v-if="pendingCommand && filteredSuggestions.length > 0" class="suggestions-dropdown" :class="{ 'dropdown-above': isBottomPosition }">
          <div
            v-for="(suggestion, index) in filteredSuggestions"
            :key="suggestion.value"
            class="suggestion-item"
            :class="{ selected: index === selectedSuggestionIndex }"
            @click="selectSuggestion(suggestion)"
          >
            <span class="suggestion-value">{{ suggestion.value }}</span>
            <span class="suggestion-label">{{ suggestion.label }}</span>
          </div>
        </div>
        <!-- mydeckモード用の候補リスト -->
        <div v-if="showMydeckDropdown" class="mode-dropdown-overlay" @click="showMydeckDropdown = false"></div>
        <div v-if="showMydeckDropdown" class="suggestions-dropdown mydeck-suggestions" :class="{ 'dropdown-above': isBottomPosition }">
          <div
            v-for="(deck, index) in mydeckSuggestions"
            :key="deck.dno"
            class="suggestion-item"
            :class="{ selected: index === selectedMydeckIndex }"
            @click="selectMydeck(deck)"
          >
            <span class="suggestion-value">dno:{{ deck.dno }}</span>
            <span class="suggestion-label">{{ deck.name }}</span>
          </div>
        </div>
      </div>
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
import { ref, computed, nextTick, defineComponent, type Ref } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { useSettingsStore } from '../stores/settings'
import type { SearchOptions } from '../api/card-search'
import { SORT_ORDER_TO_API_VALUE } from '../api/card-search'
import { getDeckDetail } from '../api/deck-operations'
import { sessionManager } from '../content/session/session'
import SearchFilterDialog from './SearchFilterDialog.vue'
import type { SearchFilters } from '../types/search-filters'
import type { CardInfo, Attribute, Race, MonsterType, CardType } from '../types/card'
import type { SearchMode } from '../types/settings'
import { getTempCardDB } from '../utils/temp-card-db'
import { convertFiltersToIcons } from '../utils/filter-icons'
import { getRaceLabel } from '../utils/filter-label'
import { detectLanguage } from '../utils/language-detector'
import { mappingManager } from '../utils/mapping-manager'

// コマンド定義
const COMMANDS: Record<string, { filterType: string; description: string; isNot?: boolean }> = {
  '/attr': { filterType: 'attributes', description: '属性' },
  '/race': { filterType: 'races', description: '種族' },
  '/level': { filterType: 'levels', description: 'レベル/ランク' },
  '/atk': { filterType: 'atk', description: 'ATK' },
  '/def': { filterType: 'def', description: 'DEF' },
  '/type': { filterType: 'cardType', description: 'カードタイプ' },
  '/link': { filterType: 'linkNumbers', description: 'リンク数' },
  '/mtype': { filterType: 'monsterTypes', description: 'モンスタータイプ' },
  '/search': { filterType: 'searchMode', description: '検索モード' },
  // NOT条件
  '/attr-not': { filterType: 'attributes', description: '属性(除外)', isNot: true },
  '/race-not': { filterType: 'races', description: '種族(除外)', isNot: true },
  '/level-not': { filterType: 'levels', description: 'レベル(除外)', isNot: true },
  '/type-not': { filterType: 'cardType', description: 'タイプ(除外)', isNot: true },
  '/link-not': { filterType: 'linkNumbers', description: 'リンク(除外)', isNot: true },
  '/mtype-not': { filterType: 'monsterTypes', description: 'Mタイプ(除外)', isNot: true }
}

// 検索モードマッピング
const SEARCH_MODE_MAP: Record<string, string> = {
  'name': 'name', 'カード名': 'name', 'n': 'name',
  'text': 'text', 'テキスト': 'text', 't': 'text',
  'pend': 'pendulum', 'pendulum': 'pendulum', 'ペンデュラム': 'pendulum', 'p': 'pendulum',
  'mydeck': 'mydeck', 'マイデッキ': 'mydeck', 'd': 'mydeck'
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
    },
    position: {
      type: String as () => 'top' | 'bottom' | 'default',
      default: 'default'
    }
  },
  emits: ['escape'],
  setup(props, { expose }) {
    const deckStore = useDeckEditStore()
    const inputRef = ref<HTMLInputElement | null>(null)

    // 設定からデフォルト検索モードを取得
    const settingsStore = useSettingsStore()
    const searchMode = ref<SearchMode>(settingsStore.appSettings.defaultSearchMode || 'name')

    const showSearchModeDropdown = ref(false)
    const showFilterDialog = ref(false)
    const showMydeckDropdown = ref(false)

    // ページ言語を検出（多言語対応）
    const pageLanguage = computed(() => {
      return detectLanguage(document)
    })

    // 検索入力欄の位置を自動検出
    const isBottomPosition = computed(() => {
      if (props.position !== 'default') return props.position === 'bottom'
      // 親要素のクラス名から位置を判定
      const wrapper = inputRef.value?.closest('.search-input-wrapper')
      const parent = wrapper?.parentElement
      if (!parent) return false
      return parent.classList.contains('search-input-bottom-fixed') || 
             parent.classList.contains('search-input-bottom')
    })
    const searchFilters = ref<SearchFilters>({
      cardType: null,
      attributes: [],
      spellTypes: [],
      trapTypes: [],
      races: [],
      monsterTypes: [],
      monsterTypeMatchMode: 'or',
      levelType: 'level',
      levelValues: [],
      linkValues: [],
      scaleValues: [],
      linkMarkers: [],
      linkMarkerMatchMode: 'or',
      atk: { exact: false, unknown: false },
      def: { exact: false, unknown: false },
      releaseDate: {}
    })

    // チップベースフィルターシステム
    interface FilterChip {
      type: string
      value: string
      label: string
      isNot?: boolean
    }

    interface PendingCommand {
      command: string
      filterType: string
      isNot?: boolean
    }

    const filterChips = ref<FilterChip[]>([])
    const pendingCommand = ref<PendingCommand | null>(null)
    const selectedSuggestionIndex = ref(-1)
    const selectedCommandIndex = ref(-1)

    // 各フィルタータイプの選択肢
    const FILTER_OPTIONS: Record<string, { value: string; label: string }[]> = {
      attributes: [
        { value: 'light', label: '光' }, { value: 'dark', label: '闇' },
        { value: 'water', label: '水' }, { value: 'fire', label: '炎' },
        { value: 'earth', label: '地' }, { value: 'wind', label: '風' },
        { value: 'divine', label: '神' }
      ],
      cardType: [
        { value: 'monster', label: 'モンスター' },
        { value: 'spell', label: '魔法' },
        { value: 'trap', label: '罠' }
      ],
      races: [
        { value: 'dragon', label: 'ドラゴン', aliases: ['どらごん', '龍', '竜'] },
        { value: 'spellcaster', label: '魔法使い', aliases: ['まほうつかい', '魔'] },
        { value: 'warrior', label: '戦士', aliases: ['せんし', '戦'] },
        { value: 'machine', label: '機械', aliases: ['きかい', '機'] },
        { value: 'fiend', label: '悪魔', aliases: ['あくま', '悪'] },
        { value: 'fairy', label: '天使', aliases: ['てんし', '天'] },
        { value: 'zombie', label: 'アンデット', aliases: ['あんでっと', '不死', 'ゾンビ'] },
        { value: 'beast', label: '獣', aliases: ['けもの', 'じゅう'] },
        { value: 'beastwarrior', label: '獣戦士', aliases: ['じゅうせんし', '獣戦'] },
        { value: 'plant', label: '植物', aliases: ['しょくぶつ', '植'] },
        { value: 'insect', label: '昆虫', aliases: ['こんちゅう', '昆', '虫'] },
        { value: 'aqua', label: '水族', aliases: ['すいぞく', '水'] },
        { value: 'fish', label: '魚族', aliases: ['ぎょぞく', '魚'] },
        { value: 'seaserpent', label: '海竜族', aliases: ['かいりゅうぞく', '海竜', '海'] },
        { value: 'reptile', label: '爬虫類', aliases: ['はちゅうるい', '爬虫', '爬'] },
        { value: 'dinosaur', label: '恐竜', aliases: ['きょうりゅう', '恐'] },
        { value: 'windbeast', label: '鳥獣', aliases: ['ちょうじゅう', '鳥'] },
        { value: 'rock', label: '岩石', aliases: ['がんせき', '岩'] },
        { value: 'pyro', label: '炎族', aliases: ['ほのおぞく', '炎'] },
        { value: 'thunder', label: '雷族', aliases: ['かみなりぞく', '雷'] },
        { value: 'psychic', label: 'サイキック', aliases: ['さいきっく', '念動', '念'] },
        { value: 'wyrm', label: '幻竜族', aliases: ['げんりゅうぞく', '幻竜', '幻'] },
        { value: 'cyberse', label: 'サイバース', aliases: ['さいばーす', '電脳', '電'] }
      ] as { value: string; label: string; aliases?: string[] }[],
      monsterTypes: [
        { value: 'normal', label: '通常' }, { value: 'effect', label: '効果' },
        { value: 'fusion', label: '融合' }, { value: 'ritual', label: '儀式' },
        { value: 'synchro', label: 'シンクロ' }, { value: 'xyz', label: 'エクシーズ' },
        { value: 'pendulum', label: 'ペンデュラム' }, { value: 'link', label: 'リンク' },
        { value: 'tuner', label: 'チューナー' }, { value: 'flip', label: 'リバース' },
        { value: 'toon', label: 'トゥーン' }, { value: 'spirit', label: 'スピリット' },
        { value: 'union', label: 'ユニオン' }, { value: 'gemini', label: 'デュアル' },
        { value: 'special', label: '特殊召喚' }
      ],
      levels: [
        { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
        { value: '4', label: '4' }, { value: '5', label: '5' }, { value: '6', label: '6' },
        { value: '7', label: '7' }, { value: '8', label: '8' }, { value: '9', label: '9' },
        { value: '10', label: '10' }, { value: '11', label: '11' }, { value: '12', label: '12' }
      ],
      linkNumbers: [
        { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
        { value: '4', label: '4' }, { value: '5', label: '5' }, { value: '6', label: '6' }
      ],
      searchMode: [
        { value: 'name', label: 'カード名' },
        { value: 'text', label: 'テキスト' },
        { value: 'pend', label: 'ペンデュラム' },
        { value: 'mydeck', label: 'マイデッキ' }
      ]
    }

    // コマンド候補（/ で始まる入力時）
    const commandSuggestions = computed(() => {
      const query = deckStore.searchQuery.trim()
      if (!query.startsWith('/') || pendingCommand.value) return []
      
      const input = query.substring(1).toLowerCase()
      if (!input) {
        // 主要コマンドのみ表示
        return [
          { command: '/attr', description: '属性' },
          { command: '/race', description: '種族' },
          { command: '/level', description: 'レベル/ランク' },
          { command: '/atk', description: 'ATK' },
          { command: '/def', description: 'DEF' },
          { command: '/type', description: 'カードタイプ' },
          { command: '/link', description: 'リンク数' },
          { command: '/mtype', description: 'モンスタータイプ' }
        ]
      }
      
      // 入力に一致するコマンドをフィルタ
      return Object.entries(COMMANDS)
        .filter(([cmd, info]) => 
          cmd.toLowerCase().includes(input) || 
          info.description.toLowerCase().includes(input)
        )
        .map(([cmd, info]) => ({ command: cmd, description: info.description }))
    })

    // 現在の入力に基づいてフィルタリングされた候補
    const filteredSuggestions = computed(() => {
      if (!pendingCommand.value) return []

      const options = FILTER_OPTIONS[pendingCommand.value.filterType]
      if (!options) return []

      // -プレフィックスを除去した実際の値でフィルタリング
      const input = actualInputValue.value
      if (!input) return options

      return options.filter(opt => {
        // value, label をチェック
        if (opt.value.toLowerCase().includes(input) ||
            opt.label.toLowerCase().includes(input)) {
          return true
        }
        // aliases があればチェック
        const aliases = (opt as { aliases?: string[] }).aliases
        if (aliases) {
          return aliases.some(alias => alias.toLowerCase().includes(input))
        }
        return false
      })
    })

    const searchModeLabel = computed(() => {
      switch (searchMode.value) {
        case 'auto': return 'auto'
        case 'name': return 'name'
        case 'text': return 'text'
        case 'pendulum': return 'pend'
        case 'mydeck': return 'mydeck'
        default: return 'name'
      }
    })

    const hasActiveFilters = computed(() => {
      const f = searchFilters.value
      return f.cardType !== null ||
        f.attributes.length > 0 ||
        f.races.length > 0 ||
        f.levelValues.length > 0 ||
        f.atk.unknown ||
        f.atk.min !== undefined ||
        f.atk.max !== undefined ||
        f.def.unknown ||
        f.def.min !== undefined ||
        f.def.max !== undefined ||
        f.monsterTypes.length > 0 ||
        f.linkValues.length > 0
    })

    const filterCount = computed(() => {
      const f = searchFilters.value
      let count = 0
      if (f.cardType) count++
      count += f.attributes.length
      count += f.races.length
      count += f.levelValues.length
      if (f.atk.unknown || f.atk.min !== undefined || f.atk.max !== undefined) count++
      if (f.def.unknown || f.def.min !== undefined || f.def.max !== undefined) count++
      count += f.monsterTypes.length
      count += f.linkValues.length
      return count
    })

    // 表示用フィルターアイコン - filterChipsと重複しないものを表示
    const displayFilterIcons = computed(() => {
      // 共通関数で全アイコンを取得
      const allIcons = convertFiltersToIcons(searchFilters.value)

      // filterChipsで追加された条件を除外するためのセット
      const chipTypes = new Set(filterChips.value.map(chip => chip.type))

      // filterChipsと重複しないアイコンのみを返す
      return allIcons.filter(icon => !chipTypes.has(icon.type))
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

    // コマンド名を入力中かどうか（/で始まるがまだスペースがない状態）
    const isTypingCommand = computed(() => {
      const query = deckStore.searchQuery
      return query.startsWith('/') && !pendingCommand.value && !commandMatch.value
    })

    // 入力値がNOT条件かどうかを判定（-プレフィックス）
    const isNegatedInput = computed(() => {
      const value = deckStore.searchQuery.trim()
      return value.startsWith('-') && value.length > 1
    })

    // 実際の値（-プレフィックスを除去）
    const actualInputValue = computed(() => {
      const value = deckStore.searchQuery.trim().toLowerCase()
      if (value.startsWith('-')) {
        return value.substring(1)
      }
      return value
    })

    // 現在の入力が有効かどうかを判定
    const isValidCommandInput = computed(() => {
      if (!pendingCommand.value) return false
      const value = actualInputValue.value
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
        case 'races': {
          // 種族オプションの中で一致するものがあるかチェック
          const raceOptions = FILTER_OPTIONS.races
          return raceOptions.some(opt => {
            if (opt.value.toLowerCase() === value || opt.label.toLowerCase() === value) {
              return true
            }
            const aliases = (opt as { aliases?: string[] }).aliases
            if (aliases) {
              return aliases.some(alias => alias.toLowerCase() === value)
            }
            return false
          })
        }
        case 'searchMode':
          return SEARCH_MODE_MAP[value] !== undefined
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
      if (searchMode.value === 'mydeck') {
        return 'デッキ名を入力...'
      }
      // 検索モードに応じたプレースホルダー
      const placeholders: Record<string, string> = {
        'name': 'カード名を検索...',
        'text': 'テキストを検索...',
        'pendulum': 'ペンデュラムテキストを検索...'
      }
      return placeholders[searchMode.value] || props.placeholder
    })

    // mydeckモード用の候補リスト
    const mydeckSuggestions = computed(() => {
      if (searchMode.value !== 'mydeck') return []
      const input = deckStore.searchQuery.trim().toLowerCase()
      const decks = deckStore.deckList.map(d => ({
        dno: d.dno,
        name: d.name
      }))
      if (!input) return decks
      return decks.filter(d =>
        d.name.toLowerCase().includes(input)
      )
    })

    // mydeckモードで選択中のインデックス
    const selectedMydeckIndex = ref(-1)

    // チップのラベルを取得（右側のフィルターアイコンと同じ形式・言語対応版）
    const getChipLabel = (type: string, value: string): string => {
      const lang = pageLanguage.value
      switch (type) {
        case 'attributes': {
          const idToText = mappingManager.getAttributeIdToText(lang)
          const dynamicLabel = (idToText as Record<string, string>)[value]
          if (dynamicLabel) {
            // 動的マッピングがある場合、最初の1文字を返す
            return dynamicLabel.slice(0, 1)
          }
          // フォールバック：日本語ラベル
          const labels: Record<string, string> = { light: '光', dark: '闇', water: '水', fire: '炎', earth: '地', wind: '風', divine: '神' }
          return labels[value] || value
        }
        case 'cardType': {
          const labels: Record<string, string> = { monster: 'M', spell: '魔', trap: '罠' }
          return labels[value] || value
        }
        case 'monsterTypes': {
          const idToText = mappingManager.getMonsterTypeIdToText(lang)
          const dynamicLabel = (idToText as Record<string, string>)[value]
          if (dynamicLabel) {
            // 動的マッピングがある場合、最初の1文字を返す
            return dynamicLabel.slice(0, 1)
          }
          // フォールバック：日本語ラベル
          const labels: Record<string, string> = {
            normal: '通', effect: '効', fusion: '融', ritual: '儀', synchro: 'S', xyz: 'X',
            pendulum: 'P', link: 'L', tuner: 'T', flip: 'R', toon: 'ト', spirit: 'ス',
            union: 'U', gemini: 'D', special: '特'
          }
          return labels[value] || value
        }
        case 'levels':
          return `★${value}`
        case 'linkNumbers':
          return `L${value}`
        case 'atk':
          return 'ATK'
        case 'def':
          return 'DEF'
        case 'races':
          return getRaceLabel(value, lang)
        default:
          return value
      }
    }

    // フォーカスハンドラ
    const handleFocus = () => {
      // mydeckモードの場合は候補を表示
      if (searchMode.value === 'mydeck') {
        showMydeckDropdown.value = true
      }
    }

    // 入力ハンドラ
    const handleInput = () => {
      const query = deckStore.searchQuery

      // コマンド候補のインデックスをリセット（ペンディングコマンドがない場合のみ）
      if (!pendingCommand.value) {
        selectedCommandIndex.value = -1
      }

      // ペンディングコマンドがある場合は値入力モード
      if (pendingCommand.value) {
        // 候補選択中の入力変更は無視（キーボード操作で値が変わる）
        return
      }

      // コマンドパターンを検出：/cmd + スペース
      for (const cmd of Object.keys(COMMANDS)) {
        if (query === cmd + ' ') {
          // コマンド + スペースで値入力モードに移行
          const cmdDef = COMMANDS[cmd]
          pendingCommand.value = {
            command: cmd,
            filterType: cmdDef.filterType,
            isNot: cmdDef.isNot
          }
          deckStore.searchQuery = ''
          return
        }
      }
    }

    // キー入力ハンドラ
    // 共通の候補選択処理
    const handleSuggestionNavigation = (
      event: KeyboardEvent,
      selectedIndex: Ref<number>,
      suggestions: any[],
      onSelect: (item: any) => void,
      containerSelector: string
    ) => {
      if (event.key === 'Tab' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
          selectedIndex.value = selectedIndex.value < 0
            ? suggestions.length - 1
            : selectedIndex.value <= 0
            ? suggestions.length - 1
            : selectedIndex.value - 1
        } else {
          selectedIndex.value = selectedIndex.value < 0
            ? 0
            : (selectedIndex.value + 1) % suggestions.length
        }
        // 選択中の項目を表示領域内にスクロール（前後2個程度も表示）
        nextTick(() => {
          const container = document.querySelector(containerSelector)
          if (container) {
            const selectedItem = container.querySelector('.suggestion-item.selected')
            if (selectedItem) {
              selectedItem.scrollIntoView({ block: 'center', behavior: 'smooth' })
            }
          }
        })
        return true
      }
      if (event.key === 'Enter' && selectedIndex.value >= 0) {
        event.preventDefault()
        const selected = suggestions[selectedIndex.value]
        if (selected) {
          onSelect(selected)
        }
        return true
      }
      return false
    }

    const handleKeydown = (event: KeyboardEvent) => {
      // コマンド候補のTab/Arrow処理
      if (commandSuggestions.value.length > 0 && !pendingCommand.value) {
        if (handleSuggestionNavigation(event, selectedCommandIndex, commandSuggestions.value, selectCommand, '.command-suggestions')) {
          return
        }
      }

      // mydeckモードのTab/Arrow処理
      if (showMydeckDropdown.value) {
        if (handleSuggestionNavigation(event, selectedMydeckIndex, mydeckSuggestions.value, selectMydeck, '.mydeck-suggestions')) {
          return
        }
      }

      // Tabキーで候補を選択
      if (event.key === 'Tab' && pendingCommand.value && filteredSuggestions.value.length > 0) {
        event.preventDefault()
        if (event.shiftKey) {
          // Shift+Tabで前の候補
          selectedSuggestionIndex.value = selectedSuggestionIndex.value <= 0
            ? filteredSuggestions.value.length - 1
            : selectedSuggestionIndex.value - 1
        } else {
          // Tabで次の候補
          selectedSuggestionIndex.value = (selectedSuggestionIndex.value + 1) % filteredSuggestions.value.length
        }
        // 選択した候補を入力に反映（-プレフィックスを保持）
        const selected = filteredSuggestions.value[selectedSuggestionIndex.value]
        if (selected) {
          const prefix = isNegatedInput.value ? '-' : ''
          deckStore.searchQuery = prefix + selected.value
        }
        return
      }

      // Spaceキーで有効な入力をチップに変換
      if (event.key === ' ' && pendingCommand.value && isValidCommandInput.value) {
        event.preventDefault()
        addFilterChip()
        selectedSuggestionIndex.value = -1
        return
      }

      // Backspaceで空の入力時にチップを削除
      if (event.key === 'Backspace') {
        if (deckStore.searchQuery === '' && pendingCommand.value) {
          // ペンディングコマンドをキャンセル
          event.preventDefault()
          pendingCommand.value = null
          selectedSuggestionIndex.value = -1
          return
        }
        if (deckStore.searchQuery === '' && !pendingCommand.value && filterChips.value.length > 0) {
          // 最後のチップを削除
          event.preventDefault()
          removeFilterChip(filterChips.value.length - 1)
          return
        }
      }

      // 上下キーで候補を選択（入力を更新しない）
      if (pendingCommand.value && filteredSuggestions.value.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          selectedSuggestionIndex.value = selectedSuggestionIndex.value < 0
            ? 0
            : (selectedSuggestionIndex.value + 1) % filteredSuggestions.value.length
          return
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          selectedSuggestionIndex.value = selectedSuggestionIndex.value < 0
            ? filteredSuggestions.value.length - 1
            : selectedSuggestionIndex.value <= 0
            ? filteredSuggestions.value.length - 1
            : selectedSuggestionIndex.value - 1
          return
        }
        // Enterキーで選択を確定
        if (event.key === 'Enter' && selectedSuggestionIndex.value >= 0) {
          event.preventDefault()
          const selected = filteredSuggestions.value[selectedSuggestionIndex.value]
          if (selected) {
            const prefix = isNegatedInput.value ? '-' : ''
            deckStore.searchQuery = prefix + selected.value
            // チップに変換
            nextTick(() => {
              addFilterChip()
            })
          }
          return
        }
      }
    }

    // フィルターチップを追加
    const addFilterChip = () => {
      if (!pendingCommand.value) return

      const value = actualInputValue.value
      if (!value) return

      const filterType = pendingCommand.value.filterType

      // 検索モードは特別処理（チップにしない）
      if (filterType === 'searchMode') {
        const newMode = SEARCH_MODE_MAP[value]
        if (newMode) {
          searchMode.value = newMode as SearchMode
          // mydeckモードに切り替えた場合はドロップダウンを表示
          if (newMode === 'mydeck') {
            nextTick(() => {
              showMydeckDropdown.value = true
            })
          }
        }
        deckStore.searchQuery = ''
        pendingCommand.value = null
        return
      }

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
        case 'races': {
          // 種族オプションから内部値を検索
          const raceOptions = FILTER_OPTIONS.races
          const found = raceOptions.find(opt => {
            if (opt.value.toLowerCase() === value || opt.label.toLowerCase() === value) {
              return true
            }
            const aliases = (opt as { aliases?: string[] }).aliases
            if (aliases) {
              return aliases.some(alias => alias.toLowerCase() === value)
            }
            return false
          })
          if (found) {
            mappedValue = found.value
          }
          break
        }
      }

      // コマンド自体がNOTか、または-プレフィックスが付いているか
      const isNot = pendingCommand.value.isNot || isNegatedInput.value

      // チップを追加
      filterChips.value.push({
        type: filterType,
        value: mappedValue,
        label: getChipLabel(filterType, mappedValue),
        isNot
      })

      // 実際のフィルターにも適用
      applyChipToFilters(filterType, mappedValue, isNot)

      // 入力をクリア
      deckStore.searchQuery = ''
      pendingCommand.value = null
    }

    // チップをフィルターに適用
    const applyChipToFilters = (type: string, value: string, isNot: boolean = false) => {
      // NOT条件はクライアントサイドフィルタリングで処理（APIには送らない）
      if (isNot) return

      const f = searchFilters.value

      switch (type) {
        case 'attributes':
          if (!f.attributes.includes(value as Attribute)) {
            f.attributes.push(value as Attribute)
          }
          break
        case 'races':
          if (!f.races.includes(value as Race)) {
            f.races.push(value as Race)
          }
          break
        case 'levels': {
          const level = parseInt(value)
          if (!isNaN(level) && !f.levelValues.includes(level)) {
            f.levelValues.push(level)
          }
          break
        }
        case 'atk': {
          const parts = value.split('-')
          if (parts.length === 2) {
            const min = parts[0] ? parseInt(parts[0]) : undefined
            const max = parts[1] ? parseInt(parts[1]) : undefined
            if (!isNaN(min as number)) f.atk.min = min
            if (!isNaN(max as number)) f.atk.max = max
          } else {
            const val = parseInt(value)
            if (!isNaN(val)) {
              f.atk.exact = true
              f.atk.min = val
              f.atk.max = val
            }
          }
          break
        }
        case 'def': {
          const parts = value.split('-')
          if (parts.length === 2) {
            const min = parts[0] ? parseInt(parts[0]) : undefined
            const max = parts[1] ? parseInt(parts[1]) : undefined
            if (!isNaN(min as number)) f.def.min = min
            if (!isNaN(max as number)) f.def.max = max
          } else {
            const val = parseInt(value)
            if (!isNaN(val)) {
              f.def.exact = true
              f.def.min = val
              f.def.max = val
            }
          }
          break
        }
        case 'cardType':
          f.cardType = value as CardType
          break
        case 'linkNumbers': {
          const link = parseInt(value)
          if (!isNaN(link) && !f.linkValues.includes(link)) {
            f.linkValues.push(link)
          }
          break
        }
        case 'monsterTypes':
          if (!f.monsterTypes.some(mt => mt.type === value)) {
            f.monsterTypes.push({ type: value as MonsterType, state: 'normal' })
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
          const idx = f.attributes.indexOf(value as Attribute)
          if (idx !== -1) f.attributes.splice(idx, 1)
          break
        }
        case 'races': {
          const idx = f.races.indexOf(value as Race)
          if (idx !== -1) f.races.splice(idx, 1)
          break
        }
        case 'levels': {
          const level = parseInt(value)
          const idx = f.levelValues.indexOf(level)
          if (idx !== -1) f.levelValues.splice(idx, 1)
          break
        }
        case 'atk':
          f.atk = { exact: false, unknown: false }
          break
        case 'def':
          f.def = { exact: false, unknown: false }
          break
        case 'cardType':
          f.cardType = null
          break
        case 'linkNumbers': {
          const link = parseInt(value)
          const idx = f.linkValues.indexOf(link)
          if (idx !== -1) f.linkValues.splice(idx, 1)
          break
        }
        case 'monsterTypes': {
          const idx = f.monsterTypes.findIndex(mt => mt.type === value)
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
        selectedSuggestionIndex.value = -1
      }
      // 常に親コンポーネントに伝播（emit('escape')はテンプレートで処理）
    }

    // 候補を選択
    // コマンド選択
    const selectCommand = (cmd: { command: string; description: string }) => {
      deckStore.searchQuery = cmd.command + ' '
      selectedCommandIndex.value = -1
      // コマンドモードに移行
      const cmdDef = COMMANDS[cmd.command]
      if (cmdDef) {
        pendingCommand.value = {
          command: cmd.command,
          filterType: cmdDef.filterType,
          isNot: cmdDef.isNot
        }
        deckStore.searchQuery = ''
      }
      inputRef.value?.focus()
    }

    const selectSuggestion = (suggestion: { value: string; label: string }) => {
      // -プレフィックスを保持
      const prefix = isNegatedInput.value ? '-' : ''
      deckStore.searchQuery = prefix + suggestion.value
      selectedSuggestionIndex.value = -1
      // 選択したら即チップに変換
      nextTick(() => {
        addFilterChip()
      })
    }

    // mydeckモードでデッキを選択
    const selectMydeck = (deck: { dno: number; name: string }) => {
      // デッキ名を入力欄に設定
      deckStore.searchQuery = deck.name
      loadMydeckCards(deck.dno)
      // ドロップダウンを閉じる
      showMydeckDropdown.value = false
    }

    // デッキのカードを読み込んで検索結果に表示
    const loadMydeckCards = async (dno: number) => {
      deckStore.isLoading = true
      deckStore.activeTab = 'search'

      try {
        const cgid = await sessionManager.getCgid()
        const deckDetail = await getDeckDetail(dno, cgid)

        if (!deckDetail) {
          console.error('Failed to load deck detail')
          return
        }

        // 全カードを収集（TempCardDBから取得）
        // cid-ciidのペアで重複排除（イラスト違いは別々に表示）
        const tempCardDB = getTempCardDB()
        const seenCards = new Set<string>()
        const uniqueCards: CardInfo[] = []

        deckDetail.mainDeck.forEach(dc => {
          const key = `${dc.cid}-${dc.ciid}`
          if (!seenCards.has(key)) {
            const card = tempCardDB.get(dc.cid)
            if (card) {
              seenCards.add(key)
              // ciidを正しく設定
              const cardWithCiid = { ...card, ciid: dc.ciid }
              uniqueCards.push(cardWithCiid)
            }
          }
        })
        deckDetail.extraDeck.forEach(dc => {
          const key = `${dc.cid}-${dc.ciid}`
          if (!seenCards.has(key)) {
            const card = tempCardDB.get(dc.cid)
            if (card) {
              seenCards.add(key)
              // ciidを正しく設定
              const cardWithCiid = { ...card, ciid: dc.ciid }
              uniqueCards.push(cardWithCiid)
            }
          }
        })
        deckDetail.sideDeck.forEach(dc => {
          const key = `${dc.cid}-${dc.ciid}`
          if (!seenCards.has(key)) {
            const card = tempCardDB.get(dc.cid)
            if (card) {
              seenCards.add(key)
              // ciidを正しく設定
              const cardWithCiid = { ...card, ciid: dc.ciid }
              uniqueCards.push(cardWithCiid)
            }
          }
        })

        // 検索結果に設定（各カード種類1つずつ）
        deckStore.searchResults = uniqueCards as unknown as typeof deckStore.searchResults
        deckStore.allResults = uniqueCards
        deckStore.hasMore = false
        deckStore.currentPage = 0

        // 選択インデックスをリセット
        selectedMydeckIndex.value = -1
      } catch (error) {
        console.error('Failed to load mydeck cards:', error)
      } finally {
        deckStore.isLoading = false
      }
    }

    // Enterキーハンドラ
    const handleEnter = () => {
      // mydeckモードの場合
      if (searchMode.value === 'mydeck' && !pendingCommand.value) {
        // 選択中のデッキがある場合
        if (selectedMydeckIndex.value >= 0) {
          const selected = mydeckSuggestions.value[selectedMydeckIndex.value]
          if (selected) {
            loadMydeckCards(selected.dno)
            return
          }
        }
        // 入力に一致するデッキがある場合
        const matchedDeck = mydeckSuggestions.value.find(d =>
          d.name.toLowerCase() === deckStore.searchQuery.trim().toLowerCase()
        )
        if (matchedDeck) {
          loadMydeckCards(matchedDeck.dno)
          return
        }
        // 候補が1つだけの場合はそれを選択
        if (mydeckSuggestions.value.length === 1) {
          loadMydeckCards(mydeckSuggestions.value[0].dno)
          return
        }
        return
      }

      // 候補が選択されている場合はその候補をチップに変換
      if (pendingCommand.value && selectedSuggestionIndex.value >= 0) {
        const selected = filteredSuggestions.value[selectedSuggestionIndex.value]
        if (selected) {
          // -プレフィックスを保持
          const prefix = isNegatedInput.value ? '-' : ''
          deckStore.searchQuery = prefix + selected.value
          selectedSuggestionIndex.value = -1
          nextTick(() => {
            addFilterChip()
          })
          return
        }
      }

      // 有効な入力がある場合はチップに変換
      if (pendingCommand.value && isValidCommandInput.value) {
        addFilterChip()
        return
      }

      // コマンド入力中の場合は何もしない
      if (isTypingCommand.value) {
        return
      }

      // コマンドモードの場合はフィルタを適用
      if (isCommandMode.value) {
        applyCommandFilter()
        deckStore.searchQuery = '' // コマンド部分をクリア
        return
      }

      // それ以外は検索実行
      handleSearch()
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
          if (attr && !f.attributes.includes(attr as Attribute)) {
            f.attributes.push(attr as Attribute)
          }
          break
        }
        case 'races': {
          // 種族は部分一致で検索（TODO: 種族マッピングを追加）
          const raceValue = value as Race
          if (raceValue && !f.races.includes(raceValue)) {
            f.races.push(raceValue)
          }
          break
        }
        case 'levels': {
          const level = parseInt(value)
          if (!isNaN(level) && level >= 1 && level <= 12 && !f.levelValues.includes(level)) {
            f.levelValues.push(level)
          }
          break
        }
        case 'atk': {
          // ATK:1000-2000 または ATK:1000 形式
          const parts = value.split('-')
          if (parts.length === 2) {
            const min = parts[0] ? parseInt(parts[0]) : undefined
            const max = parts[1] ? parseInt(parts[1]) : undefined
            if (!isNaN(min as number)) f.atk.min = min
            if (!isNaN(max as number)) f.atk.max = max
          } else if (parts.length === 1) {
            const val = parseInt(parts[0])
            if (!isNaN(val)) {
              f.atk.exact = true
              f.atk.min = val
              f.atk.max = val
            }
          }
          break
        }
        case 'def': {
          const parts = value.split('-')
          if (parts.length === 2) {
            const min = parts[0] ? parseInt(parts[0]) : undefined
            const max = parts[1] ? parseInt(parts[1]) : undefined
            if (!isNaN(min as number)) f.def.min = min
            if (!isNaN(max as number)) f.def.max = max
          } else if (parts.length === 1) {
            const val = parseInt(parts[0])
            if (!isNaN(val)) {
              f.def.exact = true
              f.def.min = val
              f.def.max = val
            }
          }
          break
        }
        case 'cardType': {
          const type = CARD_TYPE_MAP[value]
          if (type) {
            f.cardType = type as CardType
          }
          break
        }
        case 'linkNumbers': {
          const link = parseInt(value)
          if (!isNaN(link) && link >= 1 && link <= 6 && !f.linkValues.includes(link)) {
            f.linkValues.push(link)
          }
          break
        }
        case 'monsterTypes': {
          const mtype = MONSTER_TYPE_MAP[value]
          if (mtype && !f.monsterTypes.some(mt => mt.type === mtype)) {
            f.monsterTypes.push({ type: mtype as MonsterType, state: 'normal' })
          }
          break
        }
      }

      // コマンドをクリアして検索クエリを空に
      deckStore.searchQuery = ''
    }

    const selectSearchMode = (mode: SearchMode) => {
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
      const query = deckStore.searchQuery.trim()

      if (!query && !hasActiveFilters.value) {
        deckStore.searchResults = []
        deckStore.allResults = []
        deckStore.hasMore = false
        deckStore.currentPage = 0
        return
      }

      deckStore.activeTab = 'search'
      deckStore.isLoading = true

      const searchTypeMap: Record<string, string> = {
        'auto': '1', // autoモードはsearchCardsAutoで処理するため、ここでは使われない
        'name': '1',
        'text': '2',
        'pendulum': '3'
      }
      const searchType = searchTypeMap[searchMode.value] || '1'

      try {
        const apiSort = SORT_ORDER_TO_API_VALUE[deckStore.sortOrder] || 1
        const keyword = deckStore.searchQuery.trim()

        // 検索実行時に動的import
        const { searchCards, searchCardsAuto } = await import('../api/card-search')

        // autoモードの場合は専用の関数を使用
        let results: CardInfo[]
        let searchOptions: SearchOptions | null = null

        if (searchMode.value === 'auto') {
          const autoResult = await searchCardsAuto(keyword, 100, searchFilters.value.cardType as CardType | undefined)
          results = autoResult.cards
        } else {
          // 通常の検索
          searchOptions = {
            keyword,
            searchType: searchType as '1' | '2' | '3' | '4',
            resultsPerPage: 100,
            sort: apiSort
          }

          const f = searchFilters.value
          if (f.cardType) searchOptions.cardType = f.cardType as SearchOptions['cardType']
          if (f.attributes.length > 0) searchOptions.attributes = f.attributes as SearchOptions['attributes']
          if (f.races.length > 0) searchOptions.races = f.races as SearchOptions['races']
          if (f.levelValues.length > 0) searchOptions.levels = f.levelValues
          if (f.atk.min !== undefined || f.atk.max !== undefined) {
            searchOptions.atk = { from: f.atk.min, to: f.atk.max }
          }
          if (f.def.min !== undefined || f.def.max !== undefined) {
            searchOptions.def = { from: f.def.min, to: f.def.max }
          }
          if (f.monsterTypes.length > 0) {
            const normalTypes = f.monsterTypes.filter(mt => mt.state === 'normal').map(mt => mt.type)
            const notTypes = f.monsterTypes.filter(mt => mt.state === 'not').map(mt => mt.type)
            if (normalTypes.length > 0) searchOptions.monsterTypes = normalTypes as SearchOptions['monsterTypes']
            if (notTypes.length > 0) searchOptions.excludeMonsterTypes = notTypes as SearchOptions['excludeMonsterTypes']
            // normalTypesまたはnotTypesがある場合、AND/OR論理演算を設定
            if (normalTypes.length > 0 || notTypes.length > 0) {
              searchOptions.monsterTypeLogic = f.monsterTypeMatchMode === 'and' ? 'AND' : 'OR'
            }
          }
          if (f.linkValues.length > 0) searchOptions.linkNumbers = f.linkValues
          if (f.linkMarkers.length > 0) {
            searchOptions.linkMarkers = f.linkMarkers
            searchOptions.linkMarkerLogic = f.linkMarkerMatchMode === 'and' ? 'AND' : 'OR'
          }
          if (f.scaleValues.length > 0) searchOptions.pendulumScales = f.scaleValues
          if (f.spellTypes.length > 0) searchOptions.spellEffectTypes = f.spellTypes as SearchOptions['spellEffectTypes']
          if (f.trapTypes.length > 0) searchOptions.trapEffectTypes = f.trapTypes as SearchOptions['trapEffectTypes']
          if (f.releaseDate.from || f.releaseDate.to) {
            searchOptions.releaseDate = {}
            if (f.releaseDate.from) {
              const [year, month, day] = f.releaseDate.from.split('-').map(Number)
              searchOptions.releaseDate.start = { year, month, day }
            }
            if (f.releaseDate.to) {
              const [year, month, day] = f.releaseDate.to.split('-').map(Number)
              searchOptions.releaseDate.end = { year, month, day }
            }
          }

          results = await searchCards(searchOptions)
        }

        // 検索APIを呼び出したのでグローバル検索モードを終了
        deckStore.isGlobalSearchMode = false

        // 検索結果をstore用の形式に変換
        deckStore.searchResults = results as unknown as typeof deckStore.searchResults
        deckStore.allResults = results as unknown as typeof deckStore.allResults

        if (results.length >= 100) {
          deckStore.hasMore = true
          // autoモード以外の場合のみ、拡張検索を実行
          if (searchOptions !== null) {
            setTimeout(async () => {
              try {
                const { searchCards } = await import('../api/card-search')
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
          }
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
      showMydeckDropdown,
      searchFilters,
      hasActiveFilters,
      filterCount,
      displayFilterIcons,
      isCommandMode,
      commandPrefix,
      filterChips,
      pendingCommand,
      isValidCommandInput,
      currentPlaceholder,
      filteredSuggestions,
      selectedSuggestionIndex,
      mydeckSuggestions,
      selectedMydeckIndex,
      isBottomPosition,
      commandSuggestions,
      selectedCommandIndex,
      selectCommand,
      selectSearchMode,
      handleFilterApply,
      handleSearch,
      handleInput,
      handleFocus,
      handleKeydown,
      handleEnter,
      handleEscape,
      removeFilterChip,
      selectSuggestion,
      selectMydeck
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
  min-width: 0;
  box-sizing: border-box;
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
  flex-direction: column;
  flex: 1;
  min-width: 0;
  position: relative;
  overflow: visible;
  justify-content: center;

  &.command-mode {
    background: var(--command-mode-bg);
    border-radius: 4px;
    padding: 2px 4px;
    margin: 0 4px;
  }
}

/* SearchFilterDialogで選択した条件（上部） */
.filter-icons-top {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  width: 100%;
  padding: 0 4px;
  align-items: center;
  overflow: hidden;
}

/* compactモード（right側）では最大幅を制限 */
.compact .filter-icons-top {
  max-width: 150px;
}

/* 入力行 */
.input-row {
  display: flex;
  align-items: center;
  width: 100%;
  position: relative;
}

/* スラッシュコマンドのチップ（左側） */
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
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-primary, #333);
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-tertiary, #e0e0e0);
    border-color: var(--text-tertiary, #999);
  }

  &.not-condition {
    background: var(--color-error-bg);
    border-color: var(--color-error);
    color: var(--color-error-text);

    &:hover {
      background: var(--color-error-hover-bg);
      border-color: var(--color-error);
    }

    .not-prefix {
      font-weight: 700;
      margin-right: 1px;
    }

    .chip-remove {
      color: var(--color-error);

      &:hover {
        color: var(--color-error-text);
      }
    }
  }

  .chip-remove {
    font-size: 10px;
    color: var(--text-tertiary, #999);
    margin-left: 2px;

    &:hover {
      color: var(--text-primary, #333);
    }
  }
}

/* 有効入力の視覚フィードバック */
.search-input.valid-input {
  color: var(--color-success);
  font-weight: 600;
}

/* 候補リストドロップダウン */
.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  margin-top: 4px;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;

  &.dropdown-above {
    top: auto;
    bottom: 100%;
    margin-top: 0;
    margin-bottom: 4px;
  }
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  &.selected {
    background: var(--color-success);
    color: var(--button-text);

    .suggestion-value {
      color: var(--button-text);
    }

    .suggestion-label {
      color: var(--button-text);
    }
  }

  &:first-child {
    border-radius: 8px 8px 0 0;
  }

  &:last-child {
    border-radius: 0 0 8px 8px;
  }
}

.suggestion-value {
  font-weight: 600;
  color: var(--text-secondary, #666);
  font-size: 12px;
}

.suggestion-label {
  color: var(--text-primary, #333);
  font-size: 13px;
  font-weight: 600;
}

.command-prefix {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  margin-right: 4px;
  background: var(--color-info);
  color: var(--button-text);
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
  background: var(--bg-primary);
  border: 2px solid transparent;
  border-radius: 20px;
  padding: 2px 10px;
  height: 44px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: border-color 0.2s, box-shadow 0.2s;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;

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
  padding: 4px 8px;
  background: transparent;
  color: var(--text-primary, #333);
  line-height: 1.2;
  min-width: 80px;

  &::placeholder {
    color: var(--text-tertiary, #999);
  }
}

.left-buttons {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex-shrink: 0;
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  flex: 1;
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
  color: var(--button-text);
  border-radius: 6px;
}

.search-mode-btn {
  background: transparent;
  border: none;
  padding: 2px 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: var(--text-secondary, #666);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 48px;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary);
  }

  .mode-text {
    font-size: 10px;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.mode-dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.mydeck-suggestions {
  z-index: 1000;
}

.mode-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  margin-top: 4px;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 160px;

  &.dropdown-above {
    top: auto;
    bottom: 100%;
    margin-top: 0;
    margin-bottom: 4px;
  }
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
