<template>
  <div class="deck-edit-tab">
    <div class="sub-tabs">
      <button
        :class="['sub-tab', { active: activeSubTab === 'overview' }]"
        @click="activeSubTab = 'overview'"
      >
        概要とアクセス
      </button>
      <button
        :class="['sub-tab', { active: activeSubTab === 'ui' }]"
        @click="activeSubTab = 'ui'"
      >
        UI
      </button>
      <button
        :class="['sub-tab', { active: activeSubTab === 'ux' }]"
        @click="activeSubTab = 'ux'"
      >
        UX
      </button>
      <button
        :class="['sub-tab', { active: activeSubTab === 'general' }]"
        @click="activeSubTab = 'general'"
      >
        General
      </button>
    </div>

    <div class="section-content">
      <OverviewSection v-if="activeSubTab === 'overview'" type="deck-edit" />
      <UISettingsSection v-if="activeSubTab === 'ui'" />
      <UXSettingsSection v-if="activeSubTab === 'ux'" />
      <CacheManagementSection v-if="activeSubTab === 'general'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import OverviewSection from '../sections/OverviewSection.vue';
import UISettingsSection from '../sections/UISettingsSection.vue';
import UXSettingsSection from '../sections/UXSettingsSection.vue';
import CacheManagementSection from '../sections/CacheManagementSection.vue';

type SubTab = 'overview' | 'ui' | 'ux' | 'general';

const activeSubTab = ref<SubTab>('overview');
</script>

<style scoped lang="scss">
.deck-edit-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
  margin: 24px 40px 40px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
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
