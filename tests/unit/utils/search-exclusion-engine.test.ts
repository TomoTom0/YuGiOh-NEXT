import { describe, it, expect } from 'vitest';
import { loadExclusionRules, inferExclusions } from '@/utils/search-exclusion-engine';
import type { SearchConditionState, ExclusionRules } from '@/types/search-exclusion';

describe('search-exclusion-engine', () => {
  const emptyRules = (): ExclusionRules => ({
    fieldToAttribute: [],
    attributeExclusionGroups: [],
    attributeToField: [],
  });

  const createState = (
    overrides: Partial<SearchConditionState> = {}
  ): SearchConditionState => ({
    monsterTypeMode: overrides.monsterTypeMode ?? 'and',
    selectedAttributes: overrides.selectedAttributes ?? new Set(),
    fieldInputs: overrides.fieldInputs ?? {},
  });

  describe('loadExclusionRules', () => {
    it('[covers:load_rules.returns_json_data] 排他ルールJSONを読み込める', () => {
      const rules = loadExclusionRules();

      expect(rules.fieldToAttribute).toBeInstanceOf(Array);
      expect(rules.attributeExclusionGroups).toBeInstanceOf(Array);
      expect(rules.attributeToField).toBeInstanceOf(Array);
    });
  });

  describe('inferExclusions', () => {
    it('[covers:infer.initial_selected_attributes_enabled,infer.initial_field_inputs_enabled,infer.trace_disabled_omits_trace] 初期状態を作成しtraceを省略する', () => {
      const result = inferExclusions(
        createState({
          selectedAttributes: new Set(['attr-a']),
          fieldInputs: { 'field-a': true, 'field-b': false },
        }),
        emptyRules(),
        false
      );

      expect(result.attributeStates.get('attr-a')).toEqual({
        enabled: true,
        required: false,
        selected: true,
      });
      expect(result.fieldStates.get('field-a')).toEqual({
        enabled: true,
        hasInput: true,
      });
      expect(result.fieldStates.get('field-b')).toEqual({
        enabled: true,
        hasInput: false,
      });
      expect(result.trace).toBeUndefined();
      expect(result.conflicts).toEqual([]);
    });

    it('[covers:infer.default_rules_used_when_omitted] rules省略時は実データのルールを使う', () => {
      const result = inferExclusions(createState({
        fieldInputs: { 'link-value': true },
      }));

      expect(result.attributeStates.get('monster-type_link')?.required).toBe(true);
    });

    it('[covers:infer.trace_enabled_records_steps] trace有効時は変更過程を記録する', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        fieldToAttribute: [
          { title: 'require attr-a', triggerItems: ['field-a'], target: ['attr-a'] },
        ],
      };

      const result = inferExclusions(createState({
        fieldInputs: { 'field-a': true },
      }), rules, true);

      expect(result.trace).toEqual([
        expect.objectContaining({
          step: 1,
          action: 'field-to-attribute',
          source: 'field-a',
          target: 'attr-a',
        }),
      ]);
    });

    it('[covers:infer.conflict_required_disabled_attribute] 必須かつ無効な属性はcontradictionになる', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        fieldToAttribute: [
          { title: 'disable attr-a', triggerItems: ['field-a'], notTarget: ['attr-a'] },
          { title: 'require attr-a', triggerItems: ['field-b'], target: ['attr-a'] },
        ],
      };

      const result = inferExclusions(createState({
        fieldInputs: { 'field-a': true, 'field-b': true },
      }), rules);

      expect(result.attributeStates.get('attr-a')).toMatchObject({
        enabled: false,
        required: true,
        selected: false,
      });
      expect(result.conflicts).toContainEqual({
        type: 'contradiction',
        message: 'attr-aは必須ですが、選択不可になっています',
        sources: ['attr-a'],
      });
    });

    it('[covers:infer.conflict_input_disabled_field] 入力済み項目が無効化されるとwarningになる', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        attributeToField: [
          { title: 'attr-a negative', trigger: 'card-type_a', negative: ['field-a'] },
        ],
      };

      const result = inferExclusions(createState({
        monsterTypeMode: 'or',
        selectedAttributes: new Set(['card-type_a']),
        fieldInputs: { 'field-a': true },
      }), rules);

      expect(result.fieldStates.get('field-a')?.enabled).toBe(false);
      expect(result.conflicts).toContainEqual({
        type: 'warning',
        message: 'field-aに入力がありますが、無効化されています',
        sources: ['field-a'],
      });
    });
  });

  describe('fieldToAttribute', () => {
    it('[covers:field_to_attr.exact_trigger_requires_truthy_input] exact triggerはtruthy入力でだけ適用される', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        fieldToAttribute: [
          { title: 'require attr-a', triggerItems: ['field-a'], target: ['attr-a'] },
        ],
      };

      const result = inferExclusions(createState({
        fieldInputs: { 'field-a': false },
      }), rules);

      expect(result.attributeStates.has('attr-a')).toBe(false);
    });

    it('[covers:field_to_attr.wildcard_trigger_matches_truthy_prefix,field_to_attr.target_creates_required_selected_attr] wildcard triggerはprefix一致のtruthy入力でtargetを必須化する', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        fieldToAttribute: [
          { title: 'require attr-a', triggerItems: ['kind*'], target: ['attr-a'] },
        ],
      };

      const result = inferExclusions(createState({
        fieldInputs: { 'kind-1': true, other: true },
      }), rules);

      expect(result.attributeStates.get('attr-a')).toMatchObject({
        enabled: true,
        required: true,
        selected: true,
      });
    });

    it('[covers:field_to_attr.disabled_target_becomes_required_not_selected] 無効化済みtargetはrequiredになるがselectedにはならない', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        fieldToAttribute: [
          { title: 'disable attr-a', triggerItems: ['field-a'], notTarget: ['attr-a'] },
          { title: 'require attr-a', triggerItems: ['field-b'], target: ['attr-a'] },
        ],
      };

      const result = inferExclusions(createState({
        fieldInputs: { 'field-a': true, 'field-b': true },
      }), rules, true);

      expect(result.attributeStates.get('attr-a')).toMatchObject({
        enabled: false,
        required: true,
        selected: false,
      });
      expect(result.trace).toContainEqual(expect.objectContaining({
        action: 'field-to-attribute',
        target: 'attr-a',
        reason: 'require attr-a: 必須化（無効だが必須）',
      }));
    });

    it('[covers:field_to_attr.already_required_no_change,field_to_attr.not_target_already_disabled_no_change] 2回目以降の同じrequired/disabled更新はtraceを重複させない', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        fieldToAttribute: [
          { title: 'require attr-a', triggerItems: ['field-a'], target: ['attr-a'] },
          { title: 'disable attr-b', triggerItems: ['field-a'], notTarget: ['attr-b'] },
        ],
      };

      const result = inferExclusions(createState({
        fieldInputs: { 'field-a': true },
      }), rules, true);

      expect(result.trace?.filter((t) => t.target === 'attr-a')).toHaveLength(1);
      expect(result.trace?.filter((t) => t.target === 'attr-b')).toHaveLength(1);
    });

    it('[covers:field_to_attr.not_target_disables_attr] notTargetは属性を無効化し理由を設定する', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        fieldToAttribute: [
          { title: 'disable attr-a', triggerItems: ['field-a'], notTarget: ['attr-a'] },
        ],
      };

      const result = inferExclusions(createState({
        fieldInputs: { 'field-a': true },
      }), rules);

      expect(result.attributeStates.get('attr-a')).toMatchObject({
        enabled: false,
        required: false,
        selected: false,
      });
      expect(result.attributeStates.get('attr-a')?.disabledReason).toBeDefined();
    });
  });

  describe('attributeExclusion', () => {
    it('[covers:attr_exclusion.no_active_attrs_skips_group] active属性が無いグループは何も作成しない', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        attributeExclusionGroups: [
          { title: 'group-a', items: ['attr-a', 'attr-b'] },
        ],
      };

      const result = inferExclusions(createState(), rules);

      expect(result.attributeStates.has('attr-a')).toBe(false);
      expect(result.attributeStates.has('attr-b')).toBe(false);
    });

    it('[covers:attr_exclusion.card_type_always_applies,attr_exclusion.disables_missing_or_enabled_non_primary] card-typeグループはORモードでも排他を適用する', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        attributeExclusionGroups: [
          { title: 'card-type', items: ['card-type_a', 'card-type_b'] },
        ],
      };

      const result = inferExclusions(createState({
        monsterTypeMode: 'or',
        selectedAttributes: new Set(['card-type_a']),
      }), rules);

      expect(result.attributeStates.get('card-type_a')?.enabled).toBe(true);
      expect(result.attributeStates.get('card-type_b')).toMatchObject({
        enabled: false,
        selected: false,
      });
      expect(result.attributeStates.get('card-type_b')?.disabledReason).toBeDefined();
    });

    it('[covers:attr_exclusion.and_mode_applies] ANDモードでは非card-typeグループも排他を適用する', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        attributeExclusionGroups: [
          { title: 'group-a', items: ['attr-a', 'attr-b'] },
        ],
      };

      const result = inferExclusions(createState({
        monsterTypeMode: 'and',
        selectedAttributes: new Set(['attr-a']),
      }), rules);

      expect(result.attributeStates.get('attr-b')?.enabled).toBe(false);
    });

    it('[covers:attr_exclusion.or_direct_selection_skips_non_card_group] ORモードの直接選択だけなら非card-typeグループは排他しない', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        attributeExclusionGroups: [
          { title: 'group-a', items: ['attr-a', 'attr-b'] },
        ],
      };

      const result = inferExclusions(createState({
        monsterTypeMode: 'or',
        selectedAttributes: new Set(['attr-a']),
      }), rules);

      expect(result.attributeStates.get('attr-a')?.enabled).toBe(true);
      expect(result.attributeStates.has('attr-b')).toBe(false);
    });

    it('[covers:attr_exclusion.or_required_applies_non_card_group] ORモードでもrequired属性を含む非card-typeグループは排他する', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        fieldToAttribute: [
          { title: 'require attr-a', triggerItems: ['field-a'], target: ['attr-a'] },
        ],
        attributeExclusionGroups: [
          { title: 'group-a', items: ['attr-a', 'attr-b'] },
        ],
      };

      const result = inferExclusions(createState({
        monsterTypeMode: 'or',
        fieldInputs: { 'field-a': true },
      }), rules);

      expect(result.attributeStates.get('attr-a')?.required).toBe(true);
      expect(result.attributeStates.get('attr-b')?.enabled).toBe(false);
    });

    it('[covers:attr_exclusion.primary_required_first] 複数active属性ではrequired属性をprimaryにする', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        fieldToAttribute: [
          { title: 'require attr-required', triggerItems: ['field-a'], target: ['attr-required'] },
        ],
        attributeExclusionGroups: [
          { title: 'group-a', items: ['attr-direct', 'attr-required', 'attr-other'] },
        ],
      };

      const result = inferExclusions(createState({
        monsterTypeMode: 'or',
        selectedAttributes: new Set(['attr-direct']),
        fieldInputs: { 'field-a': true },
      }), rules);

      expect(result.attributeStates.get('attr-required')).toMatchObject({
        enabled: true,
        required: true,
        selected: true,
      });
      expect(result.attributeStates.get('attr-direct')).toMatchObject({
        enabled: false,
        selected: false,
      });
    });

    it('[covers:attr_exclusion.primary_active_first_when_no_required] requiredが無い複数active属性ではgroup.items上の先頭をprimaryにする', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        attributeExclusionGroups: [
          { title: 'card-type', items: ['card-type_b', 'card-type_a', 'card-type_c'] },
        ],
      };

      const result = inferExclusions(createState({
        monsterTypeMode: 'or',
        selectedAttributes: new Set(['card-type_a', 'card-type_b']),
      }), rules);

      expect(result.attributeStates.get('card-type_b')?.enabled).toBe(true);
      expect(result.attributeStates.get('card-type_a')).toMatchObject({
        enabled: false,
        selected: false,
      });
    });
  });

  describe('attributeToField', () => {
    it('[covers:attr_to_field.absent_or_unselected_trigger_skips] trigger属性が無い場合はnegative項目を無効化しない', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        attributeToField: [
          { title: 'attr-a negative', trigger: 'attr-a', negative: ['field-a'] },
        ],
      };

      const result = inferExclusions(createState({
        fieldInputs: { 'field-a': false },
      }), rules);

      expect(result.fieldStates.get('field-a')?.enabled).toBe(true);
    });

    it('[covers:attr_to_field.card_type_applies_even_or_direct,attr_to_field.negative_missing_field_created_disabled] card-type triggerはORモードの直接選択でも項目を無効化する', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        attributeToField: [
          { title: 'card-type negative', trigger: 'card-type_a', negative: ['new-field'] },
        ],
      };

      const result = inferExclusions(createState({
        monsterTypeMode: 'or',
        selectedAttributes: new Set(['card-type_a']),
      }), rules);

      expect(result.fieldStates.get('new-field')).toMatchObject({
        enabled: false,
        hasInput: false,
      });
      expect(result.fieldStates.get('new-field')?.disabledReason).toBeDefined();
    });

    it('[covers:attr_to_field.non_card_and_mode_applies] 非card-type triggerはANDモードなら直接選択で項目を無効化する', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        attributeToField: [
          { title: 'attr-a negative', trigger: 'attr-a', negative: ['field-a'] },
        ],
      };

      const result = inferExclusions(createState({
        monsterTypeMode: 'and',
        selectedAttributes: new Set(['attr-a']),
        fieldInputs: { 'field-a': false },
      }), rules);

      expect(result.fieldStates.get('field-a')?.enabled).toBe(false);
    });

    it('[covers:attr_to_field.non_card_or_direct_skips] 非card-type triggerはORモードの直接選択だけでは項目を無効化しない', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        attributeToField: [
          { title: 'attr-a negative', trigger: 'attr-a', negative: ['field-a'] },
        ],
      };

      const result = inferExclusions(createState({
        monsterTypeMode: 'or',
        selectedAttributes: new Set(['attr-a']),
        fieldInputs: { 'field-a': false },
      }), rules);

      expect(result.fieldStates.get('field-a')?.enabled).toBe(true);
    });

    it('[covers:attr_to_field.non_card_or_required_applies] 非card-type triggerもrequiredならORモードで項目を無効化する', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        fieldToAttribute: [
          { title: 'require attr-a', triggerItems: ['required-field'], target: ['attr-a'] },
        ],
        attributeToField: [
          { title: 'attr-a negative', trigger: 'attr-a', negative: ['field-a'] },
        ],
      };

      const result = inferExclusions(createState({
        monsterTypeMode: 'or',
        fieldInputs: { 'required-field': true, 'field-a': false },
      }), rules);

      expect(result.attributeStates.get('attr-a')?.required).toBe(true);
      expect(result.fieldStates.get('field-a')?.enabled).toBe(false);
    });

    it('[covers:attr_to_field.trigger_wildcard_not_expanded] attributeToFieldのtrigger末尾*は展開されない', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        attributeToField: [
          { title: 'wildcard-looking trigger', trigger: 'spell-type*', negative: ['field-a'] },
        ],
      };

      const result = inferExclusions(createState({
        monsterTypeMode: 'and',
        selectedAttributes: new Set(['spell-type_quick']),
        fieldInputs: { 'field-a': false },
      }), rules);

      expect(result.fieldStates.get('field-a')?.enabled).toBe(true);
    });

    it('[covers:attr_to_field.disabled_attr_exact_required_field_disabled,attr_to_field.disabled_attr_inherits_reason] 無効属性を必須とするexact項目は属性の理由を引き継いで無効化される', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        fieldToAttribute: [
          { title: 'disable attr-a', triggerItems: ['disable-field'], notTarget: ['attr-a'] },
          { title: 'field-a requires attr-a', triggerItems: ['field-a'], target: ['attr-a'] },
        ],
      };

      const result = inferExclusions(createState({
        fieldInputs: { 'disable-field': true, 'field-a': false },
      }), rules);

      expect(result.attributeStates.get('attr-a')?.enabled).toBe(false);
      expect(result.fieldStates.get('field-a')).toMatchObject({
        enabled: false,
        hasInput: false,
        disabledReason: result.attributeStates.get('attr-a')?.disabledReason,
      });
    });

    it('[covers:attr_to_field.disabled_attr_wildcard_disables_existing_prefix_fields] 無効属性を必須とするwildcard項目は既存prefix項目だけ無効化する', () => {
      const rules: ExclusionRules = {
        ...emptyRules(),
        fieldToAttribute: [
          { title: 'disable attr-a', triggerItems: ['disable-field'], notTarget: ['attr-a'] },
          { title: 'kind requires attr-a', triggerItems: ['kind*'], target: ['attr-a'] },
        ],
      };

      const result = inferExclusions(createState({
        fieldInputs: { 'disable-field': true, 'kind-1': false, other: false },
      }), rules);

      expect(result.fieldStates.get('kind-1')?.enabled).toBe(false);
      expect(result.fieldStates.get('other')?.enabled).toBe(true);
      expect(result.fieldStates.has('kind-missing')).toBe(false);
    });
  });
});
