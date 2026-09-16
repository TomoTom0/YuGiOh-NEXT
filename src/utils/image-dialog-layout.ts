/**
 * デッキ画像作成ダイアログ（ImageDialog.vue）の位置・サイズ計算（TASK-511）
 *
 * 設計書v2（tmp/20260916_design_task511_image-dialog-layout.md）に基づく純関数モジュール。
 * DOMに依存しないためユニットテストで全分岐を数値検証できる。
 *
 * 要件の背景:
 * - 旧実装は外枠幅にscaleを掛ける方式（border-box）で、paddingがscaleで縮まないため
 *   コンテンツボックス幅と画像表示幅が 2*DIALOG_PADDING*(1-scale) だけズレ、
 *   background-size:contain の画像が二重に縮小されていた → コンテンツ幅基準へ変更
 * - 旧クランプ式（min(vw*0.9, 640)）は小viewportで上限がMARGINを下回り画面内収束が
 *   保证できなかった → maxDialogWidth=min(vw-2*MARGIN, 640) と maxHeight の正規化で解消
 * - position:absolute（ドキュメント座標）とfixedオーバーレイの座標系不一致を解消する
 *   ため、呼び出し元は getBoundingClientRect()（viewport座標）をそのまま渡す
 */

/** 画面端に保証する最小余白（px） */
export const VIEWPORT_MARGIN = 16
/** 起動ボタンとダイアログの間隔（px）。旧実装の +8 と同値 */
export const BUTTON_GAP = 8
/** ダイアログ外枠の最大幅（px） */
export const MAX_DIALOG_WIDTH = 640
/** ダイアログのpadding（px）。ImageDialog.vue から移動し単一管理する */
export const DIALOG_PADDING = 20
/** maxHeight の vh比率上限（旧実装の innerHeight*0.85 と同値） */
export const MAX_HEIGHT_RATIO = 0.85
/**
 * クランプ保証が成立する最小viewport幅（px）= 2*VIEWPORT_MARGIN + 2*DIALOG_PADDING = 72。
 * これ未満の入力は正規化される（保証の前提: 正規化後 vw >= 72）
 */
export const MIN_VIEWPORT_WIDTH = VIEWPORT_MARGIN * 2 + DIALOG_PADDING * 2
/**
 * クランプ保証が成立する最小viewport高さ（px）= 2*VIEWPORT_MARGIN = 32。
 * これ未満の入力は正規化される（保証の前提: 正規化後 vh >= 32）
 */
export const MIN_VIEWPORT_HEIGHT = VIEWPORT_MARGIN * 2

/**
 * アンカー（起動ボタン）のviewport座標。
 * DOMRectと構造的互換（top/bottom/left/right を持つ）のため as キャスト不要で
 * getBoundingClientRect() の戻り値をそのまま渡せる。
 */
export interface DialogAnchorRect {
  top: number
  bottom: number
  left: number
  right: number
}

/** computeImageDialogLayout の計算結果 */
export interface ImageDialogLayout {
  /** 画像の縮小率（0〜1）。paddingは縮小対象外の実px */
  scale: number
  /** コンテンツ幅（.background-image の実幅 = 画像表示幅） */
  contentWidth: number
  /** border-box の外枠幅（contentWidth + 両側padding） */
  width: number
  /** maxHeight（vh比率とvh-2*MARGIN の小さい方） */
  maxHeight: number
  /** 配置top（viewport座標・px） */
  top: number
  /** 配置left（viewport座標・px） */
  left: number
  /** 選択された配置方式 */
  placement: 'center' | 'below' | 'above' | 'clamped'
}

/**
 * buttonRect の全フィールドが有限数かを判定する型ガード。
 * 非有限（NaN/Infinity）のフィールドが1つでもあれば false。
 *
 * 設計書§5: 契約違反のbuttonRectはnull扱いとし中央配置へフォールバックする。
 * フォールバックの実施はImageDialog.vueの呼び出し側ではなく
 * computeImageDialogLayout 冒頭（単一責務・テスト容易）。
 */
export function isFiniteDialogAnchorRect(
  rect: DialogAnchorRect | null | undefined
): rect is DialogAnchorRect {
  if (rect === null || rect === undefined) return false
  return (
    Number.isFinite(rect.top) &&
    Number.isFinite(rect.bottom) &&
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.right)
  )
}

/**
 * ダイアログのサイズ・配置を計算する純関数（設計書§1/§2）。
 *
 * サイズ（コンテンツ幅基準。scaleはコンテンツ幅に掛かり、外枠はpaddingを加算）:
 * - maxDialogWidth = min(vw - 2*VIEWPORT_MARGIN, MAX_DIALOG_WIDTH)
 * - scale = max(0, min(1, (maxDialogWidth - 2*DIALOG_PADDING) / contentWidth))
 * - width = contentWidth * scale + 2*DIALOG_PADDING
 * - maxHeight = min(vh * MAX_HEIGHT_RATIO, vh - 2*VIEWPORT_MARGIN)
 *
 * 高さを考慮した追加縮小は行わない（カード画像の可読性優先。はみ出しは
 * maxHeight + ダイアログ内縦スクロールで担保）。
 *
 * 位置（クランプ保証: left+width <= vw-MARGIN かつ top+maxHeight <= vh-MARGIN。
 * 保証の前提は viewport が有限正数かつ正規化後 vw >= 72・vh >= 32）:
 * - buttonRect無し: 実ダイアログ幅・maxHeight基準の画面中央（'center'）
 * - buttonRect有り: ボタン直下に置けるなら'below'、無理ならボタン直上へ
 *   フリップ（'above'）、どちらも無理なら下端クランプ（'clamped'）。
 *   leftは常にclampX(rect.left)で右端のボタンは自動的に右寄せになる
 *
 * 防御的正規化: vw < 72・vh < 32 の入力は保証が数学的に成立しないため、
 * 冒頭で MIN_VIEWPORT_WIDTH / MIN_VIEWPORT_HEIGHT へ切り上げる
 * （codex実装レビュー必須修正対応）。
 *
 * @throws 例外は投げない（契約外入力の戻り値は未規定。contentWidth=0は
 * 契約内で scale=1 打ち切り・外枠はpaddingのみの幅になる）
 */
export function computeImageDialogLayout(input: {
  viewport: { width: number; height: number }
  contentWidth: number
  buttonRect: DialogAnchorRect | null
}): ImageDialogLayout {
  const viewport = {
    width: Math.max(input.viewport.width, MIN_VIEWPORT_WIDTH),
    height: Math.max(input.viewport.height, MIN_VIEWPORT_HEIGHT)
  }
  const buttonRect = isFiniteDialogAnchorRect(input.buttonRect) ? input.buttonRect : null

  // --- サイズ計算（設計書§1） ---
  const maxDialogWidth = Math.min(
    viewport.width - VIEWPORT_MARGIN * 2,
    MAX_DIALOG_WIDTH
  )
  // contentWidth=0 の場合は (上限-40)/0 = Infinity → min(1,...)=1 で打ち切られる
  const scale = Math.max(
    0,
    Math.min(1, (maxDialogWidth - DIALOG_PADDING * 2) / input.contentWidth)
  )
  const contentWidth = input.contentWidth * scale
  const width = contentWidth + DIALOG_PADDING * 2
  // 小viewportでは 0.85vh が vh-2*MARGIN を超えるため正規化（クランプ上限 >= MARGIN の保証）
  const maxHeight = Math.min(
    viewport.height * MAX_HEIGHT_RATIO,
    viewport.height - VIEWPORT_MARGIN * 2
  )

  // --- 位置計算（設計書§2） ---
  const clampX = (x: number): number =>
    Math.max(VIEWPORT_MARGIN, Math.min(x, viewport.width - width - VIEWPORT_MARGIN))
  const clampY = (y: number): number =>
    Math.max(VIEWPORT_MARGIN, Math.min(y, viewport.height - maxHeight - VIEWPORT_MARGIN))

  let top: number
  let left: number
  let placement: ImageDialogLayout['placement']

  if (buttonRect === null) {
    placement = 'center'
    top = clampY((viewport.height - maxHeight) / 2)
    left = clampX((viewport.width - width) / 2)
  } else {
    left = clampX(buttonRect.left)
    const belowTop = buttonRect.bottom + BUTTON_GAP
    if (belowTop + maxHeight <= viewport.height - VIEWPORT_MARGIN) {
      placement = 'below'
      top = clampY(belowTop)
    } else if (buttonRect.top - BUTTON_GAP - maxHeight >= VIEWPORT_MARGIN) {
      // ボタン直上へフリップ（フリップ条件自体が top >= MARGIN を保証する）
      placement = 'above'
      top = buttonRect.top - BUTTON_GAP - maxHeight
    } else {
      // 上下どちらにもmaxHeight分確保できない: ボタンと重なる可能性は許容して下端クランプ
      placement = 'clamped'
      top = clampY(belowTop)
    }
  }

  return { scale, contentWidth, width, maxHeight, top, left, placement }
}
