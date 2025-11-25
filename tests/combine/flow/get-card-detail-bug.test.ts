import { getCardDetail } from '../../../src/api/card-search';
import { CardInfo } from '../../../src/types/card';
import { JSDOM } from 'jsdom';

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

async function testGetCardDetailBug() {
  console.log('=== Testing getCardDetail Bug ===\n');

  // 1. Input CardInfo (from search result, missing ruby)
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

  // 3. Call getCardDetail
  console.log('Calling getCardDetail with input card (no ruby)...');
  const result = await getCardDetail(inputCard);

  if (!result) {
    console.error('ERROR: getCardDetail returned null');
    process.exit(1);
  }

  console.log('Result Name:', result.card.name);
  console.log('Result Ruby:', result.card.ruby);

  // 4. Assertions
  // After fix, ruby should be present
  if (result.card.ruby === 'ブルーアイズ・ホワイト・ドラゴン') {
    console.log('✓ FIXED: Ruby is correctly extracted from HTML');
  } else {
    console.error('ERROR: Ruby is still missing or incorrect');
    console.log('Ruby value:', result.card.ruby);
    process.exit(1);
  }

  console.log('\n=== Test Passed (Bug Fixed) ===');
}

// Mock DOMParser
global.DOMParser = class {
  parseFromString(str: string, type: string) {
    return new JSDOM(str).window.document;
  }
} as any;

// Mock other dependencies if needed
// We can mock the module import if we were using a test runner that supports it,
// but with tsx we rely on the fact that getCardFAQList is imported.
// Since we can't easily mock the import in tsx without a loader, we'll just let it fail or mock the global fetch to handle it if it calls an API.
// Actually getCardFAQList calls fetch too. Our global fetch mock handles it?
// Our global fetch mock returns HTML. getCardFAQList expects JSON usually?
// Let's make the fetch mock smarter.

testGetCardDetailBug().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
