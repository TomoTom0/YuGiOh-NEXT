import { describe, it, expect } from 'vitest';
import { classifyTagById, TAG_GROUPS } from '@/constants/tag-master-data';

describe('tag-master-data', () => {
  describe('TAG_GROUPS', () => {
    it('属性タグが7個定義されている', () => {
      expect(TAG_GROUPS.attr).toHaveLength(7);
      expect(TAG_GROUPS.attr).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    });

    it('種族タグが25個定義されている', () => {
      expect(TAG_GROUPS.race).toHaveLength(25);
      expect(TAG_GROUPS.race).toContain('20'); // ドラゴン族
      expect(TAG_GROUPS.race).toContain('100'); // 幻想魔族
    });

    it('モンスタータイプタグが12個定義されている', () => {
      expect(TAG_GROUPS.type).toHaveLength(12);
      expect(TAG_GROUPS.type).toContain('8'); // リンク
      expect(TAG_GROUPS.type).toContain('110'); // リバース
    });
  });

  describe('classifyTagById', () => {
    it('属性タグを正しく分類', () => {
      expect(classifyTagById('1')).toBe('attr'); // 闇属性
      expect(classifyTagById('2')).toBe('attr'); // 光属性
      expect(classifyTagById('7')).toBe('attr'); // 神属性
    });

    it('種族タグを正しく分類', () => {
      expect(classifyTagById('20')).toBe('race'); // ドラゴン族
      expect(classifyTagById('34')).toBe('race'); // 戦士族
      expect(classifyTagById('100')).toBe('race'); // 幻想魔族
    });

    it('モンスタータイプタグを正しく分類', () => {
      expect(classifyTagById('8')).toBe('type'); // リンク
      expect(classifyTagById('10')).toBe('type'); // エクシーズ
      expect(classifyTagById('110')).toBe('type'); // リバース
    });

    it('その他タグを正しく分類', () => {
      expect(classifyTagById('108')).toBe('others'); // 公式紹介デッキ
      expect(classifyTagById('93')).toBe('others'); // マスターデュエル用
      expect(classifyTagById('50')).toBe('others'); // YCSJ
    });

    it('未知のタグIDはothersに分類', () => {
      expect(classifyTagById('999')).toBe('others');
      expect(classifyTagById('abc')).toBe('others');
    });
  });
});
