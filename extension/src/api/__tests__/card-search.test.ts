import { searchCardsByName, searchCardById } from '../card-search';

/**
 * カード検索API関数のテスト
 */
describe('カード検索API', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('searchCardsByName', () => {
    it('カード名で検索し、結果を返す', async () => {
      const mockResponse = `
        <html>
          <body>
            <div class="t_row c_normal">
              <div class="box_card_attribute">
                <img src="/yugiohdb/icon/attribute_icon_dark.png">
              </div>
              <div class="box_card_name">
                <input type="hidden" name="cid" value="12345">
                <input type="hidden" name="img_no" value="1">
                <span class="card_name">ブラック・マジシャン</span>
              </div>
            </div>
            <div class="t_row c_normal">
              <div class="box_card_attribute">
                <img src="/yugiohdb/icon/attribute_icon_spell.png">
              </div>
              <div class="box_card_name">
                <input type="hidden" name="cid" value="67890">
                <input type="hidden" name="img_no" value="2">
                <span class="card_name">ブラック・マジック</span>
              </div>
            </div>
          </body>
        </html>
      `;
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCardsByName('ブラック');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('card_search.action'),
        expect.any(Object)
      );
      // URLエンコードされたキーワードをチェック
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('keyword=');
      expect(decodeURIComponent(call[0])).toContain('keyword=ブラック');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'ブラック・マジシャン',
        cardId: '12345',
        cardType: 'モンスター',
        imageId: '1'
      });
      expect(result[1]).toEqual({
        name: 'ブラック・マジック',
        cardId: '67890',
        cardType: '魔法',
        imageId: '2'
      });
    });

    it('ctypeを指定してモンスターカードのみ検索できる', async () => {
      const mockResponse = '<html><body></body></html>';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      await searchCardsByName('青眼', 'モンスター');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ctype=1'),
        expect.any(Object)
      );
    });

    it('ctypeを指定して魔法カードのみ検索できる', async () => {
      const mockResponse = '<html><body></body></html>';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      await searchCardsByName('融合', '魔法');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ctype=2'),
        expect.any(Object)
      );
    });

    it('ctypeを指定して罠カードのみ検索できる', async () => {
      const mockResponse = '<html><body></body></html>';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      await searchCardsByName('ミラー', '罠');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ctype=3'),
        expect.any(Object)
      );
    });

    it('検索結果が0件の場合は空配列を返す', async () => {
      const mockResponse = '<html><body></body></html>';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCardsByName('存在しないカード');

      expect(result).toEqual([]);
    });

    it('fetchが失敗した場合は空配列を返す', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await searchCardsByName('テスト');

      expect(result).toEqual([]);
    });
  });

  describe('searchCardById', () => {
    it('カードIDで検索し、結果を返す', async () => {
      const mockResponse = `
        <html>
          <body>
            <div class="t_row c_normal">
              <div class="box_card_attribute">
                <img src="/yugiohdb/icon/attribute_icon_light.png">
              </div>
              <div class="box_card_name">
                <input type="hidden" name="cid" value="12345">
                <input type="hidden" name="img_no" value="1">
                <span class="card_name">青眼の白龍</span>
              </div>
            </div>
          </body>
        </html>
      `;
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCardById('12345');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('cid=12345'),
        expect.any(Object)
      );
      expect(result).toEqual({
        name: '青眼の白龍',
        cardId: '12345',
        cardType: 'モンスター',
        imageId: '1'
      });
    });

    it('検索結果が0件の場合はnullを返す', async () => {
      const mockResponse = '<html><body></body></html>';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCardById('99999');

      expect(result).toBeNull();
    });

    it('fetchが失敗した場合はnullを返す', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await searchCardById('12345');

      expect(result).toBeNull();
    });
  });
});
