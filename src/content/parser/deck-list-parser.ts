import { DeckListItem } from '@/types/deck';
import { DeckTypeValue, DECK_TYPE_LABEL_TO_VALUE } from '@/types/deck-metadata';

/**
 * デッキ一覧ページからデッキ一覧を抽出する
 *
 * @param doc パース済みのHTMLドキュメント
 * @returns デッキ一覧
 */
export function parseDeckList(doc: Document): DeckListItem[] {
  const deckList: DeckListItem[] = [];

  // #deck_list.list.Choose内のすべてのt_rowを取得
  const deckListContainer = doc.querySelector('#deck_list.list.Choose');
  if (!deckListContainer) {
    console.warn('Deck list container not found');
    return deckList;
  }

  const rows = deckListContainer.querySelectorAll('.t_row');

  rows.forEach((row) => {
    const item = parseDeckListRow(row as HTMLElement);
    if (item) {
      deckList.push(item);
    }
  });

  return deckList;
}

/**
 * デッキ一覧の1行からデッキ情報を抽出する
 *
 * @param row デッキ行のHTML要素
 * @returns デッキ一覧項目、パースできない場合はnull
 */
function parseDeckListRow(row: HTMLElement): DeckListItem | null {
  // デッキ名を取得
  const nameElem = row.querySelector('.name.flex_1 > .name');
  if (!nameElem || !nameElem.textContent) {
    return null;
  }
  const name = nameElem.textContent.trim();

  // デッキ番号を取得（input.link_valueのvalue属性から）
  const linkValueInput = row.querySelector('input.link_value') as HTMLInputElement;
  if (!linkValueInput || !linkValueInput.value) {
    return null;
  }

  // value="/yugiohdb/member_deck.action?...&dno=8" からdnoを抽出
  const dnoMatch = linkValueInput.value.match(/dno=(\d+)/);
  if (!dnoMatch || !dnoMatch[1]) {
    return null;
  }
  const dno = parseInt(dnoMatch[1], 10);

  // デッキタイプを取得（オプション）
  let deckType: DeckTypeValue | undefined;
  const deckTypeElem = row.querySelector('.lr_icon span');
  if (deckTypeElem && deckTypeElem.textContent) {
    const label = deckTypeElem.textContent.trim();
    // 表示名からvalue値に変換
    deckType = DECK_TYPE_LABEL_TO_VALUE[label];
  }

  return {
    dno,
    name,
    deckType
  };
}
