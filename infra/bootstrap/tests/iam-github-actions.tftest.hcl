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

  # --- CloudFront function: exactly this environment's function name ---

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_apply :
      length([
        for statement in jsondecode(policy.policy).Statement :
        statement
        if contains(
          flatten([statement.Resource]),
          "arn:aws:cloudfront::123456789012:function/stagehand-${e}-site-paths"
        )
      ]) > 0
    ])
    error_message = "Each apply role must hold a statement scoped to exactly its own CloudFront function ARN."
  }

  # --- ACM: Null guard plus ForAllValues:StringEquals domain-names condition ---

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_apply :
      length([
        for statement in jsondecode(policy.policy).Statement :
        statement
        if(
          statement.Action == "acm:RequestCertificate" &&
          try(statement.Condition["Null"]["acm:DomainNames"], null) == "false" &&
          try(statement.Condition["ForAllValues:StringEquals"]["acm:DomainNames"], null) == local.site[e].domain_names
        )
      ]) > 0
    ])
    error_message = "Each apply role's acm:RequestCertificate statement must carry both a Null guard and a ForAllValues:StringEquals condition on acm:DomainNames, scoped to exactly that environment's domain names."
  }

  # --- Route 53: hosted-zone ARN plus an exact A/AAAA/CNAME record-types condition ---

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_apply :
      length([
        for statement in jsondecode(policy.policy).Statement :
        statement
        if(
          statement.Action == "route53:ChangeResourceRecordSets" &&
          contains(flatten([statement.Resource]), "arn:aws:route53:::hostedzone/Z0123456789ABCDEFGHIJ") &&
          try(statement.Condition["ForAllValues:StringEquals"]["route53:ChangeResourceRecordSetsRecordTypes"], null) == ["A", "AAAA", "CNAME"]
        )
      ]) > 0
    ])
    error_message = "Each apply role's route53:ChangeResourceRecordSets statement must resolve against the hosted-zone ARN and carry a record-types condition of exactly A, AAAA, and CNAME."
  }

  # --- The apex-exclusion trap: stable's record names must not be a strict subset of beta's shape ---

  assert {
    condition = (
      length(setintersection(
        toset(local.apply_record_names.stable),
        toset(["www.puppetstagehand.com", "puppetstagehand.com"])
      )) == 2 &&
      length(local.apply_record_names.stable) >= length(local.apply_record_names.beta)
    )
    error_message = "stable's allowed Route 53 record names must include both the www alias and the bare apex, and must not be shorter than beta's list."
  }
}

run "forbids_escalation_actions_in_every_role_policy" {
  command = plan

  assert {
    condition = alltrue(flatten([
      for policy in concat(values(aws_iam_role_policy.infrastructure_plan), values(aws_iam_role_policy.infrastructure_apply)) : [
        for statement in jsondecode(policy.policy).Statement : (
          !contains(flatten([statement.Action]), "*") &&
          !contains(flatten([statement.Action]), "iam:PassRole") &&
          !contains(flatten([statement.Action]), "sts:AssumeRole") &&
          !contains(flatten([statement.Resource]), "arn:aws:iam::123456789012:role/*")
        )
      ]
    ]))
    error_message = "No role's permission policy anywhere in the phase may grant a bare wildcard action, a role-passing action, a role-assumption action, or an unscoped role resource."
  }

  assert {
    condition = alltrue([
      for e in ["testpilots", "beta", "stable"] :
      alltrue([
        for other in setsubtract(["testpilots", "beta", "stable"], [e]) :
        !strcontains(aws_iam_role_policy.infrastructure_plan[e].policy, other) &&
        !strcontains(aws_iam_role_policy.infrastructure_apply[e].policy, other)
      ])
    ])
    error_message = "No role's rendered permission policy for a given environment may contain the name of another Stagehand environment."
  }

  assert {
    condition = alltrue(flatten([
      for policy in concat(values(aws_iam_role_policy.infrastructure_plan), values(aws_iam_role_policy.infrastructure_apply)) : [
        for statement in jsondecode(policy.policy).Statement :
        alltrue([
          for key in try(keys(statement.Condition["ForAllValues:StringEquals"]), []) :
          try(statement.Condition["Null"][key], null) == "false"
        ])
      ]
    ]))
    error_message = "Every set-operator condition in an Effect: Allow statement must carry a sibling Null guard set to false on the same condition key."
  }

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_apply :
      length(policy.policy) < 10240
    ])
    error_message = "Every apply role's rendered permission policy must fit the 10240-character inline budget."
  }

  assert {
    condition = alltrue([
      for e, role in aws_iam_role.infrastructure_apply :
      length(role.assume_role_policy) < 2048
    ])
    error_message = "Every apply role's rendered trust policy must fit the 2048-character budget."
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
