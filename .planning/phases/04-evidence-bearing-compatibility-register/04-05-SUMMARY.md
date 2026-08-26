---
phase: 04-evidence-bearing-compatibility-register
plan: 05
subsystem: ui
tags: [scss, design-tokens, stylelint, adr, documentation]

# Dependency graph
requires:
  - phase: 04-evidence-bearing-compatibility-register
    provides: 04-UI-SPEC.md's untokenized-color finding and DRIFT-04's sentence-level amendment requirement, plus ADR-0001's locked delivery-boundary language
provides:
  - "--stagehand-danger / $stagehand-danger design token in _tokens.scss, consumed by .compat-status--unsupported"
  - "Design spec's success-criteria, architecture, and delivery-boundary sections amended to agree with ADR-0001's empty-registry decision"
affects: [04-evidence-bearing-compatibility-register (other plans building compat UI), any future phase referencing the design spec's delivery boundary]

actuals:
  tokens: 880
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["CSS custom properties sourced from Sass variables in _tokens.scss :root block, referenced via var(--token-name) in component stylesheets"]

key-files:
  created: []
  modified:
    - src/styles/_tokens.scss
    - src/styles/components/_compatibility.scss
    - docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md

key-decisions:
  - "Used ADR-0001's own amendment language verbatim for the DRIFT-04 sentences rather than paraphrasing, so the design spec and the locked ADR cannot later be read as disagreeing"

patterns-established: []

requirements-completed: [COMP-04, DRIFT-04]

coverage:
  - id: D1
    description: "The 'unsupported' status color is a named token (--stagehand-danger / $stagehand-danger) in _tokens.scss instead of a bare hex literal in _compatibility.scss, with zero visual change"
    requirement: COMP-04
    verification:
      - kind: unit
        ref: "grep verification: ! grep '#ff8b8b' src/styles/components/_compatibility.scss && grep 'stagehand-danger' src/styles/_tokens.scss"
        status: pass
      - kind: other
        ref: "npm run lint (eslint + stylelint) on both changed SCSS files"
        status: pass
    human_judgment: false
  - id: D2
    description: "All three DRIFT-04 sentences in the design spec (success criteria, architecture 'representative content' sentence, delivery boundary) now agree with ADR-0001's delivery boundary"
    requirement: DRIFT-04
    verification:
      - kind: unit
        ref: "grep verification: stale sentence absent, ADR-0001 referenced, 'representative content and compatibility data,' absent"
        status: pass
      - kind: other
        ref: "git diff docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md — confirmed exactly three changed hunks, no other content touched"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-26
status: complete
---

# Phase 4 Plan 05: Untokenized Color and DRIFT-04 Spec Amendments Summary

**Added `--stagehand-danger`/`$stagehand-danger` design token for the compat-status "unsupported" color and amended three design-spec sentences so they no longer contradict ADR-0001's empty-registry decision.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-26T23:46:53Z
- **Completed:** 2026-08-26T23:58:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Formalized the last untokenized status color: `.compat-status--unsupported` now references `var(--stagehand-danger)` instead of the bare `#ff8b8b` literal, matching the existing five-color token pattern exactly, with zero rendered visual change.
- Amended all three DRIFT-04 sentences in `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md` (success criteria, the "representative content for every route" architecture sentence, and the delivery-boundary list item) so none of them can be read as promising seeded customer-facing compatibility records, resolving the tension ADR-0001 was written to settle.

## Task Commits

Each task was committed atomically:

1. **Task 1: Formalize the untokenized "unsupported" status color** - `c8733d7` (fix)
2. **Task 2: Land DRIFT-04's three design-spec sentence amendments** - `ec6a044` (docs)

**Plan metadata:** (this SUMMARY's own commit, made by the orchestrator/worktree merge step)

## Files Created/Modified
- `src/styles/_tokens.scss` - Added `$stagehand-danger: #ff8b8b;` immediately after `$stagehand-warning`, and `--stagehand-danger: #{$stagehand-danger};` in the `:root` block immediately after `--stagehand-warning`.
- `src/styles/components/_compatibility.scss` - `.compat-status--unsupported` now uses `color: var(--stagehand-danger);` instead of the bare hex literal.
- `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md` - Success criteria bullet split into a product-tier sentence and a compatibility-claim sentence that cites ADR-0001 and describes the empty-state behavior; the "representative content for every route" sentence now explicitly distinguishes fixture data from seeded customer-facing records for the compatibility register; the delivery-boundary list item changed "compatibility data" to "compatibility test fixtures".

## Decisions Made
- Used ADR-0001's own already-reviewed amendment language verbatim for the DRIFT-04 sentences (per the plan's instruction), rather than drafting new wording, to keep the spec and the locked ADR unambiguously aligned.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `<action>` and `<verify>` steps matched the actual file content at the specified line numbers with no adjustment needed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both Phase 4 UI-SPEC/requirement gaps addressed by this plan (COMP-04's untokenized color, DRIFT-04's spec-ADR disagreement) are closed, independent of this phase's other plans (fixture and isolation-checker work).
- No blockers introduced. `npm run lint` (eslint + stylelint) passes clean on the full repo after these changes.
- `git diff docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md` confirmed exactly three changed regions in the design spec — no unintended edits.

---
*Phase: 04-evidence-bearing-compatibility-register*
*Completed: 2026-08-26*

## Self-Check: PASSED

All created/modified files found on disk; both task commit hashes (`c8733d7`, `ec6a044`) verified present in git log.
