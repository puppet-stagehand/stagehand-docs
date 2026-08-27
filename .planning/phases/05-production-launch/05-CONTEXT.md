# Phase 5: Production Launch - Context

**Gathered:** 2026-08-26
**Status:** Ready for planning

<domain>
## Phase Boundary

`beta` and `stable` are applied for real, the production commit is promoted
testpilots → beta → stable through the protected dispatch path documented in
`docs/operations/release.md`, `www.puppetstagehand.com` serves customers with the apex host
redirecting without altering path/query, a rollback is proven end to end, release evidence is
recorded at each step, and private vulnerability reporting is live and tested before customers are
served. Requirements: LAUN-01 through LAUN-05, GATE-05.

This phase does NOT invent new product surface — it operationalizes the existing scaffold and
promotion pipeline into production.

</domain>

<decisions>
## Implementation Decisions

### DNS cutover blast radius (the central decision for this phase)
- **D-01:** `puppetstagehand.com`'s registrar/NS currently points to Cloudflare and serves an
  unrelated, currently-live GitHub Pages site (`puppetlabs-seteam.github.io`) at both the apex and
  `www`. This is the deferred cutover that Phase 2's `02-CONTEXT.md` (D-01/D-03) explicitly pushed
  to "a separate, later, deliberate decision the user will make outside of this automated run" —
  this phase is that later moment. — **Reversibility:** one-way — **rationale:** flipping the live
  registrar's NS records away from Cloudflare takes down a currently-serving, unrelated production
  site if done incorrectly; DNS propagation delay makes a bad change slow to undo and outside git's
  reach entirely.
- **D-02:** This phase's plan applies all AWS-side infrastructure for `stable` (Route 53 records,
  CloudFront distribution, alternate domain names, the apex-redirect Lambda@Edge/CloudFront
  Function per `infra/modules/static-site/functions/redirect.js`) and produces a precise,
  step-by-step runbook for the registrar-level NS change — but the actual NS flip at the registrar
  is executed by a human maintainer, not by the plan's executor.
- **D-03:** The plan MUST include an explicit `checkpoint:human-action` immediately before/around
  the registrar NS change step. Do not create a task that performs or simulates the registrar
  change itself. The runbook step should state the exact NS records to set (from the Route 53
  hosted zone created per `docs/operations/aws-bootstrap.md`) and a verification method (e.g. `dig
  NS puppetstagehand.com`) the maintainer runs after making the change.
- **D-04:** Everything reachable without the registrar cutover (stable environment apply, redirect
  function, GATE-05 test wiring, release-evidence logging, rollback proof against the CloudFront
  default domain or testpilots/beta hostnames) IS in scope for automated execution. Only the final
  registrar NS flip and the resulting customer-facing DNS resolution are gated on human action.

### Release evidence recording
- **D-05:** Every promotion (testpilots→beta, beta→stable) and every rollback appends an entry to a
  single committed log file, `docs/operations/RELEASE-EVIDENCE.md` (new file, alongside the
  existing `docs/operations/` runbooks). Each entry records: date/time, environment, full 40-char
  SHA, the release.md checks performed (home, tiers, compatibility, docs, support, both JSON
  endpoints, branded 404, and — for stable only — the apex redirect), and pass/fail per check.
  — **Reversibility:** reversible — it's an append-only markdown log; format can change later
  without breaking anything upstream.
- **D-06:** The rollback proof (LAUN-05) appends its own entry to the same
  `RELEASE-EVIDENCE.md` file: the incident description, the known-good SHA selected, the dispatch
  run link/ID, and confirmation that the previous pages were restored. No separate rollback log.
- **D-07:** This log is a release-time artifact the *plan* scaffolds (template/structure) and the
  *operator* fills in per real promotion — the plan should not fabricate evidence for
  promotions that haven't actually happened. Where the plan's own execution genuinely performs a
  promotion (e.g., to testpilots/beta, which don't require the registrar cutover), it may record
  real evidence directly.

### Security advisory reporting
- **D-08:** GitHub's private Security Advisory path ("Security → Advisories → Report a
  vulnerability") is verified as enabled via a task the executor CAN check deterministically
  (repository security settings / API). This is in-scope for automated verification.
  — **Reversibility:** reversible.
- **D-09:** The `security@puppetstagehand.com` mailbox provisioning and delivery test is a
  `checkpoint:human-action` — Claude has no access to real mailbox infrastructure. The plan
  documents the exact test procedure (send a test message, confirm receipt) and where to record
  the result: the same `RELEASE-EVIDENCE.md` log (or `SECURITY.md` if that reads more naturally —
  planner's call), per D-05's format. LAUN-04's "before the production host serves customers" gate
  MUST block the stable promotion task until this checkpoint is confirmed.

### GATE-05 wiring
- **D-10:** `infra/modules/static-site/tests/redirect.test.mjs` (a plain `node:test` file, not
  vitest) is wired into `npm run verify` via a new dedicated npm script — e.g. `"test:redirect":
  "node --test infra/modules/static-site/tests/"` — added to the `verify` chain in `package.json`.
  Do not convert the test to vitest; leave the existing test file's runner as-is.
- **D-11:** The equivalent CI workflow (`validate.yml` or wherever `npm run verify`/its
  constituent scripts run) must also execute this new script — verify it isn't only wired locally.

### Claude's Discretion
- Exact `RELEASE-EVIDENCE.md` file location/name variations, its markdown structure/table format,
  and whether SECURITY.md or RELEASE-EVIDENCE.md is the better home for the mailbox-delivery test
  record are left to the planner.
- How LAUN-05's rollback proof is exercised against a non-registrar-cutover-dependent target
  (e.g., beta, or stable via its CloudFront default domain / testpilots) so it doesn't require the
  registrar cutover to have already happened, is left to the planner/executor informed by
  research.
- Sequencing of GATE-05 wiring relative to the DNS/promotion tasks (GATE-05 has no dependency on
  DNS) is left to the planner.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Release and rollback mechanics
- `docs/operations/release.md` — promotion order (testpilots→beta→stable), exact dispatch steps,
  release-evidence checks per environment, rollback procedure, "never edit S3 by hand" invariant.
- `docs/operations/github-environments.md` §"Enable private security reports" — private
  vulnerability reporting setup and the `security@puppetstagehand.com` fallback provisioning note.
- `docs/operations/aws-bootstrap.md` (lines ~25-40) — Route 53 hosted zone creation, and the
  explicit statement that creating the zone does NOT delegate the live domain; the registrar
  cutover is separate and human-driven. Points to Phase 2's D-01/D-03.
- `SECURITY.md` — current security reporting policy; the mailbox fallback is explicitly marked
  unverified until tested.

### Prior phase context
- `.planning/phases/02-first-real-publication/02-CONTEXT.md` (D-01 through D-05) — the original
  decision to defer the registrar cutover; this phase is where that deferred decision resolves.
- `.planning/STATE.md` "Blockers/Concerns" — confirms `testpilots.puppetstagehand.com` and
  `beta.puppetstagehand.com` do not currently resolve (no real apply has happened yet), and
  explicitly flags GATE-05's dead test coverage as a Phase 5 dependency.

### Infrastructure and tests
- `infra/environments/stable/main.tf` — `domain_name = "www.puppetstagehand.com"`,
  `alternate_domain_names = ["puppetstagehand.com"]`, `hosted_zone_id` variable (no default).
- `infra/environments/beta/main.tf`, `infra/environments/testpilots/main.tf` — the same
  `hosted_zone_id`-driven pattern for the other two environments.
- `infra/modules/static-site/functions/redirect.js` and
  `infra/modules/static-site/tests/redirect.test.mjs` — the apex→www redirect implementation and
  its currently-unwired test (GATE-05).
- `package.json` `scripts.verify` — the chain GATE-05's new script must join.
- `docs/adr/0002-github-environment-model.md` — the six-Environment / three-OpenTofu-environment
  model these promotions run through.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `infra/modules/static-site/functions/redirect.js` — the redirect logic already exists and is
  templated with `__ENABLE_APEX_REDIRECT__`; only stable enables it (per `redirect.test.mjs`'s
  host-based test cases for `puppetstagehand.com`, `beta.puppetstagehand.com`).
- `docs/operations/release.md` already fully documents the dispatch-based promote/rollback
  procedure — the plan operationalizes this existing runbook rather than designing a new one.

### Established Patterns
- Every environment apply is a separate manual `Infrastructure` workflow dispatch requiring the
  literal confirmation `apply` (per `github-environments.md`) — stable's apply follows the same
  pattern already used (in theory) for testpilots/beta.
- `hosted_zone_id` is threaded as an un-defaulted Terraform variable into all three environments —
  the zone itself must already exist (created manually per `aws-bootstrap.md`) before any of the
  three environment applies can succeed.

### Integration Points
- The new `RELEASE-EVIDENCE.md` log is a new artifact, not wired to any existing code — pure
  documentation/process addition.
- GATE-05's new npm script integrates into the existing `verify` script chain in `package.json` and
  whatever CI workflow invokes it.

</code_context>

<specifics>
## Specific Ideas

No UI/behavioral requirements — this is an operations/infrastructure/process phase. The main
"shape" concern is risk containment around the one irreversible action (registrar DNS cutover),
captured in the decisions above.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
None — discussion stayed within phase scope.

- **Operational hardening (WAF, CloudWatch alarms, budget alerts, synthetic canaries, access
  logging)** — already tracked as OPS-01..12, deferred to v2 in STATE.md; reconfirmed out of scope
  here.
- **Full automation of the registrar DNS cutover** — explicitly rejected as a phase-5 goal per
  D-02/D-03 above; revisit only if the organization later wants a registrar API integration.

</deferred>

---

*Phase: 05-production-launch*
*Context gathered: 2026-08-26*
