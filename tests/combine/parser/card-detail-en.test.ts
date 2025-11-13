import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

// DOMParserをモックするため、JSDOMのwindow.DOMParserを使用
global.DOMParser = (new JSDOM()).window.DOMParser as any;
global.fetch = async () => ({ ok: false }) as any;

// パーサー関数をインポート
import * as cardSearch from '../../../src/api/card-search';

/**
 * カード詳細パーサーのテスト（英語版）
 * tests/combine/data/en/card-detail-en.htmlを使用
 */
async function testCardDetailParserEn() {
  console.log('=== Testing Card Detail Parser (English) ===\n');

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ ${message}`);
      testsPassed++;
    } else {
      console.error(`❌ ${message}`);
      testsFailed++;
    }
  }

  function assertExists(value: any, message: string) {
    if (value !== undefined && value !== null) {
      console.log(`✅ ${message}`);
      testsPassed++;
    } else {
      console.error(`❌ ${message}`);
      testsFailed++;
    }
  }

  // HTMLファイルを読み込み
  const htmlPath = path.join(__dirname, '../data/en/card-detail-en.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // JSDOMでパース
  const dom = new JSDOM(html, {
    url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4831&request_locale=en'
  });
  const doc = dom.window.document as unknown as Document;

  try {
    // 言語検出テスト
    console.log('--- Language Detection ---');
    const langElem = doc.querySelector('#nowlanguage a.current');
    const metaLang = doc.querySelector('meta[http-equiv="Content-Language"]')?.getAttribute('content');
    
    // #nowlanguage a.currentが存在しない場合、metaタグから確認
    if (!langElem && metaLang) {
      assert(metaLang === 'en', `Language detected from meta tag (${metaLang})`);
    } else {
      const detectedLang = langElem?.textContent?.trim().toLowerCase();
      assert(detectedLang === 'english', `Language detected as English (got: ${detectedLang})`);
    }
    console.log('');

    // 収録シリーズのテスト
    console.log('--- Pack Info Parsing ---');
    const updateList = doc.querySelector('#update_list');
    assertExists(updateList, '#update_list element found');

    if (updateList) {
      const packRows = updateList.querySelectorAll('.t_row');
      assert(packRows.length > 0, `Pack entries found (${packRows.length} packs)`);

      if (packRows.length > 0) {
        const firstPack = packRows[0] as HTMLElement;
        const timeElem = firstPack.querySelector('.time');
        const cardNumberElem = firstPack.querySelector('.card_number');
        const packNameElem = firstPack.querySelector('.pack_name');

        assertExists(timeElem?.textContent?.trim(), 'Release date exists');
        assertExists(cardNumberElem?.textContent?.trim(), 'Card number exists');
        assertExists(packNameElem?.textContent?.trim(), 'Pack name exists');

        console.log('  First Pack:');
        console.log('    Release Date:', timeElem?.textContent?.trim());
        console.log('    Card Number:', cardNumberElem?.textContent?.trim());
        console.log('    Pack Name:', packNameElem?.textContent?.trim());
      }
    }
    console.log('');

    // 関連カードのテスト
    console.log('--- Related Cards Parsing ---');
    let cardList = doc.querySelector('#card_list');
    if (!cardList) {
      cardList = doc.querySelector('.list_style.list');
    }
    assertExists(cardList, 'Card list element found');

    if (cardList) {
      const cardRows = cardList.querySelectorAll('.t_row');
      assert(cardRows.length > 0, `Related cards found (${cardRows.length} cards)`);

      // 画像情報を抽出
      const imageInfoMap = cardSearch.extractImageInfo(doc);
      assert(imageInfoMap.size > 0, `Image info extracted (${imageInfoMap.size} cards)`);

      // 最初の3枚の関連カードをパース
      const relatedCards: any[] = [];
      let parseSuccessCount = 0;
      
      cardRows.forEach((row, index) => {
        if (index < 3) {
          const card = cardSearch.parseSearchResultRow(row as HTMLElement, imageInfoMap);
          if (card) {
            relatedCards.push(card);
            parseSuccessCount++;
          }
        }
      });

      assert(parseSuccessCount >= 3, `First 3 cards parsed successfully (${parseSuccessCount}/3)`);

      // 最初のカードの詳細確認
      if (relatedCards.length > 0) {
        const firstCard = relatedCards[0];
        console.log('  First Related Card:');
        console.log('    Card ID:', firstCard.cardId);
        console.log('    Name:', firstCard.name);
        console.log('    Card Type:', firstCard.cardType);
        
        assertExists(firstCard.cardId, 'Card ID exists');
        assertExists(firstCard.name, 'Card name exists');
        assertExists(firstCard.cardType, 'Card type exists');

        // モンスターカードの場合
        if (firstCard.cardType === 'monster') {
          console.log('    Attribute:', firstCard.attribute);
          console.log('    Race:', firstCard.race);
          console.log('    ATK/DEF:', firstCard.atkDef);
          
          assertExists(firstCard.attribute, 'Monster attribute exists');
          assertExists(firstCard.race, 'Monster race exists');
          
          // 属性と種族が英語マッピングで正しく変換されているか
          const validAttributes = ['light', 'dark', 'water', 'fire', 'earth', 'wind', 'divine'];
          const validRaces = ['dragon', 'spellcaster', 'warrior', 'fairy', 'fiend', 'zombie', 
                             'machine', 'aqua', 'pyro', 'rock', 'windbeast', 'plant', 'insect',
                             'thunder', 'beast', 'beastwarrior', 'dinosaur', 'fish', 'seaserpent',
                             'reptile', 'psychic', 'divine', 'creatorgod', 'wyrm', 'cyberse', 'illusion'];
          
          if (firstCard.attribute) {
            assert(
              validAttributes.includes(firstCard.attribute),
              `Attribute mapped correctly (${firstCard.attribute})`
            );
          }
          
          if (firstCard.race) {
            assert(
              validRaces.includes(firstCard.race),
              `Race mapped correctly (${firstCard.race})`
            );
          }
        }
        
        // 魔法・罠カードの場合
        if (firstCard.cardType === 'spell' || firstCard.cardType === 'trap') {
          const effectType = firstCard.cardType === 'spell' ? firstCard.spellType : firstCard.trapType;
          console.log('    Effect Type:', effectType);
          assertExists(effectType, 'Effect type exists');
          
          const validEffectTypes = ['normal', 'continuous', 'equip', 'field', 'quickplay', 'ritual', 'counter'];
          if (effectType) {
            assert(
              validEffectTypes.includes(effectType),
              `Effect type mapped correctly (${effectType})`
            );
          }
        }
      }
    }
    console.log('');

    // テスト結果サマリー
    console.log('='.repeat(50));
    console.log(`Total: ${testsPassed + testsFailed} tests`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log('='.repeat(50));

    if (testsFailed > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

// テスト実行
testCardDetailParserEn();
