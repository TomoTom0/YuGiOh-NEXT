import axios from 'axios';
import { DeckInfo, DeckListItem, OperationResult } from '@/types/deck';
import { DeckCard } from '@/types/card';
import { parseDeckDetail } from '@/content/parser/deck-detail-parser';
import { parseDeckList } from '@/content/parser/deck-list-parser';

const API_ENDPOINT = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action';

/**
 * 新規デッキを作成する（内部関数）
 *
 * @param cgid ユーザー識別子
 * @returns 新しいデッキ番号、失敗時は0
 * @internal SessionManager経由で呼び出すこと
 */
export async function createNewDeckInternal(cgid: string): Promise<number> {
  try {
    const response = await axios.get(`${API_ENDPOINT}?ope=6&cgid=${cgid}`, {
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
    const response = await axios.get(`${API_ENDPOINT}?ope=8&cgid=${cgid}&dno=${dno}`, {
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
    console.log('[saveDeckInternal] Saving deck:', {
      dno,
      deckName: deckData.name,
      mainDeckCount: deckData.mainDeck.length,
      extraDeckCount: deckData.extraDeck.length,
      sideDeckCount: deckData.sideDeck.length
    });

    // URL-encoded形式でデータを構築（公式と同じ順序で）
    const params = new URLSearchParams();
    
    // ope=3を先頭に追加
    params.append('ope', '3');
    
    // 基本情報
    params.append('wname', 'MemberDeck');
    params.append('ytkn', ytkn);
    params.append('dnm', deckData.name);
    params.append('dno', dno.toString());

    // 公開設定
    if (deckData.isPublic !== undefined) {
      params.append('pflg', deckData.isPublic ? '1' : '0');
    }

    // デッキタイプ
    if (deckData.deckType !== undefined) {
      params.append('deck_type', deckData.deckType.toString());
    }

    // デッキスタイル
    params.append('deckStyle', deckData.deckStyle !== undefined ? deckData.deckStyle.toString() : '-1');

    // カテゴリー（txt_のみ送信、配列は送信しない）
    params.append('txt_dctCategoryMst', '');
    params.append('category_serch_flg', 'on');

    // タグ（txt_のみ送信、配列は送信しない）
    params.append('txt_dctTagMst', '');
    params.append('serch_flg', 'on');

    // コメント
    params.append('biko', deckData.comment || '');

    // カード情報を追加（デッキタイプによってフィールド名が異なる）
    // 順序: メインデッキ（monm → spnm → trnm）→ エクストラ → サイド
    
    const TOTAL_MAIN_SLOTS = 65;  // メイン: モンスター/魔法/罠それぞれ65枠
    const TOTAL_EXTRA_SLOTS = 20;  // エクストラ: 20枠
    const TOTAL_SIDE_SLOTS = 20;   // サイド: 20枠
    
    // メインデッキ: モンスター（実カード→空き枠）
    const mainMonsters = deckData.mainDeck.filter(c => c.card.cardType === 'monster');
    mainMonsters.forEach(card => {
      appendCardToFormData(params, card, 'main');
    });
    for (let i = 0; i < TOTAL_MAIN_SLOTS - mainMonsters.length; i++) {
      params.append('monm', '');
      params.append('monum', '0');
      params.append('monsterCardId', '');
      params.append('imgs', 'null_null_null_null');
    }
    
    // メインデッキ: 魔法（実カード→空き枠）
    const mainSpells = deckData.mainDeck.filter(c => c.card.cardType === 'spell');
    mainSpells.forEach(card => {
      appendCardToFormData(params, card, 'main');
    });
    for (let i = 0; i < TOTAL_MAIN_SLOTS - mainSpells.length; i++) {
      params.append('spnm', '');
      params.append('spnum', '0');
      params.append('spellCardId', '');
      params.append('imgs', 'null_null_null_null');
    }
    
    // メインデッキ: 罠（実カード→空き枠）
    const mainTraps = deckData.mainDeck.filter(c => c.card.cardType === 'trap');
    mainTraps.forEach(card => {
      appendCardToFormData(params, card, 'main');
    });
    for (let i = 0; i < TOTAL_MAIN_SLOTS - mainTraps.length; i++) {
      params.append('trnm', '');
      params.append('trnum', '0');
      params.append('trapCardId', '');
      params.append('imgs', 'null_null_null_null');
    }
    
    // エクストラデッキ（実カード→空き枠）
    deckData.extraDeck.forEach(card => {
      appendCardToFormData(params, card, 'extra');
    });
    for (let i = 0; i < TOTAL_EXTRA_SLOTS - deckData.extraDeck.length; i++) {
      params.append('exnm', '');
      params.append('exnum', '0');
      params.append('extraCardId', '');
      params.append('imgs', 'null_null_null_null');
    }
    
    // サイドデッキ（実カード→空き枠）
    deckData.sideDeck.forEach(card => {
      appendCardToFormData(params, card, 'side');
    });
    for (let i = 0; i < TOTAL_SIDE_SLOTS - deckData.sideDeck.length; i++) {
      params.append('sinm', '');
      params.append('sinum', '0');
      params.append('sideCardId', '');
      params.append('imgsSide', 'null_null_null_null');
    }

    const postUrl = `${API_ENDPOINT}?cgid=${cgid}&request_locale=ja`;
    const encoded_params = params.toString().replace(/\+/g, '%20'); // '+'を'%20'に変換
    
    console.log('[saveDeckInternal] POST URL:', postUrl);
    console.log('[saveDeckInternal] POST data:', encoded_params);
    //console.log('[saveDeckInternal] Total length:', params.toString().length);
    //console.log('[saveDeckInternal] Sending request...');
    
    // 公式の実装に合わせて、URLSearchParamsを直接渡す
    // axiosが自動的にContent-Typeをapplication/x-www-form-urlencodedに設定する
    // paramsはurl encodeされる必要がある, +は%20に変換されるべき
    const response = await axios.post(postUrl, encoded_params, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    console.log('[saveDeckInternal] Response received');
    
    const data = response.data;
    //console.log('[saveDeckInternal] Response data type:', typeof data);
    
    // HTMLが返ってきた場合はエラーページの可能性が高い
    // if (typeof data === 'string') {
    //   console.log('[saveDeckInternal] HTML response received (first 1000 chars):', data.substring(0, 1000));
    //   console.log('[saveDeckInternal] Full HTML length:', data.length);
      
    //   // エラーメッセージを抽出
    //   const parser = new DOMParser();
    //   const doc = parser.parseFromString(data, 'text/html');
      
    //   // より広範囲のセレクタでエラーを探す
    //   const errorElements = doc.querySelectorAll('.error, .alert, .message, .error_message, #message, .warning');
    //   if (errorElements.length > 0) {
    //     const errors = Array.from(errorElements).map(el => el.textContent?.trim() || '').filter(e => e);
    //     console.error('[saveDeckInternal] ❌ Error messages found in HTML:', errors);
    //     return {
    //       success: false,
    //       error: errors.length > 0 ? errors : ['エラーが発生しました']
    //     };
    //   }
      
    //   // bodyのテキストを確認
    //   const bodyText = doc.body?.textContent?.trim() || '';
    //   console.log('[saveDeckInternal] Body text (first 500 chars):', bodyText.substring(0, 500));
      
    //   console.error('[saveDeckInternal] ❌ HTML response but no error message found');
    //   return {
    //     success: false,
    //     error: ['予期しないHTMLレスポンスが返されました。ページをリロードして再試行してください。']
    //   };
    // }
    
    // // JSONレスポンスの場合
    // console.log('[saveDeckInternal] Response data.result:', data.result);
    // console.log('[saveDeckInternal] Response data.error:', data.error);
    
    // 公式の判定方法に合わせる
    if (data.result) {
      console.log('[saveDeckInternal] ✅ Save successful');
      return { success: true };
    } else {
      if (data.error) {
        console.error('[saveDeckInternal] ❌ Save failed:', data.error);
        return {
          success: false,
          error: data.error
        };
      }
      // data.resultがfalseでerrorもない場合
      console.error('[saveDeckInternal] ❌ Save failed: Unknown error (no error message from server)');
      return {
        success: false,
        error: ['保存に失敗しました']
      };
    }
  } catch (error) {
    console.error('[saveDeckInternal] Exception:', error);
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

    const response = await axios.post(API_ENDPOINT, formData, {
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
/**
 * カード情報をFormDataに追加する補助関数
 *
 * @param target FormDataまたはURLSearchParamsオブジェクト
 * @param deckCard デッキカード情報
 * @param deckType デッキタイプ（main/extra/side）
 */
function appendCardToFormData(
  target: FormData | URLSearchParams,
  deckCard: DeckCard,
  deckType: 'main' | 'extra' | 'side'
): void {
  const { card, quantity } = deckCard;

  if (deckType === 'main') {
    // メインデッキ: カードタイプ別のフィールド名
    let nameField: string;
    let numField: string;
    let cardIdField: string;

    if (card.cardType === 'monster') {
      nameField = 'monm';
      numField = 'monum';
      cardIdField = 'monsterCardId';
    } else if (card.cardType === 'spell') {
      nameField = 'spnm';
      numField = 'spnum';
      cardIdField = 'spellCardId';
    } else {
      // trap
      nameField = 'trnm';
      numField = 'trnum';
      cardIdField = 'trapCardId';
    }

    target.append(nameField, card.name);
    target.append(numField, quantity.toString());
    target.append(cardIdField, card.cardId);
    target.append('imgs', `${card.cardId}_${card.ciid}_1_1`);
    
  } else if (deckType === 'extra') {
    // エクストラデッキ: 統一フィールド名
    target.append('exnm', card.name);
    target.append('exnum', quantity.toString());
    target.append('extraCardId', card.cardId);
    target.append('imgs', `${card.cardId}_${card.ciid}_1_1`);
    
  } else {
    // サイドデッキ: 統一フィールド名（imgsフィールド名が異なる）
    target.append('sinm', card.name);
    target.append('sinum', quantity.toString());
    target.append('sideCardId', card.cardId);
    target.append('imgsSide', `${card.cardId}_${card.ciid}_1_1`);
  }
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

    const response = await axios.get(`${API_ENDPOINT}?${params.toString()}`, {
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

    const response = await axios.get(`${API_ENDPOINT}?${params.toString()}`, {
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
