/**
 * ytkn-fetcher ユニットテスト
 *
 * tests/design/ytkn-fetcher/conditions.toml の各[[condition]]を検証する。
 * axios/DOMを完全にモック化した単体テスト。統合テストは
 * tests/combine/ytkn-fetcher/ytkn-fetch-integration.test.ts を参照。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchYtknFromEditForm,
  fetchYtknFromDeckDisplay,
  fetchYtknFromDeckList,
} from '@/utils/ytkn-fetcher';
import axios from 'axios';
import * as urlBuilder from '@/utils/url-builder';

vi.mock('axios');
vi.mock('@/utils/url-builder');

describe('ytkn-fetcher', () => {
  const cgid = 'test_cgid';
  const dno = 42;
  const gameType = 'ocg' as const;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urlBuilder.buildApiUrl).mockImplementation(
      (path, _gameType, _params, noLocale) => {
        return `https://www.db.yugioh-card.com/yugiohdb/${path}${noLocale ? '' : '?request_locale=ja'}`;
      }
    );
  });

  describe('fetchYtknFromEditForm', () => {
    it("[covers:fetch_ytkn_from_edit_form.success_returns_value] input#ytknのvalueを返し、ope=2/wname/cgid/dnoを含むURLでwithCredentials:trueで呼ばれる", async () => {
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: '<html><body><input id="ytkn" value="tok-1" /></body></html>',
      });

      const result = await fetchYtknFromEditForm(cgid, dno, gameType);

      expect(result).toBe('tok-1');
      const [calledUrl, calledOptions] = vi.mocked(axios.get).mock.calls[0];
      expect(calledUrl).toContain('ope=2');
      expect(calledUrl).toContain('wname=MemberDeck');
      expect(calledUrl).toContain(`cgid=${cgid}`);
      expect(calledUrl).toContain(`dno=${dno}`);
      expect(calledOptions).toEqual({ withCredentials: true });
    });

    it('[covers:fetch_ytkn_from_edit_form.not_found_returns_null] input#ytknが存在しない場合はnullを返す', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: '<html><body><form></form></body></html>',
      });

      const result = await fetchYtknFromEditForm(cgid, dno, gameType);

      expect(result).toBeNull();
    });

    it('[covers:fetch_ytkn_from_edit_form.type_guard_failure_returns_null] id=ytknがinput要素でない場合は型ガードに失敗しnullを返す', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: '<html><body><div id="ytkn">not-an-input</div></body></html>',
      });

      const result = await fetchYtknFromEditForm(cgid, dno, gameType);

      expect(result).toBeNull();
    });

    it("[covers:fetch_ytkn_from_edit_form.empty_string_value_not_coalesced] valueが空文字列の場合は''をそのまま返す(nullにならない)", async () => {
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: '<html><body><input id="ytkn" value="" /></body></html>',
      });

      const result = await fetchYtknFromEditForm(cgid, dno, gameType);

      expect(result).toBe('');
      expect(result).not.toBeNull();
    });

    it('[covers:fetch_ytkn_from_edit_form.axios_error_returns_null] axios.getがrejectした場合はconsole.errorを出しnullを返す', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

      const result = await fetchYtknFromEditForm(cgid, dno, gameType);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[fetchYtknFromEditForm] Failed to fetch ytkn:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('fetchYtknFromDeckDisplay', () => {
    it('[covers:fetch_ytkn_from_deck_display.success_returns_value] input#ytknのvalueを返し、ope=1を含むURLで呼ばれる', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: '<html><body><input id="ytkn" value="tok-2" /></body></html>',
      });

      const result = await fetchYtknFromDeckDisplay(cgid, dno, gameType);

      expect(result).toBe('tok-2');
      const [calledUrl, calledOptions] = vi.mocked(axios.get).mock.calls[0];
      expect(calledUrl).toContain('ope=1');
      expect(calledUrl).toContain(`cgid=${cgid}`);
      expect(calledUrl).toContain(`dno=${dno}`);
      expect(calledOptions).toEqual({ withCredentials: true });
    });

    it('[covers:fetch_ytkn_from_deck_display.not_found_returns_null] input#ytknが存在しない場合はnullを返す', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: '<html><body></body></html>',
      });

      const result = await fetchYtknFromDeckDisplay(cgid, dno, gameType);

      expect(result).toBeNull();
    });

    it('[covers:fetch_ytkn_from_deck_display.axios_error_returns_null] axios.getがrejectした場合はconsole.errorを出しnullを返す', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(axios.get).mockRejectedValue(new Error('Connection timeout'));

      const result = await fetchYtknFromDeckDisplay(cgid, dno, gameType);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[fetchYtknFromDeckDisplay] Failed to fetch ytkn:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('fetchYtknFromDeckList', () => {
    it('[covers:fetch_ytkn_from_deck_list.success_returns_value] input[name="ytkn"]のvalueを返す', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: '<html><body><input name="ytkn" value="tok-3" /></body></html>',
      });

      const result = await fetchYtknFromDeckList(cgid, gameType);

      expect(result).toBe('tok-3');
    });

    it('[covers:fetch_ytkn_from_deck_list.not_found_returns_null] input[name="ytkn"]が存在しない場合はnullを返す', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: '<html><body><table></table></body></html>',
      });

      const result = await fetchYtknFromDeckList(cgid, gameType);

      expect(result).toBeNull();
    });

    it('[covers:fetch_ytkn_from_deck_list.axios_error_returns_null] axios.getがrejectした場合はconsole.errorを出しnullを返す', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(axios.get).mockRejectedValue(new Error('Server error'));

      const result = await fetchYtknFromDeckList(cgid, gameType);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[fetchYtknFromDeckList] Failed to fetch ytkn:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('[covers:fetch_ytkn_from_deck_list.url_built_without_url_search_params] noLocale=trueで呼び出され、ope=4/wname/cgidを含みdnoを含まないURLで呼ばれる', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: '<html><body></body></html>',
      });

      await fetchYtknFromDeckList(cgid, gameType);

      expect(urlBuilder.buildApiUrl).toHaveBeenCalledWith(
        'member_deck.action',
        gameType,
        undefined,
        true
      );

      const [calledUrl, calledOptions] = vi.mocked(axios.get).mock.calls[0];
      expect(calledUrl).toContain('ope=4');
      expect(calledUrl).toContain('wname=MemberDeck');
      expect(calledUrl).toContain(`cgid=${cgid}`);
      expect(calledUrl).not.toContain('dno=');
      expect(calledOptions).toEqual({ withCredentials: true });
    });
  });
});
