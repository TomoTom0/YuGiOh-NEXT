<template>
  <div class="ui-settings-section">
    <h2 class="main-title">UI設定</h2>
    <p class="description">デッキ編集画面の表示設定</p>

    <!-- カラーテーマ -->
    <div class="setting-group">
      <h3 class="setting-title">カラーテーマ</h3>
      <div class="theme-buttons">
        <button
          v-for="themeOption in themeOptions"
          :key="themeOption.value"
          class="theme-button"
          :class="{ active: settingsStore.appSettings.theme === themeOption.value }"
          @click="handleThemeChange(themeOption.value)"
        >
          {{ themeOption.label }}
        </button>
      </div>
    </div>

    <!-- 画像サイズ -->
    <div class="setting-group">
      <h3 class="setting-title">表示する画像の大きさ</h3>
      <div class="preset-grid">
        <button
          v-for="preset in sizePresets"
          :key="preset.value"
          class="preset-button"
          :class="{ active: currentPreset === preset.value }"
          @click="handlePresetChange(preset.value)"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <!-- 検索入力欄の位置 -->
    <div class="setting-group">
      <h3 class="setting-title">検索入力欄の位置</h3>
      <div class="position-grid">
        <div class="grid-spacer"></div>
        <button
          class="position-button"
          :class="{ active: settingsStore.appSettings.ux.searchInputPosition === 'right-top' }"
          @click="handlePositionChange('right-top')"
        >
          右上（デフォルト）
        </button>
        <button
          class="position-button"
          :class="{ active: settingsStore.appSettings.ux.searchInputPosition === 'default' }"
          @click="handlePositionChange('default')"
        >
          左下
        </button>
        <button
          class="position-button"
          :class="{ active: settingsStore.appSettings.ux.searchInputPosition === 'right-bottom' }"
          @click="handlePositionChange('right-bottom')"
        >
          右下
        </button>
      </div>
    </div>

    <!-- カードリスト表示形式 -->
    <div class="setting-group">
      <h3 class="setting-title">カードリスト表示形式</h3>
      <div class="view-mode-buttons">
        <button
          class="view-mode-button"
          :class="{ active: settingsStore.appSettings.ux?.cardListViewMode?.search === 'list' }"
          @click="handleViewModeChange('search', 'list')"
          title="検索結果をリスト表示"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3,5H21V7H3V5M3,11H21V13H3V11M3,17H21V19H3V17Z" />
          </svg>
          <span>リスト</span>
        </button>
        <button
          class="view-mode-button"
          :class="{ active: settingsStore.appSettings.ux?.cardListViewMode?.search === 'grid' }"
          @click="handleViewModeChange('search', 'grid')"
          title="検索結果をグリッド表示"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3,3H11V11H3V3M13,3H21V11H13V3M3,13H11V21H3V13M13,13H21V21H13V13Z" />
          </svg>
          <span>グリッド</span>
        </button>
      </div>
    </div>

    <!-- side/extraセクションの配置 -->
    <div class="setting-group">
      <h3 class="setting-title">Side/Extraセクションの配置</h3>
      <div class="layout-buttons">
        <button
          class="layout-button horizontal"
          :class="{ active: settingsStore.appSettings.middleDecksLayout === 'horizontal' }"
          @click="handleLayoutChange('horizontal')"
        >
          <span class="layout-label">横並び（デフォルト）</span>
          <div class="layout-preview-vertical">
            <div class="preview-box">Main</div>
            <div class="preview-row">
              <div class="preview-box highlight">Extra</div>
              <div class="preview-box highlight">Side</div>
            </div>
            <div class="preview-box">Trash</div>
          </div>
        </button>
        <button
          class="layout-button vertical"
          :class="{ active: settingsStore.appSettings.middleDecksLayout === 'vertical' }"
          @click="handleLayoutChange('vertical')"
        >
          <span class="layout-label">縦並び</span>
          <div class="layout-preview-vertical">
            <div class="preview-box">Main</div>
            <div class="preview-box highlight">Extra</div>
            <div class="preview-box highlight">Side</div>
            <div class="preview-box">Trash</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Right Area 幅 -->
    <div class="setting-group">
      <h3 class="setting-title">Right Area の幅</h3>
      <div class="preset-grid">
        <button
          v-for="width in rightAreaWidths"
          :key="width"
          class="preset-button"
          :class="{ active: settingsStore.appSettings.ux.rightAreaWidth === width }"
          @click="handleRightAreaWidthChange(width)"
        >
          {{ width }}
        </button>
      </div>
    </div>

    <!-- Right Area フォントサイズ -->
    <div class="setting-group">
      <h3 class="setting-title">Right Area のフォントサイズ</h3>
      <div class="preset-grid">
        <button
          v-for="fontSize in rightAreaFontSizes"
          :key="fontSize"
          class="preset-button"
          :class="{ active: settingsStore.appSettings.ux.rightAreaFontSize === fontSize }"
          @click="handleRightAreaFontSizeChange(fontSize)"
        >
          {{ fontSize.toUpperCase() }}
        </button>
      </div>
    </div>

    <!-- ダイアログのフォントサイズ -->
    <div class="setting-group">
      <h3 class="setting-title">ダイアログのフォントサイズ</h3>
      <div class="preset-grid">
        <button
          v-for="fontSize in dialogFontSizes"
          :key="fontSize"
          class="preset-button"
          :class="{ active: settingsStore.appSettings.dialogFontSize === fontSize }"
          @click="handleDialogFontSizeChange(fontSize)"
        >
          {{ fontSize.toUpperCase() }}
        </button>
      </div>
    </div>

    <!-- 検索UIのフォントサイズ -->
    <div class="setting-group">
      <h3 class="setting-title">検索UIのフォントサイズ</h3>
      <div class="preset-grid">
        <button
          v-for="fontSize in searchUIFontSizes"
          :key="fontSize"
          class="preset-button"
          :class="{ active: settingsStore.appSettings.searchUIFontSize === fontSize }"
          @click="handleSearchUIFontSizeChange(fontSize)"
        >
          {{ fontSize.toUpperCase() }}
        </button>
      </div>
    </div>

    <!-- デッキ情報取得 -->
    <div class="setting-group">
      <h3 class="setting-title">デッキ情報取得</h3>
      <label class="toggle-label">
        <input
          type="checkbox"
          v-model="backgroundDeckInfoFetch"
          @change="handleBackgroundDeckInfoFetchToggle"
        />
        <span class="toggle-switch"></span>
        <span class="toggle-text">
          バックグラウンドでデッキ情報を更新する
        </span>
      </label>
      <label class="toggle-label">
        <input
          type="checkbox"
          v-model="updateThumbnailWithoutFetch"
          @change="handleUpdateThumbnailWithoutFetchToggle"
        />
        <span class="toggle-switch"></span>
        <span class="toggle-text">
          デッキサムネイルを作成する
        </span>
      </label>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSettingsStore } from '../../../stores/settings';
import { useToastStore } from '../../../stores/toast-notification';
import type { SearchInputPosition, MiddleDecksLayout, Theme, RightAreaWidth, RightAreaFontSize, DialogFontSize, SearchUIFontSize } from '../../../types/settings';

const settingsStore = useSettingsStore();
const toastStore = useToastStore();
const backgroundDeckInfoFetch = ref(false);
const updateThumbnailWithoutFetch = ref(false);

onMounted(() => {
  backgroundDeckInfoFetch.value = settingsStore.appSettings.backgroundDeckInfoFetch;
  updateThumbnailWithoutFetch.value = settingsStore.appSettings.updateThumbnailWithoutFetch;
});

type SizePreset = 's' | 'm' | 'l' | 'xl';

const themeOptions = [
  { value: 'light' as Theme, label: 'Light' },
  { value: 'dark' as Theme, label: 'Dark' },
  { value: 'system' as Theme, label: 'System' }
];

const sizePresets = ref([
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
  { value: 'xl', label: 'XL' }
] as const);

const rightAreaWidths = ref<RightAreaWidth[]>(['S', 'M', 'L', 'XL']);
const rightAreaFontSizes = ref<RightAreaFontSize[]>(['s', 'm', 'l', 'xl']);
const dialogFontSizes = ref<DialogFontSize[]>(['s', 'm', 'l', 'xl']);
const searchUIFontSizes = ref<SearchUIFontSize[]>(['s', 'm', 'l', 'xl']);

const currentPreset = computed<SizePreset | null>(() => {
  return settingsStore.getCurrentPreset();
});

const handlePresetChange = (preset: SizePreset) => {
  settingsStore.setCardSizePreset(preset);
  showSaveMessage(`カードサイズを「${preset.toUpperCase()}」に変更しました`);
};

const handlePositionChange = (position: SearchInputPosition) => {
  settingsStore.appSettings.ux.searchInputPosition = position;
  settingsStore.setSearchInputPosition(position);
  showSaveMessage('検索入力欄の位置を変更しました');
};

const handleLayoutChange = (layout: MiddleDecksLayout) => {
  settingsStore.appSettings.middleDecksLayout = layout;
  settingsStore.setMiddleDecksLayout(layout);
  showSaveMessage('デッキレイアウトを変更しました');
};

const handleThemeChange = (theme: Theme) => {
  settingsStore.setTheme(theme);
  showSaveMessage(`テーマを「${theme}」に変更しました`);
};

const handleViewModeChange = (section: 'search' | 'related' | 'products', mode: 'list' | 'grid') => {
  settingsStore.setCardListViewMode(section, mode);
  const modeLabel = mode === 'list' ? 'リスト' : 'グリッド';
  showSaveMessage(`カードリスト表示を「${modeLabel}」に変更しました`);
};

const handleRightAreaWidthChange = (width: RightAreaWidth) => {
  settingsStore.setRightAreaWidth(width);
  showSaveMessage(`Right Area の幅を「${width}」に変更しました`);
};

const handleRightAreaFontSizeChange = (fontSize: RightAreaFontSize) => {
  settingsStore.setRightAreaFontSize(fontSize);
  showSaveMessage(`Right Area のフォントサイズを「${fontSize.toUpperCase()}」に変更しました`);
};

const handleDialogFontSizeChange = (fontSize: DialogFontSize) => {
  settingsStore.setDialogFontSize(fontSize);
  showSaveMessage(`ダイアログのフォントサイズを「${fontSize.toUpperCase()}」に変更しました`);
};

const handleSearchUIFontSizeChange = (fontSize: SearchUIFontSize) => {
  settingsStore.setSearchUIFontSize(fontSize);
  showSaveMessage(`検索UIのフォントサイズを「${fontSize.toUpperCase()}」に変更しました`);
};

const showSaveMessage = (message: string) => {
  toastStore.showToast(message, 'info');
};

const handleBackgroundDeckInfoFetchToggle = () => {
  settingsStore.setBackgroundDeckInfoFetch(backgroundDeckInfoFetch.value);
  showSaveMessage(
    backgroundDeckInfoFetch.value
      ? 'バックグラウンドでデッキ情報を更新するようにしました'
      : 'バックグラウンドでデッキ情報を更新しないようにしました'
  );
};

const handleUpdateThumbnailWithoutFetchToggle = () => {
  settingsStore.setUpdateThumbnailWithoutFetch(updateThumbnailWithoutFetch.value);
  showSaveMessage(
    updateThumbnailWithoutFetch.value
      ? 'デッキサムネイルを作成するようにしました'
      : 'デッキサムネイルを作成しないようにしました'
  );
};
</script>

<style scoped lang="scss">
.ui-settings-section {
  max-width: 800px;
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

.theme-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 500px;
}

.theme-button {
  padding: 16px 20px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.active {
    border-color: var(--color-info);
    background: var(--color-info-bg);
    color: var(--color-info);
  }
}

.view-mode-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 300px;
}

.view-mode-button {
  padding: 14px 16px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-direction: column;

  svg {
    width: 20px;
    height: 20px;
    color: var(--text-secondary);
    transition: color 0.2s;
  }

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.active {
    border-color: var(--color-info);
    background: var(--color-info-bg);
    color: var(--color-info);

    svg {
      color: var(--color-info);
    }
  }
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.preset-button {
  padding: 12px 20px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.active {
    border-color: var(--color-info);
    background: var(--color-info-bg);
    color: var(--color-info);
  }
}

.position-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  max-width: 400px;
}

.grid-spacer {
  /* 左上は空ける */
}

.position-button {
  padding: 16px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.active {
    border-color: var(--color-info);
    background: var(--color-info-bg);
    color: var(--color-info);
    font-weight: 600;
  }
}

.layout-buttons {
  display: flex;
  gap: 16px;
}

.layout-button {
  flex: 1;
  padding: 16px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.active {
    border-color: var(--color-info);
    background: var(--color-info-bg);

    .layout-label {
      color: var(--color-info);
      font-weight: 600;
    }
  }
}

.layout-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.layout-preview-vertical {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-row {
  display: flex;
  gap: 6px;
}

.preview-box {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 3px;
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
  min-width: 40px;

  &.highlight {
    background: var(--color-info-bg);
    border: 2px solid var(--color-info);
    color: var(--color-info);
    font-weight: 600;
  }
}

.setting-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
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
  flex-shrink: 0;
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

</style>
