# Phase 5: Production Launch - Pattern Map

**Mapped:** 2026-08-26
**Files analyzed:** 6 (2 modified Terraform roots, 1 modified npm config, 1 new evidence log, 1 possibly-modified SECURITY.md, N/A CI workflow — already wired)
**Analogs found:** 5 / 6 (redirect-test-runner CI wiring needs no new file — already covered by existing `validate.yml` invocation of `npm run verify`)

This is an operations/infrastructure phase: almost every "file" is a small, additive edit to an
existing config file, not a new application module. Analogs below are drawn from the sibling
environment root (`testpilots`) that already has the pattern each modified file needs, and from
the existing `docs/operations/` runbook style for the new evidence log.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `infra/environments/beta/main.tf` (add `distribution_domain_name` output) | config (Terraform root) | CRUD (declarative infra state) | `infra/environments/testpilots/main.tf` | exact — same module, same output already present there |
| `infra/environments/stable/main.tf` (add `distribution_domain_name` output) | config (Terraform root) | CRUD (declarative infra state) | `infra/environments/testpilots/main.tf` | exact — same module, same output already present there |
| `package.json` (add `test:redirect` script + splice into `verify`) | config | request-response (CLI script chain) | `package.json`'s own existing `scripts` block (self-analog — extend in place) | exact |
| `docs/operations/RELEASE-EVIDENCE.md` (new file) | utility/doc (append-only log) | event-driven (one row per promotion/rollback event) | `docs/operations/release.md` (defines the exact check columns) + `docs/operations/github-environments.md` (table-heavy runbook prose style) | role-match (no prior append-only log exists; style/content precedent is strong) |
| `SECURITY.md` (optionally updated once `security@` delivery test is confirmed) | config/doc | request-response (policy doc) | existing `SECURITY.md` itself (self-analog — edit the "fallback... not already complete" caveat once verified) | exact |
| CI wiring for `test:redirect` (D-11) | config | request-response (CI job chain) | `.github/workflows/validate.yml` `site` job (already runs `npm run verify` verbatim) | exact — no new workflow file needed, confirmed by research |

## Pattern Assignments

### `infra/environments/beta/main.tf` and `infra/environments/stable/main.tf` (config, CRUD)

**Analog:** `infra/environments/testpilots/main.tf`

**Full working pattern to copy** (`infra/environments/testpilots/main.tf` lines 53-68, the four
`output` blocks — beta/stable currently only have the first three):
```hcl
output "content_bucket_name" {
  value = module.site.content_bucket_name
}

output "distribution_id" {
  value = module.site.distribution_id
}

output "deployment_role_arn" {
  value = module.site.deployment_role_arn
}

output "distribution_domain_name" {
  value = module.site.distribution_domain_name
}
```
Append only the last block (`distribution_domain_name`) to `beta/main.tf` and `stable/main.tf` —
their first three outputs already match this exact shape verbatim. Underlying module value already
exists at `infra/modules/static-site/outputs.tf:9-12`:
```hcl
output "distribution_domain_name" {
  description = "CloudFront-assigned distribution domain name."
  value       = aws_cloudfront_distribution.site.domain_name
}
```
No other change to either root file — `module "site" { ... }` blocks in beta/stable already
correctly set `environment`, `domain_name`, `alternate_domain_names`, `hosted_zone_id`,
`github_oidc_provider_arn`, and `enable_redirect_function`; do not touch those.

**Error handling / validation pattern:** none needed — this is a pure additive Terraform output,
no resource change, no variable validation required.

---

### `package.json` (config, request-response CLI chain)

**Analog:** the file's own existing `scripts` block (lines 9-27, read this session):
```json
"scripts": {
  "check:routes": "tsx scripts/check-built-routes.ts",
  "check:invalidation": "node --import tsx scripts/check-invalidation-coverage.ts",
  "test:unit": "vitest run",
  "test:e2e": "npm run build:e2e && env -u NO_COLOR playwright test && npm run check:e2e-isolation",
  "validate:data": "tsx scripts/validate-data.ts",
  "verify": "npm run format:check && npm run lint && npm run check && npm run validate:data && npm run test:unit && npm run build && npm run check:routes && npm run check:invalidation && npm run check:links && npm run test:e2e"
}
```
**Core pattern:** each check gets its own named script (`test:unit`, `check:routes`, etc.), and
`verify` chains them with `&&` in a fixed order. Add the new script following this exact
convention, then splice it into the `verify` chain immediately after `test:unit` (both are
fast, non-build-dependent checks; keep `build`/`test:e2e` at the end as already ordered):
```json
"test:redirect": "node --test infra/modules/static-site/tests/*.test.mjs",
"verify": "npm run format:check && npm run lint && npm run check && npm run validate:data && npm run test:unit && npm run test:redirect && npm run build && npm run check:routes && npm run check:invalidation && npm run check:links && npm run test:e2e"
```
**Critical correction (verified empirically per RESEARCH.md Pitfall 5):** must use the explicit
glob `infra/modules/static-site/tests/*.test.mjs`, NOT a bare directory path — `node --test
infra/modules/static-site/tests/` silently runs 0 real tests and reports one synthetic failure.

---

### `docs/operations/RELEASE-EVIDENCE.md` (new file — utility/doc, event-driven append-only log)

**Analog:** `docs/operations/release.md` (defines exact check semantics) — style analog:
`docs/operations/github-environments.md` (markdown table conventions, imperative present-tense
prose, "As of Phase N of the vX.Y.Z milestone" framing for real-state notes).

**Structure to copy** (verbatim table columns derived from `release.md`'s own enumeration —
"home, tiers, compatibility, documentation, and support routes; ... the two JSON data endpoints
...; ... a nonexistent route uses the branded 404 response. For stable, also confirm the apex
host redirects..."):
```markdown
# Release evidence

Append-only log. One row per promotion or rollback. Never edit or delete a prior entry — if a
check needs to be redone, add a new row.

## Promotions

| Date (UTC) | Environment | SHA | Home | Tiers | Compat | Docs | Support | tiers.json | compat.json | 404 | Apex redirect (stable only) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

## Rollbacks

| Date (UTC) | Environment | Incident | Known-good SHA | Dispatch run | Restored? | Notes |
|---|---|---|---|---|---|---|

## Security advisory delivery test

| Date (UTC) | Channel | Test performed | Result | Recorded by |
|---|---|---|---|---|
|  | `security@puppetstagehand.com` |  |  |  |
```
**Header/prose style to copy** from `release.md` (lines 1-5) — short "who is this for / what can
they do after reading it" framing sentence, imperative mood, no marketing language:
```markdown
This runbook is for a release operator moving one immutable Stagehand commit through the
protected environments. After reading it, the operator can prove the commit came from `main`,
promote it in order, and restore a known-good release without modifying storage by hand.
```
**Do NOT fabricate rows** for promotions that haven't actually happened (D-07) — only testpilots→beta
(and rollback proof against beta/testpilots) can get real rows from this phase's own execution;
stable rows stay templated/empty until the registrar cutover happens for real.

---

### `SECURITY.md` (config/doc, request-response policy doc — conditional edit)

**Analog:** the file itself (self-analog, edit in place once D-09's mailbox test is confirmed).

**Current unverified-fallback language to update** (lines 9-13, read this session):
```markdown
If **Report a vulnerability** is unavailable, do not publish the details. Use
`security@puppetstagehand.com` as a fallback only. Repository administrators must provision,
monitor, and test delivery to this address before the repository is published; this policy does
not claim that setup is already complete. Until the address has been verified, do not send
technical details.
```
Once D-09's checkpoint is confirmed (real send-and-receive test recorded in
`RELEASE-EVIDENCE.md`), replace "this policy does not claim that setup is already complete" /
"Until the address has been verified" language with a statement that delivery was verified on
the date recorded in `RELEASE-EVIDENCE.md`'s "Security advisory delivery test" table. Keep the
rest of the file (private-advisory-first instructions, sensitive-data section) unchanged — this is
a targeted prose edit, not a rewrite.

---

## Shared Patterns

### Terraform root output blocks
**Source:** `infra/modules/static-site/outputs.tf` (module-level, already exposes the value) +
`infra/environments/testpilots/main.tf` lines 65-68 (root-level re-export, already correct)
**Apply to:** both `infra/environments/beta/main.tf` and `infra/environments/stable/main.tf`
```hcl
output "distribution_domain_name" {
  value = module.site.distribution_domain_name
}
```
**Anti-pattern to avoid (explicit in `github-environments.md`):** never copy the *value* captured
from `testpilots`'s output into `beta`/`stable`'s GitHub Environment variables — each environment
must produce and expose its own value via its own apply.

### npm script chain convention
**Source:** `package.json` `scripts.verify` (existing)
**Apply to:** the one `test:redirect` addition — follow the `name: command` convention and the
`&&`-chained ordering already established; do not introduce a new chaining mechanism (e.g. `npm-run-all`).

### Runbook / doc prose style
**Source:** `docs/operations/release.md` and `docs/operations/github-environments.md`
**Apply to:** `RELEASE-EVIDENCE.md`'s header prose and any `checkpoint:human-action` runbook text
the plan writes for the registrar NS flip (D-03) and the `security@` mailbox test (D-09) — reuse
the imperative, present-tense, "As of Phase N ... " framing already used for confirmed real-state
facts (see `github-environments.md` lines 8-9) rather than inventing a new documentation voice.

### CI invocation — no new workflow needed
**Source:** `.github/workflows/validate.yml` lines 12-25 (`site` job)
```yaml
jobs:
  site:
    steps:
      - uses: actions/checkout@...
      - uses: ./.github/actions/setup-site
      - name: Verify site
        run: npm run verify
```
**Apply to:** D-11's CI requirement is already satisfied once `test:redirect` is spliced into
`npm run verify` — no workflow file edit required. Confirm this stays true (i.e., no other job
duplicates a narrower `verify`-subset invocation that would skip the new script) before closing
GATE-05.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Registrar NS-flip runbook step (prose, likely inside `RELEASE-EVIDENCE.md` or a `checkpoint:human-action` block, not a separate file per CONTEXT.md D-03) | doc | event-driven (one-time human action) | No prior registrar-level runbook step exists in this repo — Phase 2's `02-CONTEXT.md` explicitly deferred it. Use RESEARCH.md's Architecture Pattern 1 (ACM validation CNAME sequence) and Pitfall 1 as the closest available precedent instead of a codebase analog. |

## Metadata

**Analog search scope:** `infra/environments/`, `infra/modules/static-site/`, `docs/operations/`,
`package.json`, `.github/workflows/validate.yml`, `SECURITY.md`
**Files scanned:** 9 (both direct reads and the RESEARCH.md-cited verified locations)
**Pattern extraction date:** 2026-08-26
</content>
