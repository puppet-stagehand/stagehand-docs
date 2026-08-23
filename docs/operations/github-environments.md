# Configure protected GitHub Environments

This guide is for a repository administrator connecting GitHub Actions to an already bootstrapped
AWS account. After reading it, the administrator can configure all six environments without
long-lived AWS credentials and can keep planning authority separate from apply authority.

## Create the environments

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
| `HOSTED_ZONE_ID`                   | Route 53 hosted zone containing `puppetstagehand.com`                                              |
| `TOFU_STATE_BUCKET`                | Matching `state_bucket_names` bootstrap output                                                     |

Define only these variables in each matching deployment/apply Environment:

| Variable                            | Purpose                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `AWS_REGION`                        | Regional AWS resources and the S3 state backend; currently `us-east-2` unless deliberately changed |
| `AWS_DEPLOY_ROLE_ARN`               | Content upload and CloudFront invalidation role created by that environment's site stack           |
| `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN` | Protected role allowed to create, update, and delete that environment's infrastructure             |
| `OIDC_PROVIDER_ARN`                 | Shared `github_oidc_provider_arn` bootstrap output                                                 |
| `HOSTED_ZONE_ID`                    | Route 53 hosted zone containing `puppetstagehand.com`                                              |
| `TOFU_STATE_BUCKET`                 | Matching `state_bucket_names` bootstrap output                                                     |
| `CONTENT_BUCKET`                    | `content_bucket_name` output from the environment site stack                                       |
| `CLOUDFRONT_DISTRIBUTION_ID`        | `distribution_id` output from the environment site stack                                           |

The deployment workflow uses the deployment/apply Environment's region, deploy role, content
bucket, and distribution ID. Infrastructure apply uses its apply role, OIDC provider, hosted zone,
and state bucket. Pull-request planning uses only the matching plan Environment and plan role. Do
not copy an apply or deploy role into a plan Environment, and do not copy a plan role into a
deployment/apply Environment.

Do not create AWS access-key secrets. The workflows request short-lived credentials through
GitHub OIDC and require only `id-token: write` plus the selected role ARN.

## Provision separate infrastructure roles

The current OpenTofu bootstrap creates the state buckets and shared OIDC provider; the environment
site stack creates only its content deployment role. Neither creates
`AWS_INFRASTRUCTURE_PLAN_ROLE_ARN` nor `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN`. An authorized AWS
administrator must provision both after bootstrap and before enabling infrastructure automation.

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
resource-name prefixes, and the mandatory `project=stagehand` and matching `environment` tags
where AWS supports those conditions. Do not share either role across environments.

Have a second administrator review the trust and permission policies before storing the ARNs in
GitHub.

## Enable private security reports

Enable private vulnerability reporting before publishing the repository. Open
**Settings → Security → Code security** and enable private
vulnerability reporting. Confirm that a non-maintainer can see **Security → Advisories → Report a
vulnerability**. For `security@puppetstagehand.com`, the repository administrators must provision
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
