---
title: 'Installer Support & Troubleshooting'
description: Symptom-to-fix guidance for troubleshooting a Puppet Installer install, upgrade, or credential problem.
order: 7
updated: 2026-08-31
---

Troubleshooting guidance for anyone running `puppet-installer` — installing or
upgrading Puppet Core, Puppet Stagehand, or both. Assumes comfort with Puppet,
Docker/Kubernetes, and general infrastructure troubleshooting.

## Quick-reference: symptom → likely cause → what to check

| Symptom                                                                                 | Likely cause                                                                                                                                  | Check                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Credential rejected" / 401 at validation                                               | Wrong or expired forge key/license id                                                                                                         | The installer verifies your key with a live call to Puppet's package repositories, not just that a key is present — re-verify your Forge key or PE license id in your Puppet account.                                                                                                                               |
| "a Forge API key or license id is required"                                             | No credential supplied at all                                                                                                                 | The four from-scratch install modes (all-in-one, multi-VM, Compose, Helm) always require a Forge key or PE license id — there's no credential-less way to install Puppet Core itself. Standalone Stagehand or connecting to an already-running Core needs no credential at all. See **The credential model** below. |
| Bolt plan fails immediately, "bolt not found"                                           | Bolt isn't installed on the machine running puppet-installer, not the target                                                                  | This means Bolt is missing on the controller, not the install target. The installer normally offers to auto-install it; if that failed, see the macOS Bolt note below.                                                                                                                                              |
| macOS: "download failed: HTTP 404" during Bolt auto-install                             | Bolt version/macOS-major/arch combination not in Puppet's artifact catalog                                                                    | A known gap for less-common macOS-version/architecture combinations. The installer prints a manual-install link — follow it to install Bolt yourself: [help.puppet.com/bolt/current/topics/bolt_installing.htm](https://help.puppet.com/bolt/current/topics/bolt_installing.htm).                                   |
| VM modes: Bolt plan hangs or times out on SSH                                           | Target unreachable, wrong SSH key/user, or sudo prompting for a password                                                                      | Confirm the target's SSH address, that your SSH key path is correct on the machine running the installer, and whether the target expects passwordless sudo.                                                                                                                                                         |
| Compose: `docker build`/`pull` fails                                                    | Forge key invalid for the Puppet Core package repository, or (with registry-hosted images) registry auth/network issue                        | Building locally needs a valid Forge key; pulling a pre-built image needs registry credentials, or that you're already logged in to the registry — see **Distribution channels are still evolving** below.                                                                                                          |
| Compose/Helm: console can't reach puppetserver, or r10k has no Forge access             | Forge-key secret not mounted, or the Forge key lacks entitlement to referenced modules                                                        | See **Secrets** below — this is a separate, runtime credential from the one used to pull the container image.                                                                                                                                                                                                       |
| Helm: `helm install` fails validating `puppetserverImage`/`puppetdbImage`               | Those fields are required and unset                                                                                                           | Helm has never built images itself — you must supply existing, already-published image references.                                                                                                                                                                                                                  |
| Helm: pod stuck `ImagePullBackOff`                                                      | Registry auth wrong, or the referenced tag was never pushed                                                                                   | Confirm your registry credentials were supplied, and that an image actually exists for that Puppet version — availability isn't guaranteed for every version yet, see **Distribution channels are still evolving** below.                                                                                           |
| Stagehand lifecycle upgrade cannot recover credentials                                  | The target environment could not be read, has an invalid database URL, or is missing a database password, ingest token, or data-service token | Supply the original database password, ingest token, and data-service token as recovery overrides and retry — see **Lifecycle secret recovery** below.                                                                                                                                                              |
| `stagehand::secret`/`node_encrypt` unavailable                                          | The installer build you're running didn't bundle those Puppet modules                                                                         | Check the install log for a "not vendored" warning.                                                                                                                                                                                                                                                                 |
| A private control repository cannot be cloned                                           | The URL/key combination is invalid, the deploy key lacks read access, or first-use host trust is unsuitable                                   | Use an SSH URL with a read-only, unencrypted deploy key, and verify the repository host's key before the first connection — see **Repository and Stagehand credentials** below.                                                                                                                                     |
| Stagehand cannot access a fleet node, or a rotation/default change does not take effect | The fleet username/key were partial, the wrong key was supplied, or an installer seed was expected to override saved runtime state            | Add or rotate the credential pair under **Bolt → Credentials**, then select or clear the fleet default in **Settings → Execution** — a value already saved there always wins over anything the installer tries to seed.                                                                                             |
| Fleet username is rejected before apply                                                 | It is empty, too long, contains non-ASCII text, starts with punctuation, or contains an unsupported character                                 | Use 1–64 ASCII characters: start with a letter or digit, then use only letters, digits, `.`, `_`, or `-`.                                                                                                                                                                                                           |

---

## 1. What this tool is and isn't

`puppet-installer` is a wizard/CLI that **generates and runs installation
plans** for Puppet across four install modes, plus a fifth console-only
lifecycle mode:

- **All-in-one** — puppetserver + PuppetDB + Postgres on a single VM, driven
  by a generated Bolt plan run over SSH (or locally, for an "install onto
  this box" flow).
- **Multi-VM** — roles (primary, compilers, PuppetDB) split across multiple
  VMs, also Bolt-plan-driven.
- **Compose** — a Docker/Podman Compose dev/test cluster: puppetserver,
  PuppetDB, Postgres, optionally the console and throwaway test-agent nodes.
- **Helm** — a Kubernetes deployment via an installer-embedded Helm chart.
- **Console-only lifecycle** — install/upgrade/uninstall the console add-on
  against an _already-running_ Puppet Core (or attached PE) install, without
  touching Core's own packages. This is the one mode that applies real
  Puppet classes directly, rather than shell-scripting through generic
  commands like the other modes.

**Every mode implements the same two-step contract:** a preview step renders
every file it would write and every command it would run, with no side
effects. Apply actually executes it, streaming progress as it runs. **When
an install fails, the first useful question is "what did the plan preview
look like?"** — a wrong preview (missing a step, wrong host, wrong image
reference) means the _inputs_ were wrong, and no amount of re-running apply
will fix that. A preview that looked right but apply still failed means the
problem is environmental (connectivity, credentials, engine availability) —
see the failure-mode sections below.

## 2. The credential model

Two credential shapes exist: a **Forge API key** or a **PE license id**. One
of the two is required — but only for the modes that actually install Puppet
Core from scratch (all-in-one, multi-VM, Compose, Helm). **Stagehand
lifecycle (console-only) needs no credential at all** — it never installs
Puppet Core packages. Its Docker method can run standalone or optionally
connect to an existing Core primary; neither path downloads authenticated
Core packages.

Which credential you supply also determines the install flavor: a PE
license id alone means a PE (Puppet Enterprise) install; anything else (a
Forge key, or both set, which is rejected as ambiguous) means Puppet Core.

**What's fixed vs. what's still a gap, for an open-source Puppet or OpenVox
setup:** if you already have a Puppet Core, open-source Puppet, or OpenVox
server running and just want Stagehand connected to it — or if you want
standalone Docker Stagehand — that works with no Puppet credential at all.
**What's still not supported:** installing Puppet Core, open-source Puppet,
or OpenVox _from scratch_ through this tool without a Puppet-issued Forge
key — package installation for the other four modes goes through Puppet's
own authenticated package repositories, not raw upstream open-source apt
repos or OpenVox's own community-run repos. If you want a from-scratch
install (not an attach to an existing server) without a credential, today's
honest answer is still "not yet supported through this installer."

The bundled web wizard matches this contract: Stagehand marks the credential
as optional, and Docker connection fields may be left blank for standalone
operation. Supplying a Puppetserver FQDN or primary SSH target opts into the
connected path and certificate minting.

## Repository and Stagehand credentials

**Puppet Installer**'s Core path installs Puppet Core in all-in-one,
Compose, or Helm mode. Its Stagehand path installs, upgrades, or removes
Stagehand on an existing Core estate, or as a standalone Docker deployment.
Standalone Stagehand has no control-repository setup.

### Control repositories by Core mode

All-in-one and Compose offer three code choices: no repository, connect an
existing repository, or generate a starter repository. The generated starter
is safe to rerun: modified files remain in place and refreshed candidates use
a `.new` suffix. A VM target needs a pushed repository that it can reach;
Compose can instead mount the generated local repository read-only.

Helm requires an existing control-repository URL. It has no starter-repository
generator and does not deploy Stagehand. All Core repositories are deployed by
r10k, with Git branches used as Puppet environments.

### Repository deploy key

All-in-one, Compose, and Helm accept an optional deploy key only when the
control repository uses one of these SSH URL forms:

- `git@git.example.com:team/control-repo.git`
- `ssh://git@git.example.com/team/control-repo.git`

An HTTPS or local URL must not have an uploaded deploy key. Use an unencrypted
private key with read-only access to just that repository. The installer scopes
this key to r10k; it must not be reused as a Stagehand fleet key.

The generated SSH command uses `StrictHostKeyChecking=accept-new`. It saves a
previously unseen repository host key and rejects a changed key within that
trust store. It therefore protects against an unexpected later change but does
not authenticate the host on first contact. Confirm the host key before the
first connection and, where stronger assurance is required, pre-seed and
manage `known_hosts`; newly created containers or pods can have a fresh trust
store.

### Stagehand fleet credential

The installer seeds Trivy, OpenSCAP, and SCE independently through
`PSH_COMPLIANCE_*`; omitted values are disabled. Scanner lifecycle assets are
always staged so Settings can switch Trivy/OpenSCAP later with preview and
confirmation. SCE preparation only adds or proposes exact module pins and never
classifies an enforcement class. Use `POST /api/security/readiness` to inspect
the structured contract state and `POST /api/control-repo/proposal` to download
a review-only patch for an existing repository.

Stagehand install and upgrade use Patchbot as the only patch execution engine;
there is no installer-side provider choice. The optional fleet
SSH username and private key are available with bundled Stagehand in
all-in-one or Compose, and in standalone Stagehand install or upgrade. Both
values are required together and are optional as a pair. Helm does not deploy
Stagehand.

The fleet username must be 1–64 ASCII characters. Start with an ASCII letter
or digit; remaining characters may be ASCII letters, digits, `.`, `_`, or `-`.

When present, the values can bootstrap the Stagehand `stagehand-fleet` Bolt
credential. The installer creates and selects it only if Stagehand has never
saved a runtime fleet default. A saved runtime value always wins, including an
explicitly cleared (empty) default, so the installer cannot later restore or
replace it.

The running application owns subsequent credential management: add or rotate
pairs in **Bolt → Credentials**, then select or clear the fleet default in
**Settings → Execution**. This key reaches managed fleet nodes; it is
intentionally separate from the repository deploy key, which only lets r10k
read Puppet code.

### Valid credential contexts

The request is validated before apply. A control-repository deploy key is valid
only for all-in-one, Compose, or Helm with an SSH Git URL. A fleet username/key
pair is valid only while Stagehand is enabled in all-in-one or Compose, or for
a standalone Stagehand install or upgrade. It is rejected for Helm, Stagehand
uninstall, and any request where Stagehand is disabled.

### Lifecycle secret recovery

On a Stagehand lifecycle upgrade, the installer reads the existing target
environment and discovers the database password, ingest token, and data-service
token. An explicitly supplied value is a recovery override; discovery fills
only the values left blank.

You must supply all three original values when automatic discovery cannot
read the target environment, finds an invalid database URL, or finds a
missing database password, ingest token, or data-service token. Store the
values shown at initial install in your own protected storage. The installer
waits for Stagehand's health check before reporting install or upgrade
success; a health-check timeout means the apply failed.

A forge key remains optional even for console-only attach — supplying one
doesn't change what the installer itself does, but it unlocks features
inside the running console. What it actually unlocks:

1. **Puppet Core package/agent installation** — authenticates package
   downloads against Puppet's package repositories; Bolt's signed
   macOS/Windows installer downloads; registry-hosted container image pulls.
   The one mandatory case — all-in-one, multi-VM, Compose, and Helm need it
   regardless.
2. **Forge-entitled module content at runtime** (Compose/Helm) — a mounted
   Forge-key secret resolves license-gated Puppetfile modules (e.g. the SCE
   compliance modules) for r10k. Public modules resolve fine without it.
3. **Puppetfile version cross-check + premium metadata** (the console app) —
   checks Forge-sourced, version-pinned Puppetfile entries against
   latest-published, and surfaces license-gated ("premium") module info
   (e.g. `puppetlabs-edgeops`, `puppetlabs-cem_linux`). Without a key, the
   console shows "not configured" rather than a false "up to date."
4. **AI/MCP platform appliance deployment** (the console app) — deploying
   the AI/MCP appliance needs a Forge key because its container images build
   from the authenticated Puppet Core repositories.

Items 3 and 4 are console-side features, not this installer's — worth
knowing so a credential-less console-attach install understands what it's
not getting, not just what's mandatory.

Behind the scenes, the installer turns either credential into HTTP basic
authentication against Puppet's package repositories, and treats a 401/403
response as "credential rejected," a 5xx as a Puppet-side outage, and
anything else as reachable-and-accepted. **If a key is being rejected, this
live check is what's actually failing — not whether a key is merely
present.**

## 3. Common failure points by mode

### Preflight (before any mode runs)

Before any mode runs, the installer checks whether Bolt is present on the
**controller** (the machine running puppet-installer, not the install
target) and can auto-install it if missing. On macOS, auto-install downloads
a signed installer using the same Forge-key/license credential. A download
that 404s (an unlisted macOS-version/architecture/Bolt-version combination)
prints a pointer to Puppet's own Bolt installation docs instead of failing
silently — if you hit this, follow that link to install Bolt manually:
[help.puppet.com/bolt/current/topics/bolt_installing.htm](https://help.puppet.com/bolt/current/topics/bolt_installing.htm).

### All-in-one / Multi-VM (Bolt-plan-driven)

Both generate a Bolt project into a temporary directory and run it over SSH
(or a local transport for all-in-one's "this box" option). Common failure
signatures:

- **"bolt plan run failed" with no further detail** — the real error is in
  Bolt's own streamed output. Look at the full apply log, not just the
  summary line.
- **Credential validation failing before Bolt even runs** — both modes
  validate your Forge key/license id up front and fail fast with a clear
  message if that check fails; this never reaches the target at all.
- **SSH/connectivity** — check the target's address, whether a private key
  path was supplied and resolves on the machine running the installer (not
  the target), and whether the target expects passwordless sudo.
- **Multi-VM specifically** requires exactly one primary target — a request
  with zero or two-plus primaries is rejected before anything runs.

### Compose

Builds (or, on newer builds, pulls) `puppetserver`/`puppetdb` images and
brings up a `docker compose`/`podman compose` stack.

- **"engine not found"** — neither `docker` nor `podman` is on the
  controller's `PATH`.
- **Local-build path** (no registry image configured): building locally
  fails if your Forge key can't authenticate to Puppet's package repository
  — same credential-rejection diagnosis as above, just surfacing inside a
  build log instead of a validation error.
- **Registry-pull path** (a newer capability, see **Distribution channels
  are still evolving** below): needs either an existing registry login on
  the machine running the installer, or registry credentials supplied to
  the installer so it can log in itself before pulling. A registry auth
  failure here is **separate** from the Puppet Core Forge-key credential —
  don't conflate the two when diagnosing.
- **`compose up` succeeds but console/agents can't reach puppetserver** —
  check your Docker network/firewall, and that the generated ports aren't
  colliding with something else on the host.

### Helm

Renders the embedded chart to a values overlay and runs a Helm
install/upgrade.

- **Preview refuses to render** if the puppetserver/puppetdb image
  references or control-repository URL aren't set — these are hard
  requirements, not defaults. Helm mode has **never** built images itself;
  it has always required you (or, on newer builds, CI) to have already
  published them somewhere reachable.
- **`ImagePullBackOff`** — almost always registry auth or a tag that was
  never actually pushed. Check the rendered image/tag fields against what's
  actually in the registry.
- **r10k / Forge-entitled content silently missing** — see **Secrets**
  below; this is a distinct credential from the image-pull secret.

### Console-only lifecycle

Two things unique to this mode:

- **PE attach vs. Core**: a license-id credential routes to a PE backend (an
  FQDN and RBAC token are required); a Forge-key credential means Core.
  Supplying both, or supplying a PE backend with a Forge-key credential, is
  rejected at validation — a common config mistake to check for first.
- **The generated-secrets gotcha** (see **Secrets** below) — upgrade
  requires you to supply back the exact database password, ingest token,
  and data-service token generated at install time, because there is no
  state store to recall them from.

### Puppet module vendoring (all modes that use it)

Curated Puppet modules (stagehand, patchbot, trivy, openscap, inspector,
node_encrypt, etc.) are bundled into the installer binary at build time. If
a build skipped that step, expect a warning in the install log like
"`node_encrypt is not vendored`" and features depending on that module
(e.g. `stagehand::secret`) simply won't be available on the target — not a
crash, a silent capability gap. If you see a Puppet class or function "not
found" that should be part of the standard bundled set, check whether the
specific installer build you're running actually had modules bundled before
it was compiled.

## Platform-lock diagnosis and controlled recovery

Use the installer Review screen's read-only status before any Puppet Core
upgrade. A mismatch, unknown observation, interrupted operation, or failed
relock is a stop condition — it is not permission to bypass the lock.
Capture the typed status and operation ID, but redact any unrelated
sensitive data before sharing it.

The full package and runtime lock contract this status is checked against is
documented once, in the [User's Guide](/docs/user-guide/) — see its "Puppet
package and runtime protection" section rather than repeating that table
here.

For an interrupted operation, retry with the same operation identity.
Recovery re-verifies any exact-prior package artifacts, rolls back only when
those artifacts are complete and authenticated, and always attempts to
restore and verify the current boundary's native locks. If relock cannot be
verified, the operation remains recoverable-blocked and later boundaries
stay untouched. Escalate with the typed status and preserved evidence rather
than attempting a manual bulk unlock.

## 4. Secrets — what the installer does with your secrets

The installer never asks for, and you should never need to enter anywhere
outside your own organization's protected storage, the Forge API key, PE
license id/RBAC token, SSH private keys, sudo passwords, or the `forge_key`
file/Compose-secret content.

**Plan previews and streamed installer output redact secrets automatically**,
in both raw and base64 form — this includes Forge keys, license ids, target
sudo passwords, uploaded control-repository and Stagehand fleet keys,
Compose and Helm registry passwords, lifecycle database/ingest/data-service
values, the patching API token, and a PE RBAC token. Registry usernames are
ordinary identifiers, not secrets. Redaction doesn't mean a log is safe to
share unreviewed — check it yourself before attaching it anywhere.

**Newly generated values are shown to you once, on purpose.** Lifecycle
install output can deliberately include newly generated database, ingest,
and data-service values so you can recover them later. Save those values
securely the moment you see them — the installer has no way to show them to
you again.

**Lifecycle recovery:** at install time Stagehand generates a database
password, ingest token, and data-service token and prints them once. On
upgrade, the installer automatically discovers them from the target's
Stagehand environment; only a discovery failure requires you to resupply
all three original values. This preserves your running credentials instead
of silently rotating them.

**The installer cleans up after itself.** Temporary local workspaces
containing apply-time secrets are removed when a run finishes. In Compose,
the fleet key is copied into Stagehand-only private storage and mounted
read-only for Stagehand; other services never receive it. Your persistent
target and operator-side secrets remain sensitive and still need your
organization's usual access controls.

**Two different credentials are easy to conflate — keep them separate when
troubleshooting:**

- The image-pull credential (registry auth) gets the container image itself
  onto the host/cluster.
- A **separate** mount of your Forge key — a Compose secret or a Kubernetes
  Secret, depending on mode — lets r10k inside the running puppetserver
  container pull Forge-entitled module content (e.g. SCE compliance
  modules) referenced by your control repo's Puppetfile. If your control
  repo references a Forge-entitled module and it's silently unresolved,
  this is the credential to check — separately from whether the container
  itself ever started.

## 5. Distribution channels are still evolving

The container images Compose/Helm pull from (puppetserver/puppetdb) are
currently published to an **operator-controlled registry** (not yet an
official Puppet-owned one) by a CI pipeline that builds and pins them.
Availability of a given Puppet version's images depends on that pipeline
having actually run for that version — it is not guaranteed for every
version the way apt/yum packages are.

This isn't a bug — it reflects real, in-progress work on how build
artifacts reach an installer build. If you hit a missing image for a
specific Puppet version, that's expected for now, not a sign something is
broken.

## Where to report a problem

Found something wrong with the installer or the console itself? File it at
[puppet-stagehand/stagehand-release](https://github.com/puppet-stagehand/stagehand-release/issues).
Found something wrong with this documentation site instead — a broken link,
a confusing page, a typo? See [Support](/support/) for this repository's own
tracker.
