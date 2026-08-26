---
phase: 01-infrastructure-role-ownership
plan: 04
subsystem: docs
tags: [runbooks, adr, drift-reconciliation, prettier, iam]

# Dependency graph
requires:
  - phase: 01-01
    provides: "infra/bootstrap/outputs.tf's infrastructure_plan_role_arns output and the required hosted_zone_id variable, named exactly in the rewritten aws-bootstrap.md capture block"
  - phase: 01-02
    provides: "infra/bootstrap/iam-github-actions.tf's actual apply-role scoping (acm:DomainNames, the two route53:ChangeResourceRecordSets* condition keys, the five unscoped CloudFront creates) that github-environments.md now describes instead of the withdrawn tag-condition promise"
provides:
  - "docs/operations/aws-bootstrap.md and docs/operations/github-environments.md describing the OpenTofu-owned six-role path with no manual-provisioning procedure remaining"
  - "docs/adr/0002-github-environment-model.md References pointing to docs/adr/0003-infrastructure-iam-role-ownership.md for role-ARN ownership"
  - ".prettierignore covering .planning/, unblocking npm run format:check and npm run verify for every subsequent phase"
  - "tests/unit/environment-roots.test.ts's check-tofu-tags.sh fixture with a minimal infra/bootstrap tree, fixing the phase's own npm run verify gate"
affects: []

# Actuals (#2632)
actuals:
  tokens: 3271
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Runbook prose amended to name unscopable IAM actions explicitly by exact action name, and the compensating controls that remain in force, rather than leaving a scoping promise the implementation cannot keep"
    - "A locked ADR's stale References entry is corrected in isolation from its Decision section, verified by a diff-scope assertion rather than trusted by inspection alone"

key-files:
  created: []
  modified:
    - docs/operations/aws-bootstrap.md
    - docs/operations/github-environments.md
    - docs/adr/0002-github-environment-model.md
    - docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md
    - docs/superpowers/plans/2026-08-22-stagehand-docs-site.md
    - .prettierignore
    - tests/unit/environment-roots.test.ts

key-decisions:
  - "Added .planning/ to .prettierignore (Rule 3 — blocking issue): the doc-ingest commit never added it alongside the existing .superpowers/ and docs/superpowers/ AI-working-directory entries, so npm run format:check and npm run verify failed on 31 pre-existing files unrelated to any edit in this plan, blocking this plan's own acceptance criteria."
  - "Fixed tests/unit/environment-roots.test.ts's check-tofu-tags.sh fixture (Rule 3 — blocking issue): plan 01-03 extended the script to unconditionally inspect infra/bootstrap, but the test's isolated tmpdir fixture never gained a bootstrap directory, so npm run verify's unit-test stage failed on this phase's own standing gate for a reason unrelated to any file this plan touches. Added a minimal infra/bootstrap/main.tf and providers.tf to the fixture satisfying the same tag rule the real bootstrap root satisfies."
  - ".planning/intel/constraints.md left deliberately unchanged (per plan instruction) — it is an ingest audit record of the design spec's original three-Environment sentence with the ADR-0002 override already attached beside it, not a source document; rewriting it would destroy the provenance the ingest exists to preserve."

patterns-established:
  - "Documentation-drift closure pairs a removed stale claim with a positive replacement naming the real levers (exact IAM condition keys, exact action names) so a reviewer can check prose against policy by eye rather than trusting a paraphrase."

requirements-completed: [INFRA-05, DRIFT-01, DRIFT-02, DRIFT-03]

coverage:
  - id: D1
    description: "Both runbooks describe the OpenTofu-owned role path with no manual-provisioning procedure remaining, still state human-apply/CODEOWNERS/second-administrator review, and github-environments.md names the five unscopable CloudFront actions with their compensating controls"
    requirement: "INFRA-05"
    verification:
      - kind: unit
        ref: "grep acceptance criteria on both runbooks (must-provision-both-after-bootstrap absent, cloudfront:Create* actions and acm/route53 condition keys present, second administrator present, Safety boundary and initial-local-administrative-authority sentences intact)"
        status: pass
      - kind: manual
        ref: "Task 1 <human-check> — carried forward per 01-VALIDATION.md's end-of-phase UAT harvest mechanism (human_verify_mode unset, defaults to end-of-phase); not independently re-verified by this executor"
        status: pending
    human_judgment: true
  - id: D2
    description: "ADR-0002's References list points to ADR-0003 for role-ARN ownership; the diff touches only the References section and locked: true is unchanged"
    requirement: "DRIFT-01"
    verification:
      - kind: unit
        ref: "git diff docs/adr/0002-github-environment-model.md touches only ## References; grep -c 'locked: true' == 1; grep -c '0003-infrastructure-iam-role-ownership.md' == 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "No source document still describes the site as having three GitHub Environments"
    requirement: "DRIFT-02"
    verification:
      - kind: unit
        ref: "docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md and docs/superpowers/plans/2026-08-22-stagehand-docs-site.md both now name the six-Environment / -plan model; grep -c '\\-plan' >= 1 in both files"
        status: pass
    human_judgment: false
  - id: D4
    description: "No source document still pins a TypeScript version the repository does not use"
    requirement: "DRIFT-03"
    verification:
      - kind: unit
        ref: "grep -rn '7\\.0\\.2' docs/ returns nothing; grep -c '6.0.3' docs/superpowers/plans/2026-08-22-stagehand-docs-site.md == 2"
        status: pass
    human_judgment: false
  - id: D5
    description: "npm run verify (lint, typecheck, unit tests, build, routes, links, e2e, build-isolation) is green — the phase's standing-gate run"
    requirement: "GATE (phase success criterion 4)"
    verification:
      - kind: unit
        ref: "npm run verify (command invocation) — 78/78 unit tests, 19/19 e2e tests, build-isolation production=0/e2e=5"
        status: pass
    human_judgment: false

duration: ~40min
completed: 2026-08-26
status: complete
---

# Phase 01 Plan 04: Runbook and ADR Drift Reconciliation Summary

**Both operations runbooks now describe reading six OpenTofu-owned role ARNs instead of hand-provisioning them, `github-environments.md` names the five unscopable CloudFront actions and the levers that replaced the unkeepable tag-scoping promise, and three stale prose sentences no longer contradict a locked ADR or the working tree — plus two pre-existing blocking bugs in the phase's own `npm run verify` gate were found and fixed.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-08-26
- **Tasks:** 2 (both `type="auto"`)
- **Files modified:** 7 (5 planned docs, plus 2 blocking-bug fixes: `.prettierignore`, `tests/unit/environment-roots.test.ts`)

## Accomplishments

- `docs/operations/github-environments.md`: manual-provisioning section replaced with "Read the infrastructure roles from bootstrap"; the apply-role scoping paragraph now names `acm:DomainNames`, `route53:ChangeResourceRecordSetsNormalizedRecordNames`, and `route53:ChangeResourceRecordSetsRecordTypes` by exact key name instead of an unkeepable tag-condition promise; the five unscopable CloudFront create actions and the three compensating controls (human apply, CODEOWNERS, second-administrator review) are named explicitly.
- `docs/operations/aws-bootstrap.md`: introductory paragraph now states bootstrap creates six plan/apply roles; §1 tells the operator to supply `hosted_zone_id` (via `terraform.tfvars` or `TF_VAR_hosted_zone_id`) before the `plan` command; the capture block gained two `output -json` captures for the new role-ARN outputs, placed before the saved-plan cleanup; a new sentence routes each captured ARN to its matching GitHub Environment. The Safety boundary section and the "initial local administrative authority" sentence are byte-identical.
- `docs/adr/0002-github-environment-model.md`: the stale "ownership … not settled by this ADR" References paragraph replaced with a pointer to ADR-0003, in ADR-0003's own References format; Decision section untouched, `locked: true` unchanged.
- `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md` and `docs/superpowers/plans/2026-08-22-stagehand-docs-site.md`: both now describe the six-Environment model (three apply, three `-plan`) instead of a closed three-value set; the implementation plan's Global Constraints bullet now binds the three-value enum to `var.environment` only, per ADR-0002 rule 2's own wording.
- `docs/superpowers/plans/2026-08-22-stagehand-docs-site.md`'s TypeScript pin corrected to `6.0.3` in both the Tech Stack line and the packaging dependency block, matching `package.json`.
- **Rule 3 fix:** `.prettierignore` gained a `.planning/` entry — the doc-ingest commit never added it alongside the existing `.superpowers/` and `docs/superpowers/` entries, so `npm run format:check`/`npm run verify` failed on 31 pre-existing unrelated files before touching this.
- **Rule 3 fix:** `tests/unit/environment-roots.test.ts`'s `check-tofu-tags.sh` fixture gained a minimal `infra/bootstrap/main.tf` and `providers.tf` — plan 01-03 extended the script to unconditionally inspect `infra/bootstrap`, but this pre-existing test fixture was never updated, failing `npm run verify`'s unit-test stage on the phase's own standing gate.
- `npm run verify` is fully green: format, lint, typecheck, `validate:data`, 78/78 unit tests, build, routes, links, 19/19 e2e tests, and the build-isolation check (production=0 records, e2e=5).

## Task Commits

1. **Task 1** — `5bd10c4` (docs): both runbooks rewritten onto the OpenTofu-owned role path; `.prettierignore` gained `.planning/`. `npm run format:check` green.
2. **Task 2** — `7a9842d` (docs): ADR-0002 References pointer corrected; design spec and implementation plan reconciled to the six-Environment model and the `6.0.3` TypeScript pin; `tests/unit/environment-roots.test.ts` fixture fixed. `npm run verify` green (78/78 unit, 19/19 e2e).

## Files Created/Modified

- `docs/operations/aws-bootstrap.md` — introductory paragraph, §1 `hosted_zone_id` instruction and capture block, ARN-routing sentence
- `docs/operations/github-environments.md` — "Read the infrastructure roles from bootstrap" section, apply-role scoping paragraph (tag-condition clause replaced, unscoped actions and compensating controls named)
- `docs/adr/0002-github-environment-model.md` — References list, one entry
- `docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md` — GitHub and deployment flow section
- `docs/superpowers/plans/2026-08-22-stagehand-docs-site.md` — Tech Stack line, Global Constraints bullet, packaging dependency block
- `.prettierignore` — added `.planning/`
- `tests/unit/environment-roots.test.ts` — `createTagFixture()` gained `infra/bootstrap/main.tf` and `infra/bootstrap/providers.tf`

## Decisions Made

- Kept the tag-scoping clause's replacement narrow and literal per D-A: named `acm:DomainNames` and the two `route53:ChangeResourceRecordSets*` keys by exact backticked name (verified against `infra/bootstrap/iam-github-actions.tf` lines 409/445-450) rather than paraphrasing, so a reviewer can match key name to key name.
- Did not attempt to recover the CloudFront tag-scoping promise with create-time conditions and did not split the apply role, per D-A's explicit prohibition.
- `.planning/intel/constraints.md` left unchanged per the plan's explicit recorded scope decision — an ingest audit record, not a source document.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `.planning/` missing from `.prettierignore`**
- **Found during:** Task 1, running `npm run format:check` per the task's verify step
- **Issue:** `npm run format:check` exited 1 on 31 files under `.planning/` (Markdown and JSON left over from the doc-ingest commit `a4f489c`), none of which this plan or any prior plan in this phase touched. `.planning/` was never added to `.prettierignore` alongside the analogous `.superpowers/` and `docs/superpowers/` AI-working-directory entries.
- **Fix:** Added `.planning/` to `.prettierignore`.
- **Files modified:** `.prettierignore`
- **Verification:** `npm run format:check` — exit 0, "All matched files use Prettier code style!"
- **Committed in:** `5bd10c4`

**2. [Rule 3 - Blocking issue] `check-tofu-tags.sh` test fixture missing `infra/bootstrap`**
- **Found during:** Task 2, running `npm run verify` per the task's verify step
- **Issue:** `tests/unit/environment-roots.test.ts`'s `createTagFixture()` builds an isolated tmpdir tree with `infra/modules/static-site` and `infra/environments/*` but no `infra/bootstrap`. Plan 01-03 extended `scripts/check-tofu-tags.sh` to unconditionally `rg`/`awk` against `infra/bootstrap`, so the fixture-driven test `accepts the three tagged environment providers and authoritative module tags` failed with `rg: infra/bootstrap: IO error … No such file or directory` — a failure in the phase's own `npm run verify` standing gate unrelated to any file this plan's Task 2 edited.
- **Fix:** Added a minimal `infra/bootstrap/main.tf` (one resource with `tags = local.required_tags`) and `infra/bootstrap/providers.tf` (one `default_tags` block with `project = "stagehand"`, no fabricated `environment` key) to the fixture, mirroring the shape the real bootstrap root satisfies.
- **Files modified:** `tests/unit/environment-roots.test.ts`
- **Verification:** `npx vitest run tests/unit/environment-roots.test.ts` — 8/8 passed. Full `npm run verify` — 78/78 unit tests, 19/19 e2e tests, build-isolation clean.
- **Committed in:** `7a9842d`

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues in the phase's own standing gate, neither caused by an edit this plan made, both pre-existing from earlier commits/plans).
**Impact on plan:** No scope creep on the plan's documented deliverables (both runbooks, ADR-0002, the two `docs/superpowers/` files) — both fixes were required to make `npm run verify` exit 0, which Task 2's own acceptance criteria and this plan's `<done>` statement require as "the phase's standing-gate run."

## Issues Encountered

- **Worktree fork-base staleness**, same class as documented in plan 01-02's Summary. This worktree was forked from commit `1723320c`, which predated the entire `.planning/` tree and plans 01-01 through 01-03. Resolved by `git merge main --ff-only` before any task work, per the orchestrator's explicit instructions — a pure fast-forward (52 files, 8809 insertions) with zero conflict risk, since the worktree branch had no commits of its own beyond the shared fork point.
- Node.js in this worktree environment is v26.7.0; the task preconditions ask for v24.x via `nvm use`, but no `nvm`/`fnm`/`asdf` install was found and only Homebrew's `node@26` is present. `.npmrc` sets `engine-strict=true`, but `npm run format:check` and `npm run verify` both ran without an engine-strict refusal under v26.7.0 — confirmed empirically rather than assumed. Documented here since the precondition could not be literally satisfied; all `<verify>` commands nonetheless passed.

## User Setup Required

None — no external service configuration required. Nothing was applied to AWS; no scaffold task performed an AWS apply or DNS cutover in this plan.

## Next Phase Readiness

- This is the last plan in Phase 1 (Infrastructure Role Ownership). All four requirements this plan targets (INFRA-05, DRIFT-01, DRIFT-02, DRIFT-03) have their mechanical criteria satisfied; INFRA-05's prose-intent properties (one procedure not two, the three custody controls, the narrowed-not-abandoned reading, and §1's before-the-plan-command placement) are carried forward as the Task 1 `<human-check>` per `01-VALIDATION.md`'s end-of-phase UAT harvest mechanism (`human_verify_mode` unset, defaulting to `end-of-phase`) — this executor did not independently re-verify those four prose properties as a human reader would, and INFRA-05 is not closed until that harvest is answered.
- `npm run verify` is green in this worktree, satisfying the phase's roadmap success criterion 4 (quality gates green on `main`) as far as this worktree's state can prove it.
- Two blocking bugs fixed in this plan (`.prettierignore` missing `.planning/`, the `check-tofu-tags.sh` test fixture missing `infra/bootstrap`) were both pre-existing from earlier commits/plans in this phase, not introduced by this plan — flagging them here so the orchestrator/reviewer understands why this plan's diff touches two files outside its `files_modified` frontmatter list.
- No blockers for Phase 2. Phase 2 (per `.planning/STATE.md`'s Blockers/Concerns) requires an authorized AWS identity and a delegated hosted zone before any `tofu apply` can run — nothing in this plan changes that.

---
*Phase: 01-infrastructure-role-ownership*
*Completed: 2026-08-26*

## Self-Check: PASSED

All modified files verified present on disk (`docs/operations/aws-bootstrap.md`,
`docs/operations/github-environments.md`, `docs/adr/0002-github-environment-model.md`,
`docs/superpowers/specs/2026-08-22-stagehand-docs-site-design.md`,
`docs/superpowers/plans/2026-08-22-stagehand-docs-site.md`, `.prettierignore`,
`tests/unit/environment-roots.test.ts`, this SUMMARY). Both task commit hashes
(`5bd10c4`, `7a9842d`) verified present in `git log`.
