import { JSDOM } from 'jsdom';
import { detectLanguage } from '../../../src/utils/language-detector';

/**
 * language-detector.ts のユニットテスト
 */

console.log('=== Testing language-detector.ts ===\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error}`);
    testsFailed++;
  }
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, but got ${actual}`
    );
  }
}

// テスト1: #nowlanguage a.current要素から検出（日本語）
test('#nowlanguage a.current から日本語検出', () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <div id="nowlanguage">
          <a class="current" href="?request_locale=ja">日本語</a>
          <a href="?request_locale=en">English</a>
        </div>
      </body>
    </html>
  `;
  const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
  const doc = dom.window.document as unknown as Document;
  
  const result = detectLanguage(doc);
  assertEquals(result, 'ja');
});

// テスト2: #nowlanguage a.current要素から検出（英語）
test('#nowlanguage a.current から英語検出', () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <div id="nowlanguage">
          <a href="?request_locale=ja">日本語</a>
          <a class="current" href="?request_locale=en">English</a>
        </div>
      </body>
    </html>
  `;
  const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
  const doc = dom.window.document as unknown as Document;
  
  const result = detectLanguage(doc);
  assertEquals(result, 'en');
});

// テスト3: #nowlanguage要素のテキストから検出（a.currentなし）
test('#nowlanguage テキストから韓国語検出', () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <div id="nowlanguage">한글</div>
      </body>
    </html>
  `;
  const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
  const doc = dom.window.document as unknown as Document;
  
  const result = detectLanguage(doc);
  assertEquals(result, 'ko');
});

// テスト4: meta og:urlから検出
test('meta og:url から検出', () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:url" content="https://www.db.yugioh-card.com/yugiohdb/?request_locale=de" />
      </head>
      <body></body>
    </html>
  `;
  const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
  const doc = dom.window.document as unknown as Document;
  
  const result = detectLanguage(doc);
  assertEquals(result, 'de');
});

// テスト5: URLパラメータから検出
test('URLパラメータから検出', () => {
  const html = `<!DOCTYPE html><html><head></head><body></body></html>`;
  const dom = new JSDOM(html, { 
    url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=fr' 
  });
  const doc = dom.window.document as unknown as Document;
  
  const result = detectLanguage(doc);
  assertEquals(result, 'fr');
});

// テスト6: html lang属性から検出
test('html lang属性から検出', () => {
  const html = `
    <!DOCTYPE html>
    <html lang="es-ES">
      <head></head>
      <body></body>
    </html>
  `;
  const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
  const doc = dom.window.document as unknown as Document;
  
  const result = detectLanguage(doc);
  assertEquals(result, 'es');
});

// テスト7: デフォルト値（日本語）
test('デフォルト値（要素なし）', () => {
  const html = `<!DOCTYPE html><html><head></head><body></body></html>`;
  const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
  const doc = dom.window.document as unknown as Document;
  
  const result = detectLanguage(doc);
  assertEquals(result, 'ja');
});

// テスト8: 優先順位確認（#nowlanguage a.current が最優先）
test('優先順位: #nowlanguage a.current > meta og:url', () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:url" content="https://www.db.yugioh-card.com/yugiohdb/?request_locale=de" />
      </head>
      <body>
        <div id="nowlanguage">
          <a class="current" href="?request_locale=en">English</a>
        </div>
      </body>
    </html>
  `;
  const dom = new JSDOM(html, { url: 'https://www.db.yugioh-card.com/yugiohdb/' });
  const doc = dom.window.document as unknown as Document;
  
  const result = detectLanguage(doc);
  assertEquals(result, 'en', '#nowlanguage a.current が優先されるべき');
});

// テスト9: 優先順位確認（meta og:url > URLパラメータ）
test('優先順位: meta og:url > URLパラメータ', () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:url" content="https://www.db.yugioh-card.com/yugiohdb/?request_locale=it" />
      </head>
      <body></body>
    </html>
  `;
  const dom = new JSDOM(html, { 
    url: 'https://www.db.yugioh-card.com/yugiohdb/?request_locale=pt' 
  });
  const doc = dom.window.document as unknown as Document;
  
  const result = detectLanguage(doc);
  assertEquals(result, 'it', 'meta og:url が優先されるべき');
});

// 結果サマリー
console.log('\n' + '='.repeat(50));
console.log(`Total: ${testsPassed + testsFailed} tests`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log('='.repeat(50));

if (testsFailed > 0) {
  process.exit(1);
}
