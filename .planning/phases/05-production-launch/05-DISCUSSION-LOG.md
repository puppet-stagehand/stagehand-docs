# Phase 5: Production Launch - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-26
**Phase:** 5-production-launch
**Areas discussed:** DNS cutover blast radius, Release evidence format, Security advisory delivery, GATE-05 wiring

---

## DNS cutover blast radius

| Option | Description | Selected |
|--------|-------------|----------|
| Plan documents it, human executes it | Plan applies all AWS-side infra + redirect and produces a precise runbook; the registrar NS flip is a checkpoint:human-action | ✓ |
| Plan performs the full cutover autonomously | Executor actually changes registrar NS records as a plan task | |

**User's choice:** Plan documents it, human executes it (Recommended option).
**Notes:** This is the deferred decision from Phase 2's `02-CONTEXT.md` (D-01/D-03) — the live
domain currently serves an unrelated GitHub Pages site via Cloudflare. Flipping NS is a one-way,
irreversible-in-practice action outside git's reach, so it stays a human checkpoint.

---

## Release evidence format

| Option | Description | Selected |
|--------|-------------|----------|
| A committed RELEASE-EVIDENCE.md log | Markdown file appended per promotion/rollback with SHA, environment, timestamp, and checks | ✓ |
| GitHub deployment history + Action run annotations only | No new repo file; rely entirely on GitHub's own history | |

**User's choice:** A committed RELEASE-EVIDENCE.md log (Recommended option).
**Notes:** Also serves as the record location for the LAUN-05 rollback proof (incident + selected SHA).

---

## Security advisory delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Documented as a maintainer checkpoint | checkpoint:human-action to enable/verify private vulnerability reporting and test the security@ mailbox, recorded in the evidence log | ✓ |
| Skip mailbox delivery test, advisory-only | Only verify GitHub's private Security Advisory path; treat security@ email as out of scope | |

**User's choice:** Documented as a maintainer checkpoint (Recommended option).
**Notes:** Claude has no access to real mailbox infrastructure to test delivery itself.

---

## GATE-05 wiring

| Option | Description | Selected |
|--------|-------------|----------|
| New dedicated npm script running node --test | e.g. "test:redirect": "node --test infra/modules/static-site/tests/", folded into verify | ✓ |
| Convert redirect.test.mjs to vitest | Rewrite under vitest to fold into the existing test:unit script | |

**User's choice:** New dedicated npm script (Recommended option).
**Notes:** Smallest diff; leaves the existing node:test file's runner untouched.

---

## Claude's Discretion

- Exact RELEASE-EVIDENCE.md structure/table format, and whether SECURITY.md or
  RELEASE-EVIDENCE.md better hosts the mailbox-delivery test record.
- How LAUN-05's rollback proof is exercised against a target that doesn't require the registrar
  cutover to have already happened (e.g. beta, or stable via its CloudFront default domain).
- Sequencing of GATE-05 wiring relative to the DNS/promotion tasks.

## Deferred Ideas

- Operational hardening (WAF, CloudWatch alarms, budget alerts, synthetic canaries, access
  logging) — already tracked as OPS-01..12, deferred to v2.
- Full automation of the registrar DNS cutover via a registrar API integration — explicitly
  rejected as phase-5 scope.
