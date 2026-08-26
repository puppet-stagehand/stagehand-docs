---
phase: 02-first-real-publication
plan: 01
subsystem: infra
tags: [opentofu, aws, iam, s3, route53, oidc, github-actions]

requires:
  - phase: 01-infrastructure-role-ownership
    provides: infra/bootstrap/ IAM role and policy shape (aws_iam_role.infrastructure_plan/apply, their policies) that this plan applied for real for the first time
provides:
  - A real Route 53 hosted zone for puppetstagehand.com (Z00971888M7QXUPNS7H8), inert and not yet delegated by the live domain
  - Three real, private, versioned, encrypted S3 state buckets (testpilots/beta/stable)
  - The shared account-level GitHub Actions OIDC provider, now consumed via a data-source lookup instead of a colliding `resource` create
  - Six real IAM roles (three infrastructure-plan, three infrastructure-apply) with their ARNs captured for 02-02 (GitHub Environments) and 02-03 (testpilots apply)
  - docs/operations/aws-bootstrap.md updated with the hosted-zone-creation prerequisite and the OIDC data-source lookup note
affects: [02-02-github-environments, 02-03-testpilots-apply]

actuals:
  tokens: 9500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Shared account-level resources another team may already own (GitHub OIDC provider) are looked up via a `data` source, never created as a `resource` — avoids both a same-URL provider collision and importing someone else's resource into this project's state."

key-files:
  created:
    - infra/bootstrap/terraform.tfvars (gitignored, real bucket names + real hosted_zone_id, never committed)
    - infra/bootstrap/.captured-outputs.json (gitignored scratch file — real OIDC provider ARN, 3 bucket names, 6 role ARNs, hosted_zone_id)
  modified:
    - infra/bootstrap/main.tf (OIDC provider: resource -> data source)
    - infra/bootstrap/outputs.tf (github_oidc_provider_arn now reads from the data source)
    - infra/bootstrap/iam-github-actions.tf (two role trust policies' Federated principal now reference the data source)
    - infra/bootstrap/tests/bootstrap.tftest.hcl (OIDC test rewritten as a data-source lookup assertion with override_data)
    - infra/bootstrap/tests/iam-github-actions.tftest.hcl (two Federated-principal references updated to the data source)
    - .gitignore (added .captured-outputs.json)
    - docs/operations/aws-bootstrap.md (hosted-zone prerequisite, OIDC data-source note, Safety boundary updated)

key-decisions:
  - "Reused the existing Route 53 hosted zone (Z00971888M7QXUPNS7H8) created by the prior halted run instead of creating a second one."
  - "User-directed: switched infra/bootstrap's GitHub OIDC provider from an aws_iam_openid_connect_provider resource to a data source lookup, because this AWS account already has a provider for the same URL owned by an unrelated product (discocase); AWS forbids two providers per URL per account, and importing the other team's resource into this project's state was rejected."
  - "Verified out-of-band (aws iam get-open-id-connect-provider) that the existing shared provider's client_id_list already includes sts.amazonaws.com before relying on it in the role trust policies — did not modify the shared, other-team-owned resource."

patterns-established:
  - "Bootstrap-level, once-per-account shared resources that may already exist under another product's ownership: look them up with a `data` source, never `resource`."

requirements-completed: [PUB-01]

coverage:
  - id: D1
    description: "infra/bootstrap/ applied for real: 3 state buckets, 6 IAM roles (3 plan, 3 apply), all ARNs/names captured"
    requirement: PUB-01
    verification:
      - kind: other
        ref: "tofu -chdir=infra/bootstrap apply bootstrap.tfplan (30 added, 0 changed, 0 destroyed); tofu output -json infrastructure_plan_role_arns / infrastructure_apply_role_arns each returned exactly 3 keys"
        status: pass
    human_judgment: false
  - id: D2
    description: "GitHub OIDC provider collision resolved via data-source lookup, without creating a duplicate provider or importing the other team's resource"
    requirement: PUB-01
    verification:
      - kind: unit
        ref: "infra/bootstrap/tests/bootstrap.tftest.hcl#looks_up_the_shared_github_oidc_provider"
        status: pass
      - kind: unit
        ref: "infra/bootstrap/tests/iam-github-actions.tftest.hcl (all 7 runs, updated Federated principal references)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Real Route 53 hosted zone for puppetstagehand.com exists, reused (not duplicated), inert with no NS delegation change"
    requirement: PUB-01
    verification:
      - kind: other
        ref: "aws route53 list-hosted-zones-by-name --dns-name puppetstagehand.com (Z00971888M7QXUPNS7H8, unchanged Comment field)"
        status: pass
    human_judgment: false
  - id: D4
    description: "docs/operations/aws-bootstrap.md documents the hosted-zone prerequisite and reflects that bootstrap has been applied for real"
    requirement: PUB-01
    verification:
      - kind: other
        ref: "grep -c create-hosted-zone docs/operations/aws-bootstrap.md == 1"
        status: pass
    human_judgment: false
  - id: D5
    description: "Bootstrap state (infra/bootstrap/terraform.tfstate) placed in an organization-approved encrypted, access-controlled, versioned custody location, with one accountable owner designated"
    verification:
      - kind: other
        ref: "aws s3api put-object --bucket puppet-stagehand-bootstrap-state --key stagehand-docs/bootstrap/terraform.tfstate (SSE-AES256, versioned bucket, all-four public-access-block flags true); local md5 8cd612027b50aea22a6ad71cadef8da9 matched the returned S3 ETag exactly"
        status: pass
    human_judgment: true
    rationale: "User confirmed via orchestrator checkpoint: dedicated private/encrypted/versioned S3 bucket puppet-stagehand-bootstrap-state created for state custody, matches the puppet-stagehand-* naming convention. Accountable owner: Matthew Stone (matt@souldo.net), the project's sole maintainer."

duration: 20min
completed: 2026-08-26
status: complete
---

# Phase 02 Plan 01: First Real AWS Publication Bootstrap Summary

**infra/bootstrap applied for real under a confirmed non-root identity — real Route 53 hosted zone, 3 encrypted/versioned S3 state buckets, and 6 scoped IAM roles now exist in AWS, with the account's pre-existing GitHub OIDC provider consumed via a data-source lookup instead of a colliding resource.**

## Performance

- **Duration:** ~20 min (this resume session; excludes the prior halted attempt)
- **Started:** 2026-08-26T18:00:00Z (approx, this session)
- **Completed:** 2026-08-26T18:18:53Z
- **Tasks:** 3 (Task 1 pre-resolved by orchestrator; Task 2 and Task 3 completed this session)
- **Files modified:** 7 (6 tracked repo files + 1 gitignore addition)

## Accomplishments

- Resolved the GitHub OIDC provider collision per the user's decision: `infra/bootstrap/main.tf`'s `aws_iam_openid_connect_provider.github` resource is now a `data "aws_iam_openid_connect_provider" "github"` lookup, with every reference (outputs.tf, both IAM role trust policies, both affected test files) updated to match. Verified the account's existing provider (owned by an unrelated product, `discocase`) already trusts `sts.amazonaws.com` — did not touch that shared resource.
- Ran `tofu -chdir=infra/bootstrap plan`/`show`/`apply` for real. The plan showed exactly 30 resources to add (3 S3 buckets x 6 sub-resources each, 3 plan roles + policies, 3 apply roles + policies), 0 to change, 0 to destroy — no OIDC-provider create, confirming the data-source switch worked as intended. Applied cleanly: `Apply complete! Resources: 30 added, 0 changed, 0 destroyed.`
- Reused the Route 53 hosted zone (`Z00971888M7QXUPNS7H8`) the prior halted run had already created — did not create a second zone.
- Captured every output (OIDC provider ARN, 3 state bucket names, 6 role ARNs, the hosted zone ID) into a gitignored scratch file, `infra/bootstrap/.captured-outputs.json`, for 02-02 and 02-03 to consume. Added `.captured-outputs.json` to `.gitignore`.
- Deleted the saved plan file (`bootstrap.tfplan`) after apply.
- Updated `docs/operations/aws-bootstrap.md`: added the exact `aws route53 create-hosted-zone` prerequisite command before the `terraform.tfvars` copy step, a note about the OIDC data-source lookup expecting an existing provider, and updated the "Safety boundary" section to state that bootstrap has now been applied for real (while `testpilots`/`beta`/`stable` and the live domain NS cutover remain untouched).

## Task Commits

Each task was committed atomically:

1. **Task 1: Authenticate a non-root AWS identity** — pre-resolved by the orchestrator before this session (identity: `arn:aws:iam::503561411317:user/stagehand-bootstrap-operator`, confirmed non-root); no commit, no code change.
2. **Task 2 fix: OIDC provider data-source switch** (prerequisite to the real apply) — `7afd7ca` (fix)
3. **Task 2 fix: gitignore the captured-outputs scratch file** — `aaca0f3` (fix)
4. **Task 3: Runbook update** — `e381317` (docs)

Task 2's real AWS apply itself (the hosted zone reuse, 3 state buckets, 6 IAM roles) produced no additional git commit — its only repository artifacts (`terraform.tfvars`, `.captured-outputs.json`) are intentionally gitignored per the plan's design; the real deliverable is the AWS state itself, verified via `tofu output` and the AWS CLI, not a git commit.

**Plan metadata:** SUMMARY commit pending (this file).

## Files Created/Modified

- `infra/bootstrap/main.tf` — OIDC provider: `resource` → `data` source lookup
- `infra/bootstrap/outputs.tf` — `github_oidc_provider_arn` now reads `data.aws_iam_openid_connect_provider.github.arn`
- `infra/bootstrap/iam-github-actions.tf` — both role trust policies' `Federated` principal updated
- `infra/bootstrap/tests/bootstrap.tftest.hcl` — OIDC test rewritten (`looks_up_the_shared_github_oidc_provider`, using `override_data`)
- `infra/bootstrap/tests/iam-github-actions.tftest.hcl` — two `Federated` principal references updated
- `.gitignore` — added `.captured-outputs.json`
- `docs/operations/aws-bootstrap.md` — hosted-zone prerequisite, OIDC data-source note, Safety boundary update
- `infra/bootstrap/terraform.tfvars` (gitignored, not committed) — real bucket names + real `hosted_zone_id`
- `infra/bootstrap/.captured-outputs.json` (gitignored, not committed) — real captured outputs for 02-02/02-03

## Decisions Made

- **OIDC provider collision (user-directed):** switched from `resource` to `data` source rather than creating a second, colliding provider or importing the other team's resource into this project's state. See `key-decisions` in frontmatter for full rationale.
- **Hosted zone reuse:** confirmed via `aws route53 list-hosted-zones-by-name` that the prior run's zone (`Z00971888M7QXUPNS7H8`) still existed and was unchanged (same `Comment`, 2 record sets — the default NS/SOA); reused it rather than creating a duplicate.
- **IAM roles/buckets: clean slate.** Confirmed via `aws iam get-role` (all 6 roles: `NoSuchEntity`) and `aws s3api head-bucket` (all 3 buckets: `404 Not Found`) that the prior run's partial resources had in fact been fully removed before this apply, so `tofu apply` created everything fresh with no import or state reconciliation needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 4 architectural change, pre-resolved by user via resume context] OIDC provider resource → data source**
- **Found during:** Task 2 preparation (continuing from the prior halted run's blocker)
- **Issue:** `infra/bootstrap/main.tf` created `aws_iam_openid_connect_provider.github`, but this AWS account already has a provider for the same URL owned by an unrelated product; AWS rejects a second provider for the same URL.
- **Fix:** Per the user's explicit decision (delivered via `<resume_context>`, not decided by this executor), changed the resource to a `data` source lookup and updated every reference. Verified the existing provider's `client_id_list` includes `sts.amazonaws.com` before relying on it.
- **Files modified:** `infra/bootstrap/main.tf`, `infra/bootstrap/outputs.tf`, `infra/bootstrap/iam-github-actions.tf`
- **Verification:** `tofu test` — 14/14 runs passed after updating the two affected test files; `tofu plan` showed 0 OIDC-provider-related changes (no create, since it's now a lookup).
- **Committed in:** `7afd7ca`

**2. [Rule 3 - Blocking] Updated two OpenTofu test files to match the data-source switch**
- **Found during:** Task 2, running `tofu test` after the main.tf edit
- **Issue:** `bootstrap.tftest.hcl`'s `creates_one_project_tagged_github_oidc_provider` run asserted against the now-removed resource; `iam-github-actions.tftest.hcl` had two `aws_iam_openid_connect_provider.github.arn` references that would no longer resolve.
- **Fix:** Rewrote the bootstrap test as `looks_up_the_shared_github_oidc_provider` using an `override_data` block (OpenTofu 1.12 supports this); updated the two apply/plan role trust-policy assertions to reference `data.aws_iam_openid_connect_provider.github.arn`.
- **Files modified:** `infra/bootstrap/tests/bootstrap.tftest.hcl`, `infra/bootstrap/tests/iam-github-actions.tftest.hcl`
- **Verification:** `tofu test` — `Success! 14 passed, 0 failed.`
- **Committed in:** `7afd7ca`

**3. [Rule 3 - Blocking] Added `.captured-outputs.json` to `.gitignore`**
- **Found during:** Task 2, after apply, checking `git status` before writing captured outputs
- **Issue:** The plan requires the captured-outputs scratch file to be gitignored (never committed, since it holds real ARNs and bucket names); it wasn't covered by any existing `.gitignore` pattern.
- **Fix:** Added `.captured-outputs.json` to `.gitignore`.
- **Files modified:** `.gitignore`
- **Verification:** `git status --short --ignored infra/bootstrap/` showed the file under `!!` (ignored) after the change.
- **Committed in:** `aaca0f3`

---

**Total deviations:** 3 auto-fixed (1 pre-resolved architectural per explicit user decision, 2 blocking)
**Impact on plan:** All three were necessary to complete Task 2 as designed; none expanded scope beyond what the plan and the user's resume-context decision already specified.

## Issues Encountered

None beyond the deviations documented above. `aws sts get-caller-identity`, the hosted-zone lookup, and the OIDC provider `client_id_list` check all confirmed the resume context's stated facts exactly (zone still live and unchanged, provider already trusts `sts.amazonaws.com`, IAM permission widening from the orchestrator was sufficient — no further `AccessDenied` encountered anywhere in this apply).

## User Setup Required

**One item remains before this plan can be marked fully complete — see "Next Phase Readiness" below.** No environment variables or dashboard configuration; this is exclusively the state-custody confirmation the plan's Task 3 requires.

## Next Phase Readiness

**Ready for 02-02 (GitHub Environments) and 02-03 (testpilots apply):** every output they need — `github_oidc_provider_arn`, the 3 `state_bucket_names`, and the 6 role ARNs in `infrastructure_plan_role_arns`/`infrastructure_apply_role_arns` — is captured in `infra/bootstrap/.captured-outputs.json` (gitignored) and was also printed to this session's log for the orchestrator to relay.

**One blocker remains — a human-only confirmation this executor cannot perform or verify:** Task 3's `<verify><human-check>` requires confirming that `infra/bootstrap/terraform.tfstate` has been copied to the organization's approved encrypted, access-controlled, versioned custody location, and that one accountable owner has been designated for it (threat register T-02-04). This executor has no credentials for, or knowledge of, that external custody system, so it cannot perform or verify this step. `infra/bootstrap/terraform.tfstate` currently exists only on this worktree's local disk (gitignored, not committed — as designed, since bootstrap has no remote backend of its own).

**Resolved by orchestrator (post-executor):** the user confirmed a dedicated private/encrypted/versioned S3 bucket, `puppet-stagehand-bootstrap-state`, for state custody. The orchestrator created it (versioning enabled, SSE-AES256, all four public-access-block flags true) and uploaded `infra/bootstrap/terraform.tfstate` to `s3://puppet-stagehand-bootstrap-state/stagehand-docs/bootstrap/terraform.tfstate`, verifying the upload's ETag matched the local file's MD5 exactly (`8cd612027b50aea22a6ad71cadef8da9`). Accountable owner: Matthew Stone (matt@souldo.net), the project's sole maintainer. This plan's success criteria are now fully met with no further code or infrastructure changes required.

This SUMMARY is marked `status: complete` — every task, verification, and acceptance criterion in the plan is done and confirmed, including the state-custody human-check.

---
*Phase: 02-first-real-publication*
*Completed: 2026-08-26*

## Self-Check: PASSED

- FOUND: infra/bootstrap/main.tf
- FOUND: infra/bootstrap/outputs.tf
- FOUND: infra/bootstrap/iam-github-actions.tf
- FOUND: docs/operations/aws-bootstrap.md
- FOUND: .gitignore
- FOUND commit: 7afd7ca
- FOUND commit: aaca0f3
- FOUND commit: e381317
