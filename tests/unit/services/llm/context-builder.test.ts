import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from '@/services/llm/context-builder';
import type { CardInfo, MonsterCard, SpellCard, TrapCard } from '@/types/card';
import type { DeckSections } from '@/services/llm/types';

const baseCard = {
  ciid: '1',
  lang: 'ja',
  imgs: [],
};

function monster(overrides: Partial<MonsterCard> = {}): MonsterCard {
  return {
    ...baseCard,
    name: '青眼の白龍',
    cardId: '100',
    cardType: 'monster',
    attribute: 'light',
    levelType: 'level',
    levelValue: 8,
    race: 'dragon',
    types: ['normal'],
    atk: 3000,
    def: 2500,
    isExtraDeck: false,
    ...overrides,
  };
}

function spell(overrides: Partial<SpellCard> = {}): SpellCard {
  return {
    ...baseCard,
    name: 'サイクロン',
    cardId: '200',
    cardType: 'spell',
    ...overrides,
  };
}

function trap(overrides: Partial<TrapCard> = {}): TrapCard {
  return {
    ...baseCard,
    name: '神の宣告',
    cardId: '300',
    cardType: 'trap',
    ...overrides,
  };
}

function sections(overrides: Partial<DeckSections> = {}): DeckSections {
  return {
    main: [],
    extra: [],
    side: [],
    trash: [],
    searchResults: [],
    ...overrides,
  };
}

describe('services/llm/context-builder', () => {
  it('固定システムプロンプトと空デッキ要約を出力する [covers:build_prompt.includes_static_system_prompt] [covers:build_prompt.deck_summary_lengths_and_none] [covers:summarize_cards.empty_returns_empty_string] [covers:build_prompt.focused_card_absent]', () => {
    const prompt = buildSystemPrompt(sections());

    expect(prompt.startsWith('あなたは遊戯王デッキ構築アシスタントです。')).toBe(true);
    expect(prompt).toContain('`{{カード名|cardId}}` 形式');
    expect(prompt).toContain('{"tool": "ツール名", "args": {...}}');
    expect(prompt).toContain('### メインデッキ（section="main", 0枚）\nなし');
    expect(prompt).toContain('### エクストラデッキ（section="extra", 0枚）\nなし');
    expect(prompt).toContain('### サイドデッキ（section="side", 0枚）\nなし');
    expect(prompt).not.toContain('## 現在フォーカス中のカード');
  });

  it('モンスターカードのヘッダーを実装どおり生成する [covers:card_header.monster_level_label] [covers:card_header.monster_type_label_maps_and_filters] [covers:card_header.monster_attribute_race_map_or_raw] [covers:card_header.monster_atk_def_nullish_omitted] [covers:card_header.monster_return_template] [covers:format_card_entry.count_le_one_no_suffix] [covers:build_prompt.deck_summary_lists]', () => {
    const prompt = buildSystemPrompt(sections({
      main: [
        monster(),
        monster({
          name: 'No.39 希望皇ホープ',
          cardId: '101',
          attribute: 'light',
          levelType: 'rank',
          levelValue: 4,
          race: 'warrior',
          types: ['effect', 'xyz'],
          atk: 2500,
          def: 2000,
          isExtraDeck: true,
        }),
        monster({
          name: 'デコード・トーカー',
          cardId: '102',
          attribute: 'dark',
          levelType: 'link',
          levelValue: 3,
          race: 'cyberse',
          types: ['effect', 'link'],
          atk: 2300,
          def: undefined,
          isExtraDeck: true,
        }),
      ],
    }));

    expect(prompt).toContain('青眼の白龍（光/ドラゴン族/Lv8/攻3000/守2500） [cardId:100]');
    expect(prompt).toContain('No.39 希望皇ホープ（エクシーズ/光/戦士族/R4/攻2500/守2000） [cardId:101]');
    expect(prompt).toContain('デコード・トーカー（リンク/闇/サイバース族/L3/攻2300） [cardId:102]');
    expect(prompt).not.toContain('×1 [cardId:100]');
  });

  it('型外値や空typesもcardHeaderのフォールバックどおり出力する [covers:card_header.monster_type_label_unknown_fallback] [covers:card_header.monster_type_label_empty_omitted] [covers:card_header.monster_attribute_race_map_or_raw] [covers:card_header.monster_atk_def_nullish_omitted]', () => {
    const prompt = buildSystemPrompt(sections({
      main: [
        monster({
          name: '未知タイプ',
          cardId: '110',
          attribute: 'customAttr' as MonsterCard['attribute'],
          race: 'customRace' as MonsterCard['race'],
          types: ['custom' as MonsterCard['types'][number]],
          atk: 0,
          def: '?',
        }),
        monster({
          name: 'タイプなし',
          cardId: '111',
          types: [],
          atk: undefined,
          def: undefined,
        }),
        { ...monster({ name: 'types undefined', cardId: '112' }), types: undefined } as unknown as CardInfo,
      ],
    }));

    expect(prompt).toContain('未知タイプ（custom/customAttr/customRace/Lv8/攻0/守?） [cardId:110]');
    expect(prompt).toContain('タイプなし（光/ドラゴン族/Lv8） [cardId:111]');
    expect(prompt).toContain('types undefined（光/ドラゴン族/Lv8/攻3000/守2500） [cardId:112]');
  });

  it('魔法・罠カードはeffectTypeの生値とkindでヘッダーを作る [covers:card_header.spell_kind_and_effect_type] [covers:card_header.trap_kind_and_effect_type] [covers:build_prompt.deck_summary_lists]', () => {
    const prompt = buildSystemPrompt(sections({
      main: [
        spell({ name: '速攻魔法', cardId: '201', effectType: 'quick' }),
        spell({ name: '通常魔法扱い', cardId: '202' }),
        trap({ name: 'カウンター罠', cardId: '301', effectType: 'counter' }),
        trap({ name: '通常罠扱い', cardId: '302' }),
      ],
    }));

    expect(prompt).toContain('速攻魔法（quick魔法） [cardId:201]');
    expect(prompt).toContain('通常魔法扱い（魔法） [cardId:202]');
    expect(prompt).toContain('カウンター罠（counter罠） [cardId:301]');
    expect(prompt).toContain('通常罠扱い（罠） [cardId:302]');
  });

  it('同名カードはnameで集約し最初のカード情報を使う [covers:summarize_cards.duplicates_grouped_by_name] [covers:format_card_entry.count_gt_one_suffix] [covers:build_prompt.deck_summary_lists]', () => {
    const prompt = buildSystemPrompt(sections({
      main: [
        monster({ name: '同名カード', cardId: 'first', atk: 1000 }),
        monster({ name: '同名カード', cardId: 'second', atk: 2000 }),
      ],
    }));

    expect(prompt).toContain('### メインデッキ（section="main", 2枚）');
    expect(prompt).toContain('同名カード（光/ドラゴン族/Lv8/攻1000/守2500）×2 [cardId:first]');
    expect(prompt).not.toContain('[cardId:second]');
    expect(prompt).not.toContain('攻2000');
  });

  it('異なる名前のカードは初出順に改行結合される [covers:summarize_cards.unique_entries_keep_insertion_order] [covers:build_prompt.deck_summary_lists]', () => {
    const prompt = buildSystemPrompt(sections({
      extra: [
        monster({ name: '先のカード', cardId: '401', isExtraDeck: true }),
        monster({ name: '後のカード', cardId: '402', isExtraDeck: true }),
      ],
    }));

    expect(prompt).toContain(
      '先のカード（光/ドラゴン族/Lv8/攻3000/守2500） [cardId:401]\n'
      + '後のカード（光/ドラゴン族/Lv8/攻3000/守2500） [cardId:402]',
    );
  });

  it('trash/searchResultsは出力せずfocusedCardは末尾に×1なしで追加する [covers:build_prompt.ignores_trash_and_search_results] [covers:build_prompt.focused_card_present] [covers:format_card_entry.count_le_one_no_suffix]', () => {
    const focused = spell({ name: 'フォーカスカード', cardId: '500' });
    const prompt = buildSystemPrompt(sections({
      trash: [monster({ name: '捨て札', cardId: 'trash' })],
      searchResults: [monster({ name: '検索結果', cardId: 'search' })],
    }), focused);

    expect(prompt).toContain('### メインデッキ（section="main", 0枚）\nなし');
    expect(prompt).not.toContain('捨て札');
    expect(prompt).not.toContain('検索結果');
    expect(prompt.endsWith('\n## 現在フォーカス中のカード\nフォーカスカード（魔法） [cardId:500]')).toBe(true);
    expect(prompt).not.toContain('フォーカスカード（魔法）×1 [cardId:500]');
  });
});
