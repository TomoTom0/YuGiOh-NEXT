<template>
  <div>
    <div class="top-bar">
      <div class="top-bar-left">
        <input
          v-model="localDno"
          type="number"
          placeholder="dno"
          class="dno-input"
        >
        <input
          v-model="localDeckName"
          type="text"
          placeholder="デッキ名"
          class="deck-name-input"
        >
      </div>
      <div class="top-bar-right">
        <button class="btn-action" title="save" @click="toggleSaveDialog">
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

    <!-- Save Dialog -->
    <div v-if="showSaveDialog" class="dialog-overlay" @click="toggleSaveDialog">
      <div class="dialog-box" @click.stop>
        <h3>デッキを保存</h3>
        <div class="dialog-info">
          <p>dno: {{ localDno || '(未設定)' }}</p>
          <p>デッキ名: {{ localDeckName || '(未設定)' }}</p>
        </div>
        <div class="dialog-actions">
          <button @click="handleSave" class="btn-primary">Save Official</button>
          <button @click="toggleSaveDialog" class="btn-secondary">キャンセル</button>
        </div>
      </div>
    </div>

    <!-- Load Dialog -->
    <div v-if="showLoadDialog" class="dialog-overlay" @click="toggleLoadDialog">
      <div class="dialog-box" @click.stop>
        <h3>デッキを読み込み</h3>
        <div class="dialog-form">
          <label>dno:</label>
          <input
            v-model.number="loadDno"
            type="number"
            placeholder="デッキ番号を入力"
            class="dialog-input"
          >
        </div>
        <div class="dialog-actions">
          <button @click="handleLoad" class="btn-primary">Load</button>
          <button @click="toggleLoadDialog" class="btn-secondary">キャンセル</button>
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

<script>
import { ref, computed, reactive } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import Toast from './Toast.vue'

export default {
  name: 'DeckEditTopBar',
  components: {
    Toast
  },
  props: {
    dno: {
      type: Number,
      default: null
    },
    deckName: {
      type: String,
      default: ''
    }
  },
  emits: ['update:dno', 'update:deckName'],
  setup(props, { emit }) {
    const deckStore = useDeckEditStore()
    const showSaveDialog = ref(false)
    const showLoadDialog = ref(false)
    const loadDno = ref(null)
    const toast = reactive({
      show: false,
      message: '',
      type: 'info'
    })

    const showToast = (message, type = 'info') => {
      toast.message = message
      toast.type = type
      toast.show = true
    }

    const localDno = computed({
      get: () => props.dno,
      set: (value) => emit('update:dno', value)
    })

    const localDeckName = computed({
      get: () => props.deckName,
      set: (value) => emit('update:deckName', value)
    })

    const toggleSaveDialog = () => {
      showSaveDialog.value = !showSaveDialog.value
    }

    const toggleLoadDialog = () => {
      showLoadDialog.value = !showLoadDialog.value
    }

    const handleSave = async () => {
      try {
        if (!localDno.value) {
          showToast('dnoを入力してください', 'warning')
          return
        }
        const result = await deckStore.saveDeck(localDno.value)
        if (result.success) {
          showToast('保存しました', 'success')
          showSaveDialog.value = false
        } else {
          showToast('保存に失敗しました', 'error')
        }
      } catch (error) {
        console.error('Save error:', error)
        showToast('保存エラーが発生しました', 'error')
      }
    }

    const handleLoad = async () => {
      try {
        if (!loadDno.value) {
          showToast('dnoを入力してください', 'warning')
          return
        }
        await deckStore.loadDeck(loadDno.value)
        localDno.value = loadDno.value
        showLoadDialog.value = false
        showToast('デッキを読み込みました', 'success')
      } catch (error) {
        console.error('Load error:', error)
        showToast('読み込みエラーが発生しました', 'error')
      }
    }

    return {
      showSaveDialog,
      showLoadDialog,
      loadDno,
      localDno,
      localDeckName,
      toast,
      toggleSaveDialog,
      toggleLoadDialog,
      handleSave,
      handleLoad
    }
  }
}
</script>

<style scoped lang="scss">
.top-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.top-bar-left {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
}

.top-bar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.deck-name-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.dno-input {
  width: 60px;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
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

  &:hover {
    background: #f0f0f0;
  }

  svg {
    display: block;
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
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  z-index: 1000;
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
    color: #333;
    border-bottom: 2px solid #4CAF50;
    padding-bottom: 8px;
  }
}

.dialog-info {
  margin: 15px 0;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;

  p {
    margin: 5px 0;
    font-size: 14px;
    color: #666;
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
      background: #ddd;
      color: #333;

      &:hover {
        background: #ccc;
      }
    }
  }
}
</style>
