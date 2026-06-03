import type { LimitRegulation } from './card'

export interface CardListCard {
  cardId: string
  ciid: string
  name: string
  lang: string
  imgs: Array<{ ciid: string; imgHash: string }>
  cardType: 'monster' | 'spell' | 'trap' | 'unknown'
  limitRegulation?: LimitRegulation
  text?: string
  pendulumText?: string
  empty: boolean
  atk?: number | string
  def?: number | string
  levelType?: 'level' | 'rank' | 'link'
  levelValue?: number
  attribute?: string
  race?: string
  types?: string[]
  isExtraDeck?: boolean
  effectType?: string
  instanceId?: string
  face?: 'up' | 'down'
  orientation?: 'vertical' | 'horizontal'
}
