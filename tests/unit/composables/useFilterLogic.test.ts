import { describe, it, expect, beforeEach } from 'vitest';
import { ref, reactive } from 'vue';
import { useFilterLogic } from '@/composables/search-filter/useFilterLogic';
import type { SearchFilters } from '@/types/search-filters';
import type { ExclusionResult, FieldState, AttributeState } from '@/types/search-exclusion';

describe('useFilterLogic', () => {
  let filters: SearchFilters;
  let exclusionResult: { value: ExclusionResult };
  let pageLanguage: { value: string };
  let appliedFilters: SearchFilters | null = null;

  beforeEach(() => {
    filters = {
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

    exclusionResult = {
      value: {
        fieldStates: new Map<string, FieldState>(),
        attributeStates: new Map<string, AttributeState>()
      }
    };

    pageLanguage = { value: 'ja' };
    appliedFilters = null;
  });

  describe('selectCardType', () => {
    it('モンスターカードタイプを選択できる', () => {
      const logic = useFilterLogic(
        reactive(filters),
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.selectCardType('monster');

      expect(filters.cardType).toBe('monster');
      expect(appliedFilters?.cardType).toBe('monster');
    });

    it('スペル選択時に他のカードタイプのフィルタがクリアされる', () => {
      const filtersRef = reactive({
        ...filters,
        spellTypes: ['normal'],
        trapTypes: ['continuous'],
        monsterTypes: [{ type: 'fusion', state: 'normal' }]
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.selectCardType('spell');

      expect(filtersRef.cardType).toBe('spell');
      expect(filtersRef.spellTypes).toEqual(['normal']);
      expect(filtersRef.trapTypes).toEqual([]);
      expect(filtersRef.monsterTypes).toEqual([]); // モンスター専用フィルタもクリア
    });

    it('罠選択時に他のカードタイプのフィルタがクリアされる', () => {
      const filtersRef = reactive({
        ...filters,
        spellTypes: ['normal'],
        trapTypes: ['continuous'],
        monsterTypes: [{ type: 'fusion', state: 'normal' }]
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.selectCardType('trap');

      expect(filtersRef.cardType).toBe('trap');
      expect(filtersRef.trapTypes).toEqual(['continuous']);
      expect(filtersRef.spellTypes).toEqual([]);
      expect(filtersRef.monsterTypes).toEqual([]); // モンスター専用フィルタもクリア
    });

    it('同じカードタイプを選択すると解除される', () => {
      const filtersRef = reactive({
        ...filters,
        cardType: 'monster'
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.selectCardType('monster');

      expect(filtersRef.cardType).toBeNull();
    });
  });

  describe('無効化状態の判定', () => {
    it('モンスタータイプフィールドが有効な場合', () => {
      const attrState: AttributeState = { enabled: true };
      exclusionResult.value.attributeStates.set('card-type_monster', attrState);

      const logic = useFilterLogic(
        reactive(filters),
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.isMonsterTypeFieldDisabled.value).toBe(false);
    });

    it('モンスタータイプフィールドが無効な場合', () => {
      const attrState: AttributeState = { enabled: false, disabledReason: '理由' };
      exclusionResult.value.attributeStates.set('card-type_monster', attrState);

      const logic = useFilterLogic(
        reactive(filters),
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.isMonsterTypeFieldDisabled.value).toBe(true);
    });

    it('cardTypeがmonster以外の場合、モンスタータイプフィールドは無効', () => {
      const filtersRef = reactive({
        ...filters,
        cardType: 'spell'
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.isMonsterTypeFieldDisabled.value).toBe(true);
    });
  });

  describe('属性フィルタ操作', () => {
    it('属性を追加できる', () => {
      const logic = useFilterLogic(
        reactive(filters),
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.toggleAttribute('FIRE');

      expect(filters.attributes).toContain('FIRE');
      expect(appliedFilters?.attributes).toContain('FIRE');
    });

    it('属性を削除できる', () => {
      const filtersRef = reactive({
        ...filters,
        attributes: ['FIRE', 'WATER']
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.toggleAttribute('FIRE');

      expect(filtersRef.attributes).not.toContain('FIRE');
      expect(filtersRef.attributes).toContain('WATER');
    });
  });

  describe('フィルタクリア', () => {
    it('全てのフィルタをクリアできる', () => {
      const filtersRef = reactive({
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
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.clearFilters();

      expect(filtersRef.cardType).toBeNull();
      expect(filtersRef.attributes).toEqual([]);
      expect(filtersRef.spellTypes).toEqual([]);
      expect(filtersRef.trapTypes).toEqual([]);
      expect(filtersRef.races).toEqual([]);
      expect(filtersRef.monsterTypes).toEqual([]);
      expect(filtersRef.levelValues).toEqual([]);
      expect(filtersRef.linkValues).toEqual([]);
      expect(filtersRef.scaleValues).toEqual([]);
      expect(filtersRef.linkMarkers).toEqual([]);
      expect(filtersRef.atk.exact).toBe(false);
      expect(filtersRef.def.exact).toBe(false);
      expect(filtersRef.releaseDate).toEqual({});
    });
  });

  describe('モンスタータイプ操作', () => {
    it('モンスタータイプを追加できる', () => {
      const logic = useFilterLogic(
        reactive(filters),
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.cycleMonsterTypeState('fusion');

      expect(filters.monsterTypes).toHaveLength(1);
      expect(filters.monsterTypes[0]).toEqual({ type: 'fusion', state: 'normal' });
    });

    it('モンスタータイプのクラス取得ができる', () => {
      const filtersRef = reactive({
        ...filters,
        monsterTypes: [
          { type: 'fusion', state: 'normal' },
          { type: 'synchro', state: 'not' }
        ]
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.getMonsterTypeClass('fusion')).toBe('active');
      expect(logic.getMonsterTypeClass('synchro')).toBe('not');
      expect(logic.getMonsterTypeClass('xyz')).toBe('');
    });

    it('モンスタータイプの状態を normal から not に切り替えられる', () => {
      const filtersRef = reactive({
        ...filters,
        monsterTypes: [{ type: 'fusion', state: 'normal' }]
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.cycleMonsterTypeState('fusion');

      expect(filtersRef.monsterTypes[0].state).toBe('not');
    });

    it('モンスタータイプの状態を not から削除できる', () => {
      const filtersRef = reactive({
        ...filters,
        monsterTypes: [{ type: 'fusion', state: 'not' }]
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.cycleMonsterTypeState('fusion');

      expect(filtersRef.monsterTypes).toHaveLength(0);
    });

    it('モンスタータイプのマッチモードを切り替えられる', () => {
      const filtersRef = reactive({
        ...filters,
        monsterTypeMatchMode: 'or'
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.toggleMonsterTypeMatchMode();

      expect(filtersRef.monsterTypeMatchMode).toBe('and');

      logic.toggleMonsterTypeMatchMode();

      expect(filtersRef.monsterTypeMatchMode).toBe('or');
    });
  });

  describe('レベル値アクティブ判定', () => {
    it('levelType が level の場合、levelValues をチェック', () => {
      const filtersRef = reactive({
        ...filters,
        levelType: 'level',
        levelValues: [1, 3, 5]
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.isLevelValueActive(1)).toBe(true);
      expect(logic.isLevelValueActive(3)).toBe(true);
      expect(logic.isLevelValueActive(2)).toBe(false);
    });

    it('levelType が scale の場合、scaleValues をチェック', () => {
      const filtersRef = reactive({
        ...filters,
        levelType: 'scale',
        scaleValues: [3, 7, 11]
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.isLevelValueActive(3)).toBe(true);
      expect(logic.isLevelValueActive(7)).toBe(true);
      expect(logic.isLevelValueActive(5)).toBe(false);
    });
  });

  describe('レベル・リンク・スケール操作', () => {
    it('レベル値を追加・削除できる', () => {
      const logic = useFilterLogic(
        reactive(filters),
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.toggleLevelValue(1);
      expect(filters.levelValues).toContain(1);

      logic.toggleLevelValue(1);
      expect(filters.levelValues).not.toContain(1);
    });

    it('スケール値を追加・削除できる', () => {
      const filtersRef = reactive({
        ...filters,
        levelType: 'scale'
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.toggleLevelValue(5);
      expect(filtersRef.scaleValues).toContain(5);

      logic.toggleLevelValue(5);
      expect(filtersRef.scaleValues).not.toContain(5);
    });

    it('levelType が level の場合、toggleLevelValue は levelValues を変更', () => {
      const filtersRef = reactive({
        ...filters,
        levelType: 'level',
        scaleValues: [5]
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      logic.toggleLevelValue(1);

      expect(filtersRef.levelValues).toContain(1);
      expect(filtersRef.scaleValues).toEqual([5]); // scaleValues は変更されない
    });

    it('levelType が scale の場合、toggleLevelValue は scaleValues を変更', () => {
      const filtersRef = reactive({
        ...filters,
        levelType: 'scale'
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      logic.toggleLevelValue(5);

      expect(filtersRef.scaleValues).toContain(5);
      expect(filtersRef.levelValues).toEqual([]); // levelValues は変更されない
    });

    it('リンク値を追加・削除できる', () => {
      const logic = useFilterLogic(
        reactive(filters),
        exclusionResult,
        pageLanguage,
        () => {}
      );

      logic.toggleLinkValue(2);
      expect(filters.linkValues).toContain(2);

      logic.toggleLinkValue(2);
      expect(filters.linkValues).not.toContain(2);
    });
  });

  describe('リンクマーカー操作', () => {
    it('リンクマーカーを追加・削除できる', () => {
      const logic = useFilterLogic(
        reactive(filters),
        exclusionResult,
        pageLanguage,
        () => {}
      );

      logic.toggleLinkMarker(1);
      expect(filters.linkMarkers).toContain(1);

      logic.toggleLinkMarker(1);
      expect(filters.linkMarkers).not.toContain(1);
    });

    it('リンクマーカーのマッチモードを切り替えられる', () => {
      const filtersRef = reactive({
        ...filters,
        linkMarkerMatchMode: 'or'
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      logic.toggleLinkMarkerMatchMode();
      expect(filtersRef.linkMarkerMatchMode).toBe('and');

      logic.toggleLinkMarkerMatchMode();
      expect(filtersRef.linkMarkerMatchMode).toBe('or');
    });

    it('pos=5のリンクマーカーは常に非アクティブ', () => {
      const logic = useFilterLogic(
        reactive(filters),
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.isLinkMarkerActive(5)).toBe(false);
    });
  });

  describe('フィールド無効化判定', () => {
    it('モンスター以外が選択された時、モンスター専用フィールドは無効', () => {
      const filtersRef = reactive({
        ...filters,
        cardType: 'spell'
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.isFieldDisabled('attribute')).toBe(true);
      expect(logic.isFieldDisabled('race')).toBe(true);
      expect(logic.isFieldDisabled('level-rank')).toBe(true);
    });

    it('モンスターが選択された時、モンスター専用フィールドは有効', () => {
      const filtersRef = reactive({
        ...filters,
        cardType: 'monster'
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.isFieldDisabled('attribute')).toBe(false);
      expect(logic.isFieldDisabled('race')).toBe(false);
    });

    it('魔法以外が選択された時、魔法タイプフィールドは無効', () => {
      const filtersRef = reactive({
        ...filters,
        cardType: 'monster'
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.isFieldDisabled('spell-type')).toBe(true);
    });
  });

  describe('リンクマーカーアクティブ判定', () => {
    it('pos=5のリンクマーカーは常に非アクティブ（既テスト）', () => {
      const logic = useFilterLogic(
        reactive(filters),
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.isLinkMarkerActive(5)).toBe(false);
    });

    it('pos≠5でリンクマーカーが追加されている場合はアクティブ', () => {
      const filtersRef = reactive({
        ...filters,
        linkMarkers: [1, 3, 7]
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.isLinkMarkerActive(1)).toBe(true);
      expect(logic.isLinkMarkerActive(3)).toBe(true);
      expect(logic.isLinkMarkerActive(7)).toBe(true);
      expect(logic.isLinkMarkerActive(2)).toBe(false);
    });
  });

  describe('レベルタイプ設定', () => {
    it('レベルタイプをスケールに変更できる', () => {
      const filtersRef = reactive({
        ...filters,
        levelType: 'level'
      });

      let appliedFilters = null;
      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.setLevelType('scale');

      expect(filtersRef.levelType).toBe('scale');
      expect((appliedFilters as any)?.levelType).toBe('scale');
    });

    it('レベルタイプをリンクに変更できる', () => {
      const filtersRef = reactive({
        ...filters,
        levelType: 'scale'
      });

      let appliedFilters = null;
      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        (event, newFilters) => {
          if (event === 'apply') appliedFilters = newFilters;
        }
      );

      logic.setLevelType('link');

      expect(filtersRef.levelType).toBe('link');
      expect((appliedFilters as any)?.levelType).toBe('link');
    });
  });

  describe('アクティブフィルタ表示', () => {
    it('フィルタがない場合、hasActiveFilters は false', () => {
      const logic = useFilterLogic(
        reactive(filters),
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.hasActiveFilters.value).toBe(false);
      expect(logic.activeConditionChips.value).toEqual([]);
    });

    it('cardType が設定されている場合、activeConditionChips に含まれる', () => {
      const filtersRef = reactive({
        ...filters,
        cardType: 'monster'
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.hasActiveFilters.value).toBe(true);
      expect(logic.activeConditionChips.value).toContain('モンスター');
    });

    it('複数のフィルタが設定されている場合、全て activeConditionChips に含まれる', () => {
      const filtersRef = reactive({
        ...filters,
        cardType: 'monster',
        attributes: ['FIRE', 'WATER'],
        races: ['Zombie']
      });

      const logic = useFilterLogic(
        filtersRef,
        exclusionResult,
        pageLanguage,
        () => {}
      );

      expect(logic.hasActiveFilters.value).toBe(true);
      expect(logic.activeConditionChips.value).toContain('モンスター');
      expect(logic.activeConditionChips.value).toContain('属性:2件');
      expect(logic.activeConditionChips.value).toContain('種族:1件');
    });
  });
});
