import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseForbiddenLimitedHtml,
  fetchForbiddenLimitedList,
  fetchAvailableEffectiveDates,
} from '@/api/forbidden-limited';

function htmlWithSections(sections: { id: string; rows: string[] }[]): string {
  const body = sections
    .map(
      s =>
        `<div id="${s.id}">${s.rows
          .map(cid => `<div class="t_row"><input class="link_value" value="/yugiohdb/card_search.action?ope=2&cid=${cid}" /></div>`)
          .join('')}</div>`
    )
    .join('');
  return `<html><body>${body}</body></html>`;
}

describe('api/forbidden-limited parseForbiddenLimitedHtml', () => {
  it('#list_forbiddenが存在する場合、配下の.t_rowをforbidden規制として抽出する [covers:parse.forbidden_section.present]', () => {
    const html = htmlWithSections([{ id: 'list_forbidden', rows: ['100'] }]);
    const result = parseForbiddenLimitedHtml(html, '2024-04-01');
    expect(result.regulations['100']).toBe('forbidden');
  });

  it('#list_forbiddenが存在しない場合、forbidden抽出はスキップされエラーにもならない [covers:parse.forbidden_section.absent]', () => {
    const html = '<html><body></body></html>';
    expect(() => parseForbiddenLimitedHtml(html, '2024-04-01')).not.toThrow();
    const result = parseForbiddenLimitedHtml(html, '2024-04-01');
    expect(Object.keys(result.regulations)).toHaveLength(0);
  });

  it('同一cidが複数セクションに出現した場合forbidden→limited→semi-limitedの順で後勝ちになる [covers:parse.section_overwrite_order]', () => {
    const html = htmlWithSections([
      { id: 'list_forbidden', rows: ['100'] },
      { id: 'list_semi_limited', rows: ['100'] },
    ]);
    const result = parseForbiddenLimitedHtml(html, '2024-04-01');
    expect(result.regulations['100']).toBe('semi-limited');
  });

  it('3セクションすべてが存在しなくても例外を投げず空のregulationsを返す [covers:parse.always_no_throw]', () => {
    const html = '<html><body><div id="unrelated"></div></body></html>';
    const result = parseForbiddenLimitedHtml(html, '2024-04-01');
    expect(result.regulations).toEqual({});
    expect(result.effectiveDate).toBe('2024-04-01');
  });

  it('.t_row内にinput.link_valueが無い行はスキップされる [covers:extract_cards.link_value_missing]', () => {
    const html = '<html><body><div id="list_forbidden"><div class="t_row"></div></div></body></html>';
    const result = parseForbiddenLimitedHtml(html, '2024-04-01');
    expect(Object.keys(result.regulations)).toHaveLength(0);
  });

  it('link_valueがcidパターンにマッチしない行はスキップされる [covers:extract_cards.cid_pattern_unmatched]', () => {
    const html =
      '<html><body><div id="list_forbidden"><div class="t_row"><input class="link_value" value="/yugiohdb/card_search.action?ope=2" /></div></div></body></html>';
    const result = parseForbiddenLimitedHtml(html, '2024-04-01');
    expect(Object.keys(result.regulations)).toHaveLength(0);
  });

  it('cidが抽出できた場合regulations[cid]に規制種別を設定する [covers:extract_cards.cid_matched]', () => {
    const html = htmlWithSections([{ id: 'list_limited', rows: ['5195'] }]);
    const result = parseForbiddenLimitedHtml(html, '2024-04-01');
    expect(result.regulations['5195']).toBe('limited');
  });
});

describe('api/forbidden-limited fetchForbiddenLimitedList', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('response.okがfalseの場合ステータス付きでthrowする [covers:fetch_list.response_not_ok]', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' })
    );
    await expect(fetchForbiddenLimitedList()).rejects.toThrow(
      'Failed to fetch forbidden/limited list: 500 Internal Server Error'
    );
  });

  it('effectiveDateが指定された場合HTMLからの抽出をせずその値をそのまま使う [covers:fetch_list.effective_date_provided]', async () => {
    const html =
      '<html><body><select><option value="2024-01-01" selected></option></select></body></html>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => html }));
    const result = await fetchForbiddenLimitedList('2024-04-01');
    expect(result.effectiveDate).toBe('2024-04-01');
  });

  it('effectiveDateが省略された場合HTMLから適用日を抽出して使う [covers:fetch_list.effective_date_omitted]', async () => {
    const html =
      '<html><body><select><option value="2024-07-01" selected></option></select></body></html>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => html }));
    const result = await fetchForbiddenLimitedList();
    expect(result.effectiveDate).toBe('2024-07-01');
  });

  it('selected optionが存在しvalueを持つ場合その値を返す [covers:extract_date.selected_option_found]', async () => {
    const html =
      '<html><body><select><option value="2024-07-01" selected></option></select></body></html>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => html }));
    const result = await fetchForbiddenLimitedList();
    expect(result.effectiveDate).toBe('2024-07-01');
  });

  it.each([
    ['2024-11-15', '2024-10-01', 'extract_date.fallback_month_ge_10'],
    ['2024-08-15', '2024-07-01', 'extract_date.fallback_month_ge_7_lt_10'],
    ['2024-05-15', '2024-04-01', 'extract_date.fallback_month_ge_4_lt_7'],
    ['2024-02-15', '2024-01-01', 'extract_date.fallback_month_lt_4'],
  ])(
    'selected optionが無い場合、現在月(%s)に応じたフォールバック適用日(%s)を返す [covers:%s]',
    async (nowStr, expected) => {
      const html = '<html><body><select></select></body></html>';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => html }));
      vi.useFakeTimers();
      vi.setSystemTime(new Date(nowStr));
      try {
        const result = await fetchForbiddenLimitedList();
        expect(result.effectiveDate).toBe(expected);
      } finally {
        vi.useRealTimers();
      }
    }
  );
});

describe('api/forbidden-limited fetchAvailableEffectiveDates', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('response.okがfalseの場合ステータス付きでthrowする [covers:fetch_dates.response_not_ok]', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }));
    await expect(fetchAvailableEffectiveDates()).rejects.toThrow(
      'Failed to fetch available effective dates: 404 Not Found'
    );
  });

  it('value属性を持つoptionのみdatesに追加される [covers:parse_dates.value_present]', async () => {
    const html =
      '<html><body><select id="forbiddenLimitedDate"><option value="2024-01-01"></option><option></option></select></body></html>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => html }));
    const result = await fetchAvailableEffectiveDates();
    expect(result).toEqual(['2024-01-01']);
  });
});
