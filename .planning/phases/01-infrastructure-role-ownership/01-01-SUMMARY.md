---
phase: 01-infrastructure-role-ownership
plan: 01
subsystem: infra
tags: [opentofu, iam, github-oidc, s3-backend, tofu-test]

# Dependency graph
requires: []
provides:
  - "infra/bootstrap/locals.tf: required_tags, github_repository, site (the single for_each source for all six infrastructure roles)"
  - "aws_iam_role.infrastructure_plan / aws_iam_role_policy.infrastructure_plan, one per Stagehand environment"
  - "infrastructure_plan_role_arns bootstrap output, keyed by Stagehand environment"
  - "the tofu test skeleton (mock_data caller_identity/partition, no mock_resource aws_s3_bucket) that plan 01-02 extends for the apply role"
affects: ["01-02 (infrastructure apply roles)", "01-03 (check-tofu-tags.sh bootstrap coverage)", "01-04 (runbook and GitHub Environment docs)"]

# Actuals (#2632)
actuals:
  tokens: 4033
  tasks: 1
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single for_each map (local.site) as the one source of truth for all per-environment infrastructure role resources"
    - "Exact-JSON jsondecode(x) == {...} assertions for IAM policy documents, never substring matching"
    - "tofu test mock_data for data sources only, deliberately no mock_resource for the resource whose per-instance scoping is under test"

key-files:
  created:
    - infra/bootstrap/locals.tf
    - infra/bootstrap/iam-github-actions.tf
    - infra/bootstrap/tests/iam-github-actions.tftest.hcl
  modified:
    - infra/bootstrap/variables.tf
    - infra/bootstrap/outputs.tf
    - infra/bootstrap/terraform.tfvars.example
    - infra/bootstrap/tests/bootstrap.tftest.hcl

key-decisions:
  - "Checkpoint resolved by user: IAM role naming scheme is option-a, stagehand-<env>-infrastructure-plan / stagehand-<env>-infrastructure-apply (parallels the shipped stagehand-<env>-site-deploy convention)."
  - "tofu test's mock provider generates the same placeholder for a computed attribute across every instance of a for_each'd resource, and override_resource cannot target a single for_each instance in OpenTofu 1.12.6 -- confirmed empirically. Test 5's literal 'three distinct ARN values' sub-assertion was adapted to assert distinct role names (a genuinely known, non-mocked value) instead of distinct mocked ARN strings, while keeping the per-key ARN-equality assertion that proves correct wiring."

patterns-established:
  - "Read-only plan-role permission policy: three fixed-position state statements (ListStateBucket, ReadStateAndLock, HoldStateLock) followed by enumerated (never wildcarded) read-only site statements scoped by ARN or name prefix."

requirements-completed: [INFRA-01, INFRA-02, INFRA-04, GATE-01]

coverage:
  - id: D1
    description: "Three aws_iam_role.infrastructure_plan instances exist, one per Stagehand environment, each with a single-statement trust policy naming exactly one -plan GitHub Environment subject and the pinned sts.amazonaws.com audience"
    requirement: "INFRA-01"
    verification:
      - kind: unit
        ref: "infra/bootstrap/tests/iam-github-actions.tftest.hcl#binds_each_plan_role_to_exactly_one_plan_environment"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each plan role's permission policy reaches only its own state bucket, its own state and lock objects, and read-only site actions scoped by ARN or name prefix; no plan role holds put authority on the terraform.tfstate key"
    requirement: "INFRA-02"
    verification:
      - kind: unit
        ref: "infra/bootstrap/tests/iam-github-actions.tftest.hcl#scopes_each_plan_role_to_its_own_state_and_lock_object"
        status: pass
    human_judgment: false
  - id: D3
    description: "infrastructure_plan_role_arns is a bootstrap output keyed by the three Stagehand environments, each value equal to the matching plan role's own ARN"
    requirement: "INFRA-04"
    verification:
      - kind: unit
        ref: "infra/bootstrap/tests/iam-github-actions.tftest.hcl#publishes_one_plan_role_arn_per_environment"
        status: pass
    human_judgment: false
  - id: D4
    description: "tofu -chdir=infra/bootstrap test reports the 7 pre-existing runs still passing alongside the 3 new runs, 10 passed / 0 failed; tofu fmt -check and tofu validate both clean; no AWS resource created"
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

# Phase 01 Plan 01: Infrastructure Plan Roles Summary

**Three `stagehand-<env>-infrastructure-plan` IAM roles wired end-to-end from a single `for_each` local through a state-scoped, read-only permission policy to a published `tofu test`-proven bootstrap output.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-26
- **Tasks:** 1 (tracer, TDD)
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- Three infrastructure plan IAM roles (`stagehand-testpilots-infrastructure-plan`, `stagehand-beta-infrastructure-plan`, `stagehand-stable-infrastructure-plan`), each trusting exactly one `-plan` GitHub Environment OIDC subject with the audience pinned to `sts.amazonaws.com`
- Read-only permission policy per role: state bucket list, state+lock read, lock put/delete only (never `terraform.tfstate` itself), plus enumerated read-only S3/CloudFront/ACM/Route 53/IAM access scoped to that environment's own resources
- `infrastructure_plan_role_arns` bootstrap output, keyed by Stagehand environment, mirroring the existing `state_bucket_names` output shape
- New required `hosted_zone_id` variable, wired into `terraform.tfvars.example` with the agreed placeholder and into the existing `bootstrap.tftest.hcl` variables preamble without disturbing the 7 pre-existing runs
- 3 new `tofu test` runs (10 total, 0 failed) proving the trust policy, the state/lock scoping, and the published output end to end

## Task Commits

Task 1 followed the plan's RED/GREEN split (tdd="true"):

1. **RED — write the failing test** - `7f614cf` (test): `infra/bootstrap/tests/iam-github-actions.tftest.hcl` created and confirmed to fail with "Reference to undeclared resource" (not a syntax error) before any resource existed; `bootstrap.tftest.hcl`'s variables preamble extended with `hosted_zone_id`.
2. **GREEN — implement the plan roles** - `c44e486` (feat): `locals.tf` and `iam-github-actions.tf` created; `variables.tf`, `outputs.tf`, `terraform.tfvars.example` extended. `tofu test` green at 10/10.

## Files Created/Modified
- `infra/bootstrap/locals.tf` - `required_tags`, `github_repository`, and the `site` map (single `for_each` source for all six future infrastructure roles)
- `infra/bootstrap/iam-github-actions.tf` - `data.aws_caller_identity.current`, `data.aws_partition.current`, `aws_iam_role.infrastructure_plan`, `aws_iam_role_policy.infrastructure_plan`
- `infra/bootstrap/tests/iam-github-actions.tftest.hcl` - `binds_each_plan_role_to_exactly_one_plan_environment`, `scopes_each_plan_role_to_its_own_state_and_lock_object`, `publishes_one_plan_role_arn_per_environment`
- `infra/bootstrap/variables.tf` - `github_repository`, `hosted_zone_id` (both with `validation` blocks)
- `infra/bootstrap/outputs.tf` - `infrastructure_plan_role_arns`
- `infra/bootstrap/terraform.tfvars.example` - `hosted_zone_id` placeholder entry
- `infra/bootstrap/tests/bootstrap.tftest.hcl` - added `hosted_zone_id` to the shared `variables` preamble

## Decisions Made
- **Checkpoint (resolved by user before this continuation):** role naming scheme is `stagehand-<env>-infrastructure-plan` / `stagehand-<env>-infrastructure-apply` (option-a), parallel to the shipped `stagehand-<env>-site-deploy` convention. Applied verbatim to `aws_iam_role.infrastructure_plan`'s `name` attribute.
- Kept the account-global `required_tags = { project = "stagehand" }` shape separate from the per-environment `merge(local.required_tags, { environment = each.key })` shape used at each per-environment resource, per Pitfall 5 in the phase research — this is why the two tag-shape regression runs in `bootstrap.tftest.hcl` stayed green.
- Site read-only permission statements were enumerated (never wildcarded) per the researcher's recommendation, split into one `Sid`-labelled statement per AWS service/concern (S3, CloudFront distribution, CloudFront cache/response-headers/OAC, CloudFront function, ACM, Route 53 zone, Route 53 changes, IAM deploy role, STS) so a future audit or diff can see exactly which service each grant belongs to.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a type-inconsistent ternary in the test file's Action/Resource normalization**
- **Found during:** Task 1, GREEN verification (`tofu test`)
- **Issue:** The draft test used `can(tolist(statement.Action)) ? statement.Action : [statement.Action]` to normalize a JSON `Action`/`Resource` value that may be a bare string or a list. OpenTofu's HCL evaluator requires both branches of a conditional to share a unifiable type; a `tuple` of length 2 vs. a `tuple` of length 1 (or `string` vs. `tuple`) are not unifiable, so every statement whose `Action`/`Resource` differed in shape from the wrapped fallback failed with "Inconsistent conditional result types."
- **Fix:** Replaced the ternary with `flatten([statement.Action])` (and the `Resource` equivalent), which uniformly normalizes both a bare string and a list into a flat list of strings without a type-unification conflict.
- **Files modified:** `infra/bootstrap/tests/iam-github-actions.tftest.hcl`
- **Verification:** `tofu -chdir=infra/bootstrap test` — the affected run passed cleanly afterward.
- **Committed in:** `c44e486` (GREEN commit; the test file was still uncommitted at this point, having only been committed in its unfixed RED form)

**2. [Rule 1 - Bug] Adapted Test 5's "three distinct ARN values" assertion to a mock-testing constraint**
- **Found during:** Task 1, GREEN verification
- **Issue:** The plan's `<behavior>` spec for `publishes_one_plan_role_arn_per_environment` calls for asserting `output.infrastructure_plan_role_arns` has "three distinct values." Empirically confirmed (via a throwaway debug test file, since removed) that OpenTofu 1.12.6's `mock_provider` generates the *same* placeholder string for a computed attribute (`aws_iam_role.arn`) across every instance of a `for_each`'d resource, regardless of the `for_each` key — and `override_resource` explicitly refuses to target a single `for_each` instance ("Resource instance address with keys is not allowed"), so there is no mechanism to force genuinely distinct mocked ARNs per environment under `command = plan`. (`command = apply` was also tried and rejected: the mock apply attempts to destroy the `prevent_destroy`-protected state buckets during test cleanup and leaves an `errored_test.tfstate` file behind — incompatible with the plan's own acceptance criterion that every run uses `command = plan` and mutates no shared state.)
- **Fix:** Kept the per-key ARN-equality assertion (`arn == aws_iam_role.infrastructure_plan[e].arn` for every `e`) and the exact-3-keys assertion in `publishes_one_plan_role_arn_per_environment` unchanged. Added an explicit `length(distinct([for role in aws_iam_role.infrastructure_plan : role.name])) == 3` assertion to `binds_each_plan_role_to_exactly_one_plan_environment` instead — `role.name` is a genuinely known (non-computed, non-mocked) value derived from `each.key`, so it is a mechanically verifiable proxy for "three distinct role identities, one per environment." A code comment in the test file documents why the raw-ARN distinctness check was not implemented literally. In a real `tofu apply`, the three ARNs are trivially distinct because the three role names are distinct — this is a mock-testing-only limitation, not a production correctness gap.
- **Files modified:** `infra/bootstrap/tests/iam-github-actions.tftest.hcl`
- **Verification:** `tofu -chdir=infra/bootstrap test` — 10 passed, 0 failed.
- **Committed in:** `c44e486`

**3. [Rule 1 - Bug] Reworded a test-file comment that was tripping its own mechanical acceptance check**
- **Found during:** Task 1, acceptance-criteria grep pass
- **Issue:** The comment explaining why no `mock_resource "aws_s3_bucket"` block was added literally contained the substring `mock_resource "aws_s3_bucket"`, which is exactly the string the acceptance criterion `grep -c 'mock_resource "aws_s3_bucket"' ... returns 0` checks for — the explanatory comment made its own guard fail.
- **Fix:** Reworded the comment to describe the same intent ("no mock resource block for the state bucket type") without reproducing the literal HCL block-header string.
- **Files modified:** `infra/bootstrap/tests/iam-github-actions.tftest.hcl`
- **Verification:** `grep -c 'mock_resource "aws_s3_bucket"' infra/bootstrap/tests/iam-github-actions.tftest.hcl` returns `0`.
- **Committed in:** `c44e486`

---

**Total deviations:** 3 auto-fixed (all Rule 1 — bugs found and fixed during the plan's own RED/GREEN verification loop, none architectural).
**Impact on plan:** All three fixes were necessary to make the plan's own acceptance criteria and `<behavior>` spec mechanically satisfiable under OpenTofu 1.12.6's actual test-mocking behavior. No scope creep; no change to the shipped role, policy, or output shape the plan specified.

## Issues Encountered
- OpenTofu 1.12.6's `mock_provider` generates identical placeholder values for a computed attribute across all instances of a `for_each`'d resource (confirmed empirically), and `override_resource` cannot target a keyed instance. This is documented above as Deviation 2; no further action needed in this plan. Plan 01-02 (apply roles) and any later phase writing similar per-instance ARN-distinctness assertions should reuse the role-name-distinctness pattern rather than re-discovering this limitation.

## User Setup Required
None — no external service configuration required. Nothing was applied to AWS; the six GitHub Environments and their variables remain Phase 2 work per the phase's own scope boundary.

## Next Phase Readiness
- The `for_each`-over-`local.site` shape, the trust-policy shape, the symbolic state-bucket ARN reference, the exact-JSON assertion idiom with mocked data sources, and the output comprehension are all now proven on the plan-role family. Plan 01-02 (infrastructure apply roles) can build the mirrored `aws_iam_role.infrastructure_apply` / `aws_iam_role_policy.infrastructure_apply` resources on top of this skeleton using the same patterns.
- `infra/bootstrap/iam-github-actions.tf` currently defines only the plan-role resources; the apply-role resources listed in the plan's `<artifacts_this_phase_produces>` (`aws_iam_role.infrastructure_apply`, `aws_iam_role_policy.infrastructure_apply`, `infrastructure_apply_role_arns` output, and the three apply-role test runs) are explicitly out of scope for this plan and remain for 01-02.
- No blockers. `docs/operations/aws-bootstrap.md`'s Safety boundary section is untouched; no AWS apply was performed at any point in this plan (a mock `command = apply` test run was attempted only as a debug probe against the disposable OpenTofu test-mock backend, immediately reverted, and never touched real AWS).

---
*Phase: 01-infrastructure-role-ownership*
*Completed: 2026-08-26*

## Self-Check: PASSED

All created files verified present on disk (`infra/bootstrap/locals.tf`,
`infra/bootstrap/iam-github-actions.tf`,
`infra/bootstrap/tests/iam-github-actions.tftest.hcl`, this SUMMARY). All
three commit hashes (`7f614cf`, `c44e486`, `3344507`) verified present in
`git log`.
