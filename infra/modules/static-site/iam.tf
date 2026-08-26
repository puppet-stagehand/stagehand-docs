resource "aws_iam_role" "deploy" {
  name = "stagehand-${var.environment}-site-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "GitHubActionsEnvironment"
      Effect = "Allow"
      Principal = {
        Federated = var.github_oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository_oidc_subject}:environment:${var.environment}"
        }
      }
    }]
  })

  tags = local.required_tags
}

resource "aws_iam_role_policy" "deploy" {
  name = "stagehand-${var.environment}-site-deploy"
  role = aws_iam_role.deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ListContentBucket"
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.content.arn
      },
      {
        Sid    = "DeployContentObjects"
        Effect = "Allow"
        Action = [
          "s3:DeleteObject",
          "s3:GetObject",
          "s3:PutObject",
        ]
        Resource = "${aws_s3_bucket.content.arn}/*"
      },
      {
        Sid      = "InvalidateSiteDistribution"
        Effect   = "Allow"
        Action   = "cloudfront:CreateInvalidation"
        Resource = aws_cloudfront_distribution.site.arn
      },
    ]
  })
}
