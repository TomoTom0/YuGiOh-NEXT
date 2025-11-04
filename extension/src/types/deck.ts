import { DeckCard } from './card';

/**
 * デッキ情報
 */
export interface DeckInfo {
  /** デッキ番号 */
  dno: number;
  /** デッキ名 */
  name: string;
  /** メインデッキ */
  mainDeck: DeckCard[];
  /** エクストラデッキ */
  extraDeck: DeckCard[];
  /** サイドデッキ */
  sideDeck: DeckCard[];
  /** 公開/非公開 */
  isPublic?: boolean;
  /** デッキタイプ */
  deckType?: number;
  /** コメント */
  comment?: string;
}

/**
 * 操作結果
 */
export interface OperationResult {
  success: boolean;
  error?: string[];
  /** 新しいデッキ番号（新規作成・複製時） */
  newDno?: number;
}
