import { describe, it, expect } from 'vitest';
import { SORT_ORDER_TO_API_VALUE } from '../card-search';
import {
  ATTRIBUTE_ID_TO_INT,
  RACE_ID_TO_INT,
  MONSTER_TYPE_ID_TO_INT,
  SPELL_EFFECT_TYPE_ID_TO_INT,
  TRAP_EFFECT_TYPE_ID_TO_INT
} from '@/types/card-maps';

/**
 * card-search.ts のマッピング関数テスト
 *
 * テスト対象:
 * - SORT_ORDER_TO_API_VALUE のマッピング
 * - 逆引きマップの生成
 * - マッピング関数（getAttributeAttrValue等）
 */
describe('card-search-mapper', () => {
  describe('SORT_ORDER_TO_API_VALUE', () => {
    it('should map name_asc to API value 1', () => {
      expect(SORT_ORDER_TO_API_VALUE['name_asc']).toBe(1);
    });

    it('should map name_desc to API value 1', () => {
      // APIは50音順のみ、descはクライアント側で反転
      expect(SORT_ORDER_TO_API_VALUE['name_desc']).toBe(1);
    });

    it('should map release_desc to API value 20', () => {
      expect(SORT_ORDER_TO_API_VALUE['release_desc']).toBe(20);
    });

    it('should map release_asc to API value 21', () => {
      expect(SORT_ORDER_TO_API_VALUE['release_asc']).toBe(21);
    });

    it('should map level_desc to API value 2', () => {
      expect(SORT_ORDER_TO_API_VALUE['level_desc']).toBe(2);
    });

    it('should map level_asc to API value 3', () => {
      expect(SORT_ORDER_TO_API_VALUE['level_asc']).toBe(3);
    });

    it('should map atk_desc to API value 4', () => {
      expect(SORT_ORDER_TO_API_VALUE['atk_desc']).toBe(4);
    });

    it('should map atk_asc to API value 5', () => {
      expect(SORT_ORDER_TO_API_VALUE['atk_asc']).toBe(5);
    });

    it('should map def_desc to API value 6', () => {
      expect(SORT_ORDER_TO_API_VALUE['def_desc']).toBe(6);
    });

    it('should map def_asc to API value 7', () => {
      expect(SORT_ORDER_TO_API_VALUE['def_asc']).toBe(7);
    });

    it('should map attribute_asc to API value 1', () => {
      // APIに属性ソートなし、50音順で代用
      expect(SORT_ORDER_TO_API_VALUE['attribute_asc']).toBe(1);
    });

    it('should map attribute_desc to API value 1', () => {
      expect(SORT_ORDER_TO_API_VALUE['attribute_desc']).toBe(1);
    });

    it('should map race_asc to API value 1', () => {
      // APIに種族ソートなし、50音順で代用
      expect(SORT_ORDER_TO_API_VALUE['race_asc']).toBe(1);
    });

    it('should map race_desc to API value 1', () => {
      expect(SORT_ORDER_TO_API_VALUE['race_desc']).toBe(1);
    });

    it('should have all sort order keys defined', () => {
      const expectedKeys = [
        'name_asc', 'name_desc',
        'release_desc', 'release_asc',
        'level_desc', 'level_asc',
        'atk_desc', 'atk_asc',
        'def_desc', 'def_asc',
        'attribute_asc', 'attribute_desc',
        'race_asc', 'race_desc'
      ];

      expectedKeys.forEach(key => {
        expect(SORT_ORDER_TO_API_VALUE).toHaveProperty(key);
        expect(typeof SORT_ORDER_TO_API_VALUE[key]).toBe('number');
      });
    });
  });

  describe('Card Maps Integrity', () => {
    it('should have ATTRIBUTE_ID_TO_INT mapping', () => {
      expect(ATTRIBUTE_ID_TO_INT).toBeDefined();
      expect(typeof ATTRIBUTE_ID_TO_INT).toBe('object');

      // 主要な属性が定義されていることを確認
      const expectedAttributes = ['dark', 'light', 'water', 'fire', 'wind', 'earth'];
      expectedAttributes.forEach(attr => {
        expect(ATTRIBUTE_ID_TO_INT).toHaveProperty(attr);
      });
    });

    it('should have RACE_ID_TO_INT mapping', () => {
      expect(RACE_ID_TO_INT).toBeDefined();
      expect(typeof RACE_ID_TO_INT).toBe('object');

      // 主要な種族が定義されていることを確認
      const expectedRaces = ['dragon', 'spellcaster', 'warrior', 'fiend'];
      expectedRaces.forEach(race => {
        expect(RACE_ID_TO_INT).toHaveProperty(race);
      });
    });

    it('should have MONSTER_TYPE_ID_TO_INT mapping', () => {
      expect(MONSTER_TYPE_ID_TO_INT).toBeDefined();
      expect(typeof MONSTER_TYPE_ID_TO_INT).toBe('object');

      // 主要なモンスタータイプが定義されていることを確認
      const expectedTypes = ['normal', 'effect', 'fusion', 'ritual', 'synchro', 'xyz', 'link'];
      expectedTypes.forEach(type => {
        expect(MONSTER_TYPE_ID_TO_INT).toHaveProperty(type);
      });
    });

    it('should have SPELL_EFFECT_TYPE_ID_TO_INT mapping', () => {
      expect(SPELL_EFFECT_TYPE_ID_TO_INT).toBeDefined();
      expect(typeof SPELL_EFFECT_TYPE_ID_TO_INT).toBe('object');

      // 主要な魔法タイプが定義されていることを確認
      const expectedTypes = ['normal', 'continuous', 'equip', 'field', 'quick', 'ritual'];
      expectedTypes.forEach(type => {
        expect(SPELL_EFFECT_TYPE_ID_TO_INT).toHaveProperty(type);
      });
    });

    it('should have TRAP_EFFECT_TYPE_ID_TO_INT mapping', () => {
      expect(TRAP_EFFECT_TYPE_ID_TO_INT).toBeDefined();
      expect(typeof TRAP_EFFECT_TYPE_ID_TO_INT).toBe('object');

      // 主要な罠タイプが定義されていることを確認
      const expectedTypes = ['normal', 'continuous', 'counter'];
      expectedTypes.forEach(type => {
        expect(TRAP_EFFECT_TYPE_ID_TO_INT).toHaveProperty(type);
      });
    });
  });

  describe('Mapping Values', () => {
    it('should have consistent attribute ID to INT values', () => {
      // 属性のマッピング値が数値であることを確認
      Object.values(ATTRIBUTE_ID_TO_INT).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      });
    });

    it('should have consistent race ID to INT values', () => {
      // 種族のマッピング値が数値であることを確認
      Object.values(RACE_ID_TO_INT).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      });
    });

    it('should have consistent monster type ID to INT values', () => {
      // モンスタータイプのマッピング値が数値であることを確認
      Object.values(MONSTER_TYPE_ID_TO_INT).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0); // 0も有効な値
      });
    });

    it('should have unique attribute INT values', () => {
      // 属性のマッピング値が一意であることを確認
      const values = Object.values(ATTRIBUTE_ID_TO_INT);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have unique race INT values', () => {
      // 種族のマッピング値が一意であることを確認
      const values = Object.values(RACE_ID_TO_INT);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have unique monster type INT values', () => {
      // モンスタータイプのマッピング値が一意であることを確認
      const values = Object.values(MONSTER_TYPE_ID_TO_INT);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('API Parameter Mapping', () => {
    it('should map all sort orders to valid API values', () => {
      // 全てのソート順序が有効なAPI値（1-21）にマッピングされていることを確認
      Object.values(SORT_ORDER_TO_API_VALUE).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(21);
      });
    });

    it('should have fallback to name sort for unsupported sorts', () => {
      // 属性・種族ソートはAPIサポートなしで50音順（1）にフォールバック
      expect(SORT_ORDER_TO_API_VALUE['attribute_asc']).toBe(1);
      expect(SORT_ORDER_TO_API_VALUE['attribute_desc']).toBe(1);
      expect(SORT_ORDER_TO_API_VALUE['race_asc']).toBe(1);
      expect(SORT_ORDER_TO_API_VALUE['race_desc']).toBe(1);
    });
  });

  describe('Reverse Mapping Generation', () => {
    it('should allow reverse lookup for attributes', () => {
      // 逆引きマップが正しく生成できることを確認
      // 注: 実際の逆引きマップは card-search.ts 内でのみ使用されるため、
      // ここでは逆引き可能性のみをテスト
      const entries = Object.entries(ATTRIBUTE_ID_TO_INT);
      expect(entries.length).toBeGreaterThan(0);

      // 全てのエントリが [id, int] の形式であることを確認
      entries.forEach(([id, int]) => {
        expect(typeof id).toBe('string');
        expect(typeof int).toBe('number');
      });
    });

    it('should allow reverse lookup for races', () => {
      const entries = Object.entries(RACE_ID_TO_INT);
      expect(entries.length).toBeGreaterThan(0);

      entries.forEach(([id, int]) => {
        expect(typeof id).toBe('string');
        expect(typeof int).toBe('number');
      });
    });

    it('should allow reverse lookup for monster types', () => {
      const entries = Object.entries(MONSTER_TYPE_ID_TO_INT);
      expect(entries.length).toBeGreaterThan(0);

      entries.forEach(([id, int]) => {
        expect(typeof id).toBe('string');
        expect(typeof int).toBe('number');
      });
    });
  });
});
