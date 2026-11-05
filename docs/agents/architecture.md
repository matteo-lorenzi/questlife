# Architecture

Where things live and the gotchas no config file confesses. Product rules and UI conventions: `docs/agents/conventions.md`.

React 18 + Vite 5 + zustand + Tailwind, plain JS. Runs in a browser (`npm run dev`) and in Electron (`electron/main.cjs`). No backend: everything is in `localStorage`.

## Persistence

| Key | Owner | Content |
|---|---|---|
| `questlife_data` | `src/store/useStore.js` | `{chapters, quests, profile, canvasViewports, agenda}` |
| `questlife_todo` | `src/utils/todoStorage.js` | array of Rubriques, each with its Tâches |
| `questlife_left_panel` | `src/utils/panelPrefs.js` | `{collapsed, activeTab}` |
| `questlife_focus_prefs` | `src/utils/focusPrefs.js` | `{minutes}` |
| `questlife_theme` | `src/store/useStore.js` | `"light"` or `"dark"` |

No schema version: each loader normalises tolerantly. Timer state and the main view (`useMainView`) are memory-only.

## Stores read `localStorage` at import

`useStore` hydrates when its module is first imported. Anything that writes initial data (the demo seed, tests) must run **before** that import: `src/main.jsx` imports `App` dynamically for this reason, and tests call `vi.resetModules()` then `import("./useStore")`.

## Where logic lives

- `src/store/`: zustand stores; the public API tests go through.
- `src/utils/`: pure logic (`agenda.js`, `agendaDeadlines.js`, `graph.js`, `todo.js`, `reminders.js`, `focusTimer.js`) and persistence helpers.
- `src/utils/constants.js`: statuses, XP levels, badge rules (`BADGE_DEFS`), weekly objective pool. The `CANVAS_BACKGROUNDS` half of the file is styling only.
- `src/demo/`: demo seed (`buildDemoData(now)`), loaded only with `VITE_DEMO=1`.

## Gotchas

- **Two day conventions.** The agenda uses local days (`localDayKey`). `profile.streak` and `profile.activityLog` use UTC days (`toISOString`).
- **Quest statuses are derived.** `recomputeStatuses` (`src/utils/graph.js`) sets `locked` or `active` from `dependencies`. Seeded or hand-written data must agree with it.
- **The 30 s loop in `App.jsx`** expires quests whose deadline has passed and fires reminders not listed in `sentReminderOffsetsMs`. Data with past deadlines or due reminders produces notifications at launch.
- **Week key.** `getWeekKey` is private to `useStore.js`. The demo seed keeps a copy; the demo test fails if they drift.
- **Tests** run with `TZ=Europe/Paris` (set in `vite.config.js`), jsdom, no React Testing Library.

## Electron dev profiles

`npm run electron:dev | electron:demo | electron:empty` select a data profile through `QUESTLIFE_PROFILE` (separate `userData` folder, see `electron/main.cjs` and `scripts/electron-dev.cjs`). Commands and demo contents: `README.md`. Resolve package binaries with `resolveBin()` from `scripts/resolve-bin.cjs`, never `require.resolve("pkg/sub/path")` (packages with `exports` reject it; ESLint enforces this).
