# Bootstrap and apply the AWS site

This runbook is for an operator establishing the three Stagehand environments in an AWS account.
After reading it, the operator can create remote state, review every planned change and required
tag, and deliberately apply one environment at a time.

## Before you begin

Use OpenTofu 1.12 and an AWS CLI identity authorized to create the bootstrap resources.
Authenticate with the organization's approved short-lived method (`aws sso login` when AWS IAM
Identity Center is configured), then confirm the intended account before every plan or apply:

```sh
aws sts get-caller-identity
```

The bootstrap requires initial local administrative authority. It creates three private,
versioned state buckets, the shared GitHub OIDC provider, and the six plan and apply IAM roles
used by the infrastructure workflow, scoped per the least-privilege model in the
[GitHub Environments guide](github-environments.md).

S3 bucket names are globally unique. Choose account- or organization-scoped names, without
putting an AWS account number or credential in Git.

## 1. Create the shared bootstrap resources

The Route 53 public hosted zone for `puppetstagehand.com` does not exist by default; this
repository's OpenTofu never creates it, so create it first:

```sh
aws route53 create-hosted-zone --name puppetstagehand.com --caller-reference "<unique-value>"
```

The returned `HostedZone.Id` (with its `/hostedzone/` prefix stripped) is the value
`hosted_zone_id` expects below. Creating this zone does not delegate the live domain to it —
`puppetstagehand.com`'s registrar/NS records keep pointing wherever they already do until a
separate, deliberate, human-driven cutover happens later. The zone exists inert until then; see
phase 2's `02-CONTEXT.md` decisions D-01 through D-03 for the full reasoning.

Bootstrap also expects a GitHub Actions OIDC provider for
`https://token.actions.githubusercontent.com` to already exist in the target AWS account —
`infra/bootstrap/main.tf` looks it up with a data source rather than creating one, because an
account can only have one such provider per URL and this one may already be owned by another
product sharing the account. If the account genuinely has none yet, create it once, out of band,
before the first bootstrap apply.

Copy the ignored values file, edit all three bucket names and the `hosted_zone_id` entry — the
public hosted zone for `puppetstagehand.com` — in the same pass. `hosted_zone_id` is a required
variable with no default; supply it either by filling in that `terraform.tfvars` entry or by
exporting `TF_VAR_hosted_zone_id` in the shell that runs the plan — either path is sufficient, but
the `plan` command below aborts without one. Then initialize and review a saved plan:

```sh
cp infra/bootstrap/terraform.tfvars.example infra/bootstrap/terraform.tfvars
tofu -chdir=infra/bootstrap init
tofu -chdir=infra/bootstrap plan -out=bootstrap.tfplan
tofu -chdir=infra/bootstrap show bootstrap.tfplan
tofu -chdir=infra/bootstrap apply bootstrap.tfplan
tofu -chdir=infra/bootstrap output -raw github_oidc_provider_arn
tofu -chdir=infra/bootstrap output -json state_bucket_names | jq -r '.testpilots'
tofu -chdir=infra/bootstrap output -json state_bucket_names | jq -r '.beta'
tofu -chdir=infra/bootstrap output -json state_bucket_names | jq -r '.stable'
tofu -chdir=infra/bootstrap output -json infrastructure_plan_role_arns
tofu -chdir=infra/bootstrap output -json infrastructure_apply_role_arns
rm -f infra/bootstrap/bootstrap.tfplan
```

Saved plan files are sensitive because they can contain account-specific or sensitive planned
values. Delete each saved plan immediately after its apply or final review; do not archive, attach,
or commit it. The cleanup command above removes the bootstrap plan after its last required use.

Record the `github_oidc_provider_arn`, the three `state_bucket_names` outputs, and the six role
ARNs from `infrastructure_plan_role_arns` and `infrastructure_apply_role_arns` in the protected
configuration system without display quotes. Do not commit the copied values or state.

Each captured plan-role ARN goes into its matching `-plan` GitHub Environment as
`AWS_INFRASTRUCTURE_PLAN_ROLE_ARN`; each captured apply-role ARN goes into its matching unsuffixed
GitHub Environment as `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN`. Never copy an ARN between environments.
The six GitHub Environments do not exist yet — creating them is Phase 2 work — so treat this as
instruction for when they do.

The local bootstrap state is a sensitive foundational asset: it owns the remote-state buckets and
shared OIDC provider. Before the first apply, designate one accountable owner and allow one active writer.
Choose an organization-approved custody location that is encrypted, access-controlled, and
versioned. Store `terraform.tfstate` and any backup immediately after each bootstrap change;
never leave the only copy on an operator workstation or create competing writable copies.

The custodian must periodically perform and record a restore test in an isolated, access-controlled
workspace. Initialize the same bootstrap configuration, restore a copy of the state, and use
read-only `tofu state list` and `tofu plan` inspection; do not apply during the restore test. If the
state is lost, stop before re-applying. Restore the approved copy first. If no restorable copy
exists, inventory the existing buckets, their supporting controls, and the OIDC provider, then use
`tofu import` for every corresponding resource address. Review a no-surprise plan with a second
administrator before any later apply.

## 2. Configure one environment backend

Start with `testpilots`, then repeat the same procedure for `beta` and `stable`. Copy the backend
example to its ignored runtime filename and set `bucket` to the matching bootstrap output. Keep
the state key `stagehand-docs/terraform.tfstate`, `encrypt = true`, and `use_lockfile = true`.

```sh
cp infra/environments/testpilots/backend.hcl.example infra/environments/testpilots/backend.hcl
tofu -chdir=infra/environments/testpilots init -backend-config=backend.hcl
```

Provide the hosted zone ID and bootstrap OIDC provider ARN without writing them into tracked
files:

```sh
export TF_VAR_hosted_zone_id='the-hosted-zone-id'
export TF_VAR_github_oidc_provider_arn='the-bootstrap-oidc-provider-arn'
```

Use your secret manager or protected CI variables for durable storage. The quoted values above
are descriptions, not values to copy.

## 3. Plan, review tags, and apply

Create and inspect a fresh saved plan. The static policy check verifies that both AWS providers
and all module resources enforce `project=stagehand` and the literal environment tag.

```sh
./scripts/check-tofu-tags.sh
tofu -chdir=infra/environments/testpilots plan -out=tfplan
tofu -chdir=infra/environments/testpilots show tfplan
tofu -chdir=infra/environments/testpilots apply tfplan
rm -f infra/environments/testpilots/tfplan
```

Delete the environment's saved plan after apply, or immediately after review when no apply will
follow. Run the equivalent cleanup path for `beta` and `stable`. CI-generated `plan-summary.txt`
files are temporary review output and must also be deleted after review rather than retained.

Before applying, inspect every create, update, replacement, deletion, Route 53 record, and tag.
Stop if a taggable environment resource lacks either required tag. Repeat with the `beta` root,
then the `stable` root. Applying `stable` creates the public records for
`www.puppetstagehand.com` and the apex redirect, so treat that apply as a deliberate DNS cutover.

After each apply, capture the values needed by its GitHub Environment:

```sh
tofu -chdir=infra/environments/testpilots output -raw content_bucket_name
tofu -chdir=infra/environments/testpilots output -raw distribution_id
tofu -chdir=infra/environments/testpilots output -raw deployment_role_arn
```

Store these as `CONTENT_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, and `AWS_DEPLOY_ROLE_ARN`
respectively, without display quotes. Repeat for beta and stable; never copy an output from one
environment into another.

## 4. Audit applied tags

Set `AWS_REGION` to the configured regional-provider region. First enumerate every resource the
Tagging API can see with `project=stagehand` in that region and in `us-east-1`, where the ACM
certificate lives. Review this unfiltered inventory for missing or unexpected environment tags:

```sh
aws resourcegroupstaggingapi get-resources --region "$AWS_REGION" --tag-filters Key=project,Values=stagehand
aws resourcegroupstaggingapi get-resources --region us-east-1 --tag-filters Key=project,Values=stagehand
```

Then run filtered presence checks for each environment in both regional passes:

```sh
aws resourcegroupstaggingapi get-resources --region "$AWS_REGION" --tag-filters Key=project,Values=stagehand Key=environment,Values=testpilots
aws resourcegroupstaggingapi get-resources --region "$AWS_REGION" --tag-filters Key=project,Values=stagehand Key=environment,Values=beta
aws resourcegroupstaggingapi get-resources --region "$AWS_REGION" --tag-filters Key=project,Values=stagehand Key=environment,Values=stable
aws resourcegroupstaggingapi get-resources --region us-east-1 --tag-filters Key=project,Values=stagehand Key=environment,Values=testpilots
aws resourcegroupstaggingapi get-resources --region us-east-1 --tag-filters Key=project,Values=stagehand Key=environment,Values=beta
aws resourcegroupstaggingapi get-resources --region us-east-1 --tag-filters Key=project,Values=stagehand Key=environment,Values=stable
```

Filtered results prove tag presence only; they cannot show a project resource whose environment
tag is absent. Compare the unfiltered inventory and every filtered result with the reviewed plan
and state. The Tagging API also omits some global or unsupported resource types, so complete the
audit by comparing the plan/state resource list and inspecting those services directly.

## Safety boundary

Creating, validating, or testing this scaffold does not run `tofu apply` and does not perform a
DNS cutover. Only an operator running the explicit apply commands above—or approving the
protected infrastructure workflow—changes AWS. No scaffold task has performed a DNS cutover.

As of phase 2, `infra/bootstrap/` has been applied for real: the hosted zone, three state
buckets, and the six plan/apply IAM roles exist in AWS under a confirmed non-root identity. This
does not extend to `testpilots`, `beta`, or `stable` — those environment applies remain separate,
later plans/phases, and the live domain's NS delegation still has not moved.
