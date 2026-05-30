/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mappingManager, initializeMappingManager } from '../mapping-manager';
import type {
  Race,
  MonsterType,
  Attribute,
  SpellEffectType,
  TrapEffectType,
} from '@/types/card-maps';

// モック用のストレージデータ
let mockStorage: Record<string, any> = {};

// Chrome Storage API のモック
beforeEach(() => {
  mockStorage = {};

  // Chrome API のモック
  global.chrome = {
    runtime: {
      id: 'test-extension-id',
      lastError: undefined,
    },
    storage: {
      local: {
        get: vi.fn((keys, callback) => {
          let result: Record<string, any> = {};
          if (typeof keys === 'string') {
            result = { [keys]: mockStorage[keys] };
          } else if (Array.isArray(keys)) {
            keys.forEach((key) => {
              result[key] = mockStorage[key];
            });
          } else {
            result = { ...mockStorage };
          }
          if (callback) {
            callback(result);
          }
          return Promise.resolve(result);
        }),
        set: vi.fn((items, callback) => {
          Object.assign(mockStorage, items);
          if (callback) {
            callback();
          }
          return Promise.resolve();
        }),
        remove: vi.fn((keys, callback) => {
          if (Array.isArray(keys)) {
            keys.forEach((key) => delete mockStorage[key]);
          } else {
            delete mockStorage[keys as string];
          }
          if (callback) {
            callback();
          }
          return Promise.resolve();
        }),
        clear: vi.fn((callback) => {
          mockStorage = {};
          if (callback) {
            callback();
          }
          return Promise.resolve();
        }),
      } as any,
      sync: {
        get: vi.fn((keys, callback) => {
          let result: Record<string, any> = {};
          if (typeof keys === 'string') {
            result = { [keys]: mockStorage[keys] };
          } else if (Array.isArray(keys)) {
            keys.forEach((key) => {
              result[key] = mockStorage[key];
            });
          } else {
            result = { ...mockStorage };
          }
          if (callback) {
            callback(result);
          }
          return Promise.resolve(result);
        }),
      } as any,
    },
  } as any;

  // MappingManager の初期化フラグをリセット（プライベートプロパティなので直接操作）
  (mappingManager as any).initialized = false;
  (mappingManager as any).dynamicMappings.clear();
  (mappingManager as any).fetchingLanguages.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// 1. isValidMapping() のテスト（プライベートメソッド経由確認）
// ============================================================
describe('MappingManager - isValidMapping', () => {
  it('有効なマッピングを受け入れる', async () => {
    const validMapping = {
      race: { dragon: 'Dragon', spellcaster: 'Spellcaster' },
      monsterType: { normal: 'Normal', effect: 'Effect' },
      attribute: { dark: 'DARK', light: 'LIGHT' },
      spellEffect: { equip: 'Equip', field: 'Field' },
      trapEffect: { counter: 'Counter', continuous: 'Continuous' },
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = validMapping;

    await mappingManager.initialize('en');

    // hasDynamicMapping が true であれば、isValidMapping を通過した証拠
    expect(mappingManager.hasDynamicMapping('en')).toBe(true);
  });

  it('race が空のマッピングを拒否する', async () => {
    const invalidMapping = {
      race: {}, // 空
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = invalidMapping;

    // fetchAndStoreMappings をモック（実際には fetch しない）
    vi.spyOn(mappingManager as any, 'fetchAndStoreMappings').mockResolvedValue(undefined);

    await mappingManager.initialize('en');

    // 無効なマッピングなので動的マッピングは設定されない
    expect(mappingManager.hasDynamicMapping('en')).toBe(false);
  });

  it('monsterType が空のマッピングを拒否する', async () => {
    const invalidMapping = {
      race: { dragon: 'Dragon' },
      monsterType: {}, // 空
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = invalidMapping;

    vi.spyOn(mappingManager as any, 'fetchAndStoreMappings').mockResolvedValue(undefined);

    await mappingManager.initialize('en');

    expect(mappingManager.hasDynamicMapping('en')).toBe(false);
  });

  it('attribute が空のマッピングを拒否する', async () => {
    const invalidMapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal' },
      attribute: {}, // 空
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = invalidMapping;

    vi.spyOn(mappingManager as any, 'fetchAndStoreMappings').mockResolvedValue(undefined);

    await mappingManager.initialize('en');

    expect(mappingManager.hasDynamicMapping('en')).toBe(false);
  });
});

// ============================================================
// 2. initialize() のテスト
// ============================================================
describe('MappingManager - initialize', () => {
  it('言語を指定せずに初期化できる', async () => {
    await mappingManager.initialize();

    expect((mappingManager as any).initialized).toBe(true);
  });

  it('言語を指定して初期化し、ストレージからマッピングをロードする', async () => {
    const mapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = mapping;

    await mappingManager.initialize('en');

    expect((mappingManager as any).initialized).toBe(true);
    expect(mappingManager.hasDynamicMapping('en')).toBe(true);
  });

  it('無効なマッピングがストレージにある場合、fetchAndStoreMappings を呼ぶ', async () => {
    const invalidMapping = {
      race: {}, // 空
      monsterType: {},
      attribute: {},
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = invalidMapping;

    const fetchSpy = vi.spyOn(mappingManager as any, 'fetchAndStoreMappings').mockResolvedValue(undefined);

    await mappingManager.initialize('en');

    expect(fetchSpy).toHaveBeenCalledWith('en');
  });

  it('ストレージにマッピングがない場合、fetchAndStoreMappings を呼ぶ', async () => {
    const fetchSpy = vi.spyOn(mappingManager as any, 'fetchAndStoreMappings').mockResolvedValue(undefined);

    await mappingManager.initialize('fr');

    expect(fetchSpy).toHaveBeenCalledWith('fr');
  });

  it('既に初期化済みの場合、再度初期化しない', async () => {
    await mappingManager.initialize('en');

    const fetchSpy = vi.spyOn(mappingManager as any, 'fetchAndStoreMappings').mockResolvedValue(undefined);

    // 2回目の呼び出し
    await mappingManager.initialize('fr');

    // 初期化済みなので fetch は呼ばれない
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ============================================================
// 3. getRaceTextToId() のテスト
// ============================================================
describe('MappingManager - getRaceTextToId', () => {
  it('日本語の場合、静的マッピングの逆引きを返す', () => {
    const result = mappingManager.getRaceTextToId('ja');

    expect(result).toHaveProperty('ドラゴン族');
    expect(result['ドラゴン族']).toBe('dragon');
  });

  it('英語の動的マッピングを返す', async () => {
    const mapping = {
      race: { dragon: 'Dragon', spellcaster: 'Spellcaster' },
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = mapping;

    await mappingManager.initialize('en');

    const result = mappingManager.getRaceTextToId('en');

    expect(result).toEqual({
      Dragon: 'dragon',
      Spellcaster: 'spellcaster',
    });
  });

  it('動的マッピングがない場合、空オブジェクトを返す', () => {
    const result = mappingManager.getRaceTextToId('de');

    expect(result).toEqual({});
  });

  it('動的マッピングのraceが空の場合、空オブジェクトを返す', async () => {
    const mapping = {
      race: {},
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    (mappingManager as any).dynamicMappings.set('es', mapping);

    const result = mappingManager.getRaceTextToId('es');

    expect(result).toEqual({});
  });
});

// ============================================================
// 4. getMonsterTypeTextToId() のテスト
// ============================================================
describe('MappingManager - getMonsterTypeTextToId', () => {
  it('日本語の場合、静的マッピングの逆引きを返す', () => {
    const result = mappingManager.getMonsterTypeTextToId('ja');

    expect(result).toHaveProperty('通常');
    expect(result['通常']).toBe('normal');
  });

  it('英語の動的マッピングを返す', async () => {
    const mapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal', effect: 'Effect' },
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = mapping;

    await mappingManager.initialize('en');

    const result = mappingManager.getMonsterTypeTextToId('en');

    expect(result).toEqual({
      Normal: 'normal',
      Effect: 'effect',
    });
  });

  it('動的マッピングがない場合、空オブジェクトを返す', () => {
    const result = mappingManager.getMonsterTypeTextToId('it');

    expect(result).toEqual({});
  });
});

// ============================================================
// 5. getAttributeTextToId() のテスト
// ============================================================
describe('MappingManager - getAttributeTextToId', () => {
  it('日本語の場合、静的マッピングの逆引きを返す', () => {
    const result = mappingManager.getAttributeTextToId('ja');

    expect(result).toHaveProperty('闇');
    expect(result['闇']).toBe('dark');
  });

  it('英語の動的マッピングを返す', async () => {
    const mapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK', light: 'LIGHT' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = mapping;

    await mappingManager.initialize('en');

    const result = mappingManager.getAttributeTextToId('en');

    expect(result).toEqual({
      DARK: 'dark',
      LIGHT: 'light',
    });
  });

  it('動的マッピングがない場合、空オブジェクトを返す', () => {
    const result = mappingManager.getAttributeTextToId('pt');

    expect(result).toEqual({});
  });
});

// ============================================================
// 6. getSpellEffectTextToId() のテスト
// ============================================================
describe('MappingManager - getSpellEffectTextToId', () => {
  it('日本語の場合、静的マッピングの逆引きを返す', () => {
    const result = mappingManager.getSpellEffectTextToId('ja');

    expect(result).toHaveProperty('装備');
    expect(result['装備']).toBe('equip');
  });

  it('英語の動的マッピングを返す', async () => {
    const mapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK' },
      spellEffect: { equip: 'Equip', field: 'Field' },
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = mapping;

    await mappingManager.initialize('en');

    const result = mappingManager.getSpellEffectTextToId('en');

    expect(result).toEqual({
      Equip: 'equip',
      Field: 'field',
    });
  });

  it('動的マッピングがない場合、空オブジェクトを返す', () => {
    const result = mappingManager.getSpellEffectTextToId('ko');

    expect(result).toEqual({});
  });
});

// ============================================================
// 7. getTrapEffectTextToId() のテスト
// ============================================================
describe('MappingManager - getTrapEffectTextToId', () => {
  it('動的マッピングがある場合、動的マッピングを返す', async () => {
    const mapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: { counter: 'Counter', continuous: 'Continuous' },
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = mapping;

    await mappingManager.initialize('en');

    const result = mappingManager.getTrapEffectTextToId('en');

    expect(result).toEqual({
      Counter: 'counter',
      Continuous: 'continuous',
    });
  });

  it('動的マッピングがない場合、日本語静的マッピングを返す', () => {
    const result = mappingManager.getTrapEffectTextToId('de');

    expect(result).toHaveProperty('カウンター');
    expect(result['カウンター']).toBe('counter');
  });
});

// ============================================================
// 8. getRaceIdToText() のテスト
// ============================================================
describe('MappingManager - getRaceIdToText', () => {
  it('日本語の場合、静的マッピングを返す', () => {
    const result = mappingManager.getRaceIdToText('ja');

    expect(result).toHaveProperty('dragon');
    expect(result['dragon']).toBe('ドラゴン族');
  });

  it('英語の動的マッピングを返す', async () => {
    const mapping = {
      race: { dragon: 'Dragon', spellcaster: 'Spellcaster' },
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = mapping;

    await mappingManager.initialize('en');

    const result = mappingManager.getRaceIdToText('en');

    expect(result).toEqual({
      dragon: 'Dragon',
      spellcaster: 'Spellcaster',
    });
  });

  it('動的マッピングがない場合、空オブジェクトを返す', () => {
    const result = mappingManager.getRaceIdToText('zh-CN');

    expect(result).toEqual({});
  });
});

// ============================================================
// 9. getMonsterTypeIdToText() のテスト
// ============================================================
describe('MappingManager - getMonsterTypeIdToText', () => {
  it('日本語の場合、常に静的マッピングを返す', () => {
    const result = mappingManager.getMonsterTypeIdToText('ja');

    expect(result).toHaveProperty('normal');
    expect(result['normal']).toBe('通常');
  });

  it('英語の動的マッピングを返す', async () => {
    const mapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal', effect: 'Effect' },
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = mapping;

    await mappingManager.initialize('en');

    const result = mappingManager.getMonsterTypeIdToText('en');

    expect(result).toEqual({
      normal: 'Normal',
      effect: 'Effect',
    });
  });

  it('動的マッピングがない場合、空オブジェクトを返す（日本語以外）', () => {
    const result = mappingManager.getMonsterTypeIdToText('es');

    expect(result).toEqual({});
  });

  it('日本語の動的マッピングがあれば、動的マッピングを返す', async () => {
    const mapping = {
      race: { dragon: 'ドラゴン族' },
      monsterType: { normal: '通常（動的）', effect: '効果（動的）' },
      attribute: { dark: '闇' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    (mappingManager as any).dynamicMappings.set('ja', mapping);

    const result = mappingManager.getMonsterTypeIdToText('ja');

    // 実装では日本語でも動的マッピングがあれば優先して返す
    expect(result).toEqual({
      normal: '通常（動的）',
      effect: '効果（動的）',
    });
  });
});

// ============================================================
// 10. getAttributeIdToText() のテスト
// ============================================================
describe('MappingManager - getAttributeIdToText', () => {
  it('日本語の場合、静的マッピングを返す', () => {
    const result = mappingManager.getAttributeIdToText('ja');

    expect(result).toHaveProperty('dark');
    expect(result['dark']).toBe('闇');
  });

  it('英語の動的マッピングを返す', async () => {
    const mapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK', light: 'LIGHT' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = mapping;

    await mappingManager.initialize('en');

    const result = mappingManager.getAttributeIdToText('en');

    expect(result).toEqual({
      dark: 'DARK',
      light: 'LIGHT',
    });
  });

  it('動的マッピングがない場合、空オブジェクトを返す', () => {
    const result = mappingManager.getAttributeIdToText('fr');

    expect(result).toEqual({});
  });
});

// ============================================================
// 11. getSpellEffectIdToText() のテスト
// ============================================================
describe('MappingManager - getSpellEffectIdToText', () => {
  it('日本語の場合、静的マッピングを返す', () => {
    const result = mappingManager.getSpellEffectIdToText('ja');

    expect(result).toHaveProperty('equip');
    expect(result['equip']).toBe('装備');
  });

  it('英語の動的マッピングを返す', async () => {
    const mapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK' },
      spellEffect: { equip: 'Equip', field: 'Field' },
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = mapping;

    await mappingManager.initialize('en');

    const result = mappingManager.getSpellEffectIdToText('en');

    expect(result).toEqual({
      equip: 'Equip',
      field: 'Field',
    });
  });

  it('動的マッピングがない場合、空オブジェクトを返す', () => {
    const result = mappingManager.getSpellEffectIdToText('ko');

    expect(result).toEqual({});
  });
});

// ============================================================
// 12. getTrapEffectIdToText() のテスト
// ============================================================
describe('MappingManager - getTrapEffectIdToText', () => {
  it('日本語の場合、静的マッピングを返す', () => {
    const result = mappingManager.getTrapEffectIdToText('ja');

    expect(result).toHaveProperty('counter');
    expect(result['counter']).toBe('カウンター');
  });

  it('英語の動的マッピングを返す', async () => {
    const mapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: { counter: 'Counter', continuous: 'Continuous' },
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = mapping;

    await mappingManager.initialize('en');

    const result = mappingManager.getTrapEffectIdToText('en');

    expect(result).toEqual({
      counter: 'Counter',
      continuous: 'Continuous',
    });
  });

  it('動的マッピングがない場合（日本語以外）、空オブジェクトを返す', () => {
    const result = mappingManager.getTrapEffectIdToText('pt');

    expect(result).toEqual({});
  });

  it('動的マッピングがない場合（日本語）、静的マッピングを返す', () => {
    const result = mappingManager.getTrapEffectIdToText('ja');

    expect(result).toHaveProperty('counter');
    expect(result['counter']).toBe('カウンター');
  });
});

// ============================================================
// 13. hasDynamicMapping() のテスト
// ============================================================
describe('MappingManager - hasDynamicMapping', () => {
  it('動的マッピングが存在する場合、true を返す', async () => {
    const mapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:en'] = mapping;

    await mappingManager.initialize('en');

    expect(mappingManager.hasDynamicMapping('en')).toBe(true);
  });

  it('動的マッピングが存在しない場合、false を返す', () => {
    expect(mappingManager.hasDynamicMapping('de')).toBe(false);
  });
});

// ============================================================
// 14. ensureMappingForLanguage() のテスト
// ============================================================
describe('MappingManager - ensureMappingForLanguage', () => {
  it('既に有効なマッピングがある場合、何もしない', async () => {
    const mapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    (mappingManager as any).dynamicMappings.set('en', mapping);

    const fetchSpy = vi.spyOn(mappingManager as any, 'fetchAndStoreMappings').mockResolvedValue(undefined);

    await mappingManager.ensureMappingForLanguage('en');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('無効なマッピングがメモリにある場合、削除して新しく取得する', async () => {
    const invalidMapping = {
      race: {},
      monsterType: {},
      attribute: {},
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    (mappingManager as any).dynamicMappings.set('en', invalidMapping);

    const fetchSpy = vi.spyOn(mappingManager as any, 'fetchAndStoreMappings').mockResolvedValue(undefined);

    await mappingManager.ensureMappingForLanguage('en');

    expect(fetchSpy).toHaveBeenCalledWith('en');
    expect((mappingManager as any).dynamicMappings.has('en')).toBe(false);
  });

  it('ストレージから有効なマッピングをロードする', async () => {
    const mapping = {
      race: { dragon: 'Dragon' },
      monsterType: { normal: 'Normal' },
      attribute: { dark: 'DARK' },
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:fr'] = mapping;

    await mappingManager.ensureMappingForLanguage('fr');

    expect(mappingManager.hasDynamicMapping('fr')).toBe(true);
  });

  it('ストレージに無効なマッピングがある場合、fetchAndStoreMappings を呼ぶ', async () => {
    const invalidMapping = {
      race: {},
      monsterType: {},
      attribute: {},
      spellEffect: {},
      trapEffect: {},
      updatedAt: Date.now(),
      quarter: '2025-01-01',
    };

    mockStorage['ygo-mappings:es'] = invalidMapping;

    const fetchSpy = vi.spyOn(mappingManager as any, 'fetchAndStoreMappings').mockResolvedValue(undefined);

    await mappingManager.ensureMappingForLanguage('es');

    expect(fetchSpy).toHaveBeenCalledWith('es');
  });

  it('ストレージにマッピングがない場合、fetchAndStoreMappings を呼ぶ', async () => {
    const fetchSpy = vi.spyOn(mappingManager as any, 'fetchAndStoreMappings').mockResolvedValue(undefined);

    await mappingManager.ensureMappingForLanguage('it');

    expect(fetchSpy).toHaveBeenCalledWith('it');
  });

  it('既に取得中の言語の場合、スキップする', async () => {
    (mappingManager as any).fetchingLanguages.add('de');

    const fetchSpy = vi.spyOn(mappingManager as any, 'fetchAndStoreMappings').mockResolvedValue(undefined);

    await mappingManager.ensureMappingForLanguage('de');

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ============================================================
// 15. initializeMappingManager() のテスト
// ============================================================
describe('initializeMappingManager', () => {
  beforeEach(() => {
    // document のモック（detectLanguage で使用）
    vi.mock('../language-detector', () => ({
      detectLanguage: vi.fn(() => 'ja'),
    }));
  });

  it('ページ言語でマッピングを初期化する', async () => {
    const { detectLanguage } = await import('../language-detector');
    vi.mocked(detectLanguage).mockReturnValue('ja');

    await initializeMappingManager();

    expect((mappingManager as any).initialized).toBe(true);
  });

  it('設定言語のマッピングも確保する', async () => {
    const { detectLanguage } = await import('../language-detector');
    vi.mocked(detectLanguage).mockReturnValue('ja');

    mockStorage['appSettings'] = {
      language: 'en',
    };

    const ensureSpy = vi.spyOn(mappingManager, 'ensureMappingForLanguage').mockResolvedValue(undefined);

    await initializeMappingManager();

    expect(ensureSpy).toHaveBeenCalledWith('en');
  });

  it('設定言語がautoの場合、ensureMappingForLanguage を呼ばない', async () => {
    const { detectLanguage } = await import('../language-detector');
    vi.mocked(detectLanguage).mockReturnValue('ja');

    mockStorage['appSettings'] = {
      language: 'auto',
    };

    const ensureSpy = vi.spyOn(mappingManager, 'ensureMappingForLanguage').mockResolvedValue(undefined);

    await initializeMappingManager();

    expect(ensureSpy).not.toHaveBeenCalled();
  });

  it('設定言語がない場合、ensureMappingForLanguage を呼ばない', async () => {
    const { detectLanguage } = await import('../language-detector');
    vi.mocked(detectLanguage).mockReturnValue('ja');

    const ensureSpy = vi.spyOn(mappingManager, 'ensureMappingForLanguage').mockResolvedValue(undefined);

    await initializeMappingManager();

    expect(ensureSpy).not.toHaveBeenCalled();
  });

  it('chrome.storage.sync.get がエラーを投げても、初期化を続行する', async () => {
    const { detectLanguage } = await import('../language-detector');
    vi.mocked(detectLanguage).mockReturnValue('ja');

    // chrome.storage.sync.get をエラーをスローするようにモック
    vi.spyOn(chrome.storage.sync, 'get').mockRejectedValue(new Error('Storage error'));

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await initializeMappingManager();

    // エラーが発生しても初期化は続行される
    expect((mappingManager as any).initialized).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[MappingManager] Failed to load settings from storage:',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  it('detectLanguage がエラーを投げても、エラーログを出力する', async () => {
    const { detectLanguage } = await import('../language-detector');
    vi.mocked(detectLanguage).mockImplementation(() => {
      throw new Error('Language detection error');
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await initializeMappingManager();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[MappingManager] Failed to initialize:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
