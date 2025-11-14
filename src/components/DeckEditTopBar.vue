<template>
  <div>
    <div class="top-bar">
      <div class="top-bar-left">
        <div class="dno-display">{{ localDno || '-' }}</div>
        <div class="deck-name-group">
          <input
            v-model="localDeckName"
            type="text"
            placeholder="デッキ名"
            class="deck-name-input"
          >
          <div v-if="lastSavedDeckName" class="last-saved-name">
            {{ lastSavedDeckName }}
          </div>
        </div>
      </div>
      <div class="spacer"></div>
      <div class="top-bar-right">
        <button
          class="btn-action"
          :class="{ saving: savingState }"
          :title="savingState ? 'キャンセル' : 'save'"
          @click="handleSaveClick"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
          </svg>
        </button>
        <button class="btn-action" title="load" @click="toggleLoadDialog">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M6,4H13V9H18V20H6V4M8,12V14H16V12H8M8,16V18H13V16H8Z" />
          </svg>
        </button>
        <button class="btn-menu">⋮</button>
      </div>
    </div>

    <!-- Load Dialog -->
    <div v-if="showLoadDialog" class="dialog-overlay" @click="toggleLoadDialog">
      <div class="load-dialog" @click.stop>
        <div class="load-dialog-content">
          <div v-if="deckStore.deckList.length === 0" class="no-decks">
            デッキがありません
          </div>
          <div v-else class="deck-list">
            <div
              v-for="deck in deckStore.deckList"
              :key="deck.dno"
              class="deck-list-item"
              :class="{ selected: selectedDeckDno === deck.dno }"
              @click="selectedDeckDno = deck.dno"
            >
              <div class="deck-dno">{{ deck.dno }}</div>
              <div class="deck-name">{{ deck.name }}</div>
            </div>
          </div>
        </div>
        <div class="load-dialog-actions">
          <button @click="toggleLoadDialog" class="btn-cancel">Cancel</button>
          <button
            @click="handleLoadSelected"
            class="btn-load"
            :disabled="!selectedDeckDno"
          >
            Load
          </button>
        </div>
      </div>
    </div>

    <Toast
      :show="toast.show"
      :message="toast.message"
      :type="toast.type"
      @close="toast.show = false"
    />
  </div>
</template>

<script lang="ts">
import { ref, computed, reactive } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import Toast from './Toast.vue'

interface ToastState {
  show: boolean
  message: string
  type: string
}

export default {
  name: 'DeckEditTopBar',
  components: {
    Toast
  },
  setup() {
    const deckStore = useDeckEditStore()
    const showLoadDialog = ref(false)
    const selectedDeckDno = ref<number | null>(null)
    const savingState = ref(false)
    const saveTimer = ref<number | null>(null)
    const lastSavedDeckName = ref('')
    const toast = reactive<ToastState>({
      show: false,
      message: '',
      type: 'info'
    })

    const showToast = (message: string, type = 'info') => {
      toast.message = message
      toast.type = type
      toast.show = true
    }

    const localDno = computed(() => deckStore.deckInfo.dno || 0)
    const localDeckName = computed({
      get: () => deckStore.deckInfo.name || '',
      set: (value: string) => deckStore.setDeckName(value)
    })

    const handleSaveClick = () => {
      if (savingState.value) {
        // キャンセル
        if (saveTimer.value) {
          clearTimeout(saveTimer.value)
          saveTimer.value = null
        }
        savingState.value = false
        
        // displayOrderを元に戻す
        deckStore.restoreDisplayOrder()
        showToast('保存をキャンセルしました', 'info')
      } else {
        // 2秒後に保存
        savingState.value = true
        
        // displayOrderをバックアップ
        deckStore.backupDisplayOrder()
        
        // 公式フォーマットに並び替え
        deckStore.sortDisplayOrderForOfficial()
        
        saveTimer.value = window.setTimeout(async () => {
          try {
            if (!localDno.value) {
              showToast('dnoが設定されていません', 'warning')
              savingState.value = false
              deckStore.restoreDisplayOrder()
              return
            }
            
            // デッキ名を更新してから保存
            deckStore.setDeckName(localDeckName.value)
            
            const result = await deckStore.saveDeck(localDno.value)
            if (result.success) {
              lastSavedDeckName.value = localDeckName.value
              showToast('保存しました', 'success')
              // 保存成功時はバックアップをクリア（並び替えたままにする）
            } else {
              showToast('保存に失敗しました', 'error')
              // 保存失敗時は元に戻す
              deckStore.restoreDisplayOrder()
            }
          } catch (error) {
            console.error('Save error:', error)
            showToast('保存エラーが発生しました', 'error')
            // エラー時は元に戻す
            deckStore.restoreDisplayOrder()
          } finally {
            savingState.value = false
            saveTimer.value = null
          }
        }, 2000)
      }
    }

    const toggleLoadDialog = async () => {
      if (!showLoadDialog.value) {
        // ダイアログを開く前にデッキ一覧を取得
        await deckStore.fetchDeckList()
        selectedDeckDno.value = null
      }
      showLoadDialog.value = !showLoadDialog.value
    }

    const handleLoadSelected = async () => {
      try {
        if (!selectedDeckDno.value) {
          showToast('デッキを選択してください', 'warning')
          return
        }
        await deckStore.loadDeck(selectedDeckDno.value)
        lastSavedDeckName.value = deckStore.deckInfo.name
        showLoadDialog.value = false
        showToast('デッキを読み込みました', 'success')
      } catch (error) {
        console.error('Load error:', error)
        showToast('読み込みエラーが発生しました', 'error')
      }
    }

    return {
      deckStore,
      showLoadDialog,
      selectedDeckDno,
      savingState,
      lastSavedDeckName,
      localDno,
      localDeckName,
      toast,
      handleSaveClick,
      toggleLoadDialog,
      handleLoadSelected
    }
  }
}
</script>

<style scoped lang="scss">
.top-bar {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.top-bar-left {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  flex: 0 0 auto;
}

.spacer {
  flex: 1;
}

.top-bar-right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 0 0 auto;
}

.deck-name-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
}

.deck-name-input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 200px;
  text-align: left;
  background: white;
  color: #000;
}

.last-saved-name {
  position: absolute;
  top: 100%;
  left: 4px;
  font-size: 10px;
  color: #aaa;
  white-space: nowrap;
  margin-top: 2px;
}

.dno-display {
  width: 60px;
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
  background: var(--bg-secondary);
  color: #666;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-weight: 600;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
}

.btn-menu,
.btn-action {
  padding: 4px 8px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  width: 40px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;

  &:hover {
    background: var(--bg-secondary);
  }

  svg {
    display: block;
  }
  
  &.saving {
    pointer-events: none;
    
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid #e0e0e0;
      border-top-color: var(--theme-color-start, #00d9b8);
      animation: save-progress 2s linear;
    }
  }
}

@keyframes save-progress {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.btn-menu {
  font-size: 16px;
  font-weight: bold;
}

.btn-action {
  font-size: 12px;
  white-space: nowrap;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.load-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.load-dialog-content {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  
  .no-decks {
    text-align: center;
    padding: 40px 20px;
    color: #999;
    font-size: 14px;
  }
}

.deck-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deck-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #ccc;
    background: var(--bg-secondary);
  }
  
  &.selected {
    border-color: var(--theme-color-start, #00d9b8);
    background: linear-gradient(90deg, rgba(0,217,184,0.1) 0%, rgba(184,79,201,0.1) 100%);
  }
  
  .deck-dno {
    font-size: 14px;
    font-weight: 600;
    color: #666;
    width: 60px;
    text-align: left;
    flex-shrink: 0;
  }
  
  .deck-name {
    font-size: 14px;
    color: var(--text-primary);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }
}

.load-dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  
  button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    min-width: 80px;
    
    &.btn-cancel {
      background: white;
      color: #666;
      border: 1px solid #ddd;
      
      &:hover {
        background: var(--bg-secondary);
        border-color: #ccc;
      }
    }
    
    &.btn-load {
      background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
      color: white;
      
      &:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,217,184,0.3);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

.dialog-box {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  min-width: 300px;
  max-width: 500px;

  h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: var(--text-primary);
    border-bottom: 2px solid #4CAF50;
    padding-bottom: 8px;
  }
}

.dialog-form {
  margin: 15px 0;

  label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    color: #666;
  }
}

.dialog-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;

  button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;

    &.btn-primary {
      background: #4CAF50;
      color: white;

      &:hover {
        background: #45a049;
      }
    }

    &.btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);

      &:hover {
        background: var(--bg-tertiary);
      }
    }
  }
}
</style>
