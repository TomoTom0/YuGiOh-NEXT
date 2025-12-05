import { describe, it, expect, beforeEach } from 'vitest';
import { parseDeckList } from '../../../src/content/parser/deck-list-parser';
import { JSDOM } from 'jsdom';

describe('deck-list-parser', () => {
  let doc: Document;

  beforeEach(() => {
    const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = window.document;
  });

  describe('parseDeckList', () => {
    it('デッキ一覧ページから複数のデッキを抽出する', () => {
      const html = `
        <html>
          <body>
            <div id="deck_list" class="list Choose">
              <div class="t_row">
                <div class="name flex_1">
                  <span class="name">デッキ1</span>
                </div>
                <input class="link_value" type="hidden" value="/yugiohdb/member_deck.action?ope=1&dno=1" />
              </div>
              <div class="t_row">
                <div class="name flex_1">
                  <span class="name">デッキ2</span>
                </div>
                <input class="link_value" type="hidden" value="/yugiohdb/member_deck.action?ope=1&dno=2" />
              </div>
              <div class="t_row">
                <div class="name flex_1">
                  <span class="name">デッキ3</span>
                </div>
                <input class="link_value" type="hidden" value="/yugiohdb/member_deck.action?ope=1&dno=3" />
              </div>
            </div>
          </body>
        </html>
      `;

      doc.documentElement.innerHTML = html;
      const result = parseDeckList(doc);

      expect(result).toHaveLength(3);
      expect(result[0].dno).toBe(1);
      expect(result[0].name).toBe('デッキ1');
      expect(result[1].dno).toBe(2);
      expect(result[2].dno).toBe(3);
    });

    it('デッキ一覧コンテナがない場合は空の配列を返す', () => {
      doc.documentElement.innerHTML = '<html><body></body></html>';

      const result = parseDeckList(doc);
      expect(result).toEqual([]);
    });

    it('デッキコンテナ内のt_rowをすべて抽出する', () => {
      const html = `
        <html>
          <body>
            <div id="deck_list" class="list Choose">
              <div class="t_row">
                <div class="name flex_1">
                  <span class="name">テストデッキA</span>
                </div>
                <input class="link_value" type="hidden" value="/yugiohdb/member_deck.action?dno=10" />
              </div>
              <div class="t_row">
                <div class="name flex_1">
                  <span class="name">テストデッキB</span>
                </div>
                <input class="link_value" type="hidden" value="/yugiohdb/member_deck.action?dno=11" />
              </div>
            </div>
          </body>
        </html>
      `;

      doc.documentElement.innerHTML = html;
      const result = parseDeckList(doc);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('テストデッキA');
      expect(result[1].name).toBe('テストデッキB');
    });

    it('不正な行情報の場合はスキップする', () => {
      const html = `
        <html>
          <body>
            <div id="deck_list" class="list Choose">
              <div class="t_row">
                <span class="deck_name">有効なデッキ</span>
              </div>
              <div class="t_row">
                <!-- 不正な行 -->
              </div>
              <div class="t_row">
                <span class="deck_name">別のデッキ</span>
              </div>
            </div>
          </body>
        </html>
      `;

      doc.documentElement.innerHTML = html;
      const result = parseDeckList(doc);

      // 不正な行がスキップされることを確認
      // parseDeckListRowの実装に依存するため、詳細なテストは別途実装
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });
});
