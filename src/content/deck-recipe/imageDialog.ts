/**
 * デッキ画像作成ダイアログ
 */

import { downloadDeckRecipeImage } from './downloadDeckRecipeImage';
import { createDeckRecipeImage } from './createDeckRecipeImage';
import { parseDeckDetail } from '../parser/deck-detail-parser';
import type { ColorVariant } from '@/types/deck-recipe-image';
import type { DeckInfo } from '@/types/deck';

/**
 * QRコードアイコンのSVG（小さいドット付き）
 */
const QR_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
  <!-- 左上ブロック -->
  <rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"></rect>
  <rect x="8" y="8" width="8" height="8"></rect>
  <!-- 右上ブロック -->
  <rect x="28" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"></rect>
  <rect x="32" y="8" width="8" height="8"></rect>
  <!-- 左下ブロック -->
  <rect x="4" y="28" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"></rect>
  <rect x="8" y="32" width="8" height="8"></rect>
  <!-- 右下に小さいドット -->
  <rect x="28" y="28" width="4" height="4"></rect>
  <rect x="34" y="28" width="4" height="4"></rect>
  <rect x="40" y="28" width="4" height="4"></rect>
  <rect x="28" y="34" width="4" height="4"></rect>
  <rect x="40" y="34" width="4" height="4"></rect>
  <rect x="28" y="40" width="4" height="4"></rect>
  <rect x="34" y="40" width="4" height="4"></rect>
  <rect x="40" y="40" width="4" height="4"></rect>
</svg>
`;

/**
 * ダウンロードアイコンのSVG
 */
const DOWNLOAD_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
  <polyline points="7 10 12 15 17 10"></polyline>
  <line x1="12" y1="15" x2="12" y2="3"></line>
</svg>
`;

/**
 * スピナーアイコンのSVG
 */
const SPINNER_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ygo-spinner">
  <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
  <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
</svg>
`;

/**
 * ポップアップメニューHTMLを生成
 */
function createPopupHTML(
  buttonRect: DOMRect,
  backgroundImageUrl: string,
  imageWidth: number,
  imageHeight: number,
  deckName: string,
  hasSideDeck: boolean
): string {
  const top = buttonRect.bottom + window.scrollY + 8;
  const left = buttonRect.left + window.scrollX;

  // 背景画像はscale=0.25で生成されているので、そのまま表示
  const displayWidth = imageWidth;
  const displayHeight = imageHeight;

  const topMargin = 40; // 上部余白（タイトル入力欄用）
  const padding = 12; // 左右の余白
  const bottomButtonHeight = 50; // 下部ボタンエリアの高さ

  return `
    <!-- オーバーレイ -->
    <div id="ygo-image-popup-overlay" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10001;
      animation: ygo-overlay-in 0.2s ease;
    "></div>

    <!-- ポップアップ -->
    <div id="ygo-image-popup" style="
      position: absolute;
      top: ${top}px;
      left: ${left}px;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      width: ${displayWidth + padding * 2}px;
      z-index: 10002;
      animation: ygo-popup-in 0.2s ease;
      padding: ${topMargin}px ${padding}px ${bottomButtonHeight}px ${padding}px;
      cursor: pointer;
      overflow: visible;
    ">
      <!-- デッキ名入力欄（上部余白エリア） -->
      <input
        type="text"
        id="ygo-deck-name-input"
        value="${deckName}"
        placeholder="デッキ名を入力"
        style="
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: ${displayWidth - 16}px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          border: 2px solid rgba(200, 200, 200, 0.5);
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
          margin-bottom: 8px;
        "
        onclick="event.stopPropagation()"
      />

      <!-- 背景画像 -->
      <div id="ygo-background-image" style="
        position: relative;
        width: 100%;
        height: ${displayHeight}px;
        background: url('${backgroundImageUrl}') no-repeat center center;
        background-size: contain;
        transition: background 0.5s ease;
        margin-top: 8px;
      ">
        <!-- Include QRボタン（右下） -->
        <button id="ygo-qr-toggle" class="ygo-toggle-btn ygo-qr-active" style="
          position: absolute;
          right: 12px;
          bottom: 12px;
        " onclick="event.stopPropagation()">
          <div style="position: absolute; width: 48px; height: 48px; opacity: 0.15;">
            ${QR_ICON}
          </div>
          <span style="position: relative; z-index: 1; line-height: 1.2;">Include</span>
          <span style="position: relative; z-index: 1; line-height: 1.2;">QR</span>
        </button>
        ${hasSideDeck ? `
        <!-- Include Sideボタン（右中央） -->
        <button id="ygo-side-toggle" class="ygo-toggle-btn ygo-side-active" style="
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
        " onclick="event.stopPropagation()">
          <span style="line-height: 1.2;">Include</span>
          <span style="line-height: 1.2;">Side</span>
        </button>
        ` : ''}
      </div>

      <!-- 下部ボタンエリア -->
      <div style="
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: ${bottomButtonHeight}px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 ${padding}px;
        background: #ffffff;
        border-radius: 0 0 8px 8px;
      " onclick="event.stopPropagation()">
        <button id="ygo-close-btn" class="ygo-dialog-btn" style="
          background: #e0e0e0;
          color: #555;
        " onclick="event.stopPropagation()">
          Close
        </button>
        <button id="ygo-download-btn" class="ygo-dialog-btn" style="
          background: #4078ff;
          color: #ffffff;
        " onclick="event.stopPropagation()">
          ${DOWNLOAD_ICON}
          Download
        </button>
      </div>
    </div>
    <style>
      /* ボタン共通スタイル */
      .ygo-dialog-btn {
        padding: 8px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-width: 100px;
        height: 36px;
        transition: all 0.2s;
      }

      .ygo-toggle-btn {
        padding: 8px 12px;
        border: 2px solid rgba(200, 200, 200, 0.5);
        border-radius: 6px;
        cursor: pointer;
        width: 80px;
        height: 70px;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.3s;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
      }

      @keyframes ygo-popup-in {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes ygo-popup-out {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-8px);
        }
      }
      @keyframes ygo-overlay-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes ygo-overlay-out {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
      #ygo-image-popup.closing {
        animation: ygo-popup-out 0.2s ease forwards;
      }
      #ygo-image-popup-overlay.closing {
        animation: ygo-overlay-out 0.2s ease forwards;
      }
      #ygo-deck-name-input:hover {
        border-color: rgba(150, 150, 150, 0.7);
      }
      #ygo-deck-name-input:focus {
        border-color: rgba(100, 100, 100, 0.8);
      }

      /* QRボタン ON時 */
      #ygo-qr-toggle.ygo-qr-active {
        background: rgba(255, 255, 255, 0.9);
        color: #333;
        border-color: rgba(200, 200, 200, 0.7);
      }

      /* QRボタン OFF時 */
      #ygo-qr-toggle.ygo-qr-inactive {
        background: rgba(80, 80, 80, 0.6);
        color: #aaa;
        border-color: rgba(80, 80, 80, 0.8);
      }

      /* Sideボタン ON時 */
      #ygo-side-toggle.ygo-side-active {
        background: rgba(255, 255, 255, 0.9);
        color: #333;
        border-color: rgba(200, 200, 200, 0.7);
      }

      /* Sideボタン OFF時 */
      #ygo-side-toggle.ygo-side-inactive {
        background: rgba(80, 80, 80, 0.6);
        color: #aaa;
        border-color: rgba(80, 80, 80, 0.8);
      }

      #ygo-qr-toggle.ygo-qr-active:hover {
        background: rgba(255, 255, 255, 1);
        border-color: rgba(150, 150, 150, 0.9);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      #ygo-qr-toggle.ygo-qr-inactive:hover {
        background: rgba(100, 100, 100, 0.7);
      }
      #ygo-side-toggle.ygo-side-active:hover {
        background: rgba(255, 255, 255, 1);
        border-color: rgba(150, 150, 150, 0.9);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      #ygo-side-toggle.ygo-side-inactive:hover {
        background: rgba(100, 100, 100, 0.7);
      }

      /* Closeボタン */
      #ygo-close-btn:hover {
        background: #d0d0d0;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      /* Downloadボタン */
      #ygo-download-btn:hover {
        background: #2060e0;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      #ygo-download-btn:active,
      #ygo-close-btn:active,
      #ygo-qr-toggle:active,
      #ygo-side-toggle:active {
        transform: scale(0.98);
      }

      /* ダウンロードボタン無効化時 */
      #ygo-download-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: #6090c0;
      }

      /* スピナーアニメーション */
      @keyframes ygo-spinner-rotate {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      .ygo-spinner {
        animation: ygo-spinner-rotate 1s linear infinite;
      }
    </style>
  `;
}

/**
 * 背景画像情報
 */
interface BackgroundImageInfo {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * 背景画像を生成する（小さいスケールで軽量化）
 */
async function generateBackgroundImage(
  cgid: string,
  dno: string,
  deckData: DeckInfo,
  color: ColorVariant
): Promise<BackgroundImageInfo> {
  // タイトルなしのデッキデータを作成
  const deckDataWithoutTitle: DeckInfo = {
    ...deckData,
    name: '' // タイトルを空文字列にする
  };

  const blob = await createDeckRecipeImage({
    cgid,
    dno,
    color,
    includeQR: false,
    scale: 0.25, // 小さいスケールで軽量化
    deckData: deckDataWithoutTitle
  });

  // BlobをData URLに変換
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob as Blob);
  });

  // 画像サイズを取得
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = dataUrl;
  });

  return { dataUrl, width, height };
}

/**
 * ポップアップメニューを表示（汎用版）
 * @param cgid ユーザーID
 * @param dno デッキ番号
 * @param deckData デッキデータ
 * @param buttonRect ボタンの位置（nullの場合は画面中央に表示）
 */
export async function showImageDialogWithData(
  cgid: string,
  dno: string,
  deckData: DeckInfo,
  buttonRect: DOMRect | null = null
): Promise<void> {
  // 既存のポップアップがあれば削除
  const existingOverlay = document.getElementById('ygo-image-popup-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  const existingMenu = document.getElementById('ygo-image-popup');
  if (existingMenu) {
    existingMenu.remove();
  }

  // buttonRectがnullの場合は、画面中央に表示するためのダミーRectを作成
  const rect = buttonRect || {
    bottom: window.innerHeight / 2 - 200,
    left: window.innerWidth / 2 - 200,
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({})
  } as DOMRect;

  // 状態管理
  let selectedColor: ColorVariant = 'red';
  let includeQR = true;
  let includeSide = true;

  // 背景画像を生成
  const backgroundImage = await generateBackgroundImage(cgid, dno, deckData, selectedColor);

  // サイドデッキが存在するかチェック
  const hasSideDeck = deckData.sideDeck.length > 0;

  // ポップアップHTML を挿入
  const popupHTML = createPopupHTML(rect, backgroundImage.dataUrl, backgroundImage.width, backgroundImage.height, deckData.name, hasSideDeck);
  document.body.insertAdjacentHTML('beforeend', popupHTML);

  // イベントハンドラを登録
  const overlay = document.getElementById('ygo-image-popup-overlay');
  const popup = document.getElementById('ygo-image-popup');
  const backgroundImageDiv = document.getElementById('ygo-background-image');
  const qrToggle = document.getElementById('ygo-qr-toggle');
  const sideToggle = document.getElementById('ygo-side-toggle');
  const downloadBtn = document.getElementById('ygo-download-btn');
  const closeBtn = document.getElementById('ygo-close-btn');

  // Escapeキーハンドラを保持
  let handleEscape: ((event: KeyboardEvent) => void) | null = null;

  /**
   * ポップアップを閉じる（アニメーション付き）
   */
  const closePopup = () => {
    // クローズアニメーション開始
    overlay?.classList.add('closing');
    popup?.classList.add('closing');

    // Escapeキーイベントリスナーを削除
    if (handleEscape) {
      document.removeEventListener('keydown', handleEscape);
      handleEscape = null;
    }

    // アニメーション終了後に削除
    setTimeout(() => {
      overlay?.remove();
      popup?.remove();
    }, 200); // アニメーション時間と同じ
  };

  // オーバーレイをクリックで閉じる
  overlay?.addEventListener('click', closePopup);

  // Closeボタンで閉じる
  closeBtn?.addEventListener('click', closePopup);

  // Escapeキーで閉じる
  handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closePopup();
    }
  };
  document.addEventListener('keydown', handleEscape);

  // ポップアップ全体をクリックで色切り替え
  popup?.addEventListener('click', async () => {
    // 色を切り替え
    selectedColor = selectedColor === 'red' ? 'blue' : 'red';

    // 背景画像を再生成
    const newBackgroundImage = await generateBackgroundImage(cgid, dno, deckData, selectedColor);

    if (backgroundImageDiv) {
      backgroundImageDiv.style.background = `url('${newBackgroundImage.dataUrl}') no-repeat center center`;
      backgroundImageDiv.style.backgroundSize = 'cover';
    }
  });

  // QRトグルのクリック
  qrToggle?.addEventListener('click', () => {
    includeQR = !includeQR;
    if (includeQR) {
      qrToggle.classList.remove('ygo-qr-inactive');
      qrToggle.classList.add('ygo-qr-active');
    } else {
      qrToggle.classList.remove('ygo-qr-active');
      qrToggle.classList.add('ygo-qr-inactive');
    }
  });

  // Sideトグルのクリック（サイドデッキが存在する場合のみ）
  if (hasSideDeck) {
    sideToggle?.addEventListener('click', async () => {
      includeSide = !includeSide;
      if (includeSide) {
        sideToggle.classList.remove('ygo-side-inactive');
        sideToggle.classList.add('ygo-side-active');
      } else {
        sideToggle.classList.remove('ygo-side-active');
        sideToggle.classList.add('ygo-side-inactive');
      }

      // 背景画像を再生成（sideDeckの有無で高さが変わる）
      const deckDataForPreview = includeSide ? deckData : {
        ...deckData,
        sideDeck: []
      };
      const newBackgroundImage = await generateBackgroundImage(cgid, dno, deckDataForPreview, selectedColor);
      if (backgroundImageDiv) {
        backgroundImageDiv.style.background = `url('${newBackgroundImage.dataUrl}') no-repeat center center`;
        backgroundImageDiv.style.backgroundSize = 'contain';
      }
    });
  }

  // ダウンロードボタン
  downloadBtn?.addEventListener('click', async () => {
    if (!downloadBtn) return;

    // ボタンを無効化してローディング表示に切り替え
    const originalHTML = downloadBtn.innerHTML;
    downloadBtn.innerHTML = SPINNER_ICON;
    (downloadBtn as HTMLButtonElement).disabled = true;

    try {
      // TODO: scaleをオプションページから取得
      const scale = 2;

      // テキスト入力欄からデッキ名を取得
      const deckNameInput = document.getElementById('ygo-deck-name-input') as HTMLInputElement;
      const currentDeckName = deckNameInput?.value || deckData.name;

      // デッキ名を更新し、includeSideに応じてsideDeckを設定したdeckDataを作成
      // サイドデッキが存在しない場合は常に空配列
      const updatedDeckData: DeckInfo = {
        ...deckData,
        name: currentDeckName,
        sideDeck: (hasSideDeck && includeSide) ? deckData.sideDeck : []
      };

      // ダウンロード実行（更新されたdeckDataを渡す）
      await downloadDeckRecipeImage({
        cgid,
        dno,
        color: selectedColor,
        includeQR,
        scale,
        deckData: updatedDeckData
      });

      // ポップアップを閉じる（アニメーション付き）
      closePopup();
    } catch (error) {
      console.error('[YGO Helper] Failed to create image:', error);

      // エラー時はボタンを元に戻す
      downloadBtn.innerHTML = originalHTML;
      (downloadBtn as HTMLButtonElement).disabled = false;
    }
  });
}

/**
 * ポップアップメニューを表示（デッキ表示画面用）
 */
export async function showImageDialog(): Promise<void> {
  // ボタンの位置を取得
  const button = document.getElementById('ygo-deck-image-btn');
  if (!button) {
    console.error('[YGO Helper] Button not found');
    return;
  }

  const buttonRect = button.getBoundingClientRect();

  // URLからデッキ番号とユーザーIDを取得
  const url = window.location.href;
  const dnoMatch = url.match(/dno=(\d+)/);
  const cgidMatch = url.match(/cgid=([a-f0-9]+)/);
  if (!dnoMatch || !dnoMatch[1]) {
    console.error('[YGO Helper] Failed to get deck number from URL');
    return;
  }
  if (!cgidMatch || !cgidMatch[1]) {
    console.error('[YGO Helper] Failed to get user ID from URL');
    return;
  }
  const dno = dnoMatch[1];
  const cgid = cgidMatch[1];

  // 現在のページのDOMからデッキデータを取得
  let deckData: DeckInfo;
  try {
    deckData = await parseDeckDetail(document);
  } catch (error) {
    console.error('[YGO Helper] Failed to parse deck data from current page:', error);
    return;
  }

  // 汎用版を呼び出し
  await showImageDialogWithData(cgid, dno, deckData, buttonRect);
}
