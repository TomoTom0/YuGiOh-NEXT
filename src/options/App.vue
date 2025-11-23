<template>
  <div class="options-container">
    <header class="header">
      <h1>遊戯王NEXT - 設定</h1>
    </header>

    <div class="tabs">
      <button
        :class="['tab', { active: activeTab === 'general' }]"
        @click="activeTab = 'general'"
      >
        設定
      </button>
      <button
        :class="['tab', { active: activeTab === 'omit' }]"
        @click="activeTab = 'omit'"
      >
        機能一覧
      </button>
      <button
        v-if="false"
        :class="['tab', { active: activeTab === 'deck-edit-settings' }]"
        @click="activeTab = 'deck-edit-settings'"
      >
        Deck Edit Settings
      </button>
    </div>

     <div class="tab-content">
      <!-- General Tab -->
      <div v-if="activeTab === 'general'" class="general-tab">
        <SettingsPanel />
      </div>

      <!-- Deck Edit Settings Tab -->
      <div v-if="false && activeTab === 'deck-edit-settings'">
        <DeckEditSettings />
      </div>

      <!-- Omit and Usage Tab -->
      <div v-if="activeTab === 'omit'" class="omit-tab">
        <h2 class="section-title">画面と機能一覧</h2>

        <div class="layout-container">
          <!-- サイドバーナビゲーション -->
          <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
            <button class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
              {{ sidebarCollapsed ? '▶' : '◀' }}
            </button>
            <nav v-if="!sidebarCollapsed" class="sidebar-nav">
              <a href="#deck-edit-screen" class="nav-item" @click.prevent="scrollToSection('deck-edit-screen')">独自デッキ編集画面</a>
              <a href="#deck-display-page" class="nav-item" @click.prevent="scrollToSection('deck-display-page')">公式デッキ表示ページ</a>
            </nav>
          </aside>

          <!-- メインコンテンツ -->
          <div class="main-content">
            <!-- 独自デッキ編集画面 -->
            <div id="deck-edit-screen" class="screen-section">
              <div class="screen-header">
                <h3 class="screen-title">独自デッキ編集画面</h3>
                <label class="toggle-label">
                  <input
                    type="checkbox"
                    v-model="deckEditScreen.enabled"
                    @change="saveSettings"
                  />
                  <span class="toggle-switch"></span>
                  <span>{{ deckEditScreen.enabled ? '有効' : '無効' }}</span>
                </label>
              </div>
              <p class="screen-desc">URL: <code>https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit</code></p>

              <!-- 機能説明 -->
              <div class="features-list">
                <div class="feature-section" :class="{ disabled: !deckEditScreen.enabled }">
                  <div class="feature-header">
                    <h4>デッキ編集MouseUI</h4>
                  </div>
                  <p class="feature-description">{{ deckEditScreen.description }}</p>
                  <div class="feature-content">
                    <div class="feature-images" v-if="deckEditScreen.images && deckEditScreen.images.length">
                      <template v-for="(img, idx) in deckEditScreen.images" :key="idx">
                        <video
                          v-if="img.isVideo"
                          :src="img.src"
                          class="feature-image"
                          autoplay
                          loop
                          muted
                          playsinline
                        ></video>
                        <img
                          v-else
                          :src="img.src"
                          :alt="img.alt"
                          class="feature-image"
                        />
                      </template>
                    </div>
                    <div class="feature-usage" v-html="deckEditScreen.usage"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 公式デッキ表示ページ -->
            <div id="deck-display-page" class="screen-section">
              <h3 class="screen-title">公式デッキ表示ページ</h3>
              <p class="screen-desc">URL: <code>https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&...</code> (opeパラメータ省略時はope=1と解釈)</p>
          
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
              <div class="feature-content">
                <div class="feature-images" v-if="feature.images && feature.images.length">
                  <template v-for="(img, idx) in feature.images" :key="idx">
                    <video
                      v-if="img.isVideo"
                      :src="img.src"
                      class="feature-image"
                      autoplay
                      loop
                      muted
                      playsinline
                    ></video>
                    <img
                      v-else
                      :src="img.src"
                      :alt="img.alt"
                      class="feature-image"
                    />
                  </template>
                </div>
                <div class="feature-usage" v-html="feature.usage"></div>
              </div>
            </div>
              </div>
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
import SettingsPanel from './SettingsPanel.vue';

interface Feature {
  id: string;
  name: string;
  description: string;
  usage: string;
  enabled: boolean;
  images?: Array<{ src: string; alt: string; isVideo?: boolean }>;
}

const activeTab = ref<'general' | 'omit' | 'deck-edit-settings'>('omit');
const sidebarCollapsed = ref(false);

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const deckEditScreen = reactive<Feature>({
  id: 'deck-edit-screen',
  name: '独自デッキ編集画面',
  description: 'カード検索・デッキ編集・カード詳細確認を一画面で行える統合UIです。デッキの読み込み・保存、ドラッグ＆ドロップによる編集、レスポンシブデザインに対応しています。',
  images: [
    { src: '/images/deck-edit-01-initial-state.webp', alt: 'デッキ編集画面の全体UI（初期状態）' },
    { src: '/images/deck-edit-07-search-function.webp', alt: 'カード検索機能（リスト表示・ソート）' },
    { src: '/images/deck-edit-03-card-detail-info.webp', alt: 'カード詳細表示（Infoタブ）' }
  ],
  usage: `
    <h5>主な機能</h5>
    <ul>
      <li><strong>デッキの読み込み・保存</strong>: DNO（デッキ番号）入力でデッキを読み込み、編集後に保存できます。</li>
      <li><strong>カード検索</strong>: リスト/グリッド表示切り替え、ソート機能、無限スクロールに対応。</li>
      <li><strong>デッキ編集</strong>: ドラッグ＆ドロップでカードを追加・移動。Main/Extra/Sideで同じカードは合計3枚まで。</li>
      <li><strong>カード詳細表示</strong>: Info/QA/Related/Productsタブで詳細情報を確認。</li>
      <li><strong>レスポンシブデザイン</strong>: デスクトップ/モバイル両対応。</li>
    </ul>
    <h5>アクセス方法</h5>
    <ul>
      <li>URL直接入力: <code>https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit</code></li>
      <li>拡張機能のポップアップから「デッキ編集画面」ボタンをクリック</li>
      <li>拡張機能アイコンの右クリックメニューから「デッキ編集画面を開く」を選択</li>
    </ul>
  `,
  enabled: true
});

const deckDisplayFeatures = reactive<Feature[]>([
  {
    id: 'shuffle-sort',
    name: 'シャッフル・ソート・固定',
    description: 'デッキのカード順序をランダムに並べ替えたり、元に戻したりする機能です。特定のカードを固定して、シャッフル時に先頭に配置し続けることも可能です。',
    images: [
      { src: '/images/shuffle-sort-animation.mp4', alt: 'シャッフル・ソート・固定機能のデモ', isVideo: true }
    ],
    usage: `
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
      { src: '/images/deck-recipe-sample.webp', alt: '作成された画像見本' }
    ],
    usage: `
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
  settings[deckEditScreen.id] = deckEditScreen.enabled;

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
        } else if (key === deckEditScreen.id || key === 'deck-edit') {
          // 旧ID 'deck-edit' との互換性を保つ
          deckEditScreen.enabled = result.featureSettings[key];
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
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.header {
  background: linear-gradient(90deg, #00d9b8 0%, #008cff 50%, #b84fc9 100%);
  color: white;
  padding: 20px 24px;
  box-shadow: 0 4px 12px rgba(0, 140, 255, 0.3);
}

.header h1 {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.tabs {
  display: flex;
  background-color: white;
  border-bottom: 2px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tab {
  padding: 14px 28px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab:hover:not(:disabled) {
  background-color: #f0f7ff;
  color: #008cff;
}

.tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tab.active {
  color: #008cff;
  border-bottom-color: #008cff;
  background-color: #f0f7ff;
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
  font-weight: 600;
  color: #333;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 3px solid;
  border-image: linear-gradient(90deg, #00d9b8, #008cff, #b84fc9) 1;
}

.screen-section {
  background-color: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 32px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;
  transition: box-shadow 0.3s;
}

.screen-section:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}

.screen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.screen-title {
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(90deg, #00d9b8, #008cff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
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
  color: #008cff;
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

.feature-content {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.feature-images {
  flex-shrink: 0;
  width: 500px;
}

.feature-image {
  max-width: 100%;
  width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.feature-usage {
  flex: 1;
  color: #555;
  font-size: 14px;
  line-height: 1.8;
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
  background: linear-gradient(90deg, #00d9b8, #008cff);
}

.toggle-label input[type="checkbox"]:checked + .toggle-switch::after {
  transform: translateX(16px);
}

/* サイドバーナビゲーション */
.layout-container {
  display: flex;
  gap: 24px;
  position: relative;
}

.sidebar {
  position: sticky;
  top: 24px;
  align-self: flex-start;
  width: 200px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: width 0.3s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 50px;
}

.sidebar-toggle {
  width: 100%;
  padding: 12px;
  background-color: #f0f0f0;
  border: none;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: background-color 0.2s;
}

.sidebar-toggle:hover {
  background-color: #e8e8e8;
  color: #008cff;
}

.sidebar-nav {
  padding: 12px 0;
}

.nav-item {
  display: block;
  padding: 12px 20px;
  color: #333;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background-color: #f5f5f5;
  color: #008cff;
  border-left-color: #008cff;
}

.main-content {
  flex: 1;
  min-width: 0;
}
</style>
