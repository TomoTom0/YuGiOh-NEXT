import {
  CreateDeckRecipeImageOptions,
  CanvasDrawSettings,
  ColorVariant,
  COLOR_SETTINGS,
  DECK_RECIPE_WIDTH,
  LAYOUT_CONSTANTS,
  CARD_IMAGE_SETTINGS,
  FONT_SETTINGS,
  QR_CODE_SETTINGS,
  CardSection
} from '../../types/deck-recipe-image';
import { buildCardImageUrl } from '../../api/card-search';
import QRCode from 'qrcode';

/**
 * デッキレシピ画像を作成する
 *
 * @param options - 画像作成オプション
 * @returns 作成された画像のBlob
 *
 * @example
 * ```typescript
 * const blob = await createDeckRecipeImage({
 *   dno: '1',
 *   color: 'red',
 *   includeQR: true,
 *   scale: 2
 * });
 * ```
 */
export async function createDeckRecipeImage(
  options: CreateDeckRecipeImageOptions
): Promise<Blob | Buffer> {
  const {
    dno,
    includeQR,
    scale = 2,
    color,
    deckData
  } = options;

  // 1. デッキデータの検証
  if (!deckData) {
    throw new Error('deckData is required');
  }
  const data = deckData;

  // 2. DeckInfoからCardSection配列を構築
  const sections: CardSection[] = [
    {
      name: 'main',
      displayName: 'メイン',
      cardImages: data.mainDeck.flatMap(({ card, quantity }) =>
        Array(quantity).fill(buildCardImageUrl(card))
      )
    },
    {
      name: 'extra',
      displayName: 'エクストラ',
      cardImages: data.extraDeck.flatMap(({ card, quantity }) =>
        Array(quantity).fill(buildCardImageUrl(card))
      )
    },
    {
      name: 'side',
      displayName: 'サイド',
      cardImages: data.sideDeck.flatMap(({ card, quantity }) =>
        Array(quantity).fill(buildCardImageUrl(card))
      )
    }
  ];

  // 3. Canvas描画設定の初期化
  const drawSettings = initializeCanvasSettings(sections, scale, color, includeQR, data.isPublic ?? false);

  // 3. Canvasの作成と初期化
  let canvas: any;
  let ctx: any;

  if (typeof document !== 'undefined') {
    // ブラウザ環境
    canvas = document.createElement('canvas');
    canvas.width = drawSettings.width;
    canvas.height = drawSettings.height;
    ctx = canvas.getContext('2d');
  } else {
    // Node.js環境
    const { createCanvas } = await import('canvas');
    canvas = createCanvas(drawSettings.width, drawSettings.height);
    ctx = canvas.getContext('2d');
  }

  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // 4. Canvas設定
  ctx.lineWidth = 3 * scale;

  // 5. 背景グラデーション描画
  drawBackgroundGradient(ctx, drawSettings);

  // 6. ヘッダー左側アクセントライン描画
  drawHeaderAccentLine(ctx, drawSettings);

  // 7. デッキ名描画
  drawDeckName(ctx, data.name, drawSettings);

  // 8. カードセクション描画（旧実装: height_now = 49 * ratio）
  let currentY = LAYOUT_CONSTANTS.headerHeight * scale;
  for (const section of sections) {
    currentY = await drawCardSection(ctx, section, currentY, drawSettings);
  }

  // 7. QRコード描画（公開デッキの場合）
  if (includeQR && data.isPublic) {
    await drawQRCode(ctx, dno, drawSettings);
  }

  // 8. タイムスタンプ描画
  drawTimestamp(ctx, drawSettings);

  // 9. 画像変換（Blob/Buffer）
  if (typeof document !== 'undefined') {
    // ブラウザ環境: Blobで返す
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob: Blob | null) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        'image/png',
        1.0
      );
    });
  } else {
    // Node.js環境: Bufferで返す
    const buffer = canvas.toBuffer('image/png');
    return Promise.resolve(buffer);
  }
}

/**
 * Canvas描画設定を初期化する
 *
 * @param sections - カードセクション配列
 * @param scale - スケール倍率
 * @param color - カラーバリエーション
 * @param includeQR - QRコードを含めるか
 * @param isPublic - 公開デッキかどうか
 * @returns Canvas描画設定
 */
function initializeCanvasSettings(
  sections: CardSection[],
  scale: number,
  color: ColorVariant,
  includeQR: boolean,
  isPublic: boolean
): CanvasDrawSettings {
  const width = DECK_RECIPE_WIDTH * scale;

  // 高さの計算（旧実装: (img_qr ? 80 : 0) + 65 + 49 + セクション合計）
  let height = (includeQR && isPublic ? LAYOUT_CONSTANTS.qrAreaHeight : 0) * scale;
  height += 65 * scale; // 固定余白
  height += LAYOUT_CONSTANTS.headerHeight * scale;

  // 各セクションの高さを計算
  for (const section of sections) {
    const rows = Math.ceil(section.cardImages.length / CARD_IMAGE_SETTINGS.cardsPerRow);
    height += (LAYOUT_CONSTANTS.sectionHeaderHeight + rows * LAYOUT_CONSTANTS.sectionRowHeight) * scale;
  }

  return {
    width,
    height,
    scale,
    colorSettings: COLOR_SETTINGS[color]
  };
}

/**
 * 背景グラデーションを描画する
 *
 * @param ctx - Canvas 2Dコンテキスト
 * @param settings - 描画設定
 */
function drawBackgroundGradient(
  ctx: CanvasRenderingContext2D,
  settings: CanvasDrawSettings
): void {
  // 線形グラデーションの作成（北東→南西）
  const gradient = ctx.createLinearGradient(
    settings.width,  // 開始X（右上）
    0,               // 開始Y（右上）
    0,               // 終了X（左下）
    settings.height  // 終了Y（左下）
  );

  // グラデーション色の設定
  gradient.addColorStop(0, settings.colorSettings.gradientNE);  // 北東
  gradient.addColorStop(1, settings.colorSettings.gradientSW);  // 南西

  // 全体に塗りつぶし
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, settings.width, settings.height);
}

/**
 * ヘッダー左側アクセントラインを描画する
 *
 * @param ctx - Canvas 2Dコンテキスト
 * @param settings - 描画設定
 */
function drawHeaderAccentLine(
  ctx: CanvasRenderingContext2D,
  settings: CanvasDrawSettings
): void {
  const scale = settings.scale;

  // アクセントライン描画（旧実装: line 2000-2005）
  ctx.strokeStyle = settings.colorSettings.accentLine;
  ctx.beginPath();
  ctx.moveTo(1 * scale, 1 * scale);
  ctx.lineTo(1 * scale, LAYOUT_CONSTANTS.headerHeight * scale + 1 * scale);
  ctx.closePath();
  ctx.stroke();

  // ボーダーラインに切り替え
  ctx.strokeStyle = settings.colorSettings.borderLine;
}

/**
 * デッキ名を描画する
 *
 * @param ctx - Canvas 2Dコンテキスト
 * @param deckName - デッキ名
 * @param settings - 描画設定
 */
function drawDeckName(
  ctx: CanvasRenderingContext2D,
  deckName: string,
  settings: CanvasDrawSettings
): void {
  const scale = settings.scale;

  // フォント設定（旧実装: line 2008-2010）
  ctx.font = `bold ${FONT_SETTINGS.deckNameSize * scale}px ${FONT_SETTINGS.family}`;
  ctx.fillStyle = settings.colorSettings.font;
  ctx.textAlign = 'left'; // 旧実装では中央揃えではなく左揃え
  ctx.textBaseline = 'alphabetic';

  // デッキ名を左側に描画（旧実装: 7 * ratio, 35 * ratio）
  ctx.fillText(deckName, 7 * scale, 35 * scale);
}

/**
 * カードセクションを描画する
 *
 * @param ctx - Canvas 2Dコンテキスト
 * @param section - カードセクション
 * @param startY - 開始Y座標
 * @param settings - 描画設定
 * @returns 次のセクションの開始Y座標
 */
async function drawCardSection(
  ctx: CanvasRenderingContext2D,
  section: CardSection,
  startY: number,
  settings: CanvasDrawSettings
): Promise<number> {
  const scale = settings.scale;
  let currentY = startY;

  // 1. セクションヘッダー背景グラデーション（旧実装: line 2016-2022）
  const headerGradient = ctx.createLinearGradient(
    747 * scale,  // 右端（旧実装: 747固定値）
    currentY + 17 * scale,
    3 * scale,    // 左端
    currentY + 17 * scale
  );
  headerGradient.addColorStop(0, settings.colorSettings.headerGradientE);
  headerGradient.addColorStop(1, settings.colorSettings.headerGradientW);

  ctx.fillStyle = headerGradient;
  ctx.fillRect(
    3 * scale,
    currentY + 3 * scale,
    settings.width - 6 * scale,
    28 * scale
  );

  // セクションヘッダーの囲み線（旧実装: line 2024-2030）
  ctx.beginPath();
  ctx.moveTo(settings.width - 1 * scale, currentY + 1 * scale);
  ctx.lineTo(1 * scale, currentY + 1 * scale);
  ctx.lineTo(1 * scale, currentY + 33 * scale);
  ctx.lineTo(settings.width - 1 * scale, currentY + 33 * scale);
  ctx.closePath();
  ctx.stroke();

  // 2. カードバック画像
  try {
    let cardBackImg: any = null;

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      // Chrome拡張機能環境
      const cardBackUrl = chrome.runtime.getURL('images/card_back.png');
      cardBackImg = await loadImage(cardBackUrl);
    } else {
      // Node.js環境 - ローカルファイルパスを使用
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const cardBackPath = path.resolve(__dirname, '../../images/card_back.png');
      cardBackImg = await loadImage(cardBackPath);
    }

    if (cardBackImg) {
      ctx.drawImage(cardBackImg, 8 * scale, currentY + 9 * scale, 14 * scale, 17 * scale);
    }
  } catch (error) {
    console.error('Failed to load card back image:', error);
    // カードバック画像の読み込みに失敗しても処理は継続
  }

  // 3. セクション名とカード数（旧実装: line 2013, 2034-2037）
  ctx.font = `${FONT_SETTINGS.sectionNameSize * scale}px ${FONT_SETTINGS.family}`;
  ctx.fillStyle = settings.colorSettings.font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const sectionText = `${section.name.slice(0, 1).toUpperCase() + section.name.slice(1)} Deck: ${section.cardImages.length} Cards`;
  ctx.fillText(sectionText, 32 * scale, currentY + 25 * scale);

  // 4. カード画像グリッド描画
  currentY += LAYOUT_CONSTANTS.sectionHeaderHeight * scale;

  // カード画像をロードして描画
  const cardImgs = await Promise.all(
    section.cardImages.map(url => loadImage(url))
  );

  cardImgs.forEach((img, index) => {
    const col = index % CARD_IMAGE_SETTINGS.cardsPerRow;
    const row = Math.floor(index / CARD_IMAGE_SETTINGS.cardsPerRow);

    const x = CARD_IMAGE_SETTINGS.spacing * scale * col;
    const y = currentY + LAYOUT_CONSTANTS.sectionRowHeight * scale * row;

    ctx.drawImage(
      img,
      x,
      y,
      CARD_IMAGE_SETTINGS.width * scale,
      CARD_IMAGE_SETTINGS.height * scale
    );
  });

  // 次のセクションの開始Y座標を計算
  const rows = Math.ceil(section.cardImages.length / CARD_IMAGE_SETTINGS.cardsPerRow);
  currentY += rows * LAYOUT_CONSTANTS.sectionRowHeight * scale;

  return currentY;
}

/**
 * 画像をロードする
 *
 * @param url - 画像URL
 * @returns ロードされた画像
 */
async function loadImage(url: string): Promise<any> {
  if (typeof document !== 'undefined') {
    // ブラウザ環境
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  } else {
    // Node.js環境
    const { loadImage: canvasLoadImage } = await import('canvas');

    // URLかローカルファイルパスかを判定
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // HTTPSでの画像取得（Referer対応）
      const https = await import('https');

      return new Promise((resolve, reject) => {
        https.default.get(url, {
          headers: {
            'Referer': 'https://www.db.yugioh-card.com/yugiohdb/',
            'User-Agent': 'Mozilla/5.0'
          }
        }, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            canvasLoadImage(buffer)
              .then(resolve)
              .catch(reject);
          });
        }).on('error', reject);
      });
    } else {
      // ローカルファイルパス
      return canvasLoadImage(url);
    }
  }
}

/**
 * QRコードを描画する
 *
 * @param ctx - Canvas 2Dコンテキスト
 * @param dno - デッキ番号
 * @param settings - 描画設定
 */
async function drawQRCode(
  ctx: CanvasRenderingContext2D,
  dno: string,
  settings: CanvasDrawSettings
): Promise<void> {
  const scale = settings.scale;

  // QRコードのURL（公開デッキの表示ページ）
  const qrUrl = `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&dno=${dno}`;

  try {
    // QRコードを生成（Data URL形式）
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: QR_CODE_SETTINGS.correctLevel,
      width: QR_CODE_SETTINGS.size * scale,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // QRコード画像をロード
    const qrImage = await loadImage(qrDataUrl);

    // 右下に描画（余白10px）
    const x = settings.width - (QR_CODE_SETTINGS.size * scale) - (10 * scale);
    const y = settings.height - (QR_CODE_SETTINGS.size * scale) - (10 * scale);

    ctx.drawImage(
      qrImage,
      x,
      y,
      QR_CODE_SETTINGS.size * scale,
      QR_CODE_SETTINGS.size * scale
    );
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    // QRコード生成に失敗しても処理は継続
  }
}

/**
 * タイムスタンプを描画する
 *
 * @param ctx - Canvas 2Dコンテキスト
 * @param settings - 描画設定
 */
function drawTimestamp(
  ctx: CanvasRenderingContext2D,
  settings: CanvasDrawSettings
): void {
  const scale = settings.scale;

  // 現在時刻を取得（ISO 8601形式: yyyy-mm-dd）
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = `exported on ${year}-${month}-${day}`;

  // フォント設定（小さめ）
  ctx.font = `${14 * scale}px ${FONT_SETTINGS.family}`;
  ctx.fillStyle = settings.colorSettings.font;

  // Canvas状態をリセット
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // 左下に描画
  const x = 10 * scale;
  const y = settings.height - (12 * scale);

  ctx.fillText(timestamp, x, y);
}
