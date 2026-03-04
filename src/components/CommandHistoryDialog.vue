<template>
  <div v-if="visible" class="dialog-overlay" @click.self="handleClose">
    <div class="history-dialog">
      <div class="history-dialog-header">
        <h2>操作履歴</h2>
        <button class="close-btn" @click="handleClose">x</button>
      </div>
      <div class="history-dialog-content">
        <div v-if="history.length === 0" class="no-history">
          <p>操作履歴がありません</p>
        </div>
        <ul v-else class="history-list">
          <li
            v-for="(command, index) in history"
            :key="index"
            class="history-item"
            :class="[
              getTypeClass(command.type),
              {
                current: index === currentIndex,
                undone: index > currentIndex
              }
            ]"
            @click="handleJumpTo(index)"
          >
            <span class="history-type-indicator" :class="getTypeClass(command.type)"></span>
            <span class="history-index">{{ index + 1 }}</span>
            <span class="history-description">{{ command.description || '操作' }}</span>
            <span v-if="command.timestamp" class="history-time">{{ formatTime(command.timestamp) }}</span>
            <span v-if="index === currentIndex" class="current-badge">現在</span>
          </li>
        </ul>
      </div>
      <div class="history-dialog-footer">
        <div class="legend">
          <span class="legend-item"><span class="legend-dot type-add"></span>追加</span>
          <span class="legend-item"><span class="legend-dot type-remove"></span>削除</span>
          <span class="legend-item"><span class="legend-dot type-move"></span>移動</span>
          <span class="legend-item"><span class="legend-dot type-reorder"></span>順序</span>
        </div>
        <button class="btn-clear" @click="handleClearHistory" :disabled="history.length === 0">
          クリア
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { Command, CommandType } from '../composables/deck/useDeckUndoRedo'

export default defineComponent({
  name: 'CommandHistoryDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    history: {
      type: Array as PropType<Command[]>,
      default: () => []
    },
    currentIndex: {
      type: Number,
      default: -1
    }
  },
  emits: ['close', 'jump-to', 'clear-history'],
  setup(props, { emit }) {
    function handleClose() {
      emit('close')
    }

    function handleJumpTo(index: number) {
      emit('jump-to', index)
    }

    function handleClearHistory() {
      emit('clear-history')
    }

    function formatTime(timestamp: number): string {
      const date = new Date(timestamp)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const seconds = date.getSeconds().toString().padStart(2, '0')
      return `${hours}:${minutes}:${seconds}`
    }

    function getTypeClass(type: CommandType | undefined): string {
      switch (type) {
        case 'add': return 'type-add'
        case 'remove': return 'type-remove'
        case 'move': return 'type-move'
        case 'reorder': return 'type-reorder'
        default: return ''
      }
    }

    return {
      handleClose,
      handleJumpTo,
      handleClearHistory,
      formatTime,
      getTypeClass
    }
  }
})
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--dialog-overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.history-dialog {
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.history-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-primary);

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 18px;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }
  }
}

.history-dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 200px;
}

.no-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  color: var(--text-tertiary);

  p {
    margin: 0;
    font-size: 14px;
  }
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-left: 3px solid transparent;

  &:hover {
    background: var(--bg-secondary);
  }

  &.current {
    background: var(--color-info-bg);
    border-left-color: var(--color-info);
  }

  &.undone {
    opacity: 0.5;
  }

  // Type-specific left border colors
  &.type-add {
    border-left-color: var(--color-success);
  }

  &.type-remove {
    border-left-color: var(--color-error);
  }

  &.type-move {
    border-left-color: var(--border-secondary);
  }

  &.type-reorder {
    border-left-color: var(--color-warning);
  }
}

.history-type-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;

  &.type-add {
    background: var(--color-success);
  }

  &.type-remove {
    background: var(--color-error);
  }

  &.type-move {
    background: var(--text-tertiary);
  }

  &.type-reorder {
    background: var(--color-warning);
  }
}

.history-index {
  min-width: 24px;
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.history-description {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.current-badge {
  font-size: 11px;
  color: var(--color-info);
  background: var(--color-info-bg);
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.history-dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-secondary);

  .legend {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &.type-add {
      background: var(--color-success);
    }

    &.type-remove {
      background: var(--color-error);
    }

    &.type-move {
      background: var(--text-tertiary);
    }

    &.type-reorder {
      background: var(--color-warning);
    }
  }

  .btn-clear {
    padding: 6px 12px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: var(--color-error-bg);
      color: var(--color-error-text);
      border-color: var(--color-error-text);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
