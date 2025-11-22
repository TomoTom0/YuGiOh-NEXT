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
  gap: 8px;
  flex-wrap: wrap;
}

.chips-row {
  min-height: 24px;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  background: #e0e0e0;
}

.tag-chip {
  background: #e3f2fd;
  color: #1565c0;

  &[data-type="dragon"] { background: #ffebee; color: #c62828; }
  &[data-type="spellcaster"] { background: #f3e5f5; color: #6a1b9a; }
  &[data-type="warrior"] { background: #fff3e0; color: #e65100; }
  &[data-type="machine"] { background: #eceff1; color: #37474f; }
  &[data-type="fiend"] { background: #fce4ec; color: #880e4f; }
  &[data-type="fairy"] { background: #fff8e1; color: #ff6f00; }
  &[data-type="zombie"] { background: #f3e5f5; color: #4a148c; }
  &[data-type="beast"] { background: #fff3e0; color: #bf360c; }
  &[data-type="windbeast"] { background: #e8f5e9; color: #2e7d32; }
  &[data-type="plant"] { background: #e8f5e9; color: #1b5e20; }
  &[data-type="aqua"] { background: #e1f5fe; color: #0277bd; }
  &[data-type="fish"] { background: #e0f7fa; color: #00838f; }
  &[data-type="dinosaur"] { background: #efebe9; color: #4e342e; }
  &[data-type="insect"] { background: #f1f8e9; color: #33691e; }
  &[data-type="rock"] { background: #efebe9; color: #5d4037; }
  &[data-type="thunder"] { background: #fffde7; color: #f57f17; }
  &[data-type="reptile"] { background: #e8eaf6; color: #283593; }
  &[data-type="psychic"] { background: #fce4ec; color: #ad1457; }
  &[data-type="seaserpent"] { background: #e0f2f1; color: #00695c; }
  &[data-type="wyrm"] { background: #ede7f6; color: #4527a0; }
  &[data-type="cyberse"] { background: #e8eaf6; color: #1a237e; }
  &[data-type="divine"] { background: #fff8e1; color: #ff8f00; }
}

.category-chip {
  background: #f5f5f5;
  color: #424242;
}

.chip-remove {
  background: none;
  border: none;
  padding: 0;
  margin-left: 2px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  opacity: 0.6;

  &:hover {
    opacity: 1;
  }
}
</style>
