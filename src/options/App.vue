<template>
  <div class="options-container">
    <header class="header">
      <h1>Yugioh Neuron Helper - 設定</h1>
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
    </div>

     <div class="tab-content">
      <!-- General Tab -->
      <div v-if="activeTab === 'general'" class="general-tab">
        <h2 class="section-title">バージョン情報</h2>
        <p>Yugioh Neuron Helper v0.3.0</p>
      </div>

      <!-- Deck Edit Settings Tab -->
      <div v-if="activeTab === 'deck-edit-settings'">
        <DeckEditSettings />
      </div>

      <!-- Omit and Usage Tab -->
      <div v-if="activeTab === 'omit'" class="omit-tab">
        <h2 class="section-title">画面と機能一覧</h2>
        
        <!-- デッキ表示ページ -->
        <div class="screen-section">
          <h3 class="screen-title">デッキ表示ページ</h3>
          <p class="screen-desc">URL: <code>https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&...</code></p>
          
          <!-- 機能一覧 -->
          <div class="features-list">
            <div
              v-for="feature in deckDisplayFeatures"
              :key="feature.id"
              class="feature-section"
              :class="{ disabled: !feature.enabled }"
            >
              <div class="feature-header">
                <h4>{{ feature.name }}</h4>
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
              <div class="feature-images" v-if="feature.images && feature.images.length">
                <img
                  v-for="(img, idx) in feature.images"
                  :key="idx"
                  :src="img.src"
                  :alt="img.alt"
                  class="feature-image"
                />
              </div>
              <div class="feature-usage" v-html="feature.usage"></div>
            </div>
          </div>
        </div>

        <!-- 独自デッキ編集画面 -->
        <div class="screen-section">
          <h3 class="screen-title">独自デッキ編集画面</h3>
          <p class="screen-desc">URL: <code>https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit</code></p>
          
          <!-- 機能のON/OFF設定 -->
          <div class="features-list">
            <div
              class="feature-section"
              :class="{ disabled: !deckEditFeature.enabled }"
            >
              <div class="feature-header">
                <h4>{{ deckEditFeature.name }}</h4>
                <label class="toggle-label">
                  <input
                    type="checkbox"
                    v-model="deckEditFeature.enabled"
                    @change="saveSettings"
                  />
                  <span class="toggle-switch"></span>
                  <span>{{ deckEditFeature.enabled ? '有効' : '無効' }}</span>
                </label>
              </div>
              <p class="feature-description">{{ deckEditFeature.description }}</p>
              <div class="feature-images" v-if="deckEditFeature.images && deckEditFeature.images.length">
                <img
                  v-for="(img, idx) in deckEditFeature.images"
                  :key="idx"
                  :src="img.src"
                  :alt="img.alt"
                  class="feature-image"
                />
              </div>
              <div class="feature-usage" v-html="deckEditFeature.usage"></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import DeckEditSettings from './DeckEditSettings.vue';

interface Feature {
  id: string;
  name: string;
  description: string;
  usage: string;
  enabled: boolean;
  images?: Array<{ src: string; alt: string }>;
}

const activeTab = ref<'general' | 'omit' | 'deck-edit-settings'>('omit');

const deckEditFeature = reactive<Feature>({
  id: 'deck-edit',
  name: '独自デッキ編集画面',
  description: 'カード検索・デッキ編集・カード詳細確認を一画面で行える統合UIです。デッキの読み込み・保存、ドラッグ＆ドロップによる編集、レスポンシブデザインに対応しています。',
  images: [],
  usage: `
    <h5>主な機能</h5>
    <ul>
      <li><strong>デッキの読み込み・保存</strong>: DNO（デッキ番号）入力でデッキを読み込み、編集後に保存できます。</li>
      <li><strong>カード検索</strong>: リスト/グリッド表示切り替え、ソート機能、無限スクロールに対応。</li>
      <li><strong>デッキ編集</strong>: ドラッグ＆ドロップでカードを追加・移動。Main/Extra/Sideで同じカードは合計3枚まで。</li>
      <li><strong>カード詳細表示</strong>: Info/QA/Related/Productsタブで詳細情報を確認。</li>
      <li><strong>レスポンシブデザイン</strong>: デスクトップ/モバイル両対応。</li>
    </ul>
    <p>詳細は <a href="https://github.com/your-repo/docs/usage/deck-edit.md" target="_blank">デッキ編集機能ガイド</a> を参照してください。</p>
  `,
  enabled: true
});

const deckDisplayFeatures = reactive<Feature[]>([
  {
    id: 'shuffle-sort',
    name: 'シャッフル・ソート・固定',
    description: 'デッキのカード順序をランダムに並べ替えたり、元に戻したりする機能です。特定のカードを固定して、シャッフル時に先頭に配置し続けることも可能です。',
    images: [
      { src: '/images/shuffle-sort-animation.gif', alt: 'シャッフル・ソート・固定機能のデモ' }
    ],
    usage: `
      <h5>使い方</h5>
      <ul>
        <li><strong>シャッフルボタン</strong>: メインデッキの枚数表示の左側に表示。ロックされていないカードをランダムに並べ替えます。</li>
        <li><strong>ソートボタン</strong>: シャッフルボタンの右側に表示。カードを元の順序に戻します。</li>
        <li><strong>カードのロック</strong>: カード画像の右上1/4のエリアをクリックしてロック/解除。ロックされたカードはデッキの先頭に固定されます。</li>
      </ul>
    `,
    enabled: true
  },
  {
    id: 'deck-image',
    name: 'デッキ画像作成',
    description: 'デッキレシピを画像として保存できます。SNSでの共有やアーカイブに便利です。',
    images: [
      { src: '/images/deck-recipe-sample.png', alt: '作成された画像見本' }
    ],
    usage: `
      <h5>使い方</h5>
      <ul>
        <li>ページ下部右端のカメラアイコンのボタンをクリック</li>
        <li>ダイアログでデッキ名のカスタマイズ、背景色の選択（赤/青）、QRコードの表示/非表示を設定</li>
        <li>ダウンロードボタンをクリックして画像を保存</li>
      </ul>
    `,
    enabled: true
  }
]);

// 設定の保存
const saveSettings = () => {
  const settings: Record<string, boolean> = {};
  deckDisplayFeatures.forEach(feature => {
    settings[feature.id] = feature.enabled;
  });
  settings[deckEditFeature.id] = deckEditFeature.enabled;

  chrome.storage.local.set({ featureSettings: settings }, () => {
    console.log('[Options] Settings saved:', settings);
  });
};

// 設定の読み込み
const loadSettings = () => {
  chrome.storage.local.get(['featureSettings'], (result) => {
    if (result.featureSettings) {
      Object.keys(result.featureSettings).forEach(key => {
        const feature = deckDisplayFeatures.find(f => f.id === key);
        if (feature) {
          feature.enabled = result.featureSettings[key];
        } else if (key === deckEditFeature.id) {
          deckEditFeature.enabled = result.featureSettings[key];
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
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 24px;
  color: #333;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #1976d2;
}

.screen-section {
  background-color: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.screen-title {
  font-size: 20px;
  color: #1976d2;
  margin-bottom: 12px;
}

.screen-desc {
  color: #666;
  font-size: 14px;
  margin-bottom: 16px;
}

.screen-desc code {
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.screen-note {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
}

.screen-note a {
  color: #1976d2;
  text-decoration: none;
}

.screen-note a:hover {
  text-decoration: underline;
}

.screen-image {
  width: 100%;
  max-width: 800px;
  margin: 16px 0;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 24px;
}

.feature-section {
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fafafa;
  transition: all 0.2s;
}

.feature-section.disabled {
  opacity: 0.5;
  background-color: #f5f5f5;
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.feature-header h4 {
  font-size: 18px;
  color: #333;
  margin: 0;
}

.feature-description {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.feature-images {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.feature-image {
  max-width: 600px;
  width: 100%;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.feature-usage {
  color: #555;
  font-size: 14px;
}

.feature-usage h5 {
  font-size: 16px;
  color: #333;
  margin: 12px 0 8px 0;
}

.feature-usage ul {
  margin-left: 20px;
  line-height: 1.8;
}

.feature-usage li {
  margin-bottom: 8px;
}

.feature-list-items {
  list-style-type: disc;
  margin-left: 20px;
  line-height: 1.8;
}

.feature-list-items li {
  margin-bottom: 8px;
  color: #555;
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
</style>
