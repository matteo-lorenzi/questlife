## Agent skills

### Issue tracker

Issues live in GitHub Issues (`matteo-lorenzi/questlife`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Architecture

Persistence keys, store and util layout, and gotchas (stores hydrate at import, UTC vs local days). See `docs/agents/architecture.md`.

### Coding standards

Judgement-call rules, read by reviewers: `CODING_STANDARDS.md`. Mechanical rules live in ESLint and CI (`.github/workflows/ci.yml`).

### Workflow

`/grill-with-docs` to settle design, `/implement` to build, `/code-review` to check, `/retro` after a long session.
