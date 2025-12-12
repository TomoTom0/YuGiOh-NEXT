# Unreleased

## Features

- **Improved Test Coverage**: Added comprehensive test suites for critical functionality
  - Implemented 454 tests across 8 key modules (deck editing, caching, API operations, etc.)
  - Test coverage increased from 4.39% to estimated 14-19%
  - Enhanced regression detection capability during refactoring

- **Better UX for Disabled Filter Options**: Improved visual clarity of non-selectable filter chips
  - Added dashed border style to disabled chips in search filter dialog
  - Implemented theme-aware styling for both light and dark modes
  - More obvious visual distinction between selectable and non-selectable options

## Fixes

- Unified z-index values across dialog components for consistent layering

## Testing

- Added comprehensive test coverage for:
  - Deck edit store (deckEditStore)
  - Unified cache database (UnifiedCacheDB)
  - Deck operations API layer
  - ID-Text mapping manager
  - Deck detail parser
  - Deck import/export utilities
  - Filter input composable (useFilterInput)
  - Deck display order composable (useDeckDisplayOrder)

## Internal

- Enhanced test infrastructure with proper mocking patterns
- Improved Chrome Extension API testing setup
- Better Vue 3 Composition API test patterns
