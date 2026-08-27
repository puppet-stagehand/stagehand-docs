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
}
