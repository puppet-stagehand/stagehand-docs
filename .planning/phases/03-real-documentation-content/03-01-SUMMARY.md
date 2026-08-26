---
phase: 03-real-documentation-content
plan: 01
subsystem: docs-content
tags: [astro, markdown, scss, playwright, axe, vitest, content-collection]

# Dependency graph
requires:
  - phase: 02
    provides: shipped scaffold routes, docs content collection, build-routes gate, deploy invalidation list
provides:
  - "/docs/first-run/ — the genuine third leg of first-time-operator content (install prep -> first run -> trust boundaries)"
  - "the proven end-to-end 'add a documentation page' pipeline: content -> collection schema -> build-routes gate -> deploy invalidation list -> a11y audit"
  - ".docs-content pre/code SCSS rules — the first styled code-block treatment in the docs system, reusable by any future doc page"
affects: [03-02, 03-03, 03-04]

# Actuals (#2632)
actuals:
  tokens: 2385
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "markdown.syntaxHighlight: false in astro.config.mjs — Astro's default Shiki highlighter writes an inline style on <pre> that outranks any external stylesheet rule; disabling it keeps code-block appearance under the site's own SCSS/token system"

key-files:
  created:
    - src/content/docs/first-run.md
  modified:
    - src/content/docs/getting-started.md
    - tests/unit/docs-collection.test.ts
    - scripts/check-built-routes.ts
    - scripts/deploy-site.sh
    - tests/unit/deploy-scripts.test.ts
    - src/styles/components/_docs.scss
    - tests/e2e/accessibility.spec.ts
    - astro.config.mjs

key-decisions:
  - "Disabled Astro's default Shiki syntax highlighting (markdown.syntaxHighlight: false) because its inline <pre style=\"background-color:...\"> silently overrides the new .docs-content pre CSS rule regardless of stylesheet specificity — undetected, the code block would have rendered with Shiki's github-dark palette instead of the site's navy/off-white pairing the UI-SPEC specifically calls for."
  - "Kept the docs sidebar nav (.docs-nav ol) unbounded, per the plan's carried-forward planner decision — 3 entries (getting-started, security, first-run) is well under the ~5-8 entry overflow threshold the UI-SPEC flagged."
  - "Interactive-mode tracer feedback gate: stopped after Task 1's commit and returned a checkpoint:human-verify before Task 2, per the plan's type=\"tracer\" protocol (workflow.auto_advance and workflow._auto_chain_active were both false). Coordinator approved the content and wiring; execution resumed into Task 2."

patterns-established:
  - "Docs code-block styling contract (.docs-content pre / code / pre code) is now live and available to every future doc page without further SCSS work."

requirements-completed: [CONT-04, CONT-05, CONT-06, CONT-07]

coverage:
  - id: D1
    description: "first-run.md — the third first-time-operator doc page (pre-run checks, what a first run does, success signals, failure triage), collection-wired and linked from getting-started.md's Next steps"
    requirement: "CONT-04"
    verification:
      - kind: unit
        ref: "tests/unit/docs-collection.test.ts#defines the required entries with descriptions and unique positive order values"
        status: pass
    human_judgment: true
    rationale: "The plan's own acceptance criteria mark the PCP/orchestrator-boundary restatement as 'verified by human/reviewer read, not grep, since exact wording is expected to differ from the source sentence.' The coordinator already reviewed and approved this content mid-execution (tracer feedback gate), but the coverage block records human_judgment: true so a future verify-work pass still surfaces the content for confirmation rather than silently auto-passing on a schema-only test."
  - id: D2
    description: "docs/first-run/index.html registered in the build-routes gate and deploy invalidation list (CONT-05); .docs-content pre/code/pre-code SCSS rules added per the UI-SPEC's exact Code Block Contract; /docs/first-run/ added to the axe-audited route set (CONT-07)"
    requirement: "CONT-05"
    verification:
      - kind: unit
        ref: "tests/unit/deploy-scripts.test.ts#uploads real production-build assets before revalidated content and reaches AWS"
        status: pass
      - kind: other
        ref: "npm run check:routes (against a real dist/ build including docs/first-run/index.html)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/accessibility.spec.ts#/docs/first-run/ has no serious or critical axe violations"
        status: pass
      - kind: other
        ref: "grep inspection of dist/docs/first-run/index.html and dist/assets/*.css confirming the compiled .docs-content pre rule applies with no competing inline style"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-08-26
status: complete
---

# Phase 3 Plan 1: Real Documentation Content — First-Run Tracer Summary

**Added `/docs/first-run/` — the genuine third first-time-operator doc page — wired end-to-end through the docs collection, build-routes gate, deploy invalidation list, and a11y audit, and disabled Astro's default Shiki highlighter so the new code-block SCSS actually controls appearance.**

## Performance

- **Duration:** ~20 min (active execution; excludes the pause while the coordinator reviewed the tracer feedback gate)
- **Started:** 2026-08-26T22:44Z (approx, first task commit)
- **Completed:** 2026-08-26T22:50Z (second task commit)
- **Tasks:** 2
- **Files modified:** 9 (1 created, 8 modified)

## Accomplishments

- `src/content/docs/first-run.md` — a real, reviewed first-run guide covering pre-run prerequisites, what a first run actually does (read-only Bolt discovery, not configuration), how to confirm success, and a three-case failure-triage section (host-key/SSH, unsupported compatibility combination, and public-issue-vs-private-advisory reporting split), collection-wired and linked from `getting-started.md`'s Next steps.
- `docs/first-run/index.html` registered in `scripts/check-built-routes.ts` and `scripts/deploy-site.sh`'s CloudFront invalidation list (CONT-05), keeping the build-routes gate and deploy script in sync with the new route in the same change.
- `.docs-content pre` / `.docs-content code` / `.docs-content pre code` SCSS rules added exactly per the UI-SPEC's Code Block Contract — the first styled code-block treatment anywhere in the docs system, reusable by every future doc page.
- `/docs/first-run/` added to `tests/e2e/accessibility.spec.ts`'s audited route set; zero serious/critical axe violations confirmed on the new route's real `<pre>`/`<code>` pairing.
- Fixed a real bug discovered mid-task: Astro's default Shiki syntax highlighter writes an inline `style` attribute on `<pre>` that silently overrode the new SCSS background/color rules (inline styles always outrank external stylesheet specificity). Disabled it via `markdown.syntaxHighlight: false` in `astro.config.mjs` so the site's own navy/off-white token pairing actually renders, instead of Shiki's unrelated `github-dark` palette.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write and collection-wire the "first run" doc page** - `82ba2bb` (feat)
2. **Task 2: Register the route in the build gate and deploy invalidation list, and style its code blocks** - `40d7fbf` (feat)

**Plan metadata:** committed separately by this SUMMARY commit.

## Files Created/Modified

- `src/content/docs/first-run.md` - new first-run doc page (order: 3)
- `src/content/docs/getting-started.md` - Next steps list gains a step 3 link to first-run, support renumbered to 4
- `tests/unit/docs-collection.test.ts` - slug assertion updated to the 3-entry set; also reformatted to satisfy Prettier's print-width
- `scripts/check-built-routes.ts` - `docs/first-run/index.html` added to `requiredOutputs`
- `scripts/deploy-site.sh` - `/docs/first-run/index.html` added to the CloudFront invalidation `--paths` list
- `tests/unit/deploy-scripts.test.ts` - invalidation-command literal updated to match
- `src/styles/components/_docs.scss` - `.docs-content pre` / `code` / `pre code` rules added per the UI-SPEC
- `tests/e2e/accessibility.spec.ts` - `/docs/first-run/` added to `auditedRoutes`
- `astro.config.mjs` - `markdown.syntaxHighlight: false` added (deviation fix, see below)

## Decisions Made

- Disabled Astro's default Shiki syntax highlighting site-wide rather than overriding Shiki's theme, since the docs content here is plain generic command examples (not code needing language-aware highlighting), and a second color language for code blocks is exactly what the UI-SPEC's Code Block Contract explicitly avoided.
- Left the docs sidebar nav unbounded, matching the plan's carried-forward `must_haves` decision (3 entries is well under the flagged ~5-8 entry overflow threshold).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Disabled Shiki syntax highlighting so the new SCSS code-block rules actually apply**
- **Found during:** Task 2 (verifying the rendered `<pre>`/`<code>` pairing against the UI-SPEC's Code Block Contract)
- **Issue:** Astro's markdown pipeline defaults to Shiki with the `github-dark` theme, which writes an inline `style="background-color:#24292e;color:#e1e4e8; overflow-x: auto;"` attribute directly on the rendered `<pre>` element. Inline styles always outrank external stylesheet rules regardless of CSS specificity, so the new `.docs-content pre` rule's `background`/`color` (meant to reuse the site's `--stagehand-raised-navy`/`--stagehand-off-white` pair) would have been silently overridden by Shiki's own, unrelated palette — a second, unreviewed color language the UI-SPEC explicitly said to avoid.
- **Fix:** Added `markdown: { syntaxHighlight: false }` to `astro.config.mjs`. Rebuilt and confirmed via `grep` that `dist/docs/first-run/index.html`'s `<pre>` now carries no inline style, and the compiled `.docs-content pre` rule in `dist/assets/*.css` is the only source of its background/color/border.
- **Files modified:** `astro.config.mjs`
- **Verification:** `npm run build` + inspection of the built HTML/CSS; `npx playwright test tests/e2e/accessibility.spec.ts --project=production` still passes (0 serious/critical violations on `/docs/first-run/`); no other file in `tests/` or `src/` referenced Shiki-specific classes/theme names, so nothing else depended on the highlighter being on.
- **Committed in:** `40d7fbf` (Task 2 commit)

**2. [Rule 1 - Bug] Reformatted docs-collection.test.ts's slug assertion for Prettier's print-width**
- **Found during:** Task 2 (running `npx prettier --check` across all touched files as part of verification)
- **Issue:** Task 1's edit lengthened the `toEqual([...])` line past Prettier's configured print width, which `npm run verify`'s `format:check` step would have caught.
- **Fix:** Reformatted the array literal onto multiple lines (matching Prettier's own auto-formatted output).
- **Files modified:** `tests/unit/docs-collection.test.ts`
- **Verification:** `npx prettier --check tests/unit/docs-collection.test.ts` passes; `npx vitest run tests/unit/docs-collection.test.ts` still passes.
- **Committed in:** `40d7fbf` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes were necessary for the plan's own acceptance criteria (styled code blocks actually rendering per the UI-SPEC contract; formatting compliance ahead of `npm run verify`). No scope creep — no new files were touched beyond what these two bugs required.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## Interactive Tracer Checkpoint

Task 1 is `type="tracer"`. Because auto-mode was not active (`workflow.auto_advance` and `workflow._auto_chain_active` both `false`), execution stopped after Task 1's commit and returned a `checkpoint:human-verify` per the plan's tracer feedback gate protocol, before starting Task 2 (the expansion work). The coordinator reviewed `first-run.md`'s content and `getting-started.md`'s wiring, confirmed both were correct (genuine content, correctly worded PCP/orchestrator boundary restatement, no forbidden markup, correct Next-steps ordering), and approved continuation. Execution then proceeded through Task 2 to completion in the same session.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/docs/first-run/` is live in the docs collection, registered in the build-routes gate and deploy invalidation list, styled per the UI-SPEC, and axe-clean.
- The `.docs-content pre`/`code` SCSS rules are now available for any future doc page (03-02, 03-03, 03-04) that ships a command example — no further styling work needed for code blocks.
- `markdown.syntaxHighlight: false` is now a site-wide Astro config decision; any future doc page relying on language-aware syntax coloring would need this revisited (none currently planned).
- Ready for the phase's remaining plans (03-02's GATE-03 regression test, 03-03's other route content, 03-04) to proceed.

---
*Phase: 03-real-documentation-content*
*Completed: 2026-08-26*
