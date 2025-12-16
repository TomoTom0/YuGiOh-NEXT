/**
 * スラッシュコマンド関連のロジックを管理するComposable
 * コマンド解析、バリデーション、候補抽出を担当
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import {
  COMMANDS,
  SEARCH_MODE_MAP,
  ATTRIBUTE_MAP,
  CARD_TYPE_MAP,
  MONSTER_TYPE_MAP,
  FILTER_OPTIONS,
  parseFlexibleDate
} from '@/constants/search-constants'

export interface PendingCommand {
  command: string
  filterType: string
  isNot?: boolean
}

export interface CommandSuggestion {
  command: string
  description: string
}

export interface UseSlashCommandsOptions {
  searchQuery: Ref<string>
}

export interface UseSlashCommandsReturn {
  pendingCommand: Ref<PendingCommand | null>
  commandSuggestions: ComputedRef<CommandSuggestion[]>
  isValidCommandInput: ComputedRef<boolean>
  actualInputValue: ComputedRef<string>
  isNegatedInput: ComputedRef<boolean>
  isCommandMode: ComputedRef<boolean>
  detectCommandPattern: () => PendingCommand | null
  resetPendingCommand: () => void
}

export function useSlashCommands(options: UseSlashCommandsOptions): UseSlashCommandsReturn {
  const { searchQuery } = options

  const pendingCommand = ref<PendingCommand | null>(null)

  /**
   * コマンド候補（/ で始まる入力時）
   */
  const commandSuggestions = computed<CommandSuggestion[]>(() => {
    const query = searchQuery.value.trim()
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
        { command: '/mtype', description: 'モンスタータイプ' },
        { command: '/search', description: '検索モード' },
        { command: '/clear', description: '全てクリア' },
        { command: '/clear-cond', description: '条件クリア' },
        { command: '/clear-text', description: 'テキストクリア' },
        { command: '/history-search', description: '履歴から選択' },
        { command: '/favorite-search', description: 'お気に入りから選択' }
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

  /**
   * コマンドモードかどうかを判定
   */
  const isCommandMode = computed(() => {
    const query = searchQuery.value.trim()
    const commandMatch = Object.keys(COMMANDS).some(cmd => query.startsWith(cmd + ' '))
    return query.startsWith('/') && !pendingCommand.value && !commandMatch
  })

  /**
   * 入力値がNOT条件かどうかを判定（-プレフィックス）
   */
  const isNegatedInput = computed(() => {
    const value = searchQuery.value.trim()
    return value.startsWith('-') && value.length > 1
  })

  /**
   * 実際の値（-プレフィックスを除去）
   */
  const actualInputValue = computed(() => {
    const value = searchQuery.value.trim().toLowerCase()
    if (value.startsWith('-')) {
      return value.substring(1)
    }
    return value
  })

  /**
   * 現在の入力が有効かどうかを判定
   */
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
          const parts = value.split('-').map(Number)
          const start = parts[0]
          const end = parts[1]
          return start !== undefined && end !== undefined && start >= 1 && start <= 12 && end >= 1 && end <= 12 && start <= end
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
        return markerOptions ? markerOptions.some(opt => opt.value.toLowerCase() === value || opt.label.toLowerCase() === value) : false
      }
      case 'pendulumScales': {
        // 単一の数値、範囲（1-8）、カンマ区切り（1,8）を受け付ける
        if (/^\d+$/.test(value)) {
          const scale = parseInt(value, 10)
          return !isNaN(scale) && scale >= 0 && scale <= 13
        }
        if (/^\d+-\d+$/.test(value)) {
          const parts = value.split('-').map(Number)
          const start = parts[0]
          const end = parts[1]
          return start !== undefined && end !== undefined && start >= 0 && start <= 13 && end >= 0 && end <= 13 && start <= end
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
        return raceOptions ? raceOptions.some(opt => {
          if (opt.value.toLowerCase() === value || opt.label.toLowerCase() === value) {
            return true
          }
          const aliases = (opt as { aliases?: string[] }).aliases
          if (aliases) {
            return aliases.some(alias => alias.toLowerCase() === value)
          }
          return false
        }) : false
      }
      case 'searchMode':
        return SEARCH_MODE_MAP[value] !== undefined
      default:
        return false
    }
  })

  /**
   * コマンドパターンを検出（/cmd + スペース）
   */
  const detectCommandPattern = (): PendingCommand | null => {
    const query = searchQuery.value
    for (const cmd of Object.keys(COMMANDS)) {
      if (query === cmd + ' ') {
        const cmdDef = COMMANDS[cmd]
        if (cmdDef) {
          return {
            command: cmd,
            filterType: cmdDef.filterType,
            isNot: cmdDef.isNot
          }
        }
      }
    }
    return null
  }

  /**
   * pendingCommandをリセット
   */
  const resetPendingCommand = () => {
    pendingCommand.value = null
  }

  return {
    pendingCommand,
    commandSuggestions,
    isValidCommandInput,
    actualInputValue,
    isNegatedInput,
    isCommandMode,
    detectCommandPattern,
    resetPendingCommand
  }
}
