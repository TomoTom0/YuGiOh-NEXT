import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Parser: Card Detail Page', () => {
  it('should parse trap card detail page correctly', async () => {
    const trapHtmlPath = path.join(__dirname, '../../../tmp/card-detail-4335.html');
    const trapHtml = fs.readFileSync(trapHtmlPath, 'utf-8');

    const trapDom = new JSDOM(trapHtml);
    const trapDoc = trapDom.window.document as unknown as Document;

    // カード名を取得
    const cardNameElem = trapDoc.querySelector('#cardname h1');
    expect(cardNameElem).toBeDefined();

    let cardName = '';
    if (cardNameElem) {
      cardNameElem.childNodes.forEach(node => {
        if (node.nodeType === 3) {
          const text = node.textContent?.trim();
          if (text) {
            cardName += text;
          }
        }
      });
    }
    expect(cardName).toBe('ドラゴン族・封印の壺');

    // カードタイプを確認
    const cardTypeElem = trapDoc.querySelector('.item_box_value');
    const cardTypeText = cardTypeElem?.textContent?.trim() || '';
    expect(cardTypeText).toContain('罠');

    // 画像IDを取得
    const imageElem = trapDoc.querySelector('#card_image_1, #thumbnail_card_image_1');
    const imageSrc = imageElem?.getAttribute('src') || '';
    expect(imageSrc).toBeDefined();

    // 収録パック情報を確認
    const updateList = trapDoc.querySelector('#update_list');
    expect(updateList).toBeDefined();
    if (updateList) {
      const packRows = updateList.querySelectorAll('.t_row');
      expect(packRows.length).toBeGreaterThan(0);
    }

    // 関連カード情報を確認
    const listStyle = trapDoc.querySelector('.list_style.list');
    expect(listStyle).toBeDefined();
    if (listStyle) {
      const relatedCardRows = listStyle.querySelectorAll('.t_row');
      expect(relatedCardRows.length).toBeGreaterThan(0);
    }
  });

  it('should parse monster card detail page correctly', async () => {
    const monsterHtmlPath = path.join(__dirname, '../../../tmp/card-detail-4206-monster.html');
    const monsterHtml = fs.readFileSync(monsterHtmlPath, 'utf-8');

    const monsterDom = new JSDOM(monsterHtml);
    const monsterDoc = monsterDom.window.document as unknown as Document;

    // カード名を取得
    const monsterNameElem = monsterDoc.querySelector('#cardname h1');
    expect(monsterNameElem).toBeDefined();

    let monsterCardName = '';
    if (monsterNameElem) {
      monsterNameElem.childNodes.forEach(node => {
        if (node.nodeType === 3) {
          const text = node.textContent?.trim();
          if (text) {
            monsterCardName += text;
          }
        }
      });
    }
    expect(monsterCardName).toBe('プチリュウ');

    // 属性を確認
    const itemBoxValues = monsterDoc.querySelectorAll('.item_box_value');
    let foundAttribute = false;
    itemBoxValues.forEach(elem => {
      const text = elem.textContent?.trim() || '';
      if (text.includes('風属性')) {
        foundAttribute = true;
      }
    });
    expect(foundAttribute).toBe(true);

    // レベルを確認
    let foundLevel = false;
    itemBoxValues.forEach(elem => {
      const text = elem.textContent?.trim() || '';
      if (text.includes('レベル 2')) {
        foundLevel = true;
      }
    });
    expect(foundLevel).toBe(true);

    // ATK/DEFを確認
    const atkDefBoxes = monsterDoc.querySelectorAll('.item_box');
    let atk: string | null = null;
    let def: string | null = null;

    atkDefBoxes.forEach(box => {
      const title = box.querySelector('.item_box_title')?.textContent?.trim();
      const value = box.querySelector('.item_box_value')?.textContent?.trim();

      if (title === 'ATK' && value) {
        atk = value;
      } else if (title === 'DEF' && value) {
        def = value;
      }
    });

    expect(atk).toBe('600');
    expect(def).toBe('700');
  });
});
