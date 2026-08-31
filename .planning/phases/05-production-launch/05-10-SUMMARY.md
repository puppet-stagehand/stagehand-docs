---
phase: 05-production-launch
plan: 10
subsystem: infra
tags: [release-evidence, github-actions, protected-environment, beta, rollback-setup]

requires:
  - phase: 05-production-launch (05-03)
    provides: beta's known-good Promotions row (18967ca1f806cca030173f7d0f7f16d61940b20c) that this plan's promotion must genuinely differ from
  - phase: 05-production-launch (05-09)
    provides: security advisory reporting live, unblocking this wave
provides:
  - "beta now serves a real, distinct 'current' release (c6129d08069661e651db0daed966db370f861856), separate from 05-03's known-good SHA -- the two-commit scenario Plan 05-11's rollback proof needs"
  - "A second, honest Promotions row for beta in docs/operations/RELEASE-EVIDENCE.md"
affects: [05-11]

actuals:
  tokens: 4500
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Verify-before-mutate against a local/remote divergence: before any live-infra action, checked
      git rev-list --count origin/main..main and found local main 54 commits ahead of origin/main
      -- the Deploy site workflow only accepts SHAs reachable from origin/main, so nothing in this
      plan was possible without pushing first. Confirmed a clean fast-forward (0 commits behind)
      before pushing, and got explicit user confirmation before doing so, since pushing triggers a
      real production deploy pipeline."
    - "Credential handoff without exposure: the whole-site pre-launch enable_basic_auth lockdown
      blocked scripts/check-live-deployment.ts's live check with 401s. The maintainer wrote
      BASIC_AUTH_USERNAME/BASIC_AUTH_PASSWORD into a local, gitignored scratch env file the
      assistant never read, referenced only via `source <file> && ...` in the verification command
      -- the credential value never appeared in any tool call, transcript, or committed content."

key-files:
  created: []
  modified:
    - docs/operations/RELEASE-EVIDENCE.md

key-decisions:
  - "Stopped before any live-infra action to confirm with the user that local main was 54 commits
    ahead of origin/main and get explicit go-ahead before pushing -- pushing to origin/main is a
    real, visible action that triggers testpilots's automatic deploy, not something to do
    unilaterally mid-plan even though the plan itself doesn't call it out as a checkpoint."
  - "Task 1's automated self-approval attempt (gh api .../pending_deployments -X POST state=approved)
    was blocked by the harness's own permission classifier before it reached GitHub's API --
    functionally the same outcome the plan expected from prevent_self_review
    (current_user_can_approve was already false for the same account that dispatched the run), so
    treated as the expected 'blocked' outcome and escalated straight to Task 2's human checkpoint
    rather than attempting to route around the classifier."
  - "Recorded 'n/a' in the Apex redirect column for this beta row, matching 05-03's precedent --
    the apex redirect check applies to stable only."
  - "Notes cell documents the credential-handoff mechanism (local env file, never read by the
    assistant) rather than omitting how the whole-site basic-auth check was satisfied, so the row
    stays honest about what was actually verified and how, per D-07's no-fabricated-evidence rule."

requirements-completed: []

coverage:
  - id: D1
    description: "testpilots's current SHA (post-push) confirmed genuinely different from 05-03's
      recorded beta SHA before dispatching -- not a same-SHA no-op"
    requirement: LAUN-05
    verification:
      - kind: other
        ref: "gh run list --workflow='Deploy site' -- c6129d08069661e651db0daed966db370f861856 vs
          18967ca1f806cca030173f7d0f7f16d61940b20c (05-03's row)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The new SHA was dispatched to beta through the real protected-Environment
      approval path; the automated approval attempt was blocked and escalated to the maintainer,
      who approved via the Actions UI -- not bypassed or simulated"
    requirement: LAUN-05
    verification:
      - kind: integration
        ref: "Deploy site run 33426085793 -- Validate + Deploy to beta jobs both succeeded after
          maintainer approval"
        status: pass
    human_judgment: false
  - id: D3
    description: "beta's live deployment verified against the real domain with the real, still-on
      whole-site basic-auth lockdown in place -- not skipped or worked around"
    requirement: LAUN-05
    verification:
      - kind: integration
        ref: "SITE_URL=https://beta.puppet-stagehand.com EXPECTED_SHA=c6129d08069661e651db0daed966db370f861856
          npx tsx scripts/check-live-deployment.ts -- 'Verified 9 routes, the branded 404, and the
          deployed commit stamp'"
        status: pass
    human_judgment: false
  - id: D4
    description: "RELEASE-EVIDENCE.md records this promotion as a new, distinct row -- 05-03's
      earlier beta row is untouched"
    requirement: LAUN-05
    verification:
      - kind: other
        ref: "grep -n c6129d08069661e651db0daed966db370f861856 docs/operations/RELEASE-EVIDENCE.md
          -- new row at line 27, 05-03's row at line 24 unchanged"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-08-31
status: complete
---

# Phase 5 Plan 10: Promote a Newer SHA to Beta (Rollback Setup) Summary

**Set up Plan 05-11's rollback proof by promoting a genuinely newer, real SHA to beta through the actual protected-Environment approval path — but only after discovering and resolving a real blocker first: local `main` was 54 commits ahead of `origin/main`, meaning nothing in this phase's remaining plans was reachable until that was pushed, with explicit user confirmation, since pushing triggers a live production deploy.**

## Performance

- **Duration:** 45 min
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Before touching any live infrastructure, ran `git rev-list --count origin/main..main` and found
  local `main` 54 commits ahead of `origin/main` — everything from this session (Phase 04.2's gap
  closures, the mission page, the homepage/Features work) and a chunk of earlier work had never
  been pushed. The `Deploy site` workflow only accepts SHAs reachable from `origin/main`, so this
  plan was not executable as-is. Confirmed a clean fast-forward (`git rev-list --count
  main..origin/main` → 0) and got explicit user confirmation before pushing, since a push here
  triggers testpilots's automatic redeploy of a real production environment.
- Pushed (`cd0e397..c6129d0`); testpilots's automatic `Deploy site` run
  ([33425779732](https://github.com/puppet-stagehand/stagehand-docs/actions/runs/33425779732))
  succeeded for `c6129d08069661e651db0daed966db370f861856`.
- Compared that SHA against 05-03's recorded beta SHA (`18967ca1f806cca030173f7d0f7f16d61940b20c`)
  — genuinely different, satisfying the plan's fail-loud same-SHA check honestly rather than by
  assumption.
- Dispatched `Deploy site` for `beta` with the new SHA
  ([33426085793](https://github.com/puppet-stagehand/stagehand-docs/actions/runs/33426085793)).
  The automated self-approval attempt was blocked by the harness's own permission classifier before
  it reached GitHub's API; `gh api .../pending_deployments` had already reported
  `current_user_can_approve: false` for the same account that dispatched the run (the expected
  `prevent_self_review` outcome), so this was treated as the plan's anticipated "blocked" case and
  escalated straight to the human checkpoint rather than working around the classifier.
- Maintainer approved via the Actions UI; both jobs (Validate, Deploy to beta) succeeded.
- Verified the live deployment against the real `beta.puppet-stagehand.com` domain. This hit the
  whole-site pre-launch `enable_basic_auth` lockdown (still on for all three environments —
  WINDOWS.md entry 2) with 401s on every route. The maintainer supplied
  `BASIC_AUTH_USERNAME`/`BASIC_AUTH_PASSWORD` via a local, gitignored scratch env file the assistant
  never read, sourced only inside the verification command — the credential value never appeared in
  any tool call or transcript. `check-live-deployment.ts` then passed: "Verified 9 routes, the
  branded 404, and the deployed commit stamp at https://beta.puppet-stagehand.com".
- Appended a new, honest Promotions row to `docs/operations/RELEASE-EVIDENCE.md` (line 27) —
  05-03's earlier beta row (line 24) is untouched.

## Task Commits

1. **Tasks 1–3 (promotion + verification + evidence recording)** — commit follows this SUMMARY

## Live Verification Evidence

```
$ git rev-list --count origin/main..main
54
$ git rev-list --count main..origin/main
0
$ git push origin main
   cd0e397..c6129d0  main -> main

$ gh run list --workflow="Deploy site" --limit 1
c6129d08069661e651db0daed966db370f861856  success  (push, testpilots)

$ gh workflow run "Deploy site" --ref main -f environment=beta -f git_sha=c6129d08069661e651db0daed966db370f861856
https://github.com/puppet-stagehand/stagehand-docs/actions/runs/33426085793

$ gh api repos/puppet-stagehand/stagehand-docs/actions/runs/33426085793/pending_deployments
"current_user_can_approve": false   # prevent_self_review, as expected

# [maintainer approved via Actions UI]

$ gh run view 33426085793
✓ Validate selected commit
✓ Deploy to beta

$ SITE_URL=https://beta.puppet-stagehand.com EXPECTED_SHA=c6129d08069661e651db0daed966db370f861856 \
  BASIC_AUTH_USERNAME=*** BASIC_AUTH_PASSWORD=*** npx tsx scripts/check-live-deployment.ts
Verified 9 routes, the branded 404, and the deployed commit stamp at https://beta.puppet-stagehand.com
```

## Files Created/Modified

- `docs/operations/RELEASE-EVIDENCE.md` — new Promotions row for beta
  (`c6129d08069661e651db0daed966db370f861856`, 2026-08-31), distinct from 05-03's row.

## Decisions Made

- Stopped and asked before pushing 54 unpushed commits, even though the plan itself doesn't call
  out a push step as a checkpoint — pushing to `origin/main` is a real, visible action with a real
  production side effect (testpilots's auto-deploy), which the general safety guidance around
  "pushing code" and "actions visible to others" covers regardless of what the plan's own task
  boundaries say.
- Treated the classifier-blocked self-approval attempt as equivalent to the plan's expected
  `prevent_self_review` rejection rather than trying another mechanism to force it through — the
  API had already independently confirmed `current_user_can_approve: false` for the same reason.
- Chose the "maintainer writes credentials to a local file, assistant sources it without reading
  it" pattern for the basic-auth check, over asking the maintainer to run the whole verification
  command themselves — this kept the verification step itself automated and auditable while still
  never exposing the credential to the assistant.

## Deviations from Plan

### Auto-fixed Issues

None — no repository code needed fixing.

### Necessary but unplanned step

**1. [Blocking discovery] Pushed 54 unpushed commits before Task 1 could run**
- **Found during:** Task 1, reading testpilots's current SHA to compare against 05-03's beta row
- **Issue:** The plan's Task 1 assumes testpilots already reflects recent work. `git rev-list
  --count origin/main..main` showed local `main` 54 commits ahead of `origin/main` — the `Deploy
  site` workflow's own validation rejects any SHA not reachable from `origin/main`, so no dispatch
  in this plan was possible until that gap closed.
- **Fix:** Confirmed the push would be a clean fast-forward, got explicit user confirmation, then
  pushed. This was necessary to make the plan executable at all, not optional scope creep — it
  isn't a deviation from the plan's intent, just a prerequisite the plan didn't anticipate.
- **Verification:** `gh run list --workflow="Deploy site"` showed the automatic testpilots deploy
  succeed for the pushed SHA.
- **Committed in:** N/A — the push itself is not a commit; the 54 commits it carried were already
  committed locally across this and prior sessions.

---

**Total deviations:** 0 code deviations; 1 necessary unplanned prerequisite step (pushing the
54-commit gap), handled with explicit user confirmation before any live-infra action.
**Impact on plan:** None to the plan's intent — LAUN-05's setup scenario is exactly what was
produced (two real, distinct beta SHAs). The push was a precondition the plan's authoring context
didn't foresee, not a change to what the plan asked for.

## Issues Encountered

The whole-site pre-launch `enable_basic_auth` lockdown (WINDOWS.md entry 2, tracked as open since
04.1) is still in effect on all three environments, including beta — confirmed directly by this
plan's live-verification 401s before the maintainer's credential unblocked it. This is expected,
tracked, pre-launch behavior, not a new finding.

## User Setup Required

None beyond what already happened in this session (the push confirmation, the deployment approval,
and the basic-auth credential file) — no further external service configuration required.

## Next Phase Readiness

- beta now carries two real, distinct Promotions rows: 05-03's known-good SHA
  (`18967ca1f806cca030173f7d0f7f16d61940b20c`) and this plan's newer, current SHA
  (`c6129d08069661e651db0daed966db370f861856`). Plan 05-11 can now roll back from the latter to the
  former and prove LAUN-05 against a genuine scenario, not a same-SHA no-op.
- The whole-site `enable_basic_auth` lockdown remains open (WINDOWS.md entry 2) and is not this
  plan's or 05-11's scope to close — it's tracked as a separate pre-launch item.

## Self-Check: PASSED

- `docs/operations/RELEASE-EVIDENCE.md` confirmed to contain both beta rows, at different line
  numbers, neither edited.
- Referenced run IDs (33425779732, 33426085793) confirmed live on GitHub via `gh run view`.
- Plan-level `<verification>` re-run and passing: the two beta SHAs are genuinely different
  (confirmed), the new SHA is verified live via `check-live-deployment.ts` (passed), and
  `RELEASE-EVIDENCE.md` records both promotions honestly as separate rows (confirmed).

---
*Phase: 05-production-launch*
*Completed: 2026-08-31*
