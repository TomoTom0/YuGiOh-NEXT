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
      <CardInfo 
        v-show="cardTab === 'info'" 
        v-if="card" 
        :card="card"
        :supplement-info="faqListData?.supplementInfo"
        :supplement-date="faqListData?.supplementDate"
      />
      <div v-show="cardTab === 'info' && !card">
        <p class="no-card-selected">カードを選択してください</p>
      </div>
      
      <div v-show="cardTab === 'qa'">
        <div v-if="loading" class="loading">読み込み中...</div>
        <div v-else-if="!faqListData || !faqListData.faqs || faqListData.faqs.length === 0" class="no-data">
          Q&A情報がありません
        </div>
        <div v-else>
          <div class="qa-header">
            <div class="qa-card-name">{{ faqListData.cardName }}</div>
            <div v-if="faqListData.cardText" class="qa-card-text">{{ faqListData.cardText }}</div>
          </div>
          <div class="qa-list">
            <div v-for="(qa, index) in faqListData.faqs" :key="qa.faqId || index" class="qa-item">
              <div class="qa-question">Q: {{ qa.question }}</div>
              <div v-if="qa.answer" class="qa-answer">A: {{ qa.answer }}</div>
              <div v-if="qa.updatedAt" class="qa-date">更新日: {{ qa.updatedAt }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-show="cardTab === 'related'">
        <div v-if="loading" class="loading">読み込み中...</div>
        <div v-else-if="!detail || !detail.relatedCards || detail.relatedCards.length === 0" class="no-data">
          関連カード情報がありません
        </div>
        <CardListView v-else :cards="detail.relatedCards" />
      </div>
      
      <div v-show="cardTab === 'products'">
        <div v-if="loading" class="loading">読み込み中...</div>
        <div v-else-if="!detail || !detail.packs || detail.packs.length === 0" class="no-data">
          収録パック情報がありません
        </div>
        <div v-else class="pack-list">
          <div v-for="pack in groupedPacks" :key="`${pack.code}_${pack.name}`" class="pack-item">
            <div class="pack-name">{{ pack.name }}</div>
            <div class="pack-details">
              <div class="pack-date">{{ pack.releaseDate || '-' }}</div>
              <div class="pack-code">{{ pack.code || '-' }}</div>
              <div class="pack-rarities">{{ pack.rarities }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, computed } from 'vue'
import CardInfo from './CardInfo.vue'
import CardListView from './CardListView.vue'
import { getCardDetail } from '../api/card-search'
import { getCardFAQList } from '../api/card-faq'

export default {
  name: 'CardDetail',
  components: {
    CardInfo,
    CardListView
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
  emits: ['tab-change'],
  setup(props) {
    const detail = ref(null)
    const loading = ref(false)
    const faqListData = ref(null)
    
    const groupedPacks = computed(() => {
      if (!detail.value || !detail.value.packs) return []
      
      // 品番ごとにレアリティを集約
      const packMap = new Map()
      
      detail.value.packs.forEach(pack => {
        const key = `${pack.code}_${pack.name}`
        if (!packMap.has(key)) {
          packMap.set(key, {
            name: pack.name,
            code: pack.code,
            releaseDate: pack.releaseDate,
            rarities: []
          })
        }
        if (pack.rarity) {
          packMap.get(key).rarities.push(pack.rarity)
        }
      })
      
      // レアリティをカンマ区切りに
      return Array.from(packMap.values()).map(pack => ({
        ...pack,
        rarities: pack.rarities.join(', ') || '-'
      }))
    })
    
    const fetchDetail = async () => {
      if (!props.card || !props.card.cardId) {
        detail.value = null
        faqListData.value = null
        return
      }
      
      // 既に同じカードの詳細を取得済みなら再取得しない
      if (detail.value && detail.value.card.cardId === props.card.cardId) {
        return
      }
      
      loading.value = true
      try {
        const [detailResult, faqResult] = await Promise.all([
          getCardDetail(props.card.cardId),
          getCardFAQList(props.card.cardId)
        ])
        detail.value = detailResult
        faqListData.value = faqResult
      } catch (error) {
        console.error('Failed to fetch card detail:', error)
        detail.value = null
        faqListData.value = null
      } finally {
        loading.value = false
      }
    }
    
    // カードが変わったら詳細を取得
    watch(() => props.card, fetchDetail, { immediate: true })
    
    return {
      detail,
      loading,
      groupedPacks,
      faqListData
    }
  }
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
  width: 100%;
  
  button {
    padding: 8px;
    border: none;
    background: white;
    cursor: pointer;
    font-size: 12px;
    color: #333;
    flex: 1;
    
    &.active {
      background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
      color: white;
    }
  }
}

.card-tab-content {
  padding: 15px;
  flex: 1;
  overflow-y: auto;
}

.no-card-selected,
.no-data {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 12px;
}

.loading {
  padding: 20px;
  text-align: center;
  color: #666;
  font-size: 12px;
}

.qa-header {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
}

.qa-card-name {
  font-size: 13px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.qa-card-text {
  font-size: 11px;
  color: #666;
  line-height: 1.6;
  white-space: pre-line;
  margin-bottom: 8px;
}

.qa-supplement {
  font-size: 11px;
  color: #e67e00;
  line-height: 1.6;
  padding: 6px 8px;
  background: #fff8e1;
  border-left: 3px solid #ff9800;
  border-radius: 2px;
}

.qa-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.qa-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  background: #fafafa;
}

.qa-question {
  font-weight: bold;
  font-size: 12px;
  color: #333;
  margin-bottom: 8px;
}

.qa-answer {
  font-size: 11px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 5px;
}

.qa-date {
  font-size: 10px;
  color: #999;
  text-align: right;
}

.pack-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.pack-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 10px;
  background: #fafafa;
  width: 100%;
  box-sizing: border-box;
}

.pack-name {
  font-size: 12px;
  font-weight: bold;
  color: #333;
  margin-bottom: 6px;
  width: 100%;
}

.pack-details {
  display: grid;
  grid-template-columns: 90px 110px 1fr;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.pack-date {
  font-size: 10px;
  color: #666;
  width: 90px;
}

.pack-code {
  font-size: 10px;
  color: #333;
  width: 110px;
}

.pack-rarities {
  font-size: 10px;
  color: #666;
  text-align: left;
}
</style>
