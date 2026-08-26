---
phase: 02-first-real-publication
plan: 02
subsystem: ci-cd
tags: [github-environments, oidc, iam, gh-api, aws]

requires:
  - phase: 02-first-real-publication
    plan: "02-01"
    provides: "Real bootstrap outputs (OIDC provider ARN, 3 state bucket names, 6 IAM role ARNs, hosted zone ID) consumed here to populate the six GitHub Environments' variables."
provides:
  - "Six real, fully configured GitHub Environments on puppet-stagehand/stagehand-docs — testpilots, beta, stable, testpilots-plan, beta-plan, stable-plan — with the exact branch policies, reviewer rules, and non-deploy-scoped variable sets github-environments.md specifies"
  - "docs/operations/github-environments.md updated to state the six Environments exist for real, with a new documented platform constraint (prevent_self_review requires >=1 reviewer) and the SITE_CHECK_URL placeholder row"
affects: ["02-03-testpilots-apply", "02-04-deploy-gate-hardening", "02-06-infrastructure-plan-pr"]

actuals:
  tokens: 800
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "GitHub Environment protection is configured via `gh api --method PUT .../environments/{name}` with typed flags (`-F` for booleans, not `-f`) — passing booleans through `-f` produces a 422 (`\"false\" is not of type boolean`)."
    - "GitHub's 'selected branches' deployment-branch-policy mode requires BOTH `protected_branches=false` AND `custom_branch_policies=true`, plus a separate POST to `.../deployment-branch-policies` naming the exact branch/ref pattern (`main` or `refs/pull/*/merge`). `protected_branches=true` alone selects a different mode (\"only branches with a repo branch-protection rule\") that does not restrict to a named branch at all."

key-files:
  modified:
    - docs/operations/github-environments.md

key-decisions:
  - "Retrieved 02-01's captured bootstrap outputs fresh rather than relying on the (expected-absent) `.captured-outputs.json` scratch file: downloaded the real `infra/bootstrap/terraform.tfstate` from its S3 custody location (`s3://puppet-stagehand-bootstrap-state/...`), ran `tofu init -backend=false` + `tofu output` against a read-only scratch copy outside the worktree, and discarded it after reading. Never wrote real AWS values into any repository file."
  - "Resolved the `prevent_self_review` vs. `testpilots`'s zero-reviewer design without a blocking human checkpoint: GitHub's API rejects `prevent_self_review=true` when no reviewers are configured (confirmed via a real 422 response), and ADR-0002 rule 3 (LOCKED) requires self-review prevention only on `stable` — treating it as non-binding elsewhere. Since `testpilots` has no reviewers by design (matching its 'Optional' row), this is not an architectural conflict requiring a decision; documented plainly in the runbook instead."
  - "Self-caught and fixed a bug during Task 1: initially set `testpilots`/`beta`/`stable`'s deployment branch policy to `protected_branches=true` (wrong mode — 'only branches with a repo branch-protection rule'), not the 'selected branches: main only' mode the plan and doc specify. Corrected all three to `custom_branch_policies=true` + an explicit `main` deployment-branch-policy entry before Task 1 was considered done."

requirements-completed: [PUB-02]

coverage:
  - id: D1
    description: "All six GitHub Environments exist with the exact branch policy, reviewer, and self-review rules github-environments.md specifies"
    requirement: PUB-02
    verification:
      - kind: other
        ref: "gh api repos/puppet-stagehand/stagehand-docs/environments --jq '.environments | length' == 6; direct gh api read-back of each Environment's deployment_branch_policy and protection_rules matched the doc's tables (testpilots/beta/stable: selected branches, main only; testpilots-plan/beta-plan/stable-plan: selected branches and tags, refs/pull/*/merge only; beta/stable/all three -plan Environments: required reviewer matthewrstone with prevent_self_review=true; testpilots: no required reviewers, prevent_self_review unset per the documented platform constraint)"
        status: pass
    human_judgment: false
  - id: D2
    description: "No plan Environment holds an apply/deploy role ARN; no Environment holds an AWS access-key secret"
    requirement: PUB-02
    verification:
      - kind: other
        ref: "Direct gh api read-back of each Environment's /variables endpoint: the three -plan Environments' variable sets contain AWS_INFRASTRUCTURE_PLAN_ROLE_ARN only (no AWS_INFRASTRUCTURE_APPLY_ROLE_ARN anywhere); the three apply/deploy Environments contain AWS_INFRASTRUCTURE_APPLY_ROLE_ARN only (no CONTENT_BUCKET/CLOUDFRONT_DISTRIBUTION_ID/AWS_DEPLOY_ROLE_ARN yet, deferred to 02-04). /secrets endpoint returned total_count: 0 for all six Environments."
        status: pass
    human_judgment: false
  - id: D3
    description: "Every currently-available variable is set from 02-01's real bootstrap outputs, never copied between environments"
    requirement: PUB-02
    verification:
      - kind: other
        ref: "Each Environment's variable values were set from tofu output values re-read from the real bootstrap state this session (testpilots/beta/stable role ARNs, bucket names each distinctly reference their own Stagehand environment name; OIDC_PROVIDER_ARN and HOSTED_ZONE_ID shared and identical across all six, as intended)"
        status: pass
    human_judgment: false
  - id: D4
    description: "docs/operations/github-environments.md reflects the real, applied state"
    requirement: PUB-02
    verification:
      - kind: other
        ref: "grep -c SITE_CHECK_URL docs/operations/github-environments.md == 1; doc states the six Environments exist for real and documents both the solo-maintainer self-review friction and the newly discovered prevent_self_review platform constraint"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-08-26
status: complete
---

# Phase 02 Plan 02: GitHub Environments Summary

**All six GitHub Environments (testpilots, beta, stable, testpilots-plan, beta-plan, stable-plan) created and fully configured for real via `gh api`, reading every role ARN, the OIDC provider ARN, and the state bucket names from 02-01's real bootstrap outputs — with a live platform constraint on `prevent_self_review` discovered, resolved against ADR-0002's locked text, and documented rather than silently worked around.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-26T18:16:00Z (approx)
- **Completed:** 2026-08-26T18:36:22Z
- **Tasks:** 2/2
- **Files modified:** 1 (`docs/operations/github-environments.md`)

## Accomplishments

- Retrieved 02-01's real bootstrap outputs fresh (this worktree's `.captured-outputs.json` did not exist, as the prerequisite context anticipated): downloaded `infra/bootstrap/terraform.tfstate` from its S3 custody bucket (`puppet-stagehand-bootstrap-state`), read it via a read-only `tofu init -backend=false` + `tofu output` in an isolated scratch copy outside the repository, then discarded the scratch copy. No real AWS values were written into any repository file.
- Piloted `testpilots-plan` first (per the plan's explicit sequencing), verified the real `gh api` response shape, then replicated the confirmed shape to `beta-plan` and `stable-plan`.
- Configured all three apply/deploy Environments (`testpilots`, `beta`, `stable`) and all three plan Environments (`testpilots-plan`, `beta-plan`, `stable-plan`) with their exact branch policies, reviewers, `prevent_self_review` settings, and variable sets per `github-environments.md`'s tables.
- Self-caught and corrected a bug during Task 1: initially applied the wrong deployment-branch-policy mode (`protected_branches=true`, "only branches with a repo branch-protection rule") to `testpilots`/`beta`/`stable`, instead of the required "selected branches: `main` only" mode. Fixed all three before considering Task 1 done.
- Discovered and resolved a real platform constraint: GitHub's API rejects `prevent_self_review=true` when an Environment has zero configured reviewers (confirmed via a live 422 response). `testpilots` has no reviewers by design (matches its "Optional" row), so this cannot be enabled there — resolved by reading ADR-0002 rule 3 (LOCKED), which requires self-review prevention only on `stable` and treats it as non-binding elsewhere. Not a T-02-08 violation (that threat concerns disabling `prevent_self_review` on Environments that already have it to route around a deadlock — `testpilots` never had it to begin with).
- Updated `docs/operations/github-environments.md`: stated the six Environments now exist for real, documented both the solo-maintainer self-review deadlock friction (from Task 1's plan text) and the newly discovered `prevent_self_review` platform constraint, and added the `SITE_CHECK_URL` placeholder variable row for 02-04.
- Verified the final live configuration by direct `gh api` read-back against every Environment (not assumed from successful PUT/POST calls) before writing the doc update.

## Task Commits

1. **Task 1: Create and configure all six GitHub Environments** — no commit (plan-specified: "no repository files — this task's output is live GitHub Environment configuration"). Live state verified via `gh api` read-back.
2. **Task 2: Verify the configuration and update the runbook** — `203eeca` (docs)

## Files Created/Modified

- `docs/operations/github-environments.md` — added a real-state note, the self-review friction/constraint documentation, and the `SITE_CHECK_URL` row.

## Decisions Made

- **Fresh output retrieval instead of a stale scratch file:** see `key-decisions` in frontmatter. Read the real bootstrap state directly from its S3 custody location rather than assuming a per-worktree scratch file would exist.
- **`prevent_self_review` platform constraint resolved without a blocking checkpoint:** ADR-0002 (LOCKED) rule 3 disambiguated this — self-review prevention is a hard requirement only for `stable`; the doc's "Recommended" wording for `testpilots`/`beta` was already non-binding. `testpilots` cannot technically have it enabled while keeping its "Optional" (zero-reviewer) design, which is expected, not a defect.
- **Branch-policy mode bug self-corrected:** see `key-decisions` in frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong deployment-branch-policy mode on testpilots/beta/stable**
- **Found during:** Task 1, immediately after the first `gh api PUT` calls for these three Environments
- **Issue:** Set `deployment_branch_policy: {protected_branches: true, custom_branch_policies: false}`, which selects "only branches with a repo branch-protection rule" — not the "selected branches: `main` only" mode the plan and `github-environments.md` specify. Under the applied config, no branch would actually have been permitted to deploy unless `main` separately had a GitHub branch-protection rule configured (it does not).
- **Fix:** Re-applied `deployment_branch_policy: {protected_branches: false, custom_branch_policies: true}` to all three, then added an explicit `main` deployment-branch-policy entry to each via `POST .../deployment-branch-policies`.
- **Files modified:** None (live GitHub config only)
- **Verification:** `gh api .../environments/{name}/deployment-branch-policies` for all three returned exactly one entry, `{"name": "main", "type": "branch"}`; `gh api .../environments/{name}` confirmed `deployment_branch_policy: {custom_branch_policies: true, protected_branches: false}` on all three.
- **Commit:** N/A (no repository file changed)

**2. [Rule 1 - Bug, resolved via LOCKED ADR text, not a checkpoint] `prevent_self_review` cannot be set on testpilots**
- **Found during:** Task 1, first attempt to configure `testpilots`'s protection rules
- **Issue:** `gh api --method PUT .../environments/testpilots` with `prevent_self_review=true` and no reviewers returned a 422: `"Required reviewers must have at least one reviewer to set prevent_self_review."` `github-environments.md`'s table lists `testpilots`'s reviewers as "Optional" (i.e., none configured) while separately listing `prevent_self_review` as "Recommended" — these two cells cannot both be literally true on the live platform.
- **Fix:** Left `testpilots` with no required reviewers and no `prevent_self_review` protection rule (matching its "Optional" reviewers design). Confirmed via ADR-0002 rule 3 (LOCKED) that self-review prevention is a hard requirement only for `stable`; "Recommended" elsewhere was already non-binding. Documented the platform constraint plainly in the runbook (Task 2) rather than silently leaving it unexplained or unilaterally adding a reviewer to `testpilots` to force it.
- **Files modified:** `docs/operations/github-environments.md` (Task 2)
- **Verification:** Direct `gh api .../environments/testpilots` read-back confirms `protection_rules` contains only the `branch_policy` entry, no `required_reviewers` entry — matches the intended "Optional" design; ADR-0002 rule 3 text re-read and quoted in the SUMMARY's key-decisions.
- **Commit:** `203eeca` (doc update)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs — one self-introduced and self-corrected within Task 1, one a live platform constraint resolved against existing LOCKED ADR text rather than requiring a new human decision)
**Impact on plan:** Neither expanded scope. Both were necessary to complete Task 1's `<done>` criterion ("no cross-environment ARN leakage" and matching the doc's tables) and Task 2's acceptance criteria (live configuration matches the doc "exactly," with the doc corrected to be accurate about the one cell that cannot be literally true on the platform).

## Issues Encountered

None beyond the two deviations above. `gh` authentication (`matthewrstone`, scopes `repo`+`workflow`) and AWS access (`stagehand-bootstrap` profile) were both already available and required no setup this session.

## User Setup Required

None. All work in this plan was performed by the executor: GitHub Environment configuration via `gh api`, bootstrap-output retrieval via a read-only S3 download and local `tofu output`, and the runbook update.

## Next Phase Readiness

**Ready for 02-03 (testpilots apply):** `testpilots` and `testpilots-plan` Environments exist, fully configured, with `AWS_INFRASTRUCTURE_PLAN_ROLE_ARN`/`AWS_INFRASTRUCTURE_APPLY_ROLE_ARN`, `OIDC_PROVIDER_ARN`, `HOSTED_ZONE_ID`, and `TOFU_STATE_BUCKET` all set from real 02-01 outputs. `beta`/`stable`/`beta-plan`/`stable-plan` are also fully configured, ready for their respective future applies.

**Ready for 02-04 (deploy gate hardening):** `docs/operations/github-environments.md` already documents the `SITE_CHECK_URL` variable row (placeholder); 02-04 sets its real value once `testpilots` is applied and `CONTENT_BUCKET`/`CLOUDFRONT_DISTRIBUTION_ID`/`AWS_DEPLOY_ROLE_ARN` are known.

**Ready for 02-06 (infrastructure plan-job verification on a real PR):** All three `-plan` Environments now exist with the correct `refs/pull/*/merge` branch rule and required-reviewer/self-review-prevented protection, satisfying the structural prerequisite Pitfall 6 and Open Question 3 flagged.

**Nothing blocks the next wave.** The one open platform-behavior note (`prevent_self_review` unavailable on zero-reviewer Environments) is fully documented in the runbook and does not affect any downstream plan's ability to proceed.

---
*Phase: 02-first-real-publication*
*Completed: 2026-08-26*
