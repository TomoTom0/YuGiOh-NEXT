import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { useFilterLogic } from '@/composables/search-filter/useFilterLogic';
import { useSearchStore } from '@/stores/search';
import { buildSearchOptions } from '@/utils/search-options-builder';

describe('決定的検証: AND指定が実際にbuildSearchOptionsへ正しく伝わるか（DOM/クリック不使用）', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('融合→シンクロの順でクリック相当の操作をしてANDにトグルすると、両方normalかつAND', () => {
    const searchStore = useSearchStore();
    const pageLanguage = ref('ja');
    const filterLogic = useFilterLogic(pageLanguage);

    filterLogic.cycleMonsterTypeState('fusion');
    filterLogic.cycleMonsterTypeState('synchro');
    filterLogic.toggleMonsterTypeMatchMode();

    console.log('monsterTypes:', JSON.stringify(searchStore.searchFilters.monsterTypes));
    console.log('monsterTypeMatchMode:', searchStore.searchFilters.monsterTypeMatchMode);

    expect(searchStore.searchFilters.monsterTypes).toEqual([
      { type: 'fusion', state: 'normal' },
      { type: 'synchro', state: 'normal' }
    ]);
    expect(searchStore.searchFilters.monsterTypeMatchMode).toBe('and');

    const options = buildSearchOptions('ドラゴン', '1', 1 as any, searchStore.searchFilters);
    console.log('buildSearchOptions結果:', JSON.stringify(options, null, 2));

    expect(options.monsterTypes).toEqual(['fusion', 'synchro']);
    expect(options.monsterTypeLogic).toBe('AND');
  });

  it('シンクロ→融合の順でも同様に両方normalかつAND', () => {
    const searchStore = useSearchStore();
    const pageLanguage = ref('ja');
    const filterLogic = useFilterLogic(pageLanguage);

    filterLogic.cycleMonsterTypeState('synchro');
    filterLogic.cycleMonsterTypeState('fusion');
    filterLogic.toggleMonsterTypeMatchMode();

    expect(searchStore.searchFilters.monsterTypes).toEqual([
      { type: 'synchro', state: 'normal' },
      { type: 'fusion', state: 'normal' }
    ]);
    expect(searchStore.searchFilters.monsterTypeMatchMode).toBe('and');

    const options = buildSearchOptions('ドラゴン', '1', 1 as any, searchStore.searchFilters);
    expect(options.monsterTypes).toEqual(['synchro', 'fusion']);
    expect(options.monsterTypeLogic).toBe('AND');
  });
});
