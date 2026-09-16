/**
 * ユニットテスト: src/utils/image-dialog-layout.ts（TASK-511）
 *
 * デッキ画像作成ダイアログの位置・サイズ計算純関数（computeImageDialogLayout）の検証。
 * 仕様の正本: tests/design/image-dialog-layout/conditions.toml
 * （出典: TASK-511設計書v2 tmp/20260916_design_task511_image-dialog-layout.md）
 *
 * テスト先行（設計書§8）: 実装前に作成しているため、本ファイルはmodule解決errorの
 * red状態で作成される。実装（src/utils/image-dialog-layout.ts 新規作成）後にgreen化する。
 *
 * 全パターンで設計書§2のクランプ保証
 * （left+width <= vw-VIEWPORT_MARGIN かつ top+maxHeight <= vh-VIEWPORT_MARGIN）
 * を共通helperでassertする。数値例は設計書§1/§2の検証例
 * （vw=1280/vh=800典型・vh=160・vw=360）を使用する。
 * FP誤差を吸収するため、期待値はtoBeCloseTo（精度6）・収束判定は1e-6の許容付き。
 */

import { describe, it, expect } from 'vitest';
import {
  computeImageDialogLayout,
  isFiniteDialogAnchorRect,
  VIEWPORT_MARGIN,
  MIN_VIEWPORT_WIDTH,
  MIN_VIEWPORT_HEIGHT,
  type ImageDialogLayout,
} from '@/utils/image-dialog-layout';

/** 設計書§2のクランプ保証: 全パターンで画面内に収束することを検証する */
function expectWithinViewport(layout: ImageDialogLayout, vw: number, vh: number): void {
  expect(layout.left + layout.width).toBeLessThanOrEqual(vw - VIEWPORT_MARGIN + 1e-6);
  expect(layout.top + layout.maxHeight).toBeLessThanOrEqual(vh - VIEWPORT_MARGIN + 1e-6);
}

describe('computeImageDialogLayout', () => {
  it('[covers:layout.scale-keeps-1-when-content-fits] コンテンツ幅+paddingが外枠上限内なら縮小なし', () => {
    // vw=1280 → 外枠上限=min(1280-32, 640)=640。600+40=640 がちょうど収まる境界
    const boundary = computeImageDialogLayout({
      viewport: { width: 1280, height: 800 },
      contentWidth: 600,
      buttonRect: null,
    });
    expect(boundary.scale).toBe(1);
    expect(boundary.contentWidth).toBeCloseTo(600, 6);
    expect(boundary.width).toBeCloseTo(640, 6);
    expect(boundary.maxHeight).toBeCloseTo(680, 6);
    expectWithinViewport(boundary, 1280, 800);

    // 上限に余裕がある場合も縮小しない（scale=min(1,600/500)の1打ち切り）
    const comfortable = computeImageDialogLayout({
      viewport: { width: 1280, height: 800 },
      contentWidth: 500,
      buttonRect: null,
    });
    expect(comfortable.scale).toBe(1);
    expect(comfortable.contentWidth).toBeCloseTo(500, 6);
    expect(comfortable.width).toBeCloseTo(540, 6);
    expectWithinViewport(comfortable, 1280, 800);
  });

  it('[covers:layout.scale-shrinks-content-width-to-fit] 上限超過時はコンテンツ幅基準で縮小（paddingは縮小対象外）', () => {
    // 設計書§1/§2の典型例: 生成画像幅750 → scale=600/750=0.8、外枠=600+40=640
    const layout = computeImageDialogLayout({
      viewport: { width: 1280, height: 800 },
      contentWidth: 750,
      buttonRect: null,
    });
    expect(layout.scale).toBeCloseTo(0.8, 6);
    expect(layout.contentWidth).toBeCloseTo(600, 6);
    // 外枠幅=contentWidth*scale+2*padding（border-box。paddingは常に実px）
    expect(layout.width).toBeCloseTo(640, 6);
    // 高さはscaleで詰めない: maxHeightはviewport基準の上限のみ
    expect(layout.maxHeight).toBeCloseTo(680, 6);
    expectWithinViewport(layout, 1280, 800);
  });

  it('[covers:layout.max-height-normalized-on-short-viewport] 低viewportではmaxHeight=vh-32に正規化', () => {
    // 設計書§2の検証例: vh=160 → maxHeight=min(160*0.85=136, 160-32=128)=128
    const layout = computeImageDialogLayout({
      viewport: { width: 1280, height: 160 },
      contentWidth: 750,
      buttonRect: null,
    });
    expect(layout.maxHeight).toBeCloseTo(128, 6);
    // clampY上限=160-128-16=16。中央配置Y=(160-128)/2=16=上限そのもの
    expect(layout.top).toBeCloseTo(16, 6);
    // top+maxHeight=144=vh-16 で収まる（正規化によりclampY上限>=16が成立）
    expectWithinViewport(layout, 1280, 160);
  });

  it('[covers:layout.center-without-button-rect] buttonRect無しは実dialog幅で画面中央', () => {
    const layout = computeImageDialogLayout({
      viewport: { width: 1280, height: 800 },
      contentWidth: 750,
      buttonRect: null,
    });
    expect(layout.placement).toBe('center');
    // 旧フォールバック（innerWidth/2-200）ではなく実dialog幅（640）基準の中央
    expect(layout.top).toBeCloseTo(60, 6); // clampY((800-680)/2=60)
    expect(layout.left).toBeCloseTo(320, 6); // clampX((1280-640)/2=320)
    expectWithinViewport(layout, 1280, 800);
  });

  it('[covers:layout.below-button-when-fits] ボタン直下にmaxHeight分確保できる場合はbelow', () => {
    const layout = computeImageDialogLayout({
      viewport: { width: 1280, height: 800 },
      contentWidth: 750,
      buttonRect: { top: 50, bottom: 80, left: 100, right: 140 },
    });
    expect(layout.placement).toBe('below');
    // 希望位置top=80+BUTTON_GAP(8)=88。88+680=768 <= 784 でbelowが成立
    expect(layout.top).toBeCloseTo(88, 6);
    expect(layout.left).toBeCloseTo(100, 6); // clampX(100)=100
    expectWithinViewport(layout, 1280, 800);
  });

  it('[covers:layout.flips-above-when-no-space-below] 下に置けない場合は上へフリップ（設計書§2典型例）', () => {
    // デッキ表示ページ典型: ボタンが右下（rect top=740/bottom=776/left=1180）
    const layout = computeImageDialogLayout({
      viewport: { width: 1280, height: 800 },
      contentWidth: 750,
      buttonRect: { top: 740, bottom: 776, left: 1180, right: 1216 },
    });
    expect(layout.placement).toBe('above');
    // below希望=784で784+680>784のため不可 → top=740-8-680=52（ボタン直上）
    expect(layout.top).toBeCloseTo(52, 6);
    // 右端のため右寄せ: clampX(1180)=1280-640-16=624
    expect(layout.left).toBeCloseTo(624, 6);
    expectWithinViewport(layout, 1280, 800);
  });

  it('[covers:layout.clamps-bottom-when-no-space-either-side] 上下どちらにも置けない場合は下端クランプ', () => {
    // below: 444+680=1124>784で不可 / above: 400-8-680=-288<16で不可
    const layout = computeImageDialogLayout({
      viewport: { width: 1280, height: 800 },
      contentWidth: 750,
      buttonRect: { top: 400, bottom: 436, left: 100, right: 140 },
    });
    expect(layout.placement).toBe('clamped');
    // clampY(444)=800-680-16=104。top+maxHeight=784=vh-16で収まる
    expect(layout.top).toBeCloseTo(104, 6);
    expect(layout.left).toBeCloseTo(100, 6);
    expectWithinViewport(layout, 1280, 800);
  });

  it('[covers:layout.clamps-within-viewport-left-right] 右端ボタンは右寄せ（狭画面でもclampX上限>=MARGIN）', () => {
    // 設計書§2の検証例: vw=360 → 外枠上限=328、clampX上限=360-328-16=16
    const layout = computeImageDialogLayout({
      viewport: { width: 360, height: 800 },
      contentWidth: 750,
      buttonRect: { top: 50, bottom: 80, left: 350, right: 390 },
    });
    // scale=288/750でcontentWidth=288、外枠=328
    expect(layout.scale).toBeCloseTo(288 / 750, 6);
    expect(layout.width).toBeCloseTo(328, 6);
    // 88+680=768<=784でbelowはそのまま成立
    expect(layout.placement).toBe('below');
    expect(layout.top).toBeCloseTo(88, 6);
    // left=clampX(350)=16（上限そのもの）。left+width=344=vw-16
    expect(layout.left).toBeCloseTo(16, 6);
    expectWithinViewport(layout, 360, 800);
  });

  it('[covers:layout.falls-back-to-center-when-button-rect-nonfinite] 非有限buttonRectは中央配置へフォールバック', () => {
    // 型ガード: 全フィールド有限ならtrue、1つでも非有限（NaN/Infinity）ならfalse
    expect(isFiniteDialogAnchorRect({ top: 740, bottom: 776, left: 1180, right: 1216 })).toBe(true);
    expect(isFiniteDialogAnchorRect({ top: 740, bottom: 776, left: NaN, right: 1216 })).toBe(false);
    expect(isFiniteDialogAnchorRect({ top: 740, bottom: Infinity, left: 1180, right: 1216 })).toBe(false);

    // 非有限rectはnull扱いとなり中央配置へフォールバック（layout.center-without-button-rectと同一結果）
    const layout = computeImageDialogLayout({
      viewport: { width: 1280, height: 800 },
      contentWidth: 750,
      buttonRect: { top: 740, bottom: 776, left: NaN, right: 1216 },
    });
    expect(layout.placement).toBe('center');
    expect(layout.top).toBeCloseTo(60, 6);
    expect(layout.left).toBeCloseTo(320, 6);
    expectWithinViewport(layout, 1280, 800);
  });

  it('[covers:layout.zero-content-width-yields-padding-only-width] contentWidth=0はpaddingのみの幅（throwしない）', () => {
    // 画像生成完了前（displayWidth初期0）の初期評価到達経路。
    // scale=min(1,(640-40)/0)=1で打ち切り、外枠は2*DIALOG_PADDING=40のみ
    const layout = computeImageDialogLayout({
      viewport: { width: 1280, height: 800 },
      contentWidth: 0,
      buttonRect: null,
    });
    expect(layout.scale).toBe(1);
    expect(layout.contentWidth).toBe(0);
    expect(layout.width).toBeCloseTo(40, 6);
    expectWithinViewport(layout, 1280, 800);
  });

  it('[covers:layout.normalizes-tiny-viewport-to-minimum] 極端小viewportはMIN_VIEWPORT_*へ防御的正規化される', () => {
    // 実装レビュー必須修正: 正規化なしだと vw=40 では width=40>vw-32=8 で左端クランプ保証が、
    // vh=20 では maxHeight=min(17,-12)=-12 でY保証が崩れる。冒頭の正規化でいずれも発生しない
    const layout = computeImageDialogLayout({
      viewport: { width: 40, height: 20 },
      contentWidth: 750,
      buttonRect: null,
    });
    // 正規化後 vw=72/vh=32（MIN_VIEWPORT_WIDTH=2*16+2*20・MIN_VIEWPORT_HEIGHT=2*16）
    expect(MIN_VIEWPORT_WIDTH).toBe(72);
    expect(MIN_VIEWPORT_HEIGHT).toBe(32);
    // maxDialogWidth=72-32=40、scale=max(0,min(1,(40-40)/750))=0、外枠はpaddingのみ=40
    expect(layout.scale).toBe(0);
    expect(layout.width).toBeCloseTo(40, 6);
    // maxHeightは正規化により負値にならない: min(32*0.85=27.2, 32-32=0)=0
    expect(layout.maxHeight).toBeCloseTo(0, 6);
    // 正規化後viewportでの中央配置: clampY((32-0)/2=16)、clampX((72-40)/2=16)
    expect(layout.top).toBeCloseTo(16, 6);
    expect(layout.left).toBeCloseTo(16, 6);
    // 正規化後の座標系ではleft+width=56=72-16・top+maxHeight=16=32-16で収束
    expectWithinViewport(layout, MIN_VIEWPORT_WIDTH, MIN_VIEWPORT_HEIGHT);
  });
});
