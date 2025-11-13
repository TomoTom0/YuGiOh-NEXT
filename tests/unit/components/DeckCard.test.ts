import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DeckCard from '../../../src/components/DeckCard.vue';
import { useDeckEditStore } from '../../../src/stores/deck-edit';

// Chrome APIのモック
global.chrome = {
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://mock/${path}`),
  },
} as any;

describe('DeckCard.vue', () => {
  let pinia: any;
  let store: any;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    store = useDeckEditStore();
  });

  const mockCard = {
    cardId: '4011',
    ciid: '1',
    name: 'ブラック・マジシャン',
    cardType: 'monster',
    attribute: 'dark',
    race: 'spellcaster',
    atk: 2500,
    def: 2100,
    levelValue: 7,
    levelType: 'level',
    types: ['normal'],
    isExtraDeck: false,
    imgs: [{ ciid: '1', imgHash: 'test-hash' }],
  };

  const mockEmptyCard = {
    empty: true,
    cardId: '',
    ciid: '',
    name: '',
    cardType: '',
    imgs: [],
  };

  describe('カード情報の表示', () => {
    it('通常のカードを表示できる', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
          uuid: 'test-uuid-1',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.card-item').exists()).toBe(true);
      expect(wrapper.find('img').attributes('alt')).toBe('ブラック・マジシャン');
      expect(wrapper.find('[data-card-id="4011"]').exists()).toBe(true);
      expect(wrapper.find('[data-uuid="test-uuid-1"]').exists()).toBe(true);
    });

    it('空カードを表示できる', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockEmptyCard,
          sectionType: 'main',
          uuid: 'empty-uuid',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.card-item').exists()).toBe(true);
      expect(wrapper.find('img').exists()).toBe(true);
    });

    it('カード画像URLが正しく生成される', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
        },
        global: {
          plugins: [pinia],
        },
      });

      const img = wrapper.find('img');
      expect(img.attributes('src')).toContain('https://www.db.yugioh-card.com');
    });
  });

  describe('ドラッグ&ドロップ', () => {
    it('通常カードはドラッグ可能', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
          uuid: 'drag-uuid',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.card-item').attributes('draggable')).toBe('true');
    });

    it('空カードはドラッグ不可', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockEmptyCard,
          sectionType: 'main',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.card-item').attributes('draggable')).toBe('false');
    });

    it('ドラッグ開始時にイベントが発火する', async () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
          uuid: 'drag-start-uuid',
        },
        global: {
          plugins: [pinia],
        },
      });

      const mockEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
        },
      };

      await wrapper.vm.handleDragStart(mockEvent as any);

      expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith(
        'text/plain',
        expect.stringContaining('main')
      );
      expect(mockEvent.dataTransfer.effectAllowed).toBe('move');
    });

    it('searchセクションからのドラッグはcopyモード', async () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'search',
          uuid: 'search-uuid',
        },
        global: {
          plugins: [pinia],
        },
      });

      const mockEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
        },
      };

      await wrapper.vm.handleDragStart(mockEvent as any);

      expect(mockEvent.dataTransfer.effectAllowed).toBe('copy');
    });

    it('空カードはドラッグ開始をキャンセルする', async () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockEmptyCard,
          sectionType: 'main',
        },
        global: {
          plugins: [pinia],
        },
      });

      const mockEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
        },
      };

      await wrapper.vm.handleDragStart(mockEvent as any);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.dataTransfer.setData).not.toHaveBeenCalled();
    });
  });

  describe('ボタン表示（sectionType別）', () => {
    it('mainセクション: S（サイド）ボタンが表示される', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
        },
        global: {
          plugins: [pinia],
        },
      });

      const topRightBtn = wrapper.findAll('.card-btn.top-right');
      expect(topRightBtn.length).toBeGreaterThan(0);
      expect(wrapper.vm.topRightText).toBe('S');
    });

    it('sideセクション: M/E（メイン/エクストラ）ボタンが表示される', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'side',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.vm.topRightText).toBe('M/E');
    });

    it('searchセクション: M/E と S ボタンが表示される', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'search',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.vm.bottomLeftText).toBe('M/E');
      expect(wrapper.vm.bottomRightText).toBe('S');
    });

    it('trashセクション: ゴミ箱アイコンは表示されない', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'trash',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.vm.showTrashIcon).toBe(false);
      expect(wrapper.vm.bottomLeftText).toBe('M/E');
    });

    it('main/extraセクション: ゴミ箱アイコンが表示される', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.vm.showTrashIcon).toBe(true);
    });

    it('main/extraセクション: +アイコンが表示される', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.vm.showPlusIcon).toBe(true);
    });
  });

  describe('ボタンクリックイベント', () => {
    it('トップ右ボタン（S）クリックでサイドへ移動', async () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
          uuid: 'test-uuid',
        },
        global: {
          plugins: [pinia],
        },
      });

      const moveToSideSpy = vi.spyOn(store, 'moveCardToSide');

      await wrapper.vm.handleTopRight();

      expect(moveToSideSpy).toHaveBeenCalledWith(mockCard, 'main', 'test-uuid');
    });

    it('トップ右ボタン（M/E）クリックでメイン/エクストラへ移動', async () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'side',
          uuid: 'side-uuid',
        },
        global: {
          plugins: [pinia],
        },
      });

      const moveFromSideSpy = vi.spyOn(store, 'moveCardFromSide');

      await wrapper.vm.handleTopRight();

      expect(moveFromSideSpy).toHaveBeenCalledWith(mockCard, 'side-uuid');
    });

    it('ボトム左ボタン（ゴミ箱）クリックでtrashへ移動', async () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
          uuid: 'main-uuid',
        },
        global: {
          plugins: [pinia],
        },
      });

      const moveToTrashSpy = vi.spyOn(store, 'moveCardToTrash');

      await wrapper.vm.handleBottomLeft();

      expect(moveToTrashSpy).toHaveBeenCalledWith(mockCard, 'main', 'main-uuid');
    });

    it('ボトム左ボタン（M/E）クリックでメイン/エクストラへ追加（search）', async () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'search',
        },
        global: {
          plugins: [pinia],
        },
      });

      const addCopySpy = vi.spyOn(store, 'addCopyToMainOrExtra');

      await wrapper.vm.handleBottomLeft();

      expect(addCopySpy).toHaveBeenCalledWith(mockCard);
    });

    it('ボトム右ボタン（+）クリックでカード枚数増加', async () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
        },
        global: {
          plugins: [pinia],
        },
      });

      const addCopySpy = vi.spyOn(store, 'addCopyToSection');

      await wrapper.vm.handleBottomRight();

      expect(addCopySpy).toHaveBeenCalledWith(mockCard, 'main');
    });

    it('ボトム右ボタン（S）クリックでサイドへ追加（search）', async () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'search',
        },
        global: {
          plugins: [pinia],
        },
      });

      const addToSideSpy = vi.spyOn(store, 'addCopyToSection');

      await wrapper.vm.handleBottomRight();

      expect(addToSideSpy).toHaveBeenCalledWith(mockCard, 'side');
    });

    it('infoボタンクリックでカード情報を表示', async () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
        },
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.handleInfo();

      expect(store.selectedCard).toEqual(mockCard);
      expect(store.activeTab).toBe('card');
      expect(store.cardTab).toBe('info');
    });

    it('infoセクションのinfoボタンクリックで新しいタブを開く', async () => {
      const mockWindowOpen = vi.fn();
      global.window.open = mockWindowOpen;

      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'info',
        },
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.handleInfo();

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('yugiohdb/card_search.action'),
        '_blank'
      );
    });
  });

  describe('プロパティバインディング', () => {
    it('data-card-idが正しく設定される', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('[data-card-id="4011"]').exists()).toBe(true);
    });

    it('data-uuidが正しく設定される', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockCard,
          sectionType: 'main',
          uuid: 'my-uuid-123',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('[data-uuid="my-uuid-123"]').exists()).toBe(true);
    });

    it('draggableが空カードでfalseになる', () => {
      const wrapper = mount(DeckCard, {
        props: {
          card: mockEmptyCard,
          sectionType: 'main',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.card-item').attributes('draggable')).toBe('false');
    });
  });
});
