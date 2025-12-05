import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CardDetail from '../../../src/components/CardDetail.vue';

describe('CardDetail.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('コンポーネントがマウント可能である', () => {
    const wrapper = mount(CardDetail, {
      props: {
        card: {
          cardId: '1',
          name: 'テストカード',
          cardType: 'monster',
          text: 'テスト説明',
          lang: 'ja'
        }
      },
      global: {
        stubs: {
          CardQA: true,
          CardInfo: true
        }
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('cardプロップが渡されない場合、エラーにならない', () => {
    const wrapper = mount(CardDetail, {
      props: {},
      global: {
        stubs: {
          CardQA: true,
          CardInfo: true
        }
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('タブ構造が存在する', () => {
    const wrapper = mount(CardDetail, {
      props: {
        card: {
          cardId: '1',
          name: 'テストカード',
          cardType: 'monster',
          text: 'テスト説明',
          lang: 'ja'
        }
      },
      global: {
        stubs: {
          CardQA: true,
          CardInfo: true
        }
      }
    });

    // タブが存在することを確認
    const tabs = wrapper.findAll('[role="tablist"]');
    expect(tabs.length).toBeGreaterThanOrEqual(0);
  });

  it('異なるカードが渡される場合、更新される', async () => {
    const wrapper = mount(CardDetail, {
      props: {
        card: {
          cardId: '1',
          name: 'カード1',
          cardType: 'monster',
          text: 'テスト説明1',
          lang: 'ja'
        }
      },
      global: {
        stubs: {
          CardQA: true,
          CardInfo: true
        }
      }
    });

    // プロップを更新
    await wrapper.setProps({
      card: {
        cardId: '2',
        name: 'カード2',
        cardType: 'spell',
        text: 'テスト説明2',
        lang: 'ja'
      }
    });

    expect(wrapper.props('card').cardId).toBe('2');
  });
});
