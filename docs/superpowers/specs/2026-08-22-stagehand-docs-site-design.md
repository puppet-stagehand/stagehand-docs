# Puppet Stagehand website and documentation design

**Date:** 2026-08-22

**Status:** Approved for implementation planning

**Repository:** `puppet-stagehand/stagehand-docs`

## Purpose

Create the public website and documentation home for Puppet Stagehand. The
site must explain the product clearly, publish an auditable Puppet-version and
tier compatibility matrix, and give customers a stable documentation surface.
GitHub is the source of truth and review workflow. AWS serves the generated
static site; no application server is required.

## Success criteria

- `www.puppetstagehand.com` serves a fast, responsive, accessible static site.
- Product tiers and compatibility claims are customer-facing and generated
  from schema-validated structured data.
- Pull requests run build, content, link, accessibility, and OpenTofu checks.
- Merges deploy through short-lived GitHub OIDC credentials; no long-lived AWS
  access keys are stored in GitHub.
- `testpilots`, `beta`, and `stable` are isolated deployment environments.
- Every taggable OpenTofu-managed resource has `project = "stagehand"` and
  every environment-owned resource also has its environment tag.

## Chosen approach

Use Astro in static-output mode with Bootstrap 5 imported through Sass and
trimmed to the components the site uses. Astro provides typed content
collections, Markdown/MDX documentation, reusable view components, and static
HTML without shipping a client application runtime.

Alternatives rejected:

- Eleventy plus Bootstrap has a smaller conceptual surface but weaker typed
  content validation and component ergonomics for the compatibility matrix.
- Astro Starlight provides an excellent documentation shell but would make the
  marketing and tier pages look like a separate product from the docs.
- GitHub Pages would keep deployment simple but is a poorer fit for a primary
  commercial product website and gives less control over caching and AWS
  security policy.

## Site architecture

The repository contains one deployable site:

```text
stagehand-docs/
├── src/
│   ├── components/          reusable Astro components
│   ├── content/docs/        version-controlled Markdown documentation
│   ├── data/                tiers and compatibility source data
│   ├── layouts/             marketing and documentation shells
│   ├── pages/               routes
│   └── styles/              Bootstrap overrides and Stagehand tokens
├── public/                  static brand assets and machine-readable files
├── scripts/                 content and compatibility validators
├── tests/                   browser and content tests
├── infra/                   OpenTofu modules and environment roots
└── .github/workflows/       validation and deployment
```

Initial routes:

- `/` — product positioning, principal capabilities, and clear tier paths.
- `/tiers/` — OpenVox, Puppet Core, Puppet Enterprise, and PE Advanced
  comparison with entitlement explanations.
- `/compatibility/` — filterable, accessible compatibility matrix.
- `/docs/` — documentation landing page.
- `/docs/getting-started/` — installation and first-run entry point.
- `/docs/security/` — credentials, transports, and trust model overview.
- `/support/` — lifecycle, support boundary, and issue-reporting links.

The initial scaffold includes representative content for every route. Bulk
migration from `puppet-console/docs` is a later reviewed content project and is
not part of the scaffold.

## Content model

Compatibility claims live in `src/data/compatibility.yaml` and conform to a
checked-in JSON Schema. Each record contains:

- Puppet platform and exact supported version expression
- minimum and maximum Stagehand version expression
- product tier
- execution provider and transport
- operating-system scope
- support status
- limitations and documentation links
- `last_verified` date

Allowed support states are `supported`, `compatible`, `limited`, `deprecated`,
and `unsupported`. The UI always renders the textual state and an icon; color
is supplementary. CI rejects missing fields, unknown states, invalid dates,
duplicate records, and internal links that do not resolve.

Tier definitions live in `src/data/tiers.yaml`. Compatibility and tier data
are the single source for both rendered pages and downloadable JSON under
`/data/`, avoiding a second hand-maintained API representation.

## Visual design

The direction is an industrial editorial control room: deep navy fields,
precise grid lines, cyan operational accents, Puppet purple brand moments, and
high-density technical information balanced with generous whitespace. The
compatibility matrix should feel like an instrument panel, not a generic
pricing table.

- IBM Plex Sans is the primary face and IBM Plex Mono is used for versions,
  commands, and identifiers. Font files are bundled with the build.
- Gibson is not used because the existing project records its embedding
  license as unresolved.
- The approved registered Puppet mark is reused without recoloring, rotation,
  or distortion.
- Bootstrap supplies layout primitives, navigation, tables, badges,
  accordions, and utilities. Stagehand Sass variables and focused component
  CSS replace Bootstrap's default visual identity.
- Motion is restrained and honors `prefers-reduced-motion`.
- The matrix becomes stacked comparison cards on narrow screens rather than a
  horizontally unusable table.

The target is WCAG 2.1 AA, including keyboard navigation, visible focus,
semantic landmarks, heading order, table captions/headers, and non-color status
cues.

## AWS infrastructure

OpenTofu provisions a reusable static-site module once per environment:

- private, versioned S3 content bucket with public access blocked
- CloudFront distribution using Origin Access Control
- ACM certificate and validation records
- Route 53 aliases
- response-headers policy with baseline security headers
- optional CloudFront Function for canonical-host and clean-path redirects
- least-privilege GitHub deployment IAM role

Environment mapping:

| Environment | Canonical host | Purpose |
|---|---|---|
| `testpilots` | `testpilots.puppetstagehand.com` | integration and internal review |
| `beta` | `beta.puppetstagehand.com` | customer preview |
| `stable` | `www.puppetstagehand.com` | production |

The stable distribution redirects `puppetstagehand.com` to
`www.puppetstagehand.com`. Each environment has a separate S3 bucket,
CloudFront distribution, certificate, deployment role, and OpenTofu state.

### Resource tags

The shared module merges mandatory tags centrally:

```hcl
locals {
  required_tags = {
    project     = "stagehand"
    environment = var.environment
  }
}
```

`var.environment` accepts only `testpilots`, `beta`, or `stable`. Every
taggable environment resource receives both mandatory tags. Account-global
resources that are genuinely shared, such as a single GitHub OIDC provider,
receive `project = "stagehand"` and no fabricated environment tag.

OpenTofu state uses a private, versioned S3 state bucket per environment with
native S3 lockfiles. Bootstrap configuration is kept under `infra/bootstrap/`;
the application stack cannot create or modify its own state bucket.

## GitHub and deployment flow

The repository is public. Branch protection requires the validation workflow
before merge. Six GitHub Environments exist: three apply Environments named
`testpilots`, `beta`, and `stable`, restricted to `main`; and three `-plan`
Environments (`testpilots-plan`, `beta-plan`, `stable-plan`), restricted to
the pull-request merge-ref branch rule, carrying only the plan role ARN.
Environment protection rules control who may deploy beta and stable. See
`docs/adr/0002-github-environment-model.md` for the full reviewer and
variable rules.

Pull requests run:

1. dependency installation with a frozen lockfile
2. formatting, linting, and Astro type checks
3. compatibility-schema and link validation
4. unit tests and production build
5. browser accessibility and responsive smoke tests
6. `tofu fmt -check`, `tofu init -backend=false`, `tofu validate`, and policy
   tests asserting mandatory tags

Deployment is promotion-oriented:

- merge to `main` automatically deploys `testpilots`
- an explicit workflow dispatch promotes the same Git commit to `beta`
- a second protected promotion deploys that commit to `stable`

GitHub Actions requests a short-lived OIDC token and assumes only the selected
environment's deployment role. The role may list and update its one content
bucket and invalidate its one CloudFront distribution. It cannot modify
infrastructure or assume another environment's role.

The deployment syncs hashed assets with a one-year immutable cache policy and
HTML/data files with revalidation-friendly cache headers. It invalidates only
HTML, compatibility data, and redirects affected by the release rather than
flushing all immutable assets.

Infrastructure changes use a separate workflow: pull requests publish an
OpenTofu plan, while apply requires the matching protected GitHub Environment.

## Failure behavior and recovery

- A failed validation or build never uploads content.
- Uploads finish before CloudFront invalidation, so the CDN never points at a
  partially built local directory.
- S3 versioning preserves the previous objects. A rollback redeploys the last
  known-good Git commit; direct console edits are not part of recovery.
- Deployment concurrency is one per environment, canceling an obsolete queued
  deployment but never interrupting an upload already applying.
- Compatibility-data validation fails closed: invalid claims prevent the site
  build rather than disappearing silently.
- OpenTofu plans are review artifacts, and applies use state locking to prevent
  concurrent infrastructure mutation.

## Security and privacy

- The S3 origin remains private and accessible only through CloudFront OAC.
- No AWS access keys, customer credentials, Forge tokens, or analytics secrets
  are committed or embedded in the static output.
- The GitHub OIDC trust policy is restricted to this repository's immutable
  organization/repository identity claims and the selected GitHub Environment.
- Security headers include a restrictive Content Security Policy designed
  around self-hosted assets. Third-party scripts are absent from the scaffold.
- Analytics are intentionally deferred until a privacy and retention decision
  is made.
- Website forms, authentication, payments, and premium-content delivery are
  outside this static site's boundary.

## Testing strategy

- Schema/unit tests cover compatibility normalization, support-state labels,
  tier joins, and date rules.
- Astro build verification proves every intended route emits static HTML.
- Playwright smoke tests cover navigation, matrix filtering, narrow viewport
  rendering, missing-page behavior, and reduced-motion behavior.
- axe checks run against the home, tiers, compatibility, and docs pages.
- Link checking covers internal output and explicitly allowlisted external
  links.
- OpenTofu tests inspect planned resource values to prove environment isolation,
  mandatory tags, private S3 policy, OAC use, HTTPS redirect, and role scope.

## Non-goals for the scaffold

- Migrating all existing engineering documentation
- Customer login or runtime entitlement verification
- Ecommerce, subscriptions, or license delivery
- Server-side rendering or an application API
- Full-text search backed by a hosted service
- Analytics or behavioral tracking
- Automated compatibility claims inferred from upstream releases

## Delivery boundary

The scaffold is complete when the repository contains the working static site,
representative content and compatibility data, validation tests, GitHub Actions
workflows, OpenTofu modules/environment roots, and operator documentation for
first-time AWS bootstrap and deployment. Actual AWS apply and DNS cutover require
the target AWS account and are a separate authorized production operation.
