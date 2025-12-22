import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateDeckThumbnailCards } from '../deck-thumbnail';
import type { DeckInfo } from '@/types/deck';
import * as cardUtils from '../card-utils';

// card-utils.getCardInfo をモック
vi.mock('../card-utils', () => ({
  getCardInfo: vi.fn((cid: string) => {
    // テスト用のカード情報を返す
    const cardType = cid.startsWith('m') ? 'monster' : cid.startsWith('s') ? 'spell' : 'trap';
    const baseCard = {
      cardId: cid,
      name: `Card ${cid}`,
      cardType,
      ciid: '1',
      lang: 'ja',
      imgs: []
    };

    // モンスターの場合は types プロパティを追加
    if (cardType === 'monster') {
      return {
        ...baseCard,
        types: cid.startsWith('e') ? ['effect'] : ['effect'],
        levelValue: 4
      };
    }

    return baseCard;
  })
}));

describe('deck-thumbnail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDeckThumbnailCards', () => {
    it('基本ケース: mainから3枚、extraから2枚を選択', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [
          { cid: 'm001', ciid: '1', lang: 'ja', quantity: 3 },
          { cid: 'm002', ciid: '1', lang: 'ja', quantity: 2 },
          { cid: 'm003', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        extraDeck: [
          { cid: 'e001', ciid: '1', lang: 'ja', quantity: 2 },
          { cid: 'e002', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const result = generateDeckThumbnailCards(deckInfo);

      expect(result).toHaveLength(5);
      // mainから3枚（重複排除されるので m001, m002, m003）
      expect(result.filter(cid => cid.startsWith('m'))).toHaveLength(3);
      // extraから2枚（e001, e002）
      expect(result.filter(cid => cid.startsWith('e'))).toHaveLength(2);
    });

    it('sideに先頭配置がある場合: mainから2枚、extraから2枚、sideから1枚を選択', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [
          { cid: 'm001', ciid: '1', lang: 'ja', quantity: 3 },
          { cid: 'm002', ciid: '1', lang: 'ja', quantity: 2 }
        ],
        extraDeck: [
          { cid: 'e001', ciid: '1', lang: 'ja', quantity: 2 },
          { cid: 'e002', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        sideDeck: [
          { cid: 's001', ciid: '1', lang: 'ja', quantity: 2 },
          { cid: 's002', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      // s001を先頭配置に設定
      const headPlacementCardIds = ['s001'];
      const result = generateDeckThumbnailCards(deckInfo, headPlacementCardIds);

      expect(result).toHaveLength(5);
      // mainから2枚
      expect(result.filter(cid => cid.startsWith('m'))).toHaveLength(2);
      // extraから2枚
      expect(result.filter(cid => cid.startsWith('e'))).toHaveLength(2);
      // sideから1枚
      expect(result.filter(cid => cid.startsWith('s'))).toHaveLength(1);
      // s001が優先されるはず
      expect(result).toContain('s001');
    });

    it('重複排除: 同じcidは1枚まで', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [
          { cid: 'm001', ciid: '1', lang: 'ja', quantity: 3 } // 3枚
        ],
        extraDeck: [
          { cid: 'e001', ciid: '1', lang: 'ja', quantity: 3 } // 3枚
        ],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const result = generateDeckThumbnailCards(deckInfo);

      // m001は1枚のみ、e001も1枚のみ（計2枚）
      expect(result).toHaveLength(2);
      expect(result).toEqual(['m001', 'e001']);
    });

    it('5枚に満たない場合も許容', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [
          { cid: 'm001', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const result = generateDeckThumbnailCards(deckInfo);

      expect(result).toHaveLength(1);
      expect(result).toEqual(['m001']);
    });

    it('手動先頭配置を優先', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [
          { cid: 'm001', ciid: '1', lang: 'ja', quantity: 1 },
          { cid: 'm002', ciid: '1', lang: 'ja', quantity: 1 },
          { cid: 'm003', ciid: '1', lang: 'ja', quantity: 1 },
          { cid: 'm004', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        extraDeck: [
          { cid: 'e001', ciid: '1', lang: 'ja', quantity: 1 },
          { cid: 'e002', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      // m003, m001 を先頭配置に設定
      const headPlacementCardIds = ['m003', 'm001'];
      const result = generateDeckThumbnailCards(deckInfo, headPlacementCardIds);

      expect(result).toHaveLength(5);
      // mainから3枚選択され、並び順を保ちながら先頭配置が優先される
      // 並び順: m001（先頭配置）、m003（先頭配置）、m002（通常）
      const mainCards = result.filter(cid => cid.startsWith('m'));
      expect(mainCards[0]).toBe('m001'); // 並び順で最初の先頭配置
      expect(mainCards[1]).toBe('m003'); // 並び順で次の先頭配置
      expect(mainCards[2]).toBe('m002'); // 足りない分は並び順で選ぶ
      expect(mainCards).toHaveLength(3);
    });

    it('空のデッキ', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Empty Deck',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const result = generateDeckThumbnailCards(deckInfo);

      expect(result).toHaveLength(0);
    });
  });
});
