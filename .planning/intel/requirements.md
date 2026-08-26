# Requirements

No PRD-classified documents were present in this ingest set. Zero requirements extracted.

Classification breakdown of the 12 ingested documents: 3 ADR, 3 SPEC, 6 DOC, 0 PRD.

Requirement-shaped material exists but resides in SPEC-classified documents and was therefore
routed to `constraints.md` rather than synthesized into `REQ-` entries:

- Success criteria and non-goals — source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
  (recorded in `constraints.md` as `Success criteria` and `Non-goals for the scaffold`)
- Delivery boundary — source: docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
  (recorded in `constraints.md` as `Scaffold delivery boundary`, as amended by ADR-0001)
- Per-task interface contracts — source: docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
  (recorded in `constraints.md` as `Task N interface contract` entries)

Neither source carries user stories or acceptance criteria, so no acceptance-variant conflicts
arise and no `competing-variants` entries were produced. Downstream requirement authoring must
derive from `constraints.md` and `decisions.md`; no requirement text is invented here.
