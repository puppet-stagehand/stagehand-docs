---
title: "Tester's Guide"
description: How to verify a deployed Stagehand console behaves as documented, and where to report what you find.
order: 6
category: support
updated: 2026-09-17
visibleOn: ['testpilots', 'beta']
---

## Who This Is For

This guide is for anyone verifying that a _deployed_ Stagehand console actually does what it
claims: someone testing a release, walking through a UAT pass, or exploring the product before
sign-off. It pairs with the [User's Guide](/docs/user-guide/) (what a feature _is_, in plain
language); this guide is _how you prove it works_, walking through the running console itself.

It assumes you already have a running console (installed via the Puppet Installer, or an existing
instance someone gave you access to) and the shared password the Stagehand team gave you to reach
this site. It does not assume a source checkout, a build toolchain, or any development environment;
every step below happens in the browser, against the console's own UI.

If you find something that doesn't match what's described here, see
[Reporting What You Find](#reporting-what-you-find) below.

## What's Supported in Stagehand 1.0

The shipped 1.0 release runs a fixed capability profile. Supported today:

- One local Global Administrator account (no multi-user role-based access control yet)
- The full Activity Log
- Compliance and findings (scans, summary/node rollup, settings)
- Task Repos, for attaching a git repository of Bolt tasks, Bolt plans, or Ansible playbooks so the
  console can discover and run what's inside (the earlier control-repository, environment/branch,
  and pull-based deploy workflow has been retired and is not part of any shipped 1.0 build)
- Bolt vulnerability scans
- Check-ins, a Reporting page showing daily rollup totals and a trend chart, with retention,
  webhook forwarding, and per-report JSON/CSV export settings
- Estate Viewer, as a registration/health view across instances, with no cross-instance
  classification or discovery actions

Deferred to a later release, and not reachable in a shipped 1.0 build no matter how you navigate:
multi-user RBAC/teams, an approvals workflow, customer-facing Data Management (the Puppet Data
Service / Hiera hierarchy editor), the ENC discovery/import wizard, console self-update, the EYAML
key-management and Hierascope comparison workflow (moved behind the same "Data Management" nav
consolidation), and switching between patching providers (Patchbot is the only one shipped; see
[Patchbot-Only Patching Boundary](#patchbot-only-patching-boundary) below). If you land on a route
for one of these and it behaves as unavailable rather than throwing an error, that is expected; it
is not a bug to report.

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
been scanned yet. A node with at least one failing control among passes shows a fail glyph for that
cell, not an average or majority vote. Click a cell and confirm the drilldown opens filtered to just
that node and that one benchmark. Click **Summary** again and confirm the original dashboard
(charts, table, pagination) renders unchanged.

This is also where to verify Bolt vulnerability scans specifically: the Inspector, and any other
configured scanner, should appear as a selectable option in the Run compliance check wizard above.

### Task Repos

Sign in and open **Configuration → Task Repos**. Confirm the **Kind** selector on the attach form
offers exactly two options, module and playbook repo, both enabled. Attach a real repository
containing at least one Bolt task, add the shown deploy key to your git host as a read-only deploy
key (or use a saved git credential or an HTTPS token instead), and click **Fetch now**. Confirm the
scan status moves to a success state and the task/plan/playbook counts on the row update to reflect
what the repository actually contains.

Open **Automation → Tasks & Plans** and confirm the task you attached appears in the Runner's task
picker; run it against a target and confirm a run report appears in the run history, the same as any
other Bolt run.

| Scenario                                                                                                  | Expected result                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attach a second repository whose derived name (its git URL's last path segment) matches the first         | The attach is refused and the error names the module name that collided, never the first repository's URL                                                       |
| Attach a repository named after the console's own built-in module (a URL ending in `stagehand`)           | The attach is refused the same way, naming `stagehand` as a reserved module name, rather than silently renaming it or replacing the console's own bundled tasks |
| Detach an attached repository                                                                             | The response is a clean success and nothing the console can still run is left behind with no row to show for it                                                 |
| Click **Fetch now** on a repository large enough to take a few seconds, then immediately click **Delete** | The delete is refused with an explanation that a fetch is in progress, rather than appearing to succeed; deleting again once the fetch finishes succeeds        |

**Negative check:** on the Task Repos page, confirm there is no Deployments tab, no per-branch
Puppetfile tab, and no "Deploy now" control anywhere. That workflow, tied to whole-environment
control-repository deployment, has been retired; a Task Repos attachment is for discovering and
running tasks, plans, and playbooks only.

Under **Git Credentials**, host-default and specific-repository entries both show their name and
scope but never secret material, and a specific-repository credential wins for its own URL over a
host-default one. Revoking a credential mid-clone stops only the operation using that credential;
other operations using a different credential continue, and the revoked key or token never appears
in any response, run output, or the Activity Log. Importing an existing deploy key found on the
primary host is read-only until you explicitly confirm the import; the consent dialog only opens
after you click **Review**, with neither choice preselected.

Under **Settings → Packages**, save a Forge API key and confirm a reference line appears showing
only the key's last six characters and the date it was attached, never the full key. Save an
expiration date in the past and confirm the Action Center shows a critical "Forge API key expired
N days ago" card linking back to that settings page; save one 10 days out and confirm it's a
warning-toned card instead; save one 90 days out and confirm no card appears.

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

### Node Detail, Activity, Classes, and Class Coverage

| Scenario                                                                                      | Expected result                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open a node's detail page                                                                     | Overview, Activity, and Classes tabs render, with Overview selected by default and showing a line for how many classes are applied that switches to the Classes tab in place                                                                                                                                                                                                     |
| Open the Activity tab on a node with mixed history (audit entries, Bolt runs, Puppet reports) | A single time-ordered table renders all three kinds together; toggling a kind filter hides that kind's rows (at least one filter always stays on); clicking a row deep-links to the underlying run, report, or audit entry                                                                                                                                                       |
| Open the Activity tab on a node with an orphaned or stale Bolt run                            | That row's outcome badge reads "unreported" (glyph plus label), never "running" or a fabricated failure                                                                                                                                                                                                                                                                          |
| Open the Classes tab on a node with classes from more than one source                         | Each class shows a source/mismatch indicator: in sync, not yet applied, or catalog only                                                                                                                                                                                                                                                                                          |
| Open Class Coverage (under Configuration, not Reporting)                                      | Four summary cards render above the existing ranked sections (Environments, Classes in use, Declared but unused, Unclassified nodes); a fifth "Modules" card is omitted entirely rather than shown empty, since its data source predates Task Repos and nothing attaches to it today; clicking a card or a ranked row opens its own drilldown or scrolls to the matching section |

### Check-ins

Open **Reporting → Check-ins**, directly after Activity & Runs. On a console whose background
rollup job has already run at least once against a reachable PuppetDB, the page shows a totals row
(Changed, Failed, Unchanged, Unreported, Overdue) for the most recent day and a trend chart below it
with one line per status. On a fresh install with no rollup rows yet, the page shows "No check-ins
recorded yet" with an explanation that the rollup starts after the next poll cycle, never a blank
page. With the console's own database briefly unreachable, reloading the page shows a distinct error
banner with a **Retry** action, not the "No check-ins recorded yet" empty state; retrying once the
database is back recovers the page without a full reload.

Click **Check-in settings** (or open **Settings → Check-ins** directly). Raising the retention value
saves immediately with no dialog; lowering it opens a reduction-confirmation dialog naming what will
be deleted, whose confirm button stays disabled until you check the acknowledgment box, and
canceling leaves the saved value unchanged. As a non-Global-Administrator, the retention field and
save controls are visible but grayed out, with an explanation on hover that this needs Global
Administrator, rather than being hidden.

On the same settings panel, turning on **Forward daily totals to a webhook** reveals a URL field; an
`http://` URL shows an inline warning that the payload travels unencrypted but still saves, while an
`https://` URL clears the warning. **Send test webhook** stays disabled until the field holds a
well-formed URL. Pointing it at a reachable test endpoint and clicking **Send test webhook** reports
a real success naming the host reached and delivers a JSON payload; pointing it at an unreachable
host reports a clear failure naming the host and the reason. A test send never changes the "No
deliveries yet" line, since a test is explicitly not a real delivery.

From any individual report, a **JSON / CSV** format picker plus an **Export** button let you download
that report. A JSON export contains the same data the page itself renders from; a CSV export has a
header row and one data row per resource event, and a report with zero resource events still
downloads a valid CSV with just the header row, never an empty or broken file.

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

### Estate Viewer

| Scenario                                                                          | Expected result                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Register a second instance through Estate Viewer's "Add instance" wizard          | The confirm step stays unreachable until a connection test succeeds; a failed test shows a specific reason, never a generic "failed"                                                                                                                                                                                       |
| Switch the active-instance selector to the new instance                           | Other pages now show that instance's data; Estate Viewer's own "Showing" filter is unaffected by the switch                                                                                                                                                                                                                |
| Point a registered instance at an unreachable host, then wait out a poll interval | That instance shows an honest "unreported" state, never a fabricated zero, and is never dropped from the total                                                                                                                                                                                                             |
| Edit an instance's name, product type, or console URL                             | The row updates in place; leaving the console URL blank means no "Open console" link renders; entering a non-`http(s)` value (for example, a `javascript:` URL) is rejected inline, both when saving and when the row renders                                                                                              |
| Delete the currently active instance                                              | The deletion is refused with guidance to switch the active instance first                                                                                                                                                                                                                                                  |
| Any instance row, any product edition                                             | A "Support options" link always appears, pointing at that edition's real support page (Puppet Core or Enterprise lifecycle pages, or Vox Pupuli's OpenVox page); Core and Enterprise rows also show a lifecycle status ("Supported," with published end-of-support and end-of-life dates); OpenVox rows show "Unsupported" |
| Open Settings → Connections with more than one instance registered                | The Instances card shows the currently active instance's own name and connections; other registered instances are listed separately, each editable without switching to them first                                                                                                                                         |

### Console SBOM

| Scenario                                                   | Expected result                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Open **Settings → SBOM**                                   | Version, channel, commit, and a non-zero component count render                                               |
| Open the Components table                                  | Every dependency is listed with name, version, and license; a filter box narrows by name or license substring |
| Click "Download App SBOM"                                  | A CycloneDX JSON file downloads immediately, served directly from the running binary                          |
| No self-update manifest is configured, or it's unreachable | "Download Full Container SBOM" renders disabled with an explanatory note, no error banner, no broken link     |

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
navigates you to Task Repos' attach form with the right repository kind preselected;
attaching and fetching a real fixture repository should make its playbooks appear in the Playbooks
page's picker. Run a Designer-published multi-step plan that includes one playbook step alongside
another step, and confirm the run's detail view shows the full ordered step list, with the playbook
step rendering the same per-target output a standalone playbook run uses. Note that a playbook step
only renders this way when its name is left as the tool's default; a custom-named step is not
currently recognized as a playbook step and renders as a generic task row instead; this is expected
today, not a bug.

### Account Security

Open **Settings → Account security** and confirm you can change the signed-in account's password.
This is the only self-service password-change surface in the console today. Two things are worth
verifying deliberately, since neither is obvious from clicking around casually:

- **You stay signed in on the browser where you changed it.** After a successful password change,
  the current browser session keeps working; a page you navigate to right after should load
  normally, not bounce you to the sign-in page.
- **Every other session is signed out.** If you're signed in as the same account in a second
  browser (or a private window), the next action taken there lands on the sign-in page, and only
  the new password works there afterward.

### HTTPS and TLS

Open **Configuration → HTTPS / TLS**. On a fresh install with no TLS configured, the console serves
plain HTTP and the page shows no "configured" state. Generate a self-signed certificate, restart the
console, and confirm it now serves HTTPS on its configured address, with the old plain-HTTP port
issuing a redirect instead of serving the app directly. A browser hitting the HTTPS URL will show
the expected self-signed-certificate warning; that's inherent to self-signed certificates, not a
console defect, and goes away once a certificate from a real certificate authority is uploaded.
Uploading an invalid or non-PEM value as the certificate or key should be rejected with a clear
error and change nothing. As a certificate's expiration approaches, the Action Center shows a
warning card inside 30 days and a critical card once it has actually expired, both linking back to
this settings page.

### Puppet Component Versions

Open **Settings → Packages & Forge** with a working PuppetDB connection. A "Puppet component
versions" table lists the exact `puppet-agent` version strings reported across your fleet, each
with its node count. Puppet Server and PuppetDB both show an honest **? not available** in this
table (hover for why) rather than a guessed version, since the console has no installed-version
source for either today; the "Latest (upstream)" column is likewise always **? not available**,
never a fabricated number, for any of the three components. If no node has reported a Puppet
version fact yet, the table says so instead of rendering empty.

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
[Support](/docs/support/); it explains the difference between the public issue tracker and the
private advisory channel, and which one to use.
