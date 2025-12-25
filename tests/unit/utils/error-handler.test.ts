import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleError,
  handleWarning,
  handleSuccess,
  handleInfo,
  handleDebug,
} from '../../../src/utils/error-handler';

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
    it('デフォルトオプションでconsole.errorとトースト通知が呼ばれる', () => {
      handleError('[test]', 'テストエラー');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[test] テストエラー');
      expect(mockShowToast).toHaveBeenCalledWith('テストエラー', 'error', undefined, 5000);
    });

    it('エラーオブジェクトがある場合console.errorに渡される', () => {
      const error = new Error('詳細エラー');
      handleError('[test]', 'テストエラー', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[test] テストエラー', error);
      expect(mockShowToast).toHaveBeenCalledWith('テストエラー', 'error', '詳細エラー', 5000);
    });

    it('logToConsole=falseでconsole.errorが呼ばれない', () => {
      handleError('[test]', 'テストエラー', undefined, { logToConsole: false });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('showToast=falseでトースト通知が呼ばれない', () => {
      handleError('[test]', 'テストエラー', undefined, { showToast: false });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('toastBodyオプションが指定された場合トースト通知に渡される', () => {
      handleError('[test]', 'テストエラー', undefined, { toastBody: '追加情報' });

      expect(mockShowToast).toHaveBeenCalledWith('テストエラー', 'error', '追加情報', 5000);
    });

    it('toastDurationオプションが指定された場合トースト通知に渡される', () => {
      handleError('[test]', 'テストエラー', undefined, { toastDuration: 10000 });

      expect(mockShowToast).toHaveBeenCalledWith('テストエラー', 'error', undefined, 10000);
    });
  });

  describe('handleWarning', () => {
    it('デフォルトオプションでconsole.warnとトースト通知が呼ばれる', () => {
      handleWarning('[test]', 'テスト警告');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[test] テスト警告');
      expect(mockShowToast).toHaveBeenCalledWith('テスト警告', 'warning', undefined, 3000);
    });

    it('detailsがある場合console.warnとトースト通知に渡される', () => {
      handleWarning('[test]', 'テスト警告', '詳細情報');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[test] テスト警告', '詳細情報');
      expect(mockShowToast).toHaveBeenCalledWith('テスト警告', 'warning', '詳細情報', 3000);
    });

    it('logToConsole=falseでconsole.warnが呼ばれない', () => {
      handleWarning('[test]', 'テスト警告', undefined, { logToConsole: false });

      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('showToast=falseでトースト通知が呼ばれない', () => {
      handleWarning('[test]', 'テスト警告', undefined, { showToast: false });

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('toastDurationオプションが指定された場合トースト通知に渡される', () => {
      handleWarning('[test]', 'テスト警告', undefined, { toastDuration: 5000 });

      expect(mockShowToast).toHaveBeenCalledWith('テスト警告', 'warning', undefined, 5000);
    });
  });

  describe('handleSuccess', () => {
    it('デフォルトオプションでトースト通知が呼ばれる', () => {
      handleSuccess('[test]', '成功');

      expect(mockShowToast).toHaveBeenCalledWith('成功', 'success', undefined, 2000);
    });

    it('detailsがある場合トースト通知に渡される', () => {
      handleSuccess('[test]', '成功', '詳細情報');

      expect(mockShowToast).toHaveBeenCalledWith('成功', 'success', '詳細情報', 2000);
    });

    it('showToast=falseでトースト通知が呼ばれない', () => {
      handleSuccess('[test]', '成功', undefined, { showToast: false });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('toastDurationオプションが指定された場合トースト通知に渡される', () => {
      handleSuccess('[test]', '成功', undefined, { toastDuration: 3000 });

      expect(mockShowToast).toHaveBeenCalledWith('成功', 'success', undefined, 3000);
    });
  });

  describe('handleInfo', () => {
    it('デフォルトオプションでトースト通知が呼ばれる', () => {
      handleInfo('[test]', '情報');

      expect(mockShowToast).toHaveBeenCalledWith('情報', 'info', undefined, 2000);
    });

    it('detailsがある場合トースト通知に渡される', () => {
      handleInfo('[test]', '情報', '詳細情報');

      expect(mockShowToast).toHaveBeenCalledWith('情報', 'info', '詳細情報', 2000);
    });

    it('showToast=falseでトースト通知が呼ばれない', () => {
      handleInfo('[test]', '情報', undefined, { showToast: false });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('toastDurationオプションが指定された場合トースト通知に渡される', () => {
      handleInfo('[test]', '情報', undefined, { toastDuration: 4000 });

      expect(mockShowToast).toHaveBeenCalledWith('情報', 'info', undefined, 4000);
    });
  });

  describe('handleDebug', () => {
    it('空実装なので何も起こらない', () => {
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
});
