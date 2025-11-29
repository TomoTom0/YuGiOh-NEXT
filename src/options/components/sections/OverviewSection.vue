<template>
  <div class="overview-section">
    <h2 class="main-title">{{ title }}</h2>
    <p class="description">{{ description }}</p>

    <div class="images-grid">
      <img
        v-for="(img, index) in images"
        :key="index"
        :src="img.src"
        :alt="img.alt"
        class="screenshot"
      />
    </div>

    <div class="access-methods">
      <h3 class="subtitle">アクセス方法</h3>
      <ul class="access-list">
        <li v-for="(method, index) in accessMethods" :key="index">
          <strong>{{ method.title }}</strong>: {{ method.desc }}
          <code v-if="method.url">{{ method.url }}</code>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  type: 'deck-edit' | 'deck-display';
}>();

const title = computed(() => {
  return props.type === 'deck-edit'
    ? '独自デッキ編集画面'
    : '公式デッキ表示ページ';
});

const description = computed(() => {
  return props.type === 'deck-edit'
    ? 'カード検索、デッキ編集、カード詳細を一画面で操作できます。'
    : '公式デッキ表示ページにシャッフル機能とデッキ画像作成機能を追加します。';
});

const accessMethods = computed(() => {
  if (props.type === 'deck-edit') {
    return [
      {
        title: 'URL',
        desc: '',
        url: 'https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit'
      },
      {
        title: 'ポップアップ',
        desc: '「デッキ編集画面」ボタンをクリック',
        url: null
      },
      {
        title: '右クリック',
        desc: '拡張機能アイコンを右クリックして「デッキ編集画面を開く」',
        url: null
      }
    ];
  } else {
    return [
      {
        title: 'URL',
        desc: '公式デッキ表示ページにアクセス',
        url: 'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&...'
      },
      {
        title: 'マイデッキ',
        desc: 'デッキ名をクリック',
        url: null
      }
    ];
  }
});

const images = computed(() => {
  if (props.type === 'deck-edit') {
    // 画像1,2 = store紹介用の画像
    return [
      { src: '/images/store-promo-01.webp', alt: 'カードの簡単移動機能' },
      { src: '/images/store-promo-02.webp', alt: 'カード情報表示機能' }
    ];
  } else {
    // 画像3 = store紹介用の画像
    return [
      { src: '/images/store-promo-03.webp', alt: '公式デッキ表示画面' }
    ];
  }
});
</script>

<style scoped lang="scss">
.overview-section {
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

.access-methods {
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

.access-list {
  list-style: disc;
  padding-left: 20px;
  margin: 0;

  li {
    padding: 6px 0;
    font-size: 14px;
    line-height: 1.6;
    color: #333;

    strong {
      color: #202124;
      font-weight: 600;
    }

    code {
      display: block;
      margin-top: 4px;
      padding: 6px 8px;
      background-color: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #333;
      overflow-x: auto;
    }
  }
}

.images-section {
  margin-top: 32px;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.screenshot {
  width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
