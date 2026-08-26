---
phase: 03-real-documentation-content
plan: 02
subsystem: testing
tags: [vitest, tsx, cloudfront, invalidation, build-gate]

# Dependency graph
requires:
  - phase: 03-real-documentation-content (03-01)
    provides: scripts/deploy-site.sh's hand-maintained --paths invalidation list, which this plan's checker reads as source of truth
provides:
  - "scripts/check-invalidation-coverage.ts — CLI script that fails when a built HTML route lacks a matching literal or glob-prefix entry in scripts/deploy-site.sh's --paths list"
  - "tests/unit/invalidation-coverage.test.ts — synthetic-fixture regression test proving the checker's missing-route, covered-route, and hashed-asset-exclusion behavior"
  - "npm run check:invalidation wired into npm run verify between check:routes and check:links"
affects: [03-03, 03-04, GATE-03]

# Actuals (#2632)
actuals:
  tokens: 1600
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CLI checker script mirroring scripts/check-built-routes.ts's shape (argv-based buildRoot/scriptPath, thrown Error on failure, console.log confirmation on success)"
    - "Synthetic-fixture unit test pattern mirroring tests/unit/built-routes.test.ts (mkdtempSync + spawnSync against the real CLI script, afterEach cleanup)"

key-files:
  created:
    - scripts/check-invalidation-coverage.ts
    - tests/unit/invalidation-coverage.test.ts
  modified:
    - package.json

key-decisions:
  - "Regex-based parse of deploy-site.sh's --paths block (single-quoted, /-prefixed tokens) rather than executing the shell script — keeps the checker side-effect-free in CI, per the plan's threat model (T-03-04)"
  - "Exported findMissingInvalidationPaths as a named async function for future unit-level reuse, while the committed test still exercises it only through the CLI/spawnSync interface, matching built-routes.test.ts's existing style"

patterns-established:
  - "Build-artifact-only checks (check:routes, check:invalidation) run immediately after npm run build and before the slower link-crawl/e2e steps in the verify chain"

requirements-completed: [GATE-03]

coverage:
  - id: D1
    description: "A route present in a real production build but missing from scripts/deploy-site.sh's invalidation --paths list fails npm run verify with a named-route error"
    requirement: "GATE-03"
    verification:
      - kind: unit
        ref: "tests/unit/invalidation-coverage.test.ts#flags a built HTML route missing from the invalidation list"
        status: pass
    human_judgment: false
  - id: D2
    description: "check:invalidation is wired into npm run verify, positioned between check:routes and check:links"
    requirement: "GATE-03"
    verification:
      - kind: unit
        ref: "grep check:invalidation package.json (verify script chain)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The check does not demand invalidation entries for hashed, immutable assets under dist/assets/"
    requirement: "GATE-03"
    verification:
      - kind: unit
        ref: "tests/unit/invalidation-coverage.test.ts#excludes hashed files under dist/assets/ from the coverage requirement"
        status: pass
    human_judgment: false
  - id: D4
    description: "The checker passes against the real dist/ produced from the working tree as it stands after this task"
    requirement: "GATE-03"
    verification:
      - kind: other
        ref: "npm run build && npm run check:invalidation (manual run, output: 'Verified 8 routes are covered by the invalidation list')"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-26
status: complete
---

# Phase 03 Plan 02: GATE-03 Invalidation Coverage Checker Summary

**Regression-test-and-checker pair that fails `npm run verify` whenever a built HTML route has no matching literal or glob-prefix entry in `scripts/deploy-site.sh`'s CloudFront `--paths` list.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-26T17:43:00Z
- **Completed:** 2026-08-26T17:45:24Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `scripts/check-invalidation-coverage.ts` parses `scripts/deploy-site.sh`'s `--paths` block for literal and glob-prefix tokens, walks the built `dist/` tree for `*.html` routes (skipping `dist/assets/`), and throws a named-route error when any route is uncovered
- `tests/unit/invalidation-coverage.test.ts` proves the three required behaviors against synthetic fixtures: missing-route detection, full-coverage pass, and hashed-asset exclusion
- `npm run check:invalidation` is wired into `npm run verify`'s chain, positioned between `check:routes` and `check:links`
- Verified against the real working-tree `dist/`: all 8 existing routes are currently covered

## Task Commits

Each task was committed atomically (TDD RED then GREEN):

1. **Task 1 (RED): Write the failing invalidation-coverage test** - `16872e5` (test)
2. **Task 2 (GREEN): Implement the checker and wire it into npm run verify** - `46a2c3c` (feat)

**Plan metadata:** (pending — this SUMMARY commit)

## Files Created/Modified
- `scripts/check-invalidation-coverage.ts` - CLI checker; exports `findMissingInvalidationPaths(buildRoot, deployScriptPath)`
- `tests/unit/invalidation-coverage.test.ts` - 3 synthetic-fixture tests against the CLI via `spawnSync`
- `package.json` - added `check:invalidation` script, inserted into the `verify` chain

## Decisions Made
- Parsed `deploy-site.sh` as text via regex rather than executing it, keeping the checker side-effect-free in CI (matches the plan's threat model T-03-04 mitigation)
- Exported the core matching logic as a named function for future unit-level testability, without changing the committed test's CLI-based invocation style

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reformatted test file per Prettier during GREEN verification**
- **Found during:** Task 2 (post-implementation `npm run verify`-equivalent checks)
- **Issue:** `npx prettier --check` flagged the array-literal formatting in `runChecker`'s `spawnSync` call args as non-conforming; `npm run verify` begins with `format:check`, so this would have failed the gate even though test logic was already correct and passing
- **Fix:** Ran `npx prettier --write` on the test file; the only diff is collapsing a multi-line array literal to one line — no test behavior changed, tests still 3/3 passing before and after
- **Files modified:** `tests/unit/invalidation-coverage.test.ts`
- **Verification:** `npx vitest run tests/unit/invalidation-coverage.test.ts` (3 passed) and `npx prettier --check` (clean) both re-run after the fix
- **Committed in:** `46a2c3c` (Task 2 commit, since the format-only diff landed alongside the implementation)

---

**Total deviations:** 1 auto-fixed (1 bug/format-compliance)
**Impact on plan:** No scope creep — a formatting-only fix required to keep the plan's own quality bar (`npm run verify`'s `format:check` step) green.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GATE-03's regression test now exists and is wired into `npm run verify`, closing the loop that 03-01's hand-edited `deploy-site.sh` invalidation list depends on for every future route addition
- Ready for 03-03 / 03-04 — any future documentation page that forgets its invalidation entry will now fail `npm run verify` with a named-route error instead of a silent pass

## TDD Gate Compliance

Both required gate commits are present and correctly ordered:
- RED: `16872e5 test(03-02): add failing test for invalidation coverage gate`
- GREEN: `46a2c3c feat(03-02): implement invalidation coverage checker, wire into verify`

No REFACTOR commit was needed — the GREEN implementation required no follow-up cleanup beyond the format fix folded into the GREEN commit itself.

---
*Phase: 03-real-documentation-content*
*Completed: 2026-08-26*

## Self-Check: PASSED

- FOUND: scripts/check-invalidation-coverage.ts
- FOUND: tests/unit/invalidation-coverage.test.ts
- FOUND: commit 16872e5 (test RED)
- FOUND: commit 46a2c3c (feat GREEN)
- FOUND: `check:invalidation` present in package.json `verify` chain
- FOUND: `npm run build && npm run check:invalidation` passes against real working-tree dist/ (8/8 routes covered)
