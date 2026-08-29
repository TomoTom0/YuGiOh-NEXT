import { describe, it, expect } from 'vitest';
import { assignCategoryGroups } from '@/utils/category-grouping';

describe('category-grouping', () => {
  describe('assignCategoryGroups', () => {
    // [covers:assign.index0_hardcoded_o]
    it('最初のカテゴリは ruby_オ グループ', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '4', label: 'アクアアクトレス' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[0].group).toEqual(['ruby_オ']);
      expect(result[0].originalIndex).toBe(0);
    });

    // [covers:assign.index0_hardcoded_o]
    it('最初のカテゴリはlabelの内容に関わらず ruby_オ グループ固定', () => {
      const categories = [
        { value: '999', label: 'ザザザ' },
        { value: '4', label: 'アクアアクトレス' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[0].group).toEqual(['ruby_オ']);
    });

    // [covers:assign.index1_hardcoded_a]
    it('2番目のカテゴリは ruby_ア グループ', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[1].group).toEqual(['ruby_ア']);
      expect(result[1].originalIndex).toBe(1);
    });

    // [covers:assign.index1_hardcoded_a]
    it('2番目のカテゴリはlabelの内容に関わらず ruby_ア グループ固定', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '999', label: 'ザザザ' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[1].group).toEqual(['ruby_ア']);
    });

    // [covers:assign.kana_readable_uses_getKanaGroup]
    // [covers:get_kana_group.not_in_map_uses_original]
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

    // [covers:get_kana_group.hiragana_converted_first]
    it('ひらがな始まりはカタカナに変換して分類', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '100', label: 'しらぬい' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_シ']); // し → シ
    });

    // [covers:get_kana_group.dakuten_voiced_mapped]
    it('濁点は清音のグループに分類', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '100', label: 'ガガガ' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_カ']); // ガ → カ
    });

    // [covers:get_kana_group.dakuten_semivoiced_mapped_same_as_voiced]
    it('半濁点は濁点と同じ清音のグループに分類', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '100', label: 'パンプキン' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_ハ']); // パ → ハ（バ行と同じ）
    });

    // [covers:get_kana_group.vu_self_mapped]
    it('ヴは独立したグループに分類', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '100', label: 'ヴァレット' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_ヴ']);
    });

    // [covers:assign.nonkana_char_dispatches_helper]
    // [covers:nonkana.both_equal_returns_single]
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

    // [covers:nonkana.both_different_returns_range]
    // [covers:groups_between.normal_range]
    it('漢字始まりで前後が異なるグループなら間のすべてのグループ', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '1', label: 'カラクリ' },
        { value: '2', label: '甲虫装機' }, // 漢字（前後探索）
        { value: '3', label: 'サイバー' }
      ];

      const result = assignCategoryGroups(categories);

      // 前がカラクリ(ruby_カ)、後がサイバー(ruby_サ) → 間のすべての文字グループ
      expect(result[3].group).toEqual(['ruby_カ', 'ruby_キ', 'ruby_ク', 'ruby_ケ', 'ruby_コ', 'ruby_サ']);
    });

    // [covers:assign.empty_label_dispatches_nonkana_helper]
    it('空文字labelは非カナ扱いとなり前後探索でグループが決まる', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '1', label: 'カラクリ' },
        { value: '2', label: '' }, // 空文字
        { value: '3', label: 'サイバー' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[3].group).toEqual(['ruby_カ', 'ruby_キ', 'ruby_ク', 'ruby_ケ', 'ruby_コ', 'ruby_サ']);
    });

    // [covers:nonkana.backward_search_skips_falsy_label]
    // [covers:nonkana.only_prev_returns_prev]
    it('後方探索で空文字labelはスキップしさらに前を調べる', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '1', label: 'アロマ' },
        { value: '2', label: '' },
        { value: '3', label: '甲虫装機' } // 対象: 後方に候補なし
      ];

      const result = assignCategoryGroups(categories);

      // categories[3]の空labelはスキップされ、categories[2]（ruby_ア）がprevGroupになる
      expect(result[4].group).toEqual(['ruby_ア']);
    });

    // [covers:nonkana.backward_search_skips_nonkana_char]
    it('後方探索で漢字等の非カナlabelはbreakせず更に前を調べる', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '1', label: 'カラクリ' },
        { value: '2', label: '甲虫装機' },
        { value: '3', label: '壊獣' } // 対象: 直前が漢字、後方に候補なし
      ];

      const result = assignCategoryGroups(categories);

      // categories[3]（漢字）はスキップされ、categories[2]（ruby_カ）がprevGroupになる
      expect(result[4].group).toEqual(['ruby_カ']);
    });

    // [covers:nonkana.backward_search_exhausted_null]
    // [covers:nonkana.only_next_returns_next]
    it('前方に候補が無ければprevGroupはnullのままnextGroupが使われる', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '1', label: '甲虫装機' }, // 対象: index2、前(index0,1)は非カナ
        { value: '2', label: '甲虫装機2' },
        { value: '3', label: 'カラクリ' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_カ']);
    });

    // [covers:nonkana.forward_search_mirrors_backward]
    it('前方探索も空文字labelをスキップして更に後を調べる', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '1', label: '甲虫装機' }, // 対象: index2
        { value: '2', label: '' },
        { value: '3', label: 'サイバー' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_サ']);
    });

    // [covers:nonkana.neither_returns_other]
    it('前後どちらもカナが見つからなければ ruby_その他 になる', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '1', label: '甲虫装機' },
        { value: '2', label: '壊獣' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_その他']);
      expect(result[3].group).toEqual(['ruby_その他']);
    });

    // [covers:groups_between.invalid_kana_fallback]
    it('前後のグループがKANA_LISTに無い文字(小書き文字等)の場合は範囲展開されずそのまま返る', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '1', label: 'ッターゲット' }, // 小書きの'ッ'始まり → isKatakana範囲内なのでカナ読み可能扱い
        { value: '2', label: '甲虫装機' }, // 対象: 漢字始まり
        { value: '3', label: 'サイバー' }
      ];

      const result = assignCategoryGroups(categories);

      // prevGroup='ruby_ッ'（KANA_LISTに存在しない）, nextGroup='ruby_サ' → getGroupsBetweenが[start, end]をそのまま返す
      expect(result[3].group).toEqual(['ruby_ッ', 'ruby_サ']);
    });

    // [covers:groups_between.reversed_order_returns_empty]
    it('前後のグループが50音順で逆転している場合は空配列になる', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '1', label: 'ラッシュ' }, // ruby_ラ（KANA_LIST内で後方）
        { value: '2', label: '甲虫装機' }, // 対象: 漢字始まり
        { value: '3', label: 'アロマ' } // ruby_ア（KANA_LIST内で前方）
      ];

      const result = assignCategoryGroups(categories);

      // startIndex(ラ) > endIndex(ア) のためforループが実行されず空配列
      expect(result[3].group).toEqual([]);
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
