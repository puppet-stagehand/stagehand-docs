---
type: ADR
status: Accepted
date: 2026-08-26
locked: true
supersedes: docs/adr/0002-github-environment-model.md (rule 3, self-review clause on plan Environments only)
---

# ADR-0004: Self-review permitted on plan Environments for a solo maintainer

## Status

Accepted. This decision is locked. Superseding it requires a new ADR.

This ADR amends ADR-0002 rule 3. It narrows one clause of that rule; it does not reopen ADR-0002's
six-Environment model, its plan/apply role separation, or its `refs/pull/*/merge` branch policy,
all of which remain as ADR-0002 states them.

## Context

ADR-0002 rule 3 requires "a trusted reviewer with self-review prevented" on all three plan
Environments (`testpilots-plan`, `beta-plan`, `stable-plan`), matching the same self-review
prevention already required on `stable`'s apply Environment.

This repository has exactly one maintainer, `matthewrstone`, who is also the sole author of every
pull request touching `infra/**` so far. GitHub's `prevent_self_review` setting is unconditional:
it blocks the PR's author from approving that PR's pending deployment review, regardless of
whether any other reviewer exists. With one maintainer and no second trusted identity configured
on this repository, every `-plan` Environment's required deployment review is permanently
unapprovable. This was foreseen and recorded during Phase 2 planning (02-02's SUMMARY, and
02-01's verifier findings) as a real, not hypothetical, operational constraint — and it materialized
exactly as predicted on plan 02-05's first real same-repository PR (PR #2): all three `plan` jobs
queued correctly behind their Environment's reviewer gate and then could not be approved by the
only available identity.

The `-plan` role this gate protects is materially different from the `stable` apply role ADR-0002
also requires self-review prevention on. Per ADR-0002's own context section, each plan
Environment's role is "a read, refresh, state-lock, and describe-only role" — it cannot create,
modify, or destroy any AWS resource, and per ADR-0002 rule 3 itself, "Plan Environments never hold
an apply or deploy role ARN." A plan run against this role can reveal no infrastructure mutation
that was not already visible in the pull request's own diff; it can only fail to run, or run and
show a plan. Self-review of a read-only operation does not carry the same risk self-review of a
mutating apply does — the harm a self-approving solo maintainer could cause by approving their own
plan-Environment deployment is bounded by "see my own read-only plan output," which they could
already do locally with the plan role's credentials in scope, had they possessed them.

`stable`'s apply Environment is not affected by this ADR. It retains required reviewers and
self-review prevention exactly as ADR-0002 rule 3 states — an apply role can mutate the production
site, and self-review prevention there remains a real control, not a formality.

## Decision

1. **Self-review prevention is removed from the three plan Environments** (`testpilots-plan`,
   `beta-plan`, `stable-plan`) only. Each plan Environment still requires a designated reviewer
   (`matthewrstone`); it no longer blocks that reviewer from approving their own pull request's
   plan-job deployment.
2. **`stable`'s apply Environment is unchanged.** Required reviewers and self-review prevention
   remain in force exactly as ADR-0002 rule 3 states. `testpilots` and `beta` apply Environments'
   reviewer configuration (per ADR-0002 and `docs/operations/github-environments.md`) is likewise
   unchanged by this ADR.
3. **This narrows, not removes, ADR-0002 rule 3.** The reviewer requirement itself is retained on
   every plan Environment — a deployment review still must be explicitly approved, giving a
   deliberate pause and an audit-trail entry before any plan job runs against real AWS
   credentials. Only the self-review restriction is lifted, and only on the read-only plan role.
4. **If this project gains a second trusted maintainer**, re-enabling self-review prevention on
   the plan Environments should be revisited — the operational constraint this ADR responds to
   (one identity, permanently unable to approve) no longer applies once a second reviewer exists.
   This ADR does not mandate that reversal; it records the condition under which it would make
   sense to reconsider.

## Consequences

**Positive**

- The self-review deadlock discovered on PR #2 is resolved without weakening protection on any
  role that can mutate infrastructure.
- Solo-maintainer PRs touching `infra/**` can proceed through the plan job and be reviewed/merged
  in a single pass, matching this project's established direct-review workflow for non-`infra/**`
  changes.
- The reviewer-approval step itself is preserved, keeping a manual gate and audit trail on every
  plan-Environment deployment.

**Negative**

- A malicious or compromised PR author (unlikely in a single-maintainer repository, but not
  impossible if the account is ever compromised) could approve their own plan-job deployment
  without independent review. This risk is judged acceptable because the role approved is
  read-only.
- If a second maintainer joins later and this ADR is not revisited, the project keeps a weaker
  control than ADR-0002 originally specified, for no remaining reason.

**Neutral**

- No AWS-side change. The plan role's permissions (read/refresh/describe/state-lock only) are
  unchanged by this ADR; only GitHub's `prevent_self_review` Environment setting changes.

## Alternatives rejected

**Approve from a second GitHub identity.** Technically satisfies ADR-0002 rule 3 unmodified, but
requires creating and maintaining a second trusted GitHub account or collaborator solely to click
"approve" on a solo maintainer's own read-only plan output — organizational overhead disproportionate
to the risk being guarded against, and a second identity used only for rubber-stamp approval
provides no real independent review in practice.

**Drop the reviewer requirement entirely on plan Environments.** Would also resolve the deadlock,
but removes the deliberate-pause/audit-trail property that rule 3 above preserves. Rejected because
the reviewer-approval step has value independent of who is allowed to click it — it is the point at
which a human consciously acknowledges "I am about to let CI touch this AWS role," even if that
human is also the PR's author.

**Extend self-review prevention's exemption to `stable`'s apply Environment too.** Not proposed and
not adopted. `stable` mutates the production site; nothing about the plan-role reasoning above
applies to it.

## References

- `docs/adr/0002-github-environment-model.md` — the ADR this amends (rule 3 only)
- `docs/operations/github-environments.md` — required configuration for all six Environments
- `.github/workflows/infrastructure.yml` — plan job matrix and Environment attachment
- `.planning/phases/02-first-real-publication/02-02-SUMMARY.md` — the self-review constraint
  foreseen during Environment configuration
- `.planning/phases/02-first-real-publication/02-05-SUMMARY.md` — where the deadlock materialized
  on a real PR (#2)
