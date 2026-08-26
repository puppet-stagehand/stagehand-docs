---
phase: 03-real-documentation-content
plan: 03
subsystem: content
tags: [astro, copywriting, tiers, marketing]

# Dependency graph
requires:
  - phase: 03-real-documentation-content
    provides: UI-SPEC.md design contract naming the exact hero CTA insertion point and support lifecycle section pattern
provides:
  - "View tiers" CTA on the home hero, linking directly to /tiers/
  - Real, grounded product positioning copy for the 3 home capability cards
  - Real, comparative per-tier summary/audience/features copy for all 4 Puppet product tiers in tiers.yaml
  - A Product lifecycle section on /support/ stating pre-1.0 status and current release v0.2.3
  - json-endpoints.test.ts's expectedTiers literal kept byte-exact with the new tiers.yaml content
affects: [phase-04.1-gated-tester-access, phase-04.2-tester-downloads]

# Actuals (#2632)
actuals:
  tokens: 2286
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content-only Astro page edits verified via astro check + npm run build + rendered dist/ HTML inspection, no new components"
    - "tier-intro section class reused as-is for a second page (support) beyond its original tiers page use, per UI-SPEC direction"

key-files:
  created: []
  modified:
    - src/pages/index.astro
    - src/data/tiers.yaml
    - tests/unit/json-endpoints.test.ts
    - src/pages/support/index.astro

key-decisions:
  - "Kept both tiers.yaml features bullets identical in structure across all 4 tiers (environment-visibility/Bolt guidance bullet + support-channel bullet) per the plan's explicit instruction that documentation guidance does not differ by tier — only the support-channel bullet's destination (public tracker vs. commercial channel) varies by entitlement."
  - "Did not touch tiers.schema.json's missing minItems on features — treated as a content-authoring discipline per the plan's explicit reversibility note, not a schema change."

patterns-established:
  - "Product-tier copy grounds every claim in PROJECT.md's tier definitions and the existing enforcement-boundary disclaimer on /tiers/; no invented SLA, dashboard, or premium claim per tier."

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-06]

coverage:
  - id: D1
    description: "Home hero has a working 'View tiers' CTA between 'Get started' and 'Check compatibility', linking to /tiers/"
    requirement: CONT-01
    verification:
      - kind: automated_ui
        ref: "npx astro check (0 errors) + grep of dist/index.html confirming 3 ordered <a class=\"btn...\"> elements"
        status: pass
    human_judgment: false
  - id: D2
    description: "3 home capability descriptions rewritten to grounded, non-placeholder product positioning (environment visibility, Bolt-native execution over SSH, explicit support boundaries)"
    requirement: CONT-01
    verification:
      - kind: unit
        ref: "manual acceptance-criteria review — no invented CLI/dashboard/report claims, no PCP/orchestrator behavior implied as shipped"
        status: pass
    human_judgment: false
  - id: D3
    description: "All 4 tiers (openvox, puppet-core, puppet-enterprise, pe-advanced) have real, grounded, comparative summary/audience/features copy with >=1 feature each"
    requirement: CONT-02
    verification:
      - kind: unit
        ref: "tests/unit/json-endpoints.test.ts#GET /data/tiers.json > returns the real tier registry in the deterministic download contract"
        status: pass
      - kind: unit
        ref: "tests/unit/data-validation.test.ts"
        status: pass
      - kind: other
        ref: "npm run validate:data (Validated 4 tiers and 0 compatibility records)"
        status: pass
    human_judgment: false
  - id: D4
    description: "/support/ states the product's pre-1.0/active-development lifecycle stage and current release v0.2.3, reusing the tier-intro section pattern and support-page__warning callout"
    requirement: CONT-03
    verification:
      - kind: automated_ui
        ref: "npx astro check (0 errors) + grep of dist/support/index.html confirming exactly one <h1> and one new <h2 id=\"product-lifecycle-title\"> with v0.2.3 text"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-08-26
status: complete
---

# Phase 3 Plan 3: Real Documentation Content — Home, Tiers, Support Summary

**Real product positioning copy on `/`, comparative per-tier entitlement copy for all four Puppet product tiers on `/tiers/`, and a new pre-1.0 lifecycle section on `/support/`, with the `/data/tiers.json` test contract kept byte-exact.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-08-26T22:26:00Z
- **Completed:** 2026-08-26T22:46:04Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Home hero now has a direct path to `/tiers/` via a "View tiers" secondary CTA between "Get started" and "Check compatibility", and all 3 capability cards read as real, grounded positioning instead of placeholder filler
- `/tiers/` now carries real, comparative entitlement language for all four Puppet product tiers (OpenVox, Puppet Core, Puppet Enterprise, PE Advanced), each with a grounded summary of what that product tier is for the customer and at least 2 real feature bullets
- `/support/` states the product's current pre-1.0 lifecycle stage and cites `v0.2.3` as the current release, reusing the existing `tier-intro` section pattern and `support-page__warning` callout with no new CSS
- `/data/tiers.json`'s exact serialized output and `tests/unit/json-endpoints.test.ts`'s `expectedTiers` literal stay in sync

## Task Commits

Each task was committed atomically:

1. **Task 1: Home page — real capability copy and the "View tiers" CTA** - `38a4362` (feat)
2. **Task 2: Tiers data — real comparative entitlement copy for all four tiers** - `2a29fff` (feat)
3. **Task 3: Support page — add the Product lifecycle section** - `7efbc9a` (feat)

**Plan metadata:** (final metadata commit made by orchestrator per worktree convention — this executor does not update STATE.md/ROADMAP.md)

## Files Created/Modified
- `src/pages/index.astro` - Added "View tiers" CTA between existing hero buttons; rewrote all 3 capability card descriptions to grounded product positioning
- `src/data/tiers.yaml` - Rewrote `audience`/`summary`/`features` for all 4 tiers with real, comparative, evidence-grounded copy; kept `id`/`entitlement`/`name` unchanged
- `tests/unit/json-endpoints.test.ts` - Synced `expectedTiers` exact-string literal to the new `tiers.yaml` content, field for field
- `src/pages/support/index.astro` - Added a new `tier-intro`-styled "Product lifecycle" section between the hero and the existing "Choose a channel" section, stating pre-1.0 status, `v0.2.3`, and reusing the `support-page__warning` callout for the PCP/orchestrator caution

## Decisions Made
- Kept the "environment visibility and Bolt-native execution guidance" feature bullet identical in wording across all 4 tiers (per the plan's explicit instruction that this documentation guidance is true for every tier equally); only the support-channel bullet's destination varies by entitlement (public issue tracker for `community`, the reader's own commercial channel for `commercial`/`advanced`)
- Left `tiers.schema.json`'s missing `minItems` constraint on `features` untouched — the plan's reversibility note treats populating >=1 real feature per tier as a content-review discipline, not a schema change, so schema tightening remains available to a later phase without touching this content

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 3 target routes (`/`, `/tiers/`, `/support/`) now carry real, CONT-06-compliant content with no credential fields, entitlement assertions, third-party scripts, analytics, or premium behavior presented as shipped
- `npm run build` succeeds and produces `dist/index.html`, `dist/tiers/index.html`, `dist/support/index.html` reflecting the new copy; `npx astro check` reports 0 errors; `npx vitest run tests/unit/json-endpoints.test.ts tests/unit/data-validation.test.ts` passes (20/20); `npm run validate:data` passes against the unchanged schema
- No blockers for downstream phases; this plan shares no files with 03-01 or 03-02 and ran as independent expansion work

---
*Phase: 03-real-documentation-content*
*Completed: 2026-08-26*

## Self-Check: PASSED

All 4 modified/created files confirmed present on disk (src/pages/index.astro,
src/data/tiers.yaml, tests/unit/json-endpoints.test.ts, src/pages/support/index.astro), and all 3
task commits (38a4362, 2a29fff, 7efbc9a) confirmed present in `git log`.
