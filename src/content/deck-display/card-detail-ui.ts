/**
 * デッキ表示ページの Card Detail UI 管理
 * - タブ切り替え機能
 * - デッキ内のカード画像からcidを抽出してselectedCardに設定
 *
 * アーキテクチャ：
 * 1. ページ読み込み時: parseDeckDetail()でデッキ情報を全て抽出
 * 2. カード画像クリック時: 抽出済みデータから該当カード情報を検索
 */

import { useCardDetailStore } from '@/stores/card-detail'
import { parseDeckDetail } from '../parser/deck-detail-parser'
import { DeckInfo } from '@/types/deck'
import { getTempCardDB } from '@/utils/temp-card-db'

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

// ページロード時に抽出したデッキ情報を保存
let parsedDeckInfo: DeckInfo | null = null;

/**
 * Card Detail タブ機能を初期化
 */
export async function initCardDetailUI(): Promise<void> {
  try {
    // デッキ情報をページのDOMから全て抽出
    // 注: parseDeckDetail()内でparseCardSection()が呼ばれ、
    // すべてのカード情報がTempCardDBに保存される
    parsedDeckInfo = await parseDeckDetail(document);

    // スキップされたカード情報を通知
    if (parsedDeckInfo && parsedDeckInfo.skippedCardsCount && parsedDeckInfo.skippedCardsCount > 0) {
      const skippedCount = parsedDeckInfo.skippedCardsCount;
      const skippedDetails = parsedDeckInfo.skippedCards || [];

      console.warn(
        `[CardDetailUI] ${skippedCount} unreleased cards were skipped during deck import`
      );

      // スキップされたカード詳細をログ出力
      if (skippedDetails.length > 0) {
        console.warn(
          '[CardDetailUI] Skipped cards:',
          skippedDetails.map(card => `${card.name} (cid: ${card.cid}, lang: ${card.lang})`).join(', ')
        );
      }
    }
  } catch (error) {
    console.error('[CardDetailUI] Failed to parse deck info:', error);
    parsedDeckInfo = null;
  }

  // タブボタンのクリックイベント
  const tabButtons = document.querySelectorAll('#ygo-next-card-detail-container .ygo-next.tab-btn');
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
}

/**
 * タブを切り替え
 */
async function switchTab(tabName: 'info' | 'qa'): Promise<void> {
  currentTab = tabName;

  // ボタンのアクティブ状態を更新
  const tabButtons = document.querySelectorAll('#ygo-next-card-detail-container .ygo-next.tab-btn');
  tabButtons.forEach(button => {
    button.classList.remove('ygo-next-active');
    if (button.getAttribute('data-tab') === tabName) {
      button.classList.add('ygo-next-active');
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
  let html = '<div class="ygo-next card-qa-content">';

  // 補足情報を表示（テキスト用）
  if (faqData.supplementInfo) {
    html += `
      <div class="ygo-next supplement-section">
        <div class="ygo-next supplement-title">テキスト補足情報</div>
        <div class="ygo-next supplement-text">${faqData.supplementInfo.replace(/\n/g, '<br>')}</div>
        ${faqData.supplementDate ? `<div class="ygo-next supplement-date">${faqData.supplementDate}</div>` : ''}
      </div>
    `;
  }

  // ペンデュラム補足情報を表示
  if (faqData.pendulumSupplementInfo) {
    html += `
      <div class="ygo-next supplement-section">
        <div class="ygo-next supplement-title">ペンデュラム補足情報</div>
        <div class="ygo-next supplement-text">${faqData.pendulumSupplementInfo.replace(/\n/g, '<br>')}</div>
        ${faqData.pendulumSupplementDate ? `<div class="ygo-next supplement-date">${faqData.pendulumSupplementDate}</div>` : ''}
      </div>
    `;
  }

  // FAQ 一覧を表示
  if (faqData.faqs.length > 0) {
    html += '<div class="ygo-next faq-list-section"><div class="ygo-next supplement-title">関連Q&A</div>';
    faqData.faqs.forEach(faq => {
      html += `
        <div class="ygo-next faq-item" data-faq-id="${faq.faqId}">
          <div class="ygo-next faq-question">${faq.question}</div>
          ${faq.updatedAt ? `<div class="ygo-next faq-updated">更新日: ${faq.updatedAt}</div>` : ''}
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
  const contentContainer = document.getElementById('ygo-next-card-info-content');
  if (!contentContainer) return;

  if (!selectedCard || !selectedCard.cardId) {
    contentContainer.innerHTML = '<p>カードを選択してください</p>';
    return;
  }

  if (currentTab === 'info') {
    // Info タブ: カード情報を表示
    contentContainer.innerHTML = `
      <div class="ygo-next card-detail-info">
        <div class="ygo-next card-name"><strong>${selectedCard.name || 'Unknown'}</strong></div>
        <div class="ygo-next card-id">ID: ${selectedCard.cardId}</div>
        ${selectedCard.type ? `<div class="ygo-next card-type">${selectedCard.type}</div>` : ''}
        ${selectedCard.attribute ? `<div class="ygo-next card-attribute">${selectedCard.attribute}</div>` : ''}
        ${selectedCard.race ? `<div class="ygo-next card-race">${selectedCard.race}</div>` : ''}
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
 * パースされたデッキ情報からcidに基づいてカード情報を検索
 * TempCardDBからカード詳細を取得（parseCardSection()で既に保存済み）
 */
function findCardInParsedDeck(cid: string): any | null {
  if (!parsedDeckInfo) {
    return null;
  }

  // メインデッキ、エクストラデッキ、サイドデッキから検索
  const allCards = [
    ...parsedDeckInfo.mainDeck,
    ...parsedDeckInfo.extraDeck,
    ...parsedDeckInfo.sideDeck
  ];

  const deckCardRef = allCards.find(card => card.cid === cid);
  if (!deckCardRef) {
    return null;
  }

  // TempCardDBからカード詳細情報を取得
  // 注: parseCardSection()で既に保存済みなので、見つからないことはない
  const tempCardDB = getTempCardDB();
  const cardDetail = tempCardDB.get(deckCardRef.cid);

  if (!cardDetail) {
    console.error('[CardDetailUI] Card not found in TempCardDB:', deckCardRef.cid);
    return null;
  }

  return {
    ...cardDetail,
    ciid: deckCardRef.ciid
  };
}

/**
 * カード要素にクリックハンドラを追加
 */
function attachCardClickHandlers(): void {
  // デッキセクション内のカード画像を取得
  const deckImageContainer = document.querySelector('#deck_image');
  if (!deckImageContainer) {
    console.warn('[CardDetailUI] #deck_image element not found');
    return;
  }

  // #deck_image内の全ての img を取得して確認
  const allImagesInDeck = deckImageContainer.querySelectorAll('img');

  // /card/ を含む画像を探す
  let cardImages = Array.from(allImagesInDeck).filter(img => img.src.includes('/card/'));

  // 見つからない場合は全ての img を使用
  if (cardImages.length === 0) {
    cardImages = Array.from(allImagesInDeck);
  }

  cardImages.forEach(imgElement => {
    const img = imgElement as HTMLImageElement;
    // 既にハンドラが追加されていなければ追加
    if (!img.hasAttribute('data-click-handler-added')) {
      img.setAttribute('data-click-handler-added', 'true');
      img.style.cursor = 'pointer';

      img.addEventListener('click', async (e) => {
        e.stopPropagation();

        // img IDからciidを抽出
        // img IDの形式: card_image_<index>_<ciid>
        const imgId = img.getAttribute('id') || '';
        const idMatch = imgId.match(/card_image_\d+_(\d+)/);
        const ciid: string | undefined = idMatch?.[1];

        // img のsrcからcidを抽出
        const src = img.getAttribute('src') || '';
        const cidMatch = src.match(/cid=(\d+)/);
        if (cidMatch && cidMatch[1]) {
          const cid: string = cidMatch[1];

          // パースされたデッキ情報からカード情報を検索
          let cardInfo = findCardInParsedDeck(cid);
          if (cardInfo && ciid) {
            // 抽出したciidでカード情報を更新
            cardInfo = {
              ...cardInfo,
              ciid: ciid as string
            };
          }

          if (cardInfo) {
            // 検索したカード情報でselectCard()を呼び出し
            await selectCard(cardInfo);
          } else {
            console.error('[CardDetailUI] Card not found in parsed deck:', cid);
          }
        }
      });
    }
  });
}

/**
 * カードを選択
 * TempCardDBから取得したカード情報をcardDetailStoreに設定
 */
async function selectCard(cardInfo: any): Promise<void> {
  const cardDetailStore = useCardDetailStore();

  if (!cardInfo || !cardInfo.cardId) {
    console.warn('[CardDetailUI] selectCard: no cardInfo or cardId');
    return;
  }

  try {
    // cardIdを文字列に変換（cardDetailStore.setSelectedCardの要件）
    const cardIdStr = String(cardInfo.cardId);

    // 詳細情報を取得
    const { getCardDetailWithCache } = await import('../../api/card-search');
    const result = await getCardDetailWithCache(cardIdStr);

    const fullCard = result?.detail?.card || cardInfo;

    // デッキ情報とマージしたカード情報を設定
    const cardData = {
      ...fullCard,
      cardId: cardIdStr,
      imgs: fullCard.imgs ? [...fullCard.imgs] : (cardInfo.imgs ? [...cardInfo.imgs] : []),
      ciid: cardInfo.ciid || fullCard.ciid || '0'
    };

    cardDetailStore.setSelectedCard(cardData);
    cardDetailStore.setCardTab('info');
    currentTab = 'info';
  } catch (error) {
    console.error('[CardDetailUI] Failed to select card:', error);
    // フォールバック：取得できたデータだけで設定
    cardDetailStore.setSelectedCard({
      ...cardInfo,
      cardId: String(cardInfo.cardId)
    });
    cardDetailStore.setCardTab('info');
    currentTab = 'info';
  }

  // Tab ボタンのアクティブ状態をリセット
  const tabButtons = document.querySelectorAll('#ygo-next-card-detail-container .ygo-next.tab-btn');
  tabButtons.forEach(button => {
    button.classList.remove('ygo-next-active');
    if (button.getAttribute('data-tab') === 'info') {
      button.classList.add('ygo-next-active');
    }
  });
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
