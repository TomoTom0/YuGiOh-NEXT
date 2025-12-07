import { DeckInfo, DeckListItem, OperationResult, DeckCardRef } from '@/types/deck';
import { parseDeckDetail } from '@/content/parser/deck-detail-parser';
import { parseDeckList } from '@/content/parser/deck-list-parser';
import { getTempCardDB } from '@/utils/temp-card-db';
import { getUnifiedCacheDB } from '@/utils/unified-cache-db';
import { detectLanguage } from '@/utils/language-detector';
import { fetchYtknFromDeckList, fetchYtknFromEditForm } from '@/utils/ytkn-fetcher';
import { buildApiUrl } from '@/utils/url-builder';
import { detectCardGameType } from '@/utils/page-detector';

/**
 * 新規デッキを作成する（内部関数）
 *
 * @param cgid ユーザー識別子
 * @returns 新しいデッキ番号、失敗時は0
 * @internal SessionManager経由で呼び出すこと
 */
export async function createNewDeckInternal(cgid: string): Promise<number> {
  try {
    const gameType = detectCardGameType();

    // デッキ一覧（ope=4）からytknを取得
    const ytkn = await fetchYtknFromDeckList(cgid, gameType);

    if (!ytkn) {
      console.error('[createNewDeckInternal] Failed to fetch ytkn');
      return 0;
    }

    const wname = 'MemberDeck';

    // buildApiUrl()でベースURLを取得し、パラメータを手動で追加
    // パラメータ順序を保証するため、URLクラスの searchParams は使わない
    // noLocale: true を指定して request_locale を絶対に付与しない
    const baseUrl = buildApiUrl('member_deck.action', gameType, undefined, true);
    const url = `${baseUrl}?ope=6&wname=${wname}&cgid=${cgid}&ytkn=${ytkn}`;

    const { default: axios } = await import('axios');
    // NOTE: createNewDeckInternal はユーザー操作（新規デッキ作成）のクリティカルパスなため、
    // リクエストキューをバイパスして直接実行する（キューのオーバーヘッドを削減）
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
    const gameType = detectCardGameType();

    // デッキ詳細（ope=2）からytknを取得
    const ytkn = await fetchYtknFromEditForm(cgid, dno, gameType);

    if (!ytkn) {
      console.error('[deleteDeckInternal] Failed to fetch ytkn');
      return false;
    }

    const wname = 'MemberDeck';

    // URLを構築（buildApiUrl経由、ope=7は request_locale 付与）
    const path = `member_deck.action?ope=7&cgid=${cgid}&dno=${dno}&wname=${wname}&ytkn=${ytkn}`;
    const url = buildApiUrl(path, gameType);

    const { default: axios } = await import('axios');
    // NOTE: deleteDeckInternal はユーザー操作（デッキ削除）のクリティカルパスなため、
    // リクエストキューをバイパスして直接実行する（キューのオーバーヘッドを削減）
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

    const gameType = detectCardGameType();
    // buildApiUrl経由、ope=3は request_locale 付与
    const path = `member_deck.action?cgid=${cgid}`;
    const postUrl = buildApiUrl(path, gameType);
    const encoded_params = params.toString().replace(/\+/g, '%20'); // '+'を'%20'に変換


    // 公式の実装に合わせて、URLSearchParamsを直接渡す
    // axiosが自動的にContent-Typeをapplication/x-www-form-urlencodedに設定する
    // paramsはurl encodeされる必要がある, +は%20に変換されるべき

    const { default: axios } = await import('axios');
    // NOTE: saveDeckInternal はユーザー操作（デッキ保存）のクリティカルパスなため、
    // リクエストキューをバイパスして直接実行する（キューのオーバーヘッドを削減）
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
  const unifiedDB = getUnifiedCacheDB();
  const lang = detectLanguage(document);
  const card = unifiedDB.reconstructCardInfo(cid, lang);

  if (!card) {
    console.error(`[appendCardToFormData] Card not found in UnifiedCacheDB: ${cid}`);
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
    const gameType = detectCardGameType();

    // URLパラメータを構築
    let path = `member_deck.action?ope=1&dno=${dno}`;

    // cgidが指定されている場合は追加
    if (cgid) {
      path += `&cgid=${cgid}`;
    }

    // buildApiUrl経由、ope=1は request_locale 付与
    const url = buildApiUrl(path, gameType);

    const { default: axios } = await import('axios');
    // NOTE: getDeckDetail はユーザーがデッキ遷移時に待つクリティカルパスなため、
    // リクエストキューをバイパスして直接実行する（キューのオーバーヘッドを削減）
    const response = await axios.get(url, {
      withCredentials: true
    });

    const html = response.data;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // parseDeckDetailを使用してデッキ情報を抽出
    const deckInfo = await parseDeckDetail(doc);

    // 複数ciidを含むカード情報をChrome Storageに永続化（非同期で実行、UIをブロックしない）
    const { saveUnifiedCacheDB } = await import('@/utils/unified-cache-db');
    saveUnifiedCacheDB().catch(error => {
      console.error('[getDeckDetail] Failed to save UnifiedCacheDB:', error);
    });

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
    const gameType = detectCardGameType();

    // buildApiUrl経由、ope=4は request_locale なし
    const path = `member_deck.action?ope=4&cgid=${cgid}`;
    const url = buildApiUrl(path, gameType);

    const { default: axios } = await import('axios');
    // NOTE: getDeckListInternal はページ初期化時に待つクリティカルパスなため、
    // リクエストキューをバイパスして直接実行する（キューのオーバーヘッドを削減）
    const response = await axios.get(url, {
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
