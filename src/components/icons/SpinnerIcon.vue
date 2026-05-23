<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
    <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
    <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
  </svg>
</template>

<style scoped>
.spinner {
  animation: spinner-rotate 1s linear infinite;
}

@keyframes spinner-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
