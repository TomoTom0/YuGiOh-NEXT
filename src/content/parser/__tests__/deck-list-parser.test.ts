import { describe, it, expect, beforeEach } from 'vitest';
import { parseDeckList } from '../deck-list-parser';
import { JSDOM } from 'jsdom';

/**
 * deck-list-parser.ts のテスト
 *
 * デッキ一覧ページのHTMLをパースして、デッキ一覧を抽出する機能をテスト
 */

describe('parseDeckList', () => {
  let doc: Document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;
  });

  describe('基本的なデッキ抽出', () => {
    it('デッキ一覧が存在しない場合は空配列を返す', () => {
      const result = parseDeckList(doc);
      expect(result).toEqual([]);
    });

    it('1つのデッキを抽出できる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1">
              <div class="name">テストデッキ</div>
            </div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('テストデッキ');
      expect(result[0].dno).toBe(10);
    });

    it('複数のデッキを抽出できる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1">
              <div class="name">デッキA</div>
            </div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=5">
          </div>
          <div class="t_row">
            <div class="name flex_1">
              <div class="name">デッキB</div>
            </div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=15">
          </div>
          <div class="t_row">
            <div class="name flex_1">
              <div class="name">デッキC</div>
            </div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=25">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('デッキA');
      expect(result[0].dno).toBe(5);
      expect(result[1].name).toBe('デッキB');
      expect(result[1].dno).toBe(15);
      expect(result[2].name).toBe('デッキC');
      expect(result[2].dno).toBe(25);
    });

    it('デッキ名に空白がある場合はトリムされる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1">
              <div class="name">  テスト デッキ  </div>
            </div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result[0].name).toBe('テスト デッキ');
    });
  });

  describe('デッキ番号の抽出', () => {
    it('1桁のデッキ番号を抽出できる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">Deck</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=1">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result[0].dno).toBe(1);
    });

    it('複数桁のデッキ番号を抽出できる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">Deck</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=9999">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result[0].dno).toBe(9999);
    });

    it('クエリパラメータの順序が異なる場合でも抽出できる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">Deck</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?dno=42&ope=1">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result[0].dno).toBe(42);
    });

    it('dnoが存在しない場合はスキップされる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">Invalid</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1">
          </div>
          <div class="t_row">
            <div class="name flex_1"><div class="name">Valid</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Valid');
    });
  });

  describe('デッキタイプの抽出', () => {
    it('デッキタイプが指定されている場合は抽出される', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">Deck</div></div>
            <div class="lr_icon">
              <span>OCG（マスタールール）</span>
            </div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result[0].deckType).toBe('0');
    });

    it('デッキタイプが指定されていない場合はundefinedになる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">Deck</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result[0].deckType).toBeUndefined();
    });

    it('デッキタイプの空文字列はundefinedになる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">Deck</div></div>
            <div class="lr_icon">
              <span></span>
            </div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result[0].deckType).toBeUndefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('デッキ名がない場合はスキップされる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1">
              <div class="name"></div>
            </div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
          <div class="t_row">
            <div class="name flex_1"><div class="name">Valid</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=20">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Valid');
    });

    it('デッキ番号の入力がない場合はスキップされる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">Invalid</div></div>
            <input class="link_value" value="">
          </div>
          <div class="t_row">
            <div class="name flex_1"><div class="name">Valid</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Valid');
    });

    it('link_valueの入力がない場合はスキップされる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">Invalid</div></div>
          </div>
          <div class="t_row">
            <div class="name flex_1"><div class="name">Valid</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Valid');
    });

    it('複数の無効なデッキをスキップして有効なデッキのみ抽出', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">Invalid1</div></div>
          </div>
          <div class="t_row">
            <div class="name flex_1"><div class="name">Valid1</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
          <div class="t_row">
            <div class="name flex_1"><div class="name"></div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=20">
          </div>
          <div class="t_row">
            <div class="name flex_1"><div class="name">Valid2</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=30">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Valid1');
      expect(result[0].dno).toBe(10);
      expect(result[1].name).toBe('Valid2');
      expect(result[1].dno).toBe(30);
    });
  });

  describe('特殊なデッキ名', () => {
    it('日本語を含むデッキ名を抽出できる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">ブラック・マジシャン デッキ</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result[0].name).toBe('ブラック・マジシャン デッキ');
    });

    it('特殊文字を含むデッキ名を抽出できる', () => {
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">Deck@123 (v2.0)</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result[0].name).toBe('Deck@123 (v2.0)');
    });

    it('長いデッキ名を抽出できる', () => {
      const longName = 'A'.repeat(200);
      const html = `
        <div id="deck_list" class="list Choose">
          <div class="t_row">
            <div class="name flex_1"><div class="name">${longName}</div></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1&dno=10">
          </div>
        </div>
      `;
      doc.body.innerHTML = html;

      const result = parseDeckList(doc);
      expect(result[0].name).toBe(longName);
    });
  });
});
