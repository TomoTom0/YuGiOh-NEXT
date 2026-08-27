<template>
  <div class="ygo-next practice-zone-row" :class="`row-${row}`">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  row: 1 | 2 | 3
}>()
</script>

<style scoped lang="scss">
.practice-zone-row {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.row-1 {
  grid-template-columns: repeat(8, 1fr);
}

.row-2 {
  grid-template-columns: repeat(7, 1fr);
}

.row-3 {
  display: flex;
  align-items: center;
}
</style>
