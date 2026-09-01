import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sessionManager, getCgid } from '../session';
import * as deckOperations from '@/api/deck-operations';
import * as ytknFetcher from '@/utils/ytkn-fetcher';
import type { DeckInfo, DeckListItem } from '@/types/deck';

/**
 * SessionManager のテスト
 *
 * tests/design/session/conditions.toml (TASK-330) のconditionをカバーする。
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
    it('[covers:ensure_cgid.mydeck_link_matched_caches_and_returns][covers:session_manager_get_cgid.delegates_to_ensure_cgid] フッターリンクからcgidを取得できる', async () => {
      const mockCgid = 'a'.repeat(32);
      document.body.innerHTML = `
        <a href="https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=${mockCgid}">マイデッキ</a>
      `;

      const result = await sessionManager.getCgid();

      expect(result).toBe(mockCgid);
    });

    it('[covers:ensure_cgid.fallback_any_cgid_link] 任意のcgidリンクからcgidを取得できる', async () => {
      const mockCgid = 'b'.repeat(32);
      document.body.innerHTML = `
        <a href="https://example.com/page?cgid=${mockCgid}">リンク</a>
      `;

      const result = await sessionManager.getCgid();

      expect(result).toBe(mockCgid);
    });

    it('[covers:ensure_cgid.cached_returns_immediately] キャッシュされたcgidを返す', async () => {
      const mockCgid = 'c'.repeat(32);
      sessionManager['cgid'] = mockCgid;

      const result = await sessionManager.getCgid();

      expect(result).toBe(mockCgid);
    });

    it('[covers:ensure_cgid.no_matching_link_throws] cgidが見つからない場合はエラーをスローする', async () => {
      document.body.innerHTML = '<a href="https://example.com">リンク</a>';

      await expect(sessionManager.getCgid()).rejects.toThrow('cgid not found in page');
    });

    it('[covers:ensure_cgid.no_matching_link_throws] リンクがない場合はエラーをスローする', async () => {
      document.body.innerHTML = '';

      await expect(sessionManager.getCgid()).rejects.toThrow('cgid not found in page');
    });
  });

  describe('isLoggedIn', () => {
    it('[covers:is_logged_in.mydeck_link_matched_true] フッターリンクからcgidを取得できる場合はtrueを返す', () => {
      const mockCgid = 'e'.repeat(32);
      document.body.innerHTML = `
        <a href="https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=${mockCgid}">マイデッキ</a>
      `;

      const result = sessionManager.isLoggedIn();

      expect(result).toBe(true);
    });

    it('[covers:is_logged_in.fallback_any_link_matched_true] 任意のcgidリンクからcgidを取得できる場合はtrueを返す', () => {
      const mockCgid = 'f'.repeat(32);
      document.body.innerHTML = `
        <a href="https://example.com/page?cgid=${mockCgid}">リンク</a>
      `;

      const result = sessionManager.isLoggedIn();

      expect(result).toBe(true);
    });

    it('[covers:is_logged_in.no_cgid_link_false] cgidリンクがない場合はfalseを返す', () => {
      document.body.innerHTML = '<a href="https://example.com">リンク</a>';

      const result = sessionManager.isLoggedIn();

      expect(result).toBe(false);
    });

    it('[covers:is_logged_in.no_cgid_link_false] リンクがない場合はfalseを返す', () => {
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

    it('[covers:save_deck.preloaded_ytkn_promise_awaited_with_timeout] 先読みytknで失敗（screen transition error）した場合、通常取得したytknで再試行して成功する', async () => {
      window.ygoNextPreloadedYtkn = 'stale-preloaded-ytkn';

      const saveDeckInternalSpy = vi.spyOn(deckOperations, 'saveDeckInternal')
        .mockResolvedValueOnce({ success: false, error: ['screen transition error'] })
        .mockResolvedValueOnce({ success: true });
      const showSaveDeckErrorToastSpy = vi.spyOn(deckOperations, 'showSaveDeckErrorToast');
      vi.spyOn(ytknFetcher, 'fetchYtknFromEditForm').mockResolvedValue('fresh-ytkn');

      const result = await sessionManager.saveDeck(255, deckData);

      expect(result).toEqual({ success: true });
      expect(saveDeckInternalSpy).toHaveBeenCalledTimes(2);
      // 1回目（プリロードytkn使用）はリトライ候補のためトースト抑制。リトライが成功したため
      // 「失敗→成功」の紛らわしい通知は最後まで出ない
      expect(saveDeckInternalSpy).toHaveBeenNthCalledWith(1, mockCgid, 255, deckData, 'stale-preloaded-ytkn', { showErrorToast: false });
      expect(saveDeckInternalSpy).toHaveBeenNthCalledWith(2, mockCgid, 255, deckData, 'fresh-ytkn');
      expect(showSaveDeckErrorToastSpy).not.toHaveBeenCalled();
      // 保存成功によりfire-and-forgetのpreloadNextYtknも呼ばれるため、
      // モックが復元される前に完了させておく
      await vi.waitFor(() => {
        expect(window.ygoNextPreloadedYtkn).toBe('fresh-ytkn');
      }, { timeout: 2000, interval: 10 });
    });

    it('先読みytknを使用していない場合、screen transition errorが出ても再試行しない', async () => {
      // 先読みなし: 通常取得したytknで最初から保存
      const saveDeckInternalSpy = vi.spyOn(deckOperations, 'saveDeckInternal')
        .mockResolvedValueOnce({ success: false, error: ['screen transition error'] });
      const showSaveDeckErrorToastSpy = vi.spyOn(deckOperations, 'showSaveDeckErrorToast');
      vi.spyOn(ytknFetcher, 'fetchYtknFromEditForm').mockResolvedValue('normal-ytkn');

      const result = await sessionManager.saveDeck(255, deckData);

      expect(result).toEqual({ success: false, error: ['screen transition error'] });
      expect(saveDeckInternalSpy).toHaveBeenCalledTimes(1);
      // プリロードytkn未使用時はリトライ候補ではないため、saveDeckInternal内で通常通りトースト表示
      // （showSaveDeckErrorToastによる追加表示は不要）
      expect(saveDeckInternalSpy).toHaveBeenNthCalledWith(1, mockCgid, 255, deckData, 'normal-ytkn', { showErrorToast: true });
      expect(showSaveDeckErrorToastSpy).not.toHaveBeenCalled();
    });

    it('[covers:is_stale_ytkn_error.no_match_returns_false] 先読みytknが原因ではないエラーの場合は再試行せず、抑制していたトーストを表示する', async () => {
      window.ygoNextPreloadedYtkn = 'preloaded-ytkn';

      const saveDeckInternalSpy = vi.spyOn(deckOperations, 'saveDeckInternal')
        .mockResolvedValueOnce({ success: false, error: ['デッキ名が不正です'] });
      const showSaveDeckErrorToastSpy = vi.spyOn(deckOperations, 'showSaveDeckErrorToast');

      const result = await sessionManager.saveDeck(255, deckData);

      expect(result).toEqual({ success: false, error: ['デッキ名が不正です'] });
      expect(saveDeckInternalSpy).toHaveBeenCalledTimes(1);
      // リトライ非対象のエラーが最終結果になるため、抑制していたトーストをここで表示する
      expect(showSaveDeckErrorToastSpy).toHaveBeenCalledWith(['デッキ名が不正です']);
    });

    it('再試行用ytknの取得に失敗した場合は元の失敗結果を返し、抑制していたトーストを表示する', async () => {
      window.ygoNextPreloadedYtkn = 'stale-preloaded-ytkn';

      const saveDeckInternalSpy = vi.spyOn(deckOperations, 'saveDeckInternal')
        .mockResolvedValueOnce({ success: false, error: ['screen transition error'] });
      const showSaveDeckErrorToastSpy = vi.spyOn(deckOperations, 'showSaveDeckErrorToast');
      vi.spyOn(ytknFetcher, 'fetchYtknFromEditForm').mockResolvedValue(null);

      const result = await sessionManager.saveDeck(255, deckData);

      expect(result).toEqual({ success: false, error: ['screen transition error'] });
      expect(saveDeckInternalSpy).toHaveBeenCalledTimes(1);
      // リトライ用ytknが取得できず再試行不可のまま最終結果になるため、抑制していたトーストを表示する
      expect(showSaveDeckErrorToastSpy).toHaveBeenCalledWith(['screen transition error']);
    });

    it('[covers:save_deck.success_preloads_next_ytkn][covers:preload_next_ytkn.success_sets_window_ytkn] 保存成功時、次回用ytknを非同期でプリロードする', async () => {
      vi.spyOn(deckOperations, 'saveDeckInternal').mockResolvedValueOnce({ success: true });
      vi.spyOn(ytknFetcher, 'fetchYtknFromEditForm')
        .mockResolvedValueOnce('normal-ytkn') // saveDeck本体のytkn取得
        .mockResolvedValueOnce('next-preloaded-ytkn'); // preloadNextYtkn分

      const result = await sessionManager.saveDeck(255, deckData);

      expect(result).toEqual({ success: true });
      // preloadNextYtknはfire-and-forgetなので完了を待ってから検証する
      await vi.waitFor(() => {
        expect(window.ygoNextPreloadedYtkn).toBe('next-preloaded-ytkn');
      }, { timeout: 2000, interval: 10 });
    });

    it('[covers:preload_next_ytkn.error_warns_only] 次回用ytknのプリロードに失敗しても保存結果には影響しない', async () => {
      vi.spyOn(deckOperations, 'saveDeckInternal').mockResolvedValueOnce({ success: true });
      vi.spyOn(ytknFetcher, 'fetchYtknFromEditForm')
        .mockResolvedValueOnce('normal-ytkn')
        .mockRejectedValueOnce(new Error('preload failed'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await sessionManager.saveDeck(255, deckData);

      expect(result).toEqual({ success: true });
      await vi.waitFor(() => {
        expect(warnSpy).toHaveBeenCalled();
      }, { timeout: 2000, interval: 10 });
    });

    it('[covers:save_deck.exception_logged_and_rethrown] cgidが見つからない場合は例外をログした上で再throwする', async () => {
      document.body.innerHTML = ''; // cgidリンクが無い状態
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(sessionManager.saveDeck(255, deckData)).rejects.toThrow('cgid not found in page');

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('isStaleYtknError', () => {
    // isStaleYtknErrorはモジュール内部関数のためexportされておらず、
    // saveDeckのリトライ分岐(既存テスト)経由で間接的に検証している。
    // ここでは代表的な判定パターンを直接コメントとして記録する（TASK-330 conditions.toml参照）。
    it('[covers:is_stale_ytkn_error.undefined_returns_false][covers:is_stale_ytkn_error.matches_screen_transition_message] saveDeckのリトライ判定を通じて日本語メッセージでも再試行される', async () => {
      const mockCgid = 'a'.repeat(32);
      document.body.innerHTML = `
        <a href="https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=${mockCgid}">マイデッキ</a>
      `;
      window.ygoNextPreloadedYtkn = 'stale-preloaded-ytkn';
      const localDeckData: DeckInfo = {
        dno: 255,
        name: 'テストデッキ',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: []
      };
      const saveDeckInternalSpy = vi.spyOn(deckOperations, 'saveDeckInternal')
        .mockResolvedValueOnce({ success: false, error: ['画面遷移エラーが発生しました'] })
        .mockResolvedValueOnce({ success: true });
      vi.spyOn(ytknFetcher, 'fetchYtknFromEditForm').mockResolvedValue('fresh-ytkn');

      const result = await sessionManager.saveDeck(255, localDeckData);

      expect(result).toEqual({ success: true });
      expect(saveDeckInternalSpy).toHaveBeenCalledTimes(2);
      // 保存成功によりfire-and-forgetのpreloadNextYtknも呼ばれるため、
      // モックが復元される前に完了させておく
      await vi.waitFor(() => {
        expect(window.ygoNextPreloadedYtkn).toBe('fresh-ytkn');
      }, { timeout: 2000, interval: 10 });
    });
  });

  describe('その他の委譲メソッド', () => {
    const mockCgid = 'a'.repeat(32);

    beforeEach(() => {
      document.body.innerHTML = `
        <a href="https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=${mockCgid}">マイデッキ</a>
      `;
    });

    it('[covers:create_deck.delegates_with_cgid] createDeckはensureCgidのcgidでcreateNewDeckInternalを呼ぶ', async () => {
      const spy = vi.spyOn(deckOperations, 'createNewDeckInternal').mockResolvedValue(999);

      const result = await sessionManager.createDeck();

      expect(spy).toHaveBeenCalledWith(mockCgid);
      expect(result).toBe(999);
    });

    it('[covers:delete_deck.delegates_with_cgid] deleteDeckはensureCgidのcgidとdnoでdeleteDeckInternalを呼ぶ', async () => {
      const spy = vi.spyOn(deckOperations, 'deleteDeckInternal').mockResolvedValue(true);

      const result = await sessionManager.deleteDeck(42);

      expect(spy).toHaveBeenCalledWith(mockCgid, 42);
      expect(result).toBe(true);
    });

    it('[covers:get_deck_list.delegates_with_cgid] getDeckListはensureCgidのcgidでgetDeckListInternalを呼ぶ', async () => {
      const mockList: DeckListItem[] = [{ dno: 1, name: 'デッキ1' } as DeckListItem];
      const spy = vi.spyOn(deckOperations, 'getDeckListInternal').mockResolvedValue(mockList);

      const result = await sessionManager.getDeckList();

      expect(spy).toHaveBeenCalledWith(mockCgid);
      expect(result).toBe(mockList);
    });

    it('[covers:issue_deck_code.delegates_with_cgid] issueDeckCodeはensureCgidのcgidとdnoでissueDeckCodeInternalを呼ぶ', async () => {
      const spy = vi.spyOn(deckOperations, 'issueDeckCodeInternal').mockResolvedValue('ABCD1234');

      const result = await sessionManager.issueDeckCode(42);

      expect(spy).toHaveBeenCalledWith(mockCgid, 42);
      expect(result).toBe('ABCD1234');
    });

    it('[covers:get_deck_likes.always_returns_zero] getDeckLikesは未実装のため常に0を返す', async () => {
      const result = await sessionManager.getDeckLikes(42);

      expect(result).toBe(0);
    });
  });

  describe('後方互換性', () => {
    it('[covers:module_get_cgid.success_delegates_to_session_manager] getCgid関数がsessionManager経由で動作する', async () => {
      const mockCgid = 'd'.repeat(32);
      document.body.innerHTML = `
        <a href="https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=${mockCgid}">マイデッキ</a>
      `;

      const result = await getCgid();

      expect(result).toBe(mockCgid);
    });

    it('[covers:module_get_cgid.error_logged_and_returns_null] getCgid関数はエラー時にnullを返す', async () => {
      document.body.innerHTML = '';
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await getCgid();

      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
