---
phase: 01-infrastructure-role-ownership
plan: 02
subsystem: infra
tags: [opentofu, iam, github-oidc, s3-backend, tofu-test, least-privilege]

# Dependency graph
requires:
  - phase: 01-01
    provides: "infra/bootstrap/locals.tf (local.site, local.required_tags, local.github_repository), the infrastructure_plan role/policy skeleton, the exact-JSON tofu test assertion idiom, and the infrastructure_plan_role_arns output this plan mirrors"
provides:
  - "aws_iam_role.infrastructure_apply / aws_iam_role_policy.infrastructure_apply, one per Stagehand environment"
  - "infrastructure_apply_role_arns bootstrap output, keyed by Stagehand environment"
  - "local.apply_record_names — the per-environment Route 53 allowed-name list, including the stable apex"
  - "forbids_escalation_actions_in_every_role_policy — a phase-wide tofu test run proving no role (plan or apply, any environment) holds a bare wildcard action, a role-passing action, a role-assumption action, an unscoped role resource, or another environment's name"
  - "OPS-13 backlog entry in .planning/REQUIREMENTS.md recording the deferred deploy-role permissions boundary"
affects: ["01-03 (check-tofu-tags.sh bootstrap coverage)", "01-04 (runbook and GitHub Environment docs, including the CloudFront unscopable-actions disclosure)"]

# Actuals (#2632)
actuals:
  tokens: 6855
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Apply-role permission policy assembled as named, Sid-labelled statements grouped by AWS service/concern, mirroring the plan role's statement shape so a reviewer can diff the two tiers by eye"
    - "Every ForAllValues/ForAnyValue set-operator condition in an Effect: Allow statement is always paired with a sibling Null guard on the same key, checked mechanically by a for-loop-driven jsondecode assertion rather than per-statement duplication"
    - "Genuinely unscopable IAM actions (no AWS resource type) are isolated in one dedicated, clearly-named Sid with no condition block, rather than distributed across statements or silently wrapped in an incorrect condition"

key-files:
  created: []
  modified:
    - infra/bootstrap/iam-github-actions.tf
    - infra/bootstrap/outputs.tf
    - infra/bootstrap/tests/iam-github-actions.tftest.hcl
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Applied the plan 01-01 checkpoint's naming decision (option-a) verbatim to the apply tier: stagehand-<env>-infrastructure-apply."
  - "Content-bucket object-level actions (GetObject/PutObject/DeleteObject) were deliberately omitted from the apply role: the static-site module's own tofu apply never writes object content — only bucket-level configuration (versioning, policy, lifecycle, etc.) — and object uploads are the separately-created deploy role's job (infra/modules/static-site/iam.tf). Adding unused object-level grants would widen the apply role's surface with no corresponding module need."
  - "Route 53 validation-record names follow the plan's literal instruction (exact domain name plus an underscore-prefixed form) even though the real ACM validation record name carries an unpredictable hash segment the condition cannot literally match. This is flagged assumption A2 from RESEARCH, explicitly carried forward as a backstop-only truth rather than a fully-proven one — not silently strengthened or silently dropped."

patterns-established:
  - "State-authority tiering: the apply role's permission policy is built by taking the plan role's three state statements verbatim and adding exactly one new statement (WriteStateObject) rather than restating or diverging from the read-only shape — the diff between tiers stays a single, auditable addition."

requirements-completed: [INFRA-01, INFRA-03, INFRA-04, GATE-01]

coverage:
  - id: D1
    description: "Three aws_iam_role.infrastructure_apply instances exist, one per Stagehand environment, each with a single-statement trust policy naming exactly one unsuffixed GitHub Environment subject (no -plan suffix) and the pinned sts.amazonaws.com audience"
    requirement: "INFRA-01"
    verification:
      - kind: unit
        ref: "infra/bootstrap/tests/iam-github-actions.tftest.hcl#binds_each_apply_role_to_exactly_one_apply_environment"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each apply role's permission policy scopes state authority to its own bucket (put on both terraform.tfstate and the lock key, delete confined to the lock key only), content-bucket authority to its own stagehand-<env>-site-* name prefix, and deploy-role authority to exactly its own stagehand-<env>-site-deploy ARN, with no role/* anywhere"
    requirement: "INFRA-03"
    verification:
      - kind: unit
        ref: "infra/bootstrap/tests/iam-github-actions.tftest.hcl#scopes_each_apply_role_to_its_own_environment_resources"
        status: pass
    human_judgment: false
  - id: D3
    description: "Each apply role's CloudFront, ACM, and Route 53 authority is scoped as tightly as AWS permits: the five genuinely unscopable CloudFront creates sit isolated in one named, unconditioned statement; the CloudFront function is scoped by exact name; ACM RequestCertificate carries a Null-guarded domain-names condition; Route 53 ChangeResourceRecordSets is scoped to the hosted-zone ARN with a Null-guarded record-types condition; and stable's allowed record names include the bare apex"
    requirement: "INFRA-03"
    verification:
      - kind: unit
        ref: "infra/bootstrap/tests/iam-github-actions.tftest.hcl#scopes_each_apply_role_to_its_own_environment_resources"
        status: pass
    human_judgment: false
  - id: D4
    description: "infrastructure_apply_role_arns is a bootstrap output keyed by the three Stagehand environments, each value equal to the matching apply role's own ARN, with the six plan/apply role names proven mutually distinct"
    requirement: "INFRA-04"
    verification:
      - kind: unit
        ref: "infra/bootstrap/tests/iam-github-actions.tftest.hcl#publishes_one_apply_role_arn_per_environment"
        status: pass
    human_judgment: false
  - id: D5
    description: "A single phase-wide tofu test run proves no role (across all six plan and apply role policies) grants a bare wildcard action, a role-passing action, a role-assumption action, or an unscoped role resource; no policy leaks another environment's name; every set-operator condition carries its Null guard; and every apply policy and trust policy fits its character budget"
    requirement: "GATE-01"
    verification:
      - kind: unit
        ref: "infra/bootstrap/tests/iam-github-actions.tftest.hcl#forbids_escalation_actions_in_every_role_policy"
        status: pass
    human_judgment: false
  - id: D6
    description: "tofu -chdir=infra/bootstrap test reports 14 passed / 0 failed (10 pre-existing plus 4 new runs); tofu fmt -check and tofu validate both clean; .terraform.lock.hcl unchanged; no AWS resource created"
    requirement: "GATE-01"
    verification:
      - kind: unit
        ref: "tofu -chdir=infra/bootstrap test (command invocation)"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-08-26
status: complete
---

# Phase 01 Plan 02: Infrastructure Apply Roles Summary

**Three `stagehand-<env>-infrastructure-apply` IAM roles wired end-to-end — state write, content-bucket lifecycle, exact-named deploy-role management, and least-privilege CloudFront/ACM/Route 53 scoping — with a phase-wide `tofu test` run proving no role in either tier can escalate.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-26
- **Tasks:** 2 (both TDD, RED/GREEN)
- **Files modified:** 4

## Accomplishments
- Three infrastructure apply IAM roles (`stagehand-testpilots-infrastructure-apply`, `stagehand-beta-infrastructure-apply`, `stagehand-stable-infrastructure-apply`), each trusting exactly one unsuffixed GitHub Environment OIDC subject
- State authority extended past the plan role's read-only shape by exactly one statement: a `put` on the environment's own `terraform.tfstate` object, with delete authority still confined to the lock object
- Content bucket, deploy-role, CloudFront (distribution, cache policy, response-headers policy, OAC, function), ACM certificate, and Route 53 record authority — all scoped by exact ARN, name prefix, hosted-zone ARN, or condition key wherever AWS supports it
- The five genuinely unscopable CloudFront create actions isolated in one named, unconditioned statement (`CreateUnscopableCloudFrontResources`) — an explicit, reviewable residual rather than a silently-wrapped incorrect condition
- Every `ForAllValues:StringEquals` condition (ACM domain names, Route 53 record names and types) paired with its mandatory `Null` guard
- `infrastructure_apply_role_arns` bootstrap output, mirroring the plan output's shape and phrasing
- `forbids_escalation_actions_in_every_role_policy`: one `tofu test` run asserting, across all six rendered role policies (plan and apply, all three environments), the absence of any bare wildcard action, role-passing action, role-assumption action, unscoped role resource, or cross-environment name leak — plus the Null-guard pairing and both character-budget invariants
- `OPS-13` backlog entry recording the deliberately deferred deploy-role permissions boundary
- 4 new `tofu test` runs (14 total, 0 failed)

## Task Commits

Both tasks followed the plan's RED/GREEN split (`tdd="true"`):

**Task 1: Apply-role trust, state write, and the exactly-scopable resources**
1. **RED** — `1ed7a95` (test): `binds_each_apply_role_to_exactly_one_apply_environment`, `scopes_each_apply_role_to_its_own_environment_resources` (state/content-bucket/deploy-role assertions), and `publishes_one_apply_role_arn_per_environment` added to `iam-github-actions.tftest.hcl`; confirmed to fail with "Reference to undeclared resource," not a syntax error.
2. **GREEN** — `c788946` (feat): `aws_iam_role.infrastructure_apply`, `aws_iam_role_policy.infrastructure_apply` (state + content bucket + deploy role), and the `infrastructure_apply_role_arns` output added. `tofu test` green at 13/13.

**Task 2: CloudFront, ACM, Route 53 scoping, the named unscopable exception, and the phase-wide escalation-absence assertions**
3. **RED** — `c3833c3` (test): CloudFront-function, ACM Null-guard, Route-53 hosted-zone/record-types, and stable-apex assertions added to the existing `scopes_each_apply_role_to_its_own_environment_resources` run; the new `forbids_escalation_actions_in_every_role_policy` run added. Confirmed to fail on the missing statements and the undeclared `local.apply_record_names`.
4. **GREEN** — `ceeaf24` (feat): CloudFront (unscopable-five, distribution, cache policy, response-headers policy, OAC, function), ACM (`RequestCertificate` + management verbs), and Route 53 (`ChangeResourceRecordSets` + reads) statements added; `local.apply_record_names` computed local added; `OPS-13` appended to `.planning/REQUIREMENTS.md`. `tofu test` green at 14/14 on the first GREEN attempt.

## Files Created/Modified
- `infra/bootstrap/iam-github-actions.tf` — `aws_iam_role.infrastructure_apply`, `aws_iam_role_policy.infrastructure_apply` (18 statements), `local.apply_record_names`
- `infra/bootstrap/outputs.tf` — `infrastructure_apply_role_arns`
- `infra/bootstrap/tests/iam-github-actions.tftest.hcl` — `binds_each_apply_role_to_exactly_one_apply_environment`, `scopes_each_apply_role_to_its_own_environment_resources`, `forbids_escalation_actions_in_every_role_policy`, `publishes_one_apply_role_arn_per_environment`
- `.planning/REQUIREMENTS.md` — `OPS-13` bullet appended to § v2 Requirements → Operational hardening

## Decisions Made
- Applied the plan 01-01 checkpoint's naming decision (option-a) verbatim to the apply tier: `stagehand-<env>-infrastructure-apply`, per this plan's explicit instruction from the orchestrator.
- Deliberately omitted content-bucket object-level actions (`GetObject`/`PutObject`/`DeleteObject`) from the apply role — the static-site module's `tofu apply` never writes object content, only bucket-level configuration; object uploads belong to the separately-created deploy role. Confirmed by re-reading `infra/modules/static-site/s3.tf` (no object resources) versus `infra/modules/static-site/iam.tf`'s `DeployContentObjects` statement.
- Followed the plan's literal instruction for Route 53 validation-record names (exact domain plus an underscore-prefixed form) even though the real ACM validation record name carries an unpredictable hash segment this condition cannot literally match against a live request. This is RESEARCH's flagged assumption A2, authored as a backstop-only truth in the plan's `must_haves`, not converted into a stronger claim than the plan itself makes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reworded a code comment that was tripping its own acceptance-criteria grep**
- **Found during:** Task 1, acceptance-criteria grep pass
- **Issue:** A comment above `ManageSiteDeployRole` explaining the "never widen the deploy-role grant" invariant literally contained the substring `role/*`, which is exactly the string the acceptance criterion `grep -v '^#' iam-github-actions.tf | grep -c 'role/\*'` (expected `0`) checks for — the explanatory comment made its own guard fail.
- **Fix:** Reworded the comment to describe the same invariant ("never widened to the role-name wildcard") without reproducing the literal `role/*` string.
- **Files modified:** `infra/bootstrap/iam-github-actions.tf`
- **Verification:** `grep -v '^#' infra/bootstrap/iam-github-actions.tf | grep -c 'role/\*'` returns `0`.
- **Committed in:** `c788946` (GREEN commit for Task 1)

---

**Total deviations:** 1 auto-fixed (Rule 1 — the same class of self-tripping-comment bug documented in plan 01-01's own Deviation 3, now recurring for a different literal string; recognized and fixed on the same acceptance-criteria pass rather than discovered via a failing test).
**Impact on plan:** No scope creep, no change to the shipped role, policy, or output shape the plan specified.

## Issues Encountered

**Worktree fork-base staleness.** This worktree was forked from a commit (`1723320c`) that predated plan 01-01's landed commits and the entire `.planning/` tree. Per the orchestrator's explicit instructions, resolved by fast-forward-merging the worktree's branch onto the local `main` ref (`git merge main --ff-only`) before starting any task work — safe because the worktree branch had zero commits of its own beyond the shared fork point, so the merge was a pure fast-forward with no rebase or conflict risk. This brought `infra/bootstrap/iam-github-actions.tf`, `locals.tf`, the test file, and the full `.planning/` tree (including this plan's own `01-02-PLAN.md` and the prior `01-01-SUMMARY.md`) into the worktree before any Task 1 work began. No further action needed; documented here per the orchestrator's request to report the worktree path, branch, and starting SHA.

## User Setup Required
None — no external service configuration required. Nothing was applied to AWS; the six GitHub Environments and their variables remain Phase 2 work per the phase's own scope boundary.

## Next Phase Readiness
- All six infrastructure IAM roles (three plan, three apply) now exist end-to-end in `infra/bootstrap/iam-github-actions.tf`, proven by 14 passing `tofu test` runs including the phase-wide escalation-absence assertion.
- Plan 01-03 (bootstrap coverage in `scripts/check-tofu-tags.sh`) and plan 01-04 (runbook and GitHub Environment documentation, including the CloudFront unscopable-actions disclosure this plan's `T-01-09` threat-register entry names) can both proceed against this file as-is.
- `docs/operations/aws-bootstrap.md`'s Safety boundary section is untouched; no AWS apply was performed at any point in this plan — only `tofu init -backend=false`, `tofu validate`, and `tofu test` (mocked data sources, no real state backend configured for the bootstrap root as invoked here).
- No blockers.

---
*Phase: 01-infrastructure-role-ownership*
*Completed: 2026-08-26*

## Self-Check: PASSED

All modified files verified present on disk with the expected new content
(`infra/bootstrap/iam-github-actions.tf`'s `aws_iam_role.infrastructure_apply`
and `aws_iam_role_policy.infrastructure_apply`; `infra/bootstrap/outputs.tf`'s
`infrastructure_apply_role_arns`; `infra/bootstrap/tests/iam-github-actions.tftest.hcl`'s
four new `run` blocks; `.planning/REQUIREMENTS.md`'s `OPS-13` bullet; this
SUMMARY). All four task commit hashes (`1ed7a95`, `c788946`, `c3833c3`,
`ceeaf24`) verified present in `git log`.
