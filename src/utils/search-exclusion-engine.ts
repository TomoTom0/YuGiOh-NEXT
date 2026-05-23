/**
 * 検索条件の排他ルール推論エンジン
 */

import type {
  SearchConditionState,
  ExclusionResult,
  ExclusionRules,
  ExclusionGroup,
} from '../types/search-exclusion';
import exclusionRulesData from '../data/search-exclusion-rules.json';
import { formatDisabledReason } from './disabled-reason-formatter';

/**
 * 排他ルールを読み込む
 */
export function loadExclusionRules(): ExclusionRules {
  return exclusionRulesData as ExclusionRules;
}

/**
 * 排他条件の推論を実行
 */
export function inferExclusions(
  state: SearchConditionState,
  rules: ExclusionRules = loadExclusionRules(),
  enableTrace = false
): ExclusionResult {
  const result = createInitialResult(state);

  let changed = true;
  let iteration = 0;
  const maxIterations = 10;

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    if (enableTrace) {
      result.trace = result.trace || [];
    }

    if (applyFieldToAttribute(state, rules, result, iteration, enableTrace)) {
      changed = true;
    }

    if (applyAttributeExclusion(state, rules, result, iteration, enableTrace)) {
      changed = true;
    }

    if (applyAttributeToField(state, rules, result, iteration, enableTrace)) {
      changed = true;
    }
  }

  detectConflicts(result);

  if (iteration >= maxIterations) {
    result.conflicts.push({
      type: 'warning',
      message: '推論が収束しませんでした（循環参照の可能性）',
      sources: [],
    });
  }

  return result;
}

/**
 * 初期状態を作成
 */
function createInitialResult(state: SearchConditionState): ExclusionResult {
  const result: ExclusionResult = {
    attributeStates: new Map(),
    fieldStates: new Map(),
    conflicts: [],
  };

  // すべての属性を初期化（選択されているもの以外はデフォルトで有効）
  for (const attr of state.selectedAttributes) {
    result.attributeStates.set(attr, {
      enabled: true,
      required: false,
      selected: true,
    });
  }

  // すべての項目を初期化
  for (const [field, hasInput] of Object.entries(state.fieldInputs)) {
    result.fieldStates.set(field, {
      enabled: true,
      hasInput,
    });
  }

  return result;
}

/**
 * 項目→属性の必須化を適用
 */
function applyFieldToAttribute(
  state: SearchConditionState,
  rules: ExclusionRules,
  result: ExclusionResult,
  iteration: number,
  enableTrace: boolean
): boolean {
  let changed = false;

  for (const rule of rules.fieldToAttribute) {
    // ワイルドカード対応: "monster-type*" など
    const hasInput = rule.triggerItems.some((fieldPattern) => {
      if (fieldPattern.endsWith('*')) {
        const prefix = fieldPattern.slice(0, -1);
        return Object.entries(state.fieldInputs).some(
          ([field, input]) => input && field.startsWith(prefix)
        );
      }
      return state.fieldInputs[fieldPattern];
    });

    if (!hasInput) continue;

    // target属性を必須化
    if (rule.target) {
      for (const attr of rule.target) {
        let attrState = result.attributeStates.get(attr);

        // 属性が存在しない場合、新規作成（この時点では排他チェック前なのでenabled: true）
        if (!attrState) {
          attrState = {
            enabled: true,
            required: false,
            selected: false,
          };
          result.attributeStates.set(attr, attrState);
        }

        // 既に無効化されている場合でも、必須フラグは立てる（矛盾として検出するため）
        if (!attrState.required) {
          attrState.required = true;
          // 有効な場合のみ選択状態にする
          if (attrState.enabled) {
            attrState.selected = true;
          }
          changed = true;

          if (enableTrace) {
            result.trace!.push({
              step: iteration,
              action: 'field-to-attribute',
              source: rule.triggerItems.join(','),
              target: attr,
              reason: `${rule.title}: 必須化${!attrState.enabled ? '（無効だが必須）' : ''}`,
            });
          }
        }
      }
    }

    // notTarget属性を無効化
    if (rule.notTarget) {
      for (const attr of rule.notTarget) {
        let attrState = result.attributeStates.get(attr);
        if (!attrState) {
          attrState = {
            enabled: true,
            required: false,
            selected: false,
          };
          result.attributeStates.set(attr, attrState);
        }

        if (attrState.enabled) {
          attrState.enabled = false;
          attrState.selected = false;
          attrState.disabledReason = formatDisabledReason('field-to-attribute', rule.triggerItems);
          changed = true;

          if (enableTrace) {
            result.trace!.push({
              step: iteration,
              action: 'field-to-attribute',
              source: rule.triggerItems.join(','),
              target: attr,
              reason: `${rule.title}: 無効化`,
            });
          }
        }
      }
    }
  }

  return changed;
}

/**
 * 属性→属性の排他を適用
 */
function applyAttributeExclusion(
  state: SearchConditionState,
  rules: ExclusionRules,
  result: ExclusionResult,
  iteration: number,
  enableTrace: boolean
): boolean {
  let changed = false;

  for (const group of rules.attributeExclusionGroups) {
    // グループ内で選択/必須の属性を探す
    const activeAttrs = group.items.filter((attr) => {
      const attrState = result.attributeStates.get(attr);
      return attrState && (attrState.selected || attrState.required);
    });

    if (activeAttrs.length === 0) continue;

    // 排他適用の判定
    const shouldApply = shouldApplyExclusionForGroup(group, activeAttrs, state.monsterTypeMode, result);

    if (!shouldApply) continue;

    // 複数のactive属性がある場合、優先順位を付ける
    // 優先順位: required（項目から必須） > selected（直接選択、必須でない）
    let primaryAttr: string | null = null;
    if (activeAttrs.length > 1) {
      // 項目から必須化された属性を最優先
      const requiredAttrs = activeAttrs.filter((attr) => {
        const attrState = result.attributeStates.get(attr);
        return attrState?.required;
      });

      if (requiredAttrs.length > 0) {
        // 必須属性がある場合は最初の1つを優先
        primaryAttr = requiredAttrs[0] ?? null;
      } else {
        // すべて直接選択の場合は最初の1つを優先（ORモードの場合のみ発生）
        primaryAttr = activeAttrs[0] ?? null;
      }
    } else {
      primaryAttr = activeAttrs[0] ?? null;
    }

    // グループ内の他の属性を無効化（primaryAttr以外）
    for (const attr of group.items) {
      if (attr === primaryAttr) continue;

      let attrState = result.attributeStates.get(attr);
      if (!attrState) {
        attrState = {
          enabled: true,
          required: false,
          selected: false,
        };
        result.attributeStates.set(attr, attrState);
      }

      if (attrState.enabled) {
        attrState.enabled = false;
        attrState.selected = false;
        attrState.disabledReason = formatDisabledReason('attribute-exclusion', primaryAttr ?? '');
        changed = true;

        if (enableTrace && primaryAttr) {
          result.trace!.push({
            step: iteration,
            action: 'attribute-exclusion',
            source: primaryAttr,
            target: attr,
            reason: `${group.title}グループの排他`,
          });
        }
      }
    }
  }

  return changed;
}

/**
 * 排他グループの適用判定
 */
function shouldApplyExclusionForGroup(
  group: ExclusionGroup,
  activeAttrs: string[],
  mode: 'and' | 'or',
  result: ExclusionResult
): boolean {
  // card-typeグループは常に適用
  if (group.title === 'card-type') {
    return true;
  }

  // ANDモードは常に適用
  if (mode === 'and') {
    return true;
  }

  // ORモード: 必須属性（項目から決まった）が含まれる場合は適用
  const hasRequiredAttr = activeAttrs.some((attr) => {
    const attrState = result.attributeStates.get(attr);
    return attrState?.required;
  });

  return hasRequiredAttr;
}

/**
 * 属性→項目の無効化を適用
 */
function applyAttributeToField(
  state: SearchConditionState,
  rules: ExclusionRules,
  result: ExclusionResult,
  iteration: number,
  enableTrace: boolean
): boolean {
  let changed = false;

  // 1. 属性が有効かつ選択されている場合、negative項目を無効化
  for (const rule of rules.attributeToField) {
    const attrState = result.attributeStates.get(rule.trigger);

    // ORモードの場合、直接選択された属性（required=false）は項目を無効化しない
    // ただし、card-type_* の場合は常に適用する
    const isCardType = rule.trigger.startsWith('card-type_');
    const shouldApplyToField = attrState && attrState.selected &&
      (isCardType || state.monsterTypeMode === 'and' || attrState.required);

    if (shouldApplyToField) {
      for (const field of rule.negative) {
        let fieldState = result.fieldStates.get(field);
        if (!fieldState) {
          fieldState = {
            enabled: true,
            hasInput: false,
          };
          result.fieldStates.set(field, fieldState);
        }

        if (fieldState.enabled) {
          fieldState.enabled = false;
          fieldState.disabledReason = formatDisabledReason('attribute-to-field', rule.trigger);
          changed = true;

          if (enableTrace) {
            result.trace!.push({
              step: iteration,
              action: 'attribute-to-field',
              source: rule.trigger,
              target: field,
              reason: `${rule.title}: 無効化`,
            });
          }
        }
      }
    }
  }

  // 2. 属性が無効になった場合、それを必須とする項目も無効化
  for (const [attr, attrState] of result.attributeStates) {
    if (attrState.enabled) continue;

    const requiresThisAttr = rules.fieldToAttribute.filter((r) => r.target?.includes(attr));

    for (const req of requiresThisAttr) {
      for (const fieldPattern of req.triggerItems) {
        // ワイルドカード対応
        const fields: string[] = [];
        if (fieldPattern.endsWith('*')) {
          const prefix = fieldPattern.slice(0, -1);
          for (const field of result.fieldStates.keys()) {
            if (field.startsWith(prefix)) {
              fields.push(field);
            }
          }
        } else {
          fields.push(fieldPattern);
        }

        for (const field of fields) {
          let fieldState = result.fieldStates.get(field);
          if (!fieldState) {
            fieldState = {
              enabled: true,
              hasInput: false,
            };
            result.fieldStates.set(field, fieldState);
          }

          if (fieldState.enabled) {
            fieldState.enabled = false;
            // 属性が無効な理由を引き継ぐ（あれば）
            const attrReason = attrState.disabledReason;
            fieldState.disabledReason = attrReason || formatDisabledReason('attribute-unavailable', attr);
            changed = true;

            if (enableTrace) {
              result.trace!.push({
                step: iteration,
                action: 'attribute-unavailable-to-field',
                source: attr,
                target: field,
                reason: '必須属性が選択不可',
              });
            }
          }
        }
      }
    }
  }

  return changed;
}

/**
 * 矛盾を検出
 */
function detectConflicts(result: ExclusionResult): void {
  // 必須だが無効な属性
  for (const [attr, state] of result.attributeStates) {
    if (state.required && !state.enabled) {
      result.conflicts.push({
        type: 'contradiction',
        message: `${attr}は必須ですが、選択不可になっています`,
        sources: [attr],
      });
    }
  }

  // 入力があるが無効な項目
  for (const [field, state] of result.fieldStates) {
    if (state.hasInput && !state.enabled) {
      result.conflicts.push({
        type: 'warning',
        message: `${field}に入力がありますが、無効化されています`,
        sources: [field],
      });
    }
  }
}
