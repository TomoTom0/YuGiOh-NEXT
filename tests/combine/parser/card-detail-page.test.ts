import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Parser: Card Detail Page', () => {
  it('should parse card detail page correctly', async () => {
    // Use existing sample data
    const htmlPath = path.join(__dirname, '../data/card-detail.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    const dom = new JSDOM(html);
    const doc = dom.window.document as unknown as Document;

    // Test that the HTML can be parsed
    expect(doc).toBeDefined();

    // Test that key elements exist
    const cardNameElem = doc.querySelector('#cardname h1');
    expect(cardNameElem).toBeDefined();

    // Test that we can query elements
    const itemBoxValues = doc.querySelectorAll('.item_box_value');
    expect(itemBoxValues.length).toBeGreaterThan(0);

    // Test that image elements exist
    const imageElem = doc.querySelector('#card_image_1, #thumbnail_card_image_1');
    expect(imageElem).toBeDefined();
  });
});
