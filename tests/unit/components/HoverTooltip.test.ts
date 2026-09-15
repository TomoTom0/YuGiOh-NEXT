/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import HoverTooltip from '@/components/HoverTooltip.vue';

describe('HoverTooltip.vue', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    // body の直接の子要素もクリーンアップ（Teleport による）
    document.body.querySelectorAll('.command-tooltip-fixed').forEach(el => {
      el.remove();
    });
  });

  it('[covers:hover-tooltip.initial-state-not-visible] 初期状態ではtooltipを表示しない', () => {
    mount(HoverTooltip, {
      props: { text: 'Reset' },
      slots: { default: '<button>btn</button>' },
      attachTo: container
    });

    expect(document.body.querySelector('.command-tooltip-fixed')).toBeNull();
  });

  it('[covers:hover-tooltip.mouseenter-shows-teleported-tooltip-with-text] mouseenterでtooltipを表示し、テキストを表示する', async () => {
    const wrapper = mount(HoverTooltip, {
      props: { text: 'save' },
      slots: { default: '<button>btn</button>' },
      attachTo: container
    });

    await wrapper.find('.btn-tooltip-wrapper').trigger('mouseenter');

    const tooltip = document.body.querySelector('.command-tooltip-fixed');
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent?.trim()).toBe('save');
  });

  it('[covers:hover-tooltip.mouseleave-hides-tooltip] mouseleaveでtooltipを非表示にする', async () => {
    const wrapper = mount(HoverTooltip, {
      props: { text: 'save' },
      slots: { default: '<button>btn</button>' },
      attachTo: container
    });

    await wrapper.find('.btn-tooltip-wrapper').trigger('mouseenter');
    expect(document.body.querySelector('.command-tooltip-fixed')).not.toBeNull();

    await wrapper.find('.btn-tooltip-wrapper').trigger('mouseleave');
    expect(document.body.querySelector('.command-tooltip-fixed')).toBeNull();
  });

  it('[covers:hover-tooltip.empty-text-keeps-tooltip-hidden] textが空の場合はhoverしてもtooltipを表示しない', async () => {
    const wrapper = mount(HoverTooltip, {
      props: { text: '' },
      slots: { default: '<button>btn</button>' },
      attachTo: container
    });

    await wrapper.find('.btn-tooltip-wrapper').trigger('mouseenter');

    expect(document.body.querySelector('.command-tooltip-fixed')).toBeNull();
  });

  it('[covers:hover-tooltip.tooltip-class-bound-to-tooltip-element] tooltipClassをtooltip要素に付与する', async () => {
    const wrapper = mount(HoverTooltip, {
      props: { text: 'Undo', tooltipClass: 'type-add' },
      slots: { default: '<button>btn</button>' },
      attachTo: container
    });

    await wrapper.find('.btn-tooltip-wrapper').trigger('mouseenter');

    const tooltip = document.body.querySelector('.command-tooltip-fixed');
    expect(tooltip?.classList.contains('type-add')).toBe(true);
  });

  it('[covers:hover-tooltip.default-slot-rendered] スロットの内容（ボタン等）を描画する', () => {
    const wrapper = mount(HoverTooltip, {
      props: { text: 'test' },
      slots: { default: '<button class="my-btn">click me</button>' },
      attachTo: container
    });

    expect(wrapper.find('.my-btn').exists()).toBe(true);
    expect(wrapper.find('.my-btn').text()).toBe('click me');
  });
});
