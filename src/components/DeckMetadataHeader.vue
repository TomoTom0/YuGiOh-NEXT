<template>
  <div class="metadata-row row-main">
    <div class="button-group">
      <button
        class="action-button public-button"
        :class="{ 'is-public': isPublic }"
        @click="$emit('toggle-public')"
      >
        <span class="text-bold">{{ isPublic ? '公開' : '非公開' }}</span>
      </button>
      <div class="deck-type-selector" ref="deckTypeSelector">
        <button
          class="deck-type-button"
          @click="toggleDeckTypeDropdown"
        >
          <div v-if="deckType === '-1'" class="deck-type-placeholder">type</div>
          <svg v-else-if="deckType === '0'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#0053c3" width="148" height="108" rx="11.25"></rect>
            <polygon fill="#00204b" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
            <path fill="#ffffff" d="M40.94,65.78l-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Zm-3.34-33,24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67ZM67,85h33V47H81V38h19V24H67ZM81,61h5V71H81Zm23-37V85h33V24Zm19,47h-5V38h5Z"></path>
          </svg>
          <svg v-else-if="deckType === '1'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#6ec300" width="148" height="108" rx="11.25"></rect>
            <polygon fill="#2a4a00" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
            <path fill="#ffffff" d="M67,38H86V48H67V85h33V71H81V62h19V24H67Zm37-14V85h33V24Zm19,47h-5V38h5ZM37.6,32.74l24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67Zm3.34,33-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Z"></path>
          </svg>
          <svg v-else-if="deckType === '2'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#00b9da" width="148" height="108" rx="11.25"></rect>
            <path fill="#004c59" d="M101.37,66.88l-6.05-6V20h-23V33.3L58.74,20H7.85V89.85H58.74l14.14-14,13.72,14h39.81l13.24-15v-8Zm-50.92-6-5.76,6H30.82V42.93H44.69l5.76,5.75Z"></path>
            <path fill="#ffffff" d="M97.37,70.88l-6.05-6V24h-15v47.3L90.6,85.85h31.81l13.24-15ZM11.85,24V85.85H54.74L69.42,71.26V38.35L54.74,24Zm42.6,40.88-5.76,6H26.82V38.93H48.69l5.76,5.75Z"></path>
          </svg>
          <svg v-else-if="deckType === '3'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#5c00da" width="148" height="108" rx="11.25"></rect>
            <path fill="#2b0067" d="M120.12,16.12H63.72L43.56,45.4,23.39,16.12h-8v88.81h8L37,85H71.72L71.63,38h38.88v21h-8.46v-18H80.21V85h39.91c4.79,0,12.53-5.16,12.53-12.53V28.65C132.65,21.28,124.54,16.12,120.12,16.12Z"></path>
            <path fill="#ffffff" d="M19.39,20.12v80.81L33,81V66.15L43.56,80.27l5.74-7.71L67.72,45.82V20.12L43.56,55.21ZM54.09,81H67.72V58L54.09,77.78Zm62-60.86H70.86l7,13.92h36.63v29H98.05v-18H84.21V81h31.91c4.79,0,12.53-5.16,12.53-12.53V32.65C128.65,25.28,120.54,20.12,116.12,20.12Z"></path>
          </svg>
        </button>
        <Transition name="dropdown">
          <div
            v-if="showDeckTypeDropdown"
            ref="deckTypeDropdown"
            class="deck-type-dropdown"
            :class="{ 'align-right': deckTypeDropdownAlignRight }"
          >
            <div class="deck-type-option" @click="selectDeckType('-1')">
              <div class="deck-type-unset">未設定</div>
            </div>
            <div class="deck-type-option" @click="selectDeckType('0')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#0053c3" width="148" height="108" rx="11.25"></rect>
                <polygon fill="#00204b" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
                <path fill="#ffffff" d="M40.94,65.78l-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Zm-3.34-33,24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67ZM67,85h33V47H81V38h19V24H67ZM81,61h5V71H81Zm23-37V85h33V24Zm19,47h-5V38h5Z"></path>
              </svg>
              OCG（マスタールール）
            </div>
            <div class="deck-type-option" @click="selectDeckType('1')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#6ec300" width="148" height="108" rx="11.25"></rect>
                <polygon fill="#2a4a00" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
                <path fill="#ffffff" d="M67,38H86V48H67V85h33V71H81V62h19V24H67Zm37-14V85h33V24Zm19,47h-5V38h5ZM37.6,32.74l24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67Zm3.34,33-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Z"></path>
              </svg>
              OCG（スピードルール）
            </div>
            <div class="deck-type-option" @click="selectDeckType('2')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#00b9da" width="148" height="108" rx="11.25"></rect>
                <path fill="#004c59" d="M101.37,66.88l-6.05-6V20h-23V33.3L58.74,20H7.85V89.85H58.74l14.14-14,13.72,14h39.81l13.24-15v-8Zm-50.92-6-5.76,6H30.82V42.93H44.69l5.76,5.75Z"></path>
                <path fill="#ffffff" d="M97.37,70.88l-6.05-6V24h-15v47.3L90.6,85.85h31.81l13.24-15ZM11.85,24V85.85H54.74L69.42,71.26V38.35L54.74,24Zm42.6,40.88-5.76,6H26.82V38.93H48.69l5.76,5.75Z"></path>
              </svg>
              デュエルリンクス
            </div>
            <div class="deck-type-option" @click="selectDeckType('3')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#5c00da" width="148" height="108" rx="11.25"></rect>
                <path fill="#2b0067" d="M120.12,16.12H63.72L43.56,45.4,23.39,16.12h-8v88.81h8L37,85H71.72L71.63,38h38.88v21h-8.46v-18H80.21V85h39.91c4.79,0,12.53-5.16,12.53-12.53V28.65C132.65,21.28,124.54,16.12,120.12,16.12Z"></path>
                <path fill="#ffffff" d="M19.39,20.12v80.81L33,81V66.15L43.56,80.27l5.74-7.71L67.72,45.82V20.12L43.56,55.21ZM54.09,81H67.72V58L54.09,77.78Zm62-60.86H70.86l7,13.92h36.63v29H98.05v-18H84.21V81h31.91c4.79,0,12.53-5.16,12.53-12.53V32.65C128.65,25.28,120.54,20.12,116.12,20.12Z"></path>
              </svg>
              マスターデュエル
            </div>
          </div>
        </Transition>
      </div>

      <div class="deck-style-selector" ref="deckStyleSelector">
        <button
          class="deck-style-button"
          @click="toggleDeckStyleDropdown"
        >
          <span :class="{ 'text-bold': deckStyle !== '-1' }">{{ deckStyleLabel }}</span>
        </button>
        <Transition name="dropdown">
          <div
            v-if="showDeckStyleDropdown"
            ref="deckStyleDropdown"
            class="deck-style-dropdown"
            :class="{ 'align-right': deckStyleDropdownAlignRight }"
          >
            <div class="deck-style-option" @click="selectDeckStyle('0')">Character</div>
            <div class="deck-style-option" @click="selectDeckStyle('1')">Tournament</div>
            <div class="deck-style-option" @click="selectDeckStyle('2')">Concept</div>
          </div>
        </Transition>
      </div>
      <button
        class="action-button tag-button"
        @click="$emit('show-tag-dialog')"
      >Tag</button>
      <button
        class="action-button category-button"
        @click="$emit('show-category-dialog')"
      >Cat</button>

      <!-- メニューボタン -->
      <div class="metadata-menu-container" ref="metadataMenuContainer">
        <button
          class="action-button metadata-menu-button"
          @click="toggleMetadataMenu"
          title="デッキ情報メニュー"
        >⋮</button>
        <Transition name="dropdown">
          <div
            v-if="showMetadataMenu"
            ref="metadataMenuDropdown"
            class="metadata-menu-dropdown"
            :class="{ 'align-right': metadataMenuAlignRight }"
          >
            <!-- お気に入り行 -->
            <div class="menu-row">
              <svg class="menu-icon" viewBox="0 0 24 24" title="お気に入り数">
                <path :d="mdiStar" />
              </svg>
              <div class="menu-value-badge">{{ favoriteCount }}</div>
            </div>

            <!-- デッキコード行 -->
            <div class="menu-row deck-code-row">
              <svg class="menu-icon" viewBox="0 0 24 24" title="デッキコード">
                <path :d="mdiXml" />
              </svg>
              <div class="deck-code-action">
                <input
                  v-if="deckCode"
                  type="text"
                  :value="deckCode"
                  readonly
                  class="deck-code-display"
                  @click="copyDeckCode"
                  title="クリックでコピー"
                />
                <button
                  v-else
                  @click="issueDeckCode"
                  class="deck-code-btn"
                  :disabled="issueLoading"
                >
                  {{ issueLoading ? '発行中' : '発行' }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { mdiStar, mdiXml } from '@mdi/js'
import { useDeckEditStore } from '../stores/deck-edit'
import { handleError, handleSuccess } from '../utils/error-handler'

const props = defineProps<{
  isPublic: boolean
  deckType: '-1' | '0' | '1' | '2' | '3'
  deckStyle: '-1' | '0' | '1' | '2'
}>()

const emit = defineEmits<{
  (e: 'toggle-public'): void
  (e: 'select-deck-type', value: string): void
  (e: 'select-deck-style', value: string): void
  (e: 'show-tag-dialog'): void
  (e: 'show-category-dialog'): void
}>()

const deckStore = useDeckEditStore()

// DOM参照
const deckTypeSelector = ref<HTMLElement | null>(null)
const deckTypeDropdown = ref<HTMLElement | null>(null)
const deckStyleSelector = ref<HTMLElement | null>(null)
const deckStyleDropdown = ref<HTMLElement | null>(null)
const metadataMenuContainer = ref<HTMLElement | null>(null)
const metadataMenuDropdown = ref<HTMLElement | null>(null)

// ドロップダウン表示状態（内部管理）
const showDeckTypeDropdown = ref(false)
const showDeckStyleDropdown = ref(false)
const deckTypeDropdownAlignRight = ref(false)
const deckStyleDropdownAlignRight = ref(false)
const showMetadataMenu = ref(false)
const metadataMenuAlignRight = ref(false)

// メニュー内の情報
const favoriteCount = ref(0)
const deckCode = ref('')
const issueLoading = ref(false)

const deckStyleLabel = computed(() => {
  if (props.deckStyle === '-1') return 'Style'
  if (props.deckStyle === '0') return 'Chara'
  if (props.deckStyle === '1') return 'Tourn'
  if (props.deckStyle === '2') return 'Concep'
  return 'Style'
})

// ライフサイクル
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 外クリックでドロップダウンを閉じる
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.deck-type-selector')) {
    showDeckTypeDropdown.value = false
  }
  if (!target.closest('.deck-style-selector')) {
    showDeckStyleDropdown.value = false
  }
  if (!target.closest('.metadata-menu-container')) {
    showMetadataMenu.value = false
  }
}

// ドロップダウン位置調整
async function adjustAlignRight(
  selector: HTMLElement | null,
  dropdown: HTMLElement | null,
  alignRightRef: { value: boolean }
) {
  if (!selector || !dropdown) return

  await nextTick()
  setTimeout(() => {
    const rect = selector.getBoundingClientRect()
    const dropdownRect = dropdown.getBoundingClientRect()
    const viewportWidth = window.innerWidth

    if (rect.left + dropdownRect.width > viewportWidth) {
      alignRightRef.value = true
    } else {
      alignRightRef.value = false
    }
  }, 10)
}

function toggleDeckTypeDropdown() {
  showDeckTypeDropdown.value = !showDeckTypeDropdown.value
  if (showDeckTypeDropdown.value) {
    adjustAlignRight(
      deckTypeSelector.value,
      deckTypeDropdown.value,
      deckTypeDropdownAlignRight
    )
  }
}

function toggleDeckStyleDropdown() {
  showDeckStyleDropdown.value = !showDeckStyleDropdown.value
  if (showDeckStyleDropdown.value) {
    adjustAlignRight(
      deckStyleSelector.value,
      deckStyleDropdown.value,
      deckStyleDropdownAlignRight
    )
  }
}

function selectDeckType(value: string) {
  emit('select-deck-type', value)
  showDeckTypeDropdown.value = false
}

function selectDeckStyle(value: string) {
  emit('select-deck-style', value)
  showDeckStyleDropdown.value = false
}

// メタデータメニュー操作
async function toggleMetadataMenu() {
  showMetadataMenu.value = !showMetadataMenu.value
  if (showMetadataMenu.value) {
    // store から値を取得
    favoriteCount.value = deckStore.deckInfo.favoriteCount ?? 0
    deckCode.value = deckStore.deckInfo.issuedDeckCode ?? ''

    adjustAlignRight(
      metadataMenuContainer.value,
      metadataMenuDropdown.value,
      metadataMenuAlignRight
    )
  }
}

// デッキコードを発行
async function issueDeckCode() {
  issueLoading.value = true
  try {
    const code = await deckStore.issueDeckCode(deckStore.deckInfo.dno)
    if (code) {
      deckCode.value = code
      // store にも保存
      deckStore.deckInfo.issuedDeckCode = code
      handleSuccess('[DeckMetadataHeader]', `デッキコードを発行しました: ${code}`)
    } else {
      handleError(
        '[DeckMetadataHeader]',
        'デッキコードの発行に失敗しました',
        new Error('Empty response'),
        { showToast: true }
      )
    }
  } catch (error) {
    handleError(
      '[DeckMetadataHeader]',
      'デッキコードの発行に失敗しました',
      error,
      { showToast: true }
    )
  } finally {
    issueLoading.value = false
  }
}

// デッキコードをコピー
async function copyDeckCode() {
  if (!deckCode.value) return

  try {
    await navigator.clipboard.writeText(deckCode.value)
    handleSuccess('[DeckMetadataHeader]', 'デッキコードをコピーしました')
  } catch (error) {
    handleError(
      '[DeckMetadataHeader]',
      'コピーに失敗しました',
      error,
      { showToast: true }
    )
  }
}

// dno変更時にデッキコード情報をリセット
watch(() => deckStore.deckInfo.dno, () => {
  deckCode.value = ''
})
</script>

<style scoped lang="scss">
.metadata-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.row-main {
  height: 24px;
  align-items: center;
}

.button-group {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 4px;
}

.button-group > *,
.button-group > .deck-type-selector,
.button-group > .deck-style-selector {
  flex: 1;
  display: flex;
  justify-content: center;
}

.deck-type-selector,
.deck-style-selector {
  position: relative;
}

.deck-type-button,
.deck-style-button,
.action-button {
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: calc(var(--right-area-font-size, 14px) * 0.79);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: var(--text-tertiary);
    background: var(--bg-secondary);
  }

  &:active {
    background: var(--bg-tertiary);
  }
}

.deck-type-button {
  min-width: 50px;
  padding: 2px 4px;
  border: none;
  background: transparent;

  &:hover {
    background: transparent;
    opacity: 0.8;
  }

  &:active {
    background: transparent;
    opacity: 0.6;
  }
}

.deck-style-button {
  min-width: 50px;
  background: var(--color-info-bg);
  color: var(--color-info);
  border: 1px solid var(--color-info);
  border-radius: 12px;
  font-weight: 500;

  &:hover {
    background: var(--color-info-hover-bg);
    border-color: var(--color-info);
  }

  &:active {
    background: var(--color-info);
  }
}

.action-button {
  min-width: 36px;
  flex-shrink: 0;
}

.public-button {
  background: var(--color-error-bg);
  color: var(--color-error-text);
  border: 1px solid var(--color-error);
  border-radius: 12px;
  font-weight: 500;
  min-width: 44px;

  &:hover {
    background: var(--color-error-hover-bg);
    border-color: var(--color-error);
  }

  &:active {
    background: var(--color-error);
  }

  &.is-public {
    background: var(--color-success-bg);
    color: var(--color-success);
    border-color: var(--color-success);

    &:hover {
      background: var(--color-success-hover-bg);
      border-color: var(--color-success);
    }

    &:active {
      background: var(--color-success);
    }
  }
}

.tag-button {
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid var(--color-success);
  border-radius: 12px;
  font-weight: 500;

  &:hover {
    background: var(--color-success-hover-bg);
    border-color: var(--color-success);
  }

  &:active {
    background: var(--color-success);
  }
}

.category-button {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
  border-radius: 12px;
  font-weight: 500;

  &:hover {
    background: var(--color-warning-hover-bg);
    border-color: var(--color-warning);
  }

  &:active {
    background: var(--color-warning);
  }
}

.deck-type-icon {
  height: 20px;
  width: auto;
  display: block;
  border-radius: 3px;
}

.deck-type-placeholder {
  font-size: calc(var(--right-area-font-size, 14px) * 0.71);
  color: var(--text-tertiary);
  padding: 0 4px;
  border: 1px solid var(--border-primary);
  border-radius: 3px;
  background: var(--bg-primary);
  height: 20px;
  display: flex;
  align-items: center;
}

.text-bold {
  font-weight: 700;
}

.deck-type-unset {
  font-size: calc(var(--right-area-font-size, 14px) * 0.93);
  color: var(--text-secondary);
  padding: 0 8px;
}

.deck-type-dropdown,
.deck-style-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 240px;
  max-height: 300px;
  overflow-y: auto;

  &.align-right {
    left: auto;
    right: 0;
  }
}

.deck-type-option,
.deck-style-option {
  padding: 10px 14px;
  cursor: pointer;
  font-size: calc(var(--right-area-font-size, 14px) * 0.93);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-primary);

  &:hover {
    background: var(--bg-secondary);
  }
}

.deck-type-icon-small {
  width: 36px;
  height: auto;
  flex-shrink: 0;
}

.dropdown-enter-active {
  transition: all 0.2s ease-out;
}

.dropdown-leave-active {
  transition: all 0.15s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* メタデータメニュー */
.metadata-menu-container {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.metadata-menu-button {
  font-size: 16px;
  font-weight: bold;
  min-width: 36px;
  padding: 0 6px;
  background: var(--color-info-bg);
  color: var(--color-info);
  border: 1px solid var(--color-info);
  border-radius: 12px;

  &:hover {
    background: var(--color-info-hover-bg);
    border-color: var(--color-info);
  }

  &:active {
    background: var(--color-info);
  }
}

.metadata-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  width: 150px;
  padding: 6px;
}

.menu-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 24px;
  padding: 0;
  border-radius: 4px;
  transition: background-color 0.2s;
  cursor: pointer;

  &:hover {
    background-color: var(--bg-secondary);
  }

  &:not(:last-child) {
    margin-bottom: 4px;
  }
}

.menu-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  fill: var(--text-primary);
  opacity: 0.7;
  cursor: default;
}

.menu-value-badge {
  background: var(--color-info-bg);
  color: var(--color-info);
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 10px;
  min-width: 28px;
  text-align: center;
  flex-shrink: 0;
  line-height: 1;
}

.deck-code-row {
  flex-wrap: nowrap;
}

.deck-code-action {
  display: flex;
  gap: 4px;
  flex: 1;
  min-width: 0;
  justify-content: center;
}

.deck-code-display {
  flex: 1;
  padding: 4px 6px;
  font-size: 11px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 3px;
  font-family: monospace;
  box-sizing: border-box;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 0;
  height: 24px;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    background: var(--btn-bg-hover);
    border-color: var(--text-primary);
  }

  &:read-only {
    background: var(--bg-secondary);
  }
}

.deck-code-btn {
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--color-success);
  background: var(--color-success-bg);
  color: var(--color-success);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
  height: 24px;
  line-height: 1;

  &:hover:not(:disabled) {
    background: var(--color-success-hover-bg);
    border-color: var(--color-success);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

</style>
