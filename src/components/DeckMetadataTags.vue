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
  font-size: 12px;
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
  background: var(--monster-fusion-bg);
  border-color: #ba68c8;
  color: white;

  &:hover {
    filter: brightness(0.9);
    box-shadow: 0 2px 6px rgba(156, 39, 176, 0.3);
  }
}

.chip.tag-chip[data-type="synchro"] {
  background: var(--monster-synchro-bg);
  border-color: var(--border-primary);
  color: var(--text-primary);

  &:hover {
    filter: brightness(0.95);
    box-shadow: 0 2px 6px rgba(117, 117, 117, 0.3);
  }
}

.chip.tag-chip[data-type="xyz"] {
  background: var(--monster-xyz-active);
  color: #ffffff;
  border-color: #757575;

  &:hover {
    filter: brightness(0.9);
    box-shadow: 0 2px 6px rgba(97, 97, 97, 0.3);
  }
}

.chip.tag-chip[data-type="link"] {
  background: var(--monster-link-bg);
  border-color: #64b5f6;
  color: #1565c0;

  &:hover {
    filter: brightness(0.95);
    box-shadow: 0 2px 6px rgba(25, 118, 210, 0.3);
  }
}

.chip.tag-chip[data-type="ritual"] {
  background: var(--monster-ritual-bg);
  border-color: #4dd0e1;
  color: #00838f;

  &:hover {
    filter: brightness(0.95);
    box-shadow: 0 2px 6px rgba(0, 151, 167, 0.3);
  }
}

.chip.tag-chip[data-type="pendulum"] {
  background: linear-gradient(180deg, #ffb74d 0%, #ffb74d 35%, #4db6ac 65%, #4db6ac 100%);
  color: white;
  border-color: #ff9800;

  &:hover {
    filter: brightness(0.95);
    box-shadow: 0 2px 6px rgba(255, 152, 0, 0.3);
  }
}

.chip.category-chip {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
}

.chip.category-chip:hover {
  background: var(--color-warning-hover-bg);
  border-color: var(--color-warning);
}
</style>
