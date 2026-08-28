---
title: Getting Started
description: Prepare a Puppet Core environment and understand the current Stagehand execution boundary.
order: 1
updated: 2026-08-22
---

## Before You Begin

Use the [compatibility register](/compatibility/) to confirm that an approved Stagehand release record matches your Puppet version, provider, operating system, tier, and transport. A missing record is not a compatibility claim.

For the documented Puppet Core path, prepare:

- A Puppet Core environment whose lifecycle you are authorized to manage
- A dedicated SSH account and credentials owned under your organization's access policy
- Independently verified SSH host keys for every target
- A tested recovery path before making changes to an environment

This public site does not install Stagehand, accept credentials, or grant access to customer products.

## Current Execution Path

SSH remains Puppet Core's execution path, via Puppet Bolt. Keep SSH credentials out of this repository, and follow the [Security and Trust Boundaries](/docs/security/) guide before connecting to a target.

Premium PCP/orchestrator behavior is unavailable until an approved Stagehand release compatibility record documents it. Do not treat planned integration language as evidence that the behavior ships today.

## Puppet Console Boundary

Puppet Console is where customer-facing Stagehand integration will live. Console will own authenticated product workflows and entitlement decisions; this version-controlled documentation remains public and static.

Before using a Console workflow, require both released product instructions and a matching entry in the compatibility register. Until those records exist, continue to treat the workflow as unavailable.

## Next Steps

1. Review [Security and Trust Boundaries](/docs/security/).
2. Confirm your exact environment in the [Compatibility Register](/compatibility/).
3. [Run Stagehand for the First Time](/docs/first-run/).
4. Use the [Support](/support/) page to choose public issue reporting or your commercial support channel.
