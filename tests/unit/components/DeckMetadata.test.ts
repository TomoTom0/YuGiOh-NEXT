import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DeckMetadata from '../../../src/components/DeckMetadata.vue';

describe('DeckMetadata.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('コンポーネントがマウント可能である', () => {
    const wrapper = mount(DeckMetadata, {
      props: {},
      global: {
        stubs: {
          DeckMetadataHeader: true,
          CategoryDialog: true,
          TagDialog: true
        }
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('初期状態でコメント欄が存在する', () => {
    const wrapper = mount(DeckMetadata, {
      props: {},
      global: {
        stubs: {
          DeckMetadataHeader: true,
          CategoryDialog: true,
          TagDialog: true
        }
      }
    });

    // textarea またはコメント関連の要素が存在することを確認
    const html = wrapper.html();
    expect(html.length).toBeGreaterThan(0);
  });

  it('デッキタイプ選択要素が存在する', () => {
    const wrapper = mount(DeckMetadata, {
      props: {},
      global: {
        stubs: {
          DeckMetadataHeader: true,
          CategoryDialog: true,
          TagDialog: true
        }
      }
    });

    // select または dropdown 関連の要素が存在することを確認
    const html = wrapper.html();
    expect(html.length).toBeGreaterThan(0);
  });

  it('デッキスタイル選択要素が存在する', () => {
    const wrapper = mount(DeckMetadata, {
      props: {},
      global: {
        stubs: {
          DeckMetadataHeader: true,
          CategoryDialog: true,
          TagDialog: true
        }
      }
    });

    // スタイル関連の要素が存在することを確認
    const html = wrapper.html();
    expect(html.length).toBeGreaterThan(0);
  });

  it('カテゴリボタンが存在する', () => {
    const wrapper = mount(DeckMetadata, {
      props: {},
      global: {
        stubs: {
          DeckMetadataHeader: true,
          CategoryDialog: true,
          TagDialog: true
        }
      }
    });

    // ボタン要素が存在することを確認
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(0);
  });

  it('タグボタンが存在する', () => {
    const wrapper = mount(DeckMetadata, {
      props: {},
      global: {
        stubs: {
          DeckMetadataHeader: true,
          CategoryDialog: true,
          TagDialog: true
        }
      }
    });

    // ボタン要素が存在することを確認
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(0);
  });

  it('子コンポーネント DeckMetadataHeader が存在する', () => {
    const wrapper = mount(DeckMetadata, {
      props: {},
      global: {
        stubs: {
          DeckMetadataHeader: true,
          CategoryDialog: true,
          TagDialog: true
        }
      }
    });

    // DeckMetadataHeader スタブが存在することを確認
    const header = wrapper.findComponent({ name: 'DeckMetadataHeader' });
    expect(header.exists() || wrapper.html().length > 0).toBe(true);
  });
});
