import { describe, it, expect } from 'vitest';

/**
 * CategoryDialog カテゴリフィルター機能テスト
 * TASK-108: filter button (show categories with 7+ cards)
 */

describe('CategoryDialog: countCardsWithCategory', () => {
  /**
   * テスト用ユーティリティ関数: countCardsWithCategory をシミュレート
   * (CategoryDialog.vue の内部関数と同じロジック)
   */
  function simulateCountCardsWithCategory(
    categoryLabel: string,
    deckCards: any[],
    deckCardRefs: any[]
  ): number {
    // deckCardRefs がない場合は、deckCards から単純にカウント（フォールバック）
    if (!deckCardRefs || deckCardRefs.length === 0) {
      return deckCards.filter(card => {
        const cardName = card.name || '';
        const cardText = card.text || '';
        return cardName.includes(categoryLabel) || cardText.includes(categoryLabel);
      }).length;
    }

    // deckCardRefs から実際の枚数をカウント
    return deckCardRefs.reduce((total, cardRef) => {
      // cardRef に対応する CardInfo を見つける
      const cardInfo = deckCards.find(card => card.cardId === cardRef.cid);
      if (!cardInfo) return total;

      const cardName = cardInfo.name || '';
      const cardText = cardInfo.text || '';

      // カテゴリラベルを含むかチェック
      if (cardName.includes(categoryLabel) || cardText.includes(categoryLabel)) {
        return total + (cardRef.quantity || 1);
      }
      return total;
    }, 0);
  }

  describe('基本的なカウント機能', () => {
    it('カード名がカテゴリラベルを含む場合、そのカードの枚数をカウントする', () => {
      const categoryLabel = 'アクアアクトレス';
      const deckCards = [
        { cardId: '1', name: 'アクアアクトレス・プリマ', text: '' },
        { cardId: '2', name: 'ブラック・マジシャン', text: '' }
      ];
      const deckCardRefs = [
        { cid: '1', quantity: 3 },  // アクアアクトレスを3枚
        { cid: '2', quantity: 1 }   // ブラック・マジシャンを1枚
      ];

      const count = simulateCountCardsWithCategory(categoryLabel, deckCards, deckCardRefs);
      expect(count).toBe(3);
    });

    it('カードテキストがカテゴリラベルを含む場合もカウントする', () => {
      const categoryLabel = 'ダイナマイト';
      const deckCards = [
        { cardId: '1', name: 'セイント・ダイナマイト', text: 'このカード名には含まない' },
        { cardId: '2', name: '別のカード', text: 'ダイナマイトを破壊する効果' },
        { cardId: '3', name: 'その他', text: '関係ないテキスト' }
      ];
      const deckCardRefs = [
        { cid: '1', quantity: 2 },
        { cid: '2', quantity: 1 },
        { cid: '3', quantity: 1 }
      ];

      const count = simulateCountCardsWithCategory(categoryLabel, deckCards, deckCardRefs);
      expect(count).toBe(3); // カード1の2枚 + カード2の1枚
    });

    it('複数のカードがカテゴリラベルを含む場合、全ての枚数を合計する', () => {
      const categoryLabel = 'ドラゴン';
      const deckCards = [
        { cardId: '1', name: 'ブルーアイズ・ホワイト・ドラゴン', text: '' },
        { cardId: '2', name: 'レッドアイズ・ブラック・ドラゴン', text: '' },
        { cardId: '3', name: '魔法カード', text: '' }
      ];
      const deckCardRefs = [
        { cid: '1', quantity: 3 },
        { cid: '2', quantity: 2 },
        { cid: '3', quantity: 1 }
      ];

      const count = simulateCountCardsWithCategory(categoryLabel, deckCards, deckCardRefs);
      expect(count).toBe(5); // 3 + 2
    });
  });

  describe('7枚以上フィルター対応', () => {
    it('カテゴリに該当するカードが7枚以上の場合、フィルター結果に含まれるべき', () => {
      const categoryLabel = 'ドラゴン';
      const deckCards = [
        { cardId: '1', name: 'ブルーアイズ・ホワイト・ドラゴン', text: '' },
        { cardId: '2', name: 'レッドアイズ・ブラック・ドラゴン', text: '' }
      ];
      const deckCardRefs = [
        { cid: '1', quantity: 3 },
        { cid: '2', quantity: 4 }
      ];

      const count = simulateCountCardsWithCategory(categoryLabel, deckCards, deckCardRefs);
      expect(count).toBeGreaterThanOrEqual(7);
    });

    it('カテゴリに該当するカードが7枚未満の場合、フィルター結果に含まれないべき', () => {
      const categoryLabel = 'レアカード';
      const deckCards = [
        { cardId: '1', name: 'レアカード', text: '' }
      ];
      const deckCardRefs = [
        { cid: '1', quantity: 5 }
      ];

      const count = simulateCountCardsWithCategory(categoryLabel, deckCards, deckCardRefs);
      expect(count).toBeLessThan(7);
    });

    it('複数カードの合計が7枚以上の場合', () => {
      const categoryLabel = '妖精';
      const deckCards = [
        { cardId: '1', name: '光妖精', text: '' },
        { cardId: '2', name: '闇妖精', text: '' },
        { cardId: '3', name: '水妖精', text: '' }
      ];
      const deckCardRefs = [
        { cid: '1', quantity: 2 },
        { cid: '2', quantity: 3 },
        { cid: '3', quantity: 2 }
      ];

      const count = simulateCountCardsWithCategory(categoryLabel, deckCards, deckCardRefs);
      expect(count).toBe(7);
    });
  });

  describe('エッジケース', () => {
    it('deckCardRefs が空の場合、deckCards から数える（フォールバック）', () => {
      const categoryLabel = 'ドラゴン';
      const deckCards = [
        { cardId: '1', name: 'ブルーアイズ・ホワイト・ドラゴン', text: '' },
        { cardId: '2', name: 'その他', text: '' }
      ];
      const deckCardRefs: any[] = [];

      const count = simulateCountCardsWithCategory(categoryLabel, deckCards, deckCardRefs);
      expect(count).toBe(1); // deckCards のみをカウント（quantity 情報なし）
    });

    it('対応するカードがない場合、0を返す', () => {
      const categoryLabel = '存在しないカテゴリ';
      const deckCards = [
        { cardId: '1', name: 'ブルーアイズ・ホワイト・ドラゴン', text: '' }
      ];
      const deckCardRefs = [
        { cid: '1', quantity: 3 }
      ];

      const count = simulateCountCardsWithCategory(categoryLabel, deckCards, deckCardRefs);
      expect(count).toBe(0);
    });

    it('cardId と cid が一致しないカードは数えない', () => {
      const categoryLabel = 'テスト';
      const deckCards = [
        { cardId: '1', name: 'テストカード', text: '' }
      ];
      const deckCardRefs = [
        { cid: '999', quantity: 5 } // cid が一致しない
      ];

      const count = simulateCountCardsWithCategory(categoryLabel, deckCards, deckCardRefs);
      expect(count).toBe(0);
    });

    it('quantity が未指定の場合は1枚とみなす', () => {
      const categoryLabel = 'ドラゴン';
      const deckCards = [
        { cardId: '1', name: 'ドラゴン', text: '' }
      ];
      const deckCardRefs = [
        { cid: '1' } // quantity なし
      ];

      const count = simulateCountCardsWithCategory(categoryLabel, deckCards, deckCardRefs);
      expect(count).toBe(1);
    });
  });

  describe('実務的なシナリオ', () => {
    it('複数のセクション（main, extra, side）からカウント', () => {
      // allDeckCardRefs は main + extra + side の全ての DeckCardRef を含む
      const categoryLabel = 'シンクロ';
      const deckCards = [
        { cardId: '1', name: 'シンクロモンスターA', text: '' },
        { cardId: '2', name: 'シンクロモンスターB', text: '' },
        { cardId: '3', name: 'その他', text: '' }
      ];
      const deckCardRefs = [
        // main deck
        { cid: '1', quantity: 2 },
        { cid: '3', quantity: 20 },
        // extra deck
        { cid: '2', quantity: 3 },
        // side deck
        { cid: '1', quantity: 1 }
      ];

      const count = simulateCountCardsWithCategory(categoryLabel, deckCards, deckCardRefs);
      // 同じカードIDが複数回出現する場合（main/side両方），すべてカウントされる
      expect(count).toBe(6); // (2+1) + 3
    });
  });
});
