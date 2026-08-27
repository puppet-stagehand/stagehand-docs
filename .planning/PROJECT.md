# Puppet Stagehand documentation site

## What This Is

The customer-facing website for Puppet Stagehand at `www.puppet-stagehand.com` — product
positioning, tier entitlements, an evidence-backed platform compatibility register, and
version-controlled operator documentation. It is a fully static Astro site published to AWS S3
behind CloudFront, with its infrastructure, promotion pipeline, and claim-review process kept in the
same repository (`puppet-stagehand/stagehand-docs`).

The scaffold is already built and is the shipped baseline. Every route, layout, data loader, JSON
Schema, validation gate, GitHub Actions workflow, and OpenTofu module exists, and `npm run verify`
passes. What has never happened: an AWS apply, a DNS cutover, a real content pass, or a single
published compatibility claim. This milestone takes the scaffold to a launched site.

## Core Value

A reader can trust every compatibility claim on the site, because no claim is published unless a
maintainer reviewed primary evidence for it and dated that review honestly.

## Business Context

- **Customer**: Puppet and OpenVox operators evaluating or running Stagehand across the OpenVox,
  Puppet Core, Puppet Enterprise, and PE Advanced tiers.
- **Revenue model**: Not monetized directly. This public static site supports the commercial
  Stagehand product; entitlement checks, payment, and premium content delivery belong to
  authenticated Puppet Console and are explicitly outside this site's boundary.
- **Success metric** (developer-facing): all quality gates green on `main` — lint, typecheck, unit
  tests, Playwright e2e, schema validation, and the e2e build-isolation check.
- **Strategy notes**: `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md`

## Requirements

### Validated

Shipped in the scaffold baseline and verified by `npm run verify` on `main`. Verified locally and in
CI — *not* validated in production, because nothing has been applied to AWS.

- ✓ Astro static site with the full initial route surface (`/`, `/tiers/`, `/compatibility/`,
  `/docs/`, `/docs/getting-started/`, `/docs/security/`, `/support/`, `/404`) — scaffold
- ✓ Schema-validated tier and compatibility data with a fail-closed loader (`src/lib/data/`) —
  scaffold
- ✓ `/data/tiers.json` and `/data/compatibility.json` machine-readable endpoints — scaffold
- ✓ Compatibility empty state as a supported, truthful rendering — scaffold
- ✓ Two-build e2e fixture isolation (`dist/` vs `.e2e-dist/`) with a build-isolation gate — scaffold
- ✓ WCAG 2.1 AA behaviour with zero serious/critical axe violations on the audited routes — scaffold
- ✓ Reusable OpenTofu `static-site` module plus three environment roots and a bootstrap root —
  scaffold
- ✓ `validate.yml`, `deploy.yml`, `infrastructure.yml` with GitHub OIDC and no long-lived AWS keys —
  scaffold
- ✓ Operator runbooks: AWS bootstrap, GitHub Environments, release promotion, cost model,
  compatibility claims — scaffold

### Active

This milestone: take the scaffold to a launched documentation site.

- [ ] `infra/bootstrap/` owns and outputs the six infrastructure plan and apply IAM roles
      (ADR-0003 rule 1, currently accepted but unimplemented)
- [ ] AWS bootstrap and the `testpilots` environment are applied, and the deploy pipeline actually
      publishes instead of silently skipping
- [ ] Real documentation and marketing content replaces the thin scaffold copy
- [ ] The compatibility register carries claims that survived primary-evidence review, and the
      quality gates that assume an empty register are reworked to keep ADR-0001's guarantee
- [ ] `beta` and `stable` are applied, and `www.puppet-stagehand.com` serves customers with a proven
      rollback path

### Out of Scope

- **Migrating `puppet-console/docs` in bulk** — a separate, separately reviewed content project
  (design spec non-goals)
- **Customer login, entitlement verification, ecommerce, subscriptions, license delivery** — belongs
  to authenticated Puppet Console, not a public static site (design spec non-goals; `src/content/docs/security.md`)
- **SSR, a database, an application API, hosted full-text search** — the site is static-only by
  constraint (implementation plan global constraints)
- **Analytics or behavioural tracking** — deliberately deferred until a privacy and retention
  decision is made (design spec security and privacy constraints)
- **Automated compatibility claims inferred from upstream releases** — a maintainer must
  intentionally add or revise every record (design spec non-goals; ADR-0001)
- **Third-party runtime JavaScript** — the CSP is designed around self-hosted assets only
- **Gibson typeface** — the project records its embedding licence as unresolved; IBM Plex is
  self-hosted instead
- **Redrawing or recolouring the Puppet mark** — use the approved asset when supplied, otherwise the
  text wordmark `Puppet Stagehand`
- **CloudFront WAF, CloudWatch alarms, budget alerts, synthetic canaries, access logging** —
  surfaced by the codebase audit but mandated by no constraint or decision in this ingest set;
  tracked as v2 in REQUIREMENTS.md rather than smuggled into this milestone
- **Promoting a built artifact instead of rebuilding per environment** — `release.md` already
  acknowledges the byte-identity gap; changing the promotion model is a separate decision

## Context

**Where the code actually stands** (verified against the working tree on 2026-08-26, not assumed):

- `src/data/compatibility.yaml` is exactly `schema_version: 1` / `records: []`. The compatibility
  matrix — the site's primary value proposition — currently renders only the empty state.
- `src/content/docs/` holds two files totalling 70 lines. `/`, `/tiers/`, `/support/`, and `/docs/`
  are 46–71 line Astro pages with placeholder-grade copy.
- `infra/bootstrap/` declares the three state buckets and the shared GitHub OIDC provider, and
  outputs `github_oidc_provider_arn` and `state_bucket_names`. It declares **no** IAM roles.
  `infra/modules/static-site/iam.tf` declares only the per-environment content deploy role.
- `deploy.yml` gates every AWS step behind a `Check deployment configuration` step. Because the
  `testpilots` Environment variables are unset, `Deploy site` reports green while publishing
  nothing. `testpilots.puppetstagehand.com` and `beta.puppetstagehand.com` do not resolve.
- `infrastructure.yml` consumes `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN` and
  `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN`, neither of which any OpenTofu creates. The plan job skips
  silently; the apply job would hard-fail.

**Two gate findings that constrain sequencing** (verified by reading the files, 2026-08-26):

1. Publishing the first real compatibility record **breaks the build**. Four gates hard-assert an
   empty production register: `scripts/check-e2e-build-isolation.ts` throws unless
   `dist/data/compatibility.json` has exactly zero records; `tests/e2e/production-empty.spec.ts`
   asserts the empty-state heading and `records: []`; `tests/unit/e2e-build-isolation.test.ts` and
   the checked-in `tests/fixtures/build-output/production/data/compatibility.json` encode the same
   shape. These must be reworked from "production is empty" to "production contains no
   fixture-derived record" before any claim can ship — deliberately, and without weakening the
   evidence validation ADR-0001 rule 3 protects.
2. `infra/modules/static-site/tests/redirect.test.mjs` exists and does assert that the apex→`www`
   redirect preserves path and query — but no `package.json` script and no workflow runs it. The
   coverage is real and currently dead. (The codebase audit recorded this as "no test"; the file
   exists, it is simply unwired.)

**Version pin drift to resolve**: `intel/constraints.md` records the implementation plan's pin of
TypeScript 7.0.2; the working tree's `package.json` pins `typescript` `6.0.3`. The working tree is
what ships. Treat the plan's pin as stale documentation and correct one of the two rather than
letting them drift.

**Toolchain, from the working tree**: Node.js `>=24 <25` (`.nvmrc` = 24), npm `>=11 <12`,
`engine-strict=true`. Astro 7.2.4, Bootstrap 5.3.8, Sass 1.103.1, TypeScript 6.0.3, Ajv 8.20.0 with
ajv-formats 3.0.1, YAML 2.9.0, Fontsource IBM Plex Sans/Mono 5.3.0, Vitest 4.1.11, Playwright
1.62.1, `@axe-core/playwright` 4.13.0, linkinator 8.0.4, ESLint 10.9.0, Stylelint 17.14.1, Prettier
3.9.6. OpenTofu 1.12.6 (`.opentofu-version`), AWS provider `~> 6.0`. `ripgrep` on PATH for
`scripts/check-tofu-tags.sh`.

## Constraints

- **Quality gate**: `npm run verify` (format → lint → `astro check` → `validate:data` → unit →
  build → routes → links → e2e incl. build-isolation) is the definition of a verified change. It
  must be green on `main` at every phase boundary — this is the milestone's developer-facing
  success metric.
- **Static only**: `output: 'static'`. No SSR, database, customer auth, payment handling, analytics,
  or third-party runtime JavaScript. Request-time logic must be a CloudFront Function or move to
  build time.
- **Fail closed on data**: invalid compatibility claims break the build rather than disappearing
  silently. Never weaken validation to admit a record that cannot meet the evidence policy.
- **Evidence and freshness**: every published record needs a primary-source HTTPS `evidence_url` and
  a truthful `last_verified`; a record is fresh for 365 days and stale on day 366.
- **Trailing slashes**: `trailingSlash: 'always'` — every internal link ends with `/` or the link
  check fails.
- **Route coupling**: adding a route means updating `src/lib/navigation.ts`,
  `scripts/check-built-routes.ts`, and the invalidation list in `scripts/deploy-site.sh` together.
  Only the first two are currently enforced by tests.
- **Fixture isolation**: `STAGEHAND_E2E_FIXTURES` switches data source, validation "today", and
  `outDir` simultaneously. Never read it outside the data-loading layer.
- **Mandatory tags**: every taggable environment resource carries `project = "stagehand"` and its
  `environment` tag; genuinely shared account-global resources carry `project` only, with no
  fabricated environment tag. Enforced by `scripts/check-tofu-tags.sh`.
- **No secrets in Git**: no AWS account identifiers, credentials, state files, saved plans,
  `terraform.tfvars`, or `backend.hcl` values. Saved plans are deleted immediately after apply.
- **OIDC only**: workflows request short-lived credentials via GitHub OIDC with `id-token: write`.
  No AWS access-key secret is ever created.
- **Bootstrap is human-applied**: no CI job may assume a role able to modify the bootstrap root.
  CODEOWNERS review on `/infra/` plus an administrator performing the apply are both required.
- **Promotion is ordered and immutable**: testpilots → beta → stable, one full 40-character SHA
  reachable from `main`, never cherry-picked between environments. Never edit S3 objects by hand.
- **Accessibility**: WCAG 2.1 AA; axe reports zero serious or critical violations on `/`, `/tiers/`,
  `/compatibility/`, and `/docs/`. Status is always identified by text and icon, never colour alone.
- **TDD**: add a failing test, observe the intended failure, implement the smallest change, rerun
  the focused test, then the broader check. One commit per task unless the task says otherwise.

## Locked Decisions

<decisions>

<decision id="ADR-0001" status="LOCKED" source="docs/adr/0001-compatibility-scaffold.md" accepted="2026-08-26">
**Ship an empty, evidence-bearing compatibility registry.**

1. The published registry ships empty — `src/data/compatibility.yaml` holds `schema_version: 1` and
   `records: []` until a claim completes Stagehand release verification. No record is published to
   satisfy a completeness or presentation goal.
2. Representative compatibility data lives only in test fixtures —
   `tests/fixtures/data/compatibility-e2e.yaml` carries five records spanning every `status` value
   and every tier, loaded only when `STAGEHAND_E2E_FIXTURES=1`. Fixture records are not
   compatibility claims and must never be promoted into `src/data/compatibility.yaml`.
3. Every published record carries primary evidence and a truthful verification date. The schema
   makes `evidence_url` and `last_verified` required; `loadCompatibility` rejects a non-HTTPS
   evidence URL, a future `last_verified`, and evidence older than 365 days. Validation is never
   weakened to admit a record that cannot meet the evidence policy.
4. The empty state is a supported rendering, not a placeholder.

Amends the design specification's delivery boundary: "representative compatibility data" means
representative *fixture* data exercised by the test suite plus a rendered empty state on the
published site. It does not mean seeded customer-facing records.

**Not re-openable by this roadmap.** The roadmap may not seed the register to make it look
populated, may not relax the schema, and may not promote fixture records.
</decision>

<decision id="ADR-0002" status="LOCKED" source="docs/adr/0002-github-environment-model.md" accepted="2026-08-26">
**Six GitHub Environments, three OpenTofu environments.**

1. Three namespaces are named distinctly in all normative text: "OpenTofu environment", "GitHub
   apply Environment", "GitHub plan Environment". The bare word "environment" carries no normative
   force.
2. The three-value enum binds `var.environment` *only* — `testpilots`, `beta`, `stable` are the
   complete set of OpenTofu environments and of `environment` tag values.
3. Six GitHub Environments exist. Three apply Environments (`testpilots`, `beta`, `stable`)
   restricted to `main`, carrying the apply and deploy role ARNs, with required reviewers on `beta`
   and `stable` and self-review prevented on `stable`. Three plan Environments (`testpilots-plan`,
   `beta-plan`, `stable-plan`) restricted to the custom branch rule `refs/pull/*/merge`, carrying
   only the plan role ARN, each requiring a trusted reviewer with self-review prevented. Plan
   Environments never hold an apply or deploy role ARN.
4. Planning authority and apply authority stay separated. No pull-request-triggered workflow may
   reach a role that can mutate infrastructure or site content. `pull_request_target` is not an
   acceptable way to make planning easier. The job-level same-repository guard in
   `infrastructure.yml` runs before a plan Environment is attached and remains required.

**Not re-openable by this roadmap.** The roadmap may not collapse to three GitHub Environments and
may not switch to `pull_request_target`.
</decision>

<decision id="ADR-0003" status="LOCKED" source="docs/adr/0003-infrastructure-iam-role-ownership.md" accepted="2026-08-26">
**The bootstrap root owns the infrastructure plan and apply roles.**

1. `infra/bootstrap/` creates both roles as OpenTofu resources alongside the shared OIDC provider,
   with their ARNs as bootstrap outputs in the manner of `github_oidc_provider_arn` and
   `state_bucket_names`.
2. One role per Stagehand environment per tier; no sharing. Six roles, each trusting the repository
   `puppet-stagehand/stagehand-docs` and exactly one GitHub Environment subject with `aud` equal to
   `sts.amazonaws.com`. Plan roles trust the `-plan` subjects, apply roles the unsuffixed subjects.
   A wildcard Environment name in a trust policy is never permitted.
3. The permission scoping in `docs/operations/github-environments.md` is the specification the
   OpenTofu must satisfy. Where the OpenTofu and the runbook disagree, one is corrected — they are
   not allowed to drift apart.
4. Bootstrap remains human-applied. No CI job may assume a role able to modify the bootstrap root.
   CODEOWNERS review on `/infra/` plus the administrator performing the apply are both required.
5. Implementation is a separate task. Until the OpenTofu exists, the manual provisioning path in
   `docs/operations/github-environments.md` remains operative and must not be deleted.

**Not re-openable by this roadmap.** Rule 5's deferral is what this milestone closes; rules 1–4
constrain how.
</decision>

</decisions>

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ship an empty, evidence-bearing compatibility registry (ADR-0001, LOCKED) | A compatibility register whose records were never verified is worse than no register; an honest empty state preserves the site's core value | — Pending (no claim published yet) |
| Six GitHub Environments over three OpenTofu environments (ADR-0002, LOCKED) | Pull-request planning needs a `refs/pull/*/merge` branch rule, which cannot coexist with a `main`-only apply Environment; splitting the namespaces keeps plan authority away from apply authority | ✓ Good (implemented and matches `infrastructure.yml`) |
| Bootstrap owns the plan and apply roles (ADR-0003, LOCKED) | The least-privilege role design existed only in a runbook and was owned by no deliverable, making infrastructure automation permanently manual | — Pending (accepted, not yet implemented — Phase 1) |
| Astro static output + Bootstrap 5 via Sass | Typed content collections and schema-validated data without shipping a client runtime; Starlight would make marketing and tier pages look like a separate product | ✓ Good |
| Self-host IBM Plex; never copy Gibson | Gibson's embedding licence is recorded as unresolved in the existing project | ✓ Good |
| Two-build e2e fixture isolation | Fixture compatibility records reaching the public site would directly violate the core value | ✓ Good — but its gates assume an empty register and must be reworked (Phase 4) |
| Exact version pins on recent majors | A plugin incompatibility surfaces as a lint failure that blocks deploy; pinning makes the break deliberate and reviewable | ✓ Good |

---
*Last updated: 2026-08-26 after doc ingest and roadmap creation (new-project-from-ingest)*
