import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sessionManager, getCgid } from '../session';

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
