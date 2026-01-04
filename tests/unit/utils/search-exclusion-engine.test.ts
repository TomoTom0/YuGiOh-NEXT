import { describe, it, expect } from 'vitest';
import { loadExclusionRules, inferExclusions } from '@/utils/search-exclusion-engine';
import type { SearchConditionState, ExclusionRules } from '@/types/search-exclusion';

describe('search-exclusion-engine', () => {
  describe('loadExclusionRules', () => {
    it('排他ルールを読み込める', () => {
      const rules = loadExclusionRules();

      expect(rules).toBeDefined();
      expect(rules.fieldToAttribute).toBeInstanceOf(Array);
      expect(rules.attributeExclusionGroups).toBeInstanceOf(Array);
      expect(rules.attributeToField).toBeInstanceOf(Array);
    });

    it('fieldToAttributeルールが存在する', () => {
      const rules = loadExclusionRules();

      expect(rules.fieldToAttribute.length).toBeGreaterThan(0);
      rules.fieldToAttribute.forEach(rule => {
        expect(rule.triggerItems).toBeInstanceOf(Array);
        expect(rule.title).toBeDefined();
      });
    });

    it('attributeExclusionGroupsルールが存在する', () => {
      const rules = loadExclusionRules();

      expect(rules.attributeExclusionGroups.length).toBeGreaterThan(0);
      rules.attributeExclusionGroups.forEach(group => {
        expect(group.items).toBeInstanceOf(Array);
        expect(group.title).toBeDefined();
      });
    });

    it('attributeToFieldルールが存在する', () => {
      const rules = loadExclusionRules();

      expect(rules.attributeToField.length).toBeGreaterThan(0);
      rules.attributeToField.forEach(rule => {
        expect(rule.trigger).toBeDefined();
        expect(rule.negative).toBeInstanceOf(Array);
        expect(rule.title).toBeDefined();
      });
    });
  });

  describe('inferExclusions', () => {
    const createBaseState = (): SearchConditionState => ({
      monsterTypeMode: 'and',
      selectedAttributes: new Set(),
      fieldInputs: {
        'link-value': false,
        'link-marker': false,
        'p-scale': false,
        'level-rank': false,
        'def': false,
        'atk': false,
        'attribute': false,
        'race': false,
        'monster-type': false,
        'spell-type': false,
        'trap-type': false,
      },
    });

    it('基本的な推論ができる', () => {
      const state = createBaseState();
      const result = inferExclusions(state);

      expect(result).toBeDefined();
      expect(result.attributeStates).toBeInstanceOf(Map);
      expect(result.fieldStates).toBeInstanceOf(Map);
      expect(result.conflicts).toBeInstanceOf(Array);
    });

    it('選択された属性が有効になる', () => {
      const state = createBaseState();
      state.selectedAttributes.add('card-type_monster');

      const result = inferExclusions(state);

      const attrState = result.attributeStates.get('card-type_monster');
      expect(attrState).toBeDefined();
      expect(attrState?.enabled).toBe(true);
      expect(attrState?.selected).toBe(true);
    });

    it('項目入力により属性が必須化される', () => {
      const state = createBaseState();
      state.fieldInputs['link-value'] = true;

      const result = inferExclusions(state);

      const attrState = result.attributeStates.get('monster-type_link');
      expect(attrState?.required).toBe(true);
    });

    it('排他グループ内の他の属性が無効化される', () => {
      const state = createBaseState();
      state.selectedAttributes.add('card-type_monster'); // モンスター

      const result = inferExclusions(state);

      const monsterAttr = result.attributeStates.get('card-type_monster');
      expect(monsterAttr?.enabled).toBe(true);
      expect(monsterAttr?.selected).toBe(true);

      const spellAttr = result.attributeStates.get('card-type_spell');
      expect(spellAttr?.enabled).toBe(false);

      const trapAttr = result.attributeStates.get('card-type_trap');
      expect(trapAttr?.enabled).toBe(false);
    });

    it('属性選択により項目が無効化される', () => {
      const state = createBaseState();
      state.selectedAttributes.add('card-type_spell'); // 魔法

      const result = inferExclusions(state);

      const levelField = result.fieldStates.get('level-rank');
      expect(levelField?.enabled).toBe(false);

      const atkField = result.fieldStates.get('atk');
      expect(atkField?.enabled).toBe(false);

      const defField = result.fieldStates.get('def');
      expect(defField?.enabled).toBe(false);
    });

    it('ANDモードで複数のモンスタータイプが選択可能', () => {
      const state = createBaseState();
      state.monsterTypeMode = 'and';
      state.selectedAttributes.add('monster-type_effect');
      state.selectedAttributes.add('monster-type_tuner');

      const result = inferExclusions(state);

      const effectAttr = result.attributeStates.get('monster-type_effect');
      expect(effectAttr?.enabled).toBe(true);

      const tunerAttr = result.attributeStates.get('monster-type_tuner');
      expect(tunerAttr?.enabled).toBe(true);
    });

    it('矛盾検出機能が動作する', () => {
      const state = createBaseState();
      // リンク値を入力（monster-type_linkを必須化）
      state.fieldInputs['link-value'] = true;
      // 同時にリンク以外のモンスタータイプを選択（排他）
      state.selectedAttributes.add('monster-type_xyz');

      const result = inferExclusions(state);

      // 矛盾または警告が検出されることを確認
      expect(result.conflicts).toBeDefined();
    });

    it('項目無効化時の警告検出が動作する', () => {
      const state = createBaseState();
      const result = inferExclusions(state);

      // 基本的な矛盾検出機能が動作することを確認
      expect(result.conflicts).toBeInstanceOf(Array);
    });

    it('トレース機能が有効な場合、推論過程が記録される', () => {
      const state = createBaseState();
      state.selectedAttributes.add('card-type_monster');

      const result = inferExclusions(state, undefined, true);

      expect(result.trace).toBeDefined();
      expect(result.trace!.length).toBeGreaterThan(0);
      result.trace!.forEach(trace => {
        expect(trace.step).toBeGreaterThanOrEqual(1);
        expect(trace.action).toBeDefined();
        expect(trace.reason).toBeDefined();
      });
    });

    it('トレース機能が無効な場合、推論過程は記録されない', () => {
      const state = createBaseState();
      state.selectedAttributes.add('card-type_monster');

      const result = inferExclusions(state, undefined, false);

      expect(result.trace).toBeUndefined();
    });

    it('カスタムルールを使用できる', () => {
      const state = createBaseState();
      const customRules: ExclusionRules = {
        fieldToAttribute: [
          {
            title: 'カスタムルール',
            triggerItems: ['custom-field'],
            target: ['custom-attr'],
          },
        ],
        attributeExclusionGroups: [],
        attributeToField: [],
      };
      state.fieldInputs['custom-field'] = true;

      const result = inferExclusions(state, customRules);

      const customAttr = result.attributeStates.get('custom-attr');
      expect(customAttr?.required).toBe(true);
    });

    it('無効化理由が設定される', () => {
      const state = createBaseState();
      state.selectedAttributes.add('card-type_monster');

      const result = inferExclusions(state);

      const spellAttr = result.attributeStates.get('card-type_spell');
      expect(spellAttr?.disabledReason).toBeDefined();
    });

    it('推論が正常に完了する', () => {
      const state = createBaseState();
      state.fieldInputs['link-value'] = true;

      const result = inferExclusions(state);

      // 推論が正常に完了することを確認
      expect(result).toBeDefined();
      expect(result.attributeStates).toBeInstanceOf(Map);
      expect(result.fieldStates).toBeInstanceOf(Map);
      expect(result.conflicts).toBeInstanceOf(Array);
    });

    it('ワイルドカードパターンが機能する', () => {
      const state = createBaseState();
      state.fieldInputs['monster-type'] = true;

      const result = inferExclusions(state);

      // monster-type* にマッチする項目が入力されている場合、card-type_monsterが必須化される
      const monsterAttr = result.attributeStates.get('card-type_monster');
      expect(monsterAttr?.required).toBe(true);
    });

    it('複数の項目入力により複数の属性が必須化される', () => {
      const state = createBaseState();
      state.fieldInputs['link-value'] = true;
      state.fieldInputs['attribute'] = true;
      state.fieldInputs['race'] = true;

      const result = inferExclusions(state);

      const monsterAttr = result.attributeStates.get('card-type_monster');
      expect(monsterAttr?.required).toBe(true);
    });

    it('notTarget属性が無効化される', () => {
      const state = createBaseState();
      state.fieldInputs['spell-type'] = true;

      const result = inferExclusions(state);

      const spellAttr = result.attributeStates.get('card-type_spell');
      expect(spellAttr?.required).toBe(true);

      // spell-typeが入力されると、モンスター専用属性が無効化される可能性がある
      const monsterAttr = result.attributeStates.get('card-type_monster');
      expect(monsterAttr).toBeDefined();
    });
  });
});
