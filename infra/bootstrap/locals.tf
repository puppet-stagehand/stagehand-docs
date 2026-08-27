locals {
  # Account-global tag shape. Per-environment resources merge in an `environment`
  # key at each use site; collapsing the two shapes into one map breaks the
  # existing tag regression runs in tests/bootstrap.tftest.hcl.
  required_tags = {
    project = "stagehand"
  }

  github_repository = var.github_repository

  # Immutable-ID OIDC subject prefix — the value trust-policy sub conditions
  # must actually use. See variables.tf's github_repository_oidc_subject.
  github_repository_oidc_subject = var.github_repository_oidc_subject

  # Single source of the six infrastructure roles' for_each. domain_names is
  # unused by the plan role and is carried here because plan 01-02's ACM and
  # Route 53 conditions consume it from the same source.
  site = {
    testpilots = {
      domain_names = ["testpilots.puppet-stagehand.com"]
    }
    beta = {
      domain_names = ["beta.puppet-stagehand.com"]
    }
    stable = {
      domain_names = ["www.puppet-stagehand.com", "puppet-stagehand.com"]
    }
  }
}
