import { DeckCard, CardInfo, MonsterCard, SpellCard, TrapCard } from '@/types/card';
import { DeckInfo } from '@/types/deck';
import { detectCardType } from '../card/detector';

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
export function parseCardRow(row: HTMLElement): DeckCard | null {
  // カードタイプを検出
  const cardType = detectCardType(row);
  if (!cardType) {
    return null;
  }

  // カードタイプに対応するフィールド名を取得
  const fields = CARD_TYPE_FIELDS[cardType];

  // カードIDを取得
  const cardIdInput = row.querySelector(`input[name="${fields.cardIdName}"]`) as HTMLInputElement;
  if (!cardIdInput || !cardIdInput.value) {
    return null;
  }
  const cardId = cardIdInput.value;

  // カード名を取得
  const nameElement = row.querySelector('.card_name');
  if (!nameElement || !nameElement.textContent) {
    return null;
  }
  const name = nameElement.textContent.trim();

  // 画像IDを取得（オプション、デフォルト '1'）
  const imgsInput = row.querySelector(`input[name="${fields.imgsName}"]`) as HTMLInputElement;
  const imageId = imgsInput?.value || '1';

  // 枚数を取得
  const numberInput = row.querySelector(`input[name="${fields.numberName}"]`) as HTMLInputElement;
  if (!numberInput || !numberInput.value) {
    return null;
  }
  const quantity = parseInt(numberInput.value, 10);
  if (isNaN(quantity)) {
    return null;
  }

  // CardInfo型のオブジェクトを作成
  // デッキページには限定的な情報しかないため、必須フィールドに仮の値を設定
  let card: CardInfo;

  if (cardType === 'monster') {
    // モンスターカードの場合、必須フィールドに仮の値を設定
    card = {
      name,
      cardId,
      imageId,
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
      imageId,
      cardType: 'spell'
    } as SpellCard;
  } else {
    // 罠カードの場合
    card = {
      name,
      cardId,
      imageId,
      cardType: 'trap'
    } as TrapCard;
  }

  return {
    card,
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
  const dnoInput = doc.querySelector('input[name="dno"]') as HTMLInputElement;
  const dno = dnoInput?.value ? parseInt(dnoInput.value, 10) : 0;

  // デッキ名を取得
  const nameInput = doc.querySelector('input[name="deck_name"]') as HTMLInputElement;
  const name = nameInput?.value || '';

  // メインデッキのカードを抽出
  const mainDeckElement = doc.querySelector('#main-deck');
  const mainDeck: DeckCard[] = [];
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
  const extraDeck: DeckCard[] = [];
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
  const sideDeck: DeckCard[] = [];
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
  const isPublicCheckbox = doc.querySelector('input[name="is_public"]') as HTMLInputElement;
  const isPublic = isPublicCheckbox?.checked || false;

  // デッキタイプを取得（value値として保存）
  const deckTypeSelect = doc.querySelector('select[name="deck_type"]') as HTMLSelectElement;
  const deckType = deckTypeSelect?.value || undefined;

  // コメントを取得
  const commentTextarea = doc.querySelector('textarea[name="comment"]') as HTMLTextAreaElement;
  const comment = commentTextarea?.value || "";

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

