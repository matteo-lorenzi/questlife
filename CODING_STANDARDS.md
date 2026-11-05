# Coding standards

Read during review, not implementation. Only judgement calls live here; mechanical rules belong in ESLint (`eslint.config.js`) or CI.

## Time

- Code that depends on "now" takes `now` as a parameter and is tested at several instants: just after midnight, late Sunday, Monday morning, a daylight-saving change. A test pinned to one time of day hides the bugs that appear near day and week boundaries.
- Agenda code uses local days; profile code (streak, activity log) uses UTC days. Mixing the two in one computation needs a comment saying which is meant.

## Reuse

- Before reimplementing a rule (week key, status recompute, reminder normalisation), check `src/utils/` and the stores. When a rule must be copied, add a test that fails if the copies drift.

## Domain language

- Names in code, tests, UI text and docs follow `GLOSSARY.md`. A new domain concept gets a glossary entry in the same change.

## Tests

- Test through the public store API or a pure function's signature, never through private helpers. Expected values come from a literal or the spec, not from recomputing the code's own formula.

## Review

- Run the review in a fresh context (a subagent receiving the diff), not in the context that wrote the code.
