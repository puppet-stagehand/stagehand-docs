variable "environment" {
  description = "Deployment environment."
  type        = string

  validation {
    condition     = contains(["testpilots", "beta", "stable"], var.environment)
    error_message = "environment must be testpilots, beta, or stable."
  }
}

variable "domain_name" {
  description = "Canonical DNS name for the site."
  type        = string

  validation {
    condition = (
      length(trimspace(var.domain_name)) > 0 &&
      length(var.domain_name) <= 253 &&
      var.domain_name == lower(var.domain_name) &&
      !strcontains(var.domain_name, " ") &&
      strcontains(var.domain_name, ".")
    )
    error_message = "domain_name must be a non-empty lowercase DNS name."
  }
}

variable "alternate_domain_names" {
  description = "Additional DNS names served by the distribution."
  type        = list(string)
  default     = []

  validation {
    condition = (
      length(distinct(var.alternate_domain_names)) == length(var.alternate_domain_names) &&
      alltrue([
        for name in var.alternate_domain_names :
        length(trimspace(name)) > 0 &&
        length(name) <= 253 &&
        name == lower(name) &&
        !strcontains(name, " ") &&
        strcontains(name, ".")
      ])
    )
    error_message = "alternate_domain_names must contain unique, non-empty lowercase DNS names."
  }
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone that owns all configured DNS names."
  type        = string

  validation {
    condition     = can(regex("^Z[A-Z0-9]+$", var.hosted_zone_id))
    error_message = "hosted_zone_id must be a non-empty Route 53 hosted zone ID."
  }
}

variable "github_repository" {
  description = "GitHub repository allowed to assume the deployment role."
  type        = string
  default     = "puppet-stagehand/stagehand-docs"

  validation {
    condition     = var.github_repository == "puppet-stagehand/stagehand-docs"
    error_message = "github_repository must be puppet-stagehand/stagehand-docs."
  }
}

# GitHub issues OIDC token `sub` claims using this org/repo's immutable
# numeric IDs, not the name-based "puppet-stagehand/stagehand-docs" slug —
# confirmed via `gh api repos/puppet-stagehand/stagehand-docs/actions/oidc/customization/sub`.
# Trust-policy `sub` conditions must match this exact prefix or every
# AssumeRoleWithWebIdentity call fails with "Not authorized to perform
# sts:AssumeRoleWithWebIdentity". `github_repository` above stays as the
# name-based slug for anything that isn't a trust-policy condition; only
# `github_repository_oidc_subject` feeds `token.actions.githubusercontent.com:sub`.
variable "github_repository_oidc_subject" {
  description = "GitHub's immutable-ID OIDC subject prefix (org@id/repo@id) for this repository, used only in the deploy role's trust-policy sub condition."
  type        = string
  default     = "puppet-stagehand@319121253/stagehand-docs@1342992313"

  validation {
    condition     = var.github_repository_oidc_subject == "puppet-stagehand@319121253/stagehand-docs@1342992313"
    error_message = "github_repository_oidc_subject must be puppet-stagehand@319121253/stagehand-docs@1342992313 (GitHub's immutable-ID OIDC subject prefix for this repo)."
  }
}

variable "github_oidc_provider_arn" {
  description = "ARN of the account's GitHub Actions OIDC provider."
  type        = string

  validation {
    condition     = can(regex("^arn:[^:]+:iam::[0-9]{12}:oidc-provider/token\\.actions\\.githubusercontent\\.com$", var.github_oidc_provider_arn))
    error_message = "github_oidc_provider_arn must be the ARN of the account GitHub Actions OIDC provider."
  }
}

variable "enable_redirect_function" {
  description = "Whether to associate the clean-path CloudFront Function."
  type        = bool
  default     = true
}

variable "enable_basic_auth" {
  description = "Temporary lockdown: require HTTP Basic Auth for every request via the same CloudFront Function used for redirects/clean paths. Off by default; each environment opts in explicitly while it's not ready for public traffic."
  type        = bool
  default     = false
}

variable "basic_auth_username" {
  description = "HTTP Basic Auth username, required when enable_basic_auth is true. Never committed to a tracked file; pass via TF_VAR_basic_auth_username."
  type        = string
  default     = ""
  sensitive   = true
}

variable "basic_auth_password" {
  description = "HTTP Basic Auth password, required when enable_basic_auth is true. Never committed to a tracked file; pass via TF_VAR_basic_auth_password."
  type        = string
  default     = ""
  sensitive   = true

  validation {
    condition     = !var.enable_basic_auth || length(var.basic_auth_password) >= 12
    error_message = "basic_auth_password must be at least 12 characters when enable_basic_auth is true."
  }
}
