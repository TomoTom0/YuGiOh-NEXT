# Codebase Investigation Report: Styles and Deprecations
**Date:** 2025-12-07

## 1. Style Architecture & Duplication
**Status:** **Found Optimization Opportunity**

The project uses a hybrid approach for theming:
-   **CSS Variables:** Defined in `src/styles/themes.scss` (SCSS)
-   **JS Constants:** Defined in `src/styles/themes.ts` (TypeScript)

**Issue:** These two files duplicate the same color values. This violates "Single Source of Truth" and creates a maintenance burden (updating a color requires changes in two places).
**Recommendation:**
-   Make `src/styles/themes.ts` the master source.
-   Generate the SCSS variables or CSS variables dynamically during build, or inject them into the document root via JS at runtime.

**Component Styles:**
-   Components (e.g., `DeckCard.vue`) correctly use `<style scoped lang="scss">` and consume the global CSS variables. This is a good practice and no conflicts were found.

## 2. Deprecated Code Analysis
**Status:** **Actionable Cleanup Identified**

-   **`buildCardImageUrl` (in `src/api/card-search.ts`):**
    -   Marked `@deprecated`.
    -   **Usage:** None in production code. Only used in its own unit tests (`src/api/__tests__/card-search.test.ts`).
    -   **Action:** Delete the function and its tests safely.

-   **`sessionManager.getCgid`:**
    -   Investigation pending (Timed out).

## 3. Pending Investigations (Interrupted)
-   **Hardcoded Values:** Scan for DOM selectors/URLs not yet performed.
-   **Logic Duplication:** `imageDialog.ts` vs Vue components analysis not fully detailed.

## 4. Immediate Action Items
1.  [ ] Delete `buildCardImageUrl` and its tests.
2.  [ ] Refactor Theme System (Low Priority, but good for long-term health).
