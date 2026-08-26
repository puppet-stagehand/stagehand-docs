# Phase 2: First Real Publication - Research

**Researched:** 2026-08-26
**Domain:** AWS OIDC-based CI/CD for a static site (S3 + CloudFront + ACM + Route 53), GitHub
Environments configuration, and a live-verification (smoke-test) gate for GitHub Actions
**Confidence:** MEDIUM-HIGH — the code and workflow surface is fully read and verified from the
working tree; two external tool categories (WebSearch, WebFetch) were unavailable this session
(returned a harness-level model error on every call), so a small number of general AWS/GitHub
platform facts are carried as `[ASSUMED]` training knowledge rather than freshly verified. See
**Open Questions** and **Assumptions Log**.

## Summary

Phase 2 is overwhelmingly an *operations* phase, not a *code* phase. Reading the actual workflow
files (`deploy.yml`, `infrastructure.yml`) shows the OIDC role-assumption wiring, the plan/apply
job split, the job-level same-repository guard, and the six-Environment consumption pattern are
**already fully implemented** — Phase 1 (bootstrap roles) and the earlier scaffold milestone did
this work. What is missing is almost entirely *real-world state*: the six GitHub Environments do
not exist yet, bootstrap has never been applied, `testpilots` has never been applied, and — this
research's most important finding — **no Route 53 hosted zone for `puppetstagehand.com` exists in
this AWS account, and the domain's live NS delegation currently points to Cloudflare, serving an
unrelated GitHub Pages site (`puppetlabs-seteam.github.io`) at both the apex and `www`.** That is
a real, currently-serving production asset that a naive full-domain NS cutover would take offline
before Phase 5 ever gets a chance to replace it deliberately. This is the single highest-risk
finding in this research and must be resolved (see Pitfall 1 and Open Question 1) before any
`tofu apply` that touches DNS.

The one genuine code change this phase needs is `deploy.yml`'s deployment-configuration gate: today
a missing GitHub Environment variable causes the job to print a step-summary line and **exit 0**
(green). GATE-02 requires the opposite — a missing configuration, a failed upload, or a live host
that doesn't answer with the deployed commit must **fail** the run. This is a small, well-scoped
diff (harden the existing `if: steps.deployment_configuration.outputs.configured == 'true'` guard
into a hard failure, and add a new post-deploy verification step), not a rewrite.

**Primary recommendation:** Sequence Phase 2 as (1) resolve the DNS/hosted-zone prerequisite and
decide the AWS identity to bootstrap with (do not apply as the AWS account root user — see Pitfall
2), (2) apply `infra/bootstrap/` for real and capture its outputs, (3) create and fully configure
all six GitHub Environments before any workflow references them, (4) apply `testpilots` for real,
wire its outputs into the `testpilots`/`testpilots-plan` Environments, (5) harden `deploy.yml`'s
soft-skip into a hard-fail plus a new post-deploy live-verification step (GATE-02), (6) prove
`infrastructure.yml`'s plan job produces a real value-free plan summary on a same-repo PR that
touches `infra/**`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| PUB-01 | Bootstrap applied from a reviewed saved plan; outputs captured; saved plan deleted; state in approved custody with one named owner | Runtime State Inventory (no AWS state exists yet — from-zero apply); Pitfall 2 (do not apply as root); Code Examples (output-capture commands, already correct in `aws-bootstrap.md`) |
| PUB-02 | All six GitHub Environments exist with specified branch policies, reviewers, and variable sets; no plan Environment holds an apply/deploy ARN; no AWS access-key secret | Don't Hand-Roll (`gh api` scripting option); Pitfall 6 (sequencing before any workflow reference); Code Examples (`gh api` shape, `[ASSUMED]`, verify before use) |
| PUB-03 | `testpilots` environment root applied; its three outputs set as the three named Environment variables, no cross-environment copying | Pitfall 1 & 3 (DNS/hosted-zone and ACM validation prerequisites that gate this apply); Code Examples (output-capture commands) |
| PUB-04 | Merge to `main` runs `Deploy site` through an *executed* `Upload site` step with correct cache-control, upload-before-invalidation, no upload on failed validation/build | Pattern 1 (hardening the soft-skip gate); Pattern 2 (commit stamp + verification, closes the loop with GATE-02); `scripts/deploy-site.sh` already verified correct — no change needed there |
| PUB-05 | `testpilots.puppetstagehand.com` resolves over HTTPS and serves every route, both JSON endpoints, and the branded 404 | Pattern 2 (post-deploy check script); Validation Architecture Phase Requirements → Test Map; Pitfall 5 (CloudFront propagation tolerance) |
| PUB-06 | Infrastructure plan job runs for real on a same-repo PR touching `infra/**`, producing a value-free plan through a plan Environment, guard still running before Environment attachment | Pattern 3 (already implemented — verify only); depends on PUB-02 landing first |
| PUB-07 | No AWS account ID, credential, state file, saved plan, `terraform.tfvars`, or `backend.hcl` value ever committed | Validation Architecture (git-grep check, reused from Phase 1 verifier); this research itself withholds the account ID it observed, modeling the same discipline |
| GATE-02 | Post-deploy step asserts deployed environment answers public routes and serves the deployed commit; skipped/failed upload fails the run | Pattern 1 + Pattern 2 together are the full implementation shape; Validation Architecture Wave 0 Gaps names both missing pieces explicitly |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| DNS resolution / hosted zone / ACM cert validation | Database/Storage (Route 53, ACM — account-level state) | CDN/Static (CloudFront consumes the validated cert) | Route 53 and ACM are account-scoped resources that gate everything downstream; they are provisioned once per environment by the apply role, not per request. |
| Static asset serving | CDN/Static (CloudFront + S3 origin via OAC) | — | The site is static-only by constraint (PROJECT.md); no app server exists. |
| CI role assumption (OIDC) | API/Backend equivalent — GitHub Actions runner acting as a short-lived AWS principal | — | The runner is the closest thing this project has to a backend identity; it never holds long-lived credentials (no access-key secrets, per PUB-02/PUB-07). |
| Upload + cache invalidation | CDN/Static (S3 write + CloudFront invalidation) | — | `scripts/deploy-site.sh` already implements this; Phase 2 does not need a new mechanism, only a real credential and a hard-fail gate around it. |
| Post-deploy live verification (GATE-02) | API/Backend equivalent (CI job making outbound HTTPS requests) | CDN/Static (the thing being checked) | This is new: a CI step that acts as an external client of the CDN tier, not a component that lives inside it. |
| GitHub Environment configuration (six Environments, branch rules, reviewers, variables) | Outside all AWS tiers — GitHub platform config | — | ADR-0002/ADR-0003: deliberately **not** OpenTofu-managed; lives in GitHub's own control plane, configured by an administrator (optionally via scripted `gh api` calls, still human-triggered). |

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| OpenTofu | 1.12.6 | IaC apply engine | `[VERIFIED: infra/environments/testpilots/main.tf:1-2 "required_version = \">= 1.12, < 2.0\""; .opentofu-version:1 "1.12.6"; local \`tofu version\` → "OpenTofu v1.12.6"]` — already the project's pinned toolchain, no change needed. |
| hashicorp/aws provider | 6.61.0 (accepts `~> 6.0`) | AWS resource provisioning | `[VERIFIED: infra/bootstrap/.terraform.lock.hcl "provider \"registry.opentofu.org/hashicorp/aws\" { version = \"6.61.0\" constraints = \"~> 6.0\" }"]` |
| `aws-actions/configure-aws-credentials` | pinned SHA `e6de054238d6b7531b4efff3b6587d9aade6a06c` (tag `v6.2.3`) | GitHub OIDC → short-lived AWS STS credentials | `[VERIFIED: .github/workflows/deploy.yml:123, infrastructure.yml:111,216]` — already used in all three role-assumption sites (deploy, plan, apply); no new wiring needed, only real Environment variables for the role ARNs it reads. |
| `opentofu/setup-opentofu` | pinned SHA `a1320f892987e89d278cc92dc5adc984fb93aca4` (tag `v2.0.2`) | Installs the pinned OpenTofu binary in CI | `[VERIFIED: .github/workflows/infrastructure.yml:37,105,211]` |
| AWS CLI v2 | 2.34.0 (local dev machine) | `aws s3 sync`, `aws cloudfront create-invalidation`, `aws sts get-caller-identity` | `[VERIFIED: local \`aws --version\`]` — used by `scripts/deploy-site.sh`, already correct; the deploy job's runner installs its own copy implicitly via the AWS CLI action environment (not explicitly pinned in `deploy.yml` — see Open Question 2). |
| GitHub CLI (`gh`) | 2.98.0 (local dev machine) | Scripting Environment/variable creation via `gh api` | `[VERIFIED: local \`gh --version\`]` — `gh` has **no dedicated `environment` subcommand**; Environment creation/configuration must go through `gh api repos/{owner}/{repo}/environments/...` (see Code Examples). |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `curl` / `jq` | system (verified present locally) | Post-deploy smoke check (GATE-02) | Simplest, dependency-free way to assert HTTPS status codes and a commit stamp from a CI step; no new npm package needed. |
| `dig` (bind-utils) | system | Pre-flight NS/A-record checks before an apply that touches DNS | Useful as a manual pre-apply sanity check, not something to add to automated CI (CI runners already have DNS resolution; the risk is registrar-level delegation, which no CI job can fix). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `curl`-based post-deploy check | A Playwright "production" project pointed at `https://testpilots.puppetstagehand.com` | Playwright is heavier (browser install, longer CI time) and this project's existing `playwright.config.ts` `production` project is hardcoded to `http://127.0.0.1:4321` — `[VERIFIED: playwright.config.ts:14-21]`. A `curl`/Node `fetch` script is faster and sufficient for "does this route return 200 and contain this commit stamp." |
| Manual GitHub UI environment creation (as `github-environments.md` currently instructs) | `gh api` scripted creation of all six Environments | The manual path is what the doc currently describes and remains valid per ADR-0002/0003 (Environments are explicitly not OpenTofu-managed). A `gh api` script is optional but strongly reduces the risk of a typo across 6 Environments × ~6-9 variables/settings each — recommend as Claude's discretion, not a requirement. |
| Single shared Route 53 zone for the whole domain (current design) | A dedicated Route 53 hosted zone for just `testpilots.puppetstagehand.com`, delegated via an NS record added at the current DNS host, leaving apex/`www` untouched | **Not available without a code change.** The current IAM design scopes the apply role's `route53:ChangeResourceRecordSets` to one `var.hosted_zone_id` **at the bootstrap level**, shared across all three environments — `[VERIFIED: infra/bootstrap/iam-github-actions.tf:442 "Resource = \"arn:${data.aws_partition.current.partition}:route53:::hostedzone/${var.hosted_zone_id}\""; infra/bootstrap/variables.tf:51-59 single \`hosted_zone_id\` variable]`. Adopting a subdomain-only zone would require restructuring bootstrap's role scoping (a real option, but out of scope for research — flagged as Open Question 1c). |

**Installation:** No new packages. This phase adds at most a short shell/Node script for the
post-deploy check; it uses tools already present in the CI image (`curl`, `jq`, `node`).

## Package Legitimacy Audit

**Not applicable this phase.** No new npm, pip, or cargo package is introduced. All tools used
(`aws-actions/configure-aws-credentials`, `opentofu/setup-opentofu`, `actions/checkout`,
`actions/upload-artifact`) are pre-existing, pinned-by-SHA GitHub Actions already committed and in
use — `[VERIFIED: .github/workflows/deploy.yml, infrastructure.yml — all four actions pinned to a
40-character commit SHA with a version comment]`. If the plan introduces a *new* Action (e.g., a
dedicated smoke-test or DNS-check action) it must be pinned by SHA and run through this gate before
being added.

## Architecture Patterns

### System Architecture Diagram

```
                     ┌─────────────────────────────────────────────┐
                     │        GitHub (control plane, not AWS)       │
                     │                                               │
  PR touches         │  pull_request ──▶ [plan job]                 │
  infra/** ──────────┼─▶ same-repo guard (job-level if:)            │
                     │        │ (only if same-repo AND job runs)     │
                     │        ▼                                     │
                     │  Environment: <root>-plan  (read-only)        │
                     │        │ id-token: write                      │
                     │        ▼                                     │
                     └────────┼─────────────────────────────────────┘
                              │ OIDC token, aud=sts.amazonaws.com,
                              │ sub=repo:.../environment:<root>-plan
                              ▼
                     ┌─────────────────────────────────────────────┐
                     │   AWS STS AssumeRoleWithWebIdentity           │
                     │   → infrastructure_plan role (per environment)│
                     └────────┬───────────────────────────────────┘
                              │ read state, refresh, tofu plan
                              ▼
                     plan-summary.txt (value-free) ── uploaded as artifact

  merge to main ─────┌─────────────────────────────────────────────┐
                     │  push:main ──▶ [validate] ──▶ [deploy job]    │
                     │        Environment: testpilots (or dispatch)  │
                     │        │ id-token: write                      │
                     │        ▼                                     │
                     │  configured? (vars present) ── NO ──▶ FAIL    │  ◀── GATE-02 changes this
                     │        │ YES                                  │      from "skip, exit 0"
                     │        ▼                                     │      to "fail the run"
                     │  build (astro build) ─▶ dist/                │
                     └────────┼─────────────────────────────────────┘
                              │ OIDC token, sub=repo:.../environment:testpilots
                              ▼
                     ┌─────────────────────────────────────────────┐
                     │  AWS STS → deploy role (site-scoped)          │
                     └────────┬───────────────────────────────────┘
                              │ s3 sync (immutable assets, then
                              │ revalidating HTML/JSON) → CloudFront invalidation
                              ▼
                     ┌─────────────────────────────────────────────┐
                     │  S3 content bucket (private, OAC-only)        │
                     │        ▲                                     │
                     │        │ signed OAC request                  │
                     │  CloudFront distribution ──▶ viewer over HTTPS│
                     │        ▲                                     │
                     │  ACM cert (us-east-1, DNS-validated)          │
                     │  Route 53 hosted zone (puppetstagehand.com)   │
                     └────────┬───────────────────────────────────┘
                              │
                              ▼  ◀── NEW: GATE-02 post-deploy step
                     curl https://testpilots.puppetstagehand.com/{route}
                     + commit-stamp comparison ── mismatch/non-200 ──▶ FAIL
```

### Recommended Project Structure

No new top-level directories. Expected touch points:

```
.github/workflows/
├── deploy.yml              # harden configured==false to fail; add post-deploy verify step
└── infrastructure.yml      # no code change expected — already correct; verify behaviorally
scripts/
├── deploy-site.sh           # unchanged — already correct cache-control + invalidation list
└── check-live-deployment.*  # NEW — post-deploy route + commit-stamp verification (name TBD by plan)
docs/operations/
├── aws-bootstrap.md         # update: record real bootstrap apply happened; zone prerequisite note
├── github-environments.md   # update: record the six Environments now exist for real
└── release.md                # no code, but the "Treat these checks as release evidence" manual
                                # step is exactly what GATE-02 should also assert by machine
```

### Pattern 1: Hardening a soft-skip step into a hard-fail gate
**What:** `deploy.yml`'s `Check deployment configuration` step currently does:
```yaml
if [[ -n "$AWS_DEPLOY_ROLE_ARN" && -n "$CONTENT_BUCKET" && -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
  echo 'configured=true' >> "$GITHUB_OUTPUT"
else
  echo 'configured=false' >> "$GITHUB_OUTPUT"
  echo 'Deployment skipped: configure all required variables in this GitHub Environment.' >> "$GITHUB_STEP_SUMMARY"
fi
```
`[VERIFIED: .github/workflows/deploy.yml:82-95]` — every subsequent step is gated by
`if: steps.deployment_configuration.outputs.configured == 'true'`, so when `configured=false` the
job has no failing step and reports **success**. This is exactly the behavior GATE-02 forbids
("a skipped or failed upload now fails the run instead of reporting green").
**When to use:** Once PUB-02/PUB-03 land, `testpilots`'s Environment variables will always be
present in a correctly configured repo. A missing variable at that point is a real
misconfiguration, not an expected soft-skip — so the branch should `exit 1` (with the same
diagnostic message) instead of merely setting `configured=false`.
**Example (illustrative, not to be pasted verbatim without plan review):**
```bash
if [[ -z "$AWS_DEPLOY_ROLE_ARN" || -z "$CONTENT_BUCKET" || -z "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
  echo 'Deployment misconfigured: required Environment variables are missing.' >> "$GITHUB_STEP_SUMMARY"
  exit 1
fi
```

### Pattern 2: Commit-stamp verification for a static, content-addressed deploy
**What:** Nothing in the current build stamps the deployed commit anywhere fetchable —
`[VERIFIED: grep -rn "GITHUB_SHA" across .astro/.ts/.js source returned no matches]`. `dist/`'s
HTML is served with `public,max-age=0,must-revalidate` — `[VERIFIED: scripts/deploy-site.sh:33-36]`
— so a small uncached file added to the upload (e.g. a plain-text or JSON file carrying
`${{ github.sha }}` at build/deploy time) can be fetched immediately after CloudFront invalidation
and compared against the SHA the workflow deployed, without waiting for any TTL to expire.
**When to use:** For GATE-02's "confirms the live host serves that exact commit" requirement. This
is new project surface — the plan must decide the exact file path/format and, per CONT-05's
pattern (even though CONT-05 itself is a Phase-3 requirement), register it in the invalidation list
in `scripts/deploy-site.sh` if it is a new cached route.
**Example:**
```yaml
- name: Stamp deployed commit
  run: echo "${{ inputs.git_sha || github.sha }}" > dist/deployed-commit.txt
  # ...must run after `npm run build`, before `Upload site`, and dist/deployed-commit.txt
  # must be synced with the same must-revalidate cache-control as other HTML/JSON.
- name: Verify live host serves this commit
  env:
    SITE_URL: https://testpilots.puppetstagehand.com
    EXPECTED_SHA: ${{ inputs.git_sha || github.sha }}
  run: |
    set -euo pipefail
    for route in / /tiers/ /compatibility/ /docs/ /docs/getting-started/ /docs/security/ /support/ /data/tiers.json /data/compatibility.json; do
      status=$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL$route")
      [[ "$status" == "200" ]] || { echo "$route returned $status" >&2; exit 1; }
    done
    live_sha=$(curl -fsS "$SITE_URL/deployed-commit.txt")
    [[ "$live_sha" == "$EXPECTED_SHA" ]] || { echo "live commit $live_sha != expected $EXPECTED_SHA" >&2; exit 1; }
```
This is illustrative shape, not a final script — the plan should decide retry/backoff behavior
(see Pitfall 5) and the branded-404 check (fetch a nonexistent path and assert the 404 body, not
just a 404 status, since CloudFront's `custom_error_response` maps both 403 and 404 origin errors
to a 200-status branded page at `/404.html` served through the error path —
`[VERIFIED: infra/modules/static-site/cloudfront.tf:218-230 custom_error_response blocks both map
error_code 403 and 404 to response_code 404, response_page_path "/404.html"]`, so a plain status-code
check on a nonexistent route is a legitimate and sufficient signal here — CloudFront's mapping
already sets `response_code = 404`, it will not appear as 200).

### Pattern 3: Value-free plan summary (already implemented — verify only)
**What:** `infrastructure.yml`'s `plan` job already builds a `plan-summary.txt` from
`tofu show -json tfplan` via `jq`, emitting only resource addresses and change-action counts, never
the raw plan (which could contain sensitive values) — `[VERIFIED: .github/workflows/infrastructure.yml:134-152]`.
The job-level guard `github.event.pull_request.head.repo.full_name == github.repository` runs
before the `environment: ${{ matrix.plan_environment }}` attachment (job-level `if:` is evaluated
by GitHub before a job is dispatched, which is before Environment protection rules are evaluated)
— `[VERIFIED: .github/workflows/infrastructure.yml:63-68]`. **This already satisfies PUB-06's
structural requirement.** Phase 2's job for PUB-06 is almost entirely: make the `*-plan`
Environments exist and be configured (PUB-02), then open a real same-repo PR touching `infra/**`
and observe the plan job actually run end-to-end and upload a value-free summary.
**When to use:** No new code needed unless behavioral verification surfaces a gap.

### Anti-Patterns to Avoid
- **Applying bootstrap or any environment as the AWS account root user:** see Pitfall 2. Root has
  no permission boundary and cannot be scoped by SCP; every AWS security guide treats root-user
  API/CLI use as an incident-worthy event outside narrow account-recovery cases.
- **Full-domain NS delegation cutover without first replicating the live apex/`www` records in the
  new zone:** see Pitfall 1. This is the single highest-impact anti-pattern this research found.
- **Leaving the deploy job's `configured=='true'` guard pattern in place after real Environment
  variables exist:** a silently-green skip is exactly what GATE-02 exists to close.
- **`pull_request_target` for the plan job:** already explicitly rejected by ADR-0002 rule 4
  (LOCKED) — do not propose it even as an optimization.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OIDC → AWS credential exchange | A custom STS `AssumeRoleWithWebIdentity` curl/API call | `aws-actions/configure-aws-credentials` (already in use) | Handles token audience, region, and credential-file wiring correctly; already pinned and proven working in this repo's plan/apply/deploy jobs. |
| S3 sync with correct cache headers | A custom upload loop | `aws s3 sync --cache-control ...` (already in `scripts/deploy-site.sh`) | Already correctly implements the two-tier cache-control policy (immutable assets vs. revalidating HTML/JSON) and `--delete` semantics; no reason to touch it for Phase 2 except adding one new stamped file to the sync + invalidation list. |
| GitHub Environment bulk configuration | Manual repeated UI clicking across 6 Environments × ~6-9 settings each | `gh api` scripted calls against `PUT /repos/{owner}/{repo}/environments/{name}`, the deployment-branch-policy endpoints, and the Environment variables endpoints | Reduces transcription risk across 6 Environments; still a human-triggered, reviewable script rather than an unattended automation — consistent with ADR-0002/0003's "GitHub Environment configuration is not managed by OpenTofu." `[ASSUMED — REST endpoint shapes from training knowledge; verify against \`gh api --help\` output and the live API response before relying on exact field names, since WebFetch/WebSearch were unavailable this session — see Open Question 3]` |
| DNS delegation / TTL propagation waiting | A custom polling script embedded in CI | A pre-flight, human-run `dig`/`whois` check before dispatching the apply (already how `aws-bootstrap.md` frames pre-apply checks) | No CI job can fix or wait out registrar-level NS propagation; treating it as a CI concern would only add flaky retries around a problem that is fundamentally a manual, once-per-environment prerequisite. |

**Key insight:** Almost none of this phase's risk is technical-implementation risk — the OIDC
wiring, the cache-control policy, the plan-job guard, and the OAC bucket policy are all already
correctly implemented and match the runbooks action-for-action. The risk is entirely in **applying
real state to a real account against a real, currently-live domain**, which is why this research
weights DNS/hosted-zone sequencing and credential hygiene so heavily over code patterns.

## Runtime State Inventory

This phase performs the project's first real AWS applies, so runtime/external state — not
just files in the repo — is the primary thing to inventory.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data (AWS) | **No** bootstrap state, S3 buckets, IAM roles, ACM certs, or CloudFront distributions currently exist — `[VERIFIED: aws sts get-caller-identity succeeds against a live, authenticated AWS identity in this shell, and \`aws route53 list-hosted-zones\` filtered for \`puppetstagehand.com.\` returned an empty list]`. Nothing to migrate; this is a from-zero apply. | Apply bootstrap, then `testpilots`, per `aws-bootstrap.md` §1–3. |
| Live service config (DNS, outside git) | **`puppetstagehand.com`'s live NS delegation currently points to Cloudflare** (`rudy.ns.cloudflare.com`, `veronica.ns.cloudflare.com` — `[VERIFIED: local \`dig +short NS puppetstagehand.com\`]`), and the apex + `www` currently resolve to GitHub Pages IPs (`185.199.108-111.x`) with `www` CNAMEd to `puppetlabs-seteam.github.io` — `[VERIFIED: local \`dig +short A puppetstagehand.com\` and \`dig +short A www.puppetstagehand.com\`]`. `testpilots.puppetstagehand.com` and `beta.puppetstagehand.com` currently return no records at all — `[VERIFIED: local \`dig +short A testpilots.puppetstagehand.com\` / \`beta...\` both empty, matching STATE.md's prior note]`. | **This is a live, currently-serving asset.** See Pitfall 1 — do not delegate the whole domain to the new Route 53 zone without first replicating current apex/`www` answers, or coordinate the cutover as a deliberate, reviewed step even though it is technically Phase 2 (not Phase 5) work that triggers it, because the shared-hosted-zone IAM design (see Alternatives Considered) forces one zone for the whole domain. |
| OS-registered state | None applicable — no local services, schedulers, or process managers are part of this delivery pipeline. | None. |
| Secrets/env vars | No AWS access-key secrets exist or should be created (PUB-02, PUB-07). GitHub Environment **variables** (not secrets) carry role ARNs, bucket names, and the distribution ID — all non-sensitive identifiers safe to store as `vars`, matching the existing pattern `[VERIFIED: .github/workflows/deploy.yml and infrastructure.yml both read \`vars.*\`, never \`secrets.*\`, for every AWS-related value]`. | Populate the six Environments' `vars` after each apply, per `github-environments.md`'s tables. |
| Build artifacts | None relevant — `dist/` is regenerated by CI on every run; nothing persists between runs that needs migrating. | None. |

## Common Pitfalls

### Pitfall 1: Full-domain NS delegation would take down a currently-live, unrelated site
**What goes wrong:** The instinct from `aws-bootstrap.md` ("the public hosted zone for
`puppetstagehand.com`") is to create a Route 53 hosted zone and delegate the whole domain to it.
Doing that today, before Route 53 has *any* records for the apex or `www`, would break the
currently-resolving GitHub Pages site the moment delegation propagates — resolvers with an expired
Cloudflare NS TTL would start asking Route 53, get `NXDOMAIN`/`SERVFAIL` for the apex and `www`
(since only `testpilots`'s records would exist yet, created by this phase's `tofu apply`), and the
live site would go dark until Phase 5's `stable` apply runs, which could be weeks away.
**Why it happens:** The runbooks were written and reviewed against a design that assumes
`puppetstagehand.com` is not yet live — a correct assumption for a brand-new domain, but this one
is not new; it is live. Nothing in `aws-bootstrap.md`, `github-environments.md`, ADR-0002, or
ADR-0003 mentions this, and the STATE.md blocker note ("ACM validation can hang… if NS delegation is
incomplete") only flagged the ACM-hang risk, not the live-site-outage risk.
**How to avoid:** Before switching registrar delegation, pre-populate the new Route 53 zone with A
(or ALIAS/CNAME-equivalent) records that reproduce the current GitHub Pages answers for the apex and
`www` (or, if organizationally acceptable, coordinate the cutover with whoever owns
`puppetlabs-seteam.github.io` and treat the apex/`www` replacement as happening now rather than
waiting for Phase 5 — a decision for the human maintainer, not this research). Either way this is a
**discuss-phase-worthy decision**, not a plan-time implementation detail — flagged as Open Question 1.
**Warning signs:** Any plan step that runs `tofu apply` in `infra/bootstrap` or any environment root
without first confirming with the maintainer what should happen to `puppetstagehand.com`'s current
NS delegation.

### Pitfall 2: Applying as the AWS account root user
**What goes wrong:** `aws sts get-caller-identity` in this environment currently resolves to the
account's **root** principal (`Arn: arn:aws:iam::<account>:root` — account number withheld from this
document per PUB-07/the "no AWS account identifier committed" constraint, but confirmed present via
a local, read-only `aws sts get-caller-identity` call this session). `aws-bootstrap.md` explicitly
instructs "Authenticate with the organization's approved short-lived method (`aws sso login` when
AWS IAM Identity Center is configured)" — root is neither short-lived nor an IAM Identity Center
identity.
**Why it happens:** Root is often the only identity configured on a brand-new personal/test AWS
account, and it is tempting to just use what's already authenticated to get the first real apply
done.
**How to avoid:** Before running any bootstrap `tofu apply`, create (or confirm the existence of) a
named IAM identity — an IAM Identity Center permission set, or at minimum a dedicated IAM user or
role with an attached policy scoped to what bootstrap needs — and use that instead. Root should be
used only for irrecoverable account-level recovery, never for routine applies.
**Warning signs:** Any `aws sts get-caller-identity` in a runbook step showing an `:root` ARN.

### Pitfall 3: ACM DNS validation can hang for the full provider timeout if delegation isn't propagated
**What goes wrong:** `aws_acm_certificate_validation.site` blocks the `tofu apply` until AWS
observes the validation CNAME/TXT record via DNS, or until the resource's timeout elapses.
**Why it happens:** If the hosted zone's records exist in Route 53 but the zone itself is not yet
the domain's authoritative NS answer (see Pitfall 1) — or if propagation is still in flight — the
public DNS resolvers AWS's validation service queries will not see the validation record, and the
`tofu apply` will sit until timeout rather than failing fast.
**How to avoid:** Confirm NS delegation has actually propagated (`dig +short NS
testpilots.puppetstagehand.com` or the full domain, from a network path outside any corporate/VPN
resolver cache) *before* running the environment-root apply that creates the ACM certificate and its
validation records. Treat this as a discrete pre-flight step, not something to discover mid-apply.
**Warning signs:** `tofu apply` for an environment root running far longer than the other steps
with no error output — this is almost certainly ACM DNS validation waiting.
`[ASSUMED — the specific default timeout value for \`aws_acm_certificate_validation\` (commonly
cited as 45 minutes in the hashicorp/aws provider) could not be freshly confirmed this session
because WebFetch to the Terraform Registry returned a harness-level error; the qualitative
behavior — it blocks the apply rather than failing immediately — is well-established, long-standing
provider behavior and is treated as MEDIUM confidence despite the unconfirmed exact number.]`

### Pitfall 4: The deploy job's current soft-skip pattern silently satisfies "green" with zero bytes published
**What goes wrong:** Exactly the bug GATE-02 names: if any of `AWS_DEPLOY_ROLE_ARN`,
`CONTENT_BUCKET`, or `CLOUDFRONT_DISTRIBUTION_ID` is empty, `deploy.yml`'s `deploy` job has no
failing step and GitHub reports the run green, even though nothing was uploaded —
`[VERIFIED: .github/workflows/deploy.yml:82-95, all downstream steps gated by \`if:
steps.deployment_configuration.outputs.configured == 'true'\` with no corresponding failure branch]`.
**Why it happens:** This soft-skip was a deliberate scaffold-era design (so the workflow wouldn't
hard-fail before any Environment was configured) — but it was never revisited once real environments
were expected to exist.
**How to avoid:** Once PUB-02/PUB-03 make `testpilots`'s Environment variables a permanent fixture,
flip the branch to `exit 1` (see Pattern 1).
**Warning signs:** A `Deploy site` run reporting success with a step-summary line reading
"Deployment skipped" still present in the run's summary.

### Pitfall 5: CloudFront's `wait_for_deployment = false` means the `tofu apply` for a distribution returns before the distribution is actually serving
**What goes wrong:** `aws_cloudfront_distribution.site` is configured with
`wait_for_deployment = false` — `[VERIFIED: infra/modules/static-site/cloudfront.tf:147]` — so the
environment-root `tofu apply` completes as soon as AWS accepts the distribution config, not once
it has propagated to all edge locations. A post-deploy smoke check that runs immediately after
`tofu apply` (during the *environment* apply, not the *content* deploy) could see stale or
inconsistent responses for a period after the infrastructure apply, independent of any content
upload.
**Why it happens:** `wait_for_deployment = false` is a reasonable choice to keep `tofu apply` fast
(CloudFront full propagation can take significant time), but it means "apply succeeded" and "the
distribution is fully live everywhere" are different moments.
**How to avoid:** GATE-02's post-deploy check runs after the **content deploy** job (which assumes
the distribution already exists and is stable from the earlier environment-root apply), not
immediately after the environment-root `tofu apply` — so this mostly matters for the *first*
`testpilots` apply (PUB-03), where the very first smoke test of the freshly created distribution
should tolerate a short propagation window (a bounded retry/backoff, not an indefinite wait) before
concluding failure.
**Warning signs:** A first-ever post-`testpilots`-apply check failing with connection resets or
`SSLHandshakeError` that clears up on retry a few minutes later.

### Pitfall 6: A workflow referencing a GitHub Environment name can auto-create it with no protection rules
**What goes wrong:** If any workflow run references `environment: testpilots` (etc.) before an
administrator has manually created and configured that Environment with its branch policy and
reviewers, GitHub may auto-create a bare, unprotected Environment under that name on first
reference.
**Why it happens:** This is standard GitHub Actions platform behavior for convenience, not a bug —
but it means the *order* of "create the six Environments with their full configuration" (PUB-02)
relative to "first workflow run that references any of the six names" matters: doing it out of
order could leave an Environment temporarily existing with none of the required branch/reviewer
protections until an administrator revisits and fixes it.
**How to avoid:** Sequence PUB-02 (create + fully configure all six Environments) strictly before
merging or dispatching any workflow run that references `environment: testpilots|beta|stable|
testpilots-plan|beta-plan|stable-plan`.
**Warning signs:** A newly visible Environment in **Settings → Environments** with no reviewers and
no deployment branch policy set.
`[ASSUMED — this is standard, long-standing GitHub Actions platform behavior from training
knowledge; could not be freshly re-confirmed against current docs this session because both
WebSearch and WebFetch returned a harness-level model error on every call. Treat as MEDIUM
confidence and verify by inspecting **Settings → Environments** immediately after the first
relevant workflow run, before assuming any of the six Environments is unprotected.]`

## Code Examples

### Reading bootstrap's role ARNs and environment site outputs (already-verified runbook commands)
```sh
# Source: docs/operations/aws-bootstrap.md (read this session, current & correct post-Phase-1)
tofu -chdir=infra/bootstrap output -json infrastructure_plan_role_arns
tofu -chdir=infra/bootstrap output -json infrastructure_apply_role_arns
tofu -chdir=infra/environments/testpilots output -raw content_bucket_name
tofu -chdir=infra/environments/testpilots output -raw distribution_id
tofu -chdir=infra/environments/testpilots output -raw deployment_role_arn
```

### Existing, correct cache-control + invalidation pattern (no change needed except one new path)
```sh
# Source: scripts/deploy-site.sh (read this session, verified current)
aws s3 sync dist/assets "s3://$CONTENT_BUCKET/assets" \
  --cache-control 'public,max-age=31536000,immutable' \
  --delete

aws s3 sync dist "s3://$CONTENT_BUCKET" \
  --exclude 'assets/*' \
  --cache-control 'public,max-age=0,must-revalidate' \
  --delete

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths '/index.html' '/tiers/index.html' '/compatibility/index.html' \
  '/docs/index.html' '/docs/getting-started/index.html' '/docs/security/index.html' \
  '/support/index.html' '/404.html' '/data/*'
  # NEW: add the commit-stamp file's path here if one is introduced (Pattern 2)
```

### `gh api` shape for scripted Environment creation (illustrative — verify field names before use)
```sh
# ASSUMED shape from training knowledge — verify against `gh api --help` and a real response
# before relying on exact field names (WebFetch/WebSearch unavailable this session).
gh api --method PUT "repos/puppet-stagehand/stagehand-docs/environments/testpilots" \
  -f 'deployment_branch_policy[protected_branches]=false' \
  -f 'deployment_branch_policy[custom_branch_policies]=true'

gh api --method PUT \
  "repos/puppet-stagehand/stagehand-docs/environments/testpilots/deployment-branch-policies" \
  -f name='main'

gh api --method POST \
  "repos/puppet-stagehand/stagehand-docs/environments/testpilots/variables" \
  -f name='AWS_REGION' -f value='us-east-2'
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Manually provisioned plan/apply IAM roles (per `github-environments.md`'s original prose) | Roles created by `infra/bootstrap/` OpenTofu (ADR-0003) | Phase 1, completed 2026-08-26 | Phase 2 now only needs to *apply* and *read outputs*, not hand-craft trust policies. |
| Three-Environment mental model | Six-Environment model (ADR-0002) with `-plan` suffix for read-only pull-request planning | Locked, predates Phase 1 | Doubles the Environment-configuration surface for PUB-02, but is not new work introduced by this research — already the documented target state. |

**Deprecated/outdated:** None found specific to this phase's tooling — OpenTofu 1.12, AWS provider
6.x, and the pinned GitHub Actions are all current as installed/locked in this repository.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `gh api` REST endpoint paths/field names for Environment and Environment-variable creation | Don't Hand-Roll; Code Examples | Low — this is an optional, Claude's-discretion convenience script, not a requirement; if the shape is wrong, `gh api` will return a 4xx and nothing is silently misconfigured. Verify against `gh api --help` / a real dry-run before including in a plan as anything more than illustrative. |
| A2 | `aws_acm_certificate_validation`'s default create-timeout value (commonly cited as 45 minutes) | Pitfall 3 | Low — the qualitative behavior (it blocks rather than fails fast) is what matters operationally; the exact minute value doesn't change what an operator should do (wait, or investigate delegation) if an apply runs unusually long. |
| A3 | GitHub Actions auto-creates an unprotected Environment on first workflow reference if it doesn't already exist | Pitfall 6 | Medium — if this is wrong (e.g., GitHub now requires the Environment to pre-exist and instead fails the run), the practical planning implication is the same or safer (sequencing PUB-02 first is still correct either way), so risk of *acting* on this assumption is low; risk is only in over-stating certainty. |

**If this table is empty:** N/A — see rows above. Every other claim in this document that carries
a `[VERIFIED: ...]` tag was confirmed this session either by reading the cited file directly or by
running the cited local, read-only command (`tofu version`, `aws sts get-caller-identity`, `aws
route53 list-hosted-zones`, `dig`, `gh --version`, `aws --version`).

## Open Questions

1. **What should happen to `puppetstagehand.com`'s live NS delegation and its current GitHub Pages
   content at the apex/`www` during this phase?**
   - What we know: the domain is live today via Cloudflare NS, serving `puppetlabs-seteam.github.io`
     content at both the apex and `www`. `testpilots`/`beta` currently resolve to nothing. The
     current IAM/OpenTofu design requires one shared Route 53 hosted zone across all three
     environments (testpilots/beta/stable), which architecturally couples "get `testpilots` to
     resolve" to "the whole domain's authoritative NS answer moves to Route 53."
   - What's unclear: whether the project owner wants (a) apex/`www` records pre-populated in the new
     Route 53 zone to exactly mirror the current GitHub Pages answers before any delegation switch
     (safest, but extra one-time work outside this repo's OpenTofu, since `stable`'s Terraform
     records won't exist until Phase 5), (b) to accept the apex/`www` going dark until Phase 5 lands
     (very likely unacceptable for a live site), or (c) a code change to scope IAM/records per-zone
     so `testpilots` can be delegated independently without touching apex/`www` at all.
   - Recommendation: raise explicitly in `/gsd-discuss-phase` before planning proceeds — this is a
     product/ops decision, not an implementation detail, and it gates the very first `tofu apply`.

2. **Is the AWS CLI version inside the GitHub Actions `ubuntu-latest` runner image sufficient for
   `aws s3 sync`/`aws cloudfront create-invalidation`, and is it pinned anywhere?**
   - What we know: `deploy.yml` calls `scripts/deploy-site.sh`, which shells out to `aws` directly,
     relying on whatever AWS CLI ships in the `ubuntu-latest` image (no explicit `aws-actions/*`
     CLI-install step was found in the workflow).
   - What's unclear: whether the runner image's bundled AWS CLI version is new enough for every flag
     used (`--cache-control`, `use_lockfile`-style backend config is OpenTofu-side, not CLI-side, so
     likely fine) — this is a minor, low-risk gap.
   - Recommendation: not blocking; note as a plan-time nice-to-have to pin the AWS CLI version
     explicitly if reproducibility becomes a concern later (v2 territory, not this phase).

3. **Exact `gh api` field names/endpoints for Environment configuration were not freshly verified.**
   - What we know: `gh` 2.98.0 is installed locally and has a general `gh api` escape hatch but no
     dedicated `gh environment` subcommand `[VERIFIED: local \`gh --version\`; \`gh environment
     --help\` fell through to \`gh\`'s generic help text rather than showing environment-specific
     usage]`.
   - What's unclear: precise REST field names for deployment branch policies, custom branch/tag
     rules (needed for the `refs/pull/*/merge` rule on `-plan` Environments), and reviewer/
     prevent-self-review settings — WebSearch and WebFetch both returned a harness-level model error
     on every call this session, so the GitHub REST API docs could not be freshly checked.
   - Recommendation: if the plan chooses to script Environment creation via `gh api`, budget a
     `checkpoint:human-verify` step to confirm the exact endpoint/field shape against a real
     dry-run (`gh api --method PUT .../environments/testpilots-plan --dry-run` is not itself
     supported by `gh`, so verify by making one real, reversible call against a throwaway or the
     real Environment and inspecting the response) before scripting all six.
   - **Tooling note:** WebSearch and WebFetch were unavailable for the entirety of this research
     session (both returned "There's an issue with the selected model (haiku)" on every attempt,
     across multiple distinct queries and providers). This is a harness/environment condition, not
     a content gap this researcher chose not to pursue — re-attempt live verification of A1–A3 and
     Open Questions 2–3 once those tools are available again, ideally before this phase's plan is
     executed rather than merely before it is written.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| OpenTofu | All applies | Yes (local dev machine) | 1.12.6 | CI installs its own pinned copy via `opentofu/setup-opentofu`; no fallback needed. |
| AWS CLI v2 | `deploy-site.sh`, manual bootstrap steps | Yes (local dev machine) | 2.34.0 | CI relies on the runner image's bundled CLI (see Open Question 2). |
| `gh` CLI | Optional Environment-scripting convenience | Yes (local dev machine) | 2.98.0 | Manual UI configuration remains the documented, always-available fallback per `github-environments.md`. |
| Authenticated AWS identity | Bootstrap apply | Yes — **but currently resolves to the account root user**, which Pitfall 2 says not to use for the actual apply | n/a (identity, not a version) | A named IAM Identity Center permission set or dedicated IAM role/user must be established first; see Pitfall 2. |
| Route 53 public hosted zone for `puppetstagehand.com` | ACM DNS validation, all environment DNS records | **No** — verified absent via `aws route53 list-hosted-zones` | n/a | Must be created as part of this phase's bootstrap/environment work; see Pitfall 1 for the sequencing risk. |
| Live NS delegation to Route 53 | ACM DNS validation to actually complete | **No** — domain currently delegated to Cloudflare, serving GitHub Pages content at apex/`www` | n/a | None — this is the literal blocking prerequisite; see Open Question 1. |
| WebSearch / WebFetch tools | Fresh verification of GitHub/AWS platform documentation claims | **No** — both tools returned a harness-level error on every call this session | n/a | Training-knowledge claims carried as `[ASSUMED]`, logged in the Assumptions Log; re-attempt before/during execution. |

**Missing dependencies with no fallback:**
- Route 53 hosted zone + live NS delegation for `puppetstagehand.com` — this phase cannot complete
  PUB-01/PUB-03/PUB-05 without resolving this, and per Pitfall 1 it must be resolved *deliberately*,
  not just "created."

**Missing dependencies with fallback:**
- A non-root AWS identity for applying (fallback: provision one — this is expected, normal
  first-time-bootstrap work, not a gap in the repository).
- Fresh WebSearch/WebFetch verification of a handful of platform-behavior claims (fallback: proceed
  on `[ASSUMED]` training knowledge, tagged and logged, with a recommendation to re-verify before
  execution).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit), Playwright (e2e) — both already configured; this phase adds a third, lightweight category: a live-HTTP smoke check with no existing framework home |
| Config file | `vitest` via `package.json` scripts; `playwright.config.ts` — `[VERIFIED: package.json scripts block; playwright.config.ts read this session]` |
| Quick run command | `npm run check:routes` (local build-output route check — does not hit the network) |
| Full suite command | `npm run verify` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| PUB-04 | Merge to `main` produces an executed `Upload site` step, not a skip | integration (workflow behavior) | Re-run `Deploy site` on `main` after PUB-02/PUB-03 land; inspect the run's step list for `Upload site` actually executing | ❌ Wave 0 — this is a workflow-behavior assertion; the closest thing to an automated proxy is the new post-deploy check (GATE-02) failing loudly if upload didn't happen |
| PUB-05 | `testpilots.puppetstagehand.com` serves every route + both JSON endpoints + branded 404 over HTTPS | smoke/e2e against a live host | New script (Pattern 2) — name TBD by plan, e.g. `scripts/check-live-deployment.ts` | ❌ Wave 0 — does not exist yet |
| GATE-02 | Post-deploy step asserts routes answer and the deployed commit matches | integration, runs inside `deploy.yml` | Same new script as PUB-05, invoked as a `deploy.yml` step | ❌ Wave 0 |
| PUB-06 | Same-repo PR touching `infra/**` produces a real value-free plan through a plan Environment | manual/behavioral (requires a live PR against a live repo with configured Environments) | Open a real PR after PUB-02 lands; inspect the `plan` job's artifact | manual-only — justified: this asserts GitHub platform behavior (Environment protection + job guard interaction) that cannot be unit-tested locally |
| PUB-01, PUB-02, PUB-03, PUB-07 | Bootstrap/Environments/testpilots applied correctly; no secrets committed | mixed: `tofu test`/`tofu plan` review (already exists from Phase 1) + manual GitHub Environment inspection + `git grep` for account IDs/credentials | `tofu -chdir=infra/bootstrap test`; manual review of **Settings → Environments**; `git grep -n -E '[0-9]{12}'` (already used by the Phase 1 verifier) | ✅ Phase 1 tofu tests exist; the git-grep and manual-review checks are lightweight and don't need a new file |

### Sampling Rate
- **Per task commit:** `npm run verify` remains the standing local/CI gate for anything touching
  `src/`, `scripts/`, or `tests/`; `tofu -chdir=<root> test` for anything touching `infra/`.
- **Per wave merge:** Full `npm run verify` plus, once real credentials exist, a real dispatch of
  the affected workflow (`Deploy site` or `Infrastructure`) against `testpilots` — there is no way
  to validate OIDC role assumption, DNS, or CloudFront behavior without a real AWS call.
- **Phase gate:** All five ROADMAP.md success criteria must be independently observed true — the
  live host answering over HTTPS, a real `Deploy site` run showing an executed `Upload site` step
  with the new post-deploy check passing, all six Environments correctly configured, a real PR
  producing a real plan, and a `git grep`/manual review confirming no secret material was
  committed.

### Wave 0 Gaps
- [ ] A post-deploy live-verification script (Pattern 2) — covers PUB-05, GATE-02. Does not exist
      in any form today.
- [ ] A commit-stamp mechanism in the build/deploy step (Pattern 2) — a prerequisite for the above,
      also does not exist today.
- [ ] No test-framework install gap — Vitest/Playwright/`tofu test` are all already present and
      configured; the new script is intentionally framework-light (`curl`/`fetch`-based), not a new
      Playwright project, per the Alternatives Considered table.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | No | No user-facing authentication in this phase (that's Phase 04.1's AUTH-01..05, a shared-password edge gate, not covered here). |
| V3 Session Management | No | Static site, no sessions. |
| V4 Access Control | Yes | GitHub Environment protection rules (required reviewers, branch restrictions) + AWS IAM role trust-policy scoping (already implemented by Phase 1, `[VERIFIED: infra/bootstrap/iam-github-actions.tf]`) are the access-control mechanism for *who can publish*, not for end-user access. |
| V5 Input Validation | Partial | The workflows already validate `git_sha` format (`^[0-9a-f]{40}$`) and environment enum values via `scripts/assert-promotable-commit.sh` — `[VERIFIED: scripts/assert-promotable-commit.sh:16-30]`. No new user-facing input surface is introduced by this phase. |
| V6 Cryptography | Yes (indirectly) | TLS termination via ACM-issued certificate, `TLSv1.2_2021` minimum protocol — `[VERIFIED: infra/modules/static-site/cloudfront.tf:238-242]`. No custom crypto; this phase does not touch the certificate configuration itself. |
| V13 API and Web Service | Yes | The CloudFront response-headers policy already sets a restrictive CSP, `X-Frame-Options: DENY`, HSTS with preload, and `X-Content-Type-Options` — `[VERIFIED: infra/modules/static-site/cloudfront.tf:84-121]`. Phase 2 does not modify this; it only makes the pipeline that ships behind it actually run. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Long-lived AWS credentials leaking from CI | Information Disclosure / Elevation of Privilege | OIDC short-lived STS credentials only, no access-key secrets — already the design (PUB-02/PUB-07), this phase must not regress it. |
| `pull_request_target` exposing secrets to untrusted PR code | Elevation of Privilege | Explicitly rejected by ADR-0002 rule 4 (LOCKED); `infrastructure.yml` uses `pull_request` with a job-level same-repo guard instead — `[VERIFIED]`. |
| Root-user AWS API calls | Elevation of Privilege / accountability gap | See Pitfall 2 — use a named, scoped identity for the actual apply. |
| S3 bucket left publicly readable | Information Disclosure | `aws_s3_bucket_public_access_block` with all four block flags `true`, bucket policy scoped to CloudFront's OAC via `AWS:SourceArn` condition — `[VERIFIED: infra/modules/static-site/s3.tf:34-41,60-81]`. Nothing in this phase changes this; the post-deploy check (Pattern 2) does not need to (and should not) attempt to verify the bucket's private-origin guarantee directly by S3 URL — that assertion belongs to GATE-07 (Phase 04.2, DOWN-02), not this phase. |
| Silent CI failure reporting green | Repudiation / false assurance | GATE-02 is precisely the fix for this — no new threat, but worth naming since it is this phase's core deliverable. |

## Sources

### Primary (HIGH confidence — direct file reads and local read-only command execution this session)
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md` — requirement text, prior
  blockers, phase sequencing rationale
- `.planning/phases/01-infrastructure-role-ownership/01-VERIFICATION.md` — confirms Phase 1's actual
  delivered state (six roles exist in OpenTofu, not yet applied to any AWS account)
- `docs/adr/0002-github-environment-model.md`, `docs/adr/0003-infrastructure-iam-role-ownership.md`
  — locked decisions this phase must not reopen
- `docs/operations/aws-bootstrap.md`, `docs/operations/github-environments.md`,
  `docs/operations/release.md` — current, just-rewritten runbooks
- `.github/workflows/deploy.yml`, `.github/workflows/infrastructure.yml`,
  `.github/workflows/validate.yml`, `.github/actions/setup-site/action.yml`
- `infra/bootstrap/*.tf`, `infra/environments/{testpilots,beta,stable}/*.tf`,
  `infra/modules/static-site/*.tf` (all files read in full)
- `scripts/deploy-site.sh`, `scripts/assert-promotable-commit.sh`, `scripts/check-tofu-tags.sh`,
  `scripts/check-built-routes.ts`
- `package.json` scripts block; `playwright.config.ts`; `.opentofu-version`;
  `infra/bootstrap/.terraform.lock.hcl`
- Local command execution this session: `tofu version`, `aws --version`, `gh --version`,
  `aws sts get-caller-identity`, `aws route53 list-hosted-zones`, `dig` (NS/A/MX records for
  `puppetstagehand.com` and its subdomains) — all read-only, no state changed

### Secondary (MEDIUM confidence)
- None this session — WebSearch/WebFetch (the normal route to this tier) were unavailable.

### Tertiary (LOW confidence — training knowledge, flagged `[ASSUMED]`)
- `gh api` REST endpoint shapes for Environment configuration (Assumption A1)
- `aws_acm_certificate_validation` default timeout value (Assumption A2)
- GitHub Actions auto-creating an unprotected Environment on first reference (Assumption A3)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every tool/version claim verified from a committed lock file, version
  file, or local command output.
- Architecture: HIGH — every workflow/IAM/CloudFront/S3 claim verified by direct file read; the
  diagram reflects code that already exists, not a proposal.
- Pitfalls: HIGH for Pitfalls 1, 2, 4, 5 (all directly observed via local tool calls or file reads);
  MEDIUM for Pitfalls 3 and 6 (qualitative behavior well-established, exact parameters unverified
  this session due to tool outage).

**Research date:** 2026-08-26
**Valid until:** Re-verify the DNS/hosted-zone state (Runtime State Inventory, Pitfall 1) and the
`gh api`/GitHub-platform assumptions (Open Question 3) immediately before this phase is executed —
DNS state in particular can change at any time and should be treated as perishable, not a
30-day-stable finding like the rest of this document.
