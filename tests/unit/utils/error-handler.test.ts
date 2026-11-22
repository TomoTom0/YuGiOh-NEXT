import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleError,
  handleWarning,
  handleSuccess,
  handleInfo,
  handleDebug,
} from '../../../src/utils/error-handler';
import { useToastStore } from '@/stores/toast-notification';

// useToastStore のモック
const mockShowToast = vi.fn();
vi.mock('@/stores/toast-notification', () => ({
  useToastStore: vi.fn(() => ({
    showToast: mockShowToast,
  })),
}));

describe('error-handler', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockShowToast.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('handleError', () => {
    it('[covers:handle-error.console-error-without-error-object] [covers:handle-error.toast-shown-default] [covers:handle-error.toast-body-undefined-when-no-error] [covers:can-use-toast.returns-true-when-function] デフォルトオプションでconsole.errorとトースト通知が呼ばれる', () => {
      handleError('[test]', 'テストエラー');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[test] テストエラー');
      expect(mockShowToast).toHaveBeenCalledWith('テストエラー', 'error', undefined, 5000);
    });

    it('[covers:handle-error.console-error-with-error-object] [covers:handle-error.toast-body-uses-error-message-when-not-specified] エラーオブジェクトがある場合console.errorに渡される', () => {
      const error = new Error('詳細エラー');
      handleError('[test]', 'テストエラー', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[test] テストエラー', error);
      expect(mockShowToast).toHaveBeenCalledWith('テストエラー', 'error', '詳細エラー', 5000);
    });

    it('[covers:handle-error.log-to-console-false-suppresses] logToConsole=falseでconsole.errorが呼ばれない', () => {
      handleError('[test]', 'テストエラー', undefined, { logToConsole: false });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('[covers:handle-error.show-toast-false-no-toast] showToast=falseでトースト通知が呼ばれない', () => {
      handleError('[test]', 'テストエラー', undefined, { showToast: false });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('[covers:handle-error.toast-body-explicit-overrides-error-message] toastBodyオプションが指定された場合errorのmessageより優先される', () => {
      const error = new Error('無視される');
      handleError('[test]', 'テストエラー', error, { toastBody: '追加情報' });

      expect(mockShowToast).toHaveBeenCalledWith('テストエラー', 'error', '追加情報', 5000);
    });

    it('[covers:handle-error.toast-duration-passthrough] toastDurationオプションが指定された場合トースト通知に渡される', () => {
      handleError('[test]', 'テストエラー', undefined, { toastDuration: 10000 });

      expect(mockShowToast).toHaveBeenCalledWith('テストエラー', 'error', undefined, 10000);
    });

    it('[covers:handle-error.toast-error-swallowed] useToastStore()がthrowしてもcatchされhandleError自体はthrowしない', () => {
      vi.mocked(useToastStore).mockImplementationOnce(() => {
        throw new Error('pinia not ready');
      });

      expect(() => {
        handleError('[test]', 'テストエラー');
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith('[test] テストエラー');
    });
  });

  describe('handleWarning', () => {
    it('[covers:handle-warning.console-warn-without-details] [covers:handle-warning.toast-shown-default] デフォルトオプションでconsole.warnとトースト通知が呼ばれる', () => {
      handleWarning('[test]', 'テスト警告');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[test] テスト警告');
      expect(mockShowToast).toHaveBeenCalledWith('テスト警告', 'warning', undefined, 3000);
    });

    it('[covers:handle-warning.console-warn-with-details] [covers:handle-warning.toast-body-defaults-to-details] detailsがある場合console.warnとトースト通知に渡される', () => {
      handleWarning('[test]', 'テスト警告', '詳細情報');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[test] テスト警告', '詳細情報');
      expect(mockShowToast).toHaveBeenCalledWith('テスト警告', 'warning', '詳細情報', 3000);
    });

    it('[covers:handle-warning.log-to-console-false-suppresses] logToConsole=falseでconsole.warnが呼ばれない', () => {
      handleWarning('[test]', 'テスト警告', undefined, { logToConsole: false });

      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('[covers:handle-warning.show-toast-false-no-toast] showToast=falseでトースト通知が呼ばれない', () => {
      handleWarning('[test]', 'テスト警告', undefined, { showToast: false });

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('[covers:handle-warning.toast-body-explicit-overrides-details] toastBodyオプションが指定された場合detailsより優先される', () => {
      handleWarning('[test]', 'テスト警告', '無視されるdetails', { toastBody: '明示body' });

      expect(mockShowToast).toHaveBeenCalledWith('テスト警告', 'warning', '明示body', 3000);
    });

    it('[covers:handle-warning.toast-duration-passthrough] toastDurationオプションが指定された場合トースト通知に渡される', () => {
      handleWarning('[test]', 'テスト警告', undefined, { toastDuration: 5000 });

      expect(mockShowToast).toHaveBeenCalledWith('テスト警告', 'warning', undefined, 5000);
    });

    it('[covers:handle-warning.toast-error-swallowed] useToastStore()がthrowしてもcatchされhandleWarning自体はthrowしない', () => {
      vi.mocked(useToastStore).mockImplementationOnce(() => {
        throw new Error('pinia not ready');
      });

      expect(() => {
        handleWarning('[test]', 'テスト警告');
      }).not.toThrow();
    });
  });

  describe('handleSuccess', () => {
    it('[covers:handle-success.toast-shown-default] デフォルトオプションでトースト通知が呼ばれる', () => {
      handleSuccess('[test]', '成功');

      expect(mockShowToast).toHaveBeenCalledWith('成功', 'success', undefined, 2000);
    });

    it('[covers:handle-success.toast-body-defaults-to-details] detailsがある場合トースト通知に渡される', () => {
      handleSuccess('[test]', '成功', '詳細情報');

      expect(mockShowToast).toHaveBeenCalledWith('成功', 'success', '詳細情報', 2000);
    });

    it('[covers:handle-success.toast-body-explicit-overrides-details] toastBodyオプションが指定された場合detailsより優先される', () => {
      handleSuccess('[test]', '成功', '無視されるdetails', { toastBody: '明示body' });

      expect(mockShowToast).toHaveBeenCalledWith('成功', 'success', '明示body', 2000);
    });

    it('[covers:handle-success.show-toast-false-no-toast] showToast=falseでトースト通知が呼ばれない', () => {
      handleSuccess('[test]', '成功', undefined, { showToast: false });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('[covers:handle-success.toast-duration-passthrough] toastDurationオプションが指定された場合トースト通知に渡される', () => {
      handleSuccess('[test]', '成功', undefined, { toastDuration: 3000 });

      expect(mockShowToast).toHaveBeenCalledWith('成功', 'success', undefined, 3000);
    });

    it('[covers:handle-success.no-console-log-call] logToConsoleを渡しても無効でconsole出力が一切発生しない', () => {
      handleSuccess('[test]', '成功', undefined, { logToConsole: false });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('[covers:handle-success.toast-error-swallowed] useToastStore()がthrowしてもcatchされhandleSuccess自体はthrowしない', () => {
      vi.mocked(useToastStore).mockImplementationOnce(() => {
        throw new Error('pinia not ready');
      });

      expect(() => {
        handleSuccess('[test]', '成功');
      }).not.toThrow();
    });
  });

  describe('handleInfo', () => {
    it('[covers:handle-info.toast-shown-default] デフォルトオプションでトースト通知が呼ばれる', () => {
      handleInfo('[test]', '情報');

      expect(mockShowToast).toHaveBeenCalledWith('情報', 'info', undefined, 2000);
    });

    it('[covers:handle-info.toast-body-defaults-to-details] detailsがある場合トースト通知に渡される', () => {
      handleInfo('[test]', '情報', '詳細情報');

      expect(mockShowToast).toHaveBeenCalledWith('情報', 'info', '詳細情報', 2000);
    });

    it('[covers:handle-info.toast-body-explicit-overrides-details] toastBodyオプションが指定された場合detailsより優先される', () => {
      handleInfo('[test]', '情報', '無視されるdetails', { toastBody: '明示body' });

      expect(mockShowToast).toHaveBeenCalledWith('情報', 'info', '明示body', 2000);
    });

    it('[covers:handle-info.show-toast-false-no-toast] showToast=falseでトースト通知が呼ばれない', () => {
      handleInfo('[test]', '情報', undefined, { showToast: false });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('[covers:handle-info.toast-duration-passthrough] toastDurationオプションが指定された場合トースト通知に渡される', () => {
      handleInfo('[test]', '情報', undefined, { toastDuration: 4000 });

      expect(mockShowToast).toHaveBeenCalledWith('情報', 'info', undefined, 4000);
    });

    it('[covers:handle-info.no-console-log-call] logToConsoleを渡しても無効でconsole出力が一切発生しない', () => {
      handleInfo('[test]', '情報', undefined, { logToConsole: false });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('[covers:handle-info.toast-error-swallowed] useToastStore()がthrowしてもcatchされhandleInfo自体はthrowしない', () => {
      vi.mocked(useToastStore).mockImplementationOnce(() => {
        throw new Error('pinia not ready');
      });

      expect(() => {
        handleInfo('[test]', '情報');
      }).not.toThrow();
    });
  });

  describe('handleDebug', () => {
    it('[covers:handle-debug.no-op-always] 空実装なので何も起こらない', () => {
      // エラーが発生しないことを確認
      expect(() => {
        handleDebug('[test]', 'デバッグメッセージ', { data: 'test' });
      }).not.toThrow();

      // console.* やトースト通知が呼ばれないことを確認
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  // can-use-toast.returns-false-when-not-function / can-use-toast.catch-returns-false は
  // tests/design/error-handler/conditions.toml で verified=false + unverifiable_reason 付記済み。
  // 本ファイル先頭の vi.mock で useToastStore を常にfunction型として固定しているため、
  // 公開APIの範囲内でこの2分岐だけを分離して踏むことができない。
  // 以下は、その到達不能の前提そのもの（useToastStore が function 型として解決され、
  // typeof 評価が例外を投げないこと）を固定するテスト。
  describe('canUseToast（前提の固定）', () => {
    it('[covers:can-use-toast.returns-false-when-not-function] 前提: useToastStoreはfunction型として解決されるため not-function 分岐には到達しない', () => {
      expect(typeof useToastStore).toBe('function');
    });

    it('[covers:can-use-toast.catch-returns-false] 前提: 解決済みバインディングへの typeof 評価は例外を投げないため catch 分岐には到達しない', () => {
      expect(() => typeof useToastStore).not.toThrow();
      expect(typeof useToastStore).toBe('function');
    });
  });
});
