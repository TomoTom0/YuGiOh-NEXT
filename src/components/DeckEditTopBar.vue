<template>
  <div class="top-bar-wrapper">
    <div class="top-bar">
      <div class="top-bar-left">
        <HoverTooltip :text="canUndo ? undoTooltipText : ''" :tooltip-class="undoTooltipClass">
          <button
            data-testid="undo-btn"
            class="btn-action"
            :class="undoButtonClass"
            :disabled="!canUndo"
            @click="handleUndo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" :d="mdiUndo" />
            </svg>
          </button>
        </HoverTooltip>
        <HoverTooltip :text="canRedo ? redoTooltipText : ''" :tooltip-class="redoTooltipClass">
          <button
            data-testid="redo-btn"
            class="btn-action"
            :class="redoButtonClass"
            :disabled="!canRedo"
            @click="handleRedo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" :d="mdiRedo" />
            </svg>
          </button>
        </HoverTooltip>
        <div class="deck-name-group">
          <span class="dno-chip">{{ localDno || '-' }}</span>
          <input
            ref="deckNameInputRef"
            v-model="localDeckName"
            type="text"
            :placeholder="displayDeckName || 'デッキ名'"
            class="deck-name-input"
            @input="handleDeckNameInput"
            @keydown="handleDeckNameKeydown"
            @blur="resetDeckNameSuggestion"
          >
          <button
            v-if="localDeckName"
            type="button"
            class="deck-name-clear-btn"
            title="デッキ名をクリア"
            @mousedown.prevent
            @click="handleClearDeckName"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" :d="mdiCloseCircle" />
            </svg>
          </button>
          <span
            v-if="regulationVisible"
            class="regulation-badge"
            :class="{ 'is-fallback': regulationIsFallback }"
            :title="regulationMessage"
          >{{ regulationBadgeLabel }}</span>
          <SuggestionList
            :suggestions="deckNameSuggestions"
            :selected-index="deckNameSelectedIndex"
            variant="filter"
            @select="handleDeckNameSuggestionSelect"
          />
        </div>
      </div>
      <div class="top-bar-right">
        <HoverTooltip v-if="practiceMode" text="Reset">
          <button
            class="btn-action practice-reset"
            @click="practiceStore.resetPractice()"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" :d="mdiRefresh" />
            </svg>
          </button>
        </HoverTooltip>
        <HoverTooltip v-if="settingsStore.featureSettings.practice" :text="practiceMode ? 'Deck Edit' : 'Practice'">
          <button
            class="btn-action practice-toggle"
            :class="{ active: practiceMode }"
            @click="$emit('toggle-practice')"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" :d="practiceMode ? mdiGrid : mdiGamepadVariant" />
            </svg>
          </button>
        </HoverTooltip>
        <HoverTooltip v-if="!practiceMode" :text="savingState ? 'キャンセル' : 'save'">
          <button
            data-testid="save-btn"
            class="btn-action"
            :class="{ saving: savingState }"
            @click="handleSaveClick"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" :d="mdiContentSave" />
            </svg>
          </button>
        </HoverTooltip>
        <HoverTooltip v-if="!practiceMode" text="load">
          <button data-testid="load-btn" class="btn-action" @click="handleLoadClick">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" :d="mdiFolderOpen" />
            </svg>
          </button>
        </HoverTooltip>
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
          <template v-if="practiceMode">
            <button @click="handleOptions" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
                <path fill="currentColor" :d="mdiCog" />
              </svg>
              Options
            </button>
          </template>
          <template v-else>
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
            <button data-testid="import-export-deck-btn" @click="handleImportExportClick" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
                <path fill="currentColor" :d="mdiSwapHorizontal" />
              </svg>
              Import / Export
            </button>
            <button data-testid="save-with-alt-sort-btn" @click="handleSaveWithAltSortClick" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
                <path fill="currentColor" :d="mdiContentSave" />
              </svg>
              {{ altSaveButtonText }}
            </button>
            <div class="menu-divider"></div>
            <button data-testid="new-deck-btn" @click="handleNewClick" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
                <path fill="currentColor" :d="mdiPlusBox" />
              </svg>
              New Deck
            </button>
            <button data-testid="copy-deck-btn" @click="handleCopyClick" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
                <path fill="currentColor" :d="mdiContentCopy" />
              </svg>
              Save as New Deck
            </button>
            <button data-testid="delete-deck-btn" @click="handleDeleteDeck" class="menu-item danger">
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
            <button @click="handleShowHistory" class="menu-item">
              <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 8px;">
                <path fill="currentColor" :d="mdiHistory" />
              </svg>
              Operation History
            </button>
          </template>
        </div>
        </Transition>
      </div>
    </div>

    <!-- Menu Overlay (外側クリックで閉じる用) -->
    <div v-if="showMenu" class="menu-overlay" @click="toggleMenu"></div>

    <!-- Command History Dialog -->
    <CommandHistoryDialog
      :visible="showHistoryDialog"
      :history="deckStore.commandHistory"
      :current-index="deckStore.commandIndex"
      @close="handleCloseHistory"
      @jump-to="handleJumpToHistory"
      @clear-history="handleClearHistory"
    />
  </div>
</template>

<script lang="ts">
import { ref, computed, reactive, inject } from 'vue'
import { useDeckEditStore } from '../stores/deck-edit'
import { useSettingsStore } from '../stores/settings'
import { useToastStore } from '../stores/toast-notification'
import { usePracticeStore } from '../stores/practice'
import Toast from './Toast.vue'
import CommandHistoryDialog from './CommandHistoryDialog.vue'
import HoverTooltip from './HoverTooltip.vue'
import SuggestionList from './searchInputBar/components/SuggestionList.vue'
import { useDeckNameVariables, type DeckNameVariable } from '../composables/useDeckNameVariables'
import { useDeckRegulationTagSuggestions } from '../composables/useDeckRegulationTagSuggestions'
// 画像作成機能は動的importに変更（メニュー選択時のみロード）
// import { showImageDialogWithData } from '../content/deck-recipe/imageDialog'
import { sessionManager } from '../content/session/session'
import { mdiContentSave, mdiFolderOpen, mdiReload, mdiSortVariant, mdiImageOutline, mdiSwapHorizontal, mdiCog, mdiUndo, mdiRedo, mdiPlusBox, mdiContentCopy, mdiDelete, mdiHistory, mdiGamepadVariant, mdiGrid, mdiRefresh, mdiCloseCircle } from '@mdi/js'

interface ToastState {
  show: boolean
  message: string
  type: string
}

export default {
  name: 'DeckEditTopBar',
  components: {
    Toast,
    CommandHistoryDialog,
    HoverTooltip,
    SuggestionList
  },
  props: {
    practiceMode: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['toggle-practice'],
  setup(props) {
    const deckStore = useDeckEditStore()
    const settingsStore = useSettingsStore()
    const practiceStore = usePracticeStore()
    const { showToast: dispatchToast } = useToastStore()
    const selectedDeckDno = ref<number | null>(null)
    const savingState = ref(false)
    const saveTimer = ref<number | null>(null)
    const showMenu = ref(false)
    const menuLoading = ref(false)
    const showHistoryDialog = ref(false)
    const toast = reactive<ToastState>({
      show: false,
      message: '',
      type: 'info'
    })

    // checkUnsavedChanges を親コンポーネント（DeckEditLayout）から取得
    const checkUnsavedChanges = inject<(action: () => void | Promise<void>, actionName: string) => Promise<void>>('checkUnsavedChanges')

    if (!checkUnsavedChanges) {
      throw new Error('checkUnsavedChanges not provided')
    }

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      // useToastStore で統一してトースト通知を表示
      dispatchToast(message, type)
    }

    const localDno = computed(() => deckStore.deckInfo.dno || 0)
    const localDeckName = computed({
      get: () => deckStore.deckInfo.name || '',
      set: (value: string) => deckStore.setDeckName(value)
    })
    const displayDeckName = computed(() => deckStore.getDeckName())

    // リミットレギュレーション適用状態バッジ（デッキ名入力欄右上にオーバーレイ表示、レイアウトは変更しない）
    const regulationVisible = computed(() => deckStore.resolvedRegulation.mode !== 'none')
    const regulationIsFallback = computed(() => !!deckStore.resolvedRegulation.fallback)
    const regulationBadgeLabel = computed(() => {
      const r = deckStore.resolvedRegulation
      if (r.mode === 'none') return ''
      return r.mode === 'ocg' ? 'OCG' : 'GENESYS'
    })
    const regulationMessage = computed(() => {
      const r = deckStore.resolvedRegulation
      if (r.fallback) {
        const label = r.mode === 'ocg' ? 'OCG' : 'GENESYS'
        return `指定 ${label}-${r.fallback.requestedYymm} は存在しないため、直近版 ${label}-${r.fallback.appliedYymm} を適用中`
      }
      return deckStore.regulationEffectiveDescription
        ? `適用中: ${deckStore.regulationEffectiveDescription}`
        : ''
    })

    const deckNameInputRef = ref<HTMLInputElement | null>(null)

    const handleClearDeckName = () => {
      deckStore.setDeckName('')
      deckNameInputRef.value?.focus()
    }

    // デッキ名入力欄の @-mark 変数入力（@orig で元のデッキ名を挿入）は一時的に無効化中。
    // composable自体は残しているので、テンプレート側の配線（@input/@keydown/SuggestionList）を
    // 戻すだけで再度有効化できる
    const atMarkDeckNameVariables: DeckNameVariable[] = [
      {
        key: 'orig',
        label: '元のデッキ名',
        resolve: () => deckStore.deckInfo.originalName || ''
      }
    ]
    useDeckNameVariables({
      inputValue: localDeckName,
      inputElement: deckNameInputRef,
      variables: atMarkDeckNameVariables
    })

    // デッキ名冒頭のレギュレーションタグ（[OCG-YYMM] / [GENESYS-YYMM]）入力補助
    const {
      suggestions: deckNameSuggestions,
      selectedIndex: deckNameSelectedIndex,
      handleInput: handleDeckNameInput,
      handleKeydown: handleDeckNameKeydown,
      selectSuggestion: handleDeckNameSuggestionSelect,
      resetSuggestion: resetDeckNameSuggestion
    } = useDeckRegulationTagSuggestions({
      inputValue: localDeckName,
      inputElement: deckNameInputRef,
      isGenesysEnabled: () => settingsStore.featureSettings.genesys,
    })

    // Undo/Redo tooltip and button styling
    const undoTooltipText = computed(() => {
      if (props.practiceMode) {
        return 'Undo (Ctrl+Z)'
      }
      const description = deckStore.getUndoDescription()
      if (description) {
        return `${description} (Ctrl+Z)`
      }
      return 'Ctrl+Z'
    })
    const redoTooltipText = computed(() => {
      if (props.practiceMode) {
        return 'Redo (Ctrl+Y)'
      }
      const description = deckStore.getRedoDescription()
      if (description) {
        return `${description} (Ctrl+Y)`
      }
      return 'Ctrl+Y'
    })

    // Type-based styling
    const getTypeClass = (type: string | undefined): string => {
      switch (type) {
        case 'add': return 'type-add'
        case 'remove': return 'type-remove'
        case 'move': return 'type-move'
        case 'reorder': return 'type-reorder'
        default: return ''
      }
    }

    const undoTooltipClass = computed(() => props.practiceMode ? '' : getTypeClass(deckStore.getUndoType()))
    const redoTooltipClass = computed(() => props.practiceMode ? '' : getTypeClass(deckStore.getRedoType()))
    const undoButtonClass = computed(() => props.practiceMode ? '' : getTypeClass(deckStore.getUndoType()))
    const redoButtonClass = computed(() => props.practiceMode ? '' : getTypeClass(deckStore.getRedoType()))

    /**
     * 共通の保存処理
     * @param applySorting ソート処理（バックアップ後、タイマー前に実行）
     */
    const performSave = (applySorting: () => void) => {
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

        // ソート処理を実行
        applySorting()

        // 設定された遅延時間を取得（デフォルト: 0ms = 即座に保存）
        const delay = settingsStore.appSettings.saveDelayMs ?? 0

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
        }, delay)
      }
    }

    const handleSaveClick = () => {
      // 設定に応じてフルソートまたはmin-sort
      if (settingsStore.appSettings.saveWithAutoFullSort) {
        // sort済みの場合はsortをスキップ（toggle-*はasc/descいずれかで済んでいればOK）
        if (deckStore.isAllSectionsSortedForSave()) {
          performSave(() => {})
        } else {
          performSave(() => {
            deckStore.sortAllSections()
          })
        }
      } else {
        performSave(() => {
          deckStore.sortDisplayOrderForOfficial()
        })
      }
    }

    const handleSaveWithAltSortClick = () => {
      // 設定と逆のソート方法で保存
      if (settingsStore.appSettings.saveWithAutoFullSort) {
        performSave(() => {
          deckStore.sortDisplayOrderForOfficial()
        })
      } else {
        performSave(() => {
          deckStore.sortAllSections()
        })
      }
    }

    const altSaveButtonText = computed(() => {
      return settingsStore.appSettings.saveWithAutoFullSort
        ? 'Save with min sort'
        : 'Save with full sort'
    })

    const handleLoadClick = async () => {
      await checkUnsavedChanges(async () => {
        if (!deckStore.showLoadDialog) {
          selectedDeckDno.value = null
          deckStore.onLoadCallback = async (dno: number) => {
            await deckStore.loadDeck(dno)
            localStorage.setItem('ygoNext:lastDeckDno', String(dno))
          }
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

        // GENESYSモード時にgenesysPointsを収集
        let genesysPoints: Record<string, number> | undefined
        if (deckStore.resolvedRegulation.mode === 'genesys') {
          const allDeckEntries = [
            ...deckData.mainDeck,
            ...deckData.extraDeck,
            ...deckData.sideDeck
          ]
          genesysPoints = {}
          for (const entry of allDeckEntries) {
            const pt = deckStore.getCardGenesysPoint(entry.cid)
            if (pt !== undefined && pt > 0) {
              genesysPoints[entry.cid] = pt
            }
          }
        }

        // dnoを文字列に変換
        const dno = String(dnoNum)

        // 画像作成機能を動的import（メニュー選択時のみロード）
        const { showImageDialogWithData } = await import('../content/deck-recipe/imageDialog')

        // ダイアログを表示
        await showImageDialogWithData(cgid, dno, deckData, null, genesysPoints)
      } catch (error) {
        console.error('Download image error:', error)
        showToast('画像の生成に失敗しました', 'error')
      }
    }

    const handleImportExportClick = async () => {
      showMenu.value = false
      await checkUnsavedChanges(() => {
        deckStore.showImportDialog = true
      }, 'Import / Export')
    }

    const handleOptions = () => {
      showMenu.value = false
      deckStore.showSettingsDialog = true
    }

    const handleShowHistory = () => {
      showMenu.value = false
      showHistoryDialog.value = true
    }

    const handleCloseHistory = () => {
      showHistoryDialog.value = false
    }

    const handleJumpToHistory = (index: number) => {
      deckStore.jumpToIndex(index)
      showHistoryDialog.value = false
    }

    const handleClearHistory = () => {
      deckStore.clearHistory()
      showHistoryDialog.value = false
      showToast('操作履歴をクリアしました', 'info')
    }



    const handleUndo = () => {
      if (props.practiceMode) {
        practiceStore.undo()
      } else {
        deckStore.undo()
      }
    }

    const handleRedo = () => {
      if (props.practiceMode) {
        practiceStore.redo()
      } else {
        deckStore.redo()
      }
    }

    const canUndo = computed(() => {
      return props.practiceMode ? practiceStore.canUndo : deckStore.canUndo
    })

    const canRedo = computed(() => {
      return props.practiceMode ? practiceStore.canRedo : deckStore.canRedo
    })

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
      settingsStore,
      practiceStore,
      canUndo,
      canRedo,
      selectedDeckDno,
      savingState,
      showMenu,
      confirmDelete,
      cancelDelete,
      menuLoading,
      showHistoryDialog,
      localDno,
      localDeckName,
      displayDeckName,
      regulationVisible,
      regulationIsFallback,
      regulationBadgeLabel,
      regulationMessage,
      deckNameInputRef,
      handleClearDeckName,
      deckNameSuggestions,
      deckNameSelectedIndex,
      handleDeckNameInput,
      handleDeckNameKeydown,
      handleDeckNameSuggestionSelect,
      resetDeckNameSuggestion,
      undoTooltipText,
      redoTooltipText,
      undoTooltipClass,
      redoTooltipClass,
      undoButtonClass,
      redoButtonClass,
      toast,
      handleSaveClick,
      handleSaveWithAltSortClick,
      altSaveButtonText,
      handleLoadClick,
      handleLoadSelected,
      handleReloadDeck,
      loadDeck,
      toggleMenu,
      handleSortAll,
      handleDownloadImage,
      handleImportExportClick,
      handleOptions,
      handleShowHistory,
      handleCloseHistory,
      handleJumpToHistory,
      handleClearHistory,
      handleUndo,
      handleRedo,
      handleNewClick,
      handleCopyClick,
      handleDeleteDeck,
      mdiContentSave,
      mdiFolderOpen,
      mdiReload,
      mdiSortVariant,
      mdiImageOutline,
      mdiSwapHorizontal,
      mdiCog,
      mdiUndo,
      mdiRedo,
      mdiPlusBox,
      mdiContentCopy,
      mdiDelete,
      mdiHistory,
      mdiGamepadVariant,
      mdiGrid,
      mdiRefresh,
      mdiCloseCircle
    }
  }
}
</script>

<style scoped lang="scss">
.top-bar-wrapper {
  margin: 0;
  /* 上部paddingはregulation-badge(top:-8px)がmain-content(overflow:hidden)で
     見切れないための余白。バッジのはみ出し量(8px)より広めに確保する */
  padding: 10px 0 8px 0;
  overflow: visible;
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
  position: relative;
  overflow: visible;
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
  box-sizing: border-box;
  padding: 6px 28px 6px 50px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 14px;
  text-align: left;
  background: var(--bg-primary);
  color: var(--text-primary);
  width: 100%;
}

.deck-name-clear-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary, #999);
  cursor: pointer;
  z-index: 1;

  &:hover {
    color: var(--text-primary);
  }
}

.regulation-badge {
  position: absolute;
  right: 8px;
  top: -8px;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.4;
  background: var(--color-warning);
  color: var(--button-text);
  border: 1px solid var(--color-warning);
  z-index: 2;
  cursor: default;
  white-space: nowrap;

  &.is-fallback {
    background: var(--color-error);
    color: var(--button-text);
    border-color: var(--color-error);
  }
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

// Command tooltip (positioned relative to wrapper)
.command-tooltip {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
  line-height: 1.4;
  min-height: 20px;

  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);

  // Type-specific colors
  &.type-add {
    background: #2e7d32;
    color: #fff;
    border-color: #4caf50;
  }

  &.type-remove {
    background: #c62828;
    color: #fff;
    border-color: #f44336;
  }

  &.type-move {
    background: #616161;
    color: #fff;
    border-color: #9e9e9e;
  }

  &.type-reorder {
    background: #ef6c00;
    color: #fff;
    border-color: #ff9800;
  }
}

// Button type indicator (subtle border accent)
.btn-action {
  &.type-add {
    border-color: var(--color-success);
  }

  &.type-remove {
    border-color: var(--color-error);
  }

  &.type-move {
    border-color: var(--border-secondary);
  }

  &.type-reorder {
    border-color: var(--color-warning);
  }
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
    font-weight: 700;
    cursor: pointer;
    transition: all 0.35s;

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
        filter: brightness(0.75);
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
