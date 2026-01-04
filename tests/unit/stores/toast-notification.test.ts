import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useToastStore } from '@/stores/toast-notification';

describe('stores/toast-notification', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('初期状態', () => {
    it('toastsは空配列', () => {
      const store = useToastStore();
      expect(store.toasts).toEqual([]);
    });
  });

  describe('showToast', () => {
    it('トーストを表示できる', () => {
      const store = useToastStore();
      const id = store.showToast('テストメッセージ', 'info');

      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0]).toMatchObject({
        id,
        message: 'テストメッセージ',
        type: 'info',
        title: 'テストメッセージ',
        duration: 3000
      });
    });

    it('デフォルトのtypeはinfo', () => {
      const store = useToastStore();
      store.showToast('メッセージ');

      expect(store.toasts[0]?.type).toBe('info');
    });

    it('デフォルトのdurationは3000', () => {
      const store = useToastStore();
      store.showToast('メッセージ');

      expect(store.toasts[0]?.duration).toBe(3000);
    });

    it('typeを指定できる', () => {
      const store = useToastStore();

      store.showToast('成功', 'success');
      store.showToast('エラー', 'error');
      store.showToast('警告', 'warning');
      store.showToast('情報', 'info');

      expect(store.toasts[0]?.type).toBe('success');
      expect(store.toasts[1]?.type).toBe('error');
      expect(store.toasts[2]?.type).toBe('warning');
      expect(store.toasts[3]?.type).toBe('info');
    });

    it('bodyを指定できる', () => {
      const store = useToastStore();
      store.showToast('タイトル', 'info', '本文内容');

      expect(store.toasts[0]?.body).toBe('本文内容');
    });

    it('durationを指定できる', () => {
      const store = useToastStore();
      store.showToast('メッセージ', 'info', undefined, 5000);

      expect(store.toasts[0]?.duration).toBe(5000);
    });

    it('一意なIDが付与される', () => {
      const store = useToastStore();
      const id1 = store.showToast('メッセージ1');
      const id2 = store.showToast('メッセージ2');

      expect(id1).not.toBe(id2);
      expect(store.toasts[0]?.id).toBe(id1);
      expect(store.toasts[1]?.id).toBe(id2);
    });

    it('複数のトーストを同時に表示できる', () => {
      const store = useToastStore();

      store.showToast('メッセージ1');
      store.showToast('メッセージ2');
      store.showToast('メッセージ3');

      expect(store.toasts).toHaveLength(3);
    });

    it('指定時間後に自動削除される', () => {
      const store = useToastStore();
      store.showToast('メッセージ', 'info', undefined, 3000);

      expect(store.toasts).toHaveLength(1);

      // 3秒経過
      vi.advanceTimersByTime(3000);

      expect(store.toasts).toHaveLength(0);
    });

    it('duration=0の場合、自動削除されない', () => {
      const store = useToastStore();
      store.showToast('メッセージ', 'info', undefined, 0);

      expect(store.toasts).toHaveLength(1);

      // 10秒経過しても削除されない
      vi.advanceTimersByTime(10000);

      expect(store.toasts).toHaveLength(1);
    });

    it('複数のトーストがそれぞれ指定時間後に削除される', () => {
      const store = useToastStore();

      store.showToast('短いメッセージ', 'info', undefined, 1000);
      store.showToast('長いメッセージ', 'info', undefined, 5000);

      expect(store.toasts).toHaveLength(2);

      // 1秒経過 → 最初のトーストが削除される
      vi.advanceTimersByTime(1000);
      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0]?.message).toBe('長いメッセージ');

      // さらに4秒経過 → 2番目のトーストも削除される
      vi.advanceTimersByTime(4000);
      expect(store.toasts).toHaveLength(0);
    });
  });

  describe('removeToast', () => {
    it('指定IDのトーストを削除できる', () => {
      const store = useToastStore();
      const id1 = store.showToast('メッセージ1');
      const id2 = store.showToast('メッセージ2');
      const id3 = store.showToast('メッセージ3');

      expect(store.toasts).toHaveLength(3);

      store.removeToast(id2);

      expect(store.toasts).toHaveLength(2);
      expect(store.toasts[0]?.id).toBe(id1);
      expect(store.toasts[1]?.id).toBe(id3);
    });

    it('存在しないIDを指定しても何も起こらない', () => {
      const store = useToastStore();
      store.showToast('メッセージ');

      expect(store.toasts).toHaveLength(1);

      store.removeToast('non-existent-id');

      expect(store.toasts).toHaveLength(1);
    });

    it('複数回削除しても問題ない', () => {
      const store = useToastStore();
      const id = store.showToast('メッセージ');

      store.removeToast(id);
      store.removeToast(id);

      expect(store.toasts).toHaveLength(0);
    });
  });

  describe('clearAll', () => {
    it('全てのトーストをクリアできる', () => {
      const store = useToastStore();

      store.showToast('メッセージ1');
      store.showToast('メッセージ2');
      store.showToast('メッセージ3');

      expect(store.toasts).toHaveLength(3);

      store.clearAll();

      expect(store.toasts).toHaveLength(0);
    });

    it('空の状態でclearAllしても問題ない', () => {
      const store = useToastStore();

      store.clearAll();

      expect(store.toasts).toHaveLength(0);
    });

    it('複数回クリアしても問題ない', () => {
      const store = useToastStore();

      store.showToast('メッセージ');
      store.clearAll();
      store.clearAll();

      expect(store.toasts).toHaveLength(0);
    });
  });

  describe('複雑なシナリオ', () => {
    it('showToast後に手動削除してもタイマーエラーにならない', () => {
      const store = useToastStore();
      const id = store.showToast('メッセージ', 'info', undefined, 3000);

      // 手動削除
      store.removeToast(id);

      expect(store.toasts).toHaveLength(0);

      // タイマー経過（エラーにならないことを確認）
      vi.advanceTimersByTime(3000);

      expect(store.toasts).toHaveLength(0);
    });

    it('複数のトーストを追加、削除、クリアの組み合わせ', () => {
      const store = useToastStore();

      const id1 = store.showToast('メッセージ1');
      const id2 = store.showToast('メッセージ2');
      store.showToast('メッセージ3');

      expect(store.toasts).toHaveLength(3);

      store.removeToast(id1);
      expect(store.toasts).toHaveLength(2);

      store.showToast('メッセージ4');
      expect(store.toasts).toHaveLength(3);

      store.removeToast(id2);
      expect(store.toasts).toHaveLength(2);

      store.clearAll();
      expect(store.toasts).toHaveLength(0);
    });

    it('タイマー削除と手動削除が混在する', () => {
      const store = useToastStore();

      const id1 = store.showToast('短い', 'info', undefined, 1000);
      const id2 = store.showToast('中間', 'info', undefined, 3000);
      const id3 = store.showToast('長い', 'info', undefined, 5000);

      expect(store.toasts).toHaveLength(3);

      // 1秒経過 → id1が自動削除
      vi.advanceTimersByTime(1000);
      expect(store.toasts).toHaveLength(2);

      // id2を手動削除
      store.removeToast(id2);
      expect(store.toasts).toHaveLength(1);
      expect(store.toasts[0]?.id).toBe(id3);

      // さらに4秒経過 → id3が自動削除
      vi.advanceTimersByTime(4000);
      expect(store.toasts).toHaveLength(0);
    });
  });
});
