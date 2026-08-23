mock_provider "aws" {
  mock_resource "aws_cloudfront_function" {
    defaults = {
      arn = "arn:aws:cloudfront::123456789012:function/stagehand-beta-site-paths"
    }
  }

  mock_resource "aws_cloudfront_distribution" {
    defaults = {
      arn = "arn:aws:cloudfront::123456789012:distribution/E1234567890"
    }
  }

  mock_resource "aws_s3_bucket" {
    defaults = {
      arn = "arn:aws:s3:::stagehand-beta-site-test"
    }
  }
}

mock_provider "aws" {
  alias = "us_east_1"

  mock_resource "aws_acm_certificate" {
    defaults = {
      arn = "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000"
    }
  }

}

variables {
  environment              = "beta"
  domain_name              = "beta.puppetstagehand.com"
  alternate_domain_names   = ["docs-beta.puppetstagehand.com"]
  hosted_zone_id           = "Z0123456789ABC"
  github_oidc_provider_arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
  enable_redirect_function = true
}

run "rejects_unknown_environment" {
  command = plan

  variables {
    environment = "development"
  }

  expect_failures = [var.environment]
}

run "applies_required_tags_to_every_taggable_resource" {
  command = plan

  assert {
    condition     = aws_s3_bucket.content.tags == tomap({ project = "stagehand", environment = "beta" })
    error_message = "The content bucket must have only the authoritative required tags."
  }

  assert {
    condition     = aws_acm_certificate.site.tags == tomap({ project = "stagehand", environment = "beta" })
    error_message = "The ACM certificate must have only the authoritative required tags."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.tags == tomap({ project = "stagehand", environment = "beta" })
    error_message = "The CloudFront distribution must have only the authoritative required tags."
  }

  assert {
    condition     = aws_cloudfront_function.redirect[0].tags == tomap({ project = "stagehand", environment = "beta" })
    error_message = "The CloudFront Function must have only the authoritative required tags."
  }

  assert {
    condition     = aws_iam_role.deploy.tags == tomap({ project = "stagehand", environment = "beta" })
    error_message = "The deployment role must have only the authoritative required tags."
  }
}

run "keeps_the_content_bucket_private_encrypted_and_versioned" {
  command = plan

  assert {
    condition = (
      aws_s3_bucket_public_access_block.content.block_public_acls &&
      aws_s3_bucket_public_access_block.content.block_public_policy &&
      aws_s3_bucket_public_access_block.content.ignore_public_acls &&
      aws_s3_bucket_public_access_block.content.restrict_public_buckets
    )
    error_message = "All S3 public-access blocks must be enabled."
  }

  assert {
    condition     = aws_s3_bucket_versioning.content.versioning_configuration[0].status == "Enabled"
    error_message = "Content bucket versioning must be enabled."
  }

  assert {
    condition     = one(one(aws_s3_bucket_server_side_encryption_configuration.content.rule).apply_server_side_encryption_by_default).sse_algorithm == "AES256"
    error_message = "The content bucket must use SSE-S3."
  }

  assert {
    condition     = one(aws_s3_bucket_ownership_controls.content.rule).object_ownership == "BucketOwnerEnforced"
    error_message = "The content bucket must enforce bucket-owner ownership."
  }

  assert {
    condition     = jsondecode(aws_s3_bucket_policy.cloudfront.policy).Statement[0].Principal.Service == "cloudfront.amazonaws.com"
    error_message = "Only the CloudFront service principal may read origin objects."
  }

  assert {
    condition     = jsondecode(aws_s3_bucket_policy.cloudfront.policy).Statement[0].Condition.StringEquals["AWS:SourceArn"] == aws_cloudfront_distribution.site.arn
    error_message = "The bucket policy must bind CloudFront reads to this distribution ARN."
  }
}

run "uses_oac_https_and_distinct_cache_behaviors" {
  command = plan

  assert {
    condition     = !local.enable_apex_redirect
    error_message = "Non-stable environments must never enable the apex redirect."
  }

  assert {
    condition     = one(aws_cloudfront_distribution.site.origin).origin_access_control_id == aws_cloudfront_origin_access_control.content.id
    error_message = "The S3 origin must use this module's origin access control."
  }

  assert {
    condition     = one(one(aws_cloudfront_distribution.site.origin).s3_origin_config).origin_access_identity == ""
    error_message = "The S3 origin must not use a legacy origin access identity."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.default_cache_behavior[0].viewer_protocol_policy == "redirect-to-https"
    error_message = "The default behavior must redirect HTTP to HTTPS."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.default_cache_behavior[0].compress
    error_message = "The default behavior must compress responses."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.default_root_object == "index.html"
    error_message = "The distribution must serve index.html at the root."
  }

  assert {
    condition = (
      aws_cloudfront_distribution.site.ordered_cache_behavior[0].path_pattern == "/assets/*" &&
      aws_cloudfront_distribution.site.ordered_cache_behavior[0].cache_policy_id == aws_cloudfront_cache_policy.immutable.id &&
      aws_cloudfront_cache_policy.immutable.default_ttl == 31536000
    )
    error_message = "Assets must use the one-year immutable cache policy."
  }

  assert {
    condition = (
      aws_cloudfront_distribution.site.ordered_cache_behavior[1].path_pattern == "/data/*" &&
      aws_cloudfront_distribution.site.ordered_cache_behavior[1].cache_policy_id == aws_cloudfront_cache_policy.revalidating.id &&
      aws_cloudfront_cache_policy.revalidating.default_ttl == 0
    )
    error_message = "Data must use the revalidating cache policy."
  }

  assert {
    condition = (
      one(aws_cloudfront_distribution.site.custom_error_response).error_code == 404 &&
      one(aws_cloudfront_distribution.site.custom_error_response).response_code == 404 &&
      one(aws_cloudfront_distribution.site.custom_error_response).response_page_path == "/404.html"
    )
    error_message = "Missing content must render /404.html while retaining a real 404 status."
  }
}

run "enables_apex_redirect_only_for_the_stable_apex_configuration" {
  command = plan

  variables {
    environment            = "stable"
    domain_name            = "www.puppetstagehand.com"
    alternate_domain_names = ["puppetstagehand.com"]
  }

  assert {
    condition     = local.enable_apex_redirect
    error_message = "The stable apex configuration must enable the canonical www redirect."
  }

  assert {
    condition     = length(aws_cloudfront_function.redirect) == 1
    error_message = "The enabled stable configuration must create one viewer-request function."
  }
}

run "allows_the_redirect_function_to_be_disabled" {
  command = plan

  variables {
    environment              = "stable"
    domain_name              = "www.puppetstagehand.com"
    alternate_domain_names   = ["puppetstagehand.com"]
    enable_redirect_function = false
  }

  assert {
    condition     = !local.enable_apex_redirect && length(aws_cloudfront_function.redirect) == 0
    error_message = "Disabling redirects must omit the function and the stable apex behavior."
  }
}

run "sets_restrictive_browser_security_headers" {
  command = plan

  assert {
    condition     = aws_cloudfront_response_headers_policy.security.security_headers_config[0].strict_transport_security[0].access_control_max_age_sec >= 31536000
    error_message = "HSTS must be enabled for at least one year."
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.security.security_headers_config[0].content_type_options[0].override
    error_message = "X-Content-Type-Options must be set."
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.security.security_headers_config[0].referrer_policy[0].referrer_policy == "strict-origin-when-cross-origin"
    error_message = "A restrictive Referrer-Policy must be set."
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.security.security_headers_config[0].frame_options[0].frame_option == "DENY"
    error_message = "Framing must be denied."
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.security.security_headers_config[0].content_security_policy[0].content_security_policy == "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
    error_message = "The CSP must permit only self-hosted runtime dependencies."
  }
}

run "limits_github_trust_and_deployment_permissions" {
  command = plan

  assert {
    condition     = jsondecode(aws_iam_role.deploy.assume_role_policy).Statement[0].Principal.Federated == var.github_oidc_provider_arn
    error_message = "The deployment role must trust only the configured GitHub OIDC provider."
  }

  assert {
    condition     = jsondecode(aws_iam_role.deploy.assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:aud"] == "sts.amazonaws.com"
    error_message = "GitHub OIDC trust must require the STS audience."
  }

  assert {
    condition     = jsondecode(aws_iam_role.deploy.assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:sub"] == "repo:puppet-stagehand/stagehand-docs:environment:beta"
    error_message = "GitHub OIDC trust must be limited to this repository and environment."
  }

  assert {
    condition     = jsondecode(aws_iam_role_policy.deploy.policy).Statement[0].Resource == aws_s3_bucket.content.arn
    error_message = "Bucket-list permission must be limited to the content bucket."
  }

  assert {
    condition     = jsondecode(aws_iam_role_policy.deploy.policy).Statement[1].Resource == "${aws_s3_bucket.content.arn}/*"
    error_message = "Object deployment permissions must be limited to this content bucket."
  }

  assert {
    condition     = jsondecode(aws_iam_role_policy.deploy.policy).Statement[2].Resource == aws_cloudfront_distribution.site.arn
    error_message = "Invalidation permission must be limited to this distribution."
  }

  assert {
    condition     = jsondecode(aws_iam_role_policy.deploy.policy).Statement[2].Action == "cloudfront:CreateInvalidation"
    error_message = "The deployment role must only invalidate this CloudFront distribution."
  }
}
