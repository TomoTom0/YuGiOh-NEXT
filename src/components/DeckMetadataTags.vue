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
  cursor: pointer;
  transition: all 0.2s;
}

.chip.tag-chip {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #66bb6a;
}

.chip.tag-chip:hover {
  background: #c8e6c9;
  border-color: #4caf50;
}

.chip.tag-chip[data-type="fusion"] {
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
  color: #4a148c;
  border-color: #ba68c8;
}

.chip.tag-chip[data-type="synchro"] {
  background:
    repeating-linear-gradient(
      135deg,
      transparent,
      transparent 8px,
      rgba(158, 158, 158, 0.12) 8px,
      rgba(158, 158, 158, 0.12) 9px
    ),
    linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
  color: #424242;
  border-color: #9e9e9e;
}

.chip.tag-chip[data-type="xyz"] {
  background: linear-gradient(135deg, #616161 0%, #424242 100%);
  color: #fff;
  border-color: #757575;
}

.chip.tag-chip[data-type="link"] {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #0d47a1;
  border-color: #64b5f6;
}

.chip.tag-chip[data-type="ritual"] {
  background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
  color: #006064;
  border-color: #4dd0e1;
}

.chip.tag-chip[data-type="pendulum"] {
  background: linear-gradient(180deg, #ffb74d 0%, #ffb74d 35%, #4db6ac 65%, #4db6ac 100%);
  color: #4a148c;
  border-color: #ff9800;
}

.chip.category-chip {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ff9800;
}

.chip.category-chip:hover {
  background: #ffe0b2;
  border-color: #f57c00;
}

.chip-remove {
  font-size: 14px;
  font-weight: bold;
  opacity: 0.7;
  transition: opacity 0.2s;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.chip-remove:hover {
  opacity: 1;
}
</style>
