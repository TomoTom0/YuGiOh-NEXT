<template>
  <div class="cache-management-section">
    <h2 class="main-title">General</h2>

    <!-- キャッシュ管理 -->
    <div class="setting-group">
      <h3 class="setting-title">キャッシュ管理</h3>
      <p class="setting-desc">
        カード情報やデッキデータのキャッシュを削除します。
      </p>
      <button class="danger-button" @click="handleClearCache">
        Cache DBをリセット
      </button>
      <div v-if="cacheMessage" class="message" :class="{ error: cacheError }">
        {{ cacheMessage }}
      </div>
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

const settingsStore = useSettingsStore();
const cacheMessage = ref('');
const cacheError = ref(false);
const deckEditEnabled = ref(true);

onMounted(() => {
  // 機能設定を読み込み
  deckEditEnabled.value = settingsStore.featureSettings['deck-edit'];
});

const handleClearCache = async () => {
  try {
    const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db');
    const { getTempCardDB } = await import('@/utils/temp-card-db');

    const unifiedDB = getUnifiedCacheDB();
    await unifiedDB.clearAll();

    const tempDB = getTempCardDB();
    await tempDB.clearStorage();

    cacheMessage.value = 'Cache DBをリセットしました';
    cacheError.value = false;
    setTimeout(() => {
      cacheMessage.value = '';
    }, 3000);
  } catch (error) {
    console.error('Failed to clear cache:', error);
    cacheMessage.value = 'Cache DBのリセットに失敗しました';
    cacheError.value = true;
    setTimeout(() => {
      cacheMessage.value = '';
    }, 3000);
  }
};

const handleFeatureToggle = () => {
  settingsStore.toggleFeature('deck-edit', deckEditEnabled.value);
};
</script>

<style scoped lang="scss">
.cache-management-section {
  max-width: 800px;
}

.main-title {
  font-size: 24px;
  font-weight: 700;
  color: #202124;
  margin: 0 0 24px 0;
}

.setting-group {
  margin-bottom: 24px;
  padding: 24px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.setting-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.setting-desc {
  font-size: 13px;
  color: #666;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.danger-button {
  padding: 10px 20px;
  font-size: 14px;
  color: white;
  background-color: #d32f2f;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #b71c1c;
  }
}

.message {
  margin-top: 12px;
  padding: 10px 16px;
  border-radius: 4px;
  font-size: 13px;
  animation: fadeIn 0.3s ease;
  background-color: #d1f4e0;
  color: #0f5132;

  &.error {
    background-color: #f8d7da;
    color: #721c24;
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
  background-color: #ccc;
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
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-label input[type="checkbox"]:checked + .toggle-switch {
  background-color: #1a73e8;
}

.toggle-label input[type="checkbox"]:checked + .toggle-switch::after {
  transform: translateX(20px);
}

.toggle-text {
  font-size: 14px;
  color: #333;
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
