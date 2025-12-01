/**
 * デッキ表示ページの Card Detail UI 管理
 * - タブ切り替え機能
 * - カード選択イベント処理
 * - Vue コンポーネント統合（future）
 */

interface SelectedCard {
  cardId?: number;
  name?: string;
  [key: string]: any;
}

let selectedCard: SelectedCard | null = null;
let currentTab: 'info' | 'qa' = 'info';

/**
 * Card Detail タブ機能を初期化
 */
export function initCardDetailUI(): void {
  // タブボタンのクリックイベント
  const tabButtons = document.querySelectorAll('#ygo-card-detail-container .tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const tabName = target.getAttribute('data-tab') as 'info' | 'qa';
      if (tabName) {
        switchTab(tabName);
      }
    });
  });

  // デッキ内のカード要素にクリックイベントを追加
  setupCardClickListeners();

  console.log('[DeckDisplayUI] Card Detail UI initialized');
}

/**
 * タブを切り替え
 */
function switchTab(tabName: 'info' | 'qa'): void {
  currentTab = tabName;

  // ボタンのアクティブ状態を更新
  const tabButtons = document.querySelectorAll('#ygo-card-detail-container .tab-btn');
  tabButtons.forEach(button => {
    button.classList.remove('active');
    if (button.getAttribute('data-tab') === tabName) {
      button.classList.add('active');
    }
  });

  // タブコンテンツを更新
  updateTabContent();
}

/**
 * タブコンテンツを更新
 */
function updateTabContent(): void {
  const contentContainer = document.getElementById('card-info-content');
  if (!contentContainer) return;

  if (!selectedCard || !selectedCard.cardId) {
    contentContainer.innerHTML = '<p>カードを選択してください</p>';
    return;
  }

  if (currentTab === 'info') {
    // Info タブ: カード情報を表示
    contentContainer.innerHTML = `
      <div class="card-detail-info">
        <div class="card-name"><strong>${selectedCard.name || 'Unknown'}</strong></div>
        <div class="card-id">ID: ${selectedCard.cardId}</div>
        ${selectedCard.type ? `<div class="card-type">${selectedCard.type}</div>` : ''}
        ${selectedCard.attribute ? `<div class="card-attribute">${selectedCard.attribute}</div>` : ''}
        ${selectedCard.race ? `<div class="card-race">${selectedCard.race}</div>` : ''}
      </div>
    `;
  } else if (currentTab === 'qa') {
    // Q&A タブ: プレースホルダー
    contentContainer.innerHTML = '<p>Q&A information will be loaded here</p>';
  }
}

/**
 * デッキ内のカード要素にクリックイベントをセットアップ
 */
function setupCardClickListeners(): void {
  // デッキセクション内のカード画像をクリック可能にする
  const observer = new MutationObserver(() => {
    attachCardClickHandlers();
  });

  const deckImage = document.querySelector('#deck_image');
  if (deckImage) {
    observer.observe(deckImage, {
      childList: true,
      subtree: true
    });
  }

  // 初期セットアップ
  attachCardClickHandlers();
}

/**
 * カード要素にクリックハンドラを追加
 */
function attachCardClickHandlers(): void {
  // デッキセクション内のカード画像を取得
  const cardImages = document.querySelectorAll('#ygo-deck-sections-container img[src*="/card/"]');

  cardImages.forEach(imgElement => {
    const img = imgElement as HTMLImageElement;
    // 既にハンドラが追加されていなければ追加
    if (!img.hasAttribute('data-click-handler-added')) {
      img.setAttribute('data-click-handler-added', 'true');
      img.style.cursor = 'pointer';

      img.addEventListener('click', (e) => {
        e.stopPropagation();

        // カード画像から cardId を抽出
        const src = img.getAttribute('src') || '';
        const cardIdMatch = src.match(/\/card\/(\d+)/);
        if (cardIdMatch) {
          const cardId = parseInt(cardIdMatch[1], 10);
          // 画像のalt属性からカード名を取得
          const cardName = img.getAttribute('alt') || 'Unknown';

          selectCard({ cardId, name: cardName });
        }
      });
    }
  });
}

/**
 * カードを選択
 */
function selectCard(card: SelectedCard): void {
  selectedCard = card;
  currentTab = 'info';

  // Tab ボタンのアクティブ状態をリセット
  const tabButtons = document.querySelectorAll('#ygo-card-detail-container .tab-btn');
  tabButtons.forEach(button => {
    button.classList.remove('active');
    if (button.getAttribute('data-tab') === 'info') {
      button.classList.add('active');
    }
  });

  // コンテンツを更新
  updateTabContent();

  console.log('[DeckDisplayUI] Card selected:', card);
}

/**
 * 選択中のカード情報を取得
 */
export function getSelectedCard(): SelectedCard | null {
  return selectedCard;
}

/**
 * 選択中のタブを取得
 */
export function getCurrentTab(): 'info' | 'qa' {
  return currentTab;
}
