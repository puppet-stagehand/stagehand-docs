mock_provider "aws" {
  mock_resource "aws_cloudfront_function" {
    defaults = {
      arn = "arn:aws:cloudfront::123456789012:function/stagehand-beta-site-paths"
    }
  }

  mock_resource "aws_cloudfront_distribution" {
    defaults = {
      arn = "arn:aws:cloudfront::123456789012:distribution/E1234567890"
      id  = "E1234567890"
    }
  }

  mock_resource "aws_s3_bucket" {
    defaults = {
      arn = "arn:aws:s3:::stagehand-beta-site-test"
      id  = "stagehand-beta-site-test"
    }
  }

  mock_resource "aws_iam_role" {
    defaults = {
      arn = "arn:aws:iam::123456789012:role/stagehand-beta-site-deploy"
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
  hosted_zone_id           = "Z0123456789ABC"
  github_oidc_provider_arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
}

run "plans_the_beta_site_contract" {
  command = plan

  assert {
    condition = (
      module.site.content_bucket_name == "stagehand-beta-site-test" &&
      module.site.distribution_id == "E1234567890" &&
      module.site.deployment_role_arn == "arn:aws:iam::123456789012:role/stagehand-beta-site-deploy"
    )
    error_message = "The beta root must expose its environment-specific deployment outputs."
  }
}
