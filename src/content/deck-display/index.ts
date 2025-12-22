/**
 * デッキ表示ページの Card Detail UI を Vue で実装
 */

import { CHROME_STORAGE_KEY_APP_SETTINGS } from '@/constants/storage-keys';

/**
 * デッキ表示ページの初期化
 */
export async function initDeckDisplay(): Promise<void> {
  const { applyDeckDisplayLayout, setCardImageSize } = await import('./deckDisplayLayout')
  const { applyCardDetailStyles } = await import('./styles')

  // chrome.storage から設定を読み込み
  const appSettings = await new Promise<Record<string, any>>((resolve) => {
    chrome.storage.local.get([CHROME_STORAGE_KEY_APP_SETTINGS], (result) => {
      resolve((result[CHROME_STORAGE_KEY_APP_SETTINGS] as Record<string, any>) || {})
    })
  })

  const cardImageSize = (appSettings.deckDisplayCardImageSize ?? 'medium') as 'small' | 'medium' | 'large' | 'xlarge'
  const showCardDetail = appSettings.showCardDetailInDeckDisplay ?? false
  const theme = appSettings.theme ?? 'system'

  // テーマを適用（ダークモード対応）
  applyTheme(theme)

  // CSS を適用
  applyDeckDisplayLayout()
  applyCardDetailStyles()

  // #deck_image に .ygo-next クラスを追加（カードアニメーション用）
  const deckImage = document.querySelector('#deck_image')
  if (deckImage) {
    deckImage.classList.add('ygo-next')
  }

  // showCardDetailInDeckDisplay が有効な場合のみ Vue アプリをマウント
  if (showCardDetail) {
    const { setupVueApp } = await import('./vueSetup')
    await setupVueApp()
  }

  // カード画像サイズを設定
  setCardImageSize(cardImageSize)

  // カード画像の読み込み完了時にフェードイン効果を適用
  setupImageLoadedEffect()
}

/**
 * 画像読み込み完了時にloadedクラスを追加（フェードイン効果）
 */
function setupImageLoadedEffect(): void {
  const images = document.querySelectorAll<HTMLImageElement>('#deck_image img[src*="/card/"]')

  images.forEach(img => {
    if (img.complete && img.naturalWidth > 0) {
      // 既に読み込み済み
      img.classList.add('loaded')
    } else {
      // 読み込み完了時に追加
      img.addEventListener('load', () => {
        img.classList.add('loaded')
      }, { once: true })
    }
  })
}

/**
 * テーマをDOMに適用
 */
function applyTheme(theme: string): void {
  let effectiveTheme: 'light' | 'dark' = 'light'

  if (theme === 'system') {
    // システム設定を確認
    if (typeof window !== 'undefined' && window.matchMedia) {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
  } else {
    effectiveTheme = (theme as any) ?? 'light'
  }

  document.documentElement.setAttribute('data-ygo-next-theme', effectiveTheme)
}
