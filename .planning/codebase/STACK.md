# Technology Stack

**Analysis Date:** 2026-08-26

## Languages

**Primary:**
- TypeScript 6.0.3 — data loaders (`src/lib/`), JSON endpoints (`src/pages/data/`), build/verify scripts (`scripts/`), all tests (`tests/`). Config extends `astro/tsconfigs/strict` (`tsconfig.json`).
- Astro components/pages (`.astro`) — `src/components/`, `src/layouts/`, `src/pages/`.

**Secondary:**
- SCSS — design tokens and styles (`src/styles/_tokens.scss`, `src/styles/global.scss`, `src/styles/components/`).
- Markdown — docs content collection (`src/content/docs/getting-started.md`, `src/content/docs/security.md`).
- YAML — source of truth data (`src/data/tiers.yaml`, `src/data/compatibility.yaml`).
- HCL / OpenTofu — infrastructure (`infra/`).
- POSIX shell — deployment and repo checks (`scripts/deploy-site.sh`, `scripts/assert-promotable-commit.sh`, `scripts/check-tofu-tags.sh`).
- JavaScript — CloudFront edge function (`infra/modules/static-site/functions/redirect.js`) and its Node test (`infra/modules/static-site/tests/redirect.test.mjs`).

## Runtime

**Environment:**
- Node.js 24.x — pinned by `.nvmrc` (`24`) and enforced by `package.json` `engines` (`>=24 <25`). CI uses `node-version: 24` in `.github/actions/setup-site/action.yml`.
- Output is a fully static site (`output: 'static'` in `astro.config.mjs`); no server runtime in production.

**Package Manager:**
- npm >= 11 < 12 (`package.json` engines)
- Lockfile: present (`package-lock.json`), installed with `npm ci` in CI
- `.npmrc` present — sets `engine-strict` only (no registry auth)

**Infrastructure toolchain:**
- OpenTofu 1.12.6 — pinned by `.opentofu-version`; roots require `>= 1.12, < 2.0`

## Frameworks

**Core:**
- `astro` 7.2.4 — static site generator, content collections (`src/content.config.ts`), file-based routing (`src/pages/`)
- `bootstrap` 5.3.8 — CSS framework consumed via SCSS
- `sass` 1.103.1 — SCSS compilation (deprecation silencing configured in `astro.config.mjs`)

**Testing:**
- `vitest` 4.1.11 — unit tests, node environment, `tests/unit/**/*.test.ts` (`vitest.config.ts`)
- `@playwright/test` 1.62.1 — E2E across two projects (`production` on port 4321, `fixture-matrix` on 4322) via `playwright.config.ts`
- `@axe-core/playwright` 4.13.0 — accessibility assertions (`tests/e2e/accessibility.spec.ts`)
- `linkinator` 8.0.4 + `parse5` 8.0.1 — built-output link and route checking (`scripts/check-links.ts`, `scripts/check-built-routes.ts`)
- `tofu test` — HCL tests (`infra/**/tests/*.tftest.hcl`)

**Build/Dev:**
- `tsx` 4.23.12 — runs TypeScript scripts directly (`node --import tsx`)
- `@astrojs/check` 0.9.10 — `npm run check` type/diagnostics pass
- `eslint` 10.9.0 + `typescript-eslint` 8.61.0 + `eslint-plugin-astro` 3.1.0 (`eslint.config.js`)
- `stylelint` 17.14.1 + `stylelint-config-standard-scss` 17.0.0 (`stylelint.config.mjs`)
- `prettier` 3.9.6 + `prettier-plugin-astro` 0.14.1 — config inline in `package.json` (`singleQuote: true`, `printWidth: 100`)

## Key Dependencies

**Critical:**
- `ajv` 8.20.0 (2020-12 dialect) + `ajv-formats` 3.0.1 — strict runtime validation of YAML data against `src/data/schema/*.schema.json` in `src/lib/data/load-yaml.ts`; a schema violation fails the build.
- `yaml` 2.9.0 — parses the tier and compatibility data files.
- `@fontsource/ibm-plex-sans` / `@fontsource/ibm-plex-mono` 5.3.0 — self-hosted webfonts (no external font CDN).

**Infrastructure:**
- `hashicorp/aws` provider `~> 6.0` — pinned in `infra/*/versions.tf` and `.terraform.lock.hcl` files.

## Configuration

**Environment:**
- Application code reads exactly one env var: `STAGEHAND_E2E_FIXTURES` — when `1`, Astro writes to `./.e2e-dist` and data loaders read `tests/fixtures/data/*` with a frozen validation date (`src/lib/data/compatibility.ts`).
- Deploy-time env vars are supplied by GitHub Environments, not files (see INTEGRATIONS.md).
- No `.env` files exist in the repo; there is no runtime secret surface in the site itself.
- `terraform.tfvars.example` and `backend.hcl.example` files exist per infra root as templates; real `terraform.tfvars`/`backend.hcl` are not committed.

**Build:**
- `astro.config.mjs` — static output, `site: https://www.puppetstagehand.com/`, `trailingSlash: 'always'`, assets in `assets/`, directory-format routes
- `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `stylelint.config.mjs`, `.editorconfig`, `.prettierignore`

**Aggregate gate:**
`npm run verify` = format:check → lint → astro check → validate:data → unit tests → build → check:routes → check:links → E2E (incl. build isolation check).

## Platform Requirements

**Development:**
- Node 24 + npm 11, Playwright Chromium (`npx playwright install --with-deps chromium`)
- `ripgrep` on PATH for `scripts/check-tofu-tags.sh`
- OpenTofu 1.12.6 and AWS CLI for infra/deploy work

**Production:**
- Amazon S3 origin behind CloudFront with ACM TLS and Route 53 DNS, per environment (`testpilots`, `beta`, `stable`) — see `infra/environments/`

---

*Stack analysis: 2026-08-26*
