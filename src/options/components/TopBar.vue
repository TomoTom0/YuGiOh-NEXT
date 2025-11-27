<template>
  <header class="top-bar">
    <img src="/icons/icon48.png" alt="YuGiOh NEXT" class="icon" />
    <h1>YuGiOh NEXT Options</h1>
  </header>
</template>

<script setup lang="ts">
// Top Barコンポーネント
// アイコンとページ名を表示
</script>

<style scoped lang="scss">
.top-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: linear-gradient(90deg, #00d9b8 0%, #008cff 50%, #b84fc9 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 140, 255, 0.3);
}

.icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

h1 {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
