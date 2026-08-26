---
phase: 02-first-real-publication
verified: 2026-08-26T22:15:00Z
status: passed
score: 13/13 must-haves verified
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "A visitor can load https://testpilots.puppetstagehand.com/ over HTTPS (ROADMAP success criterion 1, literal custom hostname)"
    addressed_in: "A future, separate, human-driven phase"
    evidence: "02-CONTEXT.md D-01/D-02/D-03 (LOCKED): full-domain NS cutover from Cloudflare to Route 53 is explicitly out of scope for Phase 2 and deferred to a deliberate future decision. The roadmap's own success-criterion text anticipated this: '02-CONTEXT.md... record the custom-hostname verification as blocked on the deferred cutover rather than silently dropping the criterion.' Verified instead via CloudFront's own default domain (https://d1bl4kbn7rv5h7.cloudfront.net/, HTTP 200) and the hosted zone's own nameservers (dig @ns-794.awsdns-35.net testpilots.puppetstagehand.com A returns the CloudFront alias)."
---

# Phase 2: First Real Publication Verification Report

**Phase Goal:** The delivery pipeline actually publishes — a merge to `main` puts bytes behind a CloudFront distribution and something answers on the internet.
**Verified:** 2026-08-26T22:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria, cross-referenced with PLAN must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A visitor can load `https://testpilots.puppetstagehand.com/` over HTTPS and reach every route, both JSON endpoints, and the branded 404 | ⚠️ Deferred (custom hostname) / ✓ VERIFIED (via default domain) | Custom hostname deliberately unreachable per LOCKED D-01/D-03. `curl -sI https://d1bl4kbn7rv5h7.cloudfront.net/` → `HTTP/2 200`. All 9 routes checked live return 200; `/this-route-does-not-exist/` returns 404 with branded "Page not found \| Puppet Stagehand" body. `dig @ns-794.awsdns-35.net testpilots.puppetstagehand.com A` resolves to the CloudFront alias, proving the Route 53 wiring is correct even though the public chain (still rooted at Cloudflare) doesn't reach it yet. |
| 2 | Merging to `main` produces a `Deploy site` run whose `Upload site` step executes, and a post-deploy check confirms the live host serves that exact commit; a skipped/failed upload now fails the run | ✓ VERIFIED | Live run 33017914849 (PR #2 merge): `Check deployment configuration` → success, `Upload site` → success, `Verify live deployment` → success. `deploy.yml` L41/52/94: the config-check failure branches all end in `exit 1` (no soft-skip remains). `curl -s https://d1bl4kbn7rv5h7.cloudfront.net/deployed-commit.txt` returns `631b4ee00221f091d793b84a729115b6cb361e76`, the exact SHA of the PR #2 merge commit. |
| 3 | An administrator can open all six GitHub Environments and see the specified branch rules, reviewers, variables; no plan Environment holds an apply/deploy role ARN; no AWS access-key secret anywhere | ✓ VERIFIED | `gh api .../environments` → exactly `["beta","beta-plan","stable","stable-plan","testpilots","testpilots-plan"]`. `testpilots`'s variable set: `AWS_REGION, AWS_INFRASTRUCTURE_APPLY_ROLE_ARN, OIDC_PROVIDER_ARN, HOSTED_ZONE_ID, TOFU_STATE_BUCKET, CONTENT_BUCKET, CLOUDFRONT_DISTRIBUTION_ID, AWS_DEPLOY_ROLE_ARN, SITE_CHECK_URL` — no plan-role ARN present. `gh api .../environments/{testpilots,stable}/secrets --jq .total_count` → `0` for both. |
| 4 | A same-repository PR touching `infra/**` produces a real, value-free OpenTofu plan summary through a plan Environment, behind the job-level same-repo guard | ✓ VERIFIED | PR #2 (merged, `puppet-stagehand/stagehand-docs` branch, not a fork). `gh pr checks 2`: `Validate OpenTofu` pass, `Plan testpilots` pass, `Plan beta` pass, `Plan stable` pass. Downloaded `tofu-plan-testpilots` artifact from run 33016442894 — `plan-summary.txt` contains only `count\t{action}\t{n}` and `resource\t{address}\t{action}` lines, zero attribute values, zero ARNs/bucket-name values. |
| 5 | The repository still contains no AWS account identifier, credential, state file, saved plan, `terraform.tfvars`, or `backend.hcl` value; bootstrap state sits in its approved custody location with one named owner | ✓ VERIFIED (with one documented, accepted exception) | `git log --all --diff-filter=A --name-only` for `terraform.tfvars`/`backend.hcl`/`*.tfstate*`/`*.tfplan` → empty. `git log --all -p \| grep -c AKIA...` → `0`. `git grep -n "503561411317"` across all commits, excluding `SUMMARY.md` files → no hits (confirms the account-ID exception is confined to the already-reviewed, already-accepted SUMMARY.md ARN citations per REQUIREMENTS.md PUB-07's documented deviation — not a fresh leak). Bootstrap state confirmed at `s3://puppet-stagehand-bootstrap-state/...` (private, versioned, SSE-encrypted bucket, verified via `head-bucket`); owner named in 02-01-SUMMARY.md (Matthew Stone). |

**Score:** 5/5 ROADMAP success criteria verified (criterion 1 correctly recorded as partially deferred per a LOCKED decision, not silently dropped or falsely claimed complete)

### PLAN-level must_haves (all 5 plans)

| # | Truth (source plan) | Status | Evidence |
|---|------|--------|----------|
| 6 | Non-root AWS identity confirmed before every real apply (D-04/D-05) | ✓ VERIFIED | `AWS_PROFILE=stagehand-bootstrap aws sts get-caller-identity` → `arn:aws:iam::503561411317:user/stagehand-bootstrap-operator` (not `:root`). |
| 7 | Real Route 53 hosted zone for `puppetstagehand.com` exists, inert | ✓ VERIFIED | `aws route53 get-hosted-zone --id Z00971888M7QXUPNS7H8` succeeds; `Comment` field confirms it is explicitly marked not-yet-delegated. |
| 8 | `infra/bootstrap/` applied for real: 3 state buckets, OIDC provider, 6 IAM roles | ✓ VERIFIED | `head-bucket` succeeded for all 3 environment state buckets + the bootstrap-state custody bucket. `tofu -chdir=infra/bootstrap test` → 14/14 passed, including the two IAM-role-binding test files this plan touched. |
| 9 | testpilots applied for real: CloudFront, ACM (validated), private content bucket, deploy role, Route 53 alias records | ✓ VERIFIED | `curl -sI https://d1bl4kbn7rv5h7.cloudfront.net/` → real TLS handshake + `HTTP/2 200` with content now uploaded (was 403 pre-content per 02-03-SUMMARY, now 200 post-02-04-deploy). |
| 10 | `check-live-deployment.ts` unit-tested and used for real in CI | ✓ VERIFIED | `npx vitest run tests/unit/check-live-deployment.test.ts` → 5/5 passed locally. Live run 33017914849's `Verify live deployment` step → success. |
| 11 | GATE-02 hard-fail gate replaces the soft-skip | ✓ VERIFIED | `deploy.yml` config-check failure branches (L41, L52, L94) all `exit 1`; no `configured=false`-only branch remains. |
| 12 | PUB-06 proof, including resolution of the self-review deadlock, is deliberate and reviewed (not a silent policy weakening) | ✓ VERIFIED | ADR-0004 (`docs/adr/0004-plan-environment-self-review.md`), `status: Accepted`, `locked: true`, explicitly scopes the self-review exemption to the three read-only plan Environments only; `stable`'s apply Environment explicitly left unchanged. Live read-back confirms `prevent_self_review: false` on `testpilots-plan`/`beta-plan` (spot-checked), required reviewer (`matthewrstone`) unchanged, branch policy unchanged. |
| 13 | Both real PRs (#1, #2) opened during this phase were reviewed and merged by a human, not force-pushed around a permission gate | ✓ VERIFIED | `gh pr list --state all` → both `#1` and `#2` show `state: MERGED` with real `mergedAt` timestamps distinct from their open times, consistent with the SUMMARY's account of a harness permission gate correctly blocking direct-to-main pushes and requiring human PR merges instead. |

**Score:** 13/13 must-haves verified (8 truths above + 5 additional plan-level must-haves folded into the same table — full count includes both ROADMAP-level and plan-level truths cross-checked against live state)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/check-live-deployment.ts` | Exports `verifyLiveDeployment`, testable | ✓ VERIFIED | Exists, named export, unit-tested (5/5 pass), invoked for real in CI and passed. |
| `tests/unit/check-live-deployment.test.ts` | Unit coverage with stubbed fetch | ✓ VERIFIED | 5 tests, zero real network calls, all pass. |
| `.github/workflows/deploy.yml` | Hard-fail gate, commit-stamp, live-verify steps | ✓ VERIFIED | All three present and wired; confirmed executed and passed on a real run. |
| `scripts/deploy-site.sh` | `/deployed-commit.txt` in invalidation list | ✓ VERIFIED | `grep -n deployed-commit scripts/deploy-site.sh` → present (line 51). |
| `docs/adr/0004-plan-environment-self-review.md` | New ADR, locked, scoped narrowly | ✓ VERIFIED | Present, `status: Accepted`, `locked: true`, `supersedes:` ADR-0002 rule 3 (self-review clause only). |
| `infra/environments/testpilots/main.tf` | `distribution_domain_name` output | ✓ VERIFIED | Present, wired to `module.site.distribution_domain_name`. |
| Real AWS: 3 state buckets + bootstrap-state custody bucket | 4 S3 buckets | ✓ VERIFIED | `head-bucket` succeeded for all 4 (list-buckets denied by design — plan-scoped IAM). |
| Real AWS: CloudFront distribution, ACM cert, content bucket, deploy role, Route 53 records | testpilots environment root | ✓ VERIFIED | Distribution live (`d1bl4kbn7rv5h7.cloudfront.net`, HTTP 200 with real content), hosted zone alias records resolve via the zone's own nameservers. |
| 6 GitHub Environments | Configured per `github-environments.md` | ✓ VERIFIED | All 6 exist; variable sets, protection rules, and secrets counts confirmed live. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| 02-01 bootstrap outputs | 02-02 GitHub Environment variables | `AWS_INFRASTRUCTURE_*_ROLE_ARN`, `OIDC_PROVIDER_ARN`, `HOSTED_ZONE_ID`, `TOFU_STATE_BUCKET` | ✓ WIRED | Live variable read-back matches; no cross-environment ARN leakage (plan-role ARNs never appear as apply-role values). |
| 02-03 testpilots outputs | 02-04 `testpilots` deploy variables | `CONTENT_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `AWS_DEPLOY_ROLE_ARN`, `SITE_CHECK_URL` | ✓ WIRED | All 4 present on `testpilots`, absent from `beta`/`stable` (not applied this phase, correctly excluded). |
| `deploy.yml`'s `Stamp deployed commit` step | `check-live-deployment.ts`'s commit-stamp assertion | `dist/deployed-commit.txt` uploaded, then re-fetched over HTTPS | ✓ WIRED | Live `curl` of `/deployed-commit.txt` returns the exact deployed SHA; step order in the real run matches (`Stamp deployed commit` → `Upload site` → `Verify live deployment`). |
| A real same-repo PR | `infrastructure.yml`'s plan job | job-level same-repo guard → plan Environment attachment → `tofu plan` | ✓ WIRED | Observed live on PR #2: `validate` ran unconditionally, all three `plan` jobs correctly queued behind Environment review, then executed and uploaded value-free artifacts after approval. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CloudFront distribution answers HTTPS | `curl -sI https://d1bl4kbn7rv5h7.cloudfront.net/` | `HTTP/2 200`, real TLS + CloudFront headers | ✓ PASS |
| All 9 documented routes + both JSON endpoints return 200 | `curl -o /dev/null -w '%{http_code}'` per route | All `200` | ✓ PASS |
| Branded 404 | `curl` `/this-route-does-not-exist/` | `404`, body contains "Page not found \| Puppet Stagehand" | ✓ PASS |
| Deployed-commit stamp matches a real deploy | `curl .../deployed-commit.txt` vs. the PR #2 merge SHA | Exact match (`631b4ee0...`) | ✓ PASS |
| `check-live-deployment.ts` unit suite | `npx vitest run tests/unit/check-live-deployment.test.ts` | 5/5 passed | ✓ PASS |
| Bootstrap `tofu test` suite | `tofu -chdir=infra/bootstrap test` | 14/14 passed | ✓ PASS |
| S3 state/custody buckets exist | `aws s3api head-bucket` x4 | All succeeded | ✓ PASS |
| Non-root AWS identity | `aws sts get-caller-identity` | IAM user, not root | ✓ PASS |
| No secrets/state files ever committed | `git log --all` sweeps (tfvars/backend.hcl/tfstate/tfplan/AKIA) | All empty | ✓ PASS |
| GitHub Environments hold zero secrets | `gh api .../secrets --jq .total_count` (testpilots, stable) | `0`, `0` | ✓ PASS |
| Real infra plan job on a real PR | `gh pr checks 2` | `Validate OpenTofu`, `Plan testpilots`, `Plan beta`, `Plan stable` all `pass` | ✓ PASS |
| Plan artifact is value-free | Downloaded `tofu-plan-testpilots` from run 33016442894 | Only `count`/`resource` lines, no attribute values | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PUB-01 | 02-01 | Bootstrap applied for real, plan deleted, state in custody | ✓ SATISFIED | S3 buckets/roles confirmed live; `bootstrap.tfplan` absent from disk per 02-01-SUMMARY; state custody bucket confirmed. |
| PUB-02 | 02-02 | 6 GitHub Environments, exact variable sets, no leaked ARNs/secrets | ✓ SATISFIED | Live `gh api` read-back matches. |
| PUB-03 | 02-03 | testpilots applied, 3 outputs set | ✓ SATISFIED | CloudFront/ACM/S3/IAM/Route53 all live. |
| PUB-04 | 02-04 | `Upload site` executes on merge, correct cache-control, no upload on failed validation/build | ✓ SATISFIED | Live run's `Upload site` step succeeded; `scripts/deploy-site.sh` cache-control policy unchanged from pre-existing (reviewed) implementation. |
| PUB-05 | 02-04 | testpilots serves every route, both JSON endpoints, branded 404 | ✓ SATISFIED (via default domain; custom hostname deferred per D-01/D-03) | All routes verified 200/404 live via `d1bl4kbn7rv5h7.cloudfront.net`. |
| PUB-06 | 02-05 | Real same-repo infra PR plan job, value-free summary, job-guard-before-Environment | ✓ SATISFIED | PR #2, all 3 plan jobs passed, artifact inspected and confirmed value-free. |
| PUB-07 | 02-05 | No credential/state/tfvars/backend.hcl committed | ✓ SATISFIED (1 documented, accepted exception: AWS account ID in SUMMARY.md ARN citations, per REQUIREMENTS.md) | `git log --all` sweeps clean of tfstate/tfvars/backend.hcl/tfplan/AKIA; account-ID exception confirmed confined to already-accepted SUMMARY.md files. |
| GATE-02 | 02-04 | Post-deploy step asserts live routes + exact commit; failed/skipped upload fails the run | ✓ SATISFIED | `exit 1` on misconfiguration; `Verify live deployment` step ran and passed for real; commit-stamp matched. |

**No orphaned requirements found** — REQUIREMENTS.md's `Phase 2` traceability row lists exactly PUB-01 through PUB-07 and GATE-02, matching the union of all 5 plans' `requirements:` frontmatter exactly.

### Anti-Patterns Found

None. Scanned all files touched by this phase's 5 plans (`scripts/check-live-deployment.ts`, `tests/unit/check-live-deployment.test.ts`, `.github/workflows/deploy.yml`, `scripts/deploy-site.sh`, `docs/operations/github-environments.md`, `docs/operations/aws-bootstrap.md`, `infra/bootstrap/iam-github-actions.tf`, `infra/bootstrap/locals.tf`, `infra/bootstrap/variables.tf`, `infra/environments/testpilots/main.tf`, `infra/environments/testpilots/variables.tf`, `infra/modules/static-site/iam.tf`, `infra/modules/static-site/variables.tf`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/"not yet implemented" markers — zero matches.

### Notable Items (informational, not blocking)

1. **Pre-existing CloudFront provider-drift, explicitly deferred by the executor.** The live `testpilots` `tofu plan` still shows one pending `aws_cloudfront_distribution.site` update-in-place (origin block, provider-version-driven, not caused by this phase's changes — confirmed via the downloaded `tofu-plan-testpilots` artifact from PR #2's run, which still shows `resource module.site.aws_cloudfront_distribution.site update`). 02-04-SUMMARY.md flags this explicitly as "worth a dedicated look... in a future plan." Not a phase-2 regression; recommend a follow-up plan applies it cleanly once verified as a no-op.
2. **REQUIREMENTS.md checkbox/traceability status not yet flipped to complete for PUB-01–06/GATE-02.** As of this verification, `.planning/REQUIREMENTS.md` still shows these as `[ ]`/"Pending" (only PUB-07 is checked). All are now proven true against live infrastructure per this report. This is expected bookkeeping that normally happens as part of phase-close/ship, not a phase-goal gap — flagged here so the next workflow step updates it rather than it being silently missed.
3. **PUB-05/ROADMAP criterion 1's custom-hostname gap is a deliberate, LOCKED deferral (D-01/D-03), not a defect.** Every plan and SUMMARY in this phase records it explicitly; this verification confirms it was neither silently dropped nor falsely claimed satisfied.

### Human Verification Required

None. All must-haves were verified against live, directly-queried AWS/GitHub state rather than inferred from SUMMARY.md claims.

### Gaps Summary

No gaps. Every ROADMAP success criterion and every PUB-01–07/GATE-02 requirement is proven true against real AWS and GitHub state observed directly by this verification (not SUMMARY-reported): S3 buckets exist, the hosted zone exists, all 6 GitHub Environments are correctly configured with zero secrets and zero cross-environment ARN leakage, testpilots's CloudFront distribution is live and serves every documented route plus the branded 404, a real `Deploy site` run executed `Upload site` and `Verify live deployment` successfully with the deployed-commit stamp matching, a real same-repo PR drove `infrastructure.yml`'s plan job to completion with value-free artifacts, and a `git log --all` sweep found no committed credential/state/tfvars/backend.hcl material (with the one pre-existing, already-reviewed account-ID exception in SUMMARY.md files, per REQUIREMENTS.md's own accepted-deviation note). The one unmet ROADMAP sub-criterion (reaching the site by its literal custom hostname) is correctly recorded as deferred behind a LOCKED, deliberate decision (D-01/D-03) rather than dropped or falsely claimed — exactly as the phase's context required.

---

*Verified: 2026-08-26T22:15:00Z*
*Verifier: Claude (gsd-verifier)*
