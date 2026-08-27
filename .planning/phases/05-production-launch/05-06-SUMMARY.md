---
phase: 05-production-launch
plan: 06
subsystem: infra
tags: [github-actions, github-environments, deploy, oidc, cloudfront, s3, gh-cli]

# Dependency graph
requires:
  - phase: 05-production-launch (05-05, 05-02)
    provides: content_bucket_name/distribution_id/deployment_role_arn/distribution_domain_name real outputs for stable; the beta deploy-dispatch pattern (self-review resolution precedent)
provides:
  - Stable's GitHub Environment fully configured with real, non-copied deploy variables (CONTENT_BUCKET, CLOUDFRONT_DISTRIBUTION_ID, AWS_DEPLOY_ROLE_ARN, SITE_CHECK_URL)
  - A concluded, successful Deploy site run (33097584579) delivering beta's exact SHA to stable through the protected approval path
  - Confirmed discovery — for workflow_dispatch runs, the GitHub run/deployment `head_sha` field reflects the ref tip at trigger time, not the actual `git_sha` input deployed; must read the workflow's own step env (or the live site) to get the real deployed SHA
affects: [05-07-release-evidence-and-live-verification, 05-08-registrar-cutover, 05-10, 05-11]

actuals:
  tokens: 400
  tasks: 3
  commits: 0

tech-stack:
  added: []
  patterns:
    - "Neither `gh api POST .../environments/stable/variables` nor `gh workflow run \"Deploy site\"` was blocked by the Bash tool's auto-mode classifier this time -- both ran directly, unlike 05-02's beta dispatch which was classifier-blocked. The classifier's behavior for the same class of command is not consistent across plans/sessions; the executor should keep defaulting to attempting the command directly first rather than assuming a block."
    - "For a workflow_dispatch run, `gh run list`/`gh api .../runs/{id}` report `head_sha` as the ref's tip commit at trigger time -- NOT the `git_sha` workflow input actually validated and deployed. Confirmed by comparing 05-02's run 33079159653's reported head_sha (2484130a...) against its own step logs (REQUESTED_GIT_SHA/EXPECTED_SHA env values, both 18967ca1...) and the live site. Any future plan reading 'the SHA a dispatch delivered' from `head_sha` or the deployments API's `.sha` field will get the wrong answer for a manual dispatch; read the live site's `/deployed-commit.txt` or the run's own step inputs instead."

key-files:
  created: []
  modified: []

key-decisions:
  - "Read beta's currently-deployed SHA directly from its live site (`curl https://dbcms782zp162.cloudfront.net/deployed-commit.txt` -> 18967ca1f806cca030173f7d0f7f16d61940b20c) rather than trusting the GitHub deployments API's `.sha` field, which returned a different value (2484130a...) for the same deployment -- cross-checked against 05-02's run's own step logs to confirm the live-site value was the one actually validated and deployed, not the API's."
  - "Per the plan's explicit instruction (informed by 05-02's precedent), did not spend a cycle attempting the `gh api POST .../pending_deployments` approval call -- read the pending-deployment state read-only instead (`current_user_can_approve: false`, confirming the same self-review block) and went straight to the checkpoint asking the maintainer for a manual UI approval, which succeeded on first try."
  - "Neither this plan's `gh api POST .../variables` calls nor its `gh workflow run` dispatch were blocked by the Bash tool's auto-mode classifier, in contrast to 05-02's beta dispatch (both classifier-blocked there) and 05-01/05-05's `tofu apply` blocks. Recorded as a pattern: classifier behavior for the same command class is not deterministic across sessions."

requirements-completed: [LAUN-02]

coverage:
  - id: D1
    description: "Stable's GitHub Environment carries its own real, non-copied CONTENT_BUCKET, CLOUDFRONT_DISTRIBUTION_ID, AWS_DEPLOY_ROLE_ARN, and SITE_CHECK_URL variables, matching 05-05's captured outputs exactly, with beta/testpilots's own variables verified unchanged"
    requirement: "LAUN-02"
    verification:
      - kind: other
        ref: "gh api repos/puppet-stagehand/stagehand-docs/environments/stable/variables --jq '.variables[].name' | sort | grep -c ... -> 4; values spot-checked against infra/environments/stable/.captured-outputs.json; beta/testpilots variables re-read and confirmed byte-identical to their pre-plan values"
        status: pass
    human_judgment: false
  - id: D2
    description: "A real Deploy site run dispatched beta's exact live SHA (18967ca1f806cca030173f7d0f7f16d61940b20c, read from beta's own deployed-commit.txt and cross-checked against its dispatching run's own step logs) to stable, and the run reached a concluded, successful terminal state -- including the workflow's own live-deployment verification step -- rather than hanging"
    requirement: "LAUN-02"
    verification:
      - kind: other
        ref: "gh run view 33097584579 -> status=completed, conclusion=success (both Validate selected commit and Deploy to stable jobs); curl https://d1g7y94y3acn2m.cloudfront.net/deployed-commit.txt -> 18967ca1f806cca030173f7d0f7f16d61940b20c (matches dispatched SHA exactly)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The dispatch to stable's protected Environment was followed by a genuine read of the pending-deployment approval state (self-review block confirmed, not assumed), and no Environment protection rule (prevent_self_review, required reviewers) was weakened to route around it -- escalated to the maintainer via checkpoint instead, per ADR-0002 rule 3 (LOCKED)"
    requirement: "LAUN-02"
    verification:
      - kind: other
        ref: "gh api GET .../pending_deployments -> current_user_can_approve:false, required reviewer matthewrstone (same identity that dispatched); gh api repos/.../environments/stable -> prevent_self_review still true after the plan completed; maintainer's manual UI approval succeeded, resolving the checkpoint"
        status: pass
    human_judgment: false

duration: ~12min active execution (plus a checkpoint pause awaiting the maintainer's manual UI approval)
completed: 2026-08-27
status: complete
---

# Phase 5 Plan 6: Promote beta to stable Summary

**Stable's GitHub Environment now carries its own real deploy variables and has received beta's exact SHA (18967ca1f806cca030173f7d0f7f16d61940b20c) through a genuinely concluded, successful `Deploy site` run — completing the mechanical testpilots→beta→stable promotion pipeline before the DNS cutover (05-08) makes stable customer-facing, with a real self-review approval checkpoint resolved by the maintainer's manual UI click, exactly as 05-02 established for beta.**

## Performance

- **Duration:** ~12 min of active execution work, plus a checkpoint pause while the maintainer approved the pending deployment via the GitHub UI
- **Started:** 2026-08-27 (this session)
- **Completed:** 2026-08-27
- **Tasks:** 3
- **Files modified:** 0 (this plan is entirely live GitHub Environment/API/workflow actions — no repository files were created or changed, matching `files_modified: []` in the plan frontmatter)

## Accomplishments
- Set stable's four deploy variables (`CONTENT_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `AWS_DEPLOY_ROLE_ARN`, `SITE_CHECK_URL`) via `gh api POST .../environments/stable/variables`, each read from 05-05's real captured AWS outputs (`infra/environments/stable/.captured-outputs.json`), never copied from beta or testpilots
- Verified all four values match 05-05's outputs exactly and that beta's/testpilots's own variables were completely unaffected
- Read beta's currently deployed SHA directly from its live site (`curl https://dbcms782zp162.cloudfront.net/deployed-commit.txt` → `18967ca1f806cca030173f7d0f7f16d61940b20c`), confirmed it as a 40-character lowercase hex ancestor of `origin/main` via `git merge-base --is-ancestor`
- Discovered and recorded a real platform behavior worth flagging for future plans: the GitHub deployments API and `gh run`'s `head_sha` field report the *ref tip at dispatch time* for a `workflow_dispatch` run, not the `git_sha` workflow input actually validated and deployed — cross-checked 05-02's own run's step logs (`REQUESTED_GIT_SHA`/`EXPECTED_SHA` env values) against the live site to confirm which value was correct
- Dispatched a real `Deploy site` run (`33097584579`) against `stable` carrying that exact SHA
- Read the resulting pending deployment's approval state (`gh api GET .../pending_deployments` → `current_user_can_approve: false`), confirming the same self-review block 05-02 already resolved for beta — per the plan's explicit instruction, did not spend a cycle on a doomed API approval attempt, and went straight to the `checkpoint:human-action`
- Resolved the checkpoint: the maintainer approved the pending deployment via the GitHub UI ("Review deployments → Approve and deploy"), succeeding on first try — no second reviewer needed, matching 05-02's precedent
- Confirmed the run reached a full successful conclusion: `Validate selected commit` (success) and `Deploy to stable` (success, including the workflow's built-in `Verify live deployment` step)
- Confirmed stable's own live site now serves the exact promoted SHA (`curl https://d1g7y94y3acn2m.cloudfront.net/deployed-commit.txt` → `18967ca1f806cca030173f7d0f7f16d61940b20c`, matching the dispatched SHA byte-for-byte)
- Confirmed `prevent_self_review` on `stable` is unchanged (still `true`) after the whole plan — no Environment protection rule was touched or weakened

## Task Commits

1. **Task 1: Set stable's deploy variables** - no repository file changes (plan explicitly scopes this task to live GitHub Environment variables only); verified via `gh api`
2. **Task 2: Dispatch beta's exact SHA to stable and attempt approval** - no repository file changes (live workflow dispatch + read-only approval-state check); neither `gh workflow run` nor the `gh api POST .../variables` calls in Task 1 were blocked by the Bash tool's auto-mode classifier this session, unlike 05-02's equivalent calls (see Deviations)
3. **Task 3: Approve the pending stable deployment if still blocked** - `checkpoint:human-action` resolved by the maintainer (manual UI approval; no repository file changes)

**Plan metadata:** (this SUMMARY's commit, made immediately after this file)

## Files Created/Modified
None — this plan's entire scope is live GitHub Environment configuration, a real workflow dispatch, and a real deployment approval; no repository files were in scope (`files_modified: []` in the plan frontmatter, matching actual execution).

## Decisions Made
- Read beta's currently-deployed SHA from its own live site rather than the GitHub deployments API, after discovering the API's `.sha` field (`2484130a...`) disagreed with the live site's `deployed-commit.txt` (`18967ca1...`) for the same deployment. Cross-checked 05-02's own dispatching run's step logs (`REQUESTED_GIT_SHA: 18967ca1...`, `EXPECTED_SHA: 18967ca1...`) to confirm the live-site value was the one genuinely validated and deployed — the API/`head_sha` value is just the ref tip at dispatch trigger time for a `workflow_dispatch` event, not the deployed content. This is a real platform-behavior discovery, not a bug in this repo's workflow, and is recorded above for 05-08/05-10/05-11's awareness.
- Per the plan's explicit instruction (informed by 05-02's empirically-resolved precedent), skipped the doomed `gh api POST .../pending_deployments` approval attempt entirely rather than repeating a call already known to fail with HTTP 422 for this solo-maintainer repo config. Read the pending-deployment state read-only (`current_user_can_approve: false`) as sufficient evidence of the same self-review block, then went straight to the `checkpoint:human-action` for the maintainer's UI approval.
- Neither this plan's variable-setting POST calls nor its workflow dispatch were blocked by the Bash tool's auto-mode classifier, in contrast to 05-02's identical-class calls (both classifier-blocked there). No standing bypass permission was requested; each command was simply attempted directly first, per standing instruction, and it happened to pass this time. Recorded as a pattern for future plans: do not assume a block will or won't happen based on the command's class alone.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written, including its explicit instruction to skip re-attempting the API approval call.

---

**Total deviations:** 0
**Impact on plan:** No scope creep. The GitHub deployments-API vs. live-site SHA discrepancy was investigated and resolved within Task 2's existing verification step (the plan already required reading beta's SHA from its live site as the primary method, with the deployments API only as a documented fallback) — no additional task or file was needed to handle it, just careful adherence to the plan's stated preference for the live-site source.

## Issues Encountered
- The GitHub deployments API's `environment=beta` filter returned exactly one deployment record, and its `.sha` field did not match the SHA actually deployed and verified live. This is worth flagging clearly: any future plan or runbook step that reads "the promoted SHA" from `gh api .../deployments` rather than the live site's `deployed-commit.txt` (or the dispatching run's own step logs) risks reading the wrong commit for a `workflow_dispatch`-triggered deployment.

## User Setup Required

None further required by this plan. The one human action required (approving the pending stable deployment via the GitHub UI, given the self-review block) was completed and confirmed during this session — see Decisions Made and Task 3.

## Next Phase Readiness
- Stable's GitHub Environment is fully configured with real, non-copied deploy variables and has successfully served beta's exact promoted SHA — confirmed live via stable's own `deployed-commit.txt`.
- 05-07 (LAUN-03, release evidence + live verification) can now proceed against this real, concluded `Deploy site` run (`33097584579`) — this plan deliberately left `docs/operations/RELEASE-EVIDENCE.md`'s stable Promotions row and the full route/JSON/404/apex-redirect check sequence to 05-07, which owns that file and requirement per its own plan frontmatter.
- `puppetstagehand.com`/`www.puppetstagehand.com` still do not resolve publicly to stable — expected and unrelated to this plan; stable is reachable and correctly serving the promoted content via its CloudFront default domain (`d1g7y94y3acn2m.cloudfront.net`), which is exactly what `SITE_CHECK_URL` targets pre-cutover, per RESEARCH.md Pattern 2.
- No Environment protection rule (`prevent_self_review`, required reviewers) was modified on `stable` at any point — ADR-0002 rule 3 remains intact and unweakened.
- **Process note for the rest of this phase:** the Bash tool's auto-mode classifier did not block either `gh api POST .../variables` or `gh workflow run "Deploy site"` in this session, in contrast to 05-02's identical-class calls. The established, orchestrator-confirmed pattern (attempt directly first, hand back to the orchestrator only if actually blocked, never request standing bypass permission) remains correct and sufficient — classifier behavior is not assumed either way going in.
- **Reusable discovery for 05-10/05-11 (and any future dispatch-reading code):** `gh run list`/`gh api .../runs/{id}`'s `head_sha`, and the GitHub deployments API's `.sha` field, report the ref tip at `workflow_dispatch` trigger time — not the `git_sha` input actually deployed. Read the live site's `deployed-commit.txt` (as `release.md`'s own procedure already does) or the run's own step env values, never `head_sha`/`.sha`, to determine what was actually promoted.

---
*Phase: 05-production-launch*
*Completed: 2026-08-27*

## Self-Check: PASSED
- FOUND: `.planning/phases/05-production-launch/05-06-SUMMARY.md`
- No task commits to verify (`files_modified: []` — this plan performed only live GitHub Environment/API/workflow actions, exactly as planned; confirmed by `git status --short` showing no plan-scoped file changes)
- Real AWS/GitHub: `Deploy site` run `33097584579` (status=completed, conclusion=success) — FOUND via `gh run view`
- Real live verification: `curl https://d1g7y94y3acn2m.cloudfront.net/deployed-commit.txt` → `18967ca1f806cca030173f7d0f7f16d61940b20c` — FOUND, matches dispatched SHA
