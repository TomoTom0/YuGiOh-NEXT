<template>
  <div id="ygo-next-card-detail-container" class="ygo-next">
    <CardDetail
      v-if="settingsStore.appSettings.showCardDetailInDeckDisplay"
      :card="cardDetailStore.selectedCard"
      class="ygo-next card-detail"
    />
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, onUnmounted, watch } from 'vue'
import { useCardDetailStore } from '../../stores/card-detail'
import { useSettingsStore } from '../../stores/settings'
import { cleanupCardImageHoverUI } from './vueSetup'

const CardDetail = defineAsyncComponent(() => import('../../components/CardDetail.vue'))

export default defineComponent({
  components: {
    CardDetail
  },
  setup() {
    const cardDetailStore = useCardDetailStore()
    const settingsStore = useSettingsStore()

    // showCardDetailInDeckDisplay の状態に応じて、<html>にクラスを付与
    const updateHtmlClass = () => {
      const htmlElement = document.documentElement
      if (settingsStore.appSettings.showCardDetailInDeckDisplay) {
        htmlElement.classList.add('ygo-next-valid-card-tab-on-deck-display')
      } else {
        htmlElement.classList.remove('ygo-next-valid-card-tab-on-deck-display')
      }
    }

    // 初期化時に実行
    updateHtmlClass()

    // showCardDetailInDeckDisplay の変更を監視
    watch(
      () => settingsStore.appSettings.showCardDetailInDeckDisplay,
      () => updateHtmlClass()
    )

    // アンマウント時にイベントリスナーをクリーンアップ（メモリリーク防止）
    onUnmounted(() => {
      cleanupCardImageHoverUI()
      console.debug('[DeckDisplayApp] Cleaned up card image hover UI on unmount')
    })

    return {
      cardDetailStore,
      settingsStore
    }
  }
})
</script>

<style lang="scss">
@use '../../styles/themes.scss' as *;

html.ygo-next-valid-card-tab-on-deck-display {
  * {
    min-height: auto;
  }

  .subcategory h3 {
    min-width: auto;
  }

  #main980 {
    gap: 0;
  }

  /* DeckCard.vueと同じcard-controlsスタイル（デッキ表示画面用） */
  .ygo-next {
    &.ygo-next-card-controls {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      z-index: 1;
    }
  }

  .ygo-next.ygo-next-card-btn {
    opacity: 0;
    transition: opacity 0.2s;
  }

  #main > div.image_set > a:hover .ygo-next.ygo-next-card-btn,
  #extra > div.image_set > a:hover .ygo-next.ygo-next-card-btn,
  #side > div.image_set > a:hover .ygo-next.ygo-next-card-btn {
    opacity: 1;
  }

  /* ロック済みカードはロックアイコン（top-right）のみ常時表示 */
  #main > div.image_set > a[data-ygo-next-sortfix] .ygo-next.ygo-next-card-btn.top-right.is-sortfixed,
  #extra > div.image_set > a[data-ygo-next-sortfix] .ygo-next.ygo-next-card-btn.top-right.is-sortfixed,
  #side > div.image_set > a[data-ygo-next-sortfix] .ygo-next.ygo-next-card-btn.top-right.is-sortfixed {
    opacity: 1;
  }

  .ygo-next {
    &.ygo-next-card-btn {
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      display: flex;
      color: var(--button-text);
      font-size: 8px;
      font-weight: bold;
      transition: all 0.15s;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        transition: background 0.15s;
        pointer-events: none;
      }

      .btn-text {
        position: relative;
        z-index: 1;
      }

      &.top-left {
        grid-column: 1;
        grid-row: 1;
        align-items: flex-start;
        justify-content: flex-start;
        padding: 2px 0 0 2px;

        &::before {
          top: 0;
          left: 0;
          width: 66.67%;
          height: 66.67%;
          background: var(--deck-card-btn-top-left-bg);
          border: none;
          transition: all 0.15s;
        }

        &:hover::before {
          background: var(--deck-card-btn-top-left-hover-bg);
          border: 1px solid var(--deck-card-btn-top-left-hover-border);
        }

        .btn-text {
          font-size: 9px;
        }
      }

      &.top-right {
        grid-column: 2;
        grid-row: 1;
        align-items: flex-start;
        justify-content: flex-end;
        padding: 2px 2px 0 0;

        &::before {
          top: 0;
          right: 0;
          width: 66.67%;
          height: 66.67%;
          background: var(--deck-card-btn-top-right-bg);
          border: none;
          transition: all 0.15s;
        }

        &:hover::before {
          background: var(--deck-card-btn-top-right-hover-bg);
          border: 1px solid var(--deck-card-btn-top-right-hover-border);
        }

        /* sortfix ON の場合 */
        &.is-sortfixed {
          svg {
            display: block;
            position: relative;
            z-index: 1;
            stroke: var(--button-text);
          }

          &::before {
            background: var(--deck-card-btn-top-right-s-bg);
          }

          &:hover::before {
            background: var(--deck-card-btn-top-right-s-hover-bg);
            border: 1px solid var(--deck-card-btn-top-right-s-hover-border);
          }
        }
      }

      &.bottom-left, &.bottom-right {
        /* 現時点では未使用だが、構造を統一 */
      }
    }
  }

  .ygo-next.card-detail {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .ygo-next.card-detail .ygo-next.card-detail-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }

  div.ygo-next.card-tab-content,
  div.ygo-next.tab-content {
    overflow-y: auto;
    overflow-x: hidden;
    padding: 10px;
    box-sizing: border-box;
    min-height: auto !important;
    height: calc(100vh - 140px);
  }

  div.ygo-next.card-tab-content {
    width: 310px;
  }

  .ygo-next.card-info-top {
    min-height: auto !important;
  }
}
</style>

<style scoped>
#ygo-next-card-detail-container {
  max-height: calc(100vh - 100px);
  position: sticky;
  top: 80px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.no-card-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
}

.no-card-selected p {
  margin: 0;
}
</style>
