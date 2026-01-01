<template>
  <Teleport to="body">

  <div v-if="isVisible" class="dialog-overlay" @click="$emit('close')">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h2>Settings</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="dialog-content">
        <div class="settings-grid">
          <!-- Image Size (different settings per context) -->
          <div class="setting-block">
            <div class="block-title">{{ context === 'deck-edit' ? 'Edit Image Size' : 'View Image Size' }}</div>
            <!-- deck-edit: preset (s,m,l,xl) -->
            <div v-if="context === 'deck-edit'" class="size-grid">
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
            <!-- deck-display: deckDisplayCardImageSize (normal,s,m,l,xl) -->
            <div v-else class="size-grid size-grid-5">
              <button
                v-for="size in displayImageSizes"
                :key="size.value"
                class="size-btn"
                :class="{ active: settingsStore.appSettings.deckDisplayCardImageSize === size.value }"
                @click="settingsStore.setDeckDisplayCardImageSize(size.value)"
              >
                {{ size.label }}
              </button>
            </div>
          </div>

          <!-- Theme (common) -->
          <div class="setting-block">
            <div class="block-title">Theme</div>
            <div class="toggle-row">
              <button
                v-for="theme in themes"
                :key="theme.value"
                class="toggle-btn theme-btn"
                :class="{ active: settingsStore.appSettings.theme === theme.value }"
                @click="settingsStore.setTheme(theme.value)"
              >
                {{ theme.label }}
              </button>
            </div>
          </div>

          <!-- deck-edit: Search Position -->
          <div v-if="context === 'deck-edit'" class="setting-block">
            <div class="block-title">Search Position</div>
            <div class="search-position-grid">
              <div class="position-col">
                <button
                  class="toggle-btn"
                  :class="{ active: settingsStore.appSettings.ux.searchInputPosition === 'default' }"
                  @click="settingsStore.setSearchInputPosition('default')"
                >
                  L-Bottom
                </button>
              </div>
              <div class="position-col">
                <button
                  class="toggle-btn"
                  :class="{ active: settingsStore.appSettings.ux.searchInputPosition === 'right-top' }"
                  @click="settingsStore.setSearchInputPosition('right-top')"
                >
                  R-Top
                </button>
                <button
                  class="toggle-btn"
                  :class="{ active: settingsStore.appSettings.ux.searchInputPosition === 'right-bottom' }"
                  @click="settingsStore.setSearchInputPosition('right-bottom')"
                >
                  R-Bottom
                </button>
              </div>
            </div>
          </div>

          <!-- deck-edit: Extra/Side Layout -->
          <div v-if="context === 'deck-edit'" class="setting-block">
            <div class="block-title">Extra/Side</div>
            <div class="toggle-row">
              <button
                class="toggle-btn"
                :class="{ active: settingsStore.appSettings.middleDecksLayout === 'horizontal' }"
                @click="settingsStore.setMiddleDecksLayout('horizontal')"
              >
                Horizontal
              </button>
              <button
                class="toggle-btn"
                :class="{ active: settingsStore.appSettings.middleDecksLayout === 'vertical' }"
                @click="settingsStore.setMiddleDecksLayout('vertical')"
              >
                Vertical
              </button>
            </div>
          </div>

          <!-- Right Area Width (common) -->
          <div class="setting-block">
            <div class="block-title">Right Area Width</div>
            <div class="size-grid size-grid-5">
              <button
                v-for="width in rightAreaWidths"
                :key="width.value"
                class="size-btn"
                :class="{ active: settingsStore.appSettings.ux.rightAreaWidth === width.value }"
                @click="settingsStore.setRightAreaWidth(width.value)"
              >
                {{ width.label }}
              </button>
            </div>
          </div>

          <!-- Right Area Font Size (common) -->
          <div class="setting-block">
            <div class="block-title">Right Area Font</div>
            <div class="size-grid">
              <button
                v-for="size in fontSizes"
                :key="size"
                class="size-btn"
                :class="{ active: settingsStore.appSettings.ux.rightAreaFontSize === size }"
                @click="settingsStore.setRightAreaFontSize(size)"
              >
                {{ size.toUpperCase() }}
              </button>
            </div>
          </div>

          <!-- Dialog Font (common) -->
          <div class="setting-block">
            <div class="block-title">Dialog Font</div>
            <div class="size-grid">
              <button
                v-for="size in fontSizes"
                :key="size"
                class="size-btn"
                :class="{ active: settingsStore.appSettings.dialogFontSize === size }"
                @click="settingsStore.setDialogFontSize(size)"
              >
                {{ size.toUpperCase() }}
              </button>
            </div>
          </div>

          <!-- deck-edit: Search UI Font Size -->
          <div v-if="context === 'deck-edit'" class="setting-block">
            <div class="block-title">Search UI Font</div>
            <div class="size-grid">
              <button
                v-for="size in fontSizes"
                :key="size"
                class="size-btn"
                :class="{ active: settingsStore.appSettings.searchUIFontSize === size }"
                @click="settingsStore.setSearchUIFontSize(size)"
              >
                {{ size.toUpperCase() }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import { useSettingsStore } from '../stores/settings';
import type { Theme, RightAreaFontSize, DeckDisplayCardImageSize, RightAreaWidth } from '../types/settings';

const props = withDefaults(defineProps<{
  isVisible: boolean;
  context?: 'deck-edit' | 'deck-display';
}>(), {
  context: 'deck-edit'
});

const { context } = toRefs(props);

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

const themes: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' }
];

const fontSizes: RightAreaFontSize[] = ['s', 'm', 'l', 'xl'];

const displayImageSizes: { value: DeckDisplayCardImageSize; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
  { value: 'xlarge', label: 'XL' }
];

const rightAreaWidths: { value: RightAreaWidth; label: string }[] = [
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: 'MAX-FIT', label: 'Max' }
];
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--dialog-overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog {
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.dialog-content {
  overflow-y: auto;
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
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
}

.setting-block {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px;
  min-height: 120px;
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

  &.size-grid-5 {
    grid-template-columns: repeat(3, 1fr);

    .size-btn {
      padding: 6px 8px;
      font-size: 12px;
    }

    // 4番目と5番目は2列目の下に配置
    .size-btn:nth-child(4),
    .size-btn:nth-child(5) {
      grid-column: span 1;
    }
  }
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
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.active {
    background: linear-gradient(135deg, #0089ff 0%, #0068d9 100%);
    color: white;
    border-color: #0068d9;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(0, 137, 255, 0.3);
  }
}

.toggle-row {
  display: flex;
  gap: 6px;
  flex: 1;

  .theme-btn {
    font-size: 12px;
    padding: 6px 8px;
  }
}

.toggle-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.search-position-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  flex: 1;
  
  .position-col {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
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
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.active {
    background: linear-gradient(135deg, #0089ff 0%, #0068d9 100%);
    color: white;
    border-color: #0068d9;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 137, 255, 0.3);
  }
}

.tips-section {
  margin-top: 20px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.tips-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.tips-list {
  margin: 0;
  padding: 0 0 0 16px;
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.6;

  li {
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  strong {
    color: var(--text-primary);
  }

  code {
    background: var(--bg-primary);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 11px;
  }
}

.view-mode-sections {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.view-mode-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
</style>
