# Constraints

Extracted from SPEC-classified documents:

- docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md (design specification)
- docs/superpowers/plans/2026-08-22-stagehand-docs-site.md (implementation plan)
- docs/operations/compatibility-claims.md (compatibility claims policy)

Where a locked ADR amends or overrides a constraint below, the override is recorded inline.
See `decisions.md` and `../INGEST-CONFLICTS.md`.

---

## Success criteria
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: nfr
- content: `www.puppetstagehand.com` serves a fast, responsive, accessible static site. Product tiers and compatibility claims are customer-facing and generated from schema-validated structured data. Pull requests run build, content, link, accessibility, and OpenTofu checks. Merges deploy through short-lived GitHub OIDC credentials; no long-lived AWS access keys are stored in GitHub. `testpilots`, `beta`, and `stable` are isolated deployment environments. Every taggable OpenTofu-managed resource has `project = "stagehand"` and every environment-owned resource also has its environment tag.
- override: ADR-0001 (locked) governs the "compatibility claims are customer-facing" criterion — the published registry ships empty and the empty state is the supported customer-facing rendering.

## Chosen technology stack
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: nfr
- content: Astro in static-output mode with Bootstrap 5 imported through Sass and trimmed to the components the site uses. Astro provides typed content collections, Markdown/MDX documentation, reusable view components, and static HTML without shipping a client application runtime. Rejected: Eleventy plus Bootstrap (weaker typed content validation), Astro Starlight (would make marketing and tier pages look like a separate product), GitHub Pages (poorer fit for a primary commercial product website, less control over caching and AWS security policy).

## Pinned toolchain and dependency versions
- source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
- type: nfr
- content: Node.js 24, npm 11, Astro 7.2.4, TypeScript 7.0.2, Bootstrap 5.3.8, Sass 1.103.1, Fontsource IBM Plex 5.3.0, YAML 2.9.0, Ajv 8.20.0, Vitest 4.1.11, Playwright 1.62.1, axe-core, OpenTofu 1.12.6, AWS, and GitHub Actions. `engines` requires node `>=24 <25` and npm `>=11 <12`; `.npmrc` sets `engine-strict=true`.

## Repository layout
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: schema
- content: One deployable site. `src/components/` reusable Astro components; `src/content/docs/` version-controlled Markdown documentation; `src/data/` tiers and compatibility source data; `src/layouts/` marketing and documentation shells; `src/pages/` routes; `src/styles/` Bootstrap overrides and Stagehand tokens; `public/` static brand assets and machine-readable files; `scripts/` content and compatibility validators; `tests/` browser and content tests; `infra/` OpenTofu modules and environment roots; `.github/workflows/` validation and deployment.

## Initial route surface
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: api-contract
- content: `/` product positioning, principal capabilities, and clear tier paths; `/tiers/` OpenVox, Puppet Core, Puppet Enterprise, and PE Advanced comparison with entitlement explanations; `/compatibility/` filterable, accessible compatibility matrix; `/docs/` documentation landing page; `/docs/getting-started/` installation and first-run entry point; `/docs/security/` credentials, transports, and trust model overview; `/support/` lifecycle, support boundary, and issue-reporting links. Astro config sets `output: 'static'`, `site: 'https://www.puppetstagehand.com'`, `trailingSlash: 'always'`, `build.format: 'directory'`.

## Compatibility record content model
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: schema
- content: Compatibility claims live in `src/data/compatibility.yaml` and conform to a checked-in JSON Schema. Each record contains Puppet platform and exact supported version expression; minimum and maximum Stagehand version expression; product tier; execution provider and transport; operating-system scope; support status; limitations and documentation links; `last_verified` date. Allowed support states are `supported`, `compatible`, `limited`, `deprecated`, and `unsupported`. The UI always renders the textual state and an icon; color is supplementary. CI rejects missing fields, unknown states, invalid dates, duplicate records, and internal links that do not resolve. Tier definitions live in `src/data/tiers.yaml`. Compatibility and tier data are the single source for both rendered pages and downloadable JSON under `/data/`.

## Data loader contract
- source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
- type: api-contract
- content: `loadTiers(): Tier[]` reads and validates `src/data/tiers.yaml`. `loadCompatibility(): CompatibilityRecord[]` reads, validates, normalizes, rejects duplicates, and sorts `src/data/compatibility.yaml`. `SupportStatus` is exactly `supported | compatible | limited | deprecated | unsupported`. Every compatibility record joins to one tier and provides an HTTPS `evidence_url` plus an ISO `last_verified` date. Production validation rejects verification dates more than 365 days old; unit tests may inject `today`. Duplicate identity keys throw `Duplicate compatibility record`; stale records throw `Compatibility evidence is older than 365 days`; an unknown tier throws `Unknown tier`.

## JSON data endpoints
- source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
- type: api-contract
- content: `/data/tiers.json` and `/data/compatibility.json` serialize `{ schema_version: 1, generated_at: null, records: Tier[] | CompatibilityRecord[] }`; `generated_at` remains `null` to keep builds reproducible. `/tiers/` renders all tiers from `loadTiers()`. `/compatibility/` renders all records from `loadCompatibility()` or a truthful empty state. Compatibility filters operate on semantic `<select>` elements and preserve a visible result count. `statusPresentation(status)` returns the status label and icon name for non-color identification.

## Documentation content collection contract
- source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
- type: schema
- content: Astro content collection `docs` consumes Markdown with `title`, `description`, `order`, and optional `updated` frontmatter. `/docs/` lists documentation entries in `order` order. `/docs/getting-started/`, `/docs/security/`, and `/support/` are generated as static HTML. The docs layout provides local navigation and one H1 derived from frontmatter. Collection slugs include `getting-started` and `security`; both have non-empty descriptions and unique order values.

## Compatibility claim evidence requirement
- source: docs/operations/compatibility-claims.md
- type: protocol
- content: Every compatibility record must link at least one primary source appropriate to the claim: primary vendor documentation that explicitly covers the claimed versions and behavior; reproducible test evidence showing the exact version, platform, provider, transport, and result; or a Stagehand release artifact whose notes and verification evidence cover the claim. Do not use marketing copy, an unsourced community statement, or a search result as the sole evidence. Narrow the claim when evidence covers only part of a version range or operating-system set. Put known qualifications in `limitations`; do not hide them in prose elsewhere.

## Compatibility freshness rule
- source: docs/operations/compatibility-claims.md
- type: protocol
- content: Set `last_verified` to the calendar date on which the cited evidence was actually reviewed or the test was actually run. A record is fresh for 365 days. On day 366 it is stale and must be re-verified against evidence with a truthful new `last_verified` date, or removed. Changing status, scope, or version range does not refresh evidence. Editing the date without reviewing evidence is not verification.

## Compatibility pull-request checklist
- source: docs/operations/compatibility-claims.md
- type: protocol
- content: (1) Update the compatibility record and its stable, unique ID. (2) Match the Puppet and Stagehand version ranges, tier, provider, transport, operating systems, status, limitations, and documentation route to the evidence. (3) Use an HTTPS evidence URL to primary vendor documentation, test evidence, or a Stagehand release artifact. (4) Update `last_verified` to the evidence review or test date. (5) Run `npm run validate:data`, then `npm run verify`. (6) Explain the evidence and claim boundary in the pull request. (7) Obtain CODEOWNER approval for the data or schema change.

## Compatibility validation enforcement and schema-change policy
- source: docs/operations/compatibility-claims.md
- type: protocol
- content: Data validation enforces shape, allowed enums, unique IDs and claim tuples, ordering, evidence URL policy, future dates, and the 365-day freshness boundary. Passing validation confirms the record is internally consistent; it does not replace a human review of whether the source supports the claim. Schema changes require the same evidence review plus an explanation of migration and customer rendering impact. Never weaken validation only to make an unsupported record pass.

## Compatibility registry initial state
- source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
- type: schema
- content: Task 3 seeds tiers and an intentionally empty compatibility claim list; `src/data/compatibility.yaml` holds `schema_version: 1` and `records: []`. Global constraint: treat `src/data/compatibility.yaml` as a customer claim registry — every claim must include a primary evidence URL and `last_verified`; absence of approved claims renders an honest empty state. Never infer current compatibility from an upstream version number; a maintainer must intentionally add or revise the record.
- confirmed by: ADR-0001 (locked), rules 1 and 3

## Visual design and typography
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: nfr
- content: Industrial editorial control room direction: deep navy fields, precise grid lines, cyan operational accents, Puppet purple brand moments, high-density technical information balanced with generous whitespace. The compatibility matrix should feel like an instrument panel, not a generic pricing table. IBM Plex Sans is the primary face; IBM Plex Mono is used for versions, commands, and identifiers; font files are bundled with the build. Gibson is not used because the existing project records its embedding license as unresolved. The approved registered Puppet mark is reused without recoloring, rotation, or distortion. Bootstrap supplies layout primitives, navigation, tables, badges, accordions, and utilities; Stagehand Sass variables and focused component CSS replace Bootstrap's default visual identity. Motion is restrained and honors `prefers-reduced-motion`. The matrix becomes stacked comparison cards on narrow screens rather than a horizontally unusable table.
- reinforced by (plan global constraints): do not copy Gibson font files into this repository; self-host IBM Plex through the pinned, focused Fontsource packages. Use the registered Puppet mark only when an approved asset is supplied; until then render the text wordmark `Puppet Stagehand`; never invent or redraw the mark.

## Accessibility target
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: nfr
- content: WCAG 2.1 AA, including keyboard navigation, visible focus, semantic landmarks, heading order, table captions/headers, and non-color status cues. Axe must report zero serious or critical violations on `/`, `/tiers/`, `/compatibility/`, and `/docs/`.

## Static-only site boundary
- source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
- type: nfr
- content: Keep the site fully static. Do not add SSR, a database, customer authentication, payment handling, analytics, or third-party runtime JavaScript.

## AWS static-site module composition
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: protocol
- content: OpenTofu provisions a reusable static-site module once per environment: private, versioned S3 content bucket with public access blocked; CloudFront distribution using Origin Access Control; ACM certificate and validation records; Route 53 aliases; response-headers policy with baseline security headers; optional CloudFront Function for canonical-host and clean-path redirects; least-privilege GitHub deployment IAM role. Each environment has a separate S3 bucket, CloudFront distribution, certificate, deployment role, and OpenTofu state.

## Static-site module interface
- source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
- type: api-contract
- content: Module inputs: `environment`, `domain_name`, `alternate_domain_names`, `hosted_zone_id`, `github_repository`, `github_oidc_provider_arn`, and `enable_redirect_function`. Module outputs: `content_bucket_name`, `distribution_id`, `distribution_domain_name`, `deployment_role_arn`, and `certificate_arn`. Module-local `required_tags` is the authoritative source of mandatory environment tags; root provider defaults provide a second guardrail. The environment variable rejects any value outside the exact three-value enum.

## OpenTofu environment enum and host mapping
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: schema
- content: `var.environment` accepts only `testpilots`, `beta`, or `stable`. Environment mapping: `testpilots` -> `testpilots.puppetstagehand.com` (integration and internal review); `beta` -> `beta.puppetstagehand.com` (customer preview); `stable` -> `www.puppetstagehand.com` (production). The stable distribution redirects `puppetstagehand.com` to `www.puppetstagehand.com`.
- override: ADR-0002 (locked) rule 2 scopes this three-value enum to `var.environment` and the `environment` tag only. It does not bind the GitHub Environment namespace, where six Environments exist.

## Mandatory resource tags
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: schema
- content: The shared module merges mandatory tags centrally via `locals.required_tags = { project = "stagehand", environment = var.environment }`. Every taggable environment resource receives both mandatory tags. Account-global resources that are genuinely shared, such as a single GitHub OIDC provider, receive `project = "stagehand"` and no fabricated environment tag. Plan global constraint adds: environment provider `default_tags` repeat the same values as defense-in-depth.

## OpenTofu state and bootstrap boundary
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: protocol
- content: OpenTofu state uses a private, versioned S3 state bucket per environment with native S3 lockfiles. Bootstrap configuration is kept under `infra/bootstrap/`; the application stack cannot create or modify its own state bucket. Plan Task 8 adds: each environment root calls the module once and uses its own S3 backend key; bootstrap creates three private, versioned state buckets with native lockfile support and one shared GitHub OIDC provider; shared resources use `project = "stagehand"` while environment state buckets use both mandatory tags; no backend or account identifier is hard-coded into reusable module code.
- extended by: ADR-0003 (locked) rule 1 — `infra/bootstrap/` additionally becomes the owner of the six infrastructure plan and apply IAM roles, with their ARNs exposed as bootstrap outputs.

## Pull-request validation gates
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: protocol
- content: Pull requests run (1) dependency installation with a frozen lockfile; (2) formatting, linting, and Astro type checks; (3) compatibility-schema and link validation; (4) unit tests and production build; (5) browser accessibility and responsive smoke tests; (6) `tofu fmt -check`, `tofu init -backend=false`, `tofu validate`, and policy tests asserting mandatory tags. Branch protection requires the validation workflow before merge.

## Quality gate script contract
- source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
- type: api-contract
- content: `npm run test:e2e` builds and serves `dist/`, then runs Chromium tests. `npm run test:a11y` runs axe against home, tiers, compatibility, and docs. `npm run check:links` checks generated internal links and fails on broken references. `npm run lint` checks TypeScript, Astro, and Sass sources. `npm run build` writes the static site to `dist/`. `npm run check` performs Astro and TypeScript validation. Browser coverage: navigation to every initial route, empty compatibility state, keyboard activation of the mobile menu, 320x720 and 1280x800 viewports, no horizontal overflow, visible focus, 404 content, and `prefers-reduced-motion: reduce`.

## Deployment promotion flow
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: protocol
- content: Deployment is promotion-oriented: merge to `main` automatically deploys `testpilots`; an explicit workflow dispatch promotes the same Git commit to `beta`; a second protected promotion deploys that commit to `stable`. GitHub Actions requests a short-lived OIDC token and assumes only the selected environment's deployment role. The role may list and update its one content bucket and invalidate its one CloudFront distribution. It cannot modify infrastructure or assume another environment's role. Infrastructure changes use a separate workflow: pull requests publish an OpenTofu plan, while apply requires the matching protected GitHub Environment.

## GitHub Environment naming (design specification)
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: protocol
- content: "The repository is public. Branch protection requires the validation workflow before merge. GitHub Environments are named `testpilots`, `beta`, and `stable`. Environment protection rules control who may deploy beta and stable."
- override: ADR-0002 (locked) rule 3 supersedes this enumeration. Six GitHub Environments exist: three apply Environments (`testpilots`, `beta`, `stable`) and three plan Environments (`testpilots-plan`, `beta-plan`, `stable-plan`). The design specification text remains unedited; see `../INGEST-CONFLICTS.md` INFO entries.

## Workflow contract
- source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
- type: api-contract
- content: `validate.yml` runs on pull requests and pushes to `main` with read-only permissions. `deploy.yml` automatically deploys `main` to `testpilots` and manually promotes an explicit Git SHA to `beta` or `stable`. `infrastructure.yml` plans on pull requests and applies only through a selected protected GitHub Environment. Deployment jobs use GitHub OIDC and environment-scoped variables; no AWS keys are accepted. Promotion rejects a ref not reachable from `origin/main`, an uncommitted working tree, and an environment outside the three-value enum.

## Cache-control policy
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: protocol
- content: The deployment syncs hashed assets with a one-year immutable cache policy and HTML/data files with revalidation-friendly cache headers. It invalidates only HTML, compatibility data, and redirects affected by the release rather than flushing all immutable assets. Plan Task 9 specifies exact values: `assets/*` receives `public,max-age=31536000,immutable`; HTML and JSON receive `public,max-age=0,must-revalidate`.

## Failure behavior and recovery
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: nfr
- content: A failed validation or build never uploads content. Uploads finish before CloudFront invalidation, so the CDN never points at a partially built local directory. S3 versioning preserves the previous objects; a rollback redeploys the last known-good Git commit and direct console edits are not part of recovery. Deployment concurrency is one per environment, canceling an obsolete queued deployment but never interrupting an upload already applying. Compatibility-data validation fails closed: invalid claims prevent the site build rather than disappearing silently. OpenTofu plans are review artifacts, and applies use state locking to prevent concurrent infrastructure mutation.

## Security and privacy constraints
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: nfr
- content: The S3 origin remains private and accessible only through CloudFront OAC. No AWS access keys, customer credentials, Forge tokens, or analytics secrets are committed or embedded in the static output. The GitHub OIDC trust policy is restricted to this repository's immutable organization/repository identity claims and the selected GitHub Environment. Security headers include a restrictive Content Security Policy designed around self-hosted assets; third-party scripts are absent from the scaffold. Analytics are intentionally deferred until a privacy and retention decision is made. Website forms, authentication, payments, and premium-content delivery are outside this static site's boundary.

## Testing strategy
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: nfr
- content: Schema/unit tests cover compatibility normalization, support-state labels, tier joins, and date rules. Astro build verification proves every intended route emits static HTML. Playwright smoke tests cover navigation, matrix filtering, narrow viewport rendering, missing-page behavior, and reduced-motion behavior. Axe checks run against the home, tiers, compatibility, and docs pages. Link checking covers internal output and explicitly allowlisted external links. OpenTofu tests inspect planned resource values to prove environment isolation, mandatory tags, private S3 policy, OAC use, HTTPS redirect, and role scope.

## Development process constraints
- source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
- type: protocol
- content: Use test-driven development: add a failing test, observe the intended failure, implement the smallest change, rerun the focused test, then run the relevant broader check. Use one commit per task unless the task explicitly includes two commits.

## Non-goals for the scaffold
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: nfr
- content: Migrating all existing engineering documentation; customer login or runtime entitlement verification; ecommerce, subscriptions, or license delivery; server-side rendering or an application API; full-text search backed by a hosted service; analytics or behavioral tracking; automated compatibility claims inferred from upstream releases. Bulk migration from `puppet-console/docs` is a later reviewed content project and is not part of the scaffold.

## Scaffold delivery boundary
- source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
- type: nfr
- content: The scaffold is complete when the repository contains the working static site, representative content and compatibility data, validation tests, GitHub Actions workflows, OpenTofu modules/environment roots, and operator documentation for first-time AWS bootstrap and deployment. Actual AWS apply and DNS cutover require the target AWS account and are a separate authorized production operation. The initial scaffold includes representative content for every route.
- override: ADR-0001 (locked) amends this boundary — "representative compatibility data" means representative fixture data exercised by the test suite, together with a rendered empty state on the published site. It does not mean seeded customer-facing records.

## Release-candidate verification gate
- source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
- type: protocol
- content: Task 11 produces a clean, pushed `main` branch ready for GitHub Environment and AWS account configuration; it does not create cloud resources or change DNS; it records exact verification commands and results in the pull request or release handoff. Verification runs from a clean `npm ci`, then `npm run verify`, then full OpenTofu verification (`tofu fmt -check -recursive infra`, bootstrap and module `init -backend=false` plus `validate`, module `test`, per-environment `validate`, and `./scripts/check-tofu-tags.sh`), then a generated-output scan for third-party runtime scripts, AWS credentials, Gibson references, and analytics integrations.

## Operations documentation contract
- source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
- type: protocol
- content: `README.md` gets a new contributor from clone to verified local build. `docs/operations/aws-bootstrap.md` explains one-time bootstrap and per-environment apply without embedding account values. `docs/operations/github-environments.md` specifies exact variables, permissions, and protection rules. `docs/operations/release.md` specifies testpilots-to-beta-to-stable promotion and rollback. `docs/operations/compatibility-claims.md` defines evidence review and the 365-day freshness rule.
