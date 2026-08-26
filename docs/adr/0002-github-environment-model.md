---
type: ADR
status: Accepted
date: 2026-08-26
locked: true
---

# ADR-0002: Six GitHub Environments, three OpenTofu environments

## Status

Accepted. This decision is locked. Superseding it requires a new ADR.

## Context

The word "environment" names three different things in this repository, and one unqualified
sentence in the implementation plan collapses them.

- **OpenTofu deployment target.** `infra/modules/static-site/variables.tf` validates
  `var.environment` against exactly `testpilots`, `beta`, and `stable`. This value names the site
  instance and feeds the mandatory `environment` resource tag. There are three, and there will
  remain three.
- **GitHub apply Environment.** `testpilots`, `beta`, and `stable` also exist as GitHub
  Environments that gate privileged operations. They hold `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN` and
  `AWS_DEPLOY_ROLE_ARN`, allow `main` only, and require reviewers on `beta` and `stable`.
- **GitHub plan Environment.** `testpilots-plan`, `beta-plan`, and `stable-plan` gate
  pull-request infrastructure planning. They hold `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN`, a read,
  refresh, state-lock, and describe-only role, and allow the custom deployment branch rule
  `refs/pull/*/merge` only.

The design specification is already precise about the first of these: it states that
`var.environment` accepts only `testpilots`, `beta`, or `stable`, and its environment table
describes deployment targets. It does not forbid the plan Environments.

The implementation plan's global constraints drop that scoping and state, without qualification,
that environment names are exactly `testpilots`, `beta`, and `stable`. Read literally and applied
to GitHub Environments, that sentence forbids the three plan Environments that
`.github/workflows/infrastructure.yml` requires. A reader resolving the apparent conflict by
document precedence would delete them, and with them the separation between planning authority
and apply authority.

That separation is a security control, not an organisational preference. In
`.github/workflows/infrastructure.yml`, the `plan` job attaches a `*-plan` Environment and runs on
`pull_request`; the `apply` job attaches an apply Environment and runs only on
`workflow_dispatch` when the ref is `refs/heads/main` and the dispatch confirmation is `apply`.
A GitHub Environment carries exactly one set of variables, so a single Environment per name has
nowhere to put a read-only role and a read-write role at the same time. Collapsing six into three
would expose a mutating role to pull-request-triggered workflows.

The `refs/pull/*/merge` rule is likewise load-bearing rather than stylistic. GitHub evaluates a
`pull_request` workflow against its merge ref, so a `main`-only branch policy on a plan
Environment would prevent the plan job from starting at all.

## Decision

1. **The three namespaces are named distinctly in all normative text.** Use "OpenTofu
   environment", "GitHub apply Environment", and "GitHub plan Environment". The bare word
   "environment", unqualified, carries no normative force; a constraint that uses it must say
   which namespace it binds.

2. **The three-value enum binds `var.environment` only.** `testpilots`, `beta`, and `stable` are
   the complete set of OpenTofu environments and the complete set of `environment` tag values.
   The implementation plan's global constraint is amended to read: OpenTofu environment names are
   exactly `testpilots`, `beta`, and `stable`.

3. **Six GitHub Environments exist.** Three apply Environments named `testpilots`, `beta`, and
   `stable`, restricted to `main`, carrying the apply and deploy role ARNs, with required
   reviewers on `beta` and `stable` and self-review prevented on `stable`. Three plan
   Environments named `testpilots-plan`, `beta-plan`, and `stable-plan`, restricted to the custom
   branch rule `refs/pull/*/merge`, carrying only the plan role ARN, each requiring a trusted
   reviewer with self-review prevented. Plan Environments never hold an apply or deploy role ARN.

4. **Planning authority and apply authority remain separated.** No pull-request-triggered
   workflow may reach a role that can mutate infrastructure or site content. `pull_request_target`
   is not an acceptable way to make planning easier, because it would run untrusted pull-request
   code with AWS authority. The job-level same-repository guard in `infrastructure.yml` runs
   before a plan Environment is attached and remains required; the Environment rule and the AWS
   role trust policy are additional controls, not substitutes for it.

## Consequences

**Positive**

- The privilege separation is stated rather than inferred, so a future reader cannot remove it
  while believing they are enforcing a naming constraint.
- Pull requests get a real infrastructure plan before merge, without any pull-request workflow
  holding a mutating credential.
- The `environment` resource tag stays a closed three-value set, so cost and ownership queries
  over AWS tags remain exact.

**Negative**

- Six GitHub Environments must be configured and kept in sync by hand; GitHub Environment
  configuration is not managed by OpenTofu, so drift is possible and invisible to `tofu plan`.
- The `-plan` suffix makes the two namespaces look like one namespace with six members, which is
  the very confusion this ADR exists to correct. The naming is retained because renaming would
  change working workflows for a cosmetic gain.
- A contributor reading only the implementation plan may still apply its unqualified constraint
  literally. Rule 2 amends that text; until the plan is edited, this ADR governs.

**Neutral**

- No code change follows from this ADR. `infra/modules/static-site/variables.tf`,
  `.github/workflows/infrastructure.yml`, and `.github/workflows/deploy.yml` already implement
  this model.
- The number of GitHub Environments is now decoupled from the number of OpenTofu environments.
  Adding a future deployment target implies two new GitHub Environments, not one.

## Alternatives rejected

**Collapse to three GitHub Environments matching the OpenTofu enum.** This is the literal reading
of the implementation plan's constraint and would make the vocabulary uniform. Rejected because a
GitHub Environment carries one set of variables: a single `testpilots` Environment cannot hold
both a read-only plan role and a mutating apply role. Pull-request runs would therefore assume a
role able to change infrastructure, which is the outcome the plan and apply split exists to
prevent.

**Use `pull_request_target` so plan jobs can run against a `main`-only Environment.** This would
remove the need for the `refs/pull/*/merge` rule and reduce the Environment count. Rejected
because `pull_request_target` executes in the context of the base repository with access to its
secrets and variables while checking out untrusted pull-request code. Trading a naming
inconsistency for arbitrary code execution with AWS authority is not a trade worth making.

**Drop pull-request infrastructure planning entirely.** Three Environments would then suffice and
no plan role would be needed. Rejected because the plan output is the only pre-merge signal of
what an infrastructure change will actually do; removing it moves discovery of a destructive diff
to apply time, on `main`, against a real account.

## References

- `infra/modules/static-site/variables.tf` — the three-value `var.environment` validation
- `.github/workflows/infrastructure.yml` — plan job matrix and apply job dispatch guards
- `.github/workflows/deploy.yml` — content deployment Environment and deploy role
- `docs/operations/github-environments.md` — required configuration for all six Environments
- `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md` — environment table,
  `var.environment` scoping
- `docs/superpowers/plans/2026-08-22-stagehand-docs-site.md` — the global constraint amended by
  rule 2
- Ownership of `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN` and `AWS_INFRASTRUCTURE_APPLY_ROLE_ARN` is not
  settled by this ADR. Neither role is created by the bootstrap or the site stack; see
  `docs/operations/github-environments.md` until a separate ADR records an owner.
