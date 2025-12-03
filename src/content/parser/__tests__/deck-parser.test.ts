import { parseDeckPage, parseCardRow } from '../deck-parser';
import { CardType } from '@/types/card';

/**
 * デッキページHTMLパーサーのテスト
 */
describe('デッキページパーサー', () => {
  describe('parseCardRow', () => {
    it('モンスターカードの行を正しくパースできる', () => {
      const html = `
        <div class="card-row">
          <div class="box_card_attribute">
            <img src="/yugiohdb/icon/attribute_icon_light.png">
          </div>
          <div class="box_card_name">
            <input type="hidden" name="monsterCardId" id="card_id_1" value="12345">
            <input type="hidden" name="monster_imgs" value="12345_1_1_1">
            <span class="card_name">ブラック・マジシャン</span>
          </div>
          <div class="box_card_number">
            <input type="text" name="monster_card_number" value="2">
          </div>
        </div>
      `;
      const container = document.createElement('div');
      container.innerHTML = html;
      const row = container.querySelector('.card-row') as HTMLElement;

      const result = parseCardRow(row);

      expect(result).toMatchObject({
        cid: '12345',
        ciid: '1',
        quantity: 2
      });
      expect(result?.lang).toBeDefined();
    });

    it('魔法カードの行を正しくパースできる', () => {
      const html = `
        <div class="card-row">
          <div class="box_card_attribute">
            <img src="/yugiohdb/icon/attribute_icon_spell.png">
          </div>
          <div class="box_card_name">
            <input type="hidden" name="spellCardId" id="card_id_1" value="67890">
            <input type="hidden" name="spell_imgs" value="67890_2_1_1">
            <span class="card_name">ブラック・マジック</span>
          </div>
          <div class="box_card_number">
            <input type="text" name="spell_card_number" value="3">
          </div>
        </div>
      `;
      const container = document.createElement('div');
      container.innerHTML = html;
      const row = container.querySelector('.card-row') as HTMLElement;

      const result = parseCardRow(row);

      expect(result).toMatchObject({
        cid: '67890',
        ciid: '2',
        quantity: 3
      });
      expect(result?.lang).toBeDefined();
    });

    it('罠カードの行を正しくパースできる', () => {
      const html = `
        <div class="card-row">
          <div class="box_card_attribute">
            <img src="/yugiohdb/icon/attribute_icon_trap.png">
          </div>
          <div class="box_card_name">
            <input type="hidden" name="trapCardId" id="card_id_1" value="11111">
            <input type="hidden" name="trap_imgs" value="11111_1_1_1">
            <span class="card_name">聖なるバリア -ミラーフォース-</span>
          </div>
          <div class="box_card_number">
            <input type="text" name="trap_card_number" value="1">
          </div>
        </div>
      `;
      const container = document.createElement('div');
      container.innerHTML = html;
      const row = container.querySelector('.card-row') as HTMLElement;

      const result = parseCardRow(row);

      expect(result).toMatchObject({
        cid: '11111',
        ciid: '1',
        quantity: 1
      });
      expect(result?.lang).toBeDefined();
    });

    it('画像IDが指定されていない場合はデフォルト値"1"を使用する', () => {
      const html = `
        <div class="card-row">
          <div class="box_card_attribute">
            <img src="/yugiohdb/icon/attribute_icon_light.png">
          </div>
          <div class="box_card_name">
            <input type="hidden" name="monsterCardId" id="card_id_1" value="12345">
            <span class="card_name">青眼の白龍</span>
          </div>
          <div class="box_card_number">
            <input type="text" name="monster_card_number" value="1">
          </div>
        </div>
      `;
      const container = document.createElement('div');
      container.innerHTML = html;
      const row = container.querySelector('.card-row') as HTMLElement;

      const result = parseCardRow(row);

      expect(result?.ciid).toBe('1');
    });

    it('必要な情報が欠けている場合はnullを返す', () => {
      const html = `
        <div class="card-row">
          <div class="box_card_attribute">
            <img src="/yugiohdb/icon/unknown.png">
          </div>
        </div>
      `;
      const container = document.createElement('div');
      container.innerHTML = html;
      const row = container.querySelector('.card-row') as HTMLElement;

      const result = parseCardRow(row);

      expect(result).toBeNull();
    });
  });

  describe('parseDeckPage', () => {
    it('デッキページ全体をパースできる', () => {
      const html = `
        <html>
          <body>
            <input type="hidden" name="dno" value="4">
            <input type="text" name="deck_name" value="テストデッキ">

            <div id="main-deck">
              <div class="card-row">
                <div class="box_card_attribute">
                  <img src="/yugiohdb/icon/attribute_icon_light.png">
                </div>
                <div class="box_card_name">
                  <input type="hidden" name="monsterCardId" id="card_id_1" value="12345">
                  <input type="hidden" name="monster_imgs" value="12345_1_1_1">
                  <span class="card_name">ブラック・マジシャン</span>
                </div>
                <div class="box_card_number">
                  <input type="text" name="monster_card_number" value="2">
                </div>
              </div>
            </div>

            <div id="extra-deck">
            </div>

            <div id="side-deck">
            </div>

            <input type="checkbox" name="is_public" checked>
            <select name="deck_type">
              <option value="1" selected>デュエル</option>
            </select>
            <textarea name="comment">テストコメント</textarea>
          </body>
        </html>
      `;

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const result = parseDeckPage(doc);

      expect(result).toMatchObject({
        dno: 4,
        name: 'テストデッキ',
        isPublic: true,
        deckType: '1',
        comment: 'テストコメント'
      });
      expect(result.mainDeck).toHaveLength(1);
      expect(result.mainDeck[0]).toMatchObject({
        cid: '12345',
        ciid: '1',
        quantity: 2
      });
      expect(result.mainDeck[0]?.lang).toBeDefined();
      expect(result.extraDeck).toHaveLength(0);
      expect(result.sideDeck).toHaveLength(0);
    });

    it('デッキ番号が取得できない場合は0を返す', () => {
      const html = '<html><body></body></html>';
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const result = parseDeckPage(doc);

      expect(result.dno).toBe(0);
    });

    it('デッキ名が取得できない場合は空文字を返す', () => {
      const html = '<html><body></body></html>';
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const result = parseDeckPage(doc);

      expect(result.name).toBe('');
    });
  });
});
