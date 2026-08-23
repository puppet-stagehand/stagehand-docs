output "content_bucket_name" {
  description = "Name of the private content bucket."
  value       = aws_s3_bucket.content.id
}

output "distribution_id" {
  description = "CloudFront distribution ID used for deployments."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_domain_name" {
  description = "CloudFront-assigned distribution domain name."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "deployment_role_arn" {
  description = "ARN of the GitHub Actions content deployment role."
  value       = aws_iam_role.deploy.arn
}

output "certificate_arn" {
  description = "ARN of the validated us-east-1 ACM certificate."
  value       = aws_acm_certificate_validation.site.certificate_arn
}
