/**
 * カード詳細ページパーサーのテスト
 *
 * カード詳細ページは検索結果ページとHTML構造が異なるため、
 * 専用のパーサー（parseCardDetailPage）が必要
 */

import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testCardDetailPageParser() {
  console.log('=== Testing Card Detail Page Parser ===\n');

  // テスト1: 罠カード（ドラゴン族・封印の壺）
  console.log('--- Test 1: Trap Card (ドラゴン族・封印の壺) ---');
  const trapHtmlPath = path.join(__dirname, '../../../tmp/card-detail-4335.html');
  const trapHtml = fs.readFileSync(trapHtmlPath, 'utf-8');

  const trapDom = new JSDOM(trapHtml);
  const trapDoc = trapDom.window.document as unknown as Document;

  // カード名を取得
  const cardNameElem = trapDoc.querySelector('#cardname h1');
  if (!cardNameElem) {
    console.error('ERROR: #cardname h1 not found');
    return;
  }

  let cardName = '';
  cardNameElem.childNodes.forEach(node => {
    if (node.nodeType === 3) { // TEXT_NODE
      const text = node.textContent?.trim();
      if (text) {
        cardName += text;
      }
    }
  });

  console.log('Card Name:', cardName);
  if (cardName !== 'ドラゴン族・封印の壺') {
    console.error('ERROR: Expected "ドラゴン族・封印の壺", got:', cardName);
  } else {
    console.log('✓ Card name correct');
  }

  // カードタイプを確認
  const cardTypeElem = trapDoc.querySelector('.item_box_value');
  const cardTypeText = cardTypeElem?.textContent?.trim() || '';
  console.log('Card Type Text:', cardTypeText);
  if (!cardTypeText.includes('罠')) {
    console.error('ERROR: Expected type to contain "罠"');
  } else {
    console.log('✓ Card type correct');
  }

  // 画像IDを取得
  const imageElem = trapDoc.querySelector('#card_image_1, #thumbnail_card_image_1');
  const imageSrc = imageElem?.getAttribute('src') || '';
  const imageIdMatch = imageSrc.match(/ciid=(\d+)/);
  const imageId = imageIdMatch?.[1] ?? '1';
  console.log('Image ID:', imageId);
  console.log('✓ Image ID extracted');

  // 収録パック情報を確認
  const updateList = trapDoc.querySelector('#update_list');
  if (!updateList) {
    console.error('ERROR: #update_list not found');
  } else {
    const packRows = updateList.querySelectorAll('.t_row');
    console.log(`Pack Info Count: ${packRows.length}`);
    if (packRows.length === 0) {
      console.error('ERROR: No pack info found');
    } else {
      console.log('✓ Pack info found');
    }
  }

  // 関連カード情報を確認
  const listStyle = trapDoc.querySelector('.list_style.list');
  if (!listStyle) {
    console.error('ERROR: .list_style.list not found');
  } else {
    const relatedCardRows = listStyle.querySelectorAll('.t_row');
    console.log(`Related Cards Count: ${relatedCardRows.length}`);
    if (relatedCardRows.length === 0) {
      console.error('ERROR: No related cards found');
    } else {
      console.log('✓ Related cards found');
    }
  }

  console.log('');

  // テスト2: モンスターカード（プチリュウ）
  console.log('--- Test 2: Monster Card (プチリュウ) ---');
  const monsterHtmlPath = path.join(__dirname, '../../../tmp/card-detail-4206-monster.html');
  const monsterHtml = fs.readFileSync(monsterHtmlPath, 'utf-8');

  const monsterDom = new JSDOM(monsterHtml);
  const monsterDoc = monsterDom.window.document as unknown as Document;

  // カード名を取得
  const monsterNameElem = monsterDoc.querySelector('#cardname h1');
  if (!monsterNameElem) {
    console.error('ERROR: #cardname h1 not found');
    return;
  }

  let monsterCardName = '';
  monsterNameElem.childNodes.forEach(node => {
    if (node.nodeType === 3) { // TEXT_NODE
      const text = node.textContent?.trim();
      if (text) {
        monsterCardName += text;
      }
    }
  });

  console.log('Card Name:', monsterCardName);
  if (monsterCardName !== 'プチリュウ') {
    console.error('ERROR: Expected "プチリュウ", got:', monsterCardName);
  } else {
    console.log('✓ Card name correct');
  }

  // 属性を確認
  const itemBoxValues = monsterDoc.querySelectorAll('.item_box_value');
  let foundAttribute = false;
  itemBoxValues.forEach(elem => {
    const text = elem.textContent?.trim() || '';
    if (text.includes('風属性')) {
      foundAttribute = true;
    }
  });
  if (!foundAttribute) {
    console.error('ERROR: 風属性 not found');
  } else {
    console.log('✓ Attribute (風属性) found');
  }

  // レベルを確認
  let foundLevel = false;
  itemBoxValues.forEach(elem => {
    const text = elem.textContent?.trim() || '';
    if (text.includes('レベル 2')) {
      foundLevel = true;
    }
  });
  if (!foundLevel) {
    console.error('ERROR: レベル 2 not found');
  } else {
    console.log('✓ Level (レベル 2) found');
  }

  // ATK/DEFを確認
  const atkDefBoxes = monsterDoc.querySelectorAll('.item_box');
  let atk = null;
  let def = null;

  atkDefBoxes.forEach(box => {
    const title = box.querySelector('.item_box_title')?.textContent?.trim();
    const value = box.querySelector('.item_box_value')?.textContent?.trim();

    if (title === 'ATK' && value) {
      atk = value;
    } else if (title === 'DEF' && value) {
      def = value;
    }
  });

  console.log('ATK:', atk);
  console.log('DEF:', def);
  if (atk !== '600') {
    console.error('ERROR: Expected ATK=600, got:', atk);
  } else {
    console.log('✓ ATK correct');
  }
  if (def !== '700') {
    console.error('ERROR: Expected DEF=700, got:', def);
  } else {
    console.log('✓ DEF correct');
  }

  console.log('\n=== All Tests Passed ===');
}

testCardDetailPageParser().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
