/**
 * ytkn-Fetcher 統合テスト
 *
 * ytkn-fetcher.ts の複数ページからのytkn取得と
 * API連携の完全な動作を検証
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchYtknFromEditForm,
  fetchYtknFromDeckDisplay,
  fetchYtknFromDeckList,
} from '@/utils/ytkn-fetcher';
import axios from 'axios';
import * as urlBuilder from '@/utils/url-builder';

// モック化
vi.mock('axios');
vi.mock('@/utils/url-builder');

describe('ytkn-Fetcher Integration Tests', () => {
  const mockCgid = 'test_user_123';
  const mockDno = 100;
  const mockYtkn = 'csrf_token_abc123def456';
  const gameType = 'ygo' as const;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(urlBuilder.buildApiUrl).mockImplementation((path) => {
      return `https://www.db.yugioh-card.com/yugiohdb/${path}`;
    });
  });

  describe('fetchYtknFromEditForm - デッキ編集フォームからのytkn取得', () => {
    it('編集フォームからytknが正常に取得される', async () => {
      const mockHtml = `
        <html>
          <body>
            <form>
              <input id="ytkn" type="hidden" value="${mockYtkn}" />
              <input name="cgid" value="${mockCgid}" />
              <input name="dno" value="${mockDno}" />
            </form>
          </body>
        </html>
      `;

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      const result = await fetchYtknFromEditForm(mockCgid, mockDno, gameType);

      expect(result).toBe(mockYtkn);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('ope=2'),
        { withCredentials: true }
      );
    });

    it('ytkn要素が見つからない場合はnullを返す', async () => {
      const mockHtml = '<html><body><form></form></body></html>';

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      const result = await fetchYtknFromEditForm(mockCgid, mockDno, gameType);

      expect(result).toBeNull();
    });

    it('API失敗時はnullを返す', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

      const result = await fetchYtknFromEditForm(mockCgid, mockDno, gameType);

      expect(result).toBeNull();
    });

    it('HTMLパース失敗時はnullを返す', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: 'invalid html',
      });

      const result = await fetchYtknFromEditForm(mockCgid, mockDno, gameType);

      // parseFromString は常にDocumentを返すため、ytkn要素が見つからない
      expect(result).toBeNull();
    });

    it('正しいパラメータでAPIが呼び出される', async () => {
      const mockHtml = `<html><body><input id="ytkn" value="${mockYtkn}" /></body></html>`;

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      await fetchYtknFromEditForm(mockCgid, mockDno, gameType);

      const callUrl = vi.mocked(axios.get).mock.calls[0][0] as string;
      expect(callUrl).toContain('ope=2');
      expect(callUrl).toContain(`cgid=${mockCgid}`);
      expect(callUrl).toContain(`dno=${mockDno}`);
      expect(callUrl).toContain('wname=MemberDeck');
    });
  });

  describe('fetchYtknFromDeckDisplay - デッキ表示ページからのytkn取得', () => {
    it('表示ページからytknが正常に取得される', async () => {
      const mockHtml = `
        <html>
          <body>
            <form>
              <input id="ytkn" type="hidden" value="${mockYtkn}" />
              <div class="deck-info">
                <h1>デッキ名</h1>
              </div>
            </form>
          </body>
        </html>
      `;

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      const result = await fetchYtknFromDeckDisplay(mockCgid, mockDno, gameType);

      expect(result).toBe(mockYtkn);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('ope=1'),
        { withCredentials: true }
      );
    });

    it('ytkn要素が見つからない場合はnullを返す', async () => {
      const mockHtml = '<html><body></body></html>';

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      const result = await fetchYtknFromDeckDisplay(mockCgid, mockDno, gameType);

      expect(result).toBeNull();
    });

    it('API失敗時はnullを返す', async () => {
      vi.mocked(axios.get).mockRejectedValue(
        new Error('Connection timeout')
      );

      const result = await fetchYtknFromDeckDisplay(mockCgid, mockDno, gameType);

      expect(result).toBeNull();
    });

    it('正しいパラメータでAPIが呼び出される', async () => {
      const mockHtml = `<html><body><input id="ytkn" value="${mockYtkn}" /></body></html>`;

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      await fetchYtknFromDeckDisplay(mockCgid, mockDno, gameType);

      const callUrl = vi.mocked(axios.get).mock.calls[0][0] as string;
      expect(callUrl).toContain('ope=1');
      expect(callUrl).toContain(`cgid=${mockCgid}`);
      expect(callUrl).toContain(`dno=${mockDno}`);
    });
  });

  describe('fetchYtknFromDeckList - デッキ一覧ページからのytkn取得', () => {
    it('一覧ページへのAPIが正常に呼び出される', async () => {
      const mockHtml = '<html><body></body></html>';

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      await fetchYtknFromDeckList(mockCgid, gameType);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('ope=4'),
        { withCredentials: true }
      );
    });

    it('ytkn要素が見つからない場合はnullを返す', async () => {
      const mockHtml = '<html><body><table></table></body></html>';

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      const result = await fetchYtknFromDeckList(mockCgid, gameType);

      expect(result).toBeNull();
    });

    it('API失敗時はnullを返す', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Server error'));

      const result = await fetchYtknFromDeckList(mockCgid, gameType);

      expect(result).toBeNull();
    });

    it('正しいパラメータでAPIが呼び出される', async () => {
      const mockHtml = `<html><body><input id="ytkn" value="${mockYtkn}" /></body></html>`;

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      await fetchYtknFromDeckList(mockCgid, gameType);

      const callUrl = vi.mocked(axios.get).mock.calls[0][0] as string;
      expect(callUrl).toContain('ope=4');
      expect(callUrl).toContain(`cgid=${mockCgid}`);
      expect(callUrl).toContain('wname=MemberDeck');
    });
  });

  describe('複合シナリオテスト - 複数ページからのytkn取得', () => {
    it('複数ページへのAPI呼び出しが正常に実行される', async () => {
      const mockHtml = '<html><body></body></html>';

      // 1. デッキ一覧API呼び出し
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: mockHtml,
      });

      await fetchYtknFromDeckList(mockCgid, gameType);

      // 2. デッキ表示API呼び出し
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: mockHtml,
      });

      await fetchYtknFromDeckDisplay(mockCgid, mockDno, gameType);

      // 3. デッキ編集API呼び出し
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: mockHtml,
      });

      await fetchYtknFromEditForm(mockCgid, mockDno, gameType);

      // 3つのAPI呼び出しが発生したことを確認
      expect(vi.mocked(axios.get).mock.calls.length).toBe(3);
    });

    it('複数デッキのytkn取得', async () => {
      const deckIds = [100, 101, 102];
      const mockHtml = `<html><body><input id="ytkn" value="${mockYtkn}" /></body></html>`;

      for (const dno of deckIds) {
        vi.mocked(axios.get).mockResolvedValueOnce({
          status: 200,
          data: mockHtml,
        });

        const result = await fetchYtknFromDeckDisplay(mockCgid, dno, gameType);
        expect(result).toBe(mockYtkn);
      }

      // 各デッキに対して3回のAPI呼び出し
      expect(vi.mocked(axios.get).mock.calls.length).toBe(3);
    });
  });

  describe('エラーハンドリング - 信頼性テスト', () => {
    it('ネットワークエラー時の再試行可能性', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Timeout'));
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: `<html><body><input id="ytkn" value="${mockYtkn}" /></body></html>`,
      });

      const result1 = await fetchYtknFromEditForm(mockCgid, mockDno, gameType);
      expect(result1).toBeNull();

      const result2 = await fetchYtknFromEditForm(mockCgid, mockDno, gameType);
      expect(result2).toBe(mockYtkn);
    });

    it('複数API失敗時のグレースフルデグラデーション', async () => {
      // ope=4, ope=1, ope=2 全て失敗
      vi.mocked(axios.get).mockRejectedValue(new Error('Server error'));

      const result1 = await fetchYtknFromDeckList(mockCgid, gameType);
      const result2 = await fetchYtknFromDeckDisplay(mockCgid, mockDno, gameType);
      const result3 = await fetchYtknFromEditForm(mockCgid, mockDno, gameType);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it('部分的なHTML破損でもytkn抽出に成功', async () => {
      const damagedHtml = `
        <html>
          <body>
            <form>
              <!-- 破損したHTMLだが input#ytkn は存在 -->
              <div class="broken-div">
              <input id="ytkn" value="${mockYtkn}" />
            </body>
          </html>
      `;

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: damagedHtml,
      });

      const result = await fetchYtknFromEditForm(mockCgid, mockDno, gameType);
      expect(result).toBe(mockYtkn);
    });
  });

  describe('セッション管理統合テスト', () => {
    it('withCredentials=trueでCookie付きリクエストが送信される', async () => {
      const mockHtml = `<html><body><input id="ytkn" value="${mockYtkn}" /></body></html>`;

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      await fetchYtknFromEditForm(mockCgid, mockDno, gameType);

      expect(vi.mocked(axios.get).mock.calls[0][1]).toEqual({
        withCredentials: true,
      });
    });

    it('複数リクエストでセッション情報が保持される', async () => {
      const mockHtml = `<html><body><input id="ytkn" value="${mockYtkn}" /></body></html>`;

      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: mockHtml,
      });

      // 複数API呼び出し
      await fetchYtknFromDeckList(mockCgid, gameType);
      await fetchYtknFromDeckDisplay(mockCgid, mockDno, gameType);
      await fetchYtknFromEditForm(mockCgid, mockDno, gameType);

      // 全てwithCredentials=trueで実行
      vi.mocked(axios.get).mock.calls.forEach((call) => {
        expect(call[1]).toEqual({ withCredentials: true });
      });
    });
  });
});
