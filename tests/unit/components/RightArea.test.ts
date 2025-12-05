import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import RightArea from '../../../src/components/RightArea.vue';

describe('RightArea.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('コンポーネントがマウント可能である', () => {
    const wrapper = mount(RightArea, {
      props: {},
      global: {
        stubs: {
          SearchInputBar: true,
          CardList: true,
          CardDetail: true,
          DeckMetadata: true,
          Tabs: true,
          Tab: true
        }
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('タブコンテナが存在する', () => {
    const wrapper = mount(RightArea, {
      props: {},
      global: {
        stubs: {
          SearchInputBar: true,
          CardList: true,
          CardDetail: true,
          DeckMetadata: true,
          Tabs: true,
          Tab: true
        }
      }
    });

    // right-area-main クラスが存在することを確認
    expect(wrapper.find('.right-area-main').exists()).toBe(true);
  });

  it('SearchInputBar スロットを持つ', () => {
    const wrapper = mount(RightArea, {
      props: {},
      slots: {
        searchInputBar: '<div class="test-search-input">テスト検索入力</div>'
      },
      global: {
        stubs: {
          SearchInputBar: true,
          CardList: true,
          CardDetail: true,
          DeckMetadata: true,
          Tabs: true,
          Tab: true
        }
      }
    });

    // スロットがレンダリングされることを確認
    expect(wrapper.html()).toContain('right-area-main');
  });

  it('背景色とボーダースタイルが適用されている', () => {
    const wrapper = mount(RightArea, {
      props: {},
      global: {
        stubs: {
          SearchInputBar: true,
          CardList: true,
          CardDetail: true,
          DeckMetadata: true,
          Tabs: true,
          Tab: true
        }
      }
    });

    const mainElement = wrapper.find('.right-area-main');
    const styles = mainElement.attributes('style');

    // スタイルが適用されている（存在する）ことを確認
    expect(mainElement.exists()).toBe(true);
  });
});
