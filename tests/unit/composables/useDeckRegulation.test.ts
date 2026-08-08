import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useDeckRegulation } from '@/composables/deck/useDeckRegulation';
import type { DeckInfo } from '@/types/deck';
import type { ResolvedRegulation, RegulationTag } from '@/types/regulation';
import { forbiddenLimitedCache } from '@/utils/forbidden-limited-cache';
import { genesysPointCache } from '@/utils/genesys-cache';
import { safeStorageGet, safeStorageSet } from '@/utils/extension-context-checker';
import { CHROME_STORAGE_KEY_REGULATION_FIX_IGNORED } from '@/constants/storage-keys';

const mocks = vi.hoisted(() => ({
  resolveDeckRegulation: vi.fn(),
  replaceTagYymm: vi.fn()
}));

vi.mock('@/utils/regulation-resolver', () => ({
  resolveDeckRegulation: (...args: unknown[]) => mocks.resolveDeckRegulation(...args)
}));

vi.mock('@/utils/regulation-tag-parser', async importOriginal => {
  const actual = await importOriginal<typeof import('@/utils/regulation-tag-parser')>();
  return {
    ...actual,
    replaceTagYymm: (...args: unknown[]) => mocks.replaceTagYymm(...args)
  };
});

vi.mock('@/utils/forbidden-limited-cache', () => ({
  forbiddenLimitedCache: {
    init: vi.fn().mockResolvedValue(undefined),
    checkAndUpdate: vi.fn().mockResolvedValue(undefined),
    getAvailableDates: vi.fn().mockReturnValue([]),
    ensureList: vi.fn().mockResolvedValue(undefined),
    hasList: vi.fn().mockReturnValue(true),
    getRegulation: vi.fn()
  }
}));

vi.mock('@/utils/genesys-cache', () => ({
  genesysPointCache: {
    init: vi.fn().mockResolvedValue(undefined),
    checkAndUpdate: vi.fn().mockResolvedValue(undefined),
    getAvailableListParams: vi.fn().mockReturnValue([]),
    ensureList: vi.fn().mockResolvedValue({ listParam: '202608', effectiveDate: '2026-08-01', points: {}, fetchedAt: Date.now() }),
    ensureCurrentList: vi.fn().mockResolvedValue({ listParam: '202608', effectiveDate: '2026-08-01', points: {}, fetchedAt: Date.now() }),
    getPoint: vi.fn()
  }
}));

vi.mock('@/utils/extension-context-checker', () => ({
  safeStorageGet: vi.fn().mockResolvedValue({}),
  safeStorageSet: vi.fn().mockResolvedValue(undefined)
}));

function createDeckInfo(overrides: Partial<DeckInfo> = {}): DeckInfo {
  return {
    dno: 1,
    name: 'テストデッキ',
    mainDeck: [],
    extraDeck: [],
    sideDeck: [],
    category: [],
    tags: [],
    comment: '',
    deckCode: '',
    ...overrides
  };
}

function createOptions(overrides: Partial<DeckInfo> = {}) {
  const deckInfo = ref(createDeckInfo(overrides));
  const setDeckName = vi.fn((name: string) => {
    deckInfo.value.name = name;
  });
  return {
    deckInfo,
    getDeckName: () => deckInfo.value.name,
    setDeckName,
    isGenesysEnabled: () => true,
  };
}

function tag(type: 'ocg' | 'genesys', yymm: string | null, raw: string): RegulationTag {
  return {
    type,
    yymm,
    raw,
    bracket: 'square',
    position: 'prefix',
    startIndex: 0,
    endIndex: raw.length
  };
}

function resolved(overrides: Partial<ResolvedRegulation> = {}): ResolvedRegulation {
  return {
    mode: 'none',
    tag: null,
    effectiveDate: null,
    listParam: null,
    fallback: undefined,
    ...overrides
  };
}

async function flushWatch(): Promise<void> {
  await nextTick();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('useDeckRegulation conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(forbiddenLimitedCache.init).mockResolvedValue(undefined);
    vi.mocked(forbiddenLimitedCache.checkAndUpdate).mockResolvedValue(undefined);
    vi.mocked(forbiddenLimitedCache.getAvailableDates).mockReturnValue([]);
    vi.mocked(forbiddenLimitedCache.ensureList).mockResolvedValue(undefined);
    vi.mocked(forbiddenLimitedCache.hasList).mockReturnValue(true);
    vi.mocked(forbiddenLimitedCache.getRegulation).mockReturnValue(undefined);
    vi.mocked(genesysPointCache.init).mockResolvedValue(undefined);
    vi.mocked(genesysPointCache.checkAndUpdate).mockResolvedValue(undefined);
    vi.mocked(genesysPointCache.getAvailableListParams).mockReturnValue([]);
    vi.mocked(genesysPointCache.ensureList).mockResolvedValue({ listParam: '202608', effectiveDate: '2026-08-01', points: {}, fetchedAt: Date.now() });
    vi.mocked(genesysPointCache.ensureCurrentList).mockResolvedValue(undefined);
    vi.mocked(genesysPointCache.getPoint).mockReturnValue(undefined);
    vi.mocked(safeStorageGet).mockResolvedValue({});
    vi.mocked(safeStorageSet).mockResolvedValue(undefined);
    mocks.resolveDeckRegulation.mockReturnValue(resolved());
    mocks.replaceTagYymm.mockReturnValue('fixed-name');
  });

  it('[covers:display_mode.ocg_effective_date_returns_ocg_past] [covers:display_mode.genesys_returns_genesys] [covers:display_mode.none_or_ocg_latest_returns_none] displayModeはresolvedRegulationから3値へ写像する', () => {
    const regulation = useDeckRegulation(createOptions());

    expect(regulation.displayMode.value).toBe('none');

    regulation.resolvedRegulation.value = resolved({ mode: 'ocg', tag: tag('ocg', null, '[OCG]') });
    expect(regulation.displayMode.value).toBe('none');

    regulation.resolvedRegulation.value = resolved({
      mode: 'ocg',
      tag: tag('ocg', '2608', '[OCG-2608]'),
      effectiveDate: '2026-08-01'
    });
    expect(regulation.displayMode.value).toBe('ocg-past');

    regulation.resolvedRegulation.value = resolved({
      mode: 'genesys',
      tag: tag('genesys', null, '[GENESYS]')
    });
    expect(regulation.displayMode.value).toBe('genesys');
  });

  it('[covers:effective_description.none_returns_null] [covers:effective_description.fallback_yymm_preferred] [covers:effective_description.tag_yymm_used_without_fallback] [covers:effective_description_no_yymm_returns_latest] effectiveDescriptionはmodeとYYMM優先順位どおり表示文を返す', () => {
    const regulation = useDeckRegulation(createOptions());

    expect(regulation.effectiveDescription.value).toBeNull();

    regulation.resolvedRegulation.value = resolved({
      mode: 'ocg',
      tag: tag('ocg', '2608', '[OCG-2608]'),
      effectiveDate: '2026-07-01',
      fallback: {
        requestedYymm: '2608',
        reason: 'not-exist',
        appliedIdentifier: '2026-07-01',
        appliedYymm: '2607'
      }
    });
    expect(regulation.effectiveDescription.value).toBe('OCG 2026年07月版');

    regulation.resolvedRegulation.value = resolved({
      mode: 'genesys',
      tag: tag('genesys', '2608', '[GENESYS-2608]'),
      listParam: '202608'
    });
    expect(regulation.effectiveDescription.value).toBe('GENESYS 2026年08月版');

    regulation.resolvedRegulation.value = resolved({
      mode: 'genesys',
      tag: tag('genesys', null, '[GENESYS]')
    });
    expect(regulation.effectiveDescription.value).toBe('GENESYS 最新版');
  });

  it('[covers:limit_override.non_ocg_or_no_effective_date_returns_null] [covers:limit_override.ocg_effective_date_reads_cache] getCardLimitOverrideはOCG過去版だけキャッシュを読む', () => {
    vi.mocked(forbiddenLimitedCache.getRegulation).mockReturnValue('limited');
    const regulation = useDeckRegulation(createOptions());

    expect(regulation.getCardLimitOverride('100')).toBeNull();
    expect(forbiddenLimitedCache.getRegulation).not.toHaveBeenCalled();

    regulation.resolvedRegulation.value = resolved({
      mode: 'ocg',
      tag: tag('ocg', null, '[OCG]'),
      effectiveDate: null
    });
    expect(regulation.getCardLimitOverride('100')).toBeNull();

    regulation.resolvedRegulation.value = resolved({
      mode: 'ocg',
      tag: tag('ocg', '2608', '[OCG-2608]'),
      effectiveDate: '2026-08-01'
    });
    expect(regulation.getCardLimitOverride('100')).toBe('limited');
    expect(forbiddenLimitedCache.getRegulation).toHaveBeenCalledWith('100', '2026-08-01');
  });

  it('[covers:limit_override.list_not_in_cache_returns_null] getCardLimitOverrideはhasListがfalseならgetRegulationを呼ばずnullを返す', () => {
    vi.mocked(forbiddenLimitedCache.hasList).mockReturnValue(false);
    vi.mocked(forbiddenLimitedCache.getRegulation).mockReturnValue('forbidden');
    const regulation = useDeckRegulation(createOptions());

    regulation.resolvedRegulation.value = resolved({
      mode: 'ocg',
      tag: tag('ocg', '2501', '[OCG-2501]'),
      effectiveDate: '2025-01-01'
    });
    // hasList=false → getRegulationを呼ばずnullを返す
    expect(regulation.getCardLimitOverride('100')).toBeNull();
    expect(forbiddenLimitedCache.getRegulation).not.toHaveBeenCalled();
  });

  it('[covers:genesys_point.non_genesys_returns_undefined] [covers:genesys_point.genesys_reads_cache_with_optional_list_param] getCardGenesysPointはGENESYS時だけlistParamを任意引数にしてキャッシュを読む', () => {
    vi.mocked(genesysPointCache.getPoint).mockReturnValue(42);
    const regulation = useDeckRegulation(createOptions());

    expect(regulation.getCardGenesysPoint('100')).toBeUndefined();
    expect(genesysPointCache.getPoint).not.toHaveBeenCalled();

    regulation.resolvedRegulation.value = resolved({
      mode: 'genesys',
      tag: tag('genesys', null, '[GENESYS]'),
      listParam: null
    });
    expect(regulation.getCardGenesysPoint('100')).toBe(42);
    expect(genesysPointCache.getPoint).toHaveBeenLastCalledWith('100', undefined);

    regulation.resolvedRegulation.value = resolved({
      mode: 'genesys',
      tag: tag('genesys', '2608', '[GENESYS-2608]'),
      listParam: '202608'
    });
    expect(regulation.getCardGenesysPoint('200')).toBe(42);
    expect(genesysPointCache.getPoint).toHaveBeenLastCalledWith('200', '202608');
  });

  it('[covers:reset_regulation_restores_none_and_hides_dialog] resetRegulationは解決状態とダイアログを初期値へ戻す', () => {
    const regulation = useDeckRegulation(createOptions());
    regulation.resolvedRegulation.value = resolved({
      mode: 'genesys',
      tag: tag('genesys', '2608', '[GENESYS-2608]'),
      listParam: '202608'
    });
    regulation.showRegulationFixDialog.value = true;

    regulation.resetRegulation();

    expect(regulation.resolvedRegulation.value).toEqual(resolved());
    expect(regulation.showRegulationFixDialog.value).toBe(false);
  });

  it('[covers:resolve.ensure_order_and_available_passed_to_resolver] [covers:resolve.none_or_ocg_latest_ensures_no_list] resolveAndEnsureはdiscovery後のavailableで解決し、none/OCG最新版ではリスト取得しない', async () => {
    const options = createOptions({ name: '[OCG] テスト' });
    const regulation = useDeckRegulation(options);
    regulation.showRegulationFixDialog.value = true;
    vi.mocked(forbiddenLimitedCache.getAvailableDates).mockReturnValue(['2026-08-01']);
    vi.mocked(genesysPointCache.getAvailableListParams).mockReturnValue(['202608']);
    mocks.resolveDeckRegulation.mockReturnValue(resolved({ mode: 'ocg', tag: tag('ocg', null, '[OCG]') }));

    await regulation.resolveAndEnsure({ dno: 1, silent: true });

    expect(forbiddenLimitedCache.init).toHaveBeenCalledTimes(1);
    expect(genesysPointCache.init).toHaveBeenCalledTimes(1);
    expect(forbiddenLimitedCache.checkAndUpdate).toHaveBeenCalledTimes(1);
    expect(genesysPointCache.checkAndUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.resolveDeckRegulation).toHaveBeenCalledWith('[OCG] テスト', {
      ocgDates: ['2026-08-01'],
      genesysListParams: ['202608']
    });
    expect(regulation.resolvedRegulation.value).toEqual(resolved({ mode: 'ocg', tag: tag('ocg', null, '[OCG]') }));
    expect(regulation.showRegulationFixDialog.value).toBe(false);
    expect(forbiddenLimitedCache.ensureList).not.toHaveBeenCalled();
    expect(genesysPointCache.ensureList).not.toHaveBeenCalled();
    expect(genesysPointCache.ensureCurrentList).not.toHaveBeenCalled();
    expect(forbiddenLimitedCache.checkAndUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.resolveDeckRegulation.mock.invocationCallOrder[0]
    );
  });

  it('[covers:resolve.ocg_effective_date_ensures_forbidden_list] resolveAndEnsureはOCG過去版リストを取得する', async () => {
    const regulation = useDeckRegulation(createOptions());
    mocks.resolveDeckRegulation.mockReturnValue(
      resolved({ mode: 'ocg', tag: tag('ocg', '2608', '[OCG-2608]'), effectiveDate: '2026-08-01' })
    );

    await regulation.resolveAndEnsure({ dno: 1, silent: true });

    expect(forbiddenLimitedCache.ensureList).toHaveBeenCalledWith('2026-08-01');
    expect(genesysPointCache.ensureList).not.toHaveBeenCalled();
    expect(genesysPointCache.ensureCurrentList).not.toHaveBeenCalled();
  });

  it('[covers:resolve.genesys_list_param_ensures_genesys_list] resolveAndEnsureはGENESYS指定リストを取得する', async () => {
    const regulation = useDeckRegulation(createOptions());
    mocks.resolveDeckRegulation.mockReturnValue(
      resolved({ mode: 'genesys', tag: tag('genesys', '2608', '[GENESYS-2608]'), listParam: '202608' })
    );

    await regulation.resolveAndEnsure({ dno: 1, silent: true });

    expect(genesysPointCache.ensureList).toHaveBeenCalledWith('202608');
    expect(genesysPointCache.ensureCurrentList).not.toHaveBeenCalled();
    expect(forbiddenLimitedCache.ensureList).not.toHaveBeenCalled();
  });

  it('[covers:resolve.genesys_without_list_param_ensures_current_list] resolveAndEnsureはGENESYS最新版リストを取得する', async () => {
    const regulation = useDeckRegulation(createOptions());
    mocks.resolveDeckRegulation.mockReturnValue(
      resolved({ mode: 'genesys', tag: tag('genesys', null, '[GENESYS]'), listParam: null })
    );

    await regulation.resolveAndEnsure({ dno: 1, silent: true });

    expect(genesysPointCache.ensureCurrentList).toHaveBeenCalledTimes(1);
    expect(genesysPointCache.ensureList).not.toHaveBeenCalled();
    expect(forbiddenLimitedCache.ensureList).not.toHaveBeenCalled();
  });

  it('[covers:resolve.fallback_dialog_only_when_not_silent_not_ignored] [covers:resolve.fallback_dialog_suppressed_by_silent_missing_fallback_or_ignored] fallbackダイアログはsilent/fallback/ignore条件をすべて満たす時だけ開く', async () => {
    const fallback = {
      requestedYymm: '2608',
      reason: 'not-exist' as const,
      appliedIdentifier: '2026-07-01',
      appliedYymm: '2607'
    };
    mocks.resolveDeckRegulation.mockReturnValue(
      resolved({ mode: 'ocg', tag: tag('ocg', '2608', '[OCG-2608]'), effectiveDate: '2026-07-01', fallback })
    );

    const silentRegulation = useDeckRegulation(createOptions());
    await silentRegulation.resolveAndEnsure({ dno: 1, silent: true });
    expect(silentRegulation.showRegulationFixDialog.value).toBe(false);

    const shownRegulation = useDeckRegulation(createOptions());
    await shownRegulation.resolveAndEnsure({ dno: 1, silent: false });
    expect(shownRegulation.showRegulationFixDialog.value).toBe(true);

    const noFallbackRegulation = useDeckRegulation(createOptions());
    mocks.resolveDeckRegulation.mockReturnValueOnce(resolved({ mode: 'none' }));
    await noFallbackRegulation.resolveAndEnsure({ dno: 1, silent: false });
    expect(noFallbackRegulation.showRegulationFixDialog.value).toBe(false);

    vi.mocked(safeStorageGet).mockResolvedValueOnce({ [CHROME_STORAGE_KEY_REGULATION_FIX_IGNORED]: { '12': true } });
    const ignoredRegulation = useDeckRegulation(createOptions());
    await ignoredRegulation.loadIgnored();
    await ignoredRegulation.resolveAndEnsure({ dno: 12, silent: false });
    expect(ignoredRegulation.showRegulationFixDialog.value).toBe(false);
  });

  it('[covers:confirm_fix_missing_tag_or_fallback_only_hides_dialog] [covers:confirm_fix_replaces_tag_yymm_and_sets_deck_name] confirmRegulationFixはtag/fallbackが揃う時だけデッキ名を置換する', () => {
    const options = createOptions({ name: '[OCG-2608] テスト' });
    const regulation = useDeckRegulation(options);
    regulation.showRegulationFixDialog.value = true;

    regulation.confirmRegulationFix();

    expect(regulation.showRegulationFixDialog.value).toBe(false);
    expect(options.setDeckName).not.toHaveBeenCalled();

    const currentTag = tag('ocg', '2608', '[OCG-2608]');
    regulation.resolvedRegulation.value = resolved({
      mode: 'ocg',
      tag: currentTag,
      effectiveDate: '2026-07-01',
      fallback: {
        requestedYymm: '2608',
        reason: 'not-exist',
        appliedIdentifier: '2026-07-01',
        appliedYymm: '2607'
      }
    });

    regulation.confirmRegulationFix();

    expect(mocks.replaceTagYymm).toHaveBeenCalledWith('[OCG-2608] テスト', currentTag, '2607');
    expect(options.setDeckName).toHaveBeenCalledWith('fixed-name');
  });

  it('[covers:ignore_fix_without_dno_only_hides_dialog] [covers:ignore_fix_with_dno_adds_and_saves_string_key_record] ignoreRegulationFixはdnoがtruthyな時だけignore保存する', async () => {
    const noDnoRegulation = useDeckRegulation(createOptions({ dno: 0 }));
    noDnoRegulation.showRegulationFixDialog.value = true;

    await noDnoRegulation.ignoreRegulationFix();

    expect(noDnoRegulation.showRegulationFixDialog.value).toBe(false);
    expect(safeStorageSet).not.toHaveBeenCalled();

    const regulation = useDeckRegulation(createOptions({ dno: 12 }));
    await regulation.ignoreRegulationFix();

    expect(safeStorageSet).toHaveBeenCalledWith({
      [CHROME_STORAGE_KEY_REGULATION_FIX_IGNORED]: { '12': true }
    });
  });

  it('[covers:remove_ignored_absent_returns_without_save] [covers:remove_ignored_present_deletes_and_saves] removeIgnoredは登録済みdnoだけ削除して保存する', async () => {
    const options = createOptions({ dno: 12 });
    const regulation = useDeckRegulation(options);

    await regulation.removeIgnored(12);
    expect(safeStorageSet).not.toHaveBeenCalled();

    await regulation.ignoreRegulationFix();
    options.deckInfo.value.dno = 13;
    await regulation.ignoreRegulationFix();
    vi.mocked(safeStorageSet).mockClear();

    await regulation.removeIgnored(12);

    expect(safeStorageSet).toHaveBeenCalledWith({
      [CHROME_STORAGE_KEY_REGULATION_FIX_IGNORED]: { '13': true }
    });
  });

  it('[covers:load_ignored_record_maps_finite_numeric_keys] loadIgnoredはrecordのキーだけを数値化しfinite値でSetを置き換える', async () => {
    vi.mocked(safeStorageGet).mockResolvedValueOnce({
      [CHROME_STORAGE_KEY_REGULATION_FIX_IGNORED]: {
        '12': true,
        abc: true,
        '': false,
        Infinity: true
      }
    });
    const regulation = useDeckRegulation(createOptions());

    await regulation.loadIgnored();
    await regulation.removeIgnored(12);

    expect(safeStorageSet).toHaveBeenCalledWith({
      [CHROME_STORAGE_KEY_REGULATION_FIX_IGNORED]: { '0': true }
    });
  });

  it('[covers:load_ignored_non_record_leaves_existing_set] loadIgnoredは非record入力では既存ignore集合を維持する', async () => {
    const regulation = useDeckRegulation(createOptions({ dno: 12 }));
    await regulation.ignoreRegulationFix();
    vi.mocked(safeStorageSet).mockClear();
    vi.mocked(safeStorageGet).mockResolvedValueOnce({ [CHROME_STORAGE_KEY_REGULATION_FIX_IGNORED]: [] });

    await regulation.loadIgnored();
    await regulation.removeIgnored(12);

    expect(safeStorageSet).toHaveBeenCalledWith({
      [CHROME_STORAGE_KEY_REGULATION_FIX_IGNORED]: {}
    });
  });

  it('[covers:watch_tag_raw_same_returns_without_resolve] watchはタグrawが同じ名前変更では再解決しない', async () => {
    const options = createOptions({ name: '[OCG-2608] A' });
    useDeckRegulation(options);

    options.deckInfo.value.name = '[OCG-2608] B';
    await flushWatch();

    expect(forbiddenLimitedCache.init).not.toHaveBeenCalled();
    expect(mocks.resolveDeckRegulation).not.toHaveBeenCalled();
  });

  it('[covers:watch_tag_raw_changed_with_zero_dno_resolves_silent] watchはdno=0（新規デッキ）でも再解決する', async () => {
    const options = createOptions({ dno: 0, name: 'B' });
    const regulation = useDeckRegulation(options);

    options.deckInfo.value.name = '[OCG-2501] B';
    await flushWatch();

    // dno=0 では再解決が実行される（TASK-346修正: 以前は!dnoで除外されていた）
    expect(forbiddenLimitedCache.init).toHaveBeenCalled();
    expect(mocks.resolveDeckRegulation).toHaveBeenCalled();
  });

  it('[covers:watch_tag_raw_changed_with_dno_resolves_silent] watchはタグraw変更時にsilentで再解決する', async () => {
    const options = createOptions({ dno: 12, name: 'A' });
    const regulation = useDeckRegulation(options);
    mocks.resolveDeckRegulation.mockReturnValue(
      resolved({
        mode: 'genesys',
        tag: tag('genesys', '2608', '[GENESYS-2608]'),
        listParam: '202608',
        fallback: {
          requestedYymm: '2608',
          reason: 'not-exist',
          appliedIdentifier: '202608',
          appliedYymm: '2607'
        }
      })
    );

    options.deckInfo.value.name = '[GENESYS-2608] A';
    await flushWatch();

    expect(mocks.resolveDeckRegulation).toHaveBeenCalledWith('[GENESYS-2608] A', {
      ocgDates: [],
      genesysListParams: []
    });
    expect(genesysPointCache.ensureList).toHaveBeenCalledWith('202608');
    expect(regulation.showRegulationFixDialog.value).toBe(false);
  });
});
