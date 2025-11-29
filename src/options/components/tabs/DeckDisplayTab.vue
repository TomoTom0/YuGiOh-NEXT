<template>
  <div class="deck-display-tab">
    <div class="sub-tabs">
      <button
        :class="['sub-tab', { active: activeSubTab === 'overview' }]"
        @click="activeSubTab = 'overview'"
      >
        概要とアクセス
      </button>
      <button
        :class="['sub-tab', { active: activeSubTab === 'shuffle' }]"
        @click="activeSubTab = 'shuffle'"
      >
        シャッフル
      </button>
      <button
        :class="['sub-tab', { active: activeSubTab === 'image-creation' }]"
        @click="activeSubTab = 'image-creation'"
      >
        画像作成
      </button>
    </div>

    <div class="section-content">
      <OverviewSection v-if="activeSubTab === 'overview'" type="deck-display" />
      <ShuffleSection v-if="activeSubTab === 'shuffle'" />
      <ImageCreationSection v-if="activeSubTab === 'image-creation'" />
    </div>

    <VersionFooter :updateDate="updateDate" :version="version" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import VersionFooter from '../VersionFooter.vue';
import OverviewSection from '../sections/OverviewSection.vue';
import ShuffleSection from '../sections/ShuffleSection.vue';
import ImageCreationSection from '../sections/ImageCreationSection.vue';

type SubTab = 'overview' | 'shuffle' | 'image-creation';

const activeSubTab = ref<SubTab>('overview');
const updateDate = ref('2025-11-27');
const version = ref('0.4.1');
</script>

<style scoped lang="scss">
.deck-display-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
  margin: 24px 40px 40px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.sub-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-primary);
  background-color: var(--bg-secondary);
}

.sub-tab {
  padding: 16px 32px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  margin-bottom: -1px;

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

.section-content {
  flex: 1;
  padding: 40px 48px;
  overflow-y: auto;
  background-color: var(--bg-primary);
}
</style>
