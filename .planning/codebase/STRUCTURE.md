# Codebase Structure

**Analysis Date:** 2026-08-26

## Directory Layout

```
stagehand-docs/
├── src/                        # Astro application source
│   ├── components/             # Reusable .astro components
│   ├── content/docs/           # Markdown docs collection
│   ├── data/                   # Governed YAML + JSON Schemas
│   ├── layouts/                # Page shells
│   ├── lib/                    # Build-time TypeScript (data, navigation)
│   ├── pages/                  # File-based routes and JSON endpoints
│   ├── styles/                 # SCSS tokens, globals, component partials
│   ├── content.config.ts       # Docs collection definition + frontmatter schema
│   └── env.d.ts                # Astro ambient types
├── docs/                       # Human documentation (not built by Astro)
│   ├── operations/             # Runbooks: bootstrap, release, cost, environments
│   └── superpowers/            # Original plan and design spec
├── infra/                      # OpenTofu
│   ├── bootstrap/              # State backend + OIDC provider root
│   ├── environments/           # testpilots | beta | stable roots
│   └── modules/static-site/    # S3 + CloudFront + ACM + Route53 + IAM module
├── scripts/                    # Build gates, deploy, tooling
├── tests/                      # unit/ (Vitest), e2e/ (Playwright), fixtures/
├── .github/                    # workflows/ and composite actions/setup-site
├── astro.config.mjs            # Static output, site URL, outDir switching
├── playwright.config.ts        # Two projects: production + fixture-matrix
├── vitest.config.ts            # Unit test config
├── eslint.config.js            # Flat ESLint config
├── stylelint.config.mjs        # SCSS lint config
├── tsconfig.json               # TypeScript config
└── package.json                # Scripts, pinned deps, Prettier config
```

## Directory Purposes

**`src/components/`:**
- Purpose: Presentational Astro components with no data loading of their own.
- Contains: `.astro` files taking typed `Props`.
- Key files: `CompatibilityMatrix.astro`, `CompatibilityEmptyState.astro`, `TierCard.astro`, `StatusMark.astro`, `SiteHeader.astro`, `SiteFooter.astro`, `DocsNavigation.astro`

**`src/content/docs/`:**
- Purpose: Published documentation prose.
- Contains: Markdown with `title`, `description`, `order`, optional `updated` frontmatter.
- Key files: `getting-started.md`, `security.md`

**`src/data/`:**
- Purpose: Governed, schema-validated source of truth for customer-facing claims.
- Contains: `compatibility.yaml`, `tiers.yaml`, and `schema/compatibility.schema.json`, `schema/tiers.schema.json`.

**`src/lib/`:**
- Purpose: Build-time TypeScript logic.
- Key files: `navigation.ts`, `data/load-yaml.ts`, `data/compatibility.ts`, `data/tiers.ts`, `data/status.ts`, `data/types.ts`

**`src/pages/`:**
- Purpose: URL surface. Directory names map to routes with `trailingSlash: 'always'`.
- Key files: `index.astro`, `404.astro`, `tiers/index.astro`, `compatibility/index.astro`, `support/index.astro`, `docs/index.astro`, `docs/[...slug].astro`, `data/compatibility.json.ts`, `data/tiers.json.ts`

**`src/styles/`:**
- Purpose: Bootstrap 5 customisation and component styling.
- Key files: `_tokens.scss` (design tokens, imported before Bootstrap variables), `global.scss` (single import graph), `components/_shell.scss`, `components/_docs.scss`, `components/_compatibility.scss`, `components/_tier-card.scss`, `components/_status-mark.scss`

**`docs/`:**
- Purpose: Repository documentation for maintainers and operators. Not part of the Astro build.
- Key files: `operations/aws-bootstrap.md`, `operations/release.md`, `operations/github-environments.md`, `operations/cost-model.md`, `operations/compatibility-claims.md`

**`infra/`:**
- Purpose: All AWS provisioning.
- Key files: `modules/static-site/{s3,cloudfront,acm,dns,iam,locals,outputs,variables,versions}.tf`, `modules/static-site/functions/redirect.js`, `environments/<env>/main.tf`, `bootstrap/main.tf`
- Tests: `*.tftest.hcl` beside each root/module plus `modules/static-site/tests/redirect.test.mjs`

**`scripts/`:**
- Purpose: Verification gates and delivery tooling invoked from `package.json` and CI.
- Key files: `check-built-routes.ts`, `check-links.ts`, `check-built-links.ts`, `check-e2e-build-isolation.ts`, `validate-data.ts`, `serve-static-build.ts`, `deploy-site.sh`, `assert-promotable-commit.sh`, `check-tofu-tags.sh`

**`tests/`:**
- Purpose: Automated verification.
- Contains: `unit/*.test.ts` (Vitest), `e2e/*.spec.ts` (Playwright), `fixtures/` for data, link-checker HTML cases and build-output snapshots.

## Key File Locations

**Entry Points:**
- `astro.config.mjs`: Build configuration and `dist/` vs `.e2e-dist/` switching
- `src/pages/index.astro`: Site home page
- `src/pages/docs/[...slug].astro`: Dynamic docs route
- `package.json` (`verify` script): The canonical quality gate

**Configuration:**
- `tsconfig.json`, `eslint.config.js`, `stylelint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`
- `.nvmrc`, `.opentofu-version`, `.editorconfig`, `.npmrc`
- Prettier settings live inline in `package.json`

**Core Logic:**
- `src/lib/data/compatibility.ts`: Compatibility invariants and loading
- `src/lib/data/tiers.ts`: Tier registry with required-ID enforcement
- `src/lib/data/load-yaml.ts`: Shared AJV validation

**Testing:**
- `tests/unit/`, `tests/e2e/`, `tests/fixtures/`

**Delivery:**
- `.github/workflows/validate.yml`, `.github/workflows/deploy.yml`, `.github/workflows/infrastructure.yml`
- `.github/actions/setup-site/action.yml`: Shared Node/npm/Playwright setup

## Naming Conventions

**Files:**
- Astro components and layouts: PascalCase — `CompatibilityMatrix.astro`, `BaseLayout.astro`
- TypeScript modules: kebab-case — `load-yaml.ts`, `check-built-routes.ts`
- Pages: lowercase route segments, `index.astro` per directory — `tiers/index.astro`
- SCSS partials: leading underscore, kebab-case — `_status-mark.scss`
- Unit tests: `<subject>.test.ts`; E2E tests: `<subject>.spec.ts`
- OpenTofu: one file per resource concern — `s3.tf`, `cloudfront.tf`; tests `*.tftest.hcl`
- Shell scripts: kebab-case with verb-first names — `check-tofu-tags.sh`

**Directories:**
- lowercase, singular-or-domain nouns — `components`, `layouts`, `content`, `environments`

**Data:**
- YAML keys and record fields use snake_case — `puppet_versions`, `last_verified`, `evidence_url`, `schema_version`

## Where to Add New Code

**New documentation page:**
- Markdown: `src/content/docs/<slug>.md` with `title`, `description`, and an unused positive `order`
- Add the built route to `scripts/check-built-routes.ts`
- Add `/docs/<slug>/index.html` to the invalidation list in `scripts/deploy-site.sh`
- Cover it in `tests/unit/docs-collection.test.ts` / `tests/unit/built-routes.test.ts`

**New top-level page:**
- Route: `src/pages/<segment>/index.astro` wrapping `BaseLayout.astro`
- Nav entry: `src/lib/navigation.ts`
- Required-route entry: `scripts/check-built-routes.ts`; invalidation path: `scripts/deploy-site.sh`

**New component:**
- Implementation: `src/components/<Name>.astro` with an explicit `interface Props`
- Styles: `src/styles/components/_<name>.scss`, imported from `src/styles/global.scss`

**New data field or record type:**
- Schema: `src/data/schema/<name>.schema.json`
- Types: `src/lib/data/types.ts`
- Loader + invariants: `src/lib/data/<name>.ts` using `loadYaml`
- Tests: `tests/unit/data-validation.test.ts`; fixtures in `tests/fixtures/data/`

**New JSON endpoint:**
- `src/pages/data/<name>.json.ts` exporting `GET` typed `satisfies APIRoute`
- Assert it in `tests/unit/json-endpoints.test.ts` and `scripts/check-built-routes.ts`

**New AWS resource:**
- Module: `infra/modules/static-site/<concern>.tf`, tagged with `local.required_tags`
- Variables/outputs: `variables.tf` / `outputs.tf`, surfaced in each `infra/environments/*/main.tf`
- Tests: `infra/modules/static-site/tests/static_site.tftest.hcl`

**New verification gate:**
- Script: `scripts/check-<thing>.ts`
- Wire into the `verify` chain in `package.json`
- Unit-test the script logic under `tests/unit/`

**Utilities:**
- Shared build-time helpers: `src/lib/`

## Special Directories

**`dist/`:**
- Purpose: Production build output uploaded to S3.
- Generated: Yes. Committed: No.

**`.e2e-dist/`:**
- Purpose: Fixture build output served on port 4322 for the `fixture-matrix` Playwright project.
- Generated: Yes (only when `STAGEHAND_E2E_FIXTURES=1`). Committed: No.

**`.astro/`:**
- Purpose: Astro content-collection type cache.
- Generated: Yes. Committed: No.

**`test-results/`:**
- Purpose: Playwright traces and failure artifacts.
- Generated: Yes. Committed: No.

**`tests/fixtures/build-output/`:**
- Purpose: Checked-in expected build-output shapes for `production` and `e2e`, used by the isolation and build-contract tests.
- Generated: No. Committed: Yes.

**`.planning/codebase/`:**
- Purpose: GSD codebase map documents.
- Generated: Yes (by mapper agents). Committed: Yes.

**`.worktrees/`:**
- Purpose: Local git worktrees. Committed: No.

---

*Structure analysis: 2026-08-26*
