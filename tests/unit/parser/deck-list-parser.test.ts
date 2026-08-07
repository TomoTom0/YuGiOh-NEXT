import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseDeckList } from '../../../src/content/parser/deck-list-parser';
import { JSDOM } from 'jsdom';

describe('deck-list-parser', () => {
  let doc: Document;

  beforeEach(() => {
    const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = window.document;
  });

  const setBody = (html: string) => {
    doc.body.innerHTML = html;
  };

  const validRow = ({
    name = 'Deck',
    dno = '10',
    deckTypeLabel,
    linkValue,
  }: {
    name?: string;
    dno?: string;
    deckTypeLabel?: string;
    linkValue?: string;
  } = {}) => `
    <div class="t_row">
      <div class="name flex_1">
        <span class="name">${name}</span>
      </div>
      ${deckTypeLabel === undefined ? '' : `<div class="lr_icon"><span>${deckTypeLabel}</span></div>`}
      <input class="link_value" type="hidden" value="${linkValue ?? `/yugiohdb/member_deck.action?ope=1&dno=${dno}`}" />
    </div>
  `;

  const deckList = (rows: string) => `
    <div id="deck_list" class="list Choose">
      ${rows}
    </div>
  `;

  describe('parseDeckList', () => {
    it('デッキ一覧コンテナがない場合はwarningを出して空配列を返す [covers:parse_list.container_missing]', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setBody('<div id="deck_list" class="list"></div>');

      const result = parseDeckList(doc);

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith('Deck list container not found');
      warnSpy.mockRestore();
    });

    it('コンテナ内にt_rowがない場合は空配列を返す [covers:parse_list.no_rows]', () => {
      setBody(deckList('<div class="not_row"></div>'));

      const result = parseDeckList(doc);

      expect(result).toEqual([]);
    });

    it('複数の有効行をDOM順に抽出する [covers:parse_list.multiple_valid_rows]', () => {
      setBody(
        deckList(`
          ${validRow({ name: 'デッキ1', dno: '1' })}
          ${validRow({ name: 'デッキ2', dno: '2' })}
          ${validRow({ name: 'デッキ3', dno: '3' })}
        `)
      );

      const result = parseDeckList(doc);

      expect(result).toEqual([
        { dno: 1, name: 'デッキ1', deckType: undefined },
        { dno: 2, name: 'デッキ2', deckType: undefined },
        { dno: 3, name: 'デッキ3', deckType: undefined },
      ]);
    });

    it('parseDeckListRowがnullを返す行だけを除外する [covers:parse_list.push_only_truthy_items]', () => {
      setBody(
        deckList(`
          ${validRow({ name: 'Valid A', dno: '1' })}
          <div class="t_row">
            <div class="name flex_1"><span class="name">Invalid</span></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?ope=1">
          </div>
          ${validRow({ name: 'Valid B', dno: '2' })}
        `)
      );

      const result = parseDeckList(doc);

      expect(result.map((item) => item.name)).toEqual(['Valid A', 'Valid B']);
      expect(result.map((item) => item.dno)).toEqual([1, 2]);
    });

    it('名前要素がない行はスキップされる [covers:parse_row.name_element_missing]', () => {
      setBody(
        deckList(`
          <div class="t_row">
            <span class="name">Deck</span>
            <input class="link_value" value="/yugiohdb/member_deck.action?dno=10">
          </div>
        `)
      );

      expect(parseDeckList(doc)).toEqual([]);
    });

    it('名前要素のtextContentが空文字列の行はスキップされる [covers:parse_row.name_text_missing]', () => {
      setBody(
        deckList(`
          <div class="t_row">
            <div class="name flex_1"><span class="name"></span></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?dno=10">
          </div>
        `)
      );

      expect(parseDeckList(doc)).toEqual([]);
    });

    it('名前はtrimされ、trim後が空でもtrim前textContentがtruthyなら行は返る [covers:parse_row.name_trimmed]', () => {
      setBody(
        deckList(`
          ${validRow({ name: '  テスト デッキ  ', dno: '10' })}
          ${validRow({ name: '   ', dno: '11' })}
        `)
      );

      const result = parseDeckList(doc);

      expect(result).toEqual([
        { dno: 10, name: 'テスト デッキ', deckType: undefined },
        { dno: 11, name: '', deckType: undefined },
      ]);
    });

    it('input.link_valueがない行はスキップされる [covers:parse_row.link_input_missing]', () => {
      setBody(
        deckList(`
          <div class="t_row">
            <div class="name flex_1"><span class="name">Deck</span></div>
          </div>
        `)
      );

      expect(parseDeckList(doc)).toEqual([]);
    });

    it('input.link_valueのvalueが空文字列の行はスキップされる [covers:parse_row.link_value_missing]', () => {
      setBody(
        deckList(`
          <div class="t_row">
            <div class="name flex_1"><span class="name">Deck</span></div>
            <input class="link_value" value="">
          </div>
        `)
      );

      expect(parseDeckList(doc)).toEqual([]);
    });

    it('link_valueにdnoの数字列がない行はスキップされる [covers:parse_row.dno_missing]', () => {
      setBody(
        deckList(`
          ${validRow({ name: 'No dno', linkValue: '/yugiohdb/member_deck.action?ope=1' })}
          ${validRow({ name: 'Non numeric', linkValue: '/yugiohdb/member_deck.action?dno=abc' })}
          ${validRow({ name: 'Valid', dno: '12' })}
        `)
      );

      const result = parseDeckList(doc);

      expect(result).toEqual([{ dno: 12, name: 'Valid', deckType: undefined }]);
    });

    it('dnoは最初にマッチした数字列を10進数として返す [covers:parse_row.dno_digits_parsed]', () => {
      setBody(
        deckList(`
          ${validRow({ name: 'Leading zero', linkValue: '/yugiohdb/member_deck.action?dno=0042' })}
          ${validRow({ name: 'Digits prefix', linkValue: '/yugiohdb/member_deck.action?dno=12abc' })}
        `)
      );

      const result = parseDeckList(doc);

      expect(result).toEqual([
        { dno: 42, name: 'Leading zero', deckType: undefined },
        { dno: 12, name: 'Digits prefix', deckType: undefined },
      ]);
    });

    it('既知のデッキタイプ表示名はvalue値に変換される [covers:parse_row.deck_type_known_label]', () => {
      setBody(deckList(validRow({ deckTypeLabel: ' OCG（マスタールール） ' })));

      const result = parseDeckList(doc);

      expect(result[0].deckType).toBe('0');
    });

    it('デッキタイプ要素がない、またはtextContentが空文字列ならundefinedになる [covers:parse_row.deck_type_absent_or_empty]', () => {
      setBody(
        deckList(`
          ${validRow({ name: 'Absent', dno: '1' })}
          <div class="t_row">
            <div class="name flex_1"><span class="name">Empty</span></div>
            <div class="lr_icon"><span></span></div>
            <input class="link_value" value="/yugiohdb/member_deck.action?dno=2">
          </div>
        `)
      );

      const result = parseDeckList(doc);

      expect(result.map((item) => item.deckType)).toEqual([undefined, undefined]);
    });

    it('未知のデッキタイプ表示名、またはtrim後が空文字列の表示名はundefinedになる [covers:parse_row.deck_type_unknown_label]', () => {
      setBody(
        deckList(`
          ${validRow({ name: 'Unknown', dno: '1', deckTypeLabel: '未定義タイプ' })}
          ${validRow({ name: 'Blank', dno: '2', deckTypeLabel: '   ' })}
        `)
      );

      const result = parseDeckList(doc);

      expect(result.map((item) => item.deckType)).toEqual([undefined, undefined]);
    });
  });
});
