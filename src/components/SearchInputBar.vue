<template>
  <div class="search-input-wrapper">
    <div class="search-input-bar" :class="{ compact: compact }">
      <div class="left-buttons">
        <button v-show="!deckStore.isFilterDialogVisible" class="menu-btn" :class="{ active: hasActiveFilters }" @click.stop="deckStore.isFilterDialogVisible = true" title="フィルター">
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
          <div class="mode-option" @click="selectSearchMode('auto')">自動</div>
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
      <div class="input-container" :class="{
        'command-mode': isCommandMode || pendingCommand,
        'valid': pendingCommand && isValidCommandInput
      }">
        <!-- SearchFilterDialogで選択した条件（上部） - 常に表示 -->
        <div class="filter-icons-top">
          <!-- 予定チップ（入力が有効な場合のみ） -->
          <span
            v-if="previewChip"
            class="filter-icon-item filter-chip-preview"
            :class="{ 'not-condition': previewChip.isNot }"
            title="Enter で追加"
          >
            <span v-if="previewChip.isNot" class="not-prefix">!</span>{{ previewChip.label }}
          </span>

          <!-- SearchFilterDialogで選択した条件 -->
          <span
            v-for="(icon, index) in displayFilterIcons"
            :key="`icon-${index}`"
            class="filter-icon-item"
            :class="icon.type"
          >{{ icon.label }}</span>
          <button
            v-if="hasActiveFilters || filterChips.length > 0"
            class="clear-filters-btn-top"
            @click="clearAllFilters"
            title="検索条件をクリア"
          >×</button>
        </div>
        <!-- 入力行 -->
        <div class="input-row">
          <!-- コマンドモード表示 -->
          <span v-if="pendingCommand" class="command-prefix">{{ pendingCommand.command }}</span>
          <input
          ref="inputRef"
          v-model="deckStore.searchQuery"
          type="text"
          class="search-input"
          :class="{
            'has-prefix': pendingCommand,
            [placeholderSizeClass]: true
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
        title="入力をクリア"
      >
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
        </svg>
      </button>

      <!-- position="bottom"の場合はダイアログを表示しない（循環参照回避） -->
      <SearchFilterDialog
        v-if="position !== 'bottom'"
        :is-visible="deckStore.isFilterDialogVisible"
        :initial-filters="searchFilters"
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
import {
  MONSTER_TYPE_ID_TO_SHORTNAME,
  CARD_TYPE_ID_TO_SHORTNAME,
  ATTRIBUTE_ID_TO_NAME
} from '../types/card-maps'
import type { SearchMode } from '../types/settings'
import { getTempCardDB } from '../utils/temp-card-db'
import { convertFiltersToIcons } from '../utils/filter-icons'
import { getRaceLabel } from '../utils/filter-label'
import { detectLanguage } from '../utils/language-detector'
import {
  ATTRIBUTE_REVERSE_MAP,
  CARD_TYPE_REVERSE_MAP,
  MONSTER_TYPE_REVERSE_MAP
} from '../utils/reverse-map-generator'
import { mappingManager } from '../utils/mapping-manager'

// 全角数字を半角に変換
const toHalfWidth = (str: string): string => {
  return str.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
}

// 柔軟な日付解析（様々な区切り文字に対応）
const parseFlexibleDate = (dateStr: string): string | null => {
  // 区切りなしの特殊ケース: 20200101
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }

  // 区切りありの場合：正規表現で数値と非数値を区別
  // YYYY<sep>MM<sep>DD の形式（<sep>は任意の非数値文字）
  const match = dateStr.match(/^(\d{4})\D(\d{2})\D(\d{2})$/)
  if (match) {
    const [, year, month, day] = match
    return `${year}-${month}-${day}`
  }

  return null
}

// コマンド定義
const COMMANDS: Record<string, { filterType: string; description: string; isNot?: boolean; isAction?: boolean }> = {
  '/attr': { filterType: 'attributes', description: '属性' },
  '/race': { filterType: 'races', description: '種族' },
  '/level': { filterType: 'levels', description: 'レベル/ランク' },
  '/rank': { filterType: 'levels', description: 'レベル/ランク' }, // levelのエイリアス
  '/atk': { filterType: 'atk', description: 'ATK' },
  '/def': { filterType: 'def', description: 'DEF' },
  '/type': { filterType: 'cardType', description: 'カードタイプ' },
  '/link': { filterType: 'linkNumbers', description: 'リンク数' },
  '/lm': { filterType: 'linkMarkers', description: 'リンクマーカー' },
  '/link-marker': { filterType: 'linkMarkers', description: 'リンクマーカー' },
  '/mtype': { filterType: 'monsterTypes', description: 'モンスタータイプ' },
  '/pscale': { filterType: 'pendulumScales', description: 'Pスケール' },
  '/ps': { filterType: 'pendulumScales', description: 'Pスケール' },
  '/date': { filterType: 'releaseDate', description: '発売日' },
  '/search': { filterType: 'searchMode', description: '検索モード' },
  // NOT条件
  '/attr-not': { filterType: 'attributes', description: '属性(除外)', isNot: true },
  '/race-not': { filterType: 'races', description: '種族(除外)', isNot: true },
  '/level-not': { filterType: 'levels', description: 'レベル(除外)', isNot: true },
  '/rank-not': { filterType: 'levels', description: 'レベル(除外)', isNot: true },
  '/type-not': { filterType: 'cardType', description: 'タイプ(除外)', isNot: true },
  '/link-not': { filterType: 'linkNumbers', description: 'リンク(除外)', isNot: true },
  '/mtype-not': { filterType: 'monsterTypes', description: 'Mタイプ(除外)', isNot: true },
  // クリアコマンド
  '/clear': { filterType: 'action', description: '全てクリア', isAction: true },
  '/clear-cond': { filterType: 'action', description: '条件クリア', isAction: true },
  '/clear-text': { filterType: 'action', description: 'テキストクリア', isAction: true },
  '/clear-one-cond': { filterType: 'action', description: '条件を選択して削除', isAction: true }
}

// 検索モードマッピング
const SEARCH_MODE_MAP: Record<string, string> = {
  'name': 'name', 'カード名': 'name', 'n': 'name',
  'text': 'text', 'テキスト': 'text', 't': 'text',
  'pend': 'pendulum', 'pendulum': 'pendulum', 'ペンデュラム': 'pendulum', 'p': 'pendulum',
  'mydeck': 'mydeck', 'マイデッキ': 'mydeck', 'd': 'mydeck'
}

// 属性マッピング（日本語/英語 -> APIキー）
// 逆引きマップは reverse-map-generator.ts から動的生成（REQ-20対応）
const ATTRIBUTE_MAP = ATTRIBUTE_REVERSE_MAP
const CARD_TYPE_MAP = CARD_TYPE_REVERSE_MAP
const MONSTER_TYPE_MAP = MONSTER_TYPE_REVERSE_MAP

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
    const searchMode = computed({
      get: () => settingsStore.appSettings.defaultSearchMode || 'auto',
      set: (value: SearchMode) => {
        settingsStore.appSettings.defaultSearchMode = value
      }
    })

    const showSearchModeDropdown = ref(false)
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

    // リンクマーカーの文字列→数値マッピング
    const LINK_MARKER_MAP: Record<string, number> = {
      'bottom-left': 1,
      'bottom': 2,
      'bottom-right': 4,
      'left': 8,
      'right': 16,
      'top-left': 32,
      'top': 64,
      'top-right': 128
    }

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
      linkMarkers: [
        { value: 'top', label: '上' }, { value: 'bottom', label: '下' },
        { value: 'left', label: '左' }, { value: 'right', label: '右' },
        { value: 'top-left', label: '左上' }, { value: 'top-right', label: '右上' },
        { value: 'bottom-left', label: '左下' }, { value: 'bottom-right', label: '右下' }
      ],
      pendulumScales: [
        { value: '0', label: '0' }, { value: '1', label: '1' }, { value: '2', label: '2' },
        { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' },
        { value: '6', label: '6' }, { value: '7', label: '7' }, { value: '8', label: '8' },
        { value: '9', label: '9' }, { value: '10', label: '10' }, { value: '11', label: '11' },
        { value: '12', label: '12' }, { value: '13', label: '13' }
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

    // 現在設定されている条件のリストを生成
    const activeFiltersOptions = computed(() => {
      const options: { value: string; label: string }[] = []
      const f = searchFilters.value

      // チップから追加
      filterChips.value.forEach((chip, index) => {
        options.push({
          value: `chip-${index}`,
          label: `${chip.isNot ? '!' : ''}${chip.label} (チップ)`
        })
      })

      // SearchFilterDialogから追加された条件
      if (f.cardType) {
        options.push({ value: 'cardType', label: `カードタイプ: ${f.cardType}` })
      }
      f.attributes.forEach(attr => {
        options.push({ value: `attr-${attr}`, label: `属性: ${attr}` })
      })
      f.races.forEach(race => {
        options.push({ value: `race-${race}`, label: `種族: ${getRaceLabel(race)}` })
      })
      f.levelValues.forEach(level => {
        options.push({ value: `level-${level}`, label: `レベル: ${level}` })
      })
      f.linkValues.forEach(link => {
        options.push({ value: `link-${link}`, label: `リンク: ${link}` })
      })
      f.monsterTypes.forEach(mt => {
        options.push({ value: `mtype-${mt.type}`, label: `モンスタータイプ: ${mt.type}` })
      })
      if (f.atk.min !== undefined || f.atk.max !== undefined) {
        options.push({ value: 'atk', label: `ATK条件` })
      }
      if (f.def.min !== undefined || f.def.max !== undefined) {
        options.push({ value: 'def', label: `DEF条件` })
      }

      return options
    })

    // 現在の入力に基づいてフィルタリングされた候補
    const filteredSuggestions = computed(() => {
      if (!pendingCommand.value) return []

      // /clear-one-condの場合は現在の条件リストを返す
      if (pendingCommand.value.command === '/clear-one-cond') {
        const input = actualInputValue.value.toLowerCase()
        if (!input) return activeFiltersOptions.value
        return activeFiltersOptions.value.filter(opt =>
          opt.label.toLowerCase().includes(input)
        )
      }

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
        default: return 'auto'
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
      return convertFiltersToIcons(searchFilters.value)
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
        case 'levels': {
          // 単一の数値、範囲（4-8）、カンマ区切り（3,5）を受け付ける
          if (/^\d+$/.test(value)) {
            const level = parseInt(value, 10)
            return !isNaN(level) && level >= 1 && level <= 12
          }
          if (/^\d+-\d+$/.test(value)) {
            const [start, end] = value.split('-').map(Number)
            return start >= 1 && start <= 12 && end >= 1 && end <= 12 && start <= end
          }
          if (/^\d+(,\d+)+$/.test(value)) {
            const levels = value.split(',').map(Number)
            return levels.every(l => l >= 1 && l <= 12)
          }
          return false
        }
        case 'linkNumbers': {
          // 単一の数値、カンマ区切り（2,4）を受け付ける
          if (/^\d+$/.test(value)) {
            const link = parseInt(value, 10)
            return !isNaN(link) && link >= 1 && link <= 6
          }
          if (/^\d+(,\d+)+$/.test(value)) {
            const links = value.split(',').map(Number)
            return links.every(l => l >= 1 && l <= 6)
          }
          return false
        }
        case 'linkMarkers': {
          // リンクマーカーの選択肢をチェック
          const markerOptions = FILTER_OPTIONS.linkMarkers
          return markerOptions.some(opt => opt.value.toLowerCase() === value || opt.label.toLowerCase() === value)
        }
        case 'pendulumScales': {
          // 単一の数値、範囲（1-8）、カンマ区切り（1,8）を受け付ける
          if (/^\d+$/.test(value)) {
            const scale = parseInt(value, 10)
            return !isNaN(scale) && scale >= 0 && scale <= 13
          }
          if (/^\d+-\d+$/.test(value)) {
            const [start, end] = value.split('-').map(Number)
            return start >= 0 && start <= 13 && end >= 0 && end <= 13 && start <= end
          }
          if (/^\d+(,\d+)+$/.test(value)) {
            const scales = value.split(',').map(Number)
            return scales.every(s => s >= 0 && s <= 13)
          }
          return false
        }
        case 'releaseDate': {
          // 片方のみの範囲指定: 2020-01-01- or -2020-12-31
          if (/^-/.test(value)) {
            const dateStr = value.substring(1).trim()
            return parseFlexibleDate(dateStr) !== null
          }
          if (/-$/.test(value)) {
            const dateStr = value.substring(0, value.length - 1).trim()
            return parseFlexibleDate(dateStr) !== null
          }

          // 範囲指定: チルダ、スペース、ハイフン（ドット区切りの場合）
          // チルダ区切り: 2020-01-01~2020-12-31
          if (value.includes('~')) {
            const parts = value.split('~').map(s => s.trim())
            return parts.length === 2 && parts.every(p => parseFlexibleDate(p) !== null)
          }
          // スペース区切り: 2020-01-01 2020-12-31
          if (value.includes(' ')) {
            const parts = value.split(/\s+/).filter(s => s.length > 0)
            return parts.length === 2 && parts.every(p => parseFlexibleDate(p) !== null)
          }
          // ドット区切り日付同士のハイフン区切り: 2020.01.01-2020.12.31
          if (value.includes('.') && value.includes('-')) {
            const parts = value.split('-').map(s => s.trim())
            if (parts.length === 2 && parts.every(p => /^\d{4}\.\d{2}\.\d{2}$/.test(p))) {
              return parts.every(p => parseFlexibleDate(p) !== null)
            }
          }

          // 単一の日付
          return parseFlexibleDate(value) !== null
        }
        case 'atk':
        case 'def':
          // 片方のみの範囲指定: 1000- or -2000
          if (/^\d+-$/.test(value) || /^-\d+$/.test(value)) {
            return true
          }
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
        const cmd = pendingCommand.value.command
        // コマンドごとに詳細なプレースホルダーを表示
        const detailedPlaceholders: Record<string, string> = {
          '/attr': '光, dark, 闇',
          '/race': 'ドラゴン, warrior, 戦士',
          '/level': '4, 8 or 4-8',
          '/rank': '4, 8 or 4-8',
          '/atk': '1000, 1000-, -2000, 1000-2000',
          '/def': '2000, 2000-, -1000, 0-1000',
          '/type': 'モンスター, spell, 魔法',
          '/link': '2, 4',
          '/lm': '上, top, 左上',
          '/link-marker': '上, top, 左上',
          '/mtype': '効果, fusion, シンクロ',
          '/pscale': '1, 8 or 1-8',
          '/ps': '1, 8 or 1-8',
          '/date': '2020-01-01 or 2020-01-01~2020-12-31',
          '/search': 'name, text, mydeck',
          '/attr-not': '-光, -dark（除外）',
          '/race-not': '-ドラゴン（除外）',
          '/level-not': '-4（除外）',
          '/rank-not': '-4（除外）',
          '/type-not': '-魔法（除外）',
          '/link-not': '-2（除外）',
          '/mtype-not': '-効果（除外）'
        }
        return detailedPlaceholders[cmd] || `${COMMANDS[cmd]?.description || '値'}を入力...`
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

    // placeholderの長さに応じたクラスを返す
    const placeholderSizeClass = computed(() => {
      const length = currentPlaceholder.value.length
      if (length > 20) return 'placeholder-small'
      if (length > 15) return 'placeholder-medium'
      return ''
    })

    // 予定チップ（入力が有効な場合のみ表示）
    const previewChip = computed<{ label: string; isNot: boolean; filterType: string; value: string } | null>(() => {
      // 両方の条件を明示的にチェック
      const hasPendingCommand = !!pendingCommand.value
      const hasValidInput = isValidCommandInput.value
      
      if (!hasPendingCommand || !hasValidInput) return null

      const value = actualInputValue.value
      const filterType = pendingCommand.value!.filterType
      const isNot = isNegatedInput.value

      let label = ''
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
          const raceOptions = FILTER_OPTIONS.races
          const option = raceOptions.find(opt => {
            if (opt.value.toLowerCase() === value || opt.label.toLowerCase() === value) return true
            const aliases = (opt as { aliases?: string[] }).aliases
            return aliases?.some(alias => alias.toLowerCase() === value)
          })
          mappedValue = option?.value || value
          break
        }
        case 'searchMode':
          mappedValue = SEARCH_MODE_MAP[value] || value
          break
        case 'linkMarkers': {
          const markerOptions = FILTER_OPTIONS.linkMarkers
          const option = markerOptions.find(opt =>
            opt.value.toLowerCase() === value || opt.label.toLowerCase() === value
          )
          mappedValue = option?.value || value
          break
        }
      }

      label = getChipLabel(filterType, mappedValue)

      return { label, isNot, filterType, value: mappedValue }
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
          // フォールバック：card-maps.ts から取得
          return ATTRIBUTE_ID_TO_NAME[value as keyof typeof ATTRIBUTE_ID_TO_NAME] || value
        }
        case 'cardType': {
          return CARD_TYPE_ID_TO_SHORTNAME[value as keyof typeof CARD_TYPE_ID_TO_SHORTNAME] || value
        }
        case 'monsterTypes': {
          // card-maps.ts の MONSTER_TYPE_ID_TO_SHORTNAME を使用
          return MONSTER_TYPE_ID_TO_SHORTNAME[value as keyof typeof MONSTER_TYPE_ID_TO_SHORTNAME] || value
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
          return getRaceLabel(value)
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
      // 全角数字を半角に自動変換
      if (deckStore.searchQuery !== toHalfWidth(deckStore.searchQuery)) {
        deckStore.searchQuery = toHalfWidth(deckStore.searchQuery)
        return
      }

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

          // アクションコマンドで値入力が不要な場合は即座に実行
          if (cmdDef.isAction && (cmd === '/clear' || cmd === '/clear-cond' || cmd === '/clear-text')) {
            pendingCommand.value = {
              command: cmd,
              filterType: cmdDef.filterType,
              isNot: cmdDef.isNot
            }
            addFilterChip() // 即座に実行
            return
          }

          // 前の状態をクリア（予定チップが残らないようにするため）
          selectedSuggestionIndex.value = -1
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

      // スラッシュコマンドの選択肢のTab/Arrow処理
      if (pendingCommand.value && filteredSuggestions.value.length > 0) {
        const updateInput = (index: number) => {
          const selected = filteredSuggestions.value[index]
          if (selected) {
            const prefix = isNegatedInput.value ? '-' : ''
            deckStore.searchQuery = prefix + selected.value
          }
        }

        const onConfirm = (suggestion: any) => {
          const prefix = isNegatedInput.value ? '-' : ''
          deckStore.searchQuery = prefix + suggestion.value
          nextTick(() => {
            addFilterChip()
          })
        }

        // Tabキーで候補を選択して入力に反映
        if (event.key === 'Tab') {
          if (handleSuggestionNavigation(event, selectedSuggestionIndex, filteredSuggestions.value, onConfirm, '.suggestions-dropdown')) {
            // Tabでは入力に即座に反映
            updateInput(selectedSuggestionIndex.value)
          }
          return
        }

        // ArrowUp/Downキーで候補を選択（入力は反映しない）
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          if (handleSuggestionNavigation(event, selectedSuggestionIndex, filteredSuggestions.value, onConfirm, '.suggestions-dropdown')) {
            return
          }
        }
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
    }

    // 全ての検索条件をクリア
    const clearAllFilters = () => {
      searchFilters.value = {
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
      }
      filterChips.value = []
    }

    // フィルターチップを追加
    const addFilterChip = () => {
      if (!pendingCommand.value) return

      const value = actualInputValue.value
      const filterType = pendingCommand.value.filterType

      // アクションコマンドの処理
      if (filterType === 'action') {
        const cmd = pendingCommand.value.command
        if (cmd === '/clear') {
          // 全てクリア
          clearAllFilters()
          deckStore.searchQuery = ''
        } else if (cmd === '/clear-cond') {
          // 条件だけクリア
          clearAllFilters()
        } else if (cmd === '/clear-text') {
          // テキストだけクリア
          deckStore.searchQuery = ''
        } else if (cmd === '/clear-one-cond') {
          // 条件を選択して削除
          if (!value) {
            // 値が入力されていない場合は何もしない（候補リスト表示のみ）
            pendingCommand.value = null
            return
          }

          // 選択された条件を削除
          const selectedValue = value
          const f = searchFilters.value

          if (selectedValue.startsWith('chip-')) {
            // チップを削除
            const index = parseInt(selectedValue.replace('chip-', ''), 10)
            if (index >= 0 && index < filterChips.value.length) {
              removeFilterChip(index)
            }
          } else if (selectedValue === 'cardType') {
            f.cardType = null
          } else if (selectedValue.startsWith('attr-')) {
            const attr = selectedValue.replace('attr-', '')
            const idx = f.attributes.indexOf(attr as Attribute)
            if (idx !== -1) f.attributes.splice(idx, 1)
          } else if (selectedValue.startsWith('race-')) {
            const race = selectedValue.replace('race-', '')
            const idx = f.races.indexOf(race as Race)
            if (idx !== -1) f.races.splice(idx, 1)
          } else if (selectedValue.startsWith('level-')) {
            const level = parseInt(selectedValue.replace('level-', ''), 10)
            const idx = f.levelValues.indexOf(level)
            if (idx !== -1) f.levelValues.splice(idx, 1)
          } else if (selectedValue.startsWith('link-')) {
            const link = parseInt(selectedValue.replace('link-', ''), 10)
            const idx = f.linkValues.indexOf(link)
            if (idx !== -1) f.linkValues.splice(idx, 1)
          } else if (selectedValue.startsWith('mtype-')) {
            const mtype = selectedValue.replace('mtype-', '')
            const idx = f.monsterTypes.findIndex(mt => mt.type === mtype)
            if (idx !== -1) f.monsterTypes.splice(idx, 1)
          } else if (selectedValue === 'atk') {
            f.atk = { exact: false, unknown: false }
          } else if (selectedValue === 'def') {
            f.def = { exact: false, unknown: false }
          }

          pendingCommand.value = null
          deckStore.searchQuery = ''
        } else {
          pendingCommand.value = null
        }
        return
      }

      if (!value) return

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
        pendingCommand.value = null
        deckStore.searchQuery = ''
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

      // 実際のフィルターに適用
      applyChipToFilters(filterType, mappedValue, isNot)

      // 入力をクリア（previewChipを消すため）
      pendingCommand.value = null
      deckStore.searchQuery = ''
      selectedSuggestionIndex.value = -1
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
          // 範囲（4-8）、カンマ区切り（3,5）、単一の数値を処理
          if (value.includes('-')) {
            const [start, end] = value.split('-').map(v => parseInt(v, 10))
            for (let i = start; i <= end; i++) {
              if (!f.levelValues.includes(i)) {
                f.levelValues.push(i)
              }
            }
          } else if (value.includes(',')) {
            const levels = value.split(',').map(v => parseInt(v, 10))
            levels.forEach(level => {
              if (!isNaN(level) && !f.levelValues.includes(level)) {
                f.levelValues.push(level)
              }
            })
          } else {
            const level = parseInt(value, 10)
            if (!isNaN(level) && !f.levelValues.includes(level)) {
              f.levelValues.push(level)
            }
          }
          break
        }
        case 'atk': {
          const parts = value.split('-')
          if (parts.length === 2) {
            const min = parts[0] ? parseInt(parts[0], 10) : undefined
            const max = parts[1] ? parseInt(parts[1], 10) : undefined
            if (min !== undefined && !isNaN(min)) f.atk.min = min
            if (max !== undefined && !isNaN(max)) f.atk.max = max
          } else {
            const val = parseInt(value, 10)
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
            const min = parts[0] ? parseInt(parts[0], 10) : undefined
            const max = parts[1] ? parseInt(parts[1], 10) : undefined
            if (min !== undefined && !isNaN(min)) f.def.min = min
            if (max !== undefined && !isNaN(max)) f.def.max = max
          } else {
            const val = parseInt(value, 10)
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
          // カンマ区切り（2,4）、単一の数値を処理
          if (value.includes(',')) {
            const links = value.split(',').map(v => parseInt(v, 10))
            links.forEach(link => {
              if (!isNaN(link) && !f.linkValues.includes(link)) {
                f.linkValues.push(link)
              }
            })
          } else {
            const link = parseInt(value, 10)
            if (!isNaN(link) && !f.linkValues.includes(link)) {
              f.linkValues.push(link)
            }
          }
          break
        }
        case 'linkMarkers': {
          // リンクマーカーの文字列を数値に変換
          const markerValue = LINK_MARKER_MAP[value]
          if (markerValue !== undefined && !f.linkMarkers.includes(markerValue)) {
            f.linkMarkers.push(markerValue)
          }
          break
        }
        case 'pendulumScales': {
          // 範囲（1-8）、カンマ区切り（1,8）、単一の数値を処理
          if (value.includes('-')) {
            const [start, end] = value.split('-').map(v => parseInt(v, 10))
            for (let i = start; i <= end; i++) {
              if (!f.scaleValues.includes(i)) {
                f.scaleValues.push(i)
              }
            }
          } else if (value.includes(',')) {
            const scales = value.split(',').map(v => parseInt(v, 10))
            scales.forEach(scale => {
              if (!isNaN(scale) && !f.scaleValues.includes(scale)) {
                f.scaleValues.push(scale)
              }
            })
          } else {
            const scale = parseInt(value, 10)
            if (!isNaN(scale) && !f.scaleValues.includes(scale)) {
              f.scaleValues.push(scale)
            }
          }
          break
        }
        case 'releaseDate': {
          // YYYY-MM-DD or YYYY-MM-DD~YYYY-MM-DD 形式
          if (value.includes('~')) {
            const [from, to] = value.split('~')
            f.releaseDate.from = from
            f.releaseDate.to = to
          } else {
            f.releaseDate.from = value
            f.releaseDate.to = value
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
          const level = parseInt(value, 10)
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
          const link = parseInt(value, 10)
          const idx = f.linkValues.indexOf(link)
          if (idx !== -1) f.linkValues.splice(idx, 1)
          break
        }
        case 'linkMarkers': {
          const markerValue = LINK_MARKER_MAP[value]
          if (markerValue !== undefined) {
            const idx = f.linkMarkers.indexOf(markerValue)
            if (idx !== -1) f.linkMarkers.splice(idx, 1)
          }
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
          const level = parseInt(value, 10)
          if (!isNaN(level) && level >= 1 && level <= 12 && !f.levelValues.includes(level)) {
            f.levelValues.push(level)
          }
          break
        }
        case 'atk': {
          // ATK:1000-2000 または ATK:1000 形式
          const parts = value.split('-')
          if (parts.length === 2) {
            const min = parts[0] ? parseInt(parts[0], 10) : undefined
            const max = parts[1] ? parseInt(parts[1], 10) : undefined
            if (min !== undefined && !isNaN(min)) f.atk.min = min
            if (max !== undefined && !isNaN(max)) f.atk.max = max
          } else if (parts.length === 1) {
            const val = parseInt(parts[0], 10)
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
            const min = parts[0] ? parseInt(parts[0], 10) : undefined
            const max = parts[1] ? parseInt(parts[1], 10) : undefined
            if (min !== undefined && !isNaN(min)) f.def.min = min
            if (max !== undefined && !isNaN(max)) f.def.max = max
          } else if (parts.length === 1) {
            const val = parseInt(parts[0], 10)
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
          const link = parseInt(value, 10)
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
      settingsStore.setDefaultSearchMode(mode)
      showSearchModeDropdown.value = false
    }

    const handleFilterApply = (filters: typeof searchFilters.value) => {
      searchFilters.value = filters
      // ダイアログを閉じる
      deckStore.isFilterDialogVisible = false
      if (deckStore.searchQuery.trim()) {
        handleSearch()
      }
    }

    // クライアント側でフィルター条件を適用
    const applyClientSideFilters = (cards: CardInfo[], filters: SearchFilters): CardInfo[] => {
      return cards.filter(card => {
        // モンスターカードのみに適用されるフィルター
        if (card.cardType === 'monster') {
          // 属性フィルター
          if (filters.attributes.length > 0) {
            if (!('attribute' in card) || !filters.attributes.includes(card.attribute as Attribute)) {
              return false
            }
          }
          
          // 種族フィルター
          if (filters.races.length > 0) {
            if (!('race' in card) || !filters.races.includes(card.race as Race)) {
              return false
            }
          }
          
          // レベルフィルター
          if (filters.levelValues.length > 0 && 'level' in card) {
            if (typeof card.level === 'number' && !filters.levelValues.includes(card.level)) {
              return false
            }
          }
          
          // リンク値フィルター
          if (filters.linkValues.length > 0 && 'link' in card) {
            if (typeof card.link === 'number' && !filters.linkValues.includes(card.link)) {
              return false
            }
          }
        }
        
        return true
      })
    }

    const handleSearch = async () => {
      // フィルターダイアログを自動クローズ
      deckStore.isFilterDialogVisible = false

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
      let searchType = searchTypeMap[searchMode.value] || '1'  // autoモードから委譲する場合があるのでlet

      try {
        const apiSort = SORT_ORDER_TO_API_VALUE[deckStore.sortOrder] || 1
        const keyword = deckStore.searchQuery.trim()

        // 検索実行時に動的import
        const { searchCards, searchCardsAuto } = await import('../api/card-search')

        // autoモードの場合は専用の関数を使用
        let results: CardInfo[] = []  // 初期化
        let searchOptions: SearchOptions | null = null
        let delegatedToName = false  // autoモードからname検索に委譲したかどうか

        if (searchMode.value === 'auto') {
          const autoResult = await searchCardsAuto(keyword, 100, searchFilters.value.cardType as CardType | undefined)
          results = autoResult.cards
          const autoResultCount = results.length  // フィルタリング前の件数を保存

          // autoモードでもフィルター条件を適用（クライアント側でフィルタリング）
          results = applyClientSideFilters(results, searchFilters.value)

          // autoモードで100件取得された場合（フィルタリング前の件数で判定）、name検索に委譲して追加取得・sort順を有効化
          if (autoResultCount >= 100) {
            console.log('[handleSearch] autoモードで100件取得 → name検索に委譲')
            delegatedToName = true
            searchType = '1'  // name検索に切り替え
          }
        }

        if (searchMode.value !== 'auto' || delegatedToName) {
          // 通常の検索（またはautoモードから委譲された場合）
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
              const parts = f.releaseDate.from.split('-')
              const year: number = parseInt(parts[0], 10)
              const month: number = parseInt(parts[1], 10)
              const day: number = parseInt(parts[2], 10)
              searchOptions.releaseDate.start = { year, month, day }
            }
            if (f.releaseDate.to) {
              const parts = f.releaseDate.to.split('-')
              const year: number = parseInt(parts[0], 10)
              const month: number = parseInt(parts[1], 10)
              const day: number = parseInt(parts[2], 10)
              searchOptions.releaseDate.end = { year, month, day }
            }
          }

          console.log('[handleSearch] searchOptions:', JSON.stringify(searchOptions, null, 2))
          results = await searchCards(searchOptions)
          console.log('[handleSearch] results count:', results.length)
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
      placeholderSizeClass,
      previewChip,
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
      selectMydeck,
      clearAllFilters
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

    // 有効な入力時
    &.valid {
      background: var(--command-mode-valid-bg);
    }
  }
}

/* SearchFilterDialogで選択した条件（上部） - 常に1行分の高さを確保 */
.filter-icons-top {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  width: 100%;
  padding: 0 4px;
  align-items: center;
  overflow: hidden;
  min-height: 14px;
  position: relative;
}

/* compactモード（right側）では最大幅を制限 */
.compact .filter-icons-top {
  max-width: 150px;
}

/* 検索条件クリアボタン（右側） */
.clear-filters-btn-top {
  background: transparent;
  border: none;
  color: var(--text-tertiary, #999);
  font-size: 10px;
  font-weight: 300;
  cursor: pointer;
  padding: 0;
  border-radius: 50%;
  transition: all 0.2s;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  margin-left: 4px;

  &:hover {
    background: var(--color-error-bg);
    color: var(--color-error);
    transform: scale(1.2);
  }
}

/* 入力行 */
.input-row {
  display: flex;
  align-items: center;
  width: 100%;
  position: relative;
}

/* スラッシュコマンドで追加されたチップ（上部表示用） */
.filter-chip-top {
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-tertiary, #e0e0e0) !important;
    transform: scale(1.1);
  }

  &.not-condition {
    background: var(--color-error-bg) !important;
    border-color: var(--color-error) !important;
    color: var(--color-error-text) !important;

    &:hover {
      background: var(--color-error-hover-bg) !important;
      border-color: var(--color-error) !important;
    }

    .not-prefix {
      font-weight: 700;
      margin-right: 1px;
    }
  }
}

/* 予定チップ（入力が有効な場合のみ表示） */
.filter-chip-preview {
  background: #c8e6c9 !important; // 明るい緑
  border-color: #81c784 !important;
  color: #2e7d32 !important;
  font-weight: 600;
  animation: pulse 1.5s ease-in-out infinite;

  &.not-condition {
    background: #ffcdd2 !important; // NOT条件の場合は赤系
    border-color: #ef5350 !important;
    color: #c62828 !important;
  }

  .not-prefix {
    font-weight: 700;
    margin-right: 1px;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
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
  scroll-behavior: smooth;
  will-change: scroll-position; // ブラウザにスクロール最適化を事前通知
  transform: translateZ(0); // ハードウェアアクセラレーション有効化
  contain: layout; // レイアウト計算の最適化

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
  transform: translateZ(0); // ハードウェアアクセラレーション
  will-change: background-color; // 背景色変更の最適化

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  &.selected {
    transition: none; // キーボード操作時は即座に背景色を変更（ちらつき防止）
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
  transition: background-color 0.2s ease;

  &::placeholder {
    color: var(--text-tertiary, #999);
  }

  // placeholderの長さに応じてフォントサイズを調整
  &.placeholder-medium::placeholder {
    font-size: 12px;
  }

  &.placeholder-small::placeholder {
    font-size: 10px;
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
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  svg {
    display: block;
  }
}
</style>
