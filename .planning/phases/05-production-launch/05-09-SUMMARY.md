---
phase: 05-production-launch
plan: 09
subsystem: infra
tags: [github-security-settings, private-vulnerability-reporting, security-policy, release-evidence]

# Dependency graph
requires:
  - phase: 05-production-launch
    provides: "docs/operations/RELEASE-EVIDENCE.md append-only scaffold (05-04) with the seeded 'Security advisory delivery test' row"
provides:
  - "Live GitHub repository setting private-vulnerability-reporting confirmed enabled ({\"enabled\":true} on fresh GET)"
  - "docs/operations/RELEASE-EVIDENCE.md — real, passing security mailbox delivery test row (LAUN-04 evidence)"
  - "SECURITY.md — fallback-mailbox caveat updated to reflect genuine verification"
affects: [05-08]

# Actuals (#2632)
actuals:
  tokens: 700
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Fresh GET re-check after a mutating GitHub API call — never trust the PUT/POST response alone as proof a repository setting took effect"

key-files:
  created: []
  modified:
    - docs/operations/RELEASE-EVIDENCE.md
    - SECURITY.md

key-decisions:
  - "Task 1's GitHub API PUT worked on the first try; the documented Settings-UI fallback path was not needed."
  - "Recorded the maintainer-reported mailbox test result exactly as reported (pass, Matthew Stone, Gmail message id 1a043a633065adae) — no upgrading or inventing detail beyond what was reported."
  - "SECURITY.md was updated because the real test genuinely passed; had it failed, the plan required leaving SECURITY.md byte-identical."

patterns-established:
  - "Repository-setting toggles verified via a mandatory fresh GET after the mutating call, never inferred from the mutation's own response."

requirements-completed: [LAUN-04]

coverage:
  - id: D1
    description: "Private vulnerability reporting is enabled on the live puppet-stagehand/stagehand-docs repository, confirmed by a fresh GET after the enabling PUT"
    requirement: "LAUN-04"
    verification:
      - kind: other
        ref: "gh api repos/puppet-stagehand/stagehand-docs/private-vulnerability-reporting --jq '.enabled' (returns true, post-mutation GET)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A real send-and-receive test to security@puppetstagehand.com was performed and honestly recorded in RELEASE-EVIDENCE.md"
    requirement: "LAUN-04"
    verification:
      - kind: manual_procedural
        ref: "Maintainer-reported real test: Gmail message id 1a043a633065adae sent and received by Matthew Stone (matt@souldo.net)"
        status: pass
    human_judgment: true
    rationale: "Claude has no access to real mailbox infrastructure (D-09, 05-CONTEXT.md, LOCKED); the pass/fail determination depends entirely on the maintainer's honest report of an out-of-band event."
  - id: D3
    description: "SECURITY.md's fallback-mailbox caveat updated to state delivery was verified, matching the genuine pass"
    requirement: "LAUN-04"
    verification:
      - kind: other
        ref: "git show — SECURITY.md diff replaces the unverified caveat with a dated verification statement pointing at RELEASE-EVIDENCE.md"
        status: pass
    human_judgment: false

duration: ~10min active execution (paused mid-plan for the Task 2 human-action checkpoint; total wall-clock time also included the maintainer's real mailbox test)
completed: 2026-08-27
status: complete
---

# Phase 05 Plan 09: Private Vulnerability Reporting and Security Mailbox Verification Summary

**Enabled GitHub's private-vulnerability-reporting toggle on the live repository (verified via fresh GET, not the mutating call's own response) and recorded a genuine, passing send-and-receive test to security@puppetstagehand.com, closing LAUN-04's two real gaps.**

## Performance

- **Duration:** ~10 min active execution (checkpoint paused for the maintainer's real mailbox test in between)
- **Started:** 2026-08-27 (session start)
- **Completed:** 2026-08-27T14:38:04Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Confirmed `private-vulnerability-reporting` was `false` on the live repository (matching RESEARCH.md's prior live verification), enabled it via `gh api --method PUT`, and re-verified with a fresh `GET` returning `{"enabled":true}` — never trusting the mutating call's own (empty/204) response as proof
- Held the plan's designed `checkpoint:human-action` for the one thing Claude cannot do itself: a real send-and-receive test against `security@puppetstagehand.com`
- Maintainer performed the real test (Gmail message id `1a043a633065adae`, subject "Test: security mailbox delivery check (Phase 05, LAUN-04)") and confirmed receipt as Matthew Stone (matt@souldo.net) — a genuine pass
- Recorded the honest result in `docs/operations/RELEASE-EVIDENCE.md`'s seeded Security advisory delivery test row (date, channel, test description, `pass`, recorded-by) — no fabrication, no upgrading detail beyond what was reported
- Updated `SECURITY.md`'s fallback-mailbox caveat to state delivery was verified on 2026-08-27, pointing at the RELEASE-EVIDENCE.md log, since the result was a genuine pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Enable and re-verify private vulnerability reporting** - no commit (live GitHub repository setting only, `files_modified` was empty per plan)
2. **Task 2: Test security@puppetstagehand.com delivery** - `checkpoint:human-action`, no commit (maintainer performed the real mailbox test out of band)
3. **Task 3: Record the real result and update SECURITY.md** - `6d303db` (docs)

**Plan metadata:** commit for STATE.md/ROADMAP.md/REQUIREMENTS.md follows this SUMMARY commit.

## Files Created/Modified
- `docs/operations/RELEASE-EVIDENCE.md` - Filled the seeded "Security advisory delivery test" row with the real, passing 2026-08-27 result
- `SECURITY.md` - Replaced the unverified fallback-mailbox caveat with a dated verification statement, since the test genuinely passed

## Decisions Made
- The GitHub API `PUT .../private-vulnerability-reporting` call worked on the first attempt; the plan's documented Settings-UI fallback path was not needed.
- Recorded the maintainer's report exactly as given — result, who received it, and the message id — with no invented or upgraded detail.
- Confirmed a non-maintainer's view of **Security → Advisories → Report a vulnerability** was not independently browser-tested from this session; per the plan, this is inferred from the setting being a documented repository-wide (not per-user) flag.

## Deviations from Plan

None - plan executed exactly as written, including the designed checkpoint pause between Task 1 and Task 3.

## Issues Encountered
None. The Bash auto-mode classifier did not block the `gh api PUT`/`GET` calls in this plan (unlike the `tofu apply` / `gh workflow run` blocks seen in 05-01/05-02), so no orchestrator hand-off for one-off approval was needed here.

## User Setup Required

**External mailbox test performed and reported by the maintainer** (Task 2, D-09): Matthew Stone confirmed `security@puppetstagehand.com` is provisioned, monitored, and received a real test message. No further setup required — this closes the one gap in LAUN-04 that Claude could not verify independently.

## Next Phase Readiness
- LAUN-04 is fully closed: private vulnerability reporting is live on the real repository, and the `security@puppetstagehand.com` fallback has a real, passing delivery test on record.
- Plan 05-08's DNS cutover precondition (blocked on this plan producing a real pass) is now satisfied.
- No blockers for subsequent plans in this phase.

## Self-Check: PASSED

All claimed files and commits verified present:
- `docs/operations/RELEASE-EVIDENCE.md` — FOUND (contains the filled security delivery test row)
- `SECURITY.md` — FOUND (contains the updated verification statement)
- Commit `6d303db` — FOUND

---
*Phase: 05-production-launch*
*Completed: 2026-08-27*
