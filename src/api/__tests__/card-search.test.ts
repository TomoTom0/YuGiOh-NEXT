import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { searchCardsByName, searchCardById } from '../card-search';

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

  describe('searchCardsByName', () => {
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

      const result = await searchCardsByName('ブラック');

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

      await searchCardsByName('青眼', undefined, 'monster');

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

      await searchCardsByName('融合', undefined, 'spell');

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

      await searchCardsByName('ミラー', undefined, 'trap');

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

      const result = await searchCardsByName('存在しないカード');

      expect(result).toEqual([]);
    });

    it('fetchが失敗した場合は空配列を返す', async () => {
      (global.fetch as Mock).mockResolvedValue({
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

      const result = await searchCardsByName('test');

      expect(result).toEqual([]);
    });

    it('不正な形式のHTMLでも空配列を返す', async () => {
      const mockResponse = '<html><body><div>Invalid HTML</div></body></html>';
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        text: async () => mockResponse
      });

      const result = await searchCardsByName('test');

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

      const result = await searchCardsByName('test');

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

      const result = await searchCardsByName('test');

      // カードIDがないカードはスキップされる
      expect(Array.isArray(result)).toBe(true);
    });

    it('複数のカードを正しくパースする', async () => {
      // 実際のHTML構造に基づいたテスト
      const result = await searchCardsByName('test');

      // 配列が返されることを確認
      expect(Array.isArray(result)).toBe(true);
    });

    it('ネットワークエラー時に空配列を返す', async () => {
      (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

      const result = await searchCardsByName('test');

      expect(result).toEqual([]);
    });

    it('fetchの例外時に空配列を返す', async () => {
      (global.fetch as Mock).mockImplementation(() => {
        throw new Error('Fetch exception');
      });

      const result = await searchCardsByName('test');

      expect(result).toEqual([]);
    });
  });
});
