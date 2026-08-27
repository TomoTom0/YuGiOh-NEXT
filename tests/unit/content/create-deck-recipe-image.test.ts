/**
 * createDeckRecipeImage.ts のciid関連テスト【TASK-355】
 *
 * レシピ画像生成時に DeckCardRef.ciid（イラスト違い識別子）が
 * 画像URL生成に正しく反映されることを検証する。
 *
 * 画像の実際の描画はモックし、getCardImageUrl へ渡される ciid 引数を検証する。
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

import { createDeckRecipeImage } from '@/content/deck-recipe/createDeckRecipeImage';

// happy-dom は Canvas 2D コンテキストを提供しないため、
// document.createElement('canvas') のみスタブに差し替える（描画結果は検証対象外）
const noop = () => {};
const stubCtx = new Proxy({}, {
  get: (_target, prop) => {
    if (prop === 'createLinearGradient') {
      return () => ({ addColorStop: noop });
    }
    return noop;
  },
  set: () => true
});
const stubCanvas = {
  width: 0,
  height: 0,
  getContext: () => stubCtx,
  toBlob: (callback: (blob: Blob | null) => void) => callback(new Blob(['png'], { type: 'image/png' }))
};
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
  tag === 'canvas' ? (stubCanvas as unknown as HTMLElement) : originalCreateElement(tag)
);

// loadImage() 内の new Image() は happy-dom では实际にロードしないため、
// onload が即座に発火するスタブ画像に差し替える
class StubImage {
  onload: (() => void) | null = null;
  onerror: ((_e: unknown) => void) | null = null;
  src = '';
  set _src(value: string) { this.src = value; }
  constructor() {
    setTimeout(() => this.onload?.(), 0);
  }
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
