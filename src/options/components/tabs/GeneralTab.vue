<template>
  <div class="general-tab">
    <div class="section-content">
      <div class="section">
        <h3 class="section-title">設定リセット</h3>
        <p class="section-desc">
          全ての設定を初期値に戻します。この操作は取り消せません。
        </p>
        <button class="danger-button" @click="handleReset">
          全ての設定をリセット
        </button>
        <div v-if="resetMessage" class="message success">
          {{ resetMessage }}
        </div>
      </div>

      <!-- 将来的に有効化 -->
      <div v-if="false" class="section">
        <h3 class="section-title">カラーテーマ</h3>
        <p class="section-desc">
          現在、この機能は開発中です。
        </p>
      </div>

      <div v-if="false" class="section">
        <h3 class="section-title">言語</h3>
        <p class="section-desc">
          現在、この機能は開発中です。
        </p>
      </div>
    </div>

    <VersionFooter :updateDate="updateDate" :version="version" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSettingsStore } from '../../../stores/settings';
import VersionFooter from '../VersionFooter.vue';

const settingsStore = useSettingsStore();
const resetMessage = ref('');
const updateDate = ref('2025-11-27');
const version = ref('0.4.2');

const handleReset = async () => {
  if (confirm('本当に全ての設定をリセットしますか？この操作は取り消せません。')) {
    await settingsStore.resetSettings();
    resetMessage.value = '設定をリセットしました';
    setTimeout(() => {
      resetMessage.value = '';
    }, 3000);
  }
};
</script>

<style scoped lang="scss">
.general-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
  margin: 24px 40px 40px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.section-content {
  flex: 1;
  padding: 40px 48px;
  overflow-y: auto;
  background-color: #ffffff;
}

.section {
  margin-bottom: 32px;
  padding: 24px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fafafa;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #202124;
  margin: 0 0 12px 0;
}

.section-desc {
  font-size: 14px;
  color: #5f6368;
  line-height: 1.6;
  margin: 0 0 20px 0;
}

.danger-button {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background-color: #d93025;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);

  &:hover {
    background-color: #c5221f;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.16);
  }
}

.message {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 4px;
  font-size: 14px;
  animation: fadeIn 0.3s ease;

  &.success {
    background-color: #e6f4ea;
    color: #137333;
    border: 1px solid #a8dab5;
  }
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
