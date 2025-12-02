/**
 * Vue アプリのセットアップと Card Detail 連携
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import DeckDisplayApp from './DeckDisplayApp.vue'

/**
 * Vue アプリケーションをセットアップして、#main980 に Card Detail をマウント
 */
export async function setupVueApp(): Promise<void> {
  const main980 = document.querySelector('#main980')
  if (!main980) {
    console.warn('[DeckDisplay] #main980 not found')
    return
  }

  // 既に Card Detail が追加されていれば返す
  if (main980.querySelector('#ygo-next-card-detail-container')) {
    return
  }

  // 新しい div を作成してマウント
  const appContainer = document.createElement('div')
  appContainer.id = 'ygo-next-deck-display-app'
  main980.appendChild(appContainer)

  // Vue アプリを作成
  const pinia = createPinia()
  const app = createApp(DeckDisplayApp)
  app.use(pinia)

  // コンポーネントをマウント
  app.mount(appContainer)

  // Settings store を初期化（共通設定のみ）
  const { useSettingsStore } = await import('../../stores/settings')
  const settingsStore = useSettingsStore(pinia)
  await settingsStore.loadCommonSettings()
  document.documentElement.setAttribute('data-ygo-next-theme', settingsStore.effectiveTheme)

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
 * カード画像のホバー UI を設定（info ボタンを表示）
 */
async function setupCardImageHoverUI(): Promise<void> {
  let cardDetailStore
  let getCardDetailWithCache

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

  // #main と #side の div.image_set > a のセレクタでカードリンクを取得
  const cardLinks = document.querySelectorAll('#main > div.image_set > a, #side > div.image_set > a')

  cardLinks.forEach(link => {
    if (!link.hasAttribute('data-hover-handler-added')) {
      link.setAttribute('data-hover-handler-added', 'true')

      // ホバーオーバーレイを作成
      const overlay = document.createElement('div')
      overlay.className = 'ygo-next ygo-next-card-hover-overlay'
      overlay.innerHTML = `
        <button class="ygo-next-card-info-btn" title="カード情報を表示">
          <span>i</span>
        </button>
      `

      const htmlLink = link as HTMLElement
      htmlLink.style.position = 'relative'
      htmlLink.appendChild(overlay)

      // 画像要素を取得
      const img = link.querySelector('img')
      if (!img) return

      // マウスムーブイベント（位置判定）
      link.addEventListener('mousemove', (e) => {
        const imgRect = img.getBoundingClientRect()
        const x = (e as MouseEvent).clientX - imgRect.left
        const y = (e as MouseEvent).clientY - imgRect.top

        // 左上四分の一をチェック（左半分かつ上半分）
        const isLeftTop = x < imgRect.width / 2 && y < imgRect.height / 2

        htmlLink.classList.add('ygo-next-hover-overlay-active')
        if (isLeftTop) {
          htmlLink.classList.add('ygo-next-cursor-in-area')
        } else {
          htmlLink.classList.remove('ygo-next-cursor-in-area')
        }
      })

      // マウスリーブイベント
      link.addEventListener('mouseleave', () => {
        htmlLink.classList.remove('ygo-next-hover-overlay-active', 'ygo-next-cursor-in-area')
      })

      // リンク要素全体のクリックハンドラ（左上1/4での処理）
      link.addEventListener('click', async (e) => {
        const imgRect = img.getBoundingClientRect()
        const x = (e as MouseEvent).clientX - imgRect.left
        const y = (e as MouseEvent).clientY - imgRect.top

        // 左上1/4の領域かチェック（左半分かつ上半分）
        const isLeftTop = x < imgRect.width / 2 && y < imgRect.height / 2

        if (isLeftTop) {
          e.preventDefault()
          e.stopPropagation()

          // リンクの href からカード ID を抽出（cid パラメータから）
          const href = link.getAttribute('href') || ''
          const cardIdMatch = href.match(/[?&]cid=(\d+)/)

          if (cardIdMatch) {
            const cardId = parseInt(cardIdMatch[1], 10)

            try {
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
            }
          } else {
            console.warn('[DeckDisplay] No card ID found in href')
          }
        }
      }, true)
    }
  })
}
