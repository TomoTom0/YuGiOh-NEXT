import { describe, it, expect } from 'vitest'
import { getNextEffectiveDate } from '@/api/forbidden-limited'

describe('api/forbidden-limited', () => {
  describe('getNextEffectiveDate', () => {
    it('1月1日のときは4月1日を返す', () => {
      const date = new Date(2024, 0, 1) // 2024-01-01
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-04-01')
    })

    it('1月31日のときは4月1日を返す', () => {
      const date = new Date(2024, 0, 31) // 2024-01-31
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-04-01')
    })

    it('2月のときは4月1日を返す', () => {
      const date = new Date(2024, 1, 15) // 2024-02-15
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-04-01')
    })

    it('3月のときは4月1日を返す', () => {
      const date = new Date(2024, 2, 31) // 2024-03-31
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-04-01')
    })

    it('4月1日のときは7月1日を返す', () => {
      const date = new Date(2024, 3, 1) // 2024-04-01
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-07-01')
    })

    it('4月30日のときは7月1日を返す', () => {
      const date = new Date(2024, 3, 30) // 2024-04-30
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-07-01')
    })

    it('5月のときは7月1日を返す', () => {
      const date = new Date(2024, 4, 15) // 2024-05-15
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-07-01')
    })

    it('6月のときは7月1日を返す', () => {
      const date = new Date(2024, 5, 30) // 2024-06-30
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-07-01')
    })

    it('7月1日のときは10月1日を返す', () => {
      const date = new Date(2024, 6, 1) // 2024-07-01
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-10-01')
    })

    it('7月31日のときは10月1日を返す', () => {
      const date = new Date(2024, 6, 31) // 2024-07-31
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-10-01')
    })

    it('8月のときは10月1日を返す', () => {
      const date = new Date(2024, 7, 15) // 2024-08-15
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-10-01')
    })

    it('9月のときは10月1日を返す', () => {
      const date = new Date(2024, 8, 30) // 2024-09-30
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-10-01')
    })

    it('10月1日のときは翌年1月1日を返す', () => {
      const date = new Date(2024, 9, 1) // 2024-10-01
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2025-01-01')
    })

    it('10月31日のときは翌年1月1日を返す', () => {
      const date = new Date(2024, 9, 31) // 2024-10-31
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2025-01-01')
    })

    it('11月のときは翌年1月1日を返す', () => {
      const date = new Date(2024, 10, 15) // 2024-11-15
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2025-01-01')
    })

    it('12月のときは翌年1月1日を返す', () => {
      const date = new Date(2024, 11, 31) // 2024-12-31
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2025-01-01')
    })

    it('引数なしのときは現在日時から次の適用月を計算する', () => {
      const result = getNextEffectiveDate()
      // 結果はフォーマット YYYY-MM-01 であることを確認
      expect(result).toMatch(/^\d{4}-(01|04|07|10)-01$/)
    })

    it('年の境界値を正しく処理する（2023年12月→2024年1月）', () => {
      const date = new Date(2023, 11, 15) // 2023-12-15
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-01-01')
    })

    it('年の境界値を正しく処理する（2024年10月→2025年1月）', () => {
      const date = new Date(2024, 9, 15) // 2024-10-15
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2025-01-01')
    })

    it('月を正しくパディングする（1月→01）', () => {
      const date = new Date(2024, 11, 15) // 2024-12-15
      const result = getNextEffectiveDate(date)
      expect(result).toMatch(/-01-01$/) // 01 は正しくパディングされている
    })

    it('月を正しくパディングする（4月→04）', () => {
      const date = new Date(2024, 0, 15) // 2024-01-15
      const result = getNextEffectiveDate(date)
      expect(result).toMatch(/-04-01$/)
    })

    it('月を正しくパディングする（7月→07）', () => {
      const date = new Date(2024, 3, 15) // 2024-04-15
      const result = getNextEffectiveDate(date)
      expect(result).toMatch(/-07-01$/)
    })

    it('月を正しくパディングする（10月→10）', () => {
      const date = new Date(2024, 6, 15) // 2024-07-15
      const result = getNextEffectiveDate(date)
      expect(result).toMatch(/-10-01$/)
    })

    it('タイムスタンプを含むDateでも正しく動作する', () => {
      const date = new Date(2024, 3, 1, 12, 30, 45, 123) // 2024-04-01 12:30:45.123
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-07-01')
    })

    it('ミリ秒精度のDateでも年月のみを使用する', () => {
      const date = new Date(2024, 3, 1, 23, 59, 59, 999) // 2024-04-01 23:59:59.999
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2024-07-01')
    })

    it('大きな年号でも正しく処理される（2100年）', () => {
      const date = new Date(2100, 8, 15) // 2100-09-15
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2100-10-01')
    })

    it('大きな年号での年の境界を正しく処理する（2100年10月→2101年1月）', () => {
      const date = new Date(2100, 9, 15) // 2100-10-15
      const result = getNextEffectiveDate(date)
      expect(result).toBe('2101-01-01')
    })
  })
})
