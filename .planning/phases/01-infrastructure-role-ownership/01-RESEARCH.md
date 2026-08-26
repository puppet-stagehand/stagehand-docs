# Phase 1: Infrastructure Role Ownership - Research

**Researched:** 2026-08-26
**Domain:** OpenTofu-managed AWS IAM (GitHub OIDC federation, least-privilege CI roles), `tofu test` policy assertions, operator runbook reconciliation
**Confidence:** HIGH

---

<user_constraints>

## User Constraints

**No `CONTEXT.md` exists for this phase** — the user chose to plan without `/gsd-discuss-phase`
(`.planning/config.json` sets `"skip_discuss": true`). The binding constraints therefore come from
the three locked ADRs and `.planning/PROJECT.md`. They are quoted verbatim below and carry the same
authority a `## Decisions` section would.

### Locked Decisions — ADR-0003 (`docs/adr/0003-infrastructure-iam-role-ownership.md`, `locked: true`)

Verbatim, `docs/adr/0003-infrastructure-iam-role-ownership.md:59-87`:

> 1. **`infra/bootstrap/` creates both roles.** The plan role and the apply role become OpenTofu
>    resources in the bootstrap root, alongside the shared OIDC provider that already lives there.
>    Their ARNs become bootstrap outputs, in the manner of `github_oidc_provider_arn` and
>    `state_bucket_names`.
>
> 2. **One role per Stagehand environment per tier; no sharing.** Six roles in total. Each trusts
>    the repository `puppet-stagehand/stagehand-docs` and exactly one GitHub Environment subject,
>    with `aud` equal to `sts.amazonaws.com`. Plan roles trust the `-plan` Environment subjects;
>    apply roles trust the unsuffixed Environment subjects. A wildcard Environment name in a trust
>    policy is never permitted.
>
> 3. **The permission scoping in `docs/operations/github-environments.md` is the specification the
>    OpenTofu must satisfy.** The plan role gets state read, state-lock acquire and release,
>    refresh, and `Get`, `List`, and `Describe` only, scoped to its own state bucket and key. The
>    apply role gets that plus the minimum create, update, tag, and delete actions the static-site
>    module requires, scoped by known ARNs, hosted zone, name prefixes, and the mandatory
>    `project = "stagehand"` and matching `environment` tag conditions where AWS supports them.
>    Where the OpenTofu and the runbook disagree, the runbook is amended or the OpenTofu is
>    corrected; they are not allowed to drift apart.
>
> 4. **Bootstrap remains human-applied.** No CI job may assume a role able to modify the bootstrap
>    root, and no workflow gains permission to apply it. The two-administrator review that
>    `github-environments.md` requires for these trust and permission policies is satisfied by
>    `CODEOWNERS` review on `/infra/` plus the administrator performing the apply, and both remain
>    required.
>
> 5. **Implementation is a separate task.** This ADR records ownership. Until the OpenTofu exists,
>    the manual provisioning path in `docs/operations/github-environments.md` remains the operative
>    instruction and must not be deleted.

### Locked Decisions — ADR-0002 (`docs/adr/0002-github-environment-model.md`, `locked: true`)

Verbatim, `docs/adr/0002-github-environment-model.md:66-72` (rule 3):

> 3. **Six GitHub Environments exist.** Three apply Environments named `testpilots`, `beta`, and
>    `stable`, restricted to `main`, carrying the apply and deploy role ARNs, with required
>    reviewers on `beta` and `stable` and self-review prevented on `stable`. Three plan
>    Environments named `testpilots-plan`, `beta-plan`, and `stable-plan`, restricted to the custom
>    branch rule `refs/pull/*/merge`, carrying only the plan role ARN, each requiring a trusted
>    reviewer with self-review prevented. Plan Environments never hold an apply or deploy role ARN.

Rule 4 (`:73-78`) forbids any pull-request-triggered workflow reaching a mutating role and forbids
`pull_request_target`.

### Locked Decisions — ADR-0001 (`docs/adr/0001-compatibility-scaffold.md`, `locked: true`)

No Phase 1 bearing. ADR-0001 governs the compatibility register (Phase 4). Do not touch
`src/data/compatibility.yaml`, the isolation gates, or the evidence schema in this phase.

### Standing project constraints (`.planning/PROJECT.md`)

- **Quality gate:** `npm run verify` green on `main` — a success criterion of every phase.
- **Mandatory tags** (`.planning/PROJECT.md:156-158`, verbatim):
  > every taggable environment resource carries `project = "stagehand"` and its
  > `environment` tag; genuinely shared account-global resources carry `project` only, with no
  > fabricated environment tag. Enforced by `scripts/check-tofu-tags.sh`.
- **No AWS account identifier, credential, state file, saved plan, `terraform.tfvars`, or
  `backend.hcl` value committed** (PUB-07; `docs/operations/aws-bootstrap.md`).

### Claude's Discretion

Everything ADR-0003 does not fix is discretionary, subject to the runbook staying in agreement
(rule 3). Specifically:

- Resource naming for the six roles (ADR-0003 fixes count and trust, not names).
- Whether the account ID and partition come from `data "aws_caller_identity"` / `data "aws_partition"`
  or from new variables.
- Whether the permission policies are inline (`aws_iam_role_policy`) or customer-managed
  (`aws_iam_policy` + attachment) — see the 10,240-character pitfall below.
- File layout inside `infra/bootstrap/` (single `iam.tf` vs `roles-plan.tf`/`roles-apply.tf`).
- The exact shape of the `check-tofu-tags.sh` extension.
- Which of the two `tofu test` assertion styles (literal-ARN vs symbolic-reference) to use.

### Deferred / OUT OF SCOPE

- **Applying anything to AWS.** Phase 1 writes and verifies OpenTofu; PUB-01 (Phase 2) applies it.
  `docs/operations/aws-bootstrap.md:146-151` ("Safety boundary") stays true at the end of Phase 1.
- **Creating the six GitHub Environments or setting variables** — PUB-02, Phase 2.
- **`OPS-04`** (`aws:SecureTransport = false` deny on state bucket policies) — deferred to v2.
- **CI applying the bootstrap root** — ADR-0003 rule 4, LOCKED, permanently out of scope.
- **DRIFT-04** (design-spec compatibility sentences) — Phase 4.
- **GATE-02/03/05** — Phases 2, 3, 5.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description (abridged from `.planning/REQUIREMENTS.md`) | Research Support |
|----|---------------------------------------------------------|------------------|
| INFRA-01 | Six IAM roles in `infra/bootstrap/`, each trusting `puppet-stagehand/stagehand-docs` + exactly one GitHub Environment subject, `aud = sts.amazonaws.com`, no wildcard | Verified sub format + `aud` default (§ Standard Stack, § Code Examples Pattern 1); in-repo trust-policy precedent `infra/modules/static-site/iam.tf:1-23` |
| INFRA-02 | Plan roles: state read, lock acquire/release, refresh, `Get`/`List`/`Describe` only, scoped to own state bucket + key incl. only the lock-object writes/deletes | Verified `.tflock` object name and exact S3 verbs from OpenTofu source (§ Don't Hand-Roll, § Code Examples Pattern 2) |
| INFRA-03 | Apply roles: plan access + minimum create/update/tag/delete for the static-site module, scoped by ARNs/zone/prefixes/tag conditions where AWS supports them; no sharing | Complete verified action inventory + the finding that `aws:ResourceTag` is unsupported by every service in this stack (§ Architecture Patterns, § Pitfall 1) |
| INFRA-04 | `infra/bootstrap/outputs.tf` exposes six role ARNs beside the existing two outputs | Existing output shape quoted verbatim (§ Code Examples Pattern 4) |
| INFRA-05 | `aws-bootstrap.md` + `github-environments.md` describe the OpenTofu-owned path; still state human apply under CODEOWNERS + second-administrator review | Exact line ranges of the two manual-provisioning passages located (§ Documentation Edit Map) |
| INFRA-06 | Bootstrap tags via a shared `required_tags` local; `check-tofu-tags.sh` covers the bootstrap root | Current inline literals quoted verbatim; existing checker structure analysed (§ Pitfall 5, § Code Examples Pattern 5) |
| DRIFT-01 | ADR-0002 References points to ADR-0003 | Exact stale text at `docs/adr/0002-github-environment-model.md:139-141` |
| DRIFT-02 | Design spec's three-Environment sentence amended | Exact text at `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md:178` |
| DRIFT-03 | TypeScript pin reconciled (plan 7.0.2 vs `package.json` 6.0.3) | Both values read this session (§ Documentation Edit Map) |
| GATE-01 | `tofu test` asserts each role's trust subject and permission scope; `fmt`/`init`/`validate`/tag-check pass on bootstrap | Assertion pattern proven by executable spike (§ Code Examples Pattern 3); CI wiring already present (§ Validation Architecture) |

</phase_requirements>

---

## Summary

This phase is **not a greenfield build**. `infra/bootstrap/` is a small, working, tested OpenTofu
root that already declares three state buckets with their controls and one GitHub OIDC provider, and
`tofu test` on it is green today (7 passed, 0 failed — run this session). The phase adds six IAM
roles to that root, exposes their ARNs, extends the tag checker, adds `tofu test` coverage, and
rewrites two runbook passages. Every convention the new code must follow already exists in the
repository and can be copied rather than invented: the trust-policy shape lives in
`infra/modules/static-site/iam.tf`, the exact-JSON test-assertion idiom lives in
`infra/modules/static-site/tests/static_site.tftest.hcl:257-310`, the tag-and-locals idiom lives in
`infra/modules/static-site/locals.tf:1-5`.

The hard part is the apply role's permission policy, and the research turned up one finding that
changes how it must be written. **`aws:ResourceTag` is supported by exactly zero CloudFront, ACM,
Route 53, or IAM actions**, and by no S3 *bucket* action — confirmed against AWS's own
machine-readable Service Reference. ADR-0003 rule 3's phrase "the mandatory `project = "stagehand"`
and matching `environment` tag conditions where AWS supports them" therefore resolves to a much
narrower set than it reads: `aws:RequestTag`/`aws:TagKeys` on a handful of *create* and *tag* actions
only. Least privilege in this stack has to come from ARN scoping, resource-name prefixes, and two
service-specific condition keys that turn out to be far better levers than tags — `acm:DomainNames`
on `acm:RequestCertificate`, and `route53:ChangeResourceRecordSetsNormalizedRecordNames` /
`...RecordTypes` on `route53:ChangeResourceRecordSets` scoped to the hosted-zone ARN. A residual set
of CloudFront actions (`CreateDistribution`, `CreateCachePolicy`, `CreateResponseHeadersPolicy`,
`CreateOriginAccessControl`, `CreateFunction`) genuinely cannot be scoped at all — they have no
resource type in IAM — and must be granted on `Resource: "*"`, which the plan should state as a
documented limitation rather than paper over.

The second structural finding is that **the bootstrap root cannot know most of the ARNs the
environment stack creates.** CloudFront distribution, cache-policy, response-headers-policy, OAC and
ACM certificate ARNs are opaque server-assigned IDs. Only the S3 content bucket (name prefix
`stagehand-<env>-site-`), the CloudFront Function (ARN is by *name*), the deploy IAM role
(`stagehand-<env>-site-deploy`), and the Route 53 hosted zone (a new bootstrap variable) are
scopable. That asymmetry is inherent to ADR-0003's decision and should be recorded in the runbook
edit, not fought.

**Primary recommendation:** Add one `infra/bootstrap/iam-github-actions.tf` (plus a
`locals.tf`) that builds all six roles from a single `for_each` over a
`{ environment => { plan_subject, apply_subject, domain_names } }` local, with each permission policy
assembled from named, `Sid`-labelled statements; assert every role with the exact-JSON
`jsondecode(...) == { ... }` idiom already used in the static-site module test; and add the bootstrap
root to `scripts/check-tofu-tags.sh` as a *separate* rule from the environment rules, because
bootstrap's account-global resources legitimately carry `project` only.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Creating the six CI identities | Bootstrap OpenTofu root (human-applied, local admin credentials) | — | ADR-0003 rule 1. CI never applies bootstrap, so no circularity (`.github/workflows/infrastructure.yml:57-61` runs only `init -backend=false`/`validate`/`test` on it) |
| Binding an identity to a CI job | GitHub Environment configuration (manual, Phase 2) | AWS trust policy | GitHub Environments are not OpenTofu-managed (ADR-0002 Consequences); the trust policy is the AWS-side half of the same control |
| Bounding what an identity may do | AWS IAM permission policy (in bootstrap root) | GitHub Environment reviewers | ADR-0003 rule 3 makes the permission policy the enforcement, reviewers the process gate |
| Creating site resources | Environment OpenTofu roots + `static-site` module (CI-applied) | — | Unchanged by this phase; it is the *consumer* of the apply role |
| Publishing role ARNs to operators | Bootstrap `outputs.tf` | `aws-bootstrap.md` runbook step | INFRA-04 + INFRA-05; the output is the single authoritative source (ADR-0003 Consequences) |
| Proving the roles match the design | `infra/bootstrap/tests/*.tftest.hcl` (`tofu test`) | `scripts/check-tofu-tags.sh` | GATE-01. `tofu test` asserts policy content; the shell checker asserts tag policy |
| Keeping prose and code in agreement | `docs/operations/*.md` | ADR References | ADR-0003 rule 3's "not allowed to drift apart" |

---

## Project Constraints (from CLAUDE.md)

**No `./CLAUDE.md` or `./.claude/CLAUDE.md` exists in this repository** — verified this session
(`ls -la` shows no `CLAUDE.md`; there is no `.claude/` directory). No project-level agent directives
apply.

**No project skills directory** — neither `.claude/skills/` nor `.agents/skills/` exists.

The nearest equivalents that *do* bind are:

| Source | Directive |
|--------|-----------|
| `CODEOWNERS:1` | `/infra/ @matthewrstone` — every file this phase touches under `infra/` requires that review |
| `CONTRIBUTING.md` | (read for conventions before authoring; not agent-directive shaped) |
| `.editorconfig`, `prettier` config in `package.json:57-63` | `singleQuote: true`, `printWidth: 100`; `npm run format:check` is the first step of `npm run verify` |
| `.prettierignore` | Check before assuming `.tf`/`.md` files are Prettier-formatted; `tofu fmt` owns `.tf` |

---

## Standard Stack

Phase 1 adds **no new dependency of any kind**. Everything below already exists in the tree.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OpenTofu | `1.12.6` | The IaC engine and the test runner | Pinned in `.opentofu-version` (verbatim: `1.12.6`); `tofu --version` on this machine reports `OpenTofu v1.12.6` |
| `hashicorp/aws` provider | `6.61.0` (constraint `~> 6.0`) | `aws_iam_role`, `aws_iam_role_policy`, `aws_caller_identity`, `aws_partition` | Locked in `infra/bootstrap/.terraform.lock.hcl:4-6` (verbatim: `version     = "6.61.0"` / `constraints = "~> 6.0"`); constraint declared in `infra/bootstrap/versions.tf:4-9` |
| `tofu test` (`*.tftest.hcl`) | built-in to 1.12 | GATE-01 policy assertions | Already the repo's only OpenTofu test mechanism — 5 test files exist |
| `ripgrep` | 15.2.0 locally; installed in CI | `scripts/check-tofu-tags.sh` hard-requires it | `scripts/check-tofu-tags.sh:8-11` exits 1 if `rg` is absent; both workflows `apt-get install --yes ripgrep` |

### Supporting

| Resource / data source | Purpose | When to Use |
|------------------------|---------|-------------|
| `aws_iam_role` | The six roles | Always. `name` is required; role name max 64 chars (verified — AWS IAM quotas) |
| `aws_iam_role_policy` | Inline permission policy | Default choice; matches `infra/modules/static-site/iam.tf:25-56` precedent. **Aggregate inline limit is 10,240 chars per role** |
| `aws_iam_policy` + `aws_iam_role_policy_attachment` | Customer-managed alternative | Only if the apply policy exceeds 10,240 chars; each managed policy is capped at 6,144 chars, up to 20 attachable per role |
| `data "aws_caller_identity"` | Account ID for constructed CloudFront / IAM / ACM ARNs | Needed — CloudFront/ACM/IAM ARNs cannot be derived from any bootstrap-managed resource |
| `data "aws_partition"` | Partition segment of constructed ARNs | Recommended for symmetry with `aws_s3_bucket.state[*].arn`, which already carries the real partition |
| `jsonencode()` | Policy documents | Repo convention (`infra/modules/static-site/iam.tf:4`, `:29`, `infra/modules/static-site/s3.tf:62`). Emits whitespace-free JSON, which helps the 10,240 budget |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jsonencode({...})` | `data "aws_iam_policy_document"` | The data source gives ordering guarantees and `override_policy_documents`, but **breaks the repo's exact-JSON test idiom** (mocked data sources return generated values) and diverges from the three existing policy definitions. Reject. |
| `data "aws_caller_identity"` | A new `aws_account_id` variable | A variable avoids mocking work in `tofu test`, but PUB-07 and `aws-bootstrap.md:22-23` forbid committing an account number, so it would have to be a `TF_VAR_` env var — more operator burden and one more thing to get wrong. The data source is cleaner; mocking it costs three lines (proven in the spike). |
| Inline `aws_iam_role_policy` | Customer-managed `aws_iam_policy` | Managed policies are 6,144 chars each but reusable; inline is 10,240 aggregate and cannot be attached elsewhere by accident. Inline is the tighter, repo-consistent default. Switch only on overflow. |
| Six flat resource blocks | `for_each` over a locals map | `for_each` guarantees the six stay structurally identical (the ADR's stated risk is "six roles must stay consistent with six GitHub Environments"). Flat blocks make per-environment divergence easy and invisible. Prefer `for_each`. |

**Installation:** none. No `npm install`, no new provider, no `tofu init -upgrade` needed.

**Version verification:** performed against the working tree, not a registry — this phase installs
nothing. `tofu --version` → `OpenTofu v1.12.6`; `infra/bootstrap/.terraform.lock.hcl` pins
`hashicorp/aws` `6.61.0`.

---

## Package Legitimacy Audit

**This phase installs zero external packages.** No npm dependency, no PyPI package, no crate, and no
new OpenTofu provider or module is added. The only third-party artifact involved is
`registry.opentofu.org/hashicorp/aws`, which is already present and hash-locked in four
`.terraform.lock.hcl` files in the repository.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `hashicorp/aws` | OpenTofu Registry (already locked at `6.61.0`) | pre-existing | n/a | github.com/hashicorp/terraform-provider-aws | OK (pre-existing, hash-locked) | No change — do not run `tofu init -upgrade` |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

**Planner guidance:** if any task proposes `npm install`, a new provider, or a new module source,
that task is out of scope for this phase and should be rejected at plan review.

---

## Architecture Patterns

### System Architecture Diagram

```
  ADMINISTRATOR WORKSTATION                    GITHUB                         AWS ACCOUNT
  (local admin credentials)

  tofu -chdir=infra/bootstrap
        │
        ├─ plan ──► review ──► apply ───────────────────────────────────────► aws_s3_bucket.state    (×3, existing)
        │                                                                   ├─ aws_iam_openid_connect_provider.github
        │                                                                   │        (existing, shared)
        │                                                                   ├─ aws_iam_role.infrastructure_plan   (×3, NEW)
        │                                                                   └─ aws_iam_role.infrastructure_apply  (×3, NEW)
        │                                                                             │
        └─ outputs ──────────────┐                                                    │ trust policy names
             github_oidc_provider_arn                                                 │ exactly ONE sub:
             state_bucket_names   │                                                   │ repo:puppet-stagehand/
             infrastructure_plan_role_arns   (NEW)                                    │ stagehand-docs:environment:<X>
             infrastructure_apply_role_arns  (NEW)                                    │
                                  │                                                   │
                                  └──── operator pastes, one ARN per Environment ──┐  │
                                                                                   ▼  │
                            ┌──────────────────────────────────────────────────────────┴───────────────┐
                            │  6 GitHub Environments (manual, Phase 2)                                 │
                            │                                                                          │
                            │  testpilots-plan │ beta-plan │ stable-plan   → AWS_INFRASTRUCTURE_PLAN_… │
                            │     refs/pull/*/merge, trusted reviewer                                   │
                            │                                                                          │
                            │  testpilots │ beta │ stable                  → AWS_INFRASTRUCTURE_APPLY_…│
                            │     main only, reviewers on beta/stable                                   │
                            └──────────────────────────────────────────────────────────────────────────┘
                                       │                                    │
                pull_request on infra/**│                                    │ workflow_dispatch from main
                                       ▼                                    ▼
                       infrastructure.yml : plan job              infrastructure.yml : apply job
                       (matrix × 3 plan Environments)             (single, inputs.environment)
                       same-repo guard runs FIRST                 requires confirmation == "apply"
                                       │                                    │
                        AssumeRoleWithWebIdentity                AssumeRoleWithWebIdentity
                                       │                                    │
                                       ▼                                    ▼
                       ┌───────────────────────────┐       ┌────────────────────────────────────────┐
                       │ PLAN ROLE (per env)       │       │ APPLY ROLE (per env)                   │
                       │  • ListBucket   own state │       │  • everything the plan role has         │
                       │  • GetObject    .tfstate  │       │  • PutObject on .tfstate  (state write) │
                       │  • Get/Put/Del  .tflock   │       │  • S3   stagehand-<env>-site-*          │
                       │  • Get/List/Describe on   │       │  • CloudFront  distribution/* (unscopable)
                       │    site resource types    │       │  • ACM  RequestCertificate + DomainNames│
                       │  ✗ NO PutObject .tfstate  │       │  • Route53  hostedzone/<id> + record    │
                       │  ✗ NO mutation anywhere   │       │    name & type conditions               │
                       └───────────────────────────┘       │  • IAM  role/stagehand-<env>-site-deploy│
                                       │                   └────────────────────────────────────────┘
                                       ▼                                    ▼
                       tofu plan on infra/environments/<env>    tofu plan + apply on the same root
                       value-free summary artifact              creates/updates the static-site module
```

### Where the new files go

```
infra/bootstrap/
├── versions.tf                  # unchanged (required_version >= 1.12 < 2.0, aws ~> 6.0)
├── providers.tf                 # default_tags { project = "stagehand" } — consider local.required_tags
├── variables.tf                 # + hosted_zone_id, + github_repository (validated)
├── locals.tf                    # NEW  required_tags, environments map, subjects, domain names
├── main.tf                      # existing buckets + OIDC provider; tags → local.required_tags*
├── iam-github-actions.tf        # NEW  6 × aws_iam_role + 6 × aws_iam_role_policy
├── outputs.tf                   # + infrastructure_plan_role_arns, infrastructure_apply_role_arns
├── terraform.tfvars.example     # unchanged unless hosted_zone_id becomes a tfvar (prefer TF_VAR_)
└── tests/
    ├── bootstrap.tftest.hcl     # existing 7 runs — must stay green
    └── iam-github-actions.tftest.hcl   # NEW  trust-subject + permission-scope assertions
```

*Note on `main.tf` tags: `aws_s3_bucket.state` carries **both** `project` and a per-environment
`environment` tag, so it cannot use a single account-global `required_tags` map unmerged. See
Pitfall 5.

### Pattern 1: One `for_each` map is the single source of the six roles

**What:** Define one `locals` map keyed by OpenTofu environment carrying everything the six roles
differ by, then build both role families with `for_each` over it.

**When to use:** Always here. ADR-0003's own Consequences section names "six roles must stay
consistent with six GitHub Environments" as the standing risk; a shared map makes divergence a
compile-time impossibility rather than a review responsibility.

```hcl
locals {
  github_repository = var.github_repository # default "puppet-stagehand/stagehand-docs"

  # Mirrors infra/environments/*/main.tf module "site" arguments exactly.
  site = {
    testpilots = { domain_names = ["testpilots.puppetstagehand.com"] }
    beta       = { domain_names = ["beta.puppetstagehand.com"] }
    stable     = { domain_names = ["www.puppetstagehand.com", "puppetstagehand.com"] }
  }
}
```

Those domain lists are **verified verbatim** against the three environment roots:
`infra/environments/testpilots/main.tf:46-47` — `domain_name = "testpilots.puppetstagehand.com"`,
`alternate_domain_names = []`; `infra/environments/beta/main.tf:46-47` —
`domain_name = "beta.puppetstagehand.com"`, `alternate_domain_names = []`;
`infra/environments/stable/main.tf:46-47` — `domain_name = "www.puppetstagehand.com"`,
`alternate_domain_names = ["puppetstagehand.com"]`.

### Pattern 2: Trust policy shape is already settled — copy it

**What:** Reuse the exact trust-policy structure from the shipped deploy role, changing only the
subject.

**Why:** `infra/modules/static-site/iam.tf:4-20` is already reviewed, already asserted by
`infra/modules/static-site/tests/static_site.tftest.hcl:261-278`, and already matches the runbook's
documented subjects. Introducing a second shape would create exactly the drift ADR-0003 rule 3
forbids.

### Pattern 3: Assert policies by exact JSON equality, never by substring

**What:** `condition = jsondecode(resource.policy) == { ...the whole document... }`.

**Why:** The existing module test's own error message states the intent (verbatim,
`infra/modules/static-site/tests/static_site.tftest.hcl:309`):

> `error_message = "The deployment policy must contain exactly the single-bucket list/object actions and single-distribution invalidation, with no additional actions, statements, wildcards, role passing, role assumption, or infrastructure mutation."`

A `contains()` or `strcontains()` assertion cannot catch an *added* statement. Exact equality can.
GATE-01 says the tests must assert "each of the six roles' trust subject and permission scope" —
exact equality is the only assertion form that discharges "scope" rather than merely "presence".

### Pattern 4: Mock the data sources, not the buckets

**What:** In the new `.tftest.hcl`, give `mock_provider "aws"` a `mock_data` block for
`aws_caller_identity` and `aws_partition`; do **not** add a `mock_resource "aws_s3_bucket"` default.

**Why:** OpenTofu generates *a random alpha-numeric string* for any un-mocked computed string
attribute, so an un-pinned `account_id` makes exact-JSON assertions non-deterministic. Conversely, a
`mock_resource "aws_s3_bucket" { defaults = { arn = ... } }` gives **all three** state buckets the
same ARN, destroying the test's ability to prove per-environment scoping — and
`override_resource` cannot target a single `for_each` instance. Leave bucket ARNs generated and
assert against `aws_s3_bucket.state[e].arn` symbolically. Both halves of this were proven by an
executable spike this session (see § Code Examples Pattern 3).

### Anti-Patterns to Avoid

- **Granting `s3:PutObject` on the state key to a plan role.** The plan role needs `PutObject` only
  on `<key>.tflock`. Granting it on `<key>` too would let a pull-request-triggered job overwrite
  state — which is exactly the outcome ADR-0002 rule 4 exists to prevent, achieved by accident.
- **`iam:PassRole` or `sts:AssumeRole` in the apply role's policy.** Nothing in `static-site` passes
  a role. Adding either widens the blast radius for no benefit; the module test's error message
  already names "role passing, role assumption" as forbidden for the sibling deploy role.
- **`iam:*` or `iam:PutRolePolicy` on `role/*`.** The apply role must create
  `stagehand-<env>-site-deploy` and nothing else. Wildcard IAM in a CI-assumable role is a full
  account takeover path.
- **Tag conditions on create actions without checking the API actually sends tags.** See Pitfall 2 —
  an over-tight `aws:RequestTag` `StringEquals` will make Phase 2's first real apply fail with an
  `AccessDenied` that names an action the policy visibly allows.
- **Editing ADR-0003's Decision section.** It is `locked: true`. INFRA-05 asks you to change the
  *runbooks*, not the ADR. DRIFT-01 changes ADR-0002's **References** section only — a stale
  pointer, not a decision.
- **Deleting `docs/operations/aws-bootstrap.md`'s "Safety boundary" section.** It is still true at
  the end of Phase 1 and PUB-01 depends on it.
- **Adding `tofu` steps to `npm run verify`.** OpenTofu verification is a *separate CI job*
  (`.github/workflows/validate.yml:26-64`). Success criterion 4 lists them as two things: "`npm run
  verify` is green on `main` **and** full OpenTofu verification passes".

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Working out which S3 verbs OpenTofu's state lock needs | A guessed `s3:*` on the state prefix | The four verbs below, on two exact keys | Verified from the OpenTofu source, not inferred |
| Discovering an IAM action's name or whether it can be resource-scoped | Memory, or an AWS blog post | `https://servicereference.us-east-1.amazonaws.com/v1/<service>/<service>.json` | AWS's own machine-readable Service Reference. Every action name in this document was validated against it this session |
| Enumerating the resource types the apply role must cover | Reading the module by eye | `grep -n '^resource' infra/modules/static-site/*.tf` — 21 resources across 5 files | Mechanical and re-runnable when the module grows (ADR-0003 names this as a standing maintenance cost) |
| A trust policy for GitHub OIDC | A new JSON shape | `infra/modules/static-site/iam.tf:4-20` | Already reviewed, already asserted, already documented |
| A policy-assertion idiom for `tofu test` | String matching | `jsondecode(x) == { ... }` per `static_site.tftest.hcl:257-310` | Only form that detects *additions* |
| Deriving the account ID | Committing it | `data "aws_caller_identity" "current"` | PUB-07 forbids committing account identifiers |

**The verified OpenTofu S3-backend permission set** (this is the specification INFRA-02 must satisfy;
the repo's backend uses `use_lockfile = true`, verified verbatim at
`infra/environments/testpilots/backend.hcl.example:2-6`:
`key = "stagehand-docs/terraform.tfstate"`, `encrypt = true`, `use_lockfile = true`):

| Purpose | Action | Resource |
|---------|--------|----------|
| Enumerate / workspace discovery | `s3:ListBucket` | `arn:…:s3:::<state-bucket>` |
| Read state | `s3:GetObject` | `…/stagehand-docs/terraform.tfstate` |
| Read lock holder info | `s3:GetObject` | `…/stagehand-docs/terraform.tfstate.tflock` |
| Acquire lock (`PutObject` + `If-None-Match: *`) | `s3:PutObject` | `…/stagehand-docs/terraform.tfstate.tflock` |
| Release lock | `s3:DeleteObject` | `…/stagehand-docs/terraform.tfstate.tflock` |
| Write state (**apply role only**) | `s3:PutObject` | `…/stagehand-docs/terraform.tfstate` |

**Key insight:** the `.tflock` suffix is not documented on the OpenTofu backend page — it is
`lockFileSuffix = ".tflock"` in
`opentofu/opentofu:internal/backend/remote-state/s3/client.go:39`, with `lockFilePath()` at `:609-611`
returning `fmt.Sprintf("%s%s", c.path, lockFileSuffix)`. The three call sites are `PutObject` with
`IfNoneMatch: aws.String("*")` (`:319-325`), `GetObject` (`:473`), and `DeleteObject` (`:545`).
Guessing this — or copying a DynamoDB-era policy — produces a plan role that hangs on
`Error acquiring the state lock` in Phase 2 with no useful message. **DynamoDB is not used and must
not appear in any policy.**

---

## Runtime State Inventory

Phase 1 writes code and documentation only. It is included here because the *purpose* of the code is
to replace a manual runtime procedure, and the planner must know what already exists in a live
system.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None.** No AWS resource has ever been created — `.planning/PROJECT.md` and `docs/operations/aws-bootstrap.md:148-151` both state no scaffold task has performed an apply; PUB-01 (Phase 2) is the first apply. No pre-existing hand-provisioned plan/apply role can conflict with the new OpenTofu. | none |
| Live service config | **Six GitHub Environments do not yet exist** (PUB-02, Phase 2). Consequence: the six new role ARNs have nowhere to be pasted at the end of Phase 1, and the `infrastructure.yml` plan job continues to short-circuit via its `configured=false` path (`.github/workflows/infrastructure.yml:92-97`). This is expected, not a failure. | none in Phase 1; INFRA-05 must tell the operator *where* the ARNs go |
| OS-registered state | **None** — no scheduler, daemon, or service registration in this repository. Verified: no `pm2`, `systemd`, `launchd`, or Task Scheduler artifact in the tree. | none |
| Secrets / env vars | `TF_VAR_hosted_zone_id` and `TF_VAR_github_oidc_provider_arn` are already the documented mechanism for the *environment* roots (`docs/operations/aws-bootstrap.md:78-79`, verbatim: `export TF_VAR_hosted_zone_id='the-hosted-zone-id'`). If the bootstrap root gains a `hosted_zone_id` variable, reuse the same `TF_VAR_` mechanism rather than adding it to `terraform.tfvars.example`. `.gitignore` covers `terraform.tfvars`, `backend.hcl`, `*.tfstate*`, `*.tfplan`. | extend the runbook, add no new secret |
| Build artifacts | **None affected.** `infra/bootstrap/.terraform/` is gitignored (`.gitignore` lists `.terraform/` and `.tofu/`); the lock file is committed and must not be regenerated (`tofu init -upgrade` would churn it). | do not run `tofu init -upgrade` |

---

## Common Pitfalls

### Pitfall 1: Writing the apply policy around `aws:ResourceTag`

**What goes wrong:** ADR-0003 rule 3 and `docs/operations/github-environments.md:102-105` both say to
scope by "the mandatory `project=stagehand` and matching `environment` tags where AWS supports those
conditions." A natural reading produces `Condition: { StringEquals: { "aws:ResourceTag/project":
"stagehand", "aws:ResourceTag/environment": "beta" } }` on the mutating statements. Every such
statement silently denies everything.

**Why it happens:** `aws:ResourceTag` only exists for actions whose service opted into it. Per AWS's
Service Reference, **CloudFront supports it on 0 of 173 actions, ACM on 0 of 41, Route 53 on 0 of 71,
IAM on 0 of 190**, and S3 only on Access Grants / Access Point actions — never on a bucket action.

**How to avoid:** treat "where AWS supports them" as the escape hatch it is. The complete set of
tag-condition levers actually available in this stack:

| Action | Supported tag condition keys |
|--------|------------------------------|
| `s3:CreateBucket` | `aws:RequestTag/${TagKey}`, `aws:TagKeys` |
| `cloudfront:CreateDistribution` | `aws:RequestTag/${TagKey}`, `aws:TagKeys` |
| `cloudfront:CreateFunction` | `aws:RequestTag/${TagKey}`, `aws:TagKeys` |
| `cloudfront:TagResource` | `aws:RequestTag/${TagKey}`, `aws:TagKeys` |
| `cloudfront:UntagResource` | `aws:TagKeys` |
| `acm:RequestCertificate` | `aws:RequestTag/${TagKey}`, `aws:TagKeys` (plus `acm:DomainNames`, `acm:ValidationMethod`, `acm:KeyAlgorithm`) |
| `acm:AddTagsToCertificate` | `aws:RequestTag/${TagKey}`, `aws:TagKeys` |
| `iam:CreateRole`, `iam:TagRole` | `aws:RequestTag/${TagKey}`, `aws:TagKeys` |

Everything else scopes by ARN or not at all. **Warning sign:** any `aws:ResourceTag` string appearing
anywhere in the new policies.

### Pitfall 2: A tag condition on a create action that the provider does not send tags with

**What goes wrong:** `StringEquals` on `aws:RequestTag/environment` denies the call when the key is
absent. If the AWS provider creates a resource untagged and then tags it in a second call, the create
is denied — and the error names an action the policy plainly allows, which is maximally confusing to
debug from a CI log during Phase 2's first real apply.

**Why it happens:** whether tags ride on the create call is per-resource provider behaviour, not an
API guarantee. AWS's Service Reference does show that the `CreateDistributionWithTags` *operation*
requires both `cloudfront:CreateDistribution` **and** `cloudfront:TagResource` — so if the provider
uses that path, the policy needs both actions or the create fails regardless of conditions.

**How to avoid:** (a) always grant `cloudfront:TagResource` alongside `cloudfront:CreateDistribution`
on `arn:<partition>:cloudfront::<account>:distribution/*`; (b) prefer ARN and name-prefix scoping over
`aws:RequestTag` conditions for the first iteration; (c) if a `RequestTag` condition is used, pair it
with `Null: { "aws:TagKeys": "false" }` when a set operator is involved. **Warning sign:** a Phase 2
apply failing with `AccessDenied` on an action the policy grants.

### Pitfall 3: `ForAllValues` in an Allow statement without a `Null` guard

**What goes wrong:** `acm:DomainNames` and `route53:ChangeResourceRecordSetsNormalizedRecordNames`
are both `ArrayOfString`, so they require a `ForAllValues:` / `ForAnyValue:` set operator. In an
**Allow** statement, `ForAllValues` evaluates to `TRUE` when the context key is absent — so a request
that carries no domain names is *allowed*, and the intended restriction evaporates.

**How to avoid:** always pair it, e.g.

```json
"Condition": {
  "Null": { "acm:DomainNames": "false" },
  "ForAllValues:StringEquals": { "acm:DomainNames": ["beta.puppetstagehand.com"] }
}
```

Equally: never put `ForAnyValue`/`ForAllValues` on a scalar key. `acm:ValidationMethod` is `String`,
`acm:DomainNames` is `ArrayOfString` — verified individually. **Warning sign:** a set operator with no
sibling `Null` in an `Effect: Allow` statement.

### Pitfall 4: The `stable` apex does not match `*.puppetstagehand.com`

**What goes wrong:** scoping `route53:ChangeResourceRecordSetsNormalizedRecordNames` with
`StringLike: "*.puppetstagehand.com"` silently excludes the apex record `puppetstagehand.com`, which
only the `stable` environment creates (`infra/environments/stable/main.tf:47` —
`alternate_domain_names = ["puppetstagehand.com"]`). `stable`'s apply then fails at the very moment it
performs the deliberate DNS cutover.

**Also:** ACM DNS-validation records are `_<hash>.<domain>` with names unknown until
`aws_acm_certificate.site` exists (`infra/modules/static-site/acm.tf:15-31` derives them from
`domain_validation_options`), so the record-name condition must admit a `_`-prefixed subdomain of each
alias.

**How to avoid:** build the allowed record-name list per environment from `local.site[env].domain_names`
and include both the exact names and a `_*.` validation form; for `stable`, that is
`www.puppetstagehand.com`, `puppetstagehand.com`, and their `_`-prefixed validation names. Constrain
`route53:ChangeResourceRecordSetsRecordTypes` to `["A", "AAAA", "CNAME"]` — `A`/`AAAA` for the two
alias records (`infra/modules/static-site/dns.tf:6`, `:20`), `CNAME` for validation
(`infra/modules/static-site/acm.tf:27` uses `each.value.type` from the validation option, which is
`CNAME` for DNS validation). **Warning sign:** a policy whose record-name pattern list is shorter for
`stable` than for `beta`.

### Pitfall 5: Collapsing bootstrap's two different tag shapes into one `required_tags`

**What goes wrong:** INFRA-06 asks for "a shared `required_tags` local rather than ad-hoc literals",
but bootstrap has **two legitimately different** tag shapes, and the existing test asserts both by
exact map equality:

- `aws_s3_bucket.state` (`infra/bootstrap/main.tf:10-13`, verbatim):
  ```hcl
  tags = {
    project     = "stagehand"
    environment = each.key
  }
  ```
- `aws_iam_openid_connect_provider.github` (`infra/bootstrap/main.tf:82-84`, verbatim):
  ```hcl
  tags = {
    project = "stagehand"
  }
  ```

`infra/bootstrap/tests/bootstrap.tftest.hcl:91` asserts
`bucket.tags == tomap({ project = "stagehand", environment = environment })` and `:128` asserts
`aws_iam_openid_connect_provider.github.tags == tomap({ project = "stagehand" })`. Replacing both with
one map breaks one of the two.

**How to avoid:** `local.required_tags = { project = "stagehand" }` for account-global resources, and
`merge(local.required_tags, { environment = each.key })` for the per-environment state buckets. The
six new IAM roles are **per-environment**, so they carry both — matching `static-site`'s
`local.required_tags` (`infra/modules/static-site/locals.tf:2-5`, verbatim:
`required_tags = { project = "stagehand"  environment = var.environment }`) and satisfying the
PROJECT.md tag constraint.

**Warning sign:** `bootstrap.tftest.hcl` runs `creates_private_encrypted_versioned_state_buckets` or
`creates_one_project_tagged_github_oidc_provider` turning red.

### Pitfall 6: Breaking `scripts/check-tofu-tags.sh` while extending it

**What goes wrong:** the script is `#!/bin/sh` with `set -eu` (`scripts/check-tofu-tags.sh:1-2`) and
uses the idiom `if offending=$(rg -n --pcre2 '…' "$module_dir" --glob '*.tf'); then … exit 1; fi`
(`:84-89`) — it relies on `rg` exiting **1** when nothing matches. A naive copy of that block for the
bootstrap root will fire on `aws_s3_bucket.state`'s legitimate two-key literal, or, if written
without the `$(...)`-in-`if` guard, will abort the whole script under `set -e`.

Its environment enumeration is also **hard-coded to `infra/environments`**
(`:4`, `:6`, `:13-20`, verbatim: `expected_environments="beta stable testpilots"`), and its second
`rg` rule to `infra/modules/static-site` (`:5`). Neither covers `infra/bootstrap`.

**How to avoid:** add bootstrap as its own rule with its own expectations (account-global resources
carry `project` only; per-environment ones carry both), keep the existing two rules untouched, and
re-run `./scripts/check-tofu-tags.sh` — it prints
`Verified OpenTofu tag policy for testpilots, beta, and stable.` and exits 0 today (run this session).
Update that final message if the coverage widens.

### Pitfall 7: The apply policy overflowing the inline-policy budget

**What goes wrong:** aggregate inline policy size per **role** cannot exceed **10,240 characters** —
and it is aggregate, so splitting into two `aws_iam_role_policy` resources does not help. The apply
role must cover 21 module resources across S3, CloudFront, ACM, Route 53 and IAM; a fully enumerated,
condition-bearing policy can approach that ceiling.

**How to avoid:** `jsonencode()` emits whitespace-free JSON and IAM does not count whitespace anyway,
so the practical budget is generous — but measure. Add a `tofu test` assertion such as
`length(aws_iam_role_policy.infrastructure_apply["stable"].policy) < 10240`. If it overflows, move to
`aws_iam_policy` (6,144 chars each, up to 20 attachable per role) — do not start there. Related
ceiling: **role trust policy length is 2,048 characters by default** (raisable to 8,192); the
single-statement trust policies here are ~400 characters, so this is only a risk if someone adds
statements.

### Pitfall 8: GitHub immutable subject claims

**What goes wrong:** if `puppet-stagehand` ever enables immutable subject claims, the `sub` becomes
`repo:puppet-stagehand@<orgid>/stagehand-docs@<repoid>:environment:beta` and **all seven** OIDC trust
policies in this repository (six new + the existing deploy role) stop matching.

**How to avoid:** nothing to do in Phase 1 — the new roles must match the existing shipped deploy role,
which uses the mutable form. Record it as a known coupling so a future account-level GitHub change is
recognised as the cause rather than debugged from scratch. **Warning sign:** every environment failing
`AssumeRoleWithWebIdentity` simultaneously, with no repository change.

---

## Code Examples

All four skeletons below were **executed** this session against `OpenTofu v1.12.6` with the repo's
locked `hashicorp/aws 6.61.0`, in a scratch copy of `infra/bootstrap/`. `tofu validate`,
`tofu fmt -check -recursive`, and `tofu test` all passed. They are starting points to adapt, not
finished policies — in particular the permission statements below are deliberately abbreviated.

### Pattern 1 — trust policy, one subject, no wildcard (INFRA-01)

```hcl
# Adapted from infra/modules/static-site/iam.tf:4-20 (the shipped, reviewed shape).
resource "aws_iam_role" "infrastructure_plan" {
  for_each = local.site

  name = "stagehand-${each.key}-infrastructure-plan"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "GitHubActionsPlanEnvironment"
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${local.github_repository}:environment:${each.key}-plan"
        }
      }
    }]
  })

  tags = merge(local.required_tags, { environment = each.key })
}
```

The apply-role variant is identical with `:environment:${each.key}` (no `-plan`) and
`Sid = "GitHubActionsApplyEnvironment"`. The subject strings this produces are exactly the six the
runbook already documents at `docs/operations/github-environments.md:87-94`.

### Pattern 2 — plan-role state access, lock-scoped writes only (INFRA-02)

```hcl
{
  Sid      = "ListStateBucket"
  Effect   = "Allow"
  Action   = "s3:ListBucket"
  Resource = aws_s3_bucket.state[each.key].arn
},
{
  Sid    = "ReadStateAndLock"
  Effect = "Allow"
  Action = "s3:GetObject"
  Resource = [
    "${aws_s3_bucket.state[each.key].arn}/stagehand-docs/terraform.tfstate",
    "${aws_s3_bucket.state[each.key].arn}/stagehand-docs/terraform.tfstate.tflock",
  ]
},
{
  Sid      = "HoldStateLock"
  Effect   = "Allow"
  Action   = ["s3:PutObject", "s3:DeleteObject"]
  Resource = "${aws_s3_bucket.state[each.key].arn}/stagehand-docs/terraform.tfstate.tflock"
},
```

`s3:PutObject` on `…/terraform.tfstate` (without `.tflock`) is the **only** difference in the apply
role's state block. The key `stagehand-docs/terraform.tfstate` is verified verbatim from
`infra/environments/testpilots/backend.hcl.example:3` and from the two workflows' inline backend
config (`.github/workflows/infrastructure.yml:130`, `:235` — both
`-backend-config='key=stagehand-docs/terraform.tfstate'`).

### Pattern 3 — the `tofu test` file that discharges GATE-01

```hcl
mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_data "aws_partition" {
    defaults = { partition = "aws" }
  }
  # Deliberately NO mock_resource "aws_s3_bucket": leaving state-bucket ARNs
  # generated is what lets the per-environment scoping assertion below mean something.
}

variables {
  state_bucket_names = {
    testpilots = "stagehand-testpilots-state-test"
    beta       = "stagehand-beta-state-test"
    stable     = "stagehand-stable-state-test"
  }
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
    error_message = "Each plan role must trust exactly one -plan GitHub Environment subject, with no wildcard and no extra statement."
  }

  assert {
    condition = alltrue([
      for e, policy in aws_iam_role_policy.infrastructure_plan :
      jsondecode(policy.policy).Statement[0].Resource == aws_s3_bucket.state[e].arn &&
      jsondecode(policy.policy).Statement[2].Resource == "${aws_s3_bucket.state[e].arn}/stagehand-docs/terraform.tfstate.tflock"
    ])
    error_message = "Each plan role must be scoped to its own state bucket and only its own lock object."
  }
}
```

Additional runs the planner should require, one assertion each, to cover "permission scope" for all
six roles:

- **no plan role can write state** — assert no statement in any plan policy has
  `Resource` ending `/terraform.tfstate` with `s3:PutObject` in its `Action`.
- **no policy contains a bare `*` action** — assert `!contains(flatten([...Action...]), "*")`.
- **no apply role reaches another environment** — assert the `beta` apply policy's rendered JSON
  contains neither `testpilots` nor `stable` (a `strcontains` check is appropriate *here*, because
  the property is an absence).
- **apply policy fits the inline budget** — `length(policy.policy) < 10240`.
- **no `iam:PassRole` / `sts:AssumeRole`** anywhere in the six permission policies.

### Pattern 4 — outputs (INFRA-04)

```hcl
output "infrastructure_plan_role_arns" {
  description = "Plan role ARNs keyed by Stagehand environment; paste into the matching -plan GitHub Environment."
  value       = { for environment, role in aws_iam_role.infrastructure_plan : environment => role.arn }
}

output "infrastructure_apply_role_arns" {
  description = "Apply role ARNs keyed by Stagehand environment; paste into the matching apply GitHub Environment."
  value       = { for environment, role in aws_iam_role.infrastructure_apply : environment => role.arn }
}
```

This mirrors the existing `state_bucket_names` output exactly (`infra/bootstrap/outputs.tf:6-9`,
verbatim: `value       = { for environment, bucket in aws_s3_bucket.state : environment => bucket.id }`),
so the runbook's existing capture idiom
(`tofu -chdir=infra/bootstrap output -json state_bucket_names | jq -r '.testpilots'`,
`docs/operations/aws-bootstrap.md:36`) extends verbatim.

### Pattern 5 — verified apply-role scoping levers

Every action name below was validated against AWS's Service Reference this session. `res` records
whether the action can be resource-scoped at all.

| Concern | Actions | Scoping available |
|---------|---------|-------------------|
| Content bucket | `s3:CreateBucket`, `DeleteBucket`, `ListBucket`, `ListBucketVersions`, `GetBucketLocation`, `Get/PutBucketTagging`, `Get/Put/DeleteBucketPolicy`, `Get/PutBucketVersioning`, `Get/PutBucketPublicAccessBlock`, `Get/PutBucketOwnershipControls`, `Get/PutEncryptionConfiguration`, `Get/PutLifecycleConfiguration`, `GetBucketAcl`, `GetBucketCORS`, `GetBucketWebsite`, `GetBucketLogging`, `GetAccelerateConfiguration`, `GetBucketRequestPayment`, `GetReplicationConfiguration`, `GetBucketObjectLockConfiguration`, `GetBucketNotification` | `arn:<p>:s3:::stagehand-<env>-site-*` — bucket name comes from `bucket_prefix = "stagehand-${var.environment}-site-"` (`infra/modules/static-site/s3.tf:2`, verbatim). The `Get*` reads are what `tofu` refresh calls; omitting them makes every plan noisy or failing. |
| CloudFront distribution | `CreateDistribution` + `TagResource` (create), `UpdateDistribution`, `DeleteDistribution`, `GetDistribution`, `GetDistributionConfig`, `ListTagsForResource` | `CreateDistribution` has **no resource type** → `Resource: "*"`. The rest scope to `arn:<p>:cloudfront::<acct>:distribution/*` (ID is server-assigned, so `*` is unavoidable) |
| CloudFront policies & OAC | `CreateCachePolicy`, `CreateResponseHeadersPolicy`, `CreateOriginAccessControl` | **No resource type and no condition keys at all** → `Resource: "*"`, unconditioned. Their `Get*/Update*/Delete*` counterparts scope to `cache-policy/*`, `response-headers-policy/*`, `origin-access-control/*` |
| CloudFront function | `CreateFunction`, `DescribeFunction`, `GetFunction`, `UpdateFunction`, `PublishFunction`, `DeleteFunction` | `CreateFunction` is `Resource: "*"`; the rest scope to `arn:<p>:cloudfront::<acct>:function/stagehand-<env>-site-paths` — the function ARN is **by name** (`function/${Name}`), so this one *is* precisely scopable. Name verified at `infra/modules/static-site/cloudfront.tf:126` (verbatim: `name    = "stagehand-${var.environment}-site-paths"`) |
| ACM certificate | `RequestCertificate`, `DescribeCertificate`, `DeleteCertificate`, `ListCertificates`, `AddTagsToCertificate`, `ListTagsForCertificate` | `RequestCertificate` is `Resource: "*"` but supports **`acm:DomainNames`** (`ArrayOfString`) — the strongest lever available. `acm:ValidationMethod` (`String`) can pin `DNS`. The rest scope to `certificate/*`. **`us-east-1` only** — the cert uses the `aws.us_east_1` alias (`infra/modules/static-site/acm.tf:2`), so an `aws:RequestedRegion` condition is a further tightening |
| Route 53 | `ChangeResourceRecordSets`, `ListResourceRecordSets`, `GetHostedZone`, `GetChange` | `ChangeResourceRecordSets` scopes to `arn:<p>:route53:::hostedzone/<id>` and supports `route53:ChangeResourceRecordSetsNormalizedRecordNames`, `...RecordTypes`, `...Actions` (all `ArrayOfString`). `GetChange` scopes to `change/*` |
| Deploy IAM role | `CreateRole`, `GetRole`, `DeleteRole`, `TagRole`, `UntagRole`, `ListRoleTags`, `UpdateAssumeRolePolicy`, `PutRolePolicy`, `GetRolePolicy`, `DeleteRolePolicy`, `ListRolePolicies`, `ListAttachedRolePolicies`, `ListInstanceProfilesForRole` | **All scope to `arn:<p>:iam::<acct>:role/stagehand-<env>-site-deploy`** — exact, no wildcard. Name verified at `infra/modules/static-site/iam.tf:2` (verbatim: `name = "stagehand-${var.environment}-site-deploy"`). Do **not** widen to `role/*` |
| Identity | `sts:GetCallerIdentity` | `Resource: "*"` — unavoidable and harmless; the provider calls it on every operation |

---

## Documentation Edit Map (INFRA-05, DRIFT-01/02/03)

Exact locations, read this session.

| Requirement | File | Lines | Current text (quoted) | Required change |
|-------------|------|-------|------------------------|-----------------|
| INFRA-05 | `docs/operations/github-environments.md` | `77-108` | Section heading `## Provision separate infrastructure roles`; `:79-82` — "The current OpenTofu bootstrap creates the state buckets and shared OIDC provider… Neither creates `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN` nor `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN`. An authorized AWS administrator must provision both after bootstrap and before enabling infrastructure automation." | Replace the manual-provisioning instruction with the bootstrap-output path. **Keep** the subject list at `:87-94` and the scoping prose at `:97-105` — ADR-0003 rule 3 makes them the specification. **Keep** `:107-108` ("Have a second administrator review the trust and permission policies before storing the ARNs in GitHub.") |
| INFRA-05 | `docs/operations/aws-bootstrap.md` | `17-20` | "The bootstrap requires initial local administrative authority. It creates three private, versioned state buckets and the shared GitHub OIDC provider. It does **not** create the plan and apply roles used by the infrastructure workflow; provision those roles separately with the least-privilege model in the [GitHub Environments guide](github-environments.md)." | Rewrite: bootstrap now creates six plan/apply roles too. Keep "requires initial local administrative authority" verbatim (ADR-0003 rule 4). |
| INFRA-05 | `docs/operations/aws-bootstrap.md` | `29-40` | The §1 command block ending `tofu -chdir=infra/bootstrap output -json state_bucket_names \| jq -r '.stable'` then `rm -f infra/bootstrap/bootstrap.tfplan` | Add the two new `output -json` captures before the `rm`. The `rm` must stay last — `:42-44` explains why. |
| INFRA-05 | `docs/operations/aws-bootstrap.md` | `46-47` | "Record the `github_oidc_provider_arn` and the three `state_bucket_names` outputs in the protected configuration system without display quotes." | Extend to the six role ARNs; keep "without display quotes". |
| DRIFT-01 | `docs/adr/0002-github-environment-model.md` | `139-141` | "Ownership of `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN` and `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN` is not settled by this ADR. Neither role is created by the bootstrap or the site stack; see `docs/operations/github-environments.md` until a separate ADR records an owner." | Replace with a pointer to `docs/adr/0003-infrastructure-iam-role-ownership.md`. **References section only — do not touch the Decision section of a locked ADR.** |
| DRIFT-02 | `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md` | `178` | "before merge. GitHub Environments are named `testpilots`, `beta`, and `stable`." | Amend to the six-Environment model per ADR-0002 rule 3. |
| DRIFT-03 | `docs/superpowers/plans/2026-08-22-stagehand-docs-site.md` | `9` and `105` | `:9` — "…Astro 7.2.4, TypeScript 7.0.2, Bootstrap 5.3.8…"; `:105` — `"typescript": "7.0.2",` | Reconcile with the working tree. `package.json:53` is verbatim `"typescript": "6.0.3",` — the tree is authoritative (`.planning/PROJECT.md:124-126`), so correct the plan to `6.0.3` in both places. |

**Two further candidates the planner must rule in or out** (both bear on success criterion 5, "no
source document still claims the site has three GitHub Environments"):

- `docs/superpowers/plans/2026-08-22-stagehand-docs-site.md:21` — verbatim: "- Environment names are
  exactly `testpilots`, `beta`, and `stable`." This is the **exact sentence ADR-0002 rule 2 says it
  amends** ("The implementation plan's global constraint is amended to read: OpenTofu environment
  names are exactly `testpilots`, `beta`, and `stable`."). Strong case for in-scope.
- `.planning/intel/constraints.md:147` carries the design-spec sentence verbatim as a *record* with
  the ADR-0002 override attached. It is an ingest artifact, not a source document. Probably leave it;
  decide explicitly rather than by omission.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DynamoDB table for OpenTofu state locking | S3-native conditional-write locking (`use_lockfile = true`) | OpenTofu 1.10 | The repo already uses it (`backend.hcl.example:6`). A DynamoDB-era IAM policy template is wrong here — **no `dynamodb:*` action belongs in any of the six policies** |
| `aws_iam_role { inline_policy { … } }` | Separate `aws_iam_role_policy` resource | AWS provider v6 | The repo already uses the separate resource (`static-site/iam.tf:25`). Do not reintroduce the nested block |
| OIDC provider `thumbprint_list` required | Optional for the GitHub Actions provider | AWS, mid-2023 | `infra/bootstrap/main.tf:77-85` correctly omits it; do not add one |
| Hand-provisioned CI roles documented in prose | Roles as reviewable OpenTofu with `tofu plan` drift detection | ADR-0003, this phase | The whole point of the phase |

**Deprecated/outdated:**

- Reading IAM action lists from blog posts or memory. AWS's machine-readable Service Reference
  (`https://servicereference.us-east-1.amazonaws.com/`) is authoritative, current, and diffable.
- `aws:ResourceTag`-based least privilege for CloudFront/ACM/Route 53/IAM. It has never worked; see
  Pitfall 1.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The AWS provider sends tags on the *create* call for `aws_cloudfront_distribution`, `aws_cloudfront_function`, `aws_acm_certificate`, `aws_s3_bucket` and `aws_iam_role`, so an `aws:RequestTag` `StringEquals` condition would be satisfiable | Pitfall 2 | An over-tight create condition makes Phase 2's first apply fail with a confusing `AccessDenied`. **Mitigation: do not add `aws:RequestTag` conditions in the first iteration.** Not verified — provider-internal behaviour, not stated in any authoritative doc |
| A2 | `route53:ChangeResourceRecordSetsNormalizedRecordNames` values are lowercase and carry no trailing dot | Pitfall 4 | A record-name condition that never matches → `stable` DNS cutover fails. Verified only that the key exists and is `ArrayOfString`; normalisation semantics not confirmed against AWS docs this session |
| A3 | The ACM DNS-validation record type is `CNAME` for all three environments | Pitfall 4 | An over-tight `RecordTypes` condition blocks validation and the apply hangs. Derived from `aws_acm_certificate.site.validation_method = "DNS"` (`acm.tf:6`) and standard ACM behaviour, not from a per-account observation |
| A4 | `tofu plan` never writes the state object, so a plan role with no `s3:PutObject` on `…/terraform.tfstate` is sufficient | Don't Hand-Roll table | A plan job fails on a state-schema upgrade or first-run migration. True in normal operation; state-upgrade paths were not tested |
| A5 | The fully enumerated apply policy fits inside 10,240 characters | Pitfall 7 | Requires mid-phase rework to customer-managed policies. Mitigate with the `length()` assertion in Pattern 3 |
| A6 | `docs/superpowers/plans/…:21` is in scope for this phase | Documentation Edit Map | Success criterion 5 not fully met, or scope creep. **Needs a planner decision, not a guess** |
| A7 | The bootstrap root's new `hosted_zone_id` should be supplied via `TF_VAR_hosted_zone_id` rather than `terraform.tfvars.example` | Runtime State Inventory | Operator confusion, or an inconsistency with the §2 runbook idiom. Inferred from `aws-bootstrap.md:74-83`, which uses `TF_VAR_` for exactly this value in the environment roots |

---

## Open Questions

1. **How should CloudFront's unscopable creates be characterised in the runbook?**
   - *What we know:* `cloudfront:CreateDistribution`, `CreateCachePolicy`, `CreateResponseHeadersPolicy`,
     `CreateOriginAccessControl` and `CreateFunction` have no IAM resource type — verified. They must be
     `Resource: "*"`.
   - *What's unclear:* `docs/operations/github-environments.md:102-105` currently promises scoping "by
     known ARNs, hosted zone, resource-name prefixes, and the mandatory `project=stagehand` and matching
     `environment` tags." Leaving that sentence untouched while the OpenTofu grants `Resource: "*"`
     recreates exactly the prose-versus-reality drift ADR-0003 rule 3 forbids.
   - *Recommendation:* amend the runbook in the same change, naming the residual `Resource: "*"` set
     explicitly and why. ADR-0003 rule 3 authorises amending the runbook ("the runbook is amended or the
     OpenTofu is corrected"). Surface this to the user at plan review — it is a visible weakening of a
     documented security promise, even though it is the honest description of what AWS permits.

2. **Should the plan role's `Describe`/`Get`/`List` set be enumerated or wildcarded per service?**
   - *What we know:* `docs/operations/github-environments.md:97-99` says "relevant `Get`, `List`, and
     `Describe` operations". Wildcards like `cloudfront:Get*` are far shorter and survive module growth;
     enumeration is tighter and is what the shipped deploy-role test's error message
     (`static_site.tftest.hcl:309`) sets as the house standard ("no additional actions… wildcards").
   - *Recommendation:* enumerate. The `tofu test` assertion style the repo already uses makes an
     enumerated list cheap to maintain and a wildcard impossible to sneak past review. If the character
     budget forces a choice, wildcard only the read-only verbs, never a mutating one.

3. **Should the apply role carry a permissions boundary on `iam:CreateRole`?**
   - *What we know:* the apply role must create and policy-attach `stagehand-<env>-site-deploy`. That is
     IAM-write authority held by a CI-assumable identity — the escalation path ADR-0003's Consequences
     already acknowledges. `iam:CreateRole` and `iam:PutRolePolicy` both support the
     `iam:PermissionsBoundary` condition key (verified).
   - *What's unclear:* a boundary policy is a seventh managed policy in the bootstrap root and a further
     maintenance surface; ADR-0003 did not call for one.
   - *Recommendation:* out of scope for v1 (nothing requires it), but worth capturing as an OPS-class v2
     backlog item. Do not silently add it — it changes the deploy role's effective permissions.

4. **Does `beta`/`stable` need the `us-east-1` ACM scoping condition?**
   - *What we know:* the certificate is created through the `aws.us_east_1` provider alias
     (`infra/modules/static-site/acm.tf:2`); everything else is `var.aws_region`, default `us-east-2`.
   - *Recommendation:* add `aws:RequestedRegion` conditions splitting ACM (`us-east-1`) from the regional
     services. It is cheap, verified-supported, and materially narrows the role. Cross-check against the
     runbook's §4 tag-audit prose, which already reasons in two regions
     (`aws-bootstrap.md:121-128`).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| OpenTofu | authoring, `fmt`, `validate`, `test` | ✓ | `1.12.6` (matches `.opentofu-version` exactly) | — |
| `hashicorp/aws` provider | all `.tf` | ✓ | `6.61.0` (cached; `tofu init -backend=false` on bootstrap succeeded this session) | — |
| `ripgrep` | `scripts/check-tofu-tags.sh` | ✓ | 15.2.0 | — |
| `jq` | runbook output-capture commands | ✓ | jq-1.7.1 | — |
| AWS CLI | not needed in Phase 1 (needed for PUB-01) | ✓ | aws-cli/2.34.0 | — |
| `gh` | not needed in Phase 1 | ✓ | 2.98.0 | — |
| AWS credentials / an AWS account | **not needed in Phase 1** — all tests use `mock_provider` | ✗ | — | None needed. Phase 1 must not require them |
| Node.js 24.x | `npm run verify` (standing gate) | ⚠ **wrong version** | `v26.7.0` on PATH; `package.json:6-9` requires `"node": ">=24 <25"` and `.npmrc` sets `engine-strict=true`; `.nvmrc` pins `24` | `nvm use` before any npm command. **CI is unaffected** — `.github/actions/setup-site` handles this |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:**
- Node 24 for the local `npm run verify` run — use `nvm use` (`.nvmrc` = `24`). Without it,
  `engine-strict=true` makes `npm ci`/`npm install` fail outright, which will look like a broken
  repository rather than a version mismatch.

**Baseline verified this session (before any change):**
```
tofu -chdir=infra/bootstrap init -backend=false   # OK
tofu -chdir=infra/bootstrap validate              # Success! The configuration is valid.
tofu -chdir=infra/bootstrap test                  # Success! 7 passed, 0 failed.
./scripts/check-tofu-tags.sh                      # Verified OpenTofu tag policy for testpilots, beta, and stable. (exit 0)
```

---

## Validation Architecture

`.planning/config.json` sets `"nyquist_validation": true`, so this section applies.

### Test Framework

| Property | Value |
|----------|-------|
| Framework (this phase) | `tofu test` — OpenTofu 1.12.6 built-in, `*.tftest.hcl` |
| Framework (site, unaffected) | Vitest 4.1.11 + Playwright 1.62.1 |
| Config file | none — `tofu test` discovers `tests/*.tftest.hcl` relative to the root under `-chdir` |
| Quick run command | `tofu -chdir=infra/bootstrap test` (runs in ~2 s after `init -backend=false`) |
| Full suite command | `tofu fmt -check -recursive infra && ./scripts/check-tofu-tags.sh && tofu -chdir=infra/modules/static-site init -backend=false && tofu -chdir=infra/modules/static-site test && for root in infra/bootstrap infra/environments/testpilots infra/environments/beta infra/environments/stable; do tofu -chdir="$root" init -backend=false && tofu -chdir="$root" validate && tofu -chdir="$root" test; done` — copied from `.github/workflows/validate.yml:46-64` |
| Standing site gate | `npm run verify` — unchanged by this phase; must stay green |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Six roles exist; each trust policy names exactly one Environment subject; no wildcard | unit (`tofu test`) | `tofu -chdir=infra/bootstrap test` | ❌ Wave 0 — `infra/bootstrap/tests/iam-github-actions.tftest.hcl` |
| INFRA-02 | Plan policy = state read + lock-only writes + read-only site actions; no state write; no mutation | unit | same | ❌ Wave 0 |
| INFRA-03 | Apply policy adds only the module's create/update/tag/delete actions; no cross-environment ARN; no `iam:PassRole`/`sts:AssumeRole`; no bare `*` action | unit | same | ❌ Wave 0 |
| INFRA-04 | Both new outputs exist and are keyed by the three environments | unit | same (assert on `output.infrastructure_plan_role_arns`) | ❌ Wave 0 |
| INFRA-05 | Runbooks describe the OpenTofu path and retain the human-apply + two-reviewer language | **manual-only** | — | Human review. No automatable assertion exists for prose intent; add a `checkpoint:human-verify` task |
| INFRA-06 | Bootstrap tags flow from a shared local; tag checker covers bootstrap | unit + shell | `tofu -chdir=infra/bootstrap test && ./scripts/check-tofu-tags.sh` | ⚠ partial — `bootstrap.tftest.hcl:88-94` and `:124-131` already assert both tag shapes; `check-tofu-tags.sh` needs extending |
| DRIFT-01/02/03 | Stale sentences corrected | **manual-only** | `grep -rn "7\.0\.2" docs/` returns nothing; `grep -n "until a separate ADR records an owner" docs/adr/0002-*.md` returns nothing | ⚠ greppable post-conditions exist — cheap to add as verification steps even without a test file |
| GATE-01 | `fmt`/`init`/`validate`/`test`/tag-check all green on the bootstrap root | integration | the Full suite command above | ✅ already wired in `validate.yml:26-64` and `infrastructure.yml:49-61` |

### Sampling Rate

- **Per task commit:** `tofu fmt -check -recursive infra && tofu -chdir=infra/bootstrap validate && tofu -chdir=infra/bootstrap test` (~5 s)
- **Per wave merge:** the Full suite command + `./scripts/check-tofu-tags.sh`
- **Phase gate:** `npm run verify` green **and** the full OpenTofu suite green, on `main`, before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `infra/bootstrap/tests/iam-github-actions.tftest.hcl` — covers INFRA-01, INFRA-02, INFRA-03, INFRA-04, GATE-01
- [ ] Extend `scripts/check-tofu-tags.sh` with a bootstrap rule — covers INFRA-06, GATE-01
- [ ] No framework install needed — `tofu test` is built in and five `.tftest.hcl` files already exist
- [ ] No CI wiring needed — both workflows already run `tofu -chdir=infra/bootstrap test`

---

## Security Domain

`.planning/config.json` contains no `security_enforcement` key, so enforcement is enabled by default.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | GitHub OIDC federation via `aws_iam_openid_connect_provider.github`; **no long-lived AWS access keys** (`github-environments.md:74-75`, verbatim: "Do not create AWS access-key secrets.") |
| V3 Session Management | yes | Short-lived STS credentials only; `aud = sts.amazonaws.com` pinned in every trust policy |
| V4 Access Control | **yes — the core of this phase** | One role per Environment per tier; no sharing; no wildcard subject; ARN- and name-prefix-scoped permission policies |
| V5 Input Validation | yes | Existing OpenTofu `validation` blocks (`infra/bootstrap/variables.tf:6-9`, `:16-37`); any new `github_repository` variable should mirror `infra/modules/static-site/variables.tf:63-66`, verbatim: `condition     = var.github_repository == "puppet-stagehand/stagehand-docs"` |
| V6 Cryptography | no (indirect) | State buckets already use SSE-S3 (`main.tf:41-45`); no new crypto decision in this phase |
| V14 Configuration | yes | `tofu test` + `check-tofu-tags.sh` are the configuration-assurance controls; CODEOWNERS on `/infra/` is the review control |

### Known Threat Patterns for OpenTofu-managed GitHub-OIDC CI roles

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Wildcard `sub` in a trust policy (`repo:org/repo:*`) lets any branch or any Environment assume the role | Elevation of Privilege | Exactly one `StringEquals` subject per role; asserted by exact-JSON `tofu test`. INFRA-01, ADR-0003 rule 2 |
| Missing `aud` condition — a token minted for another audience is accepted | Spoofing | `"token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"` in every trust policy |
| A pull-request-triggered job reaching a mutating role | Elevation of Privilege | Three controls, all required: the job-level same-repository guard (`infrastructure.yml:65`), the `refs/pull/*/merge` Environment branch rule, and the plan role's read-only permission policy. ADR-0002 rule 4 names the first as non-substitutable |
| Plan role able to overwrite remote state | Tampering | `s3:PutObject` scoped to `…terraform.tfstate.tflock` only, never `…terraform.tfstate`. Assert the absence in `tofu test` |
| Cross-environment lateral movement (a `beta` role touching `stable` resources) | Elevation of Privilege | Per-environment ARNs and name prefixes throughout; assert that a rendered policy contains no other environment's name |
| Apply role widening its own permissions via a merged pull request | Elevation of Privilege | CODEOWNERS review on `/infra/` **plus** a merged change having no effect until an administrator applies bootstrap locally. ADR-0003 Context `:50-55` and rule 4 |
| Apply role escalating through `iam:PutRolePolicy` on an assumable role | Elevation of Privilege | Scope every IAM action to the single exact ARN `role/stagehand-<env>-site-deploy`; forbid `iam:PassRole` and `sts:AssumeRole`. Open Question 3 covers the optional permissions boundary |
| Secrets leaking through plan output | Information Disclosure | Unchanged by this phase: the plan job emits a value-free summary and uploads no binary plan (`infrastructure.yml:135-152`). The role ARNs are GitHub Environment **variables**, not secrets, by design |
| Account ID committed to a public repository | Information Disclosure | Use `data "aws_caller_identity"`, never a literal. PUB-07; `.gitignore` covers `terraform.tfvars` |

---

## Sources

### Primary (HIGH confidence)

- **Working tree, read this session** — `infra/bootstrap/{main,outputs,variables,versions,providers}.tf`,
  `infra/bootstrap/tests/bootstrap.tftest.hcl`, `infra/bootstrap/.terraform.lock.hcl`,
  `infra/modules/static-site/{iam,s3,cloudfront,acm,dns,locals,variables,outputs,versions}.tf`,
  `infra/modules/static-site/tests/static_site.tftest.hcl`,
  `infra/environments/{testpilots,beta,stable}/{main.tf,variables.tf,backend.hcl.example}`,
  `infra/environments/testpilots/tests/root.tftest.hcl`, `scripts/check-tofu-tags.sh`,
  `.github/workflows/{validate,infrastructure}.yml`, `package.json`, `CODEOWNERS`, `.npmrc`, `.nvmrc`,
  `.opentofu-version`, `.gitignore`, `SECURITY.md`,
  `docs/adr/000{1,2,3}-*.md`, `docs/operations/{aws-bootstrap,github-environments}.md`,
  `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md`,
  `docs/superpowers/plans/2026-08-22-stagehand-docs-site.md`,
  `.planning/{REQUIREMENTS,STATE,ROADMAP,PROJECT,INGEST-CONFLICTS,config.json}`
- **Executed verification this session** — `tofu -chdir=infra/bootstrap init -backend=false / validate /
  test` (7 passed, 0 failed); `./scripts/check-tofu-tags.sh` (exit 0); an executable spike proving the
  `mock_data` + exact-JSON + symbolic-ARN assertion patterns (`tofu validate`, `tofu fmt -check
  -recursive`, `tofu test` all green)
- **AWS Service Reference (machine-readable, official)** — `https://servicereference.us-east-1.amazonaws.com/v1/{cloudfront,acm,route53,s3,iam,sts}/*.json`
  — every IAM action name, resource type, and condition key in this document validated against it
- **OpenTofu source** — `opentofu/opentofu:internal/backend/remote-state/s3/client.go` (`lockFileSuffix`,
  `lockFilePath()`, the `PutObject`/`GetObject`/`DeleteObject` lock call sites)
- **`aws-actions/configure-aws-credentials` `action.yml`** (`main`) — `audience` input default
  `sts.amazonaws.com`

### Secondary (MEDIUM confidence)

- `https://opentofu.org/docs/language/settings/backends/s3/` — S3 bucket permission list, `use_lockfile`
  semantics, `state_tags`/`lock_tags`
- `https://opentofu.org/docs/cli/commands/test/` — `mock_provider` / `mock_data` / `override_*`
  semantics and the automatically-generated-value rules
- `https://docs.github.com/en/actions/reference/security/oidc` — `sub` claim format
  `repo:ORG-NAME/REPO-NAME:environment:ENVIRONMENT-NAME`; immutable-claim variant
- `https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html` — 10,240 / 6,144 /
  2,048 / 20 / 25 limits
- Anthropic `aws-core` plugin `aws-iam` skill, `references/common-pitfalls.md` — `ForAllValues` in Allow
  statements requires a `Null` guard

### Tertiary (LOW confidence)

- None. Every claim in this document traces to a file read this session, a command executed this
  session, or an official primary source. Items that could not be so grounded are in the Assumptions Log.

---

## Metadata

**Confidence breakdown:**

- **Standard stack: HIGH** — nothing is installed; every version was read from the working tree and
  cross-checked against installed binaries.
- **Architecture: HIGH** — every pattern is either already in the repository or was executed as a spike
  this session.
- **IAM action inventory and scoping levers: HIGH** — validated action-by-action against AWS's own
  machine-readable Service Reference; zero misses across 90+ candidate action names.
- **Pitfalls: HIGH except A1–A3** — the `aws:ResourceTag`, inline-policy-size, `ForAllValues`, tag-shape
  and tag-checker pitfalls are all verified. Provider tag-on-create behaviour (A1), Route 53 name
  normalisation (A2), and the validation record type (A3) are reasoned, not confirmed.
- **Documentation edit map: HIGH** — every target line was read and is quoted verbatim.

**Research date:** 2026-08-26
**Valid until:** 2026-09-25 (30 days — OpenTofu 1.12, AWS provider 6.x, and the IAM service reference
are all stable; re-check the Service Reference if the `static-site` module gains a resource type)
