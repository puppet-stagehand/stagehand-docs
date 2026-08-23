output "github_oidc_provider_arn" {
  description = "ARN of the shared GitHub Actions OIDC provider."
  value       = aws_iam_openid_connect_provider.github.arn
}

output "state_bucket_names" {
  description = "State bucket names keyed by Stagehand environment."
  value       = { for environment, bucket in aws_s3_bucket.state : environment => bucket.id }
}
