# Stagehand documentation site

This repository publishes the customer-facing Puppet Stagehand website and its compatibility
data. It also contains the OpenTofu configuration and GitHub Actions workflows used to operate
the static site in AWS.

## Verify a local checkout

Install these supported tool versions:

- Node.js 24
- npm 11
- OpenTofu 1.12 (needed only for infrastructure checks)

Clone `puppet-stagehand/stagehand-docs`, then run:

```sh
git clone https://github.com/puppet-stagehand/stagehand-docs.git
cd stagehand-docs
npm ci
npm run verify
```

`npm run verify` formats and lints the source, validates compatibility data, type-checks and
builds the Astro site, checks generated routes and links, and runs unit, browser, and
accessibility tests. A passing command is the local definition of a verified change.

To preview while editing:

```sh
npm run dev
```

Astro prints the local preview address. Production content remains empty until reviewed data is
added; browser fixtures are isolated from the production build.

## Make a change

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Compatibility changes have
an additional [evidence review process](docs/operations/compatibility-claims.md). Report security
problems using the private process in [SECURITY.md](SECURITY.md), never in a public issue.

## Operate the site

- [Bootstrap AWS and apply an environment](docs/operations/aws-bootstrap.md)
- [Configure protected GitHub Environments](docs/operations/github-environments.md)
- [Promote and roll back releases](docs/operations/release.md)
- [Review the AWS cost model](docs/operations/cost-model.md)

The repository is an infrastructure and deployment scaffold. Creating or verifying a checkout
does not apply AWS changes, upload content, or change DNS.
