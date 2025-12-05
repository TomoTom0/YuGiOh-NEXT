/**
 * API リクエストキューマネージャー
 *
 * 特徴:
 * - 同時実行数制限でレート制限に対応
 * - 429/503 エラーに対する指数バックオフリトライ
 * - リクエストタイムアウト設定
 * - エラーログ機能
 */

export interface RequestQueueOptions {
  /** 同時実行数（デフォルト: 3） */
  concurrentLimit?: number;
  /** 初期待機時間（ミリ秒、デフォルト: 100） */
  initialRetryDelay?: number;
  /** 最大待機時間（ミリ秒、デフォルト: 10000） */
  maxRetryDelay?: number;
  /** 最大リトライ回数（デフォルト: 3） */
  maxRetries?: number;
  /** リクエストタイムアウト（ミリ秒、デフォルト: 30000） */
  timeoutMs?: number;
}

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  retries: number;
}

/**
 * API リクエスト専用キューマネージャー
 *
 * @example
 * const queue = new RequestQueue({ concurrentLimit: 3 });
 * const result = await queue.enqueue(() => fetch(url));
 */
export class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private activeCount = 0;
  private readonly options: Required<RequestQueueOptions>;

  constructor(options: RequestQueueOptions = {}) {
    this.options = {
      concurrentLimit: options.concurrentLimit ?? 3,
      initialRetryDelay: options.initialRetryDelay ?? 100,
      maxRetryDelay: options.maxRetryDelay ?? 10000,
      maxRetries: options.maxRetries ?? 3,
      timeoutMs: options.timeoutMs ?? 30000,
    };
  }

  /**
   * リクエストをキューに追加
   *
   * @param fn 実行する非同期関数
   * @returns リクエスト結果のPromise
   *
   * @example
   * const result = await queue.enqueue(() => fetch(url));
   */
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        fn,
        resolve,
        reject,
        retries: 0,
      };

      this.queue.push(request);
      this.process();
    });
  }

  /**
   * キューを処理
   */
  private async process(): Promise<void> {
    if (this.activeCount >= this.options.concurrentLimit || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const request = this.queue.shift();

    if (!request) {
      this.activeCount--;
      return;
    }

    try {
      const result = await this.executeWithRetry(request);
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeCount--;
      this.process();
    }
  }

  /**
   * リトライロジック付きでリクエストを実行
   */
  private async executeWithRetry<T>(request: QueuedRequest<T>): Promise<T> {
    const maxRetries = this.options.maxRetries;

    while (request.retries <= maxRetries) {
      try {
        return await this.executeWithTimeout(request.fn);
      } catch (error) {
        const isRetryableError = this.isRetryableError(error);
        const shouldRetry = isRetryableError && request.retries < maxRetries;

        if (!shouldRetry) {
          throw error;
        }

        // 指数バックオフで待機
        const delay = this.calculateBackoffDelay(request.retries);
        await this.sleep(delay);
        request.retries++;
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * タイムアウト付きでリクエストを実行
   */
  private executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timeout after ${this.options.timeoutMs}ms`)),
          this.options.timeoutMs
        )
      ),
    ]);
  }

  /**
   * リトライ可能なエラーかどうかを判定
   */
  private isRetryableError(error: any): boolean {
    // ネットワークエラーはリトライ対象
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // HTTP レスポンスエラーの場合
    if (error instanceof Response) {
      const status = error.status;
      // 429 (Too Many Requests) および 503 (Service Unavailable) はリトライ対象
      return status === 429 || status === 503;
    }

    // response オブジェクトを持つカスタムエラー
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;
      return status === 429 || status === 503;
    }

    return false;
  }

  /**
   * 指数バックオフで待機時間を計算
   *
   * @param retryCount リトライ回数（0ベース）
   * @returns 待機時間（ミリ秒）
   */
  private calculateBackoffDelay(retryCount: number): number {
    const exponentialDelay = this.options.initialRetryDelay * Math.pow(2, retryCount);
    // ジッター（±20%）を追加してサーバー負荷を分散
    const jitter = exponentialDelay * (0.8 + Math.random() * 0.4);
    return Math.min(jitter, this.options.maxRetryDelay);
  }

  /**
   * 指定時間待機するPromiseを返す
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * キュー内のリクエスト数を取得
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * 現在のアクティブなリクエスト数を取得
   */
  getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * キューを完全にリセット
   */
  clear(): void {
    this.queue = [];
  }
}

/**
 * グローバル API リクエストキューインスタンス
 *
 * すべての API リクエストがこのキューを使用して、
 * レート制限への対応と一貫したリトライロジックを実現する
 */
export const globalRequestQueue = new RequestQueue({
  concurrentLimit: 3,
  initialRetryDelay: 100,
  maxRetryDelay: 10000,
  maxRetries: 3,
  timeoutMs: 30000,
});

/**
 * API リクエストを実行（キュー経由）
 *
 * @param fn 実行する非同期関数（通常は fetch）
 * @returns リクエスト結果
 *
 * @example
 * const response = await fetchWithQueue(() => fetch(url));
 */
export async function fetchWithQueue<T>(fn: () => Promise<T>): Promise<T> {
  return globalRequestQueue.enqueue(fn);
}

/**
 * Fetch リクエストをキュー経由で実行
 *
 * @param url リクエスト URL
 * @param init Fetch オプション
 * @returns Response
 *
 * @example
 * const response = await queuedFetch('https://api.example.com/cards');
 */
export async function queuedFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  return fetchWithQueue(() => fetch(url, init));
}
