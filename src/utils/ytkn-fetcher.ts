/**
 * デッキ編集フォーム（ope=2）からytknを取得
 *
 * @param cgid ユーザー識別子
 * @param dno デッキ番号
 * @param apiEndpoint APIエンドポイント
 * @returns ytkn、取得失敗時はnull
 */

import axios from 'axios';

export async function fetchYtknFromEditForm(
  cgid: string,
  dno: number,
  apiEndpoint: string
): Promise<string | null> {
  try {
    const editUrl = `${apiEndpoint}?ope=2&wname=MemberDeck&cgid=${cgid}&dno=${dno}&request_locale=ja`;
    const response = await axios.get(editUrl, { withCredentials: true });
    const parser = new DOMParser();
    const doc = parser.parseFromString(response.data, 'text/html');
    const ytknInput = doc.querySelector('input#ytkn') as HTMLInputElement;
    return ytknInput ? ytknInput.value : null;
  } catch (error) {
    console.error('[fetchYtknFromEditForm] Failed to fetch ytkn:', error);
    return null;
  }
}

/**
 * デッキ一覧ページ（ope=4）からytknを取得
 *
 * @param cgid ユーザー識別子
 * @param apiEndpoint APIエンドポイント
 * @returns ytkn、取得失敗時はnull
 */
export async function fetchYtknFromDeckList(
  cgid: string,
  apiEndpoint: string
): Promise<string | null> {
  try {
    const listUrl = `${apiEndpoint}?ope=4&wname=MemberDeck&cgid=${cgid}`;
    const response = await axios.get(listUrl, { withCredentials: true });
    const parser = new DOMParser();
    const doc = parser.parseFromString(response.data, 'text/html');
    const ytknInput = doc.querySelector('input[name="ytkn"]') as HTMLInputElement;
    return ytknInput ? ytknInput.value : null;
  } catch (error) {
    console.error('[fetchYtknFromDeckList] Failed to fetch ytkn:', error);
    return null;
  }
}
