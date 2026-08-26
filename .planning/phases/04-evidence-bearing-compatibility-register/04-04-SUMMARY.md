---
phase: 04-evidence-bearing-compatibility-register
plan: 04
subsystem: testing
tags: [vitest, playwright, axe-core, astro, json-endpoint, e2e]

requires:
  - phase: 04-evidence-bearing-compatibility-register
    provides: "src/lib/data/compatibility.ts loadCompatibility(), src/pages/data/compatibility.json.ts GET handler (pre-existing, unchanged)"
provides:
  - "tests/unit/json-endpoints.test.ts's compatibility test compares against loadCompatibility()'s live output instead of a hard-coded empty array"
  - "tests/e2e/production-empty.spec.ts's two tests branch on the real /data/compatibility.json response's records.length instead of assuming it is always zero"
affects: ["04-01", "04-02", "04-03", "04-05", "04-06"]

actuals:
  tokens: 2100
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Structural JSON-endpoint test pattern: compare a GET handler's serialized output against the same loader function it calls internally (loadCompatibility()), mirroring the existing GET /data/tiers.json test's comparison-against-a-known-array pattern"
    - "Branch-on-real-response e2e pattern: fetch the JSON API response first, then branch page assertions on its shape (records.length === 0 vs > 0) so the same spec file stays correct whether the underlying dataset is empty or populated"

key-files:
  created: []
  modified:
    - tests/unit/json-endpoints.test.ts
    - tests/e2e/production-empty.spec.ts

key-decisions:
  - "Scoped the populated-branch record-count locator to '.compat-table [data-record-id]' rather than the plan's literal unscoped '[data-record-id]' selector, because CompatibilityMatrix.astro renders both a table row and a responsive card per record sharing the same data-record-id attribute — an unscoped locator would silently double-count against body.records.length the first time this branch actually executes."

patterns-established: []

requirements-completed: [COMP-02, COMP-05]

coverage:
  - id: D1
    description: "tests/unit/json-endpoints.test.ts's GET /data/compatibility.json test compares structurally against loadCompatibility() instead of hard-coding records: []"
    requirement: COMP-05
    verification:
      - kind: unit
        ref: "tests/unit/json-endpoints.test.ts#GET /data/compatibility.json > returns the real compatibility registry in the deterministic download contract"
        status: pass
    human_judgment: false
  - id: D2
    description: "tests/e2e/production-empty.spec.ts's two tests branch on the real production JSON response's records.length instead of assuming it is always 0, while CompatibilityEmptyState.astro and compatibility/index.astro remain byte-for-byte unchanged"
    requirement: COMP-02
    verification:
      - kind: e2e
        ref: "tests/e2e/production-empty.spec.ts#reflects the real production register's empty-or-populated state (--project=production)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/production-empty.spec.ts#the production compatibility route has no serious or critical axe violations (--project=production)"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-08-26
status: complete
---

# Phase 4 Plan 04: Retire Hard-Coded Empty-Register Test Assumptions Summary

**Rewrote `tests/unit/json-endpoints.test.ts` and `tests/e2e/production-empty.spec.ts` to compare structurally against `loadCompatibility()`'s live output and to branch on the real `/data/compatibility.json` response, instead of hard-coding "the compatibility register is always empty" — closing 04-RESEARCH.md's Pitfall 1 before it can pressure a future contributor into weakening validation.**

## Performance

- **Duration:** 3 min (18:46:01 to 18:48:21, plus verification runs)
- **Started:** 2026-08-26T18:44:00Z (approx, see git log)
- **Completed:** 2026-08-26T18:48:21-05:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `tests/unit/json-endpoints.test.ts`'s `GET /data/compatibility.json` test now imports `loadCompatibility()` and compares the endpoint's serialized response against `loadCompatibility()`'s live output, mirroring the existing `GET /data/tiers.json` test's comparison-against-a-known-array pattern — it stays correct whether the register is empty or holds real records.
- `tests/e2e/production-empty.spec.ts`'s two tests now fetch `/data/compatibility.json` first and branch their DOM assertions on `body.records.length`: the empty branch runs the original empty-state assertions unchanged; the populated branch (currently untested against live data, since production is empty today) asserts the matrix renders and the correct number of table rows appear.
- Neither `CompatibilityEmptyState.astro` nor `src/pages/compatibility/index.astro` were touched — verified via `git diff` showing zero changes to either file.

## Task Commits

Each task was committed atomically:

1. **Task 1: Structurally compare tests/unit/json-endpoints.test.ts against loadCompatibility()** - `7e0d79c` (test)
2. **Task 2: Branch tests/e2e/production-empty.spec.ts on the real JSON response** - `b237457` (test)

**Plan metadata:** committed separately after this SUMMARY (docs: complete plan)

## Files Created/Modified
- `tests/unit/json-endpoints.test.ts` - Compatibility JSON test compares against `loadCompatibility()`'s live output instead of a literal `records: []`
- `tests/e2e/production-empty.spec.ts` - Both tests fetch the JSON endpoint first and branch assertions on `records.length`, with a scoped `.compat-table [data-record-id]` locator for the populated branch

## Decisions Made
- Used `.compat-table [data-record-id]` (scoped to the table only) instead of the plan's literal unscoped `[data-record-id]` locator for the populated-branch record-count assertion. `CompatibilityMatrix.astro` renders each record twice — once as a table row and once as a responsive card — both carrying the same `data-record-id` attribute. An unscoped locator would count 2x `body.records.length` the first time a real record makes this branch execute, silently reintroducing exactly the class of land-mine assertion this plan exists to eliminate. This mirrors the scoping pattern `tests/e2e/fixture-matrix.spec.ts` already uses (`.compat-table tbody tr` / `.compat-cards .compat-card` counted separately).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Scoped the populated-branch record-count locator to avoid double-counting**
- **Found during:** Task 2 (rewriting `tests/e2e/production-empty.spec.ts`)
- **Issue:** The plan's literal instruction ("assert `page.locator('[data-record-id]')` has count equal to `body.records.length`") would produce a locator matching both the table row and the card rendered per record in `CompatibilityMatrix.astro`, doubling the expected count the moment the register holds real data and this branch actually runs.
- **Fix:** Scoped the locator to `.compat-table [data-record-id]`, matching only table rows, consistent with how `tests/e2e/fixture-matrix.spec.ts` already disambiguates table rows from cards.
- **Files modified:** `tests/e2e/production-empty.spec.ts`
- **Verification:** `env -u NO_COLOR playwright test tests/e2e/production-empty.spec.ts --project=production` passes (empty-state branch exercised; populated branch is structurally correct but not exercised against live data since production is empty today).
- **Committed in:** `b237457` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary correctness fix for dead code that will activate the first time a real compatibility record is published. No scope creep — no other files touched.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both test files now correctly express the "register may be empty or populated" invariant per the phase's own open question (04-RESEARCH.md Open Question 1) — no future plan needs to revisit these two files unless the matrix rendering markup itself changes.
- The populated branch of `tests/e2e/production-empty.spec.ts` is structurally correct but has never executed against a real non-empty production build in this session (production is empty today) — worth a one-time smoke check once COMP-01 publishes the first real record, though this is a low-risk residual since the branch mirrors the already-proven `fixture-matrix.spec.ts` locator-scoping pattern.
- No blockers for 04-01/04-02/04-03/04-05/04-06.

---
*Phase: 04-evidence-bearing-compatibility-register*
*Completed: 2026-08-26*

## Self-Check: PASSED

- FOUND: tests/unit/json-endpoints.test.ts
- FOUND: tests/e2e/production-empty.spec.ts
- FOUND: 7e0d79c (test(04-04): compare compatibility JSON endpoint against loadCompatibility())
- FOUND: b237457 (test(04-04): branch production-empty spec on real compatibility register state)
