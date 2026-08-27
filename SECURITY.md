# Security policy

## Report a vulnerability

Use a private GitHub Security Advisory for this repository: open the repository's **Security**
tab, choose **Advisories**, and select **Report a vulnerability**. Include affected behavior,
reproduction steps, impact, and a safe way to contact you. Do not open a public issue for an
unpatched vulnerability.

If **Report a vulnerability** is unavailable, do not publish the details. Use
`security@puppet-stagehand.com` as a fallback only. Delivery to this address was verified with a
real send-and-receive test on 2026-08-27 (see the Security advisory delivery test log in
[docs/operations/RELEASE-EVIDENCE.md](docs/operations/RELEASE-EVIDENCE.md)). Do not open a public
issue or discussion as a fallback.

Maintainers will acknowledge the report, investigate it privately, and coordinate remediation
and disclosure with the reporter. Response time depends on severity and reproducibility.

## Keep sensitive data out of the repository

No customer data or credentials belong in this repository. This includes AWS access keys,
session tokens, private keys, account-specific values, production exports, and screenshots or
logs containing customer information. If sensitive data is committed, notify maintainers through
the private advisory immediately; deleting it in a later commit is not sufficient remediation.
