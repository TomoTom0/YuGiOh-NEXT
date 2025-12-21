<template>
  <div class="cache-management-section">
    <h2 class="main-title">General</h2>

    <!-- タブアイコン -->
    <div class="setting-group">
      <h3 class="setting-title">タブアイコン</h3>
      <p class="setting-desc">
        デッキ編集画面のタブアイコンを拡張機能のアイコンに変更します。
      </p>
      <label class="toggle-label">
        <input
          type="checkbox"
          v-model="changeFavicon"
          @change="handleFaviconToggle"
        />
        <span class="toggle-switch"></span>
        <span class="toggle-text">
          タブアイコンを{{ changeFavicon ? '変更する' : '変更しない' }}
        </span>
      </label>
    </div>

    <!-- キャッシュ管理 -->
    <div class="setting-group">
      <h3 class="setting-title">キャッシュ管理</h3>
      <p class="setting-desc">
        カード情報やデッキデータのキャッシュを削除します。
      </p>
      <button class="danger-button" @click="handleClearCache">
        Cache DBをリセット
      </button>
    </div>

    <!-- Opt-out設定 -->
    <div class="setting-group">
      <h3 class="setting-title">機能の有効/無効</h3>
      <p class="setting-desc">
        デッキ編集画面全体の機能を無効化
      </p>
      <label class="toggle-label">
        <input
          type="checkbox"
          v-model="deckEditEnabled"
          @change="handleFeatureToggle"
        />
        <span class="toggle-switch"></span>
        <span class="toggle-text">
          デッキ編集画面を{{ deckEditEnabled ? '有効' : '無効' }}にする
        </span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '../../../stores/settings';
import { useToastStore } from '../../../stores/toast-notification';
import { getUnifiedCacheDB } from '@/utils/unified-cache-db';
import { getTempCardDB } from '@/utils/temp-card-db';

const settingsStore = useSettingsStore();
const toastStore = useToastStore();
const deckEditEnabled = ref(true);
const changeFavicon = ref(false);

onMounted(() => {
  // 機能設定を読み込み
  deckEditEnabled.value = settingsStore.featureSettings['deck-edit'];
  changeFavicon.value = settingsStore.appSettings.ux.changeFavicon;
});

const handleClearCache = async () => {
  try {
    const unifiedDB = getUnifiedCacheDB();
    await unifiedDB.clearAll();

    const tempDB = getTempCardDB();
    await tempDB.clearStorage();

    toastStore.showToast('Cache DBをリセットしました', 'info');
  } catch (error) {
    console.error('Failed to clear cache:', error);
    toastStore.showToast('Cache DBのリセットに失敗しました', 'error');
  }
};

const handleFeatureToggle = () => {
  settingsStore.toggleFeature('deck-edit', deckEditEnabled.value);
};

const handleFaviconToggle = () => {
  settingsStore.setChangeFavicon(changeFavicon.value);
};
</script>

<style scoped lang="scss">
.cache-management-section {
  max-width: 800px;
}

.main-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 24px 0;
}

.setting-group {
  margin-bottom: 24px;
  padding: 24px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
}

.setting-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.setting-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.danger-button {
  padding: 10px 20px;
  font-size: 14px;
  color: var(--button-text);
  background-color: #d32f2f;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #b71c1c;
  }
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

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
