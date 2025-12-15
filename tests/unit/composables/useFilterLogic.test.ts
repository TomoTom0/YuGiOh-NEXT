import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFilterLogic } from '@/composables/search-filter/useFilterLogic';
import { useSearchStore } from '@/stores/search';
import type { AttributeState } from '@/types/search-exclusion';

describe('useFilterLogic', () => {
  let pageLanguage: { value: string };
  let searchStore: ReturnType<typeof useSearchStore>;

  beforeEach(() => {
    // Piniaを初期化
    setActivePinia(createPinia());
    searchStore = useSearchStore();

    // searchStoreのフィルタを初期化
    searchStore.searchFilters = {
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

    // exclusionResult は computed なので、初期化不要
    pageLanguage = { value: 'ja' };
  });

  describe('selectCardType', () => {
    it('モンスターカードタイプを選択できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.selectCardType('monster');

      expect(searchStore.searchFilters.cardType).toBe('monster');
    });

    it('スペル選択時に他のカードタイプのフィルタがクリアされる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.spellTypes = ['normal'];
      searchStore.searchFilters.trapTypes = ['continuous'];
      searchStore.searchFilters.monsterTypes = [{ type: 'fusion', state: 'normal' }];

      const logic = useFilterLogic(pageLanguage);

      logic.selectCardType('spell');

      expect(searchStore.searchFilters.cardType).toBe('spell');
      expect(searchStore.searchFilters.spellTypes).toEqual(['normal']);
      expect(searchStore.searchFilters.trapTypes).toEqual([]);
      expect(searchStore.searchFilters.monsterTypes).toEqual([]); // モンスター専用フィルタもクリア
    });

    it('罠選択時に他のカードタイプのフィルタがクリアされる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.spellTypes = ['normal'];
      searchStore.searchFilters.trapTypes = ['continuous'];
      searchStore.searchFilters.monsterTypes = [{ type: 'fusion', state: 'normal' }];

      const logic = useFilterLogic(pageLanguage);

      logic.selectCardType('trap');

      expect(searchStore.searchFilters.cardType).toBe('trap');
      expect(searchStore.searchFilters.trapTypes).toEqual(['continuous']);
      expect(searchStore.searchFilters.spellTypes).toEqual([]);
      expect(searchStore.searchFilters.monsterTypes).toEqual([]); // モンスター専用フィルタもクリア
    });

    it('同じカードタイプを選択すると解除される', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'monster';

      const logic = useFilterLogic(pageLanguage);

      logic.selectCardType('monster');

      expect(searchStore.searchFilters.cardType).toBeNull();
    });
  });

  describe('無効化状態の判定', () => {
    it('モンスタータイプフィールドが有効な場合', () => {
      const attrState: AttributeState = { enabled: true };
      searchStore.exclusionResult.attributeStates.set('card-type_monster', attrState);

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isMonsterTypeFieldDisabled.value).toBe(false);
    });

    it('モンスタータイプフィールドが無効な場合', () => {
      const attrState: AttributeState = { enabled: false, disabledReason: '理由' };
      searchStore.exclusionResult.attributeStates.set('card-type_monster', attrState);

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isMonsterTypeFieldDisabled.value).toBe(true);
    });

    it('cardTypeがmonster以外の場合、モンスタータイプフィールドは無効', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'spell';

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isMonsterTypeFieldDisabled.value).toBe(true);
    });
  });

  describe('属性フィルタ操作', () => {
    it('属性を追加できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.toggleAttribute('FIRE');

      expect(searchStore.searchFilters.attributes).toContain('FIRE');
    });

    it('属性を削除できる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.attributes = ['FIRE', 'WATER'];

      const logic = useFilterLogic(pageLanguage);

      logic.toggleAttribute('FIRE');

      expect(searchStore.searchFilters.attributes).not.toContain('FIRE');
      expect(searchStore.searchFilters.attributes).toContain('WATER');
    });
  });

  describe('フィルタクリア', () => {
    it('全てのフィルタをクリアできる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters = {
        cardType: 'monster',
        attributes: ['FIRE'],
        spellTypes: ['normal'],
        trapTypes: ['continuous'],
        races: ['Zombie'],
        monsterTypes: [{ type: 'fusion', state: 'normal' }],
        monsterTypeMatchMode: 'and',
        levelType: 'level',
        levelValues: [1, 2],
        linkValues: [2],
        scaleValues: [5],
        linkMarkers: [1],
        linkMarkerMatchMode: 'and',
        atk: { exact: true, unknown: false, min: 1000, max: 2000 },
        def: { exact: false, unknown: true },
        releaseDate: { from: '2020-01-01', to: '2020-12-31' }
      };

      const logic = useFilterLogic(pageLanguage);

      logic.clearFilters();

      expect(searchStore.searchFilters.cardType).toBeNull();
      expect(searchStore.searchFilters.attributes).toEqual([]);
      expect(searchStore.searchFilters.spellTypes).toEqual([]);
      expect(searchStore.searchFilters.trapTypes).toEqual([]);
      expect(searchStore.searchFilters.races).toEqual([]);
      expect(searchStore.searchFilters.monsterTypes).toEqual([]);
      expect(searchStore.searchFilters.levelValues).toEqual([]);
      expect(searchStore.searchFilters.linkValues).toEqual([]);
      expect(searchStore.searchFilters.scaleValues).toEqual([]);
      expect(searchStore.searchFilters.linkMarkers).toEqual([]);
      expect(searchStore.searchFilters.atk.exact).toBe(false);
      expect(searchStore.searchFilters.def.exact).toBe(false);
      expect(searchStore.searchFilters.releaseDate).toEqual({});
    });
  });

  describe('モンスタータイプ操作', () => {
    it('モンスタータイプを追加できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.cycleMonsterTypeState('fusion');

      expect(searchStore.searchFilters.monsterTypes).toHaveLength(1);
      expect(searchStore.searchFilters.monsterTypes[0]).toEqual({ type: 'fusion', state: 'normal' });
    });

    it('モンスタータイプのクラス取得ができる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.monsterTypes = [
        { type: 'fusion', state: 'normal' },
        { type: 'synchro', state: 'not' }
      ];

      const logic = useFilterLogic(pageLanguage);

      expect(logic.getMonsterTypeClass('fusion')).toBe('active');
      expect(logic.getMonsterTypeClass('synchro')).toBe('not');
      expect(logic.getMonsterTypeClass('xyz')).toBe('');
    });

    it('モンスタータイプの状態を normal から not に切り替えられる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.monsterTypes = [{ type: 'fusion', state: 'normal' }];

      const logic = useFilterLogic(pageLanguage);

      logic.cycleMonsterTypeState('fusion');

      expect(searchStore.searchFilters.monsterTypes[0].state).toBe('not');
    });

    it('モンスタータイプの状態を not から削除できる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.monsterTypes = [{ type: 'fusion', state: 'not' }];

      const logic = useFilterLogic(pageLanguage);

      logic.cycleMonsterTypeState('fusion');

      expect(searchStore.searchFilters.monsterTypes).toHaveLength(0);
    });

    it('モンスタータイプのマッチモードを切り替えられる', () => {
      // Removed filtersRef initialization (now using searchStore)

      const logic = useFilterLogic(pageLanguage);

      logic.toggleMonsterTypeMatchMode();

      expect(searchStore.searchFilters.monsterTypeMatchMode).toBe('and');

      logic.toggleMonsterTypeMatchMode();

      expect(searchStore.searchFilters.monsterTypeMatchMode).toBe('or');
    });
  });

  describe('レベル値アクティブ判定', () => {
    it('levelType が level の場合、levelValues をチェック', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.levelType = 'level';
      searchStore.searchFilters.levelValues = [1, 3];

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isLevelValueActive(1)).toBe(true);
      expect(logic.isLevelValueActive(3)).toBe(true);
      expect(logic.isLevelValueActive(2)).toBe(false);
    });

    it('levelType が scale の場合、scaleValues をチェック', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.levelType = 'scale';
      searchStore.searchFilters.scaleValues = [3, 7];

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isLevelValueActive(3)).toBe(true);
      expect(logic.isLevelValueActive(7)).toBe(true);
      expect(logic.isLevelValueActive(5)).toBe(false);
    });
  });

  describe('レベル・リンク・スケール操作', () => {
    it('レベル値を追加・削除できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.toggleLevelValue(1);
      expect(searchStore.searchFilters.levelValues).toContain(1);

      logic.toggleLevelValue(1);
      expect(searchStore.searchFilters.levelValues).not.toContain(1);
    });

    it('スケール値を追加・削除できる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.levelType = 'scale';

      const logic = useFilterLogic(pageLanguage);

      logic.toggleLevelValue(5);
      expect(searchStore.searchFilters.scaleValues).toContain(5);

      logic.toggleLevelValue(5);
      expect(searchStore.searchFilters.scaleValues).not.toContain(5);
    });

    it('levelType が level の場合、toggleLevelValue は levelValues を変更', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.levelType = 'level';
      searchStore.searchFilters.scaleValues = [5];

      const logic = useFilterLogic(pageLanguage);

      logic.toggleLevelValue(1);

      expect(searchStore.searchFilters.levelValues).toContain(1);
      expect(searchStore.searchFilters.scaleValues).toEqual([5]); // scaleValues は変更されない
    });

    it('levelType が scale の場合、toggleLevelValue は scaleValues を変更', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.levelType = 'scale';

      const logic = useFilterLogic(pageLanguage);

      logic.toggleLevelValue(5);

      expect(searchStore.searchFilters.scaleValues).toContain(5);
      expect(searchStore.searchFilters.levelValues).toEqual([]); // levelValues は変更されない
    });

    it('リンク値を追加・削除できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.toggleLinkValue(2);
      expect(searchStore.searchFilters.linkValues).toContain(2);

      logic.toggleLinkValue(2);
      expect(searchStore.searchFilters.linkValues).not.toContain(2);
    });
  });

  describe('リンクマーカー操作', () => {
    it('リンクマーカーを追加・削除できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.toggleLinkMarker(1);
      expect(searchStore.searchFilters.linkMarkers).toContain(1);

      logic.toggleLinkMarker(1);
      expect(searchStore.searchFilters.linkMarkers).not.toContain(1);
    });

    it('リンクマーカーのマッチモードを切り替えられる', () => {
      // Removed filtersRef initialization (now using searchStore)

      const logic = useFilterLogic(pageLanguage);

      logic.toggleLinkMarkerMatchMode();
      expect(searchStore.searchFilters.linkMarkerMatchMode).toBe('and');

      logic.toggleLinkMarkerMatchMode();
      expect(searchStore.searchFilters.linkMarkerMatchMode).toBe('or');
    });

    it('pos=5のリンクマーカーは常に非アクティブ', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.isLinkMarkerActive(5)).toBe(false);
    });
  });

  describe('フィールド無効化判定', () => {
    it('モンスター以外が選択された時、モンスター専用フィールドは無効', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'spell';

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isFieldDisabled('attribute')).toBe(true);
      expect(logic.isFieldDisabled('race')).toBe(true);
      expect(logic.isFieldDisabled('level-rank')).toBe(true);
    });

    it('モンスターが選択された時、モンスター専用フィールドは有効', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'monster';

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isFieldDisabled('attribute')).toBe(false);
      expect(logic.isFieldDisabled('race')).toBe(false);
    });

    it('魔法以外が選択された時、魔法タイプフィールドは無効', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'trap';

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isFieldDisabled('spell-type')).toBe(true);
    });
  });

  describe('リンクマーカーアクティブ判定', () => {
    it('pos=5のリンクマーカーは常に非アクティブ（既テスト）', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.isLinkMarkerActive(5)).toBe(false);
    });

    it('pos≠5でリンクマーカーが追加されている場合はアクティブ', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.linkMarkers = [1, 3];

      const logic = useFilterLogic(pageLanguage);

      expect(logic.isLinkMarkerActive(1)).toBe(true);
      expect(logic.isLinkMarkerActive(3)).toBe(true);
      expect(logic.isLinkMarkerActive(7)).toBe(false);
      expect(logic.isLinkMarkerActive(2)).toBe(false);
    });
  });

  describe('レベルタイプ設定', () => {
    it('レベルタイプをスケールに変更できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.setLevelType('scale');

      expect(searchStore.searchFilters.levelType).toBe('scale');
    });

    it('レベルタイプをリンクに変更できる', () => {
      const logic = useFilterLogic(pageLanguage);

      logic.setLevelType('link');

      expect(searchStore.searchFilters.levelType).toBe('link');
    });
  });

  describe('アクティブフィルタ表示', () => {
    it('フィルタがない場合、hasActiveFilters は false', () => {
      const logic = useFilterLogic(pageLanguage);

      expect(logic.hasActiveFilters.value).toBe(false);
      expect(logic.activeConditionChips.value).toEqual([]);
    });

    it('cardType が設定されている場合、activeConditionChips に含まれる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'monster';

      const logic = useFilterLogic(pageLanguage);

      expect(logic.hasActiveFilters.value).toBe(true);
      expect(logic.activeConditionChips.value).toContain('モンスター');
    });

    it('複数のフィルタが設定されている場合、全て activeConditionChips に含まれる', () => {
      // searchStoreのフィルタを事前に設定
      searchStore.searchFilters.cardType = 'monster';
      searchStore.searchFilters.attributes = ['FIRE', 'WATER'];
      searchStore.searchFilters.races = ['Dragon'];

      const logic = useFilterLogic(pageLanguage);

      expect(logic.hasActiveFilters.value).toBe(true);
      expect(logic.activeConditionChips.value).toContain('モンスター');
      expect(logic.activeConditionChips.value).toContain('属性:2件');
      expect(logic.activeConditionChips.value).toContain('種族:1件');
    });
  });
});
