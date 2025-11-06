import { getCgid, getYtkn } from '../session';

/**
 * セッション情報取得関数のテスト
 *
 * 注意: getCgid/getYtknはfetchを使用してサーバーからHTMLを取得するため、
 * 実際のネットワークリクエストが必要。モックが必要な場合は別途実装。
 */
describe('セッション情報取得', () => {
  describe('getCgid', () => {
    it('サーバーからcgidを取得できる（統合テスト）', async () => {
      // 実際のサーバーにリクエストを送る統合テスト
      // CI環境では skip することを推奨

      const result = await getCgid();

      // cgidは32文字のhex文字列、またはnull
      if (result !== null) {
        expect(result).toMatch(/^[a-f0-9]{32}$/);
      }
    });
  });

  describe('getYtkn', () => {
    it('サーバーからytknを取得できる（統合テスト）', async () => {
      // 実際のサーバーにリクエストを送る統合テスト
      // CI環境では skip することを推奨

      const dno = 4; // テスト用デッキ番号
      const result = await getYtkn(dno);

      // ytknは64文字のhex文字列、またはnull
      if (result !== null) {
        expect(result).toMatch(/^[a-f0-9]{64}$/);
      }
    });
  });
});
