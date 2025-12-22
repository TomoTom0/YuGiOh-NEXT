/**
 * エラーハンドリングユーティリティ
 *
 * アプリケーション全体で統一されたエラーハンドリングを提供
 * - console.error/warn/debug によるログ出力
 * - useToastStore によるトースト通知（Content Script内のみ）
 */

import { useToastStore } from '@/stores/toast-notification';

/**
 * エラー処理オプション
 */
export interface ErrorHandlerOptions {
  /** トースト通知を表示するか（デフォルト: true） */
  showToast?: boolean;
  /** トースト表示時間（ミリ秒、デフォルト: 5000） */
  toastDuration?: number;
  /** トーストに表示する追加情報 */
  toastBody?: string;
  /** console.error を呼び出すか（デフォルト: true） */
  logToConsole?: boolean;
}

/**
 * 重大なエラーを処理
 *
 * ユーザー操作が失敗した場合に使用（保存失敗、削除失敗等）
 * - console.error でログ出力
 * - トースト通知（error、長時間表示）
 *
 * @param context エラーが発生した処理名（例: "[saveDeck]"）
 * @param message ユーザーに表示するエラーメッセージ
 * @param error エラーオブジェクト（オプション）
 * @param options 追加オプション
 *
 * @example
 * try {
 *   await saveDeck(deck);
 * } catch (error) {
 *   handleError('[saveDeck]', 'デッキの保存に失敗しました', error);
 * }
 */
export function handleError(
  context: string,
  message: string,
  error?: unknown,
  options: ErrorHandlerOptions = {}
): void {
  const {
    showToast = true,
    toastDuration = 5000,
    toastBody,
    logToConsole = true
  } = options;

  // コンソールにログ出力
  if (logToConsole) {
    if (error) {
      console.error(`${context} ${message}`, error);
    } else {
      console.error(`${context} ${message}`);
    }
  }

  // トースト通知（Vue環境でのみ有効）
  if (showToast && canUseToast()) {
    try {
      const toastStore = useToastStore();
      const body = toastBody ?? (error instanceof Error ? error.message : undefined);
      toastStore.showToast(message, 'error', body, toastDuration);
    } catch (e) {
      // トースト表示に失敗してもログだけ出力
    }
  }
}

/**
 * 警告を処理
 *
 * 一部の機能が使えない場合に使用（キャッシュ失敗等）
 * - console.warn でログ出力
 * - トースト通知（warning、中時間表示）
 *
 * @param context 警告が発生した処理名（例: "[loadCache]"）
 * @param message ユーザーに表示する警告メッセージ
 * @param details 詳細情報（オプション）
 * @param options 追加オプション
 *
 * @example
 * const cache = await loadCache();
 * if (!cache) {
 *   handleWarning('[loadCache]', 'キャッシュの読み込みに失敗しました', 'デフォルト設定を使用します');
 * }
 */
export function handleWarning(
  context: string,
  message: string,
  details?: string,
  options: ErrorHandlerOptions = {}
): void {
  const {
    showToast = true,
    toastDuration = 3000,
    toastBody = details,
    logToConsole = true
  } = options;

  // コンソールにログ出力
  if (logToConsole) {
    if (details) {
      console.warn(`${context} ${message}`, details);
    } else {
      console.warn(`${context} ${message}`);
    }
  }

  // トースト通知（Vue環境でのみ有効）
  if (showToast && canUseToast()) {
    try {
      const toastStore = useToastStore();
      toastStore.showToast(message, 'warning', toastBody, toastDuration);
    } catch (e) {
    }
  }
}

/**
 * 成功情報を処理
 *
 * ユーザー操作が成功した場合に使用（保存成功、削除成功等）
 * - console.debug でログ出力
 * - トースト通知（success、短時間表示）
 *
 * @param context 成功した処理名（例: "[saveDeck]"）
 * @param message ユーザーに表示する成功メッセージ
 * @param details 詳細情報（オプション）
 * @param options 追加オプション
 *
 * @example
 * await saveDeck(deck);
 * handleSuccess('[saveDeck]', 'デッキを保存しました');
 */
export function handleSuccess(
  context: string,
  message: string,
  details?: string,
  options: ErrorHandlerOptions = {}
): void {
  const {
    showToast = true,
    toastDuration = 2000,
    toastBody = details
  } = options;

  // コンソールにログ出力（console.debugなので削除）

  // トースト通知（Vue環境でのみ有効）
  if (showToast && canUseToast()) {
    try {
      const toastStore = useToastStore();
      toastStore.showToast(message, 'success', toastBody, toastDuration);
    } catch (e) {
    }
  }
}

/**
 * 情報メッセージを処理
 *
 * ユーザーに情報を伝える場合に使用
 * - console.debug でログ出力
 * - トースト通知（info、短時間表示）
 *
 * @param context 情報が発生した処理名（例: "[loadDeck]"）
 * @param message ユーザーに表示する情報メッセージ
 * @param details 詳細情報（オプション）
 * @param options 追加オプション
 *
 * @example
 * handleInfo('[loadDeck]', 'デッキを読み込み中です...');
 */
export function handleInfo(
  context: string,
  message: string,
  details?: string,
  options: ErrorHandlerOptions = {}
): void {
  const {
    showToast = true,
    toastDuration = 2000,
    toastBody = details
  } = options;

  // コンソールにログ出力（console.debugなので削除）

  // トースト通知（Vue環境でのみ有効）
  if (showToast && canUseToast()) {
    try {
      const toastStore = useToastStore();
      toastStore.showToast(message, 'info', toastBody, toastDuration);
    } catch (e) {
    }
  }
}

/**
 * デバッグログを出力
 *
 * 内部エラーや開発時のデバッグ情報に使用
 * - console.debug でログ出力のみ（トースト通知なし）
 *
 * @param context デバッグ情報が発生した処理名（例: "[parseCard]"）
 * @param message デバッグメッセージ
 * @param data 追加データ（オプション）
 *
 * @example
 * handleDebug('[parseCard]', 'Card type not recognized:', cardTypeValue);
 */
export function handleDebug(
  context: string,
  message: string,
  data?: unknown
): void {
  // console.debug呼び出しを削除（デバッグ用関数のため、実装を空にする）
}

/**
 * useToastStore が使用可能かチェック
 *
 * Vue環境（Content Script内）でのみ true を返す
 * Background Script などでは false を返す
 *
 * @returns トースト通知が使用可能な場合は true
 */
function canUseToast(): boolean {
  try {
    // Pinia がインポート可能か確認
    // Vue アプリケーション内でのみ true
    return typeof useToastStore === 'function';
  } catch {
    return false;
  }
}
