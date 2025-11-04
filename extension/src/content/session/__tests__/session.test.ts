import { getCgid, getYtkn } from '../session';

/**
 * セッション情報取得関数のテスト
 */
describe('セッション情報取得', () => {
  describe('getCgid', () => {
    afterEach(() => {
      // テスト後にDOMをクリア
      document.body.innerHTML = '';
    });

    it('hidden inputからcgidを取得できる', () => {
      // Arrange
      const testCgid = 'a'.repeat(32); // 32文字のhex
      document.body.innerHTML = `
        <input type="hidden" name="cgid" value="${testCgid}">
      `;

      // Act
      const result = getCgid();

      // Assert
      expect(result).toBe(testCgid);
    });

    it('リンクのhref属性からcgidを取得できる', () => {
      const testCgid = 'b'.repeat(32);
      document.body.innerHTML = `
        <a href="/yugiohdb/member_deck.action?ope=4&cgid=${testCgid}">デッキ一覧</a>
      `;

      const result = getCgid();
      expect(result).toBe(testCgid);
    });

    it('cgidが存在しない場合はnullを返す', () => {
      document.body.innerHTML = `
        <div>No cgid here</div>
      `;

      const result = getCgid();
      expect(result).toBeNull();
    });

  });

  describe('getYtkn', () => {
    it('input[name="ytkn"]要素から値を取得できる', () => {
      // Arrange
      const testYtkn = 'c'.repeat(64); // 64文字のhex
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="ytkn" value="${testYtkn}">
        </form>
      `;

      // Act
      const result = getYtkn();

      // Assert
      expect(result).toBe(testYtkn);
    });

    it('複数のinput要素がある場合でもytknを取得できる', () => {
      const testYtkn = 'd'.repeat(64);
      document.body.innerHTML = `
        <form>
          <input type="text" name="username">
          <input type="hidden" name="ytkn" value="${testYtkn}">
          <input type="submit" value="Submit">
        </form>
      `;

      const result = getYtkn();
      expect(result).toBe(testYtkn);
    });

    it('ytknが存在しない場合はnullを返す', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="other">
        </form>
      `;

      const result = getYtkn();
      expect(result).toBeNull();
    });

    it('ytknの値が空文字列の場合はnullを返す', () => {
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="ytkn" value="">
        </form>
      `;

      const result = getYtkn();
      expect(result).toBeNull();
    });

    it('form要素がない場合でもytknを取得できる', () => {
      const testYtkn = 'e'.repeat(64);
      document.body.innerHTML = `
        <div>
          <input type="hidden" name="ytkn" value="${testYtkn}">
        </div>
      `;

      const result = getYtkn();
      expect(result).toBe(testYtkn);
    });

    afterEach(() => {
      // テスト後にDOMをクリア
      document.body.innerHTML = '';
    });
  });
});
