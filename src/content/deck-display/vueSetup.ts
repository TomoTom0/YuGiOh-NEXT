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

  // 新しい div を作成してマウント（背景色を先に設定、幅はCSSで制御）
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


// イベントリスナーへの参照を保持（クリーンアップ用）
let cardImageClickHandler: ((e: MouseEvent) => void) | null = null

/**
 * カード画像のホバー UI をクリーンアップ（イベントリスナー削除）
 */
function cleanupCardImageHoverUI(): void {
  // イベント委譲で追加したイベントリスナーを削除
  const deckImage = safeQuery('#deck_image')
  if (deckImage && cardImageClickHandler) {
    deckImage.removeEventListener('click', cardImageClickHandler as EventListener)
    deckImage.removeAttribute('data-ygo-next-event-delegated')
    cardImageClickHandler = null
  }

  // 各カードのcard-controlsを削除
  const cardLinks = safeQueryAll('#deck_image #main > div.image_set > a, #deck_image #extra > div.image_set > a, #deck_image #side > div.image_set > a')

  cardLinks.forEach(link => {
    if (link.hasAttribute('data-hover-handler-added')) {
      // card-controlsを削除
      safeQueryAndRun<HTMLElement>('.ygo-next-card-controls', (el) => el.remove(), link)

      // 属性を削除（次回セットアップ時に再追加されるようにする）
      link.removeAttribute('data-hover-handler-added')
    }
  })
}

/**
 * カード画像のホバー UI を設定（info ボタンを表示）
 * パフォーマンス最適化版：イベント委譲を使用
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

  // イベント委譲：親要素（#deck_image）に1つのイベントリスナーを追加
  const deckImage = safeQuery('#deck_image')
  if (!deckImage) {
    console.warn('[DeckDisplay] #deck_image not found')
    return
  }

  // 既にイベントリスナーが追加されている場合はスキップ
  if (deckImage.hasAttribute('data-ygo-next-event-delegated')) {
    return
  }
  deckImage.setAttribute('data-ygo-next-event-delegated', 'true')

  // イベント委譲：クリックイベントを親要素で一括処理
  cardImageClickHandler = async (e: MouseEvent) => {
    const target = e.target as HTMLElement

    // クリックされた要素またはその親がボタンかチェック（span.btn-text対応）
    const button = target.closest('.ygo-next-card-btn')
    if (!button) {
      return
    }

    // top-left ボタン（info ボタン）のみ処理
    if (!button.classList.contains('top-left')) {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    // 最も近い <a> 要素を取得
    const link = button.closest('a')
    if (!link) {
      console.warn('[DeckDisplay] No parent link found for button')
      return
    }

    // リンクの href からカード ID を抽出
    const href = link.getAttribute('href') || ''
    const cardIdMatch = href.match(/[?&]cid=(\d+)/)

    if (!cardIdMatch || !cardIdMatch[1]) {
      console.warn('[DeckDisplay] No card ID found in href:', href)
      return
    }

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
  }

  deckImage.addEventListener('click', cardImageClickHandler as EventListener)

  // #deck_image 内の #main, #extra, #side の div.image_set > a のセレクタでカードリンクを取得
  const cardLinks = safeQueryAll('#deck_image #main > div.image_set > a, #deck_image #extra > div.image_set > a, #deck_image #side > div.image_set > a')

  // DocumentFragmentを使用してDOM操作を一括で行う
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
    }
  })
}

// cleanup 関数を export して、Vue アンマウント時に呼び出す
export { cleanupCardImageHoverUI }
