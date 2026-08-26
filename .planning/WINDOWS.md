---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-08-26T16:07:24.837Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | docs/operations/aws-bootstrap.md |  | Task 1 human-check (one procedure not two, three custody controls, narrowed-not-abandoned scoping claim, hosted_zone_id placement) carried to end-of-phase UAT harvest per human_verify_mode default; not independently verified by executor | open |  | 2026-08-26T16:07:24.837Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "docs/operations/aws-bootstrap.md",
    "line": null,
    "description": "Task 1 human-check (one procedure not two, three custody controls, narrowed-not-abandoned scoping claim, hosted_zone_id placement) carried to end-of-phase UAT harvest per human_verify_mode default; not independently verified by executor",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-26T16:07:24.837Z",
    "resolved_at": null
  }
]
````
