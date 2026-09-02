import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DeckMetadataHeader from '../../../src/components/DeckMetadataHeader.vue';
import { useDeckEditStore } from '../../../src/stores/deck-edit';

describe('DeckMetadataHeader.vue - auto-rename/auto-category (TASK-442)', () => {
  let pinia: ReturnType<typeof createPinia>;
  let store: ReturnType<typeof useDeckEditStore>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    store = useDeckEditStore();
  });

  function mountHeader() {
    return mount(DeckMetadataHeader, {
      props: {
        isPublic: false,
        deckType: '-1',
        deckStyle: '-1',
      },
      global: {
        plugins: [pinia],
      },
    });
  }

  async function openMetadataMenu(wrapper: ReturnType<typeof mountHeader>) {
    await wrapper.find('.metadata-menu-button').trigger('click');
  }

  it('auto-renameボタン押下でstore.autoRenameDeck()を呼び、成功時は成功トーストを出してメニューを閉じる', async () => {
    vi.spyOn(store, 'autoRenameDeck').mockReturnValue({ categories: ['cat1'], renamed: true });

    const wrapper = mountHeader();
    await openMetadataMenu(wrapper);
    expect(wrapper.find('.metadata-menu-dropdown').exists()).toBe(true);

    const buttons = wrapper.findAll('.auto-action-btn');
    const renameBtn = buttons.find(b => b.text() === 'auto-rename');
    expect(renameBtn).toBeDefined();
    await renameBtn!.trigger('click');

    expect(store.autoRenameDeck).toHaveBeenCalledTimes(1);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.metadata-menu-dropdown').exists()).toBe(false);
  });

  it('auto-renameでrenamed:falseの場合はエラー扱いでもメニューを閉じる', async () => {
    vi.spyOn(store, 'autoRenameDeck').mockReturnValue({ categories: [], renamed: false });

    const wrapper = mountHeader();
    await openMetadataMenu(wrapper);
    const renameBtn = wrapper.findAll('.auto-action-btn').find(b => b.text() === 'auto-rename');
    await renameBtn!.trigger('click');

    expect(store.autoRenameDeck).toHaveBeenCalledTimes(1);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.metadata-menu-dropdown').exists()).toBe(false);
  });

  it('auto-categoryボタン押下でstore.autoSetCategory()を呼びメニューを閉じる', async () => {
    vi.spyOn(store, 'autoSetCategory').mockReturnValue(['cat1', 'cat2']);

    const wrapper = mountHeader();
    await openMetadataMenu(wrapper);
    const categoryBtn = wrapper.findAll('.auto-action-btn').find(b => b.text() === 'auto-category');
    expect(categoryBtn).toBeDefined();
    await categoryBtn!.trigger('click');

    expect(store.autoSetCategory).toHaveBeenCalledTimes(1);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.metadata-menu-dropdown').exists()).toBe(false);
  });

  it('auto-categoryで該当カテゴリが0件でもエラーにならずメニューを閉じる', async () => {
    vi.spyOn(store, 'autoSetCategory').mockReturnValue([]);

    const wrapper = mountHeader();
    await openMetadataMenu(wrapper);
    const categoryBtn = wrapper.findAll('.auto-action-btn').find(b => b.text() === 'auto-category');
    await categoryBtn!.trigger('click');

    expect(store.autoSetCategory).toHaveBeenCalledTimes(1);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.metadata-menu-dropdown').exists()).toBe(false);
  });
});
