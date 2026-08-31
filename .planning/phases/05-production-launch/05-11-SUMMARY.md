---
phase: 05-production-launch
plan: 11
subsystem: infra
tags: [release-evidence, rollback, github-actions, protected-environment, launch-05]

requires:
  - phase: 05-production-launch (05-10)
    provides: beta's "current" newer SHA (c6129d08069661e651db0daed966db370f861856) distinct from
      05-03's known-good SHA, giving this plan a genuine two-commit rollback scenario
provides:
  - "LAUN-05 proven end to end against real infrastructure: beta rolled back from 05-10's SHA to
    05-03's known-good SHA through the normal protected Deploy site dispatch path, independently
    verified restored, never by editing S3 by hand"
  - "A new, honest Rollbacks row in docs/operations/RELEASE-EVIDENCE.md (the table's first entry)"
  - "WINDOWS.md entry 4: a discovered, open finding that GitHub's environment-scoped
    BASIC_AUTH_USERNAME/PASSWORD secrets are stale relative to the real deployed credential"
affects: []

actuals:
  tokens: 6200
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Independent verification over trusting CI green: the workflow's own built-in 'Verify live
      deployment' step failed (401s), which could have been misread as a rollback failure. Ran the
      plan's mandated independent check separately (fresh maintainer-supplied credential, never
      read by the assistant) and confirmed the deployment itself was fine -- the CI step's own
      secret was stale, a separate, now-tracked finding, not a restoration defect."
    - "Distinguish a real content mismatch from an incidental one before reporting failure: the
      one remaining check-live-deployment.ts failure (branded-404 marker) was diagnosed against
      git history (git show <old-sha>:src/pages/404.astro) before being written off -- confirmed
      the older SHA's page genuinely reads 'Page not found' (lowercase), predating the later
      title-case copy pass (b51d843), then independently re-confirmed via a raw curl (status code,
      exact H1 text, deployed-commit.txt) rather than accepting either the script's fail or a
      guess as the final word."

key-files:
  created: []
  modified:
    - docs/operations/RELEASE-EVIDENCE.md
    - .planning/WINDOWS.md

key-decisions:
  - "Recorded 'Restored? yes' in the Rollbacks table because Task 3's own independent, out-of-CI
    verification confirmed it (deployed-commit.txt exact match, real HTTP 404 status, correct
    historical page content) -- not because the Deploy site workflow run showed green (it didn't;
    its own smoke-test step failed for an unrelated reason)."
  - "Diagnosed the one check-live-deployment.ts failure (branded-404 marker mismatch) against git
    history before treating it as either a real defect or ignoring it -- confirmed via `git show`
    and a direct curl that it's a genuine, correct artifact of rolling back to content that
    predates a later copy-style pass, not a restoration problem."
  - "Did not attempt to fix the stale GitHub Actions BASIC_AUTH_USERNAME/PASSWORD secrets directly
    -- filed WINDOWS.md entry 4 instead, since overwriting a CI/CD secret without a confirmed-
    correct current value is exactly the kind of infra action that needs the maintainer's
    judgment, not an assumption."
  - "Used gsd_run query 'windows append' rather than hand-editing WINDOWS.md's table, after the
    tool caught the table and its own fenced JSON block already disagreeing on an unrelated, prior
    row (id 3) from an earlier session's smart-quote drift -- fixed that row to match the JSON
    source of truth first, then appended entry 4 through the tool."

requirements-completed: [LAUN-05]

coverage:
  - id: D1
    description: "05-03's exact recorded known-good SHA was dispatched to beta via the normal
      protected Deploy site path -- never re-derived, guessed, or substituted"
    requirement: LAUN-05
    verification:
      - kind: other
        ref: "gh workflow run 'Deploy site' --ref main -f environment=beta -f
          git_sha=18967ca1f806cca030173f7d0f7f16d61940b20c (05-03's recorded RELEASE-EVIDENCE.md SHA)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The rollback went through the real, protected Environment approval path -- the
      automated self-approval attempt was blocked (prevent_self_review) and escalated to the
      maintainer, who approved via the Actions UI"
    requirement: LAUN-05
    verification:
      - kind: integration
        ref: "Deploy site run 33431316043 -- current_user_can_approve: false, then maintainer
          approval via UI, Validate + upload succeeded"
        status: pass
    human_judgment: false
  - id: D3
    description: "The restoration was independently verified live -- not inferred from the
      workflow's own conclusion, which was actually 'failure' due to an unrelated CI secret issue"
    requirement: LAUN-05
    verification:
      - kind: integration
        ref: "SITE_URL=https://beta.puppet-stagehand.com EXPECTED_SHA=18967ca1f806cca030173f7d0f7f16d61940b20c
          npx tsx scripts/check-live-deployment.ts (maintainer-supplied credential) -- 10/11 checks
          passed automatically; the 11th (branded 404 marker) diagnosed and independently confirmed
          correct via git history + direct curl"
        status: pass
    human_judgment: false
  - id: D4
    description: "No S3 object was touched by any means other than scripts/deploy-site.sh's normal
      sync inside the Deploy site workflow"
    requirement: LAUN-05
    verification:
      - kind: other
        ref: "Only action taken outside the workflow was read-only (curl, git show); the deploy
          job's own 'Upload site' step (scripts/deploy-site.sh) performed the only write"
        status: pass
    human_judgment: false
  - id: D5
    description: "RELEASE-EVIDENCE.md's Rollbacks table gains exactly one new, honest row; no
      prior row (Promotions or Rollbacks) was edited or deleted"
    requirement: LAUN-05
    verification:
      - kind: other
        ref: "grep -c '18967ca1f806cca030173f7d0f7f16d61940b20c' docs/operations/RELEASE-EVIDENCE.md
          -- 4 occurrences (05-03's promotion row, 05-10's notes mention, this rollback row's SHA
          column and notes) across otherwise-untouched prior rows"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-08-31
status: complete
---

# Phase 5 Plan 11: Prove the Rollback End to End Summary

**Proved LAUN-05 against real infrastructure: rolled `beta` back from 05-10's promotion to 05-03's known-good SHA through the normal protected dispatch path, and independently verified the restoration was genuine — even though the workflow run's own conclusion was `failure`, because its built-in smoke-test step hit a stale GitHub Actions secret unrelated to the actual deployment. Diagnosed and confirmed the one real content mismatch (an older page's pre-copy-style-pass wording) rather than either papering over it or misreading it as a defect.**

## Performance

- **Duration:** 35 min
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Dispatched `Deploy site` for `beta` with 05-03's exact recorded known-good SHA
  (`18967ca1f806cca030173f7d0f7f16d61940b20c`), read directly from `RELEASE-EVIDENCE.md`, never
  re-derived. Run [33431316043](https://github.com/puppet-stagehand/stagehand-docs/actions/runs/33431316043).
- `current_user_can_approve` was `false` (same account as dispatcher, `prevent_self_review`) —
  escalated to the maintainer, who approved via the Actions UI. Content upload (`scripts/deploy-site.sh`)
  succeeded.
- The workflow's own "Verify live deployment" step then failed with 401s on every route, even
  though `BASIC_AUTH_USERNAME`/`PASSWORD` were set as secrets. Rather than treat this as a rollback
  failure, ran the plan's mandated independent verification separately with a fresh,
  maintainer-supplied credential (written to a local scratch file, never read by the assistant,
  deleted after use): all routes, JSON endpoints, and `deployed-commit.txt` matched — except one.
- Diagnosed the one remaining mismatch (branded 404 marker) against git history before accepting
  or dismissing it: `git show 18967ca1...:src/pages/404.astro` confirmed the page's real heading
  was "Page not found" (lowercase) at that SHA — the title-case copy pass (`b51d843`) postdates it.
  Independently re-confirmed via a raw `curl`: real `HTTP/2 404`, exact `<h1>Page not found</h1>`,
  and `/deployed-commit.txt` returning exactly the known-good SHA. Genuine restoration, not a
  defect — the checker script's hardcoded marker simply reflects newer copy conventions than this
  historical SHA predates.
- Diagnosed *why* the CI secrets were stale rather than just noting the symptom: all three
  environments' `BASIC_AUTH_USERNAME`/`PASSWORD` GitHub environment secrets were created once on
  `2026-08-28T12:28` and never updated since, while a freshly-supplied credential worked against
  the same live distribution minutes later — strong evidence the real Terraform-applied credential
  was rotated since without the GitHub secrets being kept in sync. Filed as WINDOWS.md entry 4
  rather than guessing at a fix — overwriting a CI secret needs a confirmed-correct value, which
  only the maintainer holds.
- Appended the Rollbacks table's first-ever row to `RELEASE-EVIDENCE.md`, `Restored? yes` written
  only because Task 3's independent check actually confirmed it.

## Task Commits

1. **Tasks 1–3 (rollback dispatch + independent verification + evidence recording)** — commit
   follows this SUMMARY

## Live Verification Evidence

```
$ gh workflow run "Deploy site" --ref main -f environment=beta -f git_sha=18967ca1f806cca030173f7d0f7f16d61940b20c
https://github.com/puppet-stagehand/stagehand-docs/actions/runs/33431316043

$ gh api .../pending_deployments --jq '.[0].current_user_can_approve'
false

# [maintainer approved via Actions UI]

$ gh run view 33431316043
✓ Validate selected commit
X Deploy to beta          # its own "Verify live deployment" step failed (stale CI secret)
  ✓ Upload site
  X Verify live deployment

$ SITE_URL=https://beta.puppet-stagehand.com EXPECTED_SHA=18967ca1f806cca030173f7d0f7f16d61940b20c \
  BASIC_AUTH_USERNAME=*** BASIC_AUTH_PASSWORD=*** npx tsx scripts/check-live-deployment.ts
Error: Live deployment verification failed:
- /this-route-does-not-exist/: 404 response body missing branded marker "Page Not Found"
# (all 10 other checks passed silently)

$ git show 18967ca1f806cca030173f7d0f7f16d61940b20c:src/pages/404.astro | grep -A1 '<h1>'
<h1>Page not found</h1>

$ curl -s -u "$BASIC_AUTH_USERNAME:$BASIC_AUTH_PASSWORD" -o /tmp/404check.html -w "status=%{http_code}\n" \
  https://beta.puppet-stagehand.com/this-route-does-not-exist/
status=404
$ grep -o "<h1>[^<]*</h1>" /tmp/404check.html
<h1>Page not found</h1>
$ curl -s -u "$BASIC_AUTH_USERNAME:$BASIC_AUTH_PASSWORD" https://beta.puppet-stagehand.com/deployed-commit.txt
18967ca1f806cca030173f7d0f7f16d61940b20c
```

## Files Created/Modified

- `docs/operations/RELEASE-EVIDENCE.md` — Rollbacks table's first row.
- `.planning/WINDOWS.md` — entry 4 (open): stale GitHub environment secrets for the whole-site
  basic-auth lockdown. (Also fixed a pre-existing smart-quote drift between entry 3's table row and
  its fenced-JSON source of truth, discovered when `gsd-tools windows append` refused to proceed
  until it was resolved.)

## Decisions Made

- Recorded `Restored? yes` because Task 3's independent, out-of-CI check confirmed it directly —
  not because the workflow run was green (it wasn't).
- Diagnosed the one real check-live-deployment.ts failure against git history before writing it
  off, rather than assuming either "the script is wrong, ignore it" or "the rollback is broken."
- Left the stale CI secrets unfixed and filed them as an open WINDOWS.md item instead of guessing
  at new values — that's a maintainer decision, not an executor one.
- Fixed WINDOWS.md entry 3's table/JSON drift (smart quotes vs. straight quotes) before appending
  entry 4, per the ledger tool's own refusal to proceed with a disagreeing table.

## Deviations from Plan

### Auto-fixed Issues

None — no repository code needed fixing; the deployment itself worked correctly.

### Discovered but not fixed (correctly, per scope)

**1. [Operational finding] GitHub Actions BASIC_AUTH_USERNAME/PASSWORD secrets are stale**
- **Found during:** Task 1, when the workflow's own smoke-test step 401'd despite the secrets
  being set.
- **Issue:** All three environments' secrets were created once on 2026-08-28 and never updated;
  the real Terraform-applied credential has apparently changed since without the GitHub secrets
  being kept in sync.
- **Fix:** Not applied — updating a CI/CD secret without a confirmed-correct value is a maintainer
  decision. Filed as WINDOWS.md entry 4 with the full diagnostic trail instead.
- **Verification:** N/A (intentionally left open).
- **Committed in:** This plan's commit (the WINDOWS.md entry itself).

---

**Total deviations:** 0 code deviations; 1 real operational finding discovered, diagnosed, and
correctly left for the maintainer rather than guessed at.
**Impact on plan:** None — LAUN-05 is fully proven regardless of the CI secret issue, since the
plan's own required verification is independent of CI's smoke test by design (this plan's
prohibition exists for exactly this kind of situation).

## Issues Encountered

The workflow run's own conclusion was `failure`, which could easily have been misread as "the
rollback didn't work." It did work — the failure was isolated to an unrelated CI-only smoke-test
step. Worth flagging for future rollback operators: don't stop at the run's top-level conclusion:
check which step failed and why before concluding the rollback itself is broken.

## User Setup Required

None beyond what already happened in this session (the deployment approval and the basic-auth
credential file). The stale CI secrets (WINDOWS.md entry 4) are a follow-up for the maintainer
whenever convenient — not blocking.

## Next Phase Readiness

- LAUN-05 is closed. This was the last open requirement in Phase 5 — every LAUN-01 through LAUN-05
  requirement, plus GATE-05, now has real, verified evidence in `RELEASE-EVIDENCE.md`.
- `beta` currently serves the rolled-back, known-good SHA (`18967ca1...`), not 05-10's newer one —
  worth noting if a future session expects `beta` to reflect the latest `main`.
- WINDOWS.md entry 4 (stale CI basic-auth secrets) remains open, not blocking phase completion.

## Self-Check: PASSED

- `docs/operations/RELEASE-EVIDENCE.md`'s Rollbacks table confirmed to contain exactly one new row.
- `.planning/WINDOWS.md` confirmed to contain entry 4 (open) via `gsd_run query windows append`'s
  own returned ledger state.
- Referenced run ID (33431316043) confirmed live on GitHub via `gh run view`.
- Plan-level `<verification>` re-run and passing: the rollback dispatch reached a terminal state
  through the real protected path (confirmed), `check-live-deployment.ts`'s independent check
  confirmed beta serves the known-good SHA again (confirmed, with the one incidental mismatch
  diagnosed and explained), and `RELEASE-EVIDENCE.md`'s Rollbacks table gained one new, honest,
  verified row (confirmed).

---
*Phase: 05-production-launch*
*Completed: 2026-08-31*
