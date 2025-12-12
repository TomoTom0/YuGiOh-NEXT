/**
 * Vue アプリのセットアップと Card Detail 連携
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import DeckDisplayApp from './DeckDisplayApp.vue'
import type { CardDetailCacheResult } from '../../api/card-search'
import { safeQuery, safeQueryAll, safeQueryAndRun } from '../../utils/safe-dom-query'

/**
 * Vue アプリケーションをセットアップして、#main980 に Card Detail をマウント
 */
export async function setupVueApp(): Promise<void> {
  const main980 = safeQuery('#main980')
  if (!main980) {
    return
  }

  // 既に Card Detail が追加されていれば返す
  if (safeQuery('#ygo-next-card-detail-container', main980)) {
    return
  }

  // Vue アプリを作成（マウント前）
  const pinia = createPinia()
  const app = createApp(DeckDisplayApp)
  app.use(pinia)

  // Settings store を初期化（Vueマウント前に設定を読み込む）
  const { useSettingsStore } = await import('../../stores/settings')
  const settingsStore = useSettingsStore(pinia)
  await settingsStore.loadCommonSettings()
  document.documentElement.setAttribute('data-ygo-next-theme', settingsStore.effectiveTheme)

  // テーマに応じた背景色を設定
  const bgColor = settingsStore.effectiveTheme === 'dark' ? '#1a1a1a' : '#ffffff'

  // 新しい div を作成してマウント（背景色を先に設定）
  const appContainer = document.createElement('div')
  appContainer.id = 'ygo-next-deck-display-app'
  appContainer.style.backgroundColor = bgColor
  main980.appendChild(appContainer)

  // コンポーネントをマウント
  app.mount(appContainer)

  // Card Detail UI を初期化（デッキ情報のパースとカード画像クリックハンドラのセットアップ）
  const { initCardDetailUI } = await import('./card-detail-ui')
  await initCardDetailUI()

  // カード画像のホバー UI をセットアップ
  await setupCardImageHoverUI()

  // シャッフル・ソートボタンを初期化
  const { initShuffle } = await import('../shuffle')
  initShuffle()
}


/**
 * カード画像のホバー UI をクリーンアップ（イベントリスナー削除）
 */
function cleanupCardImageHoverUI(): void {
  const cardLinks = safeQueryAll('#deck_image #main > div.image_set > a, #deck_image #extra > div.image_set > a, #deck_image #side > div.image_set > a')

  cardLinks.forEach(link => {
    if (link.hasAttribute('data-hover-handler-added')) {
      // card-controlsを削除
      safeQueryAndRun<HTMLElement>('.ygo-next-card-controls', (el) => el.remove(), link)

      // 属性を削除（次回セットアップ時に再追加されるようにする）
      link.removeAttribute('data-hover-handler-added')

      console.debug('[DeckDisplay] Cleaned up hover UI for card link')
    }
  })
}

/**
 * カード画像のホバー UI を設定（info ボタンを表示）
 */
async function setupCardImageHoverUI(): Promise<void> {
  let cardDetailStore
  let getCardDetailWithCache: ((cid: string) => Promise<CardDetailCacheResult>) | undefined

  try {
    const { useCardDetailStore } = await import('../../stores/card-detail')
    const cardSearchModule = await import('../../api/card-search')
    getCardDetailWithCache = cardSearchModule.getCardDetailWithCache
    cardDetailStore = useCardDetailStore()

    if (!cardDetailStore) {
      console.warn('[DeckDisplay] Card detail store is not initialized')
      return
    }
  } catch (error) {
    console.warn('[DeckDisplay] Failed to initialize hover UI setup:', error)
    return
  }

  // #deck_image 内の #main, #extra, #side の div.image_set > a のセレクタでカードリンクを取得
  const cardLinks = safeQueryAll('#deck_image #main > div.image_set > a, #deck_image #extra > div.image_set > a, #deck_image #side > div.image_set > a')

  cardLinks.forEach(link => {
    if (!link.hasAttribute('data-hover-handler-added')) {
      link.setAttribute('data-hover-handler-added', 'true')

      // DeckCard.vueと同じ構造のcard-controlsを作成
      const controls = document.createElement('div')
      controls.className = 'ygo-next ygo-next-card-controls'
      controls.innerHTML = `
        <button class="ygo-next ygo-next-card-btn top-left" title="カード情報を表示">
          <span class="btn-text">ⓘ</span>
        </button>
        <button class="ygo-next ygo-next-card-btn top-right"></button>
        <button class="ygo-next ygo-next-card-btn bottom-left"></button>
        <button class="ygo-next ygo-next-card-btn bottom-right"></button>
      `

      const htmlLink = link as HTMLElement
      htmlLink.style.position = 'relative'
      htmlLink.appendChild(controls)

      // 画像要素を取得
      const img = safeQuery<HTMLImageElement>('img', link)
      if (!img) return

      // top-leftボタン（infoボタン）のクリックハンドラ
      const topLeftBtn = safeQuery<HTMLButtonElement>('.top-left', controls)
      if (topLeftBtn) {
        topLeftBtn.addEventListener('click', async (e: MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()

          // リンクの href からカード ID を抽出（cid パラメータから）
          const href = link.getAttribute('href') || ''
          const cardIdMatch = href.match(/[?&]cid=(\d+)/)

          if (cardIdMatch && cardIdMatch[1]) {
            const cardId = parseInt(cardIdMatch[1], 10)

            try {
              // ローディング開始
              cardDetailStore.startLoadingCard()

              // カード詳細を取得
              const result = await getCardDetailWithCache(cardId.toString())

              // カード詳細を表示
              if (result?.detail?.card) {
                cardDetailStore.setSelectedCard(result.detail.card as any)
              } else {
                console.warn('[DeckDisplay] No card data in result')
              }
            } catch (error) {
              console.warn('[DeckDisplay] Failed to fetch card detail:', error)
            } finally {
              // ローディング終了
              cardDetailStore.endLoadingCard()
            }
          } else {
            console.warn('[DeckDisplay] No card ID found in href')
          }
        })
      }
    }
  })
}

// cleanup 関数を export して、Vue アンマウント時に呼び出す
export { cleanupCardImageHoverUI }
