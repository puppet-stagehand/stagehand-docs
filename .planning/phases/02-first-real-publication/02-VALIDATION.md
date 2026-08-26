---
phase: 2
slug: first-real-publication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-26
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit), Playwright (e2e) — both already configured. This phase adds a third, lightweight category: a live-HTTP smoke check with no existing framework home. |
| **Config file** | `vitest` via `package.json` scripts; `playwright.config.ts` |
| **Quick run command** | `npm run check:routes` (local build-output route check — does not hit the network) |
| **Full suite command** | `npm run verify` |
| **Estimated runtime** | ~90 seconds (`npm run verify`), plus real AWS/GitHub calls per wave (minutes, not seconds — see Sampling Rate) |

---

## Sampling Rate

- **After every task commit:** `npm run verify` for anything touching `src/`, `scripts/`, or `tests/`; `tofu -chdir=<root> test` for anything touching `infra/`.
- **After every plan wave:** Full `npm run verify` plus, once real credentials exist, a real dispatch of the affected workflow (`Deploy site` or `Infrastructure`) against `testpilots` — OIDC role assumption, DNS, and CloudFront behavior cannot be validated without a real AWS call.
- **Before `/gsd-verify-work`:** Full suite must be green, plus all five ROADMAP.md success criteria independently observed true (see Manual-Only Verifications).
- **Max feedback latency:** ~120 seconds for local gates; real AWS applies and CloudFront propagation can take several minutes and are treated as a separate, expected-latency category, not a sampling-rate violation.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 02-01 | 1 | — | Root-user apply | Non-root identity confirmed before any real apply | manual precondition | `aws sts get-caller-identity` (checkpoint:human-action) | ✅ | ⬜ pending |
| 02-01-02 | 02-01 | 1 | PUB-01 | — | Bootstrap applied for real; all six role ARNs + zone ID captured | integration | `tofu -chdir=infra/bootstrap apply` + output capture | ✅ | ⬜ pending |
| 02-02-01 | 02-02 | 2 | PUB-02 | Self-review bypass | Six GitHub Environments configured with correct reviewers/branch rules/variables | manual/behavioral | `gh api repos/{owner}/{repo}/environments` inspection | ✅ | ⬜ pending |
| 02-03-01 | 02-03 | 2 | — | Root-user apply | Non-root identity re-confirmed before testpilots apply | manual precondition | `aws sts get-caller-identity` (checkpoint:human-action) | ✅ | ⬜ pending |
| 02-03-02 | 02-03 | 2 | PUB-03 | DNS tampering | ACM validation via single scoped CNAME, not NS delegation change | manual + automated | `tofu -chdir=infra/environments/testpilots apply` + `dig`/ACM status check | ✅ | ⬜ pending |
| 02-04-01 | 02-04 | 3 | PUB-05, GATE-02 | — | Live-verification script asserts all routes/JSON endpoints/404 + commit stamp | integration (new script, TDD) | `scripts/check-live-deployment.ts` (Wave 0 — does not exist yet) | ❌ W0 | ⬜ pending |
| 02-04-02 | 02-04 | 3 | PUB-04, GATE-02 | Silent-skip regression | `deploy.yml` hard-fails (not soft-skips) when Environment vars are missing; post-deploy check wired in | integration (workflow behavior) | Re-run `Deploy site` on `main`; inspect step list for `Upload site` executing and post-deploy check passing | ❌ W0 | ⬜ pending |
| 02-05-01 | 02-05 | 3 | PUB-06 | `pull_request_target` exposure | Same-repo PR touching `infra/**` produces a real, value-free plan through a plan Environment | manual/behavioral | Open a real PR; inspect the `plan` job's artifact | manual-only | ⬜ pending |
| 02-05-02 | 02-05 | 3 | PUB-07 | Secret leakage | No AWS account ID, credential, state file, saved plan, tfvars, or backend.hcl value anywhere in history | automated | `git grep -n -E '[0-9]{12}'` / `git log --all` sweep for tfvars/backend.hcl/tfstate/tfplan/AKIA strings | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/check-live-deployment.ts` — new live-HTTP smoke/verification script (curl/fetch-based, not a new Playwright project). Covers PUB-05 and the GATE-02 post-deploy check. Does not exist in any form today.
- [ ] A commit-stamp mechanism in the build/deploy step — prerequisite for the above; does not exist today. Written test-first per plan 02-04's TDD task.
- No test-framework install gap — Vitest/Playwright/`tofu test` are already present and configured; the new script is intentionally framework-light per RESEARCH.md's Alternatives Considered table.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All six GitHub Environments show correct branch rules, reviewers, and variables, no plan Environment holding an apply/deploy role ARN, no AWS access-key secret anywhere | PUB-02 | Asserts GitHub platform configuration state that isn't exposed as a local, scriptable assertion | Open **Settings → Environments** for the repo; visually confirm each of the six environments against `docs/operations/github-environments.md`'s spec |
| Opening a same-repository PR touching `infra/**` produces a real, value-free OpenTofu plan summary through a plan Environment, behind the job-level same-repo guard | PUB-06 | Asserts GitHub Actions runtime behavior (Environment protection + job-level guard interaction) that cannot be unit-tested locally | Open a real PR against `main` that edits an `infra/**` file; inspect the triggered `plan` job's run and artifact |
| `https://testpilots.puppetstagehand.com/` reachability over the final custom hostname | Success criterion 1 (partial) | Explicitly blocked on the deferred DNS/NS cutover (CONTEXT.md D-01/D-03) — not achievable within this phase's locked scope | Verify instead via the Route 53 hosted zone's own delegation set or CloudFront's default `*.cloudfront.net` domain; record custom-hostname reachability as deferred, not failed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`scripts/check-live-deployment.ts` + commit-stamp mechanism)
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s for local gates (real AWS/GitHub calls are a separate, expected-latency category)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
