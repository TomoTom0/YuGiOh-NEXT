<template>
  <div v-show="isReady" class="deck-edit-container ygo-next" :data-ygo-next-theme="settingsStore.effectiveTheme">
    <!-- ローディングオーバーレイ（画面中央固定） -->
    <div v-if="deckStore.isLoadingDeck" class="deck-loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <div class="loading-text">Loading...</div>
      </div>
    </div>

    <div class="main-content" :class="{ 'hide-on-mobile': true }" :style="mainContentStyle">
      <DeckEditTopBar
        :practice-mode="practiceMode"
        @toggle-practice="togglePracticeMode"
      />

      <!-- Practice mode / Normal deck edit mode -->
      <Transition name="mode-switch" mode="out-in">
      <div v-if="practiceMode" key="practice" class="deck-areas practice-field-container">
        <!-- P2 field with slide-in animation -->
        <Transition name="p2-field-slide">
          <div v-if="practiceStore.twoDeckMode" class="p2-field-wrapper">
            <PracticeField :field-index="1" class="opponent-field" :hide-e-m-z="true" />
          </div>
        </Transition>
        <!-- Player field -->
        <PracticeField />
      </div>

      <div v-else key="normal" class="deck-areas" :class="{ 'deck-loading': deckStore.isLoadingDeck }" :style="deckAreasStyle">
        <DeckSection
          title="main"
          section-type="main"
          :cards="mainDeck"
        />

        <div :class="middleDecksClass">
          <DeckSection
            title="extra"
            section-type="extra"
            :cards="extraDeck"
          />

          <DeckSection
            title="side"
            section-type="side"
            :cards="sideDeck"
          />
        </div>

        <DeckSection
          title="trash"
          section-type="trash"
          :cards="trashDeck"
          :show-count="false"
        />
      </div>
      </Transition>
    </div>

    <RightArea>
      <template #practice-tab>
        <PracticePlayerPanel
          @toggle-p2="toggleTwoDeckMode"
          @load-deck-p2="loadDeckForField2"
          @save-temp-recipe="saveTempRecipe"
          @hard-reset="hardResetPractice"
          @open-deck="openDeckForPractice"
          @open-deck-p2="openDeckForPracticeP2"
          @save-deck="saveDeckFromPractice"
        />
        <PracticeZoneInfoPanel @action="handlePracticeAction" />
      </template>
      <template #deck-tab>
        <div class="mobile-deck-content">
          <DeckEditTopBar
            :practice-mode="practiceMode"
            @toggle-practice="togglePracticeMode"
          />

          <Transition name="mode-switch" mode="out-in">
          <div v-if="practiceMode" key="practice" class="deck-areas practice-field-container">
            <PracticePlayerPanel
              @toggle-p2="toggleTwoDeckMode"
              @load-deck-p2="loadDeckForField2"
              @save-temp-recipe="saveTempRecipe"
              @hard-reset="hardResetPractice"
              @open-deck="openDeckForPractice"
              @save-deck="saveDeckFromPractice"
            />
            <Transition name="p2-field-slide">
              <div v-if="practiceStore.twoDeckMode" class="p2-field-wrapper">
                <PracticeField :field-index="1" class="opponent-field" :hide-e-m-z="true" />
              </div>
            </Transition>
            <PracticeField />
          </div>

          <div v-else key="normal" class="deck-areas" :class="{ 'deck-loading': deckStore.isLoadingDeck }" :style="deckAreasStyle">
            <DeckSection
              title="main"
              section-type="main"
              :cards="mainDeck"
            />

            <div :class="middleDecksClass">
              <DeckSection
                title="extra"
                section-type="extra"
                :cards="extraDeck"
              />

              <DeckSection
                title="side"
                section-type="side"
                :cards="sideDeck"
              />
            </div>

            <DeckSection
              title="trash"
              section-type="trash"
              :cards="trashDeck"
              :show-count="false"
            />
          </div>
          </Transition>
        </div>
      </template>
    </RightArea>

    <!-- 統一オーバーレイ -->
    <div v-if="deckStore.overlayVisible" class="unified-overlay" :style="{ zIndex: deckStore.overlayZIndex }"></div>

    <!-- ダイアログ -->
    <ImportExportDialog
      :isVisible="deckStore.showImportDialog || deckStore.showExportDialog"
      :initialTab="deckStore.showExportDialog ? 'export' : 'import'"
      :deckInfo="deckStore.deckInfo"
      :dno="String(deckStore.deckInfo.dno || '')"
      :deckName="deckStore.getDeckName()"
      :theme="settingsStore.effectiveTheme"
      :includeTimestamp="settingsStore.appSettings.includeTimestampInExportFilename"
      @close="handleImportExportClose"
      @imported="handleImported"
      @exported="handleExported"
    />

    <SettingsDialog
      :isVisible="deckStore.showSettingsDialog"
      @close="deckStore.showSettingsDialog = false"
    />

    <LoadDialog
      :isVisible="deckStore.showLoadDialog"
      @close="deckStore.showLoadDialog = false"
      @deck-loaded="handleDeckLoaded"
    />

    <!-- Delete Confirmation Dialog -->
    <div v-if="deckStore.showDeleteConfirm" class="dialog-overlay" @click="cancelDelete">
      <div class="delete-confirm-dialog" @click.stop>
        <div class="delete-confirm-header">
          <h3>デッキを削除</h3>
        </div>
        <div class="delete-confirm-body">
          <p>本当に「{{ deckStore.getDeckName() || '(名称未設定)' }}」を削除しますか？</p>
          <p class="warning">この操作は取り消せません。</p>
        </div>
        <div class="delete-confirm-footer">
          <button @click="cancelDelete" class="btn-cancel">キャンセル</button>
          <button @click="confirmDelete" class="btn-delete">削除</button>
        </div>
      </div>
    </div>

    <!-- Unsaved Changes Dialog -->
    <ConfirmDialog
      :show="deckStore.showUnsavedChangesDialog"
      :title="unsavedChangesTitle"
      :message="unsavedChangesMessage"
      :buttons="unsavedChangesButtons"
      :theme="settingsStore.effectiveTheme"
      @cancel="cancelUnsavedChanges"
    />

    <!-- Regulation Fix Dialog（YYMM該当版なし時の修正提案） -->
    <ConfirmDialog
      :show="deckStore.showRegulationFixDialog"
      :title="regulationFixTitle"
      :message="regulationFixMessage"
      :buttons="regulationFixButtons"
      :theme="settingsStore.effectiveTheme"
    />

    <!-- Toast Container -->
    <ToastContainer />
  </div>
</template>

<script lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick, defineAsyncComponent, provide } from 'vue'
import { useDeckEditStore } from '../../stores/deck-edit'
import { useSearchStore } from '../../stores/search'
import { useSettingsStore } from '../../stores/settings'
import { useCardDetailStore } from '../../stores/card-detail'
import { useToastStore } from '../../stores/toast-notification'
import { usePracticeStore } from '../../stores/practice'
import { usePracticeActions } from '../../composables/practice/usePracticeActions'
import { getUnifiedCacheDB } from '../../utils/unified-cache-db'
import DeckCard from '../../components/DeckCard.vue'
import DeckSection from '../../components/DeckSection.vue'
import DeckEditTopBar from '../../components/DeckEditTopBar.vue'
import RightArea from '../../components/RightArea.vue'
import PracticeField from '../../components/practice/PracticeField.vue'
import PracticeControlPanel from '../../components/practice/PracticeControlPanel.vue'
import PracticeZoneInfoPanel from '../../components/practice/PracticeZoneInfoPanel.vue'
import PracticePlayerPanel from '../../components/practice/PracticePlayerPanel.vue'

import ConfirmDialog from '../../components/ConfirmDialog.vue'
import ToastContainer from '../../components/ToastContainer.vue'
// ダイアログコンポーネントを動的importに変更（初期表示時は不要、メニュー選択時のみロード）
const ImportExportDialog = defineAsyncComponent(() => import('../../components/ImportExportDialog.vue'))
const SettingsDialog = defineAsyncComponent(() => import('../../components/SettingsDialog.vue'))
const LoadDialog = defineAsyncComponent(() => import('../../components/LoadDialog.vue'))
import { getCardImageUrl as getCardImageUrlHelper } from '../../types/card'
import { detectCardGameType } from '../../utils/page-detector'
import { generateDeckThumbnailCards } from '../../utils/deck-thumbnail'
import { EXTENSION_IDS } from '../../utils/dom-selectors'
import { buildFullUrl } from '../../utils/url-builder'
import { getCardInfo } from '../../utils/card-utils'
import {
  generateThumbnailsInBackground
} from '../../utils/deck-cache'
import { STORAGE_KEY_LAST_DECK_DNO } from '../../constants/storage-keys'

export default {
  name: 'DeckEditLayout',
  components: {
    DeckCard,
    DeckSection,
    DeckEditTopBar,
    RightArea,
    ConfirmDialog,
    ToastContainer,
    ImportExportDialog,
    SettingsDialog,
    LoadDialog,
    PracticeField,
    PracticeControlPanel,
    PracticeZoneInfoPanel,
    PracticePlayerPanel,
  },
  setup() {
    const deckStore = useDeckEditStore()
    const searchStore = useSearchStore()
    const settingsStore = useSettingsStore()
    const cardDetailStore = useCardDetailStore()
    const { showToast: dispatchToast } = useToastStore()
    const practiceStore = usePracticeStore()

    // Practice mode
    const practiceMode = ref(false)

    const togglePracticeMode = () => {
      if (!settingsStore.featureSettings.practice) return
      if (!practiceMode.value) {
        const mainDeck = deckStore.deckInfo?.mainDeck || []
        const extraDeck = deckStore.deckInfo?.extraDeck || []
        practiceStore.initPractice(mainDeck, extraDeck)
        practiceMode.value = true
        practiceStore.isActive = true
        deckStore.activeTab = 'practice'
      } else {
        // Exit practice mode
        practiceMode.value = false
        practiceStore.isActive = false
        practiceStore.clearField2()
        deckStore.activeTab = 'search'
      }
    }

    const toggleTwoDeckMode = () => {
      if (practiceStore.twoDeckMode) {
        practiceStore.clearField2()
      } else {
        openDeckForPracticeP2()
      }
    }

    const loadDeckForField2 = async (dno: number) => {
      const detail = await deckStore.getDeckDetail(dno)
      if (detail) {
        practiceStore.initPractice(detail.mainDeck, detail.extraDeck, 1)
        practiceStore.p2DeckDno = dno
        practiceStore.p2DeckName = detail.originalName || ''
        practiceStore.p2DeckInfo = detail
      }
    }

    const hardResetPractice = () => {
      const mainDeck = deckStore.deckInfo?.mainDeck || []
      const extraDeck = deckStore.deckInfo?.extraDeck || []
      practiceStore.initPractice(mainDeck, extraDeck)
    }

    const openDeckForPractice = () => {
      deckStore.onLoadCallback = async (dno: number) => {
        const detail = await deckStore.getDeckDetail(dno)
        if (detail) {
          practiceStore.initPractice(detail.mainDeck, detail.extraDeck, 0)
        }
      }
      deckStore.showLoadDialog = true
    }

    const openDeckForPracticeP2 = () => {
      deckStore.onLoadCallback = async (dno: number) => {
        const detail = await deckStore.getDeckDetail(dno)
        if (detail) {
          practiceStore.initPractice(detail.mainDeck, detail.extraDeck, 1)
          practiceStore.p2DeckDno = dno
          practiceStore.p2DeckName = detail.originalName || ''
          practiceStore.p2DeckInfo = detail
        }
      }
      deckStore.showLoadDialog = true
    }

    const saveDeckFromPractice = async (playerIndex: number = 0) => {
      if (playerIndex === 1) {
        if (!practiceStore.p2DeckDno || !practiceStore.p2DeckInfo) {
          showToast('P2にデッキが読み込まれていません', 'warning')
          return
        }
        const result = await deckStore.saveDeckData(practiceStore.p2DeckDno, practiceStore.p2DeckInfo)
        if (result.success) {
          showToast('保存しました', 'success')
        } else {
          showToast('保存に失敗しました', 'error')
        }
        return
      }

      const result = await deckStore.saveDeck(deckStore.deckInfo.dno)
      if (result.success) {
        showToast('保存しました', 'success')
      } else {
        showToast('保存に失敗しました', 'error')
      }
    }

    const saveTempRecipe = () => {
      const db = getUnifiedCacheDB()
      const allCards = [...practiceStore.tempRecipe, ...practiceStore.tempRecipe2]
      let added = 0
      for (const tc of allCards) {
        const cardInfo = db.getCardInfo(tc.cid)
        if (cardInfo) {
          const section = tc.section
          deckStore.addCard(cardInfo, section)
          added++
        }
      }
      if (added > 0) {
        showToast(`${added}枚のカードをデッキに追加しました`, 'success')
      } else {
        showToast('追加できるカードが見つかりませんでした', 'warning')
      }
    }

    const handlePracticeAction = (action: string, cardId: string) => {
      const { executeAction } = usePracticeActions()
      const fieldIdx = practiceStore.selectedFieldIndex
      if (action === 'moveToTemp') {
        practiceStore.moveCard(cardId, 'temp', undefined, undefined, fieldIdx)
      } else if (action === 'moveToDeckTop') {
        practiceStore.moveCard(cardId, 'deck', undefined, { position: 'top', face: 'down' }, fieldIdx)
      } else {
        executeAction(action, cardId, fieldIdx)
      }
    }

    // トースト通知のヘルパー関数
    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      dispatchToast(message, type)
    }

    // Vue UIの表示準備完了フラグ（デッキ読み込み完了まで非表示）
    const isReady = ref(false)

    const activeTab = ref('search')
    const searchQuery = ref('')
    const selectedCard = ref(null)
    const showDetail = ref(true)
    const viewMode = ref('list')
    const cardTab = ref('info')
    // 現在開いているデッキのdno
    const currentDeckDno = ref<number | null>(null)

    // 言語変更待機中フラグ
    let pendingLanguageChange: (() => void) | null = null;

    // 未保存警告ダイアログ用
    const unsavedChangesMessage = ref('')
    const pendingAction = ref<(() => Promise<void>) | null>(null)

    const unsavedChangesTitle = '未保存の変更があります'

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
        // 保存〜後続処理が終わるまでダイアログを開いたままにし、ConfirmDialog側のローディング表示で
        // 処理中であることを示す（即座に閉じて瞬時に画面遷移すると保存が反映されたか分かりづらいため）
        onClick: async () => {
          try {
            const result = await deckStore.saveDeck(deckStore.deckInfo.dno)
            if (result.success) {
              showToast('保存しました', 'success')
              if (pendingAction.value) {
                await pendingAction.value()
              }
            }
          } catch (error) {
            console.error('Save error:', error)
          } finally {
            deckStore.showUnsavedChangesDialog = false
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

    // レギュレーション修正提案ダイアログ用（YYMM該当版なし→直近版フォールバック時）
    const regulationFixTitle = 'レギュレーションの修正提案'
    const regulationFixMessage = computed(() => {
      const r = deckStore.resolvedRegulation
      if (!r.tag || !r.fallback) return ''
      const label = r.mode === 'ocg' ? 'OCG' : 'GENESYS'
      return `指定 ${label}-${r.fallback.requestedYymm} は存在しません。直近版 ${label}-${r.fallback.appliedYymm} のタグに修正しますか？（「このまま使う」で直近版を適用し続けます）`
    })
    const regulationFixButtons = computed(() => [
      {
        label: 'このまま使う',
        class: 'secondary',
        onClick: () => {
          void deckStore.ignoreRegulationFix()
        }
      },
      {
        label: 'タグを修正',
        class: 'primary',
        onClick: () => {
          deckStore.confirmRegulationFix()
        }
      }
    ])

    const cancelUnsavedChanges = () => {
      deckStore.showUnsavedChangesDialog = false
      pendingAction.value = null
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

    // ダイアログイベントハンドラ
    const handleImportExportClose = () => {
      deckStore.showImportDialog = false
      deckStore.showExportDialog = false
    }

    const handleExported = (message) => {
      deckStore.showExportDialog = false
    }

    const handleImported = async (importedDeckInfo, importMode: 'replace' | 'add' | 'new') => {
      try {
        if (importMode === 'new') {
          await deckStore.createNewDeck()
        } else if (importMode === 'replace') {
          deckStore.deckInfo.mainDeck = []
          deckStore.deckInfo.extraDeck = []
          deckStore.deckInfo.sideDeck = []
          deckStore.initializeDisplayOrder()
        }

        const unifiedDB = getUnifiedCacheDB()
        const sections: Array<'main' | 'extra' | 'side'> = ['main', 'extra', 'side']
        let added = 0
        let skipped = 0

        sections.forEach(section => {
          const refs = section === 'main' ? importedDeckInfo.mainDeck :
                       section === 'extra' ? importedDeckInfo.extraDeck :
                       importedDeckInfo.sideDeck
          refs.forEach((ref: { cid: string; ciid: number | string; quantity: number }) => {
            const baseCard = unifiedDB.getCardInfo(ref.cid)
            if (!baseCard) {
              skipped += ref.quantity
              return
            }
            const card = { ...baseCard, ciid: ref.ciid }
            for (let i = 0; i < ref.quantity; i++) {
              const result = deckStore.addCard(card, section)
              if (result.success) {
                added++
              } else {
                skipped++
              }
            }
          })
        })

        deckStore.showImportDialog = false

        if (added === 0) {
          showToast('インポートできるカードが見つかりませんでした', 'warning')
        } else if (importMode === 'new') {
          showToast('新しいデッキとしてインポートしました', 'success')
        } else if (importMode === 'replace') {
          showToast(skipped > 0 ? `デッキを置き換えました（${skipped}枚は上限超過等によりスキップ）` : 'デッキを置き換えました', 'success')
        } else {
          showToast(skipped > 0 ? `デッキに追加しました（${skipped}枚は上限超過等によりスキップ）` : 'デッキに追加しました', 'success')
        }
      } catch (error) {
        console.error('[handleImported] Error:', error)
        showToast('インポートに失敗しました', 'error')
      }
    }

    const toggleLoadDialog = () => {
      if (!deckStore.showLoadDialog) {
        deckStore.onLoadCallback = async (dno: number) => {
          deckStore.setDeckName('')
          await deckStore.loadDeck(dno)
          localStorage.setItem('ygoNext:lastDeckDno', String(dno))
        }
        // ダイアログを開く際にキャッシュをリロード（store側で実行）
        deckStore.openLoadDialog()
      } else {
        deckStore.showLoadDialog = false
      }
    }

    const handleDeckLoaded = () => {
      // LoadDialogからのデッキロード通知を受けて、デッキエリアをスクロール
      nextTick(() => {
        const deckAreas = document.querySelector('.deck-areas')
        if (deckAreas) {
          deckAreas.scrollTo({
            top: 0,
            behavior: 'smooth'
          })
        }
      })
    }

    const confirmDelete = async () => {
      deckStore.showDeleteConfirm = false
      try {
        await deckStore.deleteCurrentDeck()
      } catch (error) {
        console.error('Delete deck error:', error)
      }
    }

    const cancelDelete = () => {
      deckStore.showDeleteConfirm = false
    }

    // キーボードショートカットのマッチング関数（単一のショートカット）
    const matchesShortcut = (event, shortcut) => {
      if (!shortcut) return false

      return (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        event.ctrlKey === shortcut.ctrl &&
        event.shiftKey === shortcut.shift &&
        event.altKey === shortcut.alt
      )
    }

    // キーボードショートカット配列のいずれかにマッチするかチェック
    const matchesAnyShortcut = (event, shortcuts) => {
      if (!shortcuts) return false

      // Pinia の reactive で変換された場合、オブジェクトになる可能性があるため、
      // Object.values() で値の配列に変換する（元々配列でも問題ない）
      const shortcutsArray = Array.isArray(shortcuts) ? shortcuts : Object.values(shortcuts)

      if (shortcutsArray.length === 0) return false
      return shortcutsArray.some(shortcut => matchesShortcut(event, shortcut))
    }

    // グローバルキーボードイベント
    const handleGlobalKeydown = (event) => {
      // グローバル検索モードが有効な場合は無視（入力欄で処理される）
      if (searchStore.isGlobalSearchMode) return

      // 入力要素にフォーカスがある場合は無視
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      )

      if (isInputFocused) return

      const shortcuts = settingsStore.appSettings.ux.keyboardShortcuts

      // グローバル検索モードを有効化
      if (matchesAnyShortcut(event, shortcuts.globalSearch)) {
        event.preventDefault()
        event.stopPropagation()
        searchStore.isGlobalSearchMode = true
        return
      }

      // Undo
      if (matchesAnyShortcut(event, shortcuts.undo)) {
        event.preventDefault()
        deckStore.undo()
        return
      }

      // Redo
      if (matchesAnyShortcut(event, shortcuts.redo)) {
        event.preventDefault()
        deckStore.redo()
        return
      }
    }
    
    // 画面幅変更時の処理
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768
      const wasDesktop = window.innerWidth > 768
      
      // 画面が広くなった時にdeck tabがactiveならsearch tabに変更
      if (wasDesktop && deckStore.activeTab === 'deck') {
        deckStore.activeTab = 'search'
      }
    }
    
    // URLパラメータを取得する関数
    const getCurrentDno = () => {
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '')
      return urlParams.get('dno') || ''
    }

    // 現在のdnoを追跡
    const currentDno = ref(getCurrentDno())

    // dnoパラメータの変更を監視
    const checkDnoChange = () => {
      const newDno = getCurrentDno()
      if (newDno !== currentDno.value) {
        currentDno.value = newDno
        // デッキデータを再ロード
        deckStore.initializeOnPageLoad()
      }
    }

    // イベントリスナーのハンドラーを保持（onUnmounted で正しく削除するため）
    let checkDnoChangeHandler: (() => void) | null = null

    // checkUnsavedChanges を子コンポーネント（DeckEditTopBar）に提供
    provide('checkUnsavedChanges', checkUnsavedChanges)
    provide('practiceMode', practiceMode)
    provide('practiceStore', practiceStore)

    // コンポーネントがマウントされているかを追跡（非同期処理中のアンマウント検出用）
    let isComponentMounted = false

    // ページ初期化時にデッキを自動ロード
    onMounted(async () => {
      isComponentMounted = true

      // 前回のdnoを復元
      const lastDno = localStorage.getItem(STORAGE_KEY_LAST_DECK_DNO)
      if (lastDno) {
        currentDeckDno.value = parseInt(lastDno, 10)
      }

      // 通常のページ初期化（dno パラメータがある場合に loadDeck() が呼ばれる）
      await deckStore.initializeOnPageLoad()

      // デッキリストを取得
      await deckStore.fetchDeckList()

      // デッキ読み込み完了後、Vue UIを表示
      isReady.value = true

      // Vue描画完了を待ってからオーバーレイを削除
      await nextTick()

      // 短いフェードアウトで削除（途切れを防ぐ）
      const moduleLoadingOverlay = document.getElementById(EXTENSION_IDS.loading.moduleLoadingOverlay)
      if (moduleLoadingOverlay) {
        moduleLoadingOverlay.style.opacity = '0'
        moduleLoadingOverlay.style.transition = 'opacity 150ms ease-out'
        setTimeout(() => {
          moduleLoadingOverlay.remove()
        }, 150)
      }

      // hashchangeイベントでdno変更を監視
      checkDnoChangeHandler = () => checkDnoChange()
      window.addEventListener('hashchange', checkDnoChangeHandler)
      window.addEventListener('resize', handleResize)
      window.addEventListener('keydown', handleGlobalKeydown)


      // window.ygoChangeLanguage をオーバーライド（未保存変更確認機能を追加）
      const originalChangeLanguage = window.ygoChangeLanguage
      window.ygoChangeLanguage = (lang: string) => {
        const performChange = () => {
          originalChangeLanguage?.(lang)
        }

        // 編集中の場合はダイアログを表示
        if (deckStore.hasUnsavedChanges()) {
          unsavedChangesMessage.value = '言語を変更するとページが再読み込みされます。保存してから変更しますか？'
          pendingLanguageChange = performChange
          pendingAction.value = performChange
          deckStore.showUnsavedChangesDialog = true
        } else {
          performChange()
        }
      }

      // 設定に応じてファビコンを変更
      if (settingsStore.appSettings.ux.changeFavicon) {
        changeFavicon()
      }

      // ページロード時に最初の24個のデッキのサムネイルを生成（キャッシュはstore初期化時に読み込み済み）
      // 5個連続でキャッシュヒットしたら早期終了する
      // ページロード時、最初の24個のデッキのサムネイルを背景で生成
      if (deckStore.deckList && deckStore.deckList.length > 0) {
        console.debug('[DeckEditLayout] Starting background thumbnail generation on page load')
        generateThumbnailsInBackground(
          0, // startIndex: 最初から
          24, // batchSize: 最初の24個（早期終了ロジックあり）
          deckStore.deckList,
          (dno: number) => deckStore.getDeckDetail(dno),
          deckStore.headPlacementCardIds,
          deckStore.deckThumbnails,
          deckStore.cachedDeckInfos
        )
      }
    })

    /**
     * ファビコンを拡張機能のアイコンに変更
     */
    function changeFavicon() {
      try {
        // 既存のファビコンを削除
        const existingLinks = document.querySelectorAll("link[rel*='icon']")
        existingLinks.forEach(link => link.remove())

        // 新しいファビコンを追加
        const iconSizes = [
          { size: '16x16', path: chrome.runtime.getURL('icons/icon16.png') },
          { size: '48x48', path: chrome.runtime.getURL('icons/icon48.png') },
          { size: '128x128', path: chrome.runtime.getURL('icons/icon128.png') }
        ]

        iconSizes.forEach(({ size, path }) => {
          const link = document.createElement('link')
          link.rel = 'icon'
          link.type = 'image/png'
          link.sizes = size
          link.href = path
          document.head.appendChild(link)
        })
      } catch (error) {
        console.error('Failed to change favicon:', error)
      }
    }

    onUnmounted(() => {
      isComponentMounted = false
      // 全てのイベントリスナーを削除
      if (checkDnoChangeHandler) {
        window.removeEventListener('hashchange', checkDnoChangeHandler)
      }
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleGlobalKeydown)
      pendingLanguageChange = null
    })

    const createFilledCards = (count, prefix, isExtra = false) => {
      return Array.from({ length: count }, (_, i) => ({
        card: {
          name: `${prefix}カード${i + 1}`,
          cardId: `${prefix}-${i + 1}`,
          imageId: '1',
          cardType: isExtra ? 'monster' : 'monster',
          text: `${prefix}のカード${i + 1}`,
          isExtraDeck: isExtra,
          attribute: 'dark',
          levelType: 'level',
          levelValue: 4,
          race: 'warrior',
          types: ['effect']
        },
        quantity: 1
      }))
    }

    // 初期データ設定は行わない（load で読み込むため）
    
    const mainDeck = computed(() => {
      return deckStore.deckInfo.mainDeck.flatMap(dc =>
        Array.from({ length: dc.quantity }, () => dc.card)
      )
    })
    const extraDeck = computed(() => {
      return deckStore.deckInfo.extraDeck.flatMap(dc =>
        Array.from({ length: dc.quantity }, () => dc.card)
      )
    })
    const sideDeck = computed(() => {
      return deckStore.deckInfo.sideDeck.flatMap(dc =>
        Array.from({ length: dc.quantity }, () => dc.card)
      )
    })
    const trashDeck = computed(() => {
      return deckStore.trashDeck.flatMap(dc =>
        Array.from({ length: dc.quantity }, () => dc.card)
      )
    })

    // middle-decksの配置クラス
    const middleDecksClass = computed(() => ({
      'middle-decks': true,
      'vertical-layout': settingsStore.appSettings.middleDecksLayout === 'vertical'
    }))

    // カードサイズに応じた動的padding
    const deckAreasStyle = computed(() => {
      // 検索入力欄との適切な間隔を確保（固定値150px: 入力欄47px + bottom位置20px + 余裕83px）
      const paddingBottom = 150
      return {
        paddingBottom: `${paddingBottom}px`
      }
    })

    const mainContentStyle = computed(() => {
      // padding-bottomを.deck-areasに移動したため、ここでは何も設定しない
      return {}
    })

    const searchResults = reactive([])

    const showCardDetail = (card) => {
      selectedCard.value = card
      activeTab.value = 'card'
      cardTab.value = 'info'
    }

    const onSearchInput = async (query) => {
      if (!query || !query.trim()) {
        searchResults.length = 0
        return
      }

      try {
        // Load Dialog検索時に動的import
        const { searchCards } = await import('../../api/card-search')
        const results = await searchCards({
          keyword: query.trim(),
          searchType: '1',
          resultsPerPage: 100
        })
        const gameType = detectCardGameType()
        searchResults.length = 0
        searchResults.push(...results.map(card => {
          const relativeUrl = getCardImageUrl(card, gameType)
          const imageUrl = relativeUrl ? buildFullUrl(relativeUrl) : undefined
          return {
            card: {
              ...card,
              imageUrl
            },
            quantity: 1
          }
        }))
      } catch (error) {
        console.error('Search error:', error)
      }
    }

    const toggleDetail = (card) => {
    }

    const dragData = ref(null)

    const onDragStart = (event, deckType, index, card) => {
      if (card.empty) {
        event.preventDefault()
        return false
      }

      dragData.value = { deckType, index, card }
      event.dataTransfer.effectAllowed = deckType === 'search' ? 'copy' : 'move'
      event.dataTransfer.setData('text/plain', JSON.stringify({ deckType, index }))
    }

    const handleDragOver = (event) => {
      event.preventDefault()
      return false
    }

    const onAreaDrop = (event, targetDeckType) => {
      event.preventDefault()
      event.stopPropagation()
      if (!dragData.value) {
        console.error('ERROR: No drag data!')
        return
      }

      const { deckType: sourceDeckType, index: sourceIndex, card } = dragData.value

      if (sourceDeckType === 'search') {
        if (targetDeckType === 'main' || targetDeckType === 'extra') {
          deckStore.addCopyToMainOrExtra(card)
        } else if (targetDeckType === 'side') {
          deckStore.addCopyToSection(card, 'side')
        }
      } else if (sourceDeckType !== targetDeckType) {
        deckStore.moveCard(card.cardId, sourceDeckType, targetDeckType)
      }

      dragData.value = null
    }

    const onDragOver = (event) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    }

    const onDrop = (event, targetDeckType, targetIndex) => {
      event.preventDefault()
      event.stopPropagation()
      if (!dragData.value) {
        return
      }

      const { deckType: sourceDeckType, index: sourceIndex, card } = dragData.value

      if (sourceDeckType === 'search') {
        if (targetDeckType === 'main' || targetDeckType === 'extra') {
          deckStore.insertCard(card, card.isExtraDeck ? 'extra' : 'main', targetIndex)
        } else if (targetDeckType === 'side') {
          deckStore.insertCard(card, 'side', targetIndex)
        }
      } else {
        deckStore.moveCardWithPosition(card.cardId, sourceDeckType, sourceIndex, targetDeckType, targetIndex)
      }

      dragData.value = null
    }

    const findSectionByCard = (card) => {
      if (mainDeck.value.some(c => c.cardId === card.cardId)) return 'main'
      if (extraDeck.value.some(c => c.cardId === card.cardId)) return 'extra'
      if (sideDeck.value.some(c => c.cardId === card.cardId)) return 'side'
      if (trashDeck.value.some(c => c.cardId === card.cardId)) return 'trash'
      return null
    }

    const moveToTrash = (card, index) => {
      const section = findSectionByCard(card)
      if (section && section !== 'trash') {
        deckStore.moveCardToTrash(card, section)
      }
    }

    const moveToSide = (card, index) => {
      const section = findSectionByCard(card)
      if (section === 'main' || section === 'extra' || section === 'trash') {
        deckStore.moveCardToSide(card, section)
      }
    }

    const moveFromSide = (card, index) => {
      deckStore.moveCardFromSide(card)
    }

    const moveFromTrash = (card, index, targetType) => {
      if (targetType === 'side') {
        deckStore.moveCardToSide(card, 'trash')
      } else {
        deckStore.moveCardToMainOrExtra(card, 'trash')
      }
    }

    const addCopy = (card, index) => {
      const section = findSectionByCard(card)
      if (section && section !== 'trash') {
        deckStore.addCopyToSection(card, section)
      }
    }

    const addToMain = (card) => {
      deckStore.addCopyToSection(card, 'main')
    }

    const addToExtra = (card) => {
      deckStore.addCopyToSection(card, 'extra')
    }

    const addToSide = (card) => {
      deckStore.addCopyToSection(card, 'side')
    }

    const addToMainOrExtra = (card, index) => {
      deckStore.addCopyToMainOrExtra(card)
    }

    return {
      regulationFixTitle,
      regulationFixMessage,
      regulationFixButtons,
      isReady,
      deckStore,
      settingsStore,
      practiceStore,
      practiceMode,
      togglePracticeMode,
      toggleTwoDeckMode,
      loadDeckForField2,
      hardResetPractice,
      openDeckForPractice,
      openDeckForPracticeP2,
      saveDeckFromPractice,
      saveTempRecipe,
      handlePracticeAction,
      activeTab,
      searchQuery,
      selectedCard,
      showDetail,
      viewMode,
      cardTab,
      mainDeck,
      extraDeck,
      sideDeck,
      trashDeck,
      middleDecksClass,
      deckAreasStyle,
      mainContentStyle,
      searchResults,
      showCardDetail,
      onSearchInput,
      toggleDetail,
      addToMain,
      handleImportExportClose,
      handleExported,
      handleImported,
      confirmDelete,
      cancelDelete,
      addToExtra,
      addToSide,
      onDragStart,
      onDrop,
      onAreaDrop,
      handleDragOver,
      moveToTrash,
      moveToSide,
      moveFromSide,
      moveFromTrash,
      addCopy,
      addToMainOrExtra,
      toggleLoadDialog,
      handleDeckLoaded,
      unsavedChangesMessage,
      unsavedChangesTitle,
      unsavedChangesButtons,
      cancelUnsavedChanges,
    }
  }
}
</script>

<style scoped lang="scss">
@use '../../styles/themes.scss' as *;
@use '../../styles/common.scss' as *;

// Hide page top button
:global(.menu_btn_pagetop) {
  display: none !important;
}

.deck-edit-container {
  display: flex;
  height: calc(100vh - var(--header-height, 0px) - 20px);
  background-color: var(--bg-secondary);
  padding: 10px;
  position: relative;
  z-index: 1;
}

@media (max-width: 768px) {
  .deck-edit-container {
    padding: 5px;
  }

  .main-content.hide-on-mobile {
    display: none;
  }
}

.main-content {
  flex: 2 1 500px;  /* grow:2 shrink:1 basis:500px - 右エリアより優先的にスペースを取る */
  min-width: 400px;  /* デッキレシピの最小幅を確保 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  max-height: 100%;
  
  // DeckEditTopBarは固定、スクロールしない
  > :first-child {
    flex-shrink: 0;
    z-index: 10;
    margin: 0;
  }
}

.mobile-deck-content {
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
}

.deck-areas {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 12px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;

  // ローディング中はカードのアニメーションを無効化
  &.deck-loading {
    opacity: 0.5;
    pointer-events: none;

    // カードのスライド移動を防ぐ
    .deck-card {
      transition: none !important;
      transform: none !important;
    }
  }
}

// ローディングオーバーレイ（画面中央固定）
.deck-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 48px;
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.loading-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

// スピナーアニメーション
.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-primary);
  border-top-color: var(--color-info);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.practice-field-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
}

.opponent-field {
}

.deck-selector-panel {
  background: var(--bg-secondary, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.15));
  border-radius: 4px;
  padding: 8px;
}

.deck-selector-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, rgba(255, 255, 255, 0.6));
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-primary, rgba(255, 255, 255, 0.1));
}

.deck-selector-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 120px;
  overflow-y: auto;
}

.deck-selector-item {
  padding: 3px 8px;
  border: 1px solid var(--border-primary, rgba(255, 255, 255, 0.15));
  border-radius: 3px;
  background: var(--bg-tertiary, rgba(255, 255, 255, 0.08));
  color: var(--text-primary, #e0e0e0);
  font-size: 11px;
  cursor: pointer;

  &:hover {
    background: var(--color-primary, #1976d2);
    color: #fff;
    border-color: var(--color-primary, #1976d2);
  }
}

.deck-selector-empty {
  font-size: 11px;
  color: var(--text-tertiary, rgba(255, 255, 255, 0.4));
  padding: 4px;
}

.middle-decks {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
  width: 100%;
  align-items: flex-start;

  // デフォルト（横並び）時はextra/sideを50%幅に制限
  :deep(.extra-deck),
  :deep(.side-deck) {
    max-width: 50%;
  }

  &.vertical-layout {
    flex-direction: column;

    // 縦並び時はextra/sideセクションを全幅に拡張
    :deep(.extra-deck),
    :deep(.side-deck) {
      max-width: 100%;
    }
  }
}

.search-input-bottom {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 340px;
  display: flex;
  gap: 10px;
  background: var(--bg-primary);
  padding: 10px 15px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 100;

  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    padding: 5px;
    background: var(--input-bg) !important;
    color: var(--input-text) !important;

    &::placeholder {
      color: var(--text-tertiary) !important;
    }
  }
}

.search-btn {
  border: none;
  background: none;
  cursor: pointer;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);

  &:hover {
    color: var(--text-primary);
  }
}

.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 2px solid var(--button-bg);
  margin: 0;

  button {
    padding: 8px;
    border: none;
    background: var(--bg-primary);
    cursor: pointer;
    font-size: 13px;
    color: var(--text-primary);

    &.active {
      background: var(--button-bg);
      color: var(--button-text);
    }

    &.tab-header {
      background: var(--bg-tertiary);
      color: var(--text-tertiary);
      cursor: default;
      font-style: italic;
      opacity: 0.7;
    }
  }
}

.search-content,
.card-detail-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  margin: 0;
}

.search-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-secondary);
  margin-bottom: 10px;
}

.toolbar-item {
  display: flex;
  gap: 8px;
  align-items: center;

  label {
    display: flex;
    gap: 4px;
    align-items: center;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 13px;
  }

  .switch {
    cursor: pointer;
  }

  span {
    color: var(--text-primary);
    font-size: 14px;
  }
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

.search-result-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  background: var(--card-bg);
  cursor: move;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  min-height: 90px;
}

.card-thumb {
  width: 40px;
  height: 58px;
  object-fit: cover;
  border-radius: 2px;
  background: var(--bg-secondary);
  pointer-events: none;
  user-select: none;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-weight: bold;
  font-size: 11px;
  margin-bottom: 2px;
  word-break: break-word;
  color: var(--text-primary);
}

.card-status {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.card-text {
  font-size: 10px;
  color: var(--text-secondary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.detail-image {
  width: 100%;
  max-width: 250px;
  height: auto;
  margin: 15px 0;
  border-radius: 4px;
  background: var(--bg-secondary);
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 15px;

  button {
    padding: 8px;
    border: 1px solid var(--button-bg);
    background: var(--bg-primary);
    color: var(--button-bg);
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;

    &:hover {
      background: var(--button-bg);
      color: var(--button-text);
    }
  }
}

.switch-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  
  input[type="checkbox"] {
    display: none;
  }
  
  .slider {
    position: relative;
    width: 40px;
    height: 20px;
    background: var(--bg-tertiary);
    border-radius: 20px;
    transition: 0.3s;

    &::before {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      left: 2px;
      top: 2px;
      background: var(--button-text);
      border-radius: 50%;
      transition: 0.3s;
    }
  }

  input:checked + .slider {
    background: var(--button-bg);

    &::before {
      transform: translateX(20px);
    }
  }
}

.view-switch {
  display: flex;
  gap: 4px;
  
  .view-option {
    display: flex;
    align-items: center;
    cursor: pointer;
    
    input[type="radio"] {
      display: none;
    }
    
    .icon {
      padding: 4px 8px;
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      background: var(--bg-primary);
      color: var(--text-secondary);
      font-size: 16px;
    }
    
    input:checked + .icon {
      background: linear-gradient(135deg, #0089ff 0%, #0068d9 100%);
      color: white;
      border-color: #0068d9;
      box-shadow: 0 2px 8px rgba(0, 137, 255, 0.3);
    }
  }
}

.card-detail-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 2px solid var(--color-info);
  
  button {
    padding: 8px;
    border: none;
    background: var(--bg-primary);
    cursor: pointer;
    font-size: 12px;
    color: var(--text-primary);
    
    &.active {
      background: var(--color-info);
      color: var(--button-text);
    }
  }
}

.card-tab-content {
  padding: 15px;
}

.no-card-selected {
  padding: 20px;
  text-align: center;
  color: var(--text-tertiary);
}

.unified-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  animation: fadeIn 0.2s ease;
  pointer-events: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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
  z-index: 10001;
}

.dialog-content {
  background: var(--dialog-bg, white);
  border: 1px solid var(--dialog-border, #e0e0e0);
  border-radius: 8px;
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.2));
  width: 900px;
  max-width: 95vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary, #e0e0e0);
  flex-shrink: 0;

  .dialog-title {
    font-size: 14px;
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

.dialog-body {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
  width: calc(100% - 30px);

  .loading-placeholder {
    min-height: 400px;
  }

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
  grid-template-columns: repeat(auto-fill, 320px);
  gap: 12px;
  justify-content: start;
}


@keyframes spin {
  to {
    transform: rotate(360deg);
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
    color: var(--text-primary, #333);
  }

  .warning {
    color: #f44336;
    font-weight: 500;
  }
}

.delete-confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;

  button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;

    &.btn-cancel {
      background: var(--bg-secondary, #f5f5f5);
      color: var(--text-primary, #333);

      &:hover {
        background: var(--bg-tertiary, #e0e0e0);
      }
    }

    &.btn-delete {
      background: var(--color-error);
      color: var(--button-text);

      &:hover {
        background: var(--color-error-hover);
      }
    }
  }
}

.mode-switch-enter-active,
.mode-switch-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.mode-switch-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.mode-switch-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.p2-field-slide-enter-active,
.p2-field-slide-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.p2-field-slide-enter-from,
.p2-field-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.p2-field-wrapper {
  width: 100%;
  flex-shrink: 0;
}

.p2-field-wrapper > .practice-field {
  width: 100%;
}
</style>
