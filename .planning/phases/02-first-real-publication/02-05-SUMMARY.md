---
phase: 02-first-real-publication
plan: 05
subsystem: ci-cd
tags: [github-actions, opentofu, pull-request, github-environments, oidc]

requires:
  - phase: 02-first-real-publication
    plan: "02-02"
    provides: "The three configured -plan GitHub Environments (testpilots-plan, beta-plan, stable-plan) this PR's plan jobs queue behind."
  - phase: 02-first-real-publication
    plan: "02-03"
    provides: "Real, already-applied testpilots state so the testpilots plan job reads a real diff, not a from-scratch create plan."
provides:
  - "A real, same-repository pull request (#2) touching infra/**, proving infrastructure.yml's job-level same-repository guard runs before Environment attachment and all three plan matrix jobs (testpilots/beta/stable) correctly queue behind their -plan Environment's required-reviewer protection."
  - "Confirmation that infra/environments/testpilots/variables.tf's hosted_zone_id now carries a cross-reference comment to 02-01's zone."
affects: []

actuals:
  tokens: 400
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns: []

key-files:
  modified:
    - infra/environments/testpilots/variables.tf

key-decisions:
  - "Committed the file change on this worktree's own agent branch (worktree-agent-a63d425d0bcf56bdd) to satisfy the pre-commit HEAD safety assertion, then pushed that same commit to a separately named branch (pub06/infra-proof-pr) on origin and opened the PR from there — rather than checking out an arbitrary feature branch directly in the worktree, which the worktree branch allow-list would have refused to let commit."

patterns-established: []

requirements-completed: [PUB-06, PUB-07]

coverage:
  - id: D1
    description: "A real same-repository PR touching infra/** was opened; validate passed; all three plan matrix jobs (testpilots/beta/stable) queued behind their -plan Environment's required reviewer, then ran to completion successfully."
    requirement: "PUB-06"
    verification:
      - kind: other
        ref: "gh run view 33016442894: conclusion=success — Validate OpenTofu, Plan testpilots, Plan beta, Plan stable all passed; tofu-plan-{root} artifacts downloaded and confirmed value-free (resource address + action only, no attribute values)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Self-review deadlock resolved: ADR-0004 written and user-approved, superseding ADR-0002 rule 3's self-review-prevention clause for the three read-only plan Environments only (stable's mutating apply Environment unchanged). prevent_self_review set to false on testpilots-plan/beta-plan/stable-plan via gh api; deployment reviews approved; plan jobs re-ran and passed."
    requirement: "PUB-06"
    verification:
      - kind: other
        ref: "docs/adr/0004-plan-environment-self-review.md committed; gh api repos/.../environments/{testpilots,beta,stable}-plan confirms prevent_self_review:false, reviewer unchanged, branch policy unchanged"
        status: pass
    human_judgment: true
    rationale: "The self-review policy relaxation is a locked architectural decision (ADR-0004) requiring explicit user sign-off, not something an executor or orchestrator can decide unilaterally — obtained via orchestrator checkpoint."
  - id: D3
    description: "Two real IAM permission gaps discovered by the real plan job (cloudfront:ListTagsForResource on the site function; 8 missing s3:Get* actions on the content bucket, matching the apply role's already-correct scope) were fixed in infra/bootstrap/iam-github-actions.tf and applied for real to all six bootstrap-created IAM roles."
    requirement: "PUB-06"
    verification:
      - kind: other
        ref: "tofu -chdir=infra/bootstrap apply: 0 add / 6 change / 0 destroy (CloudFront fix), then 0 add / 3 change / 0 destroy (S3 fix); re-run Plan testpilots job succeeded after both fixes"
        status: pass
    human_judgment: false
  - id: D4
    description: "git log --all sweep for PUB-07: no credential, .tfstate, .tfvars, backend.hcl, or AKIA-format access key found anywhere in history. One known, accepted deviation: the AWS account ID appears in several SUMMARY.md files as ARN citations — judged low-risk (account IDs are not secret credentials) and recorded in REQUIREMENTS.md rather than rewriting already-pushed git history."
    requirement: "PUB-07"
    verification:
      - kind: other
        ref: "git log --all -p | grep -E '503561411317' (account ID, docs-only, no credentials); git log --all -p | grep -oE 'AKIA[0-9A-Z]{16}' (empty); git log --all --diff-filter=A --name-only | grep -E '\\.tfvars$|backend\\.hcl$|\\.tfstate$|\\.tfplan$' (empty)"
        status: pass
    human_judgment: true
    rationale: "The account-ID exposure is a real, literal violation of PUB-07's text as written. Whether to accept it as a documented deviation or rewrite git history is a risk-tolerance judgment call requiring the user's decision — obtained via orchestrator checkpoint; user chose to accept and document rather than rewrite already-public history."

duration: 15min (executor session) + ~50min (orchestrator resolution: ADR-0004, two real IAM fixes, secrets sweep)
completed: 2026-08-26
status: complete
---

## Resolution (orchestrator, post-executor)

- Wrote and got user sign-off on ADR-0004, superseding ADR-0002 rule 3's self-review requirement for
  the three read-only plan Environments; applied the config change via `gh api`; approved the pending
  deployment reviews.
- Diagnosed and fixed two real IAM permission gaps the plan job's `tofu plan` surfaced against real,
  already-applied AWS resources (gaps Phase 1's mock-only tests could never have caught):
  `cloudfront:ListTagsForResource` on the site CloudFront Function, and 8 missing `s3:Get*` actions on
  the content bucket. Both applied for real to all six bootstrap IAM roles.
- Re-ran the `Plan testpilots` job twice (once per fix) until it succeeded; confirmed all four
  validate/plan jobs green; downloaded and inspected all three `tofu-plan-{root}` artifacts —
  confirmed genuinely value-free (resource address + no-op/create/update action only).
- Merged PR #2.
- Ran the PUB-07 secrets sweep across full git history; found and documented one accepted deviation
  (see D4 above) in `.planning/REQUIREMENTS.md`.

# Phase 02 Plan 05: Infrastructure Plan-Job PUB-06 Proof Summary

**Real same-repository PR #2 opened against `infra/environments/testpilots/variables.tf`; `validate` job passed and all three `plan` matrix jobs (testpilots/beta/stable) correctly queued behind their protected `-plan` Environments — halted at the checkpoint because the only configured deployment reviewer (`matthewrstone`) is also this PR's author, and `prevent_self_review=true` blocks self-approval for all three, exactly the friction 02-02 flagged.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-26 (this session)
- **Halted:** 2026-08-26, at the plan's `checkpoint:human-verify` task
- **Tasks:** 1/3 (Task 1 complete; the checkpoint task is blocked; Task 2 not started)
- **Files modified:** 1

## Accomplishments

- Added a genuine, useful documentation comment above `hosted_zone_id` in `infra/environments/testpilots/variables.tf`, cross-referencing the Route 53 hosted zone `02-01` (phase 02, plan 01) created for `puppetstagehand.com` (`Z00971888M7QXUPNS7H8`) — a real, reviewable infra change, not throwaway filler.
- `tofu fmt -check -recursive infra` passed with no changes needed.
- Committed on this worktree's own agent branch, then pushed that commit to a new branch (`pub06/infra-proof-pr`) on `origin` (same repository, not a fork) and opened **PR #2**: https://github.com/puppet-stagehand/stagehand-docs/pull/2.
- Confirmed via `gh pr checks 2`: `Validate OpenTofu` (the `validate` job) completed successfully in 1m43s; all three `Plan {root}` matrix jobs (`testpilots`, `beta`, `stable`) are visible as `pending`, correctly gated behind their respective `-plan` Environment.
- Confirmed via `gh api repos/puppet-stagehand/stagehand-docs/actions/runs/{id}/pending_deployments` that all three `plan` jobs are genuinely waiting on deployment review approval from `testpilots-plan`, `beta-plan`, and `stable-plan` — this is the job-level same-repository guard (PUB-06) plus Environment protection working exactly as designed, observed on a real PR rather than assumed from the workflow file's text.
- Hit the checkpoint: the deployment reviews cannot currently be approved. `current_user_can_approve: false` on all three pending deployments, because the only configured reviewer (`matthewrstone`) is the same identity that authored this PR, and each `-plan` Environment has `prevent_self_review: true` (set in 02-02). GitHub's platform rejects self-approval of a required review regardless of which tool or UI path is used to attempt it.

## Task Commits

1. **Task 1: Open a real same-repo PR touching infra/\*\*** — `aed884c` (docs), pushed to `pub06/infra-proof-pr`, opened as PR #2 (not yet merged — merge is explicitly out of scope for this executor per its instructions)

**Plan metadata:** this SUMMARY's commit (immediately after this file)

## Files Created/Modified

- `infra/environments/testpilots/variables.tf` — added a 4-line documentation comment above `hosted_zone_id`, cross-referencing 02-01's Route 53 hosted zone.

## Decisions Made

- **Committed on the worktree's agent branch, pushed to a separately-named PR branch:** see `key-decisions` in frontmatter. This satisfies both the worktree's pre-commit HEAD safety assertion (commits stay confined to the `worktree-agent-*` namespace) and the plan's requirement for a real, pushed, same-repository branch to open the PR from.
- **Did not attempt to route around the self-review block:** no second GitHub identity exists in this environment's `gh auth` configuration, and disabling `prevent_self_review` on the `-plan` Environments to force approval would itself be a T-02-08-shaped deviation (routing around a deliberately configured anti-self-approval control) — exactly what the plan's checkpoint text warns against doing unilaterally. Left this as a recorded, explicit human decision instead.

## Deviations from Plan

None — plan executed exactly as written up through the checkpoint. The checkpoint itself surfaced a real, expected platform constraint (documented by 02-02 in advance), not a defect in this plan or its predecessors.

## Issues Encountered

**Self-review block on all three `-plan` Environments.** See `coverage` D2 and "Checkpoint Details" below. Not an issue with this plan's execution — it is the exact friction 02-02's SUMMARY flagged as a known possibility ("a solo maintainer approving their own PR's deployment may be blocked by 'prevent self-review'").

## User Setup Required

**One human decision needed before Task 2 (artifact inspection + PUB-07 sweep) can run — see "Checkpoint Details" below.** No environment variables or dashboard configuration beyond the deployment-review decision itself.

## Next Phase Readiness

**Not ready to close 02-05.** PUB-06 is partially proven: the same-repository guard and Environment-attachment gating are confirmed working on a real PR, but the `plan` jobs have not yet executed to completion (no `tofu-plan-{root}` artifacts exist yet), so the "real, value-free OpenTofu plan summary" half of PUB-06's must-have truth is not yet observed. PUB-07's sweep (Task 2) has not started.

**What the user/orchestrator needs to do:**
1. Review the one-line diff on PR #2 (https://github.com/puppet-stagehand/stagehand-docs/pull/2) — confirm it is exactly the documentation comment described above, nothing else.
2. Resolve the self-review block: either approve the three pending deployment reviews from a second GitHub identity with repo access (Actions tab → the queued run → Review deployments → approve `testpilots-plan`, `beta-plan`, `stable-plan`), or make the deliberate, recorded call to adjust the reviewer configuration so a distinct approver exists.
3. Once approved, confirm each `plan` job completes and uploads a `tofu-plan-{root}` artifact.
4. Resume this plan's Task 2 (download and inspect the three artifacts for value-freedom, merge the PR, run the phase-closing PUB-07 sweep across all five plans' commit history) in a fresh execution.

---
*Phase: 02-first-real-publication*
*Halted: 2026-08-26 (pending human resolution of the self-review deadlock on testpilots-plan/beta-plan/stable-plan — see 02-02-SUMMARY.md for the same platform constraint documented in advance)*

## Self-Check: PASSED

- FOUND: infra/environments/testpilots/variables.tf
- FOUND commit: aed884c
- FOUND PR: https://github.com/puppet-stagehand/stagehand-docs/pull/2 (open, plan jobs pending deployment approval)
