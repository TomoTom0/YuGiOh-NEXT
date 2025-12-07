<template>
  <Teleport to="body">
    <div v-if="isVisible">
      <!-- オーバーレイ -->
      <div
        class="ygo-next-image-popup-overlay"
        :class="{ closing: isClosing }"
        @click="closePopup"
      ></div>

      <!-- ポップアップ -->
      <div
        class="ygo-next-image-popup"
        :class="{ closing: isClosing }"
        :style="popupStyle"
        @click="toggleColor"
      >
        <!-- デッキ名入力欄 -->
        <input
          v-model="deckName"
          type="text"
          class="deck-name-input"
          :style="{ width: `${displayWidth - 16}px` }"
          placeholder="デッキ名を入力"
          @click.stop
        />

        <!-- 背景画像 -->
        <div
          class="background-image"
          :style="backgroundImageStyle"
        >
          <!-- Include QRボタン -->
          <button
            class="toggle-btn qr-toggle"
            :class="includeQR ? 'active' : 'inactive'"
            @click.stop="toggleQR"
          >
            <div class="qr-icon-bg">
              <QRIcon />
            </div>
            <span>Include</span>
            <span>QR</span>
          </button>

          <!-- Include Sideボタン -->
          <button
            v-if="hasSideDeck"
            class="toggle-btn side-toggle"
            :class="includeSide ? 'active' : 'inactive'"
            @click.stop="toggleSide"
          >
            <span>Include</span>
            <span>Side</span>
          </button>
        </div>

        <!-- 下部ボタンエリア -->
        <div class="button-area" @click.stop>
          <button class="dialog-btn close-btn" @click="closePopup">
            Close
          </button>
          <button
            class="dialog-btn download-btn"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { DeckInfo } from '@/types/deck'
import type { ColorVariant } from '@/types/deck-recipe-image'
import { createDeckRecipeImage } from '../content/deck-recipe/createDeckRecipeImage'
import { downloadDeckRecipeImage } from '../content/deck-recipe/downloadDeckRecipeImage'
import QRIcon from './icons/QRIcon.vue'
import DownloadIcon from './icons/DownloadIcon.vue'
import SpinnerIcon from './icons/SpinnerIcon.vue'

const props = withDefaults(defineProps<{
  cgid: string
  dno: string
  deckData: DeckInfo
  buttonRect?: DOMRect | null
}>(), {
  buttonRect: null
})

const emit = defineEmits<{
  close: []
}>()

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

// 計算プロパティ
const hasSideDeck = computed(() => props.deckData.sideDeck.length > 0)

const popupStyle = computed(() => {
  const rect = props.buttonRect || {
    bottom: window.innerHeight / 2 - 200,
    left: window.innerWidth / 2 - 200
  }
  const top = rect.bottom + window.scrollY + 8
  const left = rect.left + window.scrollX
  const padding = 12
  const topMargin = 40
  const bottomButtonHeight = 50

  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${displayWidth.value + padding * 2}px`,
    padding: `${topMargin}px ${padding}px ${bottomButtonHeight}px ${padding}px`
  }
})

const backgroundImageStyle = computed(() => ({
  height: `${displayHeight.value}px`,
  background: `url('${backgroundImageUrl.value}') no-repeat center center`,
  backgroundSize: 'contain'
}))

// 背景画像生成
async function generateBackgroundImage(
  color: ColorVariant,
  deckData: DeckInfo
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
    scale: 0.25,
    deckData: deckDataWithoutTitle
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

// イベントハンドラ
async function toggleColor() {
  selectedColor.value = selectedColor.value === 'red' ? 'blue' : 'red'
  const deckDataForPreview = includeSide.value ? props.deckData : {
    ...props.deckData,
    sideDeck: []
  }
  const newImage = await generateBackgroundImage(selectedColor.value, deckDataForPreview)
  backgroundImageUrl.value = newImage.dataUrl
}

function toggleQR() {
  includeQR.value = !includeQR.value
}

async function toggleSide() {
  includeSide.value = !includeSide.value
  const deckDataForPreview = includeSide.value ? props.deckData : {
    ...props.deckData,
    sideDeck: []
  }
  const newImage = await generateBackgroundImage(selectedColor.value, deckDataForPreview)
  backgroundImageUrl.value = newImage.dataUrl
  displayHeight.value = newImage.height
}

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
      deckData: updatedDeckData
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
  deckName.value = props.deckData.name
  const image = await generateBackgroundImage(selectedColor.value, props.deckData)
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10001;
  animation: overlay-in 0.2s ease;
}

.ygo-next-image-popup-overlay.closing {
  animation: overlay-out 0.2s ease forwards;
}

.ygo-next-image-popup {
  position: absolute;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 10002;
  animation: popup-in 0.2s ease;
  cursor: pointer;
  overflow: visible;
}

.ygo-next-image-popup.closing {
  animation: popup-out 0.2s ease forwards;
}

.deck-name-input {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  border: 2px solid rgba(200, 200, 200, 0.5);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  margin-bottom: 8px;
}

.deck-name-input:hover {
  border-color: rgba(150, 150, 150, 0.7);
}

.deck-name-input:focus {
  border-color: rgba(100, 100, 100, 0.8);
}

.background-image {
  position: relative;
  width: 100%;
  transition: background 0.5s ease;
  margin-top: 8px;
}

.toggle-btn {
  padding: 8px 12px;
  border: 2px solid rgba(200, 200, 200, 0.5);
  border-radius: 6px;
  cursor: pointer;
  width: 80px;
  height: 70px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
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
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  border-color: rgba(200, 200, 200, 0.7);
}

.toggle-btn.inactive {
  background: rgba(80, 80, 80, 0.6);
  color: #aaa;
  border-color: rgba(80, 80, 80, 0.8);
}

.toggle-btn.active:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(150, 150, 150, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.toggle-btn.inactive:hover {
  background: rgba(100, 100, 100, 0.7);
}

.side-toggle.active:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(150, 150, 150, 0.9);
  transform: translateY(calc(-50% - 1px));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.button-area {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: #ffffff;
  border-radius: 0 0 8px 8px;
}

.dialog-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 100px;
  height: 36px;
  transition: all 0.2s;
}

.close-btn {
  background: #e0e0e0;
  color: #555;
}

.close-btn:hover {
  background: #d0d0d0;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.download-btn {
  background: #4078ff;
  color: #ffffff;
}

.download-btn:hover:not(:disabled) {
  background: #2060e0;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.download-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #6090c0;
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
