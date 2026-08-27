import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateDeckThumbnailCards, generateDeckThumbnailImage } from '../deck-thumbnail';
import type { DeckInfo, DeckCardRef } from '@/types/deck';
import * as cardUtils from '../card-utils';
import * as pageDetector from '@/utils/page-detector';
import * as cardTypes from '@/types/card';
import * as urlBuilder from '@/utils/url-builder';

// card-utils.getCardInfo をモック
vi.mock('../card-utils', () => ({
  getCardInfo: vi.fn((cid: string) => {
    // テスト用のカード情報を返す
    const cardType = cid.startsWith('m') ? 'monster' : cid.startsWith('s') ? 'spell' : 'trap';
    const baseCard = {
      cardId: cid,
      name: `Card ${cid}`,
      cardType,
      ciid: '1',
      lang: 'ja',
      imgs: []
    };

    // モンスターの場合は types プロパティを追加
    if (cardType === 'monster') {
      return {
        ...baseCard,
        types: cid.startsWith('e') ? ['effect'] : ['effect'],
        levelValue: 4
      };
    }

    return baseCard;
  })
}));

// page-detector.detectCardGameType をモック（generateDeckThumbnailImageのみが使用）
vi.mock('@/utils/page-detector', () => ({
  detectCardGameType: vi.fn(() => 'ocg')
}));

// types/card.getCardImageUrl をモック（generateDeckThumbnailImageのみが使用）
vi.mock('@/types/card', () => ({
  getCardImageUrl: vi.fn()
}));

// url-builder.buildFullUrl をモック（generateDeckThumbnailImageのみが使用）
vi.mock('@/utils/url-builder', () => ({
  buildFullUrl: vi.fn((relativeUrl: string) => `https://example.com${relativeUrl}`)
}));

function makeDeckInfo(overrides: Partial<DeckInfo> = {}): DeckInfo {
  return {
    dno: 1,
    name: 'Test Deck',
    mainDeck: [],
    extraDeck: [],
    sideDeck: [],
    category: [],
    tags: [],
    comment: '',
    deckCode: '',
    ...overrides
  };
}

function makeRef(cid: string, quantity = 1): DeckCardRef {
  return { cid, ciid: '1', lang: 'ja', quantity };
}

/** 保留中のマイクロタスクを全て消化する（setTimeoutのマクロタスク境界まで待つ） */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('deck-thumbnail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDeckThumbnailCards', () => {
    // [covers:cards.count_allocation_without_side_head]
    it('基本ケース: mainから3枚、extraから2枚を選択', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [
          { cid: 'm001', ciid: '1', lang: 'ja', quantity: 3 },
          { cid: 'm002', ciid: '1', lang: 'ja', quantity: 2 },
          { cid: 'm003', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        extraDeck: [
          { cid: 'e001', ciid: '1', lang: 'ja', quantity: 2 },
          { cid: 'e002', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const result = generateDeckThumbnailCards(deckInfo);

      expect(result).toHaveLength(5);
      // mainから3枚（重複排除されるので m001, m002, m003）
      expect(result.filter(r => r.cid.startsWith('m'))).toHaveLength(3);
      // extraから2枚（e001, e002）
      expect(result.filter(r => r.cid.startsWith('e'))).toHaveLength(2);
    });

    // [covers:cards.count_allocation_with_side_head]
    // [covers:cards.side_selection_skipped_when_side_count_zero]
    it('sideに先頭配置がある場合: mainから2枚、extraから2枚、sideから1枚を選択', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [
          { cid: 'm001', ciid: '1', lang: 'ja', quantity: 3 },
          { cid: 'm002', ciid: '1', lang: 'ja', quantity: 2 }
        ],
        extraDeck: [
          { cid: 'e001', ciid: '1', lang: 'ja', quantity: 2 },
          { cid: 'e002', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        sideDeck: [
          { cid: 's001', ciid: '1', lang: 'ja', quantity: 2 },
          { cid: 's002', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      // s001を先頭配置に設定
      const headPlacementCardIds = ['s001'];
      const result = generateDeckThumbnailCards(deckInfo, headPlacementCardIds);

      expect(result).toHaveLength(5);
      // mainから2枚
      expect(result.filter(r => r.cid.startsWith('m'))).toHaveLength(2);
      // extraから2枚
      expect(result.filter(r => r.cid.startsWith('e'))).toHaveLength(2);
      // sideから1枚
      expect(result.filter(r => r.cid.startsWith('s'))).toHaveLength(1);
      // s001が優先されるはず
      expect(result.some(r => r.cid === 's001')).toBe(true);
    });

    // [covers:cards.quantity_field_not_referenced]
    it('重複排除: 同じcidは1枚まで（quantityフィールドは参照されない）', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [
          { cid: 'm001', ciid: '1', lang: 'ja', quantity: 3 } // 3枚
        ],
        extraDeck: [
          { cid: 'e001', ciid: '1', lang: 'ja', quantity: 3 } // 3枚
        ],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const result = generateDeckThumbnailCards(deckInfo);

      // m001は1枚のみ、e001も1枚のみ（計2枚）
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { cid: 'm001', ciid: '1' },
        { cid: 'e001', ciid: '1' }
      ]);
    });

    // [covers:select_cids.stops_when_refs_exhausted_before_max_count]
    it('5枚に満たない場合も許容', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [
          { cid: 'm001', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const result = generateDeckThumbnailCards(deckInfo);

      expect(result).toHaveLength(1);
      expect(result).toEqual([{ cid: 'm001', ciid: '1' }]);
    });

    // [covers:select_cids.pass1_prioritizes_head_placement_in_ref_order]
    // [covers:select_cids.pass1_stops_at_max_count]
    // [covers:select_cids.pass2_fills_remaining_in_ref_order_skipping_selected]
    it('手動先頭配置を優先', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [
          { cid: 'm001', ciid: '1', lang: 'ja', quantity: 1 },
          { cid: 'm002', ciid: '1', lang: 'ja', quantity: 1 },
          { cid: 'm003', ciid: '1', lang: 'ja', quantity: 1 },
          { cid: 'm004', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        extraDeck: [
          { cid: 'e001', ciid: '1', lang: 'ja', quantity: 1 },
          { cid: 'e002', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      // m003, m001 を先頭配置に設定
      const headPlacementCardIds = ['m003', 'm001'];
      const result = generateDeckThumbnailCards(deckInfo, headPlacementCardIds);

      expect(result).toHaveLength(5);
      // mainから3枚選択され、並び順を保ちながら先頭配置が優先される
      // 並び順: m001（先頭配置）、m003（先頭配置）、m002（通常）
      const mainCards = result.filter(r => r.cid.startsWith('m'));
      expect(mainCards[0].cid).toBe('m001'); // 並び順で最初の先頭配置
      expect(mainCards[1].cid).toBe('m003'); // 並び順で次の先頭配置
      expect(mainCards[2].cid).toBe('m002'); // 足りない分は並び順で選ぶ
      expect(mainCards).toHaveLength(3);
    });

    // [covers:cards.empty_deck_returns_empty_array]
    it('空のデッキ', () => {
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Empty Deck',
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      const result = generateDeckThumbnailCards(deckInfo);

      expect(result).toHaveLength(0);
    });

    // [covers:select_cids.pass1_skips_existing_cids]
    // [covers:select_cids.pass2_only_runs_if_under_max_count]
    // [covers:cards.selection_order_side_main_extra_shared_dedup_set]
    it('side→main→extraで同じselectedCids(Set)が共有され、セクションをまたいだ重複cidは後発側でスキップされる', () => {
      // 通常のデッキ構造では同じcidが複数セクションに存在することはないが、
      // selectCidsFromRefsのexistingCids Setがside/main/extraの3呼び出しで共有される
      // という実装挙動を直接検証する
      const deckInfo: DeckInfo = {
        dno: 1,
        name: 'Test Deck',
        mainDeck: [
          { cid: 's001', ciid: '1', lang: 'ja', quantity: 1 }, // sideと同じcid
          { cid: 'm002', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        extraDeck: [],
        sideDeck: [
          { cid: 's001', ciid: '1', lang: 'ja', quantity: 1 }
        ],
        category: [],
        tags: [],
        comment: '',
        deckCode: ''
      };

      // s001をheadPlacementに設定 → sideCount=1でsideから先に選ばれる
      const result = generateDeckThumbnailCards(deckInfo, ['s001']);

      // s001はsideの1枚として選ばれ、mainDeck側では既にexistingCidsにあるためスキップされる
      expect(result.filter(r => r.cid === 's001')).toHaveLength(1);
      expect(result.some(r => r.cid === 'm002')).toBe(true);
    });
  });

  describe('generateDeckThumbnailImage', () => {
    let fakeCtx: { drawImage: ReturnType<typeof vi.fn> };
    let fakeCanvas: {
      width: number;
      height: number;
      getContext: ReturnType<typeof vi.fn>;
      toBlob: ReturnType<typeof vi.fn>;
    };
    let createElementSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    const originalCreateElement = document.createElement.bind(document);

    beforeEach(() => {
      fakeCtx = { drawImage: vi.fn() };
      fakeCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => fakeCtx),
        toBlob: vi.fn((cb: (b: Blob | null) => void) => {
          cb(new Blob(['fake-webp-bytes'], { type: 'image/webp' }));
        })
      };
      createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return fakeCanvas as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tag as keyof HTMLElementTagNameMap);
      });
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // デフォルトのモック実装（各テストで上書き可能）
      vi.mocked(cardUtils.getCardInfo).mockImplementation((cid: string) => ({
        cardId: cid,
        name: `Card ${cid}`,
        cardType: 'monster',
        ciid: '1',
        lang: 'ja',
        imgs: [{ ciid: '1', imgHash: 'hash-abc' }],
        types: ['effect'],
        levelValue: 4
      }) as unknown as ReturnType<typeof cardUtils.getCardInfo>);
      vi.mocked(pageDetector.detectCardGameType).mockReturnValue('ocg');
      vi.mocked(cardTypes.getCardImageUrl).mockReturnValue('/get_image.action?cid=1');
      vi.mocked(urlBuilder.buildFullUrl).mockImplementation((u: string) => `https://example.com${u}`);
    });

    afterEach(() => {
      createElementSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    // [covers:thumb_image.empty_card_ids_returns_null]
    it('空のデッキの場合はnullを返す（canvasは生成されない）', async () => {
      const deckInfo = makeDeckInfo();

      const result = await generateDeckThumbnailImage(deckInfo);

      expect(result).toBeNull();
      expect(createElementSpy).not.toHaveBeenCalled();
    });

    // [covers:thumb_image.ctx_null_returns_null]
    it('canvas.getContext("2d")がnullを返す場合はnullを返す', async () => {
      fakeCanvas.getContext.mockReturnValue(null);
      const deckInfo = makeDeckInfo({ mainDeck: [makeRef('m001')] });

      const result = await generateDeckThumbnailImage(deckInfo);

      expect(result).toBeNull();
    });

    // [covers:thumb_image.canvas_size_based_on_card_count]
    it('canvasのwidth/heightがカード枚数から計算される', async () => {
      const deckInfo = makeDeckInfo({
        mainDeck: [makeRef('m001'), makeRef('m002'), makeRef('m003')]
      });

      await generateDeckThumbnailImage(deckInfo);

      // cardWidth=60, cardHeight=87, gap=2, padding=4
      // width = 3*60 + 2*2 + 4*2 = 192, height = 87 + 4*2 = 95
      expect(fakeCanvas.width).toBe(192);
      expect(fakeCanvas.height).toBe(95);
    });

    // [covers:thumb_image.card_info_missing_skips_card]
    // [covers:thumb_image.promise_all_concurrent_result_discarded]
    it('getCardInfoがnullを返すカードはスキップされても、他の処理は継続し成功する', async () => {
      vi.mocked(cardUtils.getCardInfo).mockImplementation((cid: string) => {
        if (cid === 'm001') return null;
        return {
          cardId: cid,
          name: `Card ${cid}`,
          cardType: 'monster',
          ciid: '1',
          lang: 'ja',
          imgs: [{ ciid: '1', imgHash: 'hash-abc' }],
          types: ['effect'],
          levelValue: 4
        } as unknown as ReturnType<typeof cardUtils.getCardInfo>;
      });
      const deckInfo = makeDeckInfo({
        mainDeck: [makeRef('m001'), makeRef('m002')]
      });

      const result = await generateDeckThumbnailImage(deckInfo);

      expect(result).toMatch(/^data:image\/webp;base64,/);
      // m001はスキップされるが、m002は描画される
      expect(fakeCtx.drawImage).toHaveBeenCalledTimes(1);
    });

    // [covers:thumb_image.relative_url_missing_skips_card]
    it('getCardImageUrlがundefinedを返すカードはスキップされるが処理は継続する', async () => {
      vi.mocked(cardTypes.getCardImageUrl).mockImplementation((card: unknown) => {
        const c = card as { cardId: string };
        return c.cardId === 'm001' ? undefined : '/get_image.action?cid=1';
      });
      const deckInfo = makeDeckInfo({
        mainDeck: [makeRef('m001'), makeRef('m002')]
      });

      const result = await generateDeckThumbnailImage(deckInfo);

      expect(result).toMatch(/^data:image\/webp;base64,/);
      expect(fakeCtx.drawImage).toHaveBeenCalledTimes(1);
    });

    // [covers:thumb_image.delegates_to_load_and_draw_for_valid_card]
    // [covers:load_draw.cross_origin_and_src_set_before_decode]
    // [covers:load_draw.decode_success_draws_and_returns_true]
    it('カード情報・画像URLが揃っている場合、正しい座標でctx.drawImageが呼ばれる', async () => {
      const deckInfo = makeDeckInfo({
        mainDeck: [makeRef('m001'), makeRef('m002'), makeRef('m003')]
      });

      await generateDeckThumbnailImage(deckInfo);

      expect(fakeCtx.drawImage).toHaveBeenCalledTimes(3);
      // index=0: x = 4 + 0*(60+2) = 4, y = 4
      expect(fakeCtx.drawImage).toHaveBeenNthCalledWith(1, expect.anything(), 4, 4, 60, 87);
      // index=1: x = 4 + 1*(60+2) = 66
      expect(fakeCtx.drawImage).toHaveBeenNthCalledWith(2, expect.anything(), 66, 4, 60, 87);
      // index=2: x = 4 + 2*(60+2) = 128
      expect(fakeCtx.drawImage).toHaveBeenNthCalledWith(3, expect.anything(), 128, 4, 60, 87);
    });

    // イラスト違い(ciid)がサムネイルで代表イラストに潰されないことを確認する回帰テスト
    it('DeckCardRefのciidがgetCardImageUrlの第3引数に渡される（代表ciidに潰されない）', async () => {
      const deckInfo = makeDeckInfo({
        mainDeck: [{ cid: 'm001', ciid: '2', lang: 'ja', quantity: 1 }]
      });

      await generateDeckThumbnailImage(deckInfo);

      // getCardInfo('m001') はモックで ciid: '1'（代表値）を返すが、
      // 実際にデッキに入っているのは ciid: '2' の方なので、それが優先されるべき
      expect(cardTypes.getCardImageUrl).toHaveBeenCalledWith(
        expect.objectContaining({ cardId: 'm001' }),
        'ocg',
        '2'
      );
    });

    // [covers:load_draw.decode_failure_returns_false_no_throw]
    it('画像のdecode()が失敗しても例外は伝播せず、他のカードは描画される', async () => {
      const RealImage = global.Image;
      class FailingImage {
        crossOrigin = '';
        src = '';
        decode(): Promise<void> {
          if (this.src.includes('fail')) {
            return Promise.reject(new Error('decode failed'));
          }
          return Promise.resolve();
        }
      }
      vi.stubGlobal('Image', FailingImage);
      vi.mocked(cardTypes.getCardImageUrl).mockImplementation((card: unknown) => {
        const c = card as { cardId: string };
        return c.cardId === 'm001' ? '/fail.png' : '/ok.png';
      });

      try {
        const deckInfo = makeDeckInfo({
          mainDeck: [makeRef('m001'), makeRef('m002')]
        });

        const result = await generateDeckThumbnailImage(deckInfo);

        // m001のdecode失敗はcatchされ、m002は正常に描画されるため全体としては成功する
        expect(result).toMatch(/^data:image\/webp;base64,/);
        expect(fakeCtx.drawImage).toHaveBeenCalledTimes(1);
      } finally {
        vi.stubGlobal('Image', RealImage);
      }
    });

    // [covers:concurrent.task_error_caught_sets_undefined]
    it('個別タスクが同期的に例外をthrowしても他タスクは継続し、専用のconsole.warnが出る', async () => {
      vi.mocked(cardUtils.getCardInfo).mockImplementation((cid: string) => {
        if (cid === 'm001') {
          throw new Error('getCardInfo boom');
        }
        return {
          cardId: cid,
          name: `Card ${cid}`,
          cardType: 'monster',
          ciid: '1',
          lang: 'ja',
          imgs: [{ ciid: '1', imgHash: 'hash-abc' }],
          types: ['effect'],
          levelValue: 4
        } as unknown as ReturnType<typeof cardUtils.getCardInfo>;
      });
      const deckInfo = makeDeckInfo({
        mainDeck: [makeRef('m001'), makeRef('m002')]
      });

      const result = await generateDeckThumbnailImage(deckInfo);

      // m001のtaskはpromiseAllConcurrent内部でcatchされ、m002は正常に描画されるため全体は成功する
      expect(result).toMatch(/^data:image\/webp;base64,/);
      expect(fakeCtx.drawImage).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[promiseAllConcurrent] Task at index'),
        expect.any(Error)
      );
    });

    // [covers:concurrent.concurrency_limits_simultaneous_execution]
    it('画像読み込みの同時実行数は最大2に制限される', async () => {
      const RealImage = global.Image;
      let inFlight = 0;
      let maxInFlight = 0;
      const resolvers: Array<() => void> = [];

      class ControlledImage {
        crossOrigin = '';
        src = '';
        decode(): Promise<void> {
          inFlight++;
          maxInFlight = Math.max(maxInFlight, inFlight);
          return new Promise<void>((resolve) => {
            resolvers.push(() => {
              inFlight--;
              resolve();
            });
          });
        }
      }
      vi.stubGlobal('Image', ControlledImage);

      try {
        const deckInfo = makeDeckInfo({
          mainDeck: [
            makeRef('m001'), makeRef('m002'), makeRef('m003')
          ],
          extraDeck: [makeRef('e001'), makeRef('e002')]
        });

        const resultPromise = generateDeckThumbnailImage(deckInfo);

        // 全5枚のタスクが起動されるまでマイクロタスクを消化
        await flushMicrotasks();

        // concurrency=2のため、同時にdecode()を呼んでいるのは最大2件のはず
        expect(inFlight).toBeLessThanOrEqual(2);
        expect(inFlight).toBeGreaterThan(0);

        // 順番に全てresolveしてタスクを完了させる
        while (resolvers.length > 0 || inFlight > 0) {
          const r = resolvers.shift();
          if (r) {
            r();
            // eslint-disable-next-line no-await-in-loop
            await flushMicrotasks();
          } else {
            break;
          }
        }

        await resultPromise;

        expect(maxInFlight).toBeLessThanOrEqual(2);
      } finally {
        vi.stubGlobal('Image', RealImage);
      }
    });

    // [covers:concurrent.results_index_matches_task_index_regardless_of_completion_order]
    it('タスクの完了順が入れ替わっても、各カードの描画x座標はそのカード自身のindexに対応する', async () => {
      const RealImage = global.Image;
      // src(URL)からindexを引けるようにcardごとに異なる画像URLを用意する
      const srcToIndex = new Map<string, number>([
        ['https://example.com/card-0.png', 0],
        ['https://example.com/card-1.png', 1],
        ['https://example.com/card-2.png', 2]
      ]);
      const resolversBySrc = new Map<string, () => void>();

      class OutOfOrderImage {
        crossOrigin = '';
        src = '';
        decode(): Promise<void> {
          return new Promise<void>((resolve) => {
            resolversBySrc.set(this.src, resolve);
          });
        }
      }
      vi.stubGlobal('Image', OutOfOrderImage);
      vi.mocked(cardTypes.getCardImageUrl).mockImplementation((card: unknown) => {
        const c = card as { cardId: string };
        const idx = { m001: 0, m002: 1, m003: 2 }[c.cardId as 'm001' | 'm002' | 'm003'];
        return `/card-${idx}.png`;
      });

      try {
        const deckInfo = makeDeckInfo({
          mainDeck: [makeRef('m001'), makeRef('m002'), makeRef('m003')]
        });

        const resultPromise = generateDeckThumbnailImage(deckInfo);

        // concurrency=2のため、まずindex 0,1の2件が起動される
        await flushMicrotasks();

        // index=1(2番目に開始されたタスク)を最初にresolve
        resolversBySrc.get('https://example.com/card-1.png')?.();
        await flushMicrotasks();

        // 続いてindex=0
        resolversBySrc.get('https://example.com/card-0.png')?.();
        await flushMicrotasks();

        // 最後にindex=2
        resolversBySrc.get('https://example.com/card-2.png')?.();

        await resultPromise;

        expect(fakeCtx.drawImage).toHaveBeenCalledTimes(3);
        const cardWidth = 60;
        const gap = 2;
        const padding = 4;
        for (const call of fakeCtx.drawImage.mock.calls) {
          const img = call[0] as { src: string };
          const x = call[1] as number;
          const index = srcToIndex.get(img.src);
          expect(index).toBeDefined();
          expect(x).toBe(padding + (index as number) * (cardWidth + gap));
        }
      } finally {
        vi.stubGlobal('Image', RealImage);
      }
    });

    // [covers:thumb_image.blob_null_returns_null]
    // [covers:to_blob.resolves_with_canvas_toblob_callback_result]
    it('canvas.toBlobがnullを渡す場合、nullを返す', async () => {
      fakeCanvas.toBlob.mockImplementation((cb: (b: Blob | null) => void) => cb(null));
      const deckInfo = makeDeckInfo({ mainDeck: [makeRef('m001')] });

      const result = await generateDeckThumbnailImage(deckInfo);

      expect(result).toBeNull();
    });

    // [covers:thumb_image.success_returns_data_url]
    // [covers:to_blob.resolves_with_canvas_toblob_callback_result]
    // [covers:blob_to_data_url.onload_string_result_resolves]
    it('正常系ではWebP形式のData URLを返す', async () => {
      const deckInfo = makeDeckInfo({ mainDeck: [makeRef('m001')] });

      const result = await generateDeckThumbnailImage(deckInfo);

      expect(result).toMatch(/^data:image\/webp;base64,/);
    });

    // [covers:blob_to_data_url.onload_non_string_result_resolves_null]
    it('FileReaderのonload結果が文字列でない場合(ArrayBuffer等)、nullを返す', async () => {
      const RealFileReader = global.FileReader;
      class NonStringResultFileReader {
        onload: ((e: { target: { result: unknown } }) => void) | null = null;
        onerror: (() => void) | null = null;
        readAsDataURL(_blob: Blob): void {
          queueMicrotask(() => {
            this.onload?.({ target: { result: new ArrayBuffer(8) } });
          });
        }
      }
      vi.stubGlobal('FileReader', NonStringResultFileReader);

      try {
        const deckInfo = makeDeckInfo({ mainDeck: [makeRef('m001')] });

        const result = await generateDeckThumbnailImage(deckInfo);

        expect(result).toBeNull();
      } finally {
        vi.stubGlobal('FileReader', RealFileReader);
      }
    });

    // [covers:blob_to_data_url.onerror_resolves_null_not_reject]
    it('FileReaderがonerrorを発火してもrejectされず、nullで解決する', async () => {
      const RealFileReader = global.FileReader;
      class ErroringFileReader {
        onload: ((e: { target: { result: unknown } }) => void) | null = null;
        onerror: (() => void) | null = null;
        readAsDataURL(_blob: Blob): void {
          queueMicrotask(() => {
            this.onerror?.();
          });
        }
      }
      vi.stubGlobal('FileReader', ErroringFileReader);

      try {
        const deckInfo = makeDeckInfo({ mainDeck: [makeRef('m001')] });

        const result = await generateDeckThumbnailImage(deckInfo);

        expect(result).toBeNull();
        // reject経路であれば外側try/catchのconsole.warnが呼ばれるはずだが、呼ばれないことで
        // resolve(null)経路(reject経路ではない)であることを確認する
        expect(consoleWarnSpy).not.toHaveBeenCalledWith('Failed to generate thumbnail image:', expect.any(Error));
      } finally {
        vi.stubGlobal('FileReader', RealFileReader);
      }
    });

    // [covers:thumb_image.exception_caught_returns_null]
    it('処理中に例外が発生した場合、console.warnでログを出しnullを返す', async () => {
      // getCardInfoのthrowはpromiseAllConcurrent内のexecuteTaskのtry/catchで
      // 個別に吸収されてしまい、generateDeckThumbnailImage自身の外側try/catchには
      // 到達しないため、document.createElement('canvas')自体を失敗させて
      // 外側try/catchを直接検証する
      createElementSpy.mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          throw new Error('canvas creation failed');
        }
        return originalCreateElement(tag as keyof HTMLElementTagNameMap);
      });
      const deckInfo = makeDeckInfo({ mainDeck: [makeRef('m001')] });

      const result = await generateDeckThumbnailImage(deckInfo);

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to generate thumbnail image:', expect.any(Error));
    });
  });
});
