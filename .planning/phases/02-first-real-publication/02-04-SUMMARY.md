---
phase: 02-first-real-publication
plan: 04
subsystem: ci-cd
tags: [github-actions, deploy, tdd, vitest, gh-api, cloudfront]

requires:
  - phase: 02-first-real-publication
    plan: "02-03"
    provides: "Real testpilots outputs (content_bucket_name, distribution_id, deployment_role_arn, distribution_domain_name) this plan wires into testpilots's GitHub Environment variables."
provides:
  - "scripts/check-live-deployment.ts exporting verifyLiveDeployment — unit-tested, ready to run for real from CI"
  - "deploy.yml hard-fails (exit 1) on a misconfigured deployment Environment instead of soft-skipping green"
  - "deploy.yml stamps every deploy with dist/deployed-commit.txt and verifies the live result after upload"
  - "testpilots's GitHub Environment now holds real CONTENT_BUCKET, CLOUDFRONT_DISTRIBUTION_ID, AWS_DEPLOY_ROLE_ARN, SITE_CHECK_URL values from 02-03's real AWS outputs"
affects: ["02-05-infrastructure-plan-verification"]

actuals:
  tokens: 9000
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "FetchLike = (url: string) => Promise<Response> as a narrower alternative to typeof fetch, so a plain string-keyed vi.fn() stub satisfies astro check's strict overload matching without loosening test-side typing."
    - "Per-check bounded retry/backoff (not a single blanket retry around the whole verification run) so one slow-to-propagate route doesn't mask a real failure on another."

key-files:
  created:
    - scripts/check-live-deployment.ts
    - tests/unit/check-live-deployment.test.ts
  modified:
    - .github/workflows/deploy.yml
    - scripts/deploy-site.sh
    - docs/operations/github-environments.md
    - tests/unit/deploy-scripts.test.ts

key-decisions:
  - "Verified 02-03's real AWS outputs (content bucket, CloudFront distribution, deploy role) directly against live AWS via the stagehand-bootstrap read-only profile before writing them into GitHub, rather than trusting the prerequisite context's stated values blindly."
  - "Extended tests/unit/deploy-scripts.test.ts with two new assertions (hard-fail gate shape, commit-stamp/verify-step ordering and gating) beyond the plan's grep-count <verify>, since the existing GitHub Actions contracts test suite is this repo's established pattern for asserting workflow-file shape."

requirements-completed: []

duration: 45min
completed: 2026-08-26
status: blocked
---

# Phase 02 Plan 04: Deploy Pipeline Hardening + Live Verification Summary

**Tasks 1 and 2 complete and committed: `scripts/check-live-deployment.ts` built test-first (RED/GREEN), `deploy.yml`'s soft-skip replaced with a hard `exit 1` gate, and a commit-stamp + live-verification step wired in end-to-end. Task 3's GitHub Environment variables are set for real on `testpilots`. The plan is halted before the actual `main` push and real `Deploy site` watch — see Blocker below.**

## Performance

- **Duration:** ~45 min (this session, through the point of the blocker)
- **Started:** 2026-08-26T20:05:00Z (approx)
- **Halted:** 2026-08-26T20:22:23Z
- **Tasks:** 2/3 fully complete; Task 3 partially complete (Environment variables set; the real push/deploy/watch step is blocked)
- **Files modified:** 6

## Accomplishments

- Fast-forward merged this worktree onto `main` (it predated `.planning/` being tracked), confirming the merge base was exact and clean.
- **Task 1 (TDD):** Wrote `tests/unit/check-live-deployment.test.ts` first, confirmed it failed for the right reason (`Cannot find module`), then implemented `scripts/check-live-deployment.ts` exporting `verifyLiveDeployment` — asserts all 9 documented routes + both JSON endpoints return 200, a fixed nonexistent path returns a branded 404, and `/deployed-commit.txt` matches the expected SHA, with per-check bounded retry/backoff and aggregated (not first-only) failure reporting. `npx vitest run tests/unit/check-live-deployment.test.ts` — 5/5 passing.
- **Task 2:** `deploy.yml`'s `Check deployment configuration` step now `exit 1`s on a missing required variable instead of silently reporting `configured=false` with no failing step (GATE-02). Added a `Stamp deployed commit` step (between `Build site` and `Configure AWS credentials`) and a `Verify live deployment` step (after `Upload site`, invoking `check-live-deployment.ts` against `SITE_CHECK_URL`/the deployed SHA). `scripts/deploy-site.sh`'s CloudFront invalidation path list now includes `/deployed-commit.txt`. `docs/operations/github-environments.md`'s `SITE_CHECK_URL` row now documents its real testpilots value source and the deferred-cutover caveat. Extended `tests/unit/deploy-scripts.test.ts` with two new assertions covering the hard-fail gate shape and the new steps' ordering/gating.
- Ran the full `npm run verify` pipeline (format, lint, `astro check`, `validate:data`, unit tests, build, `check:routes`, `check:links`, `test:e2e`) — all green except one pre-existing, unrelated flake (see Deviations).
- **Task 3, partial:** Verified 02-03's real AWS outputs directly against live AWS (`aws s3api head-bucket`, `aws cloudfront get-distribution`, `aws iam get-role`, read-only via the `stagehand-bootstrap` profile) before writing them into GitHub, rather than trusting the prerequisite context's stated values blindly. Set all four required `testpilots` GitHub Environment variables via `gh api` (`CONTENT_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `AWS_DEPLOY_ROLE_ARN`, `SITE_CHECK_URL`), confirmed via read-back, and confirmed `beta`/`stable` remain untouched (no cross-environment leakage).

## Task Commits

1. **Task 1 RED:** `dc7bfd6` (test) — failing test for `verifyLiveDeployment`, confirmed failing for the right reason
2. **Task 1 GREEN:** `4dab95a` (feat) — `scripts/check-live-deployment.ts` implementation
3. **Task 2:** `c642199` (fix) — `deploy.yml` hard-fail gate, commit-stamp step, live-verification step, `deploy-site.sh` invalidation path, runbook update
4. **Fix (found running `npm run verify`):** `1a1448a` (fix) — narrowed `fetchImpl`'s type from `typeof fetch` to a project-local `FetchLike` so `astro check` accepts the test's plain-string `vi.fn()` stub

**Task 3:** No repository commit yet for its remaining step (plan-specified: "no repository files — this task sets live GitHub Environment variables and observes a real workflow run"). GitHub Environment variables ARE set (live state, verified via `gh api` read-back). The "land this plan's own commits on `main`... watch it" portion is NOT done — see Blocker.

## Files Created/Modified

- `scripts/check-live-deployment.ts` — new; exports `verifyLiveDeployment`
- `tests/unit/check-live-deployment.test.ts` — new; 5 unit tests, fully stubbed `fetchImpl`
- `.github/workflows/deploy.yml` — hard-fail gate, `Stamp deployed commit`, `Verify live deployment`
- `scripts/deploy-site.sh` — `/deployed-commit.txt` added to invalidation paths
- `docs/operations/github-environments.md` — `SITE_CHECK_URL` row updated with real-value source and deferred-cutover note
- `tests/unit/deploy-scripts.test.ts` — invalidation-path assertion updated; two new GATE-02 assertions added

## Decisions Made

- **Verified real AWS state before writing to GitHub, rather than trusting the prerequisite context's summary values.** All four values (bucket name, distribution ID, deploy role ARN, distribution domain name) were independently confirmed live via AWS CLI before being set as GitHub Environment variables.
- **Extended the existing GitHub Actions contracts test suite** (`tests/unit/deploy-scripts.test.ts`) with assertions for the new hard-fail gate and step ordering/gating, beyond the plan's grep-count `<verify>`, matching this repo's established pattern of asserting workflow-file shape in that same describe block.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `fetchImpl?: typeof fetch` failed `astro check`'s strict overload matching**
- **Found during:** Task 2's `npm run verify` (the `astro check` step)
- **Issue:** `typeof fetch`'s full overload set includes a `Request`-typed input parameter; a plain `vi.fn(async (input: string | URL) => ...)` stub in the test file isn't assignable to it (5 TS2322 errors).
- **Fix:** Introduced `export type FetchLike = (url: string) => Promise<Response>` — the only signature this script ever calls `fetchImpl` with — and typed `fetchImpl` as `FetchLike` with a default of `(url) => fetch(url)`.
- **Files modified:** `scripts/check-live-deployment.ts`
- **Verification:** `npx astro check` — 0 errors; `npx vitest run tests/unit/check-live-deployment.test.ts` — still 5/5 passing.
- **Committed in:** `1a1448a`

### Out of Scope (deferred, not fixed)

**Pre-existing flaky `beforeAll` hook timeout in `tests/unit/deploy-scripts.test.ts`.** When `npm run test:unit` runs the full suite in parallel (multiple Vitest workers), the `deploy-site.sh` describe block's `beforeAll` (`npm run build`) occasionally exceeds Vitest's default 10s hook timeout under CPU contention from sibling test files. Confirmed this is unrelated to this plan's changes: `npx vitest run tests/unit/deploy-scripts.test.ts` in isolation passes cleanly (22/22) every time; the full-suite run failed the hook twice and the isolated run passed twice. Out of scope per the SCOPE BOUNDARY rule (pre-existing flake, not caused by this plan's edits) — not fixed, logged here for visibility.

---

## Blocker: Task 3's push-and-watch step needs a human decision before proceeding

**What was found:** This worktree's local `main` branch is **46 commits ahead of `origin/main`** on GitHub. Every commit in that gap is dated today (2026-08-26) and represents the entirety of this milestone's Phase 1 (Infrastructure Role Ownership) and Phase 2 (First Real Publication, plans 02-01 through 02-03) work — including the real `infra/bootstrap` apply and the real `testpilots` environment apply. None of it has ever been pushed to GitHub. `origin/main`'s HEAD is still `1723320` ("docs: record AWS publication handoff"), the pre-GSD commit this worktree's branch was originally based on.

**Why this matters:** Task 3's action explicitly requires landing "this plan's own commits... on `main` through the normal commit flow this project uses," which triggers `Deploy site` via `on: push: branches: [main]`. Doing that from this worktree means pushing local `main` (fast-forwarded to include this plan's 4 new commits, for 50 total) directly to `origin/main` — a real, public GitHub repository with no branch protection on `main` (confirmed via `gh api .../branches/main/protection` → 404 "Branch not protected") and no open PR covering this range. That single push would, in one action:
1. Publish 46 previously-unpushed commits of real infrastructure work (bootstrap IAM roles, GitHub Environment configuration, testpilots's real AWS apply) to the public repository history, unreviewed.
2. Trigger the first-ever real `Deploy site` run against `testpilots` with real content variables configured — uploading real bytes to the real S3 bucket and invalidating the real CloudFront distribution for the first time.

**Why I did not proceed unilaterally:** My task instructions explicitly say to STOP and return a checkpoint "if anything about the real deploy/CI behavior looks wrong/unexpected/risky" rather than guessing. This is squarely that case — the plan's Task 3 was written assuming only this plan's own commits would be new to `main` ("Plans 02-01, 02-02, 02-03... are all complete and merged to main" in my prerequisite context); the reality is a much larger, previously-unpushed backlog would be bundled into the same push. Pushing 50 unreviewed commits directly to a real production repository's default branch, with no PR and no branch protection, and simultaneously triggering the site's first real public deploy, is a decision with real, largely irreversible consequences (public git history, a live CloudFront distribution now serving real content) that only the user should authorize.

**What I did NOT do:** I did not push, merge to `origin/main`, or trigger any workflow run. The four commits from Tasks 1 and 2 remain on this worktree's branch (`worktree-agent-ad0010d76a9fd7822`), fast-forwardable from local `main`. Task 3's live GitHub Environment variable writes (a smaller, reversible, explicitly plan-authorized action) were completed as described above.

**What the user needs to decide:**
1. Should this push happen at all right now, or should the 46-commit Phase 1/2 backlog go through `/gsd-ship` (PR + review) before touching `origin/main`, per this repo's `CONTRIBUTING.md`?
2. If pushing directly to `main` is intended (this repo's established pattern for non-`infra/**` changes is direct push, per `github-environments.md` and the observed prior single-commit pushes), should it happen from this worktree as-is (all 50 commits in one push), or should the orchestrator handle the merge/push after reconciling all of Phase 2's worktrees?
3. Once pushed, Task 3's remaining verification (`gh run watch`, confirming `Upload site` and `Verify live deployment` both executed, confirming `curl` against the CloudFront default domain returns real content and the exact deployed commit) can resume immediately — no further code changes are needed for that step.

## User Setup Required

**One decision needed before this plan can complete — see Blocker above.** No environment variables, dashboard configuration, or additional credentials are needed; `gh` and AWS read access are already available and sufficient to complete Task 3 once the push decision is made.

## Next Phase Readiness

**Not ready to close 02-04 or advance to 02-05.** Tasks 1 and 2 are fully complete, tested, and committed — `deploy.yml`, `scripts/check-live-deployment.ts`, and `scripts/deploy-site.sh` are ready for a real deploy the moment the push decision above is resolved. `testpilots`'s GitHub Environment already holds every variable `deploy.yml` needs. The only remaining work is: (1) the human decision above, (2) the actual push, (3) `gh run watch` on the resulting `Deploy site` run, (4) confirming its step list and the live CloudFront responses per the plan's Task 3 acceptance criteria.

---
*Phase: 02-first-real-publication*
*Halted: 2026-08-26 (pending human decision on the origin/main push)*

## Self-Check: PASSED

- FOUND: scripts/check-live-deployment.ts
- FOUND: tests/unit/check-live-deployment.test.ts
- FOUND: .github/workflows/deploy.yml
- FOUND: scripts/deploy-site.sh
- FOUND: docs/operations/github-environments.md
- FOUND: tests/unit/deploy-scripts.test.ts
- FOUND commit: dc7bfd6
- FOUND commit: 4dab95a
- FOUND commit: c642199
- FOUND commit: 1a1448a
