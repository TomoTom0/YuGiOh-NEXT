<template>
  <div class="card-detail-section">
    <h2 class="main-title">カード詳細表示</h2>
    <p class="description">
      公式デッキ表示ページの右側にカード詳細情報を表示するエリアを追加できます。
    </p>

    <div class="setting-group">
      <h3 class="setting-title">カード詳細エリア</h3>
      <label class="toggle-label">
        <input
          type="checkbox"
          v-model="settingsStore.appSettings.showCardDetailInDeckDisplay"
          @change="handleToggleCardDetail"
        />
        <span class="toggle-switch"></span>
        <span class="toggle-text">
          カード詳細エリアを表示する
        </span>
      </label>
    </div>

    <div class="setting-group">
      <h3 class="setting-title">カード画像サイズ</h3>
      <p class="sub-description">
        カード詳細エリアの表示/非表示に関わらず、デッキ表示ページのカード画像サイズを変更できます。
      </p>
      <div class="size-buttons">
        <button
          v-for="size in cardImageSizes"
          :key="size.value"
          class="size-button"
          :class="{ active: settingsStore.appSettings.deckDisplayCardImageSize === size.value }"
          @click="handleChangeCardImageSize(size.value)"
        >
          {{ size.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSettingsStore } from '../../../stores/settings';
import type { CardSize } from '../../../types/settings';

const settingsStore = useSettingsStore();

interface CardImageSizeOption {
  value: CardSize;
  label: string;
}

const cardImageSizes = ref<CardImageSizeOption[]>([
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' }
]);

const handleToggleCardDetail = () => {
  settingsStore.setShowCardDetailInDeckDisplay(settingsStore.appSettings.showCardDetailInDeckDisplay);
};

const handleChangeCardImageSize = (size: CardSize) => {
  settingsStore.setDeckDisplayCardImageSize(size);
};
</script>

<style scoped lang="scss">
.card-detail-section {
  max-width: 900px;
}

.main-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.description {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0 0 32px 0;
}

.setting-group {
  margin-bottom: 32px;
  padding: 24px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
}

.setting-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.sub-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0 12px 0;
  font-weight: 400;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.toggle-label input[type="checkbox"] {
  display: none;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  background-color: var(--border-primary);
  border-radius: 12px;
  transition: background-color 0.2s;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background-color: var(--bg-primary);
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-label input[type="checkbox"]:checked + .toggle-switch {
  background-color: var(--color-info);
}

.toggle-label input[type="checkbox"]:checked + .toggle-switch::after {
  transform: translateX(20px);
}

.toggle-text {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.size-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

  &:hover:not(:disabled) {
    border-color: var(--color-info);
    background-color: var(--bg-secondary);
  }

  &.active {
    border-color: #0068d9;
    background: linear-gradient(135deg, #0089ff 0%, #0068d9 100%);
    color: white;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 137, 255, 0.3);
  }

  &.active:disabled {
    opacity: 0.6;
  }

  &:disabled:not(.active) {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:disabled.active {
    cursor: not-allowed;
  }
}
</style>
