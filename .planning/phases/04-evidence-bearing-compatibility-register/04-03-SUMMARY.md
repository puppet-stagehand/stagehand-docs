---
phase: 04-evidence-bearing-compatibility-register
plan: 03
subsystem: testing
tags: [playwright, astro, accessibility, keyboard-navigation, e2e]

# Dependency graph
requires:
  - phase: 04-evidence-bearing-compatibility-register/04-01
    provides: "STAGEHAND_SCALE_FIXTURES build branch, tests/fixtures/data/compatibility-scale.yaml (27 records), fixture-matrix-scale Playwright project (port 4323), and the initial 2-test tests/e2e/fixture-matrix-scale.spec.ts"
provides:
  - "tests/e2e/fixture-matrix-scale.spec.ts grown from 2 to 7 tests: record-count render, axe scan, filter N/M correctness (3/27, 6/27, 5/27), 44px touch targets, no-JS parity, keyboard tab-order linearity, and long-text wrap backstops"
  - "GATE-04's realistic-volume proof: filter correctness, touch targets, keyboard operability, long-text handling, and no-JS readability are all proven at 27 records, not assumed from the 5-record ADR-0001 fixture"
affects: [04-02, 04-04, 04-05, 04-06]

# Actuals (#2632)
actuals:
  tokens: 1482
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scope getByText() assertions to the CSS-visible layout container (.compat-table-frame vs .compat-cards) rather than asserting on the raw text locator, avoiding both strict-mode multi-match and asserting visibility on a currently display:none element"

key-files:
  created: []
  modified:
    - tests/e2e/fixture-matrix-scale.spec.ts

key-decisions:
  - "Split the plan's single 44px-touch-target test across two viewports (1280x800 for .compat-filters controls, 320x720 for .compat-card__footer links) instead of one viewport as the plan's <action> literally described, because .compat-cards is display:none above the 48rem breakpoint — asserting boundingBox() on those 54 hidden links at 1280px would have failed every one of them"
  - "Keyboard tab-order test starts focus at the 'Clear filters' button, not at Platform as the plan's assumed sequence suggested, after confirming CompatibilityMatrix.astro's real DOM order (button lives in .compat-filters__heading, before the selects in .compat-filters__controls) — per the plan's own escape hatch to write the test to match the real order"
  - "Long-text wrap-backstop test scopes each getByText() assertion to '.compat-table-frame' or '.compat-cards' per breakpoint, since both layouts render every record's text in the DOM at all times and only CSS visibility toggles which is on screen — an unscoped locator either strict-mode-fails (2 DOM matches) or silently resolves to the currently-hidden layout's copy"

patterns-established: []

requirements-completed: [GATE-04, COMP-04]

coverage:
  - id: D1
    description: "Filtering the 27-record scale fixture by Platform, Customer tier, and Support status each produces a distinct, correct 'Showing N of 27 verified records' count, and returns to 'Showing 27 of 27' after each Clear filters click"
    requirement: "GATE-04"
    verification:
      - kind: e2e
        ref: "tests/e2e/fixture-matrix-scale.spec.ts#filtering at scale reflects realistic result counts across platform, tier, and status"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every discrete control (3 filter selects, Clear filters button, and all 54 card footer links across 27 records) keeps its 44px minimum touch target"
    requirement: "GATE-04"
    verification:
      - kind: e2e
        ref: "tests/e2e/fixture-matrix-scale.spec.ts#every discrete control keeps its 44px minimum touch target at scale"
        status: pass
    human_judgment: false
  - id: D3
    description: "The scale-volume matrix renders all 27 rows and is readable with JavaScript disabled, proving filtering degrades to 'show everything' without a client-side script"
    requirement: "GATE-04"
    verification:
      - kind: e2e
        ref: "tests/e2e/fixture-matrix-scale.spec.ts#the scale-volume matrix remains readable when JavaScript is unavailable"
        status: pass
    human_judgment: false
  - id: D4
    description: "Keyboard tab order through the real DOM sequence (Clear filters -> Platform -> Customer tier -> Support status -> first record's Primary evidence -> Platform guidance) is linear and reaches real, focusable anchor elements at 27 records, with no keyboard trap"
    requirement: "COMP-04"
    verification:
      - kind: e2e
        ref: "tests/e2e/fixture-matrix-scale.spec.ts#keyboard tab order through the filters reaches the first record's links in sequence at scale"
        status: pass
    human_judgment: false
  - id: D5
    description: "The unusually long platform name (scale-11/scale-23) and the 60+-character limitations sentence (scale-07) both render their full text without truncation, in both the table and card layouts, at 1280px and 320px"
    requirement: "COMP-04"
    verification:
      - kind: e2e
        ref: "tests/e2e/fixture-matrix-scale.spec.ts#long limitation text and an unusually long platform name render without truncation at scale"
        status: pass
    human_judgment: false

duration: 11min
completed: 2026-08-26
status: complete
---

# Phase 4 Plan 3: GATE-04 Realistic-Volume Assertions Summary

**Grew `tests/e2e/fixture-matrix-scale.spec.ts` from 2 to 7 Playwright tests, proving filter correctness, 44px touch targets, keyboard tab-order linearity, long-text wrap handling, and no-JS parity against the real 27-record scale fixture — completing GATE-04's evidence that the populated compatibility matrix works at realistic volume, not just the 5-record ADR-0001 fixture.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-08-26T18:54:43-05:00 (worktree base)
- **Completed:** 2026-08-26T19:04:57-05:00
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added a filter-correctness test asserting all three N/M pairs the plan named (3 of 27 for Platform "AWS EC2", 6 of 27 for Customer tier "pe-advanced", 5 of 27 for Support status "unsupported"), returning to 27 of 27 after each Clear filters click
- Added a 44px touch-target test covering all filter selects/button plus all 54 card footer links (27 records × 2 links), split across the desktop and mobile viewports where each control class is actually the CSS-visible one
- Added a no-JS parity test proving all 27 table rows render server-side with `javaScriptEnabled: false` against the scale build's port 4323
- Added a keyboard tab-order test verifying the real, DOM-order focus sequence (not an assumed one) reaches both of the first record's links with no trap at 27 records
- Added a long-text wrap-backstop test proving scale-11/scale-23's long platform name and scale-07's 60+-character limitations sentence both render in full, in both the table and card layouts, at 1280px and 320px

## Task Commits

Each task was committed atomically:

1. **Task 1: Add filter-correctness, 44px touch-target, and no-JS parity tests at scale** - `0190738` (test)
2. **Task 2: Add keyboard tab-order linearity and long-text wrap backstop tests at scale** - `b3db298` (test)

_This plan had no checkpoints; both tasks are `type="auto"` and executed autonomously._

## Files Created/Modified
- `tests/e2e/fixture-matrix-scale.spec.ts` - Grown from 2 tests (04-01) to 7: record-count render, axe scan, filter N/M correctness, 44px touch targets, no-JS parity, keyboard tab-order linearity, and long-text wrap backstops

## Decisions Made
- Verified the exact record composition in `tests/fixtures/data/compatibility-scale.yaml` before writing filter assertions (platform "AWS EC2" at indices 0/12/24 = 3; tier "pe-advanced" at indices 3/7/11/15/19/23 = 6; status "unsupported" at indices 4/9/14/19/24 = 5), matching the plan's stated composition exactly
- Confirmed `.compat-filters` (selects, Clear filters button) has no responsive display toggle, while `.compat-table-frame` and `.compat-cards` swap visibility at the 48rem (768px) breakpoint (`_compatibility.scss`) — this drove both the touch-target viewport split and the wrap-backstop layout scoping
- Confirmed the real DOM tab order in `CompatibilityMatrix.astro`: the `Clear filters` reset button lives in `.compat-filters__heading`, before the three selects in `.compat-filters__controls` — the reverse of the plan's assumed sequence

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed the 44px touch-target test's viewport, which as literally described would have asserted bounding boxes on hidden elements**
- **Found during:** Task 1 (44px touch-target test)
- **Issue:** The plan's `<action>` said to check `.compat-filters select, .compat-filters button, .compat-card__footer a` at a single 1280x800 viewport. At that width, `.compat-cards` is `display: none` (the table/card breakpoint is 48rem = 768px), so all 54 `.compat-card__footer a` elements are non-visible and `boundingBox()` returns `null` for each — `expect(undefined).toBeGreaterThanOrEqual(44)` would fail on every one.
- **Fix:** Split the check into two passes: filter selects/button at 1280x800 (always visible regardless of viewport), then card footer links at 320x720 (where `.compat-cards` is the visible layout). This is strictly more coverage than the plan's literal instruction, not less — every control's touch target is checked at the viewport where it is the rendered, on-screen control.
- **Files modified:** tests/e2e/fixture-matrix-scale.spec.ts
- **Verification:** `every discrete control keeps its 44px minimum touch target at scale` passes; re-ran with the plan's literal single-viewport version first to confirm the failure mode before fixing.
- **Committed in:** `0190738` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed the keyboard tab-order test's assumed starting point after verifying the real DOM order**
- **Found during:** Task 2 (keyboard tab-order test)
- **Issue:** The plan's `<action>` assumed focusing Platform first, then tabbing to Customer tier, Support status, Clear filters, and the two links — but `CompatibilityMatrix.astro`'s DOM order places the Clear filters button before the selects. Starting focus at Platform and tabbing forward would never reach Clear filters (it precedes Platform in document order).
- **Fix:** Per the plan's own explicit escape hatch ("if the real order differs ... write the test to match the real order"), started focus at the Clear filters button and asserted the tab sequence forward from there: Clear filters -> Platform -> Customer tier -> Support status -> Primary evidence (first record) -> Platform guidance (first record).
- **Files modified:** tests/e2e/fixture-matrix-scale.spec.ts
- **Verification:** `keyboard tab order through the filters reaches the first record's links in sequence at scale` passes.
- **Committed in:** `b3db298` (Task 2 commit)

**3. [Rule 1 - Bug] Fixed strict-mode / hidden-layout ambiguity in the long-text wrap-backstop test**
- **Found during:** Task 2 (long-text wrap-backstop test)
- **Issue:** Both the table row and the card for the same record render each record's full text at all times in the DOM — only CSS `display` toggles which layout is on screen. An unscoped `page.getByText(longLimitation)` resolved to 2 DOM matches (Playwright strict mode failure); using `.first()` instead would silently pick whichever layout comes first in markup (the table), which is hidden at the 320px mobile viewport, making the mobile assertion falsely pass/fail against the wrong node.
- **Fix:** Scoped each `getByText()` call to `.compat-table-frame` at 1280px and `.compat-cards` at 320px — the container that is actually the CSS-visible layout at that breakpoint.
- **Files modified:** tests/e2e/fixture-matrix-scale.spec.ts
- **Verification:** `long limitation text and an unusually long platform name render without truncation at scale` passes at both viewports.
- **Committed in:** `b3db298` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - test-authoring bugs discovered while implementing the plan's literal instructions against the real rendered DOM/CSS)
**Impact on plan:** All three fixes make the tests assert what the plan's `must_haves` truths and `acceptance_criteria` actually require (correct 44px checks, a real trap-free tab order, untruncated text at the visible layout) rather than what the plan's `<action>` prose literally described. No scope creep — no new test coverage beyond what the plan specified was added.

## Issues Encountered
None beyond the three deviations documented above, which were caught and resolved during test-writing before the first commit (Task 1's 44px fix) or via a first failing run of the plan's literal instructions (Task 2's wrap-backstop fix).

## Next Phase Readiness
- `tests/e2e/fixture-matrix-scale.spec.ts` now has all 7 tests GATE-04 requires, all passing against the real `.scale-dist` build
- The sibling `tests/e2e/fixture-matrix.spec.ts` (`--project=fixture-matrix`, the 5-record ADR-0001 fixture) still passes unchanged — no cross-contamination from this plan's changes
- No blockers identified for downstream plans in this phase

---
*Phase: 04-evidence-bearing-compatibility-register*
*Completed: 2026-08-26*

## Self-Check: PASSED

Confirmed `tests/e2e/fixture-matrix-scale.spec.ts` exists on disk with 7 tests. Confirmed commits `0190738` and `b3db298` are present in `git log --oneline`.
