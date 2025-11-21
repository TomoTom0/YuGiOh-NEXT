<template>
  <div v-if="isVisible" class="dialog-overlay" @click="$emit('close')">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h2>設定</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="dialog-content">
        <!-- カード画像サイズ設定 -->
        <div class="setting-section">
          <h3 class="setting-title">カード画像サイズ</h3>

          <!-- デッキ編集エリア -->
          <div class="setting-item">
            <label class="setting-label">デッキ編集エリア</label>
            <div class="size-controls">
              <button
                v-for="size in cardSizes"
                :key="size"
                class="size-option-btn"
                :class="{ active: settingsStore.appSettings.deckEditCardSize === size }"
                @click="settingsStore.setDeckEditCardSize(size)"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <!-- カード詳細パネル -->
          <div class="setting-item">
            <label class="setting-label">カード詳細パネル</label>
            <div class="size-controls">
              <button
                v-for="size in cardSizes"
                :key="size"
                class="size-option-btn"
                :class="{ active: settingsStore.appSettings.infoCardSize === size }"
                @click="settingsStore.setInfoCardSize(size)"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <!-- グリッド表示 -->
          <div class="setting-item">
            <label class="setting-label">グリッド表示</label>
            <div class="size-controls">
              <button
                v-for="size in cardSizes"
                :key="size"
                class="size-option-btn"
                :class="{ active: settingsStore.appSettings.gridCardSize === size }"
                @click="settingsStore.setGridCardSize(size)"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <!-- リスト表示 -->
          <div class="setting-item">
            <label class="setting-label">リスト表示</label>
            <div class="size-controls">
              <button
                v-for="size in cardSizes"
                :key="size"
                class="size-option-btn"
                :class="{ active: settingsStore.appSettings.listCardSize === size }"
                @click="settingsStore.setListCardSize(size)"
              >
                {{ size }}
              </button>
            </div>
          </div>
        </div>

        <!-- 枚数制限設定 -->
        <div class="setting-section">
          <h3 class="setting-title">枚数制限</h3>
          <div class="setting-item">
            <label class="radio-label">
              <input
                type="radio"
                name="limitMode"
                value="all-3"
                :checked="settingsStore.cardLimitMode === 'all-3'"
                @change="updateLimitMode('all-3')"
              />
              <span>全カード3枚まで</span>
            </label>
          </div>
          <div class="setting-item">
            <label class="radio-label">
              <input
                type="radio"
                name="limitMode"
                value="limit-reg"
                :checked="settingsStore.cardLimitMode === 'limit-reg'"
                @change="updateLimitMode('limit-reg')"
              />
              <span>リミットレギュレーションに従う</span>
            </label>
          </div>
        </div>

        <!-- 検索入力欄の位置 -->
        <div class="setting-section">
          <h3 class="setting-title">検索入力欄の位置</h3>
          <div class="setting-item">
            <label class="radio-label">
              <input
                type="radio"
                name="searchInputPosition"
                value="default"
                :checked="settingsStore.appSettings.searchInputPosition === 'default'"
                @change="settingsStore.setSearchInputPosition('default')"
              />
              <span>デフォルト（画面左下）</span>
            </label>
          </div>
          <div class="setting-item">
            <label class="radio-label">
              <input
                type="radio"
                name="searchInputPosition"
                value="section-title"
                :checked="settingsStore.appSettings.searchInputPosition === 'section-title'"
                @change="settingsStore.setSearchInputPosition('section-title')"
              />
              <span>Main Sectionタイトル内</span>
            </label>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="$emit('close')">閉じる</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '../stores/settings';
import type { CardSize } from '../types/settings';

defineProps<{
  isVisible: boolean;
}>();

defineEmits<{
  close: [];
}>();

const settingsStore = useSettingsStore();

const cardSizes: CardSize[] = ['small', 'medium', 'large', 'xlarge'];

function updateLimitMode(mode: 'all-3' | 'limit-reg') {
  settingsStore.cardLimitMode = mode;
}
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.dialog {
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-primary);

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.setting-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.setting-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.setting-item {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.setting-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.size-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.size-option-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-secondary);
    border-color: var(--button-bg);
  }

  &.active {
    background: var(--button-bg);
    color: white;
    border-color: var(--button-bg);
  }

  &:active {
    transform: scale(0.95);
  }
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s;

  &:hover {
    background: var(--bg-secondary);
  }

  input[type="radio"] {
    cursor: pointer;
  }

  span {
    font-size: 13px;
    color: var(--text-primary);
  }
}

.dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-primary);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &.btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);

    &:hover {
      background: var(--bg-tertiary);
    }
  }
}
</style>
