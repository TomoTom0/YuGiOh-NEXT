import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CardQA from '../../../src/components/CardQA.vue';
import { getFAQDetail } from '../../../src/api/card-faq';

// Mock getFAQDetail
vi.mock('../../../src/api/card-faq', () => ({
  getFAQDetail: vi.fn(),
}));

describe('CardQA.vue', () => {
  let pinia: any;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  const mockFaqListData = {
    cardName: 'ブラック・マジシャン',
    faqs: [
      {
        faqId: '100',
        question: 'このカードの効果は{{ブルーアイズ・ホワイト・ドラゴン|4007}}と同じですか？',
        updatedAt: '2024-01-01',
      },
      {
        faqId: '200',
        question: '通常召喚できますか？',
        updatedAt: '2024-01-02',
      },
    ],
  };

  describe('基本レンダリング', () => {
    it('loading状態を表示できる', () => {
      const wrapper = mount(CardQA, {
        props: {
          faqListData: null,
          loading: true,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.loading').exists()).toBe(true);
      expect(wrapper.find('.loading').text()).toBe('読み込み中...');
    });

    it('FAQ情報がない場合にメッセージを表示する', () => {
      const wrapper = mount(CardQA, {
        props: {
          faqListData: null,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.no-data').exists()).toBe(true);
      expect(wrapper.find('.no-data').text()).toBe('Q&A情報がありません');
    });

    it('FAQ一覧を表示できる', () => {
      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.qa-card-name').text()).toBe('ブラック・マジシャン');
      expect(wrapper.findAll('.qa-item')).toHaveLength(2);
    });

    it('FAQ質問が正しく表示される', () => {
      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      const qaItems = wrapper.findAll('.qa-item');
      expect(qaItems[0].find('.qa-question').text()).toContain(
        'このカードの効果はブルーアイズ・ホワイト・ドラゴンと同じですか？'
      );
      expect(qaItems[1].find('.qa-question').text()).toContain('通常召喚できますか？');
    });

    it('更新日が正しく表示される', () => {
      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      const qaItems = wrapper.findAll('.qa-item');
      expect(qaItems[0].find('.qa-date').text()).toBe('更新日: 2024-01-01');
      expect(qaItems[1].find('.qa-date').text()).toBe('更新日: 2024-01-02');
    });
  });

  describe('カードリンクのパース', () => {
    it('{{カード名|cid}}形式のテキストをパースできる', () => {
      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      const firstQuestion = wrapper.findAll('.qa-item')[0].find('.qa-question');
      const cardLinks = firstQuestion.findAll('.card-link');

      expect(cardLinks).toHaveLength(1);
      expect(cardLinks[0].text()).toBe('ブルーアイズ・ホワイト・ドラゴン');
    });

    it('カードリンクがない場合は通常テキストとして表示される', () => {
      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      const secondQuestion = wrapper.findAll('.qa-item')[1].find('.qa-question');
      const cardLinks = secondQuestion.findAll('.card-link');

      expect(cardLinks).toHaveLength(0);
      expect(secondQuestion.text()).toContain('通常召喚できますか？');
    });

    it('複数のカードリンクをパースできる', () => {
      const faqWithMultipleLinks = {
        cardName: 'テストカード',
        faqs: [
          {
            faqId: '300',
            question:
              '{{カード1|100}}と{{カード2|200}}の効果は同時に発動しますか？',
            updatedAt: '2024-01-01',
          },
        ],
      };

      const wrapper = mount(CardQA, {
        props: {
          faqListData: faqWithMultipleLinks,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      const cardLinks = wrapper.findAll('.card-link');
      expect(cardLinks).toHaveLength(2);
      expect(cardLinks[0].text()).toBe('カード1');
      expect(cardLinks[1].text()).toBe('カード2');
    });
  });

  describe('FAQ展開/縮小機能', () => {
    it('初期状態では展開ボタンが表示される', () => {
      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      const expandButtons = wrapper.findAll('.qa-expand-btn');
      expect(expandButtons).toHaveLength(2);
    });

    it('展開ボタンクリックで回答エリアが表示される', async () => {
      const mockAnswer = '通常召喚できます。';
      (getFAQDetail as any).mockResolvedValue({ answer: mockAnswer });

      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      const expandButton = wrapper.findAll('.qa-expand-btn')[0];
      await expandButton.trigger('click');
      await wrapper.vm.$nextTick();

      // 回答エリアコンテナが表示される
      expect(wrapper.find('.qa-answer-container').exists()).toBe(true);

      // Promise解決を待つ
      await new Promise((resolve) => setTimeout(resolve, 10));
      await wrapper.vm.$nextTick();

      expect(getFAQDetail).toHaveBeenCalledWith('100');
      expect(wrapper.find('.qa-answer').exists()).toBe(true);
      expect(wrapper.find('.qa-answer').text()).toContain(mockAnswer);
    });

    it('回答エリアが表示されたら縮小ボタンが表示される', async () => {
      const mockAnswer = '通常召喚できます。';
      (getFAQDetail as any).mockResolvedValue({ answer: mockAnswer });

      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      const expandButton = wrapper.findAll('.qa-expand-btn')[0];
      await expandButton.trigger('click');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.qa-collapse-btn-sticky').exists()).toBe(true);
    });
  });

  describe('faqId-based状態管理', () => {
    it('異なるfaqIdの回答は独立して管理される', async () => {
      const mockAnswer1 = '回答1';
      const mockAnswer2 = '回答2';

      (getFAQDetail as any)
        .mockResolvedValueOnce({ answer: mockAnswer1 })
        .mockResolvedValueOnce({ answer: mockAnswer2 });

      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      // 最初のFAQを展開
      const firstExpandBtn = wrapper.findAll('.qa-expand-btn')[0];
      await firstExpandBtn.trigger('click');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await wrapper.vm.$nextTick();

      // 2番目のFAQを展開
      const secondExpandBtn = wrapper.findAll('.qa-expand-btn')[0]; // 1つ目が消えているので[0]
      await secondExpandBtn.trigger('click');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await wrapper.vm.$nextTick();

      // 両方の回答が表示されている
      const answers = wrapper.findAll('.qa-answer');
      expect(answers).toHaveLength(2);
      expect(answers[0].text()).toContain(mockAnswer1);
      expect(answers[1].text()).toContain(mockAnswer2);
    });

    it('同じfaqIdはキャッシュされ再取得されない', async () => {
      const mockAnswer = '回答';
      (getFAQDetail as any).mockResolvedValue({ answer: mockAnswer });

      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      // 最初の展開
      const expandButton = wrapper.findAll('.qa-expand-btn')[0];
      await expandButton.trigger('click');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await wrapper.vm.$nextTick();

      expect(getFAQDetail).toHaveBeenCalledTimes(1);

      // 縮小
      const collapseButton = wrapper.find('.qa-collapse-btn-sticky');
      await collapseButton.trigger('click');
      await wrapper.vm.$nextTick();

      // 再展開
      const expandButtonAgain = wrapper.findAll('.qa-expand-btn')[0];
      await expandButtonAgain.trigger('click');
      await wrapper.vm.$nextTick();

      // getFAQDetailは1回しか呼ばれない（キャッシュ使用）
      expect(getFAQDetail).toHaveBeenCalledTimes(1);
    });

    it('カード変更時に異なるfaqIdの回答は混在しない', async () => {
      const mockAnswer1 = 'カードAの回答';
      (getFAQDetail as any).mockResolvedValue({ answer: mockAnswer1 });

      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      // FAQ展開
      const expandButton = wrapper.findAll('.qa-expand-btn')[0];
      await expandButton.trigger('click');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.qa-answer').text()).toContain(mockAnswer1);

      // 別のカードのFAQに変更
      const newFaqListData = {
        cardName: 'ブルーアイズ',
        faqs: [
          {
            faqId: '999', // 異なるfaqId
            question: '新しい質問',
            updatedAt: '2024-01-05',
          },
        ],
      };

      await wrapper.setProps({ faqListData: newFaqListData });
      await wrapper.vm.$nextTick();

      // 新しいFAQの展開ボタンが表示される（前の回答は表示されない）
      expect(wrapper.findAll('.qa-expand-btn')).toHaveLength(1);
      expect(wrapper.findAll('.qa-answer')).toHaveLength(0);
    });
  });

  describe('回答内のカードリンク', () => {
    it('回答内のカードリンクも正しくパースされる', async () => {
      const mockAnswer = '{{関連カード|500}}を参照してください。';
      (getFAQDetail as any).mockResolvedValue({ answer: mockAnswer });

      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      const expandButton = wrapper.findAll('.qa-expand-btn')[0];
      await expandButton.trigger('click');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await wrapper.vm.$nextTick();

      const cardLinks = wrapper.find('.qa-answer').findAll('.card-link');
      expect(cardLinks).toHaveLength(1);
      expect(cardLinks[0].text()).toBe('関連カード');
    });
  });

  describe('エッジケース', () => {
    it('FAQが空配列の場合にエラーにならない', () => {
      const emptyFaqListData = {
        cardName: 'テストカード',
        faqs: [],
      };

      const wrapper = mount(CardQA, {
        props: {
          faqListData: emptyFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.find('.no-data').exists()).toBe(true);
    });

    it('updatedAtがない場合でもエラーにならない', () => {
      const faqWithoutDate = {
        cardName: 'テストカード',
        faqs: [
          {
            faqId: '100',
            question: 'テスト質問',
            // updatedAtなし
          },
        ],
      };

      const wrapper = mount(CardQA, {
        props: {
          faqListData: faqWithoutDate,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      expect(wrapper.findAll('.qa-item')).toHaveLength(1);
      expect(wrapper.find('.qa-date').exists()).toBe(false);
    });

    it('getFAQDetailがエラーを返した場合にエラーメッセージを表示', async () => {
      (getFAQDetail as any).mockRejectedValue(new Error('API Error'));

      const wrapper = mount(CardQA, {
        props: {
          faqListData: mockFaqListData,
          loading: false,
        },
        global: {
          plugins: [pinia],
        },
      });

      const expandButton = wrapper.findAll('.qa-expand-btn')[0];
      await expandButton.trigger('click');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.qa-answer').text()).toContain('エラーが発生しました');
    });
  });
});
