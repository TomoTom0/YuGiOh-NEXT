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

describe('filter-label', () => {
  describe('getAttributeLabel', () => {
    it('日本語で属性のラベルを取得できる', () => {
      expect(getAttributeLabel('light', 'ja')).toBe('光');
      expect(getAttributeLabel('dark', 'ja')).toBe('闇');
      expect(getAttributeLabel('water', 'ja')).toBe('水');
      expect(getAttributeLabel('fire', 'ja')).toBe('炎');
    });

    it('英語で属性のラベルを取得できる', () => {
      expect(getAttributeLabel('light', 'en')).toBe('Light');
      expect(getAttributeLabel('dark', 'en')).toBe('Dark');
      expect(getAttributeLabel('water', 'en')).toBe('Water');
    });

    it('存在しない値の場合そのまま返す', () => {
      expect(getAttributeLabel('unknown', 'ja')).toBe('unknown');
    });

    it('langを省略した場合detectLanguageで検出した言語を使用する', () => {
      expect(getAttributeLabel('light')).toBe('光');
    });
  });

  describe('getCardTypeLabel', () => {
    it('カードタイプの短縮形ラベルを取得できる', () => {
      expect(getCardTypeLabel('monster')).toBe('M');
      expect(getCardTypeLabel('spell')).toBe('魔');
      expect(getCardTypeLabel('trap')).toBe('罠');
    });

    it('存在しない値の場合そのまま返す', () => {
      expect(getCardTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getMonsterTypeLabel', () => {
    it('モンスタータイプの短縮形ラベルを取得できる', () => {
      expect(getMonsterTypeLabel('normal')).toBe('通');
      expect(getMonsterTypeLabel('effect')).toBe('効');
      expect(getMonsterTypeLabel('fusion')).toBe('融');
      expect(getMonsterTypeLabel('synchro')).toBe('S');
      expect(getMonsterTypeLabel('xyz')).toBe('X');
      expect(getMonsterTypeLabel('link')).toBe('L');
    });

    it('存在しない値の場合そのまま返す', () => {
      expect(getMonsterTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getRaceLabel', () => {
    it('種族の短縮形ラベルを取得できる', () => {
      expect(getRaceLabel('dragon')).toBe('龍');
      expect(getRaceLabel('spellcaster')).toBe('魔使');
      expect(getRaceLabel('zombie')).toBe('不死');
      expect(getRaceLabel('warrior')).toBe('戦士');
    });

    it('存在しない値の場合最初の2文字を返す', () => {
      expect(getRaceLabel('unknown')).toBe('un');
      expect(getRaceLabel('xyz')).toBe('xy');
    });
  });

  describe('getSpellTypeLabel', () => {
    it('魔法タイプのラベルを取得できる', () => {
      expect(getSpellTypeLabel('normal')).toBe('通常');
      expect(getSpellTypeLabel('continuous')).toBe('永続');
      expect(getSpellTypeLabel('equip')).toBe('装備');
      expect(getSpellTypeLabel('field')).toBe('フィールド');
      expect(getSpellTypeLabel('quick')).toBe('速攻');
      expect(getSpellTypeLabel('ritual')).toBe('儀式');
    });

    it('存在しない値の場合そのまま返す', () => {
      expect(getSpellTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getTrapTypeLabel', () => {
    it('罠タイプのラベルを取得できる', () => {
      expect(getTrapTypeLabel('normal')).toBe('通常');
      expect(getTrapTypeLabel('continuous')).toBe('永続');
      expect(getTrapTypeLabel('counter')).toBe('カウンター');
    });

    it('存在しない値の場合そのまま返す', () => {
      expect(getTrapTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getChipLabel', () => {
    it('attributes の場合正しくラベルを取得する', () => {
      expect(getChipLabel('attributes', 'light')).toBe('光');
      expect(getChipLabel('attributes', 'dark')).toBe('闇');
    });

    it('cardType の場合正しくラベルを取得する', () => {
      expect(getChipLabel('cardType', 'monster')).toBe('M');
      expect(getChipLabel('cardType', 'spell')).toBe('魔');
    });

    it('monsterTypes の場合正しくラベルを取得する', () => {
      expect(getChipLabel('monsterTypes', 'fusion')).toBe('融');
      expect(getChipLabel('monsterTypes', 'synchro')).toBe('S');
    });

    it('levels の場合 ★ プレフィックス付きで返す', () => {
      expect(getChipLabel('levels', '4')).toBe('★4');
      expect(getChipLabel('levels', '8')).toBe('★8');
    });

    it('linkNumbers の場合 L プレフィックス付きで返す', () => {
      expect(getChipLabel('linkNumbers', '2')).toBe('L2');
      expect(getChipLabel('linkNumbers', '4')).toBe('L4');
    });

    it('races の場合正しくラベルを取得する', () => {
      expect(getChipLabel('races', 'dragon')).toBe('龍');
      expect(getChipLabel('races', 'warrior')).toBe('戦士');
    });

    it('atk の場合エラーをthrowする', () => {
      expect(() => getChipLabel('atk', '2500')).toThrow(
        'getChipLabel should not be used for atk. Use formatStatLabel instead.'
      );
    });

    it('def の場合エラーをthrowする', () => {
      expect(() => getChipLabel('def', '2000')).toThrow(
        'getChipLabel should not be used for def. Use formatStatLabel instead.'
      );
    });

    it('未知のタイプの場合値をそのまま返す', () => {
      expect(getChipLabel('unknown', 'value')).toBe('value');
    });
  });
});
