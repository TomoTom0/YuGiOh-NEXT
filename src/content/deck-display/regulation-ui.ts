/**
 * デッキ閲覧モードでのリミットレギュレーション表示
 * - デッキ名タグ（[OCG-YYMM] / [GENESYS-YYMM]）からの適用版バッジ（タイトル横）
 * - 手動での一時切り替え（デッキ名タグに依らず、閲覧時のみ別バージョンをプレビュー可能。保存されない）
 * - カード個別のOCG過去版禁止制限バッジ / GENESYSポイントバッジ
 * - メインデッキ見出しのGENESYS合計ポイント
 *
 * 編集画面の useDeckRegulation composable（src/composables/deck/useDeckRegulation.ts）と
 * 異なり、閲覧のみのため fallback修正ダイアログ・ignore永続化等の編集系状態は持たない。
 */

import { forbiddenLimitedCache } from '@/utils/forbidden-limited-cache'
import { genesysPointCache } from '@/utils/genesys-cache'
import { isGenesysForbiddenCard, genesysPtTier, getOcgLimitOverride, getGenesysPoint } from '@/utils/regulation-card-badge'
import {
  resolveDeckRegulation,
  buildRegulationTagOptions,
  groupRegulationTagOptionsByYearPair,
  yymmToOcgDate,
  yymmToGenesysListParam,
  type RegulationTagOption,
  type RegulationTagYearGroup
} from '@/utils/regulation-resolver'
import { parseRegulationTag } from '@/utils/regulation-tag-parser'
import { extractDeckNameFromMeta } from '../parser/deck-detail-parser'
import { getTempCacheDB } from '@/utils/temp-cache-db'
import { escapeHtml } from '@/utils/safe-html-renderer'
import { safeQuery, safeQueryAll } from '@/utils/safe-dom-query'
import { OFFICIAL_SITE_SELECTORS } from '@/utils/dom-selectors'
import { DEFAULT_FEATURE_SETTINGS } from '@/types/settings'
import type { ResolvedRegulation } from '@/types/regulation'
import type { LimitRegulation } from '@/types/card'
import { mdiCloseCircle, mdiNumeric1Circle, mdiNumeric2Circle } from '@mdi/js'

const NONE_RESOLVED: ResolvedRegulation = {
  mode: 'none',
  tag: null,
  effectiveDate: null,
  listParam: null,
  fallback: undefined
}

const LIMIT_ICON_PATH: Record<LimitRegulation, string> = {
  forbidden: mdiCloseCircle,
  limited: mdiNumeric1Circle,
  'semi-limited': mdiNumeric2Circle
}

function svgIcon(pathD: string): string {
  return `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="${pathD}"/></svg>`
}

/** 適用版のYYMM（タグ由来 / 手動選択由来のどちらでも解決できるよう、resolved自体から導出する） */
export function effectiveYymm(resolved: ResolvedRegulation): string | null {
  if (resolved.fallback) return resolved.fallback.appliedYymm
  if (resolved.tag?.yymm) return resolved.tag.yymm
  if (resolved.mode === 'ocg' && resolved.effectiveDate) {
    return resolved.effectiveDate.slice(2, 4) + resolved.effectiveDate.slice(5, 7)
  }
  if (resolved.mode === 'genesys' && resolved.listParam) {
    return resolved.listParam.slice(2)
  }
  return null
}

/**
 * 種別ラベル（OCG/GENESYS）。resolveDeckRegulationの仕様上、mode='none'（デッキ名にタグが
 * 無い）は「OCG最新版（現状通り）」を意味するため、表示上もOCGとして扱う（GENESYSではない）。
 */
function typeLabel(resolved: ResolvedRegulation): string {
  return resolved.mode === 'genesys' ? 'GENESYS' : 'OCG'
}

/** 適用版の説明文（DeckEditTopBar.vueのregulationMessage/useDeckRegulationのeffectiveDescriptionと同じロジック） */
export function buildTooltip(resolved: ResolvedRegulation, isManual: boolean): string {
  const label = typeLabel(resolved)
  const prefix = isManual ? '(手動選択・未保存) ' : ''
  if (resolved.fallback) {
    return `${prefix}指定 ${label}-${resolved.fallback.requestedYymm} は存在しないため、直近版 ${label}-${resolved.fallback.appliedYymm} を適用中`
  }
  const yymm = effectiveYymm(resolved)
  if (yymm) return `${prefix}適用中: ${label} 20${yymm.slice(0, 2)}年${yymm.slice(2, 4)}月版`
  return `${prefix}適用中: ${label} 最新版`
}

/** トリガーボタンに表示する短いラベル */
export function triggerLabel(resolved: ResolvedRegulation): string {
  const label = typeLabel(resolved)
  const yymm = effectiveYymm(resolved)
  return yymm ? `${label} 20${yymm.slice(0, 2)}年${yymm.slice(2, 4)}月版` : `${label} 最新版`
}

/** トリガーボタンに表示する短いバッジ文字（編集画面のDeckEditTopBar.vue .regulation-badgeと同じ表記） */
export function triggerBadgeText(resolved: ResolvedRegulation): string {
  return typeLabel(resolved)
}

/**
 * メインデッキ見出しにGENESYS合計ポイントを表示（totalPt<=0なら非表示）。
 * レギュレーション切替バッジ（.ygo-next-regulation-bar）の直後（＝右）に配置する。
 * 要素は<span>ではなく<div>にする: サイト側CSS ".subcatergory .top span:not(.icon)"
 * （カード枚数バッジ用の紺背景+枠線）がDOM上の親子関係でspan要素に波及するため（TASK-450）。
 */
function renderGenesysTotalBadge(totalPt: number): void {
  const topRow = safeQuery<HTMLElement>('#main .subcatergory .top')
  if (!topRow) return

  const existing = topRow.querySelector('.ygo-next-genesys-total-pt')
  if (existing) existing.remove()
  if (totalPt <= 0) return

  const overLimitClass = totalPt > 100 ? ' over-limit' : ''
  const html = `<div class="ygo-next ygo-next-genesys-total-pt${overLimitClass}">${totalPt}pt</div>`
  const bar = topRow.querySelector('.ygo-next-regulation-bar')
  if (bar) {
    bar.insertAdjacentHTML('afterend', html)
  } else {
    topRow.insertAdjacentHTML('beforeend', html)
  }
}

/**
 * サイトネイティブの「制限カード〇〇が△枚超過しています」等の違反バナー(#message)は、
 * 常に「現在のOCG最新版」に基づいて計算されており、GENESYSモードやOCG過去版を表示中は
 * 実態と異なる（無関係な）内容になり紛らわしいため非表示にする。
 * mode='none'（タグ無し）またはOCG最新版（fallback無し・effectiveDate=null）表示中のみ、
 * バナーの内容が実態と一致するため表示する。
 */
function isCurrentOcgDisplay(resolved: ResolvedRegulation): boolean {
  return resolved.mode === 'none' || (resolved.mode === 'ocg' && resolved.effectiveDate === null)
}

/**
 * サイトネイティブの違反バナー(#message)は、常に「現在のOCG最新版」基準の内容のため、
 * それ以外の表示中は文言を書き換えず（ユーザー指摘: 無効なことを文言で示すのはおかしい）、
 * 元の内容はそのまま残しつつスタイル（減光+グレースケール）のみで「無効」を示す。
 * 内容自体は変更しないため、レイアウト（高さ）は変化しない。
 */
function toggleViolationBanner(resolved: ResolvedRegulation): void {
  const message = safeQuery<HTMLElement>('#message')
  if (!message) return
  message.classList.toggle('ygo-next-message-inactive', !isCurrentOcgDisplay(resolved))
}

/**
 * サイトネイティブのカード個別「禁止/制限/準制限」表示（カード画像を囲む3px枠線 + 下部の
 * アイコンバッジ、span.forbidden/limited/semi_limited > div）も、#messageバナーと同じ理由
 * （常に「現在のOCG最新版」基準で、それ以外の表示中は無関係な内容になる）で切り替える。
 * クラス名(.forbidden等)ではなくJS判定でinline style上書き（!important不要、後から
 * classList操作等で復元されても次回の状態更新で再度上書きされる）。
 */
function toggleNativeCardLimitOverlays(resolved: ResolvedRegulation): void {
  const isCurrentOcg = isCurrentOcgDisplay(resolved)
  const overlays = safeQueryAll<HTMLElement>(
    `${OFFICIAL_SITE_SELECTORS.deckRecipe.deckImage} .image_set span.forbidden > div, ` +
    `${OFFICIAL_SITE_SELECTORS.deckRecipe.deckImage} .image_set span.limited > div, ` +
    `${OFFICIAL_SITE_SELECTORS.deckRecipe.deckImage} .image_set span.semi_limited > div`
  )
  overlays.forEach(div => {
    div.style.display = isCurrentOcg ? '' : 'none'
  })
}

/** カード個別バッジを全て除去（切り替え時の再描画用） */
function clearCardBadges(): void {
  safeQueryAll(`${OFFICIAL_SITE_SELECTORS.deckRecipe.deckImage} .ygo-next-regulation-card-badge`)
    .forEach(el => el.remove())
}

/**
 * カード個別バッジを描画。GENESYSモードのみ合計ポイントを返す（メイン見出し表示用）。
 * 呼び出し前に clearCardBadges() 済みであること。
 */
function renderCardBadges(resolved: ResolvedRegulation): number {
  if (resolved.mode === 'none') return 0

  const cardLinks = safeQueryAll<HTMLAnchorElement>(
    `${OFFICIAL_SITE_SELECTORS.deckRecipe.deckImage} #main > div.image_set > a, ` +
    `${OFFICIAL_SITE_SELECTORS.deckRecipe.deckImage} #extra > div.image_set > a, ` +
    `${OFFICIAL_SITE_SELECTORS.deckRecipe.deckImage} #side > div.image_set > a`
  )

  const tempCardDB = resolved.mode === 'genesys' ? getTempCacheDB() : null
  let genesysTotalPt = 0

  cardLinks.forEach(link => {
    const href = link.getAttribute('href') || ''
    const cidMatch = href.match(/[?&]cid=(\d+)/)
    if (!cidMatch || !cidMatch[1]) return
    const cid = cidMatch[1]

    let badgeHtml = ''

    if (resolved.mode === 'genesys') {
      const cardInfo = tempCardDB?.get(cid)

      if (isGenesysForbiddenCard(cardInfo)) {
        badgeHtml = `<div class="ygo-next ygo-next-regulation-card-badge ygo-next-limit-forbidden">${svgIcon(mdiCloseCircle)}</div>`
      } else {
        const pt = getGenesysPoint(cid, resolved)
        if (pt !== undefined && pt > 0) {
          genesysTotalPt += pt
          badgeHtml = `<div class="ygo-next ygo-next-regulation-card-badge ygo-next-pt-tier-${genesysPtTier(pt)}">${pt}pt</div>`
        }
      }
    } else {
      const override = getOcgLimitOverride(cid, resolved)
      if (override) {
        badgeHtml = `<div class="ygo-next ygo-next-regulation-card-badge ygo-next-limit-${override}">${svgIcon(LIMIT_ICON_PATH[override])}</div>`
      }
    }

    if (badgeHtml) {
      link.style.position = 'relative'
      link.insertAdjacentHTML('beforeend', badgeHtml)
    }
  })

  return genesysTotalPt
}

/** value文字列 → ResolvedRegulation（'auto'はスペシャルケースとしてそのまま返す） */
export function parseSelectorValue(value: string): ResolvedRegulation | 'auto' {
  if (value === 'auto') return 'auto'
  if (value === 'none') return { ...NONE_RESOLVED }
  const [mode, param] = value.split(':')
  if (mode === 'ocg') {
    return { mode: 'ocg', tag: null, effectiveDate: param === 'latest' ? null : (param ?? null), listParam: null, fallback: undefined }
  }
  return { mode: 'genesys', tag: null, effectiveDate: null, listParam: param === 'latest' ? null : (param ?? null), fallback: undefined }
}

/**
 * メニュー項目のHTML。1項目1文字列のシンプルなリスト項目（デッキ名への挿入を伴わないため、
 * 編集画面のタグ候補リストのような「挿入されるコード + その説明」の2カラムにする意味が無い）。
 */
function menuItemHtml(value: string, label: string, isSelected: boolean, extraClass = ''): string {
  const selectedClass = isSelected ? ' is-selected' : ''
  return `<button type="button" class="ygo-next ygo-next-regulation-menu-item${selectedClass}${extraClass}" data-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`
}

/**
 * 閲覧時の一時的なレギュレーション手動切り替えUI（デッキ名は変更しない。保存もされない）。
 * トリガーボタン + ドロップダウンパネルの自作コンポーネント
 * （ネイティブ<select>はサイト側デザインと視覚的に統一できないため使用しない）。
 */
function renderRegulationControl(opts: {
  ocgDates: string[]
  genesysListParams: string[]
  isGenesysEnabled: boolean
  onChange: (value: string, resolved: ResolvedRegulation | 'auto') => void
}): { update: (resolved: ResolvedRegulation, isManual: boolean, currentValue: string) => void } | null {
  // メインデッキ見出し（シャッフルボタンと同じ行）の<h3>直後に配置する。
  // シャッフルボタンはaddShuffleButtons()が非同期(setTimeout)で挿入するため、挿入順に関わらず
  // 常にh3の直後（＝シャッフルボタンより左）になるよう、h3を基準に挿入する。
  const topRow = safeQuery<HTMLElement>('#main .subcatergory .top')
  const h3 = topRow?.querySelector('h3')
  if (!topRow || !h3) return null

  const existing = topRow.querySelector('.ygo-next-regulation-bar')
  if (existing) existing.remove()

  // 注意: topRow/h3はサイトネイティブのDOM要素のため .ygo-next クラスは付与しない。
  // common.scssの `.ygo-next * { margin-left/right: 0 }` リセットが波及し、
  // サイト側のレイアウトを破壊するため（TASK-450で判明）。
  // トリガーは編集画面のDeckEditTopBar.vue .regulation-badgeと同じ見た目のバッジにする
  // （OCG/GENESYSの状態表示は既にこの見た目で確立されているため、新規デザインを作らない）。
  //
  // 挿入先はh3の「兄弟」ではなく「内部（テキストの直後）」にする: .top は flex-wrap:wrap で
  // h3 は flex:1（実測673px）と横幅を大きく取るのに対し文字は数文字分しか使っておらず、
  // シャッフル/ソートボタン等は残りの狭い領域に押し込まれて折り返す。h3の内部（十分な余白がある
  // 場所）にバッジを追加すれば、シャッフル/ソートボタン側の折り返しを増やさずに済む（TASK-450）。
  h3.insertAdjacentHTML(
    'beforeend',
    `<div class="ygo-next ygo-next-regulation-bar">
      <button type="button" class="ygo-next ygo-next-regulation-trigger" aria-expanded="false"></button>
      <div class="ygo-next ygo-next-regulation-menu" hidden></div>
    </div>`
  )

  const bar = topRow.querySelector<HTMLElement>('.ygo-next-regulation-bar')!
  const trigger = bar.querySelector<HTMLButtonElement>('.ygo-next-regulation-trigger')!
  const menu = bar.querySelector<HTMLElement>('.ygo-next-regulation-menu')!

  let menuValue = 'auto'

  const closeMenu = () => {
    menu.hidden = true
    trigger.classList.remove('is-open')
    trigger.setAttribute('aria-expanded', 'false')
  }
  const openMenu = () => {
    menu.hidden = false
    trigger.classList.add('is-open')
    trigger.setAttribute('aria-expanded', 'true')
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation()
    if (menu.hidden) openMenu()
    else closeMenu()
  })
  menu.addEventListener('click', (e) => e.stopPropagation())
  document.addEventListener('click', () => closeMenu())

  menu.addEventListener('click', (e) => {
    const expandBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ygo-next-regulation-menu-expand')
    if (expandBtn) {
      const rest = menu.querySelector<HTMLElement>(`[data-rest-id="${expandBtn.dataset.expand}"]`)
      if (rest) {
        rest.hidden = !rest.hidden
        expandBtn.textContent = rest.hidden ? expandBtn.dataset.collapsedLabel! : expandBtn.dataset.expandedLabel!
      }
      return
    }
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ygo-next-regulation-menu-item')
    if (!btn) return
    const value = btn.dataset.value ?? 'auto'
    closeMenu()
    opts.onChange(value, parseSelectorValue(value))
  })

  // オプション → data-value文字列（parseSelectorValueが読む形式）。yymm=null（最新版）は
  // '{type}:latest'、それ以外はocg/genesysのeffectiveDate/listParam形式に変換する
  const optionValue = (opt: RegulationTagOption): string => {
    if (opt.yymm === null) return `${opt.type}:latest`
    return opt.type === 'ocg' ? `ocg:${yymmToOcgDate(opt.yymm)}` : `genesys:${yymmToGenesysListParam(opt.yymm)}`
  }

  // 年グループ（2年単位）をエキスパンダー+折りたたみリストとして描画する（過去版セクションの内側、
  // 2段階のうち2段目）。typePrefixはdata-expand/data-rest-idの一意性確保用（表示ラベルには含めない:
  // 既に「OCG過去版」セクション内であることが自明なため）
  const buildYearGroupsHtml = (typePrefix: string, groups: RegulationTagYearGroup[], currentValue: string): string => {
    let html = ''
    groups.forEach(group => {
      const restId = `${typePrefix}-${group.rangeLabel}`
      const collapsedLabel = `${group.rangeLabel}（${group.options.length}）`
      const expandedLabel = `${group.rangeLabel} ▲`
      html += `<button type="button" class="ygo-next ygo-next-regulation-menu-expand ygo-next-regulation-menu-expand-nested" data-expand="${escapeHtml(restId)}" data-collapsed-label="${escapeHtml(collapsedLabel)}" data-expanded-label="${escapeHtml(expandedLabel)}">${escapeHtml(collapsedLabel)}</button>`
      html += `<div class="ygo-next ygo-next-regulation-menu-rest" data-rest-id="${escapeHtml(restId)}" hidden>`
      group.options.forEach(opt => { html += menuItemHtml(optionValue(opt), opt.label, currentValue === optionValue(opt), ' ygo-next-regulation-menu-item-grouped') })
      html += '</div>'
    })
    return html
  }

  // 過去版セクション（「OCG過去版」等）: 代表以外の過去版全体を1つのエキスパンダーの下にまとめる
  // （2段階のうち1段目）。展開すると年グループ一覧（2段目）が現れる。年グループを直接フラットに
  // 並べるとOCG/GENESYSの区分が埋もれるため、区分を保ったまま年単位→個別の2段階にする（TASK-450）
  const buildPastSectionHtml = (typeLabel: 'OCG' | 'GENESYS', pastRest: RegulationTagOption[], currentValue: string): string => {
    if (pastRest.length === 0) return ''
    const sectionId = `${typeLabel}-past`
    const collapsedLabel = `${typeLabel} PAST（${pastRest.length}）`
    const expandedLabel = `${typeLabel} PAST ▲`
    let html = `<button type="button" class="ygo-next ygo-next-regulation-menu-expand" data-expand="${escapeHtml(sectionId)}" data-collapsed-label="${escapeHtml(collapsedLabel)}" data-expanded-label="${escapeHtml(expandedLabel)}">${escapeHtml(collapsedLabel)}</button>`
    html += `<div class="ygo-next ygo-next-regulation-menu-rest" data-rest-id="${escapeHtml(sectionId)}" hidden>`
    html += buildYearGroupsHtml(typeLabel, groupRegulationTagOptionsByYearPair(pastRest), currentValue)
    html += '</div>'
    return html
  }

  const buildMenuHtml = (currentValue: string): string => {
    const options = buildRegulationTagOptions(
      { ocgDates: opts.ocgDates, genesysListParams: opts.genesysListParams },
      opts.isGenesysEnabled
    )
    const ocgLatest = options.find(o => o.type === 'ocg' && o.yymm === null)
    const genesysLatest = options.find(o => o.type === 'genesys' && o.yymm === null)
    const ocgPast = options.filter(o => o.type === 'ocg' && o.yymm !== null)
    const genesysPast = options.filter(o => o.type === 'genesys' && o.yymm !== null)

    let html = menuItemHtml('auto', 'AUTO', currentValue === 'auto')

    // 代表2件（直近）をOCG/GENESYSそれぞれ先頭にまとめる
    // （OCG全件を先に並べるとGENESYSが埋もれるため。TASK-450指摘）。
    if (ocgLatest) html += menuItemHtml(optionValue(ocgLatest), ocgLatest.label, currentValue === optionValue(ocgLatest))
    ocgPast.slice(0, 2).forEach(opt => { html += menuItemHtml(optionValue(opt), opt.label, currentValue === optionValue(opt)) })
    if (genesysLatest) html += menuItemHtml(optionValue(genesysLatest), genesysLatest.label, currentValue === optionValue(genesysLatest))
    genesysPast.slice(0, 2).forEach(opt => { html += menuItemHtml(optionValue(opt), opt.label, currentValue === optionValue(opt)) })

    // 代表以外の過去版は「過去版セクション→年グループ→個別」の2段階（+区分自体の折りたたみ）で表示する
    html += buildPastSectionHtml('OCG', ocgPast.slice(2), currentValue)
    html += buildPastSectionHtml('GENESYS', genesysPast.slice(2), currentValue)

    return html
  }

  return {
    update: (resolved, isManual, currentValue) => {
      menuValue = currentValue
      trigger.textContent = triggerBadgeText(resolved)
      trigger.title = `リミットレギュレーション表示: ${buildTooltip(resolved, isManual)}（クリックして一時的に切り替え。デッキ名は変更されません）`
      // mode='none'（タグ無し）もOCG最新版として扱う（typeLabel参照）ため、ニュートラル状態は
      // 設けず常に適用中の配色にする。fallback時のみ警告色にする
      trigger.classList.toggle('is-fallback', !!resolved.fallback)
      menu.innerHTML = buildMenuHtml(menuValue)
    }
  }
}

/**
 * デッキ閲覧ページにリミットレギュレーション表示をセットアップする。
 * デッキ名タグからの自動適用に加え、閲覧時のみ有効な手動切り替えセレクタを常設する
 * （手動選択はデッキ名を変更せず、ページを離れると破棄される一時的なプレビュー）。
 *
 * @param ensureParsedDeckInfo GENESYSモード判定（link/pendulumモンスター除外）に必要な
 *   カード詳細情報をTempCacheDBへ確保する関数（card-detail-ui.tsのキャッシュ付き実装を注入）
 */
export async function setupRegulationDisplay(
  ensureParsedDeckInfo: () => Promise<unknown>
): Promise<void> {
  try {
    // category 1（UIなし）機能フラグ: 保存値ではなくビルド既定値を正とする
    // （useSettingsStore.loadCommonSettings()と同じ理由。src/stores/settings.ts参照）
    const isGenesysEnabled = DEFAULT_FEATURE_SETTINGS.genesys

    await forbiddenLimitedCache.init()
    if (isGenesysEnabled) {
      await genesysPointCache.init()
    }
    await forbiddenLimitedCache.checkAndUpdate()
    if (isGenesysEnabled) {
      await genesysPointCache.checkAndUpdate()
    }

    const available = {
      ocgDates: forbiddenLimitedCache.getAvailableDates(),
      genesysListParams: isGenesysEnabled ? genesysPointCache.getAvailableListParams() : []
    }

    const deckName = extractDeckNameFromMeta(document)
    const tag = parseRegulationTag(deckName)
    let autoResolved: ResolvedRegulation = tag
      ? resolveDeckRegulation(deckName, available)
      : { ...NONE_RESOLVED }
    if (autoResolved.mode === 'genesys' && !isGenesysEnabled) {
      autoResolved = { ...NONE_RESOLVED }
    }

    const applyResolved = async (resolved: ResolvedRegulation, value: string, isManual: boolean): Promise<void> => {
      if (resolved.mode === 'ocg' && resolved.effectiveDate) {
        await forbiddenLimitedCache.ensureList(resolved.effectiveDate)
      } else if (resolved.mode === 'genesys' && resolved.listParam) {
        await genesysPointCache.ensureList(resolved.listParam)
      } else if (resolved.mode === 'genesys') {
        await genesysPointCache.ensureCurrentList()
      }

      if (resolved.mode === 'genesys') {
        // link/pendulumモンスター除外判定にカード種別情報が必要なため、デッキ全体をパースする
        await ensureParsedDeckInfo()
      }

      clearCardBadges()
      const genesysTotalPt = renderCardBadges(resolved)
      renderGenesysTotalBadge(resolved.mode === 'genesys' ? genesysTotalPt : 0)
      toggleViolationBanner(resolved)
      toggleNativeCardLimitOverlays(resolved)
      control?.update(resolved, isManual, value)
    }

    const control = renderRegulationControl({
      ocgDates: available.ocgDates,
      genesysListParams: available.genesysListParams,
      isGenesysEnabled,
      onChange: (value, parsed) => {
        const resolved = parsed === 'auto' ? autoResolved : parsed
        void applyResolved(resolved, value, value !== 'auto').catch(error => {
          console.error('[DeckDisplay] Failed to apply manually selected regulation:', error)
        })
      }
    })

    await applyResolved(autoResolved, 'auto', false)
  } catch (error) {
    console.error('[DeckDisplay] Failed to setup regulation display:', error)
  }
}
