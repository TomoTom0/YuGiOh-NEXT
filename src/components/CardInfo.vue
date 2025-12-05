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
    <div class="ygo-next card-info-top">
      <div class="card-image-wrapper" @click="closeMenuIfOutside">
        <DeckCard
          v-if="card"
          :key="cardUuid"
          :card="card"
          :section-type="'info'"
          :uuid="cardUuid"
        />
        <div class="card-buttons-container">
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
          <button
            v-if="card"
            class="card-menu-btn"
            @click.stop="showCardMenu = !showCardMenu"
            title="カード操作メニュー"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16Z" />
            </svg>
          </button>
        </div>
        <Transition name="menu-fade">
          <div v-if="showCardMenu" class="card-menu-dropdown" @click.stop>
            <button
              class="card-menu-item"
              :class="{ 'tail-placement-active': isTailPlaced }"
              @click="toggleTailPlacement"
            >
              <span class="menu-item-label">
                {{ isTailPlaced ? '末尾配置を解除' : '末尾配置に追加' }}
              </span>
            </button>
          </div>
        </Transition>
        <transition name="dialog-fade">
          <div v-if="showImageDialog" class="image-select-dialog">
          <div class="image-grid">
            <div
              v-for="(img, index) in card?.imgs"
              :key="img.ciid"
              class="image-option"
              :class="{ active: img.ciid === card?.ciid, invalid: !isCiidValid(img.ciid) }"
              @click="isCiidValid(img.ciid) && selectImage(img.ciid)"
            >
              <img :src="getImageUrl(img)" :alt="`画像 ${index + 1}`">
              <span class="image-label">{{ index + 1 }}</span>
              <div v-if="!isCiidValid(img.ciid)" class="invalid-overlay">
                <span class="invalid-mark">×</span>
              </div>
            </div>
          </div>
          </div>
        </transition>
      </div>
      <div class="card-details">

        <div v-if="card.cardType === 'monster'" class="card-stats-layout">
          <div class="stat-box-row">
            <div v-for="type in card.types" :key="type" class="stat-box stat-box-type-chip" :data-type="type">
              <span class="stat-text">{{ getMonsterTypeText(type) }}</span>
            </div>
          </div>

          <div class="stat-box-row">
            <div v-if="card.attribute" class="stat-box">
              <img :src="getAttributeIcon(card.attribute)" class="attribute-icon" :alt="card.attribute">
              <span class="stat-text">{{ getAttributeText(card.attribute) }}</span>
            </div>
            <div v-if="card.race" class="stat-box">
              <span class="stat-text">{{ getRaceText(card.race) }}</span>
            </div>
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

          <div class="stat-box-row">
            <div class="stat-box">
              <span class="stat-text">ATK {{ card.atk }}</span>
            </div>
            <div v-if="card.def !== undefined" class="stat-box">
              <span class="stat-text">DEF {{ card.def }}</span>
            </div>
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
      <div v-if="card.pendulumText" class="card-effect-section">
        <div class="section-title">Pend. Text</div>
        <div class="effect-text">{{ card.pendulumText }}</div>
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
import { ATTRIBUTE_ID_TO_NAME, RACE_ID_TO_NAME, SPELL_EFFECT_TYPE_ID_TO_NAME, TRAP_EFFECT_TYPE_ID_TO_NAME, MONSTER_TYPE_ID_TO_NAME } from '../types/card-maps'
import { useDeckEditStore } from '../stores/deck-edit'
import { useCardDetailStore } from '../stores/card-detail'
import { useSettingsStore } from '../stores/settings'
import { useCardLinks } from '../composables/useCardLinks'
import DeckCard from './DeckCard.vue'
import { mdiImageMultiple } from '@mdi/js'
import { buildApiUrl } from '../utils/url-builder'
import { detectCardGameType } from '../utils/page-detector'
import { getUnifiedCacheDB } from '../utils/unified-cache-db'
import { detectLanguage } from '../utils/language-detector'
import { mappingManager } from '../utils/mapping-manager'

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
    console.log('[CardInfo] setup props:', props)
    const deckStore = useDeckEditStore()
    const cardDetailStore = useCardDetailStore()
    const settingsStore = useSettingsStore()
    const { parseCardLinks, handleCardLinkClick } = useCardLinks()
    const showImageDialog = ref(false)
    const showRuby = ref(false) // Default to hidden
    const showCardMenu = ref(false)

    // cardDetailStoreから selectedCard を取得
    const card = computed(() => cardDetailStore.selectedCard)

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
      return !!(card.value && card.value.imgs && card.value.imgs.length > 1)
    })

    const toggleImageDialog = () => {
      showImageDialog.value = !showImageDialog.value
    }

    const selectImage = (ciid) => {
      // selectedCardのciidを直接更新
      if (cardDetailStore.selectedCard) {
        cardDetailStore.selectedCard.ciid = String(ciid)
      }
      showImageDialog.value = false
    }

    const getImageUrl = (img) => {
      if (!card.value) return ''
      // buildApiUrl経由で request_locale を自動付与
      const path = `get_image.action?type=1&cid=${card.value.cardId}&ciid=${img.ciid}&enc=${img.imgHash}&osplang=1`
      const gameType = detectCardGameType()
      return buildApiUrl(path, gameType)
    }

    // 言語ごとの利用可能ciidをチェック
    const getValidCiidsForCurrentLang = () => {
      if (!card.value?.cardId) return [];
      // UnifiedCacheDBから langs_ciids を取得
      const unifiedDB = getUnifiedCacheDB();
      if (!unifiedDB.isInitialized()) return [];

      const lang = detectLanguage(document);
      return unifiedDB.getValidCiidsForLang(card.value.cardId, lang);
    }

    // ciidが現在の言語で有効かチェック
    const isCiidValid = (ciid) => {
      const validCiids = getValidCiidsForCurrentLang();
      if (validCiids.length === 0) return true; // ciidsリストが空の場合はすべて有効と判定
      return validCiids.includes(String(ciid));
    }

    // 末尾配置状態を確認
    const isTailPlaced = computed(() => {
      return card.value ? settingsStore.isTailPlacementCard(card.value.cardId) : false
    })

    // 末尾配置の追加/削除を切り替える
    const toggleTailPlacement = () => {
      if (!card.value) return

      if (isTailPlaced.value) {
        settingsStore.removeTailPlacementCard(card.value.cardId)
      } else {
        settingsStore.addTailPlacementCard(card.value.cardId)
      }

      // メニューを閉じる
      showCardMenu.value = false
    }

    // メニュー外をクリックしたときにメニューを閉じる
    const closeMenuIfOutside = (event) => {
      // メニューボタンやドロップダウン上をクリックしている場合は何もしない
      const target = event.target
      const isMenuBtn = target.closest('.card-menu-btn')
      const isMenuDropdown = target.closest('.card-menu-dropdown')

      if (!isMenuBtn && !isMenuDropdown && showCardMenu.value) {
        showCardMenu.value = false
      }
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
      toggleRuby,
      isCiidValid,
      getValidCiidsForCurrentLang,
      showCardMenu,
      isTailPlaced,
      toggleTailPlacement,
      closeMenuIfOutside
    }
  },
  methods: {
    getCardTypeText(cardType) {
      const lang = detectLanguage(document)
      if (cardType === 'spell') {
        return lang === 'ja' ? '魔法' : 'Spell'
      }
      if (cardType === 'trap') {
        return lang === 'ja' ? '罠' : 'Trap'
      }
      return cardType
    },
    getSpellIconUrl,
    getTrapIconUrl,
    getEffectTypeIconUrl,
    getAttributeText(attribute) {
      const lang = detectLanguage(document)
      // 日本語の場合は静的マップを使用
      if (lang === 'ja') {
        return ATTRIBUTE_ID_TO_NAME[attribute] || attribute
      }
      // その他の言語は MappingManager から取得
      const attrMap = mappingManager.getAttributeTextToId(lang)
      // attrMap は text->id なので、id->text の逆引きが必要
      for (const [text, id] of Object.entries(attrMap)) {
        if (id === attribute) {
          return text
        }
      }
      return ATTRIBUTE_ID_TO_NAME[attribute] || attribute
    },
    getRaceText(race) {
      const lang = detectLanguage(document)
      // 日本語の場合は静的マップを使用
      if (lang === 'ja') {
        return RACE_ID_TO_NAME[race] || race
      }
      // その他の言語は MappingManager から取得
      const raceMap = mappingManager.getRaceTextToId(lang)
      // raceMap は text->id なので、id->text の逆引きが必要
      for (const [text, id] of Object.entries(raceMap)) {
        if (id === race) {
          return text
        }
      }
      return RACE_ID_TO_NAME[race] || race
    },
    getEffectTypeText(effectType, cardType) {
      const lang = detectLanguage(document)
      if (cardType === 'spell') {
        if (lang === 'ja') {
          return SPELL_EFFECT_TYPE_ID_TO_NAME[effectType] || effectType
        }
        const spellMap = mappingManager.getSpellEffectTextToId(lang)
        for (const [text, id] of Object.entries(spellMap)) {
          if (id === effectType) {
            return text
          }
        }
        return SPELL_EFFECT_TYPE_ID_TO_NAME[effectType] || effectType
      } else if (cardType === 'trap') {
        if (lang === 'ja') {
          return TRAP_EFFECT_TYPE_ID_TO_NAME[effectType] || effectType
        }
        const trapMap = mappingManager.getTrapEffectTextToId(lang)
        for (const [text, id] of Object.entries(trapMap)) {
          if (id === effectType) {
            return text
          }
        }
        return TRAP_EFFECT_TYPE_ID_TO_NAME[effectType] || effectType
      }
      return effectType
    },
    getMonsterTypesText(types) {
      if (!types || !Array.isArray(types)) return ''
      return types.map(t => this.getMonsterTypeText(t)).join(' / ')
    },
    getMonsterTypeText(type) {
      const lang = detectLanguage(document)
      // 日本語の場合は静的マップを使用
      if (lang === 'ja') {
        return MONSTER_TYPE_ID_TO_NAME[type] || type
      }
      // その他の言語は MappingManager から取得
      const typeMap = mappingManager.getMonsterTypeTextToId(lang)
      // typeMap は text->id なので、id->text の逆引きが必要
      for (const [text, id] of Object.entries(typeMap)) {
        if (id === type) {
          return text
        }
      }
      return MONSTER_TYPE_ID_TO_NAME[type] || type
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
  display: flex;
  flex-direction: column;
  gap: 0;

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
  width: auto;
  margin-top: 0;
  padding: 6px;
  background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
  color: var(--button-text);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 217, 184, 0.3);
  flex-shrink: 0;

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
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
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
  background: var(--bg-secondary);

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
    color: var(--button-text);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: bold;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  &.invalid {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--bg-secondary);

    &:hover {
      border-color: transparent;
      transform: none;
      box-shadow: none;
    }
  }

  .invalid-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
  }

  .invalid-mark {
    font-size: 48px;
    font-weight: bold;
    color: var(--text-primary);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
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
  flex-wrap: wrap;
}

.stat-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-secondary);
  font-size: 11px;
  min-width: 0;

  &.stat-box-type-chip {
    flex-shrink: 0;
    white-space: nowrap;
    background: var(--bg-secondary);
    color: var(--text-primary);

    &[data-type="fusion"] {
      background: var(--monster-fusion-bg);
      border-color: var(--monster-fusion-border);
      color: var(--monster-fusion-text);

      [data-theme="dark"] & {
        background: var(--monster-fusion-active);
        color: var(--monster-fusion-text);
        border-color: var(--monster-fusion-border);
      }
    }

    &[data-type="synchro"] {
      background: repeating-linear-gradient(
        135deg,
        transparent,
        transparent 8px,
        rgba(158, 158, 158, 0.12) 8px,
        rgba(158, 158, 158, 0.12) 9px
      ), linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
      border-color: var(--border-primary);
      color: var(--text-primary);
    }

    &[data-type="xyz"] {
      background: var(--monster-xyz-active);
      color: var(--monster-xyz-text);
      border-color: var(--monster-xyz-active-border);
    }

    &[data-type="link"] {
      background: var(--monster-link-bg);
      border-color: var(--monster-link-border);
      color: var(--monster-link-text);

      [data-theme="dark"] & {
        background: var(--monster-link-active);
        color: var(--monster-link-text);
        border-color: var(--monster-link-active-border);
      }
    }

    &[data-type="ritual"] {
      background: var(--monster-ritual-bg);
      border-color: var(--monster-ritual-border);
      color: var(--monster-ritual-text);

      [data-theme="dark"] & {
        background: var(--monster-ritual-active);
        color: var(--monster-ritual-text);
        border-color: var(--monster-ritual-active-border);
      }
    }

    &[data-type="pendulum"] {
      background: var(--monster-pendulum-bg);
      color: var(--monster-pendulum-text);
      border-color: var(--monster-pendulum-border);

      [data-theme="dark"] & {
        background: var(--monster-pendulum-active);
        color: var(--monster-pendulum-text);
        border-color: var(--monster-pendulum-active-border);
      }
    }
  }

  &.stat-box-type {
    width: 95%;
    box-sizing: border-box;
    transform: skewX(-10deg);
    background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
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
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
  }
  
  &.stat-box-subtype {
    width: 100%;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    
    .effect-type-icon {
      width: 16px;
      height: 16px;
    }
  }
  
  &.stat-box-link {
    padding: 4px 6px;
    background: var(--button-default-bg);
    border: none;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      background: var(--bg-secondary);
      transform: translateY(-1px);
    }
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
  background: var(--button-default-bg);
  border: none;
  border-radius: 4px;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: var(--bg-secondary);
  }
  
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
  border: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  font-size: 10px;
  
  &.active {
    background: var(--button-bg);
    color: var(--button-text);
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
  border: 1px solid var(--border-primary);
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
  border: 1px solid var(--border-primary);
  border-radius: 0 0 4px 4px;
  background: var(--bg-secondary);
  width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.card-link {
  color: var(--color-link);
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--color-link-hover);
    text-decoration: underline;
  }
}

.card-buttons-container {
  display: flex;
  gap: 4px;
  width: 100%;
  flex-direction: row;
  position: relative;
}

.card-menu-btn {
  width: auto;
  padding: 6px;
  background: var(--theme-gradient, linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%));
  color: var(--button-text);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 217, 184, 0.3);
  position: relative;
  flex-shrink: 0;

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

.card-menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.card-menu-item {
  display: block;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  min-height: 36px;
  display: flex;
  align-items: center;
  white-space: nowrap;

  &:hover {
    background: var(--bg-secondary);
  }

  &:active {
    background: var(--bg-tertiary);
  }

  &.tail-placement-active {
    color: var(--color-success, #4CAF50);
    font-weight: bold;

    .menu-item-label::before {
      content: '\2713';
      margin-right: 6px;
      color: var(--color-success, #4CAF50);
    }
  }

  .menu-item-label {
    display: block;
  }
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 0.2s ease;
}

.menu-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
