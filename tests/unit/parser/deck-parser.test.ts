import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { parseDeckPage, parseCardRow } from '../../../src/content/parser/deck-parser';
import { getTempCacheDB, resetTempCacheDB } from '@/utils/temp-cache-db';

type CardRowOptions = {
  type?: 'monster' | 'spell' | 'trap' | 'unknown' | 'none';
  cid?: string;
  imgs?: string;
  quantity?: string;
  name?: string;
  omitCardId?: boolean;
  omitImgs?: boolean;
  omitQuantity?: boolean;
  omitName?: boolean;
};

const fieldNames = {
  monster: {
    cardId: 'monsterCardId',
    imgs: 'monster_imgs',
    quantity: 'monster_card_number',
    icon: 'attribute_icon_light.png',
  },
  spell: {
    cardId: 'spellCardId',
    imgs: 'spell_imgs',
    quantity: 'spell_card_number',
    icon: 'attribute_icon_spell.png',
  },
  trap: {
    cardId: 'trapCardId',
    imgs: 'trap_imgs',
    quantity: 'trap_card_number',
    icon: 'attribute_icon_trap.png',
  },
} as const;

function installDom(
  html = '<!DOCTYPE html><html lang="ja"><body></body></html>',
  url = 'https://example.test/?request_locale=ja',
): Document {
  const { window } = new JSDOM(html, { url });
  Object.defineProperty(global, 'window', { value: window, writable: true, configurable: true });
  Object.defineProperty(global, 'document', { value: window.document, writable: true, configurable: true });
  Object.defineProperty(global, 'chrome', { value: undefined, writable: true, configurable: true });
  return window.document;
}

function createCardRow(options: CardRowOptions = {}): HTMLElement {
  const type = options.type ?? 'monster';
  const effectiveType = type === 'unknown' || type === 'none' ? 'monster' : type;
  const fields = fieldNames[effectiveType];
  const cid = options.cid ?? '12345';
  const quantity = options.quantity ?? '2';
  const name = options.name ?? 'ブラック・マジシャン';
  const iconHtml =
    type === 'none'
      ? ''
      : `<div class="box_card_attribute"><img src="/yugiohdb/icon/${type === 'unknown' ? 'unknown.png' : fields.icon}"></div>`;
  const cardIdHtml = options.omitCardId
    ? ''
    : `<input type="hidden" name="${fields.cardId}" value="${cid}">`;
  const imgsHtml = options.omitImgs
    ? ''
    : `<input type="hidden" name="${fields.imgs}" value="${options.imgs ?? `${cid}_1_1_1`}">`;
  const nameHtml = options.omitName ? '' : `<span class="card_name">${name}</span>`;
  const quantityHtml = options.omitQuantity
    ? ''
    : `<input type="text" name="${fields.quantity}" value="${quantity}">`;

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="card-row">
      ${iconHtml}
      <div class="box_card_name">
        ${cardIdHtml}
        ${imgsHtml}
        ${nameHtml}
      </div>
      <div class="box_card_number">
        ${quantityHtml}
      </div>
    </div>
  `;
  return container.querySelector('.card-row') as HTMLElement;
}

describe('deck-parser', () => {
  beforeEach(() => {
    installDom();
    resetTempCacheDB();
  });

  describe('parseCardRow', () => {
    it('カードタイプを検出できない場合はnullを返す [covers:parse_card_row.card_type_missing]', () => {
      expect(parseCardRow(createCardRow({ type: 'none' }))).toBeNull();
      expect(parseCardRow(createCardRow({ type: 'unknown' }))).toBeNull();
    });

    it('カードIDが無い、または空文字の場合はnullを返す [covers:parse_card_row.card_id_missing]', () => {
      expect(parseCardRow(createCardRow({ omitCardId: true }))).toBeNull();
      expect(parseCardRow(createCardRow({ cid: '' }))).toBeNull();
    });

    it('カード名要素が無い場合はnullを返す [covers:parse_card_row.name_missing_or_text_null]', () => {
      expect(parseCardRow(createCardRow({ omitName: true }))).toBeNull();
    });

    it('カード名が空白のみでもtrim後の空文字をキャッシュする [covers:parse_card_row.name_trimmed_even_if_empty]', () => {
      const result = parseCardRow(createCardRow({ name: '   ', cid: '20001' }));

      expect(result).toMatchObject({ cid: '20001', ciid: '1', quantity: 2 });
      expect(getTempCacheDB().get('20001')?.name).toBe('');
    });

    it('画像情報が無い場合はciidとimgHashにデフォルト値を使う [covers:parse_card_row.imgs_absent_defaults]', () => {
      const result = parseCardRow(createCardRow({ cid: '20002', omitImgs: true }));
      const cached = getTempCacheDB().get('20002');

      expect(result?.ciid).toBe('1');
      expect(cached?.imgs).toEqual([{ ciid: '1', imgHash: '20002_1_1_1' }]);
    });

    it('画像情報が有効な場合は2番目のpartをciidにし、元valueをimgHashにする [covers:parse_card_row.imgs_valid_uses_second_part] [covers:parse_card_row.spell_cache_shape]', () => {
      const result = parseCardRow(createCardRow({
        type: 'spell',
        cid: '20003',
        imgs: '20003_2_1_1',
      }));
      const cached = getTempCacheDB().get('20003');

      expect(result).toMatchObject({ cid: '20003', ciid: '2', quantity: 2 });
      expect(cached?.cardType).toBe('spell');
      expect(cached?.imgs).toEqual([{ ciid: '2', imgHash: '20003_2_1_1' }]);
    });

    it('画像情報がtruthyでもciid partが空ならデフォルト値を維持する [covers:parse_card_row.imgs_malformed_keeps_defaults] [covers:parse_card_row.trap_cache_shape]', () => {
      const result = parseCardRow(createCardRow({
        type: 'trap',
        cid: '20004',
        imgs: '20004_',
      }));
      const cached = getTempCacheDB().get('20004');

      expect(result).toMatchObject({ cid: '20004', ciid: '1', quantity: 2 });
      expect(cached?.cardType).toBe('trap');
      expect(cached?.imgs).toEqual([{ ciid: '1', imgHash: '20004_1_1_1' }]);
    });

    it('枚数inputが無い、または空文字の場合はnullを返す [covers:parse_card_row.number_missing]', () => {
      expect(parseCardRow(createCardRow({ omitQuantity: true }))).toBeNull();
      expect(parseCardRow(createCardRow({ quantity: '' }))).toBeNull();
    });

    it('枚数がNaNになる場合はnullを返す [covers:parse_card_row.quantity_nan]', () => {
      expect(parseCardRow(createCardRow({ quantity: 'abc' }))).toBeNull();
    });

    it('枚数はNaN以外のrange checkをしない [covers:parse_card_row.quantity_parse_int_not_range_checked]', () => {
      expect(parseCardRow(createCardRow({ cid: '20005', quantity: '0' }))?.quantity).toBe(0);
      expect(parseCardRow(createCardRow({ cid: '20006', quantity: '3abc' }))?.quantity).toBe(3);
    });

    it('モンスターカードは仮値を含むCardInfoとしてキャッシュされる [covers:parse_card_row.monster_cache_shape]', () => {
      const result = parseCardRow(createCardRow({ cid: '20007' }));
      const cached = getTempCacheDB().get('20007');

      expect(result).toMatchObject({ cid: '20007', ciid: '1', lang: 'ja', quantity: 2 });
      expect(cached).toMatchObject({
        cardType: 'monster',
        attribute: 'light',
        levelType: 'level',
        levelValue: 0,
        race: 'dragon',
        types: [],
        isExtraDeck: false,
      });
    });

    it('返却値とキャッシュのlangはrowではなくグローバルdocumentから検出される [covers:parse_card_row.return_ref_and_global_language]', () => {
      installDom('<!DOCTYPE html><html lang="en"><body></body></html>', 'https://example.test/');
      resetTempCacheDB();

      const rowDocument = new JSDOM('<!DOCTYPE html><html lang="ja"><body></body></html>').window.document;
      const previousDocument = global.document;
      Object.defineProperty(global, 'document', { value: rowDocument, writable: true, configurable: true });
      const row = createCardRow({ cid: '20008' });
      Object.defineProperty(global, 'document', { value: previousDocument, writable: true, configurable: true });

      const result = parseCardRow(row);
      const cached = getTempCacheDB().get('20008');

      expect(result?.lang).toBe('en');
      expect(cached?.lang).toBe('en');
    });
  });

  describe('parseDeckPage', () => {
    it('基本フィールドをフォームから読む [covers:parse_deck_page.dno_present_parse_int] [covers:parse_deck_page.name_value_or_empty] [covers:parse_deck_page.is_public_checked_or_false] [covers:parse_deck_page.deck_type_value_or_undefined] [covers:parse_deck_page.comment_value_or_empty] [covers:parse_deck_page.unimplemented_metadata_empty]', () => {
      document.body.innerHTML = `
        <input name="dno" value="123">
        <input name="deck_name" value="テストデッキ">
        <input name="is_public" type="checkbox" checked>
        <select name="deck_type">
          <option value="1" selected>コンボ</option>
        </select>
        <textarea name="comment">テストコメント</textarea>
      `;

      const result = parseDeckPage(document);

      expect(result).toMatchObject({
        dno: 123,
        name: 'テストデッキ',
        isPublic: true,
        deckType: '1',
        comment: 'テストコメント',
        category: [],
        tags: [],
        deckCode: '',
      });
    });

    it('省略されたフィールドは実装上のデフォルト値になる [covers:parse_deck_page.dno_absent_or_empty_zero] [covers:parse_deck_page.name_value_or_empty] [covers:parse_deck_page.main_deck_absent_empty] [covers:parse_deck_page.extra_deck_absent_empty] [covers:parse_deck_page.side_deck_absent_empty] [covers:parse_deck_page.is_public_checked_or_false] [covers:parse_deck_page.deck_type_value_or_undefined] [covers:parse_deck_page.comment_value_or_empty]', () => {
      document.body.innerHTML = '';

      const result = parseDeckPage(document);

      expect(result.dno).toBe(0);
      expect(result.name).toBe('');
      expect(result.mainDeck).toEqual([]);
      expect(result.extraDeck).toEqual([]);
      expect(result.sideDeck).toEqual([]);
      expect(result.isPublic).toBe(false);
      expect(result.deckType).toBeUndefined();
      expect(result.comment).toBe('');
    });

    it('dnoがtruthyかつ非数値の場合はNaNがそのまま返る [covers:parse_deck_page.dno_non_numeric_nan]', () => {
      document.body.innerHTML = '<input name="dno" value="abc">';

      const result = parseDeckPage(document);

      expect(Number.isNaN(result.dno)).toBe(true);
    });

    it('各デッキ領域の.card-rowから有効なカードだけをpushする [covers:parse_deck_page.deck_sections_push_only_parsed_cards]', () => {
      const mainValid = createCardRow({ cid: '30001', quantity: '2' }).outerHTML;
      const extraValid = createCardRow({
        type: 'spell',
        cid: '30002',
        imgs: '30002_4_1_1',
        quantity: '1',
      }).outerHTML;
      const sideValid = createCardRow({
        type: 'trap',
        cid: '30003',
        quantity: '3',
      }).outerHTML;
      const invalid = createCardRow({ type: 'none' }).outerHTML;
      document.body.innerHTML = `
        <div id="main-deck">${mainValid}${invalid}</div>
        <div id="extra-deck">${invalid}${extraValid}</div>
        <div id="side-deck">${sideValid}${invalid}</div>
      `;

      const result = parseDeckPage(document);

      expect(result.mainDeck).toEqual([{ cid: '30001', ciid: '1', lang: 'ja', quantity: 2 }]);
      expect(result.extraDeck).toEqual([{ cid: '30002', ciid: '4', lang: 'ja', quantity: 1 }]);
      expect(result.sideDeck).toEqual([{ cid: '30003', ciid: '1', lang: 'ja', quantity: 3 }]);
    });
  });
});
