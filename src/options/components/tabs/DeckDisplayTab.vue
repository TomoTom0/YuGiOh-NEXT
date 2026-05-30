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
      <button
        :class="['sub-tab', { active: activeSubTab === 'general' }]"
        @click="scrollToSection('general')"
      >
        General
      </button>
    </div>

    <div class="section-content">
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
      <div id="section-general" class="section-wrapper">
        <h2 class="section-group-title">General</h2>
        <div class="section">
          <h3 class="section-title">カード画像サイズ</h3>
          <p class="section-desc">
            公式デッキ表示ページでのカード画像のサイズを選択できます。
          </p>
          <div class="size-buttons">
            <button
              class="size-button"
              :class="{ active: settingsStore.appSettings.deckDisplayCardImageSize === 'normal' }"
              @click="handleCardImageSizeChange('normal')"
            >
              Normal
            </button>
            <button
              class="size-button"
              :class="{ active: settingsStore.appSettings.deckDisplayCardImageSize === 'small' }"
              @click="handleCardImageSizeChange('small')"
            >
              S
            </button>
            <button
              class="size-button"
              :class="{ active: settingsStore.appSettings.deckDisplayCardImageSize === 'medium' }"
              @click="handleCardImageSizeChange('medium')"
            >
              M
            </button>
            <button
              class="size-button"
              :class="{ active: settingsStore.appSettings.deckDisplayCardImageSize === 'large' }"
              @click="handleCardImageSizeChange('large')"
            >
              L
            </button>
            <button
              class="size-button"
              :class="{ active: settingsStore.appSettings.deckDisplayCardImageSize === 'xlarge' }"
              @click="handleCardImageSizeChange('xlarge')"
            >
              XL
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useSettingsStore } from '../../../stores/settings';
import { useToastStore } from '../../../stores/toast-notification';
import type { DeckDisplayCardImageSize } from '../../../types/settings';
import OverviewSection from '../sections/OverviewSection.vue';
import DeckDisplayCardDetailSection from '../sections/DeckDisplayCardDetailSection.vue';
import ShuffleSection from '../sections/ShuffleSection.vue';
import ImageCreationSection from '../sections/ImageCreationSection.vue';

type SubTab = 'overview' | 'card-detail' | 'shuffle' | 'image-creation' | 'general';

const settingsStore = useSettingsStore();
const toastStore = useToastStore();

const activeSubTab = ref<SubTab>('overview');

const handleCardImageSizeChange = (size: DeckDisplayCardImageSize) => {
  settingsStore.setDeckDisplayCardImageSize(size);
  const label = size === 'normal' ? 'Normal' :
                size === 'small' ? 'S' :
                size === 'medium' ? 'M' :
                size === 'large' ? 'L' : 'XL';
  toastStore.showToast(`カード画像サイズを「${label}」に変更しました`, 'info');
};

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
  const sections: SubTab[] = ['overview', 'card-detail', 'shuffle', 'image-creation', 'general'];
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
.deck-display-tab {
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

.section-group-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 24px 0;
}

.section {
  margin-bottom: 32px;
  padding: 24px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background-color: var(--bg-secondary);

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.section-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 20px 0;
}

.size-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.size-button {
  padding: 12px 16px;
  border: 2px solid var(--border-primary);
  background-color: var(--bg-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);

  &:hover:not(.active) {
    border-color: var(--color-info);
    background-color: var(--bg-tertiary);
  }

  &.active {
    border-color: #0068d9;
    background: linear-gradient(135deg, #0089ff 0%, #0068d9 100%);
    color: white;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 137, 255, 0.3);
  }
}

</style>
