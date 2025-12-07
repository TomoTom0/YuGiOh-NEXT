# Refactoring Plan: Addressing Bloated Files
**Date:** 2025-12-07
**Target Files:**
- `src/stores/deck-edit.ts`
- `src/components/SearchFilterDialog.vue`
- `src/content/edit-ui/DeckEditLayout.vue`
- `src/api/card-search.ts`

## 1. Executive Summary

Analysis reveals a heavily centralized architecture relying on a "God Store" pattern (`deck-edit.ts`) which couples data management, UI state, undo/redo history, and business logic. This centralization has cascaded into the view layer, resulting in "God Components" (`SearchFilterDialog.vue`, `DeckEditLayout.vue`) that are difficult to maintain and test.

The primary goal of this refactoring is to **decouple responsibilities** by breaking down the monolithic store and extracting complex logic into composables and smaller, focused components.

---

## 2. Detailed Analysis & Refactoring Strategy

### 2.1. `src/stores/deck-edit.ts` (Priority: High)
**Current Status:** ~2028 lines. Acts as a "God Store" managing:
- **Deck Data:** Card lists (main, extra, side), validation.
- **UI State:** Dialog visibility, display modes, sorting options.
- **Business Logic:** Undo/Redo history, complex FLIP animations, drag-and-drop state.
- **API Interaction:** Fetching and saving deck data.

**Refactoring Strategy:** Decompose into domain-specific stores.
1.  **`stores/deck-data.ts`**: Purely manages the deck's card lists and basic CRUD operations (add, remove, move).
2.  **`stores/deck-ui.ts`**: Manages transient UI state (dialog open/close, active tab, sort order).
3.  **`stores/deck-history.ts`**: Dedicated store or composable for the Undo/Redo command pattern, decoupling it from the data store.
4.  **`stores/card-search.ts`**: (New) Move search-related state (query, filters, results) here from `deck-edit.ts` or standalone.

**Action Items:**
- [ ] Identify state properties belonging to each domain.
- [ ] Extract `History` logic into a generic `useCommandHistory` composable.
- [ ] Create `deck-data` store and migrate core CRUD actions.
- [ ] Create `deck-ui` store and migrate visibility flags.

---

### 2.2. `src/components/SearchFilterDialog.vue` (Priority: High)
**Current Status:** ~2360 lines. A "God Component" handling:
- **Huge Template:** Renders complex forms for every card attribute.
- **Complex State:** Manages local filter state and an "exclusion engine" to disable impossible combinations.
- **Business Logic:** Interacts directly with APIs and stores.

**Refactoring Strategy:** Component decomposition and logic extraction.
1.  **Extract Logic:** Move the "exclusion engine" and filter state management into a composable `useSearchFilters.ts`.
2.  **Split Components:** Break the UI into smaller sub-components based on filter sections:
    - `FilterMonsterAttributes.vue` (Level, Attribute, Type)
    - `FilterSpellTrap.vue`
    - `FilterCardText.vue`
    - `FilterLinkArrows.vue`
3.  **Unify State:** Connect these components to the new `stores/card-search.ts` or the extracted composable.

**Action Items:**
- [ ] Extract `exclusionResult` and filter logic to `useSearchFilters.ts`.
- [ ] Create sub-directory `src/components/search-filter/`.
- [ ] Refactor main dialog to compose these smaller components.

---

### 2.3. `src/content/edit-ui/DeckEditLayout.vue` (Priority: Medium)
**Current Status:** ~1434 lines. A "God View" heavily coupled to `deck-edit.ts`.
- **Issues:** Duplicated templates for responsive design, mixed concerns (layout vs. logic), direct handling of global events (keyboard, D&D).

**Refactoring Strategy:**
1.  **Extract Layout Logic:** Move Drag-and-Drop handlers and Keyboard shortcuts into `useDeckDragDrop.ts` and `useDeckShortcuts.ts`.
2.  **Componentize Sections:** Ensure `DeckSection` (Main, Extra, Side) is fully self-contained to reduce template repetition.
3.  **Decouple UI:** Bind to the new `stores/deck-ui.ts` for layout state.

**Action Items:**
- [ ] Extract global event listeners to composables.
- [ ] Review template for mobile/desktop duplication and simplify using CSS or functional components where possible.

---

### 2.4. `src/api/card-search.ts` (Priority: Low)
**Current Status:** ~2271 lines. Large but functional.
- **Role:** Adapts external HTML pages to internal JSON structures. Complexity is inherent to scraping.

**Refactoring Strategy:**
- Keep as is for now, or split into `api/search-parser.ts` (parsing logic) and `api/card-client.ts` (network logic) if it grows further.

---

## 3. Recommended Roadmap

1.  **Phase 1: Foundation (Store Decomposition)**
    - Refactor `src/stores/deck-edit.ts`. This is the prerequisite for cleaning up the views.
    - Create `useCommandHistory` composable.
    - Establish `stores/deck-data.ts` and `stores/deck-ui.ts`.

2.  **Phase 2: Logic Extraction (Composables)**
    - Extract filter logic from `SearchFilterDialog.vue` to `composables/useSearchFilters.ts`.
    - Extract D&D/Shortcuts from `DeckEditLayout.vue`.

3.  **Phase 3: Component Splitting (UI Refactor)**
    - Break down `SearchFilterDialog.vue` into sub-components.
    - Simplify `DeckEditLayout.vue` using the new stores and composables.

4.  **Phase 4: Cleanup**
    - Remove dead code from original files.
    - Update tests to reflect new architecture.
