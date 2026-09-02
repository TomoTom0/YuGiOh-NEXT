<template>
  <Teleport to="body">
    <Transition name="base-dialog-fade">
      <div v-if="isVisible" class="ygo-next base-dialog-overlay" :data-ygo-next-theme="theme" @click.self="onOverlayClick">
        <slot />
      </div>
    </Transition>
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

// ダイアログの開閉が瞬時に切り替わり唐突に見えるのを避けるためのフェード+ポップイン
.base-dialog-fade-enter-active,
.base-dialog-fade-leave-active {
  transition: opacity 0.15s ease;

  > * {
    transition: transform 0.15s ease, opacity 0.15s ease;
  }
}

.base-dialog-fade-enter-from,
.base-dialog-fade-leave-to {
  opacity: 0;

  > * {
    transform: scale(0.97);
    opacity: 0;
  }
}
</style>
