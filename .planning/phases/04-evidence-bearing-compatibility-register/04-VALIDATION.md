---
phase: 4
slug: evidence-bearing-compatibility-register
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-26
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 (unit) + Playwright 1.62.1 (e2e), both already configured |
| **Config file** | `playwright.config.ts` (e2e); Vitest uses `package.json` scripts directly |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test:e2e` (builds all Astro targets, runs all Playwright projects, then `check:e2e-isolation`) |
| **Estimated runtime** | ~90 seconds locally |

---

## Sampling Rate

- **After every task commit:** `npm run test:unit`
- **After every plan wave:** `npm run test:e2e`
- **Before `/gsd-verify-work`:** Full suite must be green — `npm run verify`
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 04-01 | 1 | GATE-04 | — | Third build target (`STAGEHAND_SCALE_FIXTURES`) never crosses into production output | e2e | `STAGEHAND_SCALE_FIXTURES=1 npm run build` + Playwright `fixture-matrix-scale` project | ❌ W0 | ⬜ pending |
| 04-01-02 | 04-01 | 1 | GATE-04, COMP-01 | — | Scale fixture (27 records) proves matrix layout/a11y at volume | e2e | `playwright test tests/e2e/fixture-matrix-scale.spec.ts --project=fixture-matrix-scale` | ❌ W0 | ⬜ pending |
| 04-02-01 | 04-02 | 2 | COMP-03 | T-04-01 | Isolation checker rejects a fixture-derived record leaking into production (RED) | unit | `npm run test:unit -- e2e-build-isolation` | ✅ (rework) | ⬜ pending |
| 04-02-02 | 04-02 | 2 | COMP-03 | T-04-01 | Isolation checker implementation passes the negative-path test (GREEN) | unit + script | `npm run check:e2e-isolation` | ✅ (rework) | ⬜ pending |
| 04-03-01 | 04-03 | 2 | GATE-04, COMP-04 | — | Filters, 44px touch targets, keyboard tab order at volume | e2e | `playwright test tests/e2e/fixture-matrix-scale.spec.ts --project=fixture-matrix-scale` | ❌ W0 | ⬜ pending |
| 04-03-02 | 04-03 | 2 | GATE-04, COMP-04 | — | No-JS parity, wrap backstops at volume | e2e | same as above | ❌ W0 | ⬜ pending |
| 04-04-01 | 04-04 | 1 | COMP-02, COMP-05 | T-04-02 | `production-empty.spec.ts` branches on live `records.length` instead of assuming zero | e2e | `playwright test tests/e2e/production-empty.spec.ts --project=production` | ✅ (rework) | ⬜ pending |
| 04-04-02 | 04-04 | 1 | COMP-05 | — | `/data/compatibility.json` structurally matches `loadCompatibility()` output | unit | `npm run test:unit -- json-endpoints` | ✅ (rework) | ⬜ pending |
| 04-05-01 | 04-05 | 1 | COMP-04 | — | `--stagehand-danger` token formalized, no bare hex left | unit | `npm run lint` (stylelint) | ✅ (rework) | ⬜ pending |
| 04-05-02 | 04-05 | 1 | DRIFT-04 | — | Three design-spec sentences amended to match ADR-0001 | manual | prose diff review | n/a | ⬜ pending |
| 04-06-01 | 04-06 | 3 | COMP-01–05, GATE-04 | T-04-01, T-04-02, T-04-03 | Full `npm run verify` green across all three build targets | integration | `npm run verify` | ✅ existing | ⬜ pending |
| 04-06-02 | 04-06 | 3 | COMP-01, COMP-02 | T-04-03 | Register confirmed honestly empty — zero `- id:` records, `records: []`, review docs unchanged | other | `grep -c '^\s*- id:' src/data/compatibility.yaml` (expect 0) | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/fixtures/data/compatibility-scale.yaml` — new, ~24-30 records, not ADR-0001-governed
- [ ] `tests/fixtures/build-output/production-leaked/data/compatibility.json` — new negative-path fixture for the reworked isolation checker
- [ ] `tests/e2e/fixture-matrix-scale.spec.ts` — new axe/keyboard/wrap-backstop coverage for GATE-04
- No framework install needed — Vitest and Playwright already configured.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Evidence review completed before publish (primary-source HTTPS URL, scope narrowed to evidence, CODEOWNER approval) | COMP-01 | Human judgment on evidence quality and claim scope — not machine-checkable beyond the HTTPS/freshness/duplicate checks `loadCompatibility()` already performs | Follow `docs/operations/compatibility-claims.md`'s review checklist for any future real record |
| DRIFT-04's three sentence amendments read as consistent with ADR-0001's own wording | DRIFT-04 | Prose-drift consistency is a judgment call, no automated prose-diff tool in this repo | Read the three amended sentences side-by-side with ADR-0001's amendment language |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (scale fixture, negative-path fixture, fixture-matrix-scale spec)
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
