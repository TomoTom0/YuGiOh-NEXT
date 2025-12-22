import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAttributeIconUrl,
  getLevelIconUrl,
  getRankIconUrl,
  getSpellIconUrl,
  getTrapIconUrl,
  getEffectTypeIconUrl,
  getLinkMarkerClasses,
  getLinkMarkerClassName
} from '../image-utils';

const BASE_URL = 'https://www.db.yugioh-card.com/yugiohdb/external/image/parts';

describe('image-utils', () => {
  beforeEach(() => {
    // Mock window.location.href for detectCardGameType
    Object.defineProperty(window, 'location', {
      value: { href: 'https://www.db.yugioh-card.com/yugiohdb/' },
      writable: true,
      configurable: true
    });
  });
  describe('getAttributeIconUrl', () => {
    it('should return correct URL for valid attribute', () => {
      expect(getAttributeIconUrl('DARK')).toBe(`${BASE_URL}/attribute/attribute_icon_dark.png`);
      expect(getAttributeIconUrl('LIGHT')).toBe(`${BASE_URL}/attribute/attribute_icon_light.png`);
      expect(getAttributeIconUrl('WATER')).toBe(`${BASE_URL}/attribute/attribute_icon_water.png`);
    });

    it('should return empty string for empty attribute', () => {
      expect(getAttributeIconUrl('')).toBe('');
    });

    it('should handle lowercase attribute names', () => {
      expect(getAttributeIconUrl('dark')).toBe(`${BASE_URL}/attribute/attribute_icon_dark.png`);
    });
  });

  describe('getLevelIconUrl', () => {
    it('should return correct level icon URL', () => {
      expect(getLevelIconUrl()).toBe(`${BASE_URL}/icon_level.png`);
    });
  });

  describe('getRankIconUrl', () => {
    it('should return correct rank icon URL', () => {
      expect(getRankIconUrl()).toBe(`${BASE_URL}/icon_rank.png`);
    });
  });

  describe('getSpellIconUrl', () => {
    it('should return correct spell icon URL', () => {
      expect(getSpellIconUrl()).toBe(`${BASE_URL}/attribute/attribute_icon_spell.png`);
    });
  });

  describe('getTrapIconUrl', () => {
    it('should return correct trap icon URL', () => {
      expect(getTrapIconUrl()).toBe(`${BASE_URL}/attribute/attribute_icon_trap.png`);
    });
  });

  describe('getEffectTypeIconUrl', () => {
    it('should return correct URL for valid effect types', () => {
      expect(getEffectTypeIconUrl('quick')).toBe(`${BASE_URL}/effect/effect_icon_quickplay.png`);
      expect(getEffectTypeIconUrl('continuous')).toBe(`${BASE_URL}/effect/effect_icon_continuous.png`);
      expect(getEffectTypeIconUrl('equip')).toBe(`${BASE_URL}/effect/effect_icon_equip.png`);
      expect(getEffectTypeIconUrl('field')).toBe(`${BASE_URL}/effect/effect_icon_field.png`);
      expect(getEffectTypeIconUrl('ritual')).toBe(`${BASE_URL}/effect/effect_icon_ritual.png`);
      expect(getEffectTypeIconUrl('counter')).toBe(`${BASE_URL}/effect/effect_icon_counter.png`);
    });

    it('should return null for normal effect type', () => {
      expect(getEffectTypeIconUrl('normal')).toBeNull();
    });

    it('should return null for empty or invalid effect type', () => {
      expect(getEffectTypeIconUrl('')).toBeNull();
      expect(getEffectTypeIconUrl('invalid')).toBeNull();
    });

    it('should handle case insensitive effect types', () => {
      expect(getEffectTypeIconUrl('QUICK')).toBe(`${BASE_URL}/effect/effect_icon_quickplay.png`);
      expect(getEffectTypeIconUrl('Continuous')).toBe(`${BASE_URL}/effect/effect_icon_continuous.png`);
    });
  });

  describe('getLinkMarkerClasses', () => {
    it('should return empty array for zero link markers', () => {
      expect(getLinkMarkerClasses(0)).toEqual([]);
    });

    it('should return correct classes for single marker', () => {
      // Position 1 (bottom-left) = bit 0
      expect(getLinkMarkerClasses(1 << 0)).toEqual(['i_i_1']);
      // Position 2 (bottom) = bit 1
      expect(getLinkMarkerClasses(1 << 1)).toEqual(['i_i_2']);
    });

    it('should return correct classes for multiple markers', () => {
      // Positions 1 and 9 (bottom-left and top-right)
      const markers = (1 << 0) | (1 << 8);
      expect(getLinkMarkerClasses(markers)).toEqual(['i_i_1', 'i_i_9']);
    });

    it('should skip position 5 (center)', () => {
      // All positions including center
      const allMarkers = 0b111111111;
      const classes = getLinkMarkerClasses(allMarkers);
      expect(classes).not.toContain('i_i_5');
      expect(classes).toHaveLength(8); // 9 positions - 1 (center)
    });

    it('should handle typical link monster patterns', () => {
      // Link-2: positions 2 and 8 (bottom and top)
      const link2 = (1 << 1) | (1 << 7);
      expect(getLinkMarkerClasses(link2)).toEqual(['i_i_2', 'i_i_8']);
      
      // Link-4: positions 1, 3, 7, 9 (corners)
      const link4 = (1 << 0) | (1 << 2) | (1 << 6) | (1 << 8);
      expect(getLinkMarkerClasses(link4)).toEqual(['i_i_1', 'i_i_3', 'i_i_7', 'i_i_9']);
    });
  });

  describe('getLinkMarkerClassName', () => {
    it('should return empty string for zero markers', () => {
      expect(getLinkMarkerClassName(0)).toBe('');
    });

    it('should return correct class name for single marker', () => {
      expect(getLinkMarkerClassName(1 << 0)).toBe('link1');
      expect(getLinkMarkerClassName(1 << 8)).toBe('link9');
    });

    it('should return correct class name for multiple markers', () => {
      // Positions 2 and 8
      const link2 = (1 << 1) | (1 << 7);
      expect(getLinkMarkerClassName(link2)).toBe('link28');
      
      // Positions 1 and 9
      const positions19 = (1 << 0) | (1 << 8);
      expect(getLinkMarkerClassName(positions19)).toBe('link19');
    });

    it('should skip center position in class name', () => {
      // All positions
      const allMarkers = 0b111111111;
      const className = getLinkMarkerClassName(allMarkers);
      expect(className).not.toContain('5');
      expect(className).toBe('link12346789');
    });

    it('should handle typical link monster class names', () => {
      // Link-3: commonly used patterns
      const link3Pattern1 = (1 << 1) | (1 << 3) | (1 << 5);
      expect(getLinkMarkerClassName(link3Pattern1)).toBe('link246');
      
      // Link-4: corners
      const link4Corners = (1 << 0) | (1 << 2) | (1 << 6) | (1 << 8);
      expect(getLinkMarkerClassName(link4Corners)).toBe('link1379');
    });
  });
});
