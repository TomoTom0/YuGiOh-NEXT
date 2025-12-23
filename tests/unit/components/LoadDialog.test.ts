/**
 * ユニットテスト: LoadDialog.vue
 *
 * テスト対象機能:
 * 1. Props と emit の検証
 * 2. Methods の動作確認
 * 3. Computed properties の計算結果確認
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import LoadDialog from '@/components/LoadDialog.vue';

describe('LoadDialog.vue - ユニットテスト', () => {
  let wrapper: any;

  beforeEach(() => {
    // localStorage のモック化
    const store_data: Record<string, string> = {};
    const localStorageMock = {
      getItem: vi.fn((key: string) => store_data[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store_data[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store_data[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store_data).forEach(key => delete store_data[key]);
      }),
    };
    global.localStorage = localStorageMock as any;
  });

  describe('Props検証', () => {
    it('should accept isVisible prop', () => {
      wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      });

      expect(wrapper.props('isVisible')).toBe(true);
    });

    it('should render with isVisible false', () => {
      wrapper = mount(LoadDialog, {
        props: {
          isVisible: false,
        },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      });

      expect(wrapper.props('isVisible')).toBe(false);
    });
  });

  describe('Methods - getDeckNameClass', () => {
    beforeEach(() => {
      wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      });
    });

    it('should return deck-name-lg for short names', () => {
      // 10文字以下
      const shortName = 'デッキA';
      expect(wrapper.vm.getDeckNameClass(shortName)).toBe('deck-name-lg');
    });

    it('should return deck-name-md for medium names', () => {
      // 11-15文字 (length > 10 && length <= 15)
      const mediumName = 'テストデッキ12345';  // 11文字
      expect(wrapper.vm.getDeckNameClass(mediumName)).toBe('deck-name-md');
    });

    it('should return deck-name-sm for long names', () => {
      // 16-20文字 (length > 15 && length <= 20)
      const longName = 'テストデッキ1234567890123';  // 18文字
      expect(wrapper.vm.getDeckNameClass(longName)).toBe('deck-name-sm');
    });

    it('should return deck-name-xs for very long names', () => {
      // 21文字以上 (length > 20)
      const veryLongName = 'テストデッキ123456789012345678';  // 22文字
      expect(wrapper.vm.getDeckNameClass(veryLongName)).toBe('deck-name-xs');
    });
  });

  describe('Methods - close', () => {
    beforeEach(() => {
      wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      });
    });

    it('should emit close event', async () => {
      wrapper.vm.close();
      expect(wrapper.emitted('close')).toBeTruthy();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  describe('Constants and default values', () => {
    beforeEach(() => {
      wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      });
    });

    it('should have currentPage initialized to 0', () => {
      expect(wrapper.vm.currentPage).toBe(0);
    });

    it('should have ref for dialog body', () => {
      expect(wrapper.vm.dialogBodyRef).toBeDefined();
    });
  });

  describe('Computed properties', () => {
    beforeEach(() => {
      wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      });
    });

    it('should have paginatedDeckList computed', () => {
      expect(wrapper.vm.paginatedDeckList).toBeDefined();
      expect(Array.isArray(wrapper.vm.paginatedDeckList)).toBe(true);
    });

    it('should have totalPages computed', () => {
      expect(wrapper.vm.totalPages).toBeDefined();
      expect(typeof wrapper.vm.totalPages).toBe('number');
    });
  });

  describe('Emits', () => {
    beforeEach(() => {
      wrapper = mount(LoadDialog, {
        props: {
          isVisible: true,
        },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      });
    });

    it('should define close emit', () => {
      const emits = wrapper.vm.$options.emits;
      expect(emits).toContain('close');
    });

    it('should define deckLoaded emit', () => {
      const emits = wrapper.vm.$options.emits;
      expect(emits).toContain('deckLoaded');
    });
  });
});
