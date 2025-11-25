<template>
  <div class="top-bar-wrapper">
    <div class="top-bar">
      <div class="top-bar-left">
        <button
          class="btn-action"
          :disabled="!deckStore.canUndo"
          title="Undo (Ctrl+Z)"
          @click="handleUndo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" :d="mdiUndo" />
          </svg>
        </button>
        <button
          class="btn-action"
          :disabled="!deckStore.canRedo"
          title="Redo (Ctrl+Y)"
          @click="handleRedo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" :d="mdiRedo" />
          </svg>
        </button>
        <div class="deck-name-group">
          <span class="dno-chip">{{ localDno || '-' }}</span>
          <input
            v-model="localDeckName"
            type="text"
            :placeholder="originalDeckName || 'デッキ名'"
            class="deck-name-input"
          >
        </div>
      </div>
      <div class="top-bar-right">
        <button
          class="btn-action"
          :class="{ saving: savingState }"
          :title="savingState ? 'キャンセル' : 'save'"
          @click="handleSaveClick"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" :d="mdiContentSave" />
          </svg>
        </button>
        <button class="btn-action" title="load" @click="toggleLoadDialog">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" :d="mdiFolderOpen" />
          </svg>
        </button>
        <button class="btn-menu" @click="toggleMenu">⋮</button>

        <!-- Menu Dropdown -->
        <div v-if="showMenu" class="menu-dropdown" @click.stop>
          <button @click="handleNewDeck" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiPlusBox" />
            </svg>
            New Deck
          </button>
          <button @click="handleCopyDeck" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiContentCopy" />
            </svg>
            Copy Deck
          </button>
          <div class="menu-divider"></div>
          <button @click="handleSortAll" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiSortVariant" />
            </svg>
            Sort All Sections
          </button>
          <button @click="handleDownloadImage" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiImageOutline" />
            </svg>
            Deck Image
          </button>
          <div class="menu-divider"></div>
          <button @click="handleExportDeck" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiExport" />
            </svg>
            Export Deck
          </button>
          <button @click="handleImportDeck" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiImport" />
            </svg>
            Import Deck
          </button>
          <div class="menu-divider"></div>
          <button @click="handleOptions" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiCog" />
            </svg>
            Options
          </button>
        </div>
      </div>
    </div>

    <!-- Menu Overlay (外側クリックで閉じる用) -->
    <div v-if="showMenu" class="menu-overlay" @click="toggleMenu"></div>

    <!-- Export Dialog -->
    <ExportDialog
      :isVisible="showExportDialog"
      :deckInfo="deckStore.deckInfo"
      :dno="String(localDno)"
      @close="showExportDialog = false"
      @exported="handleExported"
    />

    <!-- Import Dialog -->
    <ImportDialog
      :isVisible="showImportDialog"
      @close="showImportDialog = false"
      @imported="handleImported"
    />

    <!-- Options Dialog -->
    <OptionsDialog
      :isVisible="showOptionsDialog"
      @close="showOptionsDialog = false"
    />

    <!-- Load Dialog -->
    <div v-if="showLoadDialog" class="dialog-overlay" @click="toggleLoadDialog">
      <div class="load-dialog" @click.stop>
        <div class="load-dialog-header">
          <h2>Load Deck</h2>
          <button class="close-btn" @click="toggleLoadDialog">×</button>
        </div>
        <div class="load-dialog-content">
          <div v-if="deckStore.deckList.length === 0" class="no-decks">
            <svg width="48" height="48" viewBox="0 0 24 24" style="margin-bottom: 12px; opacity: 0.3;">
              <path fill="currentColor" d="M20,6H12L10,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8A2,2 0 0,0 20,6M20,18H4V6H9.17L11.17,8H20V18M11,13H13V17H11V13M11,9H13V11H11V9Z" />
            </svg>
            <p>デッキがありません</p>
          </div>
          <div v-else class="deck-grid">
            <div
              v-for="deck in deckStore.deckList"
              :key="deck.dno"
              class="deck-card"
              @click="loadDeck(deck.dno)"
            >
              <div class="deck-name">{{ deck.name || '(名称未設定)' }}</div>
            </div>
          </div>
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
import { ref, computed, reactive, watch } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import Toast from './Toast.vue'
import ExportDialog from './ExportDialog.vue'
import ImportDialog from './ImportDialog.vue'
import OptionsDialog from './OptionsDialog.vue'
import { showImageDialogWithData } from '../content/deck-recipe/imageDialog'
import { sessionManager } from '../content/session/session'
import { mdiContentSave, mdiFolderOpen, mdiSortVariant, mdiImageOutline, mdiExport, mdiImport, mdiCog, mdiUndo, mdiRedo, mdiPlusBox, mdiContentCopy } from '@mdi/js'

interface ToastState {
  show: boolean
  message: string
  type: string
}

export default {
  name: 'DeckEditTopBar',
  components: {
    Toast,
    ExportDialog,
    ImportDialog,
    OptionsDialog
  },
  setup() {
    const deckStore = useDeckEditStore()
    const showLoadDialog = ref(false)
    const selectedDeckDno = ref<number | null>(null)
    const savingState = ref(false)
    const saveTimer = ref<number | null>(null)
    const originalDeckName = ref('')
    const showMenu = ref(false)
    const showExportDialog = ref(false)
    const showImportDialog = ref(false)
    const showOptionsDialog = ref(false)
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
    
    // デッキ読み込み時の名前を監視して保存
    watch(() => deckStore.deckInfo.dno, () => {
      if (deckStore.deckInfo.name) {
        originalDeckName.value = deckStore.deckInfo.name
      }
    }, { immediate: true })

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
            
            // デッキ名が空白の場合は元のデッキ名を使う
            const nameToSave = localDeckName.value || originalDeckName.value
            deckStore.setDeckName(nameToSave)
            
            const result = await deckStore.saveDeck(localDno.value)
            if (result.success) {
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
        originalDeckName.value = deckStore.deckInfo.name
        // デッキ名を空にする
        deckStore.setDeckName('')
        showLoadDialog.value = false
        showToast('デッキを読み込みました', 'success')
      } catch (error) {
        console.error('Load error:', error)
        showToast('読み込みエラーが発生しました', 'error')
      }
    }

    const loadDeck = async (dno: number) => {
      try {
        await deckStore.loadDeck(dno)
        originalDeckName.value = deckStore.deckInfo.name
        // デッキ名を空にする
        deckStore.setDeckName('')
        showLoadDialog.value = false
        showToast('デッキを読み込みました', 'success')
      } catch (error) {
        console.error('Load error:', error)
        showToast('読み込みエラーが発生しました', 'error')
      }
    }

    const toggleMenu = () => {
      showMenu.value = !showMenu.value
    }

    const handleSortAll = () => {
      deckStore.sortAllSections()
      showMenu.value = false
      showToast('全セクションをソートしました', 'success')
    }

    const handleDownloadImage = async () => {
      showMenu.value = false

      try {
        // cgidを取得
        const cgid = await sessionManager.getCgid()

        // dnoを取得
        const dnoNum = deckStore.deckInfo.dno || 0

        if (!dnoNum) {
          showToast('デッキ番号が設定されていません', 'warning')
          return
        }

        // DeckInfo形式のデータを構築
        const deckData = {
          dno: dnoNum,
          name: deckStore.deckInfo.name || '',
          mainDeck: deckStore.deckInfo.mainDeck,
          extraDeck: deckStore.deckInfo.extraDeck,
          sideDeck: deckStore.deckInfo.sideDeck,
          category: deckStore.deckInfo.category || [],
          tags: deckStore.deckInfo.tags || [],
          comment: deckStore.deckInfo.comment || '',
          deckCode: deckStore.deckInfo.deckCode || ''
        }

        // dnoを文字列に変換
        const dno = String(dnoNum)

        // ダイアログを表示
        await showImageDialogWithData(cgid, dno, deckData, null)
      } catch (error) {
        console.error('Download image error:', error)
        showToast('画像作成ダイアログの表示に失敗しました', 'error')
      }
    }

    const handleExportDeck = () => {
      showMenu.value = false
      showExportDialog.value = true
    }

    const handleExported = (format: string) => {
      showToast(`デッキを${format.toUpperCase()}形式でエクスポートしました`, 'success')
    }

    const handleImportDeck = () => {
      showMenu.value = false
      showImportDialog.value = true
    }

    const handleOptions = () => {
      showMenu.value = false
      showOptionsDialog.value = true
    }

    const handleImported = (deckInfo: any, replaceExisting: boolean) => {
      if (replaceExisting) {
        // 既存のデッキを置き換え
        deckStore.deckInfo.mainDeck = []
        deckStore.deckInfo.extraDeck = []
        deckStore.deckInfo.sideDeck = []
      }

      // インポートされたカードを追加
      deckInfo.mainDeck.forEach((entry: any) => {
        for (let i = 0; i < entry.quantity; i++) {
          deckStore.addCard(entry.card, 'main')
        }
      })

      deckInfo.extraDeck.forEach((entry: any) => {
        for (let i = 0; i < entry.quantity; i++) {
          deckStore.addCard(entry.card, 'extra')
        }
      })

      deckInfo.sideDeck.forEach((entry: any) => {
        for (let i = 0; i < entry.quantity; i++) {
          deckStore.addCard(entry.card, 'side')
        }
      })

      const action = replaceExisting ? '置き換えました' : '追加しました'
      showToast(`デッキを${action}`, 'success')
    }

    const handleUndo = () => {
      deckStore.undo()
    }

    const handleRedo = () => {
      deckStore.redo()
    }

    const handleNewDeck = async () => {
      showMenu.value = false
      try {
        await deckStore.createNewDeck()
        showToast('新しいデッキを作成しました', 'success')
      } catch (error) {
        console.error('Create new deck error:', error)
        showToast('新しいデッキの作成に失敗しました', 'error')
      }
    }

    const handleCopyDeck = async () => {
      showMenu.value = false
      try {
        await deckStore.copyCurrentDeck()
        showToast('デッキをコピーしました', 'success')
      } catch (error) {
        console.error('Copy deck error:', error)
        showToast('デッキのコピーに失敗しました', 'error')
      }
    }

    return {
      deckStore,
      showLoadDialog,
      selectedDeckDno,
      savingState,
      originalDeckName,
      showMenu,
      showExportDialog,
      showImportDialog,
      showOptionsDialog,
      localDno,
      localDeckName,
      toast,
      handleSaveClick,
      toggleLoadDialog,
      handleLoadSelected,
      loadDeck,
      toggleMenu,
      handleSortAll,
      handleDownloadImage,
      handleExportDeck,
      handleExported,
      handleImportDeck,
      handleImported,
      handleOptions,
      handleUndo,
      handleRedo,
      handleNewDeck,
      handleCopyDeck,
      mdiContentSave,
      mdiFolderOpen,
      mdiSortVariant,
      mdiImageOutline,
      mdiExport,
      mdiImport,
      mdiCog,
      mdiUndo,
      mdiRedo,
      mdiPlusBox,
      mdiContentCopy
    }
  }
}
</script>

<style scoped lang="scss">
.top-bar-wrapper {
  margin: 0;
  padding: 0;
}

.top-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 0;
}

.top-bar-left {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
}

.top-bar-right {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  flex: 0 0 auto;
  min-width: 0;
  position: relative;
}

.menu-dropdown {
  position: absolute;
  top: 40px;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 100;
  overflow: hidden;

  .menu-item {
    display: block;
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: white;
    text-align: left;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--bg-secondary, #f5f5f5);
    }

    &:active {
      background: #e8e8e8;
    }
  }

  .menu-divider {
    height: 1px;
    background: #e0e0e0;
    margin: 4px 0;
  }
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
  background: transparent;
}

.deck-name-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  flex: 1 1 auto;
  min-width: 80px;
  max-width: 300px;
}

.dno-chip {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: #e0e0e0;
  color: #666;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  z-index: 1;
  pointer-events: none;
}

.deck-name-input {
  padding: 6px 10px 6px 50px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  text-align: left;
  background: white;
  color: #000;
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

  &:hover:not(:disabled) {
    background: var(--bg-secondary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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
  background: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.load-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary, #e0e0e0);
  background: var(--bg-primary, white);
  width: 100%;
  box-sizing: border-box;

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 18px;
    color: var(--text-tertiary, #999);
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      background: var(--bg-secondary, #f5f5f5);
      color: var(--text-primary, #333);
    }
  }
}

.load-dialog-content {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  min-height: 200px;

  .no-decks {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 40px 20px;
    color: var(--text-tertiary, #999);

    p {
      margin: 0;
      font-size: 14px;
    }
  }
}

.deck-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.deck-card {
  padding: 10px 12px;
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 6px;
  background: var(--bg-secondary, #f5f5f5);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--text-tertiary, #999);
    background: var(--bg-primary, white);
  }

  .deck-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary, #333);
    line-height: 1.3;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
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
