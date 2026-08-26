# Context

Running notes from DOC-classified documents, keyed by topic. Six DOC sources ingested.
DOC is the lowest precedence tier; nothing here overrides `decisions.md` or `constraints.md`.

---

## AWS bootstrap and per-environment apply
- source: docs/operations/aws-bootstrap.md
- audience: operator establishing the three Stagehand environments in an AWS account

Requires OpenTofu 1.12 and an AWS CLI identity authorized to create the bootstrap resources.
Authenticate with the organization's approved short-lived method (`aws sso login` when AWS IAM
Identity Center is configured), then confirm the intended account with `aws sts get-caller-identity`
before every plan or apply.

The bootstrap requires initial local administrative authority. It creates three private, versioned
state buckets and the shared GitHub OIDC provider. It does **not** create the plan and apply roles
used by the infrastructure workflow; the runbook directs the operator to provision those separately
with the least-privilege model in the GitHub Environments guide.
(ADR-0003 rule 1 assigns ownership of those roles to `infra/bootstrap/`; ADR-0003 rule 5 keeps this
manual path operative until the OpenTofu exists.)

S3 bucket names are globally unique — choose account- or organization-scoped names, without putting
an AWS account number or credential in Git.

Ordered procedure: (1) create shared bootstrap resources — copy the ignored tfvars, edit all three
bucket names, `init`, save and review a plan, apply, then read `github_oidc_provider_arn` and the
three `state_bucket_names` outputs and delete the saved plan; (2) configure one environment backend,
starting with `testpilots` then repeating for `beta` and `stable`, keeping state key
`stagehand-docs/terraform.tfstate`, `encrypt = true`, and `use_lockfile = true`, and supplying
`TF_VAR_hosted_zone_id` and `TF_VAR_github_oidc_provider_arn` via environment variables rather than
tracked files; (3) run `./scripts/check-tofu-tags.sh`, then plan, show, apply, and delete the saved
plan; (4) audit applied tags.

Saved plan files are sensitive because they can contain account-specific or sensitive planned values.
Delete each saved plan immediately after its apply or final review; do not archive, attach, or commit
it. CI-generated `plan-summary.txt` files are temporary review output and must also be deleted after
review.

The local bootstrap state is a sensitive foundational asset: it owns the remote-state buckets and
shared OIDC provider. Before the first apply, designate one accountable owner and allow one active
writer. Choose an organization-approved custody location that is encrypted, access-controlled, and
versioned. Store `terraform.tfstate` and any backup immediately after each bootstrap change; never
leave the only copy on an operator workstation or create competing writable copies. The custodian
must periodically perform and record a restore test in an isolated, access-controlled workspace using
read-only `tofu state list` and `tofu plan` inspection; do not apply during the restore test. If the
state is lost, stop before re-applying, restore the approved copy first, and if no restorable copy
exists, inventory the existing buckets, their supporting controls, and the OIDC provider, then use
`tofu import` for every corresponding resource address, reviewing a no-surprise plan with a second
administrator before any later apply.

Before applying, inspect every create, update, replacement, deletion, Route 53 record, and tag. Stop
if a taggable environment resource lacks either required tag. Applying `stable` creates the public
records for `www.puppetstagehand.com` and the apex redirect, so treat that apply as a deliberate DNS
cutover.

After each apply, capture `content_bucket_name`, `distribution_id`, and `deployment_role_arn` and
store them as `CONTENT_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, and `AWS_DEPLOY_ROLE_ARN` without
display quotes. Never copy an output from one environment into another.

Tag audit uses `aws resourcegroupstaggingapi get-resources` in the configured regional-provider
region and in `us-east-1` (where the ACM certificate lives) — first an unfiltered `project=stagehand`
inventory, then filtered per-environment presence checks. Filtered results prove tag presence only;
they cannot show a project resource whose environment tag is absent. The Tagging API also omits some
global or unsupported resource types, so complete the audit by comparing the plan/state resource list
and inspecting those services directly.

Safety boundary: creating, validating, or testing this scaffold does not run `tofu apply` and does
not perform a DNS cutover. No scaffold task has performed an AWS apply or DNS cutover.

---

## GitHub Environment configuration
- source: docs/operations/github-environments.md
- audience: repository administrator connecting GitHub Actions to an already bootstrapped AWS account
- note: ADR-0002 (locked) ratifies this six-Environment model. ADR-0003 (locked) rule 3 elevates the
  permission scoping in this document to the specification the OpenTofu must satisfy, so the role
  scoping below carries more than DOC weight.

Create deployment/apply Environments named exactly `testpilots`, `beta`, and `stable`. For all three,
set the deployment branch policy to selected branches and allow `main` only; do not allow tags or
arbitrary branches. Protection: `testpilots` — reviewers optional for content or infrastructure
apply, self-review prevention recommended, `main` only; `beta` — reviewers required, self-review
prevention recommended, `main` only; `stable` — reviewers required, self-review prevention required,
`main` only.

Create three additional, least-privilege plan Environments named exactly `testpilots-plan`,
`beta-plan`, and `stable-plan`. Set each to selected branches and tags with the custom deployment
branch rule `refs/pull/*/merge`; do not allow `main`, tags, or other refs. GitHub evaluates a
`pull_request` workflow against its merge ref, so a `main`-only rule would prevent the plan job from
starting. Do not replace this workflow with `pull_request_target`: that event could expose AWS
authority while running untrusted pull-request code. Each plan Environment requires at least one
trusted reviewer with self-review prevention required.

The workflow's job-level same-repository guard runs before a plan Environment is attached. The
Environment rule and the AWS role trust are additional controls, not substitutes for that guard. Use
the smallest trusted reviewer group that can validate the change and target account. Before approving
a plan job, the trusted reviewer must inspect the workflow and infrastructure diff for unsafe code
because the plan role can read sensitive infrastructure metadata.

Plan Environment variables (only these): `AWS_REGION` (currently `us-east-2` unless deliberately
changed), `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN`, `OIDC_PROVIDER_ARN`, `HOSTED_ZONE_ID`,
`TOFU_STATE_BUCKET`.

Deployment/apply Environment variables (only these): `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`,
`AWS_INFRASTRUCTURE_APPLY_ROLE_ARN`, `OIDC_PROVIDER_ARN`, `HOSTED_ZONE_ID`, `TOFU_STATE_BUCKET`,
`CONTENT_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`.

Do not copy an apply or deploy role into a plan Environment, and do not copy a plan role into a
deployment/apply Environment. Do not create AWS access-key secrets — the workflows request
short-lived credentials through GitHub OIDC and require only `id-token: write` plus the selected role
ARN.

Separate infrastructure roles: the current OpenTofu bootstrap creates the state buckets and shared
OIDC provider; the environment site stack creates only its content deployment role. Neither creates
`AWS_INFRASTRUCTURE_PLAN_ROLE_ARN` nor `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN`. An authorized AWS
administrator must provision both after bootstrap and before enabling infrastructure automation.
Trust each role only for the repository `puppet-stagehand/stagehand-docs` and its exact matching
GitHub Environment subject, with `aud` equal to `sts.amazonaws.com`. Plan-role subjects:
`repo:puppet-stagehand/stagehand-docs:environment:testpilots-plan`, `...:beta-plan`,
`...:stable-plan`. Apply- and deploy-role subjects use the corresponding environment without `-plan`.
Never allow a wildcard Environment name in a role trust policy.

Give the plan role only the permissions needed to read its state, acquire and release that state
lock, refresh known resources, and call relevant `Get`, `List`, and `Describe` operations. It must not
create, mutate, or delete site resources. Scope bucket permissions to the matching state bucket and
state key, including only the lock-object writes and deletes OpenTofu requires. Give the apply role
the same state access plus the minimum create, update, tag, and delete actions required by the
reviewed static-site module. Scope permissions by known ARNs, hosted zone, resource-name prefixes,
and the mandatory `project=stagehand` and matching `environment` tags where AWS supports those
conditions. Do not share either role across environments. Have a second administrator review the
trust and permission policies before storing the ARNs in GitHub.

Enable private vulnerability reporting before publishing the repository (Settings -> Security -> Code
security). Confirm that a non-maintainer can see Security -> Advisories -> Report a vulnerability. For
`security@puppetstagehand.com`, the repository administrators must provision the address, monitor it,
and test delivery before publication; record the successful test and retest it after mail-provider or
repository-ownership changes. Keep the SECURITY.md fallback current, and never redirect reporters to a
public issue or discussion.

Verify configuration without changing AWS by opening a same-repository pull request that changes
infrastructure. The Infrastructure workflow always validates locally; configured protected
environments also produce value-free plan summaries. A missing variable causes planning to skip with a
summary instead of exposing partial credentials. The workflow never uploads a binary plan. An
infrastructure apply is a separate manual dispatch from the `main` workflow ref requiring the selected
environment, the exact confirmation `apply`, its protected reviewers, and a fresh plan created inside
the apply job.

---

## Release promotion and rollback
- source: docs/operations/release.md
- audience: release operator moving one immutable Stagehand commit through the protected environments

Release invariant: promotion order is always testpilots -> beta -> stable. The deployable unit is one
full, lowercase, 40-character Git SHA reachable from `main`. Beta must receive the exact SHA already
deployed successfully to testpilots; stable must receive the exact SHA already deployed successfully
to beta. Do not alter or cherry-pick the commit between environments. The workflow independently
rebuilds the same locked commit in each environment; SHA identity does not prove that the separately
built files are byte-identical.

Promotion procedure: merge the reviewed change to `main`; wait for Validate to pass and for the
automatic Deploy site run to finish successfully in `testpilots`; record the full SHA and verify it in
the testpilots deployment history; from the `main` branch view of Actions -> Deploy site, Run workflow
selecting `beta` with that exact full SHA; obtain the beta approval, wait for the run and smoke checks,
verify the SHA in beta's history; dispatch Deploy site again from the `main` workflow ref selecting
`stable` with the same SHA; obtain the stable approval and verify the production pages and deployment
history.

For each environment, open the home, tiers, compatibility, documentation, and support routes; confirm
the two JSON data endpoints return the reviewed build; and check that a nonexistent route uses the
branded 404 response. For stable, also confirm the apex host redirects to `www.puppetstagehand.com`
without changing the path or query. Treat these checks as release evidence and record them with the
deployment.

The workflow rejects a short SHA, a SHA not reachable from `origin/main`, and a manual dispatch whose
workflow ref is not `main`. The operator must still verify the prior environment's successful
deployment; ancestry alone does not prove promotion history.

Rollback (beta or stable): identify the last known-good SHA from the target environment's GitHub
deployment history; confirm it is a full SHA reachable from `main` with a passing validation run;
dispatch Deploy site from the `main` workflow ref for the affected environment with that SHA; obtain
the normal protected-environment approval and verify the restored pages; record the incident and the
SHA selected.

Testpilots recovery: the manual workflow cannot dispatch testpilots or redeploy an old testpilots SHA.
Submit a reviewed revert or fix against `main` and merge it; that merge creates a new SHA and triggers
the automatic testpilots deployment. If beta or stable is also affected, roll it back separately.

Never edit S3 objects manually. A manual change bypasses the immutable SHA record, cache-control rules,
CloudFront invalidation, review protection, and repeatable rollback path.

Infrastructure releases validate on pull requests. Apply them only by manually dispatching the
Infrastructure workflow from `main`, choosing one environment, and entering the exact confirmation
`apply`. The job creates a fresh plan and applies that same plan after protected environment approval.
Review DNS changes especially carefully for stable.

---

## AWS cost estimation
- source: docs/operations/cost-model.md
- audience: maintainers estimating the static site's AWS bill before a launch or customer publication

The model turns measured traffic assumptions into a repeatable estimate; it is not a price quote or
spending guarantee.

Refresh every rate from the official CloudFront, S3, Route 53, and AWS Certificate Manager pricing
pages before publishing an estimate. Rates, free allowances, price classes, regions, taxes, and account
discounts change. Record the retrieval date, AWS region, CloudFront geography or price class, and
whether a free tier, credit, or negotiated discount was excluded. Public ACM certificates used with
integrated AWS services may have a different charge model from private certificates or exported public
certificates, so verify the certificate type on the ACM page.

Inputs collected per environment: `I` monthly page impressions; `B` average bytes transferred to a
viewer per impression, including repeat-visit caching; `R` average CloudFront viewer requests per
impression; `M` S3 stored GB-month; `P` and `G` S3 write/list and origin-read request counts; `Q`
Route 53 DNS queries; `Z` hosted zones attributable to Stagehand; `N` paid invalidation paths or other
optional CloudFront features; and the current unit rate for each item in the served geography and AWS
region. Do not equate an impression with one request — HTML, fonts, styles, JSON, cache hits, and
repeat visits change both `B` and `R`.

Calculation for an impression scenario such as 1,000, 10,000, or 100,000 per month:

```text
viewer GB              = I × B / 1,000,000,000
viewer requests        = I × R
CloudFront subtotal    = viewer GB × transfer rate
                       + viewer requests / request-rate unit × request rate
                       + N × optional-feature rate
S3 subtotal            = M × storage rate
                       + P / write-rate unit × write/list rate
                       + G / read-rate unit × read rate
Route 53 subtotal      = Z × hosted-zone rate
                       + Q / query-rate unit × DNS query rate
certificate subtotal   = certificate quantity × applicable current ACM rate
Monthly estimate = CloudFront subtotal + S3 subtotal + Route 53 subtotal
                 + certificate subtotal + logging/monitoring + taxes
```

Apply current free allowances only after calculating the gross usage, and only when the account is
eligible. At low volume, fixed Route 53 hosted-zone charges and CloudFront/S3 request and storage
charges can matter more than transfer. At higher volume, geography, page weight, request count, and
cache behavior increasingly control the result.

Publication checklist: before publishing a customer-facing figure, rerun the calculation with current
measured build size and traffic behavior, open every pricing link, refresh every unit rate, and have a
second maintainer check units and free-tier assumptions. Present the input table and retrieval date
beside the result so a future reader can reproduce it. Label the result an estimate and give a range
when page weight, cache hit ratio, or traffic geography is uncertain.

---

## Published page: Getting started
- source: src/content/docs/getting-started.md
- frontmatter: title "Getting started", order 1, updated 2026-08-22

Before you begin: use the compatibility register (`/compatibility/`) to confirm that an approved
Stagehand release record matches your Puppet version, provider, operating system, tier, and transport.
A missing record is not a compatibility claim. For the documented OpenVox path, prepare an OpenVox
environment whose lifecycle you are authorized to manage; a dedicated SSH account and credentials owned
under your organization's access policy; independently verified SSH host keys for every target; and a
tested recovery path before making changes to an environment. This public site does not install
Stagehand, accept credentials, or grant access to customer products.

Current execution path: SSH remains the OpenVox execution path. Keep SSH credentials out of this
repository and follow the security guide before connecting to a target. Premium PCP/orchestrator
behavior is unavailable until an approved Stagehand release compatibility record documents it. Do not
treat planned integration language as evidence that the behavior ships today.

Puppet Console boundary: Puppet Console is where customer-facing Stagehand integration will live.
Console will own authenticated product workflows and entitlement decisions; this version-controlled
documentation remains public and static. Before using a Console workflow, require both released product
instructions and a matching entry in the compatibility register. Until those records exist, continue to
treat the workflow as unavailable.

Next steps: review the security and trust boundaries; confirm your exact environment in the
compatibility register; use the support page to choose public issue reporting or your commercial support
channel.

---

## Published page: Security and trust boundaries
- source: src/content/docs/security.md
- frontmatter: title "Security and trust boundaries", order 2

Credential ownership: the organization operating the Puppet environment owns its SSH accounts, private
keys, tokens, certificate material, rotation schedule, and revocation process. Use dedicated identities
with the least privilege required by an approved workflow. Do not commit credentials to Stagehand source
or documentation, paste them into an issue, or embed them in generated site output. This public site is
static — it does not collect, store, rotate, or validate customer credentials.

SSH host verification: SSH remains the OpenVox execution path. Verify host keys through a trusted channel
before the first connection, record the expected fingerprints in an organization-controlled location, and
investigate unexpected key changes. Do not disable strict host verification to bypass a mismatch. Limit
the SSH account to the intended targets and actions, protect private keys according to your
organization's credential policy, and revoke access when it is no longer required.

Future PCP trust boundaries: premium PCP/orchestrator behavior is unavailable until an approved Stagehand
release compatibility record exists. Before any future PCP workflow is treated as available, its release
documentation must identify the authenticated Console, orchestrator, broker, and target boundaries;
certificate and identity ownership; authorized actions; and failure and revocation behavior. Until that
evidence is published, do not provision credentials or widen network trust based on an anticipated PCP
integration.

Forge and entitlement boundary: customer access decisions and Forge payment enforcement belong to
authenticated Puppet Console workflows, not this public documentation site. Public pages neither prove a
customer's entitlement nor unlock premium content. Keep Forge tokens and account details within approved
authenticated systems.

Redaction and reporting: before sharing diagnostics, remove private keys, tokens, passwords, cookies,
authorization headers, certificate private material, customer data, and unnecessary identifying
infrastructure details. Preserve only the minimum technical context needed to reproduce the problem.
Report non-sensitive, documentation-specific defects through the public issue tracker. Do not put a
suspected vulnerability or sensitive diagnostic in a public issue — use the repository's private security
advisory channel or your organization's approved private commercial support channel instead.
