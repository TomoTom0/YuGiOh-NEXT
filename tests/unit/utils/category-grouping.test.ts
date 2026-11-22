import { describe, it, expect } from 'vitest';
import { assignCategoryGroups } from '@/utils/category-grouping';

describe('category-grouping', () => {
  describe('assignCategoryGroups', () => {
    it('[covers:assign.index0-hardcoded-o] 最初のカテゴリは ruby_オ グループ', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '4', label: 'アクアアクトレス' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[0].group).toEqual(['ruby_オ']);
      expect(result[0].originalIndex).toBe(0);
    });

    it('[covers:assign.index0-hardcoded-o] 最初のカテゴリはlabelの内容に関わらず ruby_オ グループ固定', () => {
      const categories = [
        { value: '999', label: 'ザザザ' },
        { value: '4', label: 'アクアアクトレス' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[0].group).toEqual(['ruby_オ']);
    });

    it('[covers:assign.index1-hardcoded-a] 2番目のカテゴリは ruby_ア グループ', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[1].group).toEqual(['ruby_ア']);
      expect(result[1].originalIndex).toBe(1);
    });

    it('[covers:assign.index1-hardcoded-a] 2番目のカテゴリはlabelの内容に関わらず ruby_ア グループ固定', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '999', label: 'ザザザ' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[1].group).toEqual(['ruby_ア']);
    });

    it('[covers:assign.kana-readable-uses-get-kana-group,get-kana-group.not-in-map-uses-original] カタカナ始まりは正しいグループに分類', () => {
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

    it('[covers:hiragana-to-katakana.non-hiragana-fallback] 非ひらがな（カタカナ）は変換されずそのままグループになる（前提固定）', () => {
      // 前提固定: hiraganaToKatakana は export されておらず、唯一の呼び出し元
      // getKanaGroup は isHiragana(char)===true の場合のみこの関数を呼ぶため、
      // 非ひらがな文字でのフォールバック分岐は公開API経由では到達できない。
      // 代わりに「非ひらがな文字は変換されずそのまま使われる」という前提
      // そのものを公開挙動で固定する（条件の verified=false と
      // unverifiable_reason は保持する）。
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '100', label: 'アーティファクト' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_ア']); // ア は変換されずそのまま
    });

    it('[covers:get-kana-group.hiragana-converted-first] ひらがな始まりはカタカナに変換して分類', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '100', label: 'しらぬい' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_シ']); // し → シ
    });

    it('[covers:get-kana-group.dakuten-voiced-mapped] 濁点は清音のグループに分類', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '100', label: 'ガガガ' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_カ']); // ガ → カ
    });

    it('[covers:get-kana-group.dakuten-semivoiced-mapped-same-as-voiced] 半濁点は濁点と同じ清音のグループに分類', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '100', label: 'パンプキン' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_ハ']); // パ → ハ（バ行と同じ）
    });

    it('[covers:get-kana-group.vu-self-mapped] ヴは独立したグループに分類', () => {
      const categories = [
        { value: '678', label: '王家の神殿' },
        { value: '583', label: '赤き竜' },
        { value: '100', label: 'ヴァレット' }
      ];

      const result = assignCategoryGroups(categories);

      expect(result[2].group).toEqual(['ruby_ヴ']);
    });

    it('[covers:assign.nonkana-char-dispatches-helper,nonkana.both-equal-returns-single] 漢字始まりで前後が同じグループなら同じグループ', () => {
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

    it('[covers:nonkana.both-different-returns-range,groups-between.normal-range] 漢字始まりで前後が異なるグループなら間のすべてのグループ', () => {
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

    it('[covers:assign.empty-label-dispatches-nonkana-helper] 空文字labelは非カナ扱いとなり前後探索でグループが決まる', () => {
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

    it('[covers:nonkana.backward-search-skips-falsy-label,nonkana.only-prev-returns-prev] 後方探索で空文字labelはスキップしさらに前を調べる', () => {
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

    it('[covers:nonkana.backward-search-skips-nonkana-char] 後方探索で漢字等の非カナlabelはbreakせず更に前を調べる', () => {
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

    it('[covers:nonkana.backward-search-exhausted-null,nonkana.only-next-returns-next] 前方に候補が無ければprevGroupはnullのままnextGroupが使われる', () => {
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

    it('[covers:nonkana.forward-search-mirrors-backward] 前方探索も空文字labelをスキップして更に後を調べる', () => {
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

    it('[covers:nonkana.neither-returns-other] 前後どちらもカナが見つからなければ ruby_その他 になる', () => {
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

    it('[covers:groups-between.invalid-kana-fallback] 前後のグループがKANA_LISTに無い文字(小書き文字等)の場合は範囲展開されずそのまま返る', () => {
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

    it('[covers:groups-between.reversed-order-returns-empty] 前後のグループが50音順で逆転している場合は空配列になる', () => {
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
