/**
 * デッキ表示ページの Card Detail UI 管理
 * - タブ切り替え機能
 * - カード選択イベント処理
 */

interface SelectedCard {
  cardId?: number;
  name?: string;
  [key: string]: any;
}

interface CardFAQList {
  cardId: string;
  cardName: string;
  supplementInfo?: string;
  supplementDate?: string;
  pendulumSupplementInfo?: string;
  pendulumSupplementDate?: string;
  faqs: Array<{
    faqId: string;
    question: string;
    answer?: string;
    updatedAt?: string;
  }>;
}

let selectedCard: SelectedCard | null = null;
let currentTab: 'info' | 'qa' = 'info';
let cachedFAQData: Map<number, CardFAQList> = new Map();

/**
 * Card Detail タブ機能を初期化
 */
export function initCardDetailUI(): void {
  // タブボタンのクリックイベント
  const tabButtons = document.querySelectorAll('#ygo-card-detail-container .tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const tabName = target.getAttribute('data-tab') as 'info' | 'qa';
      if (tabName) {
        await switchTab(tabName);
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
async function switchTab(tabName: 'info' | 'qa'): Promise<void> {
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
  await updateTabContent();
}

/**
 * FAQ データを取得
 */
async function fetchFAQData(cardId: number): Promise<CardFAQList | null> {
  // キャッシュをチェック
  if (cachedFAQData.has(cardId)) {
    return cachedFAQData.get(cardId) || null;
  }

  try {
    // 動的に card-faq.ts をインポート
    const { getCardFAQList } = await import('../../api/card-faq');
    const faqData = await getCardFAQList(cardId.toString());

    if (faqData) {
      cachedFAQData.set(cardId, faqData);
    }

    return faqData;
  } catch (error) {
    console.error('[CardDetailUI] Failed to fetch FAQ data:', error);
    return null;
  }
}

/**
 * FAQ コンテンツを HTML に変換
 */
function renderFAQContent(faqData: CardFAQList): string {
  let html = '<div class="card-qa-content">';

  // 補足情報を表示（テキスト用）
  if (faqData.supplementInfo) {
    html += `
      <div class="supplement-section">
        <div class="supplement-title">テキスト補足情報</div>
        <div class="supplement-text">${faqData.supplementInfo.replace(/\n/g, '<br>')}</div>
        ${faqData.supplementDate ? `<div class="supplement-date">${faqData.supplementDate}</div>` : ''}
      </div>
    `;
  }

  // ペンデュラム補足情報を表示
  if (faqData.pendulumSupplementInfo) {
    html += `
      <div class="supplement-section">
        <div class="supplement-title">ペンデュラム補足情報</div>
        <div class="supplement-text">${faqData.pendulumSupplementInfo.replace(/\n/g, '<br>')}</div>
        ${faqData.pendulumSupplementDate ? `<div class="supplement-date">${faqData.pendulumSupplementDate}</div>` : ''}
      </div>
    `;
  }

  // FAQ 一覧を表示
  if (faqData.faqs.length > 0) {
    html += '<div class="faq-list-section"><div class="supplement-title">関連Q&A</div>';
    faqData.faqs.forEach(faq => {
      html += `
        <div class="faq-item" data-faq-id="${faq.faqId}">
          <div class="faq-question">${faq.question}</div>
          ${faq.updatedAt ? `<div class="faq-updated">更新日: ${faq.updatedAt}</div>` : ''}
        </div>
      `;
    });
    html += '</div>';
  } else if (!faqData.supplementInfo && !faqData.pendulumSupplementInfo) {
    html += '<p style="text-align: center; color: #999;">Q&A情報がありません</p>';
  }

  html += '</div>';
  return html;
}

/**
 * タブコンテンツを更新
 */
async function updateTabContent(): Promise<void> {
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
    // Q&A タブ: FAQ データを取得して表示
    contentContainer.innerHTML = '<p style="text-align: center; color: #999;">読み込み中...</p>';

    const faqData = await fetchFAQData(selectedCard.cardId);
    if (faqData) {
      contentContainer.innerHTML = renderFAQContent(faqData);
    } else {
      contentContainer.innerHTML = '<p style="text-align: center; color: #999;">Q&A情報を読み込めません</p>';
    }
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

      img.addEventListener('click', async (e) => {
        e.stopPropagation();

        // カード画像から cardId を抽出
        const src = img.getAttribute('src') || '';
        const cardIdMatch = src.match(/\/card\/(\d+)/);
        if (cardIdMatch) {
          const cardId = parseInt(cardIdMatch[1], 10);
          // 画像のalt属性からカード名を取得
          const cardName = img.getAttribute('alt') || 'Unknown';

          await selectCard({ cardId, name: cardName });
        }
      });
    }
  });
}

/**
 * カードを選択
 */
async function selectCard(card: SelectedCard): Promise<void> {
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
  await updateTabContent();

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
