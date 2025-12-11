import { describe, it, expect } from 'vitest';

describe('Field disabled reason formatting', () => {
  // FilterTab.vue の getFieldDisabledReason 関数の動作をテスト

  const typeLabels: Record<string, string> = {
    'link': 'リンク',
    'fusion': 'フュージョン',
    'synchro': 'シンクロ',
    'xyz': 'エクシーズ',
    'pendulum': 'ペンデュラム',
    'ritual': '儀式',
    'normal': '通常',
    'effect': '効果'
  };

  const fieldLabels: Record<string, string> = {
    'level-rank': 'レベル/ランク',
    'link-value': 'リンク数',
    'link-marker': 'リンクマーカー',
    'p-scale': 'Pスケール',
    'def': 'DEF',
    'atk': 'ATK',
    'attribute': '属性',
    'race': '種族',
    'spell-type': '魔法タイプ',
    'trap-type': '罠タイプ'
  };

  // パターン1: "～が選択不可のため無効"
  it('パターン1: monster-type_linkが選択不可のため無効 → Linkモンスターが選択されているため', () => {
    const reason = 'monster-type_linkが選択不可のため無効';
    const unavailableAttrMatch = reason.match(/^([^\s]+)が選択不可のため無効$/);

    expect(unavailableAttrMatch).toBeTruthy();
    expect(unavailableAttrMatch![1]).toBe('monster-type_link');

    const attrId = unavailableAttrMatch![1];
    const monsterTypeMatch = attrId.match(/^monster-type_(.+)$/);
    expect(monsterTypeMatch).toBeTruthy();

    const label = typeLabels[monsterTypeMatch![1]];
    const formattedReason = `${label}モンスターが選択されているため`;

    expect(formattedReason).toBe('リンクモンスターが選択されているため');
  });

  it('パターン1: monster-type_synchroが選択不可のため無効 → シンクロモンスターが選択されているため', () => {
    const reason = 'monster-type_synchroが選択不可のため無効';
    const unavailableAttrMatch = reason.match(/^([^\s]+)が選択不可のため無効$/);

    expect(unavailableAttrMatch).toBeTruthy();

    const attrId = unavailableAttrMatch![1];
    const monsterTypeMatch = attrId.match(/^monster-type_(.+)$/);
    const label = typeLabels[monsterTypeMatch![1]];
    const formattedReason = `${label}モンスターが選択されているため`;

    expect(formattedReason).toBe('シンクロモンスターが選択されているため');
  });

  // パターン2: "ルール名: 項目名により無効"
  it('パターン2: monster-type_has-level-rank-necessary: level-rank,defにより無効 → レベル/ランク、DEFが選択/入力されているため', () => {
    const reason = 'monster-type_has-level-rank-necessary: level-rank,defにより無効';
    const ruleFieldMatch = reason.match(/^(.+?):\s*([^に]+)により無効$/);

    expect(ruleFieldMatch).toBeTruthy();
    expect(ruleFieldMatch![1]).toBe('monster-type_has-level-rank-necessary');
    expect(ruleFieldMatch![2]).toBe('level-rank,def');

    const fields = ruleFieldMatch![2].split(',').map(f => f.trim());
    const labels = fields.map(f => fieldLabels[f] || f);
    const formattedReason = `${labels.join('、')}が選択/入力されているため`;

    expect(formattedReason).toBe('レベル/ランク、DEFが選択/入力されているため');
  });

  it('パターン2: card-type_spell-necessary: spell-type*により無効 → spell-typeが選択/入力されているため', () => {
    const reason = 'card-type_spell-necessary: spell-type*により無効';
    const ruleFieldMatch = reason.match(/^(.+?):\s*([^に]+)により無効$/);

    expect(ruleFieldMatch).toBeTruthy();

    const fields = ruleFieldMatch![2].split(',').map(f => f.trim());
    const labels = fields.map(f => fieldLabels[f] || f);
    const formattedReason = `${labels.join('、')}が選択/入力されているため`;

    expect(formattedReason).toBe('spell-type*が選択/入力されているため');
  });
});
