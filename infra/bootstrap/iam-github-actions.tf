data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

# Adapted from infra/modules/static-site/iam.tf:4-20 (the shipped, reviewed shape).
resource "aws_iam_role" "infrastructure_plan" {
  for_each = local.site

  name = "stagehand-${each.key}-infrastructure-plan"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "GitHubActionsPlanEnvironment"
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${local.github_repository}:environment:${each.key}-plan"
        }
      }
    }]
  })

  tags = merge(local.required_tags, { environment = each.key })
}

# Read-only plan-time authority only: state read plus lock hold/release, and the
# Get/List/Describe calls `tofu refresh` issues against already-created site
# resources. No create, update, delete, tag, role-passing, or role-assumption
# action of any kind belongs here — that authority is the apply role's alone
# (plan 01-02).
resource "aws_iam_role_policy" "infrastructure_plan" {
  for_each = local.site

  name = "stagehand-${each.key}-infrastructure-plan"
  role = aws_iam_role.infrastructure_plan[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ListStateBucket"
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.state[each.key].arn
      },
      {
        Sid    = "ReadStateAndLock"
        Effect = "Allow"
        Action = "s3:GetObject"
        Resource = [
          "${aws_s3_bucket.state[each.key].arn}/stagehand-docs/terraform.tfstate",
          "${aws_s3_bucket.state[each.key].arn}/stagehand-docs/terraform.tfstate.tflock",
        ]
      },
      {
        Sid      = "HoldStateLock"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.state[each.key].arn}/stagehand-docs/terraform.tfstate.tflock"
      },
      {
        Sid    = "ReadSiteBucket"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:GetBucketTagging",
          "s3:GetBucketVersioning",
          "s3:GetBucketPublicAccessBlock",
          "s3:GetBucketOwnershipControls",
          "s3:GetEncryptionConfiguration",
          "s3:GetLifecycleConfiguration",
          "s3:GetBucketPolicy",
          "s3:GetBucketAcl",
        ]
        Resource = "arn:${data.aws_partition.current.partition}:s3:::stagehand-${each.key}-site-*"
      },
      {
        Sid    = "ReadSiteDistribution"
        Effect = "Allow"
        Action = [
          "cloudfront:GetDistribution",
          "cloudfront:GetDistributionConfig",
          "cloudfront:ListTagsForResource",
        ]
        Resource = "arn:${data.aws_partition.current.partition}:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/*"
      },
      {
        Sid      = "ReadSiteCachePolicies"
        Effect   = "Allow"
        Action   = "cloudfront:GetCachePolicy"
        Resource = "arn:${data.aws_partition.current.partition}:cloudfront::${data.aws_caller_identity.current.account_id}:cache-policy/*"
      },
      {
        Sid      = "ReadSiteResponseHeadersPolicies"
        Effect   = "Allow"
        Action   = "cloudfront:GetResponseHeadersPolicy"
        Resource = "arn:${data.aws_partition.current.partition}:cloudfront::${data.aws_caller_identity.current.account_id}:response-headers-policy/*"
      },
      {
        Sid      = "ReadSiteOriginAccessControls"
        Effect   = "Allow"
        Action   = "cloudfront:GetOriginAccessControl"
        Resource = "arn:${data.aws_partition.current.partition}:cloudfront::${data.aws_caller_identity.current.account_id}:origin-access-control/*"
      },
      {
        Sid    = "ReadSiteFunction"
        Effect = "Allow"
        Action = [
          "cloudfront:DescribeFunction",
          "cloudfront:GetFunction",
        ]
        Resource = "arn:${data.aws_partition.current.partition}:cloudfront::${data.aws_caller_identity.current.account_id}:function/stagehand-${each.key}-site-paths"
      },
      {
        Sid    = "ReadSiteCertificate"
        Effect = "Allow"
        Action = [
          "acm:DescribeCertificate",
          "acm:ListCertificates",
          "acm:ListTagsForCertificate",
        ]
        Resource = "arn:${data.aws_partition.current.partition}:acm:*:${data.aws_caller_identity.current.account_id}:certificate/*"
      },
      {
        Sid    = "ReadHostedZone"
        Effect = "Allow"
        Action = [
          "route53:GetHostedZone",
          "route53:ListResourceRecordSets",
        ]
        Resource = "arn:${data.aws_partition.current.partition}:route53:::hostedzone/${var.hosted_zone_id}"
      },
      {
        Sid      = "ReadRoute53Changes"
        Effect   = "Allow"
        Action   = "route53:GetChange"
        Resource = "arn:${data.aws_partition.current.partition}:route53:::change/*"
      },
      {
        Sid    = "ReadSiteDeployRole"
        Effect = "Allow"
        Action = [
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:ListInstanceProfilesForRole",
          "iam:ListRoleTags",
        ]
        Resource = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/stagehand-${each.key}-site-deploy"
      },
      {
        Sid      = "GetCallerIdentity"
        Effect   = "Allow"
        Action   = "sts:GetCallerIdentity"
        Resource = "*"
      },
    ]
  })
}
