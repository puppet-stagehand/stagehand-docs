mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_data "aws_partition" {
    defaults = { partition = "aws" }
  }
  # Deliberately no mock resource block for the state bucket type here: a mocked
  # bucket default would give all three state buckets one ARN and turn the
  # per-environment scoping assertion below into a tautology, and
  # override_resource cannot target a single for_each instance.
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
      length(distinct([for role in aws_iam_role.infrastructure_plan : role.name])) == 3 &&
      alltrue([
        for role in aws_iam_role.infrastructure_plan :
        length(role.name) <= 64 && can(regex("^[a-z0-9-]+$", role.name))
      ])
    )
    error_message = "There must be exactly three infrastructure plan roles, one per Stagehand environment, each with a distinct name of at most 64 characters using only lowercase letters, digits, and hyphens."
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
            flatten([statement.Action]),
            "s3:PutObject"
          ) &&
          contains(
            flatten([statement.Resource]),
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
          length(flatten([statement.Action])) > 0 &&
          length(flatten([statement.Resource])) > 0
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
          flatten([statement.Action])
        ]),
        "*"
      )
    ])
    error_message = "No plan-role permission statement may grant a bare wildcard action."
  }
}

run "publishes_one_plan_role_arn_per_environment" {
  command = plan

  # Distinctness of the published ARNs themselves is proven by the distinct
  # role-name assertion in "binds_each_plan_role_to_exactly_one_plan_environment"
  # combined with the per-key equality below, not re-asserted on the raw ARN
  # strings here: mock_provider's aws_iam_role.arn generates the same
  # placeholder for every instance of a for_each'd resource regardless of key
  # (a documented mock-testing limitation — override_resource cannot target a
  # single for_each instance either, so there is no way to force distinct
  # mocked ARNs per environment). A real apply produces three genuinely
  # distinct account-assigned ARNs because it produces three distinct role
  # names.
  assert {
    condition = (
      length(keys(output.infrastructure_plan_role_arns)) == 3 &&
      length(setsubtract(keys(output.infrastructure_plan_role_arns), ["testpilots", "beta", "stable"])) == 0 &&
      alltrue([
        for e, arn in output.infrastructure_plan_role_arns :
        arn == aws_iam_role.infrastructure_plan[e].arn
      ])
    )
    error_message = "infrastructure_plan_role_arns must publish exactly the testpilots, beta, and stable keys, each value equal to the matching plan role's own ARN."
  }
}

run "binds_each_apply_role_to_exactly_one_apply_environment" {
  command = plan

  assert {
    condition = alltrue([
      for e, role in aws_iam_role.infrastructure_apply :
      jsondecode(role.assume_role_policy) == {
        Version = "2012-10-17"
        Statement = [{
          Sid       = "GitHubActionsApplyEnvironment"
          Effect    = "Allow"
          Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
          Action    = "sts:AssumeRoleWithWebIdentity"
          Condition = {
            StringEquals = {
              "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
              "token.actions.githubusercontent.com:sub" = "repo:puppet-stagehand/stagehand-docs:environment:${e}"
            }
          }
        }]
      }
    ])
    error_message = "Each apply role must trust exactly one unsuffixed GitHub Environment subject, with the audience pinned to sts.amazonaws.com, no -plan suffix, no wildcard subject, and no extra statement."
  }

  assert {
    condition = (
      length(aws_iam_role.infrastructure_apply) == 3 &&
      length(distinct([for role in aws_iam_role.infrastructure_apply : role.name])) == 3 &&
      alltrue([
        for role in aws_iam_role.infrastructure_apply :
        length(role.name) <= 64 && can(regex("^[a-z0-9-]+$", role.name))
      ]) &&
      alltrue([
        for role in aws_iam_role.infrastructure_apply :
        length(role.assume_role_policy) < 2048
      ])
    )
    error_message = "There must be exactly three infrastructure apply roles, one per Stagehand environment, each with a distinct name of at most 64 characters using only lowercase letters, digits, and hyphens, and a trust policy under 2048 characters."
  }
}

run "scopes_each_apply_role_to_its_own_environment_resources" {
  command = plan

  # --- State: the apply role's own state and lock object keys only ---

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_apply :
      length([
        for statement in jsondecode(policy.policy).Statement :
        statement
        if contains(flatten([statement.Resource]), aws_s3_bucket.state[e].arn)
      ]) > 0
    ])
    error_message = "Each apply role's permission policy must include a statement resolving against its own state bucket ARN, never another environment's."
  }

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_apply :
      (
        length([
          for statement in jsondecode(policy.policy).Statement :
          statement
          if(
            contains(flatten([statement.Action]), "s3:PutObject") &&
            contains(flatten([statement.Resource]), "${aws_s3_bucket.state[e].arn}/stagehand-docs/terraform.tfstate")
          )
        ]) > 0 &&
        length([
          for statement in jsondecode(policy.policy).Statement :
          statement
          if(
            contains(flatten([statement.Action]), "s3:PutObject") &&
            contains(flatten([statement.Resource]), "${aws_s3_bucket.state[e].arn}/stagehand-docs/terraform.tfstate.tflock")
          )
        ]) > 0
      )
    ])
    error_message = "Each apply role must hold s3:PutObject on both its own terraform.tfstate key and its own .tflock key."
  }

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_apply :
      length([
        for statement in jsondecode(policy.policy).Statement :
        statement
        if(
          contains(flatten([statement.Action]), "s3:DeleteObject") &&
          contains(flatten([statement.Resource]), "${aws_s3_bucket.state[e].arn}/stagehand-docs/terraform.tfstate")
        )
      ]) == 0
    ])
    error_message = "No apply-role statement may pair s3:DeleteObject with the bare terraform.tfstate object key; delete authority is confined to the .tflock key."
  }

  # --- Content bucket: own name-prefix only ---

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_apply :
      length([
        for statement in jsondecode(policy.policy).Statement :
        statement
        if contains(flatten([statement.Resource]), "arn:aws:s3:::stagehand-${e}-site-*")
      ]) > 0
    ])
    error_message = "Each apply role's permission policy must include a statement scoped to its own content bucket's name prefix, ending in a hyphen before the wildcard."
  }

  # --- Deploy role: exactly the one named role, never role/* ---

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_apply :
      length([
        for statement in jsondecode(policy.policy).Statement :
        statement
        if contains(
          flatten([statement.Resource]),
          "arn:aws:iam::123456789012:role/stagehand-${e}-site-deploy"
        )
      ]) > 0
    ])
    error_message = "Each apply role's permission policy must include a statement scoped to exactly its own stagehand-<env>-site-deploy IAM role."
  }

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_apply :
      !contains(
        flatten([
          for statement in jsondecode(policy.policy).Statement :
          flatten([statement.Resource])
        ]),
        "arn:aws:iam::123456789012:role/*"
      )
    ])
    error_message = "No apply-role statement may reference role/* anywhere."
  }
}

run "publishes_one_apply_role_arn_per_environment" {
  command = plan

  # See the note in "publishes_one_plan_role_arn_per_environment": mock_provider
  # generates identical placeholder ARNs across for_each instances (and,
  # empirically, across resource addresses too), so cross-family distinctness is
  # proven via role names rather than raw ARN strings.
  assert {
    condition = (
      length(keys(output.infrastructure_apply_role_arns)) == 3 &&
      length(setsubtract(keys(output.infrastructure_apply_role_arns), ["testpilots", "beta", "stable"])) == 0 &&
      alltrue([
        for e, arn in output.infrastructure_apply_role_arns :
        arn == aws_iam_role.infrastructure_apply[e].arn
      ])
    )
    error_message = "infrastructure_apply_role_arns must publish exactly the testpilots, beta, and stable keys, each value equal to the matching apply role's own ARN."
  }

  assert {
    condition = length(distinct(concat(
      [for role in aws_iam_role.infrastructure_apply : role.name],
      [for role in aws_iam_role.infrastructure_plan : role.name],
    ))) == 6
    error_message = "The six plan and apply role names must all be distinct, proving the plan and apply role families and the three environments never collide."
  }
}
