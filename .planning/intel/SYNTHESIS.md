# Synthesis Summary

Entry point for `gsd-roadmapper`. Produced by `gsd-doc-synthesizer` in `new` mode.
Precedence applied: ADR > SPEC > PRD > DOC. No per-doc precedence overrides were present.

## Doc counts by type

- ADR: 3
- SPEC: 3
- PRD: 0
- DOC: 6
- UNKNOWN: 0
- Total classified and consumed: 12

Confidence distribution: 5 high, 7 medium, 0 low. No `manifest_override` was set on any document.

## Cycle detection

Cross-ref graph built from the `cross_refs` field of all 12 classifications, restricted to edges
between classified documents. Result: acyclic. Maximum traversal depth 4, well under the cap of 50.
No document was excluded from synthesis.

## Decisions locked (3)

All three ADRs carry `locked: true` and `status: Accepted`, dated 2026-08-26.

- ADR-0001: Ship an empty, evidence-bearing compatibility registry — docs/adr/0001-compatibility-scaffold.md
- ADR-0002: Six GitHub Environments, three OpenTofu environments — docs/adr/0002-github-environment-model.md
- ADR-0003: The bootstrap root owns the infrastructure plan and apply roles — docs/adr/0003-infrastructure-iam-role-ownership.md

No LOCKED-vs-LOCKED contradiction exists. All pairwise scopes were checked and are either disjoint
(ADR-0001 against the other two) or mutually reinforcing (ADR-0002's six GitHub Environments against
ADR-0003's six roles binding one Environment subject each).

Detail: `intel/decisions.md`

## Requirements extracted (0)

No PRD-classified documents were ingested, so no `REQ-` entries were produced and no competing
acceptance variants exist. Requirement-shaped material (success criteria, non-goals, delivery
boundary, per-task interface contracts) lives in SPEC sources and was routed to `intel/constraints.md`
under its own document type rather than converted. Downstream requirement authoring must derive from
`intel/constraints.md` and `intel/decisions.md`; nothing was invented here.

Detail: `intel/requirements.md`

## Constraints (36)

Type breakdown:

- api-contract: 6 — initial route surface, data loader contract, JSON data endpoints, static-site
  module interface, quality gate script contract, workflow contract
- schema: 6 — repository layout, compatibility record content model, documentation content
  collection contract, compatibility registry initial state, OpenTofu environment enum and host
  mapping, mandatory resource tags
- protocol: 13 — compatibility evidence requirement, freshness rule, pull-request checklist,
  validation enforcement and schema-change policy, AWS static-site module composition, OpenTofu
  state and bootstrap boundary, pull-request validation gates, deployment promotion flow, GitHub
  Environment naming, cache-control policy, development process constraints, release-candidate
  verification gate, operations documentation contract
- nfr: 11 — success criteria, chosen technology stack, pinned toolchain and dependency versions,
  visual design and typography, accessibility target, static-only site boundary, failure behavior
  and recovery, security and privacy constraints, testing strategy, non-goals for the scaffold,
  scaffold delivery boundary

Five constraint entries carry an explicit locked-ADR override, confirmation, or extension recorded
inline: success criteria and scaffold delivery boundary (ADR-0001), compatibility registry initial
state (ADR-0001), GitHub Environment naming and OpenTofu environment enum (ADR-0002), OpenTofu state
and bootstrap boundary (ADR-0003).

Sources: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md,
docs/superpowers/plans/2026-08-22-stagehand-docs-site.md, docs/operations/compatibility-claims.md

Detail: `intel/constraints.md`

## Context topics (6)

- AWS bootstrap and per-environment apply — docs/operations/aws-bootstrap.md
- GitHub Environment configuration — docs/operations/github-environments.md
- Release promotion and rollback — docs/operations/release.md
- AWS cost estimation — docs/operations/cost-model.md
- Published page: Getting started — src/content/docs/getting-started.md
- Published page: Security and trust boundaries — src/content/docs/security.md

Note: `docs/operations/github-environments.md` classified DOC, but ADR-0003 rule 3 elevates its
permission-scoping section to the specification the OpenTofu must satisfy. Its content is kept in
`intel/context.md` per its classification, with that elevation flagged in place and recorded in
`intel/decisions.md`.

Detail: `intel/context.md`

## Conflicts

- Blockers: 0
- Competing variants: 0
- Auto-resolved / informational: 8

The three WARNINGs raised by the previous ingest run over this repository minus the ADRs —
competing variants for scaffold compatibility data, GitHub Environment count and naming divergence,
and unassigned infrastructure plan and apply IAM roles — were each independently re-verified against
the source documents and the repository working tree rather than assumed resolved. All three are
resolved by locked ADRs at ADR precedence, with every factual claim in each ADR's Context section
confirmed against the working tree.

Three residual documentation-drift items were found during that verification and recorded as INFO:
ADR-0001 amends the design specification's delivery boundary but not two adjacent sentences; ADR-0002
rule 2 amends the implementation plan's global constraint but not the design specification's own
GitHub Environment sentence, which its Context understates; and ADR-0002's forward pointer for role
ownership is now stale following ADR-0003. None leaves an outcome undetermined, because in each case
a locked ADR states the governing rule explicitly and precedence deterministically selects it.

One open implementation task was surfaced: ADR-0003 rule 1 assigns the six infrastructure plan and
apply IAM roles to `infra/bootstrap/`, but those OpenTofu resources do not yet exist. ADR-0003 rule 5
defers implementation and preserves the manual provisioning path in the interim. Implementing it also
requires updating `docs/operations/github-environments.md` and `docs/operations/aws-bootstrap.md`.

Full report: `.planning/INGEST-CONFLICTS.md`

## Intel files

- `.planning/intel/decisions.md` — 3 locked ADR decisions
- `.planning/intel/requirements.md` — empty, with pointers to the constraint entries that carry
  requirement-shaped content
- `.planning/intel/constraints.md` — 36 constraints from 3 SPEC sources
- `.planning/intel/context.md` — 6 topics from 6 DOC sources
- `.planning/intel/classifications/` — the 12 per-doc classification JSON inputs

## Status

READY — no blockers and no competing variants. Safe to route to `gsd-roadmapper`.
