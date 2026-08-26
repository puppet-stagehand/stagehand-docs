<!-- refreshed: 2026-08-26 -->
# Architecture

**Analysis Date:** 2026-08-26

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Authored Sources                          │
├──────────────────┬──────────────────┬───────────────────────┤
│  Markdown docs   │  Governed data   │  Operations prose      │
│ `src/content/    │ `src/data/*.yaml`│ `docs/operations/`     │
│      docs/*.md`  │ + JSON Schemas   │ (not built by Astro)   │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     │
┌─────────────────────────────────────────────────┼───────────┐
│              Astro build (static)               │           │
│  content collection  ──▶ `src/pages/docs/`      │           │
│  data loaders        ──▶ `src/lib/data/`        │  human    │
│  layouts/components  ──▶ `src/layouts/`         │  reference│
│  styles (Bootstrap+SCSS) `src/styles/`          │  only     │
│  config: `astro.config.mjs`                     │           │
└────────┬────────────────────────────────────────┴───────────┘
         │ output: 'static', trailingSlash: 'always'
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Build output                                                │
│  `dist/`  (production)   |  `.e2e-dist/`  (fixture build)    │
│  HTML routes + `assets/` + `data/*.json`                     │
└────────┬───────────────────────────┬────────────────────────┘
         │ verification              │ deployment
         ▼                           ▼
┌────────────────────────┐  ┌─────────────────────────────────┐
│ `scripts/` gates        │  │ `scripts/deploy-site.sh`        │
│ routes, links, isolation│  │  S3 sync + CloudFront invalidate│
│ `tests/unit`,`tests/e2e`│  └───────────────┬─────────────────┘
└────────────────────────┘                  │
                                             ▼
┌─────────────────────────────────────────────────────────────┐
│  AWS (OpenTofu) — `infra/modules/static-site`                │
│  S3 (private) ◀ OAC ─ CloudFront ─ ACM ─ Route53 ─ IAM/OIDC  │
│  roots: `infra/environments/{testpilots,beta,stable}`        │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Astro config | Static output, canonical site URL, trailing slashes, E2E output redirection | `astro.config.mjs` |
| Docs collection | Typed Markdown collection with frontmatter schema | `src/content.config.ts` |
| Docs route | Generates one page per collection entry with prev/next | `src/pages/docs/[...slug].astro` |
| Data loaders | Read + schema-validate YAML into typed records | `src/lib/data/compatibility.ts`, `src/lib/data/tiers.ts` |
| Schema gate | AJV 2020 compile/validate wrapper shared by loaders | `src/lib/data/load-yaml.ts` |
| Status mapping | Maps `SupportStatus` to label/symbol for presentation | `src/lib/data/status.ts` |
| Navigation registry | Single source of primary nav links | `src/lib/navigation.ts` |
| Page shell | HTML head, canonical URL, header/footer, skip link | `src/layouts/BaseLayout.astro` |
| Docs shell | Breadcrumbs, side rail, article chrome, pagination | `src/layouts/DocsLayout.astro` |
| JSON endpoints | Emit machine-readable data as static files | `src/pages/data/compatibility.json.ts`, `src/pages/data/tiers.json.ts` |
| Build gates | Assert required routes, link health, fixture isolation | `scripts/check-built-routes.ts`, `scripts/check-links.ts`, `scripts/check-e2e-build-isolation.ts` |
| Deploy | Upload `dist/` to S3 and invalidate CloudFront | `scripts/deploy-site.sh` |
| Infra module | S3 + CloudFront + ACM + Route53 + deploy IAM role | `infra/modules/static-site/` |
| CI | Verify, plan/apply infra, promote releases | `.github/workflows/` |

## Pattern Overview

**Overall:** Static site generation with a validated content/data pipeline, fronted by an infrastructure-as-code delivery layer.

**Key Characteristics:**
- No runtime server: every route (including JSON APIs) is materialised at build time into `dist/`.
- Data is treated as governed source: YAML is validated against JSON Schema plus business rules (evidence freshness, HTTPS evidence URLs, tier existence, uniqueness) and a build fails rather than emitting a bad claim.
- Test fixtures never leak into production output: fixture data is only used when `STAGEHAND_E2E_FIXTURES=1`, which also redirects the build to `.e2e-dist/`.
- Verification is a single command (`npm run verify`) that CI and humans run identically.

## Layers

**Content layer:**
- Purpose: Authoring surface for prose and governed data.
- Location: `src/content/docs/`, `src/data/`
- Contains: Markdown with frontmatter, YAML documents, JSON Schemas in `src/data/schema/`.
- Depends on: Nothing.
- Used by: Data loaders and the Astro content collection.

**Data access layer:**
- Purpose: Load, validate, normalise and sort domain records.
- Location: `src/lib/data/`
- Contains: `load-yaml.ts` (AJV), `compatibility.ts`, `tiers.ts`, `status.ts`, `types.ts`.
- Depends on: `node:fs`, `ajv`, `yaml`, the schema files.
- Used by: Pages, JSON endpoints, unit tests.

**Presentation layer:**
- Purpose: Render pages and reusable UI.
- Location: `src/layouts/`, `src/components/`, `src/styles/`
- Contains: Astro components, Bootstrap 5 + SCSS partials driven by `src/styles/_tokens.scss`.
- Depends on: Data access layer, `src/lib/navigation.ts`.
- Used by: `src/pages/`.

**Route layer:**
- Purpose: Define the URL surface.
- Location: `src/pages/`
- Contains: `.astro` pages and `.ts` API routes.
- Depends on: Layouts, components, data loaders.

**Verification layer:**
- Purpose: Prove the built artifact is correct before it can ship.
- Location: `scripts/`, `tests/unit/`, `tests/e2e/`
- Depends on: `dist/` and `.e2e-dist/` build outputs.

**Delivery layer:**
- Purpose: Provision AWS and publish `dist/`.
- Location: `infra/`, `scripts/deploy-site.sh`, `.github/workflows/`

## Data Flow

### Docs page build

1. `src/content.config.ts` globs `src/content/docs/**/*.md` and validates frontmatter (`title`, `description`, `order`, optional `updated`).
2. `getStaticPaths()` in `src/pages/docs/[...slug].astro` sorts entries by `order` and passes `previous`/`next` as props.
3. `DocsLayout.astro` renders breadcrumbs, `DocsNavigation.astro` rail, article header and pagination inside `BaseLayout.astro`.
4. Astro writes `dist/docs/<slug>/index.html` (`build.format: 'directory'`, `trailingSlash: 'always'`).

### Compatibility data path

1. `loadCompatibility()` (`src/lib/data/compatibility.ts`) resolves the source file — fixture path `tests/fixtures/data/compatibility-e2e.yaml` only when `STAGEHAND_E2E_FIXTURES=1`.
2. `loadYaml()` (`src/lib/data/load-yaml.ts`) parses YAML and validates against `src/data/schema/compatibility.schema.json` with AJV 2020 in strict mode.
3. Business rules run: unique IDs, unique platform/version/tier/provider/transport identity, tier must exist in `loadTiers()`, `evidence_url` must be HTTPS, `last_verified` must be a real past date within 365 days.
4. Records are sorted by platform, then Puppet versions, then tier.
5. `src/pages/compatibility/index.astro` renders `CompatibilityMatrix.astro`, or `CompatibilityEmptyState.astro` when the register is empty.
6. `src/pages/data/compatibility.json.ts` emits the same records to `dist/data/compatibility.json`.

### Release path

1. `npm run verify` runs format, lint, `astro check`, data validation, unit tests, build, route check, link check, and Playwright E2E.
2. `scripts/assert-promotable-commit.sh` confirms the requested SHA is promotable for the target environment.
3. `npm run build` produces `dist/`; `scripts/deploy-site.sh` syncs `dist/assets` with immutable caching, then the remainder with `max-age=0,must-revalidate`, then invalidates a fixed CloudFront path list.

**State Management:**
- No client-side state store; pages are static HTML. All state is build-time data derived from `src/data/`.

## Key Abstractions

**Governed data record:**
- Purpose: A verifiable compatibility or tier claim.
- Examples: `src/lib/data/types.ts`, `src/data/compatibility.yaml`, `src/data/tiers.yaml`
- Pattern: Schema + invariant checks in a loader that throws, so violations break the build.

**Presentation mapping:**
- Purpose: Keep domain status separate from UI vocabulary.
- Examples: `src/lib/data/status.ts`, `src/components/StatusMark.astro`
- Pattern: Total `Record<SupportStatus, StatusPresentation>` lookup.

**Environment root:**
- Purpose: One OpenTofu root per deployment ring wrapping a shared module.
- Examples: `infra/environments/stable/main.tf`, `infra/modules/static-site/`
- Pattern: Thin root supplying domain names, hosted zone, OIDC ARN and tags; module owns all resources.

## Entry Points

**Astro build:**
- Location: `astro.config.mjs`
- Triggers: `npm run build`, `npm run dev`
- Responsibilities: Static render of `src/pages/` to `dist/` (or `.e2e-dist/` under fixtures).

**Verification pipeline:**
- Location: `package.json` `verify` script
- Triggers: local `npm run verify`, `.github/workflows/validate.yml`, `.github/workflows/deploy.yml`
- Responsibilities: Full quality gate.

**Deployment:**
- Location: `.github/workflows/deploy.yml` → `scripts/deploy-site.sh`
- Triggers: push to `main` (testpilots) or manual dispatch with an explicit SHA for `beta`/`stable`.

**Infrastructure:**
- Location: `.github/workflows/infrastructure.yml` → `infra/environments/*`
- Triggers: PRs touching `infra/**` (plan) and manual dispatch with a typed confirmation (apply).

## Architectural Constraints

- **Static only:** `output: 'static'` in `astro.config.mjs`. There is no server runtime, so anything needing request-time logic must be a CloudFront function (`infra/modules/static-site/functions/redirect.js`) or move to build time.
- **Node-only data loading:** loaders use `node:fs` and therefore run at build time exclusively; they must not be imported into client-side script.
- **Fixture isolation:** `STAGEHAND_E2E_FIXTURES` simultaneously switches data source, validation "today" date (`2026-08-22`), and `outDir`. Changing one without the others breaks `scripts/check-e2e-build-isolation.ts`.
- **Trailing slashes:** `trailingSlash: 'always'` — every internal link must end with `/` or the link check fails.
- **Canonical site required:** `BaseLayout.astro` throws if `Astro.site` is unset.
- **Required tags:** every AWS resource must carry `project`/`environment` tags; enforced by `scripts/check-tofu-tags.sh`.
- **Global state:** none beyond module-level singletons — the AJV instance in `src/lib/data/load-yaml.ts` and the resolved data paths in the loaders.
- **Circular imports:** none observed.

## Anti-Patterns

### Rendering unvalidated data

**What happens:** A page reads `src/data/*.yaml` directly or bypasses `loadYaml`.
**Why it's wrong:** Schema and evidence-freshness invariants are skipped, so an unverified compatibility claim can ship to customers.
**Do this instead:** Always go through `loadCompatibility()` / `loadTiers()` in `src/lib/data/`.

### Hardcoding routes in more than one place

**What happens:** A new page is added but the required-route list, invalidation list and navigation drift apart.
**Why it's wrong:** `scripts/check-built-routes.ts` will not guard the page, and `scripts/deploy-site.sh` will serve a stale cached copy.
**Do this instead:** Update `src/lib/navigation.ts`, `scripts/check-built-routes.ts` and the invalidation paths in `scripts/deploy-site.sh` together.

### Test fixtures in the production build

**What happens:** Fixture data is referenced without gating on `STAGEHAND_E2E_FIXTURES`.
**Why it's wrong:** Fabricated compatibility rows would appear on the public site; `scripts/check-e2e-build-isolation.ts` fails the build.
**Do this instead:** Gate fixture paths exactly as `src/lib/data/compatibility.ts` does and let `outDir` switch to `.e2e-dist/`.

### Bespoke CSS outside the token system

**What happens:** Colours and spacing are written inline instead of using `src/styles/_tokens.scss`.
**Why it's wrong:** Breaks the Bootstrap variable overrides and the accessibility contrast guarantees covered by `tests/e2e/accessibility.spec.ts`.
**Do this instead:** Add a component partial under `src/styles/components/` and import it from `src/styles/global.scss`.

## Error Handling

**Strategy:** Fail loudly at build time. Loaders and scripts throw `Error` with a message naming the record ID and source file; there is no fallback or silent default.

**Patterns:**
- Data loaders throw with `Invalid <label> data in <path>: <ajv errors>` (`src/lib/data/load-yaml.ts`).
- Build gate scripts throw with a bulleted list of failures (`scripts/check-built-routes.ts`, `scripts/check-links.ts`).
- Shell scripts use `set -eu` and validate every environment variable before touching AWS (`scripts/deploy-site.sh`).
- Runtime UI degrades gracefully only for the legitimate empty case (`CompatibilityEmptyState.astro`).

## Cross-Cutting Concerns

**Logging:** `console.log` progress lines in build scripts only; no logging framework and no client-side logging.
**Validation:** AJV 2020 strict mode against JSON Schemas in `src/data/schema/`, plus Zod frontmatter validation in `src/content.config.ts`, plus imperative invariants in the loaders.
**Authentication:** None in the site. Deployment authenticates via GitHub OIDC into the IAM role defined in `infra/modules/static-site/iam.tf`; S3 is private and reachable only through CloudFront OAC.
**Accessibility:** Skip link and landmarks in `BaseLayout.astro`, audited by `@axe-core/playwright` in `tests/e2e/accessibility.spec.ts`.

---

*Architecture analysis: 2026-08-26*
