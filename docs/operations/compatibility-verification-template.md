# Compatibility verification test plan

Copy this file to `docs/operations/compatibility-evidence/<record-id>.md` for each platform/version
combination you verify, fill in every section with what actually happened, and commit it. The
committed, permalinked file (see "Turning this into evidence_url" at the bottom) becomes the
evidence a `compatibility.yaml` record points to. This satisfies `compatibility-claims.md`'s
"reproducible test evidence showing the exact version, platform, provider, transport, and result"
requirement.

Never fill in a result you didn't actually observe. A skipped or blocked step gets recorded as
skipped or blocked, not silently omitted or guessed at. This document is only useful if every
"pass" in it is true.

## 1. What's being verified

| Field                 | Value                                                                             |
| --------------------- | --------------------------------------------------------------------------------- |
| Puppet distribution   | (Puppet Core / Puppet Enterprise / PE Advanced / Open Source Puppet / OpenVox)    |
| Puppet Server version | (exact version, e.g. `8.10.0`, not a range — the range in the record comes later) |
| Stagehand version     | (exact version under test, e.g. `v0.2.3`)                                         |
| Platform/provider     | (where the Puppet Server and targets run, e.g. "Generic Linux VM" / `manual`)     |
| Target OS(es)         | (OS of the managed node(s) used in testing, e.g. `Ubuntu 24.04`)                  |
| Transport             | (e.g. `ssh`)                                                                      |
| Tester                | (your name)                                                                       |
| Date (UTC)            | (the date you actually ran this, not when you write it up)                        |

## 2. Setup

Record what you actually connected to and how, in enough detail that someone else could reproduce
it: Puppet Server install method, how Stagehand was pointed at it, any non-default configuration.
This isn't for publication verbatim, it's so a reviewer can tell the test was real.

## 3. Test scenarios

Run each scenario against the real environment above. Record the actual result and a pointer to
evidence (a command and its real output, a screenshot, a log excerpt) for each one, not just
pass/fail. If a scenario doesn't apply to this Puppet distribution or tier, mark it `n/a` and say
why.

### 3.1 Connect and register

Point Stagehand at the Puppet Server (see [Getting Started](https://www.puppet-stagehand.com/docs/getting-started/)).
Confirm the connection succeeds and the instance registers.

- Result:
- Evidence:

### 3.2 Node inventory (PuppetDB)

Open Inventory. Confirm real nodes from this Puppet Server appear, with status, applied classes,
and last-report time populated from actual PuppetDB data, not stale or placeholder values.

- Result:
- Evidence:

### 3.3 Classification

Assign a class or group to a node through Stagehand. Confirm the assignment reaches the Puppet
Server's classifier/ENC and a subsequent Puppet run on the target picks it up.

- Result:
- Evidence:

### 3.4 Bolt-native execution

Run a Bolt task, plan, or ad hoc command against a real target over the transport above. Confirm
it completes and its result (targets, outcome, duration) lands in Activity/Runs.

- Result:
- Evidence:

### 3.5 Compliance / patch data

If this tier includes Compliance and/or patch status: run or trigger a scan, confirm results
render correctly, sourced from this Puppet Server's real report/fact data.

- Result:
- Evidence:

### 3.6 Activity log

Confirm the actions above (3.1-3.5) actually appear in the Activity Log with correct actor,
action, and timestamp.

- Result:
- Evidence:

### 3.7 Version-specific behavior differences (if any)

Note anything that behaved differently than it does on a Puppet Server version you've already
verified: an API response shape change, a missing field, a new warning, a feature that silently
doesn't apply. This is the section most likely to actually matter for a version boundary; don't
skip it just because everything else passed.

## 4. Verdict

- Overall result: (supported / compatible / limited / deprecated / unsupported — see status
  definitions in `docs/operations/compatibility-claims.md`)
- Limitations to record (if any):
- Puppet version range this evidence actually supports: (be conservative — evidence for `8.10.0`
  supports a claim like `>= 8.10 < 9.0` only if you have reason to believe earlier 8.x behaves the
  same; don't widen the range past what you tested without a documented reason)

## 5. Turning this into a compatibility record

1. Commit this filled-in file, then get its permalink: on GitHub, open the file at the commit that
   added it and copy the "permalink" (pins the URL to that exact commit SHA, so it can't silently
   change under the record that cites it).
2. Add a record to `src/data/compatibility.yaml`:

```yaml
- id: <platform>-<tier>-<short-descriptor> # stable, unique
  platform: <from section 1>
  puppet_versions: '<range from section 4>'
  stagehand_versions: '<exact Stagehand version tested, or a range if stable across one>'
  tier: <openvox | puppet-core | puppet-enterprise | pe-advanced>
  provider: <from section 1>
  transport: <from section 1>
  operating_systems:
    - <from section 1>
  status: <from section 4>
  limitations:
    - <from section 4, or leave empty>
  docs_path: /docs/getting-started/ # or whichever guide is most relevant
  evidence_url: <the permalink from step 1>
  last_verified: '<date from section 1, YYYY-MM-DD>'
```

3. Run `npm run validate:data`, then `npm run verify`.
4. Open a PR per `docs/operations/compatibility-claims.md`'s checklist.
