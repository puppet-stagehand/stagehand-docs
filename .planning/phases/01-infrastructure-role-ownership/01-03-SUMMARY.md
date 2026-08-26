---
phase: 01-infrastructure-role-ownership
plan: 03
subsystem: infra
tags: [opentofu, tagging, policy-gate, shell]

# Dependency graph
requires:
  - phase: 01-01
    provides: "infra/bootstrap/locals.tf's local.required_tags, the account-global/per-environment tag shape distinction this plan sources from"
  - phase: 01-02
    provides: "the merge(local.required_tags, { environment = each.key }) form already used by all six infrastructure roles in iam-github-actions.tf, matched exactly so one regex covers the whole root"
provides:
  - "infra/bootstrap/main.tf: both inline tag literals replaced with expressions sourced from local.required_tags"
  - "scripts/check-tofu-tags.sh: bootstrap_dir coverage — a conformance rule for the two legitimate bootstrap tag shapes, a positive rule asserting providers.tf's default_tags carries project and no fabricated environment key, and a corrected final success message"
affects: ["01-04 (runbook and GitHub Environment docs)"]

# Actuals (#2632)
actuals:
  tokens: 647
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two legitimate bootstrap tag shapes enforced by one negative-lookahead ripgrep rule: bare local.required_tags (account-global) or merge(local.required_tags, { environment = each.key }) (per-environment) — anything else in a *.tf file under the root is an offence"
    - "providers.tf excluded from the resource-tag rule via a ripgrep glob and covered instead by a dedicated positive rule (brace-walking awk, matching the existing environment-provider idiom) asserting its default_tags block carries project and no fabricated environment key"

key-files:
  created: []
  modified:
    - infra/bootstrap/main.tf
    - scripts/check-tofu-tags.sh

key-decisions:
  - "Kept the two tag shapes syntactically distinct rather than collapsing to one map, per the plan's explicit instruction and Pitfall 5 in RESEARCH.md — aws_s3_bucket.state (per-environment) uses merge(local.required_tags, { environment = each.key }); aws_iam_openid_connect_provider.github (account-global) uses bare local.required_tags. Both pre-existing exact-equality tftest.hcl runs stayed green unchanged, proving the refactor changed no rendered tag value."
  - "providers.tf is excluded from the new bootstrap resource-tag rule via a ripgrep glob rather than loosened to also match its default_tags shape — its tags block is provider configuration (defence in depth), not a resource tag, and coverage is preserved by a separate positive rule rather than dropped."

patterns-established:
  - "Positive assertion for account-global provider defaults: rather than excluding a known-different-shaped block and leaving it unchecked, pair the exclusion with its own rule asserting the specific shape that block must have."

requirements-completed: [INFRA-06, GATE-01]

coverage:
  - id: D1
    description: "Bootstrap resources carry their mandatory tags through the shared required_tags local rather than ad-hoc literals: aws_s3_bucket.state (per-environment) uses merge(local.required_tags, { environment = each.key }); aws_iam_openid_connect_provider.github (account-global) uses bare local.required_tags"
    requirement: "INFRA-06"
    verification:
      - kind: unit
        ref: "infra/bootstrap/tests/bootstrap.tftest.hcl#creates_private_encrypted_versioned_state_buckets, #creates_one_project_tagged_github_oidc_provider"
        status: pass
      - kind: manual
        ref: "grep -c 'local.required_tags' infra/bootstrap/main.tf == 2; grep -cE '^[[:space:]]*project[[:space:]]*=[[:space:]]*\"stagehand\"' infra/bootstrap/main.tf == 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "scripts/check-tofu-tags.sh covers the bootstrap root and exits 0, and its final success message names every directory it actually inspected"
    requirement: "INFRA-06"
    verification:
      - kind: unit
        ref: "./scripts/check-tofu-tags.sh | tail -1 | grep -c bootstrap == 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "The tag rule is demonstrably capable of failing: introducing one non-conforming tags assignment in infra/bootstrap makes the checker exit 1 and name the offending file and line, then exit 0 again after revert"
    requirement: "INFRA-06"
    verification:
      - kind: manual
        ref: "Recorded negative proof, executed this session (see Negative Proof section below)"
        status: pass
    human_judgment: false
  - id: D4
    description: "tofu -chdir=infra/bootstrap test — 14 passed, 0 failed, including both pre-existing tag regression runs; tofu fmt -check and tofu validate both clean"
    requirement: "GATE-01"
    verification:
      - kind: unit
        ref: "tofu -chdir=infra/bootstrap test (command invocation)"
        status: pass
    human_judgment: false
duration: ~20min
completed: 2026-08-26
status: complete
---

# Phase 01 Plan 03: Bootstrap Tag Coverage Summary

**Bootstrap's two inline tag literals now source from `local.required_tags`, and `scripts/check-tofu-tags.sh` gained bootstrap-root coverage with a demonstrably-failing rule and a success message that names every directory it inspects.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-26
- **Tasks:** 2 (both `type="auto"`)
- **Files modified:** 2

## Accomplishments
- `infra/bootstrap/main.tf`'s two inline tag literals replaced: `aws_s3_bucket.state` (per-environment) now uses `merge(local.required_tags, { environment = each.key })`, matching the exact form the six infrastructure IAM roles already use; `aws_iam_openid_connect_provider.github` (account-global) now uses bare `local.required_tags`
- Both pre-existing exact-equality tag regression runs (`creates_private_encrypted_versioned_state_buckets`, `creates_one_project_tagged_github_oidc_provider`) stayed green unchanged, proving the refactor changed no rendered tag value
- `scripts/check-tofu-tags.sh` extended with a `bootstrap_dir` variable, a conformance rule accepting exactly the two legitimate bootstrap tag shapes (bare local or the environment-merge form) and rejecting anything else in a `*.tf` file under the root, and a positive rule asserting `providers.tf`'s `default_tags` block carries `project` and no fabricated `environment` key
- Final success message corrected to name the bootstrap root: `Verified OpenTofu tag policy for infra/bootstrap, testpilots, beta, and stable.`
- The existing environment-provider rule, module rule, and `expected_environments` value are byte-identical (confirmed by `git diff`) — only additive changes
- Negative proof executed and recorded (see below): the new rule demonstrably fails on a deliberately introduced violation, naming the offending file and line, and returns to a clean pass after revert

## Task Commits

1. **Task 1** — `ddccb33` (feat): `infra/bootstrap/main.tf`'s two inline tag literals replaced with `local.required_tags`-sourced expressions. `tofu -chdir=infra/bootstrap test` green at 14/14 (no test count change — this task only altered rendered values, which the two pre-existing exact-equality runs already asserted).
2. **Task 2** — `e1f6655` (feat): `scripts/check-tofu-tags.sh` extended with `bootstrap_dir`, the bootstrap conformance rule, the `providers.tf` positive rule, and the corrected success message. `sh -n`, a clean-tree run, `tofu fmt -check`, and `tofu -chdir=infra/bootstrap test` all green.

## Files Created/Modified
- `infra/bootstrap/main.tf` — two inline tag literals replaced with `local.required_tags`-sourced expressions (no other change)
- `scripts/check-tofu-tags.sh` — `bootstrap_dir` variable, bootstrap resource-tag rule, `providers.tf` positive `default_tags` rule, corrected final success message

## Negative Proof (recorded per plan instruction)

Executed this session, not committed:

1. Temporarily replaced `infra/bootstrap/main.tf:79`'s `tags = local.required_tags` with an inline `{ project = "stagehand" }` literal.
2. Ran `./scripts/check-tofu-tags.sh` — **exited 1**, stderr:
   ```
   infra/bootstrap/main.tf:79:  tags = {: bootstrap tags must use local.required_tags or merge(local.required_tags, { environment = each.key })
   ```
3. Reverted the change. Ran `./scripts/check-tofu-tags.sh` again — **exited 0**, stdout:
   ```
   Verified OpenTofu tag policy for infra/bootstrap, testpilots, beta, and stable.
   ```
4. As an additional check (not required by the plan's mechanical acceptance criteria, but a direct proof of the `providers.tf` positive rule), temporarily added a fabricated `environment = "bogus"` key inside `providers.tf`'s `default_tags.tags` block. `./scripts/check-tofu-tags.sh` **exited 1**, stderr:
   ```
   infra/bootstrap/providers.tf: default_tags block must carry project=stagehand and no fabricated environment key
   ```
   Reverted; script exited 0 again with the same success message as step 3.

Neither temporary change was committed. `git status --short` was clean before each edit and confirmed clean again after each revert.

## Decisions Made
- Kept the two tag shapes syntactically distinct per the plan's explicit instruction and RESEARCH.md's Pitfall 5, rather than collapsing to a single map — collapsing would break one of the two pre-existing exact-equality test assertions, and which one breaks depends on which shape is picked.
- Excluded `providers.tf` from the new resource-tag rule via a ripgrep glob (`--glob '!providers.tf'`) rather than loosening the rule's regex to also match its nested `tags = {` shape — its `default_tags` block is provider configuration (defence in depth), not a resource tag. Paired the exclusion with a dedicated positive rule so the exclusion removes a false positive without removing coverage, per the plan's explicit instruction and threat T-01-19's mitigation.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' acceptance criteria were met on the first implementation pass; no auto-fixes were needed.

## Issues Encountered

None. `tofu init -backend=false` was required before `tofu validate`/`tofu test` would run (the provider plugin cache was empty in this worktree) — this is standard OpenTofu setup, not a plan deviation, and is not itself a change to any tracked file.

## User Setup Required
None — no external service configuration required. Nothing was applied to AWS.

## Next Phase Readiness
- `infra/bootstrap/main.tf` and `scripts/check-tofu-tags.sh` are both in their final Phase 1 shape for this plan's scope. Plan 01-04 (runbook and GitHub Environment documentation) can proceed independently — this plan touched no documentation files.
- The bootstrap root is now the only OpenTofu directory in the repository whose tags nothing checked no longer describes the state of the tree: `scripts/check-tofu-tags.sh` now inspects `infra/bootstrap`, `infra/environments/{testpilots,beta,stable}`, and `infra/modules/static-site`.
- No blockers.

---
*Phase: 01-infrastructure-role-ownership*
*Completed: 2026-08-26*

## Self-Check: PASSED

`infra/bootstrap/main.tf` and `scripts/check-tofu-tags.sh` both verified present
on disk with their expected content (`grep -c 'local.required_tags'
infra/bootstrap/main.tf` returns 2; `grep -c 'bootstrap_dir'
scripts/check-tofu-tags.sh` returns 3). Both task commit hashes (`ddccb33`,
`e1f6655`) verified present in `git log --oneline -3`.
