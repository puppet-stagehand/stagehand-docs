# Phase 5: Production Launch - Research

**Researched:** 2026-08-26
**Domain:** Operations / release engineering — DNS cutover, GitHub Environments deployment approval, CloudFront/ACM, release evidence process
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**DNS cutover blast radius (the central decision for this phase)**
- **D-01:** `puppetstagehand.com`'s registrar/NS currently points to Cloudflare and serves an
  unrelated, currently-live GitHub Pages site (`puppetlabs-seteam.github.io`) at both the apex and
  `www`. This is the deferred cutover that Phase 2's `02-CONTEXT.md` (D-01/D-03) explicitly pushed
  to "a separate, later, deliberate decision the user will make outside of this automated run" —
  this phase is that later moment. — **Reversibility:** one-way — **rationale:** flipping the live
  registrar's NS records away from Cloudflare takes down a currently-serving, unrelated production
  site if done incorrectly; DNS propagation delay makes a bad change slow to undo and outside git's
  reach entirely.
- **D-02:** This phase's plan applies all AWS-side infrastructure for `stable` (Route 53 records,
  CloudFront distribution, alternate domain names, the apex-redirect Lambda@Edge/CloudFront
  Function per `infra/modules/static-site/functions/redirect.js`) and produces a precise,
  step-by-step runbook for the registrar-level NS change — but the actual NS flip at the registrar
  is executed by a human maintainer, not by the plan's executor.
- **D-03:** The plan MUST include an explicit `checkpoint:human-action` immediately before/around
  the registrar NS change step. Do not create a task that performs or simulates the registrar
  change itself. The runbook step should state the exact NS records to set (from the Route 53
  hosted zone created per `docs/operations/aws-bootstrap.md`) and a verification method (e.g. `dig
  NS puppetstagehand.com`) the maintainer runs after making the change.
- **D-04:** Everything reachable without the registrar cutover (stable environment apply, redirect
  function, GATE-05 test wiring, release-evidence logging, rollback proof against the CloudFront
  default domain or testpilots/beta hostnames) IS in scope for automated execution. Only the final
  registrar NS flip and the resulting customer-facing DNS resolution are gated on human action.

**Release evidence recording**
- **D-05:** Every promotion (testpilots→beta, beta→stable) and every rollback appends an entry to a
  single committed log file, `docs/operations/RELEASE-EVIDENCE.md` (new file, alongside the
  existing `docs/operations/` runbooks). Each entry records: date/time, environment, full 40-char
  SHA, the release.md checks performed (home, tiers, compatibility, docs, support, both JSON
  endpoints, branded 404, and — for stable only — the apex redirect), and pass/fail per check.
  — **Reversibility:** reversible — it's an append-only markdown log; format can change later
  without breaking anything upstream.
- **D-06:** The rollback proof (LAUN-05) appends its own entry to the same `RELEASE-EVIDENCE.md`
  file: the incident description, the known-good SHA selected, the dispatch run link/ID, and
  confirmation that the previous pages were restored. No separate rollback log.
- **D-07:** This log is a release-time artifact the *plan* scaffolds (template/structure) and the
  *operator* fills in per real promotion — the plan should not fabricate evidence for promotions
  that haven't actually happened. Where the plan's own execution genuinely performs a promotion
  (e.g., to testpilots/beta, which don't require the registrar cutover), it may record real
  evidence directly.

**Security advisory reporting**
- **D-08:** GitHub's private Security Advisory path ("Security → Advisories → Report a
  vulnerability") is verified as enabled via a task the executor CAN check deterministically
  (repository security settings / API). This is in-scope for automated verification.
  — **Reversibility:** reversible.
- **D-09:** The `security@puppetstagehand.com` mailbox provisioning and delivery test is a
  `checkpoint:human-action` — Claude has no access to real mailbox infrastructure. The plan
  documents the exact test procedure (send a test message, confirm receipt) and where to record
  the result: the same `RELEASE-EVIDENCE.md` log (or `SECURITY.md` if that reads more naturally —
  planner's call), per D-05's format. LAUN-04's "before the production host serves customers" gate
  MUST block the stable promotion task until this checkpoint is confirmed.

**GATE-05 wiring**
- **D-10:** `infra/modules/static-site/tests/redirect.test.mjs` (a plain `node:test` file, not
  vitest) is wired into `npm run verify` via a new dedicated npm script — e.g. `"test:redirect":
  "node --test infra/modules/static-site/tests/"` — added to the `verify` chain in `package.json`.
  Do not convert the test to vitest; leave the existing test file's runner as-is.
- **D-11:** The equivalent CI workflow (`validate.yml` or wherever `npm run verify`/its constituent
  scripts run) must also execute this new script — verify it isn't only wired locally.

### Claude's Discretion
- Exact `RELEASE-EVIDENCE.md` file location/name variations, its markdown structure/table format,
  and whether SECURITY.md or RELEASE-EVIDENCE.md is the better home for the mailbox-delivery test
  record are left to the planner.
- How LAUN-05's rollback proof is exercised against a non-registrar-cutover-dependent target (e.g.,
  beta, or stable via its CloudFront default domain / testpilots) so it doesn't require the
  registrar cutover to have already happened, is left to the planner/executor informed by research.
- Sequencing of GATE-05 wiring relative to the DNS/promotion tasks (GATE-05 has no dependency on
  DNS) is left to the planner.

### Deferred Ideas (OUT OF SCOPE)
- **Operational hardening (WAF, CloudWatch alarms, budget alerts, synthetic canaries, access
  logging)** — already tracked as OPS-01..12, deferred to v2 in STATE.md; reconfirmed out of scope
  here.
- **Full automation of the registrar DNS cutover** — explicitly rejected as a phase-5 goal per
  D-02/D-03 above; revisit only if the organization later wants a registrar API integration.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAUN-01 | Beta environment applied; exact testpilots SHA promoted to beta, unaltered | ACM-validation-CNAME precedent (§Common Pitfalls #1); beta root missing `distribution_domain_name` output (§Common Pitfalls #2); solo-maintainer self-review blocker (§Common Pitfalls #3) all gate this task |
| LAUN-02 | Stable applied as deliberate DNS cutover; `www` serves, apex redirects without altering path/query | `enable_apex_redirect` local already correctly scoped to stable (§Architecture, verified); registrar cutover is D-01..D-04's human-gated step; stable root missing `distribution_domain_name` output |
| LAUN-03 | Release evidence recorded per deployment with full SHA | `RELEASE-EVIDENCE.md` template design (§Code Examples); `release.md`'s exact check list already defines the columns |
| LAUN-04 | Private vulnerability reporting enabled and verified; `security@` delivery tested and recorded before stable serves customers | Live `gh api` check confirms current state is DISABLED (§Common Pitfalls #4) — real gap to close, not just verify |
| LAUN-05 | Rollback proven end-to-end via protected dispatch path; no manual S3 edit | `deploy.yml`'s `workflow_dispatch` only offers `beta`/`stable` (not `testpilots`) — confirmed by reading the workflow; `assert-promotable-commit.sh` already supports any ancestor SHA, so no new code needed |
| GATE-05 | `redirect.test.mjs` wired into `npm run verify` and CI | Exact working npm script glob verified empirically (§Common Pitfalls #5) — the example in CONTEXT.md's D-10 does NOT work as written |
</phase_requirements>

## Summary

This phase is overwhelmingly an operations phase, not a code phase — the redirect logic, the
promotion/rollback dispatch mechanics, and the six-Environment model are all already built and
documented in `docs/operations/release.md` and `docs/adr/0002-github-environment-model.md`. The
work is: (1) apply `beta` and `stable` AWS infrastructure for real, (2) wire one dead test into the
verify chain, (3) scaffold and populate a release-evidence log, (4) close a real, verified gap in
GitHub's private-vulnerability-reporting setting, and (5) prove a rollback. Research this session
found three previously-undocumented blockers that will stop an executor cold if the plan doesn't
account for them up front: a missing Terraform output on two of three environment roots, a
solo-maintainer self-review deadlock on every protected-environment approval, and a non-obvious ACM
DNS-validation dependency that Phase 2 already solved once for `testpilots` and must be repeated
for `beta` and `stable`.

**Primary recommendation:** Structure the plan around the precedent Phase 2 already established for
`testpilots` (narrowly-scoped ACM validation CNAME added at Cloudflare via `checkpoint:human-action`,
apply via AWS-side automation, verify via CloudFront default domain) and repeat it once for `beta`
and once for `stable`, decoupling every automatable check from the registrar NS flip so LAUN-01,
LAUN-05, and most of LAUN-03 can complete before D-03's human checkpoint is ever reached.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| DNS resolution (apex/www/beta/testpilots hostnames) | CDN / Static (Route 53 + registrar) | — | Route 53 hosted zone already owns the records; registrar NS delegation is the missing link, gated on human action per D-01/D-03 |
| TLS termination & ACM validation | CDN / Static (CloudFront + ACM, us-east-1) | Database/Storage (Route 53 validation CNAME) | `aws_acm_certificate_validation` polls the *public* DNS chain, not the Route 53 zone directly — see Common Pitfalls #1 |
| Apex→www redirect | CDN / Static (CloudFront Function, viewer-request) | — | Already implemented in `redirect.js`, gated by `enable_apex_redirect` local scoped to `stable` only |
| Content delivery | CDN / Static (CloudFront) + Database/Storage (private S3 origin) | — | Existing OAC pattern from Phase 2; no change this phase |
| Deployment authorization | API / Backend (GitHub Environments + OIDC) | — | Six-Environment model (ADR-0002) is the authorization boundary; this phase exercises it for `beta`/`stable` for the first time |
| Release evidence | Database/Storage (git-committed markdown) | — | `docs/operations/RELEASE-EVIDENCE.md`, append-only, no runtime component |
| Vulnerability reporting | API / Backend (GitHub repository setting) + external (mailbox) | — | `private-vulnerability-reporting` is a repository-level API toggle; `security@` mailbox is fully outside this repo's control |
| Redirect test enforcement | Browser/Client N/A — CI / Build tooling | — | `node:test` run inside `npm run verify`, which CI already invokes on every PR/push |

## Standard Stack

This phase adds no new runtime dependencies. Everything needed is already in the tree.

### Core (already present, no version change)
| Tool | Version (verified) | Purpose | Source |
|------|---------|---------|--------|
| OpenTofu | 1.12.6 | Applies `beta`/`stable` environment roots | `[VERIFIED: .opentofu-version:1]` |
| Node.js | 24.x (pinned `>=24 <25`) | Runs `node:test` for GATE-05, all npm scripts | `[VERIFIED: package.json engines field]`, `[VERIFIED: .github/actions/setup-site/action.yml:16]` "node-version: 24" |
| AWS provider (hashicorp/aws) | `~> 6.0` | Stable/beta environment applies | `[VERIFIED: infra/environments/stable/main.tf:9]` |
| GitHub CLI (`gh`) | 2.98.0 (local, for research/ops use) | Verifying/enabling private vulnerability reporting, environment inspection | `[VERIFIED: gh --version, this session]` |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `dig` | Verify NS delegation and hostname resolution | D-03's post-cutover verification step; also used this session to confirm current (pre-cutover) DNS state |
| `aws acm describe-certificate` / `aws route53 get-hosted-zone` | Surface ACM validation record names/values before a human adds the Cloudflare CNAME | Mirrors Phase 2's `02-03-PLAN.md` Task 1/2 pattern exactly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cloudflare CNAME for ACM validation (Phase 2 precedent) | Full registrar NS delegation before applying `beta`/`stable` | Rejected — D-01/D-02/D-03 explicitly forbid touching NS delegation before the deliberate cutover moment; the CNAME-only approach is what already worked for `testpilots` without that risk |
| `node --test` (bare, per D-10's example) | `node --test` with an explicit glob | The bare-directory form does not work in practice — see Common Pitfalls #5 |

**Installation:** None — no new packages. `npm ci` and `tofu init` against the already-pinned
versions are sufficient.

## Package Legitimacy Audit

Not applicable — this phase installs no new npm, PyPI, or crates packages. No `package.json`
`dependencies`/`devDependencies` changes are required; the only `package.json` change is a new
`scripts` entry (D-10), which is not a package install.

## Architecture Patterns

### System Architecture Diagram

```
                     ┌─────────────────────────────────────────────┐
                     │   Registrar NS for puppetstagehand.com       │
                     │   (currently: Cloudflare — VERIFIED live)    │
                     └───────────────┬───────────────────────────--┘
                                     │ D-03: human-gated NS flip
                                     │ (only step this phase does NOT automate)
                                     ▼
                     ┌───────────────────────────────┐
                     │  Route 53 hosted zone          │◄── ACM validation CNAME
                     │  (puppetstagehand.com, exists  │    (human adds at Cloudflare
                     │   inert since Phase 1 bootstrap)│    BEFORE NS flip — see
                     └───────────────┬────────────────┘    Common Pitfalls #1)
                                     │ alias records (A/AAAA)
                     ┌───────────────┴────────────────┬─────────────────────┐
                     ▼                                ▼                     ▼
          ┌─────────────────┐            ┌─────────────────┐    ┌──────────────────┐
          │ CloudFront:      │            │ CloudFront:      │    │ CloudFront:       │
          │ testpilots       │            │ beta             │    │ stable            │
          │ (APPLIED, live)  │─promote───►│ (NOT applied yet)│───►│ (NOT applied yet) │
          │ viewer-request   │  SHA S     │ viewer-request   │    │ viewer-request fn  │
          │ fn: path clean   │            │ fn: path clean   │    │ apex→www redirect  │
          └────────┬─────────┘            └────────┬─────────┘    └─────────┬─────────┘
                   │ OAC                            │ OAC                    │ OAC
                   ▼                                ▼                        ▼
          ┌─────────────────┐            ┌─────────────────┐      ┌──────────────────┐
          │ S3: testpilots   │            │ S3: beta         │      │ S3: stable        │
          │ content bucket   │            │ content bucket   │      │ content bucket     │
          │ (private, OAC)   │            │ (private, OAC)   │      │ (private, OAC)     │
          └─────────────────┘            └─────────────────┘      └──────────────────┘
                   ▲                                ▲                        ▲
                   └──────── GitHub Actions "Deploy site" workflow ──────────┘
                             (workflow_dispatch: environment=beta|stable,
                              git_sha=<full 40-char SHA reachable from main>)
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │ GitHub protected Environment    │
                     │ approval (beta/stable)          │
                     │ prevent_self_review=true,       │
                     │ required reviewer=matthewrstone │◄── BLOCKER: see
                     │ (SAME identity that dispatches) │    Common Pitfalls #3
                     └───────────────┬────────────────┘
                                     ▼
                     ┌───────────────────────────────┐
                     │ docs/operations/               │
                     │ RELEASE-EVIDENCE.md (new file) │
                     │ append-only, per-promotion row  │
                     └────────────────────────────────┘
```

### Recommended Project Structure

No new directories. New/changed files only:

```
docs/operations/
├── RELEASE-EVIDENCE.md         # NEW — D-05/D-06/D-07 append-only log, scaffolded by this phase
├── release.md                  # unchanged — already documents the exact procedure this phase executes
└── github-environments.md      # unchanged reference; may gain a short note once the self-review
                                 # blocker (Common Pitfalls #3) is resolved for real

infra/environments/beta/main.tf     # ADD: `output "distribution_domain_name"` (currently missing)
infra/environments/stable/main.tf   # ADD: `output "distribution_domain_name"` (currently missing)

package.json                        # ADD: "test:redirect" script; add to `verify` chain (D-10)

SECURITY.md                         # possibly updated once security@ delivery test is confirmed (D-09)
```

### Pattern 1: ACM DNS validation without registrar delegation (Phase 2 precedent — MUST repeat)

**What:** Request the ACM certificate for the target domain(s) via a **targeted apply**
(`-target=module.site.aws_acm_certificate.site`), surface the resulting
`domain_validation_options` (record name/type/value per domain), and have a human add that exact
CNAME at Cloudflare's existing DNS management for `puppetstagehand.com` — without touching NS
delegation, the apex record, or the `www` record. Only then run the full `tofu apply`, which
creates `aws_route53_record.certificate_validation` (inside the *Stagehand-owned* Route 53 zone —
irrelevant to the public chain) and `aws_acm_certificate_validation.site`, which polls the public
DNS chain (currently still rooted at Cloudflare) for the CNAME the human just added there.

**When to use:** Every time a `beta`/`stable` (or future) environment applies for the first time,
until the registrar NS flip (D-03) makes Route 53 authoritative for the whole zone. After the flip,
this step becomes unnecessary because Route 53 IS the public chain.

**Why this is not optional:** `infra/modules/static-site/dns.tf`'s `aws_route53_record.certificate_validation`
writes the validation CNAME **only inside the Stagehand Route 53 hosted zone** — a zone the public
internet cannot see until NS delegation moves (confirmed empirically this session: `dig NS
testpilots.puppetstagehand.com` and `dig testpilots.puppetstagehand.com` both return Cloudflare's
SOA/NXDOMAIN, proving Cloudflare — not Route 53 — is still authoritative for every name under
`puppetstagehand.com`, including subdomains). `aws_acm_certificate_validation.site`'s wait
mechanism polls the *public* chain, so without the Cloudflare-side CNAME it will hang until its
Terraform resource timeout (default 45m for `aws_acm_certificate_validation` in the `~> 6.0`
provider) and fail the apply.

**Example (from Phase 2's already-executed, verified plan):**
```markdown
# Source: .planning/phases/02-first-real-publication/02-03-PLAN.md Task 1/2 (already executed;
# ACM cert for testpilots.puppetstagehand.com is ISSUED — verified via
# `aws acm describe-certificate ... -> Status=ISSUED`, .planning/phases/02-first-real-publication/02-03-SUMMARY.md:48)

tofu -chdir=infra/environments/beta apply -target=module.site.aws_acm_certificate.site
tofu -chdir=infra/environments/beta show -json | jq -r '
  .values.root_module.child_modules[]?.resources[]?
  | select(.address=="module.site.aws_acm_certificate.site")
  | .values.domain_validation_options'
# -> human adds the returned CNAME(s) at Cloudflare (checkpoint:human-action)
# -> then:
tofu -chdir=infra/environments/beta apply
```

For `stable`, this must be done for **both** `www.puppetstagehand.com` and `puppetstagehand.com`
(the cert's `subject_alternative_names` per `stable/main.tf:47` `alternate_domain_names =
["puppetstagehand.com"]`) — ACM issues one validation record per distinct domain name on the
certificate, so expect **two** CNAMEs to add at Cloudflare for stable's cert, not one.

### Pattern 2: Pre-cutover reachability via CloudFront default domain (existing testpilots precedent)

**What:** `SITE_CHECK_URL` (used by `scripts/check-live-deployment.ts` during `deploy.yml`'s
post-deploy check) is set to the environment's raw `*.cloudfront.net` domain, not its custom
hostname, until the registrar cutover makes the custom hostname publicly resolvable.

**When to use:** For `beta` right away (its custom hostname `beta.puppetstagehand.com` will not
resolve publicly until the same NS delegation that gates `stable` moves — confirmed empirically:
`dig beta.puppetstagehand.com` returns no answer today). For `stable`, use the same pattern for
every promotion/rollback check performed *before* D-03's NS flip; switch `SITE_CHECK_URL` to
`www.puppetstagehand.com` only after the flip is confirmed.

**Example:**
```markdown
# Source: docs/operations/github-environments.md SITE_CHECK_URL row (already documents this
# exact pattern for testpilots — verbatim):
# "testpilots's real value is its distribution_domain_name output, the CloudFront default
#  domain — it stays pointed there until the deferred DNS cutover (D-01/D-03) makes the custom
#  hostname reachable, at which point a future phase can repoint it."
```

### Anti-Patterns to Avoid
- **Applying `stable` and expecting `www.puppetstagehand.com` to resolve immediately:** it will not,
  until the human-driven registrar NS flip happens — the Route 53 records exist but are not the
  public answer for the zone yet. Do not write a verification task that blocks on public DNS
  resolution before D-03 has run.
- **Disabling `prevent_self_review` on `beta`/`stable` to "unblock" an automated dispatch:**
  ADR-0002 rule 3 (LOCKED) *requires* self-review prevention on `stable`; permanently disabling it
  to route around the solo-maintainer friction (Common Pitfalls #3) would violate a locked decision.
  Treat every dispatch-and-approve step as a `checkpoint:human-action` instead.
- **Copying the `distribution_domain_name` output from `testpilots`'s captured value into `beta` or
  `stable`'s GitHub Environment variables:** `github-environments.md` is explicit — "never copy an
  output from one environment into another." Each environment's own apply must produce its own
  value.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verifying a promoted commit is an ancestor of `main` and matches HEAD | A new bash/TS check | `scripts/assert-promotable-commit.sh` (already exists, already used by both `deploy.yml` jobs) | Already handles short-SHA rejection, non-ancestor rejection, and dirty-tree rejection; rollback is just calling it with an older SHA — no new logic needed |
| Checking whether a live deployment serves the right commit/routes | A new smoke-test script | `scripts/check-live-deployment.ts` (already exists, already wired into `deploy.yml`'s post-deploy step) | Already retries, already checks the branded 404 and the exact route list from `release.md`; reuse it for the rollback proof's verification step by pointing `SITE_URL` at the rolled-back environment |
| Checking whether private vulnerability reporting is enabled | Manually clicking through repo Settings and eyeballing a screenshot | `gh api repos/{owner}/{repo}/private-vulnerability-reporting` | Deterministic, scriptable, returns `{"enabled": true/false}` — confirmed live this session (currently `false` on the real repo) |
| Enabling private vulnerability reporting | A support ticket or UI-only path | `gh api --method PUT repos/{owner}/{repo}/private-vulnerability-reporting` | GitHub's REST API exposes an idempotent enable endpoint mirroring the analogous `vulnerability-alerts` PUT/DELETE pattern used elsewhere in the GitHub API — `[ASSUMED: training-knowledge pattern match, not doc-verified this session — WebFetch/WebSearch tooling was unavailable during this research session; the executor MUST confirm this endpoint (or find the correct one) against `gh api --help` / a live docs fetch before relying on it, and MUST re-run the GET check immediately after to confirm the toggle actually flipped]` |

**Key insight:** Every mechanical piece of this phase (promotion validation, live-deployment
verification, redirect logic, the six-Environment authorization model) was already built and tested
in Phases 1–4. The only genuinely new artifacts this phase should produce are: two Terraform output
lines, one npm script line, one new markdown log file, and the actual `tofu apply` / `gh api` calls
against real AWS/GitHub state. Resist the temptation to design new verification tooling — reuse what
`deploy.yml` and `release.md` already call.

## Common Pitfalls

### Pitfall 1: ACM certificate validation hangs because the public DNS chain still ends at Cloudflare
**What goes wrong:** `tofu apply` on `beta` or `stable` stalls for the resource's timeout (~45
minutes) on `aws_acm_certificate_validation.site`, then fails.
**Why it happens:** The validation CNAME Terraform creates lives only in the Stagehand-owned Route
53 zone, which is not yet the publicly delegated authority for `puppetstagehand.com` — confirmed
empirically this session (`dig NS puppetstagehand.com` → `rudy.ns.cloudflare.com.`,
`veronica.ns.cloudflare.com.`; `dig testpilots.puppetstagehand.com` → Cloudflare SOA, no answer).
**How to avoid:** Do the targeted-apply-then-human-CNAME-then-full-apply sequence from Architecture
Pattern 1, exactly as Phase 2 already did for `testpilots` (`.planning/phases/02-first-real-publication/02-03-PLAN.md`
Tasks 1–2, `02-03-SUMMARY.md` confirms the resulting cert `ISSUED`).
**Warning signs:** `tofu apply` sitting at `aws_acm_certificate_validation.site: Still creating...`
for more than a few minutes with no Cloudflare-side CNAME added yet.

### Pitfall 2: `beta` and `stable` environment roots cannot expose their CloudFront default domain
**What goes wrong:** After `tofu apply`, there is no way to read the CloudFront `*.cloudfront.net`
domain name needed for Pattern 2's pre-cutover `SITE_CHECK_URL`, because the root module doesn't
output it.
**Why it happens:** `[VERIFIED: infra/environments/beta/main.tf:53-63]` and
`[VERIFIED: infra/environments/stable/main.tf:53-63]` — both files' `output` blocks declare only
`content_bucket_name`, `distribution_id`, and `deployment_role_arn`. `testpilots/main.tf:54-68` is
the odd one out, additionally declaring
`output "distribution_domain_name" { value = module.site.distribution_domain_name }`. The
underlying module already computes this value (`[VERIFIED: infra/modules/static-site/outputs.tf:11-14]`
— `output "distribution_domain_name" { ... value = aws_cloudfront_distribution.site.domain_name }`)
— it just isn't re-exported at the `beta`/`stable` root level.
**How to avoid:** Add the same `output "distribution_domain_name"` block to both
`infra/environments/beta/main.tf` and `infra/environments/stable/main.tf` before or during the
first real apply of each (a pure additive Terraform output; safe to add at any time, requires only
a subsequent `tofu apply`/refresh to populate, no resource replacement).
**Warning signs:** `tofu output -raw distribution_domain_name` on `beta` or `stable` returning "no
matching output" or a script error, immediately after apply.

### Pitfall 3: Solo-maintainer self-review prevents the executor from ever seeing a dispatch approved
**What goes wrong:** The plan dispatches "Deploy site" to `beta` or `stable`, and the deployment
sits in "Waiting" state forever — no one can approve it.
**Why it happens:** `[VERIFIED: gh api repos/puppet-stagehand/stagehand-docs/environments/beta` and
`.../stable`, this session]` — both Environments have `prevent_self_review: true` AND exactly one
required reviewer, `matthewrstone`. `[VERIFIED: gh api repos/puppet-stagehand/stagehand-docs/collaborators`,
this session]` — `matthewrstone` is the *only* collaborator on the repository, and
`[VERIFIED: gh auth status, this session]` confirms the authenticated CLI session driving any
automated dispatch is also `matthewrstone`. GitHub's "prevent self-review" blocks the same identity
that triggered a run from approving its own pending deployment, regardless of who is physically at
the keyboard when the approval click happens — the project's own `docs/operations/github-environments.md`
already documents this exact mechanic as "known, intentional," but it has not been resolved (no
second collaborator has been added since that note was written).
**How to avoid:** Do not design any plan task that assumes an automated dispatch-to-`beta`/`stable`
can complete unattended end-to-end. Every dispatch to a protected Environment must be followed by an
explicit `checkpoint:human-action` telling the maintainer a deployment approval is pending and must
be approved (the human, using their own judgment/out-of-band access, is not blocked by
`prevent_self_review` in the same way an unattended script would be — but note this still requires
the *same* GitHub account to click approve, since the account is the same one that dispatched it;
in practice this constraint has historically been satisfiable because a human clicking "Approve" in
the browser is a distinct action from the API call that created the dispatch, and GitHub's
self-review check is scoped to the *actor* who created the deployment, not literally "did a script
vs. a human click the button" — confirm this nuance against the actual pending-deployment UI at
execution time, since it directly determines whether this blocks the phase or merely adds a manual
step). Do not weaken `prevent_self_review` on `stable` to route around this — ADR-0002 rule 3 is
LOCKED and requires it there.
**Warning signs:** A `workflow_dispatch` run stuck at "Waiting for review" with no visible way to
approve it from the same account that triggered it.

### Pitfall 4: Private vulnerability reporting is NOT currently enabled — LAUN-04 has real work to do, not just verification
**What goes wrong:** Treating LAUN-04 as "confirm it's on" when it is actually off, and the stable
promotion proceeds without it, violating the "before the production host serves customers" gate.
**Why it happens:** `[VERIFIED: gh api repos/puppet-stagehand/stagehand-docs/private-vulnerability-reporting,
this session]` → `{"enabled":false}`. `[VERIFIED: gh api repos/puppet-stagehand/stagehand-docs, this
session]` confirms the repository is `"visibility":"public"`, `"private":false` — a public
repository with private vulnerability reporting currently off.
**How to avoid:** The plan's LAUN-04 task must actually flip the setting (via `gh api --method PUT
.../private-vulnerability-reporting` or the repository Settings UI — verify the exact API shape
before relying on it, per the Don't-Hand-Roll table's `[ASSUMED]` caveat) and then re-run the GET
check to confirm `"enabled":true` before considering the requirement satisfied, and before the
stable-promotion task is allowed to proceed (D-09's gate).
**Warning signs:** Skipping straight to "confirm a non-maintainer can see Report a vulnerability"
without first checking the API/UI toggle state.

### Pitfall 5: The `node --test` command from D-10's own example does not work as written
**What goes wrong:** `"test:redirect": "node --test infra/modules/static-site/tests/"` (D-10's
literal example) fails with `MODULE_NOT_FOUND` / a synthetic failing "test" named after the
directory, instead of running the 6 real tests inside it.
**Why it happens:** `[VERIFIED: local execution this session, node v26.7.0 — same major
generation of the `node:test` CLI parser as the CI-pinned Node 24, though not the exact pinned
version]` — passing a bare directory path (with or without a trailing slash) as a positional
argument to `node --test` does not recursively discover test files inside it; Node treats the
positional argument as a literal module/file specifier to resolve. Running
`node --test infra/modules/static-site/tests` or `.../tests/` both produced a single synthetic
failing test named after the directory and 0 of the 6 real tests executed. Running
`node --test infra/modules/static-site/tests/*.test.mjs` (an explicit glob) correctly discovered
and ran all 6 tests successfully.
**How to avoid:** Use the working glob form in the new npm script:
`"test:redirect": "node --test infra/modules/static-site/tests/*.test.mjs"`.
**Warning signs:** `npm run verify` reporting a new failing "test" whose name is a directory path,
with `tests: 1, fail: 1`, instead of `tests: 6, pass: 6`.

## Runtime State Inventory

Not applicable — this phase is a launch/promotion phase, not a rename/refactor/migration phase. No
renamed identifiers, no stored-data key changes.

## Code Examples

### `RELEASE-EVIDENCE.md` scaffold (D-05/D-06/D-07)

```markdown
<!-- Source: derived directly from docs/operations/release.md's own check list (verbatim
     enumeration: "home, tiers, compatibility, documentation, and support routes; ... the two
     JSON data endpoints ...; ... a nonexistent route uses the branded 404 response. For stable,
     also confirm the apex host redirects...") and CONTEXT.md D-05/D-06. -->

# Release evidence

Append-only log. One row per promotion or rollback. Never edit or delete a prior entry — if a
check needs to be redone, add a new row.

## Promotions

| Date (UTC) | Environment | SHA | Home | Tiers | Compat | Docs | Support | tiers.json | compat.json | 404 | Apex redirect (stable only) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |  |  |  |

## Rollbacks

| Date (UTC) | Environment | Incident | Known-good SHA | Dispatch run | Restored? | Notes |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |

## Security advisory delivery test

| Date (UTC) | Channel | Test performed | Result | Recorded by |
|---|---|---|---|---|
|  | `security@puppetstagehand.com` |  |  |  |
```

### Corrected GATE-05 npm script (D-10, corrected per Pitfall 5)

```json
{
  "scripts": {
    "test:redirect": "node --test infra/modules/static-site/tests/*.test.mjs",
    "verify": "npm run format:check && npm run lint && npm run check && npm run validate:data && npm run test:unit && npm run test:redirect && npm run build && npm run check:routes && npm run check:invalidation && npm run check:links && npm run test:e2e"
  }
}
```
`[VERIFIED: package.json scripts block read this session; exact working glob confirmed via local
`node --test` execution this session]`. No `.github/workflows/*.yml` change is required for D-11 —
`[VERIFIED: .github/workflows/validate.yml]`'s `site` job runs `npm run verify` verbatim on every
`pull_request` and every push to `main`, so adding the script to the `verify` chain automatically
satisfies "the equivalent CI workflow ... must also execute this new script."

### Missing Terraform outputs (Pitfall 2)

```hcl
# Source: infra/environments/testpilots/main.tf:66-68 (the existing, working pattern) —
# add the identical block to infra/environments/beta/main.tf and infra/environments/stable/main.tf
output "distribution_domain_name" {
  value = module.site.distribution_domain_name
}
```

## State of the Art

Not applicable in the usual "library evolved" sense — this is an internal ops phase against
already-designed infrastructure. The one relevant "state of the art" fact: GitHub's private
vulnerability reporting feature and its accompanying REST endpoint are a relatively recent (2023+)
GitHub platform feature; this repository's `SECURITY.md` and `github-environments.md` already
assume its existence, so no further research into alternatives (e.g., `tidelift`, `huntr`) is
warranted — the phase requirement is specifically the GitHub-native mechanism.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `gh api --method PUT repos/{owner}/{repo}/private-vulnerability-reporting` is the correct endpoint/verb to enable the setting | Don't Hand-Roll table; Pitfall 4 | If wrong, the executor spends time on a failing API call before finding the correct one; low risk since the GET-side check (which IS verified) can confirm success/failure immediately, and the repository Settings UI is a fallback |
| A2 | Node's `--test` CLI directory-scanning behavior on the CI-pinned Node 24 matches the locally-tested Node v26.7.0 behavior (bare directory arg does not recurse; explicit glob does) | Pitfall 5; Code Examples | Low — both are recent major versions of the same stable `node:test` CLI surface; if CI behavior somehow differs, `npm run verify` will fail loudly and immediately in CI, not silently pass |
| A3 | A human clicking "Approve" in the GitHub UI is *not* blocked by `prevent_self_review` in the same way an unattended API-only approval would be, for a dispatch the same account triggered | Pitfall 3 | High if wrong — this is the single biggest risk to phase completion; if the UI enforces the identical self-review block even for a manual click, the maintainer must add a second collaborator/reviewer (or temporarily adjust only the *non-`stable`* Environments' protection, never `stable`'s) before any `beta`/`stable` dispatch can be approved at all. The plan MUST verify this nuance at the first real dispatch attempt rather than assuming either outcome. |

## Open Questions

1. **Does GitHub's self-review prevention block a human's manual UI approval of a dispatch the same account triggered via CLI/API, or only fully-automated approval attempts?**
   - What we know: `prevent_self_review: true` and a single required reviewer (`matthewrstone`) are
     both confirmed live on `beta` and `stable`; `matthewrstone` is the only collaborator.
   - What's unclear: whether GitHub's "actor" comparison for self-review is scoped to "the exact
     API token/session that dispatched" vs. "the exact human account" — if it's account-scoped
     (most likely, per GitHub's documented behavior), a human cannot approve their own dispatch
     through any interface, full stop, and a second reviewer is mandatory before LAUN-01/02/05 can
     complete.
   - Recommendation: the plan's first `beta` dispatch task should immediately attempt the approval
     and treat "cannot approve" as an expected, named `checkpoint:human-action` outcome — with the
     runbook instructing the maintainer to add a second trusted collaborator (even temporarily) as
     the required reviewer if the block is confirmed account-scoped, since this needs a real
     decision from the user (adding a collaborator to a company/personal repo is not something a
     research agent should decide unilaterally).

2. **Exact GitHub REST verb/endpoint to enable private vulnerability reporting.**
   - What we know: the GET check (`repos/{owner}/{repo}/private-vulnerability-reporting`) is
     confirmed live and returns `{"enabled": false}` today.
   - What's unclear: the precise enable call, since WebFetch/WebSearch tooling was unavailable this
     session (returned a persistent tool-configuration error unrelated to network access).
   - Recommendation: the executor should either fetch `https://docs.github.com/en/rest/repos/repos`
     directly when tooling is available, or simply try `gh api --method PUT
     repos/{owner}/{repo}/private-vulnerability-reporting` and immediately re-run the GET check —
     low blast radius either way (idempotent toggle, instantly verifiable, GitHub-native Settings
     UI is an equally valid fallback if the API call is wrong).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| OpenTofu | `beta`/`stable` applies | ✓ | 1.12.6 | — |
| AWS CLI / credentials | Verifying applied state, ACM validation record lookup | ✓ (session-authenticated at research time via prior phases' setup; executor must re-confirm its own identity before applying, per Phase 2's D-04/D-05 non-root-identity precedent) | — | — |
| `gh` CLI, authenticated | GitHub Environment/API inspection, private-vulnerability-reporting toggle | ✓ | 2.98.0, account `matthewrstone` | — |
| `dig` | DNS verification (pre- and post-cutover) | ✓ | system `dig` (macOS) | — |
| WebSearch / WebFetch tooling | Confirming the exact private-vulnerability-reporting enable API shape | ✗ (persistent tool-configuration error this session, unrelated to network reachability) | — | `gh api` trial-and-check against the live repo (idempotent, low-risk) or the GitHub Settings UI |

**Missing dependencies with no fallback:** none — the one tooling gap (WebSearch/WebFetch) has a
viable, low-risk fallback already identified above.

**Missing dependencies with fallback:**
- WebSearch/WebFetch → direct `gh api` trial against the live (already-authenticated) repository.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built into Node 24, no dependency) for GATE-05; existing `vitest` (unit), `Playwright` (e2e/a11y), and native OpenTofu `tofu test` (`.tftest.hcl`) for everything else — all pre-existing, no change |
| Config file | None needed for `node:test`; `vitest.config.ts` (existing, unchanged); `.tftest.hcl` files exist per module/root (unchanged) |
| Quick run command | `node --test infra/modules/static-site/tests/*.test.mjs` |
| Full suite command | `npm run verify` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GATE-05 | Apex→www redirect preserves path/query; disabled on non-stable | unit (`node:test`) | `node --test infra/modules/static-site/tests/*.test.mjs` | ✅ (file exists, just unwired — this phase wires it) |
| LAUN-01 | Beta serves the exact testpilots SHA | integration (existing, via `deploy.yml` post-deploy step) | `npx tsx scripts/check-live-deployment.ts` (with `SITE_URL`/`EXPECTED_SHA` env set to beta's CloudFront default domain per Pattern 2) | ✅ — already runs automatically as part of the `Deploy site` workflow's `deploy` job |
| LAUN-02 | Stable serves `www`; apex redirects | integration (existing `check-live-deployment.ts`) + manual (public DNS check, post-cutover) | same script, pointed at stable's CloudFront default domain pre-cutover, then `www.puppetstagehand.com` post-cutover | ✅ for the automatable half; manual for the post-cutover half (D-03) |
| LAUN-03 | Release evidence recorded per deployment | manual-only (process, not a repeatable CI gate) — justified: a per-promotion human/operator record, not something re-run on every PR | operator fills `docs/operations/RELEASE-EVIDENCE.md` per Code Examples template | ❌ — file doesn't exist yet; this phase creates it |
| LAUN-04 | Private vuln reporting on; `security@` tested | manual-only for the mailbox half (justified: no mailbox access from this environment); scriptable for the toggle half | `gh api repos/{owner}/{repo}/private-vulnerability-reporting` (GET to verify, PUT to enable — see Assumption A1) | ❌ — currently `false`, must be flipped |
| LAUN-05 | Rollback restores previous pages via protected dispatch | integration (existing `check-live-deployment.ts`, run twice — before and after rollback, expecting the older SHA to reappear) | `Deploy site` workflow dispatch with an older reachable SHA, then the same live-check script | ✅ — no new tooling, just a real dispatch against `beta` or `stable` |

### Sampling Rate
- **Per task commit:** `node --test infra/modules/static-site/tests/*.test.mjs` (fast, no build needed)
- **Per wave merge:** `npm run verify`
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus the manual RELEASE-EVIDENCE.md
  entries and the D-03/D-09 human checkpoints resolved.

### Wave 0 Gaps
None — `node:test`, `vitest`, and `Playwright` are all already installed and configured; the only
gap is wiring (D-10), not tooling.

## Security Domain

### Applicable ASVS Categories

This phase is infrastructure/process-heavy rather than application-code-heavy; most controls sit
below the ASVS application layer (IAM, DNS, TLS issuance). The categories below are the ones that
do apply.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | GitHub Environment protection rules (required reviewers, `prevent_self_review`, branch restriction to `main`) — already implemented per ADR-0002; this phase exercises it for real for the first time on `beta`/`stable` |
| V6 Cryptography / TLS | yes | ACM-issued, DNS-validated public certificates via CloudFront (`aws_acm_certificate`, `validation_method = "DNS"`) — never hand-rolled, AWS-managed |
| V14 Configuration | yes | Private vulnerability reporting toggle is a security-relevant repository configuration setting this phase must actually flip, not just document |
| V1 Architecture (vulnerability disclosure process) | yes (organizational, not a numbered ASVS control in the strict sense) | GitHub private Security Advisories + monitored fallback mailbox, both tested before publication |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect via reflected `Host` header | Tampering | Not present — `[VERIFIED: infra/modules/static-site/functions/redirect.js:35-37]` hardcodes the redirect target to the literal string `'https://www.puppetstagehand.com'`, never reflecting `request.headers.host` into the `Location` header |
| Manual S3 object edit bypassing the immutable-SHA/rollback model | Tampering / Repudiation | `release.md`'s explicit invariant — "Never edit S3 objects manually" — enforced procedurally, not technically; the OAC-private-bucket pattern (existing) at least prevents a *public* direct write, but an operator with the deploy role could still do this by hand. This phase's LAUN-05 rollback proof is the control that demonstrates the *correct* path exists and works, discouraging the manual one. |
| Registrar NS hijack / bad NS flip taking down the currently-live unrelated GitHub Pages site | Tampering / Denial of Service | Mitigated entirely procedurally — D-01/D-02/D-03's `checkpoint:human-action`, the exact-NS-records runbook, and `dig NS` post-change verification. No code control is possible for this risk; it is an out-of-band registrar action by design. |
| Solo-maintainer self-review bypass temptation (weakening `prevent_self_review` to unblock a stuck dispatch) | Elevation of Privilege | ADR-0002 rule 3 (LOCKED) forbids disabling this on `stable`. The correct mitigation is adding a second trusted reviewer, not loosening the control — see Common Pitfalls #3 / Open Question 1. |
| Broken vulnerability-reporting channel silently failing a real report | Repudiation / Information Disclosure (indirect — a real vuln could go unreported or leak publicly out of frustration) | LAUN-04's actual delivery test (D-09) is the mitigation; do not ship "documented but untested" as done. |

## Sources

### Primary (HIGH confidence)
- `docs/operations/release.md` — full promotion/rollback procedure, exact release-evidence checks
- `docs/operations/github-environments.md` — six-Environment model, `SITE_CHECK_URL` deferred-domain
  pattern, solo-maintainer self-review note
- `docs/operations/aws-bootstrap.md` — hosted zone creation, non-root identity requirement
- `SECURITY.md` — current (untested) vulnerability-reporting policy
- `docs/adr/0002-github-environment-model.md` — locked six-Environment / three-OpenTofu-environment
  decision and its rationale
- `infra/modules/static-site/{acm,dns,cloudfront,locals,outputs,variables}.tf`,
  `infra/environments/{testpilots,beta,stable}/main.tf`,
  `infra/modules/static-site/functions/redirect.js`,
  `infra/modules/static-site/tests/redirect.test.mjs` — all read directly this session
- `.github/workflows/{deploy,validate,infrastructure}.yml`,
  `.github/actions/setup-site/action.yml` — all read directly this session
- `scripts/{assert-promotable-commit.sh,check-live-deployment.ts,deploy-site.sh}` — all read
  directly this session
- Live `gh api` calls against the real `puppet-stagehand/stagehand-docs` repository (private
  vulnerability reporting status, environment protection rules, collaborator list) — this session
- Live `dig` queries against the real `puppetstagehand.com` zone — this session
- Local `node --test` execution against the real test file — this session
- `.planning/phases/02-first-real-publication/02-03-PLAN.md` and `02-03-SUMMARY.md` — the
  already-executed ACM-validation-without-NS-cutover precedent this phase must repeat

### Secondary (MEDIUM confidence)
None used — every claim above was either read directly from a repository file, confirmed via a
live tool call this session, or is explicitly flagged `[ASSUMED]` in the Assumptions Log.

### Tertiary (LOW confidence)
- The exact `gh api` verb/endpoint to *enable* private vulnerability reporting (Assumption A1) —
  training-knowledge pattern match only, WebSearch/WebFetch tooling was unavailable this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; every version verified against the working tree
- Architecture: HIGH — every diagram element traces to a file read or a live tool call this session
- Pitfalls: HIGH for #1, #2, #4, #5 (all directly verified this session); MEDIUM for #3 (the
  underlying protection-rule state is verified live, but the precise self-review-vs-manual-approval
  UI nuance is flagged as Open Question 1, not fully resolved)

**Research date:** 2026-08-26
**Valid until:** DNS/environment-state findings (NS delegation, GitHub Environment configuration,
private-vulnerability-reporting toggle) are live facts that can change at any time — re-verify with
`dig` and `gh api` immediately before executing the plan if more than a few days have passed.
Everything else (code/config read directly from the repository) is valid until the next commit
touches those files.
