# Configure protected GitHub Environments

This guide is for a repository administrator connecting GitHub Actions to an already bootstrapped
AWS account. After reading it, the administrator can configure all three environments without
long-lived AWS credentials and can keep planning authority separate from apply authority.

## Create the environments

Create GitHub Environments named exactly `testpilots`, `beta`, and `stable`. For all three, set the
deployment branch policy to selected branches and allow `main` only. Do not allow tags or arbitrary
branches.

Configure protection as follows:

| Environment  | Required reviewers                                                | Prevent self-review | Deployment branch |
| ------------ | ----------------------------------------------------------------- | ------------------- | ----------------- |
| `testpilots` | Optional for content; recommended when it grants plan credentials | Recommended         | `main` only       |
| `beta`       | Required                                                          | Recommended         | `main` only       |
| `stable`     | Required                                                          | Required            | `main` only       |

Use the smallest trusted reviewer group that can validate the change and target account. Keep
credentialed plan environments protected: at minimum restrict them to trusted same-repository
pull requests and authorized maintainers, and consider required reviewers where the plan role can
read sensitive infrastructure metadata.

## Set the required variables

Define these GitHub Environment variables in each of the three environments:

| Variable                            | Purpose                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `AWS_REGION`                        | Regional AWS resources and the S3 state backend; currently `us-east-2` unless deliberately changed |
| `AWS_DEPLOY_ROLE_ARN`               | Content upload and CloudFront invalidation role created by that environment's site stack           |
| `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN`  | Read, refresh, state-lock, and describe-only role for pull-request plans                           |
| `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN` | Protected role allowed to create, update, and delete that environment's infrastructure             |
| `OIDC_PROVIDER_ARN`                 | Shared `github_oidc_provider_arn` bootstrap output                                                 |
| `HOSTED_ZONE_ID`                    | Route 53 hosted zone containing `puppetstagehand.com`                                              |
| `TOFU_STATE_BUCKET`                 | Matching `state_bucket_names` bootstrap output                                                     |
| `CONTENT_BUCKET`                    | `content_bucket_name` output from the environment site stack                                       |
| `CLOUDFRONT_DISTRIBUTION_ID`        | `distribution_id` output from the environment site stack                                           |

The deployment workflow uses the region, deploy role, content bucket, and distribution ID. The
infrastructure workflow uses the region, both infrastructure roles, OIDC provider, hosted zone,
and state bucket. Keep the full set on every environment so either workflow fails or skips safely
instead of crossing environment boundaries.

Do not create AWS access-key secrets. The workflows request short-lived credentials through
GitHub OIDC and require only `id-token: write` plus the selected role ARN.

## Provision separate infrastructure roles

The current OpenTofu bootstrap creates the state buckets and shared OIDC provider; the environment
site stack creates only its content deployment role. Neither creates
`AWS_INFRASTRUCTURE_PLAN_ROLE_ARN` nor `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN`. An authorized AWS
administrator must provision both after bootstrap and before enabling infrastructure automation.

Trust each role only for the repository `puppet-stagehand/stagehand-docs` and the matching GitHub
Environment subject. Require the expected `aud` value (`sts.amazonaws.com`) and environment name
in the OIDC trust conditions.

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

## Verify configuration without changing AWS

Open a same-repository pull request that changes infrastructure. The Infrastructure workflow
always validates locally; configured protected environments also produce value-free plan
summaries. A missing variable causes planning to skip with a summary instead of exposing partial
credentials. The workflow never uploads a binary plan.

An infrastructure apply is a separate manual dispatch from the `main` workflow ref. It requires
the selected environment, the exact confirmation `apply`, its protected reviewers, and a fresh
plan created inside the apply job.
