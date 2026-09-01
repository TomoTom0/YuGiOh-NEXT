import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { useSearchExecution } from '@/components/searchInputBar/composables/useSearchExecution';
import { useDeckEditStore } from '@/stores/deck-edit';
import type { MonsterCard } from '@/types/card';
import type { SearchFilters } from '@/types/search-filters';

function baseFilters(): SearchFilters {
  return {
    cardType: null,
    attributes: [],
    spellTypes: [],
    trapTypes: [],
    races: [],
    monsterTypes: [],
    monsterTypeMatchMode: 'or',
    levelType: 'level',
    levelValues: [],
    linkValues: [],
    scaleValues: [],
    linkMarkers: [],
    linkMarkerMatchMode: 'or',
    atk: { exact: false, unknown: false },
    def: { exact: false, unknown: false },
    releaseDate: {}
  };
}

function monsterCard(overrides: Partial<MonsterCard>): MonsterCard {
  return {
    name: 'テストカード',
    cardId: '1',
    ciid: '1',
    lang: 'ja',
    imgs: [],
    cardType: 'monster',
    attribute: 'LIGHT',
    levelType: 'level',
    levelValue: 4,
    race: 'warrior',
    types: [],
    isExtraDeck: false,
    ...overrides
  };
}

describe('useSearchExecution.applyClientSideFilters', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function getExecution() {
    const deckStore = useDeckEditStore();
    return useSearchExecution({ deckStore, searchMode: ref('auto') });
  }

  describe('monsterTypeMatchMode', () => {
    it('AND指定時は選択した全てのタイプを満たすカードのみ残す', () => {
      const { applyClientSideFilters } = getExecution();
      const filters = baseFilters();
      filters.monsterTypes = [
        { type: 'fusion', state: 'normal' },
        { type: 'effect', state: 'normal' }
      ];
      filters.monsterTypeMatchMode = 'and';

      const both = monsterCard({ types: ['fusion', 'effect'] });
      const onlyOne = monsterCard({ types: ['fusion'] });

      expect(applyClientSideFilters([both], filters)).toEqual([both]);
      expect(applyClientSideFilters([onlyOne], filters)).toEqual([]);
    });

    it('OR指定時はいずれかのタイプを満たすカードを残す', () => {
      const { applyClientSideFilters } = getExecution();
      const filters = baseFilters();
      filters.monsterTypes = [
        { type: 'fusion', state: 'normal' },
        { type: 'effect', state: 'normal' }
      ];
      filters.monsterTypeMatchMode = 'or';

      const onlyOne = monsterCard({ types: ['fusion'] });
      const neither = monsterCard({ types: ['normal'] });

      expect(applyClientSideFilters([onlyOne], filters)).toEqual([onlyOne]);
      expect(applyClientSideFilters([neither], filters)).toEqual([]);
    });
  });

  describe('linkMarkerMatchMode', () => {
    // card.linkMarkers はビットフラグ（bit N-1 = 方向N）
    const DIRECTION_1 = 1 << 0;
    const DIRECTION_9 = 1 << 8;

    it('AND指定時は選択した全てのマーカー方向を持つカードのみ残す', () => {
      const { applyClientSideFilters } = getExecution();
      const filters = baseFilters();
      filters.linkMarkers = [1, 9];
      filters.linkMarkerMatchMode = 'and';

      const both = monsterCard({ linkMarkers: DIRECTION_1 | DIRECTION_9 });
      const onlyOne = monsterCard({ linkMarkers: DIRECTION_1 });

      expect(applyClientSideFilters([both], filters)).toEqual([both]);
      expect(applyClientSideFilters([onlyOne], filters)).toEqual([]);
    });

    it('OR指定時はいずれかのマーカー方向を持つカードを残す', () => {
      const { applyClientSideFilters } = getExecution();
      const filters = baseFilters();
      filters.linkMarkers = [1, 9];
      filters.linkMarkerMatchMode = 'or';

      const onlyOne = monsterCard({ linkMarkers: DIRECTION_1 });
      const neither = monsterCard({ linkMarkers: 1 << 5 });

      expect(applyClientSideFilters([onlyOne], filters)).toEqual([onlyOne]);
      expect(applyClientSideFilters([neither], filters)).toEqual([]);
    });

    it('数値ビットフラグに対して例外を投げない（配列扱いしない）', () => {
      const { applyClientSideFilters } = getExecution();
      const filters = baseFilters();
      filters.linkMarkers = [1];
      filters.linkMarkerMatchMode = 'and';

      const card = monsterCard({ linkMarkers: DIRECTION_1 });

      expect(() => applyClientSideFilters([card], filters)).not.toThrow();
    });
  });
});
