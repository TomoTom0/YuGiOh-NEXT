import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseCardInfoFromDetailPage } from '../../../src/api/card-search';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Parser: Ruby Text Parsing', () => {
  it.skip('should parse ruby text from card detail page correctly', async () => {
    // Load the HTML file
    const htmlPath = path.join(__dirname, '../data/card-detail-ruby.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    const dom = new JSDOM(html);
    const doc = dom.window.document as unknown as Document;

    // Parse the card info
    // cid=4007 is Blue-Eyes White Dragon
    const cardInfo = parseCardInfoFromDetailPage(doc, '4007');

    expect(cardInfo).toBeDefined();

    if (cardInfo) {
      expect(cardInfo.name).toBe('青眼の白龍');

      const expectedRuby = 'ブルーアイズ・ホワイト・ドラゴン';
      expect(cardInfo.ruby).toBe(expectedRuby);
    }
  });
});
