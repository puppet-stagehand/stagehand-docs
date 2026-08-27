---
phase: 05-production-launch
plan: 02
subsystem: infra
tags: [github-actions, github-environments, deploy, oidc, cloudfront, s3, gh-cli]

requires:
  - phase: 05-production-launch (05-01)
    provides: content_bucket_name, distribution_id, deployment_role_arn, distribution_domain_name real outputs for beta
provides:
  - Beta's GitHub Environment fully configured with real, non-copied deploy variables (CONTENT_BUCKET, CLOUDFRONT_DISTRIBUTION_ID, AWS_DEPLOY_ROLE_ARN, SITE_CHECK_URL)
  - A concluded, successful Deploy site run (33079159653) delivering testpilots's exact SHA to beta through the protected approval path
  - Empirically resolved answer to RESEARCH.md Open Question 1 (self-review vs. manual UI approval), reusable by 05-06/05-10/05-11
affects: [05-06-promote-beta-to-stable, 05-10, 05-11]

actuals:
  tokens: 200
  tasks: 3
  commits: 0

tech-stack:
  added: []
  patterns:
    - "gh workflow run and gh api --method POST .../pending_deployments are both blocked by the Claude Code Bash tool's auto-mode classifier for this executor, distinct from (and in addition to) the tofu apply block already documented in 05-01. Both were handed to the orchestrator as an exact command plus full context; the orchestrator ran each one directly under one-off explicit approval — no standing bypass permission requested or granted."
    - "Resolved RESEARCH.md Open Question 1 empirically: a manual GitHub UI 'Approve and deploy' click from the same account that dispatched the run DOES pass the self-review check, even though the equivalent gh api POST approval from the same identity is rejected with HTTP 422 ('No pending deployment requests to approve or reject'). This is the reusable precedent for every remaining protected-Environment dispatch in this phase (05-06, 05-10, 05-11): expect the API approval attempt to fail, then have the maintainer approve via the UI — no second reviewer is required."

key-files:
  created: []
  modified: []

key-decisions:
  - "gh workflow run (Task 2's dispatch) and gh api --method POST .../pending_deployments (Task 2's approval attempt) were both blocked by the Bash tool's auto-mode classifier. Per the orchestrator's standing instruction from 05-01, neither was retried nor routed around (e.g. via the alternate actions/workflows/{id}/dispatches endpoint, which would have been the same action under a different surface); both were handed back with the exact command and context, and the orchestrator ran each directly under one-off explicit approval."
  - "The self-review rejection was recorded as a genuine, real outcome, not inferred: gh api GET .../pending_deployments already reported current_user_can_approve: false before any write attempt, and the subsequent real gh api POST attempt (run by the orchestrator) returned HTTP 422 with 'No pending deployment requests to approve or reject' -- both pieces of evidence agree and are recorded verbatim per Task 2's acceptance criteria."
  - "The maintainer's manual UI approval ('Review deployments -> Approve and deploy') succeeded despite the API rejection, resolving Open Question 1 for the rest of this phase: no second GitHub collaborator/reviewer needs to be added to unblock beta/stable dispatches -- the existing solo-maintainer setup works via UI click, just not via API call from the same identity."

requirements-completed: [LAUN-01]

coverage:
  - id: D1
    description: "Beta's GitHub Environment carries its own real, non-copied CONTENT_BUCKET, CLOUDFRONT_DISTRIBUTION_ID, AWS_DEPLOY_ROLE_ARN, and SITE_CHECK_URL variables, matching 05-01's captured outputs exactly, with testpilots/stable's own variables verified unchanged"
    requirement: "LAUN-01"
    verification:
      - kind: other
        ref: "gh api repos/puppet-stagehand/stagehand-docs/environments/beta/variables --jq '.variables[].name' | sort | grep -c ... -> 4; values spot-checked against infra/environments/beta/.captured-outputs.json"
        status: pass
    human_judgment: false
  - id: D2
    description: "A real Deploy site run dispatched testpilots's exact live SHA (18967ca1f806cca030173f7d0f7f16d61940b20c, read from testpilots's own deployed-commit.txt and cross-checked via the GitHub deployments API) to beta, and the run reached a concluded, successful terminal state -- including the workflow's own live-deployment verification step -- rather than hanging"
    requirement: "LAUN-01"
    verification:
      - kind: other
        ref: "gh run view 33079159653 -> status=completed, conclusion=success (both Validate selected commit and Deploy to beta jobs); curl https://dbcms782zp162.cloudfront.net/deployed-commit.txt -> 18967ca1f806cca030173f7d0f7f16d61940b20c (matches dispatched SHA exactly)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The dispatch to beta's protected Environment was followed by a genuine automated approval attempt (not a formality), its exact rejection was recorded, and no Environment protection rule (prevent_self_review, required reviewers) was weakened to route around the rejection -- escalated to the maintainer via checkpoint instead, per ADR-0002 rule 3 (LOCKED)"
    requirement: "LAUN-01"
    verification:
      - kind: other
        ref: "gh api GET .../pending_deployments -> current_user_can_approve:false; gh api POST .../pending_deployments (run by maintainer under one-off approval) -> HTTP 422 'No pending deployment requests to approve or reject'; gh api repos/.../environments/beta -> prevent_self_review unchanged (still true) after the whole plan"
        status: pass
    human_judgment: false
---

# Phase 5 Plan 2: Deploy pipeline wiring Summary

**Beta's GitHub Environment now carries its own real deploy variables and has received testpilots's exact SHA (18967ca1f806cca030173f7d0f7f16d61940b20c) through a genuinely concluded, successful `Deploy site` run -- with the solo-maintainer self-review question empirically resolved (manual UI approval works; API approval from the same identity does not) rather than assumed either way.**

## Performance

- **Duration:** ~15 min of active execution work, spread across a longer wall-clock session due to two orchestrator-run checkpoints (dispatch, and manual UI approval)
- **Started:** 2026-08-27 (this session)
- **Completed:** 2026-08-27
- **Tasks:** 3
- **Files modified:** 0 (this plan is entirely live GitHub Environment/API/workflow actions -- no repository files were created or changed)

## Accomplishments
- Set beta's four deploy variables (`CONTENT_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `AWS_DEPLOY_ROLE_ARN`, `SITE_CHECK_URL`) via `gh api POST .../environments/beta/variables`, each read from 05-01's real captured AWS outputs (`infra/environments/beta/.captured-outputs.json`), never copied from testpilots or stable
- Verified all four values match 05-01's outputs exactly and that testpilots's/stable's own variables were completely unaffected
- Read testpilots's currently deployed SHA directly from its live site (`curl https://d1bl4kbn7rv5h7.cloudfront.net/deployed-commit.txt`), cross-checked against `gh api .../deployments?environment=testpilots`, and confirmed it as a 40-character lowercase hex ancestor of `origin/main`
- Dispatched a real `Deploy site` run (`33079159653`) against `beta` carrying that exact SHA
- Attempted a genuine automated approval of the resulting pending deployment via `gh api POST .../pending_deployments`; recorded the real rejection (HTTP 422, "No pending deployment requests to approve or reject"), consistent with the prior read-only `current_user_can_approve: false` signal -- no protection rule was touched or weakened
- Resolved a `checkpoint:human-action`: the maintainer approved the pending deployment via the GitHub UI ("Review deployments -> Approve and deploy"), which succeeded despite the API rejection -- empirically resolving RESEARCH.md Open Question 1
- Confirmed the run reached a full successful conclusion: `Validate selected commit` (success) and `Deploy to beta` (success, including the workflow's built-in `Verify live deployment` step)
- Confirmed beta's own live site now serves the exact promoted SHA (`curl https://dbcms782zp162.cloudfront.net/deployed-commit.txt` -> `18967ca1f806cca030173f7d0f7f16d61940b20c`, matching the dispatched SHA byte-for-byte)

## Task Commits

1. **Task 1: Set beta's deploy variables** - no repository file changes (plan explicitly scopes this task to live GitHub Environment variables only); verified via `gh api`
2. **Task 2: Dispatch testpilots's exact SHA to beta and attempt approval** - no repository file changes (live workflow dispatch + API approval attempt); the dispatch (`gh workflow run`) and the approval attempt (`gh api POST .../pending_deployments`) were both blocked by the Bash tool's auto-mode classifier for this executor and run instead by the orchestrator under one-off explicit approval (see Deviations)
3. **Task 3: Approve the pending beta deployment if still blocked** - `checkpoint:human-action` resolved by the maintainer (manual UI approval; no repository file changes)

**Plan metadata:** (this SUMMARY's commit, made immediately after this file)

## Files Created/Modified
None -- this plan's entire scope is live GitHub Environment configuration, a real workflow dispatch, and a real deployment approval; no repository files were in scope (`files_modified: []` in the plan frontmatter, matching actual execution).

## Decisions Made
- Both `gh workflow run "Deploy site" ...` (the dispatch) and `gh api --method POST .../pending_deployments` (the approval attempt) were blocked outright by the Bash tool's auto-mode classifier for this executor -- a new instance of the same class of block 05-01 already hit for `tofu apply`. Per the orchestrator's standing instruction, neither block was retried, and no alternate command surface achieving the same effect (e.g. the `actions/workflows/{id}/dispatches` endpoint) was attempted as a workaround. Both were handed back to the orchestrator as an exact command plus full context (what it does, why it's needed, what's blocked), and the orchestrator ran each directly under explicit one-off approval.
- The self-review rejection was treated as a real, recorded outcome rather than an assumption: the read-only `gh api GET .../pending_deployments` call already reported `current_user_can_approve: false` for the dispatching identity before any write was attempted, and the actual `gh api POST` approval (run by the orchestrator) returned a real HTTP 422 with the exact GitHub error message. Both pieces of evidence agree.
- The maintainer's manual UI approval ("Review deployments -> Approve and deploy") succeeded even though the API approval from the same account did not. This resolves RESEARCH.md Open Question 1 for the entire phase: GitHub's self-review check is apparently scoped differently for an interactive UI approval than for an API-driven one from the same account. No second GitHub collaborator/reviewer needs to be added to `beta` or `stable` to complete the remaining promotions in this phase (05-06, 05-10, 05-11) -- each will hit the same API rejection and should be resolved the same way, via a manual UI click by the maintainer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking, classifier-adjacent] `gh workflow run` blocked by the Bash tool's auto-mode permission classifier**
- **Found during:** Task 2, dispatch step
- **Issue:** The plan's Task 2 assumes the executor can dispatch `Deploy site` directly. The harness's auto-mode classifier denied the exact `gh workflow run "Deploy site" --ref main -f environment=beta -f git_sha=...` call outright.
- **Fix:** Did not retry or attempt an alternate dispatch surface. Handed the orchestrator the exact command and full context (target Environment, SHA and its provenance, why it's needed). The orchestrator ran the dispatch directly with one-off explicit approval and reported the resulting run ID (`33079159653`).
- **Files modified:** None (process-only deviation)
- **Verification:** `gh run view 33079159653` confirmed the run existed, targeted `beta`, and carried the correct SHA
- **Committed in:** N/A -- execution-process deviation, no code change

**2. [Rule 3 - Blocking, classifier-adjacent] `gh api --method POST .../pending_deployments` (approval attempt) blocked by the same classifier**
- **Found during:** Task 2, approval-attempt step
- **Issue:** Task 2 explicitly requires a genuine, non-formality approval attempt with its exact outcome recorded. The classifier denied the API call before it could run.
- **Fix:** Did not retry or route around the block (e.g. by touching Environment protection rules, which would additionally have violated ADR-0002 rule 3 LOCKED and the plan's explicit prohibition). Handed the orchestrator the exact command and context; the orchestrator ran it directly and reported the real HTTP 422 rejection verbatim.
- **Files modified:** None (process-only deviation)
- **Verification:** The reported HTTP 422 body (`"errors":"No pending deployment requests to approve or reject"`) matches the prior read-only `current_user_can_approve: false` signal exactly, confirming a real, consistent rejection rather than a fluke
- **Committed in:** N/A -- execution-process deviation, no code change

---

**Total deviations:** 2 auto-fixed (both blocking, classifier-adjacent, resolved via hand-back-to-orchestrator rather than a workaround)
**Impact on plan:** No scope creep, no weakened safety control -- both deviations preserved the intended human-approval boundary around real GitHub Environment mutation and production-adjacent deployment actions rather than bypassing it. All plan tasks completed exactly as specified once the orchestrator performed each classifier-blocked call, and Task 3's designed `checkpoint:human-action` was reached and resolved exactly as the plan intended.

## Issues Encountered
None beyond the two classifier blocks documented above as deviations. No `npm run verify` or repository code was touched by this plan, so no build/test issues arose.

## User Setup Required

None further required by this plan. The one human action required (dispatching and approving the beta deployment under explicit one-off approval, given the classifier blocks) was completed and confirmed during this session -- see Deviations and Task 3.

## Next Phase Readiness
- Beta's GitHub Environment is fully configured with real, non-copied deploy variables and has successfully served testpilots's exact promoted SHA -- confirmed live via beta's own `deployed-commit.txt`.
- RESEARCH.md Open Question 1 is now resolved with real evidence: every remaining protected-Environment dispatch this phase (05-06 beta->stable, 05-10, 05-11) should expect the same pattern -- dispatch succeeds, the automated API approval attempt will be rejected with HTTP 422, and the maintainer must approve manually via the GitHub UI. No second collaborator/reviewer needs to be provisioned.
- `beta.puppetstagehand.com` (the custom hostname) still does not resolve publicly -- expected and unrelated to this plan; beta is reachable and correctly serving content via its CloudFront default domain (`dbcms782zp162.cloudfront.net`), which is exactly what `SITE_CHECK_URL` targets pre-cutover.
- No Environment protection rule (`prevent_self_review`, required reviewers) was modified on `beta` or `stable` at any point -- ADR-0002 rule 3 remains intact and unweakened.
- **Process note for the rest of this phase:** both `gh workflow run` (dispatch) and `gh api --method POST .../pending_deployments` (approval attempt) hit the Bash tool's auto-mode classifier for this executor, in addition to the already-known `tofu apply` block from 05-01. The established, orchestrator-confirmed pattern remains: prepare the exact command and full context, hand it back, orchestrator runs it under one-off explicit approval. Do not request standing bypass permission.

---
*Phase: 05-production-launch*
*Completed: 2026-08-27*

## Self-Check: PASSED
- FOUND: `.planning/phases/05-production-launch/05-02-SUMMARY.md`
- No task commits to verify (`files_modified: []` — this plan performed only live GitHub Environment/API/workflow actions, exactly as planned; confirmed by `git status --short` showing no plan-scoped file changes)
