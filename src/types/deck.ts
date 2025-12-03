import { DeckCard, DeckCardRef, CardRef } from './card';
import { DeckTypeValue, DeckStyleValue, DeckCategory, DeckTags } from './deck-metadata';

// Re-export for convenience
export type { DeckCard, DeckCardRef, CardRef };

/**
 * デッキ情報
 */
export interface DeckInfo {
  /** デッキ番号 */
  dno: number;
  /** デッキ名 */
  name: string;
  /** 元のデッキ名（load時点のデッキ名、placeholderとして使用） */
  originalName?: string;
  /** デッキ内のカード取得時の言語コード */
  lang?: string;
  /** メインデッキ */
  mainDeck: DeckCardRef[];
  /** エクストラデッキ */
  extraDeck: DeckCardRef[];
  /** サイドデッキ */
  sideDeck: DeckCardRef[];
  /** 公開/非公開 */
  isPublic?: boolean;
  /** cgid（公開デッキURL用） */
  cgid?: string;
  /** デッキタイプ（value値: "0", "1", "2", "3"） */
  deckType?: DeckTypeValue;
  /** デッキスタイル（value値: "0", "1", "2"） */
  deckStyle?: DeckStyleValue;
  /** カテゴリ（カテゴリID配列） */
  category: DeckCategory;
  /** 登録タグ（タグID配列） */
  tags: DeckTags;
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
