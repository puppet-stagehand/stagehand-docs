# Puppet Stagehand Website and Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a production-ready static Puppet Stagehand marketing and documentation site, backed by evidence-bearing compatibility data and deployable to isolated AWS `testpilots`, `beta`, and `stable` environments with OpenTofu and GitHub OIDC.

**Architecture:** Astro 7 emits static HTML, CSS, JavaScript, and JSON from Markdown and schema-validated YAML. A reusable OpenTofu module creates a private S3 origin, CloudFront distribution, Route 53 records, ACM certificate, security headers, and a narrowly scoped GitHub deployment role for each environment. GitHub Actions validates every change and promotes an immutable commit through protected environments.

**Tech Stack:** Node.js 24, npm 11, Astro 7.2.4, TypeScript 7.0.2, Bootstrap 5.3.8, Sass 1.103.1, Fontsource IBM Plex 5.3.0, YAML 2.9.0, Ajv 8.20.0, Vitest 4.1.11, Playwright 1.62.1, axe-core, OpenTofu 1.12.6, AWS, and GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md`

## Global Constraints

- Keep the site fully static. Do not add SSR, a database, customer authentication, payment handling, analytics, or third-party runtime JavaScript.
- Do not copy Gibson font files into this repository. Self-host IBM Plex through the pinned, focused Fontsource packages.
- Use the registered Puppet mark only when an approved asset is supplied. Until then, render the text wordmark `Puppet Stagehand`; never invent or redraw the mark.
- Treat `src/data/compatibility.yaml` as a customer claim registry. Every claim must include a primary evidence URL and `last_verified`; absence of approved claims renders an honest empty state.
- Never infer current compatibility from an upstream version number. A maintainer must intentionally add or revise the record.
- Every taggable environment-owned OpenTofu resource must receive `project = "stagehand"` and `environment = var.environment` from a module-local mandatory tag map. Environment provider `default_tags` repeat the same values as defense-in-depth. Shared resources receive only `project = "stagehand"`.
- Environment names are exactly `testpilots`, `beta`, and `stable`.
- Use test-driven development: add a failing test, observe the intended failure, implement the smallest change, rerun the focused test, then run the relevant broader check.
- Use one commit per task unless the task explicitly includes two commits.

---

### Task 1: Bootstrap a typed static Astro route

**Interfaces**

- Produces `npm run build`, which writes the static site to `dist/`.
- Produces `npm run check`, which performs Astro and TypeScript validation.
- Produces the `/` route as `dist/index.html`.
- Establishes Node 24 and npm 11 as the supported contributor toolchain.

**Files:**

- Create: `.editorconfig`
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `.npmrc`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/env.d.ts`
- Create: `src/pages/index.astro`
- Create: `tests/unit/build-contract.test.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Add the failing static-output contract test**

```ts
// tests/unit/build-contract.test.ts
import { describe, expect, it } from 'vitest';
import config from '../../astro.config.mjs';

describe('Astro build contract', () => {
  it('renders a static site at the canonical stable URL', () => {
    expect(config.output).toBe('static');
    expect(config.site?.toString()).toBe('https://www.puppetstagehand.com/');
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the project configuration does not exist**

Run: `npm test -- --run tests/unit/build-contract.test.ts`

Expected: failure because `package.json`, Vitest, and `astro.config.mjs` have not been created.

- [ ] **Step 3: Add the pinned package manifest and contributor configuration**

```json
{
  "name": "@puppet-stagehand/docs",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24 <25",
    "npm": ">=11 <12"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest",
    "test:unit": "vitest run",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "dependencies": {
    "@fontsource/ibm-plex-mono": "5.3.0",
    "@fontsource/ibm-plex-sans": "5.3.0",
    "astro": "7.2.4",
    "bootstrap": "5.3.8",
    "sass": "1.103.1"
  },
  "devDependencies": {
    "@astrojs/check": "0.9.10",
    "prettier": "3.9.6",
    "prettier-plugin-astro": "0.14.1",
    "typescript": "7.0.2",
    "vitest": "4.1.11"
  }
}
```

Set `.nvmrc` to `24`, `.npmrc` to `engine-strict=true`, ignore `node_modules/`, `dist/`, `.astro/`, `.tofu/`, `*.tfstate*`, and Playwright output, and extend `astro/tsconfigs/strict` from `tsconfig.json`.

Add `/// <reference types="astro/client" />` to `src/env.d.ts`. Configure Vitest for the Node environment and `tests/unit/**/*.test.ts`. Configure Prettier to use `prettier-plugin-astro`, single quotes, and a 100-character print width. Use UTF-8, LF endings, a final newline, and two-space indentation in `.editorconfig`.

- [ ] **Step 4: Install dependencies and commit the exact lockfile**

Run: `npm install`

Expected: npm creates `package-lock.json` without peer-dependency errors.

- [ ] **Step 5: Add the static Astro configuration and minimal semantic page**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://www.puppetstagehand.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
```

```astro
---
// src/pages/index.astro
const title = 'Puppet Stagehand';
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{title}</title>
  </head>
  <body>
    <main><h1>{title}</h1></main>
  </body>
</html>
```

- [ ] **Step 6: Run focused and build verification**

Run: `npm test -- --run tests/unit/build-contract.test.ts && npm run check && npm run build`

Expected: one passing unit test, no Astro errors, and `dist/index.html` exists.

- [ ] **Step 7: Format and commit**

Run: `npm run format && git add .editorconfig .gitignore .nvmrc .npmrc package.json package-lock.json astro.config.mjs tsconfig.json src/env.d.ts src/pages/index.astro tests/unit/build-contract.test.ts vitest.config.ts && git commit -m "build: bootstrap static Astro site"`

---

### Task 2: Build the Stagehand visual shell and navigation

**Interfaces**

- `BaseLayout` consumes `title: string`, `description: string`, and optional `canonicalPath: string`.
- `SiteHeader` consumes no properties and exposes keyboard-accessible navigation.
- `StatusMark` consumes `label: string` and optional `tone: 'cyan' | 'purple'`.
- Produces global design tokens, self-hosted fonts, consistent metadata, skip navigation, header, main landmark, and footer.

**Files:**

- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/SiteHeader.astro`
- Create: `src/components/SiteFooter.astro`
- Create: `src/components/StatusMark.astro`
- Create: `src/lib/navigation.ts`
- Create: `src/styles/_tokens.scss`
- Create: `src/styles/global.scss`
- Create: `src/styles/components/_shell.scss`
- Create: `src/styles/components/_status-mark.scss`
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `src/pages/index.astro`
- Create: `tests/unit/navigation.test.ts`

- [ ] **Step 1: Add a failing navigation-definition test**

Extract and test a typed navigation array so route labels cannot drift between desktop and mobile views.

```ts
// tests/unit/navigation.test.ts
import { describe, expect, it } from 'vitest';
import { primaryNavigation } from '../../src/lib/navigation';

describe('primaryNavigation', () => {
  it('contains every customer entry point exactly once', () => {
    expect(primaryNavigation).toEqual([
      { href: '/tiers/', label: 'Tiers' },
      { href: '/compatibility/', label: 'Compatibility' },
      { href: '/docs/', label: 'Docs' },
      { href: '/support/', label: 'Support' },
    ]);
  });
});
```

Run: `npm test -- --run tests/unit/navigation.test.ts`

Expected: failure because `src/lib/navigation.ts` is absent.

- [ ] **Step 2: Implement the navigation contract and layout components**

```ts
// src/lib/navigation.ts
export interface NavigationItem {
  href: string;
  label: string;
}

export const primaryNavigation: readonly NavigationItem[] = [
  { href: '/tiers/', label: 'Tiers' },
  { href: '/compatibility/', label: 'Compatibility' },
  { href: '/docs/', label: 'Docs' },
  { href: '/support/', label: 'Support' },
];
```

Implement `BaseLayout.astro` with a skip link targeting `#main-content`, canonical URL derived with `new URL(canonicalPath, Astro.site)`, one `<main>` landmark, and no inline third-party scripts. `SiteHeader.astro` must use a native `<details>` menu on narrow screens so core navigation works without Bootstrap JavaScript.

- [ ] **Step 3: Add the design tokens and selective Bootstrap Sass imports**

Define navy `#071521`, raised navy `#0d2233`, cyan `#20d7e7`, Puppet purple `#6f3cc3`, off-white `#f4f7f9`, and warning amber `#ffbd4a`. Import Bootstrap functions, variables, maps, mixins, root, reboot, containers, grid, nav, navbar, tables, badges, accordion, buttons, forms, helpers, and utilities only.

- [ ] **Step 4: Bundle only the required IBM Plex weights and record their license**

Import `@fontsource/ibm-plex-sans/400.css`, `@fontsource/ibm-plex-sans/600.css`, and `@fontsource/ibm-plex-mono/400.css` in `BaseLayout.astro`. Vite will emit the referenced WOFF2 assets under hashed build assets; no font CDN is permitted. Add the SIL Open Font License attribution to `THIRD_PARTY_NOTICES.md` with links to the two package licenses.

Run: `npm run build && find dist -type f -name '*.woff2' | sort`

Expected: the build contains only the required IBM Plex weights and no Gibson files.

- [ ] **Step 5: Replace the minimal home route with the control-room hero**

Render an eyebrow (`AUTOMATION CONTROL PLANE`), an H1 (`Operate Puppet with less ceremony.`), a short product statement, links to `/docs/getting-started/` and `/compatibility/`, and three capability cards for environment visibility, Bolt-native execution, and explicit support boundaries. Keep all claims descriptive; do not claim released orchestration support here.

- [ ] **Step 6: Verify the layout and build**

Run: `npm test -- --run tests/unit/navigation.test.ts && npm run check && npm run build && npm run format:check`

Expected: test and checks pass; generated home HTML contains `main-content`, `Tiers`, `Compatibility`, `Docs`, and `Support`.

- [ ] **Step 7: Commit**

Run: `git add src THIRD_PARTY_NOTICES.md tests/unit/navigation.test.ts && git commit -m "feat: add Stagehand visual shell"`

---

### Task 3: Define and enforce tier and compatibility data contracts

**Interfaces**

- `loadTiers(): Tier[]` reads and validates `src/data/tiers.yaml`.
- `loadCompatibility(): CompatibilityRecord[]` reads, validates, normalizes, rejects duplicates, and sorts `src/data/compatibility.yaml`.
- `SupportStatus` is exactly `supported | compatible | limited | deprecated | unsupported`.
- Every compatibility record joins to one tier and provides an HTTPS `evidence_url` plus an ISO `last_verified` date.
- Production validation rejects verification dates more than 365 days old; unit tests may inject `today`.

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/data/schema/tiers.schema.json`
- Create: `src/data/schema/compatibility.schema.json`
- Create: `src/data/tiers.yaml`
- Create: `src/data/compatibility.yaml`
- Create: `src/lib/data/types.ts`
- Create: `src/lib/data/load-yaml.ts`
- Create: `src/lib/data/tiers.ts`
- Create: `src/lib/data/compatibility.ts`
- Create: `scripts/validate-data.ts`
- Create: `tests/fixtures/data/compatibility-valid.yaml`
- Create: `tests/fixtures/data/compatibility-duplicate.yaml`
- Create: `tests/fixtures/data/compatibility-stale.yaml`
- Create: `tests/unit/data-validation.test.ts`

- [ ] **Step 1: Add Ajv, YAML, and the failing validation tests**

Run: `npm install --save-exact yaml@2.9.0 ajv@8.20.0 && npm install --save-dev --save-exact tsx@4.23.12`

The test must assert that the valid fixture returns one normalized record, duplicate identity keys throw `Duplicate compatibility record`, stale records throw `Compatibility evidence is older than 365 days`, and an unknown tier throws `Unknown tier`.

Run: `npm test -- --run tests/unit/data-validation.test.ts`

Expected: failure because the loaders do not exist.

- [ ] **Step 2: Add strict JSON Schemas**

Use JSON Schema draft 2020-12, `additionalProperties: false` at every object level, and these required compatibility keys:

```json
[
  "id",
  "platform",
  "puppet_versions",
  "stagehand_versions",
  "tier",
  "provider",
  "transport",
  "operating_systems",
  "status",
  "limitations",
  "docs_path",
  "evidence_url",
  "last_verified"
]
```

Set `docs_path` pattern to `^/docs/.+/$`, `evidence_url` format to URI with an application-level HTTPS check, `last_verified` format to `date`, and `status` to the exact five-state enum. Tier IDs are `openvox`, `puppet-core`, `puppet-enterprise`, and `pe-advanced`.

- [ ] **Step 3: Implement typed loading, join checks, duplicate checks, and deterministic sorting**

```ts
// src/lib/data/types.ts
export type SupportStatus =
  | 'supported'
  | 'compatible'
  | 'limited'
  | 'deprecated'
  | 'unsupported';

export interface Tier {
  id: 'openvox' | 'puppet-core' | 'puppet-enterprise' | 'pe-advanced';
  name: string;
  audience: string;
  entitlement: 'community' | 'commercial' | 'advanced';
  summary: string;
  features: string[];
}

export interface CompatibilityRecord {
  id: string;
  platform: string;
  puppet_versions: string;
  stagehand_versions: string;
  tier: Tier['id'];
  provider: string;
  transport: string;
  operating_systems: string[];
  status: SupportStatus;
  limitations: string[];
  docs_path: string;
  evidence_url: string;
  last_verified: string;
}
```

The record identity is `platform|puppet_versions|tier|provider|transport`. Sort by platform, then Puppet version expression, then tier, using `localeCompare('en')`. Accept `{ today?: Date; path?: string }` in `loadCompatibility` so tests are deterministic.

- [ ] **Step 4: Seed tiers and an intentionally empty compatibility claim list**

`tiers.yaml` must describe the four customer categories without claiming unimplemented entitlement enforcement. `compatibility.yaml` must contain:

```yaml
schema_version: 1
records: []
```

The empty list is deliberate: this new repository has no approved release/version evidence yet. The compatibility page added next will explain how and when claims appear. Real records enter through reviewed PRs with evidence.

- [ ] **Step 5: Add the validation command**

```json
"validate:data": "tsx scripts/validate-data.ts"
```

`scripts/validate-data.ts` loads both files, prints `Validated 4 tiers and 0 compatibility records`, and exits nonzero on any error without suppressing the error message.

- [ ] **Step 6: Run focused and production validation**

Run: `npm test -- --run tests/unit/data-validation.test.ts && npm run validate:data && npm run check`

Expected: all fixture tests pass and the production command reports four tiers and zero records.

- [ ] **Step 7: Commit**

Run: `git add package.json package-lock.json src/data src/lib/data scripts/validate-data.ts tests && git commit -m "feat: validate customer compatibility data"`

---

### Task 4: Render tiers, compatibility, and downloadable JSON

**Interfaces**

- `/tiers/` renders all tiers from `loadTiers()`.
- `/compatibility/` renders all records from `loadCompatibility()` or a truthful empty state.
- `/data/tiers.json` and `/data/compatibility.json` serialize `{ schema_version: 1, generated_at: null, records: Tier[] | CompatibilityRecord[] }`; `generated_at` remains `null` to keep builds reproducible.
- Compatibility filters operate on semantic `<select>` elements and preserve a visible result count.
- `statusPresentation(status)` returns the status label and icon name for non-color identification.

**Files:**

- Create: `src/lib/data/status.ts`
- Create: `src/components/TierCard.astro`
- Create: `src/components/CompatibilityMatrix.astro`
- Create: `src/components/CompatibilityEmptyState.astro`
- Create: `src/pages/tiers/index.astro`
- Create: `src/pages/compatibility/index.astro`
- Create: `src/pages/data/tiers.json.ts`
- Create: `src/pages/data/compatibility.json.ts`
- Create: `src/styles/components/_tier-card.scss`
- Create: `src/styles/components/_compatibility.scss`
- Modify: `src/styles/global.scss`
- Create: `tests/unit/status-presentation.test.ts`
- Create: `tests/unit/json-endpoints.test.ts`

- [ ] **Step 1: Add failing status and JSON serialization tests**

```ts
expect(statusPresentation('supported')).toEqual({ label: 'Supported', symbol: 'check-circle' });
expect(statusPresentation('limited')).toEqual({ label: 'Limited', symbol: 'alert-triangle' });
expect(statusPresentation('unsupported')).toEqual({ label: 'Unsupported', symbol: 'x-circle' });
```

Also import each endpoint `GET`, assert status 200, content type `application/json`, schema version 1, and deterministic records.

Run: `npm test -- --run tests/unit/status-presentation.test.ts tests/unit/json-endpoints.test.ts`

Expected: failure because the status mapper and endpoints are absent.

- [ ] **Step 2: Implement exhaustive status presentation and JSON endpoints**

Use a `Record<SupportStatus, StatusPresentation>` so TypeScript fails when a future state lacks a label or symbol. Return `new Response(JSON.stringify(payload, null, 2) + '\n', { headers: { 'Content-Type': 'application/json; charset=utf-8' } })` from each endpoint.

- [ ] **Step 3: Build the tier page from structured data**

Render entitlement names as plain customer language:

- Community: OpenVox
- Commercial: Puppet Core and Puppet Enterprise
- Advanced: PE Advanced

State clearly that access control and Forge payment enforcement occur in the Puppet Console product, not in this public static documentation site.

- [ ] **Step 4: Build the responsive compatibility view**

For non-empty data, use a `<table>` above 768px with a caption, scoped column headers, textual status labels, evidence link, and last-verified date. Below 768px, render the same records as `<article>` cards via CSS rather than duplicating client data. For the initial empty list, render: `No compatibility claims have completed Stagehand release verification yet.` and link to `/support/`.

The filter script may hide rows/cards using the `hidden` attribute, but must not mutate record text. Announce result counts with `aria-live="polite"`. With JavaScript disabled, every record remains visible.

- [ ] **Step 5: Add matrix and tier styling**

Use the mono font for version ranges and transport names, 44px minimum interactive heights, visible `:focus-visible` outlines, icons plus text for every state, and no horizontal document overflow at 320px.

- [ ] **Step 6: Verify pages, endpoints, and type safety**

Run: `npm test -- --run tests/unit/status-presentation.test.ts tests/unit/json-endpoints.test.ts && npm run validate:data && npm run check && npm run build`

Expected: all tests pass and `dist/tiers/index.html`, `dist/compatibility/index.html`, `dist/data/tiers.json`, and `dist/data/compatibility.json` exist.

- [ ] **Step 7: Commit**

Run: `git add src tests && git commit -m "feat: publish tiers and compatibility matrix"`

---

### Task 5: Add version-controlled documentation and support routes

**Interfaces**

- Astro content collection `docs` consumes Markdown with `title`, `description`, `order`, and optional `updated` frontmatter.
- `/docs/` lists documentation entries in `order` order.
- `/docs/getting-started/`, `/docs/security/`, and `/support/` are generated as static HTML.
- The docs layout provides local navigation and one H1 derived from frontmatter.

**Files:**

- Create: `src/content.config.ts`
- Create: `src/content/docs/getting-started.md`
- Create: `src/content/docs/security.md`
- Create: `src/layouts/DocsLayout.astro`
- Create: `src/components/DocsNavigation.astro`
- Create: `src/pages/docs/index.astro`
- Create: `src/pages/docs/[...slug].astro`
- Create: `src/pages/support/index.astro`
- Create: `src/pages/404.astro`
- Create: `src/styles/components/_docs.scss`
- Modify: `src/styles/global.scss`
- Create: `tests/unit/docs-collection.test.ts`

- [ ] **Step 1: Add a failing docs collection test**

Test that the collection contains slugs `getting-started` and `security`, both have non-empty descriptions, and order values are unique.

Run: `npm test -- --run tests/unit/docs-collection.test.ts`

Expected: failure because the collection has not been defined.

- [ ] **Step 2: Define the collection schema**

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    order: z.number().int().positive(),
    updated: z.coerce.date().optional(),
  }),
});

export const collections = { docs };
```

- [ ] **Step 3: Write representative documentation without overstating product readiness**

Getting started explains prerequisites, where Console integration will live, how SSH remains the OpenVox path, and that the premium orchestrator is not represented as available until a release compatibility record exists. Security explains credential ownership, SSH host verification, future PCP trust boundaries, Forge entitlement boundaries, and redaction/reporting guidance. Support distinguishes public issue reporting from commercial product support.

- [ ] **Step 4: Implement docs routing and navigation**

Use `getCollection('docs')` in `getStaticPaths`, sort with `order`, and pass the rendered entry into `DocsLayout`. Add breadcrumbs with an `aria-label`, `aria-current="page"` on local navigation, a visible last-updated date only when supplied, and previous/next links.

- [ ] **Step 5: Add an intentional static 404 page**

Include a direct link to `/docs/` and `/support/`, and ensure the page title begins `Page not found`.

- [ ] **Step 6: Verify all routes**

Run: `npm test -- --run tests/unit/docs-collection.test.ts && npm run check && npm run build`

Expected: docs tests pass and all seven initial routes plus `404.html` exist in `dist/`.

- [ ] **Step 7: Commit**

Run: `git add src tests && git commit -m "docs: add product and security guides"`

---

### Task 6: Add browser, accessibility, and link quality gates

**Interfaces**

- `npm run test:e2e` builds and serves `dist/`, then runs Chromium tests.
- `npm run test:a11y` runs axe against home, tiers, compatibility, and docs.
- `npm run check:links` checks generated internal links and fails on broken references.
- `npm run lint` checks TypeScript, Astro, and Sass sources.

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `eslint.config.js`
- Create: `stylelint.config.mjs`
- Create: `playwright.config.ts`
- Create: `tests/e2e/navigation.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `scripts/check-built-routes.ts`

- [ ] **Step 1: Install pinned quality dependencies**

Run: `npm install --save-dev --save-exact eslint@10.9.0 eslint-plugin-astro@3.1.0 stylelint@17.14.1 stylelint-config-standard-scss@17.0.0 @playwright/test@1.62.1 @axe-core/playwright@4.13.0 linkinator@8.0.4`

Run: `npx playwright install chromium`

Expected: Chromium installs successfully.

- [ ] **Step 2: Add failing browser tests**

Cover navigation to every initial route, empty compatibility state, keyboard activation of the mobile menu, 320x720 and 1280x800 viewports, no horizontal overflow, visible focus, 404 content, and `prefers-reduced-motion: reduce`. Axe must report zero serious or critical violations on `/`, `/tiers/`, `/compatibility/`, and `/docs/`.

Run: `npm run test:e2e`

Expected: failure because Playwright configuration and scripts are not complete.

- [ ] **Step 3: Configure lint, link, and browser scripts**

Add:

```json
"lint": "eslint . && stylelint 'src/**/*.scss'",
"check:routes": "tsx scripts/check-built-routes.ts",
"check:links": "linkinator dist --recurse --skip 'https://github.com/puppet-stagehand/stagehand-docs/issues/new'",
"test:e2e": "playwright test",
"test:a11y": "playwright test tests/e2e/accessibility.spec.ts",
"verify": "npm run format:check && npm run lint && npm run check && npm run validate:data && npm run test:unit && npm run build && npm run check:routes && npm run check:links && npm run test:e2e"
```

The built-route script checks exact files for `/`, `/tiers/`, `/compatibility/`, `/docs/`, `/docs/getting-started/`, `/docs/security/`, `/support/`, `/data/tiers.json`, `/data/compatibility.json`, and `/404.html`.

- [ ] **Step 4: Fix only issues exposed by the browser and accessibility tests**

Preserve the design tokens and content contract. Typical acceptable fixes are heading order, focus contrast, overflow containment, explicit labels, and reduced-motion declarations.

- [ ] **Step 5: Run the complete site gate**

Run: `npm run verify`

Expected: all format, lint, type, data, unit, build, route, link, responsive, navigation, and axe checks pass.

- [ ] **Step 6: Commit**

Run: `git add package.json package-lock.json eslint.config.js stylelint.config.mjs playwright.config.ts scripts tests src && git commit -m "test: enforce site quality gates"`

---

### Task 7: Create the reusable tagged AWS static-site module

**Interfaces**

- Module inputs: `environment`, `domain_name`, `alternate_domain_names`, `hosted_zone_id`, `github_repository`, `github_oidc_provider_arn`, and `enable_redirect_function`.
- Module outputs: `content_bucket_name`, `distribution_id`, `distribution_domain_name`, `deployment_role_arn`, and `certificate_arn`.
- Module-local `required_tags` is the authoritative source of mandatory environment tags; root provider defaults provide a second guardrail.
- The environment variable rejects any value outside the exact three-value enum.

**Files:**

- Create: `infra/modules/static-site/versions.tf`
- Create: `infra/modules/static-site/variables.tf`
- Create: `infra/modules/static-site/locals.tf`
- Create: `infra/modules/static-site/s3.tf`
- Create: `infra/modules/static-site/acm.tf`
- Create: `infra/modules/static-site/cloudfront.tf`
- Create: `infra/modules/static-site/dns.tf`
- Create: `infra/modules/static-site/iam.tf`
- Create: `infra/modules/static-site/outputs.tf`
- Create: `infra/modules/static-site/functions/redirect.js`
- Create: `infra/modules/static-site/tests/static_site.tftest.hcl`

- [ ] **Step 1: Add failing OpenTofu tests for validation, tags, privacy, OAC, and HTTPS**

The mock-provider tests must assert:

- `environment = "development"` fails variable validation.
- S3 has public access block enabled and versioning enabled.
- The CloudFront origin uses OAC, not an origin access identity.
- The default cache behavior redirects HTTP to HTTPS.
- Response headers include HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame protection, and a self-only baseline CSP.
- IAM deployment policy references exactly the module bucket and distribution.

Run: `tofu -chdir=infra/modules/static-site init -backend=false && tofu -chdir=infra/modules/static-site test`

Expected: failure because module resources do not exist.

- [ ] **Step 2: Declare provider and input contracts**

Pin OpenTofu `>= 1.12, < 2.0` and AWS provider `~> 6.0`. Validate the environment with:

```hcl
validation {
  condition     = contains(["testpilots", "beta", "stable"], var.environment)
  error_message = "environment must be testpilots, beta, or stable."
}
```

Require DNS names to be non-empty and `github_repository` to equal `puppet-stagehand/stagehand-docs` by default.

Define the authoritative tag map in `locals.tf`:

```hcl
locals {
  required_tags = {
    project     = "stagehand"
    environment = var.environment
  }
}
```

Set `tags = local.required_tags` on every taggable module resource. Do not expose an input that can override either mandatory key.

- [ ] **Step 3: Create a private, encrypted, versioned S3 origin**

Use bucket name prefix `stagehand-${var.environment}-site-`, S3-managed encryption, ownership enforcement, public-access block, lifecycle rules for noncurrent versions, and a bucket policy granting only the CloudFront service principal access when `AWS:SourceArn` equals the distribution ARN.

- [ ] **Step 4: Create ACM, Route 53, CloudFront OAC, cache policies, and response headers**

Issue the certificate in `us-east-1` via an aliased provider passed by each root. Create DNS validation records, a CloudFront distribution with `index.html` as the root object, custom 404 response mapped to `/404.html`, compression, TLS 1.2 minimum, and aliases. Use separate cache behaviors for `/assets/*` and `/data/*`.

- [ ] **Step 5: Add clean-path and stable apex redirect behavior**

The CloudFront Function redirects paths without file extensions to a trailing slash and maps trailing-slash requests to `index.html` for origin lookup without changing the visible URL. When the request host is `puppetstagehand.com`, return a 301 to `https://www.puppetstagehand.com` with the original URI and query string. Enable the apex behavior only for stable.

- [ ] **Step 6: Create the least-privilege deployment role**

Trust the account GitHub OIDC provider only when `token.actions.githubusercontent.com:aud` is `sts.amazonaws.com` and `sub` equals `repo:puppet-stagehand/stagehand-docs:environment:${var.environment}`. Permit bucket listing, object read/write/delete for the single content bucket, and `cloudfront:CreateInvalidation` for the single distribution. Do not grant infrastructure mutation.

- [ ] **Step 7: Run OpenTofu validation and tests**

Run: `tofu fmt -recursive infra && tofu -chdir=infra/modules/static-site init -backend=false && tofu -chdir=infra/modules/static-site validate && tofu -chdir=infra/modules/static-site test`

Expected: format is clean, validation passes, and every module assertion passes.

- [ ] **Step 8: Commit**

Run: `git add infra/modules/static-site && git commit -m "feat: add tagged AWS static site module"`

---

### Task 8: Add isolated environment roots and state bootstrap

**Interfaces**

- Each environment root calls the module once and uses its own S3 backend key.
- Bootstrap creates three private, versioned state buckets with native lockfile support and one shared GitHub OIDC provider.
- Shared resources use `project = "stagehand"`; environment state buckets use both mandatory tags.
- No backend or account identifier is hard-coded into reusable module code.

**Files:**

- Create: `infra/bootstrap/versions.tf`
- Create: `infra/bootstrap/providers.tf`
- Create: `infra/bootstrap/variables.tf`
- Create: `infra/bootstrap/main.tf`
- Create: `infra/bootstrap/outputs.tf`
- Create: `infra/bootstrap/terraform.tfvars.example`
- Create: `infra/environments/testpilots/backend.hcl.example`
- Create: `infra/environments/testpilots/main.tf`
- Create: `infra/environments/testpilots/variables.tf`
- Create: `infra/environments/testpilots/terraform.tfvars.example`
- Repeat environment-root files for: `infra/environments/beta/`
- Repeat environment-root files for: `infra/environments/stable/`
- Create: `tests/unit/environment-roots.test.ts`
- Create: `scripts/check-tofu-tags.sh`

- [ ] **Step 1: Add failing environment-isolation tests**

Assert host mapping exactly:

```hcl
testpilots = "testpilots.puppetstagehand.com"
beta       = "beta.puppetstagehand.com"
stable     = "www.puppetstagehand.com"
```

Assert only stable supplies `puppetstagehand.com` as an alternate name and enables the apex redirect. Assert every environment calls the module with the correct literal environment value.

Run: `npm test -- --run tests/unit/environment-roots.test.ts`

Expected: failure because roots do not exist. The test reads the three root files and asserts their literal environment, hostname, alternate-name, and redirect arguments.

- [ ] **Step 2: Implement the bootstrap stack**

Create three state buckets named from an explicit `state_bucket_names` map supplied in `terraform.tfvars`, each with encryption, versioning, public access blocked, and explicit `project = "stagehand"` plus `environment = each.key` tags. Configure bootstrap provider defaults with the shared `project = "stagehand"` tag only. Create one GitHub OIDC provider tagged only `project = "stagehand"`. Output its ARN for environment configuration.

- [ ] **Step 3: Implement one explicit root per environment**

Each root configures default AWS provider tags:

```hcl
default_tags {
  tags = {
    project     = "stagehand"
    environment = "testpilots"
  }
}
```

Repeat with the literal matching environment. Configure an aliased `aws.us_east_1` provider for ACM with the same two default tags as the primary provider. Pass the shared OIDC provider ARN into the module rather than attempting to create it per environment.

- [ ] **Step 4: Add backend examples with native lockfiles**

Each `backend.hcl.example` includes `bucket`, `key = "stagehand-docs/terraform.tfstate"`, `region`, `encrypt = true`, and `use_lockfile = true`. Document that users copy it to ignored `backend.hcl` after bootstrap output is available.

- [ ] **Step 5: Add the static tag-policy check**

`scripts/check-tofu-tags.sh` must fail if an environment provider omits either required default tag, if a module declares a conflicting standalone `project` or `environment` tag, or if a fourth environment directory appears. Use POSIX shell plus `rg`; print the offending path on failure.

- [ ] **Step 6: Validate every root without remote state**

Run: `tofu fmt -recursive infra && tofu -chdir=infra/bootstrap init -backend=false && tofu -chdir=infra/bootstrap validate && for env in testpilots beta stable; do tofu -chdir="infra/environments/$env" init -backend=false && tofu -chdir="infra/environments/$env" validate; done && ./scripts/check-tofu-tags.sh && npm test -- --run tests/unit/environment-roots.test.ts`

Expected: all initialization, validation, tag-policy, and environment assertions pass without AWS credentials.

- [ ] **Step 7: Commit**

Run: `git add infra scripts/check-tofu-tags.sh && git commit -m "feat: isolate Stagehand AWS environments"`

---

### Task 9: Add pull-request and deployment workflows

**Interfaces**

- `validate.yml` runs on pull requests and pushes to `main` with read-only permissions.
- `deploy.yml` automatically deploys `main` to `testpilots` and manually promotes an explicit Git SHA to `beta` or `stable`.
- `infrastructure.yml` plans on pull requests and applies only through a selected protected GitHub Environment.
- Deployment jobs use GitHub OIDC and environment-scoped variables; no AWS keys are accepted.

**Files:**

- Create: `.github/workflows/validate.yml`
- Create: `.github/workflows/deploy.yml`
- Create: `.github/workflows/infrastructure.yml`
- Create: `.github/actions/setup-site/action.yml`
- Create: `scripts/deploy-site.sh`
- Create: `scripts/assert-promotable-commit.sh`
- Create: `tests/unit/deploy-scripts.test.ts`

- [ ] **Step 1: Add failing deployment-script tests**

Test cache classification: `assets/*` receives `public,max-age=31536000,immutable`; HTML and JSON receive `public,max-age=0,must-revalidate`. Test that promotion rejects a ref not reachable from `origin/main`, an uncommitted working tree, and an environment outside the three-value enum.

Run: `npm test -- --run tests/unit/deploy-scripts.test.ts`

Expected: failure because deployment scripts do not exist.

- [ ] **Step 2: Implement safe content upload behavior**

`deploy-site.sh` requires `DEPLOY_ENVIRONMENT`, `CONTENT_BUCKET`, and `DISTRIBUTION_ID`; validates all three; performs the immutable assets sync first, the HTML/data sync second with deletion enabled, and invalidates `/index.html`, `/tiers/index.html`, `/compatibility/index.html`, `/docs/index.html`, `/docs/getting-started/index.html`, `/docs/security/index.html`, `/support/index.html`, `/404.html`, and `/data/*` only after both syncs succeed. Use `set -eu`; never echo credentials.

- [ ] **Step 3: Add the reusable setup action and validation workflow**

Use `actions/checkout`, `actions/setup-node` with Node 24 and npm cache, `npm ci`, `npm run verify`, and OpenTofu setup followed by format, module tests, root validation, and tag checks. Pin third-party actions to immutable full commit SHAs, with a version comment on each `uses:` line.

- [ ] **Step 4: Add automatic testpilots deployment and manual promotion**

On push to `main`, set environment to `testpilots` and commit to `${{ github.sha }}`. On workflow dispatch, require `environment` choice `beta` or `stable` plus a full 40-character `git_sha`. Check out that SHA, prove it is reachable from `origin/main`, build it, request `id-token: write`, assume `${{ vars.AWS_DEPLOY_ROLE_ARN }}`, and run the deployment script using `${{ vars.CONTENT_BUCKET }}` and `${{ vars.CLOUDFRONT_DISTRIBUTION_ID }}`.

Set `concurrency.group` to `stagehand-docs-${{ inputs.environment || 'testpilots' }}` and `cancel-in-progress: false` so an active upload is never interrupted.

Guard the deployment job with an explicit check that `AWS_DEPLOY_ROLE_ARN`, `CONTENT_BUCKET`, and `CLOUDFRONT_DISTRIBUTION_ID` are non-empty. Before initial AWS configuration, validation still runs and the content deployment job reports skipped rather than failing or attempting anonymous AWS access.

- [ ] **Step 5: Add infrastructure plan/apply separation**

Pull requests run `tofu plan` only when `infra/**` changes and upload the plan text as an artifact after removing sensitive values. Manual dispatch requires an environment and `apply` confirmation string, enters that protected GitHub Environment, initializes its backend, creates a fresh plan, and applies that exact saved plan. Infrastructure uses a separate environment-scoped role variable `AWS_INFRASTRUCTURE_ROLE_ARN` from the content deployment role.

- [ ] **Step 6: Verify workflow syntax and scripts locally**

Run: `npm test -- --run tests/unit/deploy-scripts.test.ts && npx prettier --check .github && shellcheck scripts/deploy-site.sh scripts/assert-promotable-commit.sh scripts/check-tofu-tags.sh && npm run verify`

Expected: deployment tests, YAML formatting, shell lint, and the full site gate pass.

- [ ] **Step 7: Commit**

Run: `git add .github scripts tests package.json package-lock.json && git commit -m "ci: validate and promote Stagehand site"`

---

### Task 10: Document operations, cost boundaries, and release setup

**Interfaces**

- `README.md` gets a new contributor from clone to verified local build.
- `docs/operations/aws-bootstrap.md` explains one-time bootstrap and per-environment apply without embedding account values.
- `docs/operations/github-environments.md` specifies exact variables, permissions, and protection rules.
- `docs/operations/release.md` specifies testpilots-to-beta-to-stable promotion and rollback.
- `docs/operations/compatibility-claims.md` defines evidence review and the 365-day freshness rule.

**Files:**

- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `docs/operations/aws-bootstrap.md`
- Create: `docs/operations/github-environments.md`
- Create: `docs/operations/release.md`
- Create: `docs/operations/compatibility-claims.md`
- Create: `docs/operations/cost-model.md`
- Create: `CODEOWNERS`

- [ ] **Step 1: Write the contributor and security entry points**

Document Node 24, npm 11, OpenTofu 1.12, `npm ci`, `npm run verify`, local `npm run dev`, disclosure via GitHub Security Advisories, and the rule that no customer data or credentials belong in this repository.

- [ ] **Step 2: Document AWS bootstrap and tag verification**

List exact order: authenticate AWS CLI, copy bootstrap tfvars, apply bootstrap, copy each backend example, initialize each environment, plan, review tags, apply. Include `aws resourcegroupstaggingapi get-resources` examples filtering `project=stagehand` and each environment. State that no scaffold task performs an AWS apply or DNS cutover.

- [ ] **Step 3: Document GitHub Environment configuration**

For each of `testpilots`, `beta`, and `stable`, require variables `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`, `AWS_INFRASTRUCTURE_ROLE_ARN`, `CONTENT_BUCKET`, and `CLOUDFRONT_DISTRIBUTION_ID`. Require reviewers for beta and stable; stable also disallows self-review. Do not define AWS access-key secrets.

- [ ] **Step 4: Document release, rollback, and compatibility claim review**

Promotion always uses a full SHA already deployed to the previous environment. Rollback redeploys the last known-good SHA; never edit S3 objects manually. A compatibility PR must link primary vendor documentation, test evidence, or a Stagehand release artifact; update `last_verified`; receive CODEOWNER approval; and pass data validation.

- [ ] **Step 5: Record the cost model with explicit assumptions**

Explain that low-volume AWS cost is dominated by Route 53 hosted-zone and CloudFront/S3 request/storage charges; traffic pricing changes by region and date. Provide formulas rather than immutable dollar promises, link the AWS CloudFront, S3, Route 53, and ACM pricing pages, and instruct maintainers to refresh figures before customer publication.

- [ ] **Step 6: Protect infrastructure, workflows, and compatibility claims with CODEOWNERS**

Assign `@matthewrstone` to `/infra/`, `/.github/workflows/`, `/src/data/compatibility.yaml`, and `/src/data/schema/`. Replace this individual owner with a verified organization team only after that team exists and has repository access.

- [ ] **Step 7: Run the full repository gate and scan for unfinished content**

Run: `npm run verify && tofu fmt -check -recursive infra && ./scripts/check-tofu-tags.sh && rg -n "TODO|TBD|FIXME|YOUR_|example\.com|AKIA" --glob '!docs/superpowers/**' .`

Expected: all checks pass; the scan prints no unfinished placeholders, dummy domains, or credential-like values.

- [ ] **Step 8: Commit**

Run: `git add README.md CONTRIBUTING.md SECURITY.md CODEOWNERS docs/operations && git commit -m "docs: add Stagehand site operations guide"`

---

### Task 11: Perform final release-candidate verification

**Interfaces**

- Produces a clean, pushed `main` branch that is ready for GitHub Environment and AWS account configuration.
- Does not create cloud resources or change DNS.
- Records exact verification commands and results in the pull request or release handoff.

**Files:**

- Modify only if verification finds a defect: files owned by the failing task

- [ ] **Step 1: Start from a clean dependency install**

Run: `git status --short && rm -rf node_modules dist .astro test-results playwright-report && npm ci`

Expected: the first command prints nothing; npm installs exactly the lockfile. The removal targets are repository-local generated directories only.

- [ ] **Step 2: Run the complete site verification from the clean install**

Run: `npm run verify`

Expected: format, lint, Astro checks, data validation, unit tests, build, routes, links, browser smoke, responsive checks, and accessibility checks all pass.

- [ ] **Step 3: Run complete OpenTofu verification**

Run: `tofu fmt -check -recursive infra && tofu -chdir=infra/bootstrap init -backend=false && tofu -chdir=infra/bootstrap validate && tofu -chdir=infra/modules/static-site init -backend=false && tofu -chdir=infra/modules/static-site validate && tofu -chdir=infra/modules/static-site test && for env in testpilots beta stable; do tofu -chdir="infra/environments/$env" init -backend=false && tofu -chdir="infra/environments/$env" validate; done && ./scripts/check-tofu-tags.sh`

Expected: formatting, validation, module policy assertions, and tag policy all pass without AWS credentials.

- [ ] **Step 4: Inspect generated output for prohibited runtime behavior and secrets**

Run: `rg -n '<script[^>]+src="https://|AKIA|aws_secret|Gibson|googletag|segment\.com' dist --pcre2`

Expected: no third-party runtime scripts, AWS credentials, Gibson references, or analytics integrations are present. Ordinary external documentation links are allowed.

- [ ] **Step 5: Review the final diff and commit any verification-only correction**

Run: `git diff --check && git status --short && git log --oneline --decorate -12`

Expected: no whitespace errors, no uncommitted files, and one focused commit per completed task.

- [ ] **Step 6: Push the verified branch**

Run: `git push origin main`

Expected: GitHub accepts the push and starts the validation and automatic testpilots workflow. The deployment job will remain safely unable to assume AWS until repository environments and infrastructure outputs are configured.
