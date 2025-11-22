<template>
  <div v-if="isVisible" class="dialog-overlay" @click="$emit('close')">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h2>Settings</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="dialog-content">
        <div class="settings-grid">
          <!-- 左上: Image Size -->
          <div class="setting-block">
            <div class="block-title">Image</div>
            <div class="size-grid">
              <button
                v-for="preset in presets"
                :key="preset.value"
                class="size-btn"
                :class="{ active: settingsStore.getCurrentPreset() === preset.value }"
                @click="settingsStore.setCardSizePreset(preset.value)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>

          <!-- 右上: Count Check -->
          <div class="setting-block">
            <div class="block-title">Count</div>
            <div class="toggle-row">
              <button
                class="toggle-btn"
                :class="{ active: settingsStore.cardLimitMode === 'all-3' }"
                @click="settingsStore.cardLimitMode = 'all-3'"
              >
                No Limit
              </button>
              <button
                class="toggle-btn"
                :class="{ active: settingsStore.cardLimitMode === 'limit-reg' }"
                @click="settingsStore.cardLimitMode = 'limit-reg'"
              >
                Limit
              </button>
            </div>
          </div>

          <!-- 左下: Search Input -->
          <div class="setting-block">
            <div class="block-title">Search</div>
            <div class="toggle-col">
              <button
                class="toggle-btn"
                :class="{ active: settingsStore.appSettings.searchInputPosition === 'section-title' }"
                @click="settingsStore.setSearchInputPosition('section-title')"
              >
                Top
              </button>
              <button
                class="toggle-btn"
                :class="{ active: settingsStore.appSettings.searchInputPosition === 'default' }"
                @click="settingsStore.setSearchInputPosition('default')"
              >
                Bottom
              </button>
            </div>
          </div>

          <!-- 右下: Reserved -->
          <div class="setting-block reserved">
            <div class="block-title">-</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '../stores/settings';

defineProps<{
  isVisible: boolean;
}>();

defineEmits<{
  close: [];
}>();

const settingsStore = useSettingsStore();

const presets: { value: 's' | 'm' | 'l' | 'xl'; label: string }[] = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
  { value: 'xl', label: 'XL' }
];
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.dialog {
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 500px;
  max-width: 90vw;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary);
  width: 100%;
  box-sizing: border-box;

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
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
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
  box-sizing: border-box;
}

.setting-block {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  height: 120px;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  &.reserved {
    opacity: 0.3;
  }
}

@media (max-width: 400px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .setting-block {
    height: auto;
    min-height: 100px;
  }
}

.block-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.size-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  flex: 1;
}

.size-btn {
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.15s;

  &:hover {
    border-color: var(--text-tertiary);
  }

  &.active {
    background: var(--text-primary);
    color: var(--bg-primary);
    border-color: var(--text-primary);
  }
}

.toggle-row {
  display: flex;
  gap: 6px;
  flex: 1;
}

.toggle-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.toggle-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;

  &:hover {
    border-color: var(--text-tertiary);
  }

  &.active {
    background: var(--text-primary);
    color: var(--bg-primary);
    border-color: var(--text-primary);
  }
}
</style>
