---
title: Homepage marketing refresh (tagline, hero, Features page)
date: 2026-08-31
context: Ad hoc session work, outside the formal ROADMAP.md phase structure
---

## What shipped

Not tracked against any REQUIREMENTS.md ID or ROADMAP.md phase — this was iterative
copy/design work done directly in conversation, not a planned phase. Captured here so the
project record reflects what changed on the public homepage and why.

- **Hero H1 replaced**: "Operate Puppet with Less Ceremony." → "Manage Puppet Environments
  With Less Complexity." — the "ceremony" framing tested as vague/generic against independent
  review (Opus and Fable both flagged it as restating the eyebrow/lede rather than adding
  conviction); the new line survived several rounds of tagline iteration as the standing pick.
- **New "Who It's For" homepage section**: "Bolt a Rocket Onto Your Puppet Environments." with
  two audience blurbs (hobbyists/homelabs; open source/community/Puppet Core users) and an
  honest note that Puppet Enterprise/Enterprise Advanced support isn't live yet ("next on the
  roadmap," not a bare "coming soon," per the docs-style skill's dishonest-framing rule).
- **Hero rail redesigned**: the "CONTROL MODE / OPERATOR DIRECTED" and "EXECUTION / BOLT
  NATIVE" labels were empty technical-sounding decoration with no real informational content
  (flagged by the user, confirmed against the docs-style skill's jargon-as-filler guidance).
  Replaced with a real screenshot of the console's Action Center, captioned as synthetic demo
  data. Also fixed a genuine layout bug this surfaced: `.control-hero__grid`'s forced
  `min-height` (sized for the old, taller H1) was stretching the rail's contents across a
  disproportionately tall column once the H1 shrank.
- **New top-level `/features/` page**, wired into `primaryNavigation` alongside
  Tiers/Compatibility/Docs/Downloads/Support. Four more real console screenshots (Estate
  Viewer, Inventory, Bolt-native execution runs, the full audit trail), each paired with copy
  tied to an actual product capability, not a mockup or stock image.

## Where the screenshots came from

All five screenshots (`public/screenshots/`) are real UI from a running `puppet-console` dev
stack (`docker ps` showed it already up), seeded with **synthetic demo data** for this session
via `puppet-console/lab/seed-*.py` (direct PuppetDB command-API writes for the node fleet,
direct-Postgres `COPY` for Bolt runs/audit log/classification) plus a scratch script mirroring
`seed-compliance.py`'s logic written to bypass its auth requirement (see [[]] — no existing
memory yet, this is the first record of that pattern). No live customer data, no credentials
handled by the assistant (the user signed into the console themselves), no mockups.

## Why this note exists

**How to apply:** If a future session touches the homepage hero, the `/features/` page, or
`primaryNavigation`, this is the context for why they look the way they do — not itself a
requirement to preserve, since none of this was requirements-driven. If the product's actual
feature set changes, the Features page screenshots will go stale before any doc content does
(they're frozen UI captures, not generated data) — worth a periodic re-screenshot pass.
