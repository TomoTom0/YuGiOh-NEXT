import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAttributeLabel,
  getCardTypeLabel,
  getMonsterTypeLabel,
  getRaceLabel,
  getSpellTypeLabel,
  getTrapTypeLabel,
  getChipLabel,
} from '../../../src/utils/filter-label';
import { detectLanguage } from '../../../src/utils/language-detector';

// mappingManager をモック
vi.mock('../../../src/utils/mapping-manager', () => ({
  mappingManager: {
    getAttributeIdToText: vi.fn((lang: string) => {
      if (lang === 'ja') {
        return {
          light: '光',
          dark: '闇',
          water: '水',
          fire: '炎',
          earth: '地',
          wind: '風',
          divine: '神',
        };
      } else if (lang === 'en') {
        return {
          light: 'Light',
          dark: 'Dark',
          water: 'Water',
          fire: 'Fire',
          earth: 'Earth',
          wind: 'Wind',
          divine: 'Divine',
        };
      }
      return {};
    }),
  },
}));

// language-detector をモック
vi.mock('../../../src/utils/language-detector', () => ({
  detectLanguage: vi.fn(() => 'ja'),
}));

// tests/design/filter-label/conditions.toml で定義した条件をこのファイルでカバーする。
// [covers:<id>] タグはit()の説明コメントとして付与する。

describe('filter-label', () => {
  beforeEach(() => {
    vi.mocked(detectLanguage).mockClear();
  });

  describe('getAttributeLabel', () => {
    it('日本語で属性のラベルを取得できる', () => {
      // [covers:get_attribute_label.value_found_returns_mapped_label]
      expect(getAttributeLabel('light', 'ja')).toBe('光');
      expect(getAttributeLabel('dark', 'ja')).toBe('闇');
      expect(getAttributeLabel('water', 'ja')).toBe('水');
      expect(getAttributeLabel('fire', 'ja')).toBe('炎');
    });

    it('英語で属性のラベルを取得できる', () => {
      // [covers:get_attribute_label.lang_specified_used_directly]
      expect(getAttributeLabel('light', 'en')).toBe('Light');
      expect(getAttributeLabel('dark', 'en')).toBe('Dark');
      expect(getAttributeLabel('water', 'en')).toBe('Water');
      // lang指定時はdetectLanguageを呼ばない
      expect(detectLanguage).not.toHaveBeenCalled();
    });

    it('存在しない値の場合そのまま返す', () => {
      // [covers:get_attribute_label.value_not_found_returns_value_as_is]
      expect(getAttributeLabel('unknown', 'ja')).toBe('unknown');
    });

    it('langを省略した場合documentが定義されていればdetectLanguageで検出した言語を使用する', () => {
      // [covers:get_attribute_label.lang_omitted_document_defined_uses_detect_language]
      expect(getAttributeLabel('light')).toBe('光');
      expect(detectLanguage).toHaveBeenCalledTimes(1);
      expect(detectLanguage).toHaveBeenCalledWith(document);
    });

    it('langを省略しdocumentが未定義の場合detectLanguageを呼ばず"ja"にフォールバックする', () => {
      // [covers:get_attribute_label.lang_omitted_document_undefined_fallback_ja]
      vi.stubGlobal('document', undefined);
      try {
        expect(getAttributeLabel('light')).toBe('光');
        expect(detectLanguage).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe('getCardTypeLabel', () => {
    it('カードタイプの短縮形ラベルを取得できる', () => {
      // [covers:get_card_type_label.value_found]
      expect(getCardTypeLabel('monster')).toBe('M');
      expect(getCardTypeLabel('spell')).toBe('魔');
      expect(getCardTypeLabel('trap')).toBe('罠');
    });

    it('存在しない値の場合そのまま返す', () => {
      // [covers:get_card_type_label.value_not_found]
      expect(getCardTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getMonsterTypeLabel', () => {
    it('モンスタータイプの短縮形ラベルを取得できる', () => {
      // [covers:get_monster_type_label.value_found]
      expect(getMonsterTypeLabel('normal')).toBe('通');
      expect(getMonsterTypeLabel('effect')).toBe('効');
      expect(getMonsterTypeLabel('fusion')).toBe('融');
      expect(getMonsterTypeLabel('synchro')).toBe('S');
      expect(getMonsterTypeLabel('xyz')).toBe('X');
      expect(getMonsterTypeLabel('link')).toBe('L');
    });

    it('存在しない値の場合そのまま返す', () => {
      // [covers:get_monster_type_label.value_not_found_returns_value_as_is]
      expect(getMonsterTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getRaceLabel', () => {
    it('種族の短縮形ラベルを取得できる', () => {
      // [covers:get_race_label.value_found]
      expect(getRaceLabel('dragon')).toBe('龍');
      expect(getRaceLabel('spellcaster')).toBe('魔使');
      expect(getRaceLabel('zombie')).toBe('不死');
      expect(getRaceLabel('warrior')).toBe('戦士');
    });

    it('存在しない値の場合最初の2文字を返す', () => {
      // [covers:get_race_label.value_not_found_slices_first_two_chars]
      expect(getRaceLabel('unknown')).toBe('un');
      expect(getRaceLabel('xyz')).toBe('xy');
    });
  });

  describe('getSpellTypeLabel', () => {
    it('魔法タイプのラベルを取得できる', () => {
      // [covers:get_spell_type_label.value_found]
      expect(getSpellTypeLabel('normal')).toBe('通常');
      expect(getSpellTypeLabel('continuous')).toBe('永続');
      expect(getSpellTypeLabel('equip')).toBe('装備');
      expect(getSpellTypeLabel('field')).toBe('フィールド');
      expect(getSpellTypeLabel('quick')).toBe('速攻');
      expect(getSpellTypeLabel('ritual')).toBe('儀式');
    });

    it('存在しない値の場合そのまま返す', () => {
      // [covers:get_spell_type_label.value_not_found]
      expect(getSpellTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getTrapTypeLabel', () => {
    it('罠タイプのラベルを取得できる', () => {
      // [covers:get_trap_type_label.value_found]
      expect(getTrapTypeLabel('normal')).toBe('通常');
      expect(getTrapTypeLabel('continuous')).toBe('永続');
      expect(getTrapTypeLabel('counter')).toBe('カウンター');
    });

    it('存在しない値の場合そのまま返す', () => {
      // [covers:get_trap_type_label.value_not_found]
      expect(getTrapTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getChipLabel', () => {
    it('attributes の場合正しくラベルを取得する', () => {
      // [covers:get_chip_label.attributes_delegates]
      expect(getChipLabel('attributes', 'light')).toBe('光');
      expect(getChipLabel('attributes', 'dark')).toBe('闇');
    });

    it('cardType の場合正しくラベルを取得する', () => {
      // [covers:get_chip_label.card_type_delegates]
      expect(getChipLabel('cardType', 'monster')).toBe('M');
      expect(getChipLabel('cardType', 'spell')).toBe('魔');
    });

    it('monsterTypes の場合正しくラベルを取得する', () => {
      // [covers:get_chip_label.monster_types_delegates]
      expect(getChipLabel('monsterTypes', 'fusion')).toBe('融');
      expect(getChipLabel('monsterTypes', 'synchro')).toBe('S');
    });

    it('levels の場合 ★ プレフィックス付きで返す', () => {
      // [covers:get_chip_label.levels_prefixed]
      expect(getChipLabel('levels', '4')).toBe('★4');
      expect(getChipLabel('levels', '8')).toBe('★8');
    });

    it('linkNumbers の場合 L プレフィックス付きで返す', () => {
      // [covers:get_chip_label.link_numbers_prefixed]
      expect(getChipLabel('linkNumbers', '2')).toBe('L2');
      expect(getChipLabel('linkNumbers', '4')).toBe('L4');
    });

    it('races の場合正しくラベルを取得する', () => {
      // [covers:get_chip_label.races_delegates]
      expect(getChipLabel('races', 'dragon')).toBe('龍');
      expect(getChipLabel('races', 'warrior')).toBe('戦士');
    });

    it('atk の場合エラーをthrowする', () => {
      // [covers:get_chip_label.atk_throws]
      expect(() => getChipLabel('atk', '2500')).toThrow(
        'getChipLabel should not be used for atk. Use formatStatLabel instead.'
      );
    });

    it('def の場合エラーをthrowする', () => {
      // [covers:get_chip_label.def_throws]
      expect(() => getChipLabel('def', '2000')).toThrow(
        'getChipLabel should not be used for def. Use formatStatLabel instead.'
      );
    });

    it('未知のタイプの場合値をそのまま返す', () => {
      // [covers:get_chip_label.default_returns_value_as_is]
      expect(getChipLabel('unknown', 'value')).toBe('value');
    });
  });
});
