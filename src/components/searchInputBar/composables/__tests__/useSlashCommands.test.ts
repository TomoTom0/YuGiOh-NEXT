import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useSlashCommands } from '../useSlashCommands'

describe('useSlashCommands', () => {
  describe('commandSuggestions', () => {
    it('/ で始まる入力時に主要コマンドを表示', () => {
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

    it('入力に一致するコマンドをフィルタ', () => {
      const searchQuery = ref('/at')
      const { commandSuggestions } = useSlashCommands({ searchQuery })

      const attrCommand = commandSuggestions.value.find(c => c.command === '/attr')
      expect(attrCommand).toBeDefined()
    })

    it('pendingCommandがある場合は候補を表示しない', () => {
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
    it('属性コマンドの有効な入力を検証', () => {
      const searchQuery = ref('光')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/attr', filterType: 'attributes' }
      expect(isValidCommandInput.value).toBe(true)
    })

    it('属性コマンドの無効な入力を検証', () => {
      const searchQuery = ref('無効な属性')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/attr', filterType: 'attributes' }
      expect(isValidCommandInput.value).toBe(false)
    })

    it('レベルコマンドで単一の数値を検証', () => {
      const searchQuery = ref('4')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/level', filterType: 'levels' }
      expect(isValidCommandInput.value).toBe(true)
    })

    it('レベルコマンドで範囲指定を検証', () => {
      const searchQuery = ref('4-8')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/level', filterType: 'levels' }
      expect(isValidCommandInput.value).toBe(true)
    })

    it('レベルコマンドでカンマ区切りを検証', () => {
      const searchQuery = ref('3,5,7')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/level', filterType: 'levels' }
      expect(isValidCommandInput.value).toBe(true)
    })

    it('レベルコマンドで無効な範囲を検証', () => {
      const searchQuery = ref('99')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/level', filterType: 'levels' }
      expect(isValidCommandInput.value).toBe(false)
    })

    it('ATKコマンドで数値範囲を検証', () => {
      const searchQuery = ref('1000-2000')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/atk', filterType: 'atk' }
      expect(isValidCommandInput.value).toBe(true)
    })

    it('ATKコマンドで片方のみの範囲指定を検証', () => {
      const searchQuery = ref('1000-')
      const { isValidCommandInput, pendingCommand } = useSlashCommands({ searchQuery })

      pendingCommand.value = { command: '/atk', filterType: 'atk' }
      expect(isValidCommandInput.value).toBe(true)
    })
  })

  describe('isNegatedInput', () => {
    it('- プレフィックスでNOT条件を判定', () => {
      const searchQuery = ref('-光')
      const { isNegatedInput } = useSlashCommands({ searchQuery })

      expect(isNegatedInput.value).toBe(true)
    })

    it('- プレフィックスがない場合はfalse', () => {
      const searchQuery = ref('光')
      const { isNegatedInput } = useSlashCommands({ searchQuery })

      expect(isNegatedInput.value).toBe(false)
    })
  })

  describe('actualInputValue', () => {
    it('- プレフィックスを除去した値を返す', () => {
      const searchQuery = ref('-光')
      const { actualInputValue } = useSlashCommands({ searchQuery })

      expect(actualInputValue.value).toBe('光')
    })

    it('- プレフィックスがない場合はそのまま返す', () => {
      const searchQuery = ref('光')
      const { actualInputValue } = useSlashCommands({ searchQuery })

      expect(actualInputValue.value).toBe('光')
    })
  })

  describe('isCommandMode', () => {
    it('/ で始まる入力でコマンドモードを判定', () => {
      const searchQuery = ref('/attr')
      const { isCommandMode } = useSlashCommands({ searchQuery })

      expect(isCommandMode.value).toBe(true)
    })

    it('/ で始まらない入力ではfalse', () => {
      const searchQuery = ref('光')
      const { isCommandMode } = useSlashCommands({ searchQuery })

      expect(isCommandMode.value).toBe(false)
    })
  })
})
