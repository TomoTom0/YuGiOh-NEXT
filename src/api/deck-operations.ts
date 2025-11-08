import axios from 'axios';
import { DeckInfo, DeckListItem, OperationResult } from '@/types/deck';
import { DeckCard } from '@/types/card';
import { parseDeckDetail } from '@/content/parser/deck-detail-parser';
import { parseDeckList } from '@/content/parser/deck-list-parser';

const BASE_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action';

/**
 * 新規デッキを作成する（内部関数）
 *
 * @param cgid ユーザー識別子
 * @returns 新しいデッキ番号、失敗時は0
 * @internal SessionManager経由で呼び出すこと
 */
export async function createNewDeckInternal(cgid: string): Promise<number> {
  try {
    const response = await axios.get(`${BASE_URL}?ope=6&cgid=${cgid}`, {
      withCredentials: true
    });

    const html = response.data;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const dnoInput = doc.querySelector('input[name="dno"]') as HTMLInputElement;
    const dno = dnoInput?.value ? parseInt(dnoInput.value, 10) : 0;

    return dno;
  } catch (error) {
    console.error('Failed to create new deck:', error);
    return 0;
  }
}

/**
 * デッキを複製する（内部関数）
 *
 * @param cgid ユーザー識別子
 * @param dno 複製元のデッキ番号
 * @returns 新しいデッキ番号、失敗時は0
 * @internal SessionManager経由で呼び出すこと
 */
export async function duplicateDeckInternal(cgid: string, dno: number): Promise<number> {
  try {
    const response = await axios.get(`${BASE_URL}?ope=8&cgid=${cgid}&dno=${dno}`, {
      withCredentials: true
    });

    const html = response.data;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const dnoInput = doc.querySelector('input[name="dno"]') as HTMLInputElement;
    const newDno = dnoInput?.value ? parseInt(dnoInput.value, 10) : 0;

    return newDno;
  } catch (error) {
    console.error('Failed to duplicate deck:', error);
    return 0;
  }
}

/**
 * デッキを保存する（内部関数）
 *
 * @param cgid ユーザー識別子
 * @param dno デッキ番号
 * @param deckData デッキ情報
 * @param ytkn CSRFトークン
 * @returns 操作結果
 * @internal SessionManager経由で呼び出すこと
 */
export async function saveDeckInternal(
  cgid: string,
  dno: number,
  deckData: DeckInfo,
  ytkn: string
): Promise<OperationResult> {
  try {
    const formData = new FormData();

    // 基本情報
    formData.append('ope', '3');
    formData.append('cgid', cgid);
    formData.append('dno', dno.toString());
    formData.append('ytkn', ytkn);
    formData.append('deck_name', deckData.name);

    // 公開設定
    if (deckData.isPublic) {
      formData.append('is_public', 'on');
    }

    // デッキタイプ
    if (deckData.deckType !== undefined) {
      formData.append('deck_type', deckData.deckType.toString());
    }

    // コメント
    if (deckData.comment !== undefined) {
      formData.append('comment', deckData.comment);
    }

    // カード情報を追加
    deckData.mainDeck.forEach(card => {
      appendCardToFormData(formData, card, 'main');
    });
    deckData.extraDeck.forEach(card => {
      appendCardToFormData(formData, card, 'extra');
    });
    deckData.sideDeck.forEach(card => {
      appendCardToFormData(formData, card, 'side');
    });

    const response = await axios.post(BASE_URL, formData, {
      withCredentials: true
    });

    const html = response.data;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // エラーチェック
    const errorElements = doc.querySelectorAll('.error');
    if (errorElements.length > 0) {
      const errors = Array.from(errorElements).map(el => el.textContent?.trim() || '');
      return {
        success: false,
        error: errors
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to save deck:', error);
    return {
      success: false,
      error: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * デッキを削除する（内部関数）
 *
 * @param cgid ユーザー識別子
 * @param dno デッキ番号
 * @param ytkn CSRFトークン
 * @returns 操作結果
 * @internal SessionManager経由で呼び出すこと
 */
export async function deleteDeckInternal(
  cgid: string,
  dno: number,
  ytkn: string
): Promise<OperationResult> {
  try {
    const formData = new FormData();
    formData.append('ope', '7');
    formData.append('cgid', cgid);
    formData.append('dno', dno.toString());
    formData.append('ytkn', ytkn);

    const response = await axios.post(BASE_URL, formData, {
      withCredentials: true
    });

    const html = response.data;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // エラーチェック
    const errorElements = doc.querySelectorAll('.error');
    if (errorElements.length > 0) {
      const errors = Array.from(errorElements).map(el => el.textContent?.trim() || '');
      return {
        success: false,
        error: errors
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to delete deck:', error);
    return {
      success: false,
      error: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * FormDataにカード情報を追加する
 *
 * @param formData FormDataオブジェクト
 * @param card カード情報
 * @param _deckType デッキタイプ（使用しない、互換性のため残す）
 */
function appendCardToFormData(
  formData: FormData,
  deckCard: DeckCard,
  _deckType: 'main' | 'extra' | 'side'
): void {
  const { card, quantity } = deckCard;

  // カードタイプに応じたフィールド名を使用
  let cardIdName: string;
  let imgsName: string;
  let numberName: string;

  if (card.cardType === 'monster') {
    cardIdName = 'monsterCardId';
    imgsName = 'monster_imgs';
    numberName = 'monster_card_number';
  } else if (card.cardType === 'spell') {
    cardIdName = 'spellCardId';
    imgsName = 'spell_imgs';
    numberName = 'spell_card_number';
  } else {
    // 罠
    cardIdName = 'trapCardId';
    imgsName = 'trap_imgs';
    numberName = 'trap_card_number';
  }

  formData.append(cardIdName, card.cardId);
  formData.append(imgsName, card.imageId || '1');
  formData.append(numberName, quantity.toString());
}

/**
 * デッキ個別情報を取得する
 *
 * @param dno デッキ番号
 * @param cgid ユーザー識別子（非公開デッキの場合は必須、公開デッキの場合は省略可）
 * @returns デッキ情報、取得失敗時はnull
 *
 * @example
 * ```typescript
 * // 公開デッキを取得
 * const deck = await getDeckDetail(95);
 *
 * // 非公開デッキを取得（cgid必須）
 * const deck = await getDeckDetail(3, 'your-cgid-here');
 * ```
 */
export async function getDeckDetail(dno: number, cgid?: string): Promise<DeckInfo | null> {
  try {
    // URLパラメータを構築
    const params = new URLSearchParams({
      ope: '1',
      dno: dno.toString(),
      request_locale: 'ja'
    });

    // cgidが指定されている場合は追加
    if (cgid) {
      params.append('cgid', cgid);
    }

    const response = await axios.get(`${BASE_URL}?${params.toString()}`, {
      withCredentials: true
    });

    const html = response.data;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // parseDeckDetailを使用してデッキ情報を抽出
    const deckInfo = parseDeckDetail(doc);

    return deckInfo;
  } catch (error) {
    console.error('Failed to get deck detail:', error);
    return null;
  }
}

/**
 * マイデッキ一覧を取得する（内部関数）
 *
 * @param cgid ユーザー識別子
 * @returns デッキ一覧、取得失敗時は空配列
 * @internal SessionManager経由で呼び出すこと
 *
 * @example
 * ```typescript
 * const deckList = await getDeckListInternal('your-cgid-here');
 * console.log(`Found ${deckList.length} decks`);
 * ```
 */
export async function getDeckListInternal(cgid: string): Promise<DeckListItem[]> {
  try {
    // URLパラメータを構築
    const params = new URLSearchParams({
      ope: '4',
      cgid: cgid,
      request_locale: 'ja'
    });

    const response = await axios.get(`${BASE_URL}?${params.toString()}`, {
      withCredentials: true
    });

    const html = response.data;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // parseDeckListを使用してデッキ一覧を抽出
    const deckList = parseDeckList(doc);

    return deckList;
  } catch (error) {
    console.error('Failed to get deck list:', error);
    return [];
  }
}
