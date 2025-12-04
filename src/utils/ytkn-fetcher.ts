import { buildApiUrl } from './url-builder';
import type { CardGameType } from '@/types/settings';

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
  gameType: CardGameType
): Promise<string | null> {
  try {
    // ope=2 はデッキ編集フォーム取得で、request_locale 付与対象
    // buildApiUrl経由で自動付与される
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
  gameType: CardGameType
): Promise<string | null> {
  try {
    // buildApiUrl()でベースURLを取得し、パラメータを手動で追加
    // パラメータ順序を保証するため、URLクラスの searchParams は使わない
    // noLocale: true を指定して request_locale を絶対に付与しない
    const baseUrl = buildApiUrl('member_deck.action', gameType, undefined, true);
    const listUrl = `${baseUrl}?ope=4&wname=MemberDeck&cgid=${cgid}`;

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
