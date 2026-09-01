---
schema_version: 1
open_count: 2
waived_count: 1
fixed_count: 1
total_count: 4
last_updated: 2026-09-01T00:35:25.645Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | docs/operations/aws-bootstrap.md |  | Task 1 human-check (one procedure not two, three custody controls, narrowed-not-abandoned scoping claim, hosted_zone_id placement) carried to end-of-phase UAT harvest per human_verify_mode default; not independently verified by executor | fixed |  | 2026-08-26T16:07:24.837Z | 2026-08-26T16:16:38.639Z |
| 2 | 04.1 | deviation | src/content/docs/testers-guide.md |  | AUTH-06 live cross-environment proof deferred: check 6 (beta shows guide, stable shows fallback for a tester holding only the tester-gate credential) is blocked pre-launch by the separate, temporary whole-site enable_basic_auth lockdown (commit 44b56c9) sharing the same WWW-Authenticate realm as the tester gate, so the gated page's own static assets 401 for tester-credential-only sessions. Re-verify check 6 once Phase 05 removes the whole-site lockdown at public launch. | waived | Corrected understanding as of 2026-08-31: this was never a Phase-5 gap. The maintainer confirmed the whole-site enable_basic_auth lockdown is staying up intentionally until the rest of the release (puppet-installer/stagehand-module Forge publication, etc.) ships -- Phase 5's DNS cutover and promotion/rollback work being 'Complete' never implied the lockdown would come down. AUTH-06's live cross-environment proof (beta shows guide, stable shows fallback for a tester-gate-only credential) remains genuinely blocked, not fixed -- re-verify it once the maintainer removes enable_basic_auth as part of the real, future public launch, whenever that is, not tied to any specific existing phase. | 2026-08-28T13:25:23.074Z | 2026-09-01T00:35:25.645Z |
| 3 | 04.2 | deviation | src/lib/data/downloads.ts |  | DOWN-01/DOWN-02/DOWN-04 live verification deferred: the downloads page's build-time loader is proven against fixtures only (GATE-07). puppet-stagehand/stagehand-release now exists (created since 04.2-01/02 were planned — D-07's 'repo does not exist' premise is stale) but holds zero releases (gh release list --repo puppet-stagehand/stagehand-release returns empty), confirmed by this plan's own real, non-fixture npm run build resolving all three channels to null in dist/data/downloads.json — the loader correctly fail-closes against the real target repo, but no real release has ever been fetched/rendered/checksum-verified end-to-end. Re-verify once the remaining cross-repo prerequisite steps (workflow retarget from souldonetworks to puppet-stagehand, token wiring, first real release per channel) land — see ROADMAP.md's Phase 04.2 Cross-Repo Prerequisite note. | open |  | 2026-08-31T15:52:32.232Z |  |
| 4 | 05 | deviation | .github/workflows/deploy.yml |  | GitHub Actions environment-scoped BASIC_AUTH_USERNAME/BASIC_AUTH_PASSWORD secrets (testpilots, beta, stable) were all created once at 2026-08-28T12:28 and never updated since. Discovered during 05-11's rollback: the same run's own built-in Verify live deployment CI step 401'd on every route using these secrets, while an independently-supplied, working credential succeeded against the same live distribution minutes later. This strongly suggests the real Terraform-applied basic_auth_username/basic_auth_password (TF_VAR_basic_auth_username/TF_VAR_basic_auth_password, rotated via a full tofu apply per docs/operations/tester-access.md) has changed since 2026-08-28 without the three GitHub environment secrets being updated to match. Not fixed here -- updating a CI/CD secret needs a confirmed-correct current value, which only the maintainer holds. The deployment itself (S3 upload) is unaffected; only this CI smoke-test step and any future automated check-live-deployment.ts run inside GitHub Actions are impacted. Independent, out-of-CI verification in 05-11-SUMMARY.md and RELEASE-EVIDENCE.md's rollback row confirms the actual deployment succeeded. | open |  | 2026-08-31T19:57:53.977Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "docs/operations/aws-bootstrap.md",
    "line": null,
    "description": "Task 1 human-check (one procedure not two, three custody controls, narrowed-not-abandoned scoping claim, hosted_zone_id placement) carried to end-of-phase UAT harvest per human_verify_mode default; not independently verified by executor",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-26T16:07:24.837Z",
    "resolved_at": "2026-08-26T16:16:38.639Z"
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "04.1",
    "file": "src/content/docs/testers-guide.md",
    "line": null,
    "description": "AUTH-06 live cross-environment proof deferred: check 6 (beta shows guide, stable shows fallback for a tester holding only the tester-gate credential) is blocked pre-launch by the separate, temporary whole-site enable_basic_auth lockdown (commit 44b56c9) sharing the same WWW-Authenticate realm as the tester gate, so the gated page's own static assets 401 for tester-credential-only sessions. Re-verify check 6 once Phase 05 removes the whole-site lockdown at public launch.",
    "status": "waived",
    "reason": "Corrected understanding as of 2026-08-31: this was never a Phase-5 gap. The maintainer confirmed the whole-site enable_basic_auth lockdown is staying up intentionally until the rest of the release (puppet-installer/stagehand-module Forge publication, etc.) ships -- Phase 5's DNS cutover and promotion/rollback work being 'Complete' never implied the lockdown would come down. AUTH-06's live cross-environment proof (beta shows guide, stable shows fallback for a tester-gate-only credential) remains genuinely blocked, not fixed -- re-verify it once the maintainer removes enable_basic_auth as part of the real, future public launch, whenever that is, not tied to any specific existing phase.",
    "recorded_at": "2026-08-28T13:25:23.074Z",
    "resolved_at": "2026-09-01T00:35:25.645Z"
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "04.2",
    "file": "src/lib/data/downloads.ts",
    "line": null,
    "description": "DOWN-01/DOWN-02/DOWN-04 live verification deferred: the downloads page's build-time loader is proven against fixtures only (GATE-07). puppet-stagehand/stagehand-release now exists (created since 04.2-01/02 were planned — D-07's 'repo does not exist' premise is stale) but holds zero releases (gh release list --repo puppet-stagehand/stagehand-release returns empty), confirmed by this plan's own real, non-fixture npm run build resolving all three channels to null in dist/data/downloads.json — the loader correctly fail-closes against the real target repo, but no real release has ever been fetched/rendered/checksum-verified end-to-end. Re-verify once the remaining cross-repo prerequisite steps (workflow retarget from souldonetworks to puppet-stagehand, token wiring, first real release per channel) land — see ROADMAP.md's Phase 04.2 Cross-Repo Prerequisite note.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T15:52:32.232Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "05",
    "file": ".github/workflows/deploy.yml",
    "line": null,
    "description": "GitHub Actions environment-scoped BASIC_AUTH_USERNAME/BASIC_AUTH_PASSWORD secrets (testpilots, beta, stable) were all created once at 2026-08-28T12:28 and never updated since. Discovered during 05-11's rollback: the same run's own built-in Verify live deployment CI step 401'd on every route using these secrets, while an independently-supplied, working credential succeeded against the same live distribution minutes later. This strongly suggests the real Terraform-applied basic_auth_username/basic_auth_password (TF_VAR_basic_auth_username/TF_VAR_basic_auth_password, rotated via a full tofu apply per docs/operations/tester-access.md) has changed since 2026-08-28 without the three GitHub environment secrets being updated to match. Not fixed here -- updating a CI/CD secret needs a confirmed-correct current value, which only the maintainer holds. The deployment itself (S3 upload) is unaffected; only this CI smoke-test step and any future automated check-live-deployment.ts run inside GitHub Actions are impacted. Independent, out-of-CI verification in 05-11-SUMMARY.md and RELEASE-EVIDENCE.md's rollback row confirms the actual deployment succeeded.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T19:57:53.977Z",
    "resolved_at": null
  }
]
````
