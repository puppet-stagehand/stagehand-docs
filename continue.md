# Continue — Stagehand docs AWS publication

## Last action

Pushed `c1917d0` to `main`; GitHub validation and deployment workflows passed, but the deploy job skipped its AWS steps because the `testpilots` GitHub Environment variables are not configured.

## Next action

Run the documented OpenTofu bootstrap and `testpilots` environment apply with an authorized AWS identity, then set the resulting outputs as the matching GitHub Environment variables and rerun the Deploy site workflow.

## Why

The OpenTofu module creates the S3 bucket, CloudFront distribution, DNS, certificate, and content deployment role. The workflow intentionally gates deployment until `AWS_DEPLOY_ROLE_ARN`, `CONTENT_BUCKET`, and `CLOUDFRONT_DISTRIBUTION_ID` are present.

## Open threads

- Bootstrap also requires an initial local AWS authority and creates state buckets plus the GitHub OIDC provider.
- The infrastructure plan/apply IAM roles are not created by the current OpenTofu bootstrap; provision them separately if infrastructure automation is needed.
- `testpilots.puppetstagehand.com` and `beta.puppetstagehand.com` did not resolve during the final endpoint check because DNS/resources have not been applied.

## Do not

- Do not claim the public site is live until the deploy job's `Upload site` step actually runs and the DNS endpoint resolves.
- Do not commit AWS account identifiers, credentials, state files, plans, or copied `terraform.tfvars`/`backend.hcl` values.
- Do not run `tofu apply` without reviewing a saved plan and confirming the intended AWS account and DNS changes.

## References

- `docs/operations/aws-bootstrap.md`
- `docs/operations/github-environments.md`
- `.github/workflows/deploy.yml`
- `.github/workflows/infrastructure.yml`
