import { describe, it, expect } from 'vitest';
import { assignCategoryGroups } from '@/utils/category-grouping';

describe('category-grouping', () => {
  describe('assignCategoryGroups', () => {
    it('最初のカテゴリは ruby_オ グループ', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '4', label: 'アクアアクトレス' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[0].group).toEqual(['ruby_オ']);
      expect(result[0].originalIndex).toBe(0);
    });

    it('2番目のカテゴリは ruby_ア グループ', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[1].group).toEqual(['ruby_ア']);
      expect(result[1].originalIndex).toBe(1);
    });

    it('カタカナ始まりは正しいグループに分類', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '4', label: 'アクアアクトレス' },
        { value: '100', label: 'カラクリ' },
        { value: '200', label: 'サイバー' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_ア']); // アクアアクトレス
      expect(result[3].group).toEqual(['ruby_カ']); // カラクリ
      expect(result[4].group).toEqual(['ruby_サ']); // サイバー
    });

    it('ひらがな始まりはカタカナに変換して分類', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '100', label: 'しらぬい' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_サ']); // し → シ → サ行
    });

    it('濁点は清音のグループに分類', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '100', label: 'ガガガ' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_カ']); // ガ → カ
    });

    it('漢字始まりで前後が同じグループなら同じグループ', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '1', label: 'アーティファクト' },
        { value: '2', label: '甲虫装機' }, // 漢字（前後探索）
        { value: '3', label: 'アロマ' }
      ];

      const result = assignCategoryGroups(categories);

      // 前がアーティファクト(ruby_ア)、後がアロマ(ruby_ア) → 同じグループ
      expect(result[3].group).toEqual(['ruby_ア']);
    });

    it('漢字始まりで前後が異なるグループなら間のすべてのグループ', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '1', label: 'カラクリ' },
        { value: '2', label: '甲虫装機' }, // 漢字（前後探索）
        { value: '3', label: 'サイバー' }
      ];

      const result = assignCategoryGroups(categories);

      // 前がカラクリ(ruby_カ)、後がサイバー(ruby_サ) → ruby_カ, ruby_サ
      expect(result[3].group).toEqual(['ruby_カ', 'ruby_サ']);
    });

    it('originalIndexが正しく設定される', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '4', label: 'アクアアクトレス' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[0].originalIndex).toBe(0);
      expect(result[1].originalIndex).toBe(1);
      expect(result[2].originalIndex).toBe(2);
    });

    it('value と label が保持される', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '4', label: 'アクアアクトレス' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[0].value).toBe('678');
      expect(result[0].label).toBe('王家の神殿');
      expect(result[1].value).toBe('4');
      expect(result[1].label).toBe('アクアアクトレス');
    });
  });
});
