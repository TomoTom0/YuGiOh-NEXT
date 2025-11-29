<template>
  <div class="shuffle-section">
    <h2 class="main-title">シャッフル・ソート・固定</h2>
    <p class="description">
      デッキをランダムに並べ替えたり、元に戻したりできます。特定のカードを固定してシャッフル対象から除外することも可能です。
    </p>

    <img
      src="/images/store-promo-03.webp"
      alt="公式デッキ表示画面"
      class="demo-image"
    />

    <div class="setting-group">
      <h3 class="setting-title">機能の有効/無効</h3>
      <label class="toggle-label">
        <input
          type="checkbox"
          v-model="shuffleEnabled"
          @change="handleFeatureToggle"
        />
        <span class="toggle-switch"></span>
        <span class="toggle-text">
          シャッフル機能を{{ shuffleEnabled ? '有効' : '無効' }}にする
        </span>
      </label>
    </div>

    <div class="feature-explanation">
      <h3 class="subtitle">使い方</h3>
      <ul class="usage-list">
        <li>
          <strong>シャッフル</strong>: メインデッキ枚数表示の左側。ロックしていないカードをランダムに並べ替え
        </li>
        <li>
          <strong>ソート</strong>: シャッフルボタンの右側。元の順序に戻す
        </li>
        <li>
          <strong>ロック</strong>: カード画像の右上1/4をクリック。ロックしたカードはデッキの先頭に固定
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '../../../stores/settings';

const settingsStore = useSettingsStore();
const shuffleEnabled = ref(true);

onMounted(() => {
  shuffleEnabled.value = settingsStore.featureSettings['shuffle-sort'];
});

const handleFeatureToggle = () => {
  settingsStore.toggleFeature('shuffle-sort', shuffleEnabled.value);
};
</script>

<style scoped lang="scss">
.shuffle-section {
  max-width: 900px;
}

.main-title {
  font-size: 24px;
  font-weight: 700;
  color: #202124;
  margin: 0 0 16px 0;
}

.description {
  font-size: 15px;
  color: #555;
  line-height: 1.7;
  margin: 0 0 32px 0;
}

.setting-group {
  margin-bottom: 32px;
  padding: 24px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.setting-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
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

.feature-explanation {
  margin-bottom: 32px;
}

.subtitle {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e0e0e0;
}

.usage-list {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    padding: 12px 16px;
    margin-bottom: 8px;
    background-color: #f8f9fa;
    border-radius: 4px;
    font-size: 14px;
    line-height: 1.6;

    strong {
      color: #008cff;
    }
  }
}

.demo-section {
  margin-top: 32px;
}

.demo-image {
  width: 100%;
  max-width: 700px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
