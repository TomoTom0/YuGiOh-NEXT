<template>
  <Teleport to="body">
    <div
      v-if="draggingCardId"
      class="ygo-next practice-drag-overlay"
      :style="overlayStyle"
    >
        <img
        :src="draggingImageUrl ?? backImageUrl"
        alt=""
        class="drag-overlay-img"
        draggable="false"
      >
      <img
        v-if="draggingFaceDown && draggingImageUrl && draggingImageUrl !== backImageUrl"
        :src="backImageUrl"
        alt=""
        class="drag-overlay-img drag-overlay-facedown"
        draggable="false"
      >
      <div v-if="draggingStackTop !== null" class="stack-preview-rect" :class="draggingStackTop ? 'preview-top' : 'preview-bottom'" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePracticeDragState } from '../../composables/practice/usePracticeDragState'
import { useSettingsStore } from '../../stores/settings'

const settingsStore = useSettingsStore()
const { draggingCardId, draggingFaceDown, draggingImageUrl, draggingPos, draggingOffset, draggingRotated, draggingStackTop } = usePracticeDragState()

const backImageUrl = chrome.runtime.getURL('images/card_back.png')

const cardSize = computed(() => settingsStore.practiceCardSizePixels)

const overlayStyle = computed(() => {
  const { x, y } = draggingPos.value
  const { x: ox, y: oy } = draggingOffset.value
  return {
    position: 'fixed' as const,
    left: `${x - ox}px`,
    top: `${y - oy}px`,
    width: `${cardSize.value.width}px`,
    height: `${cardSize.value.height}px`,
    transform: draggingRotated.value ? 'rotate(-90deg)' : 'none',
    transformOrigin: `${ox}px ${oy}px`,
    pointerEvents: 'none' as const,
    zIndex: '99999',
    opacity: '0.85',
  }
})
</script>

<style scoped lang="scss">
.practice-drag-overlay {
  position: relative;
  border-radius: 3px;
  overflow: visible;
  user-select: none;
}

.drag-overlay-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  display: block;
  border-radius: 3px;
}

.drag-overlay-facedown {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.5;
}

.stack-preview-rect {
  position: absolute;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 2px dashed rgba(255, 255, 255, 0.6);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  pointer-events: none;

  &.preview-top {
    left: 16px;
    top: -5px;
  }

  &.preview-bottom {
    left: -16px;
    top: 5px;
    z-index: -1;
  }
}

</style>
