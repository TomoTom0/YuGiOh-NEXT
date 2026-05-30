import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  title?: string;
  body?: string;
}

/**
 * トースト通知ストア
 * アプリケーション全体でトースト通知を管理
 * - 複数の通知をキューで管理
 * - 各通知に一意なIDを付与
 * - 自動非表示タイマーを管理
 */
export const useToastStore = defineStore('toast', () => {
  // ===== 状態 =====

  /** 現在表示中のトースト通知 */
  const toasts = ref<ToastNotification[]>([]);

  // ===== アクション =====

  /**
   * トースト通知を表示
   * @param message 通知メッセージ
   * @param type 通知タイプ（success|error|info|warning）
   * @param body 通知本文（オプション）
   * @param duration 表示時間（ミリ秒、デフォルト3000）
   * @returns 通知ID
   */
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    body?: string,
    duration: number = 3000
  ): string => {
    console.debug('[ToastStore.showToast] Called:', { message, type, body, duration });
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: ToastNotification = {
      id,
      message,
      type,
      duration,
      title: message,
      body: body
    };

    toasts.value.push(toast);
    console.debug('[ToastStore.showToast] Toast added, total:', toasts.value.length);

    // 指定時間後に自動削除
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  /**
   * 指定IDのトースト通知を削除
   */
  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  };

  /**
   * すべてのトースト通知をクリア
   */
  const clearAll = () => {
    toasts.value = [];
  };

  return {
    toasts,
    showToast,
    removeToast,
    clearAll
  };
});
