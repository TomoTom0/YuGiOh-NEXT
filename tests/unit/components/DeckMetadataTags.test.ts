/**
 * components/DeckMetadataTags のユニットテスト
 *
 * tests/design/deck-metadata-tags/conditions.toml（TASK-554 × TASK-331 Tier C第10号）の
 * 7条件をカバーする（1条件1it／同種入力の列挙はfixture表でit.each集約）。
 * unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - DeckMetadataTagsを直接mount（store非依存・propsのみの表示専用コンポーネント）
 * - tag-master-data（getMonsterTypeFromLabel）は実物を用いる（mockしない）
 * - タグID/ラベルは実マスタデータ（deck-metadata.jsonのdckTagMst由来）に合わせる。
 *   DeckMetadata/TagDialog条件書のfixtureと同一出典
 * - 観測対象は描画結果（チップ数・順序・クラス・テキスト・data-type）のみ
 */
import { describe, it, expect } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import DeckMetadataTags from '@/components/DeckMetadataTags.vue';

type TagsProps = {
  modelTags: string[];
  modelCategories: string[];
  tags: Record<string, string>;
  categories: { value: string; label: string }[];
};

/** 実マスタデータ相当のタグ（deck-metadata.jsonのdckTagMst由来） */
const TAGS: Record<string, string> = {
  '1': '闇',              // attrグループ（モンスタータイプ名を含まない）
  '8': 'リンク',           // typeグループ / link
  '9': 'ペンデュラム',     // typeグループ / pendulum
  '10': 'エクシーズ',      // typeグループ / xyz
  '11': 'シンクロ',        // typeグループ / synchro
  '17': '儀式',           // typeグループ / ritual
  '18': '融合',           // typeグループ / fusion
  '108': '公式紹介デッキ',  // othersグループ（モンスタータイプ名を含まない）
};

/** エクストラデッキ系モンスタータイプ6種（SCSSのdata-typeスタイル対象）のfixture表 */
const monsterTypeCases: Array<[string, string, string]> = [
  ['18', '融合', 'fusion'],
  ['11', 'シンクロ', 'synchro'],
  ['10', 'エクシーズ', 'xyz'],
  ['8', 'リンク', 'link'],
  ['17', '儀式', 'ritual'],
  ['9', 'ペンデュラム', 'pendulum'],
];

/** カテゴリマスタ（value='4'を先頭に登録。modelCategories側の並び順検証のため） */
const CATEGORIES: TagsProps['categories'] = [
  { value: '4', label: 'カオス' },
  { value: '517', label: 'ドラゴン' },
];

const DEFAULT_PROPS: TagsProps = {
  modelTags: [],
  modelCategories: [],
  tags: { ...TAGS },
  categories: CATEGORIES.map((c) => ({ ...c })),
};

describe('components/DeckMetadataTags', () => {
  function mountTags(props: Partial<TagsProps> = {}): VueWrapper {
    return mount(DeckMetadataTags, {
      props: { ...DEFAULT_PROPS, ...props },
    });
  }

  // --- タグチップ描画 ---

  it('[covers:deck-metadata-tags.tag-chips-render-in-model-order] modelTags順にタグチップを描画しカテゴリより前に置く', () => {
    const wrapper = mountTags({ modelTags: ['8', '18', '1'], modelCategories: ['4'] });

    const tagChips = wrapper.findAll('.tag-chip');
    expect(tagChips).toHaveLength(3);
    expect(tagChips.map((chip) => chip.text())).toEqual(['リンク', '融合', '闇']);
    for (const chip of tagChips) {
      expect(chip.classes()).toContain('chip');
    }

    // チップ全体はタグ→カテゴリの順
    const allChips = wrapper.findAll('.chip');
    expect(allChips).toHaveLength(4);
    expect(allChips.slice(0, 3).every((chip) => chip.classes().includes('tag-chip'))).toBe(true);
    expect(allChips[3].classes()).toContain('category-chip');
  });

  // --- タグチップのdata-type導出 ---

  it.each(monsterTypeCases)(
    '[covers:deck-metadata-tags.tag-chip-data-type-monster-type-labels] タグID %s（%s）のdata-typeは %s',
    (tagId, label, expectedType) => {
      const wrapper = mountTags({ modelTags: [tagId] });

      const chip = wrapper.find('.tag-chip');
      expect(chip.exists()).toBe(true);
      expect(chip.text()).toBe(label);
      expect(chip.attributes('data-type')).toBe(expectedType);
    },
  );

  it('[covers:deck-metadata-tags.tag-chip-data-type-empty-when-tag-id-missing] tagsに無いtagIdは空テキスト・空data-type', () => {
    const wrapper = mountTags({ modelTags: ['999'] });

    const chips = wrapper.findAll('.tag-chip');
    expect(chips).toHaveLength(1);
    expect(chips[0].text()).toBe('');
    expect(chips[0].attributes('data-type')).toBe('');
  });

  it('[covers:deck-metadata-tags.tag-chip-data-type-empty-when-label-has-no-monster-type] タイプ名を含まないラベルはdata-type空文字', () => {
    const wrapper = mountTags({ modelTags: ['1', '108'] });

    const chips = wrapper.findAll('.tag-chip');
    expect(chips.map((chip) => chip.text())).toEqual(['闇', '公式紹介デッキ']);
    expect(chips[0].attributes('data-type')).toBe('');
    expect(chips[1].attributes('data-type')).toBe('');
  });

  // --- カテゴリチップ描画 ---

  it('[covers:deck-metadata-tags.category-chips-render-in-model-order] modelCategories順にカテゴリチップを描画', () => {
    const wrapper = mountTags({ modelCategories: ['517', '4'] });

    const catChips = wrapper.findAll('.category-chip');
    expect(catChips).toHaveLength(2);
    // categoriesの登録順（4が先頭）ではなくmodelCategories順（517→4）
    expect(catChips.map((chip) => chip.text())).toEqual(['ドラゴン', 'カオス']);
    for (const chip of catChips) {
      expect(chip.classes()).toContain('chip');
    }
    expect(wrapper.findAll('.tag-chip')).toHaveLength(0);
  });

  it('[covers:deck-metadata-tags.category-chip-label-falls-back-to-cat-id] categoriesに無いcatIdはcatId自身を表示', () => {
    const wrapper = mountTags({ modelCategories: ['999'] });

    const chips = wrapper.findAll('.category-chip');
    expect(chips).toHaveLength(1);
    expect(chips[0].text()).toBe('999');
  });

  // --- 空モデル ---

  it('[covers:deck-metadata-tags.empty-models-render-no-chips] 空モデルはチップを描画しない', () => {
    const empty = mountTags();
    expect(empty.find('.chips-container').exists()).toBe(true);
    expect(empty.findAll('.chip')).toHaveLength(0);
    expect(empty.findAll('.tag-chip')).toHaveLength(0);
    expect(empty.findAll('.category-chip')).toHaveLength(0);

    // 片方だけ空の場合は空側のチップ種別のみ0件
    const tagsOnlyEmpty = mountTags({ modelCategories: ['4'] });
    expect(tagsOnlyEmpty.findAll('.tag-chip')).toHaveLength(0);
    expect(tagsOnlyEmpty.findAll('.category-chip')).toHaveLength(1);
  });
});
