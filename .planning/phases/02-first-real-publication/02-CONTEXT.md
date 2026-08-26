# Phase 2: First Real Publication - Context

**Gathered:** 2026-08-26
**Status:** Ready for planning

<domain>
## Phase Boundary

The delivery pipeline actually publishes — a merge to `main` puts bytes behind a CloudFront
distribution and something answers on the internet. Bootstrap and `testpilots` are applied for
real; the deploy pipeline stops silently skipping. Requirements: PUB-01 through PUB-07, GATE-02.

</domain>

<decisions>
## Implementation Decisions

### DNS cutover sequencing (risk-driven)
- **D-01:** `puppetstagehand.com`'s live NS delegation currently points to Cloudflare and serves
  an unrelated, currently-live GitHub Pages site (`puppetlabs-seteam.github.io`) at both the apex
  and `www`. This phase does NOT perform a full-domain NS cutover to Route 53.
- **D-02:** This phase creates the Route 53 hosted zone and validates `testpilots` via its own
  AWS-issued nameservers or a CloudFront default domain — without touching the live
  `puppetstagehand.com` NS delegation at Cloudflare.
- **D-03:** The actual domain cutover (pointing the live domain's registrar/NS at the new Route 53
  hosted zone) is explicitly OUT OF SCOPE for this phase — it is a separate, later, deliberate
  decision the user will make outside of this automated run. Do not create a plan task that
  performs or assumes this cutover.
- **Consequence for success criterion 1:** "A visitor can load https://testpilots.puppetstagehand.com/"
  — reaching this over the final custom hostname requires the (deferred) cutover. The planner
  should verify this success criterion via the zone's own delegation set or CloudFront's default
  domain, and record the custom-hostname verification as blocked on the deferred cutover rather
  than silently dropping the criterion.

### AWS identity for real applies
- **D-04:** All real `tofu apply` operations in this phase (bootstrap root and `testpilots`
  environment) MUST run under a short-lived, non-root AWS identity (SSO / IAM Identity Center),
  never the AWS account root user — per `docs/operations/aws-bootstrap.md`'s existing guidance.
- **D-05:** The plan must include an explicit precondition/checkpoint before any real apply task
  that confirms the executing identity is not root (e.g. `aws sts get-caller-identity` shows an
  assumed-role or federated identity, not the root account principal). If a non-root identity is
  not available when the apply task is reached, that task becomes a `checkpoint:human-action` —
  do not proceed with a root-user apply.

### Claude's Discretion
- Sequencing of the plan-vs-apply Environment wiring, the GATE-02 hard-failure fix in
  `deploy.yml`, and the post-deploy commit-verification mechanism are left to the planner/executor,
  informed by 02-RESEARCH.md's findings (these are already correctly implemented in
  `.github/workflows/deploy.yml` and `infrastructure.yml` per research — this phase is
  overwhelmingly an operations phase, not a code phase).

</decisions>

<specifics>
## Specific Ideas

No specific UI/behavioral requirements beyond the ROADMAP success criteria — this is an
infrastructure/pipeline phase.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research and prior phase
- `.planning/phases/02-first-real-publication/02-RESEARCH.md` — full findings: OIDC/role wiring
  already correct, GATE-02's soft-skip gap, DNS/root-user pitfalls, propagation timing.
- `.planning/phases/01-infrastructure-role-ownership/01-SUMMARY.md` through `01-04-SUMMARY.md` —
  the six IAM roles this phase's pipeline consumes.
- `.planning/phases/01-infrastructure-role-ownership/01-VERIFICATION.md` — confirmed state of
  phase 1's deliverables.

### Operational docs
- `docs/operations/aws-bootstrap.md` — non-root identity requirement, bootstrap apply procedure.
- `docs/operations/github-environments.md` — the six-Environment model this phase configures for
  real.
- `docs/adr/0002-github-environment-model.md`, `docs/adr/0003-infrastructure-iam-role-ownership.md`.

</canonical_refs>

<deferred>
## Deferred Ideas

- **puppetstagehand.com domain NS cutover** (Cloudflare → Route 53) — deliberately deferred out of
  this phase per D-01/D-03 above. Revisit as its own explicit, human-driven step once the
  hosted zone exists and the team is ready to risk the live GitHub Pages site's uptime.
- **Non-root AWS identity provisioning** (SSO/IAM Identity Center setup itself, if it doesn't
  already exist) — this phase requires the identity to exist per D-04, but setting it up if
  missing is a prerequisite step, not phase-2 scope, unless the planner finds it trivially
  in-scope.

</deferred>

---

*Phase: 02-first-real-publication*
