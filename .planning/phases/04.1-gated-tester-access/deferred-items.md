# Deferred Items — Phase 04.1 Gated Tester Access

Out-of-scope discoveries logged during plan execution, per the executor's scope-boundary rule
(only auto-fix issues directly caused by the current task's own changes).

## Found during 04.1-03 (Task 3, `npm run lint` full sweep)

- **File:** `infra/modules/static-site/functions/redirect.js:75`
- **Issue:** `eslint` reports `'error' is defined but never used (@typescript-eslint/no-unused-vars)`.
- **Why deferred:** This file is untouched by plan 04.1-03 (`git status --short` shows no
  modifications relative to the last commit) — it was committed by plan 04.1-01's tracer work
  (commit `b4fe36d`). The lint failure is pre-existing and out of this plan's file scope
  (`04.1-03-PLAN.md`'s `files_modified` does not include this file).
- **Action:** Not fixed here. Belongs to whichever plan owns `redirect.js` next (04.1-01/04.1-02
  follow-up, or a dedicated lint-cleanup task).
