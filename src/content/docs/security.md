---
title: Security and Trust Boundaries
description: Understand credential ownership, transport verification, entitlement boundaries, and safe reporting.
order: 2
---

## Credential Ownership

The organization operating the Puppet environment owns its SSH accounts, private keys, tokens, certificate material, rotation schedule, and revocation process. Use dedicated identities with the least privilege required by an approved workflow. Do not commit credentials to Stagehand source or documentation, paste them into an issue, or embed them in generated site output.

This public site is static. It does not collect, store, rotate, or validate customer credentials.

## SSH Host Verification

SSH remains Stagehand's execution path across every tier, via Puppet Bolt. Verify host keys through a trusted channel before the first connection, record the expected fingerprints in an organization-controlled location, and investigate unexpected key changes. Do not disable strict host verification to bypass a mismatch.

Limit the SSH account to the intended targets and actions, protect private keys according to your organization's credential policy, and revoke access when it is no longer required.

## Future PCP Trust Boundaries

Premium PCP/orchestrator behavior is unavailable until an approved Stagehand release compatibility record exists. Before any future PCP workflow is treated as available, its release documentation must identify the authenticated Console, orchestrator, broker, and target boundaries; certificate and identity ownership; authorized actions; and failure and revocation behavior.

Until that evidence is published, do not provision credentials or widen network trust based on an anticipated PCP integration.

## Forge and Entitlement Boundary

Customer access decisions and Forge payment enforcement belong to authenticated Puppet Console workflows, not this public documentation site. Public pages neither prove a customer's entitlement nor unlock premium content. Keep Forge tokens and account details within approved authenticated systems.

## Redaction and Reporting

Before sharing diagnostics, remove private keys, tokens, passwords, cookies, authorization headers, certificate private material, customer data, and unnecessary identifying infrastructure details. Preserve only the minimum technical context needed to reproduce the problem.

Report non-sensitive, documentation-specific defects through the [public issue tracker](https://github.com/puppet-stagehand/stagehand-docs/issues). Do not put a suspected vulnerability or sensitive diagnostic in a public issue. Use the repository's [private security advisory channel](https://github.com/puppet-stagehand/stagehand-docs/security/advisories/new) or your organization's approved private commercial support channel instead.
