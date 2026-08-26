---
title: Getting started
description: Prepare an OpenVox environment and understand the current Stagehand execution boundary.
order: 1
updated: 2026-08-22
---

## Before you begin

Use the [compatibility register](/compatibility/) to confirm that an approved Stagehand release record matches your Puppet version, provider, operating system, tier, and transport. A missing record is not a compatibility claim.

For the documented OpenVox path, prepare:

- an OpenVox environment whose lifecycle you are authorized to manage;
- a dedicated SSH account and credentials owned under your organization's access policy;
- independently verified SSH host keys for every target; and
- a tested recovery path before making changes to an environment.

This public site does not install Stagehand, accept credentials, or grant access to customer products.

## Current execution path

SSH remains the OpenVox execution path. Keep SSH credentials out of this repository and follow the [security guide](/docs/security/) before connecting to a target.

Premium PCP/orchestrator behavior is unavailable until an approved Stagehand release compatibility record documents it. Do not treat planned integration language as evidence that the behavior ships today.

## Puppet Console boundary

Puppet Console is where customer-facing Stagehand integration will live. Console will own authenticated product workflows and entitlement decisions; this version-controlled documentation remains public and static.

Before using a Console workflow, require both released product instructions and a matching entry in the compatibility register. Until those records exist, continue to treat the workflow as unavailable.

## Next steps

1. Review the [security and trust boundaries](/docs/security/).
2. Confirm your exact environment in the [compatibility register](/compatibility/).
3. [Run Stagehand for the first time](/docs/first-run/).
4. Use the [support page](/support/) to choose public issue reporting or your commercial support channel.
