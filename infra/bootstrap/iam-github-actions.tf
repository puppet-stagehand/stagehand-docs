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

# Adapted from infra/modules/static-site/iam.tf:4-20 (the shipped, reviewed shape),
# same trust-policy structure as aws_iam_role.infrastructure_plan above, with the
# unsuffixed environment subject per ADR-0003 rule 2.
resource "aws_iam_role" "infrastructure_apply" {
  for_each = local.site

  name = "stagehand-${each.key}-infrastructure-apply"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "GitHubActionsApplyEnvironment"
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${local.github_repository}:environment:${each.key}"
        }
      }
    }]
  })

  tags = merge(local.required_tags, { environment = each.key })
}

# Apply-time authority: everything the reviewed static-site module needs to
# create, update, tag, and delete its own environment's resources, scoped as
# tightly as AWS permits and no tighter. See RESEARCH § Code Examples Pattern 5
# for the verified action inventory and scoping levers.
resource "aws_iam_role_policy" "infrastructure_apply" {
  for_each = local.site

  name = "stagehand-${each.key}-infrastructure-apply"
  role = aws_iam_role.infrastructure_apply[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # --- State: the plan role's three statements verbatim, plus exactly one
      # addition (WriteStateObject) — the whole difference in state authority
      # between the two tiers. Delete authority stays confined to the lock
      # object; the apply role must never be able to delete the state object.
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
        Sid      = "WriteStateObject"
        Effect   = "Allow"
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.state[each.key].arn}/stagehand-docs/terraform.tfstate"
      },
      # --- Content bucket: bucket-level create/manage verbs plus the Get* reads
      # `tofu refresh` issues, all scoped to this environment's name prefix only.
      # The trailing hyphen before the wildcard is load-bearing: the module
      # creates the bucket from bucket_prefix = "stagehand-${var.environment}-site-".
      {
        Sid    = "ManageSiteBucket"
        Effect = "Allow"
        Action = [
          "s3:CreateBucket",
          "s3:DeleteBucket",
          "s3:ListBucket",
          "s3:ListBucketVersions",
          "s3:GetBucketLocation",
          "s3:GetBucketTagging",
          "s3:PutBucketTagging",
          "s3:GetBucketPolicy",
          "s3:PutBucketPolicy",
          "s3:DeleteBucketPolicy",
          "s3:GetBucketVersioning",
          "s3:PutBucketVersioning",
          "s3:GetBucketPublicAccessBlock",
          "s3:PutBucketPublicAccessBlock",
          "s3:GetBucketOwnershipControls",
          "s3:PutBucketOwnershipControls",
          "s3:GetEncryptionConfiguration",
          "s3:PutEncryptionConfiguration",
          "s3:GetLifecycleConfiguration",
          "s3:PutLifecycleConfiguration",
          "s3:GetBucketAcl",
          "s3:GetBucketCORS",
          "s3:GetBucketWebsite",
          "s3:GetBucketLogging",
          "s3:GetAccelerateConfiguration",
          "s3:GetBucketRequestPayment",
          "s3:GetReplicationConfiguration",
          "s3:GetBucketObjectLockConfiguration",
          "s3:GetBucketNotification",
        ]
        Resource = "arn:${data.aws_partition.current.partition}:s3:::stagehand-${each.key}-site-*"
      },
      # --- Deploy role: exactly the one named role the static-site module
      # creates. Never widened to the role-name wildcard, never an IAM wildcard action, no
      # role-passing action, no role-assumption action — nothing in the module
      # passes or assumes a role, so either would widen the blast radius for no
      # benefit.
      {
        Sid    = "ManageSiteDeployRole"
        Effect = "Allow"
        Action = [
          "iam:CreateRole",
          "iam:GetRole",
          "iam:DeleteRole",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:ListRoleTags",
          "iam:UpdateAssumeRolePolicy",
          "iam:PutRolePolicy",
          "iam:GetRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:ListInstanceProfilesForRole",
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
