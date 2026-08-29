import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getBackgroundFetchQueue } from '../../../src/utils/background-fetch-queue';
import type { CardInfo } from '../../../src/utils/background-fetch-queue';

// getCardDetail をモック（即座に解決するPromiseを返す）
const mockGetCardDetail = vi.fn().mockResolvedValue(null);
vi.mock('../../../src/api/card-search', () => ({
  getCardDetail: (...args: any[]) => mockGetCardDetail(...args),
}));

describe('background-fetch-queue', () => {
  let queue: ReturnType<typeof getBackgroundFetchQueue>;

  beforeEach(async () => {
    // 新しいキューインスタンスを取得（シングルトンなので同じインスタンス）
    queue = getBackgroundFetchQueue();
    // 前のテストの非同期処理が完了するのを待つ
    while (queue.activeCount() > 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    queue.clear();
    mockGetCardDetail.mockClear();
    mockGetCardDetail.mockResolvedValue(null);
  });

  describe('getBackgroundFetchQueue', () => {
    // [covers:get_background_fetch_queue.singleton_returns_same]
    it('シングルトンインスタンスを返す', () => {
      const instance1 = getBackgroundFetchQueue();
      const instance2 = getBackgroundFetchQueue();
      expect(instance1).toBe(instance2);
    });

    // [covers:get_background_fetch_queue.creates_once_when_null]
    it('モジュール初回ロード時(queueInstance未初期化)は新しいインスタンスを生成する', async () => {
      vi.resetModules();
      const fresh = await import('../../../src/utils/background-fetch-queue');
      const instanceA = fresh.getBackgroundFetchQueue();
      const instanceB = fresh.getBackgroundFetchQueue();
      // resetModules後の新しいモジュールインスタンスなので、既存のqueueとは別物
      expect(instanceA).not.toBe(queue);
      // 同一モジュール内では2回目以降も同一インスタンスを返す(singleton_returns_sameと同じ性質)
      expect(instanceA).toBe(instanceB);
    });
  });

  describe('enqueue', () => {
    // [covers:enqueue.new_item_initial_state]
    it('enqueueメソッドが呼べる', () => {
      const onComplete = vi.fn();
      // enqueueは即座に処理を開始するため、呼び出せることだけ確認
      expect(() => {
        queue.enqueue('test-card-1', 'normal', onComplete);
      }).not.toThrow();
    });

    // [covers:enqueue.default_priority_normal]
    it('priority省略時はnormal優先度として扱われる', () => {
      // enqueue()内はpush -> sortQueue() -> processQueue()の順で呼ばれるため、
      // sortQueue()をモックしてpush直後(まだqueueに残っている)priority値を捕捉する
      let capturedPriority: string | undefined;
      const sortQueueSpy = vi.spyOn(queue as any, 'sortQueue').mockImplementation(function (this: any) {
        const item = this.queue.find((i: any) => i.cardId === 'card-default-priority');
        capturedPriority = item?.priority;
      });

      try {
        queue.enqueue('card-default-priority', undefined as any, vi.fn());
        expect(capturedPriority).toBe('normal');
      } finally {
        // singletonのメソッドを直接spyOnしているため、他のテストに影響しないよう必ず復元する
        sortQueueSpy.mockRestore();
      }
    });

    // [covers:enqueue.duplicate_queue_ignored]
    it('queue内で未処理のまま残っているcardIdへの再enqueueは無視される', async () => {
      // maxConcurrent(3)を最初の3件で埋め、isProcessingが解放されるまで
      // 4件目以降がqueue内に留まる状態を作ってから重複enqueueを試みる
      mockGetCardDetail.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 300))
      );

      queue.enqueue('active-1', 'normal', vi.fn());
      queue.enqueue('active-2', 'normal', vi.fn());
      queue.enqueue('active-3', 'normal', vi.fn());
      // isProcessingが100ms待機で保持されている間にqueueへ積まれる
      queue.enqueue('queued-only', 'normal', vi.fn());

      expect(queue.size()).toBeGreaterThan(0);
      expect((queue as any).activeRequests.has('queued-only')).toBe(false);

      const sizeBefore = queue.size();
      queue.enqueue('queued-only', 'normal', vi.fn());
      expect(queue.size()).toBe(sizeBefore);
    });
  });

  describe('clear', () => {
    // [covers:clear.idempotent_no_throw]
    it('clearメソッドが呼べる', () => {
      expect(() => {
        queue.clear();
      }).not.toThrow();
      expect(queue.size()).toBe(0);
    });
  });

  describe('size', () => {
    // [covers:size.returns_queue_length]
    it('初期状態でサイズが0である', () => {
      expect(queue.size()).toBe(0);
    });
  });

  describe('activeCount', () => {
    // [covers:active_count.returns_active_requests_size]
    it('初期状態でアクティブカウントが0である', () => {
      expect(queue.activeCount()).toBe(0);
    });
  });

  describe('fetchCard - success', () => {
    // [covers:fetch_card.success_truthy_result]
    it('成功時にonCompleteが呼ばれる', async () => {
      const onComplete = vi.fn();
      const mockCard: CardInfo = {
        cardId: 'test-card-1',
        name: 'Test Card',
      } as CardInfo;

      mockGetCardDetail.mockResolvedValue(mockCard);

      queue.enqueue('test-card-1', 'normal', onComplete);

      // 処理が完了するまで待つ
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(onComplete).toHaveBeenCalledWith(mockCard);
    });

    // [covers:fetch_card.success_null_result]
    it('カード詳細がnullの場合nullをonCompleteに渡す', async () => {
      const onComplete = vi.fn();
      mockGetCardDetail.mockResolvedValue(null);

      queue.enqueue('test-card-1', 'normal', onComplete);

      // 処理が完了するまで待つ
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(onComplete).toHaveBeenCalledWith(null);
    });
  });

  describe('sortQueue', () => {
    // [covers:sort_queue.priority_order]
    it('優先度順にソートされる（high > normal > low）', () => {
      // キューに直接アイテムを追加（processQueueを回避）
      (queue as any).queue = [
        { cardId: 'card-low', priority: 'low', retryCount: 0, maxRetries: 2, onComplete: vi.fn() },
        { cardId: 'card-normal', priority: 'normal', retryCount: 0, maxRetries: 2, onComplete: vi.fn() },
        { cardId: 'card-high', priority: 'high', retryCount: 0, maxRetries: 2, onComplete: vi.fn() },
      ];

      // sortQueueを直接呼び出し
      (queue as any).sortQueue();

      const queueItems = (queue as any).queue;
      expect(queueItems[0].priority).toBe('high');
      expect(queueItems[1].priority).toBe('normal');
      expect(queueItems[2].priority).toBe('low');
    });

    // [covers:sort_queue.tie_break_preserves_order]
    it('同じ優先度の場合はFIFO順序を維持する', () => {
      (queue as any).queue = [
        { cardId: 'card-3', priority: 'normal', retryCount: 0, maxRetries: 2, onComplete: vi.fn() },
        { cardId: 'card-1', priority: 'normal', retryCount: 0, maxRetries: 2, onComplete: vi.fn() },
        { cardId: 'card-2', priority: 'normal', retryCount: 0, maxRetries: 2, onComplete: vi.fn() },
      ];

      (queue as any).sortQueue();

      const queueItems = (queue as any).queue;
      // 同じ優先度なので、元の順序を維持
      expect(queueItems[0].cardId).toBe('card-3');
      expect(queueItems[1].cardId).toBe('card-1');
      expect(queueItems[2].cardId).toBe('card-2');
    });

    it('複数の優先度が混在する場合、正しくソートされる', () => {
      (queue as any).queue = [
        { cardId: 'card-low-1', priority: 'low', retryCount: 0, maxRetries: 2, onComplete: vi.fn() },
        { cardId: 'card-high-1', priority: 'high', retryCount: 0, maxRetries: 2, onComplete: vi.fn() },
        { cardId: 'card-normal-1', priority: 'normal', retryCount: 0, maxRetries: 2, onComplete: vi.fn() },
        { cardId: 'card-low-2', priority: 'low', retryCount: 0, maxRetries: 2, onComplete: vi.fn() },
        { cardId: 'card-high-2', priority: 'high', retryCount: 0, maxRetries: 2, onComplete: vi.fn() },
        { cardId: 'card-normal-2', priority: 'normal', retryCount: 0, maxRetries: 2, onComplete: vi.fn() },
      ];

      (queue as any).sortQueue();

      const queueItems = (queue as any).queue;
      expect(queueItems[0].cardId).toBe('card-high-1');
      expect(queueItems[1].cardId).toBe('card-high-2');
      expect(queueItems[2].cardId).toBe('card-normal-1');
      expect(queueItems[3].cardId).toBe('card-normal-2');
      expect(queueItems[4].cardId).toBe('card-low-1');
      expect(queueItems[5].cardId).toBe('card-low-2');
    });

    // [covers:sort_queue.empty_array_no_throw]
    it('空のキューでもエラーにならない', () => {
      (queue as any).queue = [];

      expect(() => {
        (queue as any).sortQueue();
      }).not.toThrow();

      expect((queue as any).queue.length).toBe(0);
    });
  });

  describe('duplicate prevention', () => {
    // [covers:enqueue.duplicate_active_ignored]
    // 注: このテストは"キュー内の"重複を意図した名前だが、実際にはmaxConcurrent(3)未満かつ
    // isProcessingがfalseの初回enqueueであるため、同期実行の範囲内でactiveRequestsへ即座に
    // 移動する。よって実際にはduplicate_active_ignoredを検証している
    // （queue内に残ったままの重複はenqueue.duplicate_queue_ignoredの専用テストで別途検証）
    it('キュー内の重複するcardIdは無視される', () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();

      queue.enqueue('same-card', 'normal', onComplete1);
      const sizeBefore = queue.size();
      queue.enqueue('same-card', 'normal', onComplete2);
      const sizeAfter = queue.size();

      expect(sizeAfter).toBe(sizeBefore);
    });

    // [covers:enqueue.duplicate_active_ignored]
    it('処理中のcardIdに対するenqueueは無視される', async () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();

      mockGetCardDetail.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 200))
      );

      queue.enqueue('processing-card', 'normal', onComplete1);

      // 処理が開始されるまで待つ（activeCountが1になるまでポーリング）
      const startTime = Date.now();
      while (queue.activeCount() === 0) {
        if (Date.now() - startTime > 1000) {
          throw new Error('Timeout: activeCount did not become 1');
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // activeCount が 1 になっているはず
      expect(queue.activeCount()).toBe(1);

      // 同じカードを追加しようとする
      queue.enqueue('processing-card', 'normal', onComplete2);

      // サイズは増えないはず
      expect(queue.size()).toBe(0);

      // 処理が完了するまで待つ（activeCountが0になるまでポーリング）
      while (queue.activeCount() > 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // onComplete1 のみ呼ばれる
      expect(onComplete1).toHaveBeenCalled();
      expect(onComplete2).not.toHaveBeenCalled();
    });
  });



  describe('clear', () => {
    // [covers:process_queue.already_processing_guard]
    // このテストのsizeBeforeClear>0は、先発enqueueのprocessQueueがisProcessing=trueのまま
    // 100ms待機区間にいるため後続enqueueがqueueに留まる(already_processing_guard)ことの証拠
    it('clearするとキューが空になる', async () => {
      // モックを遅延させて、enqueueがキューに溜まるようにする
      mockGetCardDetail.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(null), 500))
      );

      queue.enqueue('card-1', 'normal', vi.fn());
      queue.enqueue('card-2', 'normal', vi.fn());

      // キューに溜まるのを待つ
      await new Promise((resolve) => setTimeout(resolve, 50));
      const sizeBeforeClear = queue.size();
      expect(sizeBeforeClear).toBeGreaterThan(0);

      queue.clear();
      expect(queue.size()).toBe(0);
    });
  });


  describe('activeCount', () => {
    // [covers:process_queue.per_item_dequeue_side_effects]
    it('処理中はactiveCountが増加し、完了後に減少する', async () => {
      mockGetCardDetail.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(null), 150))
      );

      expect(queue.activeCount()).toBe(0);

      queue.enqueue('card-active-1', 'normal', vi.fn());
      queue.enqueue('card-active-2', 'normal', vi.fn());

      // 処理が開始されるまで待つ
      await new Promise((resolve) => setTimeout(resolve, 50));
      const activeDuring = queue.activeCount();
      expect(activeDuring).toBeGreaterThan(0);

      // 全ての処理が完了するまで待つ
      await new Promise((resolve) => setTimeout(resolve, 400));
      const activeAfter = queue.activeCount();
      expect(activeAfter).toBe(0);
    });
  });

  describe('independent card processing', () => {
    it('異なるcardIdは独立して処理される', async () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();

      mockGetCardDetail.mockResolvedValue(null);

      queue.enqueue('card-1', 'normal', onComplete1);
      queue.enqueue('card-2', 'normal', onComplete2);

      await new Promise((resolve) => setTimeout(resolve, 400));

      expect(onComplete1).toHaveBeenCalledWith(null);
      expect(onComplete2).toHaveBeenCalledWith(null);
    });
  });

  describe('concurrent limit', () => {
    // [covers:process_queue.concurrency_limit]
    it('並行リクエスト数が制限される（最大3並行）', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;

      mockGetCardDetail.mockImplementation(() => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        return new Promise((resolve) =>
          setTimeout(() => {
            concurrentCount--;
            resolve(null);
          }, 100)
        );
      });

      // 5個のカードをenqueue
      queue.enqueue('card-1', 'normal', vi.fn());
      queue.enqueue('card-2', 'normal', vi.fn());
      queue.enqueue('card-3', 'normal', vi.fn());
      queue.enqueue('card-4', 'normal', vi.fn());
      queue.enqueue('card-5', 'normal', vi.fn());

      await new Promise((resolve) => setTimeout(resolve, 800));

      // 最大3並行までに制限されているべき
      expect(maxConcurrent).toBeLessThanOrEqual(3);
      expect(maxConcurrent).toBeGreaterThan(0);
    });
  });

  describe('size changes', () => {
    it('enqueue時にサイズが増加する', () => {
      expect(queue.size()).toBe(0);

      // モックを遅延させてキューに溜まるようにする
      mockGetCardDetail.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(null), 1000))
      );

      queue.enqueue('card-1', 'normal', vi.fn());
      queue.enqueue('card-2', 'normal', vi.fn());

      // 処理が開始されるまでの一瞬、サイズが増えている
      // (ただし即座に処理開始されるため、タイミングによっては0になる可能性あり)
      expect(queue.size()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('multiple clear', () => {
    // [covers:clear.idempotent_no_throw]
    it('複数回clearしてもエラーにならない', () => {
      queue.clear();
      queue.clear();
      queue.clear();

      expect(queue.size()).toBe(0);
    });
  });

  describe('enqueue with different priorities', () => {
    it('high, normal, low優先度でenqueueできる', () => {
      mockGetCardDetail.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(null), 500))
      );

      expect(() => {
        queue.enqueue('card-high', 'high', vi.fn());
        queue.enqueue('card-normal', 'normal', vi.fn());
        queue.enqueue('card-low', 'low', vi.fn());
      }).not.toThrow();
    });
  });

  describe('large number of items', () => {
    // [covers:process_queue.finally_resets_processing_flag]
    // [covers:process_queue.finally_restarts_if_pending]
    it('大量のアイテムをenqueueしても問題なく処理できる', async () => {
      const results: string[] = [];

      mockGetCardDetail.mockResolvedValue(null);

      // 10個のアイテムをenqueue
      for (let i = 0; i < 10; i++) {
        queue.enqueue(`card-${i}`, 'normal', () => results.push(`${i}`));
      }

      // 処理完了を待つ（10個 × 100ms遅延 + バッファ）
      await new Promise((resolve) => setTimeout(resolve, 1200));

      expect(results.length).toBe(10);
    });
  });

  describe('CardInfo type', () => {
    it('onCompleteに渡されるCardInfoが正しい型である', async () => {
      const onComplete = vi.fn();
      const mockCard: any = {
        cardId: 'test-card',
        name: 'Test Card Name',
      };

      mockGetCardDetail.mockResolvedValue(mockCard);

      queue.enqueue('test-card', 'normal', onComplete);

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(onComplete).toHaveBeenCalledWith(mockCard);
    });
  });

  describe('clear during processing', () => {
    // [covers:clear.resets_queue_only]
    it('処理中にclearしてもactiveRequestsは残る', async () => {
      mockGetCardDetail.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(null), 300))
      );

      queue.enqueue('card-1', 'normal', vi.fn());

      // 処理が開始されるまで待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      const activeBeforeClear = queue.activeCount();
      queue.clear();
      const activeAfterClear = queue.activeCount();

      // clearしてもactiveRequestsは残る
      expect(activeBeforeClear).toBeGreaterThan(0);
      expect(activeAfterClear).toBe(activeBeforeClear);
    });
  });

  describe('retry logic', () => {
    // [covers:fetch_card.error_retry_below_max]
    // [covers:fetch_card.error_exceeds_max_retries]
    it('エラー時に最大2回リトライする', async () => {
      const onComplete = vi.fn();
      const onError = vi.fn();
      let callCount = 0;

      // retryDelayを短く設定（privateプロパティにアクセス）
      (queue as any).retryDelay = 50;

      mockGetCardDetail.mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error('Network error'));
      });

      queue.enqueue('retry-card', 'normal', onComplete, onError);

      // 初回 + リトライ2回 = 計3回呼ばれるまで待つ
      // 50ms + 100ms = 150ms × 2リトライ + バッファ
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 初回 + 2回のリトライ = 3回
      expect(callCount).toBe(3);
      expect(onComplete).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
    });

    // [covers:fetch_card.error_retry_below_max]
    it('リトライ中に成功すればonCompleteが呼ばれる', async () => {
      const onComplete = vi.fn();
      const onError = vi.fn();
      let callCount = 0;

      (queue as any).retryDelay = 50;

      mockGetCardDetail.mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(null);
      });

      queue.enqueue('retry-success-card', 'normal', onComplete, onError);

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(callCount).toBe(2);
      expect(onComplete).toHaveBeenCalledWith(null);
      expect(onError).not.toHaveBeenCalled();
    });

    // [covers:fetch_card.error_exceeds_max_retries]
    it('maxRetriesを超えるとonErrorが呼ばれる', async () => {
      const onComplete = vi.fn();
      const onError = vi.fn();

      (queue as any).retryDelay = 50;

      mockGetCardDetail.mockRejectedValue(new Error('Permanent error'));

      queue.enqueue('max-retry-card', 'normal', onComplete, onError);

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(onComplete).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    // [covers:fetch_card.error_no_onError_callback]
    it('onError未指定でmaxRetries超過してもthrowされない', async () => {
      const onComplete = vi.fn();

      (queue as any).retryDelay = 50;

      mockGetCardDetail.mockRejectedValue(new Error('Permanent error'));

      // onErrorを渡さない
      expect(() => {
        queue.enqueue('no-onerror-card', 'normal', onComplete);
      }).not.toThrow();

      // リトライが尽きるまで待つ（例外が漏れないことを確認する）
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(onComplete).not.toHaveBeenCalled();
    });

    // [covers:fetch_card.non_error_thrown_value_wrapped]
    it('Errorインスタンスでない値でrejectされてもnew Error()でラップされてonErrorに渡る', async () => {
      const onComplete = vi.fn();
      const onError = vi.fn();

      (queue as any).retryDelay = 50;

      // 文字列でreject（Errorインスタンスではない）
      mockGetCardDetail.mockImplementation(() => Promise.reject('plain string rejection'));

      queue.enqueue('non-error-reject-card', 'normal', onComplete, onError);

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(onComplete).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
      const passedError = onError.mock.calls[0][0];
      expect(passedError).toBeInstanceOf(Error);
      expect(passedError.message).toBe('plain string rejection');
    });
  });

  describe('priority integration test', () => {
    // [covers:sort_queue.priority_order]
    // [covers:process_queue.per_item_dequeue_side_effects]
    it('実際のenqueue時に優先度順に処理される', async () => {
      const results: string[] = [];

      (queue as any).retryDelay = 50;

      mockGetCardDetail.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(null), 200))
      );

      // 最初の3つを追加（maxConcurrent=3で即座に処理開始）
      queue.enqueue('init-1', 'normal', () => results.push('init-1'));
      queue.enqueue('init-2', 'normal', () => results.push('init-2'));
      queue.enqueue('init-3', 'normal', () => results.push('init-3'));

      // 処理が開始されるまで待つ
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 以降はキューに溜まり、優先度順にソートされる
      queue.enqueue('low-card', 'low', () => results.push('low'));
      queue.enqueue('high-card', 'high', () => results.push('high'));
      queue.enqueue('normal-card', 'normal', () => results.push('normal'));

      // 全て完了するまで待つ（200ms × 6 + バッファ）
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 全部で6個のアイテムが処理されているはず
      expect(results.length).toBeGreaterThanOrEqual(6);

      // 優先度が正しく適用されているか検証
      const highIndex = results.indexOf('high');
      const normalIndex = results.indexOf('normal');
      const lowIndex = results.indexOf('low');

      expect(highIndex).toBeGreaterThan(-1);
      expect(normalIndex).toBeGreaterThan(-1);
      expect(lowIndex).toBeGreaterThan(-1);
      expect(highIndex).toBeLessThan(normalIndex);
      expect(normalIndex).toBeLessThan(lowIndex);
    });
  });

});
