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
import { defineAsyncComponent, defineComponent, watch } from 'vue'
import { useCardDetailStore } from '../../stores/card-detail'
import { useSettingsStore } from '../../stores/settings'

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
        htmlElement.classList.add('ygo-next')
        htmlElement.classList.add('ygo-next-valid-card-tab-on-deck-display')
      } else {
        htmlElement.classList.remove('ygo-next')
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

    return {
      cardDetailStore,
      settingsStore
    }
  }
})
</script>

<style lang="scss">
@use '../../styles/themes.scss' as *;

html.ygo-next.ygo-next-valid-card-tab-on-deck-display {
  * {
    min-height: auto;
  }

  .subcategory h3 {
    min-width: auto;
  }

  #main980 {
    gap: 0;
  }

  .ygo-next.ygo-next-card-hover-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    height: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 101, 0, 0.5);
    pointer-events: none;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
  }

  #main > div.image_set > a.ygo-next-hover-overlay-active .ygo-next.ygo-next-card-hover-overlay,
  #side > div.image_set > a.ygo-next-hover-overlay-active .ygo-next.ygo-next-card-hover-overlay {
    opacity: 0.3;
  }

  #main > div.image_set > a.ygo-next-cursor-in-area .ygo-next.ygo-next-card-hover-overlay,
  #side > div.image_set > a.ygo-next-cursor-in-area .ygo-next.ygo-next-card-hover-overlay {
    opacity: 0.6;
    pointer-events: auto;
  }

  .ygo-next.ygo-next-card-info-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #ff6500;
    color: white;
    border: none;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease-in-out;
    pointer-events: auto;
    z-index: 11;
  }

  .ygo-next.ygo-next-card-info-btn:hover {
    background: #ff5500;
  }

  .ygo-next.ygo-next-card-info-btn:active {
    transform: scale(0.95);
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
