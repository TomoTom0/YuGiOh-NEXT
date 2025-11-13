import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseDeckDetail } from '../../../src/content/parser/deck-detail-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * デッキ詳細パーサーのテスト
 * tests/combine/data/deck-detail-public.htmlを使用
 */
async function testDeckDetailParser() {
  console.log('=== Testing parseDeckDetail ===\n');

  // HTMLファイルを読み込み
  const htmlPath = path.join(__dirname, '../data/deck-detail-public.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // JSDOMでパース
  const dom = new JSDOM(html, {
    url: 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=214&request_locale=ja'
  });
  const doc = dom.window.document as unknown as Document;

  try {
    // 言語検出テスト
    console.log('--- Language Detection ---');
    const metaLang = doc.querySelector('meta[http-equiv="Content-Language"]')?.getAttribute('content');
    console.log('Content-Language:', metaLang || '(not found)');
    console.log('URL locale:', doc.URL.includes('request_locale=ja') ? 'ja' : 'unknown');
    
    // パーサーを実行
    const result = parseDeckDetail(doc);

    console.log('\n✓ parseDeckDetail executed successfully\n');

    // 基本情報
    console.log('--- Basic Information ---');
    console.log('dno:', result.dno);
    console.log('name:', result.name);
    console.log('isPublic:', result.isPublic);
    console.log('cgid:', result.cgid);

    // デッキ構成
    console.log('\n--- Deck Composition ---');
    console.log('mainDeck count:', result.mainDeck.length);
    console.log('extraDeck count:', result.extraDeck.length);
    console.log('sideDeck count:', result.sideDeck.length);

    // メタデータ
    console.log('\n--- Metadata ---');
    console.log('deckType:', result.deckType);
    console.log('deckStyle:', result.deckStyle);
    console.log('category:', result.category);
    console.log('tags:', result.tags);
    console.log('comment:', result.comment ? result.comment.substring(0, 100) + '...' : '(empty)');
    console.log('deckCode:', result.deckCode);

    // 型チェック
    console.log('\n--- Type Checks ---');
    console.log('category is Array?', Array.isArray(result.category));
    console.log('tags is Array?', Array.isArray(result.tags));
    console.log('comment is string?', typeof result.comment === 'string');
    console.log('deckCode is string?', typeof result.deckCode === 'string');

    // サンプルカード（最初の3枚）
    console.log('\n--- Sample Cards (first 3 from mainDeck) ---');
    result.mainDeck.slice(0, 3).forEach((deckCard, index) => {
      console.log(`\nCard ${index + 1}:`);
      console.log('  name:', deckCard.card.name);
      console.log('  cardId:', deckCard.card.cardId);
      console.log('  cardType:', deckCard.card.cardType);
      console.log('  quantity:', deckCard.quantity);
      
      // ciid/imgsの確認
      if (index === 0) {
        console.log('  ciid:', deckCard.card.ciid);
        console.log('  imgs:', deckCard.card.imgs);
      }
      
      // モンスターカードの属性・種族確認（多言語対応）
      if (index === 0 && deckCard.card.cardType === 'monster') {
        console.log('  attribute:', deckCard.card.attribute);
        console.log('  race:', deckCard.card.race);
        
        // 属性・種族が英語IDに変換されているか確認
        const validAttributes = ['light', 'dark', 'water', 'fire', 'earth', 'wind', 'divine'];
        const validRaces = ['dragon', 'spellcaster', 'warrior', 'fairy', 'fiend', 'zombie', 
                           'machine', 'aqua', 'pyro', 'rock', 'windbeast', 'plant', 'insect',
                           'thunder', 'beast', 'beastwarrior', 'dinosaur', 'fish', 'seaserpent',
                           'reptile', 'psychic', 'divine', 'creatorgod', 'wyrm', 'cyberse', 'illusion'];
        
        if (deckCard.card.attribute && !validAttributes.includes(deckCard.card.attribute)) {
          console.log('  ⚠ Warning: attribute not in valid list');
        }
        if (deckCard.card.race && !validRaces.includes(deckCard.card.race)) {
          console.log('  ⚠ Warning: race not in valid list');
        }
      }
    });

    // 検証
    console.log('\n--- Validation ---');
    const errors: string[] = [];

    if (typeof result.dno !== 'number') errors.push('dno should be number');
    if (typeof result.name !== 'string') errors.push('name should be string');
    if (!Array.isArray(result.mainDeck)) errors.push('mainDeck should be array');
    if (!Array.isArray(result.extraDeck)) errors.push('extraDeck should be array');
    if (!Array.isArray(result.sideDeck)) errors.push('sideDeck should be array');
    if (!Array.isArray(result.category)) errors.push('category should be array');
    if (!Array.isArray(result.tags)) errors.push('tags should be array');
    if (typeof result.comment !== 'string') errors.push('comment should be string');
    if (typeof result.deckCode !== 'string') errors.push('deckCode should be string');
    
    // ciid/imgs必須チェック
    result.mainDeck.forEach((deckCard, index) => {
      if (deckCard.card.ciid === undefined) {
        errors.push(`mainDeck[${index}]: missing ciid`);
      }
      if (!deckCard.card.imgs) {
        errors.push(`mainDeck[${index}]: missing imgs`);
      }
    });

    if (errors.length > 0) {
      console.log('✗ Validation failed:');
      errors.forEach(err => console.log('  -', err));
      process.exit(1);
    } else {
      console.log('✓ All validations passed');
    }

    console.log('\n✓ Test completed successfully');

  } catch (error) {
    console.error('✗ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testDeckDetailParser();
