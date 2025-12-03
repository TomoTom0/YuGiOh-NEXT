import { describe, it, expect, beforeAll } from 'vitest';
import { getCardDetail } from '../../../src/api/card-search';
import { CardInfo } from '../../../src/types/card';
import { JSDOM } from 'jsdom';

describe('Flow: getCardDetail Bug Fix', () => {
  beforeAll(() => {
    // Mock document
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.document = dom.window.document;
    global.window = dom.window as any;

    // Mock fetch
    const mockFetch = async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('faq_search')) {
        return {
          ok: true,
          json: () => Promise.resolve({ faqs: [] }),
          text: () => Promise.resolve('{}')
        };
      }
      return {
        ok: true,
        text: () => Promise.resolve(`
        <div id="cardname">
          <h1>
            <span class="ruby">ブルーアイズ・ホワイト・ドラゴン</span>
            青眼の白龍
          </h1>
        </div>
        <div class="item_box_text">
          <div class="text_title">Card Text</div>
          Some text
        </div>
        <div class="item_box_value">
          [ Dragon / Normal ]
        </div>
        <div class="item_box_title"><img src="attribute_icon_light.png"></div>
        <div class="item_box">
          <div class="item_box_title"><img src="icon_level.png"></div>
          <div class="item_box_value">Level 8</div>
        </div>
        <div class="item_box"><div class="item_box_title">ATK</div><div class="item_box_value">3000</div></div>
        <div class="item_box"><div class="item_box_title">DEF</div><div class="item_box_value">2500</div></div>
        <p class="species">Dragon / Normal</p>
      `)
      };
    };
    global.fetch = mockFetch as any;

    // Mock DOMParser
    global.DOMParser = class {
      parseFromString(str: string, type: string) {
        return new JSDOM(str).window.document;
      }
    } as any;
  });

  it('should extract ruby from card detail page when missing from input', async () => {
    // Input CardInfo (from search result, missing ruby)
    const inputCard: CardInfo = {
      cardId: '4007',
      name: '青眼の白龍',
      ruby: undefined, // Missing ruby
      ciid: '1',
      imgs: [],
      cardType: 'monster',
      attribute: 'light',
      levelType: 'level',
      levelValue: 8,
      race: 'dragon',
      types: ['normal'],
      atk: 3000,
      def: 2500,
      isExtraDeck: false
    };

    // Call getCardDetail
    const result = await getCardDetail(inputCard);

    expect(result).toBeDefined();

    if (result) {
      expect(result.card.ruby).toBe('ブルーアイズ・ホワイト・ドラゴン');
    }
  });
});
