---
type: ADR
status: Accepted
date: 2026-08-26
locked: true
---

# ADR-0001: Ship an empty, evidence-bearing compatibility registry

## Status

Accepted. This decision is locked. Superseding it requires a new ADR.

## Context

Three repository sources describe the initial state of the customer-facing compatibility
registry, and read literally they do not agree.

- The design specification's delivery boundary declares the scaffold complete when the
  repository contains, among other artifacts, "representative content and compatibility data",
  and its architecture section states that the initial scaffold includes representative content
  for every route.
- The compatibility claims policy requires that every compatibility record link at least one
  primary evidence source — vendor documentation, reproducible test evidence, or a Stagehand
  release artifact — and carry a truthful `last_verified` date. It forbids marketing copy, an
  unsourced community statement, or a search result as sole evidence.
- The implementation plan seeds "an intentionally empty compatibility claim list", and its
  global constraints state that absence of approved claims renders an honest empty state.

Both of the first two sources are specification-class documents at equal precedence, and neither
was marked locked. The precedence order `ADR > SPEC > PRD > DOC` totally orders document kinds
but cannot break a tie within a kind, so document precedence alone cannot resolve this. An
accepted ADR is the only artifact that outranks a specification, which is why this decision is
recorded here rather than as an edit to either specification.

The tension is narrower than it first appears. "Representative data" and "evidence-bearing data"
conflict only if both must live in the same file. The repository already separates them: the
published registry is empty, while representative records exist as test fixtures. This ADR
ratifies that separation and states it plainly, so that neither specification can be read as
requiring unsourced customer-facing claims.

The separation is already load-bearing rather than incidental. `npm run verify` runs
`scripts/check-e2e-build-isolation.ts`, which fails the build unless the production compatibility
output contains exactly zero records and the end-to-end output contains exactly five.

## Decision

1. **The published compatibility registry ships empty.** `src/data/compatibility.yaml` holds
   `schema_version: 1` and `records: []` until a claim completes Stagehand release verification.
   No record is published to satisfy a completeness or presentation goal.

2. **Representative compatibility data lives only in test fixtures.**
   `tests/fixtures/data/compatibility-e2e.yaml` carries five records spanning every `status` value
   and every tier, loaded only when `STAGEHAND_E2E_FIXTURES=1`. Fixture records exist to prove that
   validation, sorting, and rendering behave correctly. They are not compatibility claims, their
   evidence URLs are not primary sources, and they must never be promoted into
   `src/data/compatibility.yaml`.

3. **Every published record carries primary evidence and a truthful verification date.** The
   schema makes `evidence_url` and `last_verified` required on every record. `loadCompatibility`
   rejects a non-HTTPS evidence URL, a `last_verified` in the future, and evidence older than 365
   days. Validation is never weakened to admit a record that cannot meet the evidence policy; the
   claim is narrowed, or it is not published.

4. **The empty state is a supported rendering, not a placeholder.**
   `src/components/CompatibilityEmptyState.astro` tells the reader that no claim has completed
   verification and that untested combinations must be treated as unverified. It is not a
   temporary stand-in awaiting content, and it is not a defect.

The design specification's delivery boundary is amended accordingly: "representative compatibility
data" means representative fixture data exercised by the test suite, together with a rendered
empty state on the published site. It does not mean seeded customer-facing records.

## Consequences

**Positive**

- The site cannot make an unsourced compatibility claim, because there is no path by which one
  reaches the published registry.
- A visitor is told plainly that no combination has been verified, which is accurate, rather than
  being shown records that imply verification that has not occurred.
- Route rendering, schema validation, sorting, staleness handling, and the empty state are all
  exercised by fixtures, so the scaffold is provably complete without publishing a claim.
- The 365-day freshness rule is enforced at build time, so a published registry cannot silently
  decay into stale claims.

**Negative**

- The compatibility page has no records at launch, which is a weaker demonstration of the feature
  than a populated matrix would be. The empty state must carry that weight.
- Publishing the first claim requires a real verification run and CODEOWNER review, so the first
  record is slower to land than seeded data would have been.
- Two data files describe the same schema, and a contributor may reasonably mistake the fixture
  file for an example to copy from. Rules 2 and 3 exist to make that mistake visible in review.

**Neutral**

- No code change follows from this ADR. It records and locks behavior the repository already
  implements.
- The build-time record-count assertion in `scripts/check-e2e-build-isolation.ts` becomes the
  executable expression of this decision. Changing the published registry to non-empty requires
  superseding this ADR and updating that script deliberately.

## Alternatives rejected

**Seed the published registry with real, fully evidenced records.** This satisfies the design
specification's wording most directly and demonstrates the matrix at launch. Rejected because it
is blocked on verification work that has not happened: each record would need a completed test run
or primary vendor documentation covering the exact version, platform, provider, and transport
claimed. Producing records ahead of that evidence would either violate the claims policy or
publish claims the project cannot defend to a customer. The cost of the weaker launch page is
lower than the cost of a wrong compatibility claim.

**Relax the schema so records may omit evidence until verified.** This would allow provisional
records to render immediately. Rejected outright: the claims policy states that validation must
never be weakened to make an unsupported record pass, and an unevidenced record is
indistinguishable to a reader from a verified one.

**Publish the fixture records to the live site.** Rejected because their evidence URLs point at
this repository's own issue tracker rather than at primary sources, and several carry limitations
whose text describes the fixture rather than a real constraint. They are correct as fixtures and
false as claims.

## References

- `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md` — delivery boundary, success
  criteria
- `docs/operations/compatibility-claims.md` — evidence requirement, freshness rule, review
  checklist
- `docs/superpowers/plans/2026-08-22-stagehand-docs-site.md` — Task 3, global constraints
- `src/data/compatibility.yaml` — the published registry
- `src/data/schema/compatibility.schema.json` — required `evidence_url` and `last_verified`
- `src/lib/data/compatibility.ts` — HTTPS, future-date, and 365-day enforcement
- `src/components/CompatibilityEmptyState.astro` — the empty-state rendering
- `tests/fixtures/data/compatibility-e2e.yaml` — the five representative fixture records
- `scripts/check-e2e-build-isolation.ts` — build-time assertion of the zero/five split
