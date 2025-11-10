import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { parseDeckDetail } from '../../../src/content/parser/deck-detail-parser';

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
    // パーサーを実行
    const result = parseDeckDetail(doc);

    console.log('✓ parseDeckDetail executed successfully\n');

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
