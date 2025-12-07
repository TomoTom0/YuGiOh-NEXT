# Codebase Investigation Report: Fragility and Tests
**Date:** 2025-12-07

## 1. Deprecated Usage: `sessionManager.getCgid`
**Status:** **High Risk / Widespread Usage**

Although marked `@deprecated` (advising to use `sessionManager.getCgid()` - likely a typo in the deprecation message or it meant to use a property vs function), this function is **critically active**.

-   **Usages Found:**
    -   `src/stores/deck-edit.ts`: The main store relies on it.
    -   `src/components/DeckEditTopBar.vue`: UI component uses it.
    -   `src/content/deck-recipe/export-ygo-pro.ts`: Export functionality uses it.
    -   `src/content/deck-recipe/imageDialog.ts`: Image generation uses it.

-   **Implementation Risk:**
    -   It scrapes data using `document.getElementById('cgid')`. If the target site changes this ID, the extension breaks.

## 2. Hardcoded Values (Fragility Analysis)
**Status:** **Critical Vulnerability**

The codebase is heavily reliant on "Magic Strings" (DOM selectors and URLs), making it extremely fragile to external changes (target website updates).

### 2.1 DOM Selectors
The extension scrapes the Konami database using raw selectors scattered throughout the code.
-   **`src/content/session/session.ts`**: Uses `document.getElementById('cgid')`.
-   **`src/utils/page-detector.ts`**: Uses highly specific selectors (e.g., `#article_body > table`) to guess the current page.
-   **`src/content/edit-ui/`**: Multiple files likely access DOM elements directly (investigation interrupted before full list).

### 2.2 Hardcoded URLs
-   **Inconsistent Usage:** A `BASE_URL` exists in `src/utils/url-builder.ts`, but it is **ignored** in many places.
-   **Direct Strings:** Many files contain raw strings like `https://www.db.yugioh-card.com`, meaning if the domain changes (or localized versions are needed), the code will require a massive find-and-replace.

## 3. Test Coverage & Risk
**Status:** **Mixed / Custom Setup**

-   **God Store (`deck-edit.ts`):** Has unit tests in `tests/unit/stores/deck-edit.test.ts`.
    -   **Issue:** The tests appear to use a custom or non-standard setup (possibly due to the Chrome Extension environment). This increases the learning curve for new developers.
-   **Vue Components:** Test coverage analysis was incomplete, but the presence of complex logic in `DeckEditLayout.vue` without evident rigorous testing suggests **high regression risk** during refactoring.

## 4. Recommendations
1.  **Centralize Selectors:** Move ALL DOM selectors into a single `SelectorMap` or `PageModel` class. If the site changes, you only update one file.
2.  **Enforce URL Constants:** Refactor all raw URL strings to use `src/utils/url-builder.ts`.
3.  **Clarify Deprecation:** The `getCgid` deprecation message is confusing. Determine the intended replacement and refactor, OR remove the deprecation warning if it's actually the correct method.
