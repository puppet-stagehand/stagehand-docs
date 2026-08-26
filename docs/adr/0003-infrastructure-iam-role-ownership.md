---
type: ADR
status: Accepted
date: 2026-08-26
locked: true
---

# ADR-0003: The bootstrap root owns the infrastructure plan and apply roles

## Status

Accepted. This decision is locked. Superseding it requires a new ADR.

## Context

`.github/workflows/infrastructure.yml` requires two IAM role ARNs that nothing in this repository
creates.

- `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN`, assumed by the pull-request plan job, which must read state,
  acquire and release the state lock, refresh known resources, and call `Get`, `List`, and
  `Describe` operations, and must not mutate anything.
- `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN`, assumed by the dispatch-gated apply job, which must do all
  of the above plus the create, update, tag, and delete actions the reviewed static-site module
  needs.

`infra/bootstrap/` creates the state buckets and the shared GitHub OIDC provider.
`infra/modules/static-site/` creates only `aws_iam_role.deploy`, the content upload and CloudFront
invalidation role. Neither creates the plan or apply role.
`docs/operations/github-environments.md` therefore instructs an authorized AWS administrator to
provision both by hand after bootstrap and before enabling infrastructure automation, and
specifies their trust subjects and permission scoping in prose.

That leaves two roles whose least-privilege design is described carefully but is owned by no
deliverable. The detail exists only at documentation precedence, so nothing verifies that the
roles in an account match the design, and nothing detects drift when they diverge.

The obvious objection to creating them in OpenTofu is circularity: the apply role is what lets CI
run `tofu apply`, so a role created by the stack it applies cannot bootstrap itself. That
objection is real for the environment site stack and does not apply to the bootstrap root. CI
never applies `infra/bootstrap`; `infrastructure.yml` and `validate.yml` only run `tofu validate`
and `tofu fmt` against it, while the plan and apply jobs operate exclusively on
`infra/environments/*`. `docs/operations/aws-bootstrap.md` states that bootstrap requires initial
local administrative authority. Bootstrap is a human-applied trust tier, which is exactly the
authority the runbook already requires for provisioning these roles by hand.

Three trust tiers therefore exist: the bootstrap root, applied locally by an administrator; the
environment apply job, running in CI under a dispatch gate; and the pull-request plan job, running
in CI read-only. A role consumed by the second and third tiers can safely be created by the first.

A second objection is escalation: if the apply role is defined in this repository, a pull request
can propose widening its own permissions. Two existing controls answer this. `CODEOWNERS` assigns
`/infra/` to a named owner, so the change cannot merge without that review. And because CI never
applies bootstrap, a merged widening has no effect until an administrator applies it locally with
administrative credentials. The escalation path requires both a code review and a deliberate human
apply.

## Decision

1. **`infra/bootstrap/` creates both roles.** The plan role and the apply role become OpenTofu
   resources in the bootstrap root, alongside the shared OIDC provider that already lives there.
   Their ARNs become bootstrap outputs, in the manner of `github_oidc_provider_arn` and
   `state_bucket_names`.

2. **One role per Stagehand environment per tier; no sharing.** Six roles in total. Each trusts
   the repository `puppet-stagehand/stagehand-docs` and exactly one GitHub Environment subject,
   with `aud` equal to `sts.amazonaws.com`. Plan roles trust the `-plan` Environment subjects;
   apply roles trust the unsuffixed Environment subjects. A wildcard Environment name in a trust
   policy is never permitted.

3. **The permission scoping in `docs/operations/github-environments.md` is the specification the
   OpenTofu must satisfy.** The plan role gets state read, state-lock acquire and release,
   refresh, and `Get`, `List`, and `Describe` only, scoped to its own state bucket and key. The
   apply role gets that plus the minimum create, update, tag, and delete actions the static-site
   module requires, scoped by known ARNs, hosted zone, name prefixes, and the mandatory
   `project = "stagehand"` and matching `environment` tag conditions where AWS supports them.
   Where the OpenTofu and the runbook disagree, the runbook is amended or the OpenTofu is
   corrected; they are not allowed to drift apart.

4. **Bootstrap remains human-applied.** No CI job may assume a role able to modify the bootstrap
   root, and no workflow gains permission to apply it. The two-administrator review that
   `github-environments.md` requires for these trust and permission policies is satisfied by
   `CODEOWNERS` review on `/infra/` plus the administrator performing the apply, and both remain
   required.

5. **Implementation is a separate task.** This ADR records ownership. Until the OpenTofu exists,
   the manual provisioning path in `docs/operations/github-environments.md` remains the operative
   instruction and must not be deleted.

## Consequences

**Positive**

- The least-privilege design for both roles becomes reviewable in a diff and verifiable against
  an account, rather than being prose that nothing checks.
- `tofu plan` on the bootstrap root detects drift in the trust policies and permission scoping,
  including a role widened by hand in the console.
- Standing up a second AWS account becomes reproducible, because the roles come with the
  bootstrap rather than from a click-path an administrator must follow correctly.
- Role ARNs become outputs, so the values stored in GitHub Environment variables have a single
  authoritative source.

**Negative**

- Writing the apply role's permission policy is substantial and fiddly work. It must track every
  resource type the static-site module creates, and it will need updating whenever that module
  gains a resource type.
- A repository that defines the role able to change its own infrastructure has an escalation path
  on paper, mitigated but not eliminated by CODEOWNERS review and human-only apply.
- Bootstrap grows from a small, obviously-safe root into one holding the account's most
  privileged CI identity, raising the cost of a mistake there.
- Six roles must stay consistent with six GitHub Environments, so drift is now possible between
  two managed things rather than between one managed and one manual thing.

**Neutral**

- No behavior changes on merge of this ADR. The workflows already consume the ARNs as GitHub
  Environment variables and are indifferent to how the roles were created.
- The distinction between roles created by the bootstrap root and the content deploy role created
  by the site stack becomes a deliberate, documented split rather than an accident.

## Alternatives rejected

**Keep both roles as documented manual prerequisites.** This is the status quo and the cheapest
option: no new OpenTofu, and an administrator can scope permissions against a real account
interactively. Rejected because the careful least-privilege design in
`docs/operations/github-environments.md` can never be verified against what actually exists, drift
is invisible, and reproducing the setup in another account depends on a human following prose
exactly. The roles are the most privileged CI identities in the account; leaving them the only
unmanaged part of the infrastructure inverts the risk ordering.

**Create the plan role in OpenTofu and leave the apply role manual.** This codifies the half whose
permissions are easy to bound and leaves the admin-adjacent half under direct human control.
Rejected because it establishes two mechanisms for two roles that must be reasoned about together,
and the asymmetry would need explaining indefinitely. The apply role is precisely the one whose
scope most benefits from review in a diff.

**Create the roles in the environment site stack.** This would put each environment's roles beside
the resources they manage. Rejected as genuinely circular: the apply role is the identity CI uses
to apply that stack, so the stack cannot create it. It would also place the apply role's own
permission policy under a role that CI can modify, allowing a workflow to widen its own authority.

## References

- `.github/workflows/infrastructure.yml` — consumers of both role ARNs; validate-only treatment of
  the bootstrap root
- `.github/workflows/validate.yml` — bootstrap validation without apply
- `infra/bootstrap/main.tf`, `infra/bootstrap/outputs.tf` — the shared OIDC provider precedent
- `infra/modules/static-site/iam.tf` — the content deploy role, created by the site stack
- `docs/operations/github-environments.md` — trust subjects, permission scoping, manual
  provisioning path
- `docs/operations/aws-bootstrap.md` — bootstrap requires local administrative authority
- `CODEOWNERS` — required review on `/infra/`
- `docs/adr/0002-github-environment-model.md` — the six GitHub Environments these roles bind to
