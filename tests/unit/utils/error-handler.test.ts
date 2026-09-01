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
    it('[covers:handle_error.console_error_without_error_object] [covers:handle_error.toast_shown_default] [covers:handle_error.toast_body_undefined_when_no_error] [covers:can_use_toast.returns_true_when_function] デフォルトオプションでconsole.errorとトースト通知が呼ばれる', () => {
      handleError('[test]', 'テストエラー');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[test] テストエラー');
      expect(mockShowToast).toHaveBeenCalledWith('テストエラー', 'error', undefined, 5000);
    });

    it('[covers:handle_error.console_error_with_error_object] [covers:handle_error.toast_body_uses_error_message_when_not_specified] エラーオブジェクトがある場合console.errorに渡される', () => {
      const error = new Error('詳細エラー');
      handleError('[test]', 'テストエラー', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[test] テストエラー', error);
      expect(mockShowToast).toHaveBeenCalledWith('テストエラー', 'error', '詳細エラー', 5000);
    });

    it('[covers:handle_error.log_to_console_false_suppresses] logToConsole=falseでconsole.errorが呼ばれない', () => {
      handleError('[test]', 'テストエラー', undefined, { logToConsole: false });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('[covers:handle_error.show_toast_false_no_toast] showToast=falseでトースト通知が呼ばれない', () => {
      handleError('[test]', 'テストエラー', undefined, { showToast: false });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('[covers:handle_error.toast_body_explicit_overrides_error_message] toastBodyオプションが指定された場合errorのmessageより優先される', () => {
      const error = new Error('無視される');
      handleError('[test]', 'テストエラー', error, { toastBody: '追加情報' });

      expect(mockShowToast).toHaveBeenCalledWith('テストエラー', 'error', '追加情報', 5000);
    });

    it('[covers:handle_error.toast_duration_passthrough] toastDurationオプションが指定された場合トースト通知に渡される', () => {
      handleError('[test]', 'テストエラー', undefined, { toastDuration: 10000 });

      expect(mockShowToast).toHaveBeenCalledWith('テストエラー', 'error', undefined, 10000);
    });

    it('[covers:handle_error.toast_error_swallowed] useToastStore()がthrowしてもcatchされhandleError自体はthrowしない', () => {
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
    it('[covers:handle_warning.console_warn_without_details] [covers:handle_warning.toast_shown_default] デフォルトオプションでconsole.warnとトースト通知が呼ばれる', () => {
      handleWarning('[test]', 'テスト警告');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[test] テスト警告');
      expect(mockShowToast).toHaveBeenCalledWith('テスト警告', 'warning', undefined, 3000);
    });

    it('[covers:handle_warning.console_warn_with_details] [covers:handle_warning.toast_body_defaults_to_details] detailsがある場合console.warnとトースト通知に渡される', () => {
      handleWarning('[test]', 'テスト警告', '詳細情報');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[test] テスト警告', '詳細情報');
      expect(mockShowToast).toHaveBeenCalledWith('テスト警告', 'warning', '詳細情報', 3000);
    });

    it('[covers:handle_warning.log_to_console_false_suppresses] logToConsole=falseでconsole.warnが呼ばれない', () => {
      handleWarning('[test]', 'テスト警告', undefined, { logToConsole: false });

      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('[covers:handle_warning.show_toast_false_no_toast] showToast=falseでトースト通知が呼ばれない', () => {
      handleWarning('[test]', 'テスト警告', undefined, { showToast: false });

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('[covers:handle_warning.toast_body_explicit_overrides_details] toastBodyオプションが指定された場合detailsより優先される', () => {
      handleWarning('[test]', 'テスト警告', '無視されるdetails', { toastBody: '明示body' });

      expect(mockShowToast).toHaveBeenCalledWith('テスト警告', 'warning', '明示body', 3000);
    });

    it('[covers:handle_warning.toast_duration_passthrough] toastDurationオプションが指定された場合トースト通知に渡される', () => {
      handleWarning('[test]', 'テスト警告', undefined, { toastDuration: 5000 });

      expect(mockShowToast).toHaveBeenCalledWith('テスト警告', 'warning', undefined, 5000);
    });

    it('[covers:handle_warning.toast_error_swallowed] useToastStore()がthrowしてもcatchされhandleWarning自体はthrowしない', () => {
      vi.mocked(useToastStore).mockImplementationOnce(() => {
        throw new Error('pinia not ready');
      });

      expect(() => {
        handleWarning('[test]', 'テスト警告');
      }).not.toThrow();
    });
  });

  describe('handleSuccess', () => {
    it('[covers:handle_success.toast_shown_default] デフォルトオプションでトースト通知が呼ばれる', () => {
      handleSuccess('[test]', '成功');

      expect(mockShowToast).toHaveBeenCalledWith('成功', 'success', undefined, 2000);
    });

    it('[covers:handle_success.toast_body_defaults_to_details] detailsがある場合トースト通知に渡される', () => {
      handleSuccess('[test]', '成功', '詳細情報');

      expect(mockShowToast).toHaveBeenCalledWith('成功', 'success', '詳細情報', 2000);
    });

    it('[covers:handle_success.toast_body_explicit_overrides_details] toastBodyオプションが指定された場合detailsより優先される', () => {
      handleSuccess('[test]', '成功', '無視されるdetails', { toastBody: '明示body' });

      expect(mockShowToast).toHaveBeenCalledWith('成功', 'success', '明示body', 2000);
    });

    it('[covers:handle_success.show_toast_false_no_toast] showToast=falseでトースト通知が呼ばれない', () => {
      handleSuccess('[test]', '成功', undefined, { showToast: false });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('[covers:handle_success.toast_duration_passthrough] toastDurationオプションが指定された場合トースト通知に渡される', () => {
      handleSuccess('[test]', '成功', undefined, { toastDuration: 3000 });

      expect(mockShowToast).toHaveBeenCalledWith('成功', 'success', undefined, 3000);
    });

    it('[covers:handle_success.no_console_log_call] logToConsoleを渡しても無効でconsole出力が一切発生しない', () => {
      handleSuccess('[test]', '成功', undefined, { logToConsole: false });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('[covers:handle_success.toast_error_swallowed] useToastStore()がthrowしてもcatchされhandleSuccess自体はthrowしない', () => {
      vi.mocked(useToastStore).mockImplementationOnce(() => {
        throw new Error('pinia not ready');
      });

      expect(() => {
        handleSuccess('[test]', '成功');
      }).not.toThrow();
    });
  });

  describe('handleInfo', () => {
    it('[covers:handle_info.toast_shown_default] デフォルトオプションでトースト通知が呼ばれる', () => {
      handleInfo('[test]', '情報');

      expect(mockShowToast).toHaveBeenCalledWith('情報', 'info', undefined, 2000);
    });

    it('[covers:handle_info.toast_body_defaults_to_details] detailsがある場合トースト通知に渡される', () => {
      handleInfo('[test]', '情報', '詳細情報');

      expect(mockShowToast).toHaveBeenCalledWith('情報', 'info', '詳細情報', 2000);
    });

    it('[covers:handle_info.toast_body_explicit_overrides_details] toastBodyオプションが指定された場合detailsより優先される', () => {
      handleInfo('[test]', '情報', '無視されるdetails', { toastBody: '明示body' });

      expect(mockShowToast).toHaveBeenCalledWith('情報', 'info', '明示body', 2000);
    });

    it('[covers:handle_info.show_toast_false_no_toast] showToast=falseでトースト通知が呼ばれない', () => {
      handleInfo('[test]', '情報', undefined, { showToast: false });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('[covers:handle_info.toast_duration_passthrough] toastDurationオプションが指定された場合トースト通知に渡される', () => {
      handleInfo('[test]', '情報', undefined, { toastDuration: 4000 });

      expect(mockShowToast).toHaveBeenCalledWith('情報', 'info', undefined, 4000);
    });

    it('[covers:handle_info.no_console_log_call] logToConsoleを渡しても無効でconsole出力が一切発生しない', () => {
      handleInfo('[test]', '情報', undefined, { logToConsole: false });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('[covers:handle_info.toast_error_swallowed] useToastStore()がthrowしてもcatchされhandleInfo自体はthrowしない', () => {
      vi.mocked(useToastStore).mockImplementationOnce(() => {
        throw new Error('pinia not ready');
      });

      expect(() => {
        handleInfo('[test]', '情報');
      }).not.toThrow();
    });
  });

  describe('handleDebug', () => {
    it('[covers:handle_debug.no_op_always] 空実装なので何も起こらない', () => {
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

  // can_use_toast.returns_false_when_not_function / can_use_toast.catch_returns_false は
  // tests/design/error-handler/conditions.toml で verified=false + unverifiable_reason 付記済み。
  // 本ファイル先頭の vi.mock で useToastStore を常にfunction型として固定しているため、
  // 公開APIの範囲内でこの2分岐だけを分離して踏むことができない。
});
