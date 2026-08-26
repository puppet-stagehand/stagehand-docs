mock_provider "aws" {}

variables {
  state_bucket_names = {
    testpilots = "stagehand-testpilots-state-test"
    beta       = "stagehand-beta-state-test"
    stable     = "stagehand-stable-state-test"
  }
  hosted_zone_id = "Z0123456789ABCDEFGHIJ"
}

run "rejects_an_incomplete_environment_map" {
  command = plan

  variables {
    state_bucket_names = {
      testpilots = "stagehand-testpilots-state-test"
      stable     = "stagehand-stable-state-test"
    }
  }

  expect_failures = [var.state_bucket_names]
}

run "rejects_bucket_names_with_adjacent_periods" {
  command = plan

  variables {
    state_bucket_names = {
      testpilots = "stagehand..testpilots-state-test"
      beta       = "stagehand-beta-state-test"
      stable     = "stagehand-stable-state-test"
    }
  }

  expect_failures = [var.state_bucket_names]
}

run "rejects_ipv4_formatted_bucket_names" {
  command = plan

  variables {
    state_bucket_names = {
      testpilots = "192.168.5.4"
      beta       = "stagehand-beta-state-test"
      stable     = "stagehand-stable-state-test"
    }
  }

  expect_failures = [var.state_bucket_names]
}

run "rejects_aws_reserved_bucket_name_prefixes" {
  command = plan

  variables {
    state_bucket_names = {
      testpilots = "xn--stagehand-testpilots"
      beta       = "stagehand-beta-state-test"
      stable     = "stagehand-stable-state-test"
    }
  }

  expect_failures = [var.state_bucket_names]
}

run "rejects_aws_reserved_bucket_name_suffixes" {
  command = plan

  variables {
    state_bucket_names = {
      testpilots = "stagehand-testpilots-state-test"
      beta       = "stagehand-beta-state-test"
      stable     = "stagehand-stable--x-s3"
    }
  }

  expect_failures = [var.state_bucket_names]
}

run "creates_private_encrypted_versioned_state_buckets" {
  command = plan

  assert {
    condition     = length(aws_s3_bucket.state) == 3
    error_message = "Bootstrap must create exactly three state buckets."
  }

  assert {
    condition = alltrue([
      for environment, bucket in aws_s3_bucket.state :
      bucket.tags == tomap({ project = "stagehand", environment = environment })
    ])
    error_message = "Every state bucket must have the project and matching environment tags."
  }

  assert {
    condition = alltrue([
      for block in aws_s3_bucket_public_access_block.state :
      block.block_public_acls && block.block_public_policy && block.ignore_public_acls && block.restrict_public_buckets
    ])
    error_message = "Every state bucket must block all public access."
  }

  assert {
    condition = alltrue([
      for versioning in aws_s3_bucket_versioning.state :
      versioning.versioning_configuration[0].status == "Enabled"
    ])
    error_message = "Every state bucket must enable versioning."
  }

  assert {
    condition = alltrue([
      for encryption in aws_s3_bucket_server_side_encryption_configuration.state :
      one(one(encryption.rule).apply_server_side_encryption_by_default).sse_algorithm == "AES256"
    ])
    error_message = "Every state bucket must use SSE-S3 encryption."
  }
}

run "creates_one_project_tagged_github_oidc_provider" {
  command = plan

  assert {
    condition = (
      aws_iam_openid_connect_provider.github.url == "https://token.actions.githubusercontent.com" &&
      aws_iam_openid_connect_provider.github.client_id_list == toset(["sts.amazonaws.com"]) &&
      aws_iam_openid_connect_provider.github.tags == tomap({ project = "stagehand" })
    )
    error_message = "Bootstrap must create one shared, project-tagged GitHub Actions OIDC provider."
  }
}
