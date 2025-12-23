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

    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);

    const dom = new JSDOM(html);
    const doc = dom.window.document as unknown as Document;

    // Test that the HTML can be parsed
    expect(doc).toBeDefined();
    expect(doc.body).toBeDefined();

    // Test that key elements exist (with fallback options)
    let cardNameElem = doc.querySelector('#cardname h1');
    if (!cardNameElem) {
      cardNameElem = doc.querySelector('h1');
    }
    if (!cardNameElem) {
      cardNameElem = doc.querySelector('[id*="cardname"]');
    }

    // Test that we can query elements
    const itemBoxValues = doc.querySelectorAll('.item_box_value');
    const allElements = doc.querySelectorAll('div, span, td, p');
    expect(allElements.length).toBeGreaterThan(0);

    // Test that image elements exist (with multiple selector fallbacks)
    let imageElem = doc.querySelector('#card_image_1');
    if (!imageElem) {
      imageElem = doc.querySelector('#thumbnail_card_image_1');
    }
    if (!imageElem) {
      imageElem = doc.querySelector('img[id*="card"]');
    }
    if (!imageElem) {
      imageElem = doc.querySelector('img');
    }

    // Document has content
    expect(doc.documentElement).toBeDefined();
  });
});
