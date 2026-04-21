/**
 * デッキ画像作成ボタンを #bottom_btn_set に追加する
 */

import { showImageDialog } from './imageDialog';
import { isDeckDisplayPage, detectCardGameType, isOwnDeck, getDeckCgid } from '../../utils/page-detector';
import { getVueEditUrl } from '../../utils/url-builder';
import { detectLanguage } from '../../utils/language-detector';
import { EXTENSION_IDS } from '../../utils/dom-selectors';

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
  if (document.getElementById(EXTENSION_IDS.deckImage.deckImageButton)) {
    return null;
  }

  // ボタンを作成（アイコンのみ、グラデーション）
  const button = document.createElement('a');
  button.id = EXTENSION_IDS.deckImage.deckImageButton;
  button.className = 'ygo-next btn hex ytomo-neuron-btn';
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
    try {
      await showImageDialog();
    } catch (error) {
      console.error('[YGO Helper] Failed to show image dialog:', error);
    }
  });

  // #bottom_btn_set の右側に追加
  bottomBtnSet.appendChild(button);

  // NEXT編集ボタンも追加
  addNextEditButton(bottomBtnSet);

  // NEXTコピー編集の高速化：backgroundでデッキ情報をプリロード
  preloadDeckInfo();

  return button;
}

/**
 * NEXTコピー編集の高速化：backgroundでデッキ情報をプリロード
 * ボタンクリック前にデッキ情報をパースしておくことで、コピー時の待ち時間を短縮
 */
async function preloadDeckInfo(): Promise<void> {
  try {
    const { ensureParsedDeckInfo } = await import('../deck-display/card-detail-ui');
    await ensureParsedDeckInfo();
  } catch (error) {
    console.debug('[YGO Helper] Deck info preload failed (non-critical):', error);
  }
}

/**
 * NEXT編集/コピー編集ボタンを追加
 */
function addNextEditButton(bottomBtnSet: Element): HTMLElement | null {
  // 既にボタンが追加されていないか確認
  if (document.getElementById(EXTENSION_IDS.deckEdit.editButton)) {
    return null;
  }

  // URLからdnoを取得
  const urlParams = new URLSearchParams(window.location.search);
  const dno = urlParams.get('dno');

  if (!dno) {
    console.warn('[YGO Helper] dno not found in URL');
    return null;
  }

  // 自分のデッキかどうかで処理を分岐
  const isOwnDeckFlag = isOwnDeck();
  const buttonText = isOwnDeckFlag ? 'NEXT編集' : 'NEXTコピー編集';

  // ボタンを作成
  const button = document.createElement('a');
  button.id = EXTENSION_IDS.deckEdit.editButton;
  button.className = 'ygo-next btn hex orn ytomo-neuron-btn';
  button.href = '#';
  button.style.cssText = 'margin-left: 10px;';

  const span = document.createElement('span');
  span.textContent = buttonText;

  button.appendChild(span);

  // クリックイベント
  button.addEventListener('click', async (e) => {
    e.preventDefault();

    const gameType = detectCardGameType();
    const locale = detectLanguage(document);

    if (isOwnDeckFlag) {
      // 自分のデッキの場合：通常の編集画面を開く
      const editUrl = getVueEditUrl(gameType, parseInt(dno), locale);
      window.location.href = editUrl;
    } else {
      // 他人のデッキの場合：コピー編集モードで編集画面を開く
      const deckCgid = getDeckCgid();
      if (deckCgid) {
        // ボタンをローディング状態にして状態表示を開始（.loading = 緑色 #4CAF50）
        button.classList.add('loading');
        span.textContent = 'generating...';

        // デッキ表示ページで既にパースされた情報を使用してコピー作成
        try {
          const { ensureParsedDeckInfo } = await import('../deck-display/card-detail-ui');
          const { sessionManager } = await import('../../content/session/session');

          const parsedDeckInfo = await ensureParsedDeckInfo();

          if (parsedDeckInfo) {
            // 新規デッキを作成
            const newDno = await sessionManager.createDeck();

            if (newDno > 0) {
              // 状態を copying に変更（.loading2 = オレンジ色 #FF9800）
              button.classList.remove('loading');
              button.classList.add('loading2');
              span.textContent = 'copying...';

              // 作成したデッキにデッキ情報を保存
              const deckDataToCopy: any = {
                mainDeck: parsedDeckInfo.mainDeck,
                extraDeck: parsedDeckInfo.extraDeck,
                sideDeck: parsedDeckInfo.sideDeck,
                category: parsedDeckInfo.category || '',
                tags: parsedDeckInfo.tags || [],
                comment: parsedDeckInfo.comment || '',
                deckCode: parsedDeckInfo.deckCode || '',
                name: parsedDeckInfo.originalName || parsedDeckInfo.name || ''
              };

              // デッキを保存
              const saveResult = await sessionManager.saveDeck(newDno, deckDataToCopy);

              if (saveResult.success) {
                // 新しいdnoで編集画面に遷移
                const editUrl = getVueEditUrl(gameType, newDno, locale);
                window.location.href = editUrl;
              } else {
                // エラー時はボタンの状態をリセット
                button.classList.remove('loading', 'loading2');
                span.textContent = buttonText;
                console.warn('[YGO Helper] Failed to save copied deck');
              }
            } else {
              // エラー時はボタンの状態をリセット
              button.classList.remove('loading', 'loading2');
              span.textContent = buttonText;
              console.warn('[YGO Helper] Failed to create new deck');
            }
          }
        } catch (error) {
          // エラー時はボタンの状態をリセット
          button.classList.remove('loading', 'loading2');
          span.textContent = buttonText;
          console.warn('[YGO Helper] Failed to copy deck:', error);
        }
      } else {
        console.warn('[YGO Helper] Failed to get deck cgid');
      }
    }
  });

  // #bottom_btn_set の右側に追加
  bottomBtnSet.appendChild(button);

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
