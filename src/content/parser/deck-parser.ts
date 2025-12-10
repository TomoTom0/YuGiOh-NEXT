import { DeckCardRef, CardInfo, MonsterCard, SpellCard, TrapCard } from '@/types/card';
import { DeckInfo } from '@/types/deck';
import { detectCardType } from '../card/detector';
import { getTempCardDB } from '@/utils/temp-card-db';
import { detectLanguage } from '@/utils/language-detector';
import { safeQueryAs, isHTMLInputElement, isHTMLSelectElement, isHTMLTextAreaElement } from '@/utils/type-guards';

/**
 * カードタイプ別のフィールド名マッピング
 */
const CARD_TYPE_FIELDS = {
  'monster': {
    cardIdName: 'monsterCardId',
    imgsName: 'monster_imgs',
    numberName: 'monster_card_number'
  },
  'spell': {
    cardIdName: 'spellCardId',
    imgsName: 'spell_imgs',
    numberName: 'spell_card_number'
  },
  'trap': {
    cardIdName: 'trapCardId',
    imgsName: 'trap_imgs',
    numberName: 'trap_card_number'
  }
} as const;

/**
 * カード行HTMLからカード情報を抽出する
 *
 * @param row カード行のHTML要素
 * @returns デッキ内カード情報、パースできない場合はnull
 *
 * 注意: デッキページのHTMLには限定的な情報しかないため、
 * CardInfoの多くのフィールドは未設定（undefined）となります。
 * 完全な情報が必要な場合は、カードIDを使ってカード検索APIから取得してください。
 */
export function parseCardRow(row: HTMLElement): DeckCardRef | null {
  // カードタイプを検出
  const cardType = detectCardType(row);
  if (!cardType) {
    return null;
  }

  // カードタイプに対応するフィールド名を取得
  const fields = CARD_TYPE_FIELDS[cardType];

  // カードIDを取得
  const cardIdInput = safeQueryAs(`input[name="${fields.cardIdName}"]`, isHTMLInputElement, row);
  if (!cardIdInput?.value) {
    return null;
  }
  const cardId = cardIdInput.value;

  // カード名を取得
  const nameElement = row.querySelector('.card_name');
  if (!nameElement || !nameElement.textContent) {
    return null;
  }
  const name = nameElement.textContent.trim();

  // 画像情報を取得（ciid_imgHash形式）
  const imgsInput = safeQueryAs(`input[name="${fields.imgsName}"]`, isHTMLInputElement, row);
  const imgsValue = imgsInput?.value ?? '';
  
  // ciidとimgHashを抽出（形式: "cardId_ciid_1_1"）
  let ciid: string = '1';
  let imgHash: string = `${cardId}_1_1_1`;
  
  if (imgsValue) {
    const parts = imgsValue.split('_');
    if (parts.length >= 2 && parts[1]) {
      ciid = parts[1];
      imgHash = imgsValue;
    }
  }

  // 枚数を取得
  const numberInput = safeQueryAs(`input[name="${fields.numberName}"]`, isHTMLInputElement, row);
  if (!numberInput?.value) {
    return null;
  }
  const quantity = parseInt(numberInput.value, 10);
  if (isNaN(quantity)) {
    return null;
  }

  // CardInfo型のオブジェクトを作成してTempCardDBに登録
  // デッキページには限定的な情報しかないため、必須フィールドに仮の値を設定
  let card: CardInfo;

  if (cardType === 'monster') {
    // モンスターカードの場合、必須フィールドに仮の値を設定
    card = {
      name,
      cardId,
      ciid,
      lang: detectLanguage(document),
      imgs: [{ciid, imgHash}],
      cardType: 'monster',
      attribute: 'light', // デッキページからは取得不可、後で更新が必要
      levelType: 'level', // デッキページからは取得不可、後で更新が必要
      levelValue: 0, // デッキページからは取得不可、後で更新が必要
      race: 'dragon', // デッキページからは取得不可、後で更新が必要
      types: [], // デッキページからは取得不可、後で更新が必要
      isExtraDeck: false // デッキページからは正確に判定不可、後で更新が必要
    } as MonsterCard;
  } else if (cardType === 'spell') {
    // 魔法カードの場合
    card = {
      name,
      cardId,
      ciid,
      lang: detectLanguage(document),
      imgs: [{ciid, imgHash}],
      cardType: 'spell'
    } as SpellCard;
  } else {
    // 罠カードの場合
    card = {
      name,
      cardId,
      ciid,
      lang: detectLanguage(document),
      imgs: [{ciid, imgHash}],
      cardType: 'trap'
    } as TrapCard;
  }

  // TempCardDBに登録
  const tempCardDB = getTempCardDB();
  tempCardDB.set(cardId, card);

  return {
    cid: cardId,
    ciid,
    lang: detectLanguage(document),
    quantity
  };
}

/**
 * デッキ編集ページ（ope=2）からデッキ情報を抽出する
 *
 * @param doc パース済みのHTMLドキュメント（編集ページ）
 * @returns デッキ情報
 *
 * 注意: この関数は編集ページ専用です。
 * フォームフィールドから情報を取得するため、表示ページでは動作しません。
 * 表示ページからデータを取得する場合は parseDeckDetail() を使用してください。
 */
export function parseDeckPage(doc: Document): DeckInfo {
  // デッキ番号を取得
  const dnoInput = safeQueryAs('input[name="dno"]', isHTMLInputElement, doc);
  const dno = dnoInput?.value ? parseInt(dnoInput.value, 10) : 0;

  // デッキ名を取得
  const nameInput = safeQueryAs('input[name="deck_name"]', isHTMLInputElement, doc);
  const name = nameInput?.value ?? '';

  // メインデッキのカードを抽出
  const mainDeckElement = doc.querySelector('#main-deck');
  const mainDeck: DeckCardRef[] = [];
  if (mainDeckElement) {
    const rows = mainDeckElement.querySelectorAll('.card-row');
    rows.forEach((row) => {
      const card = parseCardRow(row as HTMLElement);
      if (card) {
        mainDeck.push(card);
      }
    });
  }

  // エクストラデッキのカードを抽出
  const extraDeckElement = doc.querySelector('#extra-deck');
  const extraDeck: DeckCardRef[] = [];
  if (extraDeckElement) {
    const rows = extraDeckElement.querySelectorAll('.card-row');
    rows.forEach((row) => {
      const card = parseCardRow(row as HTMLElement);
      if (card) {
        extraDeck.push(card);
      }
    });
  }

  // サイドデッキのカードを抽出
  const sideDeckElement = doc.querySelector('#side-deck');
  const sideDeck: DeckCardRef[] = [];
  if (sideDeckElement) {
    const rows = sideDeckElement.querySelectorAll('.card-row');
    rows.forEach((row) => {
      const card = parseCardRow(row as HTMLElement);
      if (card) {
        sideDeck.push(card);
      }
    });
  }

  // 公開/非公開を取得
  const isPublicCheckbox = safeQueryAs('input[name="is_public"]', isHTMLInputElement, doc);
  const isPublic = isPublicCheckbox?.checked ?? false;

  // デッキタイプを取得（value値として保存）
  const deckTypeSelect = safeQueryAs('select[name="deck_type"]', isHTMLSelectElement, doc);
  const deckType = deckTypeSelect?.value ?? undefined;

  // コメントを取得
  const commentTextarea = safeQueryAs('textarea[name="comment"]', isHTMLTextAreaElement, doc);
  const comment = commentTextarea?.value ?? "";

  // カテゴリ、タグ、デッキコードを取得（編集ページでは未実装のため空の値）
  const category: string[] = [];
  const tags: string[] = [];
  const deckCode = "";

  return {
    dno,
    name,
    mainDeck,
    extraDeck,
    sideDeck,
    isPublic,
    deckType,
    category,
    tags,
    comment,
    deckCode
  };
}

