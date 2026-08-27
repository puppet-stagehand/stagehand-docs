---
phase: 05-production-launch
plan: 07
subsystem: infra
tags: [release-evidence, cloudfront, deployment-verification, stable]

# Dependency graph
requires:
  - phase: 05-production-launch (05-06)
    provides: A concluded, successful Deploy site run (33097584579) delivering beta's exact SHA (18967ca1f806cca030173f7d0f7f16d61940b20c) to stable
  - phase: 05-production-launch (05-03)
    provides: The verify-then-record pattern (check-live-deployment.ts against the CloudFront default domain, then append a Promotions row) already proven for beta
provides:
  - "Empirical, live proof that stable serves beta's exact promoted SHA (18967ca1f806cca030173f7d0f7f16d61940b20c) across every documented route, both JSON endpoints, and the branded 404, via stable's CloudFront default domain (pre-cutover)"
  - "The second real Promotions row in docs/operations/RELEASE-EVIDENCE.md, with the apex-redirect check honestly marked pending rather than fabricated as passing"
  - "Confirmed pre-cutover DNS state: apex/www.puppetstagehand.com still resolve to the unrelated Cloudflare-routed GitHub Pages site, not to stable"
affects: [05-08, 05-10, 05-11]

actuals:
  tokens: 300
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Live-deployment verification is read-only against already-deployed infrastructure -- no infra mutation, no gh/tofu commands, no classifier-blocked surface encountered, matching 05-03's pattern exactly for the beta->stable leg."
    - "The plan's literal 'dig +short www.puppetstagehand.com returning empty' acceptance wording did not match reality: the query returns a non-empty CNAME/IP set (puppetlabs-seteam.github.io + 185.199.x.x). The substance the check exists to confirm -- that DNS has not yet cut over to stable -- still holds; the record captures the actual dig output rather than forcing it into the plan's literal 'empty' framing."

key-files:
  created: []
  modified:
    - docs/operations/RELEASE-EVIDENCE.md

key-decisions:
  - "Task 1 required no repository file changes (files_modified: [] for that task per plan) -- only scripts/check-live-deployment.ts was run against stable's real CloudFront default domain, so no commit was made for Task 1, matching 05-03's precedent."
  - "Recorded the apex-redirect column as 'pending — awaiting DNS cutover (see Plan 05-08)', never 'pass', per D-05/D-07 (05-CONTEXT.md, LOCKED) and this plan's explicit Task 2 instruction and threat mitigation (T-05-17)."
  - "Recorded the literal dig output (CNAME to puppetlabs-seteam.github.io, GitHub Pages IPs) in the Notes cell rather than a bare 'empty' claim, since the actual query result differs from the plan's shorthand wording but confirms the same fact: DNS has not cut over to stable yet."
  - "Notes cell links the exact Deploy site run ID (33097584579) from 05-06 and the exact verification command run in Task 1, matching 05-03's traceability pattern for D-07 (05-CONTEXT.md, LOCKED)."

requirements-completed: [LAUN-02, LAUN-03]

coverage:
  - id: D1
    description: "stable's CloudFront default domain (d1g7y94y3acn2m.cloudfront.net) serves every documented route, both JSON data endpoints, the branded 404, and exactly beta's promoted SHA (18967ca1f806cca030173f7d0f7f16d61940b20c) via /deployed-commit.txt"
    requirement: "LAUN-02"
    verification:
      - kind: other
        ref: "SITE_URL=https://d1g7y94y3acn2m.cloudfront.net EXPECTED_SHA=18967ca1f806cca030173f7d0f7f16d61940b20c npx tsx scripts/check-live-deployment.ts -> exits 0, 'Verified 9 routes, the branded 404, and the deployed commit stamp'"
        status: pass
    human_judgment: false
  - id: D2
    description: "docs/operations/RELEASE-EVIDENCE.md gains exactly one new, real Promotions row for the beta -> stable promotion, with real date/SHA/per-check results, the apex-redirect check honestly marked pending (not fabricated as pass), and no edit to beta's prior row"
    requirement: "LAUN-03"
    verification:
      - kind: other
        ref: "grep -c '| stable |' docs/operations/RELEASE-EVIDENCE.md -> 1; git diff docs/operations/RELEASE-EVIDENCE.md shows only one appended line, no changes to existing lines; apex-redirect cell reads 'pending — awaiting DNS cutover (see Plan 05-08)'"
        status: pass
    human_judgment: false

duration: ~7min
completed: 2026-08-27
status: complete
---

# Phase 5 Plan 7: Verify and Record Stable Promotion (Pre-Cutover) Summary

**Confirmed stable's CloudFront default domain genuinely serves beta's exact promoted SHA across every documented route, JSON endpoint, and the branded 404, then appended the second real Promotions row to `docs/operations/RELEASE-EVIDENCE.md` with the apex-redirect check honestly marked pending because the public DNS chain does not reach stable yet.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-08-27 (this session)
- **Completed:** 2026-08-27
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Ran `scripts/check-live-deployment.ts` against stable's real CloudFront default domain (`d1g7y94y3acn2m.cloudfront.net`) with `EXPECTED_SHA` set to the exact SHA dispatched in 05-06 (`18967ca1f806cca030173f7d0f7f16d61940b20c`) — exited 0, confirming all 9 required routes (including both JSON data endpoints), the branded 404, and the exact commit stamp
- Ran `dig +short www.puppetstagehand.com` and `dig +short puppetstagehand.com`: both resolve to the unrelated, currently-live Cloudflare-routed GitHub Pages site (`puppetlabs-seteam.github.io`, IPs `185.199.108-111.153`), confirming the public DNS chain has not yet cut over to stable — the exact pre-cutover state this task needed to confirm before treating apex-redirect testing as out of scope
- Appended exactly one new row to `docs/operations/RELEASE-EVIDENCE.md`'s Promotions table for the `stable` environment, recording today's date (UTC), the real SHA, "pass" for every check the script actually ran, and `pending — awaiting DNS cutover (see Plan 05-08)` (never "pass") for the apex-redirect column, with a Notes cell linking `Deploy site` run `33097584579` (05-06), the exact verification command, and the literal dig-output evidence for the pending DNS state
- Confirmed the diff to `RELEASE-EVIDENCE.md` is a pure append — beta's prior row from 05-03 was not edited or removed

## Task Commits

1. **Task 1: Verify stable's live deployment (pre-cutover)** - no commit (plan scopes this task to `(no repository files)`; verified via `npx tsx scripts/check-live-deployment.ts`, exit 0, plus two `dig` reads)
2. **Task 2: Record the real (partial) promotion in RELEASE-EVIDENCE.md** - `731c798` (docs)

**Plan metadata:** (this SUMMARY's commit, made immediately after this file)

## Files Created/Modified
- `docs/operations/RELEASE-EVIDENCE.md` - Appended one real Promotions row for the beta -> stable promotion (SHA `18967ca1f806cca030173f7d0f7f16d61940b20c`, all 8 route/content checks "pass", apex redirect explicitly `pending — awaiting DNS cutover (see Plan 05-08)`, Notes linking Deploy site run 33097584579 and the dig evidence)

## Decisions Made
- Task 1 performed no repository file changes, matching its `<files>` spec of `(no repository files)` exactly — pure read-only verification against live, already-deployed infrastructure, so no commit was made for it, exactly as 05-03 established for the beta leg.
- The plan's acceptance criteria phrased the DNS check as "`dig +short www.puppetstagehand.com` returning empty (still Cloudflare)". The actual query is not empty — it returns a CNAME to `puppetlabs-seteam.github.io` plus GitHub Pages IPs, matching D-01's (05-CONTEXT.md) description of the currently-live unrelated site Cloudflare serves at that hostname. Recorded the literal dig output rather than forcing a false "empty" claim into the evidence trail: the substance the check exists to confirm (DNS has not cut over to stable) is fully confirmed either way, and honesty about the literal result matters more here than matching the plan's shorthand wording, per this phase's own D-05/D-07 honesty invariant.
- Recorded the apex-redirect column as `pending — awaiting DNS cutover (see Plan 05-08)` rather than "pass" or a blank cell — makes explicit both that the column applies to `stable` (unlike beta's "n/a") and that the check genuinely has not been performed yet, per T-05-17's mitigation requirement in this plan's threat model.
- Linked the exact `Deploy site` run ID (`33097584579`, from 05-06) and the exact verification command invocation in the Notes cell, so the evidence row is independently traceable to both the real dispatch and the real live check that confirmed it, satisfying D-07's (05-CONTEXT.md, LOCKED) prohibition on fabricated or templated rows.

## Deviations from Plan

None — plan executed exactly as written. The only notable observation (documented above under Decisions Made and `tech-stack.patterns`) is that the plan's literal "`dig` returns empty" wording didn't match the actual (non-empty, Cloudflare-routed) query result; this is a wording precision gap in the plan, not a deviation in execution — the underlying fact the check was designed to confirm (pre-cutover DNS state) was confirmed exactly as intended, and no task, file, or scope change was needed to handle it.

## Issues Encountered
None. `check-live-deployment.ts` passed on the first run with no retries needed. Both `dig` queries returned immediately.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Stable's promotion (beta -> stable) is now proven live and honestly recorded — the second real entry in `RELEASE-EVIDENCE.md`'s Promotions table, with the one check that genuinely cannot be performed yet (apex redirect) marked pending rather than fabricated.
- 05-08 (registrar cutover) can now proceed: this plan independently reconfirmed that `puppetstagehand.com`/`www.puppetstagehand.com` still resolve to the unrelated Cloudflare-routed GitHub Pages site, so the NS flip in 05-08 is the first action that will make stable customer-facing.
- Once 05-08's cutover completes and DNS propagates, a follow-up check should re-run `check-live-deployment.ts` against `https://www.puppetstagehand.com` and separately verify the apex redirect, then append a superseding row to `RELEASE-EVIDENCE.md` (never editing this plan's row) marking the apex-redirect column "pass" for the first time — 05-10/05-11 own that per the phase's plan sequence.
- No blockers for subsequent plans in this phase.

---
*Phase: 05-production-launch*
*Completed: 2026-08-27*

## Self-Check: PASSED
- FOUND: `.planning/phases/05-production-launch/05-07-SUMMARY.md`
- FOUND: commit `731c798` (`git log --oneline --all | grep 731c798`)
- FOUND: `docs/operations/RELEASE-EVIDENCE.md` contains exactly one `| stable |` row (`grep -c '| stable |'` -> 1)
