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
versioned state buckets and the shared GitHub OIDC provider. It does **not** create the plan and
apply roles used by the infrastructure workflow; provision those roles separately with the
least-privilege model in the [GitHub Environments guide](github-environments.md).

S3 bucket names are globally unique. Choose account- or organization-scoped names, without
putting an AWS account number or credential in Git.

## 1. Create the shared bootstrap resources

Copy the ignored values file, edit all three bucket names, initialize, and review a saved plan:

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
rm -f infra/bootstrap/bootstrap.tfplan
```

Saved plan files are sensitive because they can contain account-specific or sensitive planned
values. Delete each saved plan immediately after its apply or final review; do not archive, attach,
or commit it. The cleanup command above removes the bootstrap plan after its last required use.

Record the `github_oidc_provider_arn` and the three `state_bucket_names` outputs in the protected
configuration system without display quotes. Do not commit the copied values or state.

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
protected infrastructure workflow—changes AWS. No scaffold task has performed an AWS apply or
DNS cutover.
