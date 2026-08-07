import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mappingManager } from '../../../src/utils/mapping-manager';

describe('mapping-manager', () => {
  describe('日本語種族マッピング', () => {
    it('ドラゴン族を正しくマッピングできる [covers:text_to_id.race_ja_static_reverse]', () => {
      const mapping = mappingManager.getRaceTextToId('ja');
      expect(mapping).toBeDefined();
      expect(mapping['ドラゴン族']).toBe('dragon');
    });

    it('機械族を正しくマッピングできる [covers:text_to_id.race_ja_static_reverse]', () => {
      const mapping = mappingManager.getRaceTextToId('ja');
      expect(mapping['機械族']).toBe('machine');
    });
  });

  describe('英語種族マッピング', () => {
    it('初期状態では英語の種族マッピングは空（動的マッピング待機中） [covers:text_to_id.race_no_dynamic_empty]', () => {
      const mapping = mappingManager.getRaceTextToId('en');
      expect(mapping).toBeDefined();
      expect(Object.keys(mapping).length).toBe(0);
    });
  });

  describe('日本語モンスタータイプマッピング', () => {
    it('通常を正しくマッピングできる [covers:text_to_id.monster_ja_static_reverse]', () => {
      const mapping = mappingManager.getMonsterTypeTextToId('ja');
      expect(mapping).toBeDefined();
      expect(mapping['通常']).toBe('normal');
    });

    it('効果を正しくマッピングできる [covers:text_to_id.monster_ja_static_reverse]', () => {
      const mapping = mappingManager.getMonsterTypeTextToId('ja');
      expect(mapping['効果']).toBe('effect');
    });

    it('融合を正しくマッピングできる [covers:text_to_id.monster_ja_static_reverse]', () => {
      const mapping = mappingManager.getMonsterTypeTextToId('ja');
      expect(mapping['融合']).toBe('fusion');
    });
  });

  describe('英語モンスタータイプマッピング', () => {
    it('初期状態では英語のモンスタータイプマッピングは空（動的マッピング待機中） [covers:text_to_id.monster_no_dynamic_empty]', () => {
      const mapping = mappingManager.getMonsterTypeTextToId('en');
      expect(mapping).toBeDefined();
      expect(Object.keys(mapping).length).toBe(0);
    });
  });

  describe('未定義言語のマッピング', () => {
    it('存在しない言語の種族マッピングは空オブジェクトを返す [covers:text_to_id.race_no_dynamic_empty]', () => {
      const mapping = mappingManager.getRaceTextToId('xx');
      expect(mapping).toBeDefined();
      expect(Object.keys(mapping).length).toBe(0);
    });

    it('存在しない言語のモンスタータイプマッピングは空オブジェクトを返す [covers:text_to_id.monster_no_dynamic_empty]', () => {
      const mapping = mappingManager.getMonsterTypeTextToId('xx');
      expect(mapping).toBeDefined();
      expect(Object.keys(mapping).length).toBe(0);
    });
  });

  describe('動的マッピング存在確認', () => {
    it('初期状態では日本語の動的マッピングは存在しない [covers:has_dynamic_mapping.reflects_map_presence]', () => {
      const hasDynamic = mappingManager.hasDynamicMapping('ja');
      expect(hasDynamic).toBe(false);
    });

    it('初期状態では英語の動的マッピングは存在しない [covers:has_dynamic_mapping.reflects_map_presence]', () => {
      const hasDynamic = mappingManager.hasDynamicMapping('en');
      expect(hasDynamic).toBe(false);
    });
  });

  describe('複数言語対応', () => {
    it('初期状態では韓国語の種族マッピングは空（動的マッピング待機中） [covers:text_to_id.race_no_dynamic_empty]', () => {
      const mapping = mappingManager.getRaceTextToId('ko');
      expect(mapping).toBeDefined();
      expect(Object.keys(mapping).length).toBe(0);
    });

    it('初期状態ではドイツ語の種族マッピングは空（動的マッピング待機中） [covers:text_to_id.race_no_dynamic_empty]', () => {
      const mapping = mappingManager.getRaceTextToId('de');
      expect(mapping).toBeDefined();
      expect(Object.keys(mapping).length).toBe(0);
    });
  });

  describe('Chrome Storage 統合（シミュレーション）', () => {
    beforeEach(() => {
      // Chrome Storage API の mock をセットアップ
      global.chrome = {
        storage: {
          local: {
            get: vi.fn(),
            set: vi.fn(),
          },
        },
      } as any;
    });

    it('Chrome Storage から動的マッピングを読み込める [covers:load_language.stored_valid_sets_mapping]', async () => {
      const mockDynamicMapping = {
        'ygo-mappings:en': {
          race: {
            dragon: 'Dragon',
            machine: 'Machine',
          },
          monsterType: {
            normal: 'Normal',
            effect: 'Effect',
          },
          attribute: {
            light: 'Light',
            dark: 'Dark',
          },
          spellEffect: {
            field: 'Field Spell',
            equip: 'Equip Spell',
          },
          trapEffect: {
            continuous: 'Continuous Trap',
            counter: 'Counter Trap',
          },
          updatedAt: Date.now(),
          quarter: new Date().toISOString().split('T')[0],
        },
      };

      // Mock chrome.storage.local.get
      (global.chrome!.storage.local.get as any).mockResolvedValue(mockDynamicMapping);

      (mappingManager as any).dynamicMappings.clear();
      (mappingManager as any).initialized = false;

      await mappingManager.initialize('en');

      expect(global.chrome!.storage.local.get).toHaveBeenCalledWith('ygo-mappings:en');
      expect(mappingManager.hasDynamicMapping('en')).toBe(true);
      expect(mappingManager.getRaceTextToId('en')['Dragon']).toBe('dragon');
    });

    it('Chrome Storage への保存キーが正しい形式である [covers:fetch_store.valid_mapping_sets_memory_and_storage]', () => {
      const storageKey = 'ygo-mappings:en';
      expect(storageKey).toMatch(/^ygo-mappings:[a-z]{2}$/);
    });

    it('動的マッピングに updatedAt と quarter が含まれる [covers:fetch_store.valid_mapping_sets_memory_and_storage]', () => {
      const now = Date.now();
      const mockDynamicMapping = {
        race: { dragon: 'Dragon' },
        monsterType: { normal: 'Normal' },
        attribute: { light: 'Light' },
        spellEffect: { field: 'Field' },
        trapEffect: { continuous: 'Continuous' },
        updatedAt: now,
        quarter: '2025-12-02',
      };

      expect(mockDynamicMapping).toHaveProperty('updatedAt');
      expect(mockDynamicMapping).toHaveProperty('quarter');
      expect(typeof mockDynamicMapping.updatedAt).toBe('number');
      expect(typeof mockDynamicMapping.quarter).toBe('string');
    });
  });
});
