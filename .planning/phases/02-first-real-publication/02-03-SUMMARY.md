---
phase: 02-first-real-publication
plan: 03
subsystem: infra
tags: [opentofu, terraform, aws, acm, cloudfront, route53, s3, iam, dns]

requires:
  - phase: 02-first-real-publication (02-01)
    provides: hosted_zone_id, github_oidc_provider_arn (bootstrap outputs), real testpilots state bucket
provides:
  - Real AWS testpilots environment root fully applied: validated ACM cert, CloudFront distribution, private S3 content bucket, deploy IAM role with policy, Route 53 alias records
  - infra/environments/testpilots/main.tf distribution_domain_name output
  - Captured content_bucket_name / distribution_id / deployment_role_arn / distribution_domain_name outputs, ready to become 02-04's GitHub Environment variables
affects: [02-04-deploy-pipeline-wiring, 02-05]

actuals:
  tokens: 350
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Targeted apply (-target=module.site.aws_acm_certificate.site) to obtain a real DNS validation record before committing to a full apply that would otherwise block on that same validation"
    - "Reconnecting a fresh worktree to an existing real S3 remote state via tofu init -backend-config=backend.hcl -reconfigure, rather than re-planning from zero"
    - "Deriving TF_VAR_hosted_zone_id / TF_VAR_github_oidc_provider_arn directly from AWS (route53 list-hosted-zones, iam list-open-id-connect-providers) when the prior session's gitignored captured-outputs scratch file isn't present in a fresh worktree"

key-files:
  created:
    - infra/environments/testpilots/backend.hcl (gitignored, real S3 backend config)
    - infra/environments/testpilots/.captured-outputs.json (gitignored, real output values)
  modified:
    - infra/environments/testpilots/main.tf (distribution_domain_name output — cherry-picked from prior halted session's commit f3c0e62)

key-decisions:
  - "Cherry-picked only the prior session's Task 1 commit (f3c0e62), not its halt-record SUMMARY commit (51dc02c) — this session writes its own final SUMMARY reflecting full completion"
  - "Derived hosted_zone_id and github_oidc_provider_arn directly from AWS APIs (route53, iam) instead of relying on infra/bootstrap/.captured-outputs.json, since that gitignored scratch file from the prior worktree wasn't present in this fresh worktree"
  - "Did not widen the stagehand-bootstrap-operator IAM policy — the human already resolved the s3:CreateBucket AccessDenied gap outside this repo before this session started"

requirements-completed: [PUB-03]

coverage:
  - id: D1
    description: "ACM certificate for testpilots.puppetstagehand.com is real, validated (ISSUED), and was validated without touching puppetstagehand.com's live NS delegation at Cloudflare"
    requirement: "PUB-03"
    verification:
      - kind: other
        ref: "aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:503561411317:certificate/e155eabc-7109-4bb7-812a-90f07d0b5b17 -> Status=ISSUED"
        status: pass
    human_judgment: false
  - id: D2
    description: "testpilots environment root fully applied: CloudFront distribution, private S3 content bucket, deploy IAM role+policy, Route 53 alias records all exist in real AWS with 0 destroys/replacements across the whole plan"
    requirement: "PUB-03"
    verification:
      - kind: other
        ref: "tofu -chdir=infra/environments/testpilots apply tfplan -> Apply complete! Resources: 11 added, 0 changed, 0 destroyed (plus 10 already applied in the prior session's remote state)"
        status: pass
    human_judgment: false
  - id: D3
    description: "CloudFront's own default domain answers HTTPS requests for the testpilots distribution today, independent of the deferred DNS cutover"
    requirement: "PUB-03"
    verification:
      - kind: other
        ref: "curl -sI https://d1bl4kbn7rv5h7.cloudfront.net/ -> HTTP/2 403 (real TLS handshake + CloudFront response, expected 403 since no content uploaded yet)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The hosted zone's own nameservers correctly resolve testpilots.puppetstagehand.com to the CloudFront alias, even though the public DNS chain (still rooted at Cloudflare) does not reach it yet"
    requirement: "PUB-03"
    verification:
      - kind: other
        ref: "dig @ns-794.awsdns-35.net testpilots.puppetstagehand.com A -> 4 CloudFront alias IPs; dig +short testpilots.puppetstagehand.com A (public chain) -> empty, confirming the custom hostname is not yet publicly reachable"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-26
status: complete
---

# Phase 2 Plan 3: Apply testpilots for real Summary

**testpilots environment root fully applied in real AWS — validated ACM cert, live CloudFront distribution (d1bl4kbn7rv5h7.cloudfront.net), private S3 content bucket, deploy IAM role, and Route 53 alias records, all reachable today via CloudFront's default domain and the zone's own nameservers, with the custom hostname explicitly deferred pending D-01/D-03's separate DNS cutover.**

## Performance

- **Duration:** ~25 min (this continuation session; total across both sessions longer)
- **Started:** 2026-08-26 (continuation after IAM-permission-gap checkpoint)
- **Completed:** 2026-08-26
- **Tasks:** 3 (Task 1 and Task 2 completed in a prior session; this session completed Task 3 and finalized documentation)
- **Files modified:** 1 tracked (main.tf, cherry-picked) + 2 gitignored (backend.hcl, .captured-outputs.json)

## Accomplishments
- Fast-forwarded this fresh worktree onto `main` to pick up `.planning/` (it predated `.planning/` being tracked) and cherry-picked the prior halted session's Task 1 commit (`distribution_domain_name` output + ACM cert request)
- Reconnected to the SAME real S3 remote state (`puppet-stagehand-testpilots-tofu-state`) the prior session had already updated — confirmed all 10 previously-applied resources were intact (ACM cert + validation, its Route53 CNAME, 3 CloudFront cache policies, CloudFront OAC, response-headers policy, redirect function, empty deploy IAM role) before applying anything further
- Completed the remaining apply: 11 resources added (CloudFront distribution, private S3 content bucket + its 6 sub-resources, deploy IAM role policy, Route 53 `site_ipv4`/`site_ipv6` alias records) — 0 changed, 0 destroyed, 0 replacements across the whole plan
- Captured all four real outputs (`content_bucket_name`, `distribution_id`, `deployment_role_arn`, `distribution_domain_name`) for 02-04's Environment variable wiring
- Verified reachability via both non-custom-hostname paths named by D-02: CloudFront's own default domain (real TLS + HTTP response) and the hosted zone's own nameservers (correct alias resolution)
- Confirmed the custom hostname (`testpilots.puppetstagehand.com`) does NOT yet resolve on the public DNS chain — expected, and explicitly recorded here rather than silently dropped

## Task Commits

Tasks 1 and 2 were completed and committed in the prior (halted) worktree session, cherry-picked into this one:

1. **Task 1: Request the ACM certificate and surface its validation record** - `d8c67f2` (feat, cherry-picked from prior session's `f3c0e62`) — adds `distribution_domain_name` output, requests real ACM cert (already ISSUED by the time this session started)
2. **Task 2: Add the ACM validation record at the current DNS host** - human-action checkpoint resolved in the prior session (Cloudflare CNAME added; validation confirmed before this session began — cert status is ISSUED)
3. **Task 3: Complete the testpilots apply and verify via the CloudFront default domain** - no separate task commit (plan explicitly scopes this task to "no new repository files — completes the apply started in Task 1"); real AWS apply executed via `tofu apply`, outputs captured to gitignored scratch file

**Plan metadata:** (this SUMMARY's commit, made immediately after this file)

## Files Created/Modified
- `infra/environments/testpilots/main.tf` - Added `distribution_domain_name` output (cherry-picked, already committed as `d8c67f2`)
- `infra/environments/testpilots/backend.hcl` - Gitignored; real S3 backend config (`puppet-stagehand-testpilots-tofu-state`, key `stagehand-docs/terraform.tfstate`, region `us-east-2`) recreated from `backend.hcl.example` in this fresh worktree
- `infra/environments/testpilots/.captured-outputs.json` - Gitignored; real output values (bucket name, distribution ID, deploy role ARN, distribution domain name, ACM cert ARN, hosted zone ID) for 02-04's consumption

## Decisions Made
- Cherry-picked only the prior session's code commit (`f3c0e62` -> `d8c67f2` in this branch), not its halt-record SUMMARY commit — this session's SUMMARY reflects the plan's actual final, complete state rather than the mid-halt snapshot.
- `TF_VAR_hosted_zone_id` and `TF_VAR_github_oidc_provider_arn` were derived directly from live AWS (`aws route53 list-hosted-zones`, `aws iam list-open-id-connect-providers`) rather than from `infra/bootstrap/.captured-outputs.json`, because that gitignored file lives only in the prior worktree's local filesystem and was not present in this fresh worktree. Bootstrap's local Terraform state is also worktree-local (gitignored), so its own `tofu output` returned nothing here — querying AWS directly for these two idempotent, already-created resources was the correct fallback rather than re-running or duplicating the bootstrap apply.
- Did not widen the `stagehand-bootstrap-operator` IAM policy myself. Per the checkpoint resolution, the human had already fixed the `s3:CreateBucket` gap outside this repo before this session started; re-verifying non-root identity and the resulting successful apply confirmed the fix was in place.

## Deviations from Plan

None — plan executed exactly as written, resuming cleanly from the documented checkpoint.

## Issues Encountered
- The prior worktree's gitignored `infra/bootstrap/.captured-outputs.json` scratch file (mentioned in the checkpoint-resolution context) was not present in this fresh worktree, since gitignored files are worktree-local and were never committed. Resolved by querying AWS directly for the two values it would have contained (`hosted_zone_id` via Route 53, `github_oidc_provider_arn` via IAM) — both resources are idempotent and already existed in AWS from the 02-01 bootstrap apply, so no re-apply was needed.
- The CloudFront distribution's `Status` was `InProgress` immediately after creation; `curl` initially failed to resolve `d1bl4kbn7rv5h7.cloudfront.net` (global edge propagation not yet complete). Resolved by polling `aws cloudfront wait distribution-deployed` until `Status=Deployed`, then re-running the reachability check successfully.

## User Setup Required

None - no external service configuration required. The Cloudflare validation CNAME (Task 2) was already added and confirmed by the human in the prior session before this continuation began.

## Next Phase Readiness
- `content_bucket_name`, `distribution_id`, `deployment_role_arn`, and `distribution_domain_name` are all real, captured, non-empty values ready for 02-04 to wire into GitHub Environment variables.
- The testpilots distribution is live and reachable today via its default `*.cloudfront.net` domain and via the hosted zone's own nameservers; it currently answers with 403 (expected — no content uploaded yet, that's 02-04's job).
- `testpilots.puppetstagehand.com` (the custom hostname) remains deliberately unresolvable on the public DNS chain until the separate, human-driven D-01/D-03 domain cutover happens — this is expected, not a defect, and is not blocking 02-04 or 02-05.
- No NS delegation, apex, or `www` records at Cloudflare were touched at any point in this plan.

---
*Phase: 02-first-real-publication*
*Completed: 2026-08-26*
