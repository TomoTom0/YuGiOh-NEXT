/**
 * issueDeckCodeInternal() のテスト
 *
 * PR #82で追加されたデッキコード発行機能のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { issueDeckCodeInternal } from '@/api/deck-operations';
import axios from 'axios';
import * as deckDetailParser from '@/content/parser/deck-detail-parser';
import * as pageDetector from '@/utils/page-detector';
import * as urlBuilder from '@/utils/url-builder';
import * as errorHandler from '@/utils/error-handler';

vi.mock('axios');
vi.mock('@/content/parser/deck-detail-parser');
vi.mock('@/utils/page-detector');
vi.mock('@/utils/url-builder');
vi.mock('@/utils/error-handler');

describe('issueDeckCodeInternal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック設定
    vi.mocked(pageDetector.detectCardGameType).mockReturnValue('ygo');
    vi.mocked(urlBuilder.buildApiUrl).mockImplementation((endpoint, gameType, locale, noLocale) => {
      return `https://www.db.yugioh-card.com/yugiohdb/${endpoint}`;
    });
    vi.mocked(deckDetailParser.extractIssuedDeckCode).mockReturnValue('');
    vi.mocked(errorHandler.handleError).mockImplementation(() => {});
    vi.mocked(errorHandler.handleSuccess).mockImplementation(() => {});
  });

  it('デッキコードが正常に発行される [covers:issue_code.extract_non_blank_returns_code]', async () => {
    const mockDeckCode = ' ABC123DEF456 ';

    // ope=13（発行リクエスト）が正常に完了
    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: '' });

    // ope=1（表示ページ取得）でHTMLを返す
    const mockHtml = '<html><script>navigator.clipboard.writeText("ABC123DEF456");</script></html>';
    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: mockHtml });

    // extractIssuedDeckCodeがデッキコードを返す
    vi.mocked(deckDetailParser.extractIssuedDeckCode).mockReturnValueOnce(mockDeckCode);

    const result = await issueDeckCodeInternal('user123', 100);

    expect(result).toBe(mockDeckCode);
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  it('extractIssuedDeckCodeが空文字列を返す場合はエラーハンドリング [covers:issue_code.extract_blank_returns_empty]', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: '' });
    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: '<html></html>' });

    // extractIssuedDeckCodeが空文字列を返す
    vi.mocked(deckDetailParser.extractIssuedDeckCode).mockReturnValueOnce('');

    const result = await issueDeckCodeInternal('user123', 100);

    expect(result).toBe('');
    expect(errorHandler.handleError).toHaveBeenCalled();
  });

  it('extractIssuedDeckCodeが空白のみの文字列を返す場合はエラーハンドリング', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: '' });
    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: '<html></html>' });

    // extractIssuedDeckCodeが空白のみを返す
    vi.mocked(deckDetailParser.extractIssuedDeckCode).mockReturnValueOnce('   ');

    const result = await issueDeckCodeInternal('user123', 100);

    expect(result).toBe('');
    expect(errorHandler.handleError).toHaveBeenCalled();
  });

  it('ope=13リクエストが失敗する場合はエラーをキャッチ [covers:issue_code.catch_returns_empty]', async () => {
    const error = new Error('Network error');
    vi.mocked(axios.get).mockRejectedValueOnce(error);

    const result = await issueDeckCodeInternal('user123', 100);

    expect(result).toBe('');
    expect(errorHandler.handleError).toHaveBeenCalledWith(
      '[issueDeckCodeInternal]',
      'デッキコードの発行に失敗しました',
      error,
      { showToast: true }
    );
  });

  it('ope=1リクエストが失敗する場合はエラーをキャッチ', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: '' });

    const error = new Error('Network error on display');
    vi.mocked(axios.get).mockRejectedValueOnce(error);

    const result = await issueDeckCodeInternal('user123', 100);

    expect(result).toBe('');
    expect(errorHandler.handleError).toHaveBeenCalledWith(
      '[issueDeckCodeInternal]',
      'デッキコードの発行に失敗しました',
      error,
      { showToast: true }
    );
  });

  it('正しいパラメータでAPIが呼び出される [covers:issue_code.issue_url_no_locale] [covers:issue_code.display_url_with_locale]', async () => {
    const mockDeckCode = 'XYZ789';
    const cgid = 'user456';
    const dno = 200;

    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: '' });
    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200, data: '<html></html>' });
    vi.mocked(deckDetailParser.extractIssuedDeckCode).mockReturnValueOnce(mockDeckCode);

    await issueDeckCodeInternal(cgid, dno);

    expect(urlBuilder.buildApiUrl).toHaveBeenCalledWith(
      expect.stringContaining('member_deck.action'),
      'ygo',
      undefined,
      true
    );
    expect(urlBuilder.buildApiUrl).toHaveBeenCalledWith(
      expect.stringContaining('member_deck.action?ope=1&cgid=user456&dno=200'),
      'ygo'
    );

    // ope=13呼び出しを確認
    const firstCall = vi.mocked(axios.get).mock.calls[0];
    expect(firstCall[0]).toContain('ope=13');
    expect(firstCall[0]).toContain(`cgid=${cgid}`);
    expect(firstCall[0]).toContain(`dno=${dno}`);
    expect(firstCall[1]).toEqual({ withCredentials: true });

    // ope=1呼び出しを確認
    const secondCall = vi.mocked(axios.get).mock.calls[1];
    expect(secondCall[0]).toContain('ope=1');
    expect(secondCall[0]).toContain(`cgid=${cgid}`);
    expect(secondCall[0]).toContain(`dno=${dno}`);
    expect(secondCall[1]).toEqual({ withCredentials: true });
  });
});
