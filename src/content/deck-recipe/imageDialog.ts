/**
 * デッキ画像作成ダイアログ
 */

import { createApp, type App } from 'vue'
import ImageDialog from '@/components/ImageDialog.vue'
import { parseDeckDetail } from '../parser/deck-detail-parser'
import type { DeckInfo } from '@/types/deck'
import { EXTENSION_IDS } from '../../utils/dom-selectors'

let dialogApp: App | null = null

/**
 * ポップアップメニューを表示（汎用版）
 * @param cgid ユーザーID
 * @param dno デッキ番号
 * @param deckData デッキデータ
 * @param buttonRect ボタンの位置（nullの場合は画面中央に表示）
 */
export async function showImageDialogWithData(
  cgid: string,
  dno: string,
  deckData: DeckInfo,
  buttonRect: DOMRect | null = null
): Promise<void> {
  // 既存のダイアログがあれば削除
  if (dialogApp) {
    dialogApp.unmount()
    dialogApp = null
  }

  // マウント用のdiv要素を作成
  const mountPoint = document.createElement('div')
  mountPoint.id = 'ygo-next-image-dialog-mount'
  document.body.appendChild(mountPoint)

  // Vueアプリを作成してマウント
  dialogApp = createApp(ImageDialog, {
    cgid,
    dno,
    deckData,
    buttonRect,
    onClose: () => {
      if (dialogApp) {
        dialogApp.unmount()
        dialogApp = null
      }
      mountPoint.remove()
    }
  })

  dialogApp.mount(mountPoint)
}

/**
 * ポップアップメニューを表示（デッキ表示画面用）
 */
export async function showImageDialog(): Promise<void> {
  // ボタンの位置を取得
  const button = document.getElementById(EXTENSION_IDS.deckImage.deckImageButton)
  if (!button) {
    console.error('[YGO Helper] Button not found')
    return
  }

  const buttonRect = button.getBoundingClientRect()

  // URLからデッキ番号とユーザーIDを取得
  const url = window.location.href
  const dnoMatch = url.match(/dno=(\d+)/)
  const cgidMatch = url.match(/cgid=([a-f0-9]+)/)
  if (!dnoMatch || !dnoMatch[1]) {
    console.error('[YGO Helper] Failed to get deck number from URL')
    return
  }
  if (!cgidMatch || !cgidMatch[1]) {
    console.error('[YGO Helper] Failed to get user ID from URL')
    return
  }
  const dno = dnoMatch[1]
  const cgid = cgidMatch[1]

  // 現在のページのDOMからデッキデータを取得
  let deckData: DeckInfo
  try {
    deckData = await parseDeckDetail(document)
  } catch (error) {
    console.error('[YGO Helper] Failed to parse deck data from current page:', error)
    return
  }

  // 汎用版を呼び出し
  await showImageDialogWithData(cgid, dno, deckData, buttonRect)
}
