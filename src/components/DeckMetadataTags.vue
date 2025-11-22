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
        <button class="chip-remove" @click="$emit('remove-tag', tagId)">×</button>
      </span>
      <span
        v-for="catId in modelCategories"
        :key="'cat-' + catId"
        class="chip category-chip"
      >
        {{ getCategoryLabel(catId) }}
        <button class="chip-remove" @click="$emit('remove-category', catId)">×</button>
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
