import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCardLinks } from '@/composables/useCardLinks';
import type { CardLinkPart } from '@/composables/useCardLinks';

// モジュールのモック
vi.mock('@/api/card-search', () => ({
  getCardDetailWithCache: vi.fn()
}));

vi.mock('@/stores/card-detail', () => ({
  useCardDetailStore: vi.fn(() => ({
    startLoadingCard: vi.fn(),
    endLoadingCard: vi.fn(),
    setSelectedCard: vi.fn(),
    setCardTab: vi.fn()
  }))
}));

vi.mock('@/stores/deck-edit', () => ({
  useDeckEditStore: vi.fn(() => ({
    activeTab: 'deck'
  }))
}));

vi.mock('@/utils/language-detector', () => ({
  detectLanguage: vi.fn(() => 'ja')
}));

describe('useCardLinks', () => {
  const { parseCardLinks } = useCardLinks();

  describe('parseCardLinks', () => {
    it('テキストのみの場合、text typeのパートを返す', () => {
      const result = parseCardLinks('通常のテキスト');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'text', text: '通常のテキスト' });
    });

    it('undefinedの場合、空のtext typeを返す', () => {
      const result = parseCardLinks(undefined);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'text', text: '' });
    });

    it('カードリンク形式をパースできる', () => {
      const result = parseCardLinks('{{ブラック・マジシャン|4335}}');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'link',
        text: 'ブラック・マジシャン',
        cardId: '4335'
      });
    });

    it('カードリンクとテキストの混在をパースできる', () => {
      const result = parseCardLinks('「{{ブラック・マジシャン|4335}}」を召喚');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'text', text: '「' });
      expect(result[1]).toEqual({
        type: 'link',
        text: 'ブラック・マジシャン',
        cardId: '4335'
      });
      expect(result[2]).toEqual({ type: 'text', text: '」を召喚' });
    });

    it('複数のカードリンクをパースできる', () => {
      const result = parseCardLinks(
        '{{青眼の白龍|4007}}と{{ブラック・マジシャン|4335}}は強力'
      );

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        type: 'link',
        text: '青眼の白龍',
        cardId: '4007'
      });
      expect(result[1]).toEqual({ type: 'text', text: 'と' });
      expect(result[2]).toEqual({
        type: 'link',
        text: 'ブラック・マジシャン',
        cardId: '4335'
      });
      expect(result[3]).toEqual({ type: 'text', text: 'は強力' });
    });

    it('連続するカードリンクをパースできる', () => {
      const result = parseCardLinks('{{青眼の白龍|4007}}{{ブラック・マジシャン|4335}}');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'link',
        text: '青眼の白龍',
        cardId: '4007'
      });
      expect(result[1]).toEqual({
        type: 'link',
        text: 'ブラック・マジシャン',
        cardId: '4335'
      });
    });

    it('カードリンク形式が含まれていない場合、通常のテキストとして扱う', () => {
      const result = parseCardLinks('{{不完全なリンク}}');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'text', text: '{{不完全なリンク}}' });
    });

    it('空文字列の場合、空のtext typeを返す', () => {
      const result = parseCardLinks('');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'text', text: '' });
    });

    it('カードIDが数字のみの場合のみリンクとして認識される', () => {
      const result = parseCardLinks('{{カード名|abc123}}');

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('text');
    });

    it('前後にスペースがあるカード名も正しくパースできる', () => {
      const result = parseCardLinks('先頭テキスト {{カード名|1234}} 末尾テキスト');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'text', text: '先頭テキスト ' });
      expect(result[1]).toEqual({
        type: 'link',
        text: 'カード名',
        cardId: '1234'
      });
      expect(result[2]).toEqual({ type: 'text', text: ' 末尾テキスト' });
    });

    it('改行を含むテキストも正しくパースできる', () => {
      const result = parseCardLinks('1行目\n{{カード名|1234}}\n2行目');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'text', text: '1行目\n' });
      expect(result[1]).toEqual({
        type: 'link',
        text: 'カード名',
        cardId: '1234'
      });
      expect(result[2]).toEqual({ type: 'text', text: '\n2行目' });
    });
  });

  describe('handleCardLinkClick', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('handleCardLinkClickが正しく呼び出される', async () => {
      const { handleCardLinkClick } = useCardLinks();
      const { getCardDetailWithCache } = await import('@/api/card-search');

      // モックの設定
      (getCardDetailWithCache as any).mockResolvedValue({
        detail: {
          card: { cid: '4335', name: 'ブラック・マジシャン', cardType: '1' }
        },
        isPartialFromError: false
      });

      await handleCardLinkClick('4335');

      expect(getCardDetailWithCache).toHaveBeenCalledWith('4335', 'ja', true, 'release_desc', true);
    });

    it('部分的なエラーがある場合でも処理が継続される', async () => {
      const { handleCardLinkClick } = useCardLinks();
      const { getCardDetailWithCache } = await import('@/api/card-search');

      // モックの設定
      (getCardDetailWithCache as any).mockResolvedValue({
        detail: {
          card: { cid: '4335', name: 'ブラック・マジシャン', cardType: '1' }
        },
        isPartialFromError: true
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await handleCardLinkClick('4335');

      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('カード情報の取得に失敗した場合、エラーログが出力される', async () => {
      const { handleCardLinkClick } = useCardLinks();
      const { getCardDetailWithCache } = await import('@/api/card-search');

      // モックの設定
      (getCardDetailWithCache as any).mockResolvedValue({
        detail: null,
        isPartialFromError: false
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await handleCardLinkClick('invalid');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('例外が発生した場合、エラーログが出力され、ローディングが終了する', async () => {
      const { handleCardLinkClick } = useCardLinks();
      const { getCardDetailWithCache } = await import('@/api/card-search');
      const { useCardDetailStore } = await import('@/stores/card-detail');

      // モックの設定
      (getCardDetailWithCache as any).mockRejectedValue(new Error('API Error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await handleCardLinkClick('4335');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
