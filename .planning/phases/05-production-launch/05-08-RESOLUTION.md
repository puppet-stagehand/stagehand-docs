# Phase 5 Plan 8: Resolution — Domain Migration Cutover Achieved (via `puppet-stagehand.com`)

**Status:** LAUN-02 is now genuinely satisfied. This document records how — not by 05-08's own
Task 2/Task 3 resuming, but by direct, maintainer-approved orchestrator action against a
different domain than 05-08-PLAN.md was originally scoped for.

**Read 05-08-SUMMARY.md first.** That file remains the accurate, unedited halt record: 05-08
halted mid-Task-2 on 2026-08-27 because `puppetstagehand.com`'s registrar (Cloudflare) does not
support custom nameservers on its plan tier, invalidating the plan's entire premise (a registrar
NS flip for that domain). Nothing in this document contradicts or supersedes that record — it
picks up exactly where the halt left off, against a new domain.

## What actually happened

Instead of a registrar NS flip for `puppetstagehand.com`, the maintainer registered a brand-new
domain, `puppet-stagehand.com`, directly through Route 53 Registrar — already authoritative, zone
`Z038247013307I1BORY2O`. With the maintainer's explicit sign-off at each step, the orchestrator
then:

1. **Dispatched an agent** (commit `a2de948`, "refactor(05): rename production domain to
   puppet-stagehand.com") that renamed the domain across `infra/bootstrap/`, all three environment
   roots (`testpilots`, `beta`, `stable`), the static-site module's redirect logic and tests, IAM
   policy test fixtures, operational docs, and living planning docs. It appended (did not
   overwrite) an amendment section to `05-CONTEXT.md` explaining the domain change and superseding
   D-01/D-02/D-03's specific domain references while leaving the original decision text intact for
   history.
2. **Applied bootstrap's Terraform state** — located it in its S3 custody bucket
   (`s3://puppet-stagehand-bootstrap-state/stagehand-docs/bootstrap/terraform.tfstate`), downloaded
   it, ran `tofu apply` with the new `hosted_zone_id=Z038247013307I1BORY2O`, then re-uploaded the
   state to S3 custody and deleted the local copy. **Result: 6 changed, 0 added, 0 destroyed** — the
   six IAM role policies updated in-place to reference the new hosted zone.
3. **Ran `tofu apply` for each environment root** against the new domain:
   - `testpilots`: **5 added, 2 changed, 5 destroyed**
   - `beta`: **5 added, 2 changed, 5 destroyed**
   - `stable`: **8 added, 2 changed, 8 destroyed**

   Each replaced its ACM certificate (new zone, no CAA issues this time — unlike the earlier
   beta/stable Cloudflare CAA saga recorded in 05-05-SUMMARY.md) and its Route 53 records for the
   new domain name(s). CloudFront distributions were updated in-place (same distribution IDs, same
   S3 content buckets, same IAM deploy roles — nothing else changed; no GitHub Environment variable
   needed updating as a result, since none of `SITE_CHECK_URL`, `CONTENT_BUCKET`,
   `CLOUDFRONT_DISTRIBUTION_ID`, or `AWS_DEPLOY_ROLE_ARN` are keyed to the domain name).
4. **Verified for real, against the public internet** — not just CloudFront's default domains:
   - `dig +short NS puppet-stagehand.com` → the four real Route 53 nameservers
     (`ns-267.awsdns-33.com`, `ns-1808.awsdns-34.co.uk`, `ns-641.awsdns-16.net`,
     `ns-1453.awsdns-53.org`), confirmed already correctly delegated at the registry via
     `dig +trace`.
   - `curl -sI https://testpilots.puppet-stagehand.com/`, `https://beta.puppet-stagehand.com/`, and
     `https://www.puppet-stagehand.com/` all → `HTTP/2 200`.
   - `curl -sI https://puppet-stagehand.com/` (bare apex) → `HTTP/2 301` with
     `location: https://www.puppet-stagehand.com/` — the apex-redirect CloudFront Function working
     end-to-end for the first time, verified against real DNS rather than only CloudFront's default
     domain.
5. **Deleted the old domain's now-empty Route 53 hosted zone** (`Z00971888M7QXUPNS7H8`,
   `puppetstagehand.com`) — confirmed via `aws route53 list-resource-record-sets` that only default
   NS/SOA records remained (all domain-specific records had already been destroyed by the
   environment applies above), and confirmed via `aws acm list-certificates` that no orphaned
   certificate for the old domain remains.

## Evidence log entry

The real public-internet verification above (NS delegation, all four hostnames' HTTP responses,
the apex-redirect proof) is recorded as its own appended row in
[`docs/operations/RELEASE-EVIDENCE.md`](../../../docs/operations/RELEASE-EVIDENCE.md)'s
Promotions table, dated 2026-08-27, environment `stable`, immediately below the pre-cutover row
that recorded the apex redirect as "pending — awaiting DNS cutover (see Plan 05-08)". That prior
row was not edited or deleted, per the log's own append-only invariant — this is a new row
documenting the actual cutover.

## Why this doesn't contradict 05-05's or 05-01's prohibitions

05-05-PLAN.md's `must_haves.prohibitions` for LAUN-02 states: *"MUST NOT claim or record the
apex->www redirect as live or customer-facing before the registrar NS flip (Plan 05-08) is
human-confirmed via dig."* That prohibition is satisfied, not violated, here: the underlying
DNS-cutover event those decisions anticipated — a human-driven, deliberately-scoped domain
delegation change, confirmed via `dig` before anything was claimed live — genuinely happened. It
just happened against `puppet-stagehand.com` instead of `puppetstagehand.com`, because the
originally-planned registrar (Cloudflare) turned out not to support the custom-NS mechanism D-01
through D-03 assumed. The redirect is not claimed live before cutover; it is claimed live *after*
a real cutover, confirmed via real `dig`/`curl` output, exactly as those decisions required — just
under the corrected domain name. 05-01-PLAN.md's prohibition (self-review protection on beta/stable
GitHub Environments) is unrelated to this change and was not touched.

## What this resolves and what remains

- **LAUN-02 is now honestly satisfied**: `stable` is applied as a deliberate DNS cutover,
  `www.puppet-stagehand.com` serves the site, and `puppet-stagehand.com` redirects to it without
  altering path or query — verified against the real public internet, not asserted. See
  `.planning/REQUIREMENTS.md` for the reconciled checkbox and criteria text.
- **05-08-PLAN.md itself remains incomplete** as a plan — its own Task 2 (registrar NS flip
  checkpoint) and Task 3 (verify-and-record) never resumed after the halt. The plan's *goal* was
  achieved by direct orchestrator action against a re-scoped domain, not by the plan's own tasks
  executing to completion. `.planning/ROADMAP.md` and `.planning/STATE.md` record this distinction
  rather than marking 05-08 complete in the normal per-plan sense.
- **Wave 8 (`05-10-PLAN.md`) is unblocked**: it depends on the domain genuinely being live, which
  it now is, not on 05-08 completing through its own tasks specifically.
- No Terraform, AWS resource, or GitHub setting was touched by this documentation-reconciliation
  pass itself — all infrastructure changes described above were performed and verified by the
  orchestrator, prior to and outside of this reconciliation task.

---
_Recorded: 2026-08-27_
_Supersedes no prior record — see `05-08-SUMMARY.md` for the unedited halt record this resolves._
