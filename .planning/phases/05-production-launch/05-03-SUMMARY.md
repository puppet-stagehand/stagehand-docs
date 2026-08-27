---
phase: 05-production-launch
plan: 03
subsystem: infra
tags: [release-evidence, cloudfront, deployment-verification, beta]

# Dependency graph
requires:
  - phase: 05-production-launch (05-02)
    provides: A concluded, successful Deploy site run (33079159653) delivering testpilots's exact SHA to beta
  - phase: 05-production-launch (05-04)
    provides: docs/operations/RELEASE-EVIDENCE.md append-only log scaffold (Promotions table)
provides:
  - "Empirical, live proof that beta serves testpilots's exact promoted SHA (18967ca1f806cca030173f7d0f7f16d61940b20c) across every documented route, both JSON endpoints, and the branded 404"
  - "The first real, non-fabricated Promotions row in docs/operations/RELEASE-EVIDENCE.md"
affects: [05-06, 05-10, 05-11]

actuals:
  tokens: 150
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Live-deployment verification is read-only against already-deployed infrastructure -- no infra mutation, no gh/tofu commands, no classifier-blocked surface encountered"

key-files:
  created: []
  modified:
    - docs/operations/RELEASE-EVIDENCE.md

key-decisions:
  - "Task 1 required no repository file changes (files_modified: [] for that task per plan) -- only scripts/check-live-deployment.ts was run against beta's real CloudFront default domain, so no commit was made for Task 1 as specified."
  - "Recorded 'n/a' (not blank) in the Apex redirect column for this beta row, matching release.md's statement that the apex redirect check applies to stable only -- the column exists in the table header but isn't applicable here."
  - "Notes cell links the exact Deploy site run ID (33079159653) from 05-02 and the exact verification command run in Task 1, so the row is traceable back to both the dispatch and the live check that confirmed it, per D-07 (05-CONTEXT.md, LOCKED)."

requirements-completed: [LAUN-01, LAUN-03]

coverage:
  - id: D1
    description: "beta's CloudFront default domain (dbcms782zp162.cloudfront.net) serves every documented route, both JSON data endpoints, the branded 404, and exactly testpilots's promoted SHA (18967ca1f806cca030173f7d0f7f16d61940b20c) via /deployed-commit.txt"
    requirement: "LAUN-01"
    verification:
      - kind: other
        ref: "SITE_URL=https://dbcms782zp162.cloudfront.net EXPECTED_SHA=18967ca1f806cca030173f7d0f7f16d61940b20c npx tsx scripts/check-live-deployment.ts -> exits 0, 'Verified 9 routes, the branded 404, and the deployed commit stamp'"
        status: pass
    human_judgment: false
  - id: D2
    description: "docs/operations/RELEASE-EVIDENCE.md gains exactly one new, real Promotions row for the testpilots -> beta promotion, with real date/SHA/per-check results and no edit to any prior row"
    requirement: "LAUN-03"
    verification:
      - kind: other
        ref: "grep -c '| beta |' docs/operations/RELEASE-EVIDENCE.md -> 1; git diff docs/operations/RELEASE-EVIDENCE.md shows only one appended line, no changes to existing lines"
        status: pass
    human_judgment: false

duration: ~8min
completed: 2026-08-27
status: complete
---

# Phase 5 Plan 3: Verify and Record Beta Promotion Summary

**Confirmed beta's CloudFront default domain genuinely serves testpilots's exact promoted SHA across every documented route, JSON endpoint, and the branded 404, then appended the first real, honest Promotions row to `docs/operations/RELEASE-EVIDENCE.md`.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-08-27 (this session)
- **Completed:** 2026-08-27
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Ran `scripts/check-live-deployment.ts` against beta's real CloudFront default domain (`dbcms782zp162.cloudfront.net`) with `EXPECTED_SHA` set to the exact SHA dispatched in 05-02 (`18967ca1f806cca030173f7d0f7f16d61940b20c`) -- exited 0, confirming all 9 required routes (including both JSON data endpoints), the branded 404, and the exact commit stamp
- Appended exactly one new row to `docs/operations/RELEASE-EVIDENCE.md`'s Promotions table for the `beta` environment, recording today's date (UTC), the real SHA, "pass" for every check the script actually ran, "n/a" for the stable-only apex-redirect column, and a Notes cell linking `Deploy site` run `33079159653` (05-02) and the exact verification command run in Task 1
- Confirmed the diff to `RELEASE-EVIDENCE.md` is a pure append -- no prior row edited or removed

## Task Commits

1. **Task 1: Verify beta's live deployment** - no commit (plan scopes this task to `(no repository files)`; verified via `npx tsx scripts/check-live-deployment.ts`, exit 0)
2. **Task 2: Record the real promotion in RELEASE-EVIDENCE.md** - `354300a` (docs)

**Plan metadata:** (this SUMMARY's commit, made immediately after this file)

## Files Created/Modified
- `docs/operations/RELEASE-EVIDENCE.md` - Appended one real Promotions row for the testpilots -> beta promotion (SHA `18967ca1f806cca030173f7d0f7f16d61940b20c`, all 8 checks "pass", apex redirect "n/a", Notes linking Deploy site run 33079159653)

## Decisions Made
- Task 1 performed no repository file changes, matching its `<files>` spec of `(no repository files)` exactly -- the task is pure read-only verification against live, already-deployed infrastructure, so no commit was made for it.
- Recorded "n/a" rather than leaving the Apex redirect (stable only) cell blank -- makes explicit that the column is inapplicable to a `beta` row rather than an omitted check.
- Linked the exact `Deploy site` run ID (`33079159653`, from 05-02) and the exact verification command invocation in the Notes cell, so the evidence row is independently traceable to both the real dispatch and the real live check that confirmed it -- satisfying D-07's (05-CONTEXT.md, LOCKED) prohibition on fabricated or templated rows.

## Deviations from Plan

None - plan executed exactly as written. No classifier blocks were hit (this plan performs only a read-only HTTPS verification script and a markdown append, no `gh`/`tofu` commands), consistent with the plan's stated expectation of no infra mutation.

## Issues Encountered
None. `check-live-deployment.ts` passed on the first run with no retries needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- beta's promotion (testpilots -> beta) is now proven live and honestly recorded -- the first real entry in `RELEASE-EVIDENCE.md`'s Promotions table.
- The established pattern (run `check-live-deployment.ts` against the target environment's real CloudFront default domain and the real dispatched SHA, then append one row per D-05/D-07) is directly reusable for 05-06 (beta -> stable), and for any future re-verification.
- No blockers for subsequent plans in this phase.

---
*Phase: 05-production-launch*
*Completed: 2026-08-27*

## Self-Check: PASSED
- FOUND: `.planning/phases/05-production-launch/05-03-SUMMARY.md`
- FOUND: commit `354300a` (`git log --oneline --all | grep 354300a`)
- FOUND: `docs/operations/RELEASE-EVIDENCE.md` contains exactly one `| beta |` row (`grep -c '| beta |'` -> 1)
