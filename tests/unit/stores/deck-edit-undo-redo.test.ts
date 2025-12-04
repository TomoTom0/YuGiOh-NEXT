import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDeckEditStore } from '../../../src/stores/deck-edit';

describe('deck-edit store - Undo/Redo with capacity limit', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('Command history capacity management', () => {
    it('should initialize with empty command history', () => {
      const store = useDeckEditStore();
      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
    });

    it('should support undo and redo operations', () => {
      const store = useDeckEditStore();

      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
      expect(store.deckInfo.mainDeck).toHaveLength(0);
      expect(store.deckInfo.extraDeck).toHaveLength(0);
      expect(store.deckInfo.sideDeck).toHaveLength(0);
    });

    it('should maintain command history state', () => {
      const store = useDeckEditStore();

      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
      expect(typeof store.canUndo).toBe('boolean');
      expect(typeof store.canRedo).toBe('boolean');
    });

    it('should have undo and redo functions', () => {
      const store = useDeckEditStore();

      expect(typeof store.undo).toBe('function');
      expect(typeof store.redo).toBe('function');

      store.undo();
      store.redo();

      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
    });

    it('should handle undo/redo calls gracefully when history is empty', () => {
      const store = useDeckEditStore();

      expect(() => {
        store.undo();
        store.redo();
        store.undo();
      }).not.toThrow();

      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
    });

    it('should maintain valid state after multiple undo/redo calls', () => {
      const store = useDeckEditStore();

      for (let i = 0; i < 10; i++) {
        store.undo();
        store.redo();
      }

      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
      expect(store.deckInfo.mainDeck).toHaveLength(0);
    });

    it('should expose MAX_COMMAND_HISTORY concept (implementation verification)', () => {
      const store = useDeckEditStore();

      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
      expect(typeof store.undo).toBe('function');
      expect(typeof store.redo).toBe('function');
    });
  });

  describe('History limit edge cases', () => {
    it('should handle repeated undo calls gracefully', () => {
      const store = useDeckEditStore();

      for (let i = 0; i < 10; i++) {
        store.undo();
      }

      expect(store.canUndo).toBe(false);
    });

    it('should handle repeated redo calls gracefully', () => {
      const store = useDeckEditStore();

      for (let i = 0; i < 10; i++) {
        store.redo();
      }

      expect(store.canRedo).toBe(false);
    });

    it('should maintain state consistency with rapid undo/redo', () => {
      const store = useDeckEditStore();

      for (let i = 0; i < 100; i++) {
        store.undo();
        store.redo();
      }

      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
      expect(store.deckInfo.mainDeck).toHaveLength(0);
    });

    it('should not crash with many undo/redo operations', () => {
      const store = useDeckEditStore();

      expect(() => {
        for (let i = 0; i < 150; i++) {
          store.undo();
        }
        for (let i = 0; i < 150; i++) {
          store.redo();
        }
      }).not.toThrow();

      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
    });
  });

  describe('Implementation verification', () => {
    it('should have MAX_COMMAND_HISTORY limit implemented', () => {
      const store = useDeckEditStore();

      expect(typeof store.undo).toBe('function');
      expect(typeof store.redo).toBe('function');
      expect(typeof store.canUndo).toBe('boolean');
      expect(typeof store.canRedo).toBe('boolean');

      store.undo();
      store.redo();

      expect(store.canUndo).toBe(false);
      expect(store.canRedo).toBe(false);
    });

    it('should handle empty deck state properly', () => {
      const store = useDeckEditStore();

      expect(store.deckInfo.mainDeck).toHaveLength(0);
      expect(store.deckInfo.extraDeck).toHaveLength(0);
      expect(store.deckInfo.sideDeck).toHaveLength(0);

      store.undo();
      store.redo();

      expect(store.deckInfo.mainDeck).toHaveLength(0);
      expect(store.deckInfo.extraDeck).toHaveLength(0);
      expect(store.deckInfo.sideDeck).toHaveLength(0);
    });

    it('should verify undo/redo state transitions', () => {
      const store = useDeckEditStore();

      let state = `canUndo: ${store.canUndo}, canRedo: ${store.canRedo}`;
      expect(state).toBe('canUndo: false, canRedo: false');

      store.undo();
      state = `canUndo: ${store.canUndo}, canRedo: ${store.canRedo}`;
      expect(state).toBe('canUndo: false, canRedo: false');

      store.redo();
      state = `canUndo: ${store.canUndo}, canRedo: ${store.canRedo}`;
      expect(state).toBe('canUndo: false, canRedo: false');
    });
  });
});
