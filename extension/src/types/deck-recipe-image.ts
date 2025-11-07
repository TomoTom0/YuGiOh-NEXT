/**
 * カラーバリエーション
 */
export type ColorVariant = 'red' | 'blue';

/**
 * カラー設定
 */
export interface ColorSettings {
  /** グラデーション開始色（北東） */
  gradientNE: string;
  /** グラデーション終了色（南西） */
  gradientSW: string;
  /** セクションヘッダーグラデーション開始色 */
  headerGradientStart: string;
  /** セクションヘッダーグラデーション終了色 */
  headerGradientEnd: string;
}

/**
 * カラーバリエーション設定マップ
 */
export const COLOR_SETTINGS: Record<ColorVariant, ColorSettings> = {
  red: {
    gradientNE: '#760f01',
    gradientSW: '#240202',
    headerGradientStart: '#ff0000',
    headerGradientEnd: '#990000'
  },
  blue: {
    gradientNE: '#003d76',
    gradientSW: '#011224',
    headerGradientStart: '#0066ff',
    headerGradientEnd: '#003399'
  }
};

/**
 * カードセクション
 */
export interface CardSection {
  /** セクション名（'main' | 'extra' | 'side'） */
  name: 'main' | 'extra' | 'side';
  /** セクション表示名（'メイン' | 'エクストラ' | 'サイド'） */
  displayName: string;
  /** カード画像URL配列 */
  cardImages: string[];
}

/**
 * デッキレシピ画像作成に必要なデータ
 */
export interface DeckRecipeImageData {
  /** デッキ名 */
  deckName: string;
  /** カードセクション配列 */
  sections: CardSection[];
  /** 公開デッキかどうか */
  isPublic: boolean;
  /** デッキ番号 */
  dno: string;
}

/**
 * デッキレシピ画像作成オプション
 */
export interface CreateDeckRecipeImageOptions {
  /** デッキ番号 */
  dno: string;

  /** QRコードを含めるか */
  includeQR: boolean;

  /** スケール倍率（デフォルト: 2、Retina対応） */
  scale?: number;

  /** カラーバリエーション */
  color: ColorVariant;

  /** ファイル名（オプション、ダウンロード時に使用） */
  fileName?: string;

  /** デッキデータ（既に取得済みの場合、パフォーマンス最適化） */
  deckData?: DeckRecipeImageData;
}

/**
 * デッキレシピ画像ダウンロードオプション
 * （CreateDeckRecipeImageOptionsと同じ）
 */
export interface DownloadDeckRecipeImageOptions
  extends CreateDeckRecipeImageOptions {
  // createDeckRecipeImageと同じオプション
}

/**
 * Canvas描画設定
 */
export interface CanvasDrawSettings {
  /** Canvas幅（デフォルト: 750 * scale） */
  width: number;
  /** Canvas高さ（動的計算） */
  height: number;
  /** スケール倍率 */
  scale: number;
  /** カラー設定 */
  colorSettings: ColorSettings;
}

/**
 * フォント設定
 */
export const FONT_SETTINGS = {
  /** フォントファミリー */
  family: 'Yu Gothic, ヒラギノ角ゴ',
  /** デッキ名フォントサイズ（ratio=1の場合） */
  deckNameSize: 28,
  /** セクション名フォントサイズ（ratio=1の場合） */
  sectionNameSize: 21
} as const;

/**
 * カード画像設定
 */
export const CARD_IMAGE_SETTINGS = {
  /** カード幅（ratio=1の場合） */
  width: 73,
  /** カード高さ（ratio=1の場合） */
  height: 107,
  /** カード間隔（ratio=1の場合） */
  spacing: 75,
  /** 1行あたりのカード数 */
  cardsPerRow: 10
} as const;

/**
 * QRコード設定
 */
export const QR_CODE_SETTINGS = {
  /** QRコードサイズ（ratio=1の場合） */
  size: 128,
  /** 補正レベル */
  correctLevel: 'M' as const
} as const;

/**
 * デッキレシピ画像の幅（ratio=1の場合）
 */
export const DECK_RECIPE_WIDTH = 750;

/**
 * セクション高さ計算用の定数（ratio=1の場合）
 */
export const LAYOUT_CONSTANTS = {
  /** QRコード領域の高さ */
  qrAreaHeight: 80,
  /** ヘッダー高さ */
  headerHeight: 65,
  /** セクションヘッダー高さ */
  sectionHeaderHeight: 49,
  /** セクション行の高さ */
  sectionRowHeight: 107,
  /** セクション上部の高さ */
  sectionTopHeight: 34,
  /** 下部マージン */
  bottomMargin: 12
} as const;
