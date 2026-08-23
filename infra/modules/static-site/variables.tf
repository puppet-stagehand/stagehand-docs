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
