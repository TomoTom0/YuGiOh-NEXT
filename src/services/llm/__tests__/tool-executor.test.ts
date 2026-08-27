import { beforeEach, describe, it, expect, vi } from 'vitest';
import { searchCards } from '@/api/card-search';
import {
  clearSessionToolHistory,
  executeTool,
  getSessionToolHistory,
  recordToolCall,
} from '../tool-executor';
import type { StoreRefs } from '../tool-executor';
import type { DeckSections } from '../types';
import type { CardInfo } from '@/types/card';

vi.mock('@/api/card-search', () => ({
  searchCards: vi.fn(),
}));

function spell(id: string, name: string, overrides: Partial<CardInfo> = {}): CardInfo {
  return {
    cardType: 'spell',
    cardId: id,
    ciid: `${id}-ciid`,
    name,
    lang: 'ja',
    imgs: [],
    ...overrides,
  } as CardInfo;
}

function monster(id: string, name: string, overrides: Partial<CardInfo> = {}): CardInfo {
  return {
    cardType: 'monster',
    cardId: id,
    ciid: `${id}-ciid`,
    name,
    lang: 'ja',
    imgs: [],
    race: 'dragon',
    attribute: 'light',
    levelType: 'level',
    levelValue: 4,
    types: ['effect'],
    isExtraDeck: false,
    ...overrides,
  } as CardInfo;
}

function deck(overrides: Partial<DeckSections> = {}): DeckSections {
  return {
    main: [],
    extra: [],
    side: [],
    trash: [],
    searchResults: [],
    ...overrides,
  };
}

function createMockStoreRefs(overrides?: Partial<StoreRefs>): StoreRefs {
  return {
    getDeckSections: vi.fn(() => deck()),
    addCard: vi.fn(() => ({ success: true })),
    removeCard: vi.fn(() => ({ success: true })),
    moveCard: vi.fn(() => ({ success: true })),
    getDeckState: vi.fn(() => ({})),
    getCardInfoById: vi.fn(() => undefined),
    getCardsBySection: vi.fn(() => []),
    ...overrides,
  };
}

describe('tool history exports', () => {
  beforeEach(() => {
    clearSessionToolHistory();
  });

  it('履歴配列そのものを返し、clearは同一参照を空にする [covers:history.get_returns_live_array] [covers:history.clear_truncates]', () => {
    recordToolCall('first', { a: 1 }, { ok: true });
    const history = getSessionToolHistory();

    expect(history).toEqual([{ name: 'first', args: { a: 1 }, result: { ok: true } }]);

    clearSessionToolHistory();

    expect(history).toBe(getSessionToolHistory());
    expect(history).toHaveLength(0);
  });

  it('name/args/resultを履歴末尾に追加する [covers:history.record_pushes_entry]', () => {
    recordToolCall('tool', { a: 1 }, { ok: true });
    recordToolCall('next', {}, null);

    expect(getSessionToolHistory().at(-1)).toEqual({ name: 'next', args: {}, result: null });
  });
});

describe('executeTool - common and simple tools', () => {
  beforeEach(() => {
    clearSessionToolHistory();
    vi.clearAllMocks();
    vi.mocked(searchCards).mockResolvedValue([]);
  });

  it('未知のツール名はエラーを返す [covers:execute.unknown_tool_error]', async () => {
    await expect(executeTool({ name: 'unknownTool', arguments: {} }, createMockStoreRefs())).resolves.toEqual({
      success: false,
      error: '未知のツール: unknownTool',
    });
  });

  it('Error例外はmessageをerrorにして返す [covers:execute.catch_error_message]', async () => {
    const refs = createMockStoreRefs({
      getDeckState: vi.fn(() => {
        throw new Error('boom');
      }),
    });

    await expect(executeTool({ name: 'getDeckState', arguments: {} }, refs)).resolves.toEqual({
      success: false,
      error: 'boom',
    });
  });

  it('Error以外の例外はString(err)をerrorにして返す [covers:execute.catch_non_error_string]', async () => {
    const refs = createMockStoreRefs({
      getDeckState: vi.fn(() => {
        throw 'boom';
      }),
    });

    await expect(executeTool({ name: 'getDeckState', arguments: {} }, refs)).resolves.toEqual({
      success: false,
      error: 'boom',
    });
  });

  it('searchCardsはkeyword/searchTypeで検索し先頭10件だけを射影する [covers:execute.search_cards_keyword_searchtype_limit_shape]', async () => {
    const cards = Array.from({ length: 11 }, (_, index) => spell(String(index + 1), `Card ${index + 1}`));
    vi.mocked(searchCards).mockResolvedValue(cards);

    const result = await executeTool(
      { name: 'searchCards', arguments: { keyword: 'Blue', ignored: true } },
      createMockStoreRefs()
    );

    expect(searchCards).toHaveBeenCalledWith({ keyword: 'Blue', searchType: '1' });
    expect(result).toEqual({
      success: true,
      data: cards.slice(0, 10).map(c => ({ cardId: c.cardId, name: c.name, cardType: c.cardType })),
    });
  });

  it('getChatHistoryは履歴配列そのものをdataで返す [covers:execute.get_chat_history_returns_live_history]', async () => {
    recordToolCall('tool', {}, { ok: true });
    const result = await executeTool({ name: 'getChatHistory', arguments: {} }, createMockStoreRefs());

    expect(result).toEqual({ success: true, data: getSessionToolHistory() });
    expect(result.data).toBe(getSessionToolHistory());
  });

  it('getDeckStateはstoreの戻り値をdataで返す [covers:execute.get_deck_state_returns_store_state]', async () => {
    const state = { main: ['1'] };
    const refs = createMockStoreRefs({ getDeckState: vi.fn(() => state) });

    await expect(executeTool({ name: 'getDeckState', arguments: {} }, refs)).resolves.toEqual({
      success: true,
      data: state,
    });
  });
});

describe('executeTool - getCardDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchCards).mockResolvedValue([]);
  });

  it('cardIdがある場合はnameを解決せずcardIdで取得する [covers:execute.get_card_detail_card_id_skips_name_resolution]', async () => {
    const target = spell('1', 'Exact', { text: 'effect text' });
    const refs = createMockStoreRefs({
      getDeckSections: vi.fn(() => deck({ main: [spell('2', 'Other')] })),
      getCardInfoById: vi.fn(() => target),
    });

    const result = await executeTool(
      { name: 'getCardDetail', arguments: { cardId: '1', name: 'Other' } },
      refs
    );

    expect(refs.getDeckSections).not.toHaveBeenCalled();
    expect(refs.getCardInfoById).toHaveBeenCalledWith('1');
    expect(result).toEqual({
      success: true,
      data: { cardId: '1', name: 'Exact', cardType: 'spell', text: 'effect text' },
    });
  });

  it('name解決がnotFoundなら未検出エラーを返す [covers:execute.get_card_detail_name_not_found]', async () => {
    vi.mocked(searchCards).mockResolvedValue([]);

    await expect(
      executeTool({ name: 'getCardDetail', arguments: { name: 'missing' } }, createMockStoreRefs())
    ).resolves.toEqual({ success: false, error: 'カード「missing」が見つかりません' });
  });

  it('name解決がambiguousなら候補名を連結したエラーを返す [covers:execute.get_card_detail_name_ambiguous]', async () => {
    const refs = createMockStoreRefs({
      getDeckSections: vi.fn(() => deck({ main: [spell('1', 'Blue A'), spell('2', 'Blue B')] })),
    });

    await expect(
      executeTool({ name: 'getCardDetail', arguments: { name: 'Blue' } }, refs)
    ).resolves.toEqual({ success: false, error: 'カード「Blue」は複数該当します: Blue A, Blue B' });
  });

  it('cardId/nameがない場合は識別子要求エラーを返す [covers:execute.get_card_detail_missing_identifier]', async () => {
    await expect(
      executeTool({ name: 'getCardDetail', arguments: {} }, createMockStoreRefs())
    ).resolves.toEqual({ success: false, error: 'cardIdまたはnameを指定してください' });
  });

  it('解決したcardIdがstoreにない場合はカードID未検出エラーを返す [covers:execute.get_card_detail_missing_card]', async () => {
    await expect(
      executeTool({ name: 'getCardDetail', arguments: { cardId: '404' } }, createMockStoreRefs())
    ).resolves.toEqual({ success: false, error: 'カードID 404 が見つかりません' });
  });

  it('成功時はtextキー有無に応じてtext値またはundefinedを返す [covers:execute.get_card_detail_success_text_field]', async () => {
    const withText = spell('1', 'With Text', { text: 'effect' });
    const withoutText = spell('2', 'Without Text');
    const refs = createMockStoreRefs({
      getCardInfoById: vi.fn((id: string) => (id === '1' ? withText : withoutText)),
    });

    await expect(executeTool({ name: 'getCardDetail', arguments: { cardId: '1' } }, refs)).resolves.toEqual({
      success: true,
      data: { cardId: '1', name: 'With Text', cardType: 'spell', text: 'effect' },
    });
    await expect(executeTool({ name: 'getCardDetail', arguments: { cardId: '2' } }, refs)).resolves.toEqual({
      success: true,
      data: { cardId: '2', name: 'Without Text', cardType: 'spell', text: undefined },
    });
  });
});

describe('executeTool - addCardToDeck', () => {
  it('カードが見つからない場合はaddCardを呼ばずエラーを返す [covers:execute.add_card_missing_card]', async () => {
    const refs = createMockStoreRefs();

    await expect(
      executeTool({ name: 'addCardToDeck', arguments: { cardId: '404' } }, refs)
    ).resolves.toEqual({ success: false, error: 'カードID 404 が見つかりません' });
    expect(refs.addCard).not.toHaveBeenCalled();
  });

  it('section未指定時はmainでaddCardしsuccess/errorだけを返す [covers:execute.add_card_default_section_and_forwards_result]', async () => {
    const refs = createMockStoreRefs({
      getCardInfoById: vi.fn(() => spell('1', 'Card')),
      addCard: vi.fn(() => ({ success: false, error: 'full' })),
    });

    await expect(
      executeTool({ name: 'addCardToDeck', arguments: { cardId: '1', quantity: 3 } }, refs)
    ).resolves.toEqual({ success: false, error: 'full' });
    expect(refs.addCard).toHaveBeenCalledWith('1', 'main');
  });
});

describe('executeTool - removeCardFromDeck', () => {
  it('cardIdもcardIdsもない場合は完全一致のエラーを返す [covers:execute.remove_card_missing_ids]', async () => {
    const refs = createMockStoreRefs();

    await expect(
      executeTool({ name: 'removeCardFromDeck', arguments: { section: 'main' } }, refs)
    ).resolves.toEqual({ success: false, error: 'cardIdまたはcardIdsを指定してください' });
    expect(refs.moveCard).not.toHaveBeenCalled();
  });

  it('section/fromがない場合は完全一致のエラーを返す [covers:execute.remove_card_missing_from]', async () => {
    const refs = createMockStoreRefs();

    await expect(
      executeTool({ name: 'removeCardFromDeck', arguments: { cardId: '1' } }, refs)
    ).resolves.toEqual({ success: false, error: 'sectionまたはfromを指定してください' });
    expect(refs.moveCard).not.toHaveBeenCalled();
  });

  it('cardIdsをcardIdより優先しsectionをfrom別名として使う [covers:execute.remove_card_card_ids_preferred_and_from_alias] [covers:execute.remove_card_all_success]', async () => {
    const refs = createMockStoreRefs();

    const result = await executeTool(
      { name: 'removeCardFromDeck', arguments: { cardId: 'ignored', cardIds: ['111', '222'], section: 'extra' } },
      refs
    );

    expect(result).toEqual({ success: true, data: { removed: 2 } });
    expect(refs.moveCard).toHaveBeenCalledWith('111', 'extra', 'trash');
    expect(refs.moveCard).toHaveBeenCalledWith('222', 'extra', 'trash');
    expect(refs.moveCard).not.toHaveBeenCalledWith('ignored', expect.anything(), expect.anything());
    expect(refs.removeCard).not.toHaveBeenCalled();
  });

  it('to未指定ならtrash、指定時はその移動先を使う [covers:execute.remove_card_to_default_trash_or_override]', async () => {
    const refs = createMockStoreRefs();

    await executeTool({ name: 'removeCardFromDeck', arguments: { cardId: '1', from: 'main' } }, refs);
    await executeTool({ name: 'removeCardFromDeck', arguments: { cardId: '2', from: 'main', to: 'side' } }, refs);

    expect(refs.moveCard).toHaveBeenCalledWith('1', 'main', 'trash');
    expect(refs.moveCard).toHaveBeenCalledWith('2', 'main', 'side');
  });

  it('一部失敗ならsuccess=trueで失敗errorと成功件数を返す [covers:execute.remove_card_partial_failure]', async () => {
    const refs = createMockStoreRefs({
      moveCard: vi.fn((id: string) => id === '1' ? { success: true } : { success: false, error: 'fail' }),
    });

    await expect(
      executeTool({ name: 'removeCardFromDeck', arguments: { cardIds: ['1', '2'], from: 'main' } }, refs)
    ).resolves.toEqual({ success: true, error: '2: fail', data: { removed: 1 } });
  });

  it('全件失敗ならsuccess=falseでdataを返さない [covers:execute.remove_card_all_failure]', async () => {
    const refs = createMockStoreRefs({
      moveCard: vi.fn((id: string) => ({ success: false, error: `fail${id}` })),
    });

    await expect(
      executeTool({ name: 'removeCardFromDeck', arguments: { cardIds: ['1', '2'], from: 'main' } }, refs)
    ).resolves.toEqual({ success: false, error: '1: fail1; 2: fail2', data: undefined });
  });
});

describe('executeTool - moveCard', () => {
  it('cardIdもcardIdsもない場合は完全一致のエラーを返す [covers:execute.move_card_missing_ids]', async () => {
    const refs = createMockStoreRefs();

    await expect(
      executeTool({ name: 'moveCard', arguments: { from: 'main', to: 'side' } }, refs)
    ).resolves.toEqual({ success: false, error: 'cardIdまたはcardIdsを指定してください' });
    expect(refs.moveCard).not.toHaveBeenCalled();
  });

  it('from/sectionまたはtoがない場合は完全一致のエラーを返す [covers:execute.move_card_missing_endpoint]', async () => {
    const refs = createMockStoreRefs();

    await expect(
      executeTool({ name: 'moveCard', arguments: { cardId: '1', from: 'main' } }, refs)
    ).resolves.toEqual({ success: false, error: 'fromとtoを指定してください' });
    await expect(
      executeTool({ name: 'moveCard', arguments: { cardId: '1', to: 'side' } }, refs)
    ).resolves.toEqual({ success: false, error: 'fromとtoを指定してください' });
    expect(refs.moveCard).not.toHaveBeenCalled();
  });

  it('cardIdsをcardIdより優先しsectionをfrom別名として使う [covers:execute.move_card_card_ids_preferred_and_section_alias] [covers:execute.move_card_all_success]', async () => {
    const refs = createMockStoreRefs();

    const result = await executeTool(
      { name: 'moveCard', arguments: { cardId: 'ignored', cardIds: ['1', '2'], section: 'main', to: 'side' } },
      refs
    );

    expect(result).toEqual({ success: true, data: { moved: 2 } });
    expect(refs.moveCard).toHaveBeenCalledWith('1', 'main', 'side');
    expect(refs.moveCard).toHaveBeenCalledWith('2', 'main', 'side');
    expect(refs.moveCard).not.toHaveBeenCalledWith('ignored', expect.anything(), expect.anything());
  });

  it('一部失敗ならsuccess=trueで失敗errorと成功件数を返す [covers:execute.move_card_partial_failure]', async () => {
    const refs = createMockStoreRefs({
      moveCard: vi.fn((id: string) => id === '1' ? { success: true } : { success: false, error: 'fail' }),
    });

    await expect(
      executeTool({ name: 'moveCard', arguments: { cardIds: ['1', '2'], from: 'main', to: 'side' } }, refs)
    ).resolves.toEqual({ success: true, error: '2: fail', data: { moved: 1 } });
  });

  it('全件失敗ならsuccess=falseでdataを返さない [covers:execute.move_card_all_failure]', async () => {
    const refs = createMockStoreRefs({
      moveCard: vi.fn((id: string) => ({ success: false, error: `fail${id}` })),
    });

    await expect(
      executeTool({ name: 'moveCard', arguments: { cardIds: ['1', '2'], from: 'main', to: 'side' } }, refs)
    ).resolves.toEqual({ success: false, error: '1: fail1; 2: fail2', data: undefined });
  });
});

describe('executeTool - resolveCardName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchCards).mockResolvedValue([]);
  });

  it('名前解決結果を形に関わらずsuccess=trueで返す [covers:execute.resolve_card_name_returns_resolution_success]', async () => {
    await expect(
      executeTool({ name: 'resolveCardName', arguments: { name: 'missing' } }, createMockStoreRefs())
    ).resolves.toEqual({ success: true, data: { notFound: true } });
  });
});

describe('executeTool - searchDeckCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('section指定時は該当セクションだけを検索する [covers:execute.search_deck_sections_filter]', async () => {
    const refs = createMockStoreRefs({
      getDeckSections: vi.fn(() => deck({
        main: [spell('main', 'Shared')],
        extra: [spell('extra', 'Shared')],
        side: [spell('side', 'Shared')],
      })),
    });

    const result = await executeTool(
      { name: 'searchDeckCards', arguments: { keyword: 'Shared', kind: 'name', section: 'extra' } },
      refs
    );

    expect(result).toEqual({
      success: true,
      data: {
        cards: [{ name: 'Shared', cardId: 'extra', quantity: 1, race: undefined, attribute: undefined, section: 'エクストラデッキ', text: undefined }],
        totalCount: 1,
      },
    });
  });

  it('空白keywordは一致判定せず全カードを返す [covers:execute.search_deck_blank_keyword_matches_all]', async () => {
    const refs = createMockStoreRefs({
      getDeckSections: vi.fn(() => deck({ main: [spell('1', 'Alpha'), spell('2', 'Beta')] })),
    });

    const result = await executeTool({ name: 'searchDeckCards', arguments: { keyword: '   ', section: 'main' } }, refs);

    expect(result.data).toMatchObject({ totalCount: 2 });
    expect((result.data as { cards: Array<{ cardId: string }> }).cards.map(c => c.cardId)).toEqual(['1', '2']);
  });

  it('kind未指定のauto検索はtextまで検索する [covers:execute.search_deck_auto_expands_all_kinds]', async () => {
    const refs = createMockStoreRefs({
      getDeckSections: vi.fn(() => deck({ main: [spell('1', 'Alpha', { text: 'special keyword' })] })),
    });

    const result = await executeTool({ name: 'searchDeckCards', arguments: { keyword: 'keyword', section: 'main' } }, refs);

    expect(result.data).toMatchObject({ cards: [{ cardId: '1' }], totalCount: 1 });
  });

  it('明示raceで種族名解決に失敗すると空結果を即返す [covers:execute.search_deck_explicit_invalid_race_empty]', async () => {
    const refs = createMockStoreRefs({
      getDeckSections: vi.fn(() => deck({ main: [spell('1', '存在しない種族')] })),
    });

    await expect(
      executeTool({ name: 'searchDeckCards', arguments: { keyword: '存在しない種族', kind: 'race' } }, refs)
    ).resolves.toEqual({ success: true, data: { cards: [], totalCount: 0 } });
  });

  it('autoのrace解決失敗はraceだけを無効化しname一致は継続する [covers:execute.search_deck_auto_invalid_race_skips_race]', async () => {
    const refs = createMockStoreRefs({
      getDeckSections: vi.fn(() => deck({ main: [spell('1', '存在しない種族')] })),
    });

    const result = await executeTool(
      { name: 'searchDeckCards', arguments: { keyword: '存在しない種族', kind: 'auto' } },
      refs
    );

    expect(result.data).toMatchObject({ cards: [{ cardId: '1' }], totalCount: 1 });
  });

  it('明示attributeで属性名解決に失敗すると空結果を即返す [covers:execute.search_deck_explicit_invalid_attribute_empty]', async () => {
    await expect(
      executeTool(
        { name: 'searchDeckCards', arguments: { keyword: '存在しない属性', kind: 'attribute' } },
        createMockStoreRefs({ getDeckSections: vi.fn(() => deck({ main: [monster('1', 'Card')] })) })
      )
    ).resolves.toEqual({ success: true, data: { cards: [], totalCount: 0 } });
  });

  it('明示typeでタイプ名解決に失敗すると空結果を即返す [covers:execute.search_deck_explicit_invalid_type_empty]', async () => {
    await expect(
      executeTool(
        { name: 'searchDeckCards', arguments: { keyword: '存在しないタイプ', kind: 'type' } },
        createMockStoreRefs({ getDeckSections: vi.fn(() => deck({ main: [monster('1', 'Card')] })) })
      )
    ).resolves.toEqual({ success: true, data: { cards: [], totalCount: 0 } });
  });

  it('name部分一致でカードを返し、不一致カードは除外する [covers:execute.search_deck_match_name] [covers:execute.search_deck_no_keyword_match_skips]', async () => {
    const refs = createMockStoreRefs({
      getDeckSections: vi.fn(() => deck({ main: [spell('1', 'Blue Card'), spell('2', 'Red Card')] })),
    });

    const result = await executeTool(
      { name: 'searchDeckCards', arguments: { keyword: 'Blue', kind: 'name', section: 'main' } },
      refs
    );

    expect(result.data).toMatchObject({ cards: [{ cardId: '1' }], totalCount: 1 });
  });

  it('race/attribute/typeは表示名の完全一致または前方一致で内部IDへ変換して検索する [covers:execute.search_deck_match_race_attribute_type]', async () => {
    const refs = createMockStoreRefs({
      getDeckSections: vi.fn(() => deck({
        main: [
          monster('dragon', 'Dragon', { race: 'dragon', attribute: 'dark', types: ['normal'] }),
          monster('light', 'Light', { race: 'spellcaster', attribute: 'light', types: ['normal'] }),
          monster('effect', 'Effect', { race: 'spellcaster', attribute: 'dark', types: ['effect'] }),
        ],
      })),
    });

    await expect(executeTool({ name: 'searchDeckCards', arguments: { keyword: 'ドラゴン', kind: 'race', section: 'main' } }, refs))
      .resolves.toMatchObject({ data: { cards: [{ cardId: 'dragon' }], totalCount: 1 } });
    await expect(executeTool({ name: 'searchDeckCards', arguments: { keyword: '光', kind: 'attribute', section: 'main' } }, refs))
      .resolves.toMatchObject({ data: { cards: [{ cardId: 'light' }], totalCount: 1 } });
    await expect(executeTool({ name: 'searchDeckCards', arguments: { keyword: '効果', kind: 'type', section: 'main' } }, refs))
      .resolves.toMatchObject({ data: { cards: [{ cardId: 'effect' }], totalCount: 1 } });
  });

  it('text検索はtextまたはpendulumTextの部分一致で返す [covers:execute.search_deck_match_text_or_pendulum_text]', async () => {
    const refs = createMockStoreRefs({
      getDeckSections: vi.fn(() => deck({
        main: [
          spell('text', 'Text', { text: 'alpha key' }),
          monster('pendulum', 'Pendulum', { pendulumText: 'beta key' }),
        ],
      })),
    });

    const result = await executeTool(
      { name: 'searchDeckCards', arguments: { keyword: 'key', kind: 'text', section: 'main' } },
      refs
    );

    expect((result.data as { cards: Array<{ cardId: string }> }).cards.map(c => c.cardId)).toEqual(['text', 'pendulum']);
  });

  it('cardType指定と結果マッピングを適用する [covers:execute.search_deck_card_type_filter] [covers:execute.search_deck_result_mapping]', async () => {
    const refs = createMockStoreRefs({
      getDeckSections: vi.fn(() => deck({
        main: [
          monster('m', 'Shared', { race: 'dragon', attribute: 'light', text: 'monster text' }),
          spell('s', 'Shared', { text: 'spell text' }),
        ],
      })),
    });

    const spellOnly = await executeTool(
      { name: 'searchDeckCards', arguments: { keyword: 'Shared', kind: 'name', cardType: 'spell', section: 'main' } },
      refs
    );
    const all = await executeTool(
      { name: 'searchDeckCards', arguments: { keyword: 'Shared', kind: 'name', section: 'main' } },
      refs
    );

    expect(spellOnly).toEqual({
      success: true,
      data: {
        cards: [{ name: 'Shared', cardId: 's', quantity: 1, race: undefined, attribute: undefined, section: 'メインデッキ', text: 'spell text' }],
        totalCount: 1,
      },
    });
    expect(all.data).toMatchObject({
      cards: [
        { cardId: 'm', race: 'ドラゴン族', attribute: '光', text: 'monster text' },
        { cardId: 's', race: undefined, attribute: undefined, text: 'spell text' },
      ],
    });
  });

  it('同一セクション内の同一cardIdを集約しquantity合計をtotalCountにする [covers:execute.search_deck_dedup_count_and_total]', async () => {
    const refs = createMockStoreRefs({
      getDeckSections: vi.fn(() => deck({
        main: [spell('1', 'Shared'), spell('1', 'Shared'), spell('2', 'Shared')],
      })),
    });

    const result = await executeTool(
      { name: 'searchDeckCards', arguments: { keyword: 'Shared', kind: 'name', section: 'main' } },
      refs
    );

    expect(result.data).toMatchObject({
      cards: [
        { cardId: '1', quantity: 2 },
        { cardId: '2', quantity: 1 },
      ],
      totalCount: 3,
    });
  });
});
