<template>
  <div class="ygo-next practice-shared-emz-row" :style="practiceCardStyle">
    <div class="emz-slots">
      <div
        v-for="i in 2"
        :key="`em-${i}`"
        class="field-slot em-slot"
        @mouseenter="hovered1 = i - 1"
        @mouseleave="hovered1 = null"
      >
        <PracticeSlot
          :cards="zones1.extraMonster[i - 1]!"
          zone="extraMonster"
          :slot-index="i - 1"
          stack-direction="right-up"
          @card-action="(action, cardId) => handleAction(action, cardId, 0)"
          @card-drop="(cardId, fromZone, fromSlotIndex, dropPos) => handleDrop(i - 1, cardId, dropPos, 0)"
          @deck-card-drop="(cid, ciid, dropPos) => handleDeckDrop(i - 1, cid, ciid, dropPos, 0)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePracticeStore } from '../../stores/practice'
import { useSettingsStore } from '../../stores/settings'
import { usePracticeActions } from '../../composables/practice/usePracticeActions'
import { usePracticeDropHandler, type DropContext } from '../../composables/practice/usePracticeDropHandler'
import type { DropPosition } from '../../utils/drag-data'
import PracticeSlot from './PracticeSlot.vue'

const practiceStore = usePracticeStore()
const settingsStore = useSettingsStore()
const { executeAction } = usePracticeActions()
const dropHandler = usePracticeDropHandler()

const hovered1 = ref<number | null>(null)

const zones1 = computed(() => practiceStore.zones)

const practiceCardStyle = computed(() => {
  const { width, height } = settingsStore.practiceCardSizePixels
  return {
    '--practice-card-width': `${width}px`,
    '--practice-card-height': `${height}px`,
  }
})

function handleAction(action: string, cardId: string, fieldIdx: number) {
  executeAction(action, cardId, fieldIdx)
}

function handleDrop(slotIndex: number, cardId: string, dropPos: DropPosition, fieldIdx: number) {
  const context: DropContext = { targetZone: 'extraMonster', targetSlotIndex: slotIndex, fieldIndex: fieldIdx }
  dropHandler.handleCardDrop(cardId, context, dropPos)
}

function handleDeckDrop(slotIndex: number, cid: string, ciid: string, dropPos: DropPosition | undefined, fieldIdx: number) {
  const context: DropContext = { targetZone: 'extraMonster', targetSlotIndex: slotIndex, fieldIndex: fieldIdx }
  dropHandler.handleExternalCardDrop(cid, ciid, context, dropPos)
}
</script>

<style scoped lang="scss">
$pw: var(--practice-card-width, 90px);
$ph: var(--practice-card-height, 130px);
$zw: calc(#{$pw} + 60px);
$slot-padding: 2px;
$slot-border: 1px;
$slot-overhead: calc(#{$slot-padding} * 2 + #{$slot-border} * 2);
$row-padding: 4px;
$row-border: 1px;

.practice-shared-emz-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: $row-padding 8px;
  border-top: $row-border dashed var(--border-primary, rgba(255, 255, 255, 0.2));
  border-bottom: $row-border dashed var(--border-primary, rgba(255, 255, 255, 0.2));
  background: rgba(255, 255, 255, 0.02);
  user-select: none;
  width: 100%;
  box-sizing: border-box;
  height: calc(#{$ph} + #{$slot-overhead} + #{$row-padding} * 2 + #{$row-border} * 2);
  flex-shrink: 0;
}

.emz-slots {
  display: flex;
  gap: 6px;
}

.field-slot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: $zw;
  min-height: $ph;
  padding: 2px;
  border: 1px dashed var(--border-secondary, rgba(255, 255, 255, 0.2));
  border-radius: 3px;
  transition: border-color 0.15s ease;
  box-sizing: border-box;

  &:hover {
    border-color: var(--color-primary, #1976d2);
  }
}

.em-slot {
  border-color: rgba(100, 200, 150, 0.35);
}
</style>
