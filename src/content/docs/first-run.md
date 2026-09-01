---
title: Running Stagehand for the First Time
description: Confirm connectivity, run a read-only first pass, and know what a successful first run looks like before you rely on the output.
order: 3
updated: 2026-08-26
---

## Before Your First Run

Complete [Getting Started](/docs/getting-started/), and read [Security and Trust Boundaries](/docs/security/) first. SSH host keys must already be verified through a trusted channel before any run; see the SSH host verification guidance in Security and Trust Boundaries.

A matching record must also exist in the [compatibility register](/compatibility/) for your exact Puppet version, provider, operating system, tier, and transport. A missing record is not a compatibility claim.

## What a First Run Does

A first run is read-only discovery. It confirms connectivity to your targets and surfaces environment state through Puppet Bolt's inventory and task-execution model, the same Bolt-native execution and environment visibility capabilities described on the home page. It does not apply configuration changes on its own.

Treat any behavior beyond read-only discovery as unexpected until you have confirmed it against your own approved workflow. Premium PCP/orchestrator behavior is unavailable until an approved Stagehand release compatibility record documents it; a first run is not evidence that orchestrator behavior ships today.

## Confirming a Successful First Run

A successful first run looks like this:

- Connectivity succeeds to every target host, with no host-key mismatch
- The returned environment summary matches your own inventory (same host count, same product designation)
- No error is logged for a target inside your declared scope

Distinguish a legitimate partial result from a genuine failure. A host outside your declared scope, or a host excluded by policy, producing no result is expected. An unexplained connectivity, host-key, or execution error for a target you expected to reach is not; treat it as a failure and follow the steps below.

## If Your First Run Fails

**Host-key or SSH errors.** Revisit host verification in [Security and Trust Boundaries](/docs/security/) before retrying. Do not disable strict host checking to bypass a mismatch. If you need to re-establish a target's `known_hosts` entry through a trusted channel, a standard SSH utility such as:

```
ssh-keyscan -H your-target-host >> ~/.ssh/known_hosts
```

can capture the key, but only use it once you have independently verified the fingerprint through a trusted channel, per Security and Trust Boundaries.

**Unsupported version, provider, OS, tier, or transport combination.** Recheck the [compatibility register](/compatibility/). An unlisted combination has no support claim behind it.

**Anything else.** If the problem is reproducible and non-sensitive, open a public issue. If it involves credentials, customer data, or a suspected vulnerability, use the private security advisory channel instead, never a public issue. See the [support page](/support/) for both channels.

## Next Steps

- [Security and Trust Boundaries](/docs/security/)
- [Compatibility Register](/compatibility/)
- [Support](/support/)
