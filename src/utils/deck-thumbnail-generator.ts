/**
 * DeckThumbnailGenerator - デッキサムネイル画像生成
 *
 * 既存の createDeckRecipeImage を拡張して、WebP形式で軽量なサムネイルを生成
 * - 解像度: 300x200px（横長 3:2 アスペクト比）
 * - フォーマット: WebP品質0.8（PNG比70～80%サイズ縮減）
 * - 出力: Data URL形式
 */

import type { DeckInfo } from '../types/deck';

export interface ThumbnailGeneratorOptions {
  width?: number;
  height?: number;
  quality?: number; // 0-1, WebP品質
  includeExtraSide?: boolean;
}

const DEFAULT_OPTIONS: Required<ThumbnailGeneratorOptions> = {
  width: 300,
  height: 200,
  quality: 0.8,
  includeExtraSide: false,
};

export class DeckThumbnailGenerator {
  private options: Required<ThumbnailGeneratorOptions>;

  constructor(options: ThumbnailGeneratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * デッキサムネイル画像を生成してWebP形式で返す
   * @param deckInfo デッキ情報
   * @returns WebP画像のData URL
   */
  async generateWebPThumbnail(deckInfo: DeckInfo): Promise<string> {
    try {
      // 既存の createDeckRecipeImage を使用してPNG Canvasを生成
      // ※ createDeckRecipeImage は Canvas を返すことを想定
      const canvas = await this.createCanvasThumbnail(deckInfo);

      // CanvasをWebP Data URLに変換
      const webpDataUrl = await this.canvasToWebP(canvas);

      return webpDataUrl;
    } catch (error) {
      console.error('[DeckThumbnailGenerator] Failed to generate thumbnail:', error);
      throw error;
    }
  }

  /**
   * Canvas要素をWebP形式のData URLに変換
   */
  private canvasToWebP(canvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(
          (blob: Blob | null) => {
            if (!blob) {
              reject(new Error('Canvas toBlob failed'));
              return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
              const result = event.target?.result;
              if (typeof result === 'string') {
                resolve(result);
              } else {
                reject(new Error('FileReader result is not a string'));
              }
            };
            reader.onerror = () => {
              reject(new Error('FileReader failed'));
            };
            reader.readAsDataURL(blob);
          },
          'image/webp',
          this.options.quality
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * デッキサムネイル用のCanvasを作成
   * - existing createDeckRecipeImage の仕様に合わせて実装
   * - 小さなサイズ用にカスタマイズ
   */
  private async createCanvasThumbnail(deckInfo: DeckInfo): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }

    canvas.width = this.options.width;
    canvas.height = this.options.height;

    // 背景色（テーマに応じた色）
    ctx.fillStyle = '#1a1a1a'; // ダークテーマのデフォルト
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // デッキ情報を描画
    this.drawDeckInfoOnCanvas(ctx, canvas, deckInfo);

    return canvas;
  }

  /**
   * Canvas上にデッキ情報を描画
   */
  private drawDeckInfoOnCanvas(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    deckInfo: DeckInfo
  ): void {
    const padding = 12;
    const lineHeight = 14;
    let y = padding;

    // デッキ名
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    const deckNameLines = this.wrapText(deckInfo.name || '(No Name)', canvas.width - padding * 2);
    deckNameLines.forEach((line) => {
      ctx.fillText(line, padding, y);
      y += lineHeight;
    });

    y += 4;

    // カード枚数統計
    ctx.fillStyle = '#cccccc';
    ctx.font = '10px Arial';
    const mainCount = deckInfo.mainDeck.reduce((sum, card) => sum + card.quantity, 0);
    const extraCount = deckInfo.extraDeck.reduce((sum, card) => sum + card.quantity, 0);
    const sideCount = deckInfo.sideDeck.reduce((sum, card) => sum + card.quantity, 0);

    const stats = [
      `Main: ${mainCount}`,
      `Extra: ${extraCount}`,
      `Side: ${sideCount}`,
    ];

    stats.forEach((stat) => {
      if (y < canvas.height - padding) {
        ctx.fillText(stat, padding, y);
        y += lineHeight;
      }
    });

    // カード一覧を簡易表示（最初の10枚）
    y += 4;
    ctx.fillStyle = '#999999';
    ctx.font = '9px Arial';

    const allCards = [
      ...deckInfo.mainDeck,
      ...(this.options.includeExtraSide ? deckInfo.extraDeck : []),
      ...(this.options.includeExtraSide ? deckInfo.sideDeck : []),
    ].slice(0, 10);

    allCards.forEach((card) => {
      if (y < canvas.height - padding) {
        const cardText = `${card.quantity}x (cid: ${card.cid})`;
        const truncated = cardText.length > 25 ? cardText.substring(0, 22) + '...' : cardText;
        ctx.fillText(truncated, padding, y);
        y += lineHeight;
      }
    });
  }

  /**
   * テキストを指定の幅に折り返す
   */
  private wrapText(text: string, _maxWidth: number): string[] {
    // 簡易実装：日本語は1文字で改行、英数は単語単位で改行
    const lines: string[] = [];
    let currentLine = '';
    const chars = text.split('');

    chars.forEach((char) => {
      const testLine = currentLine + char;
      // 簡易的に、20文字で改行（実装簡略化のため）
      if (testLine.length > 20) {
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }
}

// グローバルインスタンス
export const deckThumbnailGenerator = new DeckThumbnailGenerator();
