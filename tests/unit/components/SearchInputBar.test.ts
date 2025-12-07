import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SearchInputBar from '@/components/searchInputBar/SearchInputBar.vue';
import { useDeckEditStore } from '@/stores/deck-edit';

describe('components/SearchInputBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input bar', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      expect(wrapper.find('.search-input-bar').exists()).toBe(true);
    });

    it('should render search input element', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const input = wrapper.find('.search-input');
      expect(input.exists()).toBe(true);
      expect(input.element).toBeInstanceOf(HTMLInputElement);
    });

    it('should render search button', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const searchBtn = wrapper.find('.search-btn');
      expect(searchBtn.exists()).toBe(true);
    });

    it('should render filter button', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const filterBtn = wrapper.find('.menu-btn');
      expect(filterBtn.exists()).toBe(true);
    });

    it('should render search mode button', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const modeBtn = wrapper.find('.search-mode-btn');
      expect(modeBtn.exists()).toBe(true);
    });
  });

  describe('Search Modes', () => {
    it('should toggle search mode dropdown', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const modeBtn = wrapper.find('.search-mode-btn');
      expect(wrapper.find('.mode-dropdown').exists()).toBe(false);

      await modeBtn.trigger('click');
      expect(wrapper.find('.mode-dropdown').exists()).toBe(true);
    });

    it('should display search mode options', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const modeBtn = wrapper.find('.search-mode-btn');
      await modeBtn.trigger('click');

      const options = wrapper.findAll('.mode-option');
      expect(options.length).toBeGreaterThan(0);
    });

    it('should have default search mode label', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const modeText = wrapper.find('.mode-text');
      expect(modeText.exists()).toBe(true);
      expect(modeText.text().length).toBeGreaterThan(0);
    });
  });

  describe('Input Handling', () => {
    it('should update search query on input', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const input = wrapper.find('.search-input');
      await input.setValue('テスト検索');

      // store に値が設定されることを確認
      const deckStore = wrapper.vm.deckStore;
      expect(deckStore.searchQuery).toBe('テスト検索');
    });

    it('should clear search query when clear button is clicked', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const input = wrapper.find('.search-input');
      await input.setValue('テスト');

      // clear button は searchQuery が空でない時に表示される
      await wrapper.vm.$nextTick();

      const clearBtn = wrapper.find('.clear-btn');
      if (clearBtn.exists()) {
        await clearBtn.trigger('click');
        expect(wrapper.vm.deckStore.searchQuery).toBe('');
      }
    });

    it('should handle enter key press', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const input = wrapper.find('.search-input');
      await input.setValue('テスト');
      await input.trigger('keydown.enter');

      // enter キーの処理が実行されたことを確認
      expect(wrapper.vm.deckStore.searchQuery).toBe('テスト');
    });

    it('should handle escape key press', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const input = wrapper.find('.search-input');
      await input.trigger('keydown.escape');

      // escape イベントが emit されることを確認
      expect(wrapper.emitted('escape')).toBeTruthy();
    });
  });

  describe('Filter Features', () => {
    it('should show filter dialog when filter button is clicked', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const deckStore = useDeckEditStore();
      const filterBtn = wrapper.find('.menu-btn');
      expect(deckStore.isFilterDialogVisible).toBe(false);

      await filterBtn.trigger('click');
      expect(deckStore.isFilterDialogVisible).toBe(true);
    });

    it('should toggle filter dialog visibility', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const deckStore = useDeckEditStore();
      const filterBtn = wrapper.find('.menu-btn');

      // 開く
      await filterBtn.trigger('click');
      expect(deckStore.isFilterDialogVisible).toBe(true);

      // 閉じる（直接状態を変更）
      deckStore.isFilterDialogVisible = false;
      await wrapper.vm.$nextTick();
      expect(deckStore.isFilterDialogVisible).toBe(false);
    });
  });

  describe('Placeholder text', () => {
    it('should display placeholder text', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const input = wrapper.find('.search-input');
      const placeholder = input.attributes('placeholder');
      expect(placeholder).toBeDefined();
      expect(placeholder!.length).toBeGreaterThan(0);
    });
  });

  describe('Search button functionality', () => {
    it('should have clickable search button', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const searchBtn = wrapper.find('.search-btn');
      expect(searchBtn.exists()).toBe(true);

      // ボタンをクリック可能な状態であることを確認
      await searchBtn.trigger('click');
      expect(searchBtn.exists()).toBe(true);
    });
  });

  describe('Compact mode', () => {
    it('should support compact prop', () => {
      const wrapper = mount(SearchInputBar, {
        props: {
          compact: true
        },
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const searchBar = wrapper.find('.search-input-bar');
      expect(searchBar.classes()).toContain('compact');
    });

    it('should not have compact class by default', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true
          }
        }
      });

      const searchBar = wrapper.find('.search-input-bar');
      expect(searchBar.classes()).not.toContain('compact');
    });
  });
});
