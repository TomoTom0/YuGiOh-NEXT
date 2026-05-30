<template>
  <div class="metadata-row chips-row">
    <div class="chips-container">
      <span
        v-for="tagId in modelTags"
        :key="'tag-' + tagId"
        class="chip tag-chip"
        :data-type="getTagType(tagId)"
      >
        {{ tags[tagId] }}
      </span>
      <span
        v-for="catId in modelCategories"
        :key="'cat-' + catId"
        class="chip category-chip"
      >
        {{ getCategoryLabel(catId) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getMonsterTypeFromLabel } from '../constants/tag-master-data'

const props = defineProps<{
  modelTags: string[]
  modelCategories: string[]
  tags: Record<string, string>
  categories: { value: string; label: string }[]
}>()

defineEmits<{
  (e: 'remove-tag', tagId: string): void
  (e: 'remove-category', catId: string): void
}>()

const getTagType = (tagId: string): string => {
  const tagLabel = props.tags[tagId]
  if (!tagLabel) return ''
  const monsterType = getMonsterTypeFromLabel(tagLabel)
  return monsterType || ''
}

const getCategoryLabel = (catId: string): string => {
  const cat = props.categories.find((c) => c.value === catId)
  return cat ? cat.label : catId
}
</script>

<style scoped lang="scss">
.metadata-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.chips-row {
  align-items: flex-start;
  min-height: 28px;
  justify-content: flex-start;
  margin-top: 0px;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
  align-items: flex-start;
  padding-top: 4px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: calc(var(--right-area-font-size, 14px) * 0.86);
  font-weight: 500;
  transition: all 0.2s;
}

.chip.tag-chip {
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.chip.tag-chip:hover {
  background: var(--color-success-hover-bg);
  border-color: var(--color-success);
}

.chip.tag-chip[data-type="fusion"] {
  background: var(--monster-fusion-chip-active-bg);
  border-color: var(--monster-fusion-chip-active-border);
  color: var(--monster-fusion-chip-active-text);

  &:hover {
    background: var(--monster-fusion-chip-active-hover-bg);
    color: var(--monster-fusion-chip-active-hover-text);
    border-color: var(--monster-fusion-chip-active-border);
  }
}

.chip.tag-chip[data-type="synchro"] {
  background: var(--monster-synchro-chip-active-bg);
  border-color: var(--monster-synchro-chip-active-border);
  color: var(--monster-synchro-chip-active-text);

  &:hover {
    background: var(--monster-synchro-chip-active-hover-bg);
    color: var(--monster-synchro-chip-active-hover-text);
    border-color: var(--monster-synchro-chip-active-border);
  }
}

.chip.tag-chip[data-type="xyz"] {
  background: var(--monster-xyz-chip-active-bg);
  border-color: var(--monster-xyz-chip-active-border);
  color: var(--monster-xyz-chip-active-text);

  &:hover {
    background: var(--monster-xyz-chip-active-hover-bg);
    color: var(--monster-xyz-chip-active-hover-text);
    border-color: var(--monster-xyz-chip-active-border);
  }
}

.chip.tag-chip[data-type="link"] {
  background: var(--monster-link-chip-active-bg);
  border-color: var(--monster-link-chip-active-border);
  color: var(--monster-link-chip-active-text);

  &:hover {
    background: var(--monster-link-chip-active-hover-bg);
    color: var(--monster-link-chip-active-hover-text);
    border-color: var(--monster-link-chip-active-border);
  }
}

.chip.tag-chip[data-type="ritual"] {
  background: var(--monster-ritual-chip-active-bg);
  border-color: var(--monster-ritual-chip-active-border);
  color: var(--monster-ritual-chip-active-text);

  &:hover {
    background: var(--monster-ritual-chip-active-hover-bg);
    color: var(--monster-ritual-chip-active-hover-text);
    border-color: var(--monster-ritual-chip-active-border);
  }
}

.chip.tag-chip[data-type="pendulum"] {
  background: var(--monster-pendulum-chip-active-bg);
  border-color: var(--monster-pendulum-chip-active-border);
  color: var(--monster-pendulum-chip-active-text);

  &:hover {
    background: var(--monster-pendulum-chip-active-hover-bg);
    color: var(--monster-pendulum-chip-active-hover-text);
    border-color: var(--monster-pendulum-chip-active-border);
  }
}

.chip.category-chip {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
}

.chip.category-chip:hover {
  background: var(--color-warning-hover-bg);
}
</style>
