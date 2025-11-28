/**
 * 検索条件排他エンジンのユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { inferExclusions, loadExclusionRules } from '@/utils/search-exclusion-engine';
import type { SearchConditionState } from '@/types/search-exclusion';

describe('search-exclusion-engine', () => {
  const rules = loadExclusionRules();

  describe('基本的な排他パターン', () => {
    it('card-typeグループ: monsterを選択するとspell/trapが排他', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'and',
        selectedAttributes: new Set(['card-type_monster']),
        fieldInputs: {},
      };

      const result = inferExclusions(state, rules);

      expect(result.attributeStates.get('card-type_spell')?.enabled).toBe(false);
      expect(result.attributeStates.get('card-type_trap')?.enabled).toBe(false);
    });

    it('ANDモード: normalを選択するとlink/fusion等が排他', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'and',
        selectedAttributes: new Set(['monster-type_normal']),
        fieldInputs: {},
      };

      const result = inferExclusions(state, rules);

      expect(result.attributeStates.get('monster-type_link')?.enabled).toBe(false);
      expect(result.attributeStates.get('monster-type_fusion')?.enabled).toBe(false);
      expect(result.attributeStates.get('monster-type_effect')?.enabled).toBe(false);
    });

    it('ORモード: 直接選択同士は排他が適用されない', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'or',
        selectedAttributes: new Set(['monster-type_normal', 'monster-type_fusion']),
        fieldInputs: {},
      };

      const result = inferExclusions(state, rules);

      // ORモードなので両方とも有効
      expect(result.attributeStates.get('monster-type_normal')?.enabled).toBe(true);
      expect(result.attributeStates.get('monster-type_fusion')?.enabled).toBe(true);
    });
  });

  describe('項目→属性の必須化', () => {
    it('link-valueに入力するとmonster-type_linkが必須になる', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'or',
        selectedAttributes: new Set(),
        fieldInputs: {
          'link-value': true,
        },
      };

      const result = inferExclusions(state, rules);

      const linkState = result.attributeStates.get('monster-type_link');
      expect(linkState?.required).toBe(true);
      expect(linkState?.selected).toBe(true);
    });

    it('link-markerに入力するとmonster-type_linkが必須になる', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'or',
        selectedAttributes: new Set(),
        fieldInputs: {
          'link-marker': true,
        },
      };

      const result = inferExclusions(state, rules);

      const linkState = result.attributeStates.get('monster-type_link');
      expect(linkState?.required).toBe(true);
      expect(linkState?.selected).toBe(true);
    });

    it('p-scaleに入力するとmonster-type_pendが必須になる', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'or',
        selectedAttributes: new Set(),
        fieldInputs: {
          'p-scale': true,
        },
      };

      const result = inferExclusions(state, rules);

      const pendState = result.attributeStates.get('monster-type_pend');
      expect(pendState?.required).toBe(true);
      expect(pendState?.selected).toBe(true);
    });

    it('level-rankに入力するとmonster-type_linkが選択不可になる', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'or',
        selectedAttributes: new Set(),
        fieldInputs: {
          'level-rank': true,
        },
      };

      const result = inferExclusions(state, rules);

      expect(result.attributeStates.get('monster-type_link')?.enabled).toBe(false);
    });
  });

  describe('属性→項目の無効化', () => {
    it('monster-type_linkを選択するとdefが無効になる', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'or',
        selectedAttributes: new Set(['monster-type_link']),
        fieldInputs: {
          def: false,
        },
      };

      const result = inferExclusions(state, rules);

      expect(result.fieldStates.get('def')?.enabled).toBe(false);
    });
  });

  describe('連鎖パターン', () => {
    it('link-marker入力 → link必須 → ANDモードでnormalと排他', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'and',
        selectedAttributes: new Set(),
        fieldInputs: {
          'link-marker': true,
        },
      };

      const result = inferExclusions(state, rules);

      // linkが必須
      expect(result.attributeStates.get('monster-type_link')?.required).toBe(true);

      // ANDモードなのでnormalと排他
      expect(result.attributeStates.get('monster-type_normal')?.enabled).toBe(false);

      // defも無効
      expect(result.fieldStates.get('def')?.enabled).toBe(false);
    });

    it('ORモード + link-marker入力 → linkが必須 → normalも排他になる', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'or',
        selectedAttributes: new Set(),
        fieldInputs: {
          'link-marker': true,
        },
      };

      const result = inferExclusions(state, rules);

      // linkが必須（項目から決定）
      expect(result.attributeStates.get('monster-type_link')?.required).toBe(true);

      // ORモードだが、必須属性が関与するので排他が適用される
      expect(result.attributeStates.get('monster-type_normal')?.enabled).toBe(false);
    });

    it('ANDモード + normal選択 → linkが無効 → link-markerが無効', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'and',
        selectedAttributes: new Set(['monster-type_normal']),
        fieldInputs: {
          'link-marker': false,
        },
      };

      const result = inferExclusions(state, rules);

      // linkが無効
      expect(result.attributeStates.get('monster-type_link')?.enabled).toBe(false);

      // linkを必須とするlink-markerも無効
      expect(result.fieldStates.get('link-marker')?.enabled).toBe(false);
    });
  });

  describe('矛盾検出', () => {
    it('link-markerに入力 + ANDモード + normal選択 → 矛盾を検出', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'and',
        selectedAttributes: new Set(['monster-type_normal']),
        fieldInputs: {
          'link-marker': true,
        },
      };

      const result = inferExclusions(state, rules);

      // linkが必須だが無効なので矛盾
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts.some((c) => c.type === 'contradiction')).toBe(true);
    });

    it('defに入力 + link選択 → 警告を検出', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'or',
        selectedAttributes: new Set(['monster-type_link']),
        fieldInputs: {
          def: true,
        },
      };

      const result = inferExclusions(state, rules);

      // defに入力があるが無効化されているので警告
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts.some((c) => c.type === 'warning')).toBe(true);
    });
  });

  describe('トレース機能', () => {
    it('トレースを有効にすると推論の追跡情報が記録される', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'and',
        selectedAttributes: new Set(),
        fieldInputs: {
          'link-marker': true,
        },
      };

      const result = inferExclusions(state, rules, true);

      expect(result.trace).toBeDefined();
      expect(result.trace!.length).toBeGreaterThan(0);

      // link-marker → monster-type_link の必須化がトレースされている
      expect(
        result.trace!.some((t) => t.action === 'field-to-attribute' && t.target === 'monster-type_link')
      ).toBe(true);
    });
  });

  describe('項目からの推論による項目無効化', () => {
    it('level-rank入力 → linkが無効 → link関連項目が無効', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'or',
        selectedAttributes: new Set(),
        fieldInputs: {
          'level-rank': true,
        },
      };

      const result = inferExclusions(state, rules);

      // monster-type_linkが無効になっている
      expect(result.attributeStates.get('monster-type_link')?.enabled).toBe(false);

      // linkを必須とするlink-value/link-markerも無効になっている
      expect(result.fieldStates.get('link-value')?.enabled).toBe(false);
      expect(result.fieldStates.get('link-marker')?.enabled).toBe(false);
    });

    it('link-value入力 → linkが必須 → level-rankが無効', () => {
      const state: SearchConditionState = {
        monsterTypeMode: 'or',
        selectedAttributes: new Set(),
        fieldInputs: {
          'link-value': true,
        },
      };

      const result = inferExclusions(state, rules);

      // monster-type_linkが必須
      expect(result.attributeStates.get('monster-type_link')?.required).toBe(true);

      // linkが有効な場合、level-rankが無効
      expect(result.fieldStates.get('level-rank')?.enabled).toBe(false);
    });
  });
});
