<template>
  <Teleport to="body">
    <div v-if="isVisible" class="ygo-next">
      <!-- オーバーレイ -->
      <div
        class="ygo-next-image-popup-overlay dialog-overlay"
        :class="{ closing: isClosing }"
        @click="closePopup"
      ></div>

      <!-- ポップアップ -->
      <div
        class="ygo-next-image-popup dialog-content"
        :class="{ closing: isClosing }"
        :style="popupStyle"
      >
        <!-- ヘッダー行: デッキ名入力 + 閉じるボタン -->
        <div class="header-row">
          <label class="text-field title-field">
            <span class="field-label">title</span>
            <input
              v-model="deckName"
              type="text"
              class="field-input"
              placeholder="デッキ名を入力"
            />
          </label>
          <button class="close-icon-btn" @click="closePopup">×</button>
        </div>

        <!-- 背景画像 -->
        <div
          class="background-image"
          :style="backgroundImageStyle"
        >
          <!-- Include QRボタン -->
          <button
            class="toggle-btn qr-toggle"
            :class="includeQR ? 'active' : 'inactive'"
            @click="toggleQR"
          >
            <div class="qr-icon-bg">
              <QRIcon />
            </div>
            <span>{{ includeQR ? 'Include' : 'Not-Include' }}</span>
            <span>QR</span>
          </button>

          <!-- Include Sideボタン -->
          <button
            v-if="hasSideDeck"
            class="toggle-btn side-toggle"
            :class="includeSide ? 'active' : 'inactive'"
            @click="toggleSide"
          >
            <span>{{ includeSide ? 'Include' : 'Not-Include' }}</span>
            <span>Side</span>
          </button>
        </div>

        <!-- フッターテキスト入力 -->
        <label class="text-field footer-field">
          <span class="field-label">text</span>
          <input
            v-model="footerText"
            type="text"
            class="field-input"
            :placeholder="defaultFooterText"
          />
        </label>

        <!-- 下部ボタンエリア -->
        <div class="button-area">
          <div class="color-picker" role="radiogroup" aria-label="カラー選択">
            <button
              v-for="c in COLOR_VARIANTS"
              :key="c"
              type="button"
              class="color-swatch"
              :class="{ selected: selectedColor === c }"
              :style="{ background: COLOR_SETTINGS[c].accentLine }"
              role="radio"
              :aria-checked="selectedColor === c"
              :aria-label="c"
              :disabled="isDownloading"
              @click="selectColor(c)"
            ></button>
          </div>

          <button
            class="dialog-btn download-btn btn btn-primary"
            :disabled="isDownloading"
            @click="handleDownload"
          >
            <SpinnerIcon v-if="isDownloading" />
            <template v-else>
              <DownloadIcon />
              Download
            </template>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { DeckInfo } from '@/types/deck'
import { COLOR_SETTINGS, type ColorVariant } from '@/types/deck-recipe-image'
import { createDeckRecipeImage, generateDefaultFooterText } from '../content/deck-recipe/createDeckRecipeImage'
import { downloadDeckRecipeImage } from '../content/deck-recipe/downloadDeckRecipeImage'
import QRIcon from './icons/QRIcon.vue'
import DownloadIcon from './icons/DownloadIcon.vue'
import SpinnerIcon from './icons/SpinnerIcon.vue'

const props = withDefaults(defineProps<{
  cgid: string
  dno: string
  deckData: DeckInfo
  buttonRect?: DOMRect | null
  genesysPoints?: Record<string, number>
}>(), {
  buttonRect: null,
  genesysPoints: undefined
})

const emit = defineEmits<{
  close: []
}>()

const COLOR_VARIANTS: ColorVariant[] = ['red', 'blue', 'green', 'orange']

// 前回の色/QR/Side/text設定を保持する
const STORAGE_KEY_DIALOG_SETTINGS = 'ygoNext:deckImageDialogSettings'

interface PersistedDialogSettings {
  color: ColorVariant
  includeQR: boolean
  includeSide: boolean
  footerText: string
}

function isColorVariant(value: unknown): value is ColorVariant {
  return typeof value === 'string' && (COLOR_VARIANTS as string[]).includes(value)
}

function loadPersistedSettings(): Partial<PersistedDialogSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DIALOG_SETTINGS)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const result: Partial<PersistedDialogSettings> = {}
    if (isColorVariant(parsed.color)) result.color = parsed.color
    if (typeof parsed.includeQR === 'boolean') result.includeQR = parsed.includeQR
    if (typeof parsed.includeSide === 'boolean') result.includeSide = parsed.includeSide
    if (typeof parsed.footerText === 'string') result.footerText = parsed.footerText
    return result
  } catch (error) {
    console.warn('[ImageDialog] Failed to load persisted settings:', error)
    return {}
  }
}

function savePersistedSettings(settings: PersistedDialogSettings) {
  try {
    localStorage.setItem(STORAGE_KEY_DIALOG_SETTINGS, JSON.stringify(settings))
  } catch (error) {
    console.warn('[ImageDialog] Failed to save persisted settings:', error)
  }
}

// 状態管理
const isVisible = ref(false)
const isClosing = ref(false)
const isDownloading = ref(false)
const selectedColor = ref<ColorVariant>('red')
const includeQR = ref(true)
const includeSide = ref(true)
const deckName = ref('')
const backgroundImageUrl = ref('')
const displayWidth = ref(0)
const displayHeight = ref(0)
const defaultFooterText = generateDefaultFooterText()
const footerText = ref('')

// 計算プロパティ
const hasSideDeck = computed(() => props.deckData.sideDeck.length > 0)

const deckDataForPreview = computed<DeckInfo>(() => includeSide.value ? props.deckData : {
  ...props.deckData,
  sideDeck: []
})

// ダイアログの余白（画面サイズによらず一定。他ダイアログ(SettingsDialog等)と揃えた値）
const DIALOG_PADDING = 20
// タイトル欄のラベルが枠線にかかって上にはみ出すため、上だけ余分に確保する
const LABEL_OVERFLOW = 8

// 画面サイズを無視して画像の生の解像度をそのまま表示幅にしないよう、
// 画面幅に対する上限を設けてそれを超える場合は縮小する
const dialogScale = computed(() => {
  const rawWidth = displayWidth.value + DIALOG_PADDING * 2
  const maxDialogWidth = Math.min(window.innerWidth * 0.9, 640)
  return rawWidth > maxDialogWidth ? maxDialogWidth / rawWidth : 1
})

const popupStyle = computed(() => {
  const rect = props.buttonRect || {
    bottom: window.innerHeight / 2 - 200,
    left: window.innerWidth / 2 - 200
  }
  const top = rect.bottom + window.scrollY + 8
  const left = rect.left + window.scrollX
  const width = (displayWidth.value + DIALOG_PADDING * 2) * dialogScale.value
  // 画面の高さを超えて伸び続けないよう上限を設け、超える分はダイアログ内でスクロールする
  const maxHeight = window.innerHeight * 0.85

  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${maxHeight}px`,
    overflowY: 'auto',
    padding: `${DIALOG_PADDING + LABEL_OVERFLOW}px ${DIALOG_PADDING}px ${DIALOG_PADDING}px`
  }
})

const backgroundImageStyle = computed(() => ({
  height: `${displayHeight.value * dialogScale.value}px`,
  background: `url('${backgroundImageUrl.value}') no-repeat center center`,
  backgroundSize: 'contain',
  outlineColor: COLOR_SETTINGS[selectedColor.value].accentLine
}))

// 背景画像生成
async function generateBackgroundImage(
  color: ColorVariant,
  deckData: DeckInfo,
  footerTextValue: string
): Promise<{ dataUrl: string; width: number; height: number }> {
  const deckDataWithoutTitle: DeckInfo = {
    ...deckData,
    name: ''
  }

  const blob = await createDeckRecipeImage({
    cgid: props.cgid,
    dno: props.dno,
    color,
    includeQR: false,
    scale: 1,
    deckData: deckDataWithoutTitle,
    genesysPoints: props.genesysPoints,
    footerText: footerTextValue.trim() || undefined
  })

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob as Blob)
  })

  const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = dataUrl
  })

  return { dataUrl, width, height }
}

// プレビュー再生成（色/サイド有無/フッターテキストの変更を反映）
// 生成は非同期のため連続操作で完了順が入れ替わる可能性がある。
// generation tokenで最新の生成のみを反映し、古い結果の上書きを防ぐ。
let previewGeneration = 0
async function refreshPreview() {
  const generation = ++previewGeneration
  const newImage = await generateBackgroundImage(selectedColor.value, deckDataForPreview.value, footerText.value)
  if (generation !== previewGeneration) return
  backgroundImageUrl.value = newImage.dataUrl
  displayHeight.value = newImage.height
}

// イベントハンドラ
async function selectColor(color: ColorVariant) {
  if (isDownloading.value || selectedColor.value === color) return
  selectedColor.value = color
  await refreshPreview()
}

function toggleQR() {
  includeQR.value = !includeQR.value
}

async function toggleSide() {
  includeSide.value = !includeSide.value
  await refreshPreview()
}

// フッターテキスト入力を少し待ってからプレビューに反映（毎打鍵での再生成を避ける）
let footerDebounceTimer: ReturnType<typeof setTimeout> | undefined
watch(footerText, () => {
  if (footerDebounceTimer) clearTimeout(footerDebounceTimer)
  footerDebounceTimer = setTimeout(() => {
    refreshPreview()
  }, 400)
})

// 色/QR/Side/textの設定を次回開いた時のために保存
watch([selectedColor, includeQR, includeSide, footerText], () => {
  savePersistedSettings({
    color: selectedColor.value,
    includeQR: includeQR.value,
    includeSide: includeSide.value,
    footerText: footerText.value
  })
})

function closePopup() {
  isClosing.value = true
  setTimeout(() => {
    isVisible.value = false
    isClosing.value = false
    emit('close')
  }, 200)
}

async function handleDownload() {
  isDownloading.value = true
  try {
    const scale = 2
    const updatedDeckData: DeckInfo = {
      ...props.deckData,
      name: deckName.value,
      sideDeck: (hasSideDeck.value && includeSide.value) ? props.deckData.sideDeck : []
    }

    await downloadDeckRecipeImage({
      cgid: props.cgid,
      dno: props.dno,
      color: selectedColor.value,
      includeQR: includeQR.value,
      scale,
      deckData: updatedDeckData,
      genesysPoints: props.genesysPoints,
      footerText: footerText.value.trim() || undefined
    })

    closePopup()
  } catch (error) {
    console.error('[YGO Helper] Failed to create image:', error)
  } finally {
    isDownloading.value = false
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePopup()
  }
}

// 初期化
async function initialize() {
  const persisted = loadPersistedSettings()
  if (persisted.color !== undefined) selectedColor.value = persisted.color
  if (persisted.includeQR !== undefined) includeQR.value = persisted.includeQR
  if (persisted.includeSide !== undefined) includeSide.value = persisted.includeSide
  if (persisted.footerText !== undefined) footerText.value = persisted.footerText

  deckName.value = props.deckData.name
  const image = await generateBackgroundImage(selectedColor.value, props.deckData, footerText.value)
  backgroundImageUrl.value = image.dataUrl
  displayWidth.value = image.width
  displayHeight.value = image.height
  isVisible.value = true
}

onMounted(() => {
  initialize()
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  if (footerDebounceTimer) clearTimeout(footerDebounceTimer)
})

// 公開メソッド
defineExpose({
  show: () => {
    isVisible.value = true
  },
  close: closePopup
})
</script>

<style scoped>
.ygo-next-image-popup-overlay {
  /* background/position共通部分は.dialog-overlay(common.scss)から継承 */
  z-index: 10001;
  animation: overlay-in 0.2s ease;
}

.ygo-next-image-popup-overlay.closing {
  animation: overlay-out 0.2s ease forwards;
}

.ygo-next-image-popup {
  /* background/border/border-radius/box-shadowは.dialog-content(common.scss)から継承 */
  /* max-height(90vh)はデッキ画像の高さに合わせて可変にする必要があるため上書き */
  max-height: none;
  position: absolute;
  box-sizing: border-box;
  z-index: 10002;
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: popup-in 0.2s ease;
  overflow: visible;
}

.ygo-next-image-popup.closing {
  animation: popup-out 0.2s ease forwards;
}

/* ヘッダー行（タイトル入力欄と閉じるボタンを同じ行で中央揃え） */
.header-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 枠線にラベルがかかるテキスト入力欄（title / text 共通） */
.text-field {
  position: relative;
  display: block;
  box-sizing: border-box;
  border: 2px solid var(--input-border);
  border-radius: 6px;
  background: var(--input-bg);
  transition: border-color 0.2s;
}

.text-field:focus-within {
  border-color: var(--button-bg);
}

.title-field {
  flex: 1;
  min-width: 0;
}

.field-label {
  position: absolute;
  top: -9px;
  left: 10px;
  padding: 0 4px;
  background: var(--dialog-bg, #fff);
  color: var(--text-secondary, #666);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
  pointer-events: none;
}

.field-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  background: transparent;
  color: var(--input-text);
  font-size: 14px;
  padding: 11px 12px 9px;
}

.title-field .field-input {
  font-weight: 600;
}

.footer-field .field-input {
  font-size: 13px;
}

.background-image {
  position: relative;
  width: 100%;
  outline: 3px solid transparent;
  transition: background 0.5s ease, outline-color 0.3s ease;
}

.toggle-btn {
  box-sizing: border-box;
  padding: 8px 6px;
  border: 2px solid rgba(200, 200, 200, 0.5);
  border-radius: 6px;
  cursor: pointer;
  width: 80px;
  height: 70px;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-align: center;
  line-height: 1.2;
}

.qr-toggle {
  position: absolute;
  right: 12px;
  bottom: 12px;
}

.side-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.qr-icon-bg {
  position: absolute;
  width: 48px;
  height: 48px;
  opacity: 0.15;
}

.toggle-btn.active {
  background: var(--input-bg, rgba(255, 255, 255, 0.9));
  color: var(--input-text, #333);
  border-color: var(--input-border, rgba(200, 200, 200, 0.7));
}

.toggle-btn.inactive {
  background: var(--bg-tertiary, rgba(80, 80, 80, 0.6));
  color: var(--text-tertiary, #aaa);
  border-color: var(--border-primary, rgba(80, 80, 80, 0.8));
}

.toggle-btn.active:hover {
  background: var(--input-bg, rgba(255, 255, 255, 1));
  border-color: var(--button-bg, rgba(150, 150, 150, 0.9));
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.toggle-btn.inactive:hover {
  background: var(--border-primary, rgba(100, 100, 100, 0.7));
}

.side-toggle.active:hover {
  background: var(--input-bg, rgba(255, 255, 255, 1));
  border-color: var(--button-bg, rgba(150, 150, 150, 0.9));
  transform: translateY(calc(-50% - 1px));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 下部ボタンエリア（カラーピッカー + Download） */
.button-area {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-swatch {
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-sizing: border-box;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.color-swatch:hover:not(:disabled) {
  transform: scale(1.12);
}

.color-swatch.selected {
  box-shadow:
    0 0 0 2px var(--dialog-bg, #fff),
    0 0 0 4px var(--text-primary, #333);
}

.color-swatch:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.dialog-btn {
  /* border/border-radius/cursor/transitionは.btn(common.scss)から継承 */
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  gap: 6px;
  min-width: 100px;
  height: 36px;
}

.close-icon-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  background: none;
  color: var(--text-secondary, #555);
  transition: background 0.2s, color 0.2s;
}

.close-icon-btn:hover {
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
}

/* background/color/hover背景は.btn-primary(common.scss)から継承 */
.download-btn:hover:not(:disabled) {
  filter: brightness(0.85);
}

.download-btn:disabled {
  background: var(--bg-tertiary);
}

.dialog-btn:active {
  transform: scale(0.98);
}

.toggle-btn:active {
  transform: scale(0.98);
}

@keyframes popup-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes popup-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}

@keyframes overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes overlay-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
