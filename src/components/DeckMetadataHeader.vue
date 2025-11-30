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
            <path fill="currentColor" d="M40.94,65.78l-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Zm-3.34-33,24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67ZM67,85h33V47H81V38h19V24H67ZM81,61h5V71H81Zm23-37V85h33V24Zm19,47h-5V38h5Z"></path>
          </svg>
          <svg v-else-if="deckType === '1'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#6ec300" width="148" height="108" rx="11.25"></rect>
            <polygon fill="#2a4a00" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
            <path fill="currentColor" d="M67,38H86V48H67V85h33V71H81V62h19V24H67Zm37-14V85h33V24Zm19,47h-5V38h5ZM37.6,32.74l24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67Zm3.34,33-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Z"></path>
          </svg>
          <svg v-else-if="deckType === '2'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#00b9da" width="148" height="108" rx="11.25"></rect>
            <path fill="#004c59" d="M101.37,66.88l-6.05-6V20h-23V33.3L58.74,20H7.85V89.85H58.74l14.14-14,13.72,14h39.81l13.24-15v-8Zm-50.92-6-5.76,6H30.82V42.93H44.69l5.76,5.75Z"></path>
            <path fill="currentColor" d="M97.37,70.88l-6.05-6V24h-15v47.3L90.6,85.85h31.81l13.24-15ZM11.85,24V85.85H54.74L69.42,71.26V38.35L54.74,24Zm42.6,40.88-5.76,6H26.82V38.93H48.69l5.76,5.75Z"></path>
          </svg>
          <svg v-else-if="deckType === '3'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#5c00da" width="148" height="108" rx="11.25"></rect>
            <path fill="#2b0067" d="M120.12,16.12H63.72L43.56,45.4,23.39,16.12h-8v88.81h8L37,85H71.72L71.63,38h38.88v21h-8.46v-18H80.21V85h39.91c4.79,0,12.53-5.16,12.53-12.53V28.65C132.65,21.28,124.54,16.12,120.12,16.12Z"></path>
            <path fill="currentColor" d="M19.39,20.12v80.81L33,81V66.15L43.56,80.27l5.74-7.71L67.72,45.82V20.12L43.56,55.21ZM54.09,81H67.72V58L54.09,77.78Zm62-60.86H70.86l7,13.92h36.63v29H98.05v-18H84.21V81h31.91c4.79,0,12.53-5.16,12.53-12.53V32.65C128.65,25.28,120.54,20.12,116.12,20.12Z"></path>
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
                <path fill="currentColor" d="M40.94,65.78l-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Zm-3.34-33,24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67ZM67,85h33V47H81V38h19V24H67ZM81,61h5V71H81Zm23-37V85h33V24Zm19,47h-5V38h5Z"></path>
              </svg>
              OCG（マスタールール）
            </div>
            <div class="deck-type-option" @click="selectDeckType('1')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#6ec300" width="148" height="108" rx="11.25"></rect>
                <polygon fill="#2a4a00" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
                <path fill="currentColor" d="M67,38H86V48H67V85h33V71H81V62h19V24H67Zm37-14V85h33V24Zm19,47h-5V38h5ZM37.6,32.74l24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67Zm3.34,33-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Z"></path>
              </svg>
              OCG（スピードルール）
            </div>
            <div class="deck-type-option" @click="selectDeckType('2')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#00b9da" width="148" height="108" rx="11.25"></rect>
                <path fill="#004c59" d="M101.37,66.88l-6.05-6V20h-23V33.3L58.74,20H7.85V89.85H58.74l14.14-14,13.72,14h39.81l13.24-15v-8Zm-50.92-6-5.76,6H30.82V42.93H44.69l5.76,5.75Z"></path>
                <path fill="currentColor" d="M97.37,70.88l-6.05-6V24h-15v47.3L90.6,85.85h31.81l13.24-15ZM11.85,24V85.85H54.74L69.42,71.26V38.35L54.74,24Zm42.6,40.88-5.76,6H26.82V38.93H48.69l5.76,5.75Z"></path>
              </svg>
              デュエルリンクス
            </div>
            <div class="deck-type-option" @click="selectDeckType('3')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#5c00da" width="148" height="108" rx="11.25"></rect>
                <path fill="#2b0067" d="M120.12,16.12H63.72L43.56,45.4,23.39,16.12h-8v88.81h8L37,85H71.72L71.63,38h38.88v21h-8.46v-18H80.21V85h39.91c4.79,0,12.53-5.16,12.53-12.53V28.65C132.65,21.28,124.54,16.12,120.12,16.12Z"></path>
                <path fill="currentColor" d="M19.39,20.12v80.81L33,81V66.15L43.56,80.27l5.74-7.71L67.72,45.82V20.12L43.56,55.21ZM54.09,81H67.72V58L54.09,77.78Zm62-60.86H70.86l7,13.92h36.63v29H98.05v-18H84.21V81h31.91c4.79,0,12.53-5.16,12.53-12.53V32.65C128.65,25.28,120.54,20.12,116.12,20.12Z"></path>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'

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

// DOM参照
const deckTypeSelector = ref<HTMLElement | null>(null)
const deckTypeDropdown = ref<HTMLElement | null>(null)
const deckStyleSelector = ref<HTMLElement | null>(null)
const deckStyleDropdown = ref<HTMLElement | null>(null)

// ドロップダウン表示状態（内部管理）
const showDeckTypeDropdown = ref(false)
const showDeckStyleDropdown = ref(false)
const deckTypeDropdownAlignRight = ref(false)
const deckStyleDropdownAlignRight = ref(false)

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
  font-size: 11px;
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
  color: var(--text-primary);

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
  font-size: 10px;
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
  font-size: 13px;
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
  font-size: 13px;
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

/* ダークモード用: デッキタイプアイコンの背景色を明るくする */
:global(.dark-theme) {
  .deck-type-icon {
    rect {
      &[fill="#0053c3"] {
        fill: #1976d2;
      }
      &[fill="#6ec300"] {
        fill: #7cb342;
      }
      &[fill="#00b9da"] {
        fill: #00bcd4;
      }
      &[fill="#5c00da"] {
        fill: #7c3aed;
      }
    }
  }

  .deck-type-icon-small {
    rect {
      &[fill="#0053c3"] {
        fill: #1976d2;
      }
      &[fill="#6ec300"] {
        fill: #7cb342;
      }
      &[fill="#00b9da"] {
        fill: #00bcd4;
      }
      &[fill="#5c00da"] {
        fill: #7c3aed;
      }
    }
  }
}
</style>
