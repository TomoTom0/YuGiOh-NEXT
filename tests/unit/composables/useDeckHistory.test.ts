import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getDeckHistory,
  recordDeckHistory,
  recordDeckHistoryOrigin,
  removeDeckHistory,
  MAX_DECK_HISTORY_VERSIONS,
  type DeckHistoryEntry
} from "@/composables/deck/useDeckHistory";
import { STORAGE_KEY_DECK_HISTORY } from "@/constants/storage-keys";
import type { DeckInfo } from "@/types/deck";

/**
 * テスト用のインメモリ localStorage 実装
 * （テストごとに差し替えて分離する）
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const createDeckInfo = (overrides?: Partial<DeckInfo>): DeckInfo => ({
  dno: 1,
  name: "Test Deck",
  deckCode: "",
  mainDeck: [
    { cid: "12345", ciid: "ciid1", lang: "ja", quantity: 3 },
    { cid: "67890", ciid: "ciid2", lang: "ja", quantity: 2 }
  ],
  extraDeck: [{ cid: "11111", ciid: "ciid3", lang: "ja", quantity: 1 }],
  sideDeck: [],
  category: [],
  tags: [],
  comment: "",
  skippedCards: [],
  ...overrides
});

describe("useDeckHistory", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: new MemoryStorage(),
      writable: true,
      configurable: true
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("recordDeckHistory", () => {
    it("[covers:deck-history.records-new-version] 履歴が無いデッキに版を記録して true を返す", () => {
      const deckInfo = createDeckInfo();

      const result = recordDeckHistory(deckInfo, "save");

      expect(result).toBe(true);
      const history = getDeckHistory(1);
      expect(history).toHaveLength(1);
      expect(history[0].source).toBe("save");
      expect(history[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(typeof history[0].recordedAt).toBe("number");
      expect(history[0].recordedAt).toBeGreaterThan(0);
      const snapshot = JSON.parse(history[0].snapshot);
      expect(snapshot.dno).toBe(1);
      expect(snapshot.mainDeck).toHaveLength(2);
    });

    it("[covers:deck-history.skips-identical-composition] 同一構成を2回記録すると2回目は記録せず false を返す", () => {
      const deckInfo = createDeckInfo();

      expect(recordDeckHistory(deckInfo, "save")).toBe(true);
      expect(recordDeckHistory(createDeckInfo(), "save")).toBe(false);

      expect(getDeckHistory(1)).toHaveLength(1);
    });

    it("[covers:deck-history.order-only-change-is-identical] 並び順だけが異なる場合は同一構成として記録しない", () => {
      const deckInfo = createDeckInfo();
      const reordered = createDeckInfo({
        mainDeck: [
          { cid: "67890", ciid: "ciid2", lang: "ja", quantity: 2 },
          { cid: "12345", ciid: "ciid1", lang: "ja", quantity: 3 }
        ]
      });

      expect(recordDeckHistory(deckInfo, "save")).toBe(true);
      expect(recordDeckHistory(reordered, "save")).toBe(false);

      expect(getDeckHistory(1)).toHaveLength(1);
    });

    it("[covers:deck-history.records-changed-composition] 構成が変われば新しい版として記録し、末尾が最新になる", () => {
      const deckInfo = createDeckInfo();
      const changed = createDeckInfo({
        mainDeck: [
          { cid: "12345", ciid: "ciid1", lang: "ja", quantity: 2 },
          { cid: "67890", ciid: "ciid2", lang: "ja", quantity: 2 }
        ]
      });

      expect(recordDeckHistory(deckInfo, "save")).toBe(true);
      expect(recordDeckHistory(changed, "save")).toBe(true);

      const history = getDeckHistory(1);
      expect(history).toHaveLength(2);
      const first = JSON.parse(history[0].snapshot);
      const latest = JSON.parse(history[1].snapshot);
      expect(first.mainDeck[0].quantity).toBe(3);
      expect(latest.mainDeck[0].quantity).toBe(2);
    });

    it("[covers:deck-history.caps-at-thirty-versions] 31版目を記録すると最古の版が削除され30版に保たれる", () => {
      for (let i = 0; i <= MAX_DECK_HISTORY_VERSIONS; i++) {
        const deckInfo = createDeckInfo({ comment: `v${i}` });
        expect(recordDeckHistory(deckInfo, "save")).toBe(true);
      }

      const history = getDeckHistory(1);
      expect(history).toHaveLength(MAX_DECK_HISTORY_VERSIONS);
      expect(JSON.parse(history[0].snapshot).comment).toBe("v1");
      expect(JSON.parse(history[MAX_DECK_HISTORY_VERSIONS - 1].snapshot).comment).toBe(
        `v${MAX_DECK_HISTORY_VERSIONS}`
      );
    });

    it("[covers:deck-history.stored-per-deck-under-ygonext-key] ygoNext:deckHistory キーにデッキ番号ごとに独立して保存される", () => {
      expect(STORAGE_KEY_DECK_HISTORY).toBe("ygoNext:deckHistory");

      recordDeckHistory(createDeckInfo({ dno: 1 }), "save");
      recordDeckHistory(createDeckInfo({ dno: 2, comment: "other" }), "save");
      recordDeckHistory(createDeckInfo({ dno: 2, comment: "other2" }), "save");

      const raw = localStorage.getItem(STORAGE_KEY_DECK_HISTORY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw ?? "{}") as Record<string, DeckHistoryEntry[]>;
      expect(Object.keys(parsed).sort()).toEqual(["1", "2"]);
      expect(parsed["1"]).toHaveLength(1);
      expect(parsed["2"]).toHaveLength(2);
      expect(getDeckHistory(1)).toHaveLength(1);
      expect(getDeckHistory(2)).toHaveLength(2);
      expect(getDeckHistory(3)).toEqual([]);
    });

    it("[covers:deck-history.storage-failure-never-throws] localStorage への書き込みが失敗しても例外を投げず false を返す", () => {
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: () => null,
          setItem: () => {
            throw new Error("QuotaExceededError");
          },
          removeItem: () => {},
          clear: () => {},
          key: () => null,
          length: 0
        },
        writable: true,
        configurable: true
      });

      expect(() => recordDeckHistory(createDeckInfo(), "save")).not.toThrow();
      expect(recordDeckHistory(createDeckInfo(), "save")).toBe(false);
      expect(() => removeDeckHistory(1)).not.toThrow();
    });
  });

  describe("recordDeckHistoryOrigin", () => {
    it("[covers:deck-history.origin-only-when-empty] 履歴が無い場合のみ起点の版を記録する", () => {
      const deckInfo = createDeckInfo();

      expect(recordDeckHistoryOrigin(deckInfo)).toBe(true);
      const history = getDeckHistory(1);
      expect(history).toHaveLength(1);
      expect(history[0].source).toBe("load");

      // 履歴が既にある場合は、構成が変わっていても起点は記録しない
      const changed = createDeckInfo({ comment: "changed" });
      expect(recordDeckHistoryOrigin(changed)).toBe(false);
      expect(getDeckHistory(1)).toHaveLength(1);
    });

    it("保存で記録済みのデッキには起点を記録しない", () => {
      recordDeckHistory(createDeckInfo(), "save");

      expect(recordDeckHistoryOrigin(createDeckInfo({ comment: "x" }))).toBe(false);
      expect(getDeckHistory(1)).toHaveLength(1);
      expect(getDeckHistory(1)[0].source).toBe("save");
    });
  });

  describe("removeDeckHistory", () => {
    it("[covers:deck-history.remove-deletes-only-target] 指定デッキの履歴だけを削除し、他デッキは残す", () => {
      recordDeckHistory(createDeckInfo({ dno: 1 }), "save");
      recordDeckHistory(createDeckInfo({ dno: 2 }), "save");

      removeDeckHistory(1);

      expect(getDeckHistory(1)).toEqual([]);
      expect(getDeckHistory(2)).toHaveLength(1);

      // 履歴が無いデッキの削除はエラーにしない
      expect(() => removeDeckHistory(999)).not.toThrow();
    });
  });

  describe("getDeckHistory", () => {
    it("[covers:deck-history.corrupted-storage-treated-as-empty] 保存データが壊れている場合は空の履歴として扱う", () => {
      localStorage.setItem(STORAGE_KEY_DECK_HISTORY, "{invalid json");
      expect(getDeckHistory(1)).toEqual([]);

      localStorage.setItem(STORAGE_KEY_DECK_HISTORY, JSON.stringify({ "1": "not-an-array" }));
      expect(getDeckHistory(1)).toEqual([]);

      localStorage.setItem(STORAGE_KEY_DECK_HISTORY, JSON.stringify(["not", "a", "record"]));
      expect(getDeckHistory(1)).toEqual([]);

      // 壊れた状態からでも記録は正常に行える
      expect(recordDeckHistory(createDeckInfo(), "save")).toBe(true);
      expect(getDeckHistory(1)).toHaveLength(1);
    });

    it("履歴が無いデッキは空配列を返す", () => {
      expect(getDeckHistory(42)).toEqual([]);
    });
  });
});
