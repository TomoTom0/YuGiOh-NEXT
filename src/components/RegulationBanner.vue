<template>
  <div v-if="visible" class="regulation-banner" :class="{ 'is-fallback': isFallback }">
    <span class="regulation-banner-text">{{ message }}</span>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useDeckEditStore } from '../stores/deck-edit';

/**
 * 現在適用中のリミットレギュレーションを表示するバナー
 *
 * - タグ無し（mode='none'）は非表示
 * - 通常時: 「適用中: OCG 2025年1月版」等（regulationEffectiveDescription）
 * - fallback 時: 「指定 OCG-2503 は存在しないため、直近版 OCG-2501 を適用中」
 */
export default defineComponent({
  name: 'RegulationBanner',
  setup() {
    const deckStore = useDeckEditStore();

    const visible = computed(() => deckStore.resolvedRegulation.mode !== 'none');

    const isFallback = computed(() => !!deckStore.resolvedRegulation.fallback);

    const message = computed(() => {
      const r = deckStore.resolvedRegulation;
      if (r.fallback) {
        const label = r.mode === 'ocg' ? 'OCG' : 'GENESYS';
        return `指定 ${label}-${r.fallback.requestedYymm} は存在しないため、直近版 ${label}-${r.fallback.appliedYymm} を適用中`;
      }
      return deckStore.regulationEffectiveDescription
        ? `適用中: ${deckStore.regulationEffectiveDescription}`
        : '';
    });

    return { visible, isFallback, message };
  }
});
</script>

<style scoped>
.regulation-banner {
  margin: 4px 8px 0;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border-left: 3px solid var(--color-warning);
}

.regulation-banner.is-fallback {
  background: var(--color-error-bg);
  color: var(--color-error-text);
  border-left-color: var(--color-error);
}

.regulation-banner-text {
  display: inline-block;
}
</style>
