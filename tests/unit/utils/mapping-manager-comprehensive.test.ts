/**
 * MappingManagerのテストスケルトン
 *
 * このファイルは mapping-manager.ts の包括的なテストの骨組みです。
 * 実装が必要なテストケースは it.skip でマークされています。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  Race,
  MonsterType,
  Attribute,
  SpellEffectType,
  TrapEffectType,
} from '@/types/card-maps';

// ============================================================================
// モック設定
// ============================================================================

// Chrome Storage API のモック
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
  },
  sync: {
    get: vi.fn(),
  },
};

// グローバルな chrome オブジェクトをモック
global.chrome = {
  storage: mockChromeStorage,
} as any;

// language-detector のモック
vi.mock('@/utils/language-detector', () => ({
  detectLanguage: vi.fn(() => 'ja'),
}));

const extractMappingsFromSearchPageMock = vi.hoisted(() => vi.fn());

// extract-mappings のモック（mapping-manager.ts内の相対dynamic importにも対応）
vi.mock('@/utils/extract-mappings', () => ({
  extractMappingsFromSearchPage: extractMappingsFromSearchPageMock,
}));

vi.mock('../../../src/utils/extract-mappings', () => ({
  extractMappingsFromSearchPage: extractMappingsFromSearchPageMock,
}));

vi.mock('/home/tomo/work/app/ygo/ygo-next/src/utils/extract-mappings.ts', () => ({
  extractMappingsFromSearchPage: extractMappingsFromSearchPageMock,
}));

// ============================================================================
// テストデータ
// ============================================================================

/**
 * 有効な日本語マッピングのサンプル
 */
const validJapaneseMappings = {
  race: {
    dragon: 'ドラゴン族',
    warrior: '戦士族',
    spellcaster: '魔法使い族',
  },
  monsterType: {
    normal: '通常',
    effect: '効果',
    fusion: '融合',
  },
  attribute: {
    dark: '闇',
    light: '光',
    earth: '地',
  },
  spellEffect: {
    normal: '通常',
    continuous: '永続',
    equip: '装備',
  },
  trapEffect: {
    normal: '通常',
    continuous: '永続',
    counter: 'カウンター',
  },
  updatedAt: Date.now(),
  quarter: '2025-12-12',
};

/**
 * 有効な英語マッピングのサンプル
 */
const validEnglishMappings = {
  race: {
    dragon: 'Dragon',
    warrior: 'Warrior',
    spellcaster: 'Spellcaster',
  },
  monsterType: {
    normal: 'Normal',
    effect: 'Effect',
    fusion: 'Fusion',
  },
  attribute: {
    dark: 'DARK',
    light: 'LIGHT',
    earth: 'EARTH',
  },
  spellEffect: {
    normal: 'Normal',
    continuous: 'Continuous',
    equip: 'Equip',
  },
  trapEffect: {
    normal: 'Normal',
    continuous: 'Continuous',
    counter: 'Counter',
  },
  updatedAt: Date.now(),
  quarter: '2025-12-12',
};

/**
 * 無効なマッピング（race が空）
 */
const invalidMappingsEmptyRace = {
  race: {},
  monsterType: {
    normal: 'Normal',
  },
  attribute: {
    dark: 'DARK',
  },
  spellEffect: {},
  trapEffect: {},
  updatedAt: Date.now(),
  quarter: '2025-12-12',
};

/**
 * 無効なマッピング（必須フィールド欠落）
 */
const invalidMappingsMissingFields = {
  race: {
    dragon: 'Dragon',
  },
  // monsterType と attribute が欠落
  spellEffect: {},
  trapEffect: {},
  updatedAt: Date.now(),
  quarter: '2025-12-12',
};

// ============================================================================
// テストスイート
// ============================================================================

describe('MappingManager', () => {
  beforeEach(async () => {
    // 各テスト前にモックをリセット
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mockChromeStorage.local.get.mockResolvedValue({});
    mockChromeStorage.local.set.mockResolvedValue(undefined);
    mockChromeStorage.sync.get.mockResolvedValue({});
    extractMappingsFromSearchPageMock.mockResolvedValue(validEnglishMappings);
    const { detectLanguage } = await import('@/utils/language-detector');
    (detectLanguage as any).mockReturnValue('ja');
    const { mappingManager } = await import('@/utils/mapping-manager');
    (mappingManager as any)['dynamicMappings'].clear();
    (mappingManager as any)['fetchingLanguages'].clear();
    (mappingManager as any)['initialized'] = false;
  });

  afterEach(() => {
    // テスト後のクリーンアップ（必要に応じて）
  });

  // ==========================================================================
  // 初期化テスト
  // ==========================================================================

  describe('initialize()', () => {
    it('言語を指定せずに初期化できる [covers:initialize.no-lang-sets-initialized]', async () => {
      // Arrange: シングルトンインスタンス mappingManager を使用
      const { mappingManager } = await import('@/utils/mapping-manager');

      // 既に初期化済みの場合はリセット
      (mappingManager as any)['initialized'] = false;

      // Act
      await mappingManager.initialize();

      // Assert: initialized フラグが true になることを確認
      expect((mappingManager as any)['initialized']).toBe(true);
    });

    it('指定言語のマッピングがストレージに存在する場合、ロードする [covers:initialize.lang-loads-existing-mapping] [covers:load-language.stored-valid-sets-mapping]', async () => {
      // Arrange
      const storageKey = 'ygo-mappings:ja';
      mockChromeStorage.local.get.mockResolvedValue({
        [storageKey]: validJapaneseMappings,
      });

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      (mappingManager as any)['initialized'] = false;

      // Act
      await mappingManager.initialize('ja');

      // Assert
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith(storageKey);
      expect((mappingManager as any)['dynamicMappings'].has('ja')).toBe(true);
      expect((mappingManager as any)['dynamicMappings'].get('ja')).toEqual(validJapaneseMappings);
    });

    it('指定言語のマッピングがストレージに存在しない場合、fetchAndStoreMappings を呼び出す [covers:load-language.no-stored-fetches-when-not-fetching] [covers:fetch-store.valid-mapping-sets-memory-and-storage]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});

      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(validEnglishMappings);

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      (mappingManager as any)['initialized'] = false;

      // Act
      await mappingManager.initialize('en');

      // Assert
      expect(extractMappingsFromSearchPage).toHaveBeenCalledWith('en');
      expect((mappingManager as any)['dynamicMappings'].has('en')).toBe(true);
    });

    it('初期化済みの場合は何もしない [covers:initialize.already-initialized-return]', async () => {
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['initialized'] = true;
      mockChromeStorage.local.get.mockResolvedValue({});

      await mappingManager.initialize('en');

      expect(mockChromeStorage.local.get).not.toHaveBeenCalled();
    });

    it('load後もマッピングが無ければ追加fetchを行う [covers:initialize.lang-fetches-when-still-missing] [covers:fetch-store.null-mapping-warns]', async () => {
      mockChromeStorage.local.get.mockResolvedValue({});
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(null);

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      (mappingManager as any)['initialized'] = false;

      await mappingManager.initialize('en');

      expect(extractMappingsFromSearchPage).toHaveBeenCalledTimes(2);
      expect((mappingManager as any)['dynamicMappings'].has('en')).toBe(false);
    });

    it('fetchAndStoreMappingsは例外を内部で握りつぶすため、initializeの内側catchには到達しない [covers:initialize.inner-fetch-error-warns]', async () => {
      // この条件はverified=false（検証不能）のため、その前提を固定する:
      // fetchAndStoreMappingsは自身のcatchで例外を握りつぶして正常にresolveするため、
      // initialize内の追加fetchを囲むcatch（警告ログ）は公開経路では発火しない
      mockChromeStorage.local.get.mockResolvedValue({});
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockRejectedValue(new Error('Network error'));
      const warnSpy = vi.spyOn(console, 'warn');
      const errorSpy = vi.spyOn(console, 'error');

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      (mappingManager as any)['initialized'] = false;

      await expect(mappingManager.initialize('en')).resolves.toBeUndefined();

      // fetchAndStoreMappings自身のcatch（エラーログ）は発火する
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Error fetching mappings for en'),
        expect.any(Error)
      );
      // initializeの内側catch（警告ログ）は発火しない
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Failed to fetch mappings for en'),
        expect.anything()
      );
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('loadLanguageMappingは例外を内部で握りつぶすため、initializeの外側catchには到達しない [covers:initialize.outer-error-logs]', async () => {
      // この条件はverified=false（検証不能）のため、その前提を固定する:
      // loadLanguageMappingは自身のcatchで例外を握りつぶして正常にresolveするため、
      // initialize全体を囲むcatch（エラーログ）は公開経路では発火しない
      mockChromeStorage.local.get.mockRejectedValue(new Error('Storage error'));
      const warnSpy = vi.spyOn(console, 'warn');
      const errorSpy = vi.spyOn(console, 'error');

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      (mappingManager as any)['initialized'] = false;

      await expect(mappingManager.initialize('ja')).resolves.toBeUndefined();

      // loadLanguageMapping自身のcatch（警告ログ）は発火する
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Failed to load mappings for ja'),
        expect.any(Error)
      );
      // initializeの外側catch（エラーログ）は発火しない
      expect(errorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Failed to initialize:'),
        expect.anything()
      );
      expect((mappingManager as any)['initialized']).toBe(true);
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('loadLanguageMapping()', () => {
    it('保存済みマッピングが無効で取得中でなければ新しく取得する [covers:load-language.stored-invalid-fetches-when-not-fetching]', async () => {
      const storageKey = 'ygo-mappings:en';
      mockChromeStorage.local.get.mockResolvedValue({ [storageKey]: invalidMappingsEmptyRace });
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(validEnglishMappings);
      const { mappingManager } = await import('@/utils/mapping-manager');

      await (mappingManager as any)['loadLanguageMapping']('en');

      expect(extractMappingsFromSearchPage).toHaveBeenCalledWith('en');
      expect((mappingManager as any)['dynamicMappings'].get('en')?.race).toEqual(validEnglishMappings.race);
    });

    it('保存済みマッピングが無効でも取得中ならfetchしない [covers:load-language.stored-invalid-fetching-skips-fetch]', async () => {
      const storageKey = 'ygo-mappings:en';
      mockChromeStorage.local.get.mockResolvedValue({ [storageKey]: invalidMappingsEmptyRace });
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['fetchingLanguages'].add('en');

      await (mappingManager as any)['loadLanguageMapping']('en');

      expect(extractMappingsFromSearchPage).not.toHaveBeenCalled();
      expect((mappingManager as any)['dynamicMappings'].has('en')).toBe(false);
    });

    it('保存済みマッピングが無く取得中ならfetchしない [covers:load-language.no-stored-fetching-skips-fetch]', async () => {
      mockChromeStorage.local.get.mockResolvedValue({});
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['fetchingLanguages'].add('en');

      await (mappingManager as any)['loadLanguageMapping']('en');

      expect(extractMappingsFromSearchPage).not.toHaveBeenCalled();
    });

    it('ストレージ読み込みエラー時は警告して例外を投げない [covers:load-language.storage-error-warns]', async () => {
      mockChromeStorage.local.get.mockRejectedValue(new Error('Storage error'));
      const warnSpy = vi.spyOn(console, 'warn');
      const { mappingManager } = await import('@/utils/mapping-manager');

      await expect((mappingManager as any)['loadLanguageMapping']('en')).resolves.not.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Failed to load mappings for en'),
        expect.any(Error)
      );
      warnSpy.mockRestore();
    });
  });

  // ==========================================================================
  // マッピング取得テスト（ID → テキスト）
  // ==========================================================================

  describe('getRaceIdToText()', () => {
    it('日本語で動的raceが無い場合、静的マッピングを返す [covers:id-to-text.race-ja-static-fallback]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const { RACE_ID_TO_NAME } = await import('@/types/card-maps');

      // Act
      const result = mappingManager.getRaceIdToText('ja');

      // Assert
      expect(result).toEqual(RACE_ID_TO_NAME);
    });

    it('日本語以外で動的raceマッピングが存在する場合、動的マッピングを返す [covers:id-to-text.race-dynamic-precedes-ja-static]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('en', validEnglishMappings);

      // Act
      const result = mappingManager.getRaceIdToText('en');

      // Assert
      expect(result).toEqual(validEnglishMappings.race);
    });

    it('日本語以外で動的raceマッピングが存在しない場合、空オブジェクトを返す [covers:id-to-text.race-non-ja-empty]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      const result = mappingManager.getRaceIdToText('en');

      // Assert
      expect(result).toEqual({});
    });

    it('動的raceマッピングが存在しても空の場合、空オブジェクトを返す [covers:id-to-text.race-non-ja-empty]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const emptyRaceMapping = { ...validEnglishMappings, race: {} };
      (mappingManager as any)['dynamicMappings'].set('en', emptyRaceMapping);

      // Act
      const result = mappingManager.getRaceIdToText('en');

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('getMonsterTypeIdToText()', () => {
    it('日本語で動的monsterTypeが無い場合、静的マッピングを返す [covers:id-to-text.monster-ja-static-fallback]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const { MONSTER_TYPE_ID_TO_NAME } = await import('@/types/card-maps');

      // Act
      const result = mappingManager.getMonsterTypeIdToText('ja');

      // Assert
      expect(result).toEqual(MONSTER_TYPE_ID_TO_NAME);
    });

    it('日本語以外で動的monsterTypeマッピングが存在する場合、動的マッピングを返す [covers:id-to-text.monster-dynamic-precedes-ja-static]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('en', validEnglishMappings);

      // Act
      const result = mappingManager.getMonsterTypeIdToText('en');

      // Assert
      expect(result).toEqual(validEnglishMappings.monsterType);
    });

    it('日本語以外で動的monsterTypeマッピングが存在しない場合、空オブジェクトを返す [covers:id-to-text.monster-non-ja-empty]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      const result = mappingManager.getMonsterTypeIdToText('en');

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('getAttributeIdToText()', () => {
    it('日本語で動的attributeが無い場合、静的マッピングを返す [covers:id-to-text.attribute-ja-static-fallback]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const { ATTRIBUTE_ID_TO_NAME } = await import('@/types/card-maps');

      // Act
      const result = mappingManager.getAttributeIdToText('ja');

      // Assert
      expect(result).toEqual(ATTRIBUTE_ID_TO_NAME);
    });

    it('日本語以外で動的attributeマッピングが存在する場合、動的マッピングを返す [covers:id-to-text.attribute-dynamic-precedes-ja-static]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('en', validEnglishMappings);

      // Act
      const result = mappingManager.getAttributeIdToText('en');

      // Assert
      expect(result).toEqual(validEnglishMappings.attribute);
    });

    it('日本語以外で動的attributeマッピングが存在しない場合、空オブジェクトを返す [covers:id-to-text.attribute-non-ja-empty]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      const result = mappingManager.getAttributeIdToText('en');

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('getSpellEffectIdToText()', () => {
    it('日本語で動的spellEffectが無い場合、静的マッピングを返す [covers:id-to-text.spell-ja-static-fallback]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const { SPELL_EFFECT_TYPE_ID_TO_NAME } = await import('@/types/card-maps');

      // Act
      const result = mappingManager.getSpellEffectIdToText('ja');

      // Assert
      expect(result).toEqual(SPELL_EFFECT_TYPE_ID_TO_NAME);
    });

    it('日本語以外で動的spellEffectマッピングが存在する場合、動的マッピングを返す [covers:id-to-text.spell-dynamic-precedes-ja-static]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('en', validEnglishMappings);

      // Act
      const result = mappingManager.getSpellEffectIdToText('en');

      // Assert
      expect(result).toEqual(validEnglishMappings.spellEffect);
    });

    it('日本語以外で動的spellEffectマッピングが存在しない場合、空オブジェクトを返す [covers:id-to-text.spell-non-ja-empty]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      const result = mappingManager.getSpellEffectIdToText('en');

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('getTrapEffectIdToText()', () => {
    it('動的trapEffectマッピングが存在する場合、動的マッピングを返す [covers:id-to-text.trap-dynamic-precedes-ja-static]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('en', validEnglishMappings);

      // Act
      const result = mappingManager.getTrapEffectIdToText('en');

      // Assert
      expect(result).toEqual(validEnglishMappings.trapEffect);
    });

    it('日本語で動的trapEffectマッピングが存在しない場合、日本語静的マッピングをフォールバックとして返す [covers:id-to-text.trap-ja-static-fallback]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const { TRAP_EFFECT_TYPE_ID_TO_NAME } = await import('@/types/card-maps');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act: 日本語でテスト（getTrapEffectIdToText の実装は全言語でフォールバック適用）
      const result = mappingManager.getTrapEffectIdToText('ja');

      // Assert
      expect(result).toEqual(TRAP_EFFECT_TYPE_ID_TO_NAME);
    });

    it('日本語以外で動的trapEffectマッピングが存在しない場合、空オブジェクトを返す [covers:id-to-text.trap-non-ja-empty]', async () => {
      const { mappingManager } = await import('@/utils/mapping-manager');

      const result = mappingManager.getTrapEffectIdToText('en');

      expect(result).toEqual({});
    });
  });

  describe('get*IdToText() の動的マッピング優先順位', () => {
    it('jaでも各カテゴリの動的マッピングが非空なら静的マッピングより先に返す [covers:id-to-text.race-dynamic-precedes-ja-static] [covers:id-to-text.monster-dynamic-precedes-ja-static] [covers:id-to-text.attribute-dynamic-precedes-ja-static] [covers:id-to-text.spell-dynamic-precedes-ja-static] [covers:id-to-text.trap-dynamic-precedes-ja-static]', async () => {
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('ja', validEnglishMappings);

      expect(mappingManager.getRaceIdToText('ja')).toEqual(validEnglishMappings.race);
      expect(mappingManager.getMonsterTypeIdToText('ja')).toEqual(validEnglishMappings.monsterType);
      expect(mappingManager.getAttributeIdToText('ja')).toEqual(validEnglishMappings.attribute);
      expect(mappingManager.getSpellEffectIdToText('ja')).toEqual(validEnglishMappings.spellEffect);
      expect(mappingManager.getTrapEffectIdToText('ja')).toEqual(validEnglishMappings.trapEffect);
    });
  });

  // ==========================================================================
  // マッピング取得テスト（テキスト → ID）
  // ==========================================================================

  describe('getRaceTextToId()', () => {
    it('日本語の場合、静的マッピングの逆引きを返す [covers:text-to-id.race-ja-static-reverse]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const { RACE_ID_TO_NAME } = await import('@/types/card-maps');

      // Act
      const result = mappingManager.getRaceTextToId('ja');

      // Assert: 逆引きマップが正しいことを確認
      const expected: Record<string, string> = {};
      for (const [id, text] of Object.entries(RACE_ID_TO_NAME)) {
        expected[text] = id;
      }
      expect(result).toEqual(expected);
    });

    it('日本語以外で動的raceマッピングが存在する場合、逆引きマップを返す [covers:text-to-id.race-dynamic-reverse-and-skip-falsy]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('en', validEnglishMappings);

      // Act
      const result = mappingManager.getRaceTextToId('en');

      // Assert: 逆引きマップが正しいことを確認
      expect(result['Dragon']).toBe('dragon');
      expect(result['Warrior']).toBe('warrior');
      expect(result['Spellcaster']).toBe('spellcaster');
    });

    it('日本語以外で動的raceマッピングが存在しない場合、空オブジェクトを返す [covers:text-to-id.race-no-dynamic-empty]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      const result = mappingManager.getRaceTextToId('en');

      // Assert
      expect(result).toEqual({});
    });

    it('動的raceマッピングが存在しても空の場合、空オブジェクトを返す [covers:text-to-id.race-no-dynamic-empty]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const emptyRaceMapping = { ...validEnglishMappings, race: {} };
      (mappingManager as any)['dynamicMappings'].set('en', emptyRaceMapping);

      // Act
      const result = mappingManager.getRaceTextToId('en');

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('getMonsterTypeTextToId()', () => {
    it('日本語の場合、静的マッピングの逆引きを返す [covers:text-to-id.monster-ja-static-reverse]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const { MONSTER_TYPE_ID_TO_NAME } = await import('@/types/card-maps');

      // Act
      const result = mappingManager.getMonsterTypeTextToId('ja');

      // Assert
      const expected: Record<string, string> = {};
      for (const [id, text] of Object.entries(MONSTER_TYPE_ID_TO_NAME)) {
        expected[text] = id;
      }
      expect(result).toEqual(expected);
    });

    it('日本語以外で動的monsterTypeマッピングが存在する場合、逆引きマップを返す [covers:text-to-id.monster-dynamic-reverse-and-skip-falsy]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('en', validEnglishMappings);

      // Act
      const result = mappingManager.getMonsterTypeTextToId('en');

      // Assert
      expect(result['Normal']).toBe('normal');
      expect(result['Effect']).toBe('effect');
      expect(result['Fusion']).toBe('fusion');
    });

    it('日本語以外で動的monsterTypeマッピングが存在しない場合、空オブジェクトを返す [covers:text-to-id.monster-no-dynamic-empty]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      const result = mappingManager.getMonsterTypeTextToId('en');

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('getAttributeTextToId()', () => {
    it('日本語の場合、静的マッピングの逆引きを返す [covers:text-to-id.attribute-ja-static-reverse]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const { ATTRIBUTE_ID_TO_NAME } = await import('@/types/card-maps');

      // Act
      const result = mappingManager.getAttributeTextToId('ja');

      // Assert
      const expected: Record<string, string> = {};
      for (const [id, text] of Object.entries(ATTRIBUTE_ID_TO_NAME)) {
        expected[text] = id;
      }
      expect(result).toEqual(expected);
    });

    it('日本語以外で動的attributeマッピングが存在する場合、逆引きマップを返す [covers:text-to-id.attribute-dynamic-reverse-and-skip-falsy]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('en', validEnglishMappings);

      // Act
      const result = mappingManager.getAttributeTextToId('en');

      // Assert
      expect(result['DARK']).toBe('dark');
      expect(result['LIGHT']).toBe('light');
      expect(result['EARTH']).toBe('earth');
    });

    it('日本語以外で動的attributeマッピングが存在しない場合、空オブジェクトを返す [covers:text-to-id.attribute-no-dynamic-empty]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      const result = mappingManager.getAttributeTextToId('en');

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('getSpellEffectTextToId()', () => {
    it('日本語の場合、静的マッピングの逆引きを返す [covers:text-to-id.spell-ja-static-reverse]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const { SPELL_EFFECT_TYPE_ID_TO_NAME } = await import('@/types/card-maps');

      // Act
      const result = mappingManager.getSpellEffectTextToId('ja');

      // Assert
      const expected: Record<string, string> = {};
      for (const [id, text] of Object.entries(SPELL_EFFECT_TYPE_ID_TO_NAME)) {
        expected[text] = id;
      }
      expect(result).toEqual(expected);
    });

    it('日本語以外で動的spellEffectマッピングが存在する場合、逆引きマップを返す [covers:text-to-id.spell-dynamic-reverse-and-skip-falsy]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('en', validEnglishMappings);

      // Act
      const result = mappingManager.getSpellEffectTextToId('en');

      // Assert
      expect(result['Normal']).toBe('normal');
      expect(result['Continuous']).toBe('continuous');
      expect(result['Equip']).toBe('equip');
    });

    it('日本語以外で動的spellEffectマッピングが存在しない場合、空オブジェクトを返す [covers:text-to-id.spell-no-dynamic-empty]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      const result = mappingManager.getSpellEffectTextToId('en');

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('getTrapEffectTextToId()', () => {
    it('動的trapEffectマッピングが存在する場合、逆引きマップを返す [covers:text-to-id.trap-dynamic-reverse-and-skip-falsy]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('en', validEnglishMappings);

      // Act
      const result = mappingManager.getTrapEffectTextToId('en');

      // Assert
      expect(result['Normal']).toBe('normal');
      expect(result['Continuous']).toBe('continuous');
      expect(result['Counter']).toBe('counter');
    });

    it('動的trapEffectマッピングが存在しない場合、日本語静的マッピングの逆引きを返す [covers:text-to-id.trap-no-dynamic-static-reverse]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const { TRAP_EFFECT_TYPE_ID_TO_NAME } = await import('@/types/card-maps');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      const result = mappingManager.getTrapEffectTextToId('en');

      // Assert
      const expected: Record<string, string> = {};
      for (const [id, text] of Object.entries(TRAP_EFFECT_TYPE_ID_TO_NAME)) {
        expected[text] = id;
      }
      expect(result).toEqual(expected);
    });
  });

  describe('get*TextToId() の空文字スキップ', () => {
    it('動的マッピングのfalsyな表示テキストは逆引き結果に含めない [covers:text-to-id.race-dynamic-reverse-and-skip-falsy] [covers:text-to-id.monster-dynamic-reverse-and-skip-falsy] [covers:text-to-id.attribute-dynamic-reverse-and-skip-falsy] [covers:text-to-id.spell-dynamic-reverse-and-skip-falsy] [covers:text-to-id.trap-dynamic-reverse-and-skip-falsy]', async () => {
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('en', {
        race: { dragon: 'Dragon', warrior: '' },
        monsterType: { normal: 'Normal', effect: '' },
        attribute: { dark: 'DARK', light: '' },
        spellEffect: { normal: 'Normal', equip: '' },
        trapEffect: { normal: 'Normal', counter: '' },
      });

      expect(mappingManager.getRaceTextToId('en')).toEqual({ Dragon: 'dragon' });
      expect(mappingManager.getMonsterTypeTextToId('en')).toEqual({ Normal: 'normal' });
      expect(mappingManager.getAttributeTextToId('en')).toEqual({ DARK: 'dark' });
      expect(mappingManager.getSpellEffectTextToId('en')).toEqual({ Normal: 'normal' });
      expect(mappingManager.getTrapEffectTextToId('en')).toEqual({ Normal: 'normal' });
    });
  });

  // ==========================================================================
  // ヘルパーメソッド
  // ==========================================================================

  describe('hasDynamicMapping()', () => {
    it('動的マッピングが存在する場合、true を返す [covers:has-dynamic-mapping.reflects-map-presence]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('ja', validJapaneseMappings);

      // Act
      const result = mappingManager.hasDynamicMapping('ja');

      // Assert
      expect(result).toBe(true);
    });

    it('動的マッピングが存在しない場合、false を返す [covers:has-dynamic-mapping.reflects-map-presence]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      const result = mappingManager.hasDynamicMapping('en');

      // Assert
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // マッピング確保テスト
  // ==========================================================================

  describe('ensureMappingForLanguage()', () => {
    it('既に有効なマッピングが存在する場合、何もしない [covers:ensure.existing-valid-returns]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('ja', validJapaneseMappings);
      const getSpy = vi.spyOn(mockChromeStorage.local, 'get');

      // Act
      await mappingManager.ensureMappingForLanguage('ja');

      // Assert: ストレージへのアクセスが不要
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('無効なマッピングが存在する場合、削除して新しく取得する [covers:ensure.existing-invalid-deletes-then-continues] [covers:ensure.no-stored-fetches]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(validEnglishMappings);

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].set('en', invalidMappingsEmptyRace);
      const warnSpy = vi.spyOn(console, 'warn');

      // Act
      await mappingManager.ensureMappingForLanguage('en');

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Mapping for en is invalid')
      );
      expect(extractMappingsFromSearchPage).toHaveBeenCalledWith('en');

      warnSpy.mockRestore();
    });

    it('ストレージに有効なマッピングが存在する場合、ロードする [covers:ensure.stored-valid-sets-mapping]', async () => {
      // Arrange
      const storageKey = 'ygo-mappings:en';
      mockChromeStorage.local.get.mockResolvedValue({
        [storageKey]: validEnglishMappings,
      });

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      await mappingManager.ensureMappingForLanguage('en');

      // Assert
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith(storageKey);
      expect((mappingManager as any)['dynamicMappings'].has('en')).toBe(true);
    });

    it('ストレージに無効なマッピングが存在する場合、新しく取得する [covers:ensure.stored-invalid-fetches]', async () => {
      // Arrange
      const storageKey = 'ygo-mappings:en';
      mockChromeStorage.local.get.mockResolvedValue({
        [storageKey]: invalidMappingsEmptyRace,
      });

      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(validEnglishMappings);

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      await mappingManager.ensureMappingForLanguage('en');

      // Assert
      expect(extractMappingsFromSearchPage).toHaveBeenCalledWith('en');
    });

    it('ストレージにマッピングが存在しない場合、新しく取得する [covers:ensure.no-stored-fetches]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});

      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(validEnglishMappings);

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      await mappingManager.ensureMappingForLanguage('en');

      // Assert
      expect(extractMappingsFromSearchPage).toHaveBeenCalledWith('en');
    });

    it('既に取得中の言語の場合、スキップする [covers:ensure.fetching-returns]', async () => {
      // Arrange
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['fetchingLanguages'].add('en');

      // Act
      await mappingManager.ensureMappingForLanguage('en');

      // Assert
      expect(extractMappingsFromSearchPage).not.toHaveBeenCalled();

      // Cleanup
      (mappingManager as any)['fetchingLanguages'].delete('en');
    });

    it('エラーが発生しても例外をスローせず、警告ログを出力する [covers:ensure.error-warns]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockRejectedValue(new Error('Storage error'));

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      const warnSpy = vi.spyOn(console, 'warn');

      // Act & Assert: 例外がスローされないことを確認
      await expect(mappingManager.ensureMappingForLanguage('en')).resolves.not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Failed to ensure mapping for en'),
        expect.any(Error)
      );

      warnSpy.mockRestore();
    });
  });

  // ==========================================================================
  // マッピング取得とストレージ保存テスト
  // ==========================================================================

  describe('fetchAndStoreMappings()', () => {
    it('有効なマッピングを取得して保存する [covers:fetch-store.valid-mapping-sets-memory-and-storage]', async () => {
      // Arrange
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(validEnglishMappings);
      mockChromeStorage.local.set.mockResolvedValue(undefined);

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act: privateメソッドを直接呼び出し
      await (mappingManager as any)['fetchAndStoreMappings']('en');

      // Assert
      expect(extractMappingsFromSearchPage).toHaveBeenCalledWith('en');
      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
        'ygo-mappings:en': expect.objectContaining({
          race: validEnglishMappings.race,
          monsterType: validEnglishMappings.monsterType,
          attribute: validEnglishMappings.attribute,
          updatedAt: expect.any(Number),
          quarter: expect.any(String),
        }),
      });
      expect((mappingManager as any)['dynamicMappings'].has('en')).toBe(true);
    });

    it('無効なマッピングを取得した場合、保存しない [covers:fetch-store.invalid-mapping-logs-and-does-not-save] [covers:fetch-store.finally-deletes-fetching-flag]', async () => {
      // Arrange
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(invalidMappingsEmptyRace);
      const errorSpy = vi.spyOn(console, 'error');

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      await (mappingManager as any)['fetchAndStoreMappings']('en');

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Extracted mappings for en are invalid')
      );
      expect(mockChromeStorage.local.set).not.toHaveBeenCalled();
      expect((mappingManager as any)['dynamicMappings'].has('en')).toBe(false);

      errorSpy.mockRestore();
    });

    it('null が返された場合、警告ログを出力する [covers:fetch-store.null-mapping-warns]', async () => {
      // Arrange
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(null);
      const warnSpy = vi.spyOn(console, 'warn');

      const { mappingManager } = await import('@/utils/mapping-manager');

      // Act
      await (mappingManager as any)['fetchAndStoreMappings']('en');

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Failed to extract mappings for en')
      );

      warnSpy.mockRestore();
    });

    it('エラーが発生した場合、エラーログを出力する [covers:fetch-store.error-logs] [covers:fetch-store.finally-deletes-fetching-flag]', async () => {
      // Arrange
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockRejectedValue(new Error('Network error'));
      const errorSpy = vi.spyOn(console, 'error');

      const { mappingManager } = await import('@/utils/mapping-manager');

      // Act
      await (mappingManager as any)['fetchAndStoreMappings']('en');

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Error fetching mappings for en'),
        expect.any(Error)
      );

      errorSpy.mockRestore();
    });

    it('取得中フラグが正しく管理される（成功時） [covers:fetch-store.finally-deletes-fetching-flag]', async () => {
      // Arrange
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(validEnglishMappings);
      mockChromeStorage.local.set.mockResolvedValue(undefined);

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      (mappingManager as any)['fetchingLanguages'].clear();

      // Act
      await (mappingManager as any)['fetchAndStoreMappings']('en');

      // Assert: 取得完了後、フラグが削除されている
      expect((mappingManager as any)['fetchingLanguages'].has('en')).toBe(false);
    });

    it('取得中フラグが正しく管理される（エラー時） [covers:fetch-store.finally-deletes-fetching-flag]', async () => {
      // Arrange
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockRejectedValue(new Error('Network error'));

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['fetchingLanguages'].clear();

      // Act
      await (mappingManager as any)['fetchAndStoreMappings']('en');

      // Assert: エラー時もフラグが削除されている
      expect((mappingManager as any)['fetchingLanguages'].has('en')).toBe(false);
    });
  });

  // ==========================================================================
  // マッピングバリデーションテスト
  // ==========================================================================

  describe('isValidMapping()', () => {
    it('全ての必須フィールドが存在する場合、true を返す [covers:is-valid-mapping.required-all-nonempty-true]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');

      // Act: privateメソッドなのでブラケット記法を使用
      const result = (mappingManager as any)['isValidMapping'](validEnglishMappings);

      // Assert
      expect(result).toBe(true);
    });

    it('race が空の場合、false を返す [covers:is-valid-mapping.required-any-empty-false]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');

      // Act
      const result = (mappingManager as any)['isValidMapping'](invalidMappingsEmptyRace);

      // Assert
      expect(result).toBe(false);
    });

    it('monsterType が空の場合、false を返す [covers:is-valid-mapping.required-any-empty-false]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const invalidMapping = { ...validEnglishMappings, monsterType: {} };

      // Act
      const result = (mappingManager as any)['isValidMapping'](invalidMapping);

      // Assert
      expect(result).toBe(false);
    });

    it('attribute が空の場合、false を返す [covers:is-valid-mapping.required-any-empty-false]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const invalidMapping = { ...validEnglishMappings, attribute: {} };

      // Act
      const result = (mappingManager as any)['isValidMapping'](invalidMapping);

      // Assert
      expect(result).toBe(false);
    });

    it('race フィールドが欠落している場合、undefined を返す [covers:is-valid-mapping.required-any-missing-undefined]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const invalidMapping = {
        monsterType: validEnglishMappings.monsterType,
        attribute: validEnglishMappings.attribute,
        spellEffect: validEnglishMappings.spellEffect,
        trapEffect: validEnglishMappings.trapEffect,
        updatedAt: validEnglishMappings.updatedAt,
        quarter: validEnglishMappings.quarter,
      };

      // Act: privateメソッドへのアクセス（ブラケット記法で呼び出し + bind）
      const result = (mappingManager as any)['isValidMapping'].bind(mappingManager)(invalidMapping);

      // Assert
      expect(result).toBeUndefined();
    });

    it('monsterType フィールドが欠落している場合、undefined を返す [covers:is-valid-mapping.required-any-missing-undefined]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const invalidMapping = {
        race: validEnglishMappings.race,
        attribute: validEnglishMappings.attribute,
        spellEffect: validEnglishMappings.spellEffect,
        trapEffect: validEnglishMappings.trapEffect,
        updatedAt: validEnglishMappings.updatedAt,
        quarter: validEnglishMappings.quarter,
      };

      // Act
      const result = (mappingManager as any)['isValidMapping'].bind(mappingManager)(invalidMapping);

      // Assert
      expect(result).toBeUndefined();
    });

    it('attribute フィールドが欠落している場合、undefined を返す [covers:is-valid-mapping.required-any-missing-undefined]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const invalidMapping = {
        race: validEnglishMappings.race,
        monsterType: validEnglishMappings.monsterType,
        spellEffect: validEnglishMappings.spellEffect,
        trapEffect: validEnglishMappings.trapEffect,
        updatedAt: validEnglishMappings.updatedAt,
        quarter: validEnglishMappings.quarter,
      };

      // Act
      const result = (mappingManager as any)['isValidMapping'].bind(mappingManager)(invalidMapping);

      // Assert
      expect(result).toBeUndefined();
    });

    it('null を渡した場合、false を返す [covers:is-valid-mapping.nullish-false]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');

      // Act
      const result = (mappingManager as any)['isValidMapping'](null);

      // Assert
      expect(result).toBe(false);
    });

    it('undefined を渡した場合、false を返す [covers:is-valid-mapping.nullish-false]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');

      // Act
      const result = (mappingManager as any)['isValidMapping'](undefined);

      // Assert
      expect(result).toBe(false);
    });

    it('任意フィールドが空または欠落していても必須3フィールドが非空ならtrueを返す [covers:is-valid-mapping.optional-fields-ignored]', async () => {
      const { mappingManager } = await import('@/utils/mapping-manager');

      const result = (mappingManager as any)['isValidMapping']({
        race: validEnglishMappings.race,
        monsterType: validEnglishMappings.monsterType,
        attribute: validEnglishMappings.attribute,
      });

      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // グローバル初期化関数テスト
  // ==========================================================================

  describe('initializeMappingManager()', () => {
    it('ページ言語を検出して初期化する [covers:initialize-manager.detects-page-language-and-initializes]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});
      mockChromeStorage.sync.get.mockResolvedValue({});
      const { detectLanguage } = await import('@/utils/language-detector');
      (detectLanguage as any).mockReturnValue('ja');

      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(validJapaneseMappings);

      // Act
      const { initializeMappingManager, mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['initialized'] = false;
      (mappingManager as any)['dynamicMappings'].clear();
      await initializeMappingManager();

      // Assert: detectLanguage が呼ばれたことを確認
      expect(detectLanguage).toHaveBeenCalled();
      expect((mappingManager as any)['initialized']).toBe(true);
    });

    it('設定言語のマッピングも確保する [covers:initialize-manager.config-language-non-auto-ensures]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});
      mockChromeStorage.sync.get.mockResolvedValue({
        appSettings: { language: 'en' },
      });

      const { detectLanguage } = await import('@/utils/language-detector');
      (detectLanguage as any).mockReturnValue('ja');

      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(validEnglishMappings);

      // Act
      const { initializeMappingManager, mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['initialized'] = false;
      (mappingManager as any)['dynamicMappings'].clear();
      await initializeMappingManager();

      // Assert: enマッピングが確保されたことを確認
      expect(mockChromeStorage.sync.get).toHaveBeenCalledWith('appSettings');
      expect((mappingManager as any)['dynamicMappings'].has('en')).toBe(true);
    });

    it('設定言語が "auto" の場合、追加の確保処理を行わない [covers:initialize-manager.config-language-missing-or-auto-skips]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});
      mockChromeStorage.sync.get.mockResolvedValue({
        appSettings: { language: 'auto' },
      });

      const { detectLanguage } = await import('@/utils/language-detector');
      (detectLanguage as any).mockReturnValue('ja');

      // Act
      const { initializeMappingManager, mappingManager } = await import('@/utils/mapping-manager');
      const ensureSpy = vi.spyOn(mappingManager, 'ensureMappingForLanguage');
      await initializeMappingManager();

      // Assert: appSettings.language='auto' は追加のensure対象にならない
      expect(ensureSpy).not.toHaveBeenCalled();
    });

    it('設定言語が存在しない場合、追加の確保処理を行わない [covers:initialize-manager.config-language-missing-or-auto-skips]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});
      mockChromeStorage.sync.get.mockResolvedValue({}); // appSettings自体が存在しない
      const { detectLanguage } = await import('@/utils/language-detector');
      (detectLanguage as any).mockReturnValue('ja');

      // Act
      const { initializeMappingManager, mappingManager } = await import('@/utils/mapping-manager');
      const ensureSpy = vi.spyOn(mappingManager, 'ensureMappingForLanguage');
      await initializeMappingManager();

      // Assert: 設定を読み込んだ結果appSettingsが存在しないためensure対象にならない
      expect(mockChromeStorage.sync.get).toHaveBeenCalledWith('appSettings');
      expect(ensureSpy).not.toHaveBeenCalled();
    });

    it('ストレージアクセスエラーが発生しても続行する [covers:initialize-manager.settings-storage-error-warns]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});
      mockChromeStorage.sync.get.mockRejectedValue(new Error('Storage access error'));
      const warnSpy = vi.spyOn(console, 'warn');

      const { detectLanguage } = await import('@/utils/language-detector');
      (detectLanguage as any).mockReturnValue('ja');

      // Act & Assert
      const { initializeMappingManager } = await import('@/utils/mapping-manager');
      await expect(initializeMappingManager()).resolves.not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Failed to load settings from storage'),
        expect.any(Error)
      );

      warnSpy.mockRestore();
    });

    it('初期化エラーが発生しても例外をスローしない [covers:initialize-manager.outer-error-logs]', async () => {
      // Arrange
      const { detectLanguage } = await import('@/utils/language-detector');
      (detectLanguage as any).mockImplementation(() => {
        throw new Error('Detection error');
      });
      const errorSpy = vi.spyOn(console, 'error');

      // Act & Assert
      const { initializeMappingManager } = await import('@/utils/mapping-manager');
      await expect(initializeMappingManager()).resolves.not.toThrow();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Failed to initialize'),
        expect.any(Error)
      );

      errorSpy.mockRestore();
    });
  });

  // ==========================================================================
  // エッジケース・境界値テスト
  // ==========================================================================

  describe('エッジケース', () => {
    it('空文字列の言語コードでマッピング取得を試みた場合 [covers:text-to-id.race-no-dynamic-empty]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      const result = mappingManager.getRaceTextToId('');

      // Assert: 空オブジェクトが返る
      expect(result).toEqual({});
    });

    it('未定義の言語コードでマッピング取得を試みた場合 [covers:text-to-id.race-no-dynamic-empty]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();

      // Act
      const result = mappingManager.getRaceTextToId('unknown');

      // Assert: 空オブジェクトが返る
      expect(result).toEqual({});
    });

    it('マッピングのテキスト値に空文字列が含まれる場合、逆引きマップに含めない [covers:text-to-id.race-dynamic-reverse-and-skip-falsy]', async () => {
      // Arrange
      const { mappingManager } = await import('@/utils/mapping-manager');
      const mappingWithEmptyText = {
        ...validEnglishMappings,
        race: {
          dragon: 'Dragon',
          warrior: '', // 空文字列
          spellcaster: 'Spellcaster',
        },
      };
      (mappingManager as any)['dynamicMappings'].set('en', mappingWithEmptyText);

      // Act
      const result = mappingManager.getRaceTextToId('en');

      // Assert: 空文字列のエントリは含まれない
      expect(result['Dragon']).toBe('dragon');
      expect(result['Spellcaster']).toBe('spellcaster');
      expect(result['']).toBeUndefined(); // 空文字列のキーが存在しない
    });

    it('updatedAt と quarter フィールドが正しく設定される [covers:fetch-store.valid-mapping-sets-memory-and-storage]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});
      mockChromeStorage.local.set.mockResolvedValue(undefined);

      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(validEnglishMappings);

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      (mappingManager as any)['initialized'] = false;

      // Act: initialize を呼び出すことで fetchAndStoreMappings が実行される
      await mappingManager.initialize('en');

      // Assert
      const savedMapping = (mappingManager as any)['dynamicMappings'].get('en');
      expect(savedMapping).toBeDefined();

      // savedMapping が undefined でないことを確認した上で、プロパティをチェック
      if (savedMapping) {
        expect(savedMapping.updatedAt).toBeDefined();
        expect(typeof savedMapping.updatedAt).toBe('number');
        expect(savedMapping.quarter).toBeDefined();
        expect(typeof savedMapping.quarter).toBe('string');
      }
    });
  });

  // ==========================================================================
  // 並行処理・競合状態テスト
  // ==========================================================================

  describe('並行処理', () => {
    it('同じ言語のマッピングを複数回同時に取得しようとした場合、storage読み込み後は重複取得しうる [covers:ensure.concurrent-after-storage-can-duplicate-fetch]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      (mappingManager as any)['fetchingLanguages'].clear();
      const fetchSpy = vi
        .spyOn(mappingManager as any, 'fetchAndStoreMappings')
        .mockImplementation(async (lang: string) => {
          (mappingManager as any)['fetchingLanguages'].add(lang);
          await Promise.resolve();
          (mappingManager as any)['dynamicMappings'].set(lang, validEnglishMappings);
          (mappingManager as any)['fetchingLanguages'].delete(lang);
        });

      // Act: 同じ言語を同時に2回取得
      await Promise.all([
        mappingManager.ensureMappingForLanguage('en'),
        mappingManager.ensureMappingForLanguage('en'),
      ]);

      // Assert: fetchingLanguagesのチェックはstorage読み込み前のみなので、同時実行では2回fetchへ進む
      expect(fetchSpy.mock.calls.filter(
        (call: any[]) => call[0] === 'en'
      ).length).toBe(2);
    });

    it('異なる言語のマッピングを同時に取得した場合、それぞれ独立して処理される [covers:ensure.no-stored-fetches]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      (mappingManager as any)['fetchingLanguages'].clear();
      const fetchSpy = vi
        .spyOn(mappingManager as any, 'fetchAndStoreMappings')
        .mockImplementation(async (lang: string) => {
          (mappingManager as any)['dynamicMappings'].set(lang, validEnglishMappings);
        });

      // Act: 異なる言語を同時に2回取得
      await Promise.all([
        mappingManager.ensureMappingForLanguage('en'),
        mappingManager.ensureMappingForLanguage('fr'), // esではなくfrを使用（競合を避ける）
      ]);

      // Assert: 異なる言語はそれぞれfetch対象になる
      expect(fetchSpy).toHaveBeenCalledWith('en');
      expect(fetchSpy).toHaveBeenCalledWith('fr');

      // 両方の言語が dynamicMappings に追加されたことを確認
      expect((mappingManager as any)['dynamicMappings'].has('en')).toBe(true);
      expect((mappingManager as any)['dynamicMappings'].has('fr')).toBe(true);
    });
  });

  // ==========================================================================
  // 統合テスト（複数メソッドの連携）
  // ==========================================================================

  describe('統合テスト', () => {
    it('初期化 → マッピング取得 → マッピング使用の一連の流れ [covers:initialize.lang-fetches-when-still-missing] [covers:text-to-id.race-dynamic-reverse-and-skip-falsy]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(validEnglishMappings);

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      (mappingManager as any)['initialized'] = false;

      // Act
      await mappingManager.initialize('en');
      const raceMapping = mappingManager.getRaceTextToId('en');

      // Assert
      expect(raceMapping).toBeDefined();
      expect(raceMapping['Dragon']).toBe('dragon');
      expect(raceMapping['Warrior']).toBe('warrior');
      expect(raceMapping['Spellcaster']).toBe('spellcaster');
    });

    it('言語変更時のマッピング再取得フロー [covers:initialize.lang-loads-existing-mapping] [covers:ensure.no-stored-fetches]', async () => {
      // Arrange
      mockChromeStorage.local.get.mockResolvedValue({});
      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockImplementation((lang: string) => {
        if (lang === 'ja') return validJapaneseMappings;
        if (lang === 'en') return validEnglishMappings;
        return null;
      });

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      (mappingManager as any)['initialized'] = false;

      // Act
      await mappingManager.initialize('ja');
      await mappingManager.ensureMappingForLanguage('en');

      const jaRaceMapping = mappingManager.getRaceTextToId('ja');
      const enRaceMapping = mappingManager.getRaceTextToId('en');

      // Assert: 日本語と英語で異なるマッピングが返る
      expect(jaRaceMapping['ドラゴン族']).toBe('dragon');
      expect(enRaceMapping['Dragon']).toBe('dragon');
      expect(jaRaceMapping['Dragon']).toBeUndefined();
      expect(enRaceMapping['ドラゴン族']).toBeUndefined();
    });

    it('ストレージからの復元 → 無効なマッピング検出 → 再取得 [covers:load-language.stored-invalid-fetches-when-not-fetching]', async () => {
      // Arrange
      const storageKey = 'ygo-mappings:en';
      mockChromeStorage.local.get.mockResolvedValue({
        [storageKey]: invalidMappingsEmptyRace,
      });

      const { extractMappingsFromSearchPage } = await import('@/utils/extract-mappings');
      (extractMappingsFromSearchPage as any).mockResolvedValue(validEnglishMappings);
      const warnSpy = vi.spyOn(console, 'warn');

      const { mappingManager } = await import('@/utils/mapping-manager');
      (mappingManager as any)['dynamicMappings'].clear();
      (mappingManager as any)['initialized'] = false;

      // Act
      await mappingManager.initialize('en');

      // Assert: 警告ログが出力され、新しいマッピングが取得されたことを確認
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MappingManager] Stored mappings for en are invalid')
      );
      expect(extractMappingsFromSearchPage).toHaveBeenCalledWith('en');
      expect((mappingManager as any)['dynamicMappings'].has('en')).toBe(true);

      const mapping = (mappingManager as any)['dynamicMappings'].get('en');
      expect(mapping.race).toEqual(validEnglishMappings.race);

      warnSpy.mockRestore();
    });
  });
});
