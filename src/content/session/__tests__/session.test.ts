import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sessionManager, getCgid } from '../session';
import * as deckOperations from '@/api/deck-operations';
import * as ytknFetcher from '@/utils/ytkn-fetcher';
import type { DeckInfo } from '@/types/deck';

/**
 * SessionManager のテスト
 */
describe('SessionManager', () => {
  beforeEach(() => {
    // キャッシュをリセット
    sessionManager['cgid'] = null;
    // DOMをクリア
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCgid', () => {
    it('フッターリンクからcgidを取得できる', async () => {
      const mockCgid = 'a'.repeat(32);
      document.body.innerHTML = `
        <a href="https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=${mockCgid}">マイデッキ</a>
      `;

      const result = await sessionManager.getCgid();

      expect(result).toBe(mockCgid);
    });

    it('任意のcgidリンクからcgidを取得できる', async () => {
      const mockCgid = 'b'.repeat(32);
      document.body.innerHTML = `
        <a href="https://example.com/page?cgid=${mockCgid}">リンク</a>
      `;

      const result = await sessionManager.getCgid();

      expect(result).toBe(mockCgid);
    });

    it('キャッシュされたcgidを返す', async () => {
      const mockCgid = 'c'.repeat(32);
      sessionManager['cgid'] = mockCgid;

      const result = await sessionManager.getCgid();

      expect(result).toBe(mockCgid);
    });

    it('cgidが見つからない場合はエラーをスローする', async () => {
      document.body.innerHTML = '<a href="https://example.com">リンク</a>';

      await expect(sessionManager.getCgid()).rejects.toThrow('cgid not found in page');
    });

    it('リンクがない場合はエラーをスローする', async () => {
      document.body.innerHTML = '';

      await expect(sessionManager.getCgid()).rejects.toThrow('cgid not found in page');
    });
  });

  describe('isLoggedIn', () => {
    it('フッターリンクからcgidを取得できる場合はtrueを返す', () => {
      const mockCgid = 'e'.repeat(32);
      document.body.innerHTML = `
        <a href="https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=${mockCgid}">マイデッキ</a>
      `;

      const result = sessionManager.isLoggedIn();

      expect(result).toBe(true);
    });

    it('任意のcgidリンクからcgidを取得できる場合はtrueを返す', () => {
      const mockCgid = 'f'.repeat(32);
      document.body.innerHTML = `
        <a href="https://example.com/page?cgid=${mockCgid}">リンク</a>
      `;

      const result = sessionManager.isLoggedIn();

      expect(result).toBe(true);
    });

    it('cgidリンクがない場合はfalseを返す', () => {
      document.body.innerHTML = '<a href="https://example.com">リンク</a>';

      const result = sessionManager.isLoggedIn();

      expect(result).toBe(false);
    });

    it('リンクがない場合はfalseを返す', () => {
      document.body.innerHTML = '';

      const result = sessionManager.isLoggedIn();

      expect(result).toBe(false);
    });
  });

  describe('saveDeck', () => {
    const mockCgid = 'a'.repeat(32);
    const deckData: DeckInfo = {
      dno: 255,
      name: 'テストデッキ',
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      category: [],
      tags: []
    };

    beforeEach(() => {
      document.body.innerHTML = `
        <a href="https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=${mockCgid}">マイデッキ</a>
      `;
      window.ygoNextPreloadedYtkn = null;
      window.ygoNextPreloadedYtknPromise = null;
    });

    it('先読みytknで失敗（screen transition error）した場合、通常取得したytknで再試行して成功する', async () => {
      window.ygoNextPreloadedYtkn = 'stale-preloaded-ytkn';

      const saveDeckInternalSpy = vi.spyOn(deckOperations, 'saveDeckInternal')
        .mockResolvedValueOnce({ success: false, error: ['screen transition error'] })
        .mockResolvedValueOnce({ success: true });
      vi.spyOn(ytknFetcher, 'fetchYtknFromEditForm').mockResolvedValue('fresh-ytkn');

      const result = await sessionManager.saveDeck(255, deckData);

      expect(result).toEqual({ success: true });
      expect(saveDeckInternalSpy).toHaveBeenCalledTimes(2);
      expect(saveDeckInternalSpy).toHaveBeenNthCalledWith(1, mockCgid, 255, deckData, 'stale-preloaded-ytkn');
      expect(saveDeckInternalSpy).toHaveBeenNthCalledWith(2, mockCgid, 255, deckData, 'fresh-ytkn');
    });

    it('先読みytknを使用していない場合、screen transition errorが出ても再試行しない', async () => {
      // 先読みなし: 通常取得したytknで最初から保存
      const saveDeckInternalSpy = vi.spyOn(deckOperations, 'saveDeckInternal')
        .mockResolvedValueOnce({ success: false, error: ['screen transition error'] });
      vi.spyOn(ytknFetcher, 'fetchYtknFromEditForm').mockResolvedValue('normal-ytkn');

      const result = await sessionManager.saveDeck(255, deckData);

      expect(result).toEqual({ success: false, error: ['screen transition error'] });
      expect(saveDeckInternalSpy).toHaveBeenCalledTimes(1);
    });

    it('先読みytknが原因ではないエラーの場合は再試行しない', async () => {
      window.ygoNextPreloadedYtkn = 'preloaded-ytkn';

      const saveDeckInternalSpy = vi.spyOn(deckOperations, 'saveDeckInternal')
        .mockResolvedValueOnce({ success: false, error: ['デッキ名が不正です'] });

      const result = await sessionManager.saveDeck(255, deckData);

      expect(result).toEqual({ success: false, error: ['デッキ名が不正です'] });
      expect(saveDeckInternalSpy).toHaveBeenCalledTimes(1);
    });

    it('再試行用ytknの取得に失敗した場合は元の失敗結果を返す', async () => {
      window.ygoNextPreloadedYtkn = 'stale-preloaded-ytkn';

      const saveDeckInternalSpy = vi.spyOn(deckOperations, 'saveDeckInternal')
        .mockResolvedValueOnce({ success: false, error: ['screen transition error'] });
      vi.spyOn(ytknFetcher, 'fetchYtknFromEditForm').mockResolvedValue(null);

      const result = await sessionManager.saveDeck(255, deckData);

      expect(result).toEqual({ success: false, error: ['screen transition error'] });
      expect(saveDeckInternalSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('後方互換性', () => {
    it('getCgid関数がsessionManager経由で動作する', async () => {
      const mockCgid = 'd'.repeat(32);
      document.body.innerHTML = `
        <a href="https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=${mockCgid}">マイデッキ</a>
      `;

      const result = await getCgid();

      expect(result).toBe(mockCgid);
    });

    it('getCgid関数はエラー時にnullを返す', async () => {
      document.body.innerHTML = '';

      const result = await getCgid();

      expect(result).toBeNull();
    });
  });
});
