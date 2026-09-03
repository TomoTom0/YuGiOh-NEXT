<template>
  <BaseDialog :is-visible="isVisible" @close="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h2>Settings</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="dialog-tabs">
        <button
          :class="['dialog-tab', { active: activeTab === 'general' }]"
          @click="activeTab = 'general'"
        >
          General
        </button>
        <button
          :class="['dialog-tab', { active: activeTab === 'screen' }]"
          @click="activeTab = 'screen'"
        >
          {{ screenTabLabel }}
        </button>
      </div>

      <div class="dialog-content">
        <!-- General Tab -->
        <div v-if="activeTab === 'general'" class="settings-grid">
          <!-- Theme -->
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

          <!-- Right Area Width -->
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

          <!-- Right Area Font Size -->
          <FontSizeSelector
            title="Right Area Font"
            :model-value="settingsStore.appSettings.ux.rightAreaFontSize"
            @update:model-value="settingsStore.setRightAreaFontSize($event)"
          />

          <!-- Dialog Font -->
          <FontSizeSelector
            title="Dialog Font"
            :model-value="settingsStore.appSettings.dialogFontSize"
            @update:model-value="settingsStore.setDialogFontSize($event)"
          />
        </div>

        <!-- Screen-specific Tab -->
        <div v-if="activeTab === 'screen'" class="settings-grid">
          <!-- deck-edit: Edit Image Size -->
          <div v-if="effectiveContext === 'deck-edit'" class="setting-block">
            <div class="block-title">Edit Image Size</div>
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

          <!-- deck-display: View Image Size -->
          <div v-if="effectiveContext === 'deck-display'" class="setting-block">
            <div class="block-title">View Image Size</div>
            <div class="size-grid size-grid-5">
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

          <!-- practice: Practice Card Size -->
          <div v-if="effectiveContext === 'practice'" class="setting-block">
            <div class="block-title">Card Size (1P)</div>
            <div class="size-grid">
              <button
                v-for="size in practiceCardSizes"
                :key="size.value"
                class="size-btn"
                :class="{ active: settingsStore.appSettings.practiceCardSize === size.value }"
                @click="settingsStore.setPracticeCardSize(size.value)"
              >
                {{ size.label }}
              </button>
            </div>
            <div class="block-title" style="margin-top: 8px;">Card Size (2P)</div>
            <div class="size-grid">
              <button
                v-for="size in practiceCardSizes"
                :key="size.value"
                class="size-btn"
                :class="{ active: settingsStore.appSettings.practiceCardSize2P === size.value }"
                @click="settingsStore.setPracticeCardSize2P(size.value)"
              >
                {{ size.label }}
              </button>
            </div>
          </div>

          <!-- deck-edit: Search Position -->
          <div v-if="effectiveContext === 'deck-edit'" class="setting-block">
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
          <div v-if="effectiveContext === 'deck-edit'" class="setting-block">
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

          <!-- deck-edit: Search UI Font Size -->
          <FontSizeSelector
            v-if="effectiveContext === 'deck-edit'"
            title="Search UI Font"
            :model-value="settingsStore.appSettings.searchUIFontSize"
            @update:model-value="settingsStore.setSearchUIFontSize($event)"
          />

          <!-- deck-edit: Export Timestamp -->
          <div v-if="effectiveContext === 'deck-edit'" class="setting-block">
            <div class="block-title">Export Timestamp</div>
            <div class="toggle-row">
              <button
                class="toggle-btn"
                :class="{ active: settingsStore.appSettings.includeTimestampInExportFilename }"
                @click="settingsStore.setIncludeTimestampInExportFilename(true)"
              >
                Include
              </button>
              <button
                class="toggle-btn"
                :class="{ active: !settingsStore.appSettings.includeTimestampInExportFilename }"
                @click="settingsStore.setIncludeTimestampInExportFilename(false)"
              >
                Exclude
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, toRefs } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { useDeckEditStore } from '../stores/deck-edit';
import BaseDialog from './BaseDialog.vue';
import type { Theme, DeckDisplayCardImageSize, RightAreaWidth, CardSize } from '../types/settings';
import FontSizeSelector from './FontSizeSelector.vue';

type SettingsContext = 'deck-edit' | 'deck-display' | 'practice';
type Tab = 'general' | 'screen';

const props = withDefaults(defineProps<{
  isVisible: boolean;
  context?: SettingsContext;
}>(), {
  context: 'deck-edit'
});

defineEmits<{
  close: [];
}>();

const settingsStore = useSettingsStore();
const deckStore = useDeckEditStore();
const activeTab = ref<Tab>('general');

const effectiveContext = computed((): SettingsContext => {
  if (props.context === 'deck-display') return 'deck-display';
  return deckStore.activeTab === 'practice' ? 'practice' : 'deck-edit';
});

const screenTabLabel = computed((): string => {
  switch (effectiveContext.value) {
    case 'deck-edit': return 'Deck Edit';
    case 'deck-display': return 'Deck Display';
    case 'practice': return 'Practice';
    default: return 'Settings';
  }
});

const presets: { value: 's' | 'm' | 'l' | 'xl'; label: string }[] = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
  { value: 'xl', label: 'XL' }
];

const practiceCardSizes: { value: CardSize; label: string }[] = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
  { value: 'xlarge', label: 'XL' }
];

const themes: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' }
];

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
.dialog {
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 500px;
  max-width: 90vw;
  height: min(60vh, 560px);
  max-height: 90vh;
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

.dialog-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-primary);
}

.dialog-tab {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;

  &:hover:not(.active) {
    color: var(--text-primary);
    background: var(--bg-secondary);
  }

  &.active {
    color: var(--color-info);
    border-bottom-color: var(--color-info);
  }
}

.dialog-content {
  overflow-y: auto;
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
</style>
