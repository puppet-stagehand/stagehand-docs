output "github_oidc_provider_arn" {
  description = "ARN of the shared GitHub Actions OIDC provider."
  value       = aws_iam_openid_connect_provider.github.arn
}

output "state_bucket_names" {
  description = "State bucket names keyed by Stagehand environment."
  value       = { for environment, bucket in aws_s3_bucket.state : environment => bucket.id }
}

output "infrastructure_plan_role_arns" {
  description = "Plan role ARNs keyed by Stagehand environment; paste into the matching -plan GitHub Environment."
  value       = { for environment, role in aws_iam_role.infrastructure_plan : environment => role.arn }
}

output "infrastructure_apply_role_arns" {
  description = "Apply role ARNs keyed by Stagehand environment; paste into the matching apply GitHub Environment."
  value       = { for environment, role in aws_iam_role.infrastructure_apply : environment => role.arn }
}
