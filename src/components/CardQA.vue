<template>
  <div class="card-qa">
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
          <div class="qa-footer">
            <button 
              v-if="!expandedQA[index]"
              class="qa-expand-btn"
              @click="expandQA(qa.faqId, index)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
              </svg>
            </button>
            <div v-if="qa.updatedAt" class="qa-date">更新日: {{ qa.updatedAt }}</div>
          </div>
          <div v-if="expandedQA[index]" class="qa-answer-container">
            <div v-if="loadingQA[index]" class="qa-loading">読み込み中...</div>
            <div v-else-if="qaAnswers[index]" class="qa-answer">
              A: {{ qaAnswers[index] }}
              <button 
                class="qa-collapse-btn-sticky"
                @click="collapseQA(index)"
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
  </div>
</template>

<script>
import { ref } from 'vue'
import { getFAQDetail } from '../api/card-faq'

export default {
  name: 'CardQA',
  props: {
    faqListData: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  setup() {
    const expandedQA = ref({})
    const loadingQA = ref({})
    const qaAnswers = ref({})
    
    const expandQA = async (faqId, index) => {
      if (qaAnswers.value[index]) {
        expandedQA.value[index] = true
        return
      }
      
      loadingQA.value[index] = true
      expandedQA.value[index] = true
      
      try {
        const faqDetail = await getFAQDetail(faqId)
        qaAnswers.value[index] = faqDetail.answer
      } catch (error) {
        console.error('FAQ詳細の取得に失敗しました:', error)
        qaAnswers.value[index] = 'エラーが発生しました'
      } finally {
        loadingQA.value[index] = false
      }
    }
    
    const collapseQA = (index) => {
      const qaItem = document.querySelectorAll('.qa-item')[index]
      if (!qaItem) {
        expandedQA.value[index] = false
        return
      }
      
      const qaAnswer = qaItem.querySelector('.qa-answer')
      if (!qaAnswer) {
        expandedQA.value[index] = false
        return
      }
      
      const heightDiff = qaAnswer.offsetHeight
      expandedQA.value[index] = false
      
      setTimeout(() => {
        const container = qaItem.closest('.card-tab-content')
        if (container && heightDiff > 0) {
          const qaItemTop = qaItem.getBoundingClientRect().top
          const containerTop = container.getBoundingClientRect().top
          
          if (qaItemTop < containerTop + container.clientHeight) {
            container.scrollTo({
              top: Math.max(0, container.scrollTop - heightDiff),
              behavior: 'smooth'
            })
          }
        }
      }, 50)
    }
    
    return {
      expandedQA,
      loadingQA,
      qaAnswers,
      expandQA,
      collapseQA
    }
  }
}
</script>

<style lang="scss" scoped>
.card-qa {
  width: 100%;
}

.loading, .no-data {
  padding: 20px;
  text-align: center;
  color: #999;
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
  font-weight: bold;
  font-size: 13px;
  margin-bottom: 5px;
  color: #333;
}

.qa-card-text {
  font-size: 11px;
  color: #666;
  line-height: 1.4;
}

.qa-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qa-item {
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  position: relative;
}

.qa-question {
  font-size: 12px;
  color: #333;
  font-weight: 500;
  margin-bottom: 4px;
  line-height: 1.5;
}

.qa-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  min-height: 24px;
}

.qa-date {
  font-size: 10px;
  color: #999;
  flex: 1;
  text-align: right;
}

.qa-expand-btn {
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
  flex-shrink: 0;
  
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

.qa-answer-container {
  margin-top: 8px;
}

.qa-loading {
  padding: 10px;
  text-align: center;
  color: #666;
  font-size: 11px;
}

.qa-answer {
  font-size: 11px;
  color: #333;
  line-height: 1.6;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
  white-space: pre-wrap;
  position: relative;
  padding-bottom: 35px;
}

.qa-collapse-btn-sticky {
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: all 0.2s;
  margin-top: 8px;
  
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
</style>
