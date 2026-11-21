/**
 * components/practice/PracticeSlotControls のユニットテスト
 *
 * tests/design/practice-slot-controls/conditions.toml（TASK-561 × TASK-331 Tier C第15号）の
 * 10条件をカバーする。unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - PracticeSlotControlsを直接mount（store・composable非依存の表示専用）
 * - 観測対象は描画結果（ボタンの有無・title・disabled・svgパス）とemitのみ。
 *   quickActions computed等のvm内部は直接参照しない
 * - cards propはlengthのみ読まれるため、長さを制御した配列を渡す
 */
import { describe, it, expect } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import PracticeSlotControls from '@/components/practice/PracticeSlotControls.vue';
import type { ZoneType } from '@/stores/practice';
import { mdiCardPlus, mdiShuffle, mdiEye, mdiEyeOff, mdiDotsVertical } from '@mdi/js';

interface MountOptions {
  zone: ZoneType;
  length?: number;
  visible?: boolean;
  deckEmpty?: boolean;
  revealExtra?: boolean;
}

function mountControls(opts: MountOptions): VueWrapper {
  return mount(PracticeSlotControls, {
    props: {
      zone: opts.zone,
      cards: Array.from({ length: opts.length ?? 3 }),
      visible: opts.visible ?? true,
      ...(opts.deckEmpty !== undefined ? { deckEmpty: opts.deckEmpty } : {}),
      ...(opts.revealExtra !== undefined ? { revealExtra: opts.revealExtra } : {}),
    },
  });
}

function quickButtons(wrapper: VueWrapper) {
  return wrapper.findAll('button.quick-btn');
}

function buttonByTitle(wrapper: VueWrapper, title: string) {
  return quickButtons(wrapper).find((b) => b.attributes('title') === title);
}

function iconPath(button: ReturnType<typeof buttonByTitle>): string | undefined {
  return button?.find('svg path').attributes('d');
}

describe('components/practice/PracticeSlotControls', () => {
  // --- 表示可否 ---

  it('[covers:practice-slot-controls.renders-nothing-when-not-visible] visible=falseでは描画せず、trueへ更新すると描画する', async () => {
    const wrapper = mountControls({ zone: 'deck', visible: false });

    expect(wrapper.find('.practice-slot-controls').exists()).toBe(false);
    expect(wrapper.findAll('button')).toHaveLength(0);

    await wrapper.setProps({ visible: true });

    expect(wrapper.find('.practice-slot-controls').exists()).toBe(true);
  });

  // --- deckゾーンのクイックアクション ---

  it('[covers:practice-slot-controls.deck-zone-shows-draw-and-shuffle-actions] deckではDrawとShuffleをこの順で表示する', () => {
    const wrapper = mountControls({ zone: 'deck' });

    const buttons = quickButtons(wrapper);
    expect(buttons.map((b) => b.attributes('title'))).toEqual(['Draw', 'Shuffle']);
    expect(iconPath(buttons[0])).toBe(mdiCardPlus);
    expect(iconPath(buttons[1])).toBe(mdiShuffle);
  });

  it.each([
    { deckEmpty: true, expected: true },
    { deckEmpty: false, expected: false },
    { deckEmpty: undefined, expected: false },
  ])(
    '[covers:practice-slot-controls.draw-action-disabled-only-when-deck-empty] deckEmpty=$deckEmpty のときDrawのdisabledは$expected',
    ({ deckEmpty, expected }) => {
      const wrapper = mountControls({ zone: 'deck', deckEmpty });

      expect(buttonByTitle(wrapper, 'Draw')?.attributes('disabled')).toBe(
        expected ? '' : undefined,
      );
    },
  );

  it.each([
    { length: 0, expected: true },
    { length: 1, expected: true },
    { length: 2, expected: false },
  ])(
    '[covers:practice-slot-controls.shuffle-action-disabled-when-deck-has-at-most-one-card] cards.length=$length のときShuffleのdisabledは$expected',
    ({ length, expected }) => {
      const wrapper = mountControls({ zone: 'deck', length });

      expect(buttonByTitle(wrapper, 'Shuffle')?.attributes('disabled')).toBe(
        expected ? '' : undefined,
      );
    },
  );

  it('[covers:practice-slot-controls.deck-quick-action-clicks-emit-actions] DrawとShuffleのクリックがそれぞれactionをemitする', async () => {
    const wrapper = mountControls({ zone: 'deck', length: 3 });

    await buttonByTitle(wrapper, 'Draw')!.trigger('click');
    expect(wrapper.emitted('action')).toEqual([['draw']]);

    await buttonByTitle(wrapper, 'Shuffle')!.trigger('click');
    expect(wrapper.emitted('action')).toEqual([['draw'], ['shuffleDeck']]);
  });

  // --- extraゾーンの公開トグル ---

  it.each([
    { revealExtra: false, title: 'Reveal', icon: mdiEye },
    { revealExtra: true, title: 'Hide', icon: mdiEyeOff },
    { revealExtra: undefined, title: 'Reveal', icon: mdiEye },
  ])(
    '[covers:practice-slot-controls.extra-zone-reveal-toggle-reflects-reveal-extra] revealExtra=$revealExtra のときトグルは$titleになる',
    ({ revealExtra, title, icon }) => {
      const wrapper = mountControls({ zone: 'extra', revealExtra });

      const buttons = quickButtons(wrapper);
      expect(buttons).toHaveLength(1);
      expect(buttons[0]?.attributes('title')).toBe(title);
      expect(iconPath(buttons[0])).toBe(icon);
    },
  );

  it.each([
    { length: 0, expected: true },
    { length: 1, expected: false },
  ])(
    '[covers:practice-slot-controls.reveal-toggle-disabled-when-extra-empty] cards.length=$length のときトグルのdisabledは$expected',
    ({ length, expected }) => {
      const wrapper = mountControls({ zone: 'extra', length });

      expect(quickButtons(wrapper)[0]?.attributes('disabled')).toBe(expected ? '' : undefined);
    },
  );

  it('[covers:practice-slot-controls.reveal-toggle-click-emits-action] トグルのクリックがrevealExtraToggleをemitする', async () => {
    const wrapper = mountControls({ zone: 'extra', length: 2 });

    await quickButtons(wrapper)[0]!.trigger('click');

    expect(wrapper.emitted('action')).toEqual([['revealExtraToggle']]);
  });

  // --- 他ゾーン・メニューボタン ---

  it('[covers:practice-slot-controls.other-zones-show-no-quick-actions] deck/extra以外ではクイックアクションが無くメニューボタンのみ表示する', () => {
    const wrapper = mountControls({ zone: 'monster' });

    expect(quickButtons(wrapper)).toHaveLength(0);
    const menu = wrapper.find('button.menu-btn');
    expect(menu.exists()).toBe(true);
    expect(menu.attributes('title')).toBe('Menu');
    expect(menu.find('svg path').attributes('d')).toBe(mdiDotsVertical);
  });

  it('[covers:practice-slot-controls.menu-button-emits-open-menu] メニューボタンのクリックがopen-menuをemitする', async () => {
    const wrapper = mountControls({ zone: 'monster' });

    await wrapper.find('button.menu-btn').trigger('click');

    expect(wrapper.emitted('open-menu')).toEqual([[]]);
  });
});
