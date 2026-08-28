locals {
  required_tags = {
    project     = "stagehand"
    environment = var.environment
  }

  aliases = distinct(concat([var.domain_name], var.alternate_domain_names))

  enable_apex_redirect = (
    var.enable_redirect_function &&
    var.environment == "stable" &&
    contains(local.aliases, "puppet-stagehand.com") &&
    contains(local.aliases, "www.puppet-stagehand.com")
  )

  # "Basic <base64(user:pass)>" — the exact value browsers send in the
  # Authorization header, precomputed so redirect.js only does a string
  # comparison rather than reimplementing base64 in CloudFront JS.
  basic_auth_expected_header = "Basic ${base64encode("${var.basic_auth_username}:${var.basic_auth_password}")}"
}
