---
created: 2026-08-28T15:10:34.353Z
title: Add vendored-modules page with Forge links
area: docs
severity: blocker
files: []
---

## Problem

The site has no page listing the Puppet modules this project vendors/depends on. A
reader/operator currently has no single place to see which modules are in use and go find them
on the Puppet Forge. Surfaced 2026-08-28 during Phase 04.1 UAT, alongside the broader
docs-content push (user guide, installer guide, downloads page — Phase 04.2).

Not currently in the roadmap as a phase or requirement — needs scoping (which modules to list,
where the source-of-truth for the vendored-module set lives, page location/nav placement) before
it can be planned.

## Solution

Confirmed 2026-08-31: no content port is needed. `stagehand-module` (and its sibling first-party
modules — patchbot, trivy, openscap, etc.) will not get their own pages or ported reference docs
here; this site just links each vendored module out to its Forge page once published, the same
way `installer-support.md` and `installer-registry-distribution.md` already link out rather than
duplicate content.

**Currently blocked**, not just unscoped: `stagehand-stagehand` is not yet live on the Forge
(`https://forge.puppet.com/modules/stagehand/stagehand` returns HTTP 200 but the page itself reads
"Not Found" — same generic-200 SPA shell every Forge URL returns). This is the same category of
gap as WINDOWS.md entry 3 (`downloads.ts`'s zero-releases gap) — nothing to link to until the
module is actually published.

Still needs a decision on where the canonical list of vendored modules is sourced from (a
Puppetfile? a manifest in another repo? `stagehand-module`'s own `README.md` "Sibling first-party
modules" section?) once it's unblocked, and on page location/nav placement (a new `/modules/`
top-level page, or a `src/content/docs/modules.md` entry).
