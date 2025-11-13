import { describe, it, expect } from 'vitest';
import { mappingManager } from '../../../src/utils/mapping-manager';

describe('mapping-manager', () => {
  describe('日本語種族マッピング', () => {
    it('ドラゴン族を正しくマッピングできる', () => {
      const mapping = mappingManager.getRaceTextToId('ja');
      expect(mapping).toBeDefined();
      expect(mapping['ドラゴン族']).toBe('dragon');
    });

    it('機械族を正しくマッピングできる', () => {
      const mapping = mappingManager.getRaceTextToId('ja');
      expect(mapping['機械族']).toBe('machine');
    });
  });

  describe('英語種族マッピング', () => {
    it('Dragonを正しくマッピングできる', () => {
      const mapping = mappingManager.getRaceTextToId('en');
      expect(mapping).toBeDefined();
      expect(mapping['Dragon']).toBe('dragon');
    });

    it('Machineを正しくマッピングできる', () => {
      const mapping = mappingManager.getRaceTextToId('en');
      expect(mapping['Machine']).toBe('machine');
    });
  });

  describe('日本語モンスタータイプマッピング', () => {
    it('通常を正しくマッピングできる', () => {
      const mapping = mappingManager.getMonsterTypeTextToId('ja');
      expect(mapping).toBeDefined();
      expect(mapping['通常']).toBe('normal');
    });

    it('効果を正しくマッピングできる', () => {
      const mapping = mappingManager.getMonsterTypeTextToId('ja');
      expect(mapping['効果']).toBe('effect');
    });

    it('融合を正しくマッピングできる', () => {
      const mapping = mappingManager.getMonsterTypeTextToId('ja');
      expect(mapping['融合']).toBe('fusion');
    });
  });

  describe('英語モンスタータイプマッピング', () => {
    it('Normalを正しくマッピングできる', () => {
      const mapping = mappingManager.getMonsterTypeTextToId('en');
      expect(mapping).toBeDefined();
      expect(mapping['Normal']).toBe('normal');
    });

    it('Effectを正しくマッピングできる', () => {
      const mapping = mappingManager.getMonsterTypeTextToId('en');
      expect(mapping['Effect']).toBe('effect');
    });

    it('Fusionを正しくマッピングできる', () => {
      const mapping = mappingManager.getMonsterTypeTextToId('en');
      expect(mapping['Fusion']).toBe('fusion');
    });
  });

  describe('未定義言語のフォールバック', () => {
    it('存在しない言語の種族マッピングは日本語にフォールバックする', () => {
      const mapping = mappingManager.getRaceTextToId('xx');
      expect(mapping).toBeDefined();
      expect(mapping['ドラゴン族']).toBe('dragon');
    });

    it('存在しない言語のモンスタータイプマッピングは日本語にフォールバックする', () => {
      const mapping = mappingManager.getMonsterTypeTextToId('xx');
      expect(mapping).toBeDefined();
      expect(mapping['通常']).toBe('normal');
    });
  });

  describe('動的マッピング存在確認', () => {
    it('初期状態では日本語の動的マッピングは存在しない', () => {
      const hasDynamic = mappingManager.hasDynamicMapping('ja');
      expect(hasDynamic).toBe(false);
    });

    it('初期状態では英語の動的マッピングは存在しない', () => {
      const hasDynamic = mappingManager.hasDynamicMapping('en');
      expect(hasDynamic).toBe(false);
    });
  });

  describe('複数言語対応', () => {
    it('韓国語種族マッピングが存在する', () => {
      const mapping = mappingManager.getRaceTextToId('ko');
      expect(mapping).toBeDefined();
    });

    it('ドイツ語種族マッピングが存在する', () => {
      const mapping = mappingManager.getRaceTextToId('de');
      expect(mapping).toBeDefined();
    });
  });
});
