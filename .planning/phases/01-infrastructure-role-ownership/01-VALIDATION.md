---
phase: 1
slug: infrastructure-role-ownership
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded by `/gsd-plan-phase` from `01-RESEARCH.md` § Validation Architecture.
> The Per-Task Verification Map is completed by `/gsd-validate-phase` once task IDs exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `tofu test` — OpenTofu 1.12.6 built-in, `*.tftest.hcl` (site suite: Vitest 4.1.11 + Playwright 1.62.1, unaffected) |
| **Config file** | none — `tofu test` discovers `tests/*.tftest.hcl` relative to the root under `-chdir` |
| **Quick run command** | `tofu fmt -check -recursive infra && tofu -chdir=infra/bootstrap validate && tofu -chdir=infra/bootstrap test` |
| **Full suite command** | `tofu fmt -check -recursive infra && ./scripts/check-tofu-tags.sh && tofu -chdir=infra/modules/static-site init -backend=false && tofu -chdir=infra/modules/static-site test && for root in infra/bootstrap infra/environments/testpilots infra/environments/beta infra/environments/stable; do tofu -chdir="$root" init -backend=false && tofu -chdir="$root" validate && tofu -chdir="$root" test; done` (mirrors `.github/workflows/validate.yml:46-64`) |
| **Standing site gate** | `npm run verify` — unchanged by this phase; must stay green |
| **Estimated runtime** | ~5 seconds quick · ~60 seconds full |

---

## Sampling Rate

- **After every task commit:** Run the quick run command
- **After every plan wave:** Run the full suite command + `./scripts/check-tofu-tags.sh`
- **Before `/gsd-verify-work`:** `npm run verify` green **and** the full OpenTofu suite green, on `main`
- **Max feedback latency:** 5 seconds (quick) / 60 seconds (full)

---

## Per-Task Verification Map

*Seeded at requirement granularity; per-task rows are filled in by `/gsd-validate-phase` after plans assign task IDs.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | INFRA-01 | TBD | Six roles exist; each trust policy names exactly one GitHub Environment subject; no wildcard | unit | `tofu -chdir=infra/bootstrap test` | ❌ W0 — `infra/bootstrap/tests/iam-github-actions.tftest.hcl` | ⬜ pending |
| TBD | TBD | TBD | INFRA-02 | TBD | Plan policy = state read + `.tflock`-only writes + read-only site actions; no state write; no mutation | unit | `tofu -chdir=infra/bootstrap test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | INFRA-03 | TBD | Apply policy adds only the module's create/update/tag/delete actions; no cross-environment ARN; no `iam:PassRole`/`sts:AssumeRole`; no bare `*` action | unit | `tofu -chdir=infra/bootstrap test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | INFRA-04 | TBD | Both new outputs exist and are keyed by the three environments | unit | `tofu -chdir=infra/bootstrap test` (assert on `output.infrastructure_plan_role_arns`) | ❌ W0 | ⬜ pending |
| Task 1 | 01-04 | 3 | INFRA-05 | — | Runbooks describe the OpenTofu path and retain human-apply + two-reviewer language | **manual** | — (`01-04` Task 1 `<verify><human-check>`, harvested into `01-UAT.md` at end of phase) | n/a | ⬜ pending |
| TBD | TBD | TBD | INFRA-06 | TBD | Bootstrap tags flow from a shared local; tag checker covers bootstrap | unit + shell | `tofu -chdir=infra/bootstrap test && ./scripts/check-tofu-tags.sh` | ⚠ partial — `bootstrap.tftest.hcl:88-94`, `:124-131` | ⬜ pending |
| TBD | TBD | TBD | DRIFT-01 / DRIFT-02 / DRIFT-03 | — | Stale sentences corrected | shell (grep post-condition) | `! grep -rn "7\.0\.2" docs/` and `! grep -n "until a separate ADR records an owner" docs/adr/0002-*.md` | ✅ greppable | ⬜ pending |
| TBD | TBD | TBD | GATE-01 | — | `fmt`/`init`/`validate`/`test`/tag-check all green on the bootstrap root | integration | Full suite command | ✅ already wired in `validate.yml:26-64`, `infrastructure.yml:49-61` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `infra/bootstrap/tests/iam-github-actions.tftest.hcl` — covers INFRA-01, INFRA-02, INFRA-03, INFRA-04, GATE-01
- [ ] Extend `scripts/check-tofu-tags.sh` with a bootstrap rule — covers INFRA-06, GATE-01
- [ ] No framework install needed — `tofu test` is built in and five `.tftest.hcl` files already exist
- [ ] No CI wiring needed — both workflows already run `tofu -chdir=infra/bootstrap test`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Runbooks (`aws-bootstrap.md`, `github-environments.md`) describe the OpenTofu-provisioned path and no longer instruct hand-crafting plan/apply roles, while retaining the human-apply + CODEOWNERS + second-administrator-review language | INFRA-05 | No automatable assertion exists for prose intent | Read both runbooks end to end; confirm (a) no step says to create the plan or apply role by hand, (b) the human-apply requirement and the two-reviewer requirement are both still stated, (c) the amended apply-role paragraph reads as a narrowed least-privilege claim naming its exception rather than an abandoned one, and (d) §1 tells you what to set `hosted_zone_id` to, in a place you reach before the plan command |

**Mechanism.** `human_verify_mode` is unset in `.planning/config.json` and therefore takes its `end-of-phase` default, so this phase emits **no** `checkpoint:human-verify` task. The verification above lives as a `<verify><human-check>` block on `01-04` Task 1 and is harvested into `01-UAT.md` by the verifier at end of phase. INFRA-05 stays ⬜ pending until that harvest is answered — an unanswered harvest means unverified, not verified.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
