resource "aws_cloudfront_origin_access_control" "content" {
  name                              = "stagehand-${var.environment}-site"
  description                       = "Private S3 access for the Stagehand ${var.environment} site"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_cache_policy" "default" {
  name        = "stagehand-${var.environment}-site-default"
  comment     = "Short-lived caching for Stagehand HTML and general content"
  default_ttl = 300
  max_ttl     = 3600
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_cache_policy" "immutable" {
  name        = "stagehand-${var.environment}-site-immutable"
  comment     = "One-year caching for content-addressed Stagehand assets"
  default_ttl = 31536000
  max_ttl     = 31536000
  min_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_cache_policy" "revalidating" {
  name        = "stagehand-${var.environment}-site-revalidating"
  comment     = "Revalidating cache for Stagehand data payloads"
  default_ttl = 0
  max_ttl     = 3600
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "stagehand-${var.environment}-site-security"
  comment = "Security headers for the Stagehand documentation site"

  security_headers_config {
    content_security_policy {
      content_security_policy = "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
      override                = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    xss_protection {
      protection = true
      mode_block = true
      override   = true
    }
  }
}

resource "aws_cloudfront_function" "redirect" {
  count = var.enable_redirect_function ? 1 : 0

  name    = "stagehand-${var.environment}-site-paths"
  comment = "Canonical host redirect and clean static-site paths"
  runtime = "cloudfront-js-2.0"
  publish = true
  code = replace(
    replace(
      replace(
        replace(
          file("${path.module}/functions/redirect.js"),
          "__ENABLE_APEX_REDIRECT__",
          tostring(local.enable_apex_redirect),
        ),
        "__ENABLE_BASIC_AUTH__",
        tostring(var.enable_basic_auth),
      ),
      "__BASIC_AUTH_EXPECTED_HEADER__",
      local.basic_auth_expected_header,
    ),
    "__GATED_PATH_PREFIXES__",
    trimspace(file("${path.module}/gated-paths.json")),
  )

  key_value_store_associations = [aws_cloudfront_key_value_store.tester_gate.arn]

  tags = local.required_tags
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Stagehand ${var.environment} documentation site"
  default_root_object = "index.html"
  aliases             = local.aliases
  http_version        = "http2and3"
  price_class         = "PriceClass_100"
  wait_for_deployment = false

  origin {
    domain_name              = aws_s3_bucket.content.bucket_regional_domain_name
    origin_id                = "content-bucket"
    origin_access_control_id = aws_cloudfront_origin_access_control.content.id

    s3_origin_config {
      origin_access_identity = ""
    }
  }

  default_cache_behavior {
    target_origin_id           = "content-bucket"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.default.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    dynamic "function_association" {
      for_each = var.enable_redirect_function ? [true] : []

      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.redirect[0].arn
      }
    }
  }

  ordered_cache_behavior {
    path_pattern               = "/assets/*"
    target_origin_id           = "content-bucket"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.immutable.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    dynamic "function_association" {
      for_each = var.enable_redirect_function ? [true] : []

      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.redirect[0].arn
      }
    }
  }

  ordered_cache_behavior {
    path_pattern               = "/data/*"
    target_origin_id           = "content-bucket"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.revalidating.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    dynamic "function_association" {
      for_each = var.enable_redirect_function ? [true] : []

      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.redirect[0].arn
      }
    }
  }

  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }

  tags = local.required_tags
}
