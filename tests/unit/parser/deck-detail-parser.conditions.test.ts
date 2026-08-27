import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardInfo } from '@/types/card';
import {
  convertCategoryLabelsToIds,
  convertTagLabelsToIds,
  extractCategory,
  extractCgidFromPage,
  extractCiidCounts,
  extractComment,
  extractDeckCode,
  extractDeckLikes,
  extractDeckNameFromMeta,
  extractDeckStyle,
  extractDeckType,
  extractDnoFromPage,
  extractFavoriteCount,
  extractIsPublicFromTitle,
  extractIssuedDeckCode,
  extractTags,
  parseCardSection,
  parseDeckDetail,
  validateDeckDetailPageStructure,
} from '@/content/parser/deck-detail-parser';
import {
  extractImageInfo,
  parseCardBase,
  parseSearchResultRow,
} from '@/api/card-search';
import { getDeckMetadata } from '@/utils/deck-metadata-loader';
import { getTempCacheDB } from '@/utils/temp-cache-db';
import { mappingManager } from '@/utils/mapping-manager';

vi.mock('@/api/card-search', () => ({
  extractImageInfo: vi.fn(() => new Map()),
  parseCardBase: vi.fn(),
  parseSearchResultRow: vi.fn(),
}));

vi.mock('@/utils/deck-metadata-loader', () => ({
  getDeckMetadata: vi.fn(),
}));

const setAsyncMock = vi.fn();
vi.mock('@/utils/temp-cache-db', () => ({
  getTempCacheDB: vi.fn(() => ({ setAsync: setAsyncMock })),
}));

vi.mock('@/utils/language-detector', () => ({
  detectLanguage: vi.fn(() => 'ja'),
}));

vi.mock('@/utils/mapping-manager', () => ({
  mappingManager: {
    ensureMappingForLanguage: vi.fn(),
  },
}));

function doc(html: string): Document {
  return new JSDOM(html).window.document;
}

function validShell(inner = ''): string {
  return `
    <!doctype html>
    <html>
      <head><meta name="description" content="元デッキ / 説明"></head>
      <body>
        <h1>公開デッキ</h1>
        <div id="main980"><div id="article_body"><div id="deck_detailtext">
          <div id="detailtext_main">${inner}</div>
        </div></div></div>
        <script>$('#dno').val('321'); const url = '?cgid=abc123&dno=999';</script>
      </body>
    </html>
  `;
}

function sectionRow(cid: string, options: { ciid?: string; quantity?: string; cardBack?: boolean } = {}): string {
  const ciid = options.ciid ?? '1';
  const quantity = options.quantity === undefined
    ? '<span>2</span>'
    : options.quantity === ''
      ? ''
      : `<span>${options.quantity}</span>`;
  const src = options.cardBack ? '/images/card_back.png' : '/images/card.png';
  return `
    <div class="t_row" data-cid="${cid}" data-ciid="${ciid}">
      <span class="card_name">カード${cid}</span>
      <input class="link_value" value="${cid}">
      <img class="card_image_monster_0_${ciid}" src="${src}">
      <span class="cards_num_set">${quantity}</span>
    </div>
  `;
}

function listWithRows(...rows: string[]): string {
  return `<div class="list"><div class="t_body mlist_m">${rows.join('')}</div></div>`;
}

function cardInfo(cid: string, ciid = '1'): CardInfo {
  return {
    cardType: 'spell',
    name: `カード${cid}`,
    cardId: cid,
    ciid,
    lang: 'ja',
    imgs: [{ ciid, imgHash: `${cid}_${ciid}_hash` }],
  } as CardInfo;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parseSearchResultRow).mockImplementation((row: HTMLElement) => {
    if (row.dataset.unparseable === 'true') return null;
    const cid = (row.querySelector('input.link_value') as HTMLInputElement | null)?.value ?? row.dataset.cid;
    if (!cid) return null;
    return cardInfo(cid, row.dataset.ciid ?? '1');
  });
  vi.mocked(parseCardBase).mockImplementation((row: HTMLElement) => {
    if (row.dataset.unparseable === 'true') return null;
    const cid = (row.querySelector('input.link_value') as HTMLInputElement | null)?.value ?? row.dataset.cid;
    if (!cid) return null;
    return {
      name: `カード${cid}`,
      cardId: cid,
      ciid: row.dataset.ciid ?? '1',
      lang: 'ja',
      imgs: [],
    };
  });
  vi.mocked(getDeckMetadata).mockResolvedValue({
    categories: [{ label: 'カテゴリA', value: 'cat-a' }],
    tags: { 'tag-a': 'タグA' },
  });
  vi.mocked(mappingManager.ensureMappingForLanguage).mockResolvedValue(undefined);
  vi.mocked(extractImageInfo).mockReturnValue(new Map());
  vi.mocked(getTempCacheDB).mockReturnValue({ setAsync: setAsyncMock } as any);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('deck-detail-parser design conditions', () => {
  describe('validateDeckDetailPageStructure', () => {
    it('必須コンテナの欠落を個別エラーにする [covers:validate.main980.missing] [covers:validate.article_body.missing] [covers:validate.deck_detailtext.missing] [covers:validate.detailtext_main.missing]', () => {
      expect(() => validateDeckDetailPageStructure(doc('<html><head></head><body></body></html>'))).toThrow('#main980');
      expect(() => validateDeckDetailPageStructure(doc('<html><head></head><body><div id="main980"></div></body></html>'))).toThrow('#article_body');
      expect(() => validateDeckDetailPageStructure(doc('<html><head></head><body><div id="main980"><div id="article_body"></div></div></body></html>'))).toThrow('#deck_detailtext');
      expect(() => validateDeckDetailPageStructure(doc('<html><head></head><body><div id="main980"><div id="article_body"><div id="deck_detailtext"></div></div></div></body></html>'))).toThrow('#detailtext_main');
    });

    it('カードセクションが無い場合と空行セクションはエラーにしない [covers:validate.sections.all_absent_is_not_error] [covers:validate.section.t_row_absent_is_not_error]', () => {
      expect(() => validateDeckDetailPageStructure(doc(validShell()))).not.toThrow();
      expect(() => validateDeckDetailPageStructure(doc(validShell('<div class="t_body mlist_m"></div>')))).not.toThrow();
    });

    it('最初の行にカード名またはlink_valueが無い場合はセクション名つきでthrowする [covers:validate.section.t_row_missing_card_name] [covers:validate.section.t_row_missing_link_value]', () => {
      expect(() => validateDeckDetailPageStructure(doc(validShell('<div class="t_body mlist_m"><div class="t_row"><input class="link_value"></div></div>')))).toThrow('モンスターカードセクションの.t_row内に.card_name');
      expect(() => validateDeckDetailPageStructure(doc(validShell('<div class="t_body mlist_s"><div class="t_row"><span class="card_name">魔法</span></div></div>')))).toThrow('魔法カードセクションの.t_row内にinput.link_value');
    });

    it('head/meta/body/h1/dnoの欠落をそれぞれthrowする [covers:validate.head.missing] [covers:validate.head_meta.missing] [covers:validate.body.missing] [covers:validate.h1.missing] [covers:validate.dno.missing]', () => {
      const noHead = doc(validShell());
      noHead.head.remove();
      expect(() => validateDeckDetailPageStructure(noHead)).toThrow('head要素');
      expect(() => validateDeckDetailPageStructure(doc(validShell().replace('<meta name="description" content="元デッキ / 説明">', '')))).toThrow('metaタグ');
      const noBody = doc(validShell());
      noBody.body.remove();
      noBody.documentElement.insertAdjacentHTML('beforeend', `
        <div id="main980"><div id="article_body"><div id="deck_detailtext"><div id="detailtext_main"></div></div></div></div>
        <h1>公開デッキ</h1>
        <script>$('#dno').val('321');</script>
      `);
      expect(() => validateDeckDetailPageStructure(noBody)).toThrow('body要素');
      expect(() => validateDeckDetailPageStructure(doc(validShell().replace('<h1>公開デッキ</h1>', '')))).toThrow('h1要素');
      expect(() => validateDeckDetailPageStructure(doc(validShell().replace("<script>$('#dno').val('321'); const url = '?cgid=abc123&dno=999';</script>", '')))).toThrow('デッキ番号情報');
    });
  });

  it('dno抽出はscript優先、URLフォールバック、未検出0を返す [covers:extract_dno.script_pattern] [covers:extract_dno.url_pattern_fallback] [covers:extract_dno.script_pattern_priority] [covers:extract_dno.not_found]', () => {
    expect(extractDnoFromPage(doc("<html><body><script>$('#dno').val('42')</script></body></html>"))).toBe(42);
    expect(extractDnoFromPage(doc("<html><body><a href='?dno=99'>x</a></body></html>"))).toBe(99);
    expect(extractDnoFromPage(doc("<html><body><script>$('#dno').val('7'); location='?dno=99'</script></body></html>"))).toBe(7);
    expect(extractDnoFromPage(doc('<html><body></body></html>'))).toBe(0);
  });

  it('metaからデッキ名を抽出し、空ならフォールバックまたはデフォルトを返す [covers:extract_name.description_meta] [covers:extract_name.description_meta_empty_falls_through] [covers:extract_name.og_description_fallback] [covers:extract_name.default]', () => {
    expect(extractDeckNameFromMeta(doc('<html><head><meta name="description" content="青眼 / 説明"></head></html>'))).toBe('青眼');
    expect(extractDeckNameFromMeta(doc('<html><head><meta name="description" content="/ 説明"><meta property="og:description" content="代替 | DB"></head></html>'))).toBe('代替');
    expect(extractDeckNameFromMeta(doc('<html><head><meta property="og:description" content="OG名 | DB"></head></html>'))).toBe('OG名');
    expect(extractDeckNameFromMeta(doc('<html><head></head></html>'))).toBe('デッキ');
  });

  it('h1から公開状態を判定する [covers:is_public.non_public_h1] [covers:is_public.public_h1] [covers:is_public.non_public_string_contains_public_substring] [covers:is_public.no_match_default] [covers:is_public.no_h1]', () => {
    expect(extractIsPublicFromTitle(doc('<html><body><h1>非公開デッキ</h1></body></html>'))).toBe(false);
    expect(extractIsPublicFromTitle(doc('<html><body><h1>公開デッキ</h1></body></html>'))).toBe(true);
    expect(extractIsPublicFromTitle(doc('<html><body><h1>非公開</h1></body></html>'))).toBe(false);
    expect(extractIsPublicFromTitle(doc('<html><body><h1>通常タイトル</h1></body></html>'))).toBe(false);
    expect(extractIsPublicFromTitle(doc('<html><body></body></html>'))).toBe(false);
  });

  it('cgidは小文字16進だけを抽出する [covers:extract_cgid.found] [covers:extract_cgid.uppercase_hex_not_matched] [covers:extract_cgid.mixed_case_truncated_at_uppercase] [covers:extract_cgid.not_found]', () => {
    expect(extractCgidFromPage(doc('<html><body>?cgid=abc123def</body></html>'))).toBe('abc123def');
    expect(extractCgidFromPage(doc('<html><body>?cgid=ABC123</body></html>'))).toBeUndefined();
    expect(extractCgidFromPage(doc('<html><body>?cgid=abcDEF123</body></html>'))).toBe('abc');
    expect(extractCgidFromPage(doc('<html><body>?id=abc</body></html>'))).toBeUndefined();
  });

  it('デッキタイプはdtの次のdd.text_setのspanラベルだけを変換する [covers:extract_deck_type.found] [covers:extract_deck_type.dd_wrong_class] [covers:extract_deck_type.dt_not_found] [covers:extract_deck_type.label_not_in_map]', () => {
    expect(extractDeckType(doc('<dl><dt><span>デッキタイプ</span></dt><dd class="text_set"><span>マスターデュエル</span></dd></dl>'))).toBe('3');
    expect(extractDeckType(doc('<dl><dt>デッキタイプ</dt><dd class="wrong"><span>マスターデュエル</span></dd></dl>'))).toBeUndefined();
    expect(extractDeckType(doc('<dl><dt>別項目</dt><dd class="text_set"><span>マスターデュエル</span></dd></dl>'))).toBeUndefined();
    expect(extractDeckType(doc('<dl><dt>デッキタイプ</dt><dd class="text_set"><span>未知</span></dd></dl>'))).toBeUndefined();
  });

  it('デッキスタイルはMD_deck_styleのtext_setを変換する [covers:extract_deck_style.found] [covers:extract_deck_style.dl_not_found]', () => {
    expect(extractDeckStyle(doc('<dl class="MD_deck_style"><dt>デッキスタイル</dt><dd class="text_set">トーナメント</dd></dl>'))).toBe('1');
    expect(extractDeckStyle(doc('<dl><dd class="text_set">トーナメント</dd></dl>'))).toBeUndefined();
  });

  it('カテゴリとタグは空spanを除外し、dd欠落時は空配列を返す [covers:extract_category.found] [covers:extract_category.empty_span_text_filtered] [covers:extract_category.dd_not_found] [covers:extract_tags.found] [covers:extract_tags.dd_not_found]', () => {
    expect(extractCategory(doc('<dd class="regist_category"><span>A</span><span> </span><span>B</span></dd>'))).toEqual(['A', 'B']);
    expect(extractCategory(doc('<html></html>'))).toEqual([]);
    expect(extractTags(doc('<dd class="regist_tag"><span>X</span><span>Y</span></dd>'))).toEqual(['X', 'Y']);
    expect(extractTags(doc('<html></html>'))).toEqual([]);
  });

  it('コメントはbiko spanをtrimし、空または未検出なら空文字を返す [covers:extract_comment.found] [covers:extract_comment.span_present_empty_text] [covers:extract_comment.dt_not_found]', () => {
    expect(extractComment(doc('<dt>コメント</dt><dd class="text_set"><span class="biko"> 本文 </span></dd>'))).toBe('本文');
    expect(extractComment(doc('<dt>コメント</dt><dd class="text_set"><span class="biko"> </span></dd>'))).toBe('');
    expect(extractComment(doc('<dt>別項目</dt><dd class="text_set"><span class="biko">本文</span></dd>'))).toBe('');
  });

  it('お気に入り数といいね数を抽出する [covers:extract_favorite.found] [covers:extract_favorite.non_numeric_text] [covers:extract_favorite.not_found] [covers:extract_likes.always_zero]', () => {
    expect(extractFavoriteCount(doc('<span id="favoriteCnt">12</span>'))).toBe(12);
    expect(extractFavoriteCount(doc('<span id="favoriteCnt">abc</span>'))).toBe(0);
    expect(extractFavoriteCount(doc('<html></html>'))).toBe(0);
    expect(extractDeckLikes(doc('<div>999</div>'))).toBe(0);
  });

  it('発行済みデッキコードは汎用パターン、jQueryフォールバック、script順で抽出する [covers:extract_issued_code.generic_pattern] [covers:extract_issued_code.jquery_pattern_fallback] [covers:extract_issued_code.per_script_priority] [covers:extract_issued_code.not_found]', () => {
    expect(extractIssuedDeckCode(doc('<script>navigator.clipboard.writeText("ABCDEFGHIJKLMNOPQRST")</script>'))).toBe('ABCDEFGHIJKLMNOPQRST');
    expect(extractIssuedDeckCode(doc("<script>$('#copy-code').click(function(){ navigator.clipboard.writeText('SHORT_CODE'); });</script>"))).toBe('SHORT_CODE');
    expect(extractIssuedDeckCode(doc("<script>$('#copy-code').click(function(){ navigator.clipboard.writeText('FIRST_SHORT'); });</script><script>navigator.clipboard.writeText('SECONDABCDEFGHIJKLMNOP')</script>"))).toBe('FIRST_SHORT');
    expect(extractIssuedDeckCode(doc('<script>console.log("none")</script>'))).toBe('');
  });

  it('表示用デッキコードは発行ボタン文言を未発行扱いにする [covers:extract_deck_code.found] [covers:extract_deck_code.not_issued_yet] [covers:extract_deck_code.dt_not_found]', () => {
    expect(extractDeckCode(doc('<dt>デッキコード</dt><dd class="a_set">ABCD-1234</dd>'))).toBe('ABCD-1234');
    expect(extractDeckCode(doc('<dt>デッキコード</dt><dd class="a_set">デッキコードを発行</dd>'))).toBe('');
    expect(extractDeckCode(doc('<dt>別項目</dt><dd class="a_set">ABCD</dd>'))).toBe('');
  });

  it('カテゴリ/タグラベルをメタデータでIDへ変換し、未対応ラベルは除外する [covers:convert_category_labels.metadata_missing] [covers:convert_category_labels.mapped] [covers:convert_category_labels.unmapped_filtered] [covers:convert_tag_labels.metadata_missing] [covers:convert_tag_labels.mapped] [covers:convert_tag_labels.unmapped_filtered]', () => {
    expect(convertCategoryLabelsToIds(['カテゴリA'], null)).toEqual([]);
    expect(convertCategoryLabelsToIds(['カテゴリA', '未知'], { categories: [{ label: 'カテゴリA', value: 'cat-a' }] })).toEqual(['cat-a']);
    expect(convertTagLabelsToIds(['タグA'], undefined)).toEqual([]);
    expect(convertTagLabelsToIds(['タグA', '未知'], { tags: { 'tag-a': 'タグA' } })).toEqual(['tag-a']);
  });

  it('ciid countは対象card_image種別をscriptのcid/ciid/encと照合し重複を数える [covers:extract_ciid_counts.card_types_scanned] [covers:extract_ciid_counts.basic_match] [covers:extract_ciid_counts.imghash_default_when_no_enc] [covers:extract_ciid_counts.duplicate_increments_count]', () => {
    const result = extractCiidCounts(doc(`
      <img class="card_image_monster_0_11">
      <img class="card_image_spell_1_22">
      <img class="card_image_trap_2_33">
      <img class="card_image_extra_3_44">
      <img class="card_image_side_4_55">
      <img class="card_image_monster_0_11">
      <script>
        $('.card_image_monster_0_11').attr('src', 'x?cid=100&ciid=11&enc=hash11');
        $('.card_image_spell_1_22').attr('src', 'x?cid=200&ciid=22');
        $('.card_image_trap_2_33').attr('src', 'x?cid=300&ciid=33&enc=hash33');
        $('.card_image_extra_3_44').attr('src', 'x?cid=400&ciid=44&enc=hash44');
        $('.card_image_side_4_55').attr('src', 'x?cid=500&ciid=55&enc=hash55');
      </script>
    `));

    expect(result.get('100')?.get('11')).toEqual({ count: 2, imgHash: 'hash11' });
    expect(result.get('200')?.get('22')).toEqual({ count: 1, imgHash: '200_1_1_1' });
    expect(result.get('300')?.get('33')?.count).toBe(1);
    expect(result.get('400')?.get('44')?.count).toBe(1);
    expect(result.has('500')).toBe(false);
  });

  it('parseCardSectionはコンテナ/親欠落時に空結果を返す [covers:parse_card_section.container_missing] [covers:parse_card_section.section_parent_missing]', () => {
    expect(parseCardSection(doc('<html></html>'), new Map(), new Map(), 'main')).toMatchObject({
      cards: [],
      skippedCount: 0,
      skippedCards: [],
    });
    expect(parseCardSection(doc(validShell()), new Map(), new Map(), 'extra')).toMatchObject({
      cards: [],
      skippedCount: 0,
      skippedCards: [],
    });
  });

  it('parseCardSectionは未発売カードと通常パース失敗を分けて扱う [covers:parse_card_section.unreleased_card_back_parseable] [covers:parse_card_section.unreleased_card_back_unparseable] [covers:parse_card_section.parse_failure_silently_dropped]', () => {
    const testDoc = doc(validShell(listWithRows(
      sectionRow('101', { cardBack: true }),
      '<div class="t_row" data-unparseable="true"><img src="/images/card_back.png"></div>',
      '<div class="t_row" data-unparseable="true"><input class="link_value" value="999"></div>',
    )));

    const result = parseCardSection(testDoc, new Map(), new Map(), 'main');

    expect(result.cards).toEqual([]);
    expect(result.skippedCount).toBe(2);
    expect(result.skippedCards).toEqual([{ cid: '101', name: 'カード101', lang: 'ja' }]);
  });

  it('parseCardSectionはciid情報が無い場合span数量またはデフォルト数量を使い、非数値はNaNのまま返す [covers:parse_card_section.no_ciid_counts_quantity_from_span] [covers:parse_card_section.no_ciid_counts_default_quantity] [covers:parse_card_section.no_ciid_counts_quantity_nan_when_non_numeric]', () => {
    const result = parseCardSection(doc(validShell(listWithRows(
      sectionRow('101', { quantity: '3' }),
      sectionRow('102', { quantity: '' }),
      sectionRow('103', { quantity: 'abc' }),
    ))), new Map(), new Map(), 'main');

    expect(result.cards[0]).toMatchObject({ cid: '101', quantity: 3 });
    expect(result.cards[1]).toMatchObject({ cid: '102', quantity: 1 });
    expect(Number.isNaN(result.cards[2]?.quantity)).toBe(true);
  });

  it('parseCardSectionはciid countがある場合ciid別DeckCardRefとマージ用CardInfoを返す [covers:parse_card_section.with_ciid_counts_multiple_refs]', () => {
    const ciidCounts = new Map([
      ['101', new Map([
        ['11', { count: 2, imgHash: 'hash11' }],
        ['12', { count: 1, imgHash: 'hash12' }],
      ])],
    ]);

    const result = parseCardSection(doc(validShell(listWithRows(sectionRow('101')))), new Map(), ciidCounts, 'main');

    expect(result.cards).toEqual([
      { cid: '101', ciid: '11', lang: 'ja', quantity: 2 },
      { cid: '101', ciid: '12', lang: 'ja', quantity: 1 },
    ]);
    expect(result.cardInfoMap.get('101')?.imgs).toEqual([
      { ciid: '11', imgHash: 'hash11' },
      { ciid: '12', imgHash: 'hash12' },
    ]);
  });

  it('parseDeckDetailはasyncで検証を委譲し、18フィールド形状と空name/originalNameを返す [covers:parse_deck_detail.is_async] [covers:parse_deck_detail.delegates_validation] [covers:parse_deck_detail.name_field_always_empty_string] [covers:parse_deck_detail.return_shape]', async () => {
    expect(parseDeckDetail(doc(validShell()))).toBeInstanceOf(Promise);
    await expect(parseDeckDetail(doc('<html></html>'))).rejects.toThrow('#main980');

    const result = await parseDeckDetail(doc(validShell()));

    expect(Object.keys(result).sort()).toEqual([
      'category',
      'cgid',
      'comment',
      'deckCode',
      'deckStyle',
      'deckType',
      'dno',
      'extraDeck',
      'favoriteCount',
      'issuedDeckCode',
      'isPublic',
      'mainDeck',
      'name',
      'originalName',
      'sideDeck',
      'skippedCards',
      'skippedCardsCount',
      'tags',
    ].sort());
    expect(result.name).toBe('');
    expect(result.originalName).toBe('元デッキ');
  });

  it('parseDeckDetailは3セクションのCardInfoをcid単位でマージしてTempCacheDB.setAsyncに保存する [covers:parse_deck_detail.persists_merged_card_info_to_temp_cache]', async () => {
    const html = `
      <!doctype html>
      <html>
        <head><meta name="description" content="元デッキ / 説明"></head>
        <body>
          <h1>公開デッキ</h1>
          <div id="main980"><div id="article_body"><div id="deck_detailtext">
            <div id="detailtext_main">${listWithRows(sectionRow('101'))}</div>
            <div id="detailtext_ext">${listWithRows(sectionRow('101', { ciid: '2' }))}</div>
            <div id="detailtext_side">${listWithRows(sectionRow('202'))}</div>
          </div></div></div>
          <script>$('#dno').val('321');</script>
        </body>
      </html>
    `;

    await parseDeckDetail(doc(html));

    expect(setAsyncMock).toHaveBeenCalledTimes(2);
    expect(setAsyncMock).toHaveBeenCalledWith('101', expect.objectContaining({ cardId: '101' }), true);
    expect(setAsyncMock).toHaveBeenCalledWith('202', expect.objectContaining({ cardId: '202' }), true);
  });
});
