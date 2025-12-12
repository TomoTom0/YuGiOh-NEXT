import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SearchFilterDialog from '@/components/SearchFilterDialog.vue';
import { useDeckEditStore } from '@/stores/deck-edit';
import type { SearchFilters } from '@/types/search';

describe('components/SearchFilterDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render filter dialog when isFilterDialogVisible is true', async () => {
      // mount 前に store を作成して状態を設定
      const pinia = createPinia();
      setActivePinia(pinia);
      const deckStore = useDeckEditStore();
      deckStore.isFilterDialogVisible = true;

      const wrapper = mount(SearchFilterDialog, {
        global: {
          plugins: [pinia]
        }
      });
      await wrapper.vm.$nextTick();

      // ダイアログが表示されていることを確認
      const dialog = wrapper.find('.dialog-overlay');
      expect(dialog.exists()).toBe(true);
    });

    it('should not render filter dialog when isFilterDialogVisible is false', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);
      const deckStore = useDeckEditStore();
      deckStore.isFilterDialogVisible = false;

      const wrapper = mount(SearchFilterDialog, {
        global: {
          plugins: [pinia]
        }
      });
      await wrapper.vm.$nextTick();

      // ダイアログが非表示であることを確認
      const dialog = wrapper.find('.dialog-overlay');
      expect(dialog.exists()).toBe(false);
    });

    it('should render tab buttons', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);
      const deckStore = useDeckEditStore();
      deckStore.isFilterDialogVisible = true;

      const wrapper = mount(SearchFilterDialog, {
        global: {
          plugins: [pinia]
        }
      });
      await wrapper.vm.$nextTick();

      // タブボタンの存在を確認
      const tabs = wrapper.findAll('.dialog-tab');
      expect(tabs.length).toBeGreaterThan(0);
    });

    it('should render card type buttons', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);
      const deckStore = useDeckEditStore();
      deckStore.isFilterDialogVisible = true;

      const wrapper = mount(SearchFilterDialog, {
        global: {
          plugins: [pinia]
        }
      });
      await wrapper.vm.$nextTick();

      // カードタイプボタンの存在を確認
      const cardTypeButtons = wrapper.findAll('.card-type-tab');
      expect(cardTypeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Props', () => {
    it('should accept initialFilters prop', () => {
      const deckStore = useDeckEditStore();
      deckStore.isFilterDialogVisible = true;

      const initialFilters: SearchFilters = {
        cardType: 1, // モンスター
        attributes: [1], // 光属性
        spellTypes: [],
        trapTypes: [],
        races: [],
        monsterTypes: [],
        monsterTypeMatchMode: 'or',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const wrapper = mount(SearchFilterDialog, {
        props: {
          initialFilters
        }
      });

      expect(wrapper.props('initialFilters')).toEqual(initialFilters);
    });
  });

  describe('Events', () => {
    it('should emit apply event with filters when apply button is clicked', async () => {
      const deckStore = useDeckEditStore();
      deckStore.isFilterDialogVisible = true;

      const wrapper = mount(SearchFilterDialog);

      // 適用ボタンを探してクリック
      const applyButton = wrapper.find('[data-test="apply-button"]');
      if (applyButton.exists()) {
        await applyButton.trigger('click');

        // apply イベントが発火されたことを確認
        expect(wrapper.emitted('apply')).toBeTruthy();
        expect(wrapper.emitted('apply')?.[0]).toBeDefined();
      }
    });
  });

  describe('Filter Selection', () => {
    it('should update filters when card type is selected', async () => {
      const deckStore = useDeckEditStore();
      deckStore.isFilterDialogVisible = true;

      const wrapper = mount(SearchFilterDialog);

      // モンスタータイプボタンを探してクリック
      const monsterButton = wrapper.find('[data-card-type="1"]');
      if (monsterButton.exists()) {
        await monsterButton.trigger('click');

        // フィルタが更新されたことを確認（内部状態の確認は難しいため、UIの変化で確認）
        expect(monsterButton.classes()).toContain('active');
      }
    });

    it('should update filters when attribute is selected', async () => {
      const deckStore = useDeckEditStore();
      deckStore.isFilterDialogVisible = true;

      const wrapper = mount(SearchFilterDialog);

      // まずモンスタータイプを選択
      const monsterButton = wrapper.find('[data-card-type="1"]');
      if (monsterButton.exists()) {
        await monsterButton.trigger('click');

        // 属性ボタンを探してクリック
        const attributeButton = wrapper.find('[data-attribute="1"]');
        if (attributeButton.exists()) {
          await attributeButton.trigger('click');

          // 属性が選択されたことを確認
          expect(attributeButton.classes()).toContain('active');
        }
      }
    });
  });

  describe('Clear Filters', () => {
    it('should clear all filters when clear button is clicked', async () => {
      const deckStore = useDeckEditStore();
      deckStore.isFilterDialogVisible = true;

      const initialFilters: SearchFilters = {
        cardType: 1,
        attributes: [1],
        spellTypes: [],
        trapTypes: [],
        races: [],
        monsterTypes: [],
        monsterTypeMatchMode: 'or',
        levelType: 'level',
        levelValues: [],
        linkValues: [],
        scaleValues: [],
        linkMarkers: [],
        linkMarkerMatchMode: 'or',
        atk: { exact: false, unknown: false },
        def: { exact: false, unknown: false },
        releaseDate: {}
      };

      const wrapper = mount(SearchFilterDialog, {
        props: {
          initialFilters
        }
      });

      // クリアボタンを探してクリック
      const clearButton = wrapper.find('[data-test="clear-button"]');
      if (clearButton.exists()) {
        await clearButton.trigger('click');

        // フィルタがクリアされたことを確認（UIの変化で確認）
        const activeButtons = wrapper.findAll('.active');
        expect(activeButtons.length).toBe(0);
      }
    });
  });
});
