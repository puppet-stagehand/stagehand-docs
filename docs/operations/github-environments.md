# Configure protected GitHub Environments

This guide is for a repository administrator connecting GitHub Actions to an already bootstrapped
AWS account. After reading it, the administrator can configure all six environments without
long-lived AWS credentials and can keep planning authority separate from apply authority.

## Create the environments

**As of Phase 2 of the `v0.2.3` milestone, all six Environments below exist for real** on
`puppet-stagehand/stagehand-docs`, applied via the `gh api` procedure this section describes,
reading every role ARN, the OIDC provider ARN, and the state bucket names from the real
`infra/bootstrap` outputs. Two platform-behavior notes from that real application, both worth
knowing before touching these Environments again:

- **Solo-maintainer self-review friction (known, intentional).** This repository currently has one
  named administrator (`@matthewrstone`, per CODEOWNERS). "Prevent self-review" blocks the same
  GitHub identity that triggered a run from approving its own pending deployment — for a solo
  maintainer this means `beta`, `stable`, and all three `-plan` Environments have no one able to
  approve a run they themselves triggered until a second trusted reviewer exists. This is the
  intended behavior of ADR-0002's multi-administrator design, not a bug to route around.
- **`prevent_self_review` cannot be set without at least one configured reviewer (platform
  constraint, confirmed live).** GitHub's environment-protection API rejects
  `prevent_self_review=true` with a 422 when no reviewers are configured. `testpilots` has no
  required reviewers by design (see the "Optional" row below), so its `prevent_self_review` cannot
  be technically enabled — this does not violate ADR-0002 rule 3 (LOCKED), which requires
  self-review prevention only on `stable` and treats it as a non-binding recommendation elsewhere.
  `beta` and `stable` both have a required reviewer configured, so `prevent_self_review` applies
  there without issue.

Create deployment/apply Environments named exactly `testpilots`, `beta`, and `stable`. For all
three, set the deployment branch policy to selected branches and allow `main` only. Do not allow
tags or arbitrary branches.

Configure protection as follows:

| Environment  | Required reviewers                           | Prevent self-review | Deployment branch |
| ------------ | -------------------------------------------- | ------------------- | ----------------- |
| `testpilots` | Optional for content or infrastructure apply | Recommended         | `main` only       |
| `beta`       | Required                                     | Recommended         | `main` only       |
| `stable`     | Required                                     | Required            | `main` only       |

Create three additional, least-privilege plan Environments named exactly `testpilots-plan`,
`beta-plan`, and `stable-plan`. Set each to selected branches and tags with the custom deployment
branch rule `refs/pull/*/merge`; do not allow `main`, tags, or other refs. GitHub evaluates a
`pull_request` workflow against its merge ref, so a `main`-only rule would prevent the plan job
from starting. Do not replace this workflow with `pull_request_target`: that event could expose AWS
authority while running untrusted pull-request code.

Configure every plan Environment with these protections:

| Environment       | Required reviewers            | Prevent self-review | Deployment branch        |
| ----------------- | ----------------------------- | ------------------- | ------------------------ |
| `testpilots-plan` | At least one trusted reviewer | Required            | `refs/pull/*/merge` only |
| `beta-plan`       | At least one trusted reviewer | Required            | `refs/pull/*/merge` only |
| `stable-plan`     | At least one trusted reviewer | Required            | `refs/pull/*/merge` only |

The workflow's job-level same-repository guard runs before a plan Environment is attached. The
Environment rule and the AWS role trust are additional controls, not substitutes for that guard.
Use the smallest trusted reviewer group that can validate the change and target account.

Before approving a plan job, the trusted reviewer must inspect the workflow and infrastructure
diff for unsafe code because the plan role can read sensitive infrastructure metadata.

## Set the required variables

Define only these variables in each matching plan Environment:

| Variable                           | Purpose                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| `AWS_REGION`                       | Regional AWS resources and the S3 state backend; currently `us-east-2` unless deliberately changed |
| `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN` | Read, refresh, state-lock, and describe-only role for pull-request plans                           |
| `OIDC_PROVIDER_ARN`                | Shared `github_oidc_provider_arn` bootstrap output                                                 |
| `HOSTED_ZONE_ID`                   | Route 53 hosted zone containing `puppet-stagehand.com`                                             |
| `TOFU_STATE_BUCKET`                | Matching `state_bucket_names` bootstrap output                                                     |

Define only these variables in each matching deployment/apply Environment:

| Variable                            | Purpose                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AWS_REGION`                        | Regional AWS resources and the S3 state backend; currently `us-east-2` unless deliberately changed                                                                                                                                                                                                                                                                |
| `AWS_DEPLOY_ROLE_ARN`               | Content upload and CloudFront invalidation role created by that environment's site stack                                                                                                                                                                                                                                                                          |
| `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN` | Protected role allowed to create, update, and delete that environment's infrastructure                                                                                                                                                                                                                                                                            |
| `OIDC_PROVIDER_ARN`                 | Shared `github_oidc_provider_arn` bootstrap output                                                                                                                                                                                                                                                                                                                |
| `HOSTED_ZONE_ID`                    | Route 53 hosted zone containing `puppet-stagehand.com`                                                                                                                                                                                                                                                                                                            |
| `TOFU_STATE_BUCKET`                 | Matching `state_bucket_names` bootstrap output                                                                                                                                                                                                                                                                                                                    |
| `CONTENT_BUCKET`                    | `content_bucket_name` output from the environment site stack                                                                                                                                                                                                                                                                                                      |
| `CLOUDFRONT_DISTRIBUTION_ID`        | `distribution_id` output from the environment site stack                                                                                                                                                                                                                                                                                                          |
| `SITE_CHECK_URL`                    | Bare hostname the post-deploy live-check targets (no `https://` prefix; the workflow adds it). `testpilots`'s real value is its `distribution_domain_name` bootstrap output, the CloudFront default domain — it stays pointed there until the deferred DNS cutover (D-01/D-03) makes the custom hostname reachable, at which point a future phase can repoint it. |

The deployment workflow uses the deployment/apply Environment's region, deploy role, content
bucket, and distribution ID. Infrastructure apply uses its apply role, OIDC provider, hosted zone,
and state bucket. Pull-request planning uses only the matching plan Environment and plan role. Do
not copy an apply or deploy role into a plan Environment, and do not copy a plan role into a
deployment/apply Environment.

Do not create AWS access-key secrets. The workflows request short-lived credentials through
GitHub OIDC and require only `id-token: write` plus the selected role ARN.

## Read the infrastructure roles from bootstrap

The bootstrap root now declares all six infrastructure roles — three plan roles and three apply
roles, one pair per Stagehand environment — as OpenTofu resources alongside the state buckets and
shared OIDC provider. Their ARNs are the `infrastructure_plan_role_arns` and
`infrastructure_apply_role_arns` bootstrap outputs, keyed by Stagehand environment. After bootstrap
is applied, read each environment's plan-role ARN from `infrastructure_plan_role_arns` and its
apply-role ARN from `infrastructure_apply_role_arns`, then copy each ARN into its matching GitHub
Environment — `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN` into the `-plan` Environment,
`AWS_INFRASTRUCTURE_APPLY_ROLE_ARN` into the unsuffixed Environment.

Trust each role only for the repository `puppet-stagehand/stagehand-docs` and its exact matching
GitHub Environment subject. Require `aud` to equal `sts.amazonaws.com`. The plan-role subjects are:

- `repo:puppet-stagehand/stagehand-docs:environment:testpilots-plan`
- `repo:puppet-stagehand/stagehand-docs:environment:beta-plan`
- `repo:puppet-stagehand/stagehand-docs:environment:stable-plan`

The apply- and deploy-role subjects use the corresponding environment without `-plan`:
`repo:puppet-stagehand/stagehand-docs:environment:testpilots`,
`repo:puppet-stagehand/stagehand-docs:environment:beta`, or
`repo:puppet-stagehand/stagehand-docs:environment:stable`. Never allow a wildcard Environment
name in a role trust policy.

Give the plan role only the permissions needed to read its state, acquire and release that state
lock, refresh known resources, and call relevant `Get`, `List`, and `Describe` operations. It must
not create, mutate, or delete site resources. Scope bucket permissions to the matching state
bucket and state key, including only the lock-object writes and deletes OpenTofu requires.

Give the apply role the same state access plus the minimum create, update, tag, and delete actions
required by the reviewed static-site module. Scope permissions by known ARNs, hosted zone,
resource-name prefixes, and two service-specific condition keys: `acm:DomainNames` on the
certificate request, and `route53:ChangeResourceRecordSetsNormalizedRecordNames` together with
`route53:ChangeResourceRecordSetsRecordTypes` on record changes. Do not share either role across
environments.

Five CloudFront actions have no IAM resource type and so cannot be scoped by any lever above:
`cloudfront:CreateDistribution`, `cloudfront:CreateCachePolicy`,
`cloudfront:CreateResponseHeadersPolicy`, `cloudfront:CreateOriginAccessControl`, and
`cloudfront:CreateFunction`. AWS grants these only on an unrestricted resource; this is a
limitation of the service, not a choice made here, and nothing in this repository can change it.
Three controls compensate for that residual and remain in force: bootstrap is applied by a human
and by no CI job; CODEOWNERS review is required on `/infra/`; and a second administrator reviews
the trust and permission policies before the ARNs are stored in GitHub.

Have a second administrator review the trust and permission policies before storing the ARNs in
GitHub.

## Enable private security reports

Enable private vulnerability reporting before publishing the repository. Open
**Settings → Security → Code security** and enable private
vulnerability reporting. Confirm that a non-maintainer can see **Security → Advisories → Report a
vulnerability**. For `security@puppet-stagehand.com`, the repository administrators must provision
the address, monitor it, and test delivery before publication. Record the successful test and
retest it after mail-provider or repository-ownership changes. Keep this fallback in
[SECURITY.md](../../SECURITY.md) current, and never redirect reporters to a public issue or
discussion.

## Verify configuration without changing AWS

Open a same-repository pull request that changes infrastructure. The Infrastructure workflow
always validates locally; configured protected environments also produce value-free plan
summaries. A missing variable causes planning to skip with a summary instead of exposing partial
credentials. The workflow never uploads a binary plan.

An infrastructure apply is a separate manual dispatch from the `main` workflow ref. It requires
the selected environment, the exact confirmation `apply`, its protected reviewers, and a fresh
plan created inside the apply job.
