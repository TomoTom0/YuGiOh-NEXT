<template>
  <div class="general-tab">
    <div class="section-content">
      <div class="section">
        <h3 class="section-title">リンク</h3>
        <p class="section-desc">
          プロジェクトの詳細情報や最新情報はこちらから確認できます。
        </p>
        <div class="links-container">
          <a
            href="https://github.com/TomoTom0/YuGiOh-NEXT"
            target="_blank"
            rel="noopener noreferrer"
            class="link-button"
          >
            <svg class="link-icon" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHubリポジトリ
          </a>
          <a
            href="https://github.com/TomoTom0/YuGiOh-NEXT/blob/main/docs/usage/README.md"
            target="_blank"
            rel="noopener noreferrer"
            class="link-button"
          >
            <svg class="link-icon" viewBox="0 0 24 24">
              <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
            </svg>
            使い方ドキュメント
          </a>
          <a
            href="https://github.com/TomoTom0/YuGiOh-NEXT/releases"
            target="_blank"
            rel="noopener noreferrer"
            class="link-button"
          >
            <svg class="link-icon" viewBox="0 0 24 24">
              <path d="M13,13V11H21V13H13M13,19V17H21V19H13M13,7V5H21V7H13M3,5V21H11V5H3M9,19H5V17H9V19M9,13H5V11H9V13M9,7H5V5H9V7Z" />
            </svg>
            リリースノート
          </a>
        </div>
      </div>

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
  background-color: var(--bg-primary);
  margin: 24px 40px 40px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.section-content {
  flex: 1;
  padding: 40px 48px;
  overflow-y: auto;
  background-color: var(--bg-primary);
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

.links-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.link-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--color-info);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.link-icon {
  width: 20px;
  height: 20px;
  fill: var(--color-info);
  flex-shrink: 0;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
}

.toggle-label {
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
}

.danger-button {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--button-text);
  background-color: var(--color-error);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);

  &:hover {
    background-color: var(--color-error-hover);
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
    background-color: var(--color-success-bg);
    color: var(--color-success);
    border: 1px solid var(--color-success);
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
