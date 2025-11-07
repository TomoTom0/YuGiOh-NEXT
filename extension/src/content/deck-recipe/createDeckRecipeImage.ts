import {
  CreateDeckRecipeImageOptions,
  DeckRecipeImageData,
  CanvasDrawSettings,
  ColorVariant,
  COLOR_SETTINGS,
  DECK_RECIPE_WIDTH,
  LAYOUT_CONSTANTS,
  CARD_IMAGE_SETTINGS,
  FONT_SETTINGS,
  CardSection
} from '../../types/deck-recipe-image';

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
): Promise<Blob> {
  const {
    dno,
    includeQR,
    scale = 2,
    color,
    fileName,
    deckData
  } = options;

  // 1. デッキデータの取得
  const data = deckData || await fetchDeckData(dno);

  // 2. Canvas描画設定の初期化
  const drawSettings = initializeCanvasSettings(data, scale, color, includeQR);

  // 3. Canvasの作成と初期化
  const canvas = document.createElement('canvas');
  canvas.width = drawSettings.width;
  canvas.height = drawSettings.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // 4. 背景グラデーション描画
  drawBackgroundGradient(ctx, drawSettings);

  // 5. デッキ名描画
  drawDeckName(ctx, data.deckName, drawSettings);

  // 6. カードセクション描画
  let currentY = LAYOUT_CONSTANTS.headerHeight * scale;
  for (const section of data.sections) {
    currentY = await drawCardSection(ctx, section, currentY, drawSettings);
  }

  // 7. QRコード描画（公開デッキの場合）
  if (includeQR && data.isPublic) {
    await drawQRCode(ctx, dno, drawSettings);
  }

  // 8. タイムスタンプ描画
  drawTimestamp(ctx, drawSettings);

  // 9. BlobへのJPEG変換
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/jpeg',
      0.8 // JPEG品質80%
    );
  });
}

/**
 * デッキデータを取得する
 *
 * @param dno - デッキ番号
 * @returns デッキレシピ画像作成用のデータ
 */
async function fetchDeckData(dno: string): Promise<DeckRecipeImageData> {
  // デッキ名を取得
  const deckName = getDeckName();

  // カード画像URLをセクションごとに取得
  const sections: CardSection[] = [];

  // メインデッキ
  const mainImages = getCardImagesFromSection('main');
  if (mainImages.length > 0) {
    sections.push({
      name: 'main',
      displayName: 'メイン',
      cardImages: mainImages
    });
  }

  // エクストラデッキ
  const extraImages = getCardImagesFromSection('extra');
  if (extraImages.length > 0) {
    sections.push({
      name: 'extra',
      displayName: 'エクストラ',
      cardImages: extraImages
    });
  }

  // サイドデッキ
  const sideImages = getCardImagesFromSection('side');
  if (sideImages.length > 0) {
    sections.push({
      name: 'side',
      displayName: 'サイド',
      cardImages: sideImages
    });
  }

  // 公開フラグを取得
  const isPublic = getIsPublic();

  return {
    deckName,
    sections,
    isPublic,
    dno
  };
}

/**
 * デッキ名を取得する
 *
 * @returns デッキ名
 */
function getDeckName(): string {
  // 新UI（2024/9/11以降）
  const dnmElement = document.getElementById('dnm') as HTMLInputElement | null;
  if (dnmElement) {
    return dnmElement.value || dnmElement.getAttribute('placeholder') || 'デッキ';
  }

  // 旧UI（2024/9/11以前）
  const titleElement = document.querySelector('#broad_title h1');
  if (titleElement && titleElement.innerHTML) {
    const parts = titleElement.innerHTML.split('<br>');
    if (parts.length > 0) {
      const namePart = parts[0].split('】');
      if (namePart.length > 1) {
        return namePart[1].trim();
      }
    }
  }

  return 'デッキ';
}

/**
 * セクションからカード画像URLを取得する
 *
 * @param sectionName - セクション名（'main' | 'extra' | 'side'）
 * @returns カード画像URLの配列
 */
function getCardImagesFromSection(sectionName: 'main' | 'extra' | 'side'): string[] {
  const selector = `#deck_image #${sectionName}.card_set div.image_set span>img`;
  const imgElements = document.querySelectorAll<HTMLImageElement>(selector);

  const urls: string[] = [];
  imgElements.forEach(img => {
    if (img.src) {
      urls.push(img.src);
    }
  });

  return urls;
}

/**
 * デッキの公開フラグを取得する
 *
 * @returns 公開デッキの場合true
 */
function getIsPublic(): boolean {
  // TODO: 公開フラグの判定ロジックを実装
  // DOMから公開/非公開の情報を取得する必要がある
  return false;
}

/**
 * Canvas描画設定を初期化する
 *
 * @param data - デッキデータ
 * @param scale - スケール倍率
 * @param color - カラーバリエーション
 * @param includeQR - QRコードを含めるか
 * @returns Canvas描画設定
 */
function initializeCanvasSettings(
  data: DeckRecipeImageData,
  scale: number,
  color: ColorVariant,
  includeQR: boolean
): CanvasDrawSettings {
  const width = DECK_RECIPE_WIDTH * scale;

  // 高さの計算
  let height = (includeQR && data.isPublic ? LAYOUT_CONSTANTS.qrAreaHeight : 0) * scale;
  height += LAYOUT_CONSTANTS.headerHeight * scale;

  // 各セクションの高さを計算
  for (const section of data.sections) {
    height += LAYOUT_CONSTANTS.sectionHeaderHeight * scale;
    const rows = Math.ceil(section.cardImages.length / CARD_IMAGE_SETTINGS.cardsPerRow);
    height += (LAYOUT_CONSTANTS.sectionTopHeight + rows * LAYOUT_CONSTANTS.sectionRowHeight) * scale;
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

  // フォント設定
  ctx.font = `bold ${FONT_SETTINGS.deckNameSize * scale}px ${FONT_SETTINGS.family}`;
  ctx.fillStyle = '#ffffff';  // 白色
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // デッキ名を中央に描画
  const centerX = settings.width / 2;
  const centerY = (LAYOUT_CONSTANTS.headerHeight / 2) * scale;

  ctx.fillText(deckName, centerX, centerY);
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

  // 1. セクションヘッダー背景グラデーション
  const headerGradient = ctx.createLinearGradient(
    settings.width - 3 * scale,  // 右端
    currentY + 17 * scale,
    3 * scale,                   // 左端
    currentY + 17 * scale
  );
  headerGradient.addColorStop(0, settings.colorSettings.headerGradientStart);
  headerGradient.addColorStop(1, settings.colorSettings.headerGradientEnd);

  ctx.fillStyle = headerGradient;
  ctx.fillRect(
    3 * scale,
    currentY + 3 * scale,
    settings.width - 6 * scale,
    28 * scale
  );

  // 2. カードバック画像（TODO: 実装予定）
  // const cardBackImg = await loadCardBackImage();
  // ctx.drawImage(cardBackImg, 8 * scale, currentY + 9 * scale, 14 * scale, 17 * scale);

  // 3. セクション名とカード数
  ctx.font = `${FONT_SETTINGS.sectionNameSize * scale}px ${FONT_SETTINGS.family}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const sectionText = `${section.displayName} Deck: ${section.cardImages.length} Cards`;
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
    const y = currentY + LAYOUT_CONSTANTS.sectionTopHeight * scale +
              LAYOUT_CONSTANTS.sectionRowHeight * scale * row;

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
  currentY += (LAYOUT_CONSTANTS.sectionTopHeight + rows * LAYOUT_CONSTANTS.sectionRowHeight) * scale;

  return currentY;
}

/**
 * 画像をロードする
 *
 * @param url - 画像URL
 * @returns ロードされた画像
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
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
  // TODO: 実装予定（Phase 3）
  // - qrcode.jsライブラリを使用
  // - QRコード生成
  // - Canvas上に描画
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

  // 現在時刻をISO8601形式で取得
  const date = new Date();
  const timestamp = date
    .toISOString()
    .replace(/[:]/g, '-')
    .replace(/\..+/, '');

  // フォント設定（小さめ）
  ctx.font = `${14 * scale}px ${FONT_SETTINGS.family}`;
  ctx.fillStyle = '#ffffff';  // 白色
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';

  // 右下に描画
  const x = settings.width - (10 * scale);
  const y = settings.height - (10 * scale);

  ctx.fillText(timestamp, x, y);
}
