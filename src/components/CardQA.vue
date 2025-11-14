<template>
  <div class="card-qa">
    <div v-if="loading" class="loading">読み込み中...</div>
    <div v-else-if="!faqListData || !faqListData.faqs || faqListData.faqs.length === 0" class="no-data">
      Q&A情報がありません
    </div>
    <div v-else>
      <div class="qa-header">
        <div class="qa-card-name">{{ faqListData.cardName }}</div>
      </div>
      <div class="qa-list">
        <div v-for="(qa, index) in faqListData.faqs" :key="qa.faqId || index" class="qa-item">
          <div class="qa-question">
            Q:
            <template v-for="(part, partIndex) in parseCardLinks(qa.question)" :key="partIndex">
              <span
                v-if="part.type === 'link'"
                class="card-link"
                @click="handleCardLinkClick(part.cardId)"
              >
                {{ part.text }}
              </span>
              <span v-else>{{ part.text }}</span>
            </template>
          </div>
          <div class="qa-footer">
            <button
              v-if="!expandedQA[qa.faqId]"
              class="qa-expand-btn"
              @click="expandQA(qa.faqId)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
              </svg>
            </button>
            <div v-if="qa.updatedAt" class="qa-date">更新日: {{ qa.updatedAt }}</div>
          </div>
          <transition name="qa-expand">
            <div v-if="expandedQA[qa.faqId]" class="qa-answer-container">
              <div v-if="loadingQA[qa.faqId]" class="qa-loading">読み込み中...</div>
              <div v-else-if="qaAnswers[qa.faqId]" class="qa-answer">
                A:
                <template v-for="(part, partIndex) in parseCardLinks(qaAnswers[qa.faqId])" :key="partIndex">
                  <span
                    v-if="part.type === 'link'"
                    class="card-link"
                    @click="handleCardLinkClick(part.cardId)"
                  >
                    {{ part.text }}
                  </span>
                  <span v-else>{{ part.text }}</span>
                </template>
                <button
                  class="qa-collapse-btn-sticky"
                  @click="collapseQA(qa.faqId)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19,13H5V11H19V13Z" />
                  </svg>
                </button>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { getFAQDetail } from '../api/card-faq'
import { useDeckEditStore } from '../stores/deck-edit'
import { useCardLinks } from '../composables/useCardLinks'

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
    const deckStore = useDeckEditStore()
    const expandedQA = ref({})
    const loadingQA = ref({})
    const qaAnswers = ref({})
    const { parseCardLinks, handleCardLinkClick } = useCardLinks()

    const expandQA = async (faqId) => {
      // 既にキャッシュがある場合は再取得せずに展開
      if (qaAnswers.value[faqId]) {
        expandedQA.value[faqId] = true
        return
      }

      loadingQA.value[faqId] = true
      expandedQA.value[faqId] = true

      try {
        const faqDetail = await getFAQDetail(faqId)
        qaAnswers.value[faqId] = faqDetail.answer
      } catch (error) {
        console.error('FAQ詳細の取得に失敗しました:', error)
        qaAnswers.value[faqId] = 'エラーが発生しました'
      } finally {
        loadingQA.value[faqId] = false
      }
    }

    const collapseQA = (faqId) => {
      // faqIdから該当のDOM要素を見つける
      const qaItems = document.querySelectorAll('.qa-item')
      let targetItem = null

      qaItems.forEach((item) => {
        const btn = item.querySelector('.qa-collapse-btn-sticky')
        if (btn && btn.closest('.qa-item') === item) {
          // このアイテムが展開されているか確認
          if (expandedQA.value[faqId]) {
            targetItem = item
          }
        }
      })

      if (!targetItem) {
        expandedQA.value[faqId] = false
        return
      }

      const qaAnswer = targetItem.querySelector('.qa-answer')
      if (!qaAnswer) {
        expandedQA.value[faqId] = false
        return
      }

      const heightDiff = qaAnswer.offsetHeight
      expandedQA.value[faqId] = false

      setTimeout(() => {
        const container = targetItem.closest('.card-tab-content')
        if (container && heightDiff > 0) {
          const qaItemTop = targetItem.getBoundingClientRect().top
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
      collapseQA,
      parseCardLinks,
      handleCardLinkClick
    }
  }
}
</script>

<style lang="scss" scoped>
.card-qa {
  width: 100%;
  box-sizing: border-box;

  * {
    box-sizing: border-box;
  }
}

.loading, .no-data {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 12px;
}

.qa-header {
  margin-bottom: 12px;
}

.qa-card-name {
  font-weight: bold;
  font-size: 14px;
  color: #333;
}

.qa-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qa-item {
  width: 100%;
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

.card-link {
  color: #0066cc;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #0052a3;
    text-decoration: underline;
  }
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
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
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
    transform: scale(1.08);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    display: block;
    width: 16px;
    height: 16px;
  }
}

// FAQ展開/縮小のトランジション
.qa-expand-enter-active {
  animation: qa-expand-in 0.3s ease-out;
}

.qa-expand-leave-active {
  animation: qa-expand-out 0.2s ease-in;
}

@keyframes qa-expand-in {
  0% {
    max-height: 0;
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    max-height: 1000px;
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes qa-expand-out {
  0% {
    max-height: 1000px;
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    max-height: 0;
    opacity: 0;
    transform: translateY(-10px);
  }
}
</style>
