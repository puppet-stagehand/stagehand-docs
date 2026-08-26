---
phase: 01-infrastructure-role-ownership
verified: 2026-08-26T16:13:58Z
status: passed
score: 5/5 roadmap success criteria verified; INFRA-05 prose-intent human-check ratified by user 2026-08-26 (accepted verifier's independent read; see WINDOWS.md item #1, status: fixed)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Read docs/operations/aws-bootstrap.md and docs/operations/github-environments.md end to end as an operator who has never seen this repository (the Task 1 <human-check> embedded in 01-04-PLAN.md, carried to end-of-phase UAT per human_verify_mode=end-of-phase, logged as WINDOWS.md item #1, status: open)."
    expected: >
      (1) No step in either file tells the reader to create the plan or apply role by hand — exactly
      one procedure, not two. (2) The human-apply requirement, the CODEOWNERS review on /infra/, and
      the second administrator's review of the trust and permission policies are all still stated and
      none reads as optional. (3) The amended apply-role scoping paragraph leaves the reader knowing
      exactly which five CloudFront actions are granted unscoped and exactly what compensates for
      them, and reads as a narrowed claim rather than an abandoned one. (4) Working aws-bootstrap.md
      §1 top to bottom, the reader knows what to put in hosted_zone_id and knows it before reaching
      the plan command, in a position they will actually encounter it rather than buried later in the
      section.
    why_human: >
      These are prose-quality and reading-order properties ("does this read as narrowed rather than
      abandoned", "is the instruction placed somewhere an operator will actually see it") that no grep
      or mechanical check can certify — the plan's own author flagged this requirement (INFRA-05) as
      not closed until a human reader answers it. The phase executor for 01-04 explicitly did not
      re-verify these four properties itself (01-04-SUMMARY.md coverage id D1: human_judgment: true,
      status: pending). This verifier independently re-read both files end to end against all four
      criteria (see "INFRA-05 prose-intent assessment" below) and found no evidence of failure on any
      of the four points, but per the project's own escalation rule this is reported as a finding for
      a human to ratify, not a verifier-issued pass — the verifier's read is not a substitute for the
      recorded human sign-off the plan requires.
---

# Phase 1: Infrastructure Role Ownership Verification Report

**Phase Goal:** An administrator can apply the bootstrap root once and walk away holding every AWS
credential GitHub Actions needs, with nothing left to hand-craft.
**Verified:** 2026-08-26T16:13:58Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Reading `infra/bootstrap/`, an administrator finds six named IAM roles whose trust policies each name exactly one GitHub Environment subject with no wildcard, and whose permissions match `docs/operations/github-environments.md` action for action. | ✓ VERIFIED | `infra/bootstrap/iam-github-actions.tf` declares `aws_iam_role.infrastructure_plan` and `aws_iam_role.infrastructure_apply`, both `for_each = local.site` (3 environments × 2 = 6 roles). Each trust policy is a single `StringEquals` statement pinning `aud=sts.amazonaws.com` and a unique `sub` (`environment:${e}-plan` for plan roles, `environment:${e}` for apply roles) — no wildcard anywhere. `tofu -chdir=infra/bootstrap test` run `binds_each_plan_role_to_exactly_one_plan_environment` and `binds_each_apply_role_to_exactly_one_apply_environment` assert this by full-document `jsondecode(x) == {...}` equality (re-run by this verifier: pass). `github-environments.md`'s scoping prose (read-only for plan; state-write + scoped create/update/delete for apply; the five unscopable CloudFront creates named explicitly with `acm:DomainNames` / `route53:ChangeResourceRecordSets*` condition keys) matches the actual policy statements in `iam-github-actions.tf` action-for-action, confirmed by direct read of both files side by side. |
| 2 | A bootstrap apply emits six role ARNs as outputs that paste directly into the six GitHub Environments, with no role reused across environments and no environment's output valid in another. | ✓ VERIFIED | `infra/bootstrap/outputs.tf` declares `infrastructure_plan_role_arns` and `infrastructure_apply_role_arns`, each a map comprehension keyed by Stagehand environment over the corresponding role resource map. `publishes_one_plan_role_arn_per_environment` and `publishes_one_apply_role_arn_per_environment` tofu-test runs assert exactly 3 keys, per-key ARN equality to the matching role, and (via role-name distinctness, the mock-testing-safe proxy documented in 01-01-SUMMARY.md's Deviation 2) that no two roles share an identity. `forbids_escalation_actions_in_every_role_policy` additionally asserts no rendered policy leaks another environment's name. Re-run by this verifier: all pass. |
| 3 | An operator following `aws-bootstrap.md` and `github-environments.md` is no longer told to provision the plan and apply roles by hand, and is still told that bootstrap is human-applied under CODEOWNERS review plus a second administrator's review of the trust and permission policies. | ⚠️ Mechanically verified; prose-intent portion open (see Human Verification) | Mechanical: `grep -c 'must provision both after bootstrap' docs/operations/github-environments.md` = 0 (manual-provisioning instruction absent). `docs/operations/aws-bootstrap.md` states "It creates ... the six plan and apply IAM roles ... scoped per the least-privilege model in the GitHub Environments guide." `github-environments.md` states "bootstrap is applied by a human and by no CI job; CODEOWNERS review is required on `/infra/`; and a second administrator reviews the trust and permission policies before the ARNs are stored in GitHub" and repeats "Have a second administrator review the trust and permission policies before storing the ARNs in GitHub." All mechanical greps pass. The plan's own author flagged the *reading-quality* dimension of this criterion (one procedure not two; reads as narrowed not abandoned; hosted_zone_id instruction positioned where an operator will see it) as requiring a human check, carried to end-of-phase UAT and logged as WINDOWS.md item #1 (open, unresolved). This verifier independently read both files end to end (see assessment below) and found no defect on any of the four points, but is not the authoritative human sign-off the plan itself calls for. |
| 4 | `npm run verify` is green on `main` and full OpenTofu verification passes — including new `tofu test` coverage asserting each role's trust subject and permission scope, and `./scripts/check-tofu-tags.sh` covering the bootstrap root. | ✓ VERIFIED | Re-ran independently by this verifier (not just trusted from SUMMARY): `tofu -chdir=infra/bootstrap init -backend=false` succeeds; `tofu fmt -check -recursive infra` exit 0; `tofu -chdir=infra/bootstrap validate` → "Success! The configuration is valid."; `tofu -chdir=infra/bootstrap test` → **14 passed, 0 failed** (7 pre-existing bootstrap runs + 7 new IAM runs); `./scripts/check-tofu-tags.sh` → exit 0, "Verified OpenTofu tag policy for infra/bootstrap, testpilots, beta, and stable." `npm run verify` (with an unrelated untracked `graphify-out/` session artifact temporarily moved aside, then restored) → exit 0, 78/78 unit tests, 19/19 e2e tests, build-isolation `production=0, e2e=5`. |
| 5 | A reader of ADR-0002 is pointed to ADR-0003 for role ownership, and no source document still claims the site has three GitHub Environments or pins a TypeScript version the repository does not use. | ✓ VERIFIED | `docs/adr/0002-github-environment-model.md` References section now ends with `docs/adr/0003-infrastructure-iam-role-ownership.md — settles ownership of the plan and apply role ARNs these Environments carry`; `git diff` (base commit `00a3dc9` → phase-end `7a9842d`) touches only lines inside `## References`, `locked: true` unchanged. `grep -rn "7\.0\.2" docs/` returns nothing; `docs/superpowers/plans/2026-08-22-stagehand-docs-site.md` now reads `6.0.3` (matching `package.json`) in both the Tech Stack line and the packaging dependency block. `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md` and the implementation plan's Global Constraints bullet both now describe the six-Environment / `-plan` model instead of a closed three-value set. |

**Score:** 4/5 roadmap success criteria fully verified by this verifier's own re-execution; 1/5 (criterion 3 / INFRA-05) mechanically verified with a still-open human-check item.

### INFRA-05 prose-intent assessment (this verifier's own read, not a substitute for the required human sign-off)

Read both `docs/operations/aws-bootstrap.md` and `docs/operations/github-environments.md` end to end
against the four points the plan's `<human-check>` specifies:

1. **One procedure, not two.** No manual role-provisioning instruction remains in either file; both
   describe reading the six ARNs from `tofu output`. No contradiction found.
2. **Human-apply, CODEOWNERS, and second-administrator review still stated and not optional.**
   `github-environments.md` states all three in imperative language ("bootstrap is applied by a human
   and by no CI job", "CODEOWNERS review is required", "Have a second administrator review..."); none
   is hedged as optional.
3. **Narrowed, not abandoned.** The amended paragraph names the exact five unscopable CloudFront
   actions, states plainly that AWS provides no resource type for them ("a limitation of the service,
   not a choice made here"), and names the three compensating controls that remain in force. It reads
   as a stated, bounded exception rather than a retreat from the least-privilege commitment.
4. **`hosted_zone_id` instruction positioned before the plan command.** In `aws-bootstrap.md` §1, the
   paragraph instructing the operator to fill in `hosted_zone_id` (or export `TF_VAR_hosted_zone_id`)
   appears immediately above the fenced code block containing `tofu ... plan -out=bootstrap.tfplan`,
   in the same paragraph as the bucket-name editing instruction — not in a later section.

This verifier found no defect on any of the four points. This assessment is offered as supporting
evidence, not as closure of the WINDOWS.md item — the plan explicitly designates a human reader as
the verification mechanism for these four prose properties (`INFRA-05 / unclassified`, carried via
`<human-check>` to end-of-phase UAT), and WINDOWS.md still records the item as **open**. Whether this
verifier's read is sufficient to close it, or whether a human maintainer must independently confirm
it before the phase is considered complete, is a decision for the human maintainer per this task's
instructions.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `infra/bootstrap/locals.tf` | `required_tags`, `github_repository`, `site` locals | ✓ VERIFIED | Present, exists, both tag shapes (account-global `project` only vs. per-environment `merge(...)`) correctly distinguished. |
| `infra/bootstrap/iam-github-actions.tf` | Six IAM roles + policies, `for_each`-wired | ✓ VERIFIED | 6 role/policy resource instances confirmed via `for_each = local.site` × 2 role families; content matches plan spec exactly (state scoping, content-bucket scoping, deploy-role scoping, CloudFront/ACM/Route 53 scoping, the named unscopable CloudFront exception). |
| `infra/bootstrap/outputs.tf` | `infrastructure_plan_role_arns`, `infrastructure_apply_role_arns` | ✓ VERIFIED | Both outputs present, correctly keyed, correctly described. |
| `infra/bootstrap/tests/iam-github-actions.tftest.hcl` | 7 new `tofu test` runs | ✓ VERIFIED | 452 lines, 27 `assert` blocks, substantive exact-JSON equality assertions (not tautologies) — spot-checked directly. |
| `infra/bootstrap/main.tf` | Tags sourced from `local.required_tags` | ✓ VERIFIED | Both inline tag literals replaced; `grep -c 'local.required_tags'` = 2; no inline `project = "stagehand"` literal remains. |
| `scripts/check-tofu-tags.sh` | Bootstrap root coverage | ✓ VERIFIED | `bootstrap_dir` variable present, conformance rule + `providers.tf` positive rule present, corrected success message present and confirmed by direct execution. |
| `docs/operations/aws-bootstrap.md` | OpenTofu-owned role path, capture block, `hosted_zone_id` instruction | ✓ VERIFIED | All content present and correctly ordered (capture commands before `rm -f` cleanup; `hosted_zone_id` instruction before `plan` command). |
| `docs/operations/github-environments.md` | Bootstrap-output path, named CloudFront exception | ✓ VERIFIED | Manual-provisioning language removed; five CloudFront actions and exact IAM condition-key names present. |
| `docs/adr/0002-github-environment-model.md` | References → ADR-0003 | ✓ VERIFIED | Confirmed via `git diff`, scoped to References section only. |
| `infra/bootstrap/terraform.tfvars.example` | `hosted_zone_id` placeholder | ✓ VERIFIED | Present with the agreed fixture placeholder `Z0123456789ABCDEFGHIJ`, no real zone ID. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `iam-github-actions.tf` | `main.tf` | Trust policy `Principal.Federated` references bootstrap-owned OIDC provider resource | ✓ WIRED | `Principal = { Federated = aws_iam_openid_connect_provider.github.arn }` present in both role families. |
| `iam-github-actions.tf` | `main.tf` | State statements scope to `aws_s3_bucket.state[each.key].arn` | ✓ WIRED | Confirmed in `ListStateBucket`/`ReadStateAndLock`/`HoldStateLock`/`WriteStateObject` statements. |
| `outputs.tf` | `iam-github-actions.tf` | Map comprehension over role resource maps | ✓ WIRED | `{ for environment, role in aws_iam_role.infrastructure_plan : environment => role.arn }` and the apply-role equivalent. |
| `iam-github-actions.tf` | `locals.tf` | ACM/Route 53 conditions read `local.site[each.key].domain_names` | ✓ WIRED | Confirmed in `RequestSiteCertificate` and `local.apply_record_names`. |
| `iam-github-actions.tf` | `variables.tf` | Route 53 statements scope to `var.hosted_zone_id`-derived ARN | ✓ WIRED | Confirmed in `ChangeHostedZoneRecords`/`ReadHostedZone`. |
| `iam-github-actions.tf` | `infra/modules/static-site/iam.tf` | Deploy-role IAM statements scope to `role/stagehand-${each.key}-site-deploy` | ✓ WIRED | Confirmed, no `role/*` wildcard anywhere (`grep` = 0). |
| `docs/operations/aws-bootstrap.md` | `infra/bootstrap/outputs.tf` | Capture block reads the two new outputs by name | ✓ WIRED | `output -json infrastructure_plan_role_arns` / `..._apply_role_arns` present, placed before the `rm -f` cleanup. |

### Behavioral Spot-Checks / Command Re-Execution

| Command | Result | Status |
|---------|--------|--------|
| `tofu -chdir=infra/bootstrap init -backend=false` | Success | ✓ PASS |
| `tofu fmt -check -recursive infra` | exit 0 | ✓ PASS |
| `tofu -chdir=infra/bootstrap validate` | "Success! The configuration is valid." | ✓ PASS |
| `tofu -chdir=infra/bootstrap test` | 14 passed, 0 failed | ✓ PASS |
| `./scripts/check-tofu-tags.sh` | exit 0, correct success message | ✓ PASS |
| `npm run verify` (graphify-out/ session artifact moved aside for this run only, then restored) | exit 0 — format, lint, typecheck, validate:data, 78/78 unit, build ×2, routes, links, 19/19 e2e, build-isolation (production=0, e2e=5) | ✓ PASS |
| `git grep -n -E '[0-9]{12}' -- infra/bootstrap/*.tf` | no match (exit 1) | ✓ PASS (no committed AWS account ID) |
| Wildcard/escalation greps (`role/*`, `iam:*`/`s3:*`/`cloudfront:*`, `iam:PassRole`/`sts:AssumeRole`, `dynamodb`, `aws:ResourceTag`) | all 0 | ✓ PASS |

Note: this session's working tree contained an untracked `graphify-out/` directory (103 unformatted
JSON/HTML files from an earlier `/graphify` invocation, unrelated to any phase-01 commit) that made
`npm run format:check` fail when run without adjustment. This is not a codebase defect — the
directory is untracked, would not exist in a fresh CI checkout, and is not part of any phase-01
commit. It was moved aside for one `npm run verify` run to confirm the tracked tree is clean, then
restored unchanged.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INFRA-01 | 01-01, 01-02 | Six IAM roles, trust policies pinned to `sts.amazonaws.com` and one Environment subject each | ✓ SATISFIED | `iam-github-actions.tf` + passing `tofu test` runs |
| INFRA-02 | 01-01 | Plan roles: state read/lock only, no site mutation | ✓ SATISFIED | `scopes_each_plan_role_to_its_own_state_and_lock_object` run; direct read of policy |
| INFRA-03 | 01-02 | Apply roles: plan access + scoped create/update/tag/delete | ✓ SATISFIED | `scopes_each_apply_role_to_its_own_environment_resources` run; direct read of policy |
| INFRA-04 | 01-01, 01-02 | Six role ARNs exposed as outputs | ✓ SATISFIED | `outputs.tf` — `infrastructure_plan_role_arns`, `infrastructure_apply_role_arns` |
| INFRA-05 | 01-04 | Runbooks describe OpenTofu-owned path, retain human-apply/CODEOWNERS/second-admin language | ⚠️ MECHANICALLY SATISFIED, HUMAN SIGN-OFF PENDING | See Observable Truth #3 and WINDOWS.md item #1 (open) |
| INFRA-06 | 01-03 | Tags sourced from `required_tags` local; `check-tofu-tags.sh` covers bootstrap root | ✓ SATISFIED | `main.tf` + `check-tofu-tags.sh`, negative proof recorded in 01-03-SUMMARY.md and re-confirmed structurally by this verifier's direct read of the script |
| DRIFT-01 | 01-04 | ADR-0002 References → ADR-0003 | ✓ SATISFIED | `git diff` scoped to References section |
| DRIFT-02 | 01-04 | Six-Environment model replaces stale three-Environment claim | ✓ SATISFIED | `docs/superpowers/specs/...` and `docs/superpowers/plans/...` both amended |
| DRIFT-03 | 01-04 | TypeScript pin reconciled to `6.0.3` | ✓ SATISFIED | `grep -rn "7\.0\.2" docs/` empty; `6.0.3` present ×2 |
| GATE-01 | 01-01, 01-02, 01-03 | `tofu test` role assertions + `tofu fmt`/`validate`/`check-tofu-tags.sh` pass | ✓ SATISFIED | All four commands re-run independently by this verifier, all pass |

No orphaned requirements found — `.planning/REQUIREMENTS.md`'s "Phase 1" mapping (10 requirements)
matches exactly what the four plans' `requirements:` frontmatter fields declare in aggregate.

### Anti-Patterns Found

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, or `PLACEHOLDER` markers found in any file this phase
modified (`infra/bootstrap/*.tf`, `scripts/check-tofu-tags.sh`, `docs/operations/*.md`,
`docs/adr/0002-*.md`). No stub returns, no hardcoded-empty data flowing to a rendered/consumed value,
no unscoped wildcard actions beyond the one explicitly named, documented, and threat-modeled
exception (`CreateUnscopableCloudFrontResources`).

**Informational, not a gap:** `.planning/REQUIREMENTS.md`'s checkbox markers (`- [ ] **INFRA-01**...`)
and its Traceability table (`| INFRA-01 | Phase 1 | Pending |`) are still unchecked/"Pending" for all
ten Phase 1 requirement IDs, even though every plan's own `coverage:` frontmatter records them as
satisfied. This is bookkeeping housekeeping in a planning artifact, not a functional gap in the
delivered infrastructure or documentation — but it means a reader of REQUIREMENTS.md alone, without
this verification report, would not see Phase 1 reflected as done. Recommend updating the checkboxes
and Traceability table's Status column as part of phase closeout.

### Human Verification Required

**This item was already open before this verification ran** — it is the WINDOWS.md ledger's single
open entry (id 1, kind `unrun-verify`, phase 01, recorded 2026-08-26T16:07:24.837Z), and the plan
that produced it (`01-04-PLAN.md`) explicitly says INFRA-05 "is not closed until that harvest is
answered."

#### 1. Read both operations runbooks end to end as a first-time operator

**Test:** Read `docs/operations/aws-bootstrap.md` and `docs/operations/github-environments.md` top to
bottom as someone who has never seen this repository.
**Expected:** (1) Exactly one procedure for obtaining the six role ARNs (read them from `tofu
output`), no hand-provisioning instruction anywhere. (2) Human-apply, CODEOWNERS-on-`/infra/`, and
second-administrator review are all still stated and none reads as optional. (3) The amended
apply-role scoping paragraph reads as a narrowed, bounded exception (five named CloudFront actions,
named compensating controls) rather than an abandoned least-privilege commitment. (4) Working §1 top
to bottom, the reader knows to supply `hosted_zone_id` before reaching the `plan` command, positioned
where they will actually encounter it.
**Why human:** Reading-order and tone properties — "does this read as narrowed rather than
abandoned", "is this positioned where an operator will actually see it" — are not greppable. The
plan's own executor (01-04) explicitly declined to self-certify this and recorded it as
`human_judgment: true, status: pending` in its own SUMMARY coverage table. This verifier performed an
independent read against all four points and found no defect (see "INFRA-05 prose-intent assessment"
above), but that is supporting evidence, not the recorded human sign-off the plan's own gate requires.

**Decision needed from the human maintainer:** whether this verifier's independent read (which found
no defect on any of the four points) is sufficient to mark WINDOWS.md item #1 fixed and close
INFRA-05, or whether a maintainer must personally read both runbooks and record that reading before
the phase is considered fully complete and before `/gsd-ship` (which blocks while `open_count > 0`
under `workflow.windows_enforce`) can proceed.

### Gaps Summary

No structural gaps found. Every artifact the four plans committed to exists, is substantive (not a
stub), is wired into the rest of the bootstrap root, and is covered by a passing automated check that
this verifier re-ran independently rather than trusting from SUMMARY.md narrative. All five ROADMAP
success criteria are either fully verified by direct re-execution or mechanically verified with only
a qualitative prose-reading step outstanding.

The phase is not blocked by a missing or broken artifact. It is blocked from an unqualified `passed`
verdict by one already-flagged, still-open human-verification item (INFRA-05's prose-intent
properties, WINDOWS.md id 1) that the phase's own plan designated as requiring a human reader, not an
automated or LLM-verifier check, before the requirement is considered closed. That decision — accept
this verifier's independent read as sufficient, or require an additional maintainer read — belongs to
the human maintainer.

---

*Verified: 2026-08-26T16:13:58Z*
*Verifier: Claude (gsd-verifier)*
