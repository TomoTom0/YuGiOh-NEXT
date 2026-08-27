<template>
  <Teleport to="body">
    <div v-if="isVisible" class="ygo-next base-dialog-overlay" :data-ygo-next-theme="theme" @click.self="onOverlayClick">
      <slot />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  isVisible: boolean
  theme?: 'light' | 'dark'
  closeOnClickOverlay?: boolean
}>(), {
  closeOnClickOverlay: true
})

const emit = defineEmits<{
  close: []
}>()

function onOverlayClick() {
  if (props.closeOnClickOverlay) {
    emit('close')
  }
}
</script>

<style scoped lang="scss">
.base-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--dialog-overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
</style>
