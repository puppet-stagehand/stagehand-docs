# Contributing to Stagehand documentation

Contributors should be able to turn a clean checkout into a verified production build before
requesting review.

## Prepare the checkout

Use Node.js 24 and npm 11. Install exactly the locked dependencies and run the full gate:

```sh
npm ci
npm run verify
```

Use `npm run dev` for a live local preview. If an infrastructure file changes, also install
OpenTofu 1.12 and run:

```sh
tofu fmt -check -recursive infra
./scripts/check-tofu-tags.sh
```

Do not commit generated builds, local OpenTofu state, backend configuration, credentials, or
customer data.

## Keep changes reviewable

Use a focused branch and explain the customer-visible result in the pull request. Add or update
tests when behavior changes. Run `npm run verify` after the final edit, not only before it.

Compatibility claims are customer-facing product statements. Follow the
[compatibility claim review](docs/operations/compatibility-claims.md), including evidence,
freshness, and CODEOWNER approval. Infrastructure and workflow changes also require the owners
listed in `CODEOWNERS`.

## Report security problems privately

Do not include vulnerabilities, credentials, account identifiers, or customer information in an
issue or pull request. Follow [SECURITY.md](SECURITY.md) for private disclosure.
