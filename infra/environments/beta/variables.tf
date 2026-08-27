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
