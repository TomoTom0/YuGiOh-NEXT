import { DeckInfo, OperationResult } from '@/types/deck';

const BASE_URL = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action';

/**
 * 新規デッキを作成する
 *
 * @param cgid ユーザー識別子
 * @returns 新しいデッキ番号、失敗時は0
 */
export async function createNewDeck(cgid: string): Promise<number> {
  try {
    const response = await fetch(`${BASE_URL}?ope=6&cgid=${cgid}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return 0;
    }

    const html = await response.text();
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
 * デッキを複製する
 *
 * @param cgid ユーザー識別子
 * @param dno 複製元のデッキ番号
 * @returns 新しいデッキ番号、失敗時は0
 */
export async function duplicateDeck(cgid: string, dno: number): Promise<number> {
  try {
    const response = await fetch(`${BASE_URL}?ope=8&cgid=${cgid}&dno=${dno}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return 0;
    }

    const html = await response.text();
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
 * デッキを保存する
 *
 * @param cgid ユーザー識別子
 * @param dno デッキ番号
 * @param deckData デッキ情報
 * @param ytkn CSRFトークン
 * @returns 操作結果
 */
export async function saveDeck(
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

    const response = await fetch(BASE_URL, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      return {
        success: false,
        error: [`HTTP error: ${response.status}`]
      };
    }

    const html = await response.text();
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
 * デッキを削除する
 *
 * @param cgid ユーザー識別子
 * @param dno デッキ番号
 * @param ytkn CSRFトークン
 * @returns 操作結果
 */
export async function deleteDeck(
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

    const response = await fetch(BASE_URL, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      return {
        success: false,
        error: [`HTTP error: ${response.status}`]
      };
    }

    const html = await response.text();
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
  card: { cardId: string; cardType: string; imageId?: string; quantity: number },
  _deckType: 'main' | 'extra' | 'side'
): void {
  // カードタイプに応じたフィールド名を使用
  let cardIdName: string;
  let imgsName: string;
  let numberName: string;

  if (card.cardType === 'モンスター') {
    cardIdName = 'monsterCardId';
    imgsName = 'monster_imgs';
    numberName = 'monster_card_number';
  } else if (card.cardType === '魔法') {
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
  formData.append(numberName, card.quantity.toString());
}
