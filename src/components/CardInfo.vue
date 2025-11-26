<template>
  <div class="card-info-layout">
    <h3
      class="card-name-large"
      :class="{ clickable: card?.ruby }"
      @click="card?.ruby && toggleRuby()"
    >{{ card?.name }}</h3>
    <transition name="ruby-expand">
      <div v-if="showRuby && card?.ruby" class="card-ruby">{{ card.ruby }}</div>
    </transition>
    <div class="card-info-top">
      <div class="card-image-wrapper">
        <DeckCard
          v-if="card"
          :key="cardUuid"
          :card="card"
          :section-type="'info'"
          :uuid="cardUuid"
        />
        <button
          v-if="showImageSelectButton"
          class="image-select-btn"
          @click="toggleImageDialog"
          :title="`画像を選択 (${card.imgs?.length || 0}種類)`"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" :d="mdiImageMultiple" />
          </svg>
        </button>
        <transition name="dialog-fade">
          <div v-if="showImageDialog" class="image-select-dialog">
          <div class="image-grid">
            <div
              v-for="(img, index) in card?.imgs"
              :key="img.ciid"
              class="image-option"
              :class="{ active: img.ciid === card?.ciid }"
              @click="selectImage(img.ciid)"
            >
              <img :src="getImageUrl(img)" :alt="`画像 ${index + 1}`">
              <span class="image-label">{{ index + 1 }}</span>
            </div>
          </div>
          </div>
        </transition>
      </div>
      <div class="card-details">

        <div v-if="card.cardType === 'monster'" class="card-stats-layout">
          <div class="stat-box stat-box-type">
            <span class="stat-text">{{ getMonsterTypesText(card.types) }}</span>
          </div>
          
          <div class="stat-box">
            <span class="stat-text">
              <img v-if="card.attribute" :src="getAttributeIcon(card.attribute)" class="attribute-icon" :alt="card.attribute">
              {{ getAttributeText(card.attribute) }} / {{ getRaceText(card.race) }}
            </span>
          </div>
          
          <div class="stat-box-row">
            <div class="stat-box">
              <img v-if="card.levelType === 'level'" :src="getLevelIcon()" class="level-icon" alt="Level">
              <img v-else-if="card.levelType === 'rank'" :src="getRankIcon()" class="level-icon" alt="Rank">
              <span class="stat-text">
                <template v-if="card.levelType === 'level'">Level</template>
                <template v-else-if="card.levelType === 'rank'">Rank</template>
                <template v-else-if="card.levelType === 'link'">Link</template>
                {{ card.levelValue }}
              </span>
            </div>
            <div v-if="card.pendulumScale !== undefined" class="stat-box">
              <span class="stat-text">Scale {{ card.pendulumScale }}</span>
            </div>
            <div v-if="card.linkMarkers !== undefined" class="stat-box stat-box-link">
              <span class="icon_img_set" alt="Link Markers" title="Link Markers">
                <span v-for="pos in [7, 8, 9, 4, 6, 1, 2, 3]" :key="pos" :class="['i_i_' + pos, { active: isLinkMarkerActive(card.linkMarkers, pos) }]"></span>
              </span>
            </div>
          </div>
          
          <div class="stat-box">
            <span class="stat-text">
              ATK {{ card.atk }}
              <template v-if="card.def !== undefined"> / DEF {{ card.def }}</template>
            </span>
          </div>
        </div>
        
        <div v-else class="card-stats-layout">
          <div class="stat-box stat-box-type">
            <img v-if="card.cardType === 'spell'" :src="getSpellIconUrl()" class="card-type-icon" alt="魔法">
            <img v-else-if="card.cardType === 'trap'" :src="getTrapIconUrl()" class="card-type-icon" alt="罠">
            <span class="stat-text">{{ getCardTypeText(card.cardType) }}</span>
          </div>
          <div v-if="card.effectType" class="stat-box stat-box-subtype">
            <img v-if="getEffectTypeIconUrl(card.effectType)" :src="getEffectTypeIconUrl(card.effectType)" class="effect-type-icon" :alt="card.effectType">
            <span class="stat-text">{{ getEffectTypeText(card.effectType, card.cardType) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="card-info-bottom">
      <div v-if="card.pendulumEffect" class="card-effect-section">
        <div class="section-title">Pend. Text</div>
        <div class="effect-text">{{ card.pendulumEffect }}</div>
      </div>

      <div v-if="pendulumSupplementInfo" class="card-effect-section">
        <div class="section-title">Pend. Detail{{ pendulumSupplementDate ? ` [${pendulumSupplementDate}]` : '' }}</div>
        <div class="detail-text">
          <template v-for="(part, partIndex) in parseCardLinks(pendulumSupplementInfo)" :key="partIndex">
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
      </div>

      <div v-if="card" class="card-effect-section">
        <div class="section-title">Card Text</div>
        <div class="effect-text">
          <template v-if="card.text && card.text.trim() !== ''">{{ card.text }}</template>
          <template v-else><span class="no-data">テキスト情報がありません</span></template>
        </div>
      </div>

      <div v-if="supplementInfo" class="card-effect-section">
        <div class="section-title">Detail{{ supplementDate ? ` [${supplementDate}]` : '' }}</div>
        <div class="detail-text">
          <template v-for="(part, partIndex) in parseCardLinks(supplementInfo)" :key="partIndex">
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
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { getAttributeIconUrl, getLevelIconUrl, getRankIconUrl, getSpellIconUrl, getTrapIconUrl, getEffectTypeIconUrl } from '../api/image-utils'
import { ATTRIBUTE_MAP, RACE_MAP, SPELL_EFFECT_TYPE_MAP, TRAP_EFFECT_TYPE_MAP, MONSTER_TYPE_MAP } from '../types/card-maps'
import { useDeckEditStore } from '../stores/deck-edit'
import { useCardLinks } from '../composables/useCardLinks'
import DeckCard from './DeckCard.vue'
import { mdiImageMultiple } from '@mdi/js'

export default {
  name: 'CardInfo',
  components: {
    DeckCard
  },
  props: {
    supplementInfo: {
      type: String,
      default: undefined
    },
    supplementDate: {
      type: String,
      default: undefined
    },
    pendulumSupplementInfo: {
      type: String,
      default: undefined
    },
    pendulumSupplementDate: {
      type: String,
      default: undefined
    }
  },
  setup(props) {
    const deckStore = useDeckEditStore()
    const { parseCardLinks, handleCardLinkClick } = useCardLinks()
    const showImageDialog = ref(false)
    const showRuby = ref(false) // Default to hidden

    // selectedCardをそのまま使用（detail取得後に全imgs含む完全なデータに更新される）
    const card = computed(() => deckStore.selectedCard)

    // ルビ表示の切り替え
    const toggleRuby = () => {
      showRuby.value = !showRuby.value
    }

    // カードが変わったらルビ表示をデフォルトに戻す
    watch(() => card.value?.cardId, () => {
      showRuby.value = false
    })

    // cardIdをキーとして安定したUUIDを生成（同じカードなら同じUUID）
    const cardUuid = computed(() => {
      if (!card.value) return 'no-card'
      return card.value.cardId
    })

    // 画像選択ボタンを表示するかどうか
    const showImageSelectButton = computed(() => {
      console.log('[CardInfo] showImageSelectButton check:', {
        hasCard: !!card.value,
        hasImgs: !!card.value?.imgs,
        imgsLength: card.value?.imgs?.length || 0,
        imgs: card.value?.imgs
      })
      const result = !!(card.value && card.value.imgs && card.value.imgs.length > 1)
      return result
    })

    const toggleImageDialog = () => {
      showImageDialog.value = !showImageDialog.value
    }

    const selectImage = (ciid) => {
      // selectedCardのciidを直接更新（ref内のオブジェクトなので反応性は保たれる）
      if (deckStore.selectedCard) {
        deckStore.selectedCard.ciid = String(ciid)
      // debug logging removed
      }
      showImageDialog.value = false
    }

    const getImageUrl = (img) => {
      if (!card.value) return ''
      return `https://www.db.yugioh-card.com/yugiohdb/get_image.action?type=1&cid=${card.value.cardId}&ciid=${img.ciid}&enc=${img.imgHash}&osplang=1`
    }

    return {
      deckStore,
      parseCardLinks,
      handleCardLinkClick,
      card,
      cardUuid,
      showImageDialog,
      showImageSelectButton,
      toggleImageDialog,
      selectImage,
      getImageUrl,
      mdiImageMultiple,
      showRuby,
      toggleRuby
    }
  },
  methods: {
    getCardTypeText(cardType) {
      if (cardType === 'spell') return '魔法'
      if (cardType === 'trap') return '罠'
      return cardType
    },
    getSpellIconUrl,
    getTrapIconUrl,
    getEffectTypeIconUrl,
    getAttributeText(attribute) {
      return ATTRIBUTE_MAP[attribute] || attribute
    },
    getRaceText(race) {
      return RACE_MAP[race] || race
    },
    getEffectTypeText(effectType, cardType) {
      if (cardType === 'spell') {
        return SPELL_EFFECT_TYPE_MAP[effectType] || effectType
      } else if (cardType === 'trap') {
        return TRAP_EFFECT_TYPE_MAP[effectType] || effectType
      }
      return effectType
    },
    getMonsterTypesText(types) {
      if (!types || !Array.isArray(types)) return ''
      return types.map(t => MONSTER_TYPE_MAP[t] || t).join(' / ')
    },
    isLinkMarkerActive(linkMarkers, posDisplay) {
      if (!linkMarkers || posDisplay === 5) return false
      // posDisplayは1-9のグリッド位置、linkMarkersは0から始まるビット
      // ビット0=位置1(左下), 1=位置2(下), 2=位置3(右下), 3=位置4(左), 5=位置6(右), 6=位置7(左上), 7=位置8(上), 8=位置9(右上)
      const bitMap = {1: 0, 2: 1, 3: 2, 4: 3, 6: 5, 7: 6, 8: 7, 9: 8}
      const bitPos = bitMap[posDisplay]
      return bitPos !== undefined && (linkMarkers & (1 << bitPos)) !== 0
    },
    getLinkMarkerArrow(position) {
      const dirMap = {
        0: '↙', 1: '↓', 2: '↘',
        3: '←', 5: '→',
        6: '↖', 7: '↑', 8: '↗'
      }
      return dirMap[position] || ''
    },
    getAttributeIcon(attribute) {
      return getAttributeIconUrl(attribute)
    },
    getLevelIcon() {
      return getLevelIconUrl()
    },
    getRankIcon() {
      return getRankIconUrl()
    }
  }
}
</script>

<style lang="scss" scoped>
.card-info-layout {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  animation: cardInfoFadeIn 0.25s ease-out;

  * {
    box-sizing: border-box;
  }
}

@keyframes cardInfoFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-name-large {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-primary);
  margin: 0;
  width: 100%;

  &.clickable {
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: var(--theme-color-start, #00d9b8);
    }
  }
}

.card-ruby {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 2px 0 6px 0;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
}

// ルビ展開アニメーション
.ruby-expand-enter-active {
  transition: all 0.2s ease-out;
}

.ruby-expand-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.ruby-expand-enter-from {
  opacity: 0;
  max-height: 0;
  margin: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.ruby-expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.ruby-expand-enter-to,
.ruby-expand-leave-from {
  opacity: 1;
  max-height: 100px;
}

.card-info-top {
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.card-info-bottom {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.card-image-wrapper {
  flex-shrink: 0;
  width: var(--card-width-info, 90px);
  position: relative;

  .deck-card {
    width: var(--card-width-info, 90px);
    height: var(--card-height-info, 132px);

    img {
      width: 100%;
      height: 100%;
    }
  }
}

.image-select-btn {
  width: 100%;
  margin-top: 4px;
  padding: 6px;
  background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 217, 184, 0.3);

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 217, 184, 0.5);
    transform: translateY(-1px);
    filter: brightness(1.1);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 1px 3px rgba(0, 217, 184, 0.4);
  }

  svg {
    display: block;
  }
}

.image-select-dialog {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 10px;
  z-index: 1000;
  min-width: 220px;
}

// トランジションアニメーション
.dialog-fade-enter-active {
  transition: all 0.2s ease-out;
}

.dialog-fade-leave-active {
  transition: all 0.15s ease-in;
}

.dialog-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dialog-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.dialog-fade-enter-to,
.dialog-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.image-option {
  position: relative;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s;
  background: #f5f5f5;

  &:hover {
    border-color: var(--theme-color-start, #00d9b8);
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 217, 184, 0.3);
  }

  &.active {
    border-color: var(--theme-color-start, #00d9b8);
    box-shadow: 0 0 8px rgba(0, 217, 184, 0.5);
    background: linear-gradient(135deg, rgba(0, 217, 184, 0.1) 0%, rgba(184, 79, 201, 0.1) 100%);
  }

  img {
    width: 100%;
    height: auto;
    display: block;
  }

  .image-label {
    position: absolute;
    bottom: 3px;
    right: 3px;
    background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: bold;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
}

.card-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.attribute-icon {
  width: 14px;
  height: 14px;
  vertical-align: middle;
  margin-right: 3px;
  display: inline-block;
}

.level-icon {
  width: 12px;
  height: 12px;
  vertical-align: middle;
  margin-right: 2px;
  display: inline-block;
}

.card-stats-layout {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stat-box-row {
  display: flex;
  gap: 3px;
}

.stat-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: var(--bg-secondary);
  font-size: 11px;
  
  &.stat-box-type {
    width: 95%;
    box-sizing: border-box;
    transform: skewX(-10deg);
    background: linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%);
    justify-content: center;
    flex-shrink: 0;
    
    .card-type-icon {
      width: 16px;
      height: 16px;
      transform: skewX(10deg);
      flex-shrink: 0;
    }
    
    .stat-text {
      transform: skewX(10deg);
      text-align: center;
      line-height: 1.4;
      white-space: nowrap;
    }
  }
  
  &.stat-box-subtype {
    width: 100%;
    background: var(--bg-secondary);
    border: 1px solid #ddd;
    
    .effect-type-icon {
      width: 16px;
      height: 16px;
    }
  }
  
  &.stat-box-link {
    padding: 4px 6px;
    background: transparent;
    border: none;
  }
}

.effect-type-icon {
  width: 16px;
  height: 16px;
  vertical-align: middle;
  display: inline-block;
}

.card-type-icon {
  width: 16px;
  height: 16px;
  vertical-align: middle;
  display: inline-block;
}

.icon_img_set {
  display: inline-block;
  position: relative;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 2px;
  
  span {
    position: absolute;
    width: 8px;
    height: 8px;
    clip-path: polygon(0 0, 100% 100%, 0 100%);
    background: var(--bg-tertiary);

    &.active {
      background: var(--button-bg);
    }
    
    // 位置1: 左下 (中心から左下向き ↙) bit 0
    &.i_i_1 {
      bottom: 0px;
      left: 0px;
      transform: rotate(0deg);
    }
    // 位置2: 下 (中心から下向き ↓) bit 1
    &.i_i_2 {
      bottom: 0px;
      left: 50%;
      transform: translateX(-50%) rotate(-45deg);
    }
    // 位置3: 右下 (中心から右下向き ↘) bit 2
    &.i_i_3 {
      bottom: 0px;
      right: 0px;
      transform: rotate(-90deg);
    }
    // 位置4: 左 (中心から左向き ←) bit 3
    &.i_i_4 {
      top: 50%;
      left: 0px;
      transform: translateY(-50%) rotate(45deg);
    }
    // 位置6: 右 (中心から右向き →) bit 5
    &.i_i_6 {
      top: 50%;
      right: 0px;
      transform: translateY(-50%) rotate(-135deg);
    }
    // 位置7: 左上 (中心から左上向き ↖) bit 6
    &.i_i_7 {
      top: 0px;
      left: 0px;
      transform: rotate(90deg);
    }
    // 位置8: 上 (中心から上向き ↑) bit 7
    &.i_i_8 {
      top: 0px;
      left: 50%;
      transform: translateX(-50%) rotate(135deg);
    }
    // 位置9: 右上 (中心から右上向き ↗) bit 8
    &.i_i_9 {
      top: 0px;
      right: 0px;
      transform: rotate(180deg);
    }
  }
}

.link-markers-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
}

.marker-cell {
  width: 16px;
  height: 16px;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  font-size: 10px;
  
  &.active {
    background: var(--button-bg);
    color: white;
    font-weight: bold;
  }
  
  &:nth-child(5) {
    background: var(--bg-secondary);
  }
}

.stat-text {
  font-size: 11px;
  font-weight: bold;
  color: var(--text-primary);
}

.stat-separator {
  margin: 0 4px;
  color: var(--text-tertiary);
}

.stat-label {
  font-size: 9px;
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.stat-value {
  font-size: 12px;
  font-weight: bold;
  color: var(--text-primary);
}

.card-pendulum-effect,
.card-effect-text,
.card-effect-section {
  margin-top: 5px;
  width: 100%;
}

.section-title {
  font-size: 11px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 6px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: 4px 4px 0 0;
  width: 100%;
}

.effect-text {
  font-size: 11px;
  color: var(--text-primary);
  line-height: 1.6;
  white-space: pre-line;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 0 0 4px 4px;
  background: var(--bg-primary);
  width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.detail-text {
  font-size: 11px;
  color: var(--text-primary);
  line-height: 1.6;
  white-space: pre-line;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 0 0 4px 4px;
  background: var(--bg-secondary);
  width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
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
</style>
