import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAttributeLabel,
  getRaceLabel,
  getMonsterTypeLabel,
  getLevelLabel,
  getSpellTypeLabel,
  getTrapTypeLabel,
  getCardTypeLabel,
  getEffectTypeLabel,
  getMonsterTypesLabel,
} from '@/utils/label-utils';

// tests/design/label-utils/conditions.toml [covers:<id>] タグでカバー範囲を明示する。
// mappingManager / detectLanguage は label-utils.ts の直接の依存であり、
// 本ファイルの分岐（フォールバック優先順位）を検証するためにモックする。

const getAttributeIdToText = vi.fn();
const getRaceIdToText = vi.fn();
const getMonsterTypeIdToText = vi.fn();
const getSpellEffectIdToText = vi.fn();
const getTrapEffectIdToText = vi.fn();

vi.mock('@/utils/mapping-manager', () => ({
  mappingManager: {
    getAttributeIdToText: (lang: string) => getAttributeIdToText(lang),
    getRaceIdToText: (lang: string) => getRaceIdToText(lang),
    getMonsterTypeIdToText: (lang: string) => getMonsterTypeIdToText(lang),
    getSpellEffectIdToText: (lang: string) => getSpellEffectIdToText(lang),
    getTrapEffectIdToText: (lang: string) => getTrapEffectIdToText(lang),
  },
}));

const detectLanguage = vi.fn();
vi.mock('@/utils/language-detector', () => ({
  detectLanguage: (doc: Document) => detectLanguage(doc),
}));

beforeEach(() => {
  getAttributeIdToText.mockReset().mockReturnValue({});
  getRaceIdToText.mockReset().mockReturnValue({});
  getMonsterTypeIdToText.mockReset().mockReturnValue({});
  getSpellEffectIdToText.mockReset().mockReturnValue({});
  getTrapEffectIdToText.mockReset().mockReturnValue({});
  detectLanguage.mockReset().mockReturnValue('ja');
});

describe('getAttributeLabel', () => {
  it('[covers:get_attribute_label.dynamic_mapping_hit] 動的マッピングにヒットした場合はその値を返す', () => {
    getAttributeIdToText.mockReturnValue({ light: '光' });
    expect(getAttributeLabel('light')).toBe('光');
  });

  it('[covers:get_attribute_label.static_fallback] 動的マッピングにキーが無い場合は静的マッピングにフォールバックする', () => {
    getAttributeIdToText.mockReturnValue({});
    expect(getAttributeLabel('light')).toBe('光'); // ATTRIBUTE_ID_TO_NAME['light']
  });

  it('[covers:get_attribute_label.unmapped_returns_input] どちらにもキーが無い場合は入力値をそのまま返す', () => {
    getAttributeIdToText.mockReturnValue({});
    expect(getAttributeLabel('unknown_attr')).toBe('unknown_attr');
  });
});

describe('getRaceLabel', () => {
  it('[covers:get_race_label.dynamic_mapping_hit] 動的マッピングにヒットした場合はその値を返す', () => {
    getRaceIdToText.mockReturnValue({ dragon: 'ドラゴン族' });
    expect(getRaceLabel('dragon')).toBe('ドラゴン族');
  });

  it('[covers:get_race_label.static_fallback] 動的マッピングにキーが無い場合は静的マッピングにフォールバックする', () => {
    getRaceIdToText.mockReturnValue({});
    expect(getRaceLabel('dragon')).toBe('ドラゴン族'); // RACE_ID_TO_NAME['dragon']
  });

  it('[covers:get_race_label.unmapped_returns_input] どちらにもキーが無い場合は入力値をそのまま返す', () => {
    getRaceIdToText.mockReturnValue({});
    expect(getRaceLabel('unknown_race')).toBe('unknown_race');
  });
});

describe('getMonsterTypeLabel', () => {
  it('[covers:get_monster_type_label.dynamic_mapping_hit] 動的マッピングにヒットした場合はその値を返す', () => {
    getMonsterTypeIdToText.mockReturnValue({ fusion: '融合' });
    expect(getMonsterTypeLabel('fusion')).toBe('融合');
  });

  it('[covers:get_monster_type_label.static_fallback] 動的マッピングにキーが無い場合は静的マッピングにフォールバックする', () => {
    getMonsterTypeIdToText.mockReturnValue({});
    expect(getMonsterTypeLabel('fusion')).toBe('融合'); // MONSTER_TYPE_ID_TO_NAME['fusion']
  });

  it('[covers:get_monster_type_label.unmapped_returns_input] どちらにもキーが無い場合は入力値をそのまま返す', () => {
    getMonsterTypeIdToText.mockReturnValue({});
    expect(getMonsterTypeLabel('unknown_type')).toBe('unknown_type');
  });
});

describe('getLevelLabel', () => {
  it('[covers:get_level_label.level_type] levelType=level は Lv.{value} を返す', () => {
    expect(getLevelLabel({ levelValue: 4, levelType: 'level' })).toBe('Lv.4');
  });

  it('[covers:get_level_label.rank_type] levelType=rank は Rank {value} を返す', () => {
    expect(getLevelLabel({ levelValue: 4, levelType: 'rank' })).toBe('Rank 4');
  });

  it('[covers:get_level_label.link_type] levelType=link は LINK-{value} を返す', () => {
    expect(getLevelLabel({ levelValue: 3, levelType: 'link' })).toBe('LINK-3');
  });

  it('[covers:get_level_label.unknown_type_defaults_to_level] 未知のlevelTypeはdefault節でLv.{value}を返す', () => {
    expect(getLevelLabel({ levelValue: 4, levelType: 'pendulum' })).toBe('Lv.4');
  });
});

describe('getSpellTypeLabel', () => {
  it('[covers:get_spell_type_label.dynamic_mapping_hit] 動的マッピングにヒットした場合はその値を返す', () => {
    getSpellEffectIdToText.mockReturnValue({ normal: '通常魔法' });
    expect(getSpellTypeLabel('normal')).toBe('通常魔法');
  });

  it('[covers:get_spell_type_label.static_fallback] 動的マッピングがfalsyの場合は静的マッピングにフォールバックする', () => {
    getSpellEffectIdToText.mockReturnValue({});
    expect(getSpellTypeLabel('normal')).toBe('通常'); // SPELL_EFFECT_TYPE_ID_TO_NAME['normal']
  });

  it('[covers:get_spell_type_label.unmapped_returns_input] どちらにもキーが無い場合は入力値をそのまま返す', () => {
    getSpellEffectIdToText.mockReturnValue({});
    expect(getSpellTypeLabel('unknown_effect')).toBe('unknown_effect');
  });
});

describe('getTrapTypeLabel', () => {
  it('[covers:get_trap_type_label.dynamic_mapping_hit] 動的マッピングにヒットした場合はその値を返す', () => {
    getTrapEffectIdToText.mockReturnValue({ continuous: '永続罠' });
    expect(getTrapTypeLabel('continuous')).toBe('永続罠');
  });

  it('[covers:get_trap_type_label.static_fallback] 動的マッピングがfalsyの場合は静的マッピングにフォールバックする', () => {
    getTrapEffectIdToText.mockReturnValue({});
    expect(getTrapTypeLabel('continuous')).toBe('永続'); // TRAP_EFFECT_TYPE_ID_TO_NAME['continuous']
  });

  it('[covers:get_trap_type_label.unmapped_returns_input] どちらにもキーが無い場合は入力値をそのまま返す', () => {
    getTrapEffectIdToText.mockReturnValue({});
    expect(getTrapTypeLabel('unknown_effect')).toBe('unknown_effect');
  });
});

describe('getCardTypeLabel', () => {
  it('[covers:get_card_type_label.spell_ja] spell/ja は 魔法 を返す', () => {
    detectLanguage.mockReturnValue('ja');
    expect(getCardTypeLabel('spell')).toBe('魔法');
  });

  it('[covers:get_card_type_label.spell_non_ja] spell/非ja は Spell を返す', () => {
    detectLanguage.mockReturnValue('en');
    expect(getCardTypeLabel('spell')).toBe('Spell');
  });

  it('[covers:get_card_type_label.trap_ja] trap/ja は 罠 を返す', () => {
    detectLanguage.mockReturnValue('ja');
    expect(getCardTypeLabel('trap')).toBe('罠');
  });

  it('[covers:get_card_type_label.trap_non_ja] trap/非ja は Trap を返す', () => {
    detectLanguage.mockReturnValue('en');
    expect(getCardTypeLabel('trap')).toBe('Trap');
  });

  it('[covers:get_card_type_label.monster_ja] monster/ja は モンスター を返す', () => {
    detectLanguage.mockReturnValue('ja');
    expect(getCardTypeLabel('monster')).toBe('モンスター');
  });

  it('[covers:get_card_type_label.monster_non_ja] monster/非ja は Monster を返す', () => {
    detectLanguage.mockReturnValue('en');
    expect(getCardTypeLabel('monster')).toBe('Monster');
  });

  it('[covers:get_card_type_label.unknown_returns_input] 未知のcardTypeは入力値をそのまま返す', () => {
    detectLanguage.mockReturnValue('ja');
    expect(getCardTypeLabel('unknown')).toBe('unknown');
  });
});

describe('getEffectTypeLabel', () => {
  it('[covers:get_effect_type_label.spell_delegates] cardType=spell は getSpellTypeLabel に委譲する', () => {
    getSpellEffectIdToText.mockReturnValue({});
    expect(getEffectTypeLabel('normal', 'spell')).toBe(getSpellTypeLabel('normal'));
  });

  it('[covers:get_effect_type_label.trap_delegates] cardType=trap は getTrapTypeLabel に委譲する', () => {
    getTrapEffectIdToText.mockReturnValue({});
    expect(getEffectTypeLabel('continuous', 'trap')).toBe(getTrapTypeLabel('continuous'));
  });

  it('[covers:get_effect_type_label.other_returns_input] spell/trap以外は入力値effectTypeをそのまま返す', () => {
    expect(getEffectTypeLabel('normal', 'monster')).toBe('normal');
  });
});

describe('getMonsterTypesLabel', () => {
  it('[covers:get_monster_types_label.nullish_returns_empty] undefinedの場合は空文字列を返す', () => {
    // @ts-expect-error 実行時の防御ガードを検証するため意図的に型に反する値を渡す
    expect(getMonsterTypesLabel(undefined)).toBe('');
  });

  it('[covers:get_monster_types_label.non_array_returns_empty] 配列でない値の場合は空文字列を返す', () => {
    // @ts-expect-error 実行時の防御ガードを検証するため意図的に型に反する値を渡す
    expect(getMonsterTypesLabel('fusion')).toBe('');
  });

  it('[covers:get_monster_types_label.valid_array_maps_and_joins] 配列の場合は各要素を変換し / で結合する', () => {
    getMonsterTypeIdToText.mockReturnValue({ fusion: '融合', synchro: 'シンクロ' });
    expect(getMonsterTypesLabel(['fusion', 'synchro'])).toBe('融合 / シンクロ');
  });
});
