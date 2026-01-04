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
        <h3 class="section-title">キャッシュ管理</h3>
        <p class="section-desc">
          削除したい項目を選択してください。
        </p>
        <div class="cache-options">
          <label class="toggle-item">
            <input type="checkbox" v-model="cacheOptions.settings">
            <span class="toggle-label">拡張機能設定</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="cacheOptions.cardDB">
            <span class="toggle-label">カードDB</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="cacheOptions.deckInfo">
            <span class="toggle-label">デッキ情報</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="cacheOptions.deckThumbnails">
            <span class="toggle-label">デッキサムネイル</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="cacheOptions.others">
            <span class="toggle-label">その他</span>
          </label>
        </div>
        <button
          class="danger-button"
          @click="handleClearCache"
          :disabled="!hasSelectedCacheOptions"
          :class="{ disabled: !hasSelectedCacheOptions }"
        >
          選択した項目を削除
        </button>
      </div>


      <!-- ライセンス情報 -->
      <div class="section">
        <h3 class="section-title">ライセンス</h3>
        <p class="section-desc">
          本拡張機能のライセンス情報と、使用しているオープンソースライブラリの帰属情報です。
        </p>

        <details class="license-accordion">
          <summary class="license-summary">
            <span class="license-title">プロジェクトライセンス (ISC)</span>
            <svg class="chevron-icon" viewBox="0 0 24 24">
              <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
            </svg>
          </summary>
          <div class="license-content">
            <pre class="license-text">{{ projectLicense }}</pre>
          </div>
        </details>

        <details class="license-accordion">
          <summary class="license-summary">
            <span class="license-title">サードパーティライセンス</span>
            <svg class="chevron-icon" viewBox="0 0 24 24">
              <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
            </svg>
          </summary>
          <div class="license-content">
            <p class="third-party-intro">本拡張機能は以下のオープンソースライブラリを使用しています:</p>
            <ul class="third-party-list">
              <li v-for="lib in thirdPartyLibraries" :key="lib.name">
                <strong>{{ lib.name }}</strong> - {{ lib.license }}
                <span v-if="lib.copyright" class="lib-copyright">{{ lib.copyright }}</span>
              </li>
            </ul>
            <p class="third-party-note">
              詳細なライセンス情報は
              <a
                href="https://github.com/TomoTom0/YuGiOh-NEXT/blob/main/THIRD-PARTY-LICENSES.md"
                target="_blank"
                rel="noopener noreferrer"
              >THIRD-PARTY-LICENSES.md</a>
              をご確認ください。
            </p>
          </div>
        </details>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettingsStore } from '../../../stores/settings';
import { useToastStore } from '../../../stores/toast-notification';
import {
  STORAGE_KEY_DECK_INFO_CACHE,
  STORAGE_KEY_DECK_THUMBNAILS,
  STORAGE_KEY_DECK_LIST_ORDER,
  STORAGE_KEY_LAST_USED_DNO,
  STORAGE_KEY_LAST_DECK_DNO,
  CHROME_STORAGE_KEY_CLEAR_LOCAL_STORAGE_KEYS
} from '../../../constants/storage-keys';
const settingsStore = useSettingsStore();
const toastStore = useToastStore();

// プロジェクトライセンス
const projectLicense = `ISC License

Copyright (c) 2024-2025 ygo-next contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`;

// サードパーティライブラリ（自動生成JSONをインポート）
import generatedLibraries from '@/generated/third-party-libraries.json';

// Vue.jsはdevDependenciesのため自動生成に含まれないが、runtime必須なので手動追加
const thirdPartyLibraries = [
  { name: 'Vue.js', license: 'MIT', copyright: '(c) 2013-present, Yuxi (Evan) You' },
  ...generatedLibraries.map(lib => ({
    name: lib.name,
    license: lib.license,
    copyright: lib.copyright
  }))
];

// キャッシュ削除オプション
const cacheOptions = ref({
  cardDB: false,
  settings: false,
  deckInfo: false,
  deckThumbnails: false,
  others: false
});

// いずれかのオプションが選択されているか
const hasSelectedCacheOptions = computed(() => {
  return Object.values(cacheOptions.value).some(v => v);
});

// キャッシュ削除ハンドラー
const handleClearCache = async () => {
  try {
    const deletedItems: string[] = [];

    // 1. キャッシュカードDB
    if (cacheOptions.value.cardDB) {
      const { getUnifiedCacheDB } = await import('@/utils/unified-cache-db');
      const { getTempCardDB } = await import('@/utils/temp-card-db');

      const unifiedDB = getUnifiedCacheDB();
      await unifiedDB.clearAll();

      const tempDB = getTempCardDB();
      await tempDB.clearStorage();

      deletedItems.push('キャッシュカードDB');
    }

    // 2. 拡張機能設定
    if (cacheOptions.value.settings) {
      await settingsStore.resetSettings();
      deletedItems.push('拡張機能設定');
    }

    // 3-5. localStorage削除（Content Script起動時に削除するようフラグを設定）
    const localStorageKeys: string[] = [];
    if (cacheOptions.value.deckInfo) {
      localStorageKeys.push(STORAGE_KEY_DECK_INFO_CACHE);
      deletedItems.push('キャッシュデッキ情報');
    }
    if (cacheOptions.value.deckThumbnails) {
      localStorageKeys.push(STORAGE_KEY_DECK_THUMBNAILS);
      deletedItems.push('キャッシュデッキサムネイル');
    }
    if (cacheOptions.value.others) {
      localStorageKeys.push(STORAGE_KEY_DECK_LIST_ORDER, STORAGE_KEY_LAST_DECK_DNO, STORAGE_KEY_LAST_USED_DNO);
      deletedItems.push('その他');
    }

    // chrome.storage.localにフラグを設定（Content Script起動時に削除される）
    if (localStorageKeys.length > 0) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [CHROME_STORAGE_KEY_CLEAR_LOCAL_STORAGE_KEYS]: localStorageKeys }, () => {
          resolve();
        });
      });
    }

    // 成功メッセージ
    if (deletedItems.length > 0) {
      toastStore.showToast(`以下を削除しました: ${deletedItems.join(', ')}`, 'info');
      // チェックボックスをリセット
      cacheOptions.value = {
        cardDB: false,
        settings: false,
        deckInfo: false,
        deckThumbnails: false,
        others: false
      };
    } else {
      toastStore.showToast('削除する項目が選択されていません', 'error');
    }
  } catch (error) {
    console.error('[handleClearCache] Error:', error);
    toastStore.showToast('キャッシュの削除中にエラーが発生しました', 'error');
  }
};
</script>

<style scoped lang="scss">
.general-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
  margin: 0 40px 40px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
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

.size-buttons {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
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

  &:hover:not(.active) {
    border-color: var(--color-info);
    background-color: var(--bg-tertiary);
  }

  &.active {
    border-color: #0068d9;
    background: linear-gradient(135deg, #0089ff 0%, #0068d9 100%);
    color: white;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 137, 255, 0.3);
  }
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

  &:hover:not(:disabled) {
    background-color: var(--color-error-hover);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.16);
  }

  &:disabled,
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
  }
}


.cache-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

// ライセンスセクション
.license-accordion {
  margin-bottom: 12px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  overflow: hidden;

  &:last-child {
    margin-bottom: 0;
  }

  &[open] {
    .chevron-icon {
      transform: rotate(180deg);
    }
  }
}

.license-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--bg-primary);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--bg-tertiary);
  }

  &::-webkit-details-marker {
    display: none;
  }
}

.license-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.chevron-icon {
  width: 20px;
  height: 20px;
  fill: var(--text-secondary);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.license-content {
  padding: 16px;
  background-color: var(--bg-primary);
  border-top: 1px solid var(--border-primary);
}

.license-text {
  margin: 0;
  padding: 12px;
  font-size: 12px;
  font-family: monospace;
  line-height: 1.5;
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}

.third-party-intro {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.third-party-list {
  margin: 0 0 16px 0;
  padding: 0 0 0 20px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-primary);

  li {
    margin-bottom: 4px;

    strong {
      color: var(--text-primary);
    }
  }
}

.lib-copyright {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: 16px;
}

.third-party-note {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);

  a {
    color: var(--color-info);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
