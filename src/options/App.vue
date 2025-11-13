<template>
  <div class="options-container">
    <header class="header">
      <h1>Yu-Gi-Oh! Deck Helper - 設定</h1>
    </header>

    <div class="tabs">
      <button
        :class="['tab', { active: activeTab === 'general' }]"
        @click="activeTab = 'general'"
      >
        General
      </button>
      <button
        :class="['tab', { active: activeTab === 'omit' }]"
        @click="activeTab = 'omit'"
      >
        Omit and Usage
      </button>
      <button
        :class="['tab', { active: activeTab === 'deck-edit-settings' }]"
        @click="activeTab = 'deck-edit-settings'"
      >
        Deck Edit Settings
      </button>
      <button
        :class="['tab', { active: activeTab === 'deckedit' }]"
        @click="activeTab = 'deckedit'"
      >
        Deck Edit (Sample)
      </button>
    </div>

     <div class="tab-content">
      <!-- General Tab -->
      <div v-if="activeTab === 'general'" class="general-tab">
        <p class="placeholder">将来的な拡張機能の設定がここに表示されます。</p>
      </div>

      <!-- Omit and Usage Tab -->
      <div v-if="activeTab === 'omit'" class="omit-tab">
        <!-- 目次 (Table of Contents) -->
        <div class="toc">
          <h2>機能一覧</h2>
          <div class="toc-items">
            <div
              v-for="feature in features"
              :key="feature.id"
              class="toc-item"
              :class="{ disabled: !feature.enabled }"
            >
              <label class="toggle-label">
                <input
                  type="checkbox"
                  v-model="feature.enabled"
                  @change="saveSettings"
                />
                <span class="toggle-switch"></span>
                <span class="feature-name">{{ feature.name }}</span>
              </label>
              <button
                class="scroll-btn"
                @click="scrollToFeature(feature.id)"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <!-- 詳細セクション -->
        <div class="features-detail" ref="featuresDetail">
          <div
            v-for="feature in features"
            :key="feature.id"
            :ref="(el) => { if (el) featureRefs[feature.id] = el as HTMLElement }"
            class="feature-section"
            :class="{ disabled: !feature.enabled }"
          >
            <div class="feature-header">
              <h3>{{ feature.name }}</h3>
              <label class="toggle-label">
                <input
                  type="checkbox"
                  v-model="feature.enabled"
                  @change="saveSettings"
                />
                <span class="toggle-switch"></span>
                <span>{{ feature.enabled ? '有効' : '無効' }}</span>
              </label>
            </div>
            <p class="feature-description">{{ feature.description }}</p>
            <div class="feature-usage" v-html="feature.usage"></div>
          </div>
        </div>
      </div>

      <!-- Deck Edit Settings Tab -->
      <div v-if="activeTab === 'deck-edit-settings'" class="deck-edit-settings-tab">
        <DeckEditSettings />
      </div>

      <!-- Deck Edit Tab -->
      <div v-if="activeTab === 'deckedit'" class="deckedit-tab">
        <DeckEdit />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import DeckEdit from './DeckEdit.vue';
import DeckEditSettings from './DeckEditSettings.vue';

interface Feature {
  id: string;
  name: string;
  description: string;
  usage: string;
  enabled: boolean;
}

const activeTab = ref<'general' | 'omit' | 'deckedit' | 'deck-edit-settings'>('omit');
const featuresDetail = ref<HTMLElement | null>(null);
const featureRefs = reactive<Record<string, any>>({});

const features = reactive<Feature[]>([
  {
    id: 'shuffle-sort',
    name: 'シャッフル・ソート・固定',
    description: 'デッキのカード順序をランダムに並べ替えたり、元に戻したりする機能です。特定のカードを固定して、シャッフル時に先頭に配置し続けることも可能です。',
    usage: `
      <ul>
        <li>デッキ表示ページの「メインデッキ」枚数表示の左側にシャッフルボタンが追加されます</li>
        <li>シャッフルボタンの右側にソートボタンが追加されます</li>
        <li>カードの右上をクリックすることで、そのカードを固定/固定解除できます</li>
        <li>固定されたカードは常にデッキの先頭に配置されます</li>
      </ul>
    `,
    enabled: true
  },
  {
    id: 'deck-image',
    name: 'デッキ画像作成',
    description: 'デッキレシピを画像として保存できます。SNSでの共有やアーカイブに便利です。',
    usage: `
      <ul>
        <li>デッキ表示ページの下部右端にカメラアイコンのボタンが追加されます</li>
        <li>ボタンをクリックすると、デッキ画像作成ダイアログが開きます</li>
        <li>デッキ名のカスタマイズ、背景色の選択（赤/青）、QRコードの表示/非表示を切り替えられます</li>
        <li>ダウンロードボタンをクリックすると、画像がダウンロードされます</li>
      </ul>
    `,
    enabled: true
  }
]);

// スクロール処理
const scrollToFeature = (featureId: string) => {
  const el = featureRefs[featureId];
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// 設定の保存
const saveSettings = () => {
  const settings: Record<string, boolean> = {};
  features.forEach(feature => {
    settings[feature.id] = feature.enabled;
  });

  chrome.storage.local.set({ featureSettings: settings }, () => {
    console.log('[Options] Settings saved:', settings);
  });
};

// 設定の読み込み
const loadSettings = () => {
  chrome.storage.local.get(['featureSettings'], (result) => {
    if (result.featureSettings) {
      Object.keys(result.featureSettings).forEach(key => {
        const feature = features.find(f => f.id === key);
        if (feature) {
          feature.enabled = result.featureSettings[key];
        }
      });
    }
  });
};

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.options-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background-color: #1976d2;
  color: white;
  padding: 16px 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 20px;
  font-weight: 500;
}

.tabs {
  display: flex;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
}

.tab {
  padding: 12px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab:hover {
  background-color: #f5f5f5;
}

.tab.active {
  color: #1976d2;
  border-bottom-color: #1976d2;
}

.tab-content {
  padding: 24px;
}

.general-tab {
  background-color: white;
  padding: 48px;
  border-radius: 8px;
  text-align: center;
}

.placeholder {
  color: #999;
  font-size: 14px;
}

.omit-tab {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;
  align-items: start;
}

.toc {
  position: sticky;
  top: 24px;
  background-color: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.toc h2 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #333;
}

.toc-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.toc-item:hover {
  background-color: #f5f5f5;
}

.toc-item.disabled {
  opacity: 0.5;
}

.toc-item.disabled .feature-name {
  text-decoration: line-through;
  color: #999;
}

.scroll-btn {
  background: none;
  border: none;
  color: #1976d2;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
}

.scroll-btn:hover {
  background-color: #e3f2fd;
  border-radius: 4px;
}

.features-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-section {
  background-color: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.feature-section.disabled {
  opacity: 0.5;
  background-color: #fafafa;
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.feature-header h3 {
  font-size: 18px;
  color: #333;
}

.feature-description {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.feature-usage {
  color: #555;
  font-size: 14px;
}

.feature-usage ul {
  margin-left: 20px;
  line-height: 1.8;
}

.feature-usage li {
  margin-bottom: 8px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.toggle-label input[type="checkbox"] {
  display: none;
}

.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  background-color: #ccc;
  border-radius: 10px;
  transition: background-color 0.2s;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-label input[type="checkbox"]:checked + .toggle-switch {
  background-color: #1976d2;
}

.toggle-label input[type="checkbox"]:checked + .toggle-switch::after {
  transform: translateX(16px);
}

.feature-name {
  flex: 1;
}
</style>
