import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CardInfo from '../../../src/components/CardInfo.vue';
import { getCardDetail, getCardDetailWithCache } from '../../../src/api/card-search';
import { useCardDetailStore } from '../../../src/stores/card-detail';

// Mock getCardDetail and getCardDetailWithCache
vi.mock('../../../src/api/card-search', () => ({
  getCardDetail: vi.fn(),
  getCardDetailWithCache: vi.fn(),
}));

describe('CardInfo.vue', () => {
  let pinia: any;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  const mockMonsterCard = {
    cardId: '4011',
    ciid: '1',
    name: 'ブラック・マジシャン',
    cardType: 'monster',
    text: '魔法使い族の最上級モンスター。攻撃力・守備力ともに最高クラス。',
    attribute: 'dark',
    race: 'spellcaster',
    level: 7,
    atk: 2500,
    def: 2100,
    effectType: 'normal',
    imgs: [{ ciid: '1', imgHash: 'hash1' }],
  };

  const mockPendulumCard = {
    cardId: '12580',
    ciid: '1',
    name: 'ペンデュラムモンスター',
    cardType: 'monster',
    text: 'モンスター効果テキスト',
    pendulumText: 'ペンデュラム効果',
    pendulumScale: 5,
    attribute: 'light',
    race: 'dragon',
    level: 4,
    atk: 1850,
    def: 0,
    effectType: 'pendulum',
    imgs: [{ ciid: '1', imgHash: 'hash2' }],
  };

  describe('基本レンダリング', () => {
    it('モンスターカードの基本情報を表示できる', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.card-name-large').text()).toBe('ブラック・マジシャン');
      expect(wrapper.find('.effect-text').text()).toBe(
        '魔法使い族の最上級モンスター。攻撃力・守備力ともに最高クラス。'
      );
    });

    it('ペンデュラムカードのペンデュラムテキストを表示できる', () => {
      const cardWithPendulumEffect = {
        ...mockPendulumCard,
        pendulumEffect: 'ペンデュラム効果', // pendulumTextではなくpendulumEffect
      };

      const store = useCardDetailStore();
      store.selectedCard = cardWithPendulumEffect as any;

      const wrapper = mount(CardInfo, {
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.card-name-large').text()).toBe('ペンデュラムモンスター');
      const sections = wrapper.findAll('.card-effect-section');

      // Pend. Textセクションを探す
      const pendTextSection = sections.find((s) =>
        s.find('.section-title').text().includes('Pend. Text')
      );
      expect(pendTextSection).toBeTruthy();
      expect(pendTextSection?.find('.effect-text').text()).toBe('ペンデュラム効果');
    });

    it('DeckCardコンポーネントが正しくレンダリングされる', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        global: {
          plugins: [pinia],
        },
      });

      const deckCard = wrapper.findComponent({ name: 'DeckCard' });
      expect(deckCard.exists()).toBe(true);
      expect(deckCard.props('card')).toEqual(mockMonsterCard);
      expect(deckCard.props('sectionType')).toBe('info');
    });
  });

  describe('補足情報の表示', () => {
    it('補足情報がある場合に表示される', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: 'このカードは特別なルールがあります。',
          supplementDate: '2024-01-01',
        },
        global: {
          plugins: [pinia],
        },
      });

      const sections = wrapper.findAll('.card-effect-section');
      const supplementSection = sections.find((s) =>
        s.find('.section-title').text().includes('Detail')
      );

      expect(supplementSection).toBeTruthy();
      expect(supplementSection?.find('.section-title').text()).toContain(
        'Detail [2024-01-01]'
      );
      expect(supplementSection?.find('.detail-text').text()).toBe(
        'このカードは特別なルールがあります。'
      );
    });

    it('補足情報がない場合は表示されない', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        global: {
          plugins: [pinia],
        },
      });

      const sections = wrapper.findAll('.card-effect-section');
      const supplementSection = sections.find((s) =>
        s.find('.section-title').text().includes('Detail')
      );

      expect(supplementSection).toBeFalsy();
    });

    it('ペンデュラム補足情報が表示される', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockPendulumCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          pendulumSupplementInfo: 'ペンデュラム特別ルール',
          pendulumSupplementDate: '2024-02-01',
        },
        global: {
          plugins: [pinia],
        },
      });

      const sections = wrapper.findAll('.card-effect-section');
      const pendSupplementSection = sections.find((s) =>
        s.find('.section-title').text().includes('Pend. Detail')
      );

      expect(pendSupplementSection).toBeTruthy();
      expect(pendSupplementSection?.find('.section-title').text()).toContain(
        'Pend. Detail [2024-02-01]'
      );
      expect(pendSupplementSection?.find('.detail-text').text()).toBe(
        'ペンデュラム特別ルール'
      );
    });

    it('補足情報の表示順序が正しい（Pend. Text → Pend. Detail → Card Text → Detail）', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockPendulumCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: '通常補足',
          supplementDate: '2024-01-01',
          pendulumSupplementInfo: 'ペンデュラム補足',
          pendulumSupplementDate: '2024-02-01',
        },
        global: {
          plugins: [pinia],
        },
      });

      const sectionTitles = wrapper
        .findAll('.section-title')
        .map((s) => s.text());

      const pendTextIndex = sectionTitles.findIndex((t) =>
        t.includes('Pend. Text')
      );
      const pendDetailIndex = sectionTitles.findIndex((t) =>
        t.includes('Pend. Detail')
      );
      const cardTextIndex = sectionTitles.findIndex((t) =>
        t.includes('Card Text')
      );
      const detailIndex = sectionTitles.findIndex((t) =>
        t === 'Detail [2024-01-01]'
      );

      expect(pendTextIndex).toBeLessThan(pendDetailIndex);
      expect(pendDetailIndex).toBeLessThan(cardTextIndex);
      expect(cardTextIndex).toBeLessThan(detailIndex);
    });
  });

  describe('カードリンクのパース', () => {
    it('parseCardLinksが{{カード名|cid}}形式をパースできる', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: '{{ブルーアイズ・ホワイト・ドラゴン|4007}}を参照',
        },
        global: {
          plugins: [pinia],
        },
      });

      const cardLinks = wrapper.findAll('.card-link');
      expect(cardLinks).toHaveLength(1);
      expect(cardLinks[0].text()).toBe('ブルーアイズ・ホワイト・ドラゴン');
    });

    it('複数のカードリンクをパースできる', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo:
            '{{カード1|100}}と{{カード2|200}}と{{カード3|300}}を参照',
        },
        global: {
          plugins: [pinia],
        },
      });

      const cardLinks = wrapper.findAll('.card-link');
      expect(cardLinks).toHaveLength(3);
      expect(cardLinks[0].text()).toBe('カード1');
      expect(cardLinks[1].text()).toBe('カード2');
      expect(cardLinks[2].text()).toBe('カード3');
    });

    it('カードリンクがない場合は通常テキストとして表示', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: '特別なルールはありません。',
        },
        global: {
          plugins: [pinia],
        },
      });

      const cardLinks = wrapper.findAll('.card-link');
      expect(cardLinks).toHaveLength(0);

      const detailText = wrapper.find('.detail-text');
      expect(detailText.text()).toBe('特別なルールはありません。');
    });

    it('カードリンクと通常テキストが混在する場合', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: '前のテキスト{{カード|123}}後ろのテキスト',
        },
        global: {
          plugins: [pinia],
        },
      });

      const detailText = wrapper.find('.detail-text');
      expect(detailText.text()).toBe('前のテキストカード後ろのテキスト');

      const cardLinks = wrapper.findAll('.card-link');
      expect(cardLinks).toHaveLength(1);
      expect(cardLinks[0].text()).toBe('カード');
    });

    it('ペンデュラム補足情報のカードリンクもパースされる', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockPendulumCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          pendulumSupplementInfo: '{{関連カード|999}}を参照',
        },
        global: {
          plugins: [pinia],
        },
      });

      const sections = wrapper.findAll('.card-effect-section');
      const pendSupplementSection = sections.find((s) =>
        s.find('.section-title').text().includes('Pend. Detail')
      );

      const cardLinks = pendSupplementSection?.findAll('.card-link');
      expect(cardLinks).toHaveLength(1);
      expect(cardLinks?.[0].text()).toBe('関連カード');
    });
  });

  describe('カードリンククリック処理', () => {
    it('カードリンククリックでgetCardDetailが呼ばれる', async () => {
      const mockCardDetail = {
        card: {
          cardId: '4007',
          ciid: '1',
          name: 'ブルーアイズ・ホワイト・ドラゴン',
          cardType: 'monster',
          imgs: [{ ciid: '1', imgHash: 'hash' }],
        },
      };
      (getCardDetailWithCache as any).mockResolvedValue({ detail: mockCardDetail });

      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: '{{ブルーアイズ・ホワイト・ドラゴン|4007}}を参照',
        },
        global: {
          plugins: [pinia],
        },
      });

      const cardLink = wrapper.find('.card-link');
      await cardLink.trigger('click');
      await wrapper.vm.$nextTick();

      expect(getCardDetailWithCache).toHaveBeenCalledWith('4007', 'ja', true, 'release_desc', true);
    });

    it('カードリンククリックでdeckStoreが更新される', async () => {
      const mockCardDetail = {
        card: {
          cardId: '4007',
          ciid: '1',
          name: 'ブルーアイズ・ホワイト・ドラゴン',
          cardType: 'monster',
          imgs: [{ ciid: '1', imgHash: 'hash' }],
        },
      };
      (getCardDetailWithCache as any).mockResolvedValue({ detail: mockCardDetail });

      const cardDetailStore = useCardDetailStore();
      cardDetailStore.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: '{{ブルーアイズ・ホワイト・ドラゴン|4007}}を参照',
        },
        global: {
          plugins: [pinia],
        },
      });

      const cardLink = wrapper.find('.card-link');
      await cardLink.trigger('click');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await wrapper.vm.$nextTick();

      expect(cardDetailStore.selectedCard).toEqual(mockCardDetail.card);
      expect(cardDetailStore.cardTab).toBe('info');
    });

    it('getCardDetailがエラーを返した場合でもクラッシュしない', async () => {
      (getCardDetail as any).mockRejectedValue(new Error('API Error'));

      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: '{{カード|999}}を参照',
        },
        global: {
          plugins: [pinia],
        },
      });

      const cardLink = wrapper.find('.card-link');

      // エラーが発生してもクラッシュしないことを確認
      await expect(async () => {
        await cardLink.trigger('click');
        await new Promise((resolve) => setTimeout(resolve, 10));
        await wrapper.vm.$nextTick();
      }).not.toThrow();
    });

    it('getCardDetailがnullを返した場合でもクラッシュしない', async () => {
      (getCardDetail as any).mockResolvedValue(null);

      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: '{{カード|999}}を参照',
        },
        global: {
          plugins: [pinia],
        },
      });

      const cardLink = wrapper.find('.card-link');

      await expect(async () => {
        await cardLink.trigger('click');
        await new Promise((resolve) => setTimeout(resolve, 10));
        await wrapper.vm.$nextTick();
      }).not.toThrow();
    });
  });

  describe('エッジケース', () => {
    it('空の補足情報でもエラーにならない', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: '',
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.detail-text').exists()).toBe(false);
    });

    it('undefined補足情報でもエラーにならない', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: undefined,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.detail-text').exists()).toBe(false);
    });

    it('不正なカードリンク形式でもエラーにならない', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: '{{不完全なリンク|',
        },
        global: {
          plugins: [pinia],
        },
      });

      // パース失敗時は通常テキストとして表示
      const detailText = wrapper.find('.detail-text');
      expect(detailText.text()).toBe('{{不完全なリンク|');
      expect(wrapper.findAll('.card-link')).toHaveLength(0);
    });

    it('日付なしの補足情報も表示できる', () => {
      const store = useCardDetailStore();
      store.selectedCard = mockMonsterCard as any;

      const wrapper = mount(CardInfo, {
        props: {
          supplementInfo: '補足情報',
          supplementDate: undefined,
        },
        global: {
          plugins: [pinia],
        },
      });

      const sectionTitle = wrapper
        .findAll('.section-title')
        .find((s) => s.text().includes('Detail'));

      expect(sectionTitle?.text()).toBe('Detail');
    });
  });
});
