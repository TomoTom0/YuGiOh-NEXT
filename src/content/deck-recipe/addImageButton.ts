/**
 * デッキ画像作成ボタンを #bottom_btn_set に追加する
 */

import { showImageDialog } from './imageDialog';
import { isDeckDisplayPage, detectCardGameType } from '../../utils/page-detector';

/**
 * カメラアイコンのSVG
 */
const CAMERA_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
  <circle cx="12" cy="13" r="4"></circle>
</svg>
`;

/**
 * デッキ画像作成ボタンを追加
 * @returns 追加されたボタン要素、または null
 */
export function addDeckImageButton(): HTMLElement | null {
  // #bottom_btn_set 要素を取得
  const bottomBtnSet = document.querySelector('#bottom_btn_set');

  if (!bottomBtnSet) {
    console.warn('[YGO Helper] #bottom_btn_set not found');
    return null;
  }

  // 既にボタンが追加されていないか確認
  if (document.querySelector('#ygo-deck-image-btn')) {
    console.log('[YGO Helper] Deck image button already exists');
    return null;
  }

  // ボタンを作成（アイコンのみ、グラデーション）
  const button = document.createElement('a');
  button.id = 'ygo-deck-image-btn';
  button.className = 'btn hex ytomo-neuron-btn';
  button.href = '#';
  button.style.cssText = 'margin-left: 10px;';
  button.title = 'デッキ画像作成';

  // アイコンのみ
  const span = document.createElement('span');
  span.innerHTML = CAMERA_ICON;

  button.appendChild(span);

  // クリックイベント
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('[YGO Helper] Deck image button clicked');
    try {
      await showImageDialog();
    } catch (error) {
      console.error('[YGO Helper] Failed to show image dialog:', error);
    }
  });

  // #bottom_btn_set の右側に追加
  bottomBtnSet.appendChild(button);

  console.log('[YGO Helper] Deck image button added');
  
  // NEXT編集ボタンも追加
  addNextEditButton(bottomBtnSet);
  
  return button;
}

/**
 * NEXT編集ボタンを追加
 */
function addNextEditButton(bottomBtnSet: Element): HTMLElement | null {
  // 既にボタンが追加されていないか確認
  if (document.querySelector('#ygo-next-edit-btn')) {
    console.log('[YGO Helper] Next edit button already exists');
    return null;
  }

  // URLからdnoを取得
  const urlParams = new URLSearchParams(window.location.search);
  const dno = urlParams.get('dno');
  
  if (!dno) {
    console.warn('[YGO Helper] dno not found in URL');
    return null;
  }

  // ボタンを作成
  const button = document.createElement('a');
  button.id = 'ygo-next-edit-btn';
  button.className = 'btn hex orn ytomo-neuron-btn';
  button.href = '#';
  button.style.cssText = 'margin-left: 10px;';

  const span = document.createElement('span');
  span.textContent = 'NEXT編集';

  button.appendChild(span);

  // クリックイベント
  button.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[YGO Helper] Next edit button clicked, dno:', dno);
    
    // 独自デッキ編集画面へ遷移
    window.location.hash = `/ytomo/edit?dno=${dno}`;
  });

  // #bottom_btn_set の右側に追加
  bottomBtnSet.appendChild(button);

  console.log('[YGO Helper] Next edit button added');
  return button;
}

/**
 * デッキ表示ページかどうかを判定（後方互換性のため維持）
 * @deprecated 直接 isDeckDisplayPage を使用してください
 */
export function isDeckPage(): boolean {
  return isDeckDisplayPage();
}

/**
 * ページが読み込まれたときに自動でボタンを追加
 */
export function initDeckImageButton(): void {
  // 現在のページのゲームタイプを検出
  const gameType = detectCardGameType();
  
  if (isDeckDisplayPage(gameType)) {
    // DOMContentLoaded後に実行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(addDeckImageButton, 100);
      });
    } else {
      setTimeout(addDeckImageButton, 100);
    }
  }
}
