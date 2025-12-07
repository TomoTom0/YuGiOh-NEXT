# Codebase Investigation Report: Unused, Duplicated, and Misplaced Logic
**Date:** 2025-12-07

## 1. Dead Code / Deprecated Usages (Critical Findings)

The investigation revealed a critical issue with settings migration. Several settings marked as `@deprecated` in `src/types/settings.ts` are still actively used in the codebase due to an incomplete migration strategy in `src/stores/settings.ts`.

### 1.1 Incomplete Settings Migration
**Status:** **Confirmed Bug**
**Details:**
The `src/stores/settings.ts` migrates old top-level settings (e.g., `searchInputPosition`) to a nested `ux` object but **fails to remove the old keys**. Consequently, many components still read/write to the deprecated paths, leading to state inconsistencies.

**Deprecated Keys Still in Use:**
- `searchInputPosition` -> Used in:
    - `src/options/DeckEditSettings.vue`
    - `src/options/components/sections/UISettingsSection.vue`
    - `src/components/OptionsDialog.vue`
    - `src/components/RightArea.vue`
- `defaultSearchMode` -> Used/Written in `src/components/SearchInputBar.vue`
- `enableMouseOperations` -> Used in `src/components/DeckCard.vue`
- `changeFavicon`, `keyboardShortcuts` -> Used in `src/content/edit-ui/DeckEditLayout.vue`

**Action Item:**
- [ ] Update `src/stores/settings.ts` to remove old keys after migration.
- [ ] Refactor all listed components to use `appSettings.ux.*`.

### 1.2 Deprecated Functions (To Be Verified)
- `buildCardImageUrl` in `src/api/card-search.ts` (Usages not yet checked)
- `sessionManager.getCgid` (Usages not yet checked)

### 1.3 Obvious Garbage Files
- `src/content/edit-ui/DeckEditLayout.vue.bak`
- `src/types/card-maps.ts.bak`

---

## 2. Potential Duplication (Pending Further Investigation)

Initial scans suggest overlap, but deep analysis was interrupted.
- **Hypothesis:** `src/api/card-search.ts` and `src/utils/card-utils.ts` likely share card parsing or formatting logic.
- **Hypothesis:** `SearchFilterDialog.vue` likely duplicates filtering logic found in `stores/deck-edit.ts` (or simply implements logic that belongs there).

---

## 3. Misplacement (Pending Further Investigation)

- **`src/content/deck-recipe/imageDialog.ts`**: Identified as a large file (600+ lines) likely containing UI logic constructed with vanilla JS/jQuery-like DOM manipulation, which should be a Vue component.
- **`src/content/edit-ui/DeckEditLayout.vue`**: Confirmed to contain logic (D&D, shortcuts) better suited for stores or composables.

---

## 4. Recommendations

1.  **Immediate Cleanup:** Delete `.bak` files.
2.  **Fix Settings Bug:** This is a high-priority functional fix.
3.  **Continue Investigation:**
    - Scan for usages of `buildCardImageUrl`.
    - Compare `imageDialog.ts` logic against `DeckEditLayout.vue` logic.
    - Check for CSS/SCSS duplication.
