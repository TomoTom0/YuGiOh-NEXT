import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useSlashCommands } from '@/components/searchInputBar/composables/useSlashCommands'

describe('useSlashCommands', () => {
  describe('commandSuggestions', () => {
    it('[covers:use-slash-commands.slash-only-input-lists-major-commands] / で始まる入力時に主要コマンドを表示', () => {
      const searchQuery = ref('/')
      const { commandSuggestions } = useSlashCommands({ searchQuery })

      expect(commandSuggestions.value.length).toBeGreaterThan(0)
      expect(commandSuggestions.value).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ command: '/attr' }),
          expect.objectContaining({ command: '/race' }),
          expect.objectContaining({ command: '/level' })
        ])
      )
    })

    it('[covers:use-slash-commands.filters-commands-by-partial-match] 入力に一致するコマンドをフィルタ', () => {
      const searchQuery = ref('/at')
      const { commandSuggestions } = useSlashCommands({ searchQuery })

      const attrCommand = commandSuggestions.value.find(c => c.command === '/attr')
      expect(attrCommand).toBeDefined()
    })

    it('[covers:use-slash-commands.pending-command-suppresses-suggestions] [covers:use-slash-commands.detect-command-pattern-on-cmd-space] pendingCommandがある場合は候補を表示しない', () => {
      const searchQuery = ref('/attr ')
      const { commandSuggestions, pendingCommand, detectCommandPattern } = useSlashCommands({ searchQuery })

      // detectCommandPattern を呼び出して pendingCommand を設定
      const detected = detectCommandPattern()
      if (detected) {
        pendingCommand.value = detected
      }

      expect(commandSuggestions.value).toEqual([])
    })
  })

  describe('isValidCommandInput', () => {
    it('[covers:use-slash-commands.attr-valid-input-accepted] 属性コマンドの有効な入力を検証', () => {
      const searchQuery = ref('光')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/attr', filterType: 'attributes' }
      expect(isValidCommandInput.value).toBe(true)
    })

    it('[covers:use-slash-commands.attr-invalid-input-rejected] 属性コマンドの無効な入力を検証', () => {
      const searchQuery = ref('無効な属性')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/attr', filterType: 'attributes' }
      expect(isValidCommandInput.value).toBe(false)
    })

    it('[covers:use-slash-commands.level-single-value-validated] レベルコマンドで単一の数値を検証', () => {
      const searchQuery = ref('4')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/level', filterType: 'levels' }
      expect(isValidCommandInput.value).toBe(true)
    })

    it('[covers:use-slash-commands.level-range-validated] レベルコマンドで範囲指定を検証', () => {
      const searchQuery = ref('4-8')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/level', filterType: 'levels' }
      expect(isValidCommandInput.value).toBe(true)
    })

    it('[covers:use-slash-commands.level-comma-list-validated] レベルコマンドでカンマ区切りを検証', () => {
      const searchQuery = ref('3,5,7')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/level', filterType: 'levels' }
      expect(isValidCommandInput.value).toBe(true)
    })

    it('[covers:use-slash-commands.level-out-of-range-rejected] レベルコマンドで無効な範囲を検証', () => {
      const searchQuery = ref('99')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/level', filterType: 'levels' }
      expect(isValidCommandInput.value).toBe(false)
    })

    it('[covers:use-slash-commands.atk-range-validated] ATKコマンドで数値範囲を検証', () => {
      const searchQuery = ref('1000-2000')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/atk', filterType: 'atk' }
      expect(isValidCommandInput.value).toBe(true)
    })

    it('[covers:use-slash-commands.atk-open-ended-range-accepted] ATKコマンドで片方のみの範囲指定を検証', () => {
      const searchQuery = ref('1000-')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/atk', filterType: 'atk' }
      expect(isValidCommandInput.value).toBe(true)
    })
  })

  describe('isNegatedInput', () => {
    it('[covers:use-slash-commands.negation-hyphen-detected] - プレフィックスでNOT条件を判定', () => {
      const searchQuery = ref('-光')
      const { isNegatedInput } = useSlashCommands({ searchQuery })

      expect(isNegatedInput.value).toBe(true)
    })

    it('[covers:use-slash-commands.negation-absent-when-no-hyphen] - プレフィックスがない場合はfalse', () => {
      const searchQuery = ref('光')
      const { isNegatedInput } = useSlashCommands({ searchQuery })

      expect(isNegatedInput.value).toBe(false)
    })
  })

  describe('actualInputValue', () => {
    it('[covers:use-slash-commands.actual-value-strips-negation-hyphen] - プレフィックスを除去した値を返す', () => {
      const searchQuery = ref('-光')
      const { actualInputValue } = useSlashCommands({ searchQuery })

      expect(actualInputValue.value).toBe('光')
    })

    it('[covers:use-slash-commands.actual-value-returned-as-is-without-hyphen] - プレフィックスがない場合はそのまま返す', () => {
      const searchQuery = ref('光')
      const { actualInputValue } = useSlashCommands({ searchQuery })

      expect(actualInputValue.value).toBe('光')
    })
  })

  describe('isCommandMode', () => {
    it('[covers:use-slash-commands.command-mode-on-slash-prefix] / で始まる入力でコマンドモードを判定', () => {
      const searchQuery = ref('/attr')
      const { isCommandMode } = useSlashCommands({ searchQuery })

      expect(isCommandMode.value).toBe(true)
    })

    it('[covers:use-slash-commands.command-mode-off-without-slash-prefix] / で始まらない入力ではfalse', () => {
      const searchQuery = ref('光')
      const { isCommandMode } = useSlashCommands({ searchQuery })

      expect(isCommandMode.value).toBe(false)
    })
  })
})
