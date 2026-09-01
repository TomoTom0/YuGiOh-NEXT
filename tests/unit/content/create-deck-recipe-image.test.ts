/**
 * createDeckRecipeImage.ts のテスト
 *
 * ciid関連のテスト【TASK-355】に加え、tests/design/create-deck-recipe-image/conditions.toml
 * (TASK-330) のconditionをカバーする。
 *
 * 画像の実際の描画はモックし、getCardImageUrl へ渡される ciid 引数や
 * canvas 2Dコンテキストへの呼び出し内容を検証する。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DeckInfo } from '@/types/deck';

// getCardImageUrl の呼び出しを記録するモック
const mockGetCardImageUrl = vi.fn(
  (card: { cardId: string; ciid: string }, _gameType: unknown, ciid?: string) =>
    `/yugiohdb/get_image.action?cid=${card.cardId}&ciid=${ciid ?? card.ciid}&enc=hash`
);

vi.mock('@/types/card', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/types/card')>();
  return {
    ...original,
    getCardImageUrl: (...args: Parameters<typeof original.getCardImageUrl>) =>
      mockGetCardImageUrl(...args)
  };
});

// TempCacheDB: cid単位でカードを保持（代表ciidは imgs[0]）
const mockCardCache = new Map<string, { cardId: string; ciid: string; imgs: Array<{ ciid: string; imgHash: string }> }>();
vi.mock('@/utils/temp-cache-db', () => ({
  getTempCacheDB: () => ({
    get: (cid: string) => mockCardCache.get(cid),
    set: (cid: string, card: { cardId: string }) => {
      mockCardCache.set(cid, card as never);
      return true;
    }
  }),
  recordDeckOpen: vi.fn(),
}));

// UnifiedCacheDB: TempCacheDBにないカードのフォールバック
const mockUnifiedCards = new Map<string, { cardId: string; ciid: string; imgs: Array<{ ciid: string; imgHash: string }> }>();
vi.mock('@/utils/unified-cache-db', () => ({
  getUnifiedCacheDB: () => ({
    reconstructCardInfo: (cid: string) => mockUnifiedCards.get(cid)
  }),
}));

import { createDeckRecipeImage, generateDefaultFooterText } from '@/content/deck-recipe/createDeckRecipeImage';

// happy-dom は Canvas 2D コンテキストを提供しないため、
// document.createElement('canvas') のみスタブに差し替える。
// fillStyle設定・fillText/strokeText/drawImage/fillRect呼び出しは記録し、テストで検証する。
const noop = () => {};
function createStubCtx() {
  const fillStyleHistory: unknown[] = [];
  const fillTextCalls: unknown[][] = [];
  const strokeTextCalls: unknown[][] = [];
  const drawImageCalls: unknown[][] = [];
  const fillRectCalls: unknown[][] = [];
  const strokeRectCalls: unknown[][] = [];
  const strokeRectStrokeStyles: unknown[] = [];
  let currentFillStyle = '';
  let currentStrokeStyle = '';
  const strokeStyleHistory: unknown[] = [];
  const ctx = new Proxy({}, {
    get: (_target, prop) => {
      if (prop === 'fillStyle') return currentFillStyle;
      if (prop === 'strokeStyle') return currentStrokeStyle;
      if (prop === 'createLinearGradient') return () => ({ addColorStop: noop });
      if (prop === 'fillText') return (...args: unknown[]) => { fillTextCalls.push(args); };
      if (prop === 'strokeText') return (...args: unknown[]) => { strokeTextCalls.push(args); };
      if (prop === 'drawImage') return (...args: unknown[]) => { drawImageCalls.push(args); };
      if (prop === 'fillRect') return (...args: unknown[]) => { fillRectCalls.push(args); };
      if (prop === 'strokeRect') return (...args: unknown[]) => {
        strokeRectCalls.push(args);
        strokeRectStrokeStyles.push(currentStrokeStyle);
      };
      return noop;
    },
    set: (_target, prop, value) => {
      if (prop === 'fillStyle') {
        currentFillStyle = value as string;
        fillStyleHistory.push(value);
      }
      if (prop === 'strokeStyle') {
        currentStrokeStyle = value as string;
        strokeStyleHistory.push(value);
      }
      return true;
    }
  });
  return {
    ctx,
    fillStyleHistory,
    strokeStyleHistory,
    fillTextCalls,
    strokeTextCalls,
    drawImageCalls,
    fillRectCalls,
    strokeRectCalls,
    strokeRectStrokeStyles
  };
}

let stubCtxBundle = createStubCtx();
let getContextReturnsNull = false;
let toBlobReturnsNull = false;
const stubCanvas = {
  width: 0,
  height: 0,
  getContext: () => (getContextReturnsNull ? null : stubCtxBundle.ctx),
  toBlob: (callback: (blob: Blob | null) => void) =>
    callback(toBlobReturnsNull ? null : new Blob(['png'], { type: 'image/png' }))
};
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
  tag === 'canvas' ? (stubCanvas as unknown as HTMLElement) : originalCreateElement(tag)
);

// loadImage() 内の new Image() は happy-dom では实际にロードしないため、
// onload/onerror を制御可能なスタブ画像に差し替える。
// imageErrorIndices に含まれる呼び出し順(0始まり)の Image だけ onerror を発火する。
let imageCallCount = 0;
let imageErrorIndices = new Set<number>();
class StubImage {
  onload: (() => void) | null = null;
  onerror: ((_e: unknown) => void) | null = null;
  src = '';
  private index: number;
  constructor() {
    this.index = imageCallCount++;
    setTimeout(() => {
      if (imageErrorIndices.has(this.index)) {
        this.onerror?.(new Event('error'));
      } else {
        this.onload?.();
      }
    }, 0);
  }
  set _src(value: string) { this.src = value; }
}
vi.stubGlobal('Image', StubImage);

const makeDeckInfo = (mainDeck: Array<{ cid: string; ciid: string; quantity: number }>): DeckInfo => ({
  dno: 1,
  name: 'テストデッキ',
  mainDeck,
  extraDeck: [],
  sideDeck: [],
  category: [],
  tags: [],
  comment: '',
  deckCode: ''
});

describe('createDeckRecipeImage - ciidの扱い【TASK-355】', () => {
  beforeEach(() => {
    mockGetCardImageUrl.mockClear();
    mockCardCache.clear();
    mockUnifiedCards.clear();
  });

  it('イラスト違い（同cid・ciid違い）がdeckDataに混在する場合、各ciidの画像URLが生成される', async () => {
    // TempCacheDB の代表ciidは '1'（imgs[0]）。ciid=2 はイラスト違い。
    mockCardCache.set('5555', {
      cardId: '5555',
      ciid: '1',
      imgs: [
        { ciid: '1', imgHash: '5555_1_1_1' },
        { ciid: '2', imgHash: '5555_2_1_1' }
      ]
    });

    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: makeDeckInfo([
        { cid: '5555', ciid: '1', lang: 'ja', quantity: 1 },
        { cid: '5555', ciid: '2', lang: 'ja', quantity: 2 }
      ]),
      color: 'red',
      includeQR: false,
      scale: 1
    });

    // ciid=1 と ciid=2 の両方でURL生成が呼ばれる（代表ciid=1に潰されない）
    const requestedCiids = mockGetCardImageUrl.mock.calls.map(c => c[2]);
    expect(requestedCiids).toContain('1');
    expect(requestedCiids).toContain('2');
  });

  it('TempCacheDBにないカードはUnifiedCacheDBからフォールバックして画像URLを生成する', async () => {
    // TempCacheDBにはなく、UnifiedCacheDBにのみ存在
    mockUnifiedCards.set('7777', {
      cardId: '7777',
      ciid: '1',
      imgs: [{ ciid: '1', imgHash: '7777_1_1_1' }]
    });

    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: makeDeckInfo([
        { cid: '7777', ciid: '1', lang: 'ja', quantity: 1 }
      ]),
      color: 'red',
      includeQR: false,
      scale: 1
    });

    expect(mockGetCardImageUrl).toHaveBeenCalled();
    expect(mockGetCardImageUrl.mock.calls[0]?.[0]).toMatchObject({ cardId: '7777' });
  });
});

describe('createDeckRecipeImage - conditions.toml (TASK-330)', () => {
  beforeEach(() => {
    mockGetCardImageUrl.mockClear();
    mockCardCache.clear();
    mockUnifiedCards.clear();
    stubCtxBundle = createStubCtx();
    getContextReturnsNull = false;
    toBlobReturnsNull = false;
    imageCallCount = 0;
    imageErrorIndices = new Set();
    stubCanvas.width = 0;
    stubCanvas.height = 0;
  });

  it('[covers:create_deck_recipe.throws_when_deckdata_missing] deckDataが未指定の場合throwする', async () => {
    await expect(
      createDeckRecipeImage({
        cgid: 'testcgid',
        dno: '1',
        deckData: undefined as never,
        color: 'red',
        includeQR: false,
        scale: 1
      })
    ).rejects.toThrow('deckData is required');
  });

  it('[covers:create_deck_recipe.card_not_found_in_either_cache_skipped] どちらのキャッシュにもないカードは結果から除外され、エラーにならない', async () => {
    mockCardCache.set('5555', {
      cardId: '5555',
      ciid: '1',
      imgs: [{ ciid: '1', imgHash: '5555_1_1_1' }]
    });

    await expect(
      createDeckRecipeImage({
        cgid: 'testcgid',
        dno: '1',
        deckData: makeDeckInfo([
          { cid: '9999', ciid: '1', lang: 'ja', quantity: 1 }, // どちらのキャッシュにも無い
          { cid: '5555', ciid: '1', lang: 'ja', quantity: 1 }
        ]),
        color: 'red',
        includeQR: false,
        scale: 1
      })
    ).resolves.toBeDefined();

    // 見つかった5555のみ画像URL生成が呼ばれる（9999はスキップされる）
    expect(mockGetCardImageUrl).toHaveBeenCalledTimes(1);
    expect(mockGetCardImageUrl.mock.calls[0]?.[0]).toMatchObject({ cardId: '5555' });
  });

  it('[covers:create_deck_recipe.card_found_but_no_image_url_skipped] getCardImageUrlがfalsyを返すカードは結果から除外される', async () => {
    mockCardCache.set('5555', {
      cardId: '5555',
      ciid: '1',
      imgs: [{ ciid: '1', imgHash: '5555_1_1_1' }]
    });
    mockGetCardImageUrl.mockReturnValueOnce(undefined as unknown as string);

    await expect(
      createDeckRecipeImage({
        cgid: 'testcgid',
        dno: '1',
        deckData: makeDeckInfo([{ cid: '5555', ciid: '1', lang: 'ja', quantity: 1 }]),
        color: 'red',
        includeQR: false,
        scale: 1
      })
    ).resolves.toBeDefined();

    // drawImageは呼ばれない（画像エントリが無いため）
    expect(stubCtxBundle.drawImageCalls.length).toBe(0);
  });

  it('[covers:create_deck_recipe.quantity_expands_to_multiple_entries] quantity分だけ画像描画が行われる', async () => {
    mockCardCache.set('5555', {
      cardId: '5555',
      ciid: '1',
      imgs: [{ ciid: '1', imgHash: '5555_1_1_1' }]
    });

    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: makeDeckInfo([{ cid: '5555', ciid: '1', lang: 'ja', quantity: 3 }]),
      color: 'red',
      includeQR: false,
      scale: 1
    });

    // カードバック分を除き、カード画像自体のdrawImageが3回呼ばれる
    const cardImageDraws = stubCtxBundle.drawImageCalls.filter(args => args[3] !== undefined);
    expect(cardImageDraws.length).toBeGreaterThanOrEqual(3);
  });

  it('[covers:create_deck_recipe.empty_sections_excluded_from_canvas_height] extra/sideが空の場合、そのセクション分の高さが加算されない', async () => {
    mockCardCache.set('5555', {
      cardId: '5555',
      ciid: '1',
      imgs: [{ ciid: '1', imgHash: '5555_1_1_1' }]
    });

    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: makeDeckInfo([{ cid: '5555', ciid: '1', lang: 'ja', quantity: 1 }]),
      color: 'red',
      includeQR: false,
      scale: 1
    });
    const heightWithMainOnly = stubCanvas.height;

    // main/extra/side全て1枚ずつの場合、mainのみより高さが大きくなる
    stubCtxBundle = createStubCtx();
    imageCallCount = 0;
    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: {
        ...makeDeckInfo([{ cid: '5555', ciid: '1', lang: 'ja', quantity: 1 }]),
        extraDeck: [{ cid: '5555', ciid: '1', lang: 'ja', quantity: 1 }],
        sideDeck: [{ cid: '5555', ciid: '1', lang: 'ja', quantity: 1 }]
      },
      color: 'red',
      includeQR: false,
      scale: 1
    });
    expect(stubCanvas.height).toBeGreaterThan(heightWithMainOnly);
  });

  it('[covers:create_deck_recipe.throws_when_canvas_context_unavailable] canvas.getContext()がnullの場合throwする', async () => {
    getContextReturnsNull = true;

    await expect(
      createDeckRecipeImage({
        cgid: 'testcgid',
        dno: '1',
        deckData: makeDeckInfo([]),
        color: 'red',
        includeQR: false,
        scale: 1
      })
    ).rejects.toThrow('Canvas 2D context not supported');
  });

  it('[covers:create_deck_recipe.includeqr_false_skips_qr_drawing] includeQR=falseの場合QRコードは描画されない', async () => {
    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: makeDeckInfo([]),
      color: 'red',
      includeQR: false,
      scale: 1
    });

    expect(stubCtxBundle.drawImageCalls.length).toBe(0);
  });

  it('[covers:create_deck_recipe.includeqr_true_draws_qr] includeQR=trueの場合QRコード画像が描画される', async () => {
    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: makeDeckInfo([]),
      color: 'red',
      includeQR: true,
      scale: 1
    });

    expect(stubCtxBundle.drawImageCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('[covers:create_deck_recipe.browser_env_rejects_when_blob_null] canvas.toBlobがnullを渡す場合rejectする', async () => {
    toBlobReturnsNull = true;

    await expect(
      createDeckRecipeImage({
        cgid: 'testcgid',
        dno: '1',
        deckData: makeDeckInfo([]),
        color: 'red',
        includeQR: false,
        scale: 1
      })
    ).rejects.toThrow('Failed to convert canvas to blob');
  });

  it('[covers:create_deck_recipe.browser_env_resolves_blob_on_success] canvas.toBlobが成功時、生成されたBlobでresolveする', async () => {
    const result = await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: makeDeckInfo([]),
      color: 'red',
      includeQR: false,
      scale: 1
    });

    expect(result).toBeInstanceOf(Blob);
  });

  it('[covers:draw_card_section.cardback_skipped_when_chrome_runtime_id_missing] chrome.runtime.id未設定時はカードバック画像を描画せずエラーにもならない（テスト環境のデフォルト状態）', async () => {
    mockCardCache.set('5555', {
      cardId: '5555',
      ciid: '1',
      imgs: [{ ciid: '1', imgHash: '5555_1_1_1' }]
    });

    // tests/setup.tsのglobal.chromeモックはruntime.idを持たないため、
    // chrome拡張機能環境の分岐にもNode.js環境の分岐にも該当しない
    await expect(
      createDeckRecipeImage({
        cgid: 'testcgid',
        dno: '1',
        deckData: makeDeckInfo([{ cid: '5555', ciid: '1', lang: 'ja', quantity: 1 }]),
        color: 'red',
        includeQR: false,
        scale: 1
      })
    ).resolves.toBeDefined();

    // 画像自体のdrawImageは呼ばれるがカードバック分は無いため、drawImage呼び出し回数はカード画像の分のみ
    expect(stubCtxBundle.drawImageCalls.length).toBe(1);
  });

  it('[covers:draw_card_section.cardback_load_failure_warns_and_continues] chrome拡張機能環境でカードバック画像読み込みが失敗してもthrowせず処理を継続する', async () => {
    mockCardCache.set('5555', {
      cardId: '5555',
      ciid: '1',
      imgs: [{ ciid: '1', imgHash: '5555_1_1_1' }]
    });
    // chrome.runtime.idを設定し、chrome拡張機能環境の分岐に入らせる
    const chromeRuntime = (global as unknown as { chrome: { runtime: { id?: string } } }).chrome.runtime;
    chromeRuntime.id = 'test-extension-id';
    // 最初に読み込まれるImage呼び出し(カードバック)だけ失敗させる
    imageErrorIndices = new Set([0]);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      createDeckRecipeImage({
        cgid: 'testcgid',
        dno: '1',
        deckData: makeDeckInfo([{ cid: '5555', ciid: '1', lang: 'ja', quantity: 1 }]),
        color: 'red',
        includeQR: false,
        scale: 1
      })
    ).resolves.toBeDefined();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    delete chromeRuntime.id;
  });

  it('[covers:load_image.browser_rejects_on_error] カード画像自体の読み込み失敗はcatchされずrejectする', async () => {
    mockCardCache.set('5555', {
      cardId: '5555',
      ciid: '1',
      imgs: [{ ciid: '1', imgHash: '5555_1_1_1' }]
    });
    // chrome.runtime.id未設定のためカードバックはImage()を呼ばない。最初の呼び出し(index0)はカード画像自体
    imageErrorIndices = new Set([0]);

    await expect(
      createDeckRecipeImage({
        cgid: 'testcgid',
        dno: '1',
        deckData: makeDeckInfo([{ cid: '5555', ciid: '1', lang: 'ja', quantity: 1 }]),
        color: 'red',
        includeQR: false,
        scale: 1
      })
    ).rejects.toThrow('Failed to load image from');
  });

  const BADGE_COLORS = ['#f9a825', '#ef6c00', '#c62828'];

  it('[covers:draw_card_section.genesys_points_undefined_no_badge] genesysPoints未指定の場合バッジ色は使われない', async () => {
    mockCardCache.set('5555', {
      cardId: '5555',
      ciid: '1',
      imgs: [{ ciid: '1', imgHash: '5555_1_1_1' }]
    });

    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: makeDeckInfo([{ cid: '5555', ciid: '1', lang: 'ja', quantity: 1 }]),
      color: 'red',
      includeQR: false,
      scale: 1
    });

    expect(stubCtxBundle.fillStyleHistory.some(c => BADGE_COLORS.includes(c as string))).toBe(false);
  });

  it('[covers:draw_card_section.genesys_point_zero_or_missing_no_badge] genesysPointsが0または未定義のカードにバッジ色は使われない', async () => {
    mockCardCache.set('5555', {
      cardId: '5555',
      ciid: '1',
      imgs: [{ ciid: '1', imgHash: '5555_1_1_1' }]
    });

    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: makeDeckInfo([{ cid: '5555', ciid: '1', lang: 'ja', quantity: 1 }]),
      color: 'red',
      includeQR: false,
      scale: 1,
      genesysPoints: { '5555': 0 }
    });

    expect(stubCtxBundle.fillStyleHistory.some(c => BADGE_COLORS.includes(c as string))).toBe(false);
  });

  it.each([
    [4, '#f9a825'],
    [9, '#ef6c00'],
    [10, '#c62828']
  ])(
    '[covers:draw_genesys_badge][covers:draw_card_section.genesys_point_positive_draws_badge] pt=%iの場合バッジ色は%s',
    async (pt, expectedColor) => {
      mockCardCache.set('5555', {
        cardId: '5555',
        ciid: '1',
        imgs: [{ ciid: '1', imgHash: '5555_1_1_1' }]
      });

      await createDeckRecipeImage({
        cgid: 'testcgid',
        dno: '1',
        deckData: makeDeckInfo([{ cid: '5555', ciid: '1', lang: 'ja', quantity: 1 }]),
        color: 'red',
        includeQR: false,
        scale: 1,
        genesysPoints: { '5555': pt }
      });

      expect(stubCtxBundle.fillRectCalls.length).toBeGreaterThanOrEqual(1);
      expect(stubCtxBundle.fillStyleHistory).toContain(expectedColor);
    }
  );

  it('[covers:draw_qr_code.non_public_deck_draws_hidden_overlay] 非公開デッキの場合HIDDENテキストが描画される', async () => {
    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: { ...makeDeckInfo([]), isPublic: false },
      color: 'red',
      includeQR: true,
      scale: 1
    });

    expect(stubCtxBundle.strokeTextCalls.filter(args => args[0] === 'HIDDEN').length).toBe(2);
    expect(stubCtxBundle.fillTextCalls.filter(args => args[0] === 'HIDDEN').length).toBe(1);
  });

  it('[covers:draw_qr_code.public_deck_skips_hidden_text] 公開デッキの場合HIDDENテキストは描画されない', async () => {
    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: { ...makeDeckInfo([]), isPublic: true },
      color: 'red',
      includeQR: true,
      scale: 1
    });

    expect(stubCtxBundle.strokeTextCalls.filter(args => args[0] === 'HIDDEN').length).toBe(0);
    expect(stubCtxBundle.fillTextCalls.filter(args => args[0] === 'HIDDEN').length).toBe(0);
  });

  it('[covers:draw_qr_code.error_swallowed_and_logged] QRコード生成失敗時もthrowせずconsole.errorでログする', async () => {
    const qrcodeModule = await import('qrcode');
    const toDataURLSpy = vi
      .spyOn(qrcodeModule.default, 'toDataURL')
      .mockRejectedValueOnce(new Error('qr generation failed'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      createDeckRecipeImage({
        cgid: 'testcgid',
        dno: '1',
        deckData: makeDeckInfo([]),
        color: 'red',
        includeQR: true,
        scale: 1
      })
    ).resolves.toBeDefined();

    expect(errorSpy).toHaveBeenCalled();
    toDataURLSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('[covers:draw_outer_border.export_does_not_draw_canvas_border] エクスポートされる画像自体には縁取りを焼き込まない（プレビュー表示側のCSS borderのみで表現する）', async () => {
    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: makeDeckInfo([]),
      color: 'red',
      includeQR: false,
      scale: 2
    });

    // TASK-390: TASK-379で追加したdrawOuterBorder(canvas全体をstrokeRectで縁取り)は、
    // 「dialogのプレビュー表示に枠線をつける」という意図をエクスポート画像自体への焼き込みと誤って実装したもの。
    // ダウンロードされるPNGには枠線を含めない。
    expect(stubCtxBundle.strokeRectCalls.length).toBe(0);
  });

  it('[covers:draw_timestamp.footer_text_option_overrides_default] footerTextを指定した場合、そのテキストがそのまま描画される', async () => {
    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: makeDeckInfo([]),
      color: 'red',
      includeQR: false,
      scale: 1,
      footerText: 'カスタムフッター'
    });

    expect(stubCtxBundle.fillTextCalls.some(args => args[0] === 'カスタムフッター')).toBe(true);
  });

  it('[covers:draw_timestamp.footer_text_option_omitted_uses_default] footerTextを省略した場合、"exported on yyyy-mm-dd"形式のデフォルト値が描画される', async () => {
    await createDeckRecipeImage({
      cgid: 'testcgid',
      dno: '1',
      deckData: makeDeckInfo([]),
      color: 'red',
      includeQR: false,
      scale: 1
    });

    expect(stubCtxBundle.fillTextCalls.some(args => args[0] === generateDefaultFooterText())).toBe(true);
  });
});
