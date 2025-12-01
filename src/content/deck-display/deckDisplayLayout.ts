/**
 * デッキ表示ページのレイアウト管理
 * - #deck_imageの右側にCardDetailエリアを配置
 * - カード画像サイズを変更
 */

import type { CardSize, AppSettings } from '../../types/settings';

/**
 * レイアウトCSSを適用
 */
export function applyDeckDisplayLayout(): void {
  // CSSを注入
  const style = document.createElement('style');
  style.textContent = `
    #deck_image {
      display: flex;
      flex-direction: row;
      gap: 20px;
      align-items: flex-start;
    }

    #ygo-deck-sections-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      flex: 0 0 auto;
    }

    #ygo-card-detail-container {
      flex: 1;
      min-width: 300px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 15px;
      overflow-y: auto;
      max-height: 100vh;
      position: sticky;
      top: 20px;
    }

    #ygo-card-detail-container h2 {
      margin: 0 0 15px 0;
      font-size: 16px;
      border-bottom: 2px solid #008cff;
      padding-bottom: 8px;
    }

    #ygo-card-detail-container .card-detail-tabs {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      border-bottom: 2px solid #008cff;
      margin-bottom: 15px;
    }

    #ygo-card-detail-container .card-detail-tabs button {
      padding: 8px;
      border: none;
      border-right: 1px solid #e0e0e0;
      background: white;
      cursor: pointer;
      font-size: 12px;
      color: #333;
      transition: background 0.2s;
    }

    #ygo-card-detail-container .card-detail-tabs button:hover {
      background: #f5f5f5;
    }

    #ygo-card-detail-container .card-detail-tabs button.active {
      background: #008cff;
      color: white;
    }

    #ygo-card-detail-container .card-tab-content {
      padding: 10px 0;
      font-size: 12px;
      line-height: 1.5;
    }

    #ygo-card-detail-container .card-detail-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    #ygo-card-detail-container .card-name {
      font-size: 14px;
      font-weight: bold;
      color: #000;
    }

    #ygo-card-detail-container .card-id,
    #ygo-card-detail-container .card-type,
    #ygo-card-detail-container .card-attribute,
    #ygo-card-detail-container .card-race {
      font-size: 11px;
      color: #666;
      padding: 4px 8px;
      background: #f5f5f5;
      border-radius: 2px;
    }

    /* デッキセクション内のカード画像をホバー時に強調 */
    #ygo-deck-sections-container img[src*="/card/"] {
      transition: transform 0.1s, filter 0.1s;
    }

    #ygo-deck-sections-container img[src*="/card/"]:hover {
      transform: scale(1.05);
      filter: brightness(1.1);
    }
  `;
  document.head.appendChild(style);
}

/**
 * #deck_imageの構造を変更（セクションコンテナを作成）
 */
export function restructureDeckImageLayout(): void {
  const deckImage = document.querySelector('#deck_image');
  if (!deckImage) {
    return;
  }

  // 既に変更されていれば返す
  if (deckImage.querySelector('#ygo-deck-sections-container')) {
    return;
  }

  // デッキセクション（#main, #extra, #side）を取得
  const sections = Array.from(
    deckImage.querySelectorAll(':scope > #main, :scope > #extra, :scope > #side')
  );

  if (sections.length === 0) {
    return;
  }

  // コンテナを作成
  const container = document.createElement('div');
  container.id = 'ygo-deck-sections-container';

  // セクションをコンテナに移動
  sections.forEach(section => {
    container.appendChild(section);
  });

  // コンテナを #deck_image に追加
  deckImage.insertBefore(container, deckImage.firstChild);
}

/**
 * CardDetailコンテナを作成
 */
export function createCardDetailContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.id = 'ygo-card-detail-container';
  container.innerHTML = `
    <h2>Card Detail</h2>
    <div class="card-detail-tabs">
      <button class="tab-btn active" data-tab="info">Info</button>
      <button class="tab-btn" data-tab="qa">Q&A</button>
    </div>
    <div class="card-tab-content" id="card-info-content">
      <p>カードを選択してください</p>
    </div>
  `;
  return container;
}

/**
 * カード画像サイズを変更
 */
export function setCardImageSize(size: CardSize): void {
  const sizeMap = {
    small: '36px',
    medium: '60px',
    large: '90px'
  };

  document.documentElement.style.setProperty(
    '--deck-display-card-width',
    sizeMap[size]
  );
}

/**
 * デッキ表示ページのレイアウトを初期化（chrome.storage から設定を読み込み）
 */
export function initDeckDisplayLayout(): void {
  // chrome.storage から設定を読み込み
  chrome.storage.local.get(['appSettings'], (result) => {
    const appSettings = (result.appSettings as Partial<AppSettings>) || {};
    const cardImageSize = (appSettings.deckDisplayCardImageSize ?? 'large') as CardSize;

    // CSSを適用
    applyDeckDisplayLayout();

    // 構造を変更
    restructureDeckImageLayout();

    // CardDetailエリアを常に追加
    const deckImage = document.querySelector('#deck_image');
    if (deckImage) {
      const detailContainer = createCardDetailContainer();
      deckImage.appendChild(detailContainer);
    }

    // カード画像サイズを設定
    setCardImageSize(cardImageSize);
  });
}
