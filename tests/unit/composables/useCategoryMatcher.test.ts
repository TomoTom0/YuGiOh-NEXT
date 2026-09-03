import { describe, it, expect } from 'vitest';
import {
  computeCategoryMatchedCardIds,
  countCardsForCategoryLabel,
  computeAutoCategoryIds
} from '../../../src/composables/deck/useCategoryMatcher';
import type { DeckCardRef, CardData } from '../../../src/types/deck';

// テストデータ
const mockCardDB: Record<string, CardData> = {
  '1': {
    cardId: '1',
    name: 'ブラック・マジシャン',
    ruby: 'ブラック・マジシャン',
    cardType: 'monster',
    text: '魔法使い族の代表的なモンスター',
    pendulumText: ''
  },
  '2': {
    cardId: '2',
    name: 'ブラック・マジシャン・ガール',
    ruby: 'ブラック・マジシャン・ガール',
    cardType: 'monster',
    text: 'ブラック・マジシャンを師匠とする見習い魔法使い',
    pendulumText: ''
  },
  '3': {
    cardId: '3',
    name: '黒魔導強化',
    ruby: 'ブラック・マジック・ストレングス',
    cardType: 'spell',
    text: 'ブラック・マジシャンの攻撃力を上昇させる',
    pendulumText: ''
  },
  '4': {
    cardId: '4',
    name: '青眼の白龍',
    ruby: 'ブルーアイズ・ホワイト・ドラゴン',
    cardType: 'monster',
    text: '高い攻撃力を誇る伝説のドラゴン',
    pendulumText: ''
  },
  '5': {
    cardId: '5',
    name: '青眼の究極竜',
    ruby: 'ブルーアイズ・アルティメットドラゴン',
    cardType: 'monster',
    text: '青眼の白龍3体を融合召喚した究極のドラゴン',
    pendulumText: ''
  }
};

const cardDBGetter = (cid: string) => mockCardDB[cid];

const emptyDecks = {
  main: [] as DeckCardRef[],
  extra: [] as DeckCardRef[],
  side: [] as DeckCardRef[],
  trash: [] as DeckCardRef[]
};

describe('useCategoryMatcher', () => {
  it('カテゴリが選択されていない場合は空のSetを返す [covers:empty_selected_categories_returns_empty_set]', () => {
    const result = computeCategoryMatchedCardIds(
      [],
      {},
      emptyDecks,
      cardDBGetter
    );
    expect(result.size).toBe(0);
  });

  it('カテゴリラベルが存在しない場合は空のSetを返す [covers:labels.unresolved_filtered_or_empty_set]', () => {
    const result = computeCategoryMatchedCardIds(
      ['cat1'],
      {},
      emptyDecks,
      cardDBGetter
    );
    expect(result.size).toBe(0);
  });

  it('カテゴリラベルが空文字列のcatIdはフィルタで除外され結果が空になる [covers:labels.unresolved_filtered_or_empty_set]', () => {
    // categoryLabelMap[catId] が空文字列の場合、Boolean(label) で弾かれる
    const decks = {
      main: [{ cid: '1', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
      extra: [] as DeckCardRef[],
      side: [] as DeckCardRef[],
      trash: [] as DeckCardRef[]
    };
    const result = computeCategoryMatchedCardIds(
      ['cat1'],
      { cat1: '' },
      decks,
      cardDBGetter
    );
    expect(result.size).toBe(0);
  });

  describe('一段階目：カテゴリラベルの直接マッチング', () => {
    it('カード名にカテゴリラベルを含むカードを検出 [covers:first_stage.search_fields_joined_with_space]', () => {
      const decks = {
        main: [{ cid: '1', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブラック・マジシャン' },
        decks,
        cardDBGetter
      );
      expect(result.size).toBe(1);
      expect(result.has('1')).toBe(true);
    });

    it('ルビにカテゴリラベルを含むカードを検出 [covers:first_stage.search_fields_joined_with_space]', () => {
      const decks = {
        main: [{ cid: '4', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブルーアイズ' },
        decks,
        cardDBGetter
      );
      expect(result.size).toBe(1);
      expect(result.has('4')).toBe(true);
    });

    it('テキストにカテゴリラベルを含むカードを検出 [covers:first_stage.search_fields_joined_with_space]', () => {
      const decks = {
        main: [{ cid: '1', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: '魔法使い族' },
        decks,
        cardDBGetter
      );
      expect(result.size).toBe(1);
      expect(result.has('1')).toBe(true);
    });

    it('ペンデュラムテキストにカテゴリラベルを含むカードを検出 [covers:first_stage.search_fields_joined_with_space]', () => {
      // pendulumText も一段階目の検索対象に含まれる
      const pendulumCardDB: Record<string, CardData> = {
        '10': {
          cardId: '10',
          name: 'ペンデュラムモンスターA',
          ruby: '',
          cardType: 'monster',
          text: '通常効果',
          pendulumText: '特殊なペンデュラム効果ラベル'
        }
      };
      const decks = {
        main: [{ cid: '10', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ペンデュラム効果ラベル' },
        decks,
        (cid) => pendulumCardDB[cid]
      );
      expect(result.size).toBe(1);
      expect(result.has('10')).toBe(true);
    });

    it('カードDBにないカードは無視される [covers:first_stage.ignores_missing_card]', () => {
      const decks = {
        main: [
          { cid: '1', ciid: '0', lang: 'ja', quantity: 1 },
          { cid: '999', ciid: '0', lang: 'ja', quantity: 1 } // 存在しないカード
        ] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブラック・マジシャン' },
        decks,
        cardDBGetter
      );
      expect(result.size).toBe(1);
      expect(result.has('1')).toBe(true);
      expect(result.has('999')).toBe(false);
    });
  });

  describe('二段階目：一段階目で見つかったカード名のマッチング', () => {
    it('一段階目で見つかったカード名をテキストに含むカードを検出 [covers:merge_first_and_second_stage,first_stage.match_adds_to_matched_and_card_names,second_stage.searches_text_and_pendulum_text_only]', () => {
      const decks = {
        main: [
          { cid: '1', ciid: '0', lang: 'ja', quantity: 1 },
          { cid: '2', ciid: '0', lang: 'ja', quantity: 1 },
          { cid: '3', ciid: '0', lang: 'ja', quantity: 1 }
        ] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブラック・マジシャン' },
        decks,
        cardDBGetter
      );
      // 1: カテゴリラベルがカード名に含まれる（一段階目）
      // 2: テキストに「ブラック・マジシャン」を含む（二段階目）
      // 3: テキストに「ブラック・マジシャン」を含む（二段階目）
      expect(result.size).toBe(3);
      expect(result.has('1')).toBe(true);
      expect(result.has('2')).toBe(true);
      expect(result.has('3')).toBe(true);
    });

    it('二段階目は一段階目で見つかったカードを除外する [covers:second_stage.excludes_first_stage_matches]', () => {
      const decks = {
        main: [
          { cid: '1', ciid: '0', lang: 'ja', quantity: 1 },
          { cid: '2', ciid: '0', lang: 'ja', quantity: 1 }
        ] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブラック・マジシャン' },
        decks,
        cardDBGetter
      );
      // 1: 一段階目で検出（カード名に「ブラック・マジシャン」）
      // 2: 二段階目で検出（テキストに「ブラック・マジシャン」、ただし1は除外）
      expect(result.size).toBe(2);
      expect(result.has('1')).toBe(true);
      expect(result.has('2')).toBe(true);
    });

    it('一段階目で1件もマッチしない場合は二段階目をスキップして空Setを返す [covers:second_stage.skipped_when_no_first_stage_names]', () => {
      // selectedCategoriesは非空・ラベルも非空だが、どのカードにもマッチしない場合
      // L62/L69の早期returnは通過し、L104のガードで二段階目がスキップされる
      const decks = {
        main: [
          { cid: '1', ciid: '0', lang: 'ja', quantity: 1 },
          { cid: '4', ciid: '0', lang: 'ja', quantity: 1 }
        ] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: '存在しないラベルXXX' },
        decks,
        cardDBGetter
      );
      expect(result.size).toBe(0);
    });

    it('二段階目でcardDBがundefinedを返すcidはスキップされる [covers:second_stage.ignores_missing_card]', () => {
      // 一段階目でマッチするカードを用意し、二段階目の走査対象にcardDB undefinedのcidを混ぜる
      const callLog: string[] = [];
      const loggingCardDB = (cid: string) => {
        callLog.push(cid);
        return mockCardDB[cid];
      };
      const decks = {
        main: [
          { cid: '1', ciid: '0', lang: 'ja', quantity: 1 }, // 一段階目マッチ（ブラック・マジシャン）
          { cid: '999', ciid: '0', lang: 'ja', quantity: 1 } // cardDB undefined
        ] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブラック・マジシャン' },
        decks,
        loggingCardDB
      );
      // 999はcardDB undefinedのため二段階目でも結果に含まれない
      expect(result.has('999')).toBe(false);
      expect(result.size).toBe(1);
      expect(result.has('1')).toBe(true);
    });

    it('二段階目はname/rubyを検索対象に含まない（text/pendulumTextのみ） [covers:second_stage.searches_text_and_pendulum_text_only]', () => {
      // name/rubyにfirstStageCardNamesを含んでもマッチしないことを明示的に検証
      // text/pendulumTextにのみ含まれる場合はマッチする
      const customDB: Record<string, CardData> = {
        '4': {
          cardId: '4',
          name: '青眼の白龍',
          ruby: 'ブルーアイズ・ホワイト・ドラゴン',
          cardType: 'monster',
          text: '高い攻撃力を誇る伝説のドラゴン',
          pendulumText: ''
        },
        '100': {
          cardId: '100',
          name: 'とあるカード',
          ruby: '',
          cardType: 'spell',
          text: 'これは青眼の白龍への言及',
          pendulumText: ''
        },
        '101': {
          cardId: '101',
          name: '青眼の白龍を名前に含むカード', // nameにfirstStageCardNameを含むがtextには含まない
          ruby: 'ルビ青眼の白龍', // rubyにも含む
          cardType: 'monster',
          text: 'まったく関係ない効果文',
          pendulumText: ''
        }
      };
      const decks = {
        main: [
          { cid: '4', ciid: '0', lang: 'ja', quantity: 1 }, // 一段階目マッチ（rubyが「ブルーアイズ・ホワイト・ドラゴン」）
          { cid: '100', ciid: '0', lang: 'ja', quantity: 1 }, // textに「青眼の白龍」を含む→二段階目でマッチ
          { cid: '101', ciid: '0', lang: 'ja', quantity: 1 } // name/rubyのみに「青眼の白龍」を含む→マッチしない
        ] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブルーアイズ・ホワイト・ドラゴン' },
        decks,
        (cid) => customDB[cid]
      );
      // 4: 一段階目でマッチ（rubyが「ブルーアイズ・ホワイト・ドラゴン」）
      // 100: 二段階目でマッチ（textに「青眼の白龍」を含む）
      // 101: name/rubyにしか「青眼の白龍」を含まないので二段階目ではマッチしない
      expect(result.size).toBe(2);
      expect(result.has('4')).toBe(true);
      expect(result.has('100')).toBe(true);
      expect(result.has('101')).toBe(false);
    });

    it('二段階目の内側ループは1つ見つかれば確定する（short-circuit） [covers:second_stage.short_circuits_on_first_match]', () => {
      // 複数の firstStageCardNames がある状況で、break で早期脱却しても結果が同じ
      // firstStageCardNames = {'ブラック・マジシャン', '青眼の白龍'} になる2カテゴリ指定
      const decks = {
        main: [
          { cid: '1', ciid: '0', lang: 'ja', quantity: 1 }, // 一段階目: ブラック・マジシャン
          { cid: '4', ciid: '0', lang: 'ja', quantity: 1 }, // 一段階目: 青眼の白龍
          // cid=2 の text には「ブラック・マジシャン」が、cid=3 には「ブラック・マジシャン」が含まれる
          { cid: '2', ciid: '0', lang: 'ja', quantity: 1 },
          { cid: '3', ciid: '0', lang: 'ja', quantity: 1 }
        ] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1', 'cat2'],
        { cat1: 'ブラック・マジシャン', cat2: 'ブルーアイズ' },
        decks,
        cardDBGetter
      );
      // firstStageCardNames は2件（'ブラック・マジシャン', '青眼の白龍'）
      // 二段階目で cid=2 は text に 'ブラック・マジシャン' を含むのでマッチ（1件目でbreak）
      // cid=3 も同様
      expect(result.has('2')).toBe(true);
      expect(result.has('3')).toBe(true);
      expect(result.size).toBe(4); // 1, 4 (first) + 2, 3 (second)
    });
  });

  describe('複数カテゴリ・複数セクション', () => {
    it('複数カテゴリで検索できる [covers:first_stage.matches_if_any_label_matches_OR_semantics]', () => {
      const decks = {
        main: [
          { cid: '1', ciid: '0', lang: 'ja', quantity: 1 },
          { cid: '4', ciid: '0', lang: 'ja', quantity: 1 }
        ] as DeckCardRef[],
        extra: [] as DeckCardRef[],
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1', 'cat2'],
        { cat1: 'ブラック・マジシャン', cat2: 'ブルーアイズ' },
        decks,
        cardDBGetter
      );
      // cat1 ラベルは cid=1 にのみマッチ、cat2 ラベルは cid=4 にのみマッチ
      // OR semantics によりどちらも結果に含まれる
      expect(result.size).toBe(2);
      expect(result.has('1')).toBe(true);
      expect(result.has('4')).toBe(true);
    });

    it('複数セクション（main, extra, side, trash）からカードを収集 [covers:collects_unique_cids_across_all_sections]', () => {
      const decks = {
        main: [{ cid: '1', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        extra: [{ cid: '4', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        side: [{ cid: '5', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1', 'cat2'],
        { cat1: 'ブラック・マジシャン', cat2: 'ブルーアイズ' },
        decks,
        cardDBGetter
      );
      // 1: main（一段階目）
      // 4: extra（一段階目）
      // 5: side（二段階目、テキストに「青眼の白龍」を含む）
      expect(result.size).toBe(3);
      expect(result.has('1')).toBe(true);
      expect(result.has('4')).toBe(true);
      expect(result.has('5')).toBe(true);
    });

    it('同一cidが複数セクションに重複して含まれてもcardDB呼び出しは1回限り [covers:collects_unique_cids_across_all_sections]', () => {
      // Setで重複排除されるため、cid=1 が main と extra の両方にあっても
      // cardDB(1) の呼び出しは1回だけ行われる
      const callCount: Record<string, number> = {};
      const countingCardDB = (cid: string) => {
        callCount[cid] = (callCount[cid] || 0) + 1;
        return mockCardDB[cid];
      };
      const decks = {
        main: [{ cid: '1', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[],
        extra: [{ cid: '1', ciid: '0', lang: 'ja', quantity: 1 }] as DeckCardRef[], // 同一cid重複
        side: [] as DeckCardRef[],
        trash: [] as DeckCardRef[]
      };
      const result = computeCategoryMatchedCardIds(
        ['cat1'],
        { cat1: 'ブラック・マジシャン' },
        decks,
        countingCardDB
      );
      expect(callCount['1']).toBe(1); // 重複排除で1回のみ
      expect(result.size).toBe(1);
      expect(result.has('1')).toBe(true);
    });
  });

  describe('countCardsForCategoryLabel', () => {
    it('カード名にラベルを含むカードのquantityを合算する', () => {
      const refs: DeckCardRef[] = [
        { cid: '1', ciid: '0', lang: 'ja', quantity: 3 }, // name一致
        { cid: '4', ciid: '0', lang: 'ja', quantity: 2 }  // 不一致
      ];
      const count = countCardsForCategoryLabel('ブラック・マジシャン', refs, cardDBGetter);
      expect(count).toBe(3);
    });

    it('テキストにラベルを含むカードもカウントする', () => {
      const refs: DeckCardRef[] = [
        { cid: '2', ciid: '0', lang: 'ja', quantity: 1 }, // text一致（name不一致ではない）
        { cid: '3', ciid: '0', lang: 'ja', quantity: 5 }  // text一致
      ];
      const count = countCardsForCategoryLabel('ブラック・マジシャン', refs, cardDBGetter);
      // 2: name一致（ブラック・マジシャン・ガール）、3: text一致 → 両方カウント
      expect(count).toBe(6);
    });

    it('quantityが0の場合は1として扱う（既存CategoryDialogの挙動を踏襲）', () => {
      const refs: DeckCardRef[] = [
        { cid: '1', ciid: '0', lang: 'ja', quantity: 0 }
      ];
      const count = countCardsForCategoryLabel('ブラック・マジシャン', refs, cardDBGetter);
      expect(count).toBe(1);
    });

    it('cardDBがundefinedを返すcidはスキップする', () => {
      const refs: DeckCardRef[] = [
        { cid: '999', ciid: '0', lang: 'ja', quantity: 1 }
      ];
      const count = countCardsForCategoryLabel('ブラック・マジシャン', refs, cardDBGetter);
      expect(count).toBe(0);
    });

    it('マッチしなければ0を返す', () => {
      const refs: DeckCardRef[] = [
        { cid: '4', ciid: '0', lang: 'ja', quantity: 3 }
      ];
      const count = countCardsForCategoryLabel('ブラック・マジシャン', refs, cardDBGetter);
      expect(count).toBe(0);
    });
  });

  describe('computeAutoCategoryIds', () => {
    it('閾値以上のカテゴリIDを全て返す', () => {
      const refs: DeckCardRef[] = [
        { cid: '1', ciid: '0', lang: 'ja', quantity: 3 }, // 'ブラック・マジシャン' name一致
        { cid: '2', ciid: '0', lang: 'ja', quantity: 3 }, // 'ブラック・マジシャン' text一致
        { cid: '4', ciid: '0', lang: 'ja', quantity: 3 }  // '青眼' name一致（1件のみ）
      ];
      const labelMap = { cat1: 'ブラック・マジシャン', cat2: '青眼' };
      const result = computeAutoCategoryIds(labelMap, refs, cardDBGetter, 6);
      expect(result).toContain('cat1'); // 3(cid1)+3(cid2)=6 >= 6
      expect(result).not.toContain('cat2'); // cid4のみ = 3 < 6
    });

    it('マッチする枚数が閾値未満のカテゴリは含まれない', () => {
      const refs: DeckCardRef[] = [
        { cid: '1', ciid: '0', lang: 'ja', quantity: 1 }
      ];
      const result = computeAutoCategoryIds(
        { cat1: 'ブラック・マジシャン' },
        refs,
        cardDBGetter,
        7
      );
      expect(result).toEqual([]);
    });

    it('ラベルが空文字のカテゴリIDは除外する', () => {
      const refs: DeckCardRef[] = [
        { cid: '1', ciid: '0', lang: 'ja', quantity: 10 }
      ];
      const result = computeAutoCategoryIds(
        { cat1: '' },
        refs,
        cardDBGetter,
        1
      );
      expect(result).toEqual([]);
    });
  });
});
