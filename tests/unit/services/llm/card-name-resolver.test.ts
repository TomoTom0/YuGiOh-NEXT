import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchCards } from '@/api/card-search';
import { resolveCardName } from '@/services/llm/card-name-resolver';
import type { DeckSections } from '@/services/llm/types';
import type { CardInfo } from '@/types/card';

vi.mock('@/api/card-search', () => ({
  searchCards: vi.fn(),
}));

function card(id: string, name: string, ruby?: string): CardInfo {
  return {
    cardType: 'spell',
    cardId: id,
    ciid: `${id}-ciid`,
    name,
    ruby,
    lang: 'ja',
    imgs: [],
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

describe('services/llm/card-name-resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchCards).mockResolvedValue([]);
  });

  it('name/rubyを小文字化した部分一致で検索し、1件なら解決結果を返す [covers:match_cards.name_or_ruby_case_insensitive_substring] [covers:resolve.deck_stage_single_hit_returns_resolution] [covers:to_resolution.copies_identity_fields]', async () => {
    const target = card('1', 'Blue-Eyes White Dragon', 'ぶるーあいず');

    await expect(resolveCardName('white', deck({ main: [target] }))).resolves.toEqual({
      cardId: '1',
      ciid: '1-ciid',
      name: 'Blue-Eyes White Dragon',
      isAmbiguous: false,
    });

    await expect(resolveCardName('ぶるー', deck({ main: [target] }))).resolves.toEqual({
      cardId: '1',
      ciid: '1-ciid',
      name: 'Blue-Eyes White Dragon',
      isAmbiguous: false,
    });
    expect(searchCards).not.toHaveBeenCalled();
  });

  it('name/rubyのnullishは空文字列扱いで、存在する側だけで一致判定する [covers:match_cards.missing_name_or_ruby_empty_string]', async () => {
    const noRuby = card('1', 'Alpha');
    const noName = { ...card('2', 'ignored', 'Beta Ruby'), name: undefined } as unknown as CardInfo;

    await expect(resolveCardName('alp', deck({ main: [noRuby] }))).resolves.toMatchObject({
      cardId: '1',
      name: 'Alpha',
    });
    await expect(resolveCardName('beta', deck({ main: [noName] }))).resolves.toMatchObject({
      cardId: '2',
      name: undefined,
    });
  });

  it('空文字queryは全カードに一致し、複数件なら先頭5件だけの曖昧候補を返す [covers:match_cards.empty_query_matches_all_cards] [covers:resolve.deck_stage_multiple_hits_returns_ambiguous_first_five]', async () => {
    const cards = Array.from({ length: 6 }, (_, index) => card(String(index + 1), `Card ${index + 1}`));

    await expect(resolveCardName('', deck({ main: cards }))).resolves.toEqual({
      ambiguous: true,
      candidates: cards.slice(0, 5).map(c => ({ cardId: c.cardId, ciid: c.ciid, name: c.name })),
    });
    expect(searchCards).not.toHaveBeenCalled();
  });

  it('main+extraステージは後続ステージとAPIより優先される [covers:resolve.stage_order_main_extra_first]', async () => {
    const mainHit = card('main', 'Target Main');
    const sideHit = card('side', 'Target Side');

    await expect(resolveCardName('target', deck({ main: [mainHit], side: [sideHit] }))).resolves.toMatchObject({
      cardId: 'main',
    });
    expect(searchCards).not.toHaveBeenCalled();
  });

  it('main+extraが0件ならsideへ進み、sideはtrash/searchResults/APIより優先される [covers:resolve.deck_stage_zero_hits_continues] [covers:resolve.stage_order_side_before_trash_and_search_results]', async () => {
    const sideHit = card('side', 'Needle');
    const trashHit = card('trash', 'Needle');

    await expect(resolveCardName('needle', deck({ side: [sideHit], trash: [trashHit] }))).resolves.toMatchObject({
      cardId: 'side',
    });
    expect(searchCards).not.toHaveBeenCalled();
  });

  it('trashはsearchResults/APIより優先される [covers:resolve.stage_order_trash_before_search_results]', async () => {
    const trashHit = card('trash', 'Revive');
    const searchResultHit = card('search', 'Revive');

    await expect(resolveCardName('revive', deck({ trash: [trashHit], searchResults: [searchResultHit] }))).resolves.toMatchObject({
      cardId: 'trash',
    });
    expect(searchCards).not.toHaveBeenCalled();
  });

  it('searchResultsで1件一致した場合はAPIを呼ばない [covers:resolve.search_results_before_api]', async () => {
    const searchResultHit = card('search', 'Archive');

    await expect(resolveCardName('archive', deck({ searchResults: [searchResultHit] }))).resolves.toMatchObject({
      cardId: 'search',
    });
    expect(searchCards).not.toHaveBeenCalled();
  });

  it('全デッキステージが0件の場合だけAPIをkeyword/searchType付きで呼ぶ [covers:resolve.all_deck_stages_zero_calls_api] [covers:resolve.api_zero_hits_returns_not_found]', async () => {
    vi.mocked(searchCards).mockResolvedValue([]);

    await expect(resolveCardName('missing', deck())).resolves.toEqual({ notFound: true });
    expect(searchCards).toHaveBeenCalledWith({ keyword: 'missing', searchType: '1' });
  });

  it('API結果が1件の場合は解決結果を返す [covers:resolve.api_single_hit_returns_resolution]', async () => {
    vi.mocked(searchCards).mockResolvedValue([card('api', 'API Hit')]);

    await expect(resolveCardName('api hit', deck())).resolves.toEqual({
      cardId: 'api',
      ciid: 'api-ciid',
      name: 'API Hit',
      isAmbiguous: false,
    });
  });

  it('API結果が複数件の場合は先頭5件だけの曖昧候補を返す [covers:resolve.api_multiple_hits_returns_ambiguous_first_five]', async () => {
    const results = Array.from({ length: 6 }, (_, index) => card(`api-${index + 1}`, `API ${index + 1}`));
    vi.mocked(searchCards).mockResolvedValue(results);

    await expect(resolveCardName('api', deck())).resolves.toEqual({
      ambiguous: true,
      candidates: results.slice(0, 5).map(c => ({ cardId: c.cardId, ciid: c.ciid, name: c.name })),
    });
  });

  it('APIのrejectはそのまま伝播する [covers:resolve.api_rejection_propagates]', async () => {
    const error = new Error('network failed');
    vi.mocked(searchCards).mockRejectedValue(error);

    await expect(resolveCardName('api', deck())).rejects.toBe(error);
  });
});
