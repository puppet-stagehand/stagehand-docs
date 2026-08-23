# Review compatibility claims

This policy is for contributors and reviewers changing customer-facing Puppet, OpenVox, provider,
transport, operating-system, or Stagehand compatibility claims. After reading it, a contributor
can submit a claim whose scope, evidence, and verification date can be independently reviewed.

## Evidence required

Every compatibility record must link at least one primary source appropriate to the claim:

- primary vendor documentation that explicitly covers the claimed versions and behavior;
- reproducible test evidence showing the exact version, platform, provider, transport, and result;
  or
- a Stagehand release artifact whose notes and verification evidence cover the claim.

Do not use marketing copy, an unsourced community statement, or a search result as the sole
evidence. Narrow the claim when evidence covers only part of a version range or operating-system
set. Put known qualifications in `limitations`; do not hide them in prose elsewhere.

## Freshness rule

Set `last_verified` to the calendar date on which the cited evidence was actually reviewed or the
test was actually run. A record is fresh for 365 days. On day 366 it is stale and must be
re-verified, narrowed, marked with an appropriate non-supported status, or removed. Editing the
date without reviewing evidence is not verification.

## Pull-request checklist

1. Update the compatibility record and its stable, unique ID.
2. Match the Puppet and Stagehand version ranges, tier, provider, transport, operating systems,
   status, limitations, and documentation route to the evidence.
3. Use an HTTPS evidence URL to primary vendor documentation, test evidence, or a Stagehand
   release artifact.
4. Update `last_verified` to the evidence review or test date.
5. Run `npm run validate:data`, then `npm run verify`.
6. Explain the evidence and claim boundary in the pull request.
7. Obtain CODEOWNER approval for the data or schema change.

Data validation enforces shape, allowed enums, unique IDs and claim tuples, ordering, evidence URL
policy, future dates, and the 365-day freshness boundary. Passing validation confirms the record
is internally consistent; it does not replace a human review of whether the source supports the
claim.

Schema changes require the same evidence review plus an explanation of migration and customer
rendering impact. Never weaken validation only to make an unsupported record pass.
