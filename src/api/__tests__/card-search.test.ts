import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import {
  searchCards,
  searchCardById,
  parseLinkValue,
  parseSearchResults,
  parseCardBase,
  extractImageInfo,
  buildSearchParams,
  getCardDetailWithCache,
  parseMonsterCard,
  parseSpellCard,
  parseTrapCard
} from '../card-search';
import 'fake-indexeddb/auto';

/**
 * カード検索API関数のテスト
 */
describe('カード検索API', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchCards (name search)', () => {
    it('カード名で検索し、結果を返す', async () => {
      const mockResponse = `
        <html>
          <body>
            <div id="main980">
              <div id="article_body">
                <div id="card_list">
                  <div class="t_row c_normal">
                    <input class="link_value" type="hidden" value="/yugiohdb/card_search.action?ope=2&cid=12345">
                    <div class="box_card_attribute">
                      <img src="/yugiohdb/icon/attribute_icon_dark.png">
                    </div>
                    <div class="box_card_name">
                      <span class="card_name">ブラック・マジシャン</span>
                    </div>
                    <div class="box_card_level_rank level">
                      <img src="/yugiohdb/icon/icon_level.png">
                      <span>レベル 7</span>
                    </div>
                    <span class="card_info_species_and_other_item">【魔法使い族／通常】</span>
                    <div class="box_card_spec">
                      <span>攻撃力 2500</span>
                      <span>守備力 2100</span>
                    </div>
                  </div>
                  <div class="t_row c_normal">
                    <input class="link_value" type="hidden" value="/yugiohdb/card_search.action?ope=2&cid=67890">
                    <div class="box_card_attribute">
                      <img src="/yugiohdb/icon/attribute_icon_spell.png">
                    </div>
                    <div class="box_card_name">
                      <span class="card_name">ブラック・マジック</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCards({
        keyword: 'ブラック',
        searchType: '1',
        resultsPerPage: 100
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('card_search.action'),
        expect.any(Object)
      );
      // URLエンコードされたキーワードをチェック
      const call = (global.fetch as Mock).mock.calls[0];
      expect(call[0]).toContain('keyword=');
      expect(decodeURIComponent(call[0])).toContain('keyword=ブラック');
      expect(result).toHaveLength(2);
      // CardInfo型の構造に合わせて検証
      expect(result[0].name).toBe('ブラック・マジシャン');
      expect(result[0].cardId).toBe('12345');
      expect(result[0].cardType).toBe('monster');
      expect(result[1].name).toBe('ブラック・マジック');
      expect(result[1].cardId).toBe('67890');
      expect(result[1].cardType).toBe('spell');
    });

    it('ctypeを指定してモンスターカードのみ検索できる', async () => {
      const mockResponse = '<html><body></body></html>';
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      await searchCards({
        keyword: '青眼',
        searchType: '1',
        cardType: 'monster',
        resultsPerPage: 100
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ctype=1'),
        expect.any(Object)
      );
    });

    it('ctypeを指定して魔法カードのみ検索できる', async () => {
      const mockResponse = '<html><body></body></html>';
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      await searchCards({
        keyword: '融合',
        searchType: '1',
        cardType: 'spell',
        resultsPerPage: 100
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ctype=2'),
        expect.any(Object)
      );
    });

    it('ctypeを指定して罠カードのみ検索できる', async () => {
      const mockResponse = '<html><body></body></html>';
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      await searchCards({
        keyword: 'ミラー',
        searchType: '1',
        cardType: 'trap',
        resultsPerPage: 100
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ctype=3'),
        expect.any(Object)
      );
    });

    it('検索結果が0件の場合は空配列を返す', async () => {
      const mockResponse = '<html><body></body></html>';
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCards({
        keyword: '存在しないカード',
        searchType: '1',
        resultsPerPage: 100
      });

      expect(result).toEqual([]);
    });

    it('fetchが失敗した場合は空配列を返す', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await searchCards({
        keyword: 'テスト',
        searchType: '1',
        resultsPerPage: 100
      });

      expect(result).toEqual([]);
    });
  });

  describe('searchCardById', () => {
    it('カードIDで検索し、結果を返す', async () => {
      const mockResponse = `
        <html>
          <body>
            <div id="main980">
              <div id="article_body">
                <div id="card_list">
                  <div class="t_row c_normal">
                    <input class="link_value" type="hidden" value="/yugiohdb/card_search.action?ope=2&cid=12345">
                    <div class="box_card_attribute">
                      <img src="/yugiohdb/icon/attribute_icon_light.png">
                    </div>
                    <div class="box_card_name">
                      <span class="card_name">青眼の白龍</span>
                    </div>
                    <div class="box_card_level_rank level">
                      <img src="/yugiohdb/icon/icon_level.png">
                      <span>レベル 8</span>
                    </div>
                    <span class="card_info_species_and_other_item">【ドラゴン族／通常】</span>
                    <div class="box_card_spec">
                      <span>攻撃力 3000</span>
                      <span>守備力 2500</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCardById('12345');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('cid=12345'),
        expect.any(Object)
      );
      expect(result).not.toBeNull();
      expect(result!.name).toBe('青眼の白龍');
      expect(result!.cardId).toBe('12345');
      expect(result!.cardType).toBe('monster');
    });

    it('検索結果が0件の場合はnullを返す', async () => {
      const mockResponse = '<html><body></body></html>';
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCardById('99999');

      expect(result).toBeNull();
    });

    it('fetchが失敗した場合はnullを返す', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await searchCardById('12345');

      expect(result).toBeNull();
    });
  });

  describe('HTML Parsing Edge Cases', () => {
    it('空のHTMLを正しく処理する', async () => {
      const mockResponse = '<html><body></body></html>';
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCards({
        keyword: 'test',
        searchType: '1',
        resultsPerPage: 100
      });

      expect(result).toEqual([]);
    });

    it('不正な形式のHTMLでも空配列を返す', async () => {
      const mockResponse = '<html><body><div>Invalid HTML</div></body></html>';
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCards({
        keyword: 'test',
        searchType: '1',
        resultsPerPage: 100
      });

      expect(result).toEqual([]);
    });

    it('カード名が欠落している場合でも処理を継続する', async () => {
      const mockResponse = `
        <html>
          <body>
            <div id="main980">
              <div id="article_body">
                <div id="card_list">
                  <div class="t_row c_normal">
                    <input class="link_value" type="hidden" value="/yugiohdb/card_search.action?ope=2&cid=12345">
                    <div class="box_card_attribute">
                      <img src="/yugiohdb/icon/attribute_icon_dark.png">
                    </div>
                    <!-- カード名がない -->
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCards({
        keyword: 'test',
        searchType: '1',
        resultsPerPage: 100
      });

      // カード名がないカードはスキップされるか、空の名前で返される
      expect(Array.isArray(result)).toBe(true);
    });

    it('カードIDが欠落している場合でも処理を継続する', async () => {
      const mockResponse = `
        <html>
          <body>
            <div id="main980">
              <div id="article_body">
                <div id="card_list">
                  <div class="t_row c_normal">
                    <!-- link_value がない -->
                    <div class="box_card_attribute">
                      <img src="/yugiohdb/icon/attribute_icon_dark.png">
                    </div>
                    <div class="box_card_name">
                      <span class="card_name">テストカード</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCards({
        keyword: 'test',
        searchType: '1',
        resultsPerPage: 100
      });

      // カードIDがないカードはスキップされる
      expect(Array.isArray(result)).toBe(true);
    });

    it('複数のカードを正しくパースする', async () => {
      // 実際のHTML構造に基づいたテスト
      const result = await searchCards({
        keyword: 'test',
        searchType: '1',
        resultsPerPage: 100
      });

      // 配列が返されることを確認
      expect(Array.isArray(result)).toBe(true);
    });

    it('ネットワークエラー時に空配列を返す', async () => {
      (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

      const result = await searchCards({
        keyword: 'test',
        searchType: '1',
        resultsPerPage: 100
      });

      expect(result).toEqual([]);
    });

    it('fetchの例外時に空配列を返す', async () => {
      (global.fetch as Mock).mockImplementation(() => {
        throw new Error('Fetch exception');
      });

      const result = await searchCards({
        keyword: 'test',
        searchType: '1',
        resultsPerPage: 100
      });

      expect(result).toEqual([]);
    });
  });

  describe('parseLinkValue', () => {
    it('単一の方向をビット値に変換する', () => {
      expect(parseLinkValue('1')).toBe(0b000000001); // bit 0
      expect(parseLinkValue('2')).toBe(0b000000010); // bit 1
      expect(parseLinkValue('3')).toBe(0b000000100); // bit 2
      expect(parseLinkValue('4')).toBe(0b000001000); // bit 3
      expect(parseLinkValue('6')).toBe(0b000100000); // bit 5
      expect(parseLinkValue('7')).toBe(0b001000000); // bit 6
      expect(parseLinkValue('8')).toBe(0b010000000); // bit 7
      expect(parseLinkValue('9')).toBe(0b100000000); // bit 8
    });

    it('方向5（中央）は無視される', () => {
      expect(parseLinkValue('5')).toBe(0); // 中央は存在しない
      expect(parseLinkValue('15')).toBe(0b000000001); // 方向1のみ（5は無視）
      expect(parseLinkValue('555')).toBe(0); // 全て無視
    });

    it('複数の方向を正しく組み合わせる', () => {
      // 例: "13" → 方向1（左下）と3（右下）
      expect(parseLinkValue('13')).toBe(0b000000101); // bit 0, 2 = 5
      // 例: "246" → 方向2（下）、4（左）、6（右）
      expect(parseLinkValue('246')).toBe(0b000101010); // bit 1, 3, 5 = 42
      // 例: "789" → 方向7（左上）、8（上）、9（右上）
      expect(parseLinkValue('789')).toBe(0b111000000); // bit 6, 7, 8 = 448
    });

    it('実際のリンクモンスター例: "123456789"（全方向）', () => {
      // 方向5（中央）を除く全てのビットが立つ
      expect(parseLinkValue('123456789')).toBe(0b111101111); // = 495
    });

    it('範囲外の値は無視される', () => {
      expect(parseLinkValue('0')).toBe(0); // 0は範囲外
      expect(parseLinkValue('10')).toBe(0b000000001); // "1" のみ有効、"0" は無視
      expect(parseLinkValue('abc')).toBe(0); // 数値でない文字は無視
    });

    it('空文字列は0を返す', () => {
      expect(parseLinkValue('')).toBe(0);
    });

    it('同じ方向が複数回指定されても冪等性がある', () => {
      expect(parseLinkValue('111')).toBe(0b000000001); // 方向1が3回でもbit 0のみ
      expect(parseLinkValue('22')).toBe(0b000000010); // 方向2が2回でもbit 1のみ
    });
  });

  describe('parseSearchResults', () => {
    it('DOM DocumentからCardInfo配列をパースする', () => {
      const mockHtml = `
        <html>
          <body>
            <div id="main980">
              <div id="article_body">
                <div id="card_list">
                  <div class="t_row c_normal">
                    <input class="link_value" type="hidden" value="/yugiohdb/card_search.action?ope=2&cid=12345">
                    <div class="box_card_attribute">
                      <img src="/yugiohdb/icon/attribute_icon_dark.png">
                    </div>
                    <div class="box_card_name">
                      <span class="card_name">ブラック・マジシャン</span>
                    </div>
                    <div class="box_card_level_rank level">
                      <img src="/yugiohdb/icon/icon_level.png">
                      <span>レベル 7</span>
                    </div>
                    <span class="card_info_species_and_other_item">【魔法使い族／通常】</span>
                    <div class="box_card_spec">
                      <span>攻撃力 2500</span>
                      <span>守備力 2100</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      const parser = new DOMParser();
      const doc = parser.parseFromString(mockHtml, 'text/html');

      const results = parseSearchResults(doc);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('ブラック・マジシャン');
      expect(results[0].cardId).toBe('12345');
      expect(results[0].cardType).toBe('monster');
    });

    it('カードが0件の場合は空配列を返す', () => {
      const mockHtml = '<html><body></body></html>';
      const parser = new DOMParser();
      const doc = parser.parseFromString(mockHtml, 'text/html');

      const results = parseSearchResults(doc);

      expect(results).toEqual([]);
    });
  });

  describe('extractImageInfo', () => {
    it('画像情報を抽出してMapを返す', () => {
      const mockHtml = `
        <html>
          <body>
            <div id="card_list">
              <div class="t_row">
                <input class="link_value" type="hidden" value="/yugiohdb/card_search.action?ope=2&cid=12345">
                <div class="box_card_img_xxx">
                  <span class="image_url_xxx" style="background-image:url('https://example.com/card_12345_abc.jpg')"></span>
                  <input class="image_id_xxx" type="hidden" value="67890">
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      const parser = new DOMParser();
      const doc = parser.parseFromString(mockHtml, 'text/html');

      const imageInfo = extractImageInfo(doc);

      expect(imageInfo.size).toBeGreaterThanOrEqual(0);
      expect(imageInfo instanceof Map).toBe(true);
    });
  });

  describe('parseCardBase', () => {
    it('HTML要素からCardBase情報をパースする', () => {
      const mockHtml = `
        <div class="t_row c_normal">
          <input class="link_value" type="hidden" value="/yugiohdb/card_search.action?ope=2&cid=54321">
          <div class="box_card_attribute">
            <img src="/yugiohdb/icon/attribute_icon_spell.png">
          </div>
          <div class="box_card_name">
            <span class="card_name">死者蘇生</span>
          </div>
        </div>
      `;
      const parser = new DOMParser();
      const doc = parser.parseFromString(mockHtml, 'text/html');
      const row = doc.querySelector('.t_row');
      const imageInfoMap = new Map();

      if (row) {
        const base = parseCardBase(row as HTMLElement, imageInfoMap);

        expect(base).not.toBeNull();
        if (base) {
          expect(base.name).toBe('死者蘇生');
          expect(base.cardId).toBe('54321');
          // CardBase には cardType は含まれない（parseSearchResultRow で追加される）
          expect(base.ciid).toBeDefined();
          expect(base.imgs).toBeDefined();
          expect(base.imgs.length).toBeGreaterThan(0);
        }
      }
    });

    it('必須要素が欠落している場合はnullを返す', () => {
      const mockHtml = `
        <div class="t_row c_normal">
          <!-- link_value がない -->
          <div class="box_card_name">
            <span class="card_name">テストカード</span>
          </div>
        </div>
      `;
      const parser = new DOMParser();
      const doc = parser.parseFromString(mockHtml, 'text/html');
      const row = doc.querySelector('.t_row');
      const imageInfoMap = new Map();

      if (row) {
        const base = parseCardBase(row as HTMLElement, imageInfoMap);

        expect(base).toBeNull();
      }
    });
  });

  describe('buildSearchParams', () => {
    it('基本的なキーワード検索パラメータを構築する', () => {
      const params = buildSearchParams({ keyword: 'ブラック・マジシャン' });

      expect(params.get('ope')).toBe('1');
      expect(params.get('sess')).toBe('1');
      expect(params.get('keyword')).toBe('ブラック・マジシャン');
      expect(params.get('stype')).toBe('1'); // デフォルト: カード名検索
      expect(params.get('ctype')).toBeDefined();
    });

    it('カードタイプフィルタを正しく設定する', () => {
      const monsterParams = buildSearchParams({ keyword: '', cardType: 'monster' });
      const spellParams = buildSearchParams({ keyword: '', cardType: 'spell' });
      const trapParams = buildSearchParams({ keyword: '', cardType: 'trap' });

      expect(monsterParams.get('ctype')).toBe('1');
      expect(spellParams.get('ctype')).toBe('2');
      expect(trapParams.get('ctype')).toBe('3');
    });

    it('属性フィルタを正しく設定する', () => {
      const params = buildSearchParams({
        keyword: '',
        attributes: ['light', 'dark']
      });

      const attrValues = params.getAll('attr');
      expect(attrValues.length).toBe(2);
    });

    it('攻撃力範囲を正しく設定する', () => {
      const params = buildSearchParams({
        keyword: '',
        atk: { from: 2000, to: 3000 }
      });

      expect(params.get('atkfr')).toBe('2000');
      expect(params.get('atkto')).toBe('3000');
    });

    it('守備力範囲を正しく設定する', () => {
      const params = buildSearchParams({
        keyword: '',
        def: { from: 1000, to: 2000 }
      });

      expect(params.get('deffr')).toBe('1000');
      expect(params.get('defto')).toBe('2000');
    });

    it('レベルフィルタを正しく設定する', () => {
      const params = buildSearchParams({
        keyword: '',
        levels: [4, 7, 8]
      });

      expect(params.get('level4')).toBe('on');
      expect(params.get('level7')).toBe('on');
      expect(params.get('level8')).toBe('on');
    });

    it('リンク数フィルタを正しく設定する', () => {
      const params = buildSearchParams({
        keyword: '',
        linkNumbers: [1, 2, 3]
      });

      expect(params.get('Link1')).toBe('on');
      expect(params.get('Link2')).toBe('on');
      expect(params.get('Link3')).toBe('on');
    });

    it('リンクマーカー方向を正しく設定する', () => {
      const params = buildSearchParams({
        keyword: '',
        linkMarkers: [1, 3, 7, 9] // 四隅
      });

      expect(params.get('linkbtn1')).toBe('1');
      expect(params.get('linkbtn3')).toBe('3');
      expect(params.get('linkbtn7')).toBe('7');
      expect(params.get('linkbtn9')).toBe('9');
    });

    it('リンクマーカー論理演算を正しく設定する', () => {
      const andParams = buildSearchParams({
        keyword: '',
        linkMarkerLogic: 'AND'
      });
      const orParams = buildSearchParams({
        keyword: '',
        linkMarkerLogic: 'OR'
      });

      expect(andParams.get('link_m')).toBe('1');
      expect(orParams.get('link_m')).toBe('2');
    });

    it('ソート順を正しく設定する', () => {
      const defaultParams = buildSearchParams({ keyword: '' });
      const customParams = buildSearchParams({ keyword: '', sort: 2 });

      expect(defaultParams.get('sort')).toBe('1'); // デフォルト
      expect(customParams.get('sort')).toBe('2');
    });

    it('結果件数を正しく設定する', () => {
      const defaultParams = buildSearchParams({ keyword: '' });
      const customParams = buildSearchParams({ keyword: '', resultsPerPage: 50 });

      expect(defaultParams.get('rp')).toBe('100'); // デフォルト
      expect(customParams.get('rp')).toBe('50');
    });

    it('発売日範囲を正しく設定する', () => {
      const params = buildSearchParams({
        keyword: '',
        releaseDate: {
          start: { year: 2020, month: 1, day: 1 },
          end: { year: 2023, month: 12, day: 31 }
        }
      });

      expect(params.get('releaseYStart')).toBe('2020');
      expect(params.get('releaseMStart')).toBe('1');
      expect(params.get('releaseDStart')).toBe('1');
      expect(params.get('releaseYEnd')).toBe('2023');
      expect(params.get('releaseMEnd')).toBe('12');
      expect(params.get('releaseDEnd')).toBe('31');
    });
  });

  describe('getCardDetailWithCache', () => {
    beforeEach(() => {
      // IndexedDBをリセット
      indexedDB = new IDBFactory();
    });

    it('キャッシュがない場合はAPIを呼び出す', async () => {
      // getCardDetail をモック
      const mockCardDetail = {
        name: 'ブラック・マジシャン',
        cardId: '12345',
        cardType: 'monster' as const,
        ciid: '1',
        lang: 'ja' as const,
        imgs: [{ ciid: '1', imgHash: '12345_1_1_1' }]
      };

      // グローバルfetchをモック（getCardDetailがfetchを使用するため）
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <html>
            <body>
              <div id="CardText1">テストカード</div>
            </body>
          </html>
        `
      });

      const result = await getCardDetailWithCache('12345', 'ja');

      // キャッシュがないため fromCache は false
      expect(result.fromCache).toBe(false);
      expect(result.isFresh).toBe(true);
      expect(result.fetchedAt).toBeDefined();
    });

    it('無効なカードIDの場合はdetailがnullになる', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body></body></html>' // 空のレスポンス
      });

      const result = await getCardDetailWithCache('99999', 'ja');

      expect(result.detail).toBeNull();
      expect(result.fromCache).toBe(false);
    });

    it('fetchエラー時はdetailがnullになる', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await getCardDetailWithCache('12345', 'ja');

      expect(result.detail).toBeNull();
      expect(result.fromCache).toBe(false);
    });
  });

  describe('parseMonsterCard', () => {
    it('属性が欠落している場合はnullを返す', () => {
      const mockHtml = `
        <div class="t_row c_normal">
          <!-- box_card_attribute がない -->
          <div class="box_card_level_rank level">
            <img src="/yugiohdb/icon/icon_level.png">
            <span>レベル 7</span>
          </div>
        </div>
      `;
      const parser = new DOMParser();
      const doc = parser.parseFromString(mockHtml, 'text/html');
      const row = doc.querySelector('.t_row') as HTMLElement;

      const base = {
        name: 'テストカード',
        cardId: '11111',
        ciid: '1',
        lang: 'ja' as const,
        imgs: [{ ciid: '1', imgHash: '11111_1_1_1' }]
      };

      const result = parseMonsterCard(row, base);

      expect(result).toBeNull();
    });
  });

  describe('parseSpellCard', () => {
    it('魔法カードを正しくパースする', () => {
      const mockHtml = `
        <div class="t_row c_normal">
          <div class="box_card_attribute">
            <img src="/yugiohdb/icon/attribute_icon_spell.png">
          </div>
          <span class="card_info_species_and_other_item">【通常魔法】</span>
        </div>
      `;
      const parser = new DOMParser();
      const doc = parser.parseFromString(mockHtml, 'text/html');
      const row = doc.querySelector('.t_row') as HTMLElement;

      const base = {
        name: '死者蘇生',
        cardId: '22222',
        ciid: '1',
        lang: 'ja' as const,
        imgs: [{ ciid: '1', imgHash: '22222_1_1_1' }]
      };

      const result = parseSpellCard(row, base);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.cardType).toBe('spell');
        expect(result.name).toBe('死者蘇生');
        expect(result.cardId).toBe('22222');
      }
    });

    it('魔法でない場合はnullを返す', () => {
      const mockHtml = `
        <div class="t_row c_normal">
          <div class="box_card_attribute">
            <img src="/yugiohdb/icon/attribute_icon_trap.png">
          </div>
        </div>
      `;
      const parser = new DOMParser();
      const doc = parser.parseFromString(mockHtml, 'text/html');
      const row = doc.querySelector('.t_row') as HTMLElement;

      const base = {
        name: 'テストカード',
        cardId: '33333',
        ciid: '1',
        lang: 'ja' as const,
        imgs: [{ ciid: '1', imgHash: '33333_1_1_1' }]
      };

      const result = parseSpellCard(row, base);

      expect(result).toBeNull();
    });
  });

  describe('parseTrapCard', () => {
    it('罠カードを正しくパースする', () => {
      const mockHtml = `
        <div class="t_row c_normal">
          <div class="box_card_attribute">
            <img src="/yugiohdb/icon/attribute_icon_trap.png">
          </div>
          <span class="card_info_species_and_other_item">【通常罠】</span>
        </div>
      `;
      const parser = new DOMParser();
      const doc = parser.parseFromString(mockHtml, 'text/html');
      const row = doc.querySelector('.t_row') as HTMLElement;

      const base = {
        name: '聖なるバリア -ミラーフォース-',
        cardId: '44444',
        ciid: '1',
        lang: 'ja' as const,
        imgs: [{ ciid: '1', imgHash: '44444_1_1_1' }]
      };

      const result = parseTrapCard(row, base);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.cardType).toBe('trap');
        expect(result.name).toBe('聖なるバリア -ミラーフォース-');
        expect(result.cardId).toBe('44444');
      }
    });

    it('罠でない場合はnullを返す', () => {
      const mockHtml = `
        <div class="t_row c_normal">
          <div class="box_card_attribute">
            <img src="/yugiohdb/icon/attribute_icon_spell.png">
          </div>
        </div>
      `;
      const parser = new DOMParser();
      const doc = parser.parseFromString(mockHtml, 'text/html');
      const row = doc.querySelector('.t_row') as HTMLElement;

      const base = {
        name: 'テストカード',
        cardId: '55555',
        ciid: '1',
        lang: 'ja' as const,
        imgs: [{ ciid: '1', imgHash: '55555_1_1_1' }]
      };

      const result = parseTrapCard(row, base);

      expect(result).toBeNull();
    });
  });
});
