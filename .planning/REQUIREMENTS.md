# Requirements: Puppet Stagehand documentation site

**Defined:** 2026-08-26
**Core Value:** A reader can trust every compatibility claim on the site, because no claim is
published unless a maintainer reviewed primary evidence for it and dated that review honestly.

## Derivation note

`.planning/intel/requirements.md` is intentionally empty — zero PRD-class documents were ingested.
Every requirement below traces to a locked ADR (`intel/decisions.md`), a SPEC-derived constraint
(`intel/constraints.md`), an operator runbook carried in `intel/context.md`, the user-supplied
milestone scope, or a fact verified directly in the working tree on 2026-08-26. The **Source**
column on each requirement names that trace. Nothing here is invented.

This is a **forward-looking milestone**. The scaffold is the shipped baseline and is not
re-specified; see PROJECT.md → Requirements → Validated for what already exists.

## v1 Requirements

### Infrastructure role ownership (INFRA)

Closes ADR-0003 rule 5's explicit deferral. Currently `infra/bootstrap/` declares only the state
buckets and the shared OIDC provider — no IAM roles at all.

- [x] **INFRA-01**: `infra/bootstrap/` declares six IAM roles — a plan role and an apply role for
      each of `testpilots`, `beta`, and `stable` — each trusting only the repository
      `puppet-stagehand/stagehand-docs` and exactly one GitHub Environment subject with `aud` equal
      to `sts.amazonaws.com`. Plan roles trust the `-plan` subjects; apply roles trust the
      unsuffixed subjects. No trust policy contains a wildcard Environment name.
      *Source: ADR-0003 rules 1–2 (LOCKED)*

- [x] **INFRA-02**: Each plan role grants only state read, state-lock acquire and release, refresh,
      and `Get`/`List`/`Describe` operations, scoped to its own state bucket and state key including
      only the lock-object writes and deletes OpenTofu requires. It cannot create, mutate, or delete
      site resources.
      *Source: ADR-0003 rule 3 (LOCKED); `docs/operations/github-environments.md` permission scoping*

- [x] **INFRA-03**: Each apply role grants its matching plan role's state access plus the minimum
      create, update, tag, and delete actions the reviewed static-site module requires, scoped by
      known ARNs, hosted zone, resource-name prefixes, and the mandatory `project = "stagehand"` and
      matching `environment` tag conditions where AWS supports them. No role is shared across
      environments.
      *Source: ADR-0003 rule 3 (LOCKED); `docs/operations/github-environments.md`*

- [x] **INFRA-04**: `infra/bootstrap/outputs.tf` exposes the six role ARNs alongside the existing
      `github_oidc_provider_arn` and `state_bucket_names` outputs, so an administrator can read them
      straight out of the apply.
      *Source: ADR-0003 rule 1 (LOCKED)*

- [x] **INFRA-05**: `docs/operations/aws-bootstrap.md` and `docs/operations/github-environments.md`
      describe the OpenTofu-owned role path in place of the manual provisioning instruction, and
      still state that bootstrap is applied by a human under CODEOWNERS review on `/infra/` plus a
      second administrator's review of the trust and permission policies.
      *Source: ADR-0003 rules 4–5 (LOCKED); operations documentation contract*

- [x] **INFRA-06**: Bootstrap resources carry their mandatory tags through a shared `required_tags`
      local rather than ad-hoc literals — genuinely shared account-global resources carry
      `project = "stagehand"` with no fabricated environment tag, per-environment state buckets carry
      both — and `./scripts/check-tofu-tags.sh` covers the bootstrap root.
      *Source: mandatory resource tags constraint; verified: `infra/bootstrap/main.tf` uses inline literals*

### Publication pipeline (PUB)

Retires the highest-value debt in the repository: the deploy job reports green while publishing
nothing, and no AWS resource has ever been created.

- [x] **PUB-01**: An authorized administrator has applied `infra/bootstrap/` from a reviewed saved
      plan, captured `github_oidc_provider_arn`, `state_bucket_names`, and the six role ARNs,
      deleted the saved plan immediately, and placed the bootstrap state in the approved
      encrypted, access-controlled, versioned custody location with one named accountable owner.
      *Source: `docs/operations/aws-bootstrap.md`; ADR-0003 rule 4*

- [x] **PUB-02**: All six GitHub Environments exist with the branch policies, reviewer rules, and
      exact variable sets specified — apply Environments restricted to `main` with reviewers
      required on `beta` and `stable` and self-review prevented on `stable`; plan Environments
      restricted to `refs/pull/*/merge` with a trusted reviewer and self-review prevented. No plan
      Environment holds an apply or deploy role ARN, and no AWS access-key secret exists.
      *Source: ADR-0002 rule 3 (LOCKED); `docs/operations/github-environments.md`*

- [x] **PUB-03**: The `testpilots` environment root is applied and its `content_bucket_name`,
      `distribution_id`, and `deployment_role_arn` outputs are set as `CONTENT_BUCKET`,
      `CLOUDFRONT_DISTRIBUTION_ID`, and `AWS_DEPLOY_ROLE_ARN` in the matching Environment, with no
      output copied between environments.
      *Source: `docs/operations/aws-bootstrap.md`; static-site module interface*

- [x] **PUB-04**: A merge to `main` runs `Deploy site` through to an *executed* `Upload site` step —
      `assets/*` synced at `public,max-age=31536000,immutable`, HTML and JSON at
      `public,max-age=0,must-revalidate`, upload completing before CloudFront invalidation, and no
      upload occurring if validation or build fails.
      *Source: cache-control policy; failure behavior and recovery constraints*

- [x] **PUB-05**: `testpilots.puppetstagehand.com` resolves over HTTPS and serves every initial
      route (`/`, `/tiers/`, `/compatibility/`, `/docs/`, `/docs/getting-started/`,
      `/docs/security/`, `/support/`), both JSON data endpoints, and the branded 404.
      *Source: initial route surface constraint; `docs/operations/release.md` verification checks*

- [x] **PUB-06**: The `Infrastructure` workflow's plan job runs for real on a same-repository pull
      request touching `infra/**`, producing a value-free plan summary through a plan Environment,
      with the job-level same-repository guard still running before the Environment is attached and
      no binary plan uploaded.
      *Source: workflow contract; ADR-0002 rule 4 (LOCKED); `docs/operations/github-environments.md`*

- [x] **PUB-07**: No AWS account identifier, credential, state file, saved plan, `terraform.tfvars`,
      or `backend.hcl` value is committed at any point during the apply work.
      *Source: `docs/operations/aws-bootstrap.md`; security and privacy constraints*
      *Verified 2026-08-26 via `git log --all` sweep: no credential, `.tfstate`, `.tfvars`,
      `backend.hcl`, or AKIA-format access key found anywhere in history. **Known, accepted
      deviation:** the AWS account ID (503561411317) appears in several phase `SUMMARY.md` files
      as ARN citations (evidence for real-apply verification), committed before this sweep caught
      it. Account IDs are not secret credentials — they're routinely public in cross-account ARN
      references — so this was judged low-risk and accepted rather than rewriting already-pushed
      git history. Redact account IDs from any SUMMARY.md written after this point.*

### Site content (CONT)

The site currently ships 70 lines of documentation across two files and placeholder-grade marketing
copy. A "documentation site" needs documentation.

- [x] **CONT-01**: `/` presents product positioning, principal capabilities, and clear tier paths in
      customer-ready copy rather than scaffold placeholders.
      *Source: initial route surface constraint*

- [x] **CONT-02**: `/tiers/` explains what OpenVox, Puppet Core, Puppet Enterprise, and PE Advanced
      each entitle a customer to, rendered from `loadTiers()` so the page and `/data/tiers.json`
      cannot disagree.
      *Source: initial route surface; JSON data endpoints constraint*

- [x] **CONT-03**: `/support/` states the product lifecycle, the support boundary, and where to
      report issues — public tracker for documentation defects, private advisory or commercial
      channel for anything sensitive.
      *Source: initial route surface; `SECURITY.md` / `src/content/docs/security.md` reporting boundary*

- [x] **CONT-04**: `src/content/docs/` carries the documentation a first-time operator actually
      needs to install, first-run, and reason about the trust boundaries of Stagehand, each entry
      with `title`, `description`, a unique positive `order`, and an `updated` date, listed in
      `order` order on `/docs/`.
      *Source: documentation content collection contract*

- [x] **CONT-05**: Every added route and documentation entry is registered in
      `src/lib/navigation.ts`, `scripts/check-built-routes.ts`, and the invalidation list in
      `scripts/deploy-site.sh` within the same change.
      *Source: repository layout; cache-control policy; codebase architecture anti-pattern*

- [x] **CONT-06**: New content keeps the site's stated boundaries — it collects no credentials,
      asserts no entitlement, loads no third-party runtime script, adds no analytics, and never
      presents planned behaviour (such as premium PCP/orchestrator workflows) as shipped.
      *Source: static-only site boundary; security and privacy constraints; `src/content/docs/getting-started.md`*

- [x] **CONT-07**: With the expanded content in place, axe still reports zero serious or critical
      violations on `/`, `/tiers/`, `/compatibility/`, and `/docs/`, and keyboard navigation,
      visible focus, semantic landmarks, and heading order still hold.
      *Source: accessibility target constraint*

### Compatibility register (COMP)

The register is the site's primary value proposition and currently holds zero records. ADR-0001
governs what may be published; this milestone earns the first entries and unblocks the gates that
assume emptiness.

- [x] **COMP-01**: Each published record has completed the review in
      `docs/operations/compatibility-claims.md` — a primary-source HTTPS `evidence_url` (vendor
      documentation covering the claimed versions and behaviour, reproducible test evidence, or a
      Stagehand release artifact), `last_verified` set to the day the evidence was actually reviewed,
      claim scope narrowed to what the evidence covers, known qualifications recorded in
      `limitations`, and CODEOWNER approval.
      *Source: `docs/operations/compatibility-claims.md`; ADR-0001 rule 3 (LOCKED)*

- [x] **COMP-02**: `src/data/compatibility.yaml` publishes only records that pass that review. When
      no claim qualifies, the register stays empty and `/compatibility/` renders the empty state
      rather than a placeholder record. Fixture records from
      `tests/fixtures/data/compatibility-e2e.yaml` are never promoted into it.
      *Source: ADR-0001 rules 1, 2, 4 (LOCKED) — not re-openable*

- [x] **COMP-03**: The build-isolation guarantee is reworked from "the production register is empty"
      to "the production register contains no fixture-derived record", so a reviewed claim can ship
      without weakening evidence validation. Covers `scripts/check-e2e-build-isolation.ts`,
      `tests/e2e/production-empty.spec.ts`, `tests/unit/e2e-build-isolation.test.ts`, and
      `tests/fixtures/build-output/production/data/compatibility.json`.
      *Source: ADR-0001 rules 2–3 (LOCKED); verified 2026-08-26 — the isolation script throws unless
      `dist/data/compatibility.json` has exactly zero records, so the first real claim breaks `npm run verify`*

- [x] **COMP-04**: `/compatibility/` renders a populated matrix that stays filterable through
      semantic `<select>` elements with a visible result count, identifies every support status by
      text and icon rather than colour alone, and becomes stacked comparison cards on narrow screens
      instead of a horizontally unusable table.
      *Source: JSON data endpoints; visual design; accessibility target constraints*

- [x] **COMP-05**: `/data/compatibility.json` serves exactly the published records the rendered page
      shows, with `generated_at` still `null` so builds stay reproducible.
      *Source: JSON data endpoints constraint*

### Launch (LAUN)

- [x] **LAUN-01**: The `beta` environment is applied and the exact SHA already deployed successfully
      to testpilots is promoted to `beta.puppetstagehand.com` through its protected Environment,
      unaltered and un-cherry-picked.
      *Source: `docs/operations/release.md` release invariant; deployment promotion flow constraint*

- [x] **LAUN-02**: The `stable` environment is applied as a deliberate DNS cutover;
      `www.puppet-stagehand.com` serves the site and `puppet-stagehand.com` redirects to it without
      changing the path or the query string.
      *Source: OpenTofu environment enum and host mapping; `docs/operations/release.md`*
      *Domain changed mid-phase from `puppetstagehand.com` to `puppet-stagehand.com` — Cloudflare's
      registrar tier didn't support the custom nameservers Plan 05-08 was built around, so the
      maintainer registered the new domain directly through Route 53 Registrar instead (see
      `.planning/phases/05-production-launch/05-CONTEXT.md`'s addendum and
      `05-08-RESOLUTION.md`). **Reconciliation note (2026-08-27):** this checkbox was previously
      marked complete before any cutover had actually occurred — a documentation-tracking gap, not
      a claim 05-08 itself made (05-08 halted honestly, see `05-08-SUMMARY.md`). It is genuinely
      satisfied now: 2026-08-27 real public-internet verification (`dig +trace` NS delegation,
      `curl` against `www.puppet-stagehand.com` and `puppet-stagehand.com`) confirms the apex
      redirects to `www` with path/query intact, recorded in `docs/operations/RELEASE-EVIDENCE.md`.*

- [x] **LAUN-03**: Release evidence — home, tiers, compatibility, docs, support, both JSON
      endpoints, the branded 404, and for stable the apex redirect — is recorded with each
      deployment alongside the full SHA.
      *Source: `docs/operations/release.md`*

- [x] **LAUN-04**: Private vulnerability reporting is enabled, a non-maintainer can reach
      Security → Advisories → Report a vulnerability, and `security@puppetstagehand.com` delivery is
      tested and the successful test recorded, before the production host serves customers.
      *Source: `docs/operations/github-environments.md` pre-publication requirements*

- [ ] **LAUN-05**: A rollback is proven end to end — a known-good SHA is redeployed to a protected
      environment through the normal dispatch path, restores the previous pages, and the incident
      plus the selected SHA are recorded. No S3 object is ever edited by hand.
      *Source: `docs/operations/release.md` rollback; failure behavior and recovery constraint*

### Documentation drift (DRIFT)

Small, real, and surfaced by the ingest. Each item is a locked decision that a source document has
not caught up with. Folded into the phase that touches the same subject rather than given a phase of
its own.

- [x] **DRIFT-01**: ADR-0002's References section points to ADR-0003 as the ADR that settled
      ownership of `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN` and `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN`,
      closing the stale "until a separate ADR records an owner" pointer.
      *Source: `.planning/INGEST-CONFLICTS.md` INFO*

- [x] **DRIFT-02**: The design specification's "GitHub Environments are named `testpilots`, `beta`,
      and `stable`" sentence is amended to the six-Environment model so it no longer reads as a
      closed enumeration contradicting ADR-0002 rule 3.
      *Source: ADR-0002 rule 3 (LOCKED); `.planning/INGEST-CONFLICTS.md` INFO*

- [x] **DRIFT-03**: The implementation plan's TypeScript version pin is reconciled with the working
      tree — one is corrected, neither is left to drift. (Plan records 7.0.2; `package.json` pins
      `6.0.3`.)
      *Source: pinned toolchain constraint; verified against `package.json` 2026-08-26*

- [x] **DRIFT-04**: The design specification's success criterion "compatibility claims are
      customer-facing and generated from schema-validated structured data" and its "the initial
      scaffold includes representative content for every route" sentence are amended to match
      ADR-0001's delivery boundary, so all three affected sentences agree.
      *Source: ADR-0001 amendment (LOCKED); `.planning/INGEST-CONFLICTS.md` INFO*

### Quality gates (GATE)

New gate coverage this milestone adds. The standing gate — `npm run verify` green on `main` — is a
constraint in PROJECT.md and a success criterion of every phase, not a requirement of one.

- [x] **GATE-01**: `tofu test` coverage asserts each of the six roles' trust subject and permission
      scope, and `tofu fmt -check -recursive infra`, `tofu init -backend=false`, `tofu validate`,
      and `./scripts/check-tofu-tags.sh` all pass over the bootstrap root.
      *Source: testing strategy; release-candidate verification gate constraints*

- [x] **GATE-02**: A post-deploy step asserts the deployed environment answers its public routes and
      serves the deployed commit, so a skipped or failed upload can no longer report green.
      *Source: `docs/operations/release.md` release evidence; failure behavior and recovery
      constraint; verified 2026-08-26 — `deploy.yml` soft-gates every AWS step and reports success when skipped*

- [x] **GATE-03**: A test fails when a route present in the built output is missing from the
      invalidation list in `scripts/deploy-site.sh`.
      *Source: cache-control policy; route/cache coupling recorded in the codebase map*

- [x] **GATE-04**: A realistic-volume compatibility fixture exercises the matrix's layout,
      responsiveness, and accessibility in the `fixture-matrix` Playwright project, so behaviour at
      scale is proven rather than assumed from five records.
      *Source: testing strategy constraint; ADR-0001 rule 2 (LOCKED)*

- [x] **GATE-05**: `infra/modules/static-site/tests/redirect.test.mjs` is wired into `npm run verify`
      and CI so the apex→`www` path-and-query guarantee that `release.md` makes operators check by
      hand is actually enforced automatically.
      *Source: `docs/operations/release.md` stable check; verified 2026-08-26 — the test file exists
      and asserts the guarantee, but no `package.json` script or workflow runs it*

- [ ] **GATE-06**: A test asserts that an unauthenticated request to a gated path is refused with
      `401`, and that an authenticated one succeeds — so the gate's presence is proven rather than
      assumed from configuration.
      *Source: testing strategy; AUTH-01*

- [ ] **GATE-07**: A test asserts that the downloads page resolves each site's channel correctly
      against fixture release data (test-pilots on testpilots, beta on beta, stable on stable) and
      that no channel silently falls back to another channel's binary or a stale cached one.
      *Source: testing strategy; amended 2026-08-27 for DOWN-01/DOWN-02 (channel-matched GitHub Releases pull replaces the private-S3-origin design)*

### Tester access gate (AUTH)

Added 2026-08-26 after roadmap evolution. Gating testing guides and the installer behind one shared
password, on a site that is static and a repository that is public.

- [ ] **AUTH-01**: A single shared password (no username) gates the testing guides — including the
      ported Tester's Guide (DOC-01) — enforced by the existing `aws_cloudfront_function` on
      `viewer-request` so an unauthenticated request is refused with `401` and a `WWW-Authenticate`
      challenge before any S3 origin is reached. The installer download path (DOWN-01) is
      deliberately NOT gated — it only ever links to public release artifacts.
      *Source: tester-enablement scope decision 2026-08-26; amended 2026-08-27 (downloads ungated,
      see DOWN section); verified: `infra/modules/static-site/cloudfront.tf:123` already declares a
      viewer-request function on all three cache behaviours*

- [ ] **AUTH-02**: The credential is held in a CloudFront KeyValueStore and never enters the
      repository — not as plaintext, not as a hash, and not as a placeholder that is actually live.
      `puppet-stagehand/stagehand-docs` is a public repository, so a committed shared secret is
      published, and a published hash of a single shared password is brute-forceable offline.
      *Source: tester-enablement scope decision 2026-08-26; verified: repository visibility is PUBLIC*

- [ ] **AUTH-03**: Rotating the credential is a KeyValueStore write documented in an operator
      runbook, and requires neither republishing the CloudFront function nor redeploying the site.
      *Source: operations documentation contract; shared-credential lifecycle*

- [ ] **AUTH-04**: `npm run check:links` and the Playwright e2e suite either carry the credential or
      exclude the gated paths by an explicit recorded rule, so `npm run verify` stays green without
      either tool silently reporting success because it stopped crawling, and without weakening
      coverage of ungated paths.
      *Source: standing verification gate; verified: `verify` runs both `check:links` and `test:e2e`*

- [ ] **AUTH-05**: The set of gated paths is declared in exactly one place that both the edge
      function and the verification tooling read, so an ungated testing guide fails the build rather
      than surfacing in production.
      *Source: single-source-of-truth constraint; prose-vs-reality drift prevention*

- [ ] **AUTH-06**: A "Tester's Guide" area (DOC-01) is added to the set of gated paths declared by
      AUTH-05, and is rendered only on the `testpilots` and `beta` sites — the `stable` site serves
      the same immutably-promoted build but renders an honest "not available here" state for that
      area, resolved by client-side hostname detection (no per-environment build; see PROJECT.md's
      immutable promotion constraint).
      *Source: doc-porting scope decision 2026-08-27; PROJECT.md "Promotion is ordered and immutable"*

### Tester downloads (DOWN)

Added 2026-08-26 after roadmap evolution. Amended 2026-08-27: replaces the original ghcr-container +
private-S3-installer design with a GitHub Releases pull from a public mirror repo, ungated.

- [ ] **DOWN-01**: `/downloads/` presents a download link for the puppet-installer binary, resolving
      to the release channel matching whichever site is serving the page — `test-pilots` on
      `testpilots.puppetstagehand.com`, `beta` on `beta.puppetstagehand.com`, `stable` on
      `www.puppetstagehand.com` — determined by client-side hostname detection against the same
      immutably-promoted build, and states the version it resolves to rather than implying it.
      *Source: tester-enablement scope decision 2026-08-26; amended 2026-08-27 (channel-matched GitHub Releases pull replaces the dual ghcr/S3 design)*

- [ ] **DOWN-02**: Release data and binaries are sourced from the public
      `puppet-stagehand/stagehand-release` repository's GitHub Releases via its public API — no
      credential for the private `puppetlabs-seteam/puppet-installer` repo is ever shipped to the
      browser or checked into this repository.
      *Source: 2026-08-27 finding — `puppetlabs-seteam/puppet-installer` is a private/internal repo;
      its release workflow's public-mirror step targets a placeholder repo/secret that doesn't exist
      yet. Cross-repo prerequisite: `puppet-stagehand/stagehand-release` must exist and receive real
      releases before this requirement is reachable — see ROADMAP.md's cross-repo prerequisite note.*

- [ ] **DOWN-03**: The downloads page is reachable without the shared password — only the Tester's
      Guide (DOC-01, AUTH-06) stays behind the AUTH-01 gate; one page linking to public release
      artifacts does not need the same protection as reader-facing testing instructions.
      *Source: tester-enablement scope decision 2026-08-27 (supersedes the original single-mechanism
      DOWN-03, since the installer is no longer gated)*

- [ ] **DOWN-04**: The page states each artifact's checksum and publication date, and a reader can
      verify a downloaded file against the stated checksum. Where a channel has no published
      release, it renders an honest unavailable state naming what is missing rather than a dead link
      or an unsubstantiated version.
      *Source: evidence-bearing claims constraint (same standard as the compatibility register);
      verified 2026-08-27 — `puppetlabs-seteam/puppet-installer` has zero releases published anywhere*

### Documentation porting (DOC)

Added 2026-08-27. Ports reader-facing guides from `puppet-console` (and any reader-facing
`puppet-installer` docs) into this site, alongside the AUTH/DOWN work above.

- [ ] **DOC-01**: The Tester's Guide is ported from `puppet-console`'s `docs/TESTER-GUIDE.md` into a
      dedicated area of this site, gated by AUTH-01/AUTH-06 and rendered only on `testpilots` and
      `beta` (see AUTH-06 for the runtime mechanism).
      *Source: doc-porting scope decision 2026-08-27*

- [ ] **DOC-02**: The general User Guide is ported from `puppet-console`'s `docs/USER-GUIDE.md` into
      this site's general documentation area (`src/content/docs/`), visible on all three
      environments.
      *Source: doc-porting scope decision 2026-08-27*

- [ ] **DOC-03**: Reader-facing `puppet-installer` documentation is incorporated into the site's
      documentation area alongside DOC-02; maintainer-facing installer docs (release engineering,
      secrets handling, production-readiness checklists) are excluded as out of scope for a customer-
      facing site.
      *Source: doc-porting scope decision 2026-08-27; candidates identified 2026-08-27:
      `puppet-installer/docs/registry-distribution-guide.md` and `docs/support-guide.md` (reader-
      facing); `docs/releasing.md`, `docs/secrets.md`, `docs/production-readiness.md` excluded
      (maintainer-facing)*

## v2 Requirements

Deferred. Each is a real finding from the codebase audit, but none is mandated by a constraint, a
locked decision, or the milestone scope — so none is smuggled into v1.

### Operational hardening (OPS)

- **OPS-01**: CloudFront 5xx-rate alarm and an AWS Budgets alert on the Stagehand account
- **OPS-02**: CloudFront and content-bucket access logging to a dedicated, lifecycle-expired bucket
- **OPS-03**: AWS WAF rate-based rule on the `stable` distribution
- **OPS-04**: `aws:SecureTransport = false` deny statement on each state bucket policy
- **OPS-05**: Dependabot for the `npm` and `github-actions` ecosystems, keeping pinned action SHAs fresh
- **OPS-06**: `testpilots` selectable in the `Deploy site` dispatch choice list so it can be rolled back without a forward-fix merge
- **OPS-07**: Promote a built artifact across environments instead of rebuilding per environment, closing the byte-identity gap `release.md` already acknowledges
- **OPS-08**: Derive the CloudFront invalidation list from the built tree instead of the hardcoded enumeration in `scripts/deploy-site.sh`
- **OPS-09**: Machine-verify promotion ordering by querying the GitHub Deployments API for a prior successful deployment of the same SHA in the preceding environment
- **OPS-10**: Split CI into parallel lint/unit/e2e jobs and cache the Astro build, once wall-clock becomes a friction point
- **OPS-11**: Client-side filtering or per-tier splitting of the matrix, before the record count reaches the low hundreds
- **OPS-12**: Raise the CloudFront price class above `PriceClass_100` if APAC/South America latency matters
- **OPS-13**: Permissions boundary on the apply role's IAM role-creation and inline-policy actions — deferred because both actions support the boundary condition key but ADR-0003 didn't call for a seventh managed policy, and adding one silently would change the deploy role's effective permissions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bulk migration of `puppet-console/docs` | A separate, separately reviewed content project (design spec non-goals) |
| Customer login, entitlement verification, ecommerce, subscriptions, license delivery | Belongs to authenticated Puppet Console, not a public static site |
| SSR, a database, an application API, hosted full-text search | The site is static-only by constraint |
| Analytics or behavioural tracking | Deliberately deferred until a privacy and retention decision is made |
| Automated compatibility claims inferred from upstream releases | A maintainer must intentionally add or revise every record (ADR-0001) |
| Third-party runtime JavaScript | The CSP is designed around self-hosted assets only |
| Gibson typeface | Embedding licence recorded as unresolved; IBM Plex is self-hosted instead |
| Redrawing or recolouring the Puppet mark | Approved asset only; otherwise the text wordmark `Puppet Stagehand` |
| Seeding the register to look populated | ADR-0001 rule 1, LOCKED — an unverified claim is worse than no claim |
| Collapsing to three GitHub Environments, or `pull_request_target` | ADR-0002 rules 3–4, LOCKED |
| CI applying the bootstrap root | ADR-0003 rule 4, LOCKED — bootstrap stays human-applied |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |
| INFRA-06 | Phase 1 | Complete |
| DRIFT-01 | Phase 1 | Complete |
| DRIFT-02 | Phase 1 | Complete |
| DRIFT-03 | Phase 1 | Complete |
| GATE-01 | Phase 1 | Complete |
| PUB-01 | Phase 2 | Complete |
| PUB-02 | Phase 2 | Complete |
| PUB-03 | Phase 2 | Complete |
| PUB-04 | Phase 2 | Complete |
| PUB-05 | Phase 2 | Complete |
| PUB-06 | Phase 2 | Complete |
| PUB-07 | Phase 2 | Complete |
| GATE-02 | Phase 2 | Complete |
| CONT-01 | Phase 3 | Complete |
| CONT-02 | Phase 3 | Complete |
| CONT-03 | Phase 3 | Complete |
| CONT-04 | Phase 3 | Complete |
| CONT-05 | Phase 3 | Complete |
| CONT-06 | Phase 3 | Complete |
| CONT-07 | Phase 3 | Complete |
| GATE-03 | Phase 3 | Complete |
| COMP-01 | Phase 4 | Complete |
| COMP-02 | Phase 4 | Complete |
| COMP-03 | Phase 4 | Complete |
| COMP-04 | Phase 4 | Complete |
| COMP-05 | Phase 4 | Complete |
| DRIFT-04 | Phase 4 | Complete |
| GATE-04 | Phase 4 | Complete |
| LAUN-01 | Phase 5 | Complete |
| LAUN-02 | Phase 5 | Complete |
| LAUN-03 | Phase 5 | Complete |
| LAUN-04 | Phase 5 | Complete |
| LAUN-05 | Phase 5 | Pending |
| GATE-05 | Phase 5 | Complete |
| AUTH-01 | Phase 04.1 | Pending |
| AUTH-02 | Phase 04.1 | Pending |
| AUTH-03 | Phase 04.1 | Pending |
| AUTH-04 | Phase 04.1 | Pending |
| AUTH-05 | Phase 04.1 | Pending |
| AUTH-06 | Phase 04.1 | Pending |
| DOC-01 | Phase 04.1 | Pending |
| GATE-06 | Phase 04.1 | Pending |
| DOWN-01 | Phase 04.2 | Pending |
| DOWN-02 | Phase 04.2 | Pending |
| DOWN-03 | Phase 04.2 | Pending |
| DOWN-04 | Phase 04.2 | Pending |
| DOC-02 | Phase 04.2 | Pending |
| DOC-03 | Phase 04.2 | Pending |
| GATE-07 | Phase 04.2 | Pending |

**Coverage:**

- v1 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0 ✓

Per phase: Phase 1 = 10, Phase 2 = 8, Phase 3 = 8, Phase 4 = 7, Phase 04.1 = 6, Phase 04.2 = 5, Phase 5 = 6.

---
*Requirements defined: 2026-08-26*
*Last updated: 2026-08-26 after doc ingest, roadmap creation, and tester-enablement insertion (Phases 04.1 / 04.2)*
