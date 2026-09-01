---
title: "Tester's Guide"
description: How to verify a deployed Stagehand console behaves as documented, and where to report what you find.
order: 4
updated: 2026-08-27
visibleOn: ['testpilots', 'beta']
---

## Who This Is For

This guide is for anyone verifying that a _deployed_ Stagehand console actually does what it
claims: someone testing a release, walking through a UAT pass, or exploring the product before
sign-off. It assumes you already have a running console (installed via the Puppet Installer, or an
existing instance someone gave you access to) and the shared password the Stagehand team gave you
to reach this site. It does not assume a source checkout, a build toolchain, or any development
environment; every step below happens in the browser, against the console's own UI.

If you find something that doesn't match what's described here, see
[Reporting What You Find](#reporting-what-you-find) below.

## What's Supported in Stagehand 1.0

The shipped 1.0 release runs a fixed capability profile. Supported today:

- One local Global Administrator account (no multi-user role-based access control yet)
- The full Activity Log
- Compliance and findings (scans, summary/node rollup, settings)
- Code Management, scoped to **control repositories only** (attaching a `team_module` or `module`
  kind repository is not available in 1.0)
- Bolt vulnerability scans
- Estate Viewer, as a registration/health view across instances, with no cross-instance
  classification or discovery actions

Deferred to a later release, and not reachable in a shipped 1.0 build no matter how you navigate:
multi-user RBAC/teams, an approvals workflow, customer-facing Data Management (the Puppet Data
Service / Hiera hierarchy editor), the ENC discovery/import wizard, and console self-update. If you
land on a route for one of these and it behaves as unavailable rather than throwing an error, that
is expected; it is not a bug to report.

## Manual Test Scenarios

Each table below describes a scenario to walk through on a real deployed console, and what you
should see if it's working correctly.

### Compliance

Sign in and open **Patching & Compliance → Compliance**. Confirm the page loads (an empty state
with zero results is fine if no scanner has posted yet) and the "Compliance" nav item is visible.
Click **Run compliance check** and walk the wizard: pick each of the available scanners in turn and
confirm the wizard's Next step is disabled only when a scanner-specific required field (for
example, the Inspector scanner's profile) is left blank. Pick a target on the target-selection step
(a static list, a group, or a PQL query), then confirm Start scan either launches the scan or, if
Bolt isn't configured, replaces the button with an explanatory note instead of failing silently.

With at least one node reporting, click **Heatmap** next to **Summary**. Confirm the grid shows one
row per node and one column per benchmark, each cell showing a glyph and color (never color alone)
for that pair's worst status, with a visibly distinct glyph for any node/benchmark pair that hasn't
been scanned yet. Click a cell and confirm the drilldown opens filtered to just that node and that
one benchmark. Click **Summary** again and confirm the original dashboard (charts, table,
pagination) renders unchanged.

This is also where to verify Bolt vulnerability scans specifically: the Inspector, and any other
configured scanner, should appear as a selectable option in the Run compliance check wizard above.

### Code Management (control repositories only)

Sign in and open **Management → Code Management**. On the **Repositories** tab, confirm the
repository-kind picker offers "control repo" as selectable, with any other kind shown but disabled.
Attach a real control repository with a real git host, add the shown public deploy key to that host
as a read-only deploy key, and confirm **Fetch** succeeds and shows classes and the Puppetfile.

| Scenario                                                                                                    | Expected result                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open the Deployments tab's environment dropdown after attaching a control repository with multiple branches | Every branch on the repository is listed, defaulting to the repository's configured default branch when it's among them, with no free-text entry allowed |
| No control repository attached                                                                              | Deploy now is disabled with an explanation that a control repository must be attached first; no dropdown is shown                                        |
| Run **Deploy now** against an environment                                                                   | That environment's row in the Environments list updates in place (no page reload) with a passed/failed status, a timestamp, and the actor who ran it     |
| Open an environment that has never been deployed through the console                                        | Its row shows the branch's short commit SHA and "Never deployed from this console", no fabricated date or status                                         |
| The environment list or branch list fails to load (host unreachable, an authentication problem)             | A clear error explains the failure and includes a way to retry, without breaking the rest of the page                                                    |

### Scoped Task and Plan Launcher

Open **Runner**, pick the PQL tab, enter a query, and click Preview. Note the matched-count badge
and, if you expand it, the certname list. Launch the run and confirm the resolved target count and
list match what the PQL preview showed.

### Dependency Graphs

Open a node with a failed latest report and click its Dependencies tab. Confirm resource nodes are
colored by status (failed = red, changed = amber, unchanged = green), and that clicking a
failed or changed node highlights its downstream blast radius while each highlighted node keeps its
own severity color. Confirm the side panel shows a status row (glyph plus label) and a downstream
impact count, and that clicking never navigates away. Open a node with no Puppet report yet and
confirm every resource shows as gray "Unreported" rather than a false "clean" state.

### Node Detail, Activity, Classes, and Configuration Coverage

| Scenario                                                                                      | Expected result                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open a node's detail page                                                                     | Overview, Activity, and Classes tabs render, with Overview selected by default and showing a line for how many classes are applied that switches to the Classes tab in place                                               |
| Open the Activity tab on a node with mixed history (audit entries, Bolt runs, Puppet reports) | A single time-ordered table renders all three kinds together; toggling a kind filter hides that kind's rows (at least one filter always stays on); clicking a row deep-links to the underlying run, report, or audit entry |
| Open the Classes tab on a node with classes from more than one source                         | Each class shows a source/mismatch indicator: in sync, not yet applied, or catalog only                                                                                                                                    |
| Open Configuration Coverage (under Reporting)                                                 | Three sections render: most-applied classes (ranked), declared-but-unused classes, and unclassified nodes; clicking a row opens its own drilldown listing the matching nodes                                               |

### Visual Bolt Designer

Open **Orchestration → Bolt** and pick the Plan Builder tab (this tab may also be labeled
"Designer" depending on your build). Confirm an empty canvas shows a "No steps yet" state with a
searchable step palette. Add two steps from the palette, then reorder and delete them, confirming
each card shows its index, name, and kind, and that deleting warns if another step references it.
Select a step and confirm its inspector renders a typed parameter form plus a target selector. Save
the draft, then Validate: a valid draft shows a success state, an invalid one lists cleaned error
rows with the raw output available behind a disclosure, and an unconfigured Bolt shows a clear
"Bolt unavailable" state rather than a raw error. Open the same draft in two browser windows, save
in one, then try saving in the other; confirm the second save is blocked by a conflict warning
rather than silently overwritten.

### Bolt Designer Dry Run, Publish, Undo, and Redo

| Scenario                                                                           | Expected result                                                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Save a draft whose first targeted step points at a real target, then click Dry run | The button shows a running state and disables; results fill in per-step with success/failed rows and full output behind a disclosure; no target machine is actually changed     |
| As a Global Administrator, click Publish on a saved draft attached to a repository | A confirmation dialog opens with a prefilled branch and commit message; confirming shows a success message with a link, and the branch really exists on the attached repository |
| Attempt the same publish while unauthenticated or as a non-administrator           | The server rejects the publish; the dialog stays open with the reason, never a silent success                                                                                   |
| Make several canvas edits, then Undo and Redo                                      | Each Undo restores the prior step list one edit at a time; Redo re-applies them in order; both buttons disable at the ends of the history                                       |
| Reload the page mid-edit                                                           | Undo/Redo history starts fresh; history is in-session only, and the saved draft itself is untouched                                                                             |

### Command Palette

Click "Search anything…" in the sidebar. Confirm a compact dialog opens with the search input
focused. Try typing a term that produces many results, a few results, and zero results, confirming
groups render in a fixed order with no more than a capped number of rows, and that zero matches
shows a plain "No matches." message. Select a node, a section, and an action in turn, confirming
each selection navigates correctly and the palette closes. Confirm this all still works if the
backend that supplies node results is briefly unreachable; the rest of the palette should keep
working rather than showing an error.

### Novice-Friendly Bolt Forms

Open Runner, Discover, and Scan with the Advanced section collapsed (the default). Confirm each
form is visibly lighter (no group/PQL tab bar) with one prominent primary button and a short
helper line. Open the Playbooks tab the same way, and confirm a selected playbook with declared
default variables shows generated fields above Advanced, pre-filled from those defaults. Click
"Show advanced options" on each form, reload the page, and confirm the open/closed choice persists
per page. Complete one task or plan run using only the default, non-Advanced path, confirming it
launches and completes without ever needing Advanced.

### EYAML Profile Wizard and Create Secret

Open **Configuration → Data Management**, then the **Create Secret** tab. With no key profile
saved, the "Encrypt a value" controls are disabled with a message pointing at "Manage keys." Switch
to Manage keys and generate a real key pair, watching your browser's network tab; the create
request and response should never contain the private key or PEM material, only the public key and
metadata. Uploading an existing key pair should be accepted after the console self-validates that
its public and private halves match. Use the "encrypt a value" helper and confirm the resulting
ciphertext renders once with a copy affordance, and that reopening the form clears both the
plaintext and ciphertext fields.

If you have a live Puppet Server with the matching decryption tooling configured, pasting a value
encrypted under a generated key pair into a real Hiera file should decrypt correctly at catalog
compile time; decryption failing for a value encrypted under a generated (not uploaded) key pair
is expected, since the private half of a generated pair never leaves the console.

### Estate Viewer

| Scenario                                                                          | Expected result                                                                                                                                 |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Register a second instance through Estate Viewer's "Add instance" wizard          | The confirm step stays unreachable until a connection test succeeds; a failed test shows a specific reason, never a generic "failed"            |
| Switch the active-instance selector to the new instance                           | Other pages now show that instance's data; Estate Viewer's own "Showing" filter is unaffected by the switch                                     |
| Point a registered instance at an unreachable host, then wait out a poll interval | That instance shows an honest "unreported" state, never a fabricated zero, and is never dropped from the total                                  |
| Edit an instance's name, product type, or console URL                             | The row updates in place; leaving the console URL blank means no "Open console" link renders; entering a non-`http(s)` value is rejected inline |
| Delete the currently active instance                                              | The deletion is refused with guidance to switch the active instance first                                                                       |

### Console SBOM

| Scenario                                                   | Expected result                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Open **Settings → SBOM**                                   | Version, channel, commit, and a non-zero component count render                                               |
| Open the Components table                                  | Every dependency is listed with name, version, and license; a filter box narrows by name or license substring |
| Click "Download App SBOM"                                  | A CycloneDX JSON file downloads immediately, served directly from the running binary                          |
| No self-update manifest is configured, or it's unreachable | "Download Full Container SBOM" renders disabled with an explanatory note, no error banner, no broken link     |

### Guided Hierascope and EYAML Walkthrough

Open **Configuration → Data Management**, then the Hierascope tab, on a console with an attached
repository. Confirm the job list renders (empty state if none exist yet) with a visible "Start
analysis run" action. Start a guided run: pick a repository, two refs to compare, preview the
scope, then start. Confirm a real active-node count and scope-cap indicator render before you
commit, and the new job lands on its own detail page. Watch a running job's detail page and confirm
progress polls automatically with no manual refresh needed. On a completed job with real
differences, confirm the Evidence, Failures, and Inputs tabs all render, and that downloading as
JSON or CSV produces a real file. Cancel a running job, then restart a finished one, confirming
restart creates a new job with the same frozen inputs.

### PDCTNG Connection and Change Tracking

| Scenario                                                                                                    | Expected result                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| With no connection saved, open a node's Activity tab and check Reporting navigation and the command palette | No deploy-attributed-changes section or Fleet Changes destination appears anywhere                                                                |
| Save a connection whose test fails                                                                          | The form reports the failure, and both connection-backed surfaces stay hidden                                                                     |
| Configure a real host/port and credentials under Settings → Connections, then Save & test                   | The test passes and the connection is retained                                                                                                    |
| Return to a node's Activity tab, Reporting navigation, and the command palette                              | The deploy-attributed-changes section and Fleet Changes destination now appear                                                                    |
| Open a node with deploy attribution available                                                               | The change row shows real resource details and, when available, a deployment link; no mutating control appears anywhere on this read-only surface |
| Open Fleet Changes before the collector has completed its first run                                         | The page explains the collector hasn't run yet, rather than showing a false empty result                                                          |

### Playbooks

Attach a Playbook Repository via the Playbooks page's "Attach repo" link, confirming the console
navigates you to Code Management's attach form with the right repository kind preselected;
attaching and fetching a real fixture repository should make its playbooks appear in the Playbooks
page's picker. Run a Designer-published multi-step plan that includes one playbook step alongside
another step, and confirm the run's detail view shows the full ordered step list, with the playbook
step rendering the same per-target output a standalone playbook run uses. Note that a playbook step
only renders this way when its name is left as the tool's default; a custom-named step is not
currently recognized as a playbook step and renders as a generic task row instead; this is expected
today, not a bug.

### Patchbot-Only Patching Boundary

Patchbot is the only supported patching engine in this release. A deployed console must not expose
a patch-provider picker, or any provider switching, migration, or generic provider-run capability.
In a deployed console, confirm Patching explains clearly when the required agent fact is missing,
renders posture information when it's present, and starts a group run through the direct path.
Historical alternate-provider routes should return not-found or method-not-allowed, never an
authentication or readiness response.

If you have access to disposable test targets, you can also verify the package-protection boundary:
confirm an ordinary operating-system package update cannot move a protected Puppet package, then
run the installer-controlled upgrade and confirm it unlocks only the boundary it's actively working
on, applies the intended change, and re-locks and verifies before finishing, including after a
deliberately injected interruption partway through.

## Reporting What You Find

If something here doesn't match what you see, or you find a defect while testing, report it via
[Support](/support/); it explains the difference between the public issue tracker and the private
advisory channel, and which one to use.
