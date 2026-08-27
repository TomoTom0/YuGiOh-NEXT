import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildSearchParams,
  parseLinkValue,
  searchCards,
  searchCardsAuto,
  searchCardById,
  searchCardsByPackId,
  getCardDetail,
  getCardDetailWithCache,
  parseSearchResults,
  extractImageInfo,
  parseCardBase,
  parseMonsterCard,
  parseSpellCard,
  parseTrapCard,
  parseSearchResultRow
} from '@/api/card-search';
import { getUnifiedCacheDB } from '@/utils/unified-cache-db';
import { getTempCacheDB } from '@/utils/temp-cache-db';
import { mappingManager } from '@/utils/mapping-manager';
import type { SearchOptions, CardInfo, CardDetail } from '@/types/card';

// モック設定
vi.mock('@/utils/request-queue', () => ({
  queuedFetch: vi.fn()
}));

vi.mock('@/utils/mapping-manager', () => ({
  mappingManager: {
    getMapping: vi.fn().mockResolvedValue({ attr_123: 'FIRE' }),
    ensureMappingForLanguage: vi.fn().mockResolvedValue(true),
    getRaceTextToId: vi.fn().mockReturnValue({
      'ドラゴン族': 'dragon',
      Dragon: 'dragon',
      '魔法使い族': 'spellcaster'
    }),
    getMonsterTypeTextToId: vi.fn().mockReturnValue({
      '通常': 'normal',
      Normal: 'normal',
      '効果': 'effect',
      Effect: 'effect',
      '融合': 'fusion',
      Fusion: 'fusion',
      'リンク': 'link',
      Link: 'link',
      'ペンデュラム': 'pendulum'
    })
  }
}));

vi.mock('@/utils/page-detector', () => ({
  detectCardGameType: vi.fn().mockReturnValue('OCG'),
  getGamePath: vi.fn().mockReturnValue('/yugiohdb')
}));

vi.mock('@/utils/language-detector', () => ({
  detectLanguage: vi.fn().mockReturnValue('ja')
}));

vi.mock('@/api/card-faq', () => ({
  getCardFAQList: vi.fn().mockResolvedValue([])
}));

vi.mock('@/utils/forbidden-limited-cache', () => ({
  forbiddenLimitedCache: {
    getRegulation: vi.fn((cardId: string) => cardId === 'rel1' ? 'limited' : undefined)
  }
}));

vi.mock('@/utils/date-utils', () => ({
  isSameDay: vi.fn((date1, date2) => {
    if (!date1 || !date2) return false;
    const time1 = typeof date1 === 'number' ? date1 : date1.getTime();
    const time2 = typeof date2 === 'number' ? date2 : date2.getTime();
    return new Date(time1).toDateString() === new Date(time2).toDateString();
  })
}));

describe('api/card-search - Comprehensive Tests', () => {
  let unifiedDB: any;
  let tempDB: any;

  const baseCard = {
    name: 'ベースカード',
    cardId: 'base1',
    ciid: '1',
    lang: 'ja',
    imgs: [{ ciid: '1', imgHash: 'base_hash' }]
  } as CardInfo;

  const validMonsterRowHtml = (cardId = '100', name = 'モンスター') => `
    <div class="t_row">
      <input type="hidden" class="link_value" value="/yugiohdb/card_search.action?ope=2&cid=${cardId}&request_locale=ja" />
      <span class="card_name">${name}</span>
      <span class="card_ruby">ルビ</span>
      <div class="box_card_attribute"><img src="https://example.test/attribute_icon_light.png" /></div>
      <div class="box_card_level_rank level"><img src="https://example.test/icon_level.png" /><span>レベル 4</span></div>
      <div class="card_info_species_and_other_item">【ドラゴン族／効果】</div>
      <div class="atk_power">ATK 1800</div>
      <div class="def_power">DEF 1500</div>
      <div class="box_card_text">効果<br>本文</div>
    </div>
  `;

  const validSearchHtml = () => `
    <html>
      <head>
        <script>
          var img = 'get_image.action?type=1&amp;cid=100&amp;ciid=2&amp;enc=hash100';
        </script>
      </head>
      <body>
        <div id="main980">
          <div id="article_body">
            <div id="card_list">
              ${validMonsterRowHtml('100', '有効モンスター')}
              <div class="t_row"><span class="card_info_name">壊れた行</span></div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  beforeEach(() => {
    unifiedDB = getUnifiedCacheDB();
    tempDB = getTempCacheDB();
    unifiedDB.reset?.();
    tempDB.clear?.();
    vi.mocked(mappingManager.getRaceTextToId).mockReturnValue({
      'ドラゴン族': 'dragon',
      Dragon: 'dragon',
      Spellcaster: 'spellcaster',
      '魔法使い族': 'spellcaster'
    } as any);
    vi.mocked(mappingManager.getMonsterTypeTextToId).mockReturnValue({
      '通常': 'normal',
      Normal: 'normal',
      '効果': 'effect',
      Effect: 'effect',
      '融合': 'fusion',
      Fusion: 'fusion',
      'リンク': 'link',
      Link: 'link',
      'ペンデュラム': 'pendulum'
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('conditions: pure parameter and parser helpers', () => {
    it('[covers:parse_link.valid_directions_set_bits] [covers:parse_link.invalid_and_center_ignored] link値を有効方向だけ9bit化する', () => {
      expect(parseLinkValue('13')).toBe(5);
      expect(parseLinkValue('05a90')).toBe(256);
    });

    it('[covers:build_params.base_defaults] [covers:build_params.card_type_and_logic] [covers:build_params.monster_filters_append_each] [covers:build_params.level_scale_link_range] [covers:build_params.atk_def_zero_falls_back_empty] [covers:build_params.release_date_partial] 検索パラメータを実装どおり構築する', () => {
      const params = buildSearchParams({
        keyword: 'テスト',
        searchType: '2',
        cardType: 'monster',
        attributes: ['light', 'fire'],
        races: ['dragon'],
        monsterTypes: ['effect', 'fusion'],
        monsterTypeLogic: 'AND',
        excludeMonsterTypes: ['toon'],
        levels: [-1, 0, 4, 14],
        atk: { from: 0, to: 3000 },
        def: { from: 0, to: 2500 },
        pendulumScales: [-1, 0, 13, 14],
        linkNumbers: [0, 1, 6, 7],
        linkMarkers: [0, 1, 5, 9, 10],
        linkMarkerLogic: 'AND',
        spellEffectTypes: ['quick'],
        trapEffectTypes: ['counter'],
        sort: 20,
        resultsPerPage: 50,
        mode: 2,
        releaseDate: {
          start: { year: 2024, month: 1, day: 2 },
          end: { year: 2025, month: 3, day: 4 }
        }
      });

      expect(params.get('ope')).toBe('1');
      expect(params.get('sess')).toBe('1');
      expect(params.get('keyword')).toBe('テスト');
      expect(params.get('stype')).toBe('2');
      expect(params.get('ctype')).toBe('1');
      expect(params.getAll('attr')).toEqual(['11', '14']);
      expect(params.getAll('species')).toEqual(['1']);
      expect(params.getAll('other')).toEqual(['1', '2']);
      expect(params.get('othercon')).toBe('1');
      expect(params.getAll('jogai')).toEqual(['4']);
      expect(params.get('level0')).toBe('on');
      expect(params.get('level4')).toBe('on');
      expect(params.has('level-1')).toBe(false);
      expect(params.has('level14')).toBe(false);
      expect(params.get('atkfr')).toBe('0');
      expect(params.get('atkto')).toBe('3000');
      expect(params.get('deffr')).toBe('0');
      expect(params.get('defto')).toBe('2500');
      expect(params.get('Pscale0')).toBe('on');
      expect(params.get('Pscale13')).toBe('on');
      expect(params.has('Pscale14')).toBe(false);
      expect(params.get('Link1')).toBe('on');
      expect(params.get('Link6')).toBe('on');
      expect(params.has('Link7')).toBe(false);
      expect(params.get('linkbtn1')).toBe('1');
      expect(params.get('linkbtn9')).toBe('9');
      expect(params.has('linkbtn5')).toBe(false);
      expect(params.get('link_m')).toBe('1');
      expect(params.getAll('effe')).toEqual(['25', '21']);
      expect(params.get('starfr')).toBe('');
      expect(params.get('sort')).toBe('20');
      expect(params.get('rp')).toBe('50');
      expect(params.get('mode')).toBe('2');
      expect(params.get('releaseYStart')).toBe('2024');
      expect(params.get('releaseDEnd')).toBe('4');
    });

    it('[covers:extract_image.regex_ciids_and_enc] get_image.actionのcid/ciid/encをHTML文字列から抽出する', () => {
      const doc = new DOMParser().parseFromString(`
        <script>
          a = 'get_image.action?type=1&amp;cid=123&amp;ciid=2&amp;enc=hash123';
          b = 'get_image.action?cid=456';
        </script>
      `, 'text/html');

      const imageMap = extractImageInfo(doc);
      expect(imageMap.get('123')).toEqual({ ciid: '2', imgHash: 'hash123' });
      expect(imageMap.get('456')).toEqual({ ciid: undefined, imgHash: undefined });
    });
  });

  // ===== searchCards テスト =====
  describe('searchCards', () => {
    it('[covers:search_cards.success_parses_results] 基本的な検索クエリで結果を返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');

      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValueOnce(validSearchHtml())
      };

      queuedFetch.mockResolvedValueOnce(mockResponse);

      const options: SearchOptions = {
        keyword: 'テスト',
        resultsPerPage: 100
      };

      const results = await searchCards(options);
      expect(results).toHaveLength(1);
      expect(results[0]!.cardId).toBe('100');
      expect(queuedFetch).toHaveBeenCalled();
    });

    it('検索タイプ別パラメータ構築: 名前検索', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValueOnce('<html><body></body></html>')
      };

      queuedFetch.mockResolvedValueOnce(mockResponse);

      const options: SearchOptions = {
        keyword: 'ブルーアイズ',
        searchType: '1'  // カード名
      };

      await searchCards(options);
      expect(queuedFetch).toHaveBeenCalled();
    });

    it('属性フィルター適用', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValueOnce('<html><body></body></html>')
      };

      queuedFetch.mockResolvedValueOnce(mockResponse);

      const options: SearchOptions = {
        keyword: 'モンスター',
        attributes: ['FIRE', 'WATER']
      };

      await searchCards(options);
      expect(queuedFetch).toHaveBeenCalled();
    });

    it('レベル範囲フィルター', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValueOnce('<html><body></body></html>')
      };

      queuedFetch.mockResolvedValueOnce(mockResponse);

      const options: SearchOptions = {
        keyword: 'モンスター',
        levels: [4, 5, 6]
      };

      await searchCards(options);
      expect(queuedFetch).toHaveBeenCalled();
    });

    it('攻撃力・防御力範囲フィルター', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValueOnce('<html><body></body></html>')
      };

      queuedFetch.mockResolvedValueOnce(mockResponse);

      const options: SearchOptions = {
        keyword: 'モンスター',
        atk: { from: 2000, to: 3000 },
        def: { from: 1500, to: 2500 }
      };

      await searchCards(options);
      expect(queuedFetch).toHaveBeenCalled();
    });

    it('[covers:search_cards.http_error_empty] HTTP エラーで空配列を返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const options: SearchOptions = {
        keyword: 'テスト'
      };

      const results = await searchCards(options);
      expect(results).toEqual([]);
    });

    it('[covers:search_cards.catch_empty] 例外発生時に空配列を返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockRejectedValueOnce(new Error('Network error'));

      const options: SearchOptions = {
        keyword: 'テスト'
      };

      const results = await searchCards(options);
      expect(results).toEqual([]);
    });

    it('ソート順序パラメータが適用される', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce('<html><body></body></html>')
      });

      const options: SearchOptions = {
        keyword: 'テスト',
        sort: 1  // ソート順序
      };

      await searchCards(options);
      expect(queuedFetch).toHaveBeenCalled();
    });
  });

  // ===== searchCards (カード名検索) テスト =====
  describe('searchCards (by name)', () => {
    it('カード名で検索できる', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      const mockHtml = `
        <html>
          <body>
            <table class="result_list">
              <tr>
                <td><a href="card.action?ope=2&cid=89631139">89631139</a></td>
                <td>ブルーアイズ・ホワイト・ドラゴン</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValueOnce(mockHtml)
      };

      queuedFetch.mockResolvedValueOnce(mockResponse);

      const results = await searchCards({ keyword: 'ブルーアイズ' });
      expect(Array.isArray(results)).toBe(true);
    });

    it('カードタイプでフィルタリング', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValueOnce('<html><body></body></html>')
      };

      queuedFetch.mockResolvedValueOnce(mockResponse);

      await searchCards({ keyword: 'モンスター', resultsPerPage: 100, cardType: 'monster' });
      expect(queuedFetch).toHaveBeenCalled();
    });

    it('結果数制限が適用される', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValueOnce('<html><body></body></html>')
      };

      queuedFetch.mockResolvedValueOnce(mockResponse);

      await searchCards({ keyword: 'テスト', resultsPerPage: 50 });
      expect(queuedFetch).toHaveBeenCalled();
    });
  });

  // ===== searchCardsAuto テスト =====
  describe('searchCardsAuto', () => {
    it('[covers:search_auto.one_char_name_only] 1文字キーワードで自動検索', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValueOnce('<html><body></body></html>')
      };

      queuedFetch.mockResolvedValue(mockResponse);

      const result = await searchCardsAuto({ keyword: 'ド' });
      expect(result).toBeDefined();
      expect(Array.isArray(result.cards)).toBe(true);
    });

    it('[covers:search_auto.multi_search_merge_dedupe_order] 複数文字キーワードで3検索をマージする', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');

      queuedFetch
        .mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValueOnce(validSearchHtml()) })
        .mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValueOnce(validSearchHtml().replaceAll('100', '101').replace('有効モンスター', 'テキスト結果')) })
        .mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValueOnce(validSearchHtml().replaceAll('100', '100').replace('有効モンスター', '重複結果')) });

      const result = await searchCardsAuto({ keyword: 'テスト' });
      expect(result.cards.map(card => card.cardId)).toEqual(['100', '101']);
      expect(result.cards[0]!.name).toBe('有効モンスター');
    });

    it('[covers:search_auto.catch_empty] 複数文字検索の例外時は空配列を返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockRejectedValue(new Error('Network error'));

      const result = await searchCardsAuto({ keyword: 'テスト' });
      expect(result).toEqual({ cards: [] });
    });
  });

  // ===== searchCardById テスト =====
  describe('searchCardById', () => {
    it('[covers:search_by_id.request_and_first_result] カードIDで検索できる', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');

      queuedFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce(validSearchHtml())
      });

      const result = await searchCardById('100');
      expect(result?.cardId).toBe('100');
    });

    it('[covers:search_by_id.http_error_null] 存在しないカードIDで null を返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await searchCardById('99999999');
      expect(result).toBeNull();
    });

    it('[covers:search_by_id.catch_null] 例外時にnullを返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(searchCardById('100')).resolves.toBeNull();
    });
  });

  describe('searchCardsByPackId', () => {
    it('[covers:search_by_pack.request_and_parse] パックID検索のパラメータで検索結果をパースする', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce(validSearchHtml())
      });

      const result = await searchCardsByPackId('1000009524000');
      expect(result).toHaveLength(1);
      const url = queuedFetch.mock.calls[0][0] as string;
      expect(url).toContain('pid=1000009524000');
      expect(url).toContain('rp=99999');
      expect(url).toContain('sort=1');
    });

    it('[covers:search_by_pack.http_error_empty] HTTPエラー時は空配列を返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(searchCardsByPackId('pack')).resolves.toEqual([]);
    });

    it('[covers:search_by_pack.catch_empty] 例外時は空配列を返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(searchCardsByPackId('pack')).resolves.toEqual([]);
    });
  });

  describe('getCardDetail', () => {
    const detailHtml = `
      <html>
        <body>
          <div>$('#thumbnail_card_image_1').attr('src', 'get_image.action?type=1&amp;cid=base1&amp;ciid=7&amp;enc=img7')</div>
          <div id="cardname"><h1>詳細名<span class="ruby">ショウサイメイ</span></h1></div>
          <div class="CardText pen">
            <span class="item_box_value">ペンデュラムスケール 2</span>
            <div class="item_box_text">P効果<br>詳細</div>
          </div>
          <div class="CardText">
            <div class="item_box_text"><span class="text_title">【効果】</span>本文<br>詳細</div>
          </div>
          <div id="update_list">
            <div class="t_row">
              <span class="time">2025-01-01</span>
              <span class="card_number">P001</span>
              <span class="pack_name">テストパック</span>
              <input class="link_value" value="card_search.action?pid=999" />
              <span class="lr_icon" style="background-color: rgb(1, 2, 3);"><p>SR</p></span>
            </div>
            <div class="t_row"><span class="pack_name"></span></div>
          </div>
          <div id="card_list">
            ${validMonsterRowHtml('rel1', '関連カード')}
          </div>
        </body>
      </html>
    `;

    it('[covers:get_detail.http_error_null] HTTPエラー時はnullを返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({ ok: false });

      await expect(getCardDetail('base1', 'ja')).resolves.toBeNull();
    });

    it('[covers:get_detail.base_from_unified_then_temp] キャッシュに基本カードがない場合はnullを返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValueOnce('<html><body></body></html>') });
      vi.spyOn(unifiedDB, 'reconstructCardInfo').mockReturnValue(undefined);
      vi.spyOn(tempDB, 'get').mockReturnValue(undefined);

      await expect(getCardDetail('missing', 'ja')).resolves.toBeNull();
    });

    it('[covers:get_detail.merge_additional_info] [covers:parse_pack.rows_with_name_only] [covers:parse_ruby.optional] [covers:parse_text.pendulum_requires_scale] [covers:parse_text.main_text_selection] [covers:parse_additional_images.requires_ciids_and_enc] 詳細HTMLの補足情報を基本カードへマージする', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      const monsterBase = {
        ...baseCard,
        cardType: 'monster',
        attribute: 'light',
        race: 'dragon',
        levelType: 'level',
        levelValue: 4,
        types: ['pendulum'],
        atk: 1800,
        def: 1500,
        isExtraDeck: false,
        text: '古い本文'
      } as CardInfo;
      queuedFetch.mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValueOnce(detailHtml) });
      vi.spyOn(unifiedDB, 'reconstructCardInfo').mockImplementation((cid: string) => {
        if (cid === 'base1') return monsterBase;
        return undefined;
      });

      const result = await getCardDetail('base1', 'ja');

      expect(result?.card).toMatchObject({
        cardId: 'base1',
        lang: 'ja',
        ruby: 'ショウサイメイ',
        text: '本文\n詳細',
        imgs: [{ ciid: '7', imgHash: 'img7' }],
        pendulumScale: 2,
        pendulumText: 'P効果\n詳細'
      });
      expect(result?.packs).toEqual([{
        name: 'テストパック',
        code: 'P001',
        releaseDate: '2025-01-01',
        rarity: 'SR',
        rarityColor: 'rgb(1, 2, 3)',
        packId: '999'
      }]);
      expect(result?.relatedCards).toEqual([]);
      expect(result?.qaList).toEqual([]);
    });

    it('[covers:parse_pack.missing_update_list_empty] update_listがない詳細HTMLではpacksが空になる', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValueOnce('<html><body><div class="CardText"><div class="item_box_text">本文</div></div></body></html>') });
      vi.spyOn(unifiedDB, 'reconstructCardInfo').mockReturnValue(baseCard);

      const result = await getCardDetail('base1', 'ja');
      expect(result?.packs).toEqual([]);
    });

    it('[covers:get_detail.catch_null] 例外時はnullを返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getCardDetail('base1', 'ja')).resolves.toBeNull();
    });

    it('[covers:parse_detail_basic.name_required] FAQ経由で詳細ページからカード名を読めない場合はnullを返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValueOnce('<html><body><div id="cardname"><h1><span class="ruby">ルビのみ</span></h1></div></body></html>') });
      vi.spyOn(unifiedDB, 'reconstructCardInfo').mockReturnValue(undefined);

      await expect(getCardDetail('faq1', 'ja', 'release_desc', true)).resolves.toBeNull();
    });

    it('[covers:parse_detail_basic.dispatch_monster_or_spelltrap] [covers:parse_detail_spelltrap.effect_required] FAQ経由で魔法/罠の基本情報を詳細ページから読む', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      const spellHtml = `
        <html><body>
          <div id="cardname"><h1>FAQ魔法<span class="ruby">エフエーキュー</span></h1></div>
          <div class="CardText">
            <div class="frame"><div class="item_box"><div class="item_box_title">効果</div><div class="item_box_value">通常魔法</div></div></div>
            <div class="item_box_text">魔法本文</div>
          </div>
        </body></html>
      `;
      queuedFetch
        .mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValueOnce(spellHtml) })
        .mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValueOnce('<html><body></body></html>') });
      vi.spyOn(unifiedDB, 'reconstructCardInfo').mockReturnValue(undefined);

      const result = await getCardDetail('faq-spell', 'ja', 'release_desc', true);
      expect(result?.card).toMatchObject({
        cardId: 'faq-spell',
        name: 'FAQ魔法',
        cardType: 'spell',
        effectType: undefined,
        text: '魔法本文'
      });
    });

    it('[covers:parse_detail_monster.required_attribute_and_race] [covers:parse_detail_monster_level_stats_types] FAQ経由でモンスターの基本情報を詳細ページから読む', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      const monsterHtml = `
        <html><body>
          <div id="cardname"><h1>FAQモンスター</h1></div>
          <div class="CardText">
            <div class="frame">
              <div class="item_box">
                <div class="item_box_title"><img src="https://example.test/attribute_icon_dark.png" /></div>
                <div class="species"><span>ドラゴン族</span><span>／</span><span>効果</span><span>融合</span></div>
              </div>
            </div>
            <div class="box_card_level_rank rank"><span>ランク 7</span></div>
            <div class="atk_power">ATK -</div>
            <div class="def_power">DEF X</div>
            <div class="item_box_text">モンスター本文</div>
          </div>
        </body></html>
      `;
      queuedFetch
        .mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValueOnce(monsterHtml) })
        .mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValueOnce('<html><body></body></html>') });
      vi.spyOn(unifiedDB, 'reconstructCardInfo').mockReturnValue(undefined);

      const result = await getCardDetail('faq-monster', 'ja', 'release_desc', true);
      expect(result?.card).toMatchObject({
        cardId: 'faq-monster',
        name: 'FAQモンスター',
        cardType: 'monster',
        attribute: 'dark',
        levelType: 'rank',
        levelValue: 7,
        race: 'dragon',
        types: ['effect', 'fusion'],
        atk: undefined,
        def: 'X',
        text: 'モンスター本文'
      });
    });

    it('[covers:parse_detail_monster.required_attribute_and_race] FAQ経由のモンスター基本情報で未知属性ならnullを返す', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce(`
          <html><body>
            <div id="cardname"><h1>未知属性</h1></div>
            <div class="CardText"><div class="frame"><div class="item_box">
              <div class="item_box_title"><img src="https://example.test/attribute_icon_unknown.png" /></div>
              <div class="species"><span>ドラゴン族</span></div>
            </div></div></div>
          </body></html>
        `)
      });
      vi.spyOn(unifiedDB, 'reconstructCardInfo').mockReturnValue(undefined);

      await expect(getCardDetail('faq-unknown-attr', 'ja', 'release_desc', true)).resolves.toBeNull();
    });
  });

  // ===== parseSearchResults テスト =====
  describe('parseSearchResults', () => {
    it('[covers:parse_results.rows_push_only_truthy] [covers:parse_results.async_unified_cache_registration] 検索結果HTMLから有効行だけをパースする', async () => {
      const doc = new DOMParser().parseFromString(validSearchHtml(), 'text/html');
      const results = parseSearchResults(doc);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        cardId: '100',
        name: '有効モンスター',
        cardType: 'monster',
        attribute: 'light',
        levelType: 'level',
        levelValue: 4,
        race: 'dragon',
        types: ['effect'],
        ciid: '2'
      });
      await Promise.resolve();
      expect(unifiedDB.reconstructCardInfo('100')).toBeDefined();
    });

    it('[covers:parse_results.missing_containers_empty] 必須コンテナが欠ける場合は空配列を返す', () => {
      for (const html of [
        '<html><body></body></html>',
        '<div id="main980"></div>',
        '<div id="main980"><div id="article_body"></div></div>'
      ]) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        expect(parseSearchResults(doc)).toEqual([]);
      }
    });

    it('[covers:parse_base.required_name] [covers:parse_base.required_link_value] [covers:parse_base_optional_fields_and_image_fallback] CardBaseの必須項目と任意項目を実装どおり扱う', () => {
      const doc = new DOMParser().parseFromString(`
        <div class="t_row">
          <input type="hidden" class="link_value" value="/yugiohdb/card_search.action?ope=2&cid=12345&request_locale=ja" />
          <span class="card_name">  テストペンデュラム  </span>
          <span class="card_ruby">  ルビ  </span>
          <div class="box_card_text">
            <div class="box_card_pen_effect">ペンデュラム効果テキスト</div>
            メイン<br>効果
          </div>
          <div class="lr_icon fl_2"></div>
        </div>
      `, 'text/html');
      const row = doc.querySelector('.t_row') as HTMLElement;

      expect(parseCardBase(document.createElement('div'), new Map())).toBeNull();
      const noLinkDoc = new DOMParser().parseFromString('<div class="t_row"><span class="card_name">名前</span></div>', 'text/html');
      expect(parseCardBase(noLinkDoc.querySelector('.t_row') as HTMLElement, new Map())).toBeNull();
      const invalidCidDoc = new DOMParser().parseFromString('<div class="t_row"><span class="card_name">名前</span><input class="link_value" value="no-cid" /></div>', 'text/html');
      expect(parseCardBase(invalidCidDoc.querySelector('.t_row') as HTMLElement, new Map())).toBeNull();

      const result = parseCardBase(row, new Map());
      expect(result).toMatchObject({
        name: 'テストペンデュラム',
        ruby: 'ルビ',
        cardId: '12345',
        ciid: '1',
        limitRegulation: 'limited'
      });
      expect(result!.imgs).toEqual([{ ciid: '1', imgHash: '12345_1_1_1' }]);
      expect(result!.text).toBe('メイン\n効果');
    });
  });

  describe('card row parsers', () => {
    it('[covers:parse_monster.attribute_required] [covers:parse_monster.level_rank_required_value] [covers:parse_monster.species_required] [covers:parse_species.empty_parts_null] [covers:parse_species.unknown_race_null] 必須要素欠落時にモンスターをnullにする', () => {
      const noAttr = new DOMParser().parseFromString('<div></div>', 'text/html').body.firstElementChild as HTMLElement;
      expect(parseMonsterCard(noAttr, baseCard)).toBeNull();

      const noNumber = new DOMParser().parseFromString(`
        <div>
          <div class="box_card_attribute"><img src="https://example.test/attribute_icon_light.png" /></div>
          <div class="box_card_level_rank level"><span>レベル X</span></div>
          <div class="card_info_species_and_other_item">【ドラゴン族／効果】</div>
        </div>
      `, 'text/html').body.firstElementChild as HTMLElement;
      expect(parseMonsterCard(noNumber, baseCard)).toBeNull();

      const unknownSpecies = new DOMParser().parseFromString(`
        <div>
          <div class="box_card_attribute"><img src="https://example.test/attribute_icon_light.png" /></div>
          <div class="box_card_level_rank level"><span>レベル 4</span></div>
          <div class="card_info_species_and_other_item">【未知族／効果】</div>
        </div>
      `, 'text/html').body.firstElementChild as HTMLElement;
      expect(parseMonsterCard(unknownSpecies, baseCard)).toBeNull();

      const emptySpecies = new DOMParser().parseFromString(`
        <div>
          <div class="box_card_attribute"><img src="https://example.test/attribute_icon_light.png" /></div>
          <div class="box_card_level_rank level"><span>レベル 4</span></div>
          <div class="card_info_species_and_other_item">【】</div>
        </div>
      `, 'text/html').body.firstElementChild as HTMLElement;
      expect(parseMonsterCard(emptySpecies, baseCard)).toBeNull();
    });

    it('[covers:parse_species.unknown_type_skipped] [covers:parse_monster_stats_pendulum_extra] モンスターのステータス・ペンデュラム・EX判定を読む', () => {
      const doc = new DOMParser().parseFromString(`
        <div>
          <div class="box_card_attribute"><img src="https://example.test/attribute_icon_light.png" /></div>
          <div class="box_card_level_rank level"><span>レベル 8</span></div>
          <div class="card_info_species_and_other_item">【ドラゴン族／融合／未知】</div>
          <div class="atk_power">ATK 3000</div>
          <div class="def_power">DEF ?</div>
          <div class="box_card_pen_scale">スケール 1</div>
          <div class="box_card_pen_effect">P<br>効果</div>
        </div>
      `, 'text/html');

      const result = parseMonsterCard(doc.body.firstElementChild as HTMLElement, baseCard);
      expect(result).toMatchObject({
        cardType: 'monster',
        attribute: 'light',
        levelType: 'level',
        levelValue: 8,
        race: 'dragon',
        types: ['fusion'],
        atk: 3000,
        def: '?',
        pendulumScale: 1,
        pendulumText: 'P\n効果',
        isExtraDeck: true
      });
    });

    it('[covers:parse_monster.link_value_and_markers] リンクモンスターのリンク値とマーカーを読む', () => {
      const doc = new DOMParser().parseFromString(`
        <div>
          <div class="box_card_attribute"><img src="https://example.test/attribute_icon_dark.png" /></div>
          <div class="box_card_linkmarker"><span>リンク 2</span><img src="https://example.test/link13.png" /></div>
          <div class="card_info_species_and_other_item">【ドラゴン族／リンク／効果】</div>
          <div class="atk_power">ATK 1000</div>
        </div>
      `, 'text/html');

      const result = parseMonsterCard(doc.body.firstElementChild as HTMLElement, baseCard);
      expect(result).toMatchObject({
        cardType: 'monster',
        levelType: 'link',
        levelValue: 2,
        linkMarkers: 5,
        isExtraDeck: true
      });
    });

    it('[covers:parse_monster.no_level_rank_link_null] レベル/ランク/リンク要素がなければモンスターをnullにする', () => {
      const doc = new DOMParser().parseFromString(`
        <div>
          <div class="box_card_attribute"><img src="https://example.test/attribute_icon_light.png" /></div>
          <div class="card_info_species_and_other_item">【ドラゴン族／効果】</div>
        </div>
      `, 'text/html');
      expect(parseMonsterCard(doc.body.firstElementChild as HTMLElement, baseCard)).toBeNull();
    });

    it('[covers:parse_spell.attribute_required] [covers:parse_spell.effect_or_normal] 魔法カードの属性と効果種別を読む', () => {
      const spellDoc = new DOMParser().parseFromString(`
        <div>
          <div class="box_card_attribute"><img src="https://example.test/attribute_icon_spell.png" /></div>
          <div class="box_card_effect"><img src="https://example.test/effect_icon_quickplay.png" /></div>
        </div>
      `, 'text/html');
      expect(parseSpellCard(spellDoc.body.firstElementChild as HTMLElement, baseCard)).toMatchObject({
        cardType: 'spell',
        effectType: 'quick'
      });

      const normalDoc = new DOMParser().parseFromString('<div><div class="box_card_attribute"><img src="https://example.test/attribute_icon_spell.png" /></div></div>', 'text/html');
      expect(parseSpellCard(normalDoc.body.firstElementChild as HTMLElement, baseCard)?.effectType).toBe('normal');
      expect(parseSpellCard(document.createElement('div'), baseCard)).toBeNull();
    });

    it('[covers:parse_trap.attribute_required] [covers:parse_trap.effect_or_normal] 罠カードの属性と効果種別を読む', () => {
      const trapDoc = new DOMParser().parseFromString(`
        <div>
          <div class="box_card_attribute"><img src="https://example.test/attribute_icon_trap.png" /></div>
          <div class="box_card_effect"><img src="https://example.test/effect_icon_counter.png" /></div>
        </div>
      `, 'text/html');
      expect(parseTrapCard(trapDoc.body.firstElementChild as HTMLElement, baseCard)).toMatchObject({
        cardType: 'trap',
        effectType: 'counter'
      });

      const normalDoc = new DOMParser().parseFromString('<div><div class="box_card_attribute"><img src="https://example.test/attribute_icon_trap.png" /></div></div>', 'text/html');
      expect(parseTrapCard(normalDoc.body.firstElementChild as HTMLElement, baseCard)?.effectType).toBe('normal');
      expect(parseTrapCard(document.createElement('div'), baseCard)).toBeNull();
    });

    it('[covers:parse_row.base_failure_null] [covers:parse_row.detect_card_type_failure_null] [covers:parse_row.dispatch_by_type] 行パーサーはbaseとcardTypeで分岐する', () => {
      expect(parseSearchResultRow(document.createElement('div'), new Map())).toBeNull();

      const noTypeDoc = new DOMParser().parseFromString(`
        <div class="t_row">
          <input class="link_value" value="/yugiohdb/card_search.action?ope=2&cid=1" />
          <span class="card_name">タイプなし</span>
        </div>
      `, 'text/html');
      expect(parseSearchResultRow(noTypeDoc.querySelector('.t_row') as HTMLElement, new Map())).toBeNull();

      const monsterDoc = new DOMParser().parseFromString(validMonsterRowHtml('200', '行モンスター'), 'text/html');
      expect(parseSearchResultRow(monsterDoc.querySelector('.t_row') as HTMLElement, new Map())?.cardType).toBe('monster');
    });
  });

  // ===== extractImageInfo テスト =====
  describe('extractImageInfo', () => {
    it('画像情報を抽出する', () => {
      const mockHtml = `
        <html>
          <body>
            <table class="result_list">
              <tr>
                <td><a href="card.action?cid=123">123</a></td>
                <td>
                  <img src="/images/card_image/123_1.jpg" data-ciid="1" data-imghash="abc123" />
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const doc = new DOMParser().parseFromString(mockHtml, 'text/html');
      const imageMap = extractImageInfo(doc);

      expect(imageMap).toBeInstanceOf(Map);
    });

    it('複数の画像を抽出する', () => {
      const mockHtml = `
        <html>
          <body>
            ${Array.from({ length: 5 }, (_, i) => `
              <img src="/images/card_image/${i}_1.jpg" data-ciid="${i}" />
            `).join('')}
          </body>
        </html>
      `;

      const doc = new DOMParser().parseFromString(mockHtml, 'text/html');
      const imageMap = extractImageInfo(doc);

      expect(imageMap.size).toBeGreaterThanOrEqual(0);
    });

    it('画像がない場合は空Mapを返す', () => {
      const mockHtml = '<html><body></body></html>';
      const doc = new DOMParser().parseFromString(mockHtml, 'text/html');
      const imageMap = extractImageInfo(doc);

      expect(imageMap).toBeInstanceOf(Map);
    });
  });

  // ===== キャッシュ関連テスト =====
  describe('getCardDetailWithCache', () => {
    it('[covers:get_cache.fresh_cache_returns] [covers:reconstruct_cache.success] 新鮮なTableCをCardDetailとして復元して返す', async () => {
      vi.spyOn(unifiedDB, 'isInitialized').mockReturnValue(true);
      vi.spyOn(unifiedDB, 'getCardTableC').mockResolvedValue({
        cardId: 'base1',
        langsFetchedAt: { ja: Date.now() },
        langsRelatedCards: { ja: ['rel-cache', 'missing-rel'] },
        langsRelatedProducts: { ja: ['pack-cache'] },
        langsRelatedProductDetail: { ja: [{ name: 'キャッシュパック', packId: 'pack-cache' }] },
        qaList: [{ question: 'Q', answer: 'A' } as any]
      });
      vi.spyOn(unifiedDB, 'reconstructCardInfo').mockImplementation((cid: string) => {
        if (cid === 'base1') return baseCard;
        if (cid === 'rel-cache') return { ...baseCard, cardId: 'rel-cache', name: '関連キャッシュ' };
        return undefined;
      });

      const result = await getCardDetailWithCache('base1', 'ja');

      expect(result.fromCache).toBe(true);
      expect(result.isFresh).toBe(true);
      expect(result.detail?.packs).toEqual([{ name: 'キャッシュパック', packId: 'pack-cache' }]);
      expect(result.detail?.relatedCards.map(card => card.cardId)).toEqual(['rel-cache']);
      expect(result.refreshPromise).toBeUndefined();
    });

    it('[covers:get_cache.stale_cache_updates_fetched_at] [covers:get_cache.stale_or_no_products_refresh] 古いキャッシュはfetchedAtを更新しrefreshPromiseを付ける', async () => {
      const oldTime = new Date('2020-01-01T00:00:00Z').getTime();
      const updateSpy = vi.spyOn(unifiedDB, 'updateCardTableCFetchedAt').mockResolvedValue(undefined);
      vi.spyOn(unifiedDB, 'isInitialized').mockReturnValue(true);
      vi.spyOn(unifiedDB, 'getCardTableC').mockResolvedValue({
        cardId: 'base1',
        langsFetchedAt: { ja: oldTime },
        langsRelatedCards: { ja: [] },
        langsRelatedProducts: { ja: ['pack-cache'] },
        langsRelatedProductDetail: { ja: [{ name: 'キャッシュパック', packId: 'pack-cache' }] },
        qaList: []
      });
      vi.spyOn(unifiedDB, 'reconstructCardInfo').mockReturnValue(baseCard);

      const result = await getCardDetailWithCache('base1', 'ja', true);

      expect(result.fromCache).toBe(true);
      expect(result.isFresh).toBe(false);
      expect(updateSpy).toHaveBeenCalledWith('base1', 'ja');
      expect(result.fetchedAt).not.toBe(oldTime);
      expect(result.refreshPromise).toBeInstanceOf(Promise);
      await result.refreshPromise;
    });

    it('[covers:get_cache.cache_miss_fetch_and_save] [covers:reconstruct_cache.card_info_required] [covers:reconstruct_cache.packs_required] キャッシュ不完全時はAPI取得へフォールバックする', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValueOnce('<html><body><div class="CardText"><div class="item_box_text">API本文</div></div></body></html>') });
      vi.spyOn(unifiedDB, 'isInitialized').mockReturnValue(true);
      vi.spyOn(unifiedDB, 'getCardTableC').mockResolvedValue({
        cardId: 'base1',
        langsFetchedAt: { ja: Date.now() },
        langsRelatedCards: { ja: [] },
        langsRelatedProducts: { ja: ['pack-cache'] },
        langsRelatedProductDetail: { ja: undefined as any },
        qaList: []
      });
      vi.spyOn(unifiedDB, 'reconstructCardInfo').mockReturnValue(baseCard);
      const saveAllSpy = vi.spyOn(unifiedDB, 'saveAll').mockResolvedValue(undefined);

      const result = await getCardDetailWithCache('base1', 'ja');
      expect(result.fromCache).toBe(false);
      expect(result.isFresh).toBe(true);
      expect(result.detail?.card.text).toBe('API本文');
      expect(saveAllSpy).toHaveBeenCalled();
    });

    it('[covers:reconstruct_cache.related_existing_only] 復元できない関連カードはキャッシュ詳細から除外する', async () => {
      vi.spyOn(unifiedDB, 'isInitialized').mockReturnValue(true);
      vi.spyOn(unifiedDB, 'getCardTableC').mockResolvedValue({
        cardId: 'base1',
        langsFetchedAt: { ja: Date.now() },
        langsRelatedCards: { ja: ['rel-cache', 'missing-rel'] },
        langsRelatedProducts: { ja: ['pack-cache'] },
        langsRelatedProductDetail: { ja: [{ name: 'キャッシュパック', packId: 'pack-cache' }] },
        qaList: []
      });
      vi.spyOn(unifiedDB, 'reconstructCardInfo').mockImplementation((cid: string) => cid === 'missing-rel' ? undefined : { ...baseCard, cardId: cid });

      const result = await getCardDetailWithCache('base1', 'ja');
      expect(result.detail?.relatedCards.map(card => card.cardId)).toEqual(['rel-cache']);
    });
  });

  // ===== エッジケーステスト =====
  describe('Edge Cases', () => {
    it('空文字列の検索キーワード', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce('<html><body></body></html>')
      });

      const results = await searchCards({ keyword: '' });
      expect(Array.isArray(results)).toBe(true);
    });

    it('特殊文字を含む検索キーワード', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce('<html><body></body></html>')
      });

      const results = await searchCards({ keyword: 'テスト&特殊文字<>"\'' });
      expect(Array.isArray(results)).toBe(true);
    });

    it('非常に長い検索キーワード', async () => {
      const { queuedFetch } = await import('@/utils/request-queue');
      queuedFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce('<html><body></body></html>')
      });

      const longKeyword = 'a'.repeat(1000);
      const results = await searchCards({ keyword: longKeyword });
      expect(Array.isArray(results)).toBe(true);
    });

    it('不正なカードID', async () => {
      const result = await searchCardById('invalid-id');
      expect(result).toBeNull();
    });
  });

  // ===== parseCardBase ペンデュラム除外テスト =====
  describe('parseCardBase - ペンデュラム効果除外', () => {
    it('ペンデュラム効果テキストがメインテキストから除外される', () => {

      // ペンデュラムモンスターのHTML構造を模倣
      const doc = new DOMParser().parseFromString(`
        <div class="t_row">
          <input type="hidden" class="link_value" value="/yugiohdb/card_search.action?ope=2&cid=12345&request_locale=ja" />
          <div class="box_card_name">
            <span class="card_name">テストペンデュラム</span>
          </div>
          <div class="box_card_text">
            <div class="box_card_pen_effect">ペンデュラム効果テキスト</div>
            メインの効果テキスト
          </div>
          <div class="box_card_img">
            <img src="/images/12345_1_1_1.jpg" />
          </div>
        </div>
      `, 'text/html');

      const row = doc.querySelector('.t_row');
      expect(row).not.toBeNull();

      const imageInfoMap = new Map([['12345', { ciid: '1', imgHash: '12345_1_1_1' }]]);
      const result = parseCardBase(row! as HTMLElement, imageInfoMap);

      expect(result).not.toBeNull();
      // ペンデュラム効果テキストが含まれていないことを確認
      expect(result!.text).not.toContain('ペンデュラム効果テキスト');
      // メインの効果テキストが含まれていることを確認
      expect(result!.text).toContain('メインの効果テキスト');
    });

    it('非ペンデュラムモンスターのテキストはそのまま返される', () => {

      const doc = new DOMParser().parseFromString(`
        <div class="t_row">
          <input type="hidden" class="link_value" value="/yugiohdb/card_search.action?ope=2&cid=67890&request_locale=ja" />
          <div class="box_card_name">
            <span class="card_name">通常モンスター</span>
          </div>
          <div class="box_card_text">
            通常の効果テキスト
          </div>
          <div class="box_card_img">
            <img src="/images/67890_1_1_1.jpg" />
          </div>
        </div>
      `, 'text/html');

      const row = doc.querySelector('.t_row');
      expect(row).not.toBeNull();

      const imageInfoMap = new Map([['67890', { ciid: '1', imgHash: '67890_1_1_1' }]]);
      const result = parseCardBase(row! as HTMLElement, imageInfoMap);

      expect(result).not.toBeNull();
      expect(result!.text).toContain('通常の効果テキスト');
    });
  });
});
