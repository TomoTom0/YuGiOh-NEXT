import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import '../styles/themes.scss';
import '../styles/common.scss';

// FOUC防止: デフォルトテーマを即座に適用
document.documentElement.setAttribute('data-theme', 'light');

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#app');
