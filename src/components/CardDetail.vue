<template>
  <div class="card-detail-view">
    <div class="card-detail-tabs">
      <button 
        :class="{ active: cardTab === 'info' }"
        @click="$emit('tab-change', 'info')"
      >Info</button>
      <button 
        :class="{ active: cardTab === 'qa' }"
        @click="$emit('tab-change', 'qa')"
      >Q&A</button>
      <button 
        :class="{ active: cardTab === 'related' }"
        @click="$emit('tab-change', 'related')"
      >Related</button>
      <button 
        :class="{ active: cardTab === 'products' }"
        @click="$emit('tab-change', 'products')"
      >Products</button>
    </div>
    
    <div class="card-tab-content">
      <CardInfo v-if="cardTab === 'info' && card" :card="card" />
      <div v-else-if="cardTab === 'info' && !card">
        <p class="no-card-selected">カードを選択してください</p>
      </div>
      <div v-else-if="cardTab === 'qa'">
        <p>Q&A情報</p>
      </div>
      <div v-else-if="cardTab === 'related'">
        <p>関連カード</p>
      </div>
      <div v-else-if="cardTab === 'products'">
        <p>収録パック</p>
      </div>
    </div>
  </div>
</template>

<script>
import CardInfo from './CardInfo.vue'

export default {
  name: 'CardDetail',
  components: {
    CardInfo
  },
  props: {
    card: {
      type: Object,
      default: null
    },
    cardTab: {
      type: String,
      default: 'info'
    }
  },
  emits: ['tab-change']
}
</script>

<style lang="scss" scoped>
.card-detail-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card-detail-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 2px solid #008cff;
  
  button {
    padding: 8px;
    border: none;
    background: white;
    cursor: pointer;
    font-size: 12px;
    color: #333;
    
    &.active {
      background: #008cff;
      color: white;
    }
  }
}

.card-tab-content {
  padding: 15px;
  flex: 1;
  overflow-y: auto;
}

.no-card-selected {
  padding: 20px;
  text-align: center;
  color: #999;
}
</style>
