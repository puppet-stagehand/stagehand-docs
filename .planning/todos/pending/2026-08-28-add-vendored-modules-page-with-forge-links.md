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

TBD — likely a new content page (e.g. `/modules/` or a `src/content/docs/modules.md` entry)
listing each vendored module with a link to its `forge.puppet.com/modules/<namespace>/<name>`
page. Needs a decision on where the canonical list of vendored modules is sourced from (a
Puppetfile? a manifest in another repo?) before implementation.
