variable "aws_region" {
  description = "AWS region for regional site resources."
  type        = string
  default     = "us-east-2"
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for puppet-stagehand.com."
  type        = string
}

variable "github_oidc_provider_arn" {
  description = "ARN output by the shared bootstrap stack."
  type        = string
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
