variable "aws_region" {
  description = "AWS region for regional site resources."
  type        = string
  default     = "us-east-2"
}

# Was originally the Route 53 hosted zone 02-01 (phase 02-first-real-publication,
# plan 01) created for puppetstagehand.com (Z00971888M7QXUPNS7H8). Mid-phase-05,
# the domain changed to puppet-stagehand.com (Cloudflare's registrar tier does
# not support custom nameservers), registered directly through Route 53
# Registrar with its own hosted zone (Z038247013307I1BORY2O) — this
# environment root never creates or owns the zone itself, only records within
# it (see infra/bootstrap/main.tf for the zone resource).
variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for puppet-stagehand.com."
  type        = string
}

variable "github_oidc_provider_arn" {
  description = "ARN output by the shared bootstrap stack."
  type        = string
}

# See infra/modules/static-site/variables.tf's github_repository_oidc_subject
# for why this immutable-ID form (not the name-based slug) is required in the
# deploy role's trust-policy sub condition.
variable "github_repository_oidc_subject" {
  description = "GitHub's immutable-ID OIDC subject prefix (org@id/repo@id) for this repository, passed through to the static-site module."
  type        = string
  default     = "puppet-stagehand@319121253/stagehand-docs@1342992313"

  validation {
    condition     = var.github_repository_oidc_subject == "puppet-stagehand@319121253/stagehand-docs@1342992313"
    error_message = "github_repository_oidc_subject must be puppet-stagehand@319121253/stagehand-docs@1342992313 (GitHub's immutable-ID OIDC subject prefix for this repo)."
  }
}

variable "basic_auth_username" {
  description = "Temporary-lockdown HTTP Basic Auth username. Never committed to a tracked file; pass via TF_VAR_basic_auth_username."
  type        = string
  sensitive   = true
  default     = ""
}

variable "basic_auth_password" {
  description = "Temporary-lockdown HTTP Basic Auth password. Never committed to a tracked file; pass via TF_VAR_basic_auth_password."
  type        = string
  sensitive   = true
  default     = ""
}
