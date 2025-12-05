/**
 * Promise タイムアウト管理ユーティリティ
 *
 * 無限待機する Promise を防ぐためのタイムアウト機構を提供します。
 * Chrome 拡張機能の API 呼び出しなど、応答が保証されない操作に有効です。
 */

export interface TimeoutOptions {
  /** タイムアウト時間（ミリ秒、デフォルト: 5000） */
  ms?: number;
  /** タイムアウト時のカスタムエラーメッセージ */
  message?: string;
  /** タイムアウト時のコールバック */
  onTimeout?: () => void;
}

/**
 * Promise にタイムアウトを付与
 *
 * 指定時間内に Promise が resolve/reject されない場合、タイムアウトエラーを投げます。
 *
 * @param promise 対象 Promise
 * @param options タイムアウト設定
 * @returns タイムアウト機能付きの Promise
 *
 * @example
 * const result = await withTimeout(fetchData(), { ms: 5000 });
 * // 5秒以内に結果が返らない場合、エラーが投げられる
 *
 * @example
 * const result = await withTimeout(
 *   chrome.storage.local.get('key'),
 *   {
 *     ms: 3000,
 *     message: 'Chrome storage access timeout',
 *     onTimeout: () => console.warn('Timeout occurred')
 *   }
 * );
 */
export function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions = {}
): Promise<T> {
  const {
    ms = 5000,
    message = `Promise timeout after ${ms}ms`,
    onTimeout,
  } = options;

  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        onTimeout?.();
        reject(new TimeoutError(message));
      }, ms);

      // Promise が完了したら、タイムアウトをクリア
      promise.finally(() => clearTimeout(timeoutId));
    }),
  ]);
}

/**
 * Promise タイムアウトエラー
 *
 * タイムアウトが発生したことを示す専用エラークラス
 */
export class TimeoutError extends Error {
  name = 'TimeoutError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }

  /**
   * このエラーがタイムアウトエラーか判定
   */
  static isTimeoutError(error: any): error is TimeoutError {
    return error instanceof TimeoutError || error.name === 'TimeoutError';
  }
}

/**
 * Promise を Promise 化（Callback ベースの API 用）
 *
 * Callback ベースの API（例: chrome.storage.local.get）を Promise ベースに変換します。
 * 自動的にタイムアウト機構が付与されます。
 *
 * @param executor Callback ベースの関数
 * @param timeoutMs タイムアウト時間（デフォルト: 5000）
 * @returns Promise
 *
 * @example
 * // Chrome Storage API を Promise 化
 * const result = await callbackToPromise<StorageData>(
 *   (callback) => chrome.storage.local.get('key', callback),
 *   3000
 * );
 */
export function callbackToPromise<T>(
  executor: (callback: (result: T) => void) => void,
  timeoutMs: number = 5000
): Promise<T> {
  return withTimeout(
    new Promise<T>((resolve) => {
      executor((result: T) => {
        resolve(result);
      });
    }),
    {
      ms: timeoutMs,
      message: `Callback-based operation timeout after ${timeoutMs}ms`,
    }
  );
}

/**
 * 複数の Promise すべてにタイムアウトを設定
 *
 * @param promises Promise の配列
 * @param timeoutMs タイムアウト時間
 * @returns タイムアウト機能付き Promise の配列
 *
 * @example
 * const results = await Promise.all(
 *   withTimeouts([promise1, promise2, promise3], 5000)
 * );
 */
export function withTimeouts<T>(
  promises: Promise<T>[],
  timeoutMs: number = 5000
): Promise<T>[] {
  return promises.map((promise) =>
    withTimeout(promise, { ms: timeoutMs })
  );
}

/**
 * Promise が指定時間内に resolve されるまで待機
 *
 * @param promise 対象 Promise
 * @param ms 待機時間（ミリ秒）
 * @returns 時間内に resolve された場合は true、タイムアウトした場合は false
 *
 * @example
 * const completed = await waitWithinTimeout(somePromise, 3000);
 * if (!completed) {
 *   console.log('Operation did not complete within timeout');
 * }
 */
export async function waitWithinTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<boolean> {
  try {
    await withTimeout(promise, { ms });
    return true;
  } catch (error) {
    if (TimeoutError.isTimeoutError(error)) {
      return false;
    }
    throw error;
  }
}

/**
 * 再試行可能なタイムアウト Promise 実行
 *
 * タイムアウトが発生した場合、指定回数だけ再試行します。
 *
 * @param executor Promise を返す関数
 * @param options 設定（timeoutMs, maxRetries）
 * @returns 成功した Promise の結果
 * @throws 全ての再試行がタイムアウトした場合、TimeoutError を投げる
 *
 * @example
 * const result = await retryWithTimeout(
 *   () => chrome.storage.local.get('key'),
 *   { timeoutMs: 3000, maxRetries: 3 }
 * );
 */
export async function retryWithTimeout<T>(
  executor: () => Promise<T>,
  options: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<T> {
  const { timeoutMs = 5000, maxRetries = 3 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(executor(), { ms: timeoutMs });
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (TimeoutError.isTimeoutError(error)) {
        if (isLastAttempt) {
          throw error;
        }
        // リトライ前に少し待機
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      // タイムアウト以外のエラーは即座に投げる
      throw error;
    }
  }

  // 到達不可
  throw new TimeoutError('Max retries exceeded');
}

/**
 * Promise のキャンセルトークン付きラッパー
 *
 * キャンセルトークンを使って Promise を途中でキャンセルできます。
 *
 * @example
 * const token = createCancelToken();
 * const promise = withCancelToken(somePromise, token);
 *
 * // キャンセル
 * token.cancel('User cancelled');
 */
export interface CancelToken {
  /** Promise をキャンセルする */
  cancel: (reason?: string) => void;
  /** キャンセル済みかどうか */
  isCancelled: () => boolean;
}

/**
 * キャンセルトークンを作成
 */
export function createCancelToken(): CancelToken {
  let cancelled = false;

  return {
    cancel: (_msg?: string) => {
      cancelled = true;
      // Optional: Future enhancement to store and retrieve cancel reason
      // if (msg) reason = msg;
    },
    isCancelled: () => cancelled,
  };
}

/**
 * キャンセルトークン付き Promise ラッパー
 *
 * @param promise 対象 Promise
 * @param token キャンセルトークン
 * @returns キャンセル可能な Promise
 */
export function withCancelToken<T>(
  promise: Promise<T>,
  token: CancelToken
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const checkInterval = setInterval(() => {
        if (token.isCancelled()) {
          clearInterval(checkInterval);
          reject(new Error('Operation cancelled'));
        }
      }, 10);
    }),
  ]);
}
