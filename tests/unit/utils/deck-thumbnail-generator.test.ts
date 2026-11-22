// conditions: tests/design/deck-thumbnail-generator/conditions.toml
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeckThumbnailGenerator } from '../../../src/utils/deck-thumbnail-generator';
import type { DeckInfo } from '../../../src/types/deck';
import { createCanvas } from 'canvas';

function makeDeck(overrides: Partial<DeckInfo> = {}): DeckInfo {
  return {
    dno: 1,
    name: 'Test Deck',
    mainDeck: [],
    extraDeck: [],
    sideDeck: [],
    category: [],
    tags: [],
    comment: '',
    deckCode: '',
    ...overrides,
  };
}

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
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('[covers:constructor.uses-defaults-when-omitted] デフォルト値でインスタンスを作成できる', () => {
      const generator = new DeckThumbnailGenerator();
      expect(generator).toBeInstanceOf(DeckThumbnailGenerator);
      expect(generator['options'].width).toBe(300);
      expect(generator['options'].height).toBe(200);
      expect(generator['options'].quality).toBe(0.8);
      expect(generator['options'].includeExtraSide).toBe(false);
    });

    it('[covers:constructor.merges-provided-over-defaults] カスタムオプションを指定できる', () => {
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

    it('[covers:constructor.merges-provided-over-defaults] 部分的なオプション指定でデフォルト値とマージされる', () => {
      const generator = new DeckThumbnailGenerator({
        width: 500,
      });
      expect(generator['options'].width).toBe(500);
      expect(generator['options'].height).toBe(200); // デフォルト値
      expect(generator['options'].quality).toBe(0.8); // デフォルト値
    });

    it('[covers:constructor.uses-defaults-when-omitted] 空のオプションでもエラーにならない', () => {
      const generator = new DeckThumbnailGenerator({});
      expect(generator).toBeInstanceOf(DeckThumbnailGenerator);
    });
  });

  describe('generateWebPThumbnail', () => {
    // 環境上の制約: node-canvas(^3.2.0)のCanvasはtoBlobを実装していないため、
    // 内部で呼ばれるcreateCanvasThumbnail/canvasToWebPをスパイして
    // generateWebPThumbnail自体のオーケストレーション（成功/エラーログ+rethrow）のみを検証する。
    // canvasToWebP自体の分岐は下の describe('canvasToWebP (private)') で個別に検証する。

    it('[covers:generate-webp-thumbnail.success-returns-data-url] createCanvasThumbnailとcanvasToWebPが成功した場合、WebP Data URLを返す', async () => {
      const generator = new DeckThumbnailGenerator();
      const fakeCanvas = {} as any;
      vi.spyOn(generator as any, 'createCanvasThumbnail').mockResolvedValue(fakeCanvas);
      vi.spyOn(generator as any, 'canvasToWebP').mockResolvedValue('data:image/webp;base64,xxx');

      const result = await generator.generateWebPThumbnail(makeDeck());

      expect(result).toBe('data:image/webp;base64,xxx');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('[covers:generate-webp-thumbnail.error-logged-and-rethrown] createCanvasThumbnailが失敗した場合、console.errorでログを出力し同じerrorをthrowする', async () => {
      const generator = new DeckThumbnailGenerator();
      const error = new Error('canvas failed');
      vi.spyOn(generator as any, 'createCanvasThumbnail').mockRejectedValue(error);

      await expect(generator.generateWebPThumbnail(makeDeck())).rejects.toBe(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DeckThumbnailGenerator] Failed to generate thumbnail:',
        error
      );
    });

    it('[covers:generate-webp-thumbnail.error-logged-and-rethrown] canvasToWebPが失敗した場合、console.errorでログを出力し同じerrorをthrowする', async () => {
      const generator = new DeckThumbnailGenerator();
      const fakeCanvas = {} as any;
      const error = new Error('webp conversion failed');
      vi.spyOn(generator as any, 'createCanvasThumbnail').mockResolvedValue(fakeCanvas);
      vi.spyOn(generator as any, 'canvasToWebP').mockRejectedValue(error);

      await expect(generator.generateWebPThumbnail(makeDeck())).rejects.toBe(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DeckThumbnailGenerator] Failed to generate thumbnail:',
        error
      );
    });
  });

  describe('canvasToWebP (private)', () => {
    it('[covers:canvas-to-webp.file-reader-string-result-resolves] blobが取得できFileReaderが文字列を返す場合、そのData URLでresolveする', async () => {
      const generator = new DeckThumbnailGenerator();
      const fakeBlob = new Blob(['dummy-image-bytes'], { type: 'image/webp' });
      const toBlobFn = vi.fn((cb: (blob: Blob | null) => void) => cb(fakeBlob));
      const fakeCanvas = { toBlob: toBlobFn } as any;

      const result = await generator['canvasToWebP'](fakeCanvas);

      expect(typeof result).toBe('string');
      expect(result.startsWith('data:')).toBe(true);
      expect(toBlobFn).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.8);
    });

    it('[covers:canvas-to-webp.blob-null-rejects] blobがnullの場合、Canvas toBlob failedでrejectする', async () => {
      const generator = new DeckThumbnailGenerator();
      const fakeCanvas = { toBlob: (cb: (blob: Blob | null) => void) => cb(null) } as any;

      await expect(generator['canvasToWebP'](fakeCanvas)).rejects.toThrow('Canvas toBlob failed');
    });

    it('[covers:canvas-to-webp.sync-throw-in-to-blob-rejects] canvas.toBlobが同期的にthrowした場合、そのerrorでrejectする', async () => {
      const generator = new DeckThumbnailGenerator();
      const syncError = new Error('toBlob sync failure');
      const fakeCanvas = {
        toBlob: () => {
          throw syncError;
        },
      } as any;

      await expect(generator['canvasToWebP'](fakeCanvas)).rejects.toBe(syncError);
    });

    it('[covers:canvas-to-webp.file-reader-non-string-result-rejects] FileReaderの結果が文字列でない場合、FileReader result is not a stringでrejectする', async () => {
      const generator = new DeckThumbnailGenerator();
      const fakeBlob = new Blob(['dummy']);
      const fakeCanvas = { toBlob: (cb: (blob: Blob | null) => void) => cb(fakeBlob) } as any;

      class NonStringResultFileReader {
        onload: ((event: { target: { result: unknown } }) => void) | null = null;
        onerror: (() => void) | null = null;
        readAsDataURL() {
          setTimeout(() => this.onload?.({ target: { result: new ArrayBuffer(4) } }), 0);
        }
      }
      const OriginalFileReader = global.FileReader;
      global.FileReader = NonStringResultFileReader as any;

      try {
        await expect(generator['canvasToWebP'](fakeCanvas)).rejects.toThrow(
          'FileReader result is not a string'
        );
      } finally {
        global.FileReader = OriginalFileReader;
      }
    });

    it('[covers:canvas-to-webp.file-reader-onerror-rejects] FileReaderがonerrorを発火した場合、FileReader failedでrejectする', async () => {
      const generator = new DeckThumbnailGenerator();
      const fakeBlob = new Blob(['dummy']);
      const fakeCanvas = { toBlob: (cb: (blob: Blob | null) => void) => cb(fakeBlob) } as any;

      class ErroringFileReader {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        readAsDataURL() {
          setTimeout(() => this.onerror?.(), 0);
        }
      }
      const OriginalFileReader = global.FileReader;
      global.FileReader = ErroringFileReader as any;

      try {
        await expect(generator['canvasToWebP'](fakeCanvas)).rejects.toThrow('FileReader failed');
      } finally {
        global.FileReader = OriginalFileReader;
      }
    });
  });

  describe('createCanvasThumbnail', () => {
    it('[covers:create-canvas-thumbnail.returns-canvas-sized-per-options] 指定されたサイズのCanvasを作成する', async () => {
      const generator = new DeckThumbnailGenerator({
        width: 400,
        height: 250,
      });

      const mockDeck = makeDeck({ name: 'Test Deck' });

      const canvas = await generator['createCanvasThumbnail'](mockDeck);
      expect(canvas.width).toBe(400);
      expect(canvas.height).toBe(250);
    });

    it('[covers:create-canvas-thumbnail.returns-canvas-sized-per-options] デッキ名なしでもエラーにならない', async () => {
      const generator = new DeckThumbnailGenerator();
      const mockDeck = makeDeck({ name: '' });

      const canvas = await generator['createCanvasThumbnail'](mockDeck);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(300);
      expect(canvas.height).toBe(200);
    });

    it('[covers:create-canvas-thumbnail.returns-canvas-sized-per-options] カードデータを含むデッキでCanvasを作成できる', async () => {
      const generator = new DeckThumbnailGenerator();
      const mockDeck = makeDeck({
        name: 'テストデッキ',
        mainDeck: [
          { cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 },
          { cid: '4008', ciid: '4008', lang: 'ja', quantity: 2 },
        ],
        extraDeck: [{ cid: '5000', ciid: '5000', lang: 'ja', quantity: 1 }],
        sideDeck: [{ cid: '6000', ciid: '6000', lang: 'ja', quantity: 2 }],
      });

      const canvas = await generator['createCanvasThumbnail'](mockDeck);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(300);
      expect(canvas.height).toBe(200);
    });

    it('[covers:create-canvas-thumbnail.ctx-null-throws] canvasの2Dコンテキストが取得できない場合、Errorをthrowする', async () => {
      const generator = new DeckThumbnailGenerator();
      const fakeCanvas = { getContext: () => null, width: 0, height: 0 };
      global.document = {
        createElement: () => fakeCanvas as any,
      } as any;

      await expect(generator['createCanvasThumbnail'](makeDeck())).rejects.toThrow(
        'Failed to get canvas 2D context'
      );
    });
  });

  describe('drawDeckInfoOnCanvas', () => {
    it('[covers:draw-deck-info.name-wraps-via-wrap-text] デッキ情報をCanvasに描画してもエラーにならない', () => {
      const generator = new DeckThumbnailGenerator();
      const canvas = createCanvas(300, 200);
      const ctx = canvas.getContext('2d')!;

      const mockDeck = makeDeck({
        name: 'テストデッキ',
        mainDeck: [{ cid: '4007', ciid: '4007', lang: 'ja', quantity: 3 }],
      });

      expect(() => {
        generator['drawDeckInfoOnCanvas'](ctx as any, canvas as any, mockDeck);
      }).not.toThrow();
    });

    it('[covers:draw-deck-info.name-wraps-via-wrap-text] 長いデッキ名を正しく折り返して描画する', () => {
      const generator = new DeckThumbnailGenerator();
      const canvas = createCanvas(300, 200);
      const ctx = canvas.getContext('2d')!;
      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      const mockDeck = makeDeck({
        name: 'これは20文字を超える非常に長いデッキ名です',
      });

      expect(() => {
        generator['drawDeckInfoOnCanvas'](ctx as any, canvas as any, mockDeck);
      }).not.toThrow();

      // 20文字超のデッキ名はwrapTextで複数行に分割され、各行がfillTextで描画される
      const expectedLines = generator['wrapText'](mockDeck.name, canvas.width - 24);
      expect(expectedLines.length).toBeGreaterThan(1);
      const texts = fillTextSpy.mock.calls.map((call) => call[0]);
      expectedLines.forEach((line) => {
        expect(texts).toContain(line);
      });
    });

    it('[covers:draw-deck-info.name-fallback-when-empty] デッキ名が空の場合(No Name)を描画する', () => {
      const generator = new DeckThumbnailGenerator();
      const canvas = createCanvas(300, 200);
      const ctx = canvas.getContext('2d')!;
      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      const mockDeck = makeDeck({ name: '' });

      generator['drawDeckInfoOnCanvas'](ctx as any, canvas as any, mockDeck);

      expect(fillTextSpy.mock.calls[0][0]).toBe('(No Name)');
    });

    it('[covers:draw-deck-info.stats-reflect-card-quantity-sums] Main/Extra/Sideの枚数はquantityの合計値として描画される', () => {
      const generator = new DeckThumbnailGenerator();
      const canvas = createCanvas(300, 200);
      const ctx = canvas.getContext('2d')!;
      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      const mockDeck = makeDeck({
        name: 'A',
        mainDeck: [
          { cid: '1', ciid: '1', lang: 'ja', quantity: 3 },
          { cid: '2', ciid: '2', lang: 'ja', quantity: 2 },
        ],
        extraDeck: [{ cid: '3', ciid: '3', lang: 'ja', quantity: 1 }],
        sideDeck: [
          { cid: '4', ciid: '4', lang: 'ja', quantity: 2 },
          { cid: '5', ciid: '5', lang: 'ja', quantity: 1 },
        ],
      });

      generator['drawDeckInfoOnCanvas'](ctx as any, canvas as any, mockDeck);

      const texts = fillTextSpy.mock.calls.map((call) => call[0]);
      expect(texts).toContain('Main: 5');
      expect(texts).toContain('Extra: 1');
      expect(texts).toContain('Side: 3');
    });

    it('[covers:draw-deck-info.stats-and-cards-skipped-when-y-exceeds-height] canvas高さが小さい場合、統計行・カード行は描画されない', () => {
      const generator = new DeckThumbnailGenerator();
      const canvas = createCanvas(300, 15); // padding=12を差し引くと余白がほぼ無い
      const ctx = canvas.getContext('2d')!;
      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      const mockDeck = makeDeck({
        name: 'A',
        mainDeck: [{ cid: '1', ciid: '1', lang: 'ja', quantity: 1 }],
        extraDeck: [{ cid: '2', ciid: '2', lang: 'ja', quantity: 1 }],
        sideDeck: [{ cid: '3', ciid: '3', lang: 'ja', quantity: 1 }],
      });

      generator['drawDeckInfoOnCanvas'](ctx as any, canvas as any, mockDeck);

      const texts = fillTextSpy.mock.calls.map((call) => call[0]);
      expect(texts.some((t) => t.startsWith('Main:'))).toBe(false);
      expect(texts.some((t) => t.startsWith('Extra:'))).toBe(false);
      expect(texts.some((t) => t.startsWith('Side:'))).toBe(false);
      expect(texts.some((t) => t.includes('cid:'))).toBe(false);
      // 名前行はy上限チェックが無いため描画される
      expect(texts).toContain('A');
    });

    it('[covers:draw-deck-info.include-extra-side-false-excludes-extra-and-side] includeExtraSide=falseの場合、extraDeck/sideDeckのカードは描画されない', () => {
      const generator = new DeckThumbnailGenerator({ includeExtraSide: false });
      const canvas = createCanvas(300, 500);
      const ctx = canvas.getContext('2d')!;
      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      const mockDeck = makeDeck({
        name: 'A',
        mainDeck: [{ cid: 'MAIN1', ciid: 'MAIN1', lang: 'ja', quantity: 1 }],
        extraDeck: [{ cid: 'EXTRA1', ciid: 'EXTRA1', lang: 'ja', quantity: 1 }],
        sideDeck: [{ cid: 'SIDE1', ciid: 'SIDE1', lang: 'ja', quantity: 1 }],
      });

      generator['drawDeckInfoOnCanvas'](ctx as any, canvas as any, mockDeck);

      const texts = fillTextSpy.mock.calls.map((call) => call[0]);
      expect(texts.some((t) => t.includes('EXTRA1'))).toBe(false);
      expect(texts.some((t) => t.includes('SIDE1'))).toBe(false);
      expect(texts.some((t) => t.includes('MAIN1'))).toBe(true);
    });

    it('[covers:draw-deck-info.include-extra-side-true-includes-extra-and-side] includeExtraSide=trueの場合、extraDeck/sideDeckのカードも候補に含まれる', () => {
      const generator = new DeckThumbnailGenerator({ includeExtraSide: true });
      const canvas = createCanvas(300, 500);
      const ctx = canvas.getContext('2d')!;
      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      const mockDeck = makeDeck({
        name: 'A',
        mainDeck: [],
        extraDeck: [{ cid: 'EXTRA1', ciid: 'EXTRA1', lang: 'ja', quantity: 1 }],
        sideDeck: [{ cid: 'SIDE1', ciid: 'SIDE1', lang: 'ja', quantity: 1 }],
      });

      generator['drawDeckInfoOnCanvas'](ctx as any, canvas as any, mockDeck);

      const texts = fillTextSpy.mock.calls.map((call) => call[0]);
      expect(texts.some((t) => t.includes('EXTRA1'))).toBe(true);
      expect(texts.some((t) => t.includes('SIDE1'))).toBe(true);
    });

    it('[covers:draw-deck-info.all-cards-sliced-to-first-ten] カード一覧は先頭10件のみ描画される', () => {
      const generator = new DeckThumbnailGenerator();
      const canvas = createCanvas(300, 500); // 十分な高さでy上限による打ち切りを排除
      const ctx = canvas.getContext('2d')!;
      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      const mainDeck = Array.from({ length: 12 }, (_, i) => ({
        cid: `CARD${i + 1}`,
        ciid: `CARD${i + 1}`,
        lang: 'ja',
        quantity: 1,
      }));
      const mockDeck = makeDeck({ name: 'A', mainDeck });

      generator['drawDeckInfoOnCanvas'](ctx as any, canvas as any, mockDeck);

      const texts = fillTextSpy.mock.calls.map((call) => call[0]);
      for (let i = 1; i <= 10; i++) {
        expect(texts.some((t) => t.includes(`CARD${i}`))).toBe(true);
      }
      expect(texts.some((t) => t.includes('CARD11'))).toBe(false);
      expect(texts.some((t) => t.includes('CARD12'))).toBe(false);
    });

    it('[covers:draw-deck-info.card-text-truncated-when-over-25-chars] カードテキストが25文字を超える場合は22文字+...に切り詰められる', () => {
      const generator = new DeckThumbnailGenerator();
      const canvas = createCanvas(300, 500);
      const ctx = canvas.getContext('2d')!;
      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      const cid = '9999999999999999'; // 16桁
      const cardText = `3x (cid: ${cid})`;
      expect(cardText.length).toBeGreaterThan(25);
      const expectedTruncated = cardText.substring(0, 22) + '...';

      const mockDeck = makeDeck({
        name: 'A',
        mainDeck: [{ cid, ciid: cid, lang: 'ja', quantity: 3 }],
      });

      generator['drawDeckInfoOnCanvas'](ctx as any, canvas as any, mockDeck);

      const texts = fillTextSpy.mock.calls.map((call) => call[0]);
      expect(texts).toContain(expectedTruncated);
      expect(texts).not.toContain(cardText);
    });

    it('[covers:draw-deck-info.card-text-kept-when-25-or-under] カードテキストが25文字以下の場合は切り詰められずそのまま描画される', () => {
      const generator = new DeckThumbnailGenerator();
      const canvas = createCanvas(300, 500);
      const ctx = canvas.getContext('2d')!;
      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      const cid = 'ABCDEFGHIJKLMN'; // 14桁
      const cardText = `1x (cid: ${cid})`;
      expect(cardText.length).toBeLessThanOrEqual(25);

      const mockDeck = makeDeck({
        name: 'A',
        mainDeck: [{ cid, ciid: cid, lang: 'ja', quantity: 1 }],
      });

      generator['drawDeckInfoOnCanvas'](ctx as any, canvas as any, mockDeck);

      const texts = fillTextSpy.mock.calls.map((call) => call[0]);
      expect(texts).toContain(cardText);
    });
  });

  describe('wrapText', () => {
    it('[covers:wrap-text.under-20-chars-no-wrap] 短いテキストはそのまま返される', () => {
      const generator = new DeckThumbnailGenerator();
      const result = generator['wrapText']('短いテキスト', 300);
      expect(result).toEqual(['短いテキスト']);
    });

    it('[covers:wrap-text.multi-line-wrap-for-long-text] 長いテキストは20文字で折り返される', () => {
      const generator = new DeckThumbnailGenerator();
      const longText = 'これは20文字を超える非常に長いテキストです。折り返されるべきです。';
      const result = generator['wrapText'](longText, 300);
      expect(result.length).toBeGreaterThan(1);
      result.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(21);
      });
    });

    it('[covers:wrap-text.empty-string-returns-empty-array] 空文字列の場合空配列を返す', () => {
      const generator = new DeckThumbnailGenerator();
      const result = generator['wrapText']('', 300);
      expect(result).toEqual([]);
    });

    it('[covers:wrap-text.under-20-chars-no-wrap] 1文字でも正しく動作する', () => {
      const generator = new DeckThumbnailGenerator();
      const result = generator['wrapText']('A', 300);
      expect(result).toEqual(['A']);
    });

    it('[covers:wrap-text.exactly-20-chars-no-wrap] 正確に20文字のテキストは折り返されない', () => {
      const generator = new DeckThumbnailGenerator();
      const exactly20 = '12345678901234567890'; // 20文字
      const result = generator['wrapText'](exactly20, 300);
      expect(result).toEqual([exactly20]);
    });

    it('[covers:wrap-text.21-chars-wraps-into-two-lines] 21文字のテキストは折り返される', () => {
      const generator = new DeckThumbnailGenerator();
      const exactly21 = '123456789012345678901'; // 21文字
      const result = generator['wrapText'](exactly21, 300);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('12345678901234567890');
      expect(result[1]).toBe('1');
    });

    it('[covers:wrap-text.multi-line-wrap-for-long-text] 複数行に折り返される長いテキスト', () => {
      const generator = new DeckThumbnailGenerator();
      const veryLong = 'あ'.repeat(50); // 50文字
      const result = generator['wrapText'](veryLong, 300);
      expect(result.length).toBe(3); // 20 + 20 + 10
      expect(result[0].length).toBe(20);
      expect(result[1].length).toBe(20);
      expect(result[2].length).toBe(10);
    });

    it('[covers:wrap-text.max-width-param-is-ignored] maxWidth引数の値によらず結果は変わらない', () => {
      const generator = new DeckThumbnailGenerator();
      const text = 'あ'.repeat(30);
      const resultNarrow = generator['wrapText'](text, 10);
      const resultWide = generator['wrapText'](text, 10000);
      expect(resultNarrow).toEqual(resultWide);
    });
  });
});
