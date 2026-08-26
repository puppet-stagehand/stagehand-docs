mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_data "aws_partition" {
    defaults = { partition = "aws" }
  }
  # Deliberately NO mock_resource "aws_s3_bucket": a mocked bucket default gives all
  # three state buckets one ARN and turns the per-environment scoping assertion below
  # into a tautology, and override_resource cannot target a single for_each instance.
}

variables {
  state_bucket_names = {
    testpilots = "stagehand-testpilots-state-test"
    beta       = "stagehand-beta-state-test"
    stable     = "stagehand-stable-state-test"
  }
  hosted_zone_id = "Z0123456789ABCDEFGHIJ"
}

run "binds_each_plan_role_to_exactly_one_plan_environment" {
  command = plan

  assert {
    condition = alltrue([
      for e, role in aws_iam_role.infrastructure_plan :
      jsondecode(role.assume_role_policy) == {
        Version = "2012-10-17"
        Statement = [{
          Sid       = "GitHubActionsPlanEnvironment"
          Effect    = "Allow"
          Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
          Action    = "sts:AssumeRoleWithWebIdentity"
          Condition = {
            StringEquals = {
              "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
              "token.actions.githubusercontent.com:sub" = "repo:puppet-stagehand/stagehand-docs:environment:${e}-plan"
            }
          }
        }]
      }
    ])
    error_message = "Each plan role must trust exactly one -plan GitHub Environment subject, with the audience pinned to sts.amazonaws.com, no wildcard subject, and no extra statement."
  }

  assert {
    condition = (
      length(aws_iam_role.infrastructure_plan) == 3 &&
      alltrue([
        for role in aws_iam_role.infrastructure_plan :
        length(role.name) <= 64 && can(regex("^[a-z0-9-]+$", role.name))
      ])
    )
    error_message = "There must be exactly three infrastructure plan roles, one per Stagehand environment, each with a name of at most 64 characters using only lowercase letters, digits, and hyphens."
  }
}

run "scopes_each_plan_role_to_its_own_state_and_lock_object" {
  command = plan

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_plan :
      jsondecode(policy.policy).Statement[0].Resource == aws_s3_bucket.state[e].arn
    ])
    error_message = "Each plan role's first permission statement must list only its own state bucket, never another environment's."
  }

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_plan :
      jsondecode(policy.policy).Statement[2].Resource == "${aws_s3_bucket.state[e].arn}/stagehand-docs/terraform.tfstate.tflock"
    ])
    error_message = "Each plan role's third permission statement must hold the lock only on its own state bucket's .tflock object key."
  }

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_plan :
      length([
        for statement in jsondecode(policy.policy).Statement :
        statement
        if(
          contains(
            can(tolist(statement.Action)) ? statement.Action : [statement.Action],
            "s3:PutObject"
          ) &&
          contains(
            can(tolist(statement.Resource)) ? statement.Resource : [statement.Resource],
            "${aws_s3_bucket.state[e].arn}/stagehand-docs/terraform.tfstate"
          )
        )
      ]) == 0
    ])
    error_message = "No plan-role statement may pair s3:PutObject with a Resource that is exactly the bare terraform.tfstate object key; put authority is confined to the .tflock key."
  }

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_plan :
      alltrue([
        for statement in jsondecode(policy.policy).Statement :
        (
          length(can(tolist(statement.Action)) ? statement.Action : [statement.Action]) > 0 &&
          length(can(tolist(statement.Resource)) ? statement.Resource : [statement.Resource]) > 0
        )
      ])
    ])
    error_message = "No permission statement may have an empty Action list or an empty Resource list."
  }

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_plan :
      !contains(
        flatten([
          for statement in jsondecode(policy.policy).Statement :
          can(tolist(statement.Action)) ? statement.Action : [statement.Action]
        ]),
        "*"
      )
    ])
    error_message = "No plan-role permission statement may grant a bare wildcard action."
  }
}

run "publishes_one_plan_role_arn_per_environment" {
  command = plan

  assert {
    condition = (
      length(keys(output.infrastructure_plan_role_arns)) == 3 &&
      length(setsubtract(keys(output.infrastructure_plan_role_arns), ["testpilots", "beta", "stable"])) == 0 &&
      length(distinct(values(output.infrastructure_plan_role_arns))) == 3 &&
      alltrue([
        for e, arn in output.infrastructure_plan_role_arns :
        arn == aws_iam_role.infrastructure_plan[e].arn
      ])
    )
    error_message = "infrastructure_plan_role_arns must publish exactly the testpilots, beta, and stable keys, each with a distinct value equal to the matching plan role's ARN."
  }
}
