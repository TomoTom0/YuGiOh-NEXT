import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { useSettingsStore } from '../stores/settings';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#app');

// 設定を読み込んでテーマを適用
const settingsStore = useSettingsStore();
settingsStore.loadSettings();

// テーマ属性を設定（CSS変数の解決のため）
document.documentElement.setAttribute('data-ygo-next-theme', settingsStore.effectiveTheme);
