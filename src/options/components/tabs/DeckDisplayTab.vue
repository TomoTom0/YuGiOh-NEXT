<template>
  <div class="deck-display-tab">
    <div class="sub-tabs">
      <button
        :class="['sub-tab', { active: activeSubTab === 'overview' }]"
        @click="scrollToSection('overview')"
      >
        概要とアクセス
      </button>
      <button
        :class="['sub-tab', { active: activeSubTab === 'card-detail' }]"
        @click="scrollToSection('card-detail')"
      >
        カード詳細
      </button>
      <button
        :class="['sub-tab', { active: activeSubTab === 'shuffle' }]"
        @click="scrollToSection('shuffle')"
      >
        シャッフル
      </button>
      <button
        :class="['sub-tab', { active: activeSubTab === 'image-creation' }]"
        @click="scrollToSection('image-creation')"
      >
        画像作成
      </button>
    </div>

    <div class="section-content" ref="contentContainer" @scroll="onScroll">
      <div id="section-overview" class="section-wrapper">
        <OverviewSection type="deck-display" />
      </div>
      <div id="section-card-detail" class="section-wrapper">
        <DeckDisplayCardDetailSection />
      </div>
      <div id="section-shuffle" class="section-wrapper">
        <ShuffleSection />
      </div>
      <div id="section-image-creation" class="section-wrapper">
        <ImageCreationSection />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import OverviewSection from '../sections/OverviewSection.vue';
import DeckDisplayCardDetailSection from '../sections/DeckDisplayCardDetailSection.vue';
import ShuffleSection from '../sections/ShuffleSection.vue';
import ImageCreationSection from '../sections/ImageCreationSection.vue';

type SubTab = 'overview' | 'card-detail' | 'shuffle' | 'image-creation';

const activeSubTab = ref<SubTab>('overview');
const contentContainer = ref<HTMLElement | null>(null);

// セクションまでスクロール
const scrollToSection = (sectionId: SubTab) => {
  const element = document.getElementById(`section-${sectionId}`);
  if (element && contentContainer.value) {
    const container = contentContainer.value;
    const elementTop = element.offsetTop;
    const containerTop = container.offsetTop;

    container.scrollTo({
      top: elementTop - containerTop,
      behavior: 'smooth'
    });

    activeSubTab.value = sectionId;
  }
};

// スクロール位置に基づいてアクティブタブを更新
const onScroll = () => {
  if (!contentContainer.value) return;

  const container = contentContainer.value;
  const sections: SubTab[] = ['overview', 'card-detail', 'shuffle', 'image-creation'];
  const scrollTop = container.scrollTop;
  const containerTop = container.offsetTop;

  for (let i = sections.length - 1; i >= 0; i--) {
    const sectionId = sections[i];
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      const elementTop = element.offsetTop - containerTop;
      if (scrollTop >= elementTop - 50) {
        activeSubTab.value = sectionId;
        break;
      }
    }
  }
};
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
}

.sub-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-primary);
  background-color: var(--bg-secondary);
  position: sticky;
  top: 0;
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
  overflow-y: auto;
  background-color: var(--bg-primary);
  scroll-behavior: smooth;
}

.section-wrapper {
  padding: 40px 48px;
  min-height: 400px;

  &:not(:last-child) {
    border-bottom: 2px solid var(--border-primary);
  }
}
</style>
