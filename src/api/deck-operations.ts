import { DeckInfo, DeckListItem, OperationResult, DeckCardRef } from '@/types/deck';
import { parseDeckDetail } from '@/content/parser/deck-detail-parser';
import { parseDeckList } from '@/content/parser/deck-list-parser';
import { detectLanguage } from '@/utils/language-detector';
import { getTempCardDB } from '@/utils/temp-card-db';
import { fetchYtknFromDeckList, fetchYtknFromEditForm } from '@/utils/ytkn-fetcher';

const API_ENDPOINT_OCG = 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action';
const API_ENDPOINT_RUSH = 'https://www.db.yugioh-card.com/rushdb/member_deck.action';

/**
 * 現在のURLからRush/OCGを判定してAPIエンドポイントを返す
 */
function getApiEndpoint(): string {
  const pathname = window.location.pathname;
  const isRush = pathname.startsWith('/rushdb/');
  return isRush ? API_ENDPOINT_RUSH : API_ENDPOINT_OCG;
}

/**
 * 新規デッキを作成する（内部関数）
 *
 * @param cgid ユーザー識別子
 * @returns 新しいデッキ番号、失敗時は0
 * @internal SessionManager経由で呼び出すこと
 */
export async function createNewDeckInternal(cgid: string): Promise<number> {
  try {
    const API_ENDPOINT = getApiEndpoint();
    
    // デッキ一覧（ope=4）からytknを取得
    const ytkn = await fetchYtknFromDeckList(cgid, API_ENDPOINT);
    
    if (!ytkn) {
      console.error('[createNewDeckInternal] Failed to fetch ytkn');
      return 0;
    }
    
    const wname = 'MemberDeck';
    
    // URLを構築（パラメータ順序: ope, wname, cgid, ytkn）
    const url = `${API_ENDPOINT}?ope=6&wname=${wname}&cgid=${cgid}&ytkn=${ytkn}`;

    // axiosを動的インポート
    const { default: axios } = await import('axios');
    const response = await axios.get(url, {
      withCredentials: true
    });

    const html = response.data;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // デッキ一覧をパースして最大のdnoを取得
    const deckList = parseDeckList(doc);
    
    if (deckList.length === 0) {
      console.error('[createNewDeckInternal] No decks found in list after creation');
      return 0;
    }
    
    const maxDno = Math.max(...deckList.map(deck => deck.dno));
    return maxDno;
  } catch (error) {
    console.error('[createNewDeckInternal] Failed to create new deck:', error);
    return 0;
  }
}


/**
 * デッキを削除する
 * 
 * @param cgid ユーザー識別子
 * @param dno デッキ番号
 * @returns 成功時true、失敗時false
 * @internal SessionManager経由で呼び出すこと
 */
export async function deleteDeckInternal(cgid: string, dno: number): Promise<boolean> {
  try {
    const API_ENDPOINT = getApiEndpoint();
    
    // デッキ詳細（ope=1）からytknを取得
    const ytkn = await fetchYtknFromEditForm(cgid, dno, API_ENDPOINT);
    
    if (!ytkn) {
      console.error('[deleteDeckInternal] Failed to fetch ytkn');
      return false;
    }
    
    const wname = 'MemberDeck';
    const requestLocale = detectLanguage(document);
    
    // URLを構築
    const params = new URLSearchParams({
      cgid,
      request_locale: requestLocale,
      dno: dno.toString(),
      ope: '7',
      wname,
      ytkn
    });
    
    const url = `${API_ENDPOINT}?${params.toString()}`;

    // axiosを動的インポート
    const { default: axios } = await import('axios');
    const response = await axios.get(url, {
      withCredentials: true
    });

    return response.status === 200;
  } catch (error) {
    console.error('[deleteDeckInternal] Failed to delete deck:', error);
    return false;
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

    // カテゴリー（個別のIDを複数回送信 + 空のtxt_フィールド + フラグ）
    const categories = deckData.category || [];
    categories.forEach(id => {
      params.append('dckCategoryMst', id);
    });
    params.append('txt_dctCategoryMst', '');
    params.append('category_serch_flg', 'on');

    // タグ（個別のIDを複数回送信 + 空のtxt_フィールド + フラグ）
    const tags = deckData.tags || [];
    tags.forEach(id => {
      params.append('dckTagMst', id);
    });
    params.append('txt_dctTagMst', '');
    params.append('serch_flg', 'on');

    // コメント
    params.append('biko', deckData.comment || '');

    // カード情報を追加（デッキタイプによってフィールド名が異なる）
    // 順序: メインデッキ（monm → spnm → trnm）→ エクストラ → サイド
    
    const TOTAL_MAIN_SLOTS = 65;  // メイン: モンスター/魔法/罠それぞれ65枠
    const TOTAL_EXTRA_SLOTS = 20;  // エクストラ: 20枠
    const TOTAL_SIDE_SLOTS = 20;   // サイド: 20枠

    const tempCardDB = getTempCardDB();

    // メインデッキ: モンスター（実カード→空き枠）
    const mainMonsters = deckData.mainDeck.filter(c => {
      const card = tempCardDB.get(c.cid);
      return card?.cardType === 'monster';
    });
    mainMonsters.forEach(cardRef => {
      appendCardToFormData(params, cardRef, 'main');
    });
    for (let i = 0; i < TOTAL_MAIN_SLOTS - mainMonsters.length; i++) {
      params.append('monm', '');
      params.append('monum', '0');
      params.append('monsterCardId', '');
      params.append('imgs', 'null_null_null_null');
    }

    // メインデッキ: 魔法（実カード→空き枠）
    const mainSpells = deckData.mainDeck.filter(c => {
      const card = tempCardDB.get(c.cid);
      return card?.cardType === 'spell';
    });
    mainSpells.forEach(cardRef => {
      appendCardToFormData(params, cardRef, 'main');
    });
    for (let i = 0; i < TOTAL_MAIN_SLOTS - mainSpells.length; i++) {
      params.append('spnm', '');
      params.append('spnum', '0');
      params.append('spellCardId', '');
      params.append('imgs', 'null_null_null_null');
    }

    // メインデッキ: 罠（実カード→空き枠）
    const mainTraps = deckData.mainDeck.filter(c => {
      const card = tempCardDB.get(c.cid);
      return card?.cardType === 'trap';
    });
    mainTraps.forEach(cardRef => {
      appendCardToFormData(params, cardRef, 'main');
    });
    for (let i = 0; i < TOTAL_MAIN_SLOTS - mainTraps.length; i++) {
      params.append('trnm', '');
      params.append('trnum', '0');
      params.append('trapCardId', '');
      params.append('imgs', 'null_null_null_null');
    }

    // エクストラデッキ（実カード→空き枠）
    deckData.extraDeck.forEach(cardRef => {
      appendCardToFormData(params, cardRef, 'extra');
    });
    for (let i = 0; i < TOTAL_EXTRA_SLOTS - deckData.extraDeck.length; i++) {
      params.append('exnm', '');
      params.append('exnum', '0');
      params.append('extraCardId', '');
      params.append('imgs', 'null_null_null_null');
    }

    // サイドデッキ（実カード→空き枠）
    deckData.sideDeck.forEach(cardRef => {
      appendCardToFormData(params, cardRef, 'side');
    });
    for (let i = 0; i < TOTAL_SIDE_SLOTS - deckData.sideDeck.length; i++) {
      params.append('sinm', '');
      params.append('sinum', '0');
      params.append('sideCardId', '');
      params.append('imgsSide', 'null_null_null_null');
    }

    const requestLocale = detectLanguage(document);
    const API_ENDPOINT = getApiEndpoint();
    const postUrl = `${API_ENDPOINT}?cgid=${cgid}&request_locale=${requestLocale}`;
    const encoded_params = params.toString().replace(/\+/g, '%20'); // '+'を'%20'に変換


    // 公式の実装に合わせて、URLSearchParamsを直接渡す
    // axiosが自動的にContent-Typeをapplication/x-www-form-urlencodedに設定する
    // paramsはurl encodeされる必要がある, +は%20に変換されるべき

    // axiosを動的インポート
    const { default: axios } = await import('axios');
    const response = await axios.post(postUrl, encoded_params, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    const data = response.data;
    
    // 公式の判定方法に合わせる
    if (data.result) {
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
  deckCardRef: DeckCardRef,
  deckType: 'main' | 'extra' | 'side'
): void {
  const { cid, ciid, quantity } = deckCardRef;
  const tempCardDB = getTempCardDB();
  const card = tempCardDB.get(cid);

  if (!card) {
    console.error(`[appendCardToFormData] Card not found in TempCardDB: ${cid}`);
    return;
  }

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
    target.append(cardIdField, cid);
    target.append('imgs', `${cid}_${ciid}_1_1`);

  } else if (deckType === 'extra') {
    // エクストラデッキ: 統一フィールド名
    target.append('exnm', card.name);
    target.append('exnum', quantity.toString());
    target.append('extraCardId', cid);
    target.append('imgs', `${cid}_${ciid}_1_1`);

  } else {
    // サイドデッキ: 統一フィールド名（imgsフィールド名が異なる）
    target.append('sinm', card.name);
    target.append('sinum', quantity.toString());
    target.append('sideCardId', cid);
    target.append('imgsSide', `${cid}_${ciid}_1_1`);
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
    const requestLocale = detectLanguage(document);
    const API_ENDPOINT = getApiEndpoint();

    // URLパラメータを構築
    const params = new URLSearchParams({
      ope: '1',
      dno: dno.toString(),
      request_locale: requestLocale
    });

    // cgidが指定されている場合は追加
    if (cgid) {
      params.append('cgid', cgid);
    }

    // axiosを動的インポート
    const { default: axios } = await import('axios');
    const response = await axios.get(`${API_ENDPOINT}?${params.toString()}`, {
      withCredentials: true
    });

    const html = response.data;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // parseDeckDetailを使用してデッキ情報を抽出
    const deckInfo = await parseDeckDetail(doc);

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
    const requestLocale = detectLanguage(document);
    const API_ENDPOINT = getApiEndpoint();
    
    // URLパラメータを構築
    const params = new URLSearchParams({
      ope: '4',
      cgid: cgid,
      request_locale: requestLocale
    });

    // axiosを動的インポート
    const { default: axios } = await import('axios');
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
