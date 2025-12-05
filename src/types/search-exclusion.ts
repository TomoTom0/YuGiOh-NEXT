/**
 * 検索条件の排他ルールと推論エンジンの型定義
 */

/**
 * 検索条件の現在の状態
 */
export interface SearchConditionState {
  /** AND/ORモード */
  monsterTypeMode: 'and' | 'or';

  /** 選択された属性（直接選択） */
  selectedAttributes: Set<string>;

  /** 項目の入力状況 */
  fieldInputs: Record<string, boolean>;
}

/**
 * 推論結果
 */
export interface ExclusionResult {
  /** 各属性の状態 */
  attributeStates: Map<string, AttributeState>;

  /** 各項目の状態 */
  fieldStates: Map<string, FieldState>;

  /** エラー・矛盾のリスト */
  conflicts: Conflict[];

  /** 推論の追跡情報（デバッグ用） */
  trace?: InferenceTrace[];
}

/**
 * 属性の状態
 */
export interface AttributeState {
  /** 選択可能か */
  enabled: boolean;

  /** 必須か（項目から自動的に決まった） */
  required: boolean;

  /** 現在選択されているか */
  selected: boolean;

  /** 無効化された理由 */
  disabledReason?: string;
}

/**
 * 項目の状態
 */
export interface FieldState {
  /** 入力可能か */
  enabled: boolean;

  /** 入力されているか */
  hasInput: boolean;

  /** 無効化された理由 */
  disabledReason?: string;
}

/**
 * 矛盾・エラー
 */
export interface Conflict {
  type: 'contradiction' | 'warning';
  message: string;
  sources: string[];
}

/**
 * 推論の追跡情報
 */
export interface InferenceTrace {
  step: number;
  action: string;
  source: string;
  target: string;
  reason: string;
}

/**
 * 排他ルール全体
 */
export interface ExclusionRules {
  /** 属性同士の排他グループ */
  attributeExclusionGroups: ExclusionGroup[];

  /** 属性から項目への決定性 */
  attributeToField: AttributeToFieldRule[];

  /** 項目から属性への決定性 */
  fieldToAttribute: FieldToAttributeRule[];
}

/**
 * 排他グループ
 */
export interface ExclusionGroup {
  title: string;
  items: string[];
}

/**
 * 属性→項目ルール
 */
export interface AttributeToFieldRule {
  title: string;
  trigger: string;        // 属性名
  negative: string[];     // 無効化する項目
}

/**
 * 項目→属性ルール
 */
export interface FieldToAttributeRule {
  title: string;
  triggerItems: string[];  // トリガーとなる項目
  target?: string[];       // 必須となる属性
  notTarget?: string[];    // 選択不可となる属性
}
