# Codebase Concerns

**Analysis Date:** 2026-08-26

The repository is a small, well-disciplined Astro static site with OpenTofu infrastructure. Code
quality and test coverage are strong; nearly all live risk sits in the **unfinished AWS
publication path** and in **operational gaps that only appear once the site is actually serving
traffic**.

## Tech Debt

**AWS deployment is configured but never exercised (highest-value debt):**
- Issue: The `testpilots` GitHub Environment variables (`AWS_DEPLOY_ROLE_ARN`, `CONTENT_BUCKET`,
  `CLOUDFRONT_DISTRIBUTION_ID`) are unset, so every AWS step in the deploy job is gated off by the
  `Check deployment configuration` step.
- Files: `.github/workflows/deploy.yml` (steps guarded by
  `steps.deployment_configuration.outputs.configured == 'true'`), `scripts/deploy-site.sh`,
  `docs/operations/github-environments.md`, `continue.md`
- Impact: `Deploy site` reports green while publishing nothing. The success signal is misleading —
  a reader of the Actions tab cannot distinguish "deployed" from "silently skipped" except by
  opening the step summary. No part of the S3 sync, CloudFront invalidation, OIDC role trust, or
  certificate/DNS wiring has ever run against real AWS.
- Fix approach: Run the bootstrap and `testpilots` apply per `docs/operations/aws-bootstrap.md`
  with an authorized identity, set the three Environment variables from module outputs, then rerun
  the workflow and confirm the `Upload site` step actually executes.

**Infrastructure plan/apply IAM roles are not created by bootstrap:**
- Issue: `infra/bootstrap/main.tf` creates the state buckets and the GitHub OIDC provider, but no
  `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN` / `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN` roles. Only the
  per-environment content **deploy** role exists (`infra/modules/static-site/iam.tf`).
- Files: `infra/bootstrap/main.tf`, `infra/bootstrap/outputs.tf`,
  `.github/workflows/infrastructure.yml`, `docs/operations/github-environments.md` (section
  "Provision separate infrastructure roles")
- Impact: The `plan` and `apply` jobs in `infrastructure.yml` can never run in CI as shipped. The
  `plan` job skips silently (same soft-gate pattern as deploy); the `apply` job hard-fails. All
  infrastructure changes therefore require a human with local AWS credentials — a bus-factor and
  auditability gap, and it means the `*-plan` GitHub Environments referenced by the matrix
  (`testpilots-plan`, `beta-plan`, `stable-plan`) may not exist yet.
- Fix approach: Add the two least-privilege roles (scoped to the OIDC provider and the specific
  `environment:` subject claims) to the bootstrap root and expose their ARNs as outputs, or
  document them as a deliberate manual-only boundary in `aws-bootstrap.md`.

**Bootstrap is untagged relative to the enforced tag policy:**
- Issue: `scripts/check-tofu-tags.sh` enforces required tags across `infra`, but bootstrap
  resources carry only `project` / `environment` ad-hoc tags rather than `local.required_tags`
  used by the site module.
- Files: `infra/bootstrap/main.tf`, `infra/modules/static-site/locals.tf`,
  `scripts/check-tofu-tags.sh`
- Impact: Cost attribution in `docs/operations/cost-model.md` will miss state-bucket and OIDC
  spend; tag-based cost reporting is incomplete.
- Fix approach: Reuse a shared `required_tags` local in the bootstrap root and extend the tag check
  to cover it.

**Hardcoded invalidation path list in the deploy script:**
- Issue: `scripts/deploy-site.sh` invalidates an explicit enumeration of routes
  (`/index.html`, `/tiers/index.html`, `/compatibility/index.html`, `/docs/*` leaves,
  `/support/index.html`, `/404.html`, `/data/*`).
- Files: `scripts/deploy-site.sh`, `src/pages/`, `src/content/docs/`
- Impact: Adding a new page or a new Markdown doc under `src/content/docs/` publishes the object
  but leaves stale CloudFront cache for that path until TTL expiry. This is a silent
  content-staleness bug, not a build failure — CI will stay green.
- Fix approach: Derive the invalidation list from the built `dist` tree (or from
  `scripts/check-built-routes.ts` output), or invalidate `/*` and accept the invalidation cost
  documented in `cost-model.md`.

**Duplicated soft-gate configuration checks:**
- Issue: The "check env vars, else set `configured=false`" bash block is copy-pasted in
  `.github/workflows/deploy.yml` and `.github/workflows/infrastructure.yml`, and every subsequent
  step repeats the same `if:` guard.
- Files: `.github/workflows/deploy.yml`, `.github/workflows/infrastructure.yml`
- Impact: A newly added step that omits the `if:` guard will run unguarded and fail confusingly
  once AWS credentials are absent. Long guard chains are easy to get wrong.
- Fix approach: Move the gate to a job-level `if:` on a small preflight job output, so the guard is
  expressed once.

## Known Bugs

**No live-site defects are observable because the site has never been published.** The concerns
below are latent until the first real deployment.

**`testpilots.puppetstagehand.com` and `beta.puppetstagehand.com` do not resolve:**
- Symptoms: Endpoint verification during release review failed; nothing answers on either host.
- Files: `infra/modules/static-site/dns.tf`, `infra/modules/static-site/acm.tf`,
  `infra/environments/testpilots/main.tf`, `continue.md`
- Trigger: Any attempt to browse or smoke-test the documented URLs.
- Workaround: None. The records are created by the un-applied OpenTofu environment root. Do not
  claim the site is live until DNS resolves and `Upload site` has run.

**ACM validation is a first-apply failure mode:**
- Symptoms: `aws_acm_certificate_validation.site` can hang or time out on the very first apply if
  the hosted zone delegation is incomplete.
- Files: `infra/modules/static-site/acm.tf`, `infra/modules/static-site/dns.tf`
- Trigger: First `tofu apply` against a zone whose NS delegation is not live.
- Workaround: Confirm `HOSTED_ZONE_ID` delegation before applying; re-apply is idempotent.

## Security Considerations

**Overall posture is good:** S3 buckets are private with `BlockPublicAccess`, SSE-AES256,
versioning, `BucketOwnerEnforced` ownership, and an OAC-scoped bucket policy conditioned on the
distribution ARN (`infra/modules/static-site/s3.tf`). CloudFront enforces
`redirect-to-https`, `TLSv1.2_2021`, and a response-headers security policy. GitHub Actions pin all
third-party actions to full commit SHAs and declare `permissions: contents: read` at workflow
level. Deploy OIDC trust is correctly narrowed to
`repo:<repo>:environment:<environment>` in `infra/modules/static-site/iam.tf`.

**No WAF and no rate limiting on the distribution:**
- Risk: Unmitigated request floods against a pay-per-request CDN — a cost-availability risk more
  than a data risk (the origin holds only public documentation).
- Files: `infra/modules/static-site/cloudfront.tf`
- Current mitigation: `price_class = "PriceClass_100"` limits edge footprint; content is static and
  read-only; the origin is not directly reachable.
- Recommendations: Add a CloudFront billing/traffic alarm at minimum; evaluate an AWS WAF rate-based
  rule before the `stable` environment carries real traffic.

**No access logging on CloudFront or the content bucket:**
- Risk: No forensic trail for abuse, and no data to validate the traffic assumptions in
  `docs/operations/cost-model.md`.
- Files: `infra/modules/static-site/cloudfront.tf`, `infra/modules/static-site/s3.tf`
- Current mitigation: None.
- Recommendations: Enable standard CloudFront logging (or real-time logs) to a dedicated,
  lifecycle-expired log bucket; note the added cost in the cost model.

**State buckets have no explicit deny-insecure-transport policy:**
- Risk: State objects can in principle be fetched over non-TLS transport by a permitted principal.
- Files: `infra/bootstrap/main.tf`
- Current mitigation: SSE, versioning, `prevent_destroy`, full public-access block.
- Recommendations: Add an `aws:SecureTransport = false` deny statement to each state bucket policy.

**Broad object permissions on the deploy role:**
- Risk: The deploy role holds `s3:PutObject`/`s3:DeleteObject` on the entire content bucket, so a
  compromised workflow run could blank the site.
- Files: `infra/modules/static-site/iam.tf`, `scripts/deploy-site.sh` (uses `--delete` on both
  syncs)
- Current mitigation: OIDC subject is pinned to the environment; bucket versioning is enabled with
  30-day noncurrent retention, so objects are recoverable; protected environments gate `beta` and
  `stable`.
- Recommendations: Acceptable for a static site. Keep versioning enabled — it is the sole recovery
  mechanism for an errant `--delete`.

**Secrets hygiene is correctly enforced:** `.gitignore` excludes `*.tfstate*`, `backend.hcl`,
`terraform.tfvars`, `tfplan`, and `plan-summary.txt`; the infrastructure workflow uploads only a
value-free plan summary derived via `jq` (addresses and action counts, no attribute values). No
account identifiers appear in tracked files. Preserve this discipline.

## Performance Bottlenecks

**Full verify pipeline is heavy and serial:**
- Problem: `npm run verify` chains format check, ESLint + Stylelint, `astro check`, data
  validation, unit tests, a build, route checks, link checks, and a full Playwright e2e run —
  and `test:e2e` itself performs **two** Astro builds (`build:e2e`).
- Files: `package.json` (`verify`, `build:e2e`, `test:e2e` scripts), `playwright.config.ts`
- Cause: The fixture matrix requires both a production build and a `STAGEHAND_E2E_FIXTURES=1`
  build to prove isolation.
- Improvement path: Split CI into parallel jobs (lint/type, unit, e2e) and cache the Astro build
  between the route/link checks and the e2e stage. Only worth doing when CI wall-clock becomes a
  friction point.

**Every deploy invalidates `/data/*` and all HTML:**
- Problem: Invalidation requests are billed beyond the monthly free allotment.
- Files: `scripts/deploy-site.sh`, `docs/operations/cost-model.md`
- Cause: Content-hashed assets are correctly excluded, but HTML and JSON are unconditionally
  invalidated on every push to `main`.
- Improvement path: Skip invalidation when the built output is unchanged, or batch testpilots
  deploys.

## Fragile Areas

**Route and cache coupling across three files:**
- Files: `src/pages/`, `scripts/deploy-site.sh`, `scripts/check-built-routes.ts`,
  `tests/unit/built-routes.test.ts`
- Why fragile: Adding a page requires touching the page, the invalidation list, and the route
  expectations. Only the last two are enforced by tests; a missed invalidation entry passes CI.
- Safe modification: Add the page, then update `scripts/deploy-site.sh` in the same commit, then
  run `npm run check:routes`.
- Test coverage: Route existence is covered; invalidation completeness is **not**.

**E2E fixture isolation:**
- Files: `scripts/check-e2e-build-isolation.ts`, `tests/unit/e2e-build-isolation.test.ts`,
  `tests/e2e/production-empty.spec.ts`, `tests/fixtures/data/`
- Why fragile: The `STAGEHAND_E2E_FIXTURES` environment switch means a leaked variable would ship
  fixture compatibility records into a production build. The build-isolation checker exists
  precisely because this is dangerous.
- Safe modification: Never read `STAGEHAND_E2E_FIXTURES` outside the data-loading layer
  (`src/lib/data/load-yaml.ts`); always run `npm run check:e2e-isolation` after touching it.
- Test coverage: Good — this is the best-guarded area of the codebase.

**Promotion chain relies on operator discipline:**
- Files: `scripts/assert-promotable-commit.sh`, `.github/workflows/deploy.yml`,
  `docs/operations/release.md`
- Why fragile: The script proves the SHA is a full lowercase 40-char commit reachable from
  `origin/main` with a clean tree at matching HEAD — but nothing machine-verifies that the SHA
  already deployed successfully to the *previous* environment. `release.md` explicitly delegates
  that to the human operator. Ordering violations (main → stable directly) are possible.
- Safe modification: If automating, query the GitHub Deployments API for a prior successful
  deployment of the same SHA in the preceding environment before allowing the job to proceed.
- Test coverage: `tests/unit/deploy-scripts.test.ts` (384 lines) covers the script's own
  validation branches thoroughly; the cross-environment ordering rule is untested because it is
  unimplemented.

**Rebuild-per-environment breaks byte-identity:**
- Files: `.github/workflows/deploy.yml` (`Build site` runs in each environment's deploy job)
- Why fragile: `release.md` already acknowledges that "SHA identity does not prove that the
  separately built files are byte-identical." A non-reproducible build step (dependency drift,
  timestamp, telemetry) could make stable differ from what was validated in beta.
- Safe modification: Promote a build artifact rather than rebuilding, or verify a digest of `dist`
  across environments.

## Scaling Limits

**Compatibility dataset is in-repo YAML:**
- Current capacity: `src/data/compatibility.yaml` currently holds `records: []` — zero records.
  Rendering happens at build time via `src/lib/data/compatibility.ts` and
  `src/components/CompatibilityMatrix.astro`.
- Limit: A few hundred records is comfortable; the matrix component renders all rows with no
  pagination, filtering, or virtualization, so page weight and build time grow linearly.
- Scaling path: Add client-side filtering and/or split the matrix by tier before the record count
  reaches the low hundreds.

**CloudFront `PriceClass_100`:**
- Current capacity: North America and Europe edge locations only.
- Limit: Users in APAC/South America get higher latency.
- Scaling path: Raise the price class in `infra/modules/static-site/cloudfront.tf` and update
  `docs/operations/cost-model.md`.

## Dependencies at Risk

**Very-recent major versions pinned exactly:**
- Risk: `astro` 7.2.4, `eslint` 10.9.0, `typescript` 6.0.3, `vitest` 4.1.11, `stylelint` 17.14.1 —
  all exact pins on recent majors. `eslint-plugin-astro` 3.1.0 and `prettier-plugin-astro` 0.14.1
  are third-party plugins that historically lag ESLint/Prettier major bumps.
- Files: `package.json`
- Impact: A plugin incompatibility surfaces as a lint or format failure that blocks `npm run
  verify`, and therefore blocks deployment entirely (the deploy job depends on `validate`).
- Migration plan: Exact pins are the right call here; keep them, and upgrade the plugin and its
  host together in a single reviewed PR.

**Node/npm engine range is narrow:**
- Risk: `"node": ">=24 <25"`, `"npm": ">=11 <12"` in `package.json`, mirrored by `.nvmrc`.
- Impact: Contributors on other Node majors are hard-blocked; a GitHub-hosted runner image change
  could break setup.
- Migration plan: `.github/actions/setup-site` pins the version from `.nvmrc`, which is correct.
  Widen the range only when a second major is actually tested.

**No automated dependency update or vulnerability scanning:**
- Risk: No Dependabot/Renovate config and no `npm audit` step in `.github/workflows/validate.yml`.
- Impact: Transitive vulnerabilities go unnoticed. Low severity for a static site with no runtime
  server, but supply-chain risk at build time is real.
- Migration plan: Add `.github/dependabot.yml` for `npm` and `github-actions` ecosystems (the
  latter also keeps the pinned action SHAs fresh).

## Missing Critical Features

**Zero compatibility records:**
- Problem: `src/data/compatibility.yaml` contains `records: []`. The compatibility matrix — the
  site's primary value proposition — renders only `src/components/CompatibilityEmptyState.astro`.
- Blocks: The site has no substantive content to publish. `docs/operations/compatibility-claims.md`
  defines the evidence and freshness rules, but no claim has been through that process yet.

**Thin documentation content:**
- Problem: `src/content/docs/` holds two short files (`getting-started.md` 37 lines,
  `security.md` 33 lines).
- Blocks: A "documentation site" with 70 lines of documentation. Content authoring is the gating
  work item alongside the AWS apply.

**No post-deploy smoke verification in CI:**
- Problem: `release.md` describes a manual route-by-route check (home, tiers, compatibility, docs,
  support, both JSON endpoints, 404, apex redirect), but nothing automates it against the deployed
  URL.
- Blocks: A successful workflow run is not evidence the site actually serves. Given the current
  silent-skip gate, this is the exact failure that occurred.
- Fix approach: Add a post-`Upload site` step that curls the environment's public URLs and asserts
  status codes plus the deployed commit marker.

**No monitoring, alarms, or on-call path:**
- Problem: No CloudWatch alarms, no synthetic canary, no budget alarm, and no incident runbook
  beyond the rollback procedure in `release.md`.
- Blocks: A stable outage or a cost spike would be discovered by a user report.
- Fix approach: Add a CloudWatch alarm on CloudFront 5xx rate and an AWS Budgets alert; add an
  incident section to `docs/operations/`.

**Testpilots cannot be rolled back:**
- Problem: `release.md` "Recover testpilots" states the manual workflow cannot dispatch testpilots
  or redeploy an old testpilots SHA — recovery requires a forward-fix merge to `main`.
- Blocks: Mean-time-to-recovery on testpilots is bounded by the full validate pipeline.
- Fix approach: Allow `testpilots` in the `workflow_dispatch` environment choice list in
  `.github/workflows/deploy.yml` (the deploy script and the promotable-commit assertion already
  accept it).

## Test Coverage Gaps

**Deployment and infrastructure execution paths (High):**
- What's not tested: `scripts/deploy-site.sh` argument validation is well covered by
  `tests/unit/deploy-scripts.test.ts`, but the actual `aws s3 sync` / `create-invalidation`
  behavior, the OIDC role assumption, and the workflow's gating logic have never executed.
  `infra/**` has `tofu test` coverage (`infra/**/tests/*.tftest.hcl`) but no applied state.
- Files: `scripts/deploy-site.sh`, `.github/workflows/deploy.yml`,
  `.github/workflows/infrastructure.yml`, `infra/`
- Risk: First real apply is also the first real test. Certificate validation, DNS, OAC bucket
  policy, and redirect-function behavior are all unproven.
- Priority: **High** — this is the blocking item.

**CloudFront invalidation completeness (Medium):**
- What's not tested: No test asserts that every route emitted into `dist` appears in the
  invalidation list in `scripts/deploy-site.sh`.
- Files: `scripts/deploy-site.sh`, `scripts/check-built-routes.ts`
- Risk: Silent stale content after adding a page.
- Priority: Medium — cheap to close by extending `tests/unit/built-routes.test.ts`.

**Compatibility matrix with realistic data volume (Medium):**
- What's not tested: All fixtures in `tests/fixtures/data/` are small, hand-built cases for
  validation rules. There is no fixture representing a realistically sized matrix, and production
  data is empty.
- Files: `src/components/CompatibilityMatrix.astro`, `src/lib/data/compatibility.ts`
- Risk: Layout, responsiveness, and accessibility behavior at scale are unverified; the a11y suite
  effectively tests the empty state on production builds.
- Priority: Medium.

**CloudFront redirect function (Medium):**
- What's not tested: `infra/modules/static-site/functions/redirect.js` is gated behind
  `var.enable_redirect_function` and has no JavaScript unit test — only whatever the `tofu test`
  suite asserts about its association.
- Files: `infra/modules/static-site/functions/redirect.js`,
  `infra/modules/static-site/cloudfront.tf`
- Risk: The apex → `www` redirect that `release.md` requires operators to verify for `stable` could
  mangle paths or query strings; there is no automated proof it preserves them.
- Priority: Medium — rises to High before `stable` goes live.

**Post-deploy endpoint availability (High):**
- What's not tested: Nothing asserts a deployed environment is reachable and serving the expected
  commit.
- Files: `.github/workflows/deploy.yml`, `docs/operations/release.md`
- Risk: This gap is the direct cause of the current "green workflow, no site" state.
- Priority: **High**.

**Well-covered areas (no action needed):** data schema validation
(`tests/unit/data-validation.test.ts`, `src/data/schema/*.json` via Ajv), e2e build isolation,
built-link policy including encoded/protocol-relative escape fixtures
(`tests/unit/built-link-policy.test.ts`, `tests/fixtures/links/`), navigation, status presentation,
accessibility (`tests/e2e/accessibility.spec.ts` with `@axe-core/playwright`), responsive behavior,
and operations-doc consistency (`tests/unit/operations-docs.test.ts`).

---

*Concerns audit: 2026-08-26*
