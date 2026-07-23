import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ref } from 'vue';
import type { DeckInfo } from '@/types/deck';
import type { ResolvedRegulation } from '@/types/regulation';

const resolveDeckRegulationMock = vi.fn();

vi.mock('@/utils/regulation-resolver', () => ({
  resolveDeckRegulation: (...args: unknown[]) => resolveDeckRegulationMock(...args)
}));

vi.mock('@/utils/forbidden-limited-cache', () => ({
  forbiddenLimitedCache: {
    init: vi.fn().mockResolvedValue(undefined),
    getAvailableDates: vi.fn().mockReturnValue([]),
    ensureList: vi.fn().mockResolvedValue(null)
  }
}));

vi.mock('@/utils/genesys-cache', () => ({
  genesysPointCache: {
    init: vi.fn().mockResolvedValue(undefined),
    getAvailableListParams: vi.fn().mockReturnValue([]),
    ensureList: vi.fn().mockResolvedValue(null),
    ensureCurrentList: vi.fn().mockResolvedValue(null)
  }
}));

vi.mock('@/utils/extension-context-checker', () => ({
  safeStorageGet: vi.fn().mockResolvedValue({}),
  safeStorageSet: vi.fn().mockResolvedValue(undefined)
}));

import { useDeckRegulation } from '../useDeckRegulation';
import { forbiddenLimitedCache } from '@/utils/forbidden-limited-cache';
import { genesysPointCache } from '@/utils/genesys-cache';

function createDeckInfo(): DeckInfo {
  return {
    dno: 1,
    name: '[GENESYS] テストデッキ',
    mainDeck: [],
    extraDeck: [],
    sideDeck: [],
    category: [],
    tags: [],
    comment: '',
    deckCode: ''
  };
}

function createOptions() {
  const deckInfo = ref(createDeckInfo());
  const getDeckName = () => deckInfo.value.name;
  const setDeckName = (name: string) => {
    deckInfo.value.name = name;
  };
  return { deckInfo, getDeckName, setDeckName };
}

describe('useDeckRegulation - resolveAndEnsure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GENESYSタグでYYMM省略（listParam=null）時はensureCurrentListで現在有効なリストを確保する', async () => {
    const resolved: ResolvedRegulation = {
      mode: 'genesys',
      tag: { type: 'genesys', yymm: null, raw: '[GENESYS]', bracket: 'square', position: 'prefix' },
      effectiveDate: null,
      listParam: null,
      fallback: undefined
    };
    resolveDeckRegulationMock.mockReturnValue(resolved);

    const { resolveAndEnsure } = useDeckRegulation(createOptions());
    await resolveAndEnsure({ dno: 1, silent: true });

    expect(genesysPointCache.ensureCurrentList).toHaveBeenCalledTimes(1);
    expect(genesysPointCache.ensureList).not.toHaveBeenCalled();
  });

  it('GENESYSタグでlistParam解決済み時はensureListで該当リストを確保する', async () => {
    const resolved: ResolvedRegulation = {
      mode: 'genesys',
      tag: { type: 'genesys', yymm: '2608', raw: '[GENESYS-2608]', bracket: 'square', position: 'prefix' },
      effectiveDate: null,
      listParam: '202608',
      fallback: undefined
    };
    resolveDeckRegulationMock.mockReturnValue(resolved);

    const { resolveAndEnsure } = useDeckRegulation(createOptions());
    await resolveAndEnsure({ dno: 1, silent: true });

    expect(genesysPointCache.ensureList).toHaveBeenCalledWith('202608');
    expect(genesysPointCache.ensureCurrentList).not.toHaveBeenCalled();
  });

  it('OCGモード時はGENESYS系メソッドを呼ばない', async () => {
    const resolved: ResolvedRegulation = {
      mode: 'ocg',
      tag: { type: 'ocg', yymm: '2608', raw: '[OCG-2608]', bracket: 'square', position: 'prefix' },
      effectiveDate: '2026-08-01',
      listParam: null,
      fallback: undefined
    };
    resolveDeckRegulationMock.mockReturnValue(resolved);

    const { resolveAndEnsure } = useDeckRegulation(createOptions());
    await resolveAndEnsure({ dno: 1, silent: true });

    expect(forbiddenLimitedCache.ensureList).toHaveBeenCalledWith('2026-08-01');
    expect(genesysPointCache.ensureList).not.toHaveBeenCalled();
    expect(genesysPointCache.ensureCurrentList).not.toHaveBeenCalled();
  });
});
