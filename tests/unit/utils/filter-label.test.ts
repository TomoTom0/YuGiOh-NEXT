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
    it('[covers:get-attribute-label.value-found-returns-mapped-label] 日本語で属性のラベルを取得できる', () => {
      expect(getAttributeLabel('light', 'ja')).toBe('光');
      expect(getAttributeLabel('dark', 'ja')).toBe('闇');
      expect(getAttributeLabel('water', 'ja')).toBe('水');
      expect(getAttributeLabel('fire', 'ja')).toBe('炎');
    });

    it('[covers:get-attribute-label.lang-specified-used-directly] 英語で属性のラベルを取得できる', () => {
      expect(getAttributeLabel('light', 'en')).toBe('Light');
      expect(getAttributeLabel('dark', 'en')).toBe('Dark');
      expect(getAttributeLabel('water', 'en')).toBe('Water');
      // lang指定時はdetectLanguageを呼ばない
      expect(detectLanguage).not.toHaveBeenCalled();
    });

    it('[covers:get-attribute-label.value-not-found-returns-value-as-is] 存在しない値の場合そのまま返す', () => {
      expect(getAttributeLabel('unknown', 'ja')).toBe('unknown');
    });

    it('[covers:get-attribute-label.lang-omitted-document-defined-uses-detect-language] langを省略した場合documentが定義されていればdetectLanguageで検出した言語を使用する', () => {
      expect(getAttributeLabel('light')).toBe('光');
      expect(detectLanguage).toHaveBeenCalledTimes(1);
      expect(detectLanguage).toHaveBeenCalledWith(document);
    });

    it('[covers:get-attribute-label.lang-omitted-document-undefined-fallback-ja] langを省略しdocumentが未定義の場合detectLanguageを呼ばず"ja"にフォールバックする', () => {
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
    it('[covers:get-card-type-label.value-found] カードタイプの短縮形ラベルを取得できる', () => {
      expect(getCardTypeLabel('monster')).toBe('M');
      expect(getCardTypeLabel('spell')).toBe('魔');
      expect(getCardTypeLabel('trap')).toBe('罠');
    });

    it('[covers:get-card-type-label.value-not-found] 存在しない値の場合そのまま返す', () => {
      expect(getCardTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getMonsterTypeLabel', () => {
    it('[covers:get-monster-type-label.value-found] モンスタータイプの短縮形ラベルを取得できる', () => {
      expect(getMonsterTypeLabel('normal')).toBe('通');
      expect(getMonsterTypeLabel('effect')).toBe('効');
      expect(getMonsterTypeLabel('fusion')).toBe('融');
      expect(getMonsterTypeLabel('synchro')).toBe('S');
      expect(getMonsterTypeLabel('xyz')).toBe('X');
      expect(getMonsterTypeLabel('link')).toBe('L');
    });

    it('[covers:get-monster-type-label.value-not-found-returns-value-as-is] 存在しない値の場合そのまま返す', () => {
      expect(getMonsterTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getRaceLabel', () => {
    it('[covers:get-race-label.value-found] 種族の短縮形ラベルを取得できる', () => {
      expect(getRaceLabel('dragon')).toBe('龍');
      expect(getRaceLabel('spellcaster')).toBe('魔使');
      expect(getRaceLabel('zombie')).toBe('不死');
      expect(getRaceLabel('warrior')).toBe('戦士');
    });

    it('[covers:get-race-label.value-not-found-slices-first-two-chars] 存在しない値の場合最初の2文字を返す', () => {
      expect(getRaceLabel('unknown')).toBe('un');
      expect(getRaceLabel('xyz')).toBe('xy');
    });
  });

  describe('getSpellTypeLabel', () => {
    it('[covers:get-spell-type-label.value-found] 魔法タイプのラベルを取得できる', () => {
      expect(getSpellTypeLabel('normal')).toBe('通常');
      expect(getSpellTypeLabel('continuous')).toBe('永続');
      expect(getSpellTypeLabel('equip')).toBe('装備');
      expect(getSpellTypeLabel('field')).toBe('フィールド');
      expect(getSpellTypeLabel('quick')).toBe('速攻');
      expect(getSpellTypeLabel('ritual')).toBe('儀式');
    });

    it('[covers:get-spell-type-label.value-not-found] 存在しない値の場合そのまま返す', () => {
      expect(getSpellTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getTrapTypeLabel', () => {
    it('[covers:get-trap-type-label.value-found] 罠タイプのラベルを取得できる', () => {
      expect(getTrapTypeLabel('normal')).toBe('通常');
      expect(getTrapTypeLabel('continuous')).toBe('永続');
      expect(getTrapTypeLabel('counter')).toBe('カウンター');
    });

    it('[covers:get-trap-type-label.value-not-found] 存在しない値の場合そのまま返す', () => {
      expect(getTrapTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getChipLabel', () => {
    it('[covers:get-chip-label.attributes-delegates] attributes の場合正しくラベルを取得する', () => {
      expect(getChipLabel('attributes', 'light')).toBe('光');
      expect(getChipLabel('attributes', 'dark')).toBe('闇');
    });

    it('[covers:get-chip-label.card-type-delegates] cardType の場合正しくラベルを取得する', () => {
      expect(getChipLabel('cardType', 'monster')).toBe('M');
      expect(getChipLabel('cardType', 'spell')).toBe('魔');
    });

    it('[covers:get-chip-label.monster-types-delegates] monsterTypes の場合正しくラベルを取得する', () => {
      expect(getChipLabel('monsterTypes', 'fusion')).toBe('融');
      expect(getChipLabel('monsterTypes', 'synchro')).toBe('S');
    });

    it('[covers:get-chip-label.levels-prefixed] levels の場合 ★ プレフィックス付きで返す', () => {
      expect(getChipLabel('levels', '4')).toBe('★4');
      expect(getChipLabel('levels', '8')).toBe('★8');
    });

    it('[covers:get-chip-label.link-numbers-prefixed] linkNumbers の場合 L プレフィックス付きで返す', () => {
      expect(getChipLabel('linkNumbers', '2')).toBe('L2');
      expect(getChipLabel('linkNumbers', '4')).toBe('L4');
    });

    it('[covers:get-chip-label.races-delegates] races の場合正しくラベルを取得する', () => {
      expect(getChipLabel('races', 'dragon')).toBe('龍');
      expect(getChipLabel('races', 'warrior')).toBe('戦士');
    });

    it('[covers:get-chip-label.atk-throws] atk の場合エラーをthrowする', () => {
      expect(() => getChipLabel('atk', '2500')).toThrow(
        'getChipLabel should not be used for atk. Use formatStatLabel instead.'
      );
    });

    it('[covers:get-chip-label.def-throws] def の場合エラーをthrowする', () => {
      expect(() => getChipLabel('def', '2000')).toThrow(
        'getChipLabel should not be used for def. Use formatStatLabel instead.'
      );
    });

    it('[covers:get-chip-label.default-returns-value-as-is] 未知のタイプの場合値をそのまま返す', () => {
      expect(getChipLabel('unknown', 'value')).toBe('value');
    });
  });
});
