/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import HoverTooltip from '../HoverTooltip.vue';

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

  it('初期状態ではtooltipを表示しない', () => {
    mount(HoverTooltip, {
      props: { text: 'Reset' },
      slots: { default: '<button>btn</button>' },
      attachTo: container
    });

    expect(document.body.querySelector('.command-tooltip-fixed')).toBeNull();
  });

  it('mouseenterでtooltipを表示し、テキストを表示する', async () => {
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

  it('mouseleaveでtooltipを非表示にする', async () => {
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

  it('textが空の場合はhoverしてもtooltipを表示しない', async () => {
    const wrapper = mount(HoverTooltip, {
      props: { text: '' },
      slots: { default: '<button>btn</button>' },
      attachTo: container
    });

    await wrapper.find('.btn-tooltip-wrapper').trigger('mouseenter');

    expect(document.body.querySelector('.command-tooltip-fixed')).toBeNull();
  });

  it('tooltipClassをtooltip要素に付与する', async () => {
    const wrapper = mount(HoverTooltip, {
      props: { text: 'Undo', tooltipClass: 'type-add' },
      slots: { default: '<button>btn</button>' },
      attachTo: container
    });

    await wrapper.find('.btn-tooltip-wrapper').trigger('mouseenter');

    const tooltip = document.body.querySelector('.command-tooltip-fixed');
    expect(tooltip?.classList.contains('type-add')).toBe(true);
  });

  it('スロットの内容（ボタン等）を描画する', () => {
    const wrapper = mount(HoverTooltip, {
      props: { text: 'test' },
      slots: { default: '<button class="my-btn">click me</button>' },
      attachTo: container
    });

    expect(wrapper.find('.my-btn').exists()).toBe(true);
    expect(wrapper.find('.my-btn').text()).toBe('click me');
  });
});
