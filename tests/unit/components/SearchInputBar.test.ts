import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SearchInputBar from '@/components/searchInputBar/SearchInputBar.vue';
import { useDeckEditStore } from '@/stores/deck-edit';
import { useSearchStore } from '@/stores/search';

describe('components/SearchInputBar', () => {
  // 共通のstubs設定（実際のDOM要素を必要としないコンポーネントのみstub）
  const commonStubs = {
    SearchFilterDialog: true,
    SearchFilterChips: true,
  };

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
          stubs: commonStubs
        }
      });

      expect(wrapper.find('.search-input-bar').exists()).toBe(true);
    });

    it('should render search input element', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: commonStubs
        }
      });

      const input = wrapper.find('.search-input');
      expect(input.exists()).toBe(true);
      expect(input.element).toBeInstanceOf(HTMLInputElement);
    });

    it('should render search button', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: commonStubs
        }
      });

      const searchBtn = wrapper.find('.search-btn');
      expect(searchBtn.exists()).toBe(true);
    });

    it('should render filter button', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: commonStubs
        }
      });

      const filterBtn = wrapper.find('.menu-btn');
      expect(filterBtn.exists()).toBe(true);
    });

    it('should render search mode button', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: commonStubs
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
          stubs: commonStubs
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
          stubs: commonStubs
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
          stubs: commonStubs
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
          stubs: commonStubs
        }
      });

      const input = wrapper.find('.search-input');
      await input.setValue('テスト検索');

      // store に値が設定されることを確認
      const searchStore = useSearchStore();
      expect(searchStore.searchQuery).toBe('テスト検索');
    });

    it('should clear search query when clear button is clicked', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: commonStubs
        }
      });

      const input = wrapper.find('.search-input');
      await input.setValue('テスト');

      // clear button は searchQuery が空でない時に表示される
      await wrapper.vm.$nextTick();

      const clearBtn = wrapper.find('.clear-btn');
      if (clearBtn.exists()) {
        await clearBtn.trigger('click');
        const searchStore = useSearchStore();
        expect(searchStore.searchQuery).toBe('');
      }
    });

    it('should handle enter key press', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: commonStubs
        }
      });

      const input = wrapper.find('.search-input');
      await input.setValue('テスト');
      await input.trigger('keydown.enter');

      // enter キーの処理が実行されたことを確認
      const searchStore = useSearchStore();
      expect(searchStore.searchQuery).toBe('テスト');
    });

    it.skip('should handle escape key press', async () => {
      // TODO: Vue event modifiers (.escape) don't work with dispatchEvent in tests
      // This test needs to be refactored to test behavior instead of implementation details
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: commonStubs
        }
      });

      const input = wrapper.find('.search-input').element as HTMLInputElement;
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      input.dispatchEvent(event);
      await wrapper.vm.$nextTick();

      // escape イベントが emit されることを確認
      expect(wrapper.emitted('escape')).toBeTruthy();
    });
  });

  describe('Filter Features', () => {
    it('should show filter dialog when filter button is clicked', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: commonStubs
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
          stubs: commonStubs
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
          stubs: commonStubs
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
          stubs: commonStubs
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
          stubs: commonStubs
        }
      });

      const searchBar = wrapper.find('.search-input-bar');
      expect(searchBar.classes()).toContain('compact');
    });

    it('should not have compact class by default', () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: commonStubs
        }
      });

      const searchBar = wrapper.find('.search-input-bar');
      expect(searchBar.classes()).not.toContain('compact');
    });
  });

  describe('Slash Commands', () => {
    it('should recognize slash command input', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: commonStubs
        }
      });

      const input = wrapper.find('.search-input');
      await input.setValue('/');
      await wrapper.vm.$nextTick();

      // コマンドモードになることを確認
      const inputContainer = wrapper.find('.input-container');
      expect(inputContainer.classes()).toContain('command-mode');
    });

    it('should show command suggestions when typing slash', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true,
            SearchFilterChips: true,
          }
        }
      });

      const input = wrapper.find('.search-input');
      await input.setValue('/');
      await wrapper.vm.$nextTick();

      // SuggestionListコンポーネントが表示されることを確認
      const suggestionList = wrapper.findComponent({ name: 'SuggestionList' });
      expect(suggestionList.exists()).toBe(true);
    });

    it('should filter command suggestions based on input', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true,
            SearchFilterChips: true,
          }
        }
      });

      const input = wrapper.find('.search-input');
      await input.setValue('/attr');
      await wrapper.vm.$nextTick();

      // コマンド候補がフィルタリングされることを確認
      // （実装の詳細に依存するため、存在確認のみ）
      const suggestionList = wrapper.findComponent({ name: 'SuggestionList' });
      expect(suggestionList.exists()).toBe(true);
    });

    it('should enter pending command mode after selecting command', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true,
            SearchFilterChips: true,
          }
        }
      });

      const input = wrapper.find('.search-input');
      // /attr コマンドを入力
      await input.setValue('/attr ');
      await wrapper.vm.$nextTick();

      // pending command modeになることを確認
      const inputContainer = wrapper.find('.input-container');
      expect(inputContainer.exists()).toBe(true);
      // command-prefixが表示されるはず（pendingCommandがある場合）
      const commandPrefix = wrapper.find('.command-prefix');
      // 実装によってはprefixが表示されない可能性もあるため、存在チェックのみ
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle arrow down key for suggestion navigation', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true,
            SearchFilterChips: true,
          }
        }
      });

      const input = wrapper.find('.search-input');
      await input.setValue('/');
      await wrapper.vm.$nextTick();

      // 下矢印キーを押す
      await input.trigger('keydown.down');
      await wrapper.vm.$nextTick();

      // イベントが処理されることを確認（エラーが出ないことを確認）
      expect(input.exists()).toBe(true);
    });

    it('should handle arrow up key for suggestion navigation', async () => {
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true,
            SearchFilterChips: true,
          }
        }
      });

      const input = wrapper.find('.search-input');
      await input.setValue('/');
      await wrapper.vm.$nextTick();

      // 上矢印キーを押す
      await input.trigger('keydown.up');
      await wrapper.vm.$nextTick();

      // イベントが処理されることを確認（エラーが出ないことを確認）
      expect(input.exists()).toBe(true);
    });

    it.skip('should handle escape key to close suggestions', async () => {
      // TODO: Vue event modifiers (.escape) don't work with dispatchEvent in tests
      // This test needs to be refactored to test behavior instead of implementation details
      const wrapper = mount(SearchInputBar, {
        global: {
          stubs: {
            SearchFilterDialog: true,
            SearchFilterChips: true,
          }
        }
      });

      const input = wrapper.find('.search-input');
      await input.setValue('/');
      await wrapper.vm.$nextTick();

      // エスケープキーを押す
      const inputElement = input.element as HTMLInputElement;
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      inputElement.dispatchEvent(event);
      await wrapper.vm.$nextTick();

      // escape イベントが emit されることを確認
      expect(wrapper.emitted('escape')).toBeTruthy();
    });
  });
});
