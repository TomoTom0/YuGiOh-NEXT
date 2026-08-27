import { DeckInfo, DeckListItem, OperationResult, DeckCardRef } from '@/types/deck';
import { parseDeckDetail } from '@/content/parser/deck-detail-parser';
import { parseDeckList } from '@/content/parser/deck-list-parser';
import { getTempCacheDB } from '@/utils/temp-cache-db';
import { getUnifiedCacheDB } from '@/utils/unified-cache-db';
import { detectLanguage } from '@/utils/language-detector';
import { fetchYtknFromDeckList, fetchYtknFromEditForm } from '@/utils/ytkn-fetcher';
import { buildApiUrl } from '@/utils/url-builder';
import { detectCardGameType } from '@/utils/page-detector';
import { handleError, handleSuccess, handleDebug } from '@/utils/error-handler';
import { DECK_OPE, WNAME, API_ENDPOINT } from '@/constants/api-params';
import { isString, isArray } from '@/utils/type-guards';

/**
 * サーバーから返る data.error は配列以外（文字列・オブジェクト等）の場合があるため、
 * .join() 実行前に必ず string[] へ正規化する
 */
function normalizeErrorMessages(error: unknown): string[] {
  if (isArray<unknown>(error)) {
    return error.map(e => (isString(e) ? e : JSON.stringify(e)));
  }
  if (isString(error)) {
    return [error];
  }
  if (error) {
    return [JSON.stringify(error)];
  }
  return [];
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
    const gameType = detectCardGameType();

    // デッキ一覧（ope=4）からytknを取得
    const ytkn = await fetchYtknFromDeckList(cgid, gameType);

    if (!ytkn) {
      handleError(
        '[createNewDeckInternal]',
        'デッキ作成に失敗しました',
        new Error('Failed to fetch ytkn'),
        { showToast: true }
      );
      return 0;
    }

    // buildApiUrl()でベースURLを取得し、パラメータを手動で追加
    // パラメータ順序を保証するため、URLクラスの searchParams は使わない
    // noLocale: true を指定して request_locale を絶対に付与しない
    const baseUrl = buildApiUrl(API_ENDPOINT.MEMBER_DECK, gameType, undefined, true);
    const url = `${baseUrl}?ope=${DECK_OPE.CREATE}&wname=${WNAME.MEMBER_DECK}&cgid=${cgid}&ytkn=${ytkn}`;

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
      handleError(
        '[createNewDeckInternal]',
        'デッキ作成に失敗しました',
        new Error('No decks found in list after creation'),
        { showToast: true }
      );
      return 0;
    }

    const maxDno = Math.max(...deckList.map(deck => deck.dno));
    handleSuccess('[createNewDeckInternal]', 'デッキを作成しました');
    return maxDno;
  } catch (error) {
    handleError(
      '[createNewDeckInternal]',
      'デッキ作成に失敗しました',
      error,
      { showToast: true }
    );
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
      handleError(
        '[deleteDeckInternal]',
        'デッキ削除に失敗しました',
        new Error('Failed to fetch ytkn'),
        { showToast: true }
      );
      return false;
    }

    // URLを構築（buildApiUrl経由、ope=7は request_locale 付与）
    const path = `${API_ENDPOINT.MEMBER_DECK}?ope=${DECK_OPE.DELETE}&cgid=${cgid}&dno=${dno}&wname=${WNAME.MEMBER_DECK}&ytkn=${ytkn}`;
    const url = buildApiUrl(path, gameType);

    const { default: axios } = await import('axios');
    // NOTE: deleteDeckInternal はユーザー操作（デッキ削除）のクリティカルパスなため、
    // リクエストキューをバイパスして直接実行する（キューのオーバーヘッドを削減）
    const response = await axios.get(url, {
      withCredentials: true
    });

    const success = response.status === 200;
    if (success) {
      handleSuccess('[deleteDeckInternal]', 'デッキを削除しました');
    } else {
      handleError(
        '[deleteDeckInternal]',
        'デッキ削除に失敗しました',
        new Error(`HTTP ${response.status}`),
        { showToast: true }
      );
    }
    return success;
  } catch (error) {
    handleError(
      '[deleteDeckInternal]',
      'デッキ削除に失敗しました',
      error,
      { showToast: true }
    );
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
  ytkn: string,
  options: { showErrorToast?: boolean } = {}
): Promise<OperationResult> {
  const { showErrorToast = true } = options;
  try {
    console.debug('[saveDeckInternal] Starting save process', { dno, deckDataName: deckData.name, mainDeckSize: deckData.mainDeck?.length, extraDeckSize: deckData.extraDeck?.length, sideDeckSize: deckData.sideDeck?.length });

    // データ検証
    const mainDeck = deckData.mainDeck || [];
    const extraDeck = deckData.extraDeck || [];
    const sideDeck = deckData.sideDeck || [];

    // 重複チェック：同じ cid + ciid の組み合わせがないか
    const checkDuplicates = (deckList: DeckCardRef[], location: string): void => {
      const seen = new Set<string>();
      deckList.forEach(cardRef => {
        const key = `${cardRef.cid}_${cardRef.ciid}`;
        if (seen.has(key)) {
          throw new Error(`${location}: Duplicate card found: ${key}`);
        }
        seen.add(key);
      });
    };

    checkDuplicates(mainDeck, 'mainDeck');
    checkDuplicates(extraDeck, 'extraDeck');
    checkDuplicates(sideDeck, 'sideDeck');

    // デッキデータの整合性チェック
    const validateDeckCardRef = (cardRef: DeckCardRef, location: string): void => {
      if (!cardRef.cid) {
        throw new Error(`${location}: cid is empty or undefined`);
      }
      if (typeof cardRef.quantity !== 'number' || cardRef.quantity < 1) {
        throw new Error(`${location}: ${cardRef.cid} has invalid quantity: ${cardRef.quantity}`);
      }
      if (cardRef.ciid === '' || cardRef.ciid == null) {
        throw new Error(`${location}: ${cardRef.cid} has invalid ciid`);
      }
    };

    mainDeck.forEach(c => validateDeckCardRef(c, 'mainDeck'));
    extraDeck.forEach(c => validateDeckCardRef(c, 'extraDeck'));
    sideDeck.forEach(c => validateDeckCardRef(c, 'sideDeck'));

    const startTime = performance.now();

    // URL-encoded形式でデータを構築（公式と同じ順序で）
    const params = new URLSearchParams();

    // ope=3（SAVE）を先頭に追加
    params.append('ope', DECK_OPE.SAVE);

    // 基本情報
    params.append('wname', WNAME.MEMBER_DECK);
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

    const tempCardDB = getTempCacheDB();
    const unifiedDB = getUnifiedCacheDB();

    // cardType を取得するヘルパー関数（TempCacheDB → UnifiedCacheDB フォールバック）
    const getCardType = (cid: string): string | undefined => {
      const card = tempCardDB.get(cid);
      if (card?.cardType) {
        return card.cardType;
      }
      // フォールバック: UnifiedCacheDB から再構築して取得
      const unifiedCard = unifiedDB.reconstructCardInfo(cid);
      return unifiedCard?.cardType;
    };

    // 同一cidの複数ciidエントリ(DeckCardRef)を1行にまとめる。
    // 公式サイトのネイティブ編集フォームを実機調査した結果、1行=1カード種類(cid)で、
    // imgsフィールドは `${cid}_${copy1のciid}_${copy2のciid}_${copy3のciid}` という、
    // 物理コピーごとのciidを順番に並べた形式であることが判明した（TASK-354）。
    const groupByCid = (refs: DeckCardRef[]): DeckCardRef[][] => {
      const groups = new Map<string, DeckCardRef[]>();
      refs.forEach(ref => {
        const list = groups.get(ref.cid) ?? [];
        list.push(ref);
        groups.set(ref.cid, list);
      });
      return Array.from(groups.values());
    };

    try {
      // メインデッキ: モンスター（実カード→空き枠）
      const mainMonsterGroups = groupByCid(deckData.mainDeck.filter(c => getCardType(c.cid) === 'monster'));
      mainMonsterGroups.forEach(group => {
        appendCardGroupToFormData(params, group, 'main');
      });
      for (let i = 0; i < TOTAL_MAIN_SLOTS - mainMonsterGroups.length; i++) {
        params.append('monm', '');
        params.append('monum', '0');
        params.append('monsterCardId', '');
        params.append('imgs', 'null_null_null_null');
      }

      // メインデッキ: 魔法（実カード→空き枠）
      const mainSpellGroups = groupByCid(deckData.mainDeck.filter(c => getCardType(c.cid) === 'spell'));
      mainSpellGroups.forEach(group => {
        appendCardGroupToFormData(params, group, 'main');
      });
      for (let i = 0; i < TOTAL_MAIN_SLOTS - mainSpellGroups.length; i++) {
        params.append('spnm', '');
        params.append('spnum', '0');
        params.append('spellCardId', '');
        params.append('imgs', 'null_null_null_null');
      }

      // メインデッキ: 罠（実カード→空き枠）
      const mainTrapGroups = groupByCid(deckData.mainDeck.filter(c => getCardType(c.cid) === 'trap'));
      mainTrapGroups.forEach(group => {
        appendCardGroupToFormData(params, group, 'main');
      });
      for (let i = 0; i < TOTAL_MAIN_SLOTS - mainTrapGroups.length; i++) {
        params.append('trnm', '');
        params.append('trnum', '0');
        params.append('trapCardId', '');
        params.append('imgs', 'null_null_null_null');
      }

      // エクストラデッキ（実カード→空き枠）
      const extraGroups = groupByCid(deckData.extraDeck);
      extraGroups.forEach(group => {
        appendCardGroupToFormData(params, group, 'extra');
      });
      for (let i = 0; i < TOTAL_EXTRA_SLOTS - extraGroups.length; i++) {
        params.append('exnm', '');
        params.append('exnum', '0');
        params.append('extraCardId', '');
        params.append('imgs', 'null_null_null_null');
      }

      // サイドデッキ（実カード→空き枠）
      const sideGroups = groupByCid(deckData.sideDeck);
      sideGroups.forEach(group => {
        appendCardGroupToFormData(params, group, 'side');
      });
      for (let i = 0; i < TOTAL_SIDE_SLOTS - sideGroups.length; i++) {
        params.append('sinm', '');
        params.append('sinum', '0');
        params.append('sideCardId', '');
        params.append('imgsSide', 'null_null_null_null');
      }
    } catch (paramError) {
      console.error('[saveDeckInternal] Error during parameter construction:', paramError);
      throw paramError;
    }

    const paramsBuiltTime = performance.now();
    console.debug(`[saveDeckInternal] パラメータ構築時間: ${(paramsBuiltTime - startTime).toFixed(2)}ms`);

    const gameType = detectCardGameType();
    // buildApiUrl経由、ope=SAVE は request_locale 付与
    const path = `${API_ENDPOINT.MEMBER_DECK}?cgid=${cgid}`;
    const postUrl = buildApiUrl(path, gameType);

    const encodeStartTime = performance.now();
    const encoded_params = params.toString().replace(/\+/g, '%20'); // '+'を'%20'に変換
    const encodeEndTime = performance.now();
    console.debug(`[saveDeckInternal] パラメータエンコード時間: ${(encodeEndTime - encodeStartTime).toFixed(2)}ms`);

    console.debug('[saveDeckInternal] About to send POST request to', postUrl);
    console.debug('[saveDeckInternal] Request body length:', encoded_params.length);
    console.debug('[saveDeckInternal] Request body (first 500 chars):', encoded_params.substring(0, 500));
    console.debug('[saveDeckInternal] Request body (last 500 chars):', encoded_params.substring(Math.max(0, encoded_params.length - 500)));

    // 公式の実装に合わせて、URLSearchParamsを直接渡す
    // axiosが自動的にContent-Typeをapplication/x-www-form-urlencodedに設定する
    // paramsはurl encodeされる必要がある, +は%20に変換されるべき

    const { default: axios } = await import('axios');
    // NOTE: saveDeckInternal はユーザー操作（デッキ保存）のクリティカルパスなため、
    // リクエストキューをバイパスして直接実行する（キューのオーバーヘッドを削減）
    const requestStartTime = performance.now();
    const response = await axios.post(postUrl, encoded_params, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    const requestEndTime = performance.now();
    console.debug(`[saveDeckInternal] HTTP POST時間: ${(requestEndTime - requestStartTime).toFixed(2)}ms`);

    const data = response.data;

    // デバッグログ：サーバーレスポンスの詳細を記録
    console.debug('[saveDeckInternal] Server response:', {
      result: data.result,
      error: data.error,
      fullData: data
    });

    // 公式の判定方法に合わせる
    if (data.result) {
      handleSuccess('[saveDeckInternal]', 'デッキを保存しました', '', { showToast: false });
      return { success: true };
    } else {
      if (data.error) {
        const errorMessages = normalizeErrorMessages(data.error);
        handleError(
          '[saveDeckInternal]',
          'デッキ保存に失敗しました',
          new Error(errorMessages.join(', ')),
          { showToast: showErrorToast, toastBody: errorMessages.join('\n') }
        );
        return {
          success: false,
          error: errorMessages
        };
      }
      // data.resultがfalseでerrorもない場合
      console.error('[saveDeckInternal] Unexpected response:', data);
      handleError(
        '[saveDeckInternal]',
        'デッキ保存に失敗しました',
        new Error('Unknown error (no error message from server)'),
        { showToast: showErrorToast }
      );
      return {
        success: false,
        error: ['保存に失敗しました']
      };
    }
  } catch (error) {
    console.error('[saveDeckInternal] Exception caught:', error);
    handleError(
      '[saveDeckInternal]',
      'デッキ保存に失敗しました',
      error,
      { showToast: showErrorToast }
    );
    return {
      success: false,
      error: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * saveDeckInternalの失敗トーストを後から表示する
 *
 * リトライ可能な失敗（先読みytkn失効等）を{ showErrorToast: false }で抑制した後、
 * リトライ不可・リトライも失敗した場合に、呼び出し元（SessionManager）から
 * 最終結果として表示するために使用する
 *
 * @param error saveDeckInternalの返り値のerror配列
 */
export function showSaveDeckErrorToast(error?: string[]): void {
  const errorMessages = error && error.length > 0 ? error : ['保存に失敗しました'];
  handleError(
    '[saveDeckInternal]',
    'デッキ保存に失敗しました',
    new Error(errorMessages.join(', ')),
    { showToast: true, toastBody: errorMessages.join('\n') }
  );
}

/**
 * 同一cidのDeckCardRefグループ(ciid違い含む)をFormDataに1行として追加する補助関数
 *
 * 公式サイトのネイティブ編集フォーム(member_deck.action?ope=2)を実機調査した結果判明した仕様:
 * - 1カード種類(cid)につき、テーブルの行は1行のみ（quantityで何枚か集約する）
 * - numField(monum等)は物理コピーの合計枚数
 * - imgsフィールドは `${cid}_${copy1のciid}_${copy2のciid}_${copy3のciid}` という形式で、
 *   3枚積みの上限に合わせて常に3つのciidスロットを持つ。各スロットはその「何枚目のコピーか」に
 *   対応する実際のciidを表す（3枚に満たない場合は残りのスロットを最後のciidで埋める）。
 * 以前の実装は「1(cid,ciid)ペア=1行、非デフォルトciidは常に1枚目のスロットに固定」という
 *誤ったモデルだったため、同一cidに複数の非デフォルトciidが混在すると2枚目以降が
 * 代表イラストに上書きされていた（TASK-354）。
 *
 * @param target FormDataまたはURLSearchParamsオブジェクト
 * @param group 同一cidのDeckCardRef配列（ciidが異なる複数エントリを含みうる）
 * @param deckType デッキタイプ（main/extra/side）
 */
function appendCardGroupToFormData(
  target: FormData | URLSearchParams,
  group: DeckCardRef[],
  deckType: 'main' | 'extra' | 'side'
): void {
  const first = group[0];
  if (!first) return;
  const cid = first.cid;
  const unifiedDB = getUnifiedCacheDB();
  const lang = detectLanguage(document);
  const card = unifiedDB.reconstructCardInfo(cid, lang);

  if (!card) {
    throw new Error(`Card not found in UnifiedCacheDB: ${cid}, lang: ${lang}`);
  }

  // 物理コピーごとのciidを1枚ずつ展開する（例: ciid=2×2枚 + ciid=1×1枚 → [2, 2, 1]）
  const perCopyCiids: string[] = [];
  group.forEach(ref => {
    for (let i = 0; i < ref.quantity; i++) {
      perCopyCiids.push(ref.ciid);
    }
  });
  const totalQuantity = perCopyCiids.length;

  // 3枚積み上限に合わせて3スロットに固定。不足分は最後のciidで埋める
  const IMG_SLOTS = 3;
  const lastCiid = perCopyCiids[perCopyCiids.length - 1] ?? '1';
  const paddedCiids = [...perCopyCiids];
  while (paddedCiids.length < IMG_SLOTS) {
    paddedCiids.push(lastCiid);
  }
  const imgsValue = [cid, ...paddedCiids.slice(0, IMG_SLOTS)].join('_');

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
    target.append(numField, totalQuantity.toString());
    target.append(cardIdField, cid);
    target.append('imgs', imgsValue);

  } else if (deckType === 'extra') {
    // エクストラデッキ: 統一フィールド名
    target.append('exnm', card.name);
    target.append('exnum', totalQuantity.toString());
    target.append('extraCardId', cid);
    target.append('imgs', imgsValue);

  } else {
    // サイドデッキ: 統一フィールド名（imgsフィールド名が異なる）
    target.append('sinm', card.name);
    target.append('sinum', totalQuantity.toString());
    target.append('sideCardId', cid);
    target.append('imgsSide', imgsValue);
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
    let path = `${API_ENDPOINT.MEMBER_DECK}?ope=${DECK_OPE.VIEW}&dno=${dno}`;

    // cgidが指定されている場合は追加
    if (cgid) {
      path += `&cgid=${cgid}`;
    }

    // buildApiUrl経由、ope=VIEW は request_locale 付与
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
      handleDebug('[getDeckDetail]', 'Failed to save UnifiedCacheDB:', error);
    });

    return deckInfo;
  } catch (error) {
    handleError('[getDeckDetail]', 'デッキ詳細の取得に失敗しました', error, { showToast: true });
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

    // buildApiUrl経由、ope=LIST は request_locale なし
    const path = `${API_ENDPOINT.MEMBER_DECK}?ope=${DECK_OPE.LIST}&cgid=${cgid}`;
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
    handleError('[getDeckListInternal]', 'デッキ一覧の取得に失敗しました', error, { showToast: true });
    return [];
  }
}

/**
 * デッキコードを発行する（内部関数）
 *
 * 1. ope=13 でデッキコードを発行
 * 2. ope=1 で発行済みのデッキコードを取得
 *
 * @param cgid ユーザー識別子
 * @param dno デッキ番号
 * @returns デッキコード、発行失敗時は空文字列
 * @internal SessionManager経由で呼び出すこと
 */
export async function issueDeckCodeInternal(cgid: string, dno: number): Promise<string> {
  try {
    const gameType = detectCardGameType();
    const { default: axios } = await import('axios');

    // ステップ1: ope=13 でデッキコードを発行
    // ope=13は request_locale を付与してはいけない（ope=6と同様）
    const baseUrlIssue = buildApiUrl(API_ENDPOINT.MEMBER_DECK, gameType, undefined, true);
    const issueUrl = `${baseUrlIssue}?ope=13&wname=${WNAME.MEMBER_DECK}&cgid=${cgid}&dno=${dno}`;

    await axios.get(issueUrl, { withCredentials: true });

    // ステップ2: ope=1 で発行済みのデッキコードを取得
    // ope=1は request_locale を付与してよい
    const displayPath = `${API_ENDPOINT.MEMBER_DECK}?ope=1&cgid=${cgid}&dno=${dno}`;
    const displayUrl = buildApiUrl(displayPath, gameType);

    const response = await axios.get(displayUrl, { withCredentials: true });
    const parser = new DOMParser();
    const doc = parser.parseFromString(response.data, 'text/html');

    // HTMLから発行済みデッキコードを抽出
    const { extractIssuedDeckCode } = await import('@/content/parser/deck-detail-parser');
    const deckCode = extractIssuedDeckCode(doc);

    if (deckCode && deckCode.trim()) {
      return deckCode;
    } else {
      handleError(
        '[issueDeckCodeInternal]',
        'デッキコードの発行に失敗しました',
        new Error(`Failed to extract deck code from response. deckCode="${deckCode}"`),
        { showToast: true }
      );
      return '';
    }
  } catch (error) {
    handleError('[issueDeckCodeInternal]', 'デッキコードの発行に失敗しました', error, { showToast: true });
    return '';
  }
}

