<template>
  <div class="options-page">
    <TopBar />

    <div class="main-tabs">
      <button
        :class="['tab', { active: activeMainTab === 'deck-edit' }]"
        @click="activeMainTab = 'deck-edit'"
      >
        デッキ編集画面
      </button>
      <button
        :class="['tab', { active: activeMainTab === 'deck-display' }]"
        @click="activeMainTab = 'deck-display'"
      >
        公式デッキ表示画面
      </button>
      <button
        :class="['tab', { active: activeMainTab === 'general' }]"
        @click="activeMainTab = 'general'"
      >
        General
      </button>
    </div>

    <div class="tab-content">
      <DeckEditTab v-if="activeMainTab === 'deck-edit'" />
      <DeckDisplayTab v-if="activeMainTab === 'deck-display'" />
      <GeneralTab v-if="activeMainTab === 'general'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '../stores/settings';
import TopBar from './components/TopBar.vue';
import DeckEditTab from './components/tabs/DeckEditTab.vue';
import DeckDisplayTab from './components/tabs/DeckDisplayTab.vue';
import GeneralTab from './components/tabs/GeneralTab.vue';

type MainTab = 'deck-edit' | 'deck-display' | 'general';

const settingsStore = useSettingsStore();
const activeMainTab = ref<MainTab>('deck-edit');

onMounted(async () => {
  // 設定を読み込み
  await settingsStore.loadSettings();
});
</script>

<style lang="scss">
@import '../styles/themes.scss';
</style>

<style scoped lang="scss">
@import '../styles/common.scss';

.options-page {
  min-height: 100vh;
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
}

.main-tabs {
  display: flex;
  background-color: var(--bg-primary);
  border-bottom: 2px solid var(--border-primary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab {
  padding: 20px 40px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  margin-bottom: -2px;

  &:hover:not(.active) {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
  }

  &.active {
    color: var(--color-info);
    border-bottom-color: var(--color-info);
    background-color: var(--bg-primary);
  }
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
