---
phase: 04-evidence-bearing-compatibility-register
plan: 02
subsystem: testing
tags: [vitest, typescript, yaml, build-isolation, tdd]

# Dependency graph
requires:
  - phase: 04-evidence-bearing-compatibility-register (plan 01)
    provides: STAGEHAND_SCALE_FIXTURES build target and tests/fixtures/data/compatibility-scale.yaml (27-record scale fixture)
provides:
  - Content cross-reference leak detector in scripts/check-e2e-build-isolation.ts (replaces "production must be empty" with "production contains no fixture-derived record")
  - Exported identityOf in src/lib/data/compatibility.ts, reused (not reimplemented) by the isolation checker
  - Proven negative-path test coverage for the isolation gate (id collision + identity-tuple collision)
affects: [04-evidence-bearing-compatibility-register plan 06 (full verify pass), COMP-01 review workflow]

# Actuals (#2632)
actuals:
  tokens: 2235
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content cross-reference leak detection: a build-isolation gate compares production build output against the raw fixture source YAMLs it must never leak, instead of asserting an artifact is empty."
    - "Shared identity function: both the data loader's duplicate-detection and a downstream build-tooling script import the same exported identityOf so 'identity' can never drift between the two."

key-files:
  created:
    - tests/fixtures/build-output/scale/data/compatibility.json
    - tests/fixtures/build-output/production-leaked/data/compatibility.json
  modified:
    - scripts/check-e2e-build-isolation.ts
    - src/lib/data/compatibility.ts
    - tests/unit/e2e-build-isolation.test.ts

key-decisions:
  - "identityOf's parameter type was narrowed to Pick<CompatibilityRecord, 'platform' | 'puppet_versions' | 'tier' | 'provider' | 'transport'> rather than duplicated in the checker script, so the two identity notions (loader's duplicate check, checker's leak check) cannot drift apart."
  - "The isolation checker reads the two fixture source YAMLs directly via resolve(process.cwd(), ...) rather than through any build output, matching the plan's key_link requirement and RESEARCH.md Pitfall 3's warning against a schema marker field."

patterns-established:
  - "Leak-check record narrowing: an untyped JSON build artifact is narrowed field-by-field with string defaults ('' for non-string fields) so minimal pass fixtures (e.g. {\"id\": \"one\"}) remain valid and never accidentally collide (empty-field identity '||||' is unreachable by any real record)."

requirements-completed: [COMP-03]

coverage:
  - id: D1
    description: "Isolation checker rejects a production build containing a record that collides with a fixture source record by id"
    requirement: COMP-03
    verification:
      - kind: unit
        ref: "tests/unit/e2e-build-isolation.test.ts#rejects a production build containing a fixture-derived record"
        status: pass
    human_judgment: false
  - id: D2
    description: "Isolation checker rejects a production build containing a record that collides with a fixture source record by identity tuple only (distinct id)"
    requirement: COMP-03
    verification:
      - kind: unit
        ref: "tests/unit/e2e-build-isolation.test.ts#rejects a production build containing a fixture-derived record"
        status: pass
    human_judgment: false
  - id: D3
    description: "Isolation checker accepts a clean production build alongside a 5-record e2e build and a 24-record scale build (pass path unchanged)"
    requirement: COMP-03
    verification:
      - kind: unit
        ref: "tests/unit/e2e-build-isolation.test.ts#accepts an empty production build with a five-record E2E build and a 24-record scale build"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-08-27
status: complete
---

# Phase 04 Plan 02: Rework build-isolation checker as a content cross-reference Summary

**Rewrote `scripts/check-e2e-build-isolation.ts` from "production must be empty" to "production contains no fixture-derived record," proven by a real negative-path test (id collision + identity-tuple collision), with `identityOf` exported from `src/lib/data/compatibility.ts` so both checks share one identity notion.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-08-27T00:00:00Z (approx)
- **Completed:** 2026-08-27T00:22:00Z (approx)
- **Tasks:** 2 (RED, GREEN)
- **Files modified:** 5

## Accomplishments
- `scripts/check-e2e-build-isolation.ts` now cross-references production build output against the real content of both `tests/fixtures/data/compatibility-e2e.yaml` and `tests/fixtures/data/compatibility-scale.yaml`, rejecting any production record that collides by `id` or by identity tuple, instead of hard-failing on any non-empty production output.
- `identityOf` is exported from `src/lib/data/compatibility.ts` with a narrowed `Pick<...>` parameter type; the checker imports and reuses it rather than reimplementing identity logic.
- New negative-path fixture `tests/fixtures/build-output/production-leaked/data/compatibility.json` proves both detection paths independently: one record collides by `id` only (mismatched identity fields), the other collides by identity tuple only (distinct `id`).
- New pass-path fixture `tests/fixtures/build-output/scale/data/compatibility.json` (24 minimal records) proves the checker's new `scale.records.length < 24` sanity check on the pass path.
- The locked 5-record E2E count assertion (ADR-0001 rule 2) is unchanged.
- `src/data/schema/compatibility.schema.json` is untouched — verified via `git diff` showing no changes to that file.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Rewrite isolation-checker unit test + new fixtures** - `7878be5` (test)
2. **Task 2 (GREEN): Export identityOf, rework checker as content cross-reference** - `30b41a0` (feat)

Additional deferred-items log commit (out-of-scope flaky test, not part of the plan's task list): `9c820a4` (docs)

_TDD gate sequence confirmed present: `git log --grep="^test(04-02)"` → `7878be5`; `git log --grep="^feat(04-02)"` → `30b41a0`._

## Files Created/Modified
- `scripts/check-e2e-build-isolation.ts` - Reworked into a content cross-reference leak detector; accepts a third `scaleRoot` argument; adds the >=24-record scale sanity check.
- `src/lib/data/compatibility.ts` - `identityOf` changed from a private const to an exported const with a narrowed `Pick<CompatibilityRecord, ...>` parameter type; no other line changed.
- `tests/unit/e2e-build-isolation.test.ts` - Rewritten with the pass-path (3-root) test and the negative-path (leak-rejection) test, factored through a shared `runChecker` helper.
- `tests/fixtures/build-output/scale/data/compatibility.json` - New, 24 minimal records (`scale-01`..`scale-24`).
- `tests/fixtures/build-output/production-leaked/data/compatibility.json` - New, 2 records: one id-collision, one identity-tuple-collision, both against `compatibility-e2e.yaml`'s `aws-openvox-supported` record.

## Decisions Made
- Kept `identityOf`'s narrowing exactly as the plan specified (`Pick<CompatibilityRecord, 'platform' | 'puppet_versions' | 'tier' | 'provider' | 'transport'>`) rather than widening it to accommodate the checker's own untyped record shape — instead typed the checker's local `LeakCheckRecord.tier` field as `CompatibilityRecord['tier']` (with a cast at its single construction site in `asLeakCheckRecord`), preserving the plan's "identity can never drift" guarantee without weakening the shared function's contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TS2345 type error from identityOf's narrowed parameter type**
- **Found during:** Task 2 (GREEN implementation)
- **Issue:** After narrowing `identityOf`'s parameter to `Pick<CompatibilityRecord, 'platform' | 'puppet_versions' | 'tier' | 'provider' | 'transport'>`, `npx tsc --noEmit` failed at both `identityOf(record)` call sites in `scripts/check-e2e-build-isolation.ts` — the checker's own `LeakCheckRecord.tier` was typed as plain `string`, which doesn't structurally satisfy `CompatibilityRecord['tier']`'s 4-value union.
- **Fix:** Typed `LeakCheckRecord.tier` as `CompatibilityRecord['tier']` (imported as a type) and added a single cast at its one construction site in `asLeakCheckRecord`. This is a compile-time-only adjustment; the checker's leak-detection logic (string joins for comparison) is unaffected since real fixture and production data always uses valid tier values.
- **Files modified:** scripts/check-e2e-build-isolation.ts
- **Verification:** `npx tsc --noEmit` reports zero errors; both unit tests still pass.
- **Committed in:** 30b41a0 (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed TS2769 spawnSync overload mismatch in the RED-authored test helper**
- **Found during:** Task 2 (GREEN implementation, running `npx tsc --noEmit` as an acceptance check)
- **Issue:** `tests/unit/e2e-build-isolation.test.ts`'s `runChecker` helper (written in Task 1) had an explicit `ReturnType<typeof spawnSync>` return-type annotation. That generic annotation caused TypeScript to resolve `spawnSync`'s overload without the literal `encoding: 'utf8'` narrowing, typing `stdout`/`stderr` as `string | Buffer` — which then failed `expect(result.status, result.stderr).toBe(0)`'s overload resolution.
- **Fix:** Removed the explicit return-type annotation (let TS infer it from the call, which correctly resolves the string-encoded overload) and added an `as const` to the `encoding: 'utf8'` literal for extra safety. No assertions or test behavior changed.
- **Files modified:** tests/unit/e2e-build-isolation.test.ts
- **Verification:** `npx tsc --noEmit` reports zero errors; both unit tests still pass unchanged.
- **Committed in:** 30b41a0 (Task 2 commit, alongside the two files the plan scoped to this task)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking type errors surfaced by running the plan's own acceptance criteria)
**Impact on plan:** Both fixes are compile-time-only corrections required to satisfy the plan's own stated acceptance criterion ("`npx tsc --noEmit` reports no new type errors from either changed file"). No behavior, schema, or test assertion changed. No scope creep.

## Issues Encountered
- During verification, `npx vitest run tests/unit` (full suite) showed one unrelated failure in `tests/unit/built-link-policy.test.ts` (`ENOENT` renaming `.astro/content-modules.mjs.tmp`), caused by concurrent real `astro build` invocations racing on the shared `.astro` content-store cache. Re-ran that file in isolation — 10/10 passed. Confirmed unrelated to this plan's changed files (`compatibility.ts`, `check-e2e-build-isolation.ts`) and out of scope per the SCOPE BOUNDARY rule; logged to `.planning/phases/04-evidence-bearing-compatibility-register/deferred-items.md` rather than fixed here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The build-isolation gate no longer hard-fails the instant COMP-01 review produces the first real compatibility record — it now specifically rejects only records that leak from the fixture sources, matching the plan's objective.
- Plan 04-06's full verify pass is the integration point that runs `npm run build && npm run check:e2e-isolation` against real `.e2e-dist`/`.scale-dist` outputs — not exercised in this plan (per this plan's `<verification>` section, which explicitly defers that to 04-06).
- No blockers for downstream plans in this wave.

---
*Phase: 04-evidence-bearing-compatibility-register*
*Completed: 2026-08-27*

## Self-Check: PASSED

- FOUND: scripts/check-e2e-build-isolation.ts
- FOUND: src/lib/data/compatibility.ts
- FOUND: tests/unit/e2e-build-isolation.test.ts
- FOUND: tests/fixtures/build-output/scale/data/compatibility.json
- FOUND: tests/fixtures/build-output/production-leaked/data/compatibility.json
- FOUND: commit 7878be5 (test: RED)
- FOUND: commit 30b41a0 (feat: GREEN)
- FOUND: commit 9c820a4 (docs: deferred-items)
- `npx vitest run tests/unit/e2e-build-isolation.test.ts` — 2 passed
- `npx tsc --noEmit` — zero errors
- `git diff` against `src/data/schema/compatibility.schema.json` — no output (byte-identical, unchanged)
