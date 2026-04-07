# Current Architecture

## Effective Entry

- Runtime entry: `src/main.jsx`
- Active router: `src/router/AppRouter.jsx`
- Active pages:
  - `src/pages/DashboardSplitPage.jsx`
  - `src/pages/FileHubPage.jsx`
  - `src/pages/SubjectWorkspacePage.jsx`
  - `src/pages/HistoryPage.jsx`
  - `src/pages/WrongBookPage.jsx`
  - `src/pages/FavoritesPage.jsx`

## Boundary Layers

- Quiz schema boundary: `src/boundaries/quizSchema.js`
  - Responsible for fenced-text cleanup, JSON parsing, schema normalization, and compatibility reporting.
- Storage boundary: `src/boundaries/storageFacade.js`
  - Responsible for browser preference access and all UI-facing persistence APIs.

## Internal Storage Implementation

- IndexedDB stores remain under `src/services/storage/indexedDb/`
- UI code should not import from `src/services/` or `src/utils/*Store.js` directly

## Rule

- New page or route changes should extend the active router and pages above.
- New schema support should enter from `src/boundaries/quizSchema.js`.
- New persistence behavior should enter from `src/boundaries/storageFacade.js`.
