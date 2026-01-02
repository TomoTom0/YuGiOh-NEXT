/**
 * デッキ表示ページのレイアウト管理
 * - #deck_imageの右側にCardDetailエリアを配置
 * - カード画像サイズを変更
 */

/**
 * カード画像サイズを変更
 */
export function setCardImageSize(size: 'normal' | 'small' | 'medium' | 'large' | 'xlarge'): void {
  // 'normal'の場合は公式サイトのデフォルトサイズを使用（CSS変数を削除）
  if (size === 'normal') {
    document.documentElement.style.removeProperty('--deck-display-card-width');
    return;
  }

  const sizeMap: Record<string, string> = {
    small: '36px',
    medium: '60px',
    large: '90px',
    xlarge: '120px'
  }

  document.documentElement.style.setProperty(
    '--deck-display-card-width',
    sizeMap[size] || '60px'
  )
}

/**
 * レイアウトCSSを適用
 */
export function applyDeckDisplayLayout(): void {
  // CSSを注入
  const style = document.createElement('style');
  style.textContent = `
    /* デッキ表示ページのメインレイアウト */
    #main980 {
      display: flex;
      flex-direction: row;
      gap: 20px;
      align-items: stretch;
      min-height: calc(100vh - 100px);
    }

    #main980 article {
      flex: 1;
      margin: 0 !important;
      min-width: min(980px, calc(90vw - 320px));
    }

    #ygo-next-deck-display-app {
      flex: var(--right-area-flex-grow, 0) 0 var(--right-area-flex-basis, 400px);
      min-width: 0;
      display: flex;
    }

    /* デッキセクション内のカード画像サイズ制御 */
    #deck_image img[src*="/card/"] {
      width: var(--deck-display-card-width, 60px);
      height: auto;
      /* 遊戯王カードのアスペクト比（59:86）を事前に確保してレイアウトシフトを防止 */
      aspect-ratio: 59 / 86;
      /* 画像読み込み中の背景色 */
      background: var(--bg-secondary, #f5f5f5);
      /* 画像読み込み前は透明度0、読み込み後にフェードイン */
      opacity: 0;
      transition: opacity 0.2s ease-in, transform 0.1s, filter 0.1s;
    }

    #deck_image img[src*="/card/"].loaded {
      opacity: 1;
    }

    #deck_image img[src*="/card/"]:hover {
      transform: scale(1.05);
      filter: brightness(1.1);
    }

    /* レスポンシブ対応：768px以下で full width */
    @media (max-width: 768px) {
      #main980 {
        flex-direction: column;
        gap: 10px;
      }

      #main980 article {
        width: 100%;
      }

      #ygo-next-deck-display-app {
        flex: 0 0 auto;
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}

