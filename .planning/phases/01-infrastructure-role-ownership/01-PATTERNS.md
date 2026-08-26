# Phase 1: Infrastructure Role Ownership - Pattern Map

**Mapped:** 2026-08-26
**Files analyzed:** 10 (3 new, 7 modified)
**Analogs found:** 10 / 10 (no file in this phase is without an in-repo precedent)

Every artifact this phase produces has an existing analog in the tree. Nothing here is greenfield:
the trust-policy shape, the `for_each`-over-a-map shape, the `local.required_tags` shape, the
exact-JSON `tofu test` idiom, the output shape, the shell tag rule, and the runbook prose style all
already exist and must be copied rather than reinvented.

---

## File Classification

| New/Modified File | New? | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|------|-----------|----------------|---------------|
| `infra/bootstrap/iam-github-actions.tf` | NEW | IaC resource module (IAM role + inline policy) | declarative provisioning / config | `infra/modules/static-site/iam.tf` | exact (same resource types, same jsonencode idiom, same OIDC trust shape) |
| `infra/bootstrap/locals.tf` | NEW | config (locals) | transform | `infra/modules/static-site/locals.tf` | exact |
| `infra/bootstrap/tests/iam-github-actions.tftest.hcl` | NEW | test (`tofu test`) | assertion / batch | `infra/modules/static-site/tests/static_site.tftest.hcl:257-310` (policy assertions) + `infra/bootstrap/tests/bootstrap.tftest.hcl:1-9` (mock/variables preamble) | exact (split across two analogs) |
| `infra/bootstrap/outputs.tf` | modified | config (outputs) | request-response (operator reads) | `infra/bootstrap/outputs.tf:6-9` (`state_bucket_names`) | exact (self-analog) |
| `infra/bootstrap/variables.tf` | modified | config (input validation) | validation | `infra/modules/static-site/variables.tf:58-67` (`github_repository`), `infra/bootstrap/variables.tf:1-10` (`aws_region`) | exact |
| `infra/bootstrap/main.tf` | modified (tags → `local.required_tags`) | IaC resource module | declarative provisioning | `infra/modules/static-site` tag usage (`tags = local.required_tags`) | exact, with the Pitfall-5 caveat below |
| `infra/bootstrap/tests/bootstrap.tftest.hcl` | modified (only if tag refactor changes rendered maps — expected NOT to change) | test | assertion | itself, lines 88-94 and 121-131 | exact (self-analog; these two runs are the regression guard) |
| `scripts/check-tofu-tags.sh` | modified (new bootstrap rule) | utility (shell policy checker) | batch scan | `scripts/check-tofu-tags.sh:84-89` (the `rg`-in-`if` rule) and `:22-82` (the per-target `awk` rule) | exact (self-analog) |
| `docs/operations/aws-bootstrap.md` | modified | documentation (runbook) | prose / procedural | `docs/operations/aws-bootstrap.md:26-47` (the §1 capture-and-record block) | exact (self-analog) |
| `docs/operations/github-environments.md` | modified | documentation (runbook) | prose / procedural | `docs/operations/github-environments.md:77-108` | exact (self-analog) |
| `docs/adr/0002-github-environment-model.md` | modified (References only) | documentation (ADR) | prose | `docs/adr/0003-...md:142-153` References list | exact |
| `docs/superpowers/specs/...site-design.md:178`, `.../plans/...site.md:9,105,21` | modified | documentation | prose | n/a — single-sentence corrections | n/a |

---

## Pattern Assignments

### `infra/bootstrap/iam-github-actions.tf` (NEW — IaC, IAM role + inline policy)

**Analog:** `infra/modules/static-site/iam.tf` (the shipped, reviewed, already-asserted deploy role)
**Secondary analog for `for_each`:** `infra/bootstrap/main.tf:1-14`

**Trust-policy pattern to copy verbatim in shape** (`infra/modules/static-site/iam.tf:1-23`):

```hcl
resource "aws_iam_role" "deploy" {
  name = "stagehand-${var.environment}-site-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "GitHubActionsEnvironment"
      Effect = "Allow"
      Principal = {
        Federated = var.github_oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:environment:${var.environment}"
        }
      }
    }]
  })

  tags = local.required_tags
}
```

Adaptation for the six new roles: `for_each = local.site`; `Federated =
aws_iam_openid_connect_provider.github.arn` (bootstrap owns the provider, so reference the resource,
not a variable); `Sid = "GitHubActionsPlanEnvironment"` / `"GitHubActionsApplyEnvironment"`; subject
`...:environment:${each.key}-plan` / `...:environment:${each.key}`; `tags =
merge(local.required_tags, { environment = each.key })`.

**Permission-policy pattern** — separate `aws_iam_role_policy` resource, `jsonencode`, one
`Sid`-labelled statement per concern, ARNs referenced symbolically
(`infra/modules/static-site/iam.tf:25-56`):

```hcl
resource "aws_iam_role_policy" "deploy" {
  name = "stagehand-${var.environment}-site-deploy"
  role = aws_iam_role.deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ListContentBucket"
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.content.arn
      },
      {
        Sid    = "DeployContentObjects"
        Effect = "Allow"
        Action = [
          "s3:DeleteObject",
          "s3:GetObject",
          "s3:PutObject",
        ]
        Resource = "${aws_s3_bucket.content.arn}/*"
      },
    ]
  })
}
```

Note the three copyable conventions: (1) `name` on the policy matches the role name; (2) `role =
aws_iam_role.X.id`; (3) `Resource` uses the *resource attribute*, never a hand-built ARN string, where
the resource is in scope — for the plan/apply roles that means
`aws_s3_bucket.state[each.key].arn`. Only genuinely out-of-root ARNs (CloudFront, ACM, IAM deploy
role, Route 53 zone) get constructed from `data.aws_partition.current.partition` +
`data.aws_caller_identity.current.account_id`.

**`for_each` pattern** (`infra/bootstrap/main.tf:1-14`) — note the blank line after `for_each`, which
`tofu fmt` preserves and every resource in the root follows:

```hcl
resource "aws_s3_bucket" "state" {
  for_each = var.state_bucket_names

  bucket = each.value

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    project     = "stagehand"
    environment = each.key
  }
}
```

**Anti-pattern present in the repo history to avoid:** no `inline_policy {}` nested block anywhere —
the repo uses the separate `aws_iam_role_policy` resource. Keep it that way.

---

### `infra/bootstrap/locals.tf` (NEW — config)

**Analog:** `infra/modules/static-site/locals.tf:1-15`

```hcl
locals {
  required_tags = {
    project     = "stagehand"
    environment = var.environment
  }

  aliases = distinct(concat([var.domain_name], var.alternate_domain_names))
  ...
}
```

**Adaptation required (Pitfall 5):** bootstrap has two legitimate tag shapes, so `required_tags` must
be the account-global one only:

```hcl
locals {
  required_tags = { project = "stagehand" }   # account-global: the OIDC provider
  # per-environment resources use merge(local.required_tags, { environment = each.key })
}
```

`infra/bootstrap/providers.tf:4-8` already carries `default_tags { tags = { project = "stagehand" } }`
— the same account-global shape — and is the second confirmation that `project`-only is the correct
base map.

---

### `infra/bootstrap/outputs.tf` (modified — two new outputs)

**Analog:** itself, `infra/bootstrap/outputs.tf:6-9`:

```hcl
output "state_bucket_names" {
  description = "State bucket names keyed by Stagehand environment."
  value       = { for environment, bucket in aws_s3_bucket.state : environment => bucket.id }
}
```

Copy the comprehension form and the `"… keyed by Stagehand environment."` description phrasing
exactly, so the runbook's existing `output -json … | jq -r '.beta'` idiom
(`docs/operations/aws-bootstrap.md:36-38`) extends without change. New outputs:
`infrastructure_plan_role_arns`, `infrastructure_apply_role_arns`, each
`{ for environment, role in aws_iam_role.X : environment => role.arn }`.

---

### `infra/bootstrap/variables.tf` (modified — `github_repository`, optional `hosted_zone_id`)

**Analog for a pinned-value validation:** `infra/modules/static-site/variables.tf:58-67`:

```hcl
variable "github_repository" {
  description = "GitHub repository allowed to assume the deployment role."
  type        = string
  default     = "puppet-stagehand/stagehand-docs"

  validation {
    condition     = var.github_repository == "puppet-stagehand/stagehand-docs"
    error_message = "github_repository must be puppet-stagehand/stagehand-docs."
  }
}
```

**Analog for a regex validation:** `infra/bootstrap/variables.tf:1-10` (`aws_region`). House style for
`error_message`: lowercase variable name first, then the requirement, single sentence, ends with a
period.

`hosted_zone_id` should be supplied via `TF_VAR_hosted_zone_id` (the idiom already used for the
environment roots at `docs/operations/aws-bootstrap.md:78-79`), not added to
`terraform.tfvars.example`.

---

### `infra/bootstrap/tests/iam-github-actions.tftest.hcl` (NEW — test)

**Analog A — file preamble:** `infra/bootstrap/tests/bootstrap.tftest.hcl:1-9`:

```hcl
mock_provider "aws" {}

variables {
  state_bucket_names = {
    testpilots = "stagehand-testpilots-state-test"
    beta       = "stagehand-beta-state-test"
    stable     = "stagehand-stable-state-test"
  }
}
```

Extend the `mock_provider` block with `mock_data` for `aws_caller_identity` and `aws_partition`
(pattern shown at `infra/modules/static-site/tests/static_site.tftest.hcl:1-19`, which uses
`mock_resource` with a `defaults = { arn = ... }` map — `mock_data` takes the same `defaults` form).
**Do not** add a `mock_resource "aws_s3_bucket"` default here: it would give all three state buckets
the same ARN and destroy the per-environment scoping assertion (RESEARCH Pattern 4).

**Analog B — the assertion idiom (the load-bearing one):**
`infra/modules/static-site/tests/static_site.tftest.hcl:257-310`:

```hcl
run "limits_github_trust_and_deployment_permissions" {
  command = plan

  assert {
    condition = jsondecode(aws_iam_role.deploy.assume_role_policy) == {
      Version = "2012-10-17"
      Statement = [{
        Sid    = "GitHubActionsEnvironment"
        Effect = "Allow"
        Principal = {
          Federated = var.github_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
            "token.actions.githubusercontent.com:sub" = "repo:puppet-stagehand/stagehand-docs:environment:beta"
          }
        }
      }]
    }
    error_message = "The trust policy must contain exactly one environment-bound GitHub OIDC AssumeRoleWithWebIdentity statement."
  }
```

Three conventions to copy: (1) `command = plan` — no test in this repo uses `apply`; (2) exact-JSON
equality via `jsondecode(x) == { ... }`, never `strcontains`, because only equality detects an *added*
statement; (3) the `error_message` states the *whole* invariant including the negatives — the sibling
message at `:309` is the house standard:

> "The deployment policy must contain exactly the single-bucket list/object actions and
> single-distribution invalidation, with no additional actions, statements, wildcards, role passing,
> role assumption, or infrastructure mutation."

**Analog C — `alltrue([for ... ])` over a `for_each` map:**
`infra/bootstrap/tests/bootstrap.tftest.hcl:88-94`:

```hcl
  assert {
    condition = alltrue([
      for environment, bucket in aws_s3_bucket.state :
      bucket.tags == tomap({ project = "stagehand", environment = environment })
    ])
    error_message = "Every state bucket must have the project and matching environment tags."
  }
```

This is the exact shape for asserting all six roles in one assertion: iterate the resource map, use
the loop key inside the expected value, so per-environment divergence cannot pass. Note `tomap(...)`
is required when comparing against a `tags` attribute.

**Analog D — run naming:** existing run labels are snake_case verb phrases describing the guarantee —
`creates_private_encrypted_versioned_state_buckets`,
`creates_one_project_tagged_github_oidc_provider`, `limits_github_trust_and_deployment_permissions`,
`rejects_an_incomplete_environment_map`. Follow that (e.g.
`binds_each_plan_role_to_exactly_one_plan_environment`).

**Analog E — negative/validation runs:** `bootstrap.tftest.hcl:11-78` shows the `variables { ... }` +
`expect_failures = [var.X]` form, to be reused if a `github_repository` validation is added.

---

### `infra/bootstrap/tests/bootstrap.tftest.hcl` (modified — regression guard only)

The two runs at `:80-119` and `:121-132` assert both existing tag shapes by exact map equality
(`:91` buckets → `{project, environment}`; `:128` OIDC provider → `{project}`). The `local.required_tags`
refactor must leave both rendered maps byte-identical; **these two runs are the acceptance test for
INFRA-06's refactor half.** Prefer changing nothing in this file.

---

### `scripts/check-tofu-tags.sh` (modified — new bootstrap rule)

**Analog:** `scripts/check-tofu-tags.sh:84-89` — the `rg`-inside-`if` idiom, which is the only safe
form under `set -eu` (line 2) because `rg` exits 1 on no-match:

```sh
if offending=$(rg -n --pcre2 '^[[:space:]]*tags[[:space:]]*=(?![[:space:]]*local\.required_tags[[:space:]]*$)' "$module_dir" --glob '*.tf'); then
  printf '%s\n' "$offending" | while IFS= read -r finding; do
    printf '%s\n' "$finding: module tags must use local.required_tags without standalone overrides" >&2
  done
  exit 1
fi
```

Copy verbatim as the template for the bootstrap rule, changing the directory variable, the negative
lookahead (bootstrap legitimately has `merge(local.required_tags, ...)` as well as bare
`local.required_tags`), and the message. Add `bootstrap_dir="infra/bootstrap"` beside the existing
`environments_dir` / `module_dir` declarations at `:4-6`. Keep the existing two rules untouched.

**Secondary analog — per-target structured check:** `:22-82` shows the `awk` brace-depth walker used
when a regex is not enough (counts `provider "aws"` blocks, requires two, requires both tag keys).
Reuse this only if a line-level `rg` rule proves insufficient.

**Final message convention** (`:91`): `printf '%s\n' "Verified OpenTofu tag policy for testpilots, beta, and stable."` — update this string if coverage widens to the bootstrap root, otherwise the
script silently over-claims.

---

### `docs/operations/aws-bootstrap.md` (modified — INFRA-05)

**Analog:** itself, `docs/operations/aws-bootstrap.md:29-47`. The §1 command block is the shape the
two new output captures slot into:

```sh
tofu -chdir=infra/bootstrap output -raw github_oidc_provider_arn
tofu -chdir=infra/bootstrap output -json state_bucket_names | jq -r '.testpilots'
tofu -chdir=infra/bootstrap output -json state_bucket_names | jq -r '.beta'
tofu -chdir=infra/bootstrap output -json state_bucket_names | jq -r '.stable'
rm -f infra/bootstrap/bootstrap.tfplan
```

Rules the analog encodes: the `rm -f` stays **last** (the paragraph at `:42-44` explains why), one
`jq -r` line per environment (not a loop), and the recording sentence at `:46-47` names each output
and ends with "without display quotes".

The passage to rewrite is `:17-20`; keep "The bootstrap requires initial local administrative
authority." verbatim (ADR-0003 rule 4). Do not touch the "Safety boundary" section.

---

### `docs/operations/github-environments.md` (modified — INFRA-05)

**Analog:** itself, `:77-108`. Prose conventions to preserve: imperative mood addressed to the
administrator ("Trust each role only for…", "Give the plan role only the permissions needed to…"),
backticked literal subjects in a bullet list (`:87-89`), and an explicit prohibition sentence at the
end of each block ("Never allow a wildcard Environment name in a role trust policy.", "Do not share
either role across environments.").

Replace the manual-provisioning instruction at `:79-82` with the bootstrap-output path. **Keep** the
subject list `:87-94` and the scoping prose `:97-105` — ADR-0003 rule 3 makes them the specification
the OpenTofu satisfies. **Keep** `:107-108` (second-administrator review) verbatim.

The scoping paragraph at `:102-105` ("Scope permissions by known ARNs, hosted zone, resource-name
prefixes, and the mandatory `project=stagehand` and matching `environment` tags where AWS supports
those conditions.") is the sentence that must be amended to name the residual `Resource: "*"`
CloudFront creates — see RESEARCH Open Question 1. Follow the existing paragraph's structure: state
the scoping that applies, then state the exception and why.

---

### `docs/adr/0002-github-environment-model.md` (modified — DRIFT-01, References only)

**Analog:** `docs/adr/0003-infrastructure-iam-role-ownership.md:142-153` — the References list format:

```markdown
## References

- `docs/adr/0002-github-environment-model.md` — the six GitHub Environments these roles bind to
```

Backticked path, em-dash, lowercase descriptive fragment, no trailing period. Replace ADR-0002's
`:139-141` three-line prose paragraph with a single entry of that form pointing at ADR-0003. **Do not
touch ADR-0002's Decision section — it is `locked: true`.**

---

## Shared Patterns

### Tagging
**Source:** `infra/modules/static-site/locals.tf:2-5` (`local.required_tags`) + `infra/bootstrap/providers.tf:4-8` (`default_tags`)
**Apply to:** every new taggable resource in `infra/bootstrap/`
```hcl
tags = local.required_tags                                  # account-global (OIDC provider)
tags = merge(local.required_tags, { environment = each.key }) # per-environment (the six roles, state buckets)
```
The six new roles are per-environment and therefore carry **both** keys. Enforced by
`scripts/check-tofu-tags.sh` and asserted by `bootstrap.tftest.hcl:88-94`.

### Policy documents
**Source:** `infra/modules/static-site/iam.tf:4`, `:29`; `infra/modules/static-site/s3.tf:62`
**Apply to:** every trust and permission policy in this phase
`jsonencode({ Version = "2012-10-17", Statement = [ ... ] })` with a `Sid` on every statement.
Never `data "aws_iam_policy_document"` — it breaks the exact-JSON test idiom.

### Test assertions
**Source:** `infra/modules/static-site/tests/static_site.tftest.hcl:257-310`
**Apply to:** every policy assertion in the new test file
`jsondecode(x) == { ... }` full-document equality, `command = plan`, snake_case run names,
`error_message` naming the negatives as well as the positives.

### Variable validation
**Source:** `infra/modules/static-site/variables.tf:58-67`, `infra/bootstrap/variables.tf:6-9`, `:16-37`
**Apply to:** any new bootstrap variable
Every variable in this repository that can be constrained carries a `validation` block with a
single-sentence `error_message`. A new `github_repository` variable without one would be the first
exception.

### CI wiring
**Source:** `.github/workflows/validate.yml:56-64`
**Apply to:** nothing — no change needed
```yaml
      - name: Validate bootstrap and environment roots
        run: |
          for root in infra/bootstrap infra/environments/testpilots infra/environments/beta infra/environments/stable; do
            tofu -chdir="$root" init -backend=false
            tofu -chdir="$root" validate
            tofu -chdir="$root" test
          done
```
`tofu test` already discovers `tests/*.tftest.hcl` under the bootstrap root, so the new test file is
picked up with zero workflow edits. `scripts/check-tofu-tags.sh` is likewise already invoked
(`validate.yml:47-50`). **Any plan task proposing a workflow edit for test wiring is redundant.**

### Formatting
**Source:** `.github/workflows/validate.yml:48` — `tofu fmt -check -recursive infra`
**Apply to:** every `.tf` and `.tftest.hcl` file touched
`tofu fmt` owns `.tf`; Prettier (`singleQuote: true`, `printWidth: 100`) owns the Markdown unless
`.prettierignore` excludes it. Check `.prettierignore` before reformatting a runbook.

---

## No Analog Found

None. Every file in this phase has an in-repo precedent.

Two *sub-patterns* have no in-repo precedent and must come from RESEARCH.md rather than from an
analog:

| Sub-pattern | Where it appears | Why no analog | Use instead |
|-------------|------------------|---------------|-------------|
| `mock_data` blocks in a `.tftest.hcl` | new `iam-github-actions.tftest.hcl` | No existing test mocks a data source — the repo only uses `mock_resource` (`static_site.tftest.hcl:1-30`) and bare `mock_provider "aws" {}` (`bootstrap.tftest.hcl:1`) | RESEARCH.md § Code Examples Pattern 3 (spiked and executed this session) |
| IAM `Condition` operators beyond `StringEquals` (`ForAllValues:StringEquals`, `Null`, `StringLike`, `aws:RequestedRegion`) | apply-role policy | Every policy in the repo uses a single flat `StringEquals` | RESEARCH.md Pitfall 3 (the `Null` guard is mandatory in an Allow statement) and § Code Examples Pattern 5 |

---

## Metadata

**Analog search scope:** `infra/bootstrap/`, `infra/bootstrap/tests/`, `infra/modules/static-site/`,
`infra/modules/static-site/tests/`, `infra/environments/{testpilots,beta,stable}/`, `scripts/`,
`.github/workflows/`, `docs/operations/`, `docs/adr/`
**Files read this session:** `infra/bootstrap/{main,outputs,variables,providers}.tf`,
`infra/bootstrap/tests/bootstrap.tftest.hcl`, `infra/modules/static-site/{iam,locals,variables}.tf`,
`infra/modules/static-site/tests/static_site.tftest.hcl`, `infra/environments/beta/main.tf`,
`scripts/check-tofu-tags.sh`, `.github/workflows/validate.yml`,
`docs/operations/{aws-bootstrap,github-environments}.md`, `docs/adr/000{2,3}-*.md`
**Pattern extraction date:** 2026-08-26
