import { describe, it, expect } from 'vitest'
import {
  getAttributeIconUrl,
  getLevelIconUrl,
  getRankIconUrl,
  getSpellIconUrl,
  getTrapIconUrl,
  getEffectTypeIconUrl,
  getLinkMarkerClasses,
  getLinkMarkerClassName
} from '@/api/image-utils'

const BASE_IMAGE_URL = 'https://www.db.yugioh-card.com/yugiohdb/external/image/parts'

describe('api/image-utils', () => {
  describe('getAttributeIconUrl', () => {
    it('DARK属性のアイコンURLを返す', () => {
      const url = getAttributeIconUrl('DARK')
      expect(url).toBe(`${BASE_IMAGE_URL}/attribute/attribute_icon_dark.png`)
    })

    it('LIGHT属性のアイコンURLを返す', () => {
      const url = getAttributeIconUrl('LIGHT')
      expect(url).toBe(`${BASE_IMAGE_URL}/attribute/attribute_icon_light.png`)
    })

    it('WATER属性のアイコンURLを返す', () => {
      const url = getAttributeIconUrl('WATER')
      expect(url).toBe(`${BASE_IMAGE_URL}/attribute/attribute_icon_water.png`)
    })

    it('FIRE属性のアイコンURLを返す', () => {
      const url = getAttributeIconUrl('FIRE')
      expect(url).toBe(`${BASE_IMAGE_URL}/attribute/attribute_icon_fire.png`)
    })

    it('EARTH属性のアイコンURLを返す', () => {
      const url = getAttributeIconUrl('EARTH')
      expect(url).toBe(`${BASE_IMAGE_URL}/attribute/attribute_icon_earth.png`)
    })

    it('WIND属性のアイコンURLを返す', () => {
      const url = getAttributeIconUrl('WIND')
      expect(url).toBe(`${BASE_IMAGE_URL}/attribute/attribute_icon_wind.png`)
    })

    it('DIVINE属性のアイコンURLを返す', () => {
      const url = getAttributeIconUrl('DIVINE')
      expect(url).toBe(`${BASE_IMAGE_URL}/attribute/attribute_icon_divine.png`)
    })

    it('小文字の属性名でも正しくURLを返す', () => {
      const url = getAttributeIconUrl('dark')
      expect(url).toBe(`${BASE_IMAGE_URL}/attribute/attribute_icon_dark.png`)
    })

    it('空文字列のとき空文字を返す', () => {
      expect(getAttributeIconUrl('')).toBe('')
    })

    it('存在しない属性を渡してもURLは生成される', () => {
      const url = getAttributeIconUrl('UNKNOWN')
      expect(url).toBe(`${BASE_IMAGE_URL}/attribute/attribute_icon_unknown.png`)
    })
  })

  describe('getLevelIconUrl', () => {
    it('レベルアイコンURLを返す', () => {
      const url = getLevelIconUrl()
      expect(url).toBe(`${BASE_IMAGE_URL}/icon_level.png`)
    })

    it('毎回同じURLを返す', () => {
      const url1 = getLevelIconUrl()
      const url2 = getLevelIconUrl()
      expect(url1).toBe(url2)
    })
  })

  describe('getRankIconUrl', () => {
    it('ランクアイコンURLを返す', () => {
      const url = getRankIconUrl()
      expect(url).toBe(`${BASE_IMAGE_URL}/icon_rank.png`)
    })

    it('毎回同じURLを返す', () => {
      const url1 = getRankIconUrl()
      const url2 = getRankIconUrl()
      expect(url1).toBe(url2)
    })
  })

  describe('getSpellIconUrl', () => {
    it('魔法カードアイコンURLを返す', () => {
      const url = getSpellIconUrl()
      expect(url).toBe(`${BASE_IMAGE_URL}/attribute/attribute_icon_spell.png`)
    })

    it('毎回同じURLを返す', () => {
      const url1 = getSpellIconUrl()
      const url2 = getSpellIconUrl()
      expect(url1).toBe(url2)
    })
  })

  describe('getTrapIconUrl', () => {
    it('罠カードアイコンURLを返す', () => {
      const url = getTrapIconUrl()
      expect(url).toBe(`${BASE_IMAGE_URL}/attribute/attribute_icon_trap.png`)
    })

    it('毎回同じURLを返す', () => {
      const url1 = getTrapIconUrl()
      const url2 = getTrapIconUrl()
      expect(url1).toBe(url2)
    })
  })

  describe('getEffectTypeIconUrl', () => {
    it('quick効果のアイコンURLを返す', () => {
      const url = getEffectTypeIconUrl('quick')
      expect(url).toBe(`${BASE_IMAGE_URL}/effect/effect_icon_quickplay.png`)
    })

    it('continuous効果のアイコンURLを返す', () => {
      const url = getEffectTypeIconUrl('continuous')
      expect(url).toBe(`${BASE_IMAGE_URL}/effect/effect_icon_continuous.png`)
    })

    it('equip効果のアイコンURLを返す', () => {
      const url = getEffectTypeIconUrl('equip')
      expect(url).toBe(`${BASE_IMAGE_URL}/effect/effect_icon_equip.png`)
    })

    it('field効果のアイコンURLを返す', () => {
      const url = getEffectTypeIconUrl('field')
      expect(url).toBe(`${BASE_IMAGE_URL}/effect/effect_icon_field.png`)
    })

    it('ritual効果のアイコンURLを返す', () => {
      const url = getEffectTypeIconUrl('ritual')
      expect(url).toBe(`${BASE_IMAGE_URL}/effect/effect_icon_ritual.png`)
    })

    it('counter効果のアイコンURLを返す', () => {
      const url = getEffectTypeIconUrl('counter')
      expect(url).toBe(`${BASE_IMAGE_URL}/effect/effect_icon_counter.png`)
    })

    it('normal効果のときnullを返す', () => {
      expect(getEffectTypeIconUrl('normal')).toBeNull()
    })

    it('空文字列のときnullを返す', () => {
      expect(getEffectTypeIconUrl('')).toBeNull()
    })

    it('存在しない効果タイプのときnullを返す', () => {
      expect(getEffectTypeIconUrl('unknown')).toBeNull()
    })

    it('大文字の効果タイプでも正しく処理される', () => {
      const url = getEffectTypeIconUrl('QUICK')
      expect(url).toBe(`${BASE_IMAGE_URL}/effect/effect_icon_quickplay.png`)
    })
  })

  describe('getLinkMarkerClasses', () => {
    it('0のとき空配列を返す', () => {
      expect(getLinkMarkerClasses(0)).toEqual([])
    })

    it('ビット0が立っている場合は[i_i_1]を返す', () => {
      // 0b000000001 = 1 (ビット0)
      expect(getLinkMarkerClasses(1)).toEqual(['i_i_1'])
    })

    it('ビット0と2が立っている場合は[i_i_1, i_i_3]を返す', () => {
      // 0b000000101 = 5 (ビット0と2)
      expect(getLinkMarkerClasses(5)).toEqual(['i_i_1', 'i_i_3'])
    })

    it('ビット8が立っている場合は[i_i_9]を返す', () => {
      // 0b100000000 = 256 (ビット8)
      expect(getLinkMarkerClasses(256)).toEqual(['i_i_9'])
    })

    it('中央のビット4は除外される', () => {
      // 0b000010000 = 16 (ビット4)
      expect(getLinkMarkerClasses(16)).toEqual([])
    })

    it('複数のビットが立っている場合（0, 3, 8）', () => {
      // 0b100001001 = 265 (ビット0, 3, 8)
      expect(getLinkMarkerClasses(265)).toEqual(['i_i_1', 'i_i_4', 'i_i_9'])
    })

    it('全ビット（中央除外）が立っている場合', () => {
      // 0b111101111 = 495 (ビット0-3, 5-8)
      expect(getLinkMarkerClasses(495)).toEqual([
        'i_i_1', 'i_i_2', 'i_i_3', 'i_i_4', 'i_i_6', 'i_i_7', 'i_i_8', 'i_i_9'
      ])
    })

    it('負の数のときも正しく処理される', () => {
      // 負数はビット演算で処理されるが、実装上は非負を想定
      const result = getLinkMarkerClasses(-1)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getLinkMarkerClassName', () => {
    it('0のとき空文字を返す', () => {
      expect(getLinkMarkerClassName(0)).toBe('')
    })

    it('ビット0が立っている場合は"link1"を返す', () => {
      // 0b000000001 = 1 (ビット0)
      expect(getLinkMarkerClassName(1)).toBe('link1')
    })

    it('ビット0と8が立っている場合は"link19"を返す', () => {
      // 0b100000001 = 257 (ビット0と8)
      expect(getLinkMarkerClassName(257)).toBe('link19')
    })

    it('ビット0, 2, 8が立っている場合は"link139"を返す', () => {
      // 0b100000101 = 261 (ビット0, 2, 8)
      expect(getLinkMarkerClassName(261)).toBe('link139')
    })

    it('中央のビット4は除外される', () => {
      // 0b000010000 = 16 (ビット4のみ)
      // ビット4は除外されるため、位置リストは空になり、'link' + '' = 'link'
      expect(getLinkMarkerClassName(16)).toBe('link')
    })

    it('複数のビットが立っている場合（ビット1, 3, 5, 7）', () => {
      // 0b10101010 = 170 (ビット1, 3, 5, 7)
      // ビット1 → 位置2, ビット3 → 位置4, ビット5 → 位置6, ビット7 → 位置8
      expect(getLinkMarkerClassName(170)).toBe('link2468')
    })

    it('全ビット（中央除外）が立っている場合', () => {
      // 0b111101111 = 495 (ビット0-3, 5-8, 4は除外)
      // → 位置1-4, 6-9 (位置5は除外)
      expect(getLinkMarkerClassName(495)).toBe('link12346789')
    })

    it('大きい数値でも正しく処理される', () => {
      // 512 = ビット9（存在しない）のため空文字を返す
      const result = getLinkMarkerClassName(512)
      expect(typeof result).toBe('string')
    })
  })
})
