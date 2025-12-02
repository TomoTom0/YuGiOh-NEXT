/**
 * デッキ表示ページの Card Detail UI を Vue で実装
 */

/**
 * デッキ表示ページの初期化
 */
export async function initDeckDisplay(): Promise<void> {
  const { applyDeckDisplayLayout, setCardImageSize } = await import('./deckDisplayLayout')
  const { applyCardDetailStyles } = await import('./styles')

  // chrome.storage から設定を読み込み
  const appSettings = await new Promise<Record<string, any>>((resolve) => {
    chrome.storage.local.get(['appSettings'], (result) => {
      resolve((result.appSettings as Record<string, any>) || {})
    })
  })

  const cardImageSize = (appSettings.deckDisplayCardImageSize ?? 'medium') as 'small' | 'medium' | 'large' | 'xlarge'
  const showCardDetail = appSettings.showCardDetailInDeckDisplay ?? false

  // CSS を適用
  applyDeckDisplayLayout()
  applyCardDetailStyles()

  // showCardDetailInDeckDisplay が有効な場合のみ Vue アプリをマウント
  if (showCardDetail) {
    const { setupVueApp } = await import('./vueSetup')
    await setupVueApp()
  }

  // カード画像サイズを設定
  setCardImageSize(cardImageSize)
}

