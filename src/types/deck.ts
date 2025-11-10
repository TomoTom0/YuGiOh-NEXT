import { DeckCard } from './card';
import { DeckTypeValue, DeckStyleValue, DeckCategory } from './deck-metadata';

// Re-export for convenience
export type { DeckCard };

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
  /** cgid（公開デッキURL用） */
  cgid?: string;
  /** デッキタイプ（value値: "0", "1", "2", "3"） */
  deckType?: DeckTypeValue;
  /** デッキスタイル（value値: "0", "1", "2"） */
  deckStyle?: DeckStyleValue;
  /** カテゴリ（カテゴリ名配列） */
  category: DeckCategory;
  /** 登録タグ（タグ名配列） */
  tags: string[];
  /** コメント */
  comment: string;
  /** デッキコード */
  deckCode: string;
}

/**
 * デッキ一覧項目（簡易情報）
 */
export interface DeckListItem {
  /** デッキ番号 */
  dno: number;
  /** デッキ名 */
  name: string;
  /** デッキタイプ（value値: "0", "1", "2", "3"） */
  deckType?: DeckTypeValue;
  /** カード枚数情報（表示がある場合） */
  cardCount?: {
    main?: number;
    extra?: number;
    side?: number;
  };
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
