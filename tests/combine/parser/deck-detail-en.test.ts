import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseDeckDetail } from '../../../src/content/parser/deck-detail-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * デッキ詳細パーサーのテスト（英語版）
 * tests/combine/data/en/deck-detail-public-en.htmlを使用
 */
async function testDeckDetailParserEn() {
  console.log('=== Testing parseDeckDetail (English) ===\n');

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

  function assertType(value: any, type: string, message: string) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType === type) {
      console.log(`✅ ${message} (type: ${type})`);
      testsPassed++;
    } else {
      console.error(`❌ ${message} (expected: ${type}, got: ${actualType})`);
      testsFailed++;
    }
  }

  // HTMLファイルを読み込み
  const htmlPath = path.join(__dirname, '../data/en/deck-detail-public-en.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // JSDOMでパース
  const dom = new JSDOM(html, {
    url: 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=xxx&dno=123&request_locale=en'
  });
  const doc = dom.window.document as unknown as Document;

  try {
    // 言語検出テスト
    console.log('--- Language Detection ---');
    const metaLang = doc.querySelector('meta[http-equiv="Content-Language"]')?.getAttribute('content');
    assert(metaLang === 'en', `Language is English (${metaLang})`);
    console.log('');

    // パーサーを実行
    console.log('--- Parser Execution ---');
    const result = parseDeckDetail(doc);
    assert(!!result, 'parseDeckDetail executed successfully');
    console.log('');

    // 基本情報
    console.log('--- Basic Information ---');
    console.log('  dno:', result.dno);
    console.log('  name:', result.name);
    console.log('  isPublic:', result.isPublic);
    console.log('  cgid:', result.cgid);
    
    assertType(result.dno, 'number', 'dno is number');
    assertType(result.name, 'string', 'name is string');
    assertType(result.isPublic, 'boolean', 'isPublic is boolean');
    console.log('');

    // デッキ構成
    console.log('--- Deck Composition ---');
    console.log('  mainDeck:', result.mainDeck.length, 'cards');
    console.log('  extraDeck:', result.extraDeck.length, 'cards');
    console.log('  sideDeck:', result.sideDeck.length, 'cards');

    assertType(result.mainDeck, 'array', 'mainDeck is array');
    assertType(result.extraDeck, 'array', 'extraDeck is array');
    assertType(result.sideDeck, 'array', 'sideDeck is array');
    
    assert(result.mainDeck.length > 0, 'mainDeck has cards');
    console.log('');

    // メタデータ
    console.log('--- Metadata ---');
    console.log('  deckType:', result.deckType);
    console.log('  deckStyle:', result.deckStyle);
    console.log('  category:', result.category);
    console.log('  tags:', result.tags);
    console.log('  comment:', result.comment ? result.comment.substring(0, 50) + '...' : '(empty)');
    console.log('  deckCode:', result.deckCode ? result.deckCode.substring(0, 30) + '...' : '(empty)');

    assertType(result.category, 'array', 'category is array');
    assertType(result.tags, 'array', 'tags is array');
    assertType(result.comment, 'string', 'comment is string');
    assertType(result.deckCode, 'string', 'deckCode is string');
    console.log('');

    // サンプルカード（最初の3枚）
    console.log('--- Sample Cards (first 3 from mainDeck) ---');
    const sampleCards = result.mainDeck.slice(0, 3);
    
    sampleCards.forEach((deckCard, index) => {
      console.log(`  Card ${index + 1}:`);
      console.log('    name:', deckCard.card.name);
      console.log('    cardId:', deckCard.card.cardId);
      console.log('    cardType:', deckCard.card.cardType);
      console.log('    quantity:', deckCard.quantity);
      
      // カードの基本フィールド確認
      if (index === 0) {
        assertType(deckCard.card.cardId, 'string', 'cardId is string');
        assertType(deckCard.card.name, 'string', 'card name is string');
        assertType(deckCard.card.cardType, 'string', 'cardType is string');
        assertType(deckCard.quantity, 'number', 'quantity is number');
        
        // モンスターカードの場合
        if (deckCard.card.cardType === 'monster') {
          console.log('    attribute:', deckCard.card.attribute);
          console.log('    race:', deckCard.card.race);
          
          assertType(deckCard.card.attribute, 'string', 'attribute is string');
          assertType(deckCard.card.race, 'string', 'race is string');
          
          // 属性と種族のマッピング確認
          const validAttributes = ['light', 'dark', 'water', 'fire', 'earth', 'wind', 'divine'];
          const validRaces = ['dragon', 'spellcaster', 'warrior', 'fairy', 'fiend', 'zombie', 
                             'machine', 'aqua', 'pyro', 'rock', 'windbeast', 'plant', 'insect',
                             'thunder', 'beast', 'beastwarrior', 'dinosaur', 'fish', 'seaserpent',
                             'reptile', 'psychic', 'divine', 'creatorgod', 'wyrm', 'cyberse', 'illusion'];
          
          if (deckCard.card.attribute) {
            assert(
              validAttributes.includes(deckCard.card.attribute),
              `Attribute mapped correctly (${deckCard.card.attribute})`
            );
          }
          
          if (deckCard.card.race) {
            assert(
              validRaces.includes(deckCard.card.race),
              `Race mapped correctly (${deckCard.card.race})`
            );
          }
        }
        
        // 魔法・罠カードの場合
        if (deckCard.card.cardType === 'spell' || deckCard.card.cardType === 'trap') {
          const effectType = deckCard.card.cardType === 'spell' 
            ? deckCard.card.spellType 
            : deckCard.card.trapType;
          
          if (effectType) {
            console.log('    effectType:', effectType);
            const validEffectTypes = ['normal', 'continuous', 'equip', 'field', 'quickplay', 'ritual', 'counter'];
            assert(
              validEffectTypes.includes(effectType),
              `Effect type mapped correctly (${effectType})`
            );
          }
        }
      }
    });
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
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// テスト実行
testDeckDetailParserEn();
