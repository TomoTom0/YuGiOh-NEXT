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
  // テーマ属性を設定（CSS変数の解決のため）
  document.documentElement.setAttribute('data-ygo-next-theme', 'light')

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

  // Card Detail UI を初期化（デッキ情報のパースとカード画像クリックハンドラのセットアップ）
  const { initCardDetailUI } = await import('./card-detail-ui')
  await initCardDetailUI()

  // カード画像のホバー UI をセットアップ
  await setupCardImageHoverUI()

  console.log('[DeckDisplay] Vue app mounted')
}


/**
 * カード画像のホバー UI を設定（info ボタンを表示）
 */
async function setupCardImageHoverUI(): Promise<void> {
  const { useCardDetailStore } = await import('../../stores/card-detail')
  const { getCardDetailWithCache } = await import('../../api/card-search')
  const cardDetailStore = useCardDetailStore()

  // #main > div.image_set > a のセレクタでカードリンクを取得
  const cardLinks = document.querySelectorAll('#main > div.image_set > a')

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

      // Info ボタンのクリックハンドラ
      const infoBtn = overlay.querySelector('.ygo-next-card-info-btn') as HTMLButtonElement
      infoBtn.addEventListener('click', async (e) => {
        console.log('[DeckDisplay] Info button clicked')
        e.preventDefault()
        e.stopPropagation()

        // 画像の位置を基準に判定
        const imgRect = img.getBoundingClientRect()
        const x = (e as MouseEvent).clientX - imgRect.left
        const y = (e as MouseEvent).clientY - imgRect.top

        // 左上1/4の領域かチェック（左半分かつ上半分）
        const isLeftTop = x < imgRect.width / 2 && y < imgRect.height / 2

        console.log('[DeckDisplay] Click position check:', { x, y, imgWidth: imgRect.width, imgHeight: imgRect.height, isLeftTop })

        if (isLeftTop) {
          console.log('[DeckDisplay] Click is in left-top area, fetching card detail')
          e.preventDefault()

          // リンクの href からカード ID を抽出
          const href = link.getAttribute('href') || ''
          const cardIdMatch = href.match(/\/card\/(\d+)/)
          console.log('[DeckDisplay] Card ID extraction:', { href, cardIdMatch })

          if (cardIdMatch) {
            const cardId = parseInt(cardIdMatch[1], 10)
            console.log('[DeckDisplay] Fetching card detail for ID:', cardId)

            try {
              // カード詳細を取得
              const result = await getCardDetailWithCache(cardId.toString())
              console.log('[DeckDisplay] Card detail result:', result)

              // カード詳細を表示
              if (result?.detail?.card) {
                console.log('[DeckDisplay] Setting selected card:', result.detail.card)
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
        } else {
          console.log('[DeckDisplay] Click is NOT in left-top area, ignoring')
        }
      })
    }
  })
}
