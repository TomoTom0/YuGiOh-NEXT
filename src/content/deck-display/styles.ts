/**
 * デッキ表示ページの CSS スタイル
 */

export function applyCardDetailStyles(): void {
  const style = document.createElement('style')
  style.textContent = `
    /* 公式サイトの CSS を無効化 */
    .box_default .box_default_table dt span {
      min-width: auto !important;
    }

    #ygo-next-card-detail-container {
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      padding: 0;
      overflow: hidden;
      max-height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    .ygo-next.card-detail {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .ygo-next.card-detail > div {
      display: flex;
      flex-direction: column;
      flex: 0 1 auto;
      width: 100%;
    }

    /* CardDetail.vue の card-detail-view */
    .ygo-next.card-detail div[class*="card-detail-view"] {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    /* CardDetail.vue の card-detail-tabs */
    .ygo-next.card-detail div[class*="card-detail-tabs"] {
      flex-shrink: 0;
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--bg-primary);
      width: 100%;
      height: 40px;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border-bottom: 2px solid var(--tab-border, #008cff);
    }

    /* card-detail-tabs 内のボタン */
    .ygo-next.card-detail div[class*="card-detail-tabs"] button {
      padding: 8px;
      border: none;
      border-right: 1px solid var(--border-primary);
      background: var(--bg-primary);
      cursor: pointer;
      font-size: 12px;
      color: var(--text-primary);
      transition: all 0.2s;
      flex: 1;
      height: 40px;
      white-space: nowrap;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ygo-next.card-detail div[class*="card-detail-tabs"] button:last-child {
      border-right: none;
    }

    .ygo-next.card-detail div[class*="card-detail-tabs"] button.active {
      background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
      color: var(--theme-text-on-gradient, white);
      border-right-color: transparent;
    }

    /* no-card-selected */
    .ygo-next.card-detail .no-card-selected {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--text-secondary);
    }

    .ygo-next.card-detail .no-card-selected p {
      margin: 0;
    }

    /* DeckCard.vue - 全セクション型（CardDetail に表示されるカード） */
    .ygo-next.card-detail [class*="section-"] {
      position: relative;
    }

    /* カードのホバー時に制御ボタンを表示 */
    .ygo-next.card-detail [class*="section-"]:hover .card-controls {
      opacity: 1;
    }

    /* カードの制御ボタン */
    .ygo-next.card-detail [class*="section-"] .card-controls {
      opacity: 0;
      transition: opacity 0.2s;
    }

    /* top-left ボタン（info アイコン） */
    .ygo-next.card-detail [class*="section-"] .card-btn.top-left {
      grid-column: 1;
      grid-row: 1;
      align-items: flex-start;
      justify-content: flex-start;
      padding: 2px 0 0 2px;
    }

    .ygo-next.card-detail [class*="section-"] .card-btn.top-left::before {
      top: 0;
      left: 0;
      width: 66.67%;
      height: 66.67%;
      background: var(--deck-card-btn-top-left-bg);
      border: none;
      transition: all 0.15s;
    }

    .ygo-next.card-detail [class*="section-"] .card-btn.top-left:hover::before {
      background: var(--deck-card-btn-top-left-hover-bg);
      border: 1px solid var(--deck-card-btn-top-left-hover-border);
    }

    .ygo-next.card-detail [class*="section-"] .card-btn.top-left.is-link::before {
      background: var(--deck-card-btn-top-left-link-bg);
    }

    .ygo-next.card-detail [class*="section-"] .card-btn.top-left.is-link:hover::before {
      background: var(--deck-card-btn-top-left-link-hover-bg);
      border: 1px solid var(--deck-card-btn-top-left-link-hover-border);
    }

    .ygo-next.card-detail [class*="section-"] .card-btn.top-left svg {
      width: 10px;
      height: 10px;
      fill: var(--button-text);
    }

    .ygo-next.card-detail [class*="section-"] .card-btn {
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      display: flex;
      color: var(--button-text);
      font-size: 8px;
      font-weight: bold;
      transition: all 0.15s;
      position: relative;
    }

    .ygo-next.card-detail [class*="section-"] .card-btn::before {
      content: '';
      position: absolute;
      transition: background 0.15s;
      pointer-events: none;
    }

    .ygo-next.card-detail [class*="section-"] .card-btn svg {
      display: block;
      position: relative;
      z-index: 1;
    }

    .ygo-next.card-detail [class*="section-"] .card-btn .btn-text {
      position: relative;
      z-index: 1;
    }

    .ygo-next.card-detail [class*="section-"] .card-btn:hover {
      opacity: 1;
      transform: scale(1.02);
    }
  `
  document.head.appendChild(style)
}
