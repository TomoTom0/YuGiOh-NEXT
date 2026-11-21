/**
 * components/practice/PracticeZoneRow のユニットテスト
 *
 * tests/design/practice-zone-row/conditions.toml（TASK-557 × TASK-331 Tier C第12号）の
 * 3条件をカバーする（1条件1it／row値1/2/3の列挙はfixture表でit.each集約）。
 * unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - PracticeZoneRowを直接mount（propsはrowのみ・slotはdefaultのみの表示専用ラッパー。
 *   store・feature flagに依存しないためprovider不要）
 * - 観測対象は描画結果（根源要素のclass構成・slot内容の出力位置）のみ。
 *   vm内部状態は直接参照しない
 * - 本コンポーネントは2026-11時点でsrc内のどこからもimportされていない（未使用）。
 *   配信経路の整備はTASK-558へ分離しており、本テストは単体mountで振る舞いを固定する
 */
import { describe, it, expect } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import PracticeZoneRow from '@/components/practice/PracticeZoneRow.vue';

/** row propの取り得る値（実装のリテラル型 1 | 2 | 3 と同一） */
const ROWS = [1, 2, 3] as const;

type Row = (typeof ROWS)[number];

function mountRow(row: Row, defaultSlot?: string): VueWrapper {
  return mount(PracticeZoneRow, {
    props: { row },
    ...(defaultSlot !== undefined ? { slots: { default: defaultSlot } } : {}),
  });
}

describe('components/practice/PracticeZoneRow', () => {
  // --- 根源要素の静的基底クラス ---

  it.each(ROWS)(
    '[covers:practice-zone-row.root-carries-static-base-classes] row=%s でも根源要素は静的基底クラス（ygo-next・practice-zone-row）を持つ',
    (row: Row) => {
      const wrapper = mountRow(row);

      // ygo-nextはスタイルスコープ規約（CLAUDE.md）由来のスコープクラス
      expect(wrapper.classes()).toContain('ygo-next');
      expect(wrapper.classes()).toContain('practice-zone-row');
    },
  );

  // --- row propに対応する row-N クラス ---

  it.each(ROWS)(
    '[covers:practice-zone-row.root-carries-row-n-class-matching-row-prop] row=%s のとき根源要素は row-%s のみを追加クラスに持つ',
    (row: Row) => {
      const wrapper = mountRow(row);

      expect(wrapper.classes()).toContain(`row-${row}`);

      // 他のrowクラスは付与しない（テンプレートリテラル row-${row} の排他）
      for (const other of ROWS) {
        if (other !== row) {
          expect(wrapper.classes()).not.toContain(`row-${other}`);
        }
      }
    },
  );

  // --- default slot の描画位置 ---

  it('[covers:practice-zone-row.default-slot-content-rendered-inside-root] default slotの内容は根源要素の内側に描画される', () => {
    const wrapper = mountRow(2, '<div class="slot-marker">スロット内容</div>');

    // 根源要素（= .practice-zone-row）の内側にslot内容が存在する
    const root = wrapper.find('.practice-zone-row');
    expect(root.exists()).toBe(true);
    expect(root.find('.slot-marker').exists()).toBe(true);
    expect(root.text()).toContain('スロット内容');

    // slot内容は根源要素の外（兄弟）には出力されない
    expect(wrapper.findAll('.slot-marker')).toHaveLength(1);
    expect(wrapper.element.tagName).toBe('DIV');
    expect(wrapper.element.children).toHaveLength(1);
  });
});
