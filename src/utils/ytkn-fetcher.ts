/**
 * デッキ編集フォーム（ope=2）からytknを取得
 *
 * @param cgid ユーザー識別子
 * @param dno デッキ番号
 * @param gameType カードゲームタイプ
 * @returns ytkn、取得失敗時はnull
 */

export async function fetchYtknFromEditForm(
  cgid: string,
  dno: number,
  gameType: import('@/types/settings').CardGameType
): Promise<string | null> {
  try {
    // ope=2 はデッキ編集フォーム取得で、request_locale 付与対象
    // buildApiUrl経由で自動付与される
    const { buildApiUrl } = await import('./url-builder');
    const path = `member_deck.action?ope=2&wname=MemberDeck&cgid=${cgid}&dno=${dno}`;
    const editUrl = buildApiUrl(path, gameType);

    const { default: axios } = await import('axios');
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
 * @param gameType カードゲームタイプ
 * @returns ytkn、取得失敗時はnull
 */
export async function fetchYtknFromDeckList(
  cgid: string,
  gameType: import('@/types/settings').CardGameType
): Promise<string | null> {
  try {
    // ope=4 はデッキリスト取得で、request_locale 不付与
    // buildApiUrl経由で自動削除される
    const { buildApiUrl } = await import('./url-builder');
    const path = `member_deck.action?ope=4&wname=MemberDeck&cgid=${cgid}`;
    const listUrl = buildApiUrl(path, gameType);

    const { default: axios } = await import('axios');
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
