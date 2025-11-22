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
          @click="$emit('toggle-deck-type-dropdown')"
        >
          <div v-if="deckType === '-1'" class="deck-type-placeholder">type</div>
          <svg v-else-if="deckType === '0'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#0053c3" width="148" height="108" rx="11.25"></rect>
            <polygon fill="#00204b" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
            <path fill="#fff" d="M40.94,65.78l-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Zm-3.34-33,24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67ZM67,85h33V47H81V38h19V24H67ZM81,61h5V71H81Zm23-37V85h33V24Zm19,47h-5V38h5Z"></path>
          </svg>
          <svg v-else-if="deckType === '1'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#6ec300" width="148" height="108" rx="11.25"></rect>
            <polygon fill="#2a4a00" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
            <path fill="#fff" d="M67,38H86V48H67V85h33V71H81V62h19V24H67Zm37-14V85h33V24Zm19,47h-5V38h5ZM37.6,32.74l24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67Zm3.34,33-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Z"></path>
          </svg>
          <svg v-else-if="deckType === '2'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#00b9da" width="148" height="108" rx="11.25"></rect>
            <path fill="#004c59" d="M101.37,66.88l-6.05-6V20h-23V33.3L58.74,20H7.85V89.85H58.74l14.14-14,13.72,14h39.81l13.24-15v-8Zm-50.92-6-5.76,6H30.82V42.93H44.69l5.76,5.75Z"></path>
            <path fill="#fff" d="M97.37,70.88l-6.05-6V24h-15v47.3L90.6,85.85h31.81l13.24-15ZM11.85,24V85.85H54.74L69.42,71.26V38.35L54.74,24Zm42.6,40.88-5.76,6H26.82V38.93H48.69l5.76,5.75Z"></path>
          </svg>
          <svg v-else-if="deckType === '3'" class="deck-type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
            <rect fill="#5c00da" width="148" height="108" rx="11.25"></rect>
            <path fill="#2b0067" d="M120.12,16.12H63.72L43.56,45.4,23.39,16.12h-8v88.81h8L37,85H71.72L71.63,38h38.88v21h-8.46v-18H80.21V85h39.91c4.79,0,12.53-5.16,12.53-12.53V28.65C132.65,21.28,124.54,16.12,120.12,16.12Z"></path>
            <path fill="#fff" d="M19.39,20.12v80.81L33,81V66.15L43.56,80.27l5.74-7.71L67.72,45.82V20.12L43.56,55.21ZM54.09,81H67.72V58L54.09,77.78Zm62-60.86H70.86l7,13.92h36.63v29H98.05v-18H84.21V81h31.91c4.79,0,12.53-5.16,12.53-12.53V32.65C128.65,25.28,120.54,20.12,116.12,20.12Z"></path>
          </svg>
        </button>
        <Transition name="dropdown">
          <div
            v-if="showDeckTypeDropdown"
            ref="deckTypeDropdown"
            class="deck-type-dropdown"
            :class="{ 'align-right': deckTypeDropdownAlignRight }"
          >
            <div class="deck-type-option" @click="$emit('select-deck-type', '-1')">
              <div class="deck-type-unset">未設定</div>
            </div>
            <div class="deck-type-option" @click="$emit('select-deck-type', '0')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#0053c3" width="148" height="108" rx="11.25"></rect>
                <polygon fill="#00204b" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
                <path fill="#fff" d="M40.94,65.78l-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Zm-3.34-33,24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67ZM67,85h33V47H81V38h19V24H67ZM81,61h5V71H81Zm23-37V85h33V24Zm19,47h-5V38h5Z"></path>
              </svg>
              OCG（マスタールール）
            </div>
            <div class="deck-type-option" @click="$emit('select-deck-type', '1')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#6ec300" width="148" height="108" rx="11.25"></rect>
                <polygon fill="#2a4a00" points="63 20 63 20.27 36.26 15.56 28.26 15.56 6.9 21.74 6.9 58.6 10.24 59.31 10.24 85.47 36.94 91.64 44.94 91.64 63 86.34 63 89 141 89 141 20 63 20"></polygon>
                <path fill="#fff" d="M67,38H86V48H67V85h33V71H81V62h19V24H67Zm37-14V85h33V24Zm19,47h-5V38h5ZM37.6,32.74l24-8L32.26,19.56,10.9,25.74V54.6l26.7,5.67Zm3.34,33-26.7-5.67V81.47l26.7,6.17,21-6.17V29.07l-21,6.17Z"></path>
              </svg>
              OCG（スピードルール）
            </div>
            <div class="deck-type-option" @click="$emit('select-deck-type', '2')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#00b9da" width="148" height="108" rx="11.25"></rect>
                <path fill="#004c59" d="M101.37,66.88l-6.05-6V20h-23V33.3L58.74,20H7.85V89.85H58.74l14.14-14,13.72,14h39.81l13.24-15v-8Zm-50.92-6-5.76,6H30.82V42.93H44.69l5.76,5.75Z"></path>
                <path fill="#fff" d="M97.37,70.88l-6.05-6V24h-15v47.3L90.6,85.85h31.81l13.24-15ZM11.85,24V85.85H54.74L69.42,71.26V38.35L54.74,24Zm42.6,40.88-5.76,6H26.82V38.93H48.69l5.76,5.75Z"></path>
              </svg>
              デュエルリンクス
            </div>
            <div class="deck-type-option" @click="$emit('select-deck-type', '3')">
              <svg class="deck-type-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 108">
                <rect fill="#5c00da" width="148" height="108" rx="11.25"></rect>
                <path fill="#2b0067" d="M120.12,16.12H63.72L43.56,45.4,23.39,16.12h-8v88.81h8L37,85H71.72L71.63,38h38.88v21h-8.46v-18H80.21V85h39.91c4.79,0,12.53-5.16,12.53-12.53V28.65C132.65,21.28,124.54,16.12,120.12,16.12Z"></path>
                <path fill="#fff" d="M19.39,20.12v80.81L33,81V66.15L43.56,80.27l5.74-7.71L67.72,45.82V20.12L43.56,55.21ZM54.09,81H67.72V58L54.09,77.78Zm62-60.86H70.86l7,13.92h36.63v29H98.05v-18H84.21V81h31.91c4.79,0,12.53-5.16,12.53-12.53V32.65C128.65,25.28,120.54,20.12,116.12,20.12Z"></path>
              </svg>
              マスターデュエル
            </div>
          </div>
        </Transition>
      </div>

      <div class="deck-style-selector" ref="deckStyleSelector">
        <button
          class="deck-style-button"
          @click="$emit('toggle-deck-style-dropdown')"
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
            <div class="deck-style-option" @click="$emit('select-deck-style', '0')">Character</div>
            <div class="deck-style-option" @click="$emit('select-deck-style', '1')">Tournament</div>
            <div class="deck-style-option" @click="$emit('select-deck-style', '2')">Concept</div>
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
import { computed, ref } from 'vue'

const props = defineProps<{
  isPublic: boolean
  deckType: '-1' | '0' | '1' | '2' | '3'
  deckStyle: '-1' | '0' | '1' | '2'
  showDeckTypeDropdown: boolean
  showDeckStyleDropdown: boolean
  deckTypeDropdownAlignRight: boolean
  deckStyleDropdownAlignRight: boolean
}>()

defineEmits<{
  (e: 'toggle-public'): void
  (e: 'toggle-deck-type-dropdown'): void
  (e: 'toggle-deck-style-dropdown'): void
  (e: 'select-deck-type', value: string): void
  (e: 'select-deck-style', value: string): void
  (e: 'show-tag-dialog'): void
  (e: 'show-category-dialog'): void
}>()

// DOM参照（親からのドロップダウン位置調整用）
const deckTypeSelector = ref<HTMLElement | null>(null)
const deckTypeDropdown = ref<HTMLElement | null>(null)
const deckStyleSelector = ref<HTMLElement | null>(null)
const deckStyleDropdown = ref<HTMLElement | null>(null)

const deckStyleLabel = computed(() => {
  if (props.deckStyle === '-1') return 'Style'
  if (props.deckStyle === '0') return 'Chara'
  if (props.deckStyle === '1') return 'Tourn'
  if (props.deckStyle === '2') return 'Concep'
  return 'Style'
})

// 親コンポーネントがDOM要素にアクセスできるようにexpose
defineExpose({
  deckTypeSelector,
  deckTypeDropdown,
  deckStyleSelector,
  deckStyleDropdown
})
</script>
