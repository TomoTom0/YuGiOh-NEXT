/**
 * GENESYSポイントリスト取得APIのテスト
 * - parseGenesysHtml: howtoページHTMLからの抽出
 * - parseGenesysIndex: インデックスページから実在リストの発見
 * - listParamToEffectiveDate: YYYYMM -> YYYY-MM-01 変換
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseGenesysHtml,
  parseGenesysIndex,
  listParamToEffectiveDate,
  fetchGenesysIndex,
  fetchGenesysPointList,
} from '@/api/genesys';

/** テスト用の最小howtoページHTMLを構築 */
function buildHtml(rows: string, count = 0): string {
  return `<table class="genesyspoint" data-count="${count}">
    <thead><tr><th></th><th>カード名</th><th>ポイント</th><th>変動</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

describe('api/genesys', () => {
  describe('parseGenesysHtml', () => {
    it('カード名・ポイント・種類を抽出する [covers:parse_html.data_count_numeric] [covers:parse_html.entry_shape_and_effective_date]', () => {
      const html = buildHtml(`
        <tr data-point="13" class="effect"><td></td><td>BF－精鋭のゼピュロス</td><td><b>13</b></td><td></td></tr>
        <tr data-point="100" class="fusion"><td></td><td>ナチュル・エクストリオ</td><td><b>100</b></td><td></td></tr>
        <tr data-point="5" class="magic"><td></td><td>サイクロン</td><td><b>5</b></td><td></td></tr>
      `, 3);
      const result = parseGenesysHtml(html, '202606');
      expect(result.totalCount).toBe(3);
      expect(result.listParam).toBe('202606');
      expect(result.effectiveDate).toBe('2026-06-01');
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0]).toEqual({ name: 'BF－精鋭のゼピュロス', point: 13, cardKindClass: 'effect' });
      expect(result.entries[1]).toEqual({ name: 'ナチュル・エクストリオ', point: 100, cardKindClass: 'fusion' });
      expect(result.entries[2]).toEqual({ name: 'サイクロン', point: 5, cardKindClass: 'magic' });
    });

    it('data-point属性に末尾の余分なダブルクォートがあっても数値を抽出する [covers:parse_html.data_point_priority]', () => {
      // 本番HTMLで観測された data-point="13"" の形式
      const html = buildHtml(`
        <tr data-point="13"" class="effect"><td></td><td>カードA</td><td><b>13</b></td><td></td></tr>
      `, 1);
      const result = parseGenesysHtml(html, '202606');
      expect(result.entries[0]?.point).toBe(13);
    });

    it('data-point属性がない場合はtd内のbタグからポイントを抽出する [covers:parse_html.point_cell_fallback]', () => {
      const html = buildHtml(`
        <tr class="trap"><td></td><td>神の宣告</td><td><b>12</b></td><td></td></tr>
      `, 1);
      const result = parseGenesysHtml(html, '202606');
      expect(result.entries[0]?.point).toBe(12);
    });

    it('ポイント0の行は除外する [covers:parse_html.point_zero_skipped]', () => {
      const html = buildHtml(`
        <tr data-point="0" class="effect"><td></td><td>カード0</td><td><b>0</b></td><td></td></tr>
        <tr data-point="7" class="effect"><td></td><td>カード7</td><td><b>7</b></td><td></td></tr>
      `, 2);
      const result = parseGenesysHtml(html, '202606');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]?.name).toBe('カード7');
    });

    it('テーブルが存在しない場合は空配列を返す [covers:parse_html.no_table_empty]', () => {
      const html = '<html><body>no table</body></html>';
      const result = parseGenesysHtml(html, '202606');
      expect(result.entries).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('data-count属性がない場合はentries.lengthをtotalCountにする [covers:parse_html.total_count_fallback_entries_length]', () => {
      const html = `<table class="genesyspoint"><tbody>
        <tr data-point="3" class="effect"><td></td><td>カード</td><td><b>3</b></td><td></td></tr>
      </tbody></table>`;
      const result = parseGenesysHtml(html, '202606');
      expect(result.totalCount).toBe(1);
    });

    it('カード名セルがない行、空カード名の行、ポイント数字なしの行を除外する [covers:parse_html.missing_name_cell_skipped] [covers:parse_html.empty_name_skipped] [covers:parse_html.no_point_skipped]', () => {
      const html = `<table class="genesyspoint"><tbody>
        <tr data-point="3" class="effect"><td>1列だけ</td></tr>
        <tr data-point="3" class="effect"><td></td><td>   </td><td><b>3</b></td><td></td></tr>
        <tr class="effect"><td></td><td>ポイントなし</td><td><b>なし</b></td><td></td></tr>
        <tr data-point="4" class="effect"><td></td><td>有効カード</td><td><b>4</b></td><td></td></tr>
      </tbody></table>`;
      const result = parseGenesysHtml(html, '202606');
      expect(result.entries).toEqual([{ name: '有効カード', point: 4, cardKindClass: 'effect' }]);
      expect(result.totalCount).toBe(1);
    });

    it('data-point属性の数値をポイント列より優先する [covers:parse_html.data_point_priority]', () => {
      const html = buildHtml(`
        <tr data-point="13" class="effect"><td></td><td>カードA</td><td><b>99</b></td><td></td></tr>
      `, 1);
      const result = parseGenesysHtml(html, '202606');
      expect(result.entries[0]?.point).toBe(13);
    });
  });

  describe('listParamToEffectiveDate', () => {
    it('YYYYMMをYYYY-MM-01に変換する [covers:list_param.valid_yyyymm]', () => {
      expect(listParamToEffectiveDate('202606')).toBe('2026-06-01');
      expect(listParamToEffectiveDate('202512')).toBe('2025-12-01');
    });

    it('不正な形式はそのまま返す [covers:list_param.invalid_returns_original]', () => {
      expect(listParamToEffectiveDate('abc')).toBe('abc');
      expect(listParamToEffectiveDate('2026')).toBe('2026');
    });
  });

  describe('parseGenesysIndex', () => {
    /** テスト用インデックスページHTML（実構造を模倣） */
    function buildIndexHtml(latest: string, others: string[] = []): string {
      const otherLinks = others
        .map(p => `<li><a href="?list=${p}">20XX年X月1日適用リスト</a></li>`)
        .join('');
      return `<section id="point">
        <h2>「GENESYS」ポイントリスト</h2>
        <a href="?list=${latest}" class="btn howto marker">最新版：2026年8月1日適用リスト</a>
        <ul class="marker">${otherLinks}</ul>
      </section>`;
    }

    it('最新版と過去リストを抽出する [covers:parse_index.date_text_parsed] [covers:parse_index.latest_by_text_or_btn_class]', () => {
      // 実データと同じ構造: 最新版=202608, 過去=202606
      const html = `<section id="point">
        <a href="?list=202608" class="btn howto marker">最新版：2026年8月1日適用リスト</a>
        <ul class="marker"><li><a href="?list=202606">2026年6月1日適用リスト</a></li></ul>
      </section>`;
      const refs = parseGenesysIndex(html);
      expect(refs).toHaveLength(2);
      const latest = refs.find(r => r.isLatest);
      const past = refs.find(r => !r.isLatest);
      expect(latest?.listParam).toBe('202608');
      expect(latest?.effectiveDate).toBe('2026-08-01');
      expect(past?.listParam).toBe('202606');
      expect(past?.effectiveDate).toBe('2026-06-01');
      expect(past?.isLatest).toBe(false);
    });

    it('最新版が検出できなければ適用日が最新のものを最新版とする [covers:parse_index.no_latest_marks_newest_effective_date]', () => {
      const html = `<section id="point">
        <ul class="marker">
          <li><a href="?list=202606">2026年6月1日適用リスト</a></li>
          <li><a href="?list=202608">2026年8月1日適用リスト</a></li>
        </ul>
      </section>`;
      const refs = parseGenesysIndex(html);
      expect(refs).toHaveLength(2);
      const latest = refs.find(r => r.isLatest);
      expect(latest?.listParam).toBe('202608');
    });

    it('重複するlistParamは除外する [covers:parse_index.duplicate_list_param_skipped]', () => {
      const html = buildIndexHtml('202608', ['202606']);
      // 202608 を2回出現させる
      const dupHtml = html + `<a href="?list=202608">最新版：2026年8月1日適用リスト</a>`;
      const refs = parseGenesysIndex(dupHtml);
      expect(refs).toHaveLength(2);
    });

    it('section#pointが無い場合は空配列 [covers:parse_index.no_point_section_empty]', () => {
      const html = '<html><body>no section</body></html>';
      expect(parseGenesysIndex(html)).toHaveLength(0);
    });

    it('listパラメータの無いリンクはスキップし、日付が無い場合はlistParamから適用日を作る [covers:parse_index.link_without_list_skipped] [covers:parse_index.date_missing_fallback]', () => {
      const html = `<section id="point">
        <a href="?foo=202608">対象外</a>
        <a href="?list=202608">日付なし</a>
      </section>`;
      const refs = parseGenesysIndex(html);
      expect(refs).toHaveLength(1);
      expect(refs[0]).toMatchObject({ listParam: '202608', effectiveDate: '2026-08-01' });
    });

    it('既に最新版扱いのリンクがある場合は日付最新のリンクへ付け替えない [covers:parse_index.latest_by_text_or_btn_class] [covers:parse_index.existing_latest_kept]', () => {
      const html = `<section id="point">
        <a href="?list=202606">最新版：2026年6月1日適用リスト</a>
        <a href="?list=202608">2026年8月1日適用リスト</a>
      </section>`;
      const refs = parseGenesysIndex(html);
      expect(refs.find(r => r.listParam === '202606')?.isLatest).toBe(true);
      expect(refs.find(r => r.listParam === '202608')?.isLatest).toBe(false);
    });
  });

  describe('fetchGenesysIndex / fetchGenesysPointList（background経由fetch）', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      vi.useRealTimers();
      (chrome.runtime as typeof chrome.runtime & { lastError?: { message: string } }).lastError = undefined;
    });

    /**
     * 実装（src/api/genesys.ts fetchTextViaBackground）は sendMessage で SW を起こし、
     * 応答は chrome.storage.local のポーリングで受け取る方式（"message port closed" と
     * storage.onChanged 不達を回避するため）。テストも同じ経路をモックする。
     */
    function mockBackgroundFetch(response: { success: boolean; text?: string; error?: string }): void {
      let storedResp: { requestId: string; success: boolean; text?: string; error?: string } | undefined;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg: unknown) => {
        const { requestId } = msg as { requestId: string };
        storedResp = { requestId, ...response };
      });
      vi.spyOn(chrome.storage.local, 'get').mockImplementation(async (keys?: unknown) => {
        const result: Record<string, unknown> = {};
        if (storedResp) {
          // 実装は genesysFetchResp_<requestId> 形式のキーでgetする
          const key = typeof keys === 'string' ? keys
            : Array.isArray(keys) ? (keys[0] as string ?? '')
            : '';
          if (typeof key === 'string' && key.startsWith('genesysFetchResp_')) {
            result[key] = storedResp;
          }
        }
        return result;
      });
      vi.spyOn(chrome.storage.local, 'remove').mockImplementation(async () => {});
    }

    it('fetchGenesysIndex はbackground経由でHTMLを取得してパースする [covers:fetch_text.content_script_uses_background] [covers:fetch_bg.sends_message_with_request] [covers:fetch_bg.matched_success_returns_text] [covers:fetch_index.fetches_index_url_and_parses]', async () => {
      const indexHtml = `<section id="point">
        <a href="?list=202608" class="btn howto marker">最新版：2026年8月1日適用リスト</a>
      </section>`;
      mockBackgroundFetch({ success: true, text: indexHtml });
      const refs = await fetchGenesysIndex();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GENESYS_FETCH',
          requestId: expect.any(String),
          url: expect.stringContaining('/japan/howto/genesys/'),
        }),
        expect.any(Function)
      );
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(expect.stringMatching(/^genesysFetchResp_/));
      expect(refs).toHaveLength(1);
      expect(refs[0]?.listParam).toBe('202608');
    });

    it('fetchGenesysPointList はbackground経由でHTMLを取得してパースする [covers:fetch_text.content_script_uses_background] [covers:fetch_point_list.fetches_list_url_and_parses]', async () => {
      const listHtml = `<table class="genesyspoint" data-count="1"><tbody>
        <tr data-point="13" class="effect"><td></td><td>テストカード</td><td><b>13</b></td><td></td></tr>
      </tbody></table>`;
      mockBackgroundFetch({ success: true, text: listHtml });
      const result = await fetchGenesysPointList('202608');
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining('list=202608') }),
        expect.any(Function)
      );
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]?.point).toBe(13);
    });

    it('background経由fetch失敗時はエラーを投げる [covers:fetch_bg.matched_failure_throws_error]', async () => {
      mockBackgroundFetch({ success: false, error: 'Failed: 404 Not Found' });
      await expect(fetchGenesysIndex()).rejects.toThrow('Failed: 404 Not Found');
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(expect.stringMatching(/^genesysFetchResp_/));
    });

    it('background応答が成功でもtextが無ければ空文字列としてパースする [covers:fetch_bg.matched_success_missing_text_empty]', async () => {
      mockBackgroundFetch({ success: true });
      const refs = await fetchGenesysIndex();
      expect(refs).toEqual([]);
    });

    it('background失敗応答にerrorが無ければ既定メッセージでthrowする [covers:fetch_bg.matched_failure_default_error]', async () => {
      mockBackgroundFetch({ success: false });
      await expect(fetchGenesysIndex()).rejects.toThrow('GENESYS fetch failed');
    });

    it('sendMessageのlastErrorは無視してstorage.localの成功応答を使う [covers:fetch_bg.send_message_last_error_ignored]', async () => {
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg: unknown, callback?: () => void) => {
        const runtime = chrome.runtime as typeof chrome.runtime & { lastError?: { message: string } };
        runtime.lastError = { message: 'message port closed' };
        callback?.();
        runtime.lastError = undefined;
        const { requestId } = msg as { requestId: string };
        vi.mocked(chrome.storage.local.get).mockResolvedValue({
          [`genesysFetchResp_${requestId}`]: { requestId, success: true, text: '<section id="point"></section>' },
        });
      });
      vi.spyOn(chrome.storage.local, 'get').mockResolvedValue({});
      vi.spyOn(chrome.storage.local, 'remove').mockResolvedValue(undefined);
      const refs = await fetchGenesysIndex();
      expect(refs).toEqual([]);
    });

    it('最初のポーリングで応答がなくても再ポーリングで応答を取得する [covers:fetch_bg.poll_ignores_missing_or_other_request]', async () => {
      vi.useFakeTimers();
      let requestId = '';
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg: unknown) => {
        requestId = (msg as { requestId: string }).requestId;
      });
      vi.spyOn(chrome.storage.local, 'get')
        .mockResolvedValueOnce({}) // 1回目: まだ応答なし
        .mockImplementation(async () => ({
          [`genesysFetchResp_${requestId}`]: {
            requestId,
            success: true,
            text: '<section id="point"><a href="?list=202608">2026年8月1日適用リスト</a></section>',
          },
        }));
      vi.spyOn(chrome.storage.local, 'remove').mockResolvedValue(undefined);

      const promise = fetchGenesysIndex();
      await vi.advanceTimersByTimeAsync(300);
      const refs = await promise;
      expect(refs).toHaveLength(1);
      expect(refs[0]?.listParam).toBe('202608');
      expect(chrome.storage.local.remove).toHaveBeenCalledTimes(1);
    });

    it('一致するbackground応答が30秒無ければタイムアウトする [covers:fetch_bg.timeout_throws]', async () => {
      vi.useFakeTimers();
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(() => {});
      vi.spyOn(chrome.storage.local, 'get').mockResolvedValue({});
      vi.spyOn(chrome.storage.local, 'remove').mockResolvedValue(undefined);

      const promise = fetchGenesysIndex();
      const expectation = expect(promise).rejects.toThrow('GENESYS fetch timeout');
      await vi.advanceTimersByTimeAsync(30000);
      await expectation;
      expect(chrome.storage.local.remove).not.toHaveBeenCalled();
    });

    it('content script環境でない場合は直接fetchしてパースする [covers:fetch_text.direct_fetch_success] [covers:fetch_index.fetches_index_url_and_parses]', async () => {
      const indexHtml = `<section id="point">
        <a href="?list=202608">2026年8月1日適用リスト</a>
      </section>`;
      vi.stubGlobal('chrome', undefined);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => indexHtml }));
      const refs = await fetchGenesysIndex();
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/japan/howto/genesys/'));
      expect(refs[0]?.listParam).toBe('202608');
    });

    it('直接fetchでresponse.okがfalseならステータス付きでthrowする [covers:fetch_text.direct_fetch_not_ok_throws]', async () => {
      vi.stubGlobal('chrome', undefined);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      }));
      await expect(fetchGenesysIndex()).rejects.toThrow('Failed to fetch: 503 Service Unavailable');
    });
  });
});
