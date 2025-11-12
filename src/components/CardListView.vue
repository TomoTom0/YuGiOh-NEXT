<template>
  <div class="card-list-view">
    <div
      v-for="(card, idx) in cards"
      :key="`card-${idx}`"
      class="card-list-item"
    >
      <div class="card-wrapper">
        <DeckCard
          :card="card"
          :section-type="'search'"
          :index="idx"
        />
      </div>
      <div class="card-info">
        <div class="card-name">{{ card.name }}</div>
        <div class="card-text">{{ card.text }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import DeckCard from './DeckCard.vue'

export default {
  name: 'CardListView',
  components: {
    DeckCard
  },
  props: {
    cards: {
      type: Array,
      required: true
    }
  }
}
</script>

<style lang="scss" scoped>
.card-list-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-list-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  width: 100%;
  box-sizing: border-box;
}

.card-wrapper {
  flex-shrink: 0;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-weight: bold;
  font-size: 11px;
  margin-bottom: 2px;
  word-break: break-word;
  color: #000;
}

.card-text {
  font-size: 10px;
  color: #666;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}
</style>
