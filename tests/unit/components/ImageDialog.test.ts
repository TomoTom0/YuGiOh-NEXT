/**
 * ユニットテスト: ImageDialog.vue
 *
 * PR#138レビュー指摘対応（TASK-388）: refreshPreviewの競合を検証する。
 * 色・サイドデッキ・フッターテキスト変更で連続してプレビュー再生成された場合、
 * 古い非同期結果が新しい結果を上書きしない（generation token）ことを確認する。
 *
 * generateBackgroundImage内のFileReader/Imageをスタブし、
 * createDeckRecipeImageの解決順をテスト側で制御する。
 *
 * ※Tier C（TASK-331）のconditions.tomlは未作成のためcoversタグは付与しない。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import ImageDialog from '@/components/ImageDialog.vue';
import type { DeckInfo } from '@/types/deck';

interface GeneratedImage {
  dataUrl: string;
  width: number;
  height: number;
}

// createDeckRecipeImageの解決順を制御するため、resolve関数を保留キューに貯める。
// FakeImageはdataUrlから寸法を復元するため、dataUrl→寸法の対応も保持する。
const { pendingCalls, dimsByUrl } = vi.hoisted(() => ({
  pendingCalls: [] as Array<(value: GeneratedImage) => void>,
  dimsByUrl: new Map<string, { width: number; height: number }>(),
}));

vi.mock('@/content/deck-recipe/createDeckRecipeImage', () => ({
  createDeckRecipeImage: () =>
    new Promise<GeneratedImage>((resolve) => {
      pendingCalls.push(resolve);
    }),
  generateDefaultFooterText: () => 'footer-text',
}));

vi.mock('@/content/deck-recipe/downloadDeckRecipeImage', () => ({
  downloadDeckRecipeImage: vi.fn(),
}));

// ImageDialog.vueのgenerateBackgroundImageが使うDOM APIのスタブ
class FakeFileReader {
  result: string | null = null;
  onloadend: (() => void) | null = null;
  readAsDataURL(blob: GeneratedImage): void {
    this.result = blob.dataUrl;
    queueMicrotask(() => this.onloadend?.());
  }
}

class FakeImage {
  onload: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  private _src = '';
  get src(): string {
    return this._src;
  }
  set src(value: string) {
    this._src = value;
    const dims = dimsByUrl.get(value);
    this.naturalWidth = dims?.width ?? 0;
    this.naturalHeight = dims?.height ?? 0;
    queueMicrotask(() => this.onload?.());
  }
}

const makeDeckInfo = (): DeckInfo => ({
  dno: 1,
  name: 'テストデッキ',
  mainDeck: [],
  extraDeck: [],
  sideDeck: [],
  category: [],
  tags: [],
  comment: '',
  deckCode: '',
});

/** index番目のgenerate呼び出しを解決する */
function resolveImage(index: number, name: string, width = 400, height = 300): void {
  const dataUrl = `data:image/png;base64,${name}`;
  dimsByUrl.set(dataUrl, { width, height });
  pendingCalls[index]({ dataUrl, width, height });
}

function mountDialog() {
  return mount(ImageDialog, {
    props: { cgid: 'cgid123', dno: '1', deckData: makeDeckInfo() },
    global: { stubs: { Teleport: true } },
  });
}

/** マウントして初期画像生成（initialize）まで完了させる */
async function mountInitializedDialog(): Promise<VueWrapper> {
  const wrapper = mountDialog();
  await flushPromises();
  resolveImage(0, 'init');
  await flushPromises();
  return wrapper;
}

describe('ImageDialog.vue - refreshPreview', () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    pendingCalls.length = 0;
    dimsByUrl.clear();
    localStorage.clear();
    vi.stubGlobal('FileReader', FakeFileReader);
    vi.stubGlobal('Image', FakeImage);
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.unstubAllGlobals();
  });

  it('初期化後に色変更1回の再生成結果はプレビューへ反映される', async () => {
    wrapper = await mountInitializedDialog();

    await wrapper.find('button[aria-label="blue"]').trigger('click');
    resolveImage(1, 'blue', 400, 310);
    await flushPromises();

    const style = wrapper.find('.background-image').attributes('style') ?? '';
    expect(style).toContain('data:image/png;base64,blue');
    expect(style).toContain('height: 310px');
  });

  it('TASK-390: プレビューの縁取りはCSS outlineで表現され、ダウンロード画像には焼き込まれない（selectedColorのaccentLineに連動）', async () => {
    wrapper = await mountInitializedDialog();

    // デフォルト(red)の時点でプレビュー要素にaccentLine色のoutlineColorが設定されている
    // （borderではなくoutlineを使うのは、border-boxがcontent boxを消費してプレビューが
    // 生成画像より縮小されるのを防ぐため。TASK-392でborderからoutlineに変更）
    let style = wrapper.find('.background-image').attributes('style') ?? '';
    expect(style).toContain('outline-color: #ed1b1b');

    // 色を変更するとoutlineColorも追従する（画像生成オプションのcolorはCanvas描画には使うが、
    // strokeRectによる縁取り焼き込みは行わない = createDeckRecipeImageは枠線を描画しない）
    await wrapper.find('button[aria-label="blue"]').trigger('click');
    resolveImage(1, 'blue', 400, 310);
    await flushPromises();

    style = wrapper.find('.background-image').attributes('style') ?? '';
    expect(style).toContain('outline-color: #1485ed');
  });

  it('連続した色変更で古い生成結果は破棄され、最新の結果のみ反映される', async () => {
    wrapper = await mountInitializedDialog();

    // blue → green の順に連続変更（それぞれの生成は未解決のまま）
    await wrapper.find('button[aria-label="blue"]').trigger('click');
    await wrapper.find('button[aria-label="green"]').trigger('click');

    // 新しい方（green）が先に完了
    resolveImage(2, 'green', 400, 320);
    await flushPromises();
    let style = wrapper.find('.background-image').attributes('style') ?? '';
    expect(style).toContain('data:image/png;base64,green');
    expect(style).toContain('height: 320px');

    // 古い方（blue）が後から完了しても上書きしない
    resolveImage(1, 'blue', 400, 310);
    await flushPromises();
    style = wrapper.find('.background-image').attributes('style') ?? '';
    expect(style).toContain('data:image/png;base64,green');
    expect(style).not.toContain('data:image/png;base64,blue');
    expect(style).toContain('height: 320px');
    expect(style).not.toContain('height: 310px');
  });

  it('前回の色/QR/Side/text設定がlocalStorageに保存され、次回オープン時に復元される', async () => {
    // side-toggleを表示させるためサイドデッキ入りのデータでマウント
    const deckDataWithSide: DeckInfo = {
      ...makeDeckInfo(),
      sideDeck: [{ cid: '1', ciid: '1', lang: 'ja', quantity: 1 }],
    };
    wrapper = mount(ImageDialog, {
      props: { cgid: 'cgid123', dno: '1', deckData: deckDataWithSide },
      global: { stubs: { Teleport: true } },
    });
    await flushPromises();
    resolveImage(0, 'init');
    await flushPromises();

    await wrapper.find('button[aria-label="blue"]').trigger('click');
    resolveImage(1, 'blue', 400, 310);
    await wrapper.find('.qr-toggle').trigger('click');
    await wrapper.find('.side-toggle').trigger('click');
    resolveImage(2, 'side-off', 400, 200);
    await wrapper.find('.footer-field .field-input').setValue('カスタムフッター');
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 500)); // footerTextのdebounce待ち
    resolveImage(3, 'footer', 400, 200);
    await flushPromises();

    wrapper.unmount();
    wrapper = null;

    const saved = JSON.parse(localStorage.getItem('ygoNext:deckImageDialogSettings') ?? '{}');
    expect(saved.color).toBe('blue');
    expect(saved.includeQR).toBe(false);
    expect(saved.includeSide).toBe(false);
    expect(saved.footerText).toBe('カスタムフッター');

    // 再度開いたときに復元されることを確認
    const reopened = mount(ImageDialog, {
      props: { cgid: 'cgid123', dno: '1', deckData: deckDataWithSide },
      global: { stubs: { Teleport: true } },
    });
    await flushPromises();
    resolveImage(4, 'restored');
    await flushPromises();

    const style = reopened.find('.background-image').attributes('style') ?? '';
    expect(style).toContain('outline-color: #1485ed'); // blue
    expect(reopened.find('.qr-toggle').classes()).toContain('inactive');
    expect(reopened.find('.side-toggle').classes()).toContain('inactive');
    expect((reopened.find('.footer-field .field-input').element as HTMLInputElement).value).toBe('カスタムフッター');

    reopened.unmount();
  });
});
