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

    <VersionFooter :updateDate="updateDate" :version="version" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import VersionFooter from '../VersionFooter.vue';
import OverviewSection from '../sections/OverviewSection.vue';
import UISettingsSection from '../sections/UISettingsSection.vue';
import UXSettingsSection from '../sections/UXSettingsSection.vue';
import CacheManagementSection from '../sections/CacheManagementSection.vue';

type SubTab = 'overview' | 'ui' | 'ux' | 'general';

const activeSubTab = ref<SubTab>('overview');
const updateDate = ref('2025-11-27');
const version = ref('0.4.1');
</script>

<style scoped lang="scss">
.deck-edit-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
  margin: 24px 40px 40px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.sub-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.sub-tab {
  padding: 16px 32px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #5f6368;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  margin-bottom: -1px;

  &:hover:not(.active) {
    background-color: #f5f5f5;
    color: #202124;
  }

  &.active {
    color: #1a73e8;
    border-bottom-color: #1a73e8;
    background-color: #ffffff;
  }
}

.section-content {
  flex: 1;
  padding: 40px 48px;
  overflow-y: auto;
  background-color: #ffffff;
}
</style>
