locals {
  # Account-global tag shape. Per-environment resources merge in an `environment`
  # key at each use site; collapsing the two shapes into one map breaks the
  # existing tag regression runs in tests/bootstrap.tftest.hcl.
  required_tags = {
    project = "stagehand"
  }

  github_repository = var.github_repository

  # Single source of the six infrastructure roles' for_each. domain_names is
  # unused by the plan role and is carried here because plan 01-02's ACM and
  # Route 53 conditions consume it from the same source.
  site = {
    testpilots = {
      domain_names = ["testpilots.puppetstagehand.com"]
    }
    beta = {
      domain_names = ["beta.puppetstagehand.com"]
    }
    stable = {
      domain_names = ["www.puppetstagehand.com", "puppetstagehand.com"]
    }
  }
}
