# Rotate and understand the tester-access gate

This guide is for an operator rotating the shared tester credential, or for anyone reading
`redirect.js`/`kvs.tf` and wondering how the gate is seeded, tested, or bypassed by local tooling.
After reading it, the operator can rotate the credential on any of the three real environments with
a single KVS write — no `tofu apply`, no site redeployment — and can tell at a glance that this
credential's lifecycle is entirely separate from the pre-existing whole-site `enable_basic_auth`
lockdown.

## What the gate protects

`infra/modules/static-site/gated-paths.json` is the single declared source of truth for which URL
prefixes require the tester credential — currently just `/docs/testers-guide` (and its nested
sub-paths). `redirect.js`'s `isGatedPath()` guard clause runs ahead of every other request-time
check: an unauthenticated request to a gated path is refused with a `401` and a `WWW-Authenticate:
Basic` challenge before the CloudFront distribution's origin (the private S3 content bucket) is ever
reached. A request carrying the correct credential falls through unchanged into the existing
clean-path/redirect logic, exactly as an unmatched request does.

The credential itself lives only in each environment's CloudFront Functions KeyValueStore (KVS), as
the single key `gate_expected_header`, storing the complete precomputed `"Basic " +
base64(":<password>")` header value (empty username — AUTH-01 is a single shared password, not
per-user credentials). No `.tf` file, no Terraform state, and no file tracked by git ever holds the
plaintext password or its encoded form. `infra/modules/static-site/kvs.tf` declares the KVS
_container_ only (`aws_cloudfront_key_value_store.tester_gate`); there is no
`aws_cloudfrontkeyvaluestore_key` resource, deliberately, so the credential's value never enters
Terraform's management surface.

## Rotate the tester credential

Rotating the gate credential is a KVS write against each environment's already-existing store. It
requires **no** `tofu apply` targeting the function or distribution, and **no** site redeployment —
the function code and its KVS association are unchanged; only the value CloudFront Functions reads
at request time changes.

1. Choose a new password and compute its expected header value the same way the initial seed did —
   base64-encode a leading colon followed by the password, then prefix `"Basic "`:

   ```sh
   NEW_EXPECTED_HEADER="Basic $(printf ':%s' "$NEW_PASSWORD" | base64)"
   ```

   Never write `$NEW_PASSWORD` or `$NEW_EXPECTED_HEADER` to a file; keep them in shell variables
   only, and clear your shell history if it captured the plaintext.

2. For each environment (`testpilots`, `beta`, `stable`), fetch that environment's own KVS ARN and
   current `ETag`, then write the new value with `--if-match`:

   ```sh
   KVS_ARN=$(tofu -chdir=infra/environments/testpilots output -raw tester_gate_kvs_arn)
   ETAG=$(aws cloudfront-keyvaluestore describe-key-value-store --kvs-arn "$KVS_ARN" --query ETag --output text)
   aws cloudfront-keyvaluestore put-key \
     --kvs-arn "$KVS_ARN" \
     --key gate_expected_header \
     --value "$NEW_EXPECTED_HEADER" \
     --if-match "$ETAG"
   ```

   Repeat once per environment, using **that environment's own** `tofu output -raw
tester_gate_kvs_arn` each time. Never copy one environment's KVS ARN into another's command —
   each environment's store is independent, and this project's established pattern (see
   [`aws-bootstrap.md`](aws-bootstrap.md)) never lets one environment's output leak into another's
   apply or write.

3. Distribute the new password to testers out-of-band (Slack, 1Password, etc.). There is no
   propagation delay to wait out beyond normal CloudFront Functions KVS write consistency — the new
   value is live within seconds, no cache invalidation or function republish involved.

4. Confirm the rotation with `curl`:

   ```sh
   curl -sI -u ":$NEW_PASSWORD" "https://testpilots.puppet-stagehand.com/docs/testers-guide/"
   ```

   The old password stops working the instant `put-key` completes; there is no grace period.

## The pre-existing whole-site lockdown is a separate credential

**This section is deliberately kept apart from the rotation steps above.** The pre-existing
whole-site HTTP Basic Auth lockdown (`enable_basic_auth`, controlled by
`TF_VAR_basic_auth_username`/`TF_VAR_basic_auth_password`, documented in
[`aws-bootstrap.md`](aws-bootstrap.md)) is a **completely separate credential with a completely
separate rotation path** from the tester-access gate above. Per D-06, rotating one must never be
assumed to rotate, affect, or invalidate the other:

- The tester-access gate's credential is a KVS value, rotated with `aws
cloudfront-keyvaluestore put-key` (above) — no Terraform variable, no `tofu apply`, no function
  republish.
- The whole-site lockdown's credential is a pair of Terraform variables baked into the function's
  compiled code at `replace()` time. Rotating it requires changing
  `TF_VAR_basic_auth_username`/`TF_VAR_basic_auth_password` and running a full `tofu apply`, which
  **does** republish the CloudFront Function to `LIVE` for that environment.
- The two mechanisms are mutually exclusive per request in `redirect.js` (`if` / `else-if`): a gated
  path (`/docs/testers-guide*`) is governed _exclusively_ by the tester-access gate; every other path
  keeps the whole-site lockdown's behavior, completely unaffected by the gate's existence.

Rotating the tester-access gate's password does **not** change who can reach the rest of the site,
and rotating the whole-site lockdown's password does **not** change who can reach the Tester's
Guide. Treat any request to "rotate the site password" as ambiguous until you know which of the two
credentials is meant.

## AUTH-04: why local tooling never simulates this gate

`npm run check:links` and the Playwright `production` project both serve the local `dist/` build via
`scripts/serve-static-build.ts`'s bare `http.createServer` — a plain static file server with no
CloudFront in front of it, and therefore no `redirect.js`, no KVS lookup, and no gate at all. The
gated `/docs/testers-guide/` path is crawled and tested locally with **no credential required**, on
every run, unconditionally.

This is not the same failure mode as "silently reporting success because it stopped crawling early."
Link-checking and the Playwright production project never stop at the gated path — they traverse it
exactly as they would any other route, because from the local static server's perspective there is
no gate to hit. The reason neither tool needs gate-simulation logic is structural: they never
traverse CloudFront, so they never see the edge function that enforces the gate in the first place.
Adding a fake 401/credential-check into `serve-static-build.ts` would test the local server's own
made-up logic, not the real `redirect.js` deployed to CloudFront — the real gate is proven instead by
`infra/modules/static-site/tests/redirect.test.mjs` (mocked KVS) and the live `curl` verification
this repository's operators run after every apply (see the [Rotate the tester credential](#rotate-the-tester-credential)
section above and `04.1-02-SUMMARY.md`).
