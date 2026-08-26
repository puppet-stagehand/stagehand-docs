# External Integrations

**Analysis Date:** 2026-08-26

## APIs & External Services

**None at runtime.** The published site is fully static: no client-side API calls, no third-party scripts, no analytics beacons, no external font/CDN requests (fonts are self-hosted via `@fontsource/*`). All "API" surfaces are build-time generated JSON files: `src/pages/data/tiers.json.ts` and `src/pages/data/compatibility.json.ts`, emitted to `/data/tiers.json` and `/data/compatibility.json`.

**Build/deploy-time services:**
- **AWS S3** — content origin and OpenTofu state store
  - SDK/Client: AWS CLI (`aws s3 sync` in `scripts/deploy-site.sh`), `hashicorp/aws` provider `~> 6.0`
  - Auth: GitHub OIDC → assumed IAM role (no static keys)
- **AWS CloudFront** — CDN, cache policies, response-headers security policy, edge redirect function
  - Defined in `infra/modules/static-site/cloudfront.tf`, function source `infra/modules/static-site/functions/redirect.js`
  - Invalidation issued by `scripts/deploy-site.sh` (`aws cloudfront create-invalidation`)
- **AWS ACM** — TLS certificates issued in `us-east-1` via the `aws.us_east_1` provider alias (`infra/modules/static-site/acm.tf`)
- **AWS Route 53** — apex/www A and AAAA alias records plus DNS certificate validation (`infra/modules/static-site/dns.tf`)
- **AWS IAM / STS** — deployment role and OIDC trust (`infra/modules/static-site/iam.tf`, `infra/bootstrap/main.tf`)
- **GitHub Actions** — CI/CD execution and protected Environments (`.github/workflows/`)

## Data Storage

**Databases:**
- None. Content is file-based: YAML (`src/data/tiers.yaml`, `src/data/compatibility.yaml`) validated against JSON Schema (`src/data/schema/*.schema.json`) and Markdown content collections (`src/content/docs/`).

**File Storage:**
- Amazon S3 content bucket per environment — `aws_s3_bucket.content` in `infra/modules/static-site/s3.tf`, with ownership controls, SSE, versioning, public-access block, lifecycle rules, and a bucket policy restricting reads to the CloudFront distribution via Origin Access Control.
- Amazon S3 state bucket — `aws_s3_bucket.state` in `infra/bootstrap/main.tf`, backing the `backend "s3" {}` blocks in each environment root (`infra/environments/*/main.tf`). Backend settings are supplied at init time from an uncommitted `backend.hcl` (template: `infra/environments/*/backend.hcl.example`).

**Caching:**
- CloudFront cache policies: `default`, `immutable`, `revalidating` (`infra/modules/static-site/cloudfront.tf`).
- Upload-time cache headers set in `scripts/deploy-site.sh`: `public,max-age=31536000,immutable` for `assets/*`, `public,max-age=0,must-revalidate` for HTML and JSON.

## Authentication & Identity

**Auth Provider:**
- None for site visitors — the site is public and unauthenticated.
- Machine identity: **GitHub OIDC federation into AWS**
  - Provider: `aws_iam_openid_connect_provider.github` (`infra/bootstrap/main.tf`), issuer `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`
  - Role trust condition (`infra/modules/static-site/iam.tf`): `token.actions.githubusercontent.com:sub = repo:${var.github_repository}:environment:${var.environment}` — a workflow can only assume the role from the matching protected GitHub Environment
  - Workflows request tokens with `permissions: id-token: write` and assume via `aws-actions/configure-aws-credentials` (SHA-pinned v6.2.3)

## Monitoring & Observability

**Error Tracking:**
- None.

**Logs:**
- GitHub Actions job logs and `$GITHUB_STEP_SUMMARY` notices (e.g. "Deployment skipped: configure all required variables in this GitHub Environment").
- No CloudFront access logging or CloudWatch alarms are configured in `infra/`.

## CI/CD & Deployment

**Hosting:**
- AWS S3 + CloudFront, three environments defined under `infra/environments/`:
  - `stable` — `www.puppetstagehand.com` with alternate `puppetstagehand.com`, redirect function enabled (`infra/environments/stable/main.tf`)
  - `beta` — `infra/environments/beta/main.tf`
  - `testpilots` — `infra/environments/testpilots/main.tf`
- Shared implementation: `infra/modules/static-site/`. Bootstrap (state bucket + OIDC provider): `infra/bootstrap/`.
- Default AWS region `us-east-2` (overridable via `vars.AWS_REGION`); ACM always `us-east-1`.

**CI Pipeline (`.github/workflows/`):**
- `validate.yml` — on PR and push to `main`. Job `site` runs `npm run verify`; job `infrastructure` runs `tofu fmt -check -recursive infra`, `scripts/check-tofu-tags.sh`, `tofu test` on the module, then `init -backend=false` / `validate` / `test` for `infra/bootstrap` and all three environment roots.
- `infrastructure.yml` — on PRs touching `infra/**`, plus `workflow_dispatch` requiring an `environment` choice and the literal confirmation string `apply`. Validate job mirrors the local checks; `plan` job is a matrix over `testpilots`/`beta`/`stable` using `*-plan` protected Environments and a plan-only IAM role, producing a value-free plan summary. Fork PRs are excluded (`head.repo.full_name == github.repository`).
- `deploy.yml` — push to `main` deploys to `testpilots`; `workflow_dispatch` promotes an explicit 40-hex `git_sha` to `beta` or `stable`. Guards: manual runs must use the `main` workflow ref, SHA format validated, `scripts/assert-promotable-commit.sh` run in both the validate and deploy jobs, concurrency group per environment with `cancel-in-progress: false`, and a preflight step that skips deployment when the Environment's variables are unset. `npm run verify` gates every deployment.
- Composite action `.github/actions/setup-site/action.yml` — pins Node 24, installs ripgrep, `npm ci`, optional Playwright Chromium (`install-playwright` input).
- All third-party actions are pinned to full commit SHAs (`actions/checkout@3d3c42e…` v7.0.1, `actions/setup-node@8207627…` v7.0.0, `opentofu/setup-opentofu@a1320f8…` v2.0.2, `aws-actions/configure-aws-credentials@e6de054…` v6.2.3).

## Environment Configuration

**GitHub Environment variables (`vars.*`), names only:**
- Deploy environments (`testpilots`, `beta`, `stable`): `AWS_DEPLOY_ROLE_ARN`, `CONTENT_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `AWS_REGION` (optional, defaults `us-east-2`)
- Plan environments (`testpilots-plan`, `beta-plan`, `stable-plan`): `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN`, `OIDC_PROVIDER_ARN`, `HOSTED_ZONE_ID`, `TOFU_STATE_BUCKET`, `AWS_REGION`

**OpenTofu variables:** `hosted_zone_id`, `github_oidc_provider_arn`, `aws_region` (passed as `TF_VAR_*` in CI; locally via uncommitted `terraform.tfvars` — templates at `infra/*/terraform.tfvars.example`).

**Build-time env var:** `STAGEHAND_E2E_FIXTURES=1` switches Astro output to `.e2e-dist` and loads fixture data.

**Secrets location:**
- No secrets in the repo — no `.env` files, and `.npmrc` contains only `engine-strict`. All AWS access is short-lived OIDC-assumed role credentials; non-secret configuration lives in protected GitHub Environment variables. Every resource carries a `project = "stagehand"` default tag (plus `environment`), enforced by `scripts/check-tofu-tags.sh`.

## Webhooks & Callbacks

**Incoming:**
- None. Only GitHub's own `push` / `pull_request` / `workflow_dispatch` events trigger workflows.

**Outgoing:**
- None. The only outbound calls are AWS API calls from CI (`aws s3 sync`, `aws cloudfront create-invalidation`, OpenTofu provider calls).

---

*Integration audit: 2026-08-26*
