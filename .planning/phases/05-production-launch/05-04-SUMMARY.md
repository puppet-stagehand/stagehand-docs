---
phase: 05-production-launch
plan: 04
subsystem: testing
tags: [node-test, npm-scripts, ci, release-process, documentation]

# Dependency graph
requires: []
provides:
  - "npm run test:redirect (new script, `node --test infra/modules/static-site/tests/*.test.mjs`)"
  - "npm run verify now includes the redirect test suite between test:unit and build"
  - "docs/operations/RELEASE-EVIDENCE.md — append-only log scaffold with Promotions, Rollbacks, and Security advisory delivery test tables"
affects: [05-03, 05-07, 05-08, 05-09, 05-10, 05-11]

# Actuals (#2632)
actuals:
  tokens: 1077
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Explicit glob for node --test (never a bare directory arg) to avoid silent zero-test discovery"
    - "Append-only evidence log: a redo gets a new row, never an edit/merge of a prior row"

key-files:
  created:
    - docs/operations/RELEASE-EVIDENCE.md
  modified:
    - package.json

key-decisions:
  - "Used the exact working glob form (infra/modules/static-site/tests/*.test.mjs) per RESEARCH.md Pitfall 5, not D-10's literal bare-directory example, which silently discovers 0 tests."
  - "Spliced test:redirect immediately after test:unit and before build in the verify chain — both are fast, non-build-dependent checks."
  - "No CI workflow change needed for D-11: validate.yml's site job already runs npm run verify verbatim, confirmed by grep (1 match, no narrower subset)."
  - "RELEASE-EVIDENCE.md seeded with zero data rows (Promotions and Rollbacks fully empty; Security table seeded only with the channel name security@puppetstagehand.com) — no fabricated evidence for events that haven't happened yet."

patterns-established:
  - "Append-only markdown evidence log: header prose states the never-edit/never-delete rule explicitly; every later plan in this phase appends real rows, never modifies existing ones."

requirements-completed: [GATE-05, LAUN-03]

coverage:
  - id: D1
    description: "npm run verify runs redirect.test.mjs's all 6 real tests via an explicit glob, not a synthetic zero-count pass"
    requirement: "GATE-05"
    verification:
      - kind: unit
        ref: "node --test infra/modules/static-site/tests/*.test.mjs (reports tests 6, pass 6, fail 0)"
        status: pass
      - kind: integration
        ref: "npm run verify (full chain, exits 0 with test:redirect included)"
        status: pass
    human_judgment: false
  - id: D2
    description: "CI (validate.yml) already executes the redirect suite via its existing npm run verify invocation, with zero workflow changes"
    requirement: "GATE-05"
    verification:
      - kind: other
        ref: "grep -c 'npm run verify' .github/workflows/validate.yml (returns 1, the site job's only verify invocation, not a narrower subset)"
        status: pass
    human_judgment: false
  - id: D3
    description: "docs/operations/RELEASE-EVIDENCE.md exists with Promotions, Rollbacks, and Security advisory delivery test tables, all rows empty, header prose stating the append-only rule"
    requirement: "LAUN-03"
    verification:
      - kind: other
        ref: "test -f docs/operations/RELEASE-EVIDENCE.md && grep -c '^## ' docs/operations/RELEASE-EVIDENCE.md (returns 3)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-27
status: complete
---

# Phase 05 Plan 04: Redirect Test Wiring and Release Evidence Scaffold Summary

**Wired the dead `redirect.test.mjs` into `npm run verify`/CI via an explicit glob (avoiding a silent zero-test pass), and scaffolded the append-only `docs/operations/RELEASE-EVIDENCE.md` log every later Phase 5 plan appends real rows to.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-27T13:43:00Z
- **Completed:** 2026-08-27T13:55:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- `npm run verify` now actually runs `infra/modules/static-site/tests/redirect.test.mjs`'s 6 real tests (all passing), closing GATE-05
- Confirmed CI already enforces this with zero workflow changes: `validate.yml`'s `site` job runs `npm run verify` verbatim
- Ran the full `npm run verify` chain end to end (format, lint, check, validate:data, unit, redirect, build, routes, invalidation, links, e2e incl. build-isolation) — all green
- Scaffolded `docs/operations/RELEASE-EVIDENCE.md`: append-only log with Promotions, Rollbacks, and Security advisory delivery test tables, all rows empty, ready for every remaining plan in this phase to append real evidence

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire redirect.test.mjs into the verify chain** - `8b86bce` (feat)
2. **Task 2: Confirm CI already covers the new script (D-11) and run full verify** - no commit (confirmation-only task, zero file changes: `files_modified` was empty per plan)
3. **Task 3: Scaffold RELEASE-EVIDENCE.md** - `439f69b` (docs)

_Note: Task 2 required no code or workflow changes — `validate.yml` already runs `npm run verify` verbatim, so D-11 was satisfied automatically by Task 1's change to the `verify` chain._

## Files Created/Modified
- `package.json` - Added `test:redirect` script (explicit glob form) and spliced `npm run test:redirect` into `verify` between `test:unit` and `build`
- `docs/operations/RELEASE-EVIDENCE.md` (new) - Append-only evidence log with Promotions, Rollbacks, and Security advisory delivery test tables, all empty except the seeded `security@puppetstagehand.com` channel name

## Decisions Made
- Used the corrected glob `infra/modules/static-site/tests/*.test.mjs` (RESEARCH.md Pitfall 5) instead of D-10's literal bare-directory example `infra/modules/static-site/tests/`, which was verified locally to silently discover 0 tests and report a single synthetic failure instead.
- Left `redirect.test.mjs`'s `node:test` runner untouched — not converted to vitest (D-10, LOCKED).
- RELEASE-EVIDENCE.md table columns follow `release.md`'s exact per-environment check list (home, tiers, compat, docs, support, tiers.json, compat.json, 404, apex redirect for stable only) so the log's structure mirrors the runbook's own promotion checklist.
- Security advisory table seeded with one row naming the channel `security@puppetstagehand.com` and every other cell blank, per the plan's explicit instruction — the real delivery test result is deferred to 05-09.

## Deviations from Plan

None - plan executed exactly as written. One minor observational note: this Node version (v26.7.0)'s default `node --test` reporter prints `ℹ tests 6` / `ℹ pass 6` / `ℹ fail 0` rather than the TAP-style `# tests 6` prefix the plan's `<verify>` grep pattern assumed. The underlying counts matched the acceptance criteria exactly (6 tests, 6 pass, 0 fail) — this is a reporter-format difference, not a behavior gap, and required no code change.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GATE-05 is closed: the apex→www redirect guarantee is now enforced automatically on every PR and push to `main`, not checked by hand.
- `docs/operations/RELEASE-EVIDENCE.md` exists and is ready for every remaining plan in this phase (05-07, 05-08, 05-09, 05-10, 05-11) to append real promotion, rollback, and security-delivery-test rows as those events actually happen.
- No blockers for subsequent plans in this phase.

## Self-Check: PASSED

All claimed files and commits verified present:
- `package.json` — FOUND
- `docs/operations/RELEASE-EVIDENCE.md` — FOUND
- Commit `8b86bce` — FOUND
- Commit `439f69b` — FOUND

---
*Phase: 05-production-launch*
*Completed: 2026-08-27*
