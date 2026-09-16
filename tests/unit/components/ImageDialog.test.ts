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
 *   TASK-511で追加した「レイアウト」describeも同様（src/utils/image-dialog-layout.tsの
 *   条件書は tests/design/image-dialog-layout/conditions.toml に別途あり、
 *   ImageDialog.vue本体の結合挙動はcovers対象外と除外記録済み）。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

describe('ImageDialog.vue - レイアウト（TASK-511）', () => {
  // TASK-511テスト先行: popupStyle（将来的にはsrc/utils/image-dialog-layout.tsの
  // computeImageDialogLayoutを経由したlayout computed）がbuttonRect・viewportから
  // フリップ/クランプ済みの top/left をstyle属性へ反映することを検証する。
  // 仕様: TASK-511設計書v2（tmp/20260916_design_task511_image-dialog-layout.md）§2・§4・§6。
  //
  // viewport差し替えはtests/unit/content/image-dialog.test.ts:107や
  // tests/unit/content/deck-edit-layout.test.ts:459と同じ
  // Object.defineProperty(window, 'innerWidth'/'innerHeight', ...) 方式
  // （vi.stubGlobalは不採用。テスト間污染を防ぐためdescriptorを保存してafterEachで復元する）。

  let wrapper: VueWrapper | null = null;
  let innerWidthDescriptor: PropertyDescriptor | undefined;
  let innerHeightDescriptor: PropertyDescriptor | undefined;

  /** window.innerWidth/innerHeightを固定値で差し替える（初回呼び出し時のみ元descriptorを退避） */
  function stubViewport(width: number, height: number): void {
    if (!innerWidthDescriptor) {
      innerWidthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    }
    if (!innerHeightDescriptor) {
      innerHeightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    }
    Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => height });
  }

  /** popupのstyle属性文字列から指定propのpx値を数値で取り出す（無ければthrow） */
  function requirePxValue(style: string, prop: string): number {
    const match = style.match(new RegExp(`${prop}:\\s*(-?[0-9.]+)px`));
    if (!match) throw new Error(`styleに${prop}が含まれない: ${style}`);
    return Number(match[1]);
  }

  /** 生成画像750x1000（displayWidth=750で初期化完了）したdialogをマウントする */
  async function mountLayoutDialog(buttonRect: DOMRect | null): Promise<VueWrapper> {
    const mounted = mount(ImageDialog, {
      props: { cgid: 'cgid123', dno: '1', deckData: makeDeckInfo(), buttonRect },
      global: { stubs: { Teleport: true } },
    });
    await flushPromises();
    resolveImage(0, 'layout-init', 750, 1000);
    await flushPromises();
    return mounted;
  }

  function popupStyleOf(mounted: VueWrapper): string {
    return mounted.find('.ygo-next-image-popup').attributes('style') ?? '';
  }

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
    if (innerWidthDescriptor) {
      Object.defineProperty(window, 'innerWidth', innerWidthDescriptor);
      innerWidthDescriptor = undefined;
    }
    if (innerHeightDescriptor) {
      Object.defineProperty(window, 'innerHeight', innerHeightDescriptor);
      innerHeightDescriptor = undefined;
    }
    vi.unstubAllGlobals();
  });

  it('buttonRect渡しで下に置けない場合は上へフリップし左は右端クランプされる（設計書§2典型例）', async () => {
    stubViewport(1280, 800);
    // デッキ表示ページ典型: ボタンが右下（left=1180, top=740, 36x36）
    wrapper = await mountLayoutDialog(new DOMRect(1180, 740, 36, 36));

    const style = popupStyleOf(wrapper);
    // below希望=784で収まらないためフリップ: top=740-8-680=52
    expect(requirePxValue(style, 'top')).toBeCloseTo(52, 6);
    // 右端クランプ: left=1280-640-16=624
    expect(requirePxValue(style, 'left')).toBeCloseTo(624, 6);
    expect(requirePxValue(style, 'width')).toBeCloseTo(640, 6);
    expect(requirePxValue(style, 'max-height')).toBeCloseTo(680, 6);
    // 設計書§9: left+width <= innerWidth-VIEWPORT_MARGIN(16)
    const left = requirePxValue(style, 'left');
    const width = requirePxValue(style, 'width');
    expect(left + width).toBeLessThanOrEqual(1280 - 16 + 1e-6);
  });

  it('buttonRect無し（編集ページ）は実dialog幅で画面中央に配置される', async () => {
    stubViewport(1280, 800);
    wrapper = await mountLayoutDialog(null);

    const style = popupStyleOf(wrapper);
    expect(requirePxValue(style, 'top')).toBeCloseTo(60, 6); // clampY((800-680)/2)
    expect(requirePxValue(style, 'left')).toBeCloseTo(320, 6); // clampX((1280-640)/2)
    expect(requirePxValue(style, 'width')).toBeCloseTo(640, 6);
  });

  it('resizeでviewportが縮むと再計算され新viewport基準のクランプに収まる（設計書§4）', async () => {
    stubViewport(1280, 800);
    wrapper = await mountLayoutDialog(new DOMRect(1180, 740, 36, 36));
    expect(requirePxValue(popupStyleOf(wrapper), 'left')).toBeCloseTo(624, 6);

    // ウィンドウ幅を1280→360へ縮小（高さは不変）してresizeイベントを発火
    stubViewport(360, 800);
    window.dispatchEvent(new Event('resize'));
    await nextTick(); // プロジェクトルール: DOM更新後はnextTick()を必ず待つ

    const style = popupStyleOf(wrapper);
    // 外枠上限=min(360-32,640)=328、left=clampX(1180)=360-328-16=16
    expect(requirePxValue(style, 'left')).toBeCloseTo(16, 6);
    expect(requirePxValue(style, 'width')).toBeCloseTo(328, 6);
    // 高さは不変のためabove配置（top=52）は維持される
    expect(requirePxValue(style, 'top')).toBeCloseTo(52, 6);
    const left = requirePxValue(style, 'left');
    const width = requirePxValue(style, 'width');
    expect(left + width).toBeLessThanOrEqual(360 - 16 + 1e-6);
  });

  it('backgroundImageStyle.heightはdisplayHeight*scaleで反映され、コンテンツ幅とアスペクト比が一致する（設計書§1）', async () => {
    stubViewport(1280, 800);
    // 生成画像750x1000: scale=600/750=0.8 → .background-image高さ=1000*0.8=800px。
    // popup外枠640（コンテンツ幅600+padding40）と高さ800の比 600:800 が
    // 生成画像 750:1000 と一致するためbackground-size:containがぴったりfitする
    wrapper = await mountLayoutDialog(new DOMRect(1180, 740, 36, 36));

    const popupStyle = popupStyleOf(wrapper);
    const bgStyle = wrapper.find('.background-image').attributes('style') ?? '';
    expect(requirePxValue(bgStyle, 'height')).toBeCloseTo(800, 6);
    const contentWidth = requirePxValue(popupStyle, 'width') - 40; // 40=2*DIALOG_PADDING
    expect(requirePxValue(bgStyle, 'height') / contentWidth).toBeCloseTo(1000 / 750, 6);
  });

  it('.ygo-next-image-popupのスタイル定義はposition: fixed（オーバーレイと座標系一致）', () => {
    // happy-domはscoped style（data-v属性セレクタ）のcascadeを解決しないため
    // getComputedStyleでは検証できない（実測で''が返る）。popup要素が当該クラスを
    // 持つことは他itのfindで検証済みのため、ここではSFCのscoped定義を直接検証する
    // （configs系テストと同じソース直読み方式）
    const sfc = readFileSync(
      resolve(__dirname, '../../../src/components/ImageDialog.vue'),
      'utf8'
    );
    const match = sfc.match(/\.ygo-next-image-popup\s*\{[^}]*\}/);
    expect(match).not.toBeNull();
    const rule = match?.[0] ?? '';
    // position:absolute（旧・ドキュメント座標）への回帰を防止
    expect(rule).toContain('position: fixed');
    expect(rule).not.toContain('position: absolute');
  });

  it('unmount後のresizeイベントでエラーにならない（リスナ除去の回帰固定）', async () => {
    stubViewport(1280, 800);
    const mounted = await mountLayoutDialog(null);

    // onUnmountedでresizeリスナが除去されていること（除去漏れはunmount後も
    // handleResizeが動き続けるメモリリークになるため直接検証する）
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    mounted.unmount();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();

    // 除去済みのため、unmount後のresize dispatchは何も起こさず例外も出ない
    stubViewport(360, 800);
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
  });
});
