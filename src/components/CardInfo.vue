<template>
  <div class="card-info-layout">
    <h3 class="card-name-large">{{ card.name }}</h3>
    <div class="card-info-top">
      <div class="card-image-wrapper">
        <DeckCard
          :card="card"
          :section-type="'info'"
          :uuid="'info-card'"
        />
      </div>
      <div class="card-details">
        
        <div v-if="card.cardType === 'monster'" class="card-stats-layout">
          <div class="stat-box stat-box-type">
            <span class="stat-text">{{ card.types ? card.types.map(t => MONSTER_TYPE_MAP[t] || t).join(' / ') : '' }}</span>
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
      
      <div v-if="card.text" class="card-effect-section">
        <div class="section-title">Card Text</div>
        <div class="effect-text">{{ card.text }}</div>
      </div>
      
      <div v-if="supplementInfo" class="card-effect-section">
        <div class="section-title">Detail{{ supplementDate ? ` [${supplementDate}]` : '' }}</div>
        <div class="detail-text">{{ supplementInfo }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { getAttributeIconUrl, getLevelIconUrl, getRankIconUrl, getSpellIconUrl, getTrapIconUrl, getEffectTypeIconUrl } from '../api/image-utils'
import { ATTRIBUTE_MAP, RACE_MAP, SPELL_EFFECT_TYPE_MAP, TRAP_EFFECT_TYPE_MAP, MONSTER_TYPE_MAP } from '../types/card-maps'
import DeckCard from './DeckCard.vue'

export default {
  name: 'CardInfo',
  components: {
    DeckCard
  },
  props: {
    card: {
      type: Object,
      required: true
    },
    supplementInfo: {
      type: String,
      default: undefined
    },
    supplementDate: {
      type: String,
      default: undefined
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
}

.card-name-large {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin: 0;
  width: 100%;
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
}

.card-image-wrapper {
  flex-shrink: 0;
  width: 90px;
  
  .deck-card {
    width: 90px;
    height: 132px;
    
    img {
      width: 100%;
      height: 100%;
    }
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
  background: #fafafa;
  font-size: 11px;
  
  &.stat-box-type {
    width: 100%;
    transform: skewX(-10deg);
    background: linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%);
    justify-content: center;
    
    .card-type-icon {
      width: 16px;
      height: 16px;
      transform: skewX(10deg);
    }
    
    .stat-text {
      transform: skewX(10deg);
    }
  }
  
  &.stat-box-subtype {
    width: 100%;
    background: #f0f0f0;
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
    background: #ccc;
    
    &.active {
      background: #008cff;
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
  background: #fff;
  font-size: 10px;
  
  &.active {
    background: #008cff;
    color: white;
    font-weight: bold;
  }
  
  &:nth-child(5) {
    background: #f0f0f0;
  }
}

.stat-text {
  font-size: 11px;
  font-weight: bold;
  color: #333;
}

.stat-separator {
  margin: 0 4px;
  color: #999;
}

.stat-label {
  font-size: 9px;
  color: #999;
  text-transform: uppercase;
}

.stat-value {
  font-size: 12px;
  font-weight: bold;
  color: #333;
}

.card-pendulum-effect,
.card-effect-text,
.card-effect-section {
  margin-top: 5px;
}

.section-title {
  font-size: 11px;
  font-weight: bold;
  color: #333;
  margin-bottom: 6px;
  padding: 4px 8px;
  background: #f0f0f0;
  border-radius: 4px 4px 0 0;
}

.effect-text {
  font-size: 11px;
  color: #333;
  line-height: 1.6;
  white-space: pre-line;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 0 0 4px 4px;
  background: #fff;
}

.detail-text {
  font-size: 11px;
  color: #333;
  line-height: 1.6;
  white-space: pre-line;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 0 0 4px 4px;
  background: #f5f5f5;
}
</style>
