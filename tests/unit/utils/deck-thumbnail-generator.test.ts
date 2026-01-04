import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeckThumbnailGenerator } from '../../../src/utils/deck-thumbnail-generator';
import type { DeckInfo } from '../../../src/types/deck';
import { createCanvas } from 'canvas';

describe('deck-thumbnail-generator', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Canvas APIをグローバルにモック（Node.js環境用）
    global.document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return createCanvas(300, 200) as any;
        }
        return {} as any;
      },
    } as any;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('デフォルト値でインスタンスを作成できる', () => {
      const generator = new DeckThumbnailGenerator();
      expect(generator).toBeInstanceOf(DeckThumbnailGenerator);
      expect(generator['options'].width).toBe(300);
      expect(generator['options'].height).toBe(200);
      expect(generator['options'].quality).toBe(0.8);
      expect(generator['options'].includeExtraSide).toBe(false);
    });

    it('カスタムオプションを指定できる', () => {
      const generator = new DeckThumbnailGenerator({
        width: 400,
        height: 300,
        quality: 0.9,
        includeExtraSide: true,
      });
      expect(generator['options'].width).toBe(400);
      expect(generator['options'].height).toBe(300);
      expect(generator['options'].quality).toBe(0.9);
      expect(generator['options'].includeExtraSide).toBe(true);
    });

    it('部分的なオプション指定でデフォルト値とマージされる', () => {
      const generator = new DeckThumbnailGenerator({
        width: 500,
      });
      expect(generator['options'].width).toBe(500);
      expect(generator['options'].height).toBe(200); // デフォルト値
      expect(generator['options'].quality).toBe(0.8); // デフォルト値
    });

    it('空のオプションでもエラーにならない', () => {
      const generator = new DeckThumbnailGenerator({});
      expect(generator).toBeInstanceOf(DeckThumbnailGenerator);
    });
  });

  describe('wrapText', () => {
    it('短いテキストはそのまま返される', () => {
      const generator = new DeckThumbnailGenerator();
      const result = generator['wrapText']('短いテキスト', 300);
      expect(result).toEqual(['短いテキスト']);
    });

    it('長いテキストは20文字で折り返される', () => {
      const generator = new DeckThumbnailGenerator();
      const longText = 'これは20文字を超える非常に長いテキストです。折り返されるべきです。';
      const result = generator['wrapText'](longText, 300);
      expect(result.length).toBeGreaterThan(1);
      result.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(21);
      });
    });

    it('空文字列の場合空配列を返す', () => {
      const generator = new DeckThumbnailGenerator();
      const result = generator['wrapText']('', 300);
      expect(result).toEqual([]);
    });

    it('1文字でも正しく動作する', () => {
      const generator = new DeckThumbnailGenerator();
      const result = generator['wrapText']('A', 300);
      expect(result).toEqual(['A']);
    });

    it('正確に20文字のテキストは折り返されない', () => {
      const generator = new DeckThumbnailGenerator();
      const exactly20 = '12345678901234567890'; // 20文字
      const result = generator['wrapText'](exactly20, 300);
      expect(result).toEqual([exactly20]);
    });

    it('21文字のテキストは折り返される', () => {
      const generator = new DeckThumbnailGenerator();
      const exactly21 = '123456789012345678901'; // 21文字
      const result = generator['wrapText'](exactly21, 300);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('12345678901234567890');
      expect(result[1]).toBe('1');
    });

    it('複数行に折り返される長いテキスト', () => {
      const generator = new DeckThumbnailGenerator();
      const veryLong = 'あ'.repeat(50); // 50文字
      const result = generator['wrapText'](veryLong, 300);
      expect(result.length).toBe(3); // 20 + 20 + 10
      expect(result[0].length).toBe(20);
      expect(result[1].length).toBe(20);
      expect(result[2].length).toBe(10);
    });
  });

  describe('createCanvasThumbnail', () => {
    it('指定されたサイズのCanvasを作成する', async () => {
      const generator = new DeckThumbnailGenerator({
        width: 400,
        height: 250,
      });

      const mockDeck: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: '',
      };

      const canvas = await generator['createCanvasThumbnail'](mockDeck);
      expect(canvas.width).toBe(400);
      expect(canvas.height).toBe(250);
    });

    it('デッキ名なしでもエラーにならない', async () => {
      const generator = new DeckThumbnailGenerator();
      const mockDeck: DeckInfo = {
        dno: 1,
        name: '',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: '',
      };

      const canvas = await generator['createCanvasThumbnail'](mockDeck);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(300);
      expect(canvas.height).toBe(200);
    });

    it('カードデータを含むデッキでCanvasを作成できる', async () => {
      const generator = new DeckThumbnailGenerator();
      const mockDeck: DeckInfo = {
        dno: 1,
        name: 'テストデッキ',
        mainDeck: [
          { cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 },
          { cid: '4008', ciid: '4008', lang: 'ja', quantity: 2 },
        ],
        extraDeck: [{ cid: '5000', ciid: '5000', lang: 'ja', quantity: 1 }],
        sideDeck: [{ cid: '6000', ciid: '6000', lang: 'ja', quantity: 2 }],
        category: [],
        tags: [],
        comment: '',
        deckCode: '',
      };

      const canvas = await generator['createCanvasThumbnail'](mockDeck);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(300);
      expect(canvas.height).toBe(200);
    });
  });

  describe('drawDeckInfoOnCanvas', () => {
    it('デッキ情報をCanvasに描画してもエラーにならない', () => {
      const generator = new DeckThumbnailGenerator();
      const canvas = createCanvas(300, 200);
      const ctx = canvas.getContext('2d')!;

      const mockDeck: DeckInfo = {
        dno: 1,
        name: 'テストデッキ',
        mainDeck: [{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 }],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: '',
      };

      expect(() => {
        generator['drawDeckInfoOnCanvas'](ctx as any, canvas as any, mockDeck);
      }).not.toThrow();
    });

    it('長いデッキ名を正しく折り返して描画する', () => {
      const generator = new DeckThumbnailGenerator();
      const canvas = createCanvas(300, 200);
      const ctx = canvas.getContext('2d')!;

      const mockDeck: DeckInfo = {
        dno: 1,
        name: 'これは20文字を超える非常に長いデッキ名です',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: '',
      };

      expect(() => {
        generator['drawDeckInfoOnCanvas'](ctx as any, canvas as any, mockDeck);
      }).not.toThrow();
    });
  });
});
