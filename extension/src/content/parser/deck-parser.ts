import { DeckCard } from '@/types/card';
import { DeckInfo } from '@/types/deck';
import { detectCardType } from '../card/detector';

/**
 * カードタイプ別のフィールド名マッピング
 */
const CARD_TYPE_FIELDS = {
  'モンスター': {
    cardIdName: 'monsterCardId',
    imgsName: 'monster_imgs',
    numberName: 'monster_card_number'
  },
  '魔法': {
    cardIdName: 'spellCardId',
    imgsName: 'spell_imgs',
    numberName: 'spell_card_number'
  },
  '罠': {
    cardIdName: 'trapCardId',
    imgsName: 'trap_imgs',
    numberName: 'trap_card_number'
  }
} as const;

/**
 * カード行HTMLからカード情報を抽出する
 *
 * @param row カード行のHTML要素
 * @returns カード情報、パースできない場合はnull
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

  return {
    name,
    cardId,
    cardType,
    imageId,
    quantity
  };
}

/**
 * デッキページ全体からデッキ情報を抽出する
 *
 * @param doc パース済みのHTMLドキュメント
 * @returns デッキ情報
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
    rows.forEach(row => {
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
    rows.forEach(row => {
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
    rows.forEach(row => {
      const card = parseCardRow(row as HTMLElement);
      if (card) {
        sideDeck.push(card);
      }
    });
  }

  // 公開/非公開を取得
  const isPublicCheckbox = doc.querySelector('input[name="is_public"]') as HTMLInputElement;
  const isPublic = isPublicCheckbox?.checked || false;

  // デッキタイプを取得
  const deckTypeSelect = doc.querySelector('select[name="deck_type"]') as HTMLSelectElement;
  const deckType = deckTypeSelect?.value ? parseInt(deckTypeSelect.value, 10) : undefined;

  // コメントを取得
  const commentTextarea = doc.querySelector('textarea[name="comment"]') as HTMLTextAreaElement;
  const comment = commentTextarea?.value || undefined;

  return {
    dno,
    name,
    mainDeck,
    extraDeck,
    sideDeck,
    isPublic,
    deckType,
    comment
  };
}
