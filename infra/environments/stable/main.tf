terraform {
  required_version = ">= 1.12, < 2.0"

  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project     = "stagehand"
      environment = "stable"
    }
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      project     = "stagehand"
      environment = "stable"
    }
  }
}

module "site" {
  source = "../../modules/static-site"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  environment              = "stable"
  domain_name              = "www.puppet-stagehand.com"
  alternate_domain_names   = ["puppet-stagehand.com"]
  hosted_zone_id           = var.hosted_zone_id
  github_oidc_provider_arn = var.github_oidc_provider_arn
  enable_redirect_function = true
  enable_basic_auth        = true
  basic_auth_username      = var.basic_auth_username
  basic_auth_password      = var.basic_auth_password
}

output "content_bucket_name" {
  value = module.site.content_bucket_name
}

output "distribution_id" {
  value = module.site.distribution_id
}

output "deployment_role_arn" {
  value = module.site.deployment_role_arn
}

output "distribution_domain_name" {
  value = module.site.distribution_domain_name
}
