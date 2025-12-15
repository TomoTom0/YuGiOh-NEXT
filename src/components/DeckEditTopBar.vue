<template>
  <div class="top-bar-wrapper">
    <div class="top-bar">
      <div class="top-bar-left">
        <button
          data-testid="undo-btn"
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
          data-testid="redo-btn"
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
            :placeholder="displayDeckName || 'デッキ名'"
            class="deck-name-input"
          >
        </div>
      </div>
      <div class="top-bar-right">
        <button
          data-testid="save-btn"
          class="btn-action"
          :class="{ saving: savingState }"
          :title="savingState ? 'キャンセル' : 'save'"
          @click="handleSaveClick"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" :d="mdiContentSave" />
          </svg>
        </button>
        <button data-testid="load-btn" class="btn-action" title="load" @click="handleLoadClick">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" :d="mdiFolderOpen" />
          </svg>
        </button>
        <button data-testid="menu-btn" class="btn-menu" @click="toggleMenu" :class="{ loading: menuLoading }">
          <span v-if="!menuLoading">⋮</span>
          <svg v-else class="spinner" width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="1s"
                repeatCount="indefinite"/>
            </path>
          </svg>
        </button>

        <!-- Menu Dropdown -->
        <Transition name="menu-slide">
          <div v-if="showMenu" class="menu-dropdown" @click.stop>
          <button data-testid="sort-all-btn" @click="handleSortAll" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiSortVariant" />
            </svg>
            Sort All Sections
          </button>
          <button data-testid="deck-image-btn" @click="handleDownloadImage" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiImageOutline" />
            </svg>
            Deck Image
          </button>
          <div class="menu-divider"></div>
          <button data-testid="reload-deck-btn" @click="handleReloadDeck" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiReload" />
            </svg>
            Reload Deck
          </button>
          <button data-testid="export-deck-btn" @click="handleExportClick" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiExport" />
            </svg>
            Export Deck
          </button>
          <button data-testid="import-deck-btn" @click="handleImportClick" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiImport" />
            </svg>
            Import Deck
          </button>
          <div class="menu-divider"></div>
          <button @click="handleNewClick" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiPlusBox" />
            </svg>
            New Deck
          </button>
          <button @click="handleCopyClick" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiContentCopy" />
            </svg>
            Copy Deck
          </button>
          <button @click="handleDeleteDeck" class="menu-item danger">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiDelete" />
            </svg>
            Delete Deck
          </button>
          <div class="menu-divider"></div>
          <button @click="handleOptions" class="menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path fill="currentColor" :d="mdiCog" />
            </svg>
            Options
          </button>
        </div>
        </Transition>
      </div>
    </div>

    <!-- Menu Overlay (外側クリックで閉じる用) -->
    <div v-if="showMenu" class="menu-overlay" @click="toggleMenu"></div>





  </div>

  <!-- Unsaved Changes Dialog (outside top-bar-wrapper) -->
  <ConfirmDialog
    :show="deckStore.showUnsavedChangesDialog"
    :title="unsavedChangesTitle"
    :message="unsavedChangesMessage"
    :buttons="unsavedChangesButtons"
    @cancel="cancelUnsavedChanges"
  />

  <!-- Toast Container (outside top-bar-wrapper) -->
  <ToastContainer />
</template>

<script lang="ts">
import { ref, computed, reactive } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { useSettingsStore } from '../stores/settings'
import { useToastStore } from '../stores/toast-notification'
import Toast from './Toast.vue'
import ToastContainer from './ToastContainer.vue'
import ConfirmDialog from './ConfirmDialog.vue'
// 画像作成機能は動的importに変更（メニュー選択時のみロード）
// import { showImageDialogWithData } from '../content/deck-recipe/imageDialog'
import { sessionManager } from '../content/session/session'
import { mdiContentSave, mdiFolderOpen, mdiReload, mdiSortVariant, mdiImageOutline, mdiExport, mdiImport, mdiCog, mdiUndo, mdiRedo, mdiPlusBox, mdiContentCopy, mdiDelete } from '@mdi/js'

interface ToastState {
  show: boolean
  message: string
  type: string
}

export default {
  name: 'DeckEditTopBar',
  components: {
    Toast,
    ToastContainer,
    ConfirmDialog
  },
  setup() {
    const deckStore = useDeckEditStore()
    const settingsStore = useSettingsStore()
    const { showToast: dispatchToast } = useToastStore()
    const selectedDeckDno = ref<number | null>(null)
    const savingState = ref(false)
    const saveTimer = ref<number | null>(null)
    const showMenu = ref(false)
    const menuLoading = ref(false)
    const toast = reactive<ToastState>({
      show: false,
      message: '',
      type: 'info'
    })

    // Unsaved changes handling
    const pendingAction = ref<(() => void) | null>(null)
    const unsavedChangesTitle = ref('未保存の変更')
    const unsavedChangesMessage = ref('デッキに変更がありますが、保存せずに続けますか？')

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      // useToastStore で統一してトースト通知を表示
      dispatchToast(message, type)
    }
    
    const checkUnsavedChanges = async (action: () => void | Promise<void>, actionName: string) => {
      const unsavedWarning = settingsStore.appSettings.unsavedWarning

      // 'never': 警告を表示しない
      if (unsavedWarning === 'never') {
        await action()
        return
      }

      // 変更がない場合は常に実行
      if (!deckStore.hasUnsavedChanges()) {
        await action()
        return
      }

      // 'without-sorting-only': ソート順のみの変更なら警告しない
      if (unsavedWarning === 'without-sorting-only') {
        if (deckStore.hasOnlySortOrderChanges()) {
          await action()
          return
        }
      }

      // 'always' または 'without-sorting-only' でソート順以外の変更がある場合
      unsavedChangesMessage.value = `デッキに変更がありますが、保存せずに${actionName}を行いますか？`
      pendingAction.value = action
      deckStore.showUnsavedChangesDialog = true
    }
    
    const unsavedChangesButtons = computed(() => [
      {
        label: '処理を中断',
        class: 'secondary',
        onClick: () => {
          deckStore.showUnsavedChangesDialog = false
          pendingAction.value = null
        }
      },
      {
        label: '保存して続ける',
        class: 'primary',
        onClick: async () => {
          deckStore.showUnsavedChangesDialog = false
          try {
            const result = await deckStore.saveDeck(deckStore.deckInfo.dno)
            if (result.success) {
              showToast('保存しました', 'success')
              if (pendingAction.value) {
                await pendingAction.value()
              }
            } else {
              showToast('保存に失敗しました', 'error')
            }
          } catch (error) {
            showToast('保存エラーが発生しました', 'error')
          } finally {
            pendingAction.value = null
          }
        }
      },
      {
        label: '保存せず続ける',
        class: 'danger',
        onClick: async () => {
          deckStore.showUnsavedChangesDialog = false
          if (pendingAction.value) {
            await pendingAction.value()
          }
          pendingAction.value = null
        }
      }
    ])
    
    const cancelUnsavedChanges = () => {
      deckStore.showUnsavedChangesDialog = false
      pendingAction.value = null
    }

    const localDno = computed(() => deckStore.deckInfo.dno || 0)
    const localDeckName = computed({
      get: () => deckStore.deckInfo.name || '',
      set: (value: string) => deckStore.setDeckName(value)
    })
    const displayDeckName = computed(() => deckStore.getDeckName())

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
            
            // デッキ名が空白の場合はgetterが自動的にoriginalNameを返す
            
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

    const handleLoadClick = async () => {
      await checkUnsavedChanges(async () => {
        if (!deckStore.showLoadDialog) {
          await deckStore.fetchDeckList()
          selectedDeckDno.value = null
        }
        deckStore.showLoadDialog = !deckStore.showLoadDialog
      }, 'ロード')
    }

    const handleLoadSelected = async () => {
      try {
        if (!selectedDeckDno.value) {
          showToast('デッキを選択してください', 'warning')
          return
        }
        await deckStore.loadDeck(selectedDeckDno.value)
        deckStore.setDeckName('')
        deckStore.showLoadDialog = false
        showToast('デッキを読み込みました', 'success')
      } catch (error) {
        console.error('Load error:', error)
        showToast('読み込みエラーが発生しました', 'error')
      }
    }

    const loadDeck = async (dno: number) => {
      try {
        await deckStore.loadDeck(dno)
        deckStore.setDeckName('')
        deckStore.showLoadDialog = false
        showToast('デッキを読み込みました', 'success')
      } catch (error) {
        console.error('Load error:', error)
        showToast('読み込みエラーが発生しました', 'error')
      }
    }
    
    const handleReloadDeck = async () => {
      showMenu.value = false
      await checkUnsavedChanges(async () => {
        try {
          await deckStore.reloadDeck()
          deckStore.setDeckName('')
          showToast('デッキを再読み込みしました', 'success')
        } catch (error) {
          console.error('Reload error:', error)
          showToast('再読み込みエラーが発生しました', 'error')
        }
      }, '再読み込み')
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
          name: deckStore.getDeckName(),
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

        // 画像作成機能を動的import（メニュー選択時のみロード）
        const { showImageDialogWithData } = await import('../content/deck-recipe/imageDialog')

        // ダイアログを表示
        await showImageDialogWithData(cgid, dno, deckData, null)
      } catch (error) {
        console.error('Download image error:', error)
        showToast('画像の生成に失敗しました', 'error')
      }
    }

    const handleExportClick = () => {
      showMenu.value = false
      deckStore.showExportDialog = true
    }

    const handleImportClick = async () => {
      showMenu.value = false
      await checkUnsavedChanges(() => {
        deckStore.showImportDialog = true
      }, 'インポート')
    }

    const handleOptions = () => {
      showMenu.value = false
      deckStore.showOptionsDialog = true
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

    const handleNewClick = async () => {
      showMenu.value = false
      await checkUnsavedChanges(async () => {
        menuLoading.value = true
        try {
          await deckStore.createNewDeck()
          showToast('新しいデッキを作成しました', 'success')
        } catch (error) {
          console.error('Create new deck error:', error)
          showToast('新しいデッキの作成に失敗しました', 'error')
        } finally {
          menuLoading.value = false
        }
      }, '新規作成')
    }

    const handleCopyClick = async () => {
      showMenu.value = false
      await checkUnsavedChanges(async () => {
        menuLoading.value = true
        try {
          await deckStore.copyCurrentDeck()
          showToast('デッキをコピーしました', 'success')
        } catch (error) {
          console.error('Copy deck error:', error)
          showToast('デッキのコピーに失敗しました', 'error')
        } finally {
          menuLoading.value = false
        }
      }, 'コピー')
    }

    const handleDeleteDeck = () => {
      showMenu.value = false
      deckStore.showDeleteConfirm = true
    }

    const confirmDelete = async () => {
      deckStore.showDeleteConfirm = false
      menuLoading.value = true
      try {
        await deckStore.deleteCurrentDeck()
        showToast('デッキを削除しました', 'success')
      } catch (error) {
        console.error('Delete deck error:', error)
        showToast('デッキの削除に失敗しました', 'error')
      } finally {
        menuLoading.value = false
      }
    }

    const cancelDelete = () => {
      deckStore.showDeleteConfirm = false
    }

    return {
      deckStore,
      selectedDeckDno,
      savingState,
      showMenu,
      confirmDelete,
      cancelDelete,
      menuLoading,
      localDno,
      localDeckName,
      displayDeckName,
      toast,
      unsavedChangesTitle,
      unsavedChangesMessage,
      unsavedChangesButtons,
      handleSaveClick,
      handleLoadClick,
      handleLoadSelected,
      handleReloadDeck,
      loadDeck,
      toggleMenu,
      handleSortAll,
      handleDownloadImage,
      handleExportClick,
      handleImportClick,
      handleImported,
      handleOptions,
      handleUndo,
      handleRedo,
      handleNewClick,
      handleCopyClick,
      handleDeleteDeck,
      cancelUnsavedChanges,
      mdiContentSave,
      mdiFolderOpen,
      mdiReload,
      mdiSortVariant,
      mdiImageOutline,
      mdiExport,
      mdiImport,
      mdiCog,
      mdiUndo,
      mdiRedo,
      mdiPlusBox,
      mdiContentCopy,
      mdiDelete
    }
  }
}
</script>

<style scoped lang="scss">
.top-bar-wrapper {
  margin: 0;
  padding: 0 0 8px 0;
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
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 6;
  overflow: hidden;

  .menu-item {
    display: block;
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: var(--bg-primary);
    color: var(--text-primary);
    text-align: left;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
    border-bottom: 1px solid var(--border-primary);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--bg-secondary, #f5f5f5);
      color: var(--text-primary);
    }

    &:active {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    &.danger {
      color: var(--color-error-text);

      &:hover {
        background: var(--color-error-bg);
      }

      &:active {
        background: var(--color-error-hover-bg);
      }
    }
  }

  .menu-divider {
    height: 1px;
    background: var(--border-secondary);
    margin: 4px 0;
  }
}

// メニューアニメーション
.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: all 0.2s ease;
}

.menu-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.menu-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.menu-slide-enter-to,
.menu-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  background: transparent;
  pointer-events: auto;
}

.deck-name-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  flex: 1 1 auto;
  min-width: 80px;
  max-width: 600px; /* 画面幅に余裕がある場合はより広く表示 */
}

.dno-chip {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(135deg, var(--theme-color-start) 0%, var(--color-info) 50%, var(--theme-color-end) 100%);
  color: var(--button-text);
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  z-index: 1;
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.deck-name-input {
  padding: 6px 10px 6px 50px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 14px;
  text-align: left;
  background: var(--bg-primary);
  color: var(--text-primary);
}



.btn-menu,
.btn-action {
  padding: 4px 8px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-primary);
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
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    color: var(--text-tertiary);
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
      border: 3px solid var(--border-primary);
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
  background: var(--dialog-overlay-bg);
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
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  min-width: 300px;
  max-width: 500px;

  h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: var(--text-primary);
    border-bottom: 2px solid var(--color-success);
    padding-bottom: 8px;
  }
}

.dialog-form {
  margin: 15px 0;

  label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    color: var(--text-secondary);
  }
}

.dialog-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
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
      background: var(--color-success);
      color: var(--button-text);

      &:hover {
        background: var(--color-success-hover-bg);
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

.delete-confirm-dialog {
  background: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  width: 400px;
  max-width: 90vw;
}

.delete-confirm-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-primary);

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }
}

.delete-confirm-body {
  padding: 24px;

  p {
    margin: 0 0 12px 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-primary, #333);
  }

  .warning {
    color: var(--color-error-text);
    font-weight: 500;
    margin-top: 16px;
  }
}

.delete-confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-secondary);

  button {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;

    &.btn-cancel {
      background: var(--bg-secondary);
      color: var(--text-primary);

      &:hover {
        background: var(--bg-tertiary);
      }
    }

    &.btn-delete {
      background: var(--color-error-text);
      color: var(--button-text);

      &:hover {
        background: var(--color-error-bg);
      }
    }
  }
}

.btn-menu {
  &.loading {
    pointer-events: none;
  }

  .spinner {
    display: block;
  }
}
</style>
