variable "aws_region" {
  description = "AWS region for the OpenTofu state buckets."
  type        = string
  default     = "us-east-2"

  validation {
    condition     = can(regex("^[a-z]{2}(-gov)?-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "aws_region must be a valid AWS region name."
  }
}

variable "state_bucket_names" {
  description = "Globally unique S3 bucket names, one for each Stagehand environment."
  type        = map(string)

  validation {
    condition = (
      length(setsubtract(toset(keys(var.state_bucket_names)), toset(["testpilots", "beta", "stable"]))) == 0 &&
      length(setsubtract(toset(["testpilots", "beta", "stable"]), toset(keys(var.state_bucket_names)))) == 0 &&
      length(distinct(values(var.state_bucket_names))) == 3 &&
      alltrue([
        for name in values(var.state_bucket_names) :
        can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", name)) &&
        !can(regex("\\.\\.", name)) &&
        !can(regex("^[0-9]{1,3}(\\.[0-9]{1,3}){3}$", name)) &&
        alltrue([
          for prefix in ["xn--", "sthree-", "amzn-s3-demo-"] :
          !startswith(name, prefix)
        ]) &&
        alltrue([
          for suffix in ["-s3alias", "--ol-s3", ".mrap", "--x-s3", "--table-s3"] :
          !endswith(name, suffix)
        ])
      ])
    )
    error_message = "state_bucket_names must contain exactly testpilots, beta, and stable with three unique valid S3 bucket names."
  }
}

variable "github_repository" {
  description = "GitHub repository allowed to assume the infrastructure plan and apply roles."
  type        = string
  default     = "puppet-stagehand/stagehand-docs"

  validation {
    condition     = var.github_repository == "puppet-stagehand/stagehand-docs"
    error_message = "github_repository must be puppet-stagehand/stagehand-docs."
  }
}

# GitHub issues OIDC token `sub` claims using this org/repo's immutable
# numeric IDs, not the name-based "puppet-stagehand/stagehand-docs" slug —
# confirmed via `gh api repos/puppet-stagehand/stagehand-docs/actions/oidc/customization/sub`
# (use_immutable_subject: false is the *token format* default; GitHub's actual
# sub claim still carries the "org@id/repo@id" prefix for this org/repo, with
# no org-level override present). Trust-policy `sub` conditions must match
# this exact prefix or every AssumeRoleWithWebIdentity call fails with
# "Not authorized to perform sts:AssumeRoleWithWebIdentity", regardless of how
# correct the name-based condition looks on paper. `github_repository` above
# stays as the name-based slug for anything that isn't a trust-policy
# condition; only `github_repository_oidc_subject` feeds `token.actions.githubusercontent.com:sub`.
variable "github_repository_oidc_subject" {
  description = "GitHub's immutable-ID OIDC subject prefix (org@id/repo@id) for this repository, used only in trust-policy sub conditions."
  type        = string
  default     = "puppet-stagehand@319121253/stagehand-docs@1342992313"

  validation {
    condition     = var.github_repository_oidc_subject == "puppet-stagehand@319121253/stagehand-docs@1342992313"
    error_message = "github_repository_oidc_subject must be puppet-stagehand@319121253/stagehand-docs@1342992313 (GitHub's immutable-ID OIDC subject prefix for this repo)."
  }
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone that owns every Stagehand DNS name."
  type        = string

  validation {
    condition     = can(regex("^Z[A-Z0-9]{1,31}$", var.hosted_zone_id))
    error_message = "hosted_zone_id must be a valid Route 53 hosted zone ID."
  }
}
