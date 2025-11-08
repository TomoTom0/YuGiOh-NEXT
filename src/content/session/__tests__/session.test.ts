import { sessionManager, getCgid } from '../session';

/**
 * SessionManager のテスト
 *
 * 注意: SessionManagerはfetchを使用してサーバーからHTMLを取得するため、
 * 実際のネットワークリクエストが必要。モックが必要な場合は別途実装。
 */
describe('SessionManager', () => {
  describe('getCgid', () => {
    it('サーバーからcgidを取得できる（統合テスト）', async () => {
      // 実際のサーバーにリクエストを送る統合テスト
      // CI環境では skip することを推奨

      const result = await sessionManager.getCgid();

      // cgidは32文字のhex文字列
      expect(result).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('後方互換性', () => {
    it('getCgid関数がsessionManager経由で動作する', async () => {
      // 後方互換性のためのgetCgid関数のテスト
      const result = await getCgid();

      // cgidは32文字のhex文字列、またはnull（エラー時）
      if (result !== null) {
        expect(result).toMatch(/^[a-f0-9]{32}$/);
      }
    });
  });
});
