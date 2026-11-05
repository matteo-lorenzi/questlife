# Conventions

Product rules, UI conventions and dark-mode rules. Migrated from the former Copilot instructions and re-checked against the code. Domain vocabulary lives in `GLOSSARY.md`, layout and persistence in `docs/agents/architecture.md`.

## Quest rules

- **Statuses**: `draft` (just created, no title), `locked` (a prerequisite is not `done`), `active` (all prerequisites `done`, or none), `expired` (deadline passed), `done`. After any dependency or completion change, call `recomputeStatuses(chapterQuests)` from `src/utils/graph.js`.
- **Draft**: a draft whose panel closes with an empty title is deleted silently (`QuestPanel.jsx`). A draft cannot be completed.
- **Cycles**: before accepting a link A→B (A is a prerequisite of B), call `wouldCreateCycle(quests, A, B)`. On `true`, reject the link and emit a `questlife:toast` with `type: "error"`.
- **Deleting a quest that others depend on**: offer A, remove the links (dependents unlock), or B, redirect the links to a replacement quest (`redirectAndDeleteQuest`).
- **XP**: `xp` defaults to 50, clamped to 0–9999. Credited to the profile on completion. `uncompleteQuest` takes it back and removes the matching `xpHistory` entry. Deleting a quest never removes XP already earned.
- **Badges**: `_checkBadges()` runs after `completeQuest()` and `createChapter()`; rules live in `BADGE_DEFS` (`src/utils/constants.js`). Unlocking dispatches `questlife:badge`, which `App.jsx` turns into a toast.
- **Agenda, To-do and Timer** never touch XP, streak, weekly objectives or badges.

## Profile and privacy

- Only a pseudonym is stored, locally: no email, real name, phone, external id or remote sync. Keep it that way.
- Pseudonym: 2–20 characters, letters, digits, `_` and `-` (`updatePseudo`), default `"Aventurier"`, avatar shows its first two letters in capitals.
- **Streak** (UTC days, in `completeQuest` via `updateStreak`): same day as `lastActiveDate` → unchanged; the day after → `current++`; otherwise → `current = 1`. `longest` keeps the record.
- **Weekly objectives**: week key `YYYY-Www` (week starts Monday). When `weeklyObjectives.weekKey` is not the current week, four objectives are drawn at random, without repeats, from `WEEKLY_OBJECTIVES_POOL`. `checkWeeklyObjectives()` runs after each completion, updates `progress` and `done`, and credits the bonus once, when `done` flips to `true`.
- The profile page is a modal opened from the home header, not a route.

## UI conventions

- Function components and hooks only. The React Flow node (`QuestNode`) stays wrapped in `memo()`.
- Persistence happens in the store (`_persist()`), never in a `useEffect`.
- Tailwind utilities. A dynamic colour (chapter accent) goes through `style={{ color: chapter.color.accent }}`, since Tailwind cannot build dynamic values.
- Animations are custom classes in `src/index.css` (`animate-fadeIn`, `animate-slideInRight`, `animate-scaleIn`, `animate-slideInUp`, …).
- Icons are inline SVG, never emoji, in the UI chrome.
- Global events on `window` decouple toasts from components: `questlife:toast`, `questlife:badge`, `questlife:system-notify`, `questlife:chapter-complete`.

## Dark mode

- Tailwind `darkMode: "class"`. `toggleTheme()` in `useStore.js` toggles the `dark` class on `<html>` and stores `questlife_theme`. The toggle sits in the home header, next to the profile button, as an SVG sun/moon.
- Write the `dark:` variant when a component is created; never hard-code a light colour without its dark counterpart. Common pairs: `bg-white dark:bg-zinc-900`, `text-gray-900 dark:text-gray-100`, `border-gray-200 dark:border-zinc-700`, `hover:bg-gray-100 dark:hover:bg-zinc-800`.
- Chapter colours: `chapter.color.bg` (light) and `chapter.color.bgDark` (dark) for backgrounds, `chapter.color.accent` (same in both) for text, borders and icons. Use `getChapterBg(color, theme)` from `src/utils/constants.js`.
- React Flow does not use Tailwind: pass its colours through `style` and props (background, `Background` colour and variant, edge stroke) computed from the theme, never from a fixed constant.

## Canvas and panel behaviour

- The right panel opens on a node click and closes on `Escape`; closing it saves the edits.
- Position and zoom are remembered per chapter in `canvasViewports` and restored on reopening.
- Dropping a quest type on the canvas: read `e.dataTransfer.getData('quest_type')`, convert coordinates with `rfInstance.screenToFlowPosition()`.
