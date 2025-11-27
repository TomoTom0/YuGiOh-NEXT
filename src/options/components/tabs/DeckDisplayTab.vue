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
