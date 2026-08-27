# Release evidence log

This is the append-only log a release operator records every promotion, rollback, and
security-advisory delivery test into. Each row is evidence that a real check happened against a
real deployment — never a placeholder, and never fabricated ahead of the event it describes.

A prior row is never edited or deleted. If a check needs to be redone — a retry after a transient
failure, a re-verification after a fix — that redo gets its own newly appended row; it never merges
into or overwrites the row it supersedes. Rows are ordered by when they were appended, oldest
first, and are never resorted or deduplicated by date, environment, or any other field. This log
has exactly one operator editing it at a time, in series, per the promotion and rollback
procedures in [release.md](release.md); no concurrent-write guarantee is claimed or required.

## Promotions

Recorded per [release.md](release.md)'s promotion procedure: for each environment, confirm home,
tiers, compatibility, docs, and support routes render the reviewed build; confirm both JSON data
endpoints (`tiers.json`, `compat.json`) reflect it; confirm a nonexistent route uses the branded
404; and, for `stable` only, confirm the apex host redirects to `www.puppetstagehand.com` without
altering path or query.

| Date (UTC) | Environment | SHA | Home | Tiers | Compat | Docs | Support | tiers.json | compat.json | 404 | Apex redirect (stable only) | Notes |
| ---------- | ----------- | --- | ---- | ----- | ------ | ---- | ------- | ---------- | ------------ | --- | ---------------------------- | ----- |

## Rollbacks

Recorded per [release.md](release.md)'s rollback procedure: the incident that triggered the
rollback, the known-good SHA selected, the dispatch run that restored it, and confirmation that the
prior pages were actually restored.

| Date (UTC) | Environment | Incident | Known-good SHA | Dispatch run | Restored? | Notes |
| ---------- | ----------- | -------- | --------------- | ------------- | --------- | ----- |

## Security advisory delivery test

Recorded per [github-environments.md](github-environments.md)'s "Enable private security reports"
procedure: a real test message sent to the `security@puppetstagehand.com` fallback mailbox and
confirmation of its receipt, before the production host serves customers (LAUN-04).

| Date (UTC) | Channel | Test performed | Result | Recorded by |
| ---------- | ------- | --------------- | ------ | ----------- |
|            | security@puppetstagehand.com | | | |
