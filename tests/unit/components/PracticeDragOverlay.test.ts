/**
 * components/practice/PracticeDragOverlay のユニットテスト
 *
 * tests/design/practice-drag-overlay/conditions.toml（TASK-559 × TASK-331 Tier C第13号）の
 * 8条件をカバーする。unitテストが存在しなかったため新規作成。
 *
 * 検証方針（条件書[meta]コメント・Tier C共通方針）:
 * - PracticeDragOverlayを実物mount（props/emitsなし）。状態はusePracticeDragStateの
 *   公開refへ直接代入して駆動する（composableはモックしない。状態遷移自体は
 *   practice-drag-state条件書が保証）
 * - 本コンポーネントはTeleport to="body"のため、観測はdocument側のDOMに対して行う
 * - 裏面画像URLはtests/setup.tsのchromeスタブ（getURLはパスをそのまま返す）により
 *   'images/card_back.png' になる
 * - drag状態はモジュール共有のため、各テストの前後で全refを初期値へ戻す
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import PracticeDragOverlay from '@/components/practice/PracticeDragOverlay.vue';
import { usePracticeDragState } from '@/composables/practice/usePracticeDragState';

const BACK_IMAGE_URL = 'images/card_back.png';
const FRONT_IMAGE_URL = 'https://example.test/cards/12345.jpg';

const drag = usePracticeDragState();

function resetDragState(): void {
  drag.draggingCardId.value = null;
  drag.draggingRotated.value = false;
  drag.draggingFaceDown.value = false;
  drag.draggingImageUrl.value = null;
  drag.draggingPos.value = { x: 0, y: 0 };
  drag.draggingOffset.value = { x: 0, y: 0 };
  drag.draggingCardSize.value = { width: 36, height: 53 };
  drag.draggingStackTop.value = null;
}

function startOverlay(overrides: Partial<{
  imageUrl: string | null;
  faceDown: boolean;
  rotated: boolean;
  stackTop: boolean | null;
  pos: { x: number; y: number };
  offset: { x: number; y: number };
  size: { width: number; height: number };
}> = {}): void {
  drag.draggingCardId.value = 'card-1';
  drag.draggingImageUrl.value = overrides.imageUrl === undefined ? FRONT_IMAGE_URL : overrides.imageUrl;
  drag.draggingFaceDown.value = overrides.faceDown ?? false;
  drag.draggingRotated.value = overrides.rotated ?? false;
  drag.draggingStackTop.value = overrides.stackTop ?? null;
  drag.draggingPos.value = overrides.pos ?? { x: 0, y: 0 };
  drag.draggingOffset.value = overrides.offset ?? { x: 0, y: 0 };
  drag.draggingCardSize.value = overrides.size ?? { width: 36, height: 53 };
}

async function mountOverlay(): Promise<VueWrapper> {
  const wrapper = mount(PracticeDragOverlay, { attachTo: document.body });
  await nextTick();
  return wrapper;
}

function overlayEl(): HTMLElement | null {
  return document.querySelector('.practice-drag-overlay');
}

function mainImage(): HTMLImageElement | null {
  return document.querySelector('img.drag-overlay-img:not(.drag-overlay-facedown)');
}

describe('components/practice/PracticeDragOverlay', () => {
  let wrapper: VueWrapper | undefined;

  beforeEach(() => {
    resetDragState();
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    wrapper?.unmount();
    wrapper = undefined;
    resetDragState();
    document.body.innerHTML = '';
    await nextTick();
  });

  // --- 非ドラッグ時の非表示 ---

  it('[covers:practice-drag-overlay.renders-nothing-when-not-dragging] draggingCardIdがnullの間はオーバーレイを描画しない', async () => {
    wrapper = await mountOverlay();

    expect(overlayEl()).toBeNull();
  });

  // --- メイン画像のsrc ---

  it('[covers:practice-drag-overlay.main-image-uses-dragging-image-url] ドラッグ中はメイン画像にdraggingImageUrlを使う', async () => {
    startOverlay();
    wrapper = await mountOverlay();

    expect(mainImage()?.getAttribute('src')).toBe(FRONT_IMAGE_URL);
  });

  it('[covers:practice-drag-overlay.main-image-falls-back-to-card-back] draggingImageUrlがnullならメイン画像は裏面画像になる', async () => {
    startOverlay({ imageUrl: null });
    wrapper = await mountOverlay();

    expect(mainImage()?.getAttribute('src')).toBe(BACK_IMAGE_URL);
  });

  // --- 裏向き重ね画像 ---

  it('[covers:practice-drag-overlay.facedown-overlay-rendered-when-facedown-with-front-image] 裏向きかつ表面画像がある場合は裏面の重ね画像を描画する', async () => {
    startOverlay({ faceDown: true });
    wrapper = await mountOverlay();

    const facedown = document.querySelector('img.drag-overlay-facedown');
    expect(facedown).not.toBeNull();
    expect(facedown?.getAttribute('src')).toBe(BACK_IMAGE_URL);
  });

  it('[covers:practice-drag-overlay.facedown-overlay-absent-otherwise] 裏向きでない場合は重ね画像を描画しない', async () => {
    startOverlay({ faceDown: false });
    wrapper = await mountOverlay();

    expect(document.querySelector('img.drag-overlay-facedown')).toBeNull();
  });

  it('[covers:practice-drag-overlay.facedown-overlay-absent-otherwise] draggingImageUrlがnull（メイン画像が裏面）の場合は重ね画像を描画しない', async () => {
    startOverlay({ faceDown: true, imageUrl: null });
    wrapper = await mountOverlay();

    expect(document.querySelector('img.drag-overlay-facedown')).toBeNull();
  });

  it('[covers:practice-drag-overlay.facedown-overlay-absent-otherwise] draggingImageUrlが裏面URLと同一の場合は重ね画像を描画しない', async () => {
    startOverlay({ faceDown: true, imageUrl: BACK_IMAGE_URL });
    wrapper = await mountOverlay();

    expect(document.querySelector('img.drag-overlay-facedown')).toBeNull();
  });

  // --- スタックプレビュー矩形 ---

  it('[covers:practice-drag-overlay.stack-preview-rect-reflects-dragging-stack-top] draggingStackTopがnullの間はプレビュー矩形を描画しない', async () => {
    startOverlay({ stackTop: null });
    wrapper = await mountOverlay();

    expect(document.querySelector('.stack-preview-rect')).toBeNull();
  });

  it('[covers:practice-drag-overlay.stack-preview-rect-reflects-dragging-stack-top] draggingStackTop=trueならpreview-topの矩形を描画する', async () => {
    startOverlay({ stackTop: true });
    wrapper = await mountOverlay();

    const rect = document.querySelector('.stack-preview-rect');
    expect(rect).not.toBeNull();
    expect(rect?.classList.contains('preview-top')).toBe(true);
    expect(rect?.classList.contains('preview-bottom')).toBe(false);
  });

  it('[covers:practice-drag-overlay.stack-preview-rect-reflects-dragging-stack-top] draggingStackTop=falseならpreview-bottomの矩形を描画する', async () => {
    startOverlay({ stackTop: false });
    wrapper = await mountOverlay();

    const rect = document.querySelector('.stack-preview-rect');
    expect(rect).not.toBeNull();
    expect(rect?.classList.contains('preview-bottom')).toBe(true);
    expect(rect?.classList.contains('preview-top')).toBe(false);
  });

  // --- overlayスタイル ---

  it('[covers:practice-drag-overlay.overlay-style-position-and-size-from-drag-state] left/topはpos-offset、width/heightはcardSizeになり、pos更新が反映される', async () => {
    startOverlay({ pos: { x: 150, y: 200 }, offset: { x: 10, y: 20 }, size: { width: 60, height: 88 } });
    wrapper = await mountOverlay();

    const el = overlayEl();
    expect(el).not.toBeNull();
    expect(el?.style.left).toBe('140px');
    expect(el?.style.top).toBe('180px');
    expect(el?.style.width).toBe('60px');
    expect(el?.style.height).toBe('88px');

    drag.draggingPos.value = { x: 170, y: 220 };
    await nextTick();

    expect(el?.style.left).toBe('160px');
    expect(el?.style.top).toBe('200px');
  });

  it('[covers:practice-drag-overlay.overlay-style-transform-reflects-rotated] 回転時はtransformがrotate(-90deg)になりtransformOriginはoffsetになる', async () => {
    startOverlay({ rotated: true, offset: { x: 10, y: 20 } });
    wrapper = await mountOverlay();

    const el = overlayEl();
    expect(el?.style.transform).toBe('rotate(-90deg)');
    expect(el?.style.transformOrigin).toBe('10px 20px');
  });

  it('[covers:practice-drag-overlay.overlay-style-transform-reflects-rotated] 非回転時はtransformがnoneになる', async () => {
    startOverlay({ rotated: false, offset: { x: 10, y: 20 } });
    wrapper = await mountOverlay();

    const el = overlayEl();
    expect(el?.style.transform).toBe('none');
    expect(el?.style.transformOrigin).toBe('10px 20px');
  });
});
