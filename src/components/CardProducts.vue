<template>
  <div class="card-products">
    <div v-if="loading" class="loading">読み込み中...</div>
    <div v-else-if="!detail || !detail.packs || detail.packs.length === 0" class="no-data">
      収録パック情報がありません
    </div>
    <div v-else class="pack-list">
      <div v-for="pack in groupedPacks" :key="`${pack.code}_${pack.name}`" class="pack-item" :data-pack-id="pack.packId">
        <div class="pack-name">{{ pack.name }}</div>
        <div class="pack-details">
          <div class="pack-date">{{ pack.releaseDate || '-' }}</div>
          <div class="pack-code">{{ pack.code || '-' }}</div>
          <div class="pack-rarities">
            <span 
              v-for="(rarity, idx) in pack.rarities" 
              :key="idx" 
              class="rarity-badge"
              :style="{ backgroundColor: rarity.color, borderColor: rarity.color }"
            >
              {{ rarity.text }}
            </span>
          </div>
        </div>
        <button 
          v-if="!expandedPacks[pack.packId] && pack.packId"
          class="pack-expand-btn"
          @click="expandPack(pack.packId)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
          </svg>
        </button>
        <div v-if="expandedPacks[pack.packId]" class="pack-cards-container">
          <div v-if="loadingPacks[pack.packId]" class="pack-loading">読み込み中...</div>
          <div v-else-if="packCards[pack.packId]" class="pack-cards-wrapper">
            <CardList
              :cards="packCards[pack.packId]"
              :sortOrder="packSortOrders[pack.packId] || 'release_desc'"
              :viewMode="packViewModes[pack.packId] || 'list'"
              sectionType="search"
              :uniqueId="`pack-${pack.packId}`"
              @scroll-to-top="handleScrollToTop"
              @collapse="collapsePack(pack.packId)"
              @update:sortOrder="updatePackSortOrder(pack.packId, $event)"
              @update:viewMode="updatePackViewMode(pack.packId, $event)"
            />
            <button 
              class="pack-collapse-btn-sticky"
              @click="collapsePack(pack.packId)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19,13H5V11H19V13Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import CardList from './CardList.vue'

export default {
  name: 'CardProducts',
  components: {
    CardList
  },
  props: {
    detail: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const expandedPacks = ref({})
    const loadingPacks = ref({})
    const packCards = ref({})
    const packViewModes = ref({})
    const packSortOrders = ref({})
    
    const groupedPacks = computed(() => {
      if (!props.detail || !props.detail.packs) return []
      
      const packMap = new Map()
      
      props.detail.packs.forEach(pack => {
        const key = `${pack.code}_${pack.name}`
        if (!packMap.has(key)) {
          packMap.set(key, {
            name: pack.name,
            code: pack.code,
            releaseDate: pack.releaseDate,
            packId: pack.packId,
            rarities: []
          })
        } else if (pack.packId && !packMap.get(key).packId) {
          packMap.get(key).packId = pack.packId
        }
        if (pack.rarity) {
          packMap.get(key).rarities.push({
            text: pack.rarity,
            color: pack.rarityColor || '#ccc'
          })
        }
      })
      
      return Array.from(packMap.values())
    })
    
    const expandPack = async (packId) => {
      if (expandedPacks.value[packId]) return
      
      loadingPacks.value[packId] = true
      expandedPacks.value[packId] = true
      
      if (!packViewModes.value[packId]) {
        packViewModes.value = { ...packViewModes.value, [packId]: 'list' }
      }
      if (!packSortOrders.value[packId]) {
        packSortOrders.value = { ...packSortOrders.value, [packId]: 'release_desc' }
      }
      
      try {
        const url = `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&pid=${packId}&rp=99999`
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch pack cards')
        }
        
        const html = await response.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        
        const { parseSearchResults } = await import('../api/card-search')
        const cards = parseSearchResults(doc)
        
        packCards.value[packId] = cards
      } catch (error) {
        console.error('Failed to fetch pack cards:', error)
        packCards.value[packId] = []
      } finally {
        loadingPacks.value[packId] = false
      }
    }
    
    const collapsePack = (packId) => {
      const packItem = document.querySelector(`[data-pack-id="${packId}"]`)
      if (packItem) {
        const beforeHeight = packItem.scrollHeight
        
        expandedPacks.value[packId] = false
        
        setTimeout(() => {
          const afterHeight = packItem.scrollHeight
          const heightDiff = beforeHeight - afterHeight
          
          const container = packItem.closest('.card-tab-content')
          if (container && heightDiff > 0) {
            const packItemTop = packItem.getBoundingClientRect().top
            const containerTop = container.getBoundingClientRect().top
            
            if (packItemTop < containerTop + container.clientHeight) {
              container.scrollTo({
                top: Math.max(0, container.scrollTop - heightDiff),
                behavior: 'smooth'
              })
            }
          }
        }, 300)
      } else {
        expandedPacks.value[packId] = false
      }
    }
    
    const updatePackSortOrder = (packId, value) => {
      packSortOrders.value = { ...packSortOrders.value, [packId]: value }
    }
    
    const updatePackViewMode = (packId, value) => {
      packViewModes.value = { ...packViewModes.value, [packId]: value }
    }
    
    const handleScrollToTop = () => {
      const cardTabContent = document.querySelector('.card-tab-content')
      if (cardTabContent) {
        cardTabContent.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    
    return {
      groupedPacks,
      expandedPacks,
      loadingPacks,
      packCards,
      packViewModes,
      packSortOrders,
      expandPack,
      collapsePack,
      updatePackSortOrder,
      updatePackViewMode,
      handleScrollToTop
    }
  }
}
</script>

<style lang="scss" scoped>
.card-products {
  width: 100%;
}

.loading, .no-data {
  padding: 20px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
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
  background: var(--bg-secondary);
  width: 100%;
  box-sizing: border-box;
  position: relative;
  padding-bottom: 32px;
}

.pack-name {
  font-size: 12px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 6px;
  width: 100%;
}

.pack-details {
  display: grid;
  grid-template-columns: 60px 100px 1fr;
  gap: 10px;
  align-items: center;
  width: 100%;
  overflow: hidden;
}

.pack-date {
  font-size: 10px;
  color: var(--text-secondary);
  width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pack-code {
  font-size: 10px;
  color: var(--text-primary);
  width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pack-rarities {
  font-size: 10px;
  color: var(--text-secondary);
  text-align: left;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  overflow: hidden;
  min-width: 0;
}

.rarity-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: bold;
  color: white;
  border: 1px solid;
  white-space: nowrap;
}

.pack-expand-btn,
.pack-collapse-btn {
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  
  &:hover {
    background: #f0f0f0;
    border-color: #999;
  }
  
  svg {
    display: block;
    width: 14px;
    height: 14px;
  }
}

.pack-collapse-btn {
  background: #f5f5f5;
}

.pack-collapse-btn-sticky {
  position: sticky;
  bottom: 8px;
  left: 8px;
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  z-index: 5;
  
  &:hover {
    background: #f0f0f0;
    border-color: #999;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  
  svg {
    display: block;
    width: 16px;
    height: 16px;
  }
}

.pack-cards-container {
  margin-top: 8px;
  animation: expandAnswer 0.3s ease;
}

@keyframes expandAnswer {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 500px;
    opacity: 1;
  }
}

.pack-cards-wrapper {
  position: relative;
}

.pack-loading {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
