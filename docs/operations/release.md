# Promote and roll back the site

This runbook is for a release operator moving one immutable Stagehand commit through the protected
environments. After reading it, the operator can prove the commit came from `main`, promote it in
order, and restore a known-good release without modifying storage by hand.

## Release invariant

Promotion order is always **testpilots → beta → stable**. The deployable unit is one full,
lowercase, 40-character Git SHA reachable from `main`. Beta must receive the exact SHA already
deployed successfully to testpilots; stable must receive the exact SHA already deployed
successfully to beta. Do not alter or cherry-pick the commit between environments. The workflow
independently rebuilds the same locked commit in each environment; SHA identity does not prove
that the separately built files are byte-identical.

## Promote a release

1. Merge the reviewed change to `main`.
2. Wait for Validate to pass and for the automatic **Deploy site** run to finish successfully in
   `testpilots`.
3. Record the full SHA from that run and verify it in the testpilots deployment history.
4. From the `main` branch view of **Actions → Deploy site**, choose **Run workflow**. Select `beta`
   and enter that exact full SHA.
5. Obtain the beta environment approval. Wait for the run and smoke checks to succeed, then verify
   the SHA in beta's deployment history.
6. Dispatch **Deploy site** again from the `main` workflow ref. Select `stable` and enter the same
   SHA.
7. Obtain the stable environment approval and verify the production pages and deployment history.

For each environment, open the home, tiers, compatibility, documentation, and support routes;
confirm the two JSON data endpoints return the reviewed build; and check that a nonexistent route
uses the branded 404 response. For stable, also confirm the apex host redirects to
`www.puppetstagehand.com` without changing the path or query. Treat these checks as release
evidence and record them with the deployment.

The workflow rejects a short SHA, a SHA not reachable from `origin/main`, and a manual dispatch
whose workflow ref is not `main`. The operator must still verify the prior environment's successful
deployment; ancestry alone does not prove promotion history.

## Roll back beta or stable

1. Identify the last known-good SHA from the target environment's GitHub deployment history.
2. Confirm that it is a full SHA reachable from `main` and that its validation run passed.
3. Dispatch **Deploy site** from the `main` workflow ref for the affected environment and enter the
   last known-good SHA.
4. Obtain the normal protected-environment approval and verify the restored pages.
5. Record the incident and the SHA selected for the environment.

## Recover testpilots

The manual workflow cannot dispatch testpilots or redeploy an old testpilots SHA. Submit a reviewed
revert or fix against `main`, then merge it. That merge creates a new SHA and triggers the automatic
testpilots deployment. Wait for validation and deployment to pass, verify the corrected pages, and
record both the affected and recovery SHAs. If beta or stable is also affected, roll it back
separately with the procedure above.

Never edit S3 objects manually. A manual change bypasses the immutable SHA record, cache-control
rules, CloudFront invalidation, review protection, and repeatable rollback path.

## Infrastructure releases

Infrastructure changes validate on pull requests. Apply them only by manually dispatching the
**Infrastructure** workflow from `main`, choosing one environment, and entering the exact
confirmation `apply`. The job creates a fresh plan and applies that same plan after protected
environment approval. Review DNS changes especially carefully for stable.
