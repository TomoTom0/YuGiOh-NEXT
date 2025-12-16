<template>
  <div class="deck-edit-tab">
    <div class="sub-tabs">
      <button
        :class="['sub-tab', { active: activeSubTab === 'overview' }]"
        @click="scrollToSection('overview')"
      >
        概要とアクセス
      </button>
      <button
        :class="['sub-tab', { active: activeSubTab === 'ui' }]"
        @click="scrollToSection('ui')"
      >
        UI
      </button>
      <button
        :class="['sub-tab', { active: activeSubTab === 'ux' }]"
        @click="scrollToSection('ux')"
      >
        UX
      </button>
      <button
        :class="['sub-tab', { active: activeSubTab === 'general' }]"
        @click="scrollToSection('general')"
      >
        General
      </button>
    </div>

    <div class="section-content">
      <div id="section-overview" class="section-wrapper">
        <OverviewSection type="deck-edit" />
      </div>
      <div id="section-ui" class="section-wrapper">
        <UISettingsSection />
      </div>
      <div id="section-ux" class="section-wrapper">
        <UXSettingsSection />
      </div>
      <div id="section-general" class="section-wrapper">
        <CacheManagementSection />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import OverviewSection from '../sections/OverviewSection.vue';
import UISettingsSection from '../sections/UISettingsSection.vue';
import UXSettingsSection from '../sections/UXSettingsSection.vue';
import CacheManagementSection from '../sections/CacheManagementSection.vue';

type SubTab = 'overview' | 'ui' | 'ux' | 'general';

const activeSubTab = ref<SubTab>('overview');

// セクションまでスクロール
const scrollToSection = (sectionId: SubTab) => {
  const element = document.getElementById(`section-${sectionId}`);
  if (element) {
    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    const offset = 120; // main-tabs (63px) + sub-tabs (57px)

    window.scrollTo({
      top: elementTop - offset,
      behavior: 'smooth'
    });

    activeSubTab.value = sectionId;
  }
};

// スクロール位置に基づいてアクティブタブを更新
const onScroll = () => {
  const sections: SubTab[] = ['overview', 'ui', 'ux', 'general'];
  const scrollTop = window.scrollY;
  const offset = 120;

  for (let i = sections.length - 1; i >= 0; i--) {
    const sectionId = sections[i];
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      const elementTop = element.getBoundingClientRect().top + scrollTop;
      if (scrollTop >= elementTop - offset - 50) {
        activeSubTab.value = sectionId;
        break;
      }
    }
  }
};

// スクロールイベントをリスン
onMounted(() => {
  window.addEventListener('scroll', onScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
});
</script>

<style scoped lang="scss">
.deck-edit-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
  margin: 0 40px 40px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.sub-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-primary);
  background-color: var(--bg-secondary);
  position: sticky;
  top: 63px;
  z-index: 5;
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
  padding: 0;
  background-color: var(--bg-primary);
}

.section-wrapper {
  padding: 40px 48px;
  min-height: 400px;

  &:not(:last-child) {
    border-bottom: 2px solid var(--border-primary);
  }
}
</style>
