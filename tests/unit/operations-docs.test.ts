import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');
const documentationPaths = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs/operations/aws-bootstrap.md',
  'docs/operations/github-environments.md',
  'docs/operations/release.md',
  'docs/operations/compatibility-claims.md',
  'docs/operations/cost-model.md',
];

describe('operations documentation contract', () => {
  it('gives contributors a complete local verification path', () => {
    const readme = read('README.md');
    expect(readme).toContain('Node.js 24');
    expect(readme).toContain('npm 11');
    expect(readme).toContain('OpenTofu 1.12');
    expect(readme).toContain('npm ci');
    expect(readme).toContain('npm run verify');
    expect(readme).toContain('npm run dev');
  });

  it('documents every protected Environment variable and separates plan from apply', () => {
    const guide = read('docs/operations/github-environments.md');
    for (const variable of [
      'AWS_REGION',
      'AWS_DEPLOY_ROLE_ARN',
      'AWS_INFRASTRUCTURE_PLAN_ROLE_ARN',
      'AWS_INFRASTRUCTURE_APPLY_ROLE_ARN',
      'OIDC_PROVIDER_ARN',
      'HOSTED_ZONE_ID',
      'TOFU_STATE_BUCKET',
      'CONTENT_BUCKET',
      'CLOUDFRONT_DISTRIBUTION_ID',
    ]) {
      expect(guide).toContain(`\`${variable}\``);
    }
    expect(guide).not.toContain('AWS_INFRASTRUCTURE_ROLE_ARN');
    expect(guide).toContain('main');
    expect(guide).toContain('Prevent self-review');
    expect(guide).toContain('access-key secrets');
  });

  it('documents exact tag audits and the no-apply boundary', () => {
    const guide = read('docs/operations/aws-bootstrap.md');
    for (const environment of ['testpilots', 'beta', 'stable']) {
      expect(guide).toContain(
        `--tag-filters Key=project,Values=stagehand Key=environment,Values=${environment}`,
      );
    }
    expect(guide).toContain('does not run `tofu apply`');
    expect(guide).toMatch(/does not perform a\s+DNS cutover/u);
  });

  it('defines promotion, rollback, compatibility evidence, and freshness', () => {
    const release = read('docs/operations/release.md');
    expect(release).toContain('testpilots → beta → stable');
    expect(release).toContain('40-character');
    expect(release).toContain('last known-good SHA');
    expect(release).toContain('Never edit S3 objects manually');

    const claims = read('docs/operations/compatibility-claims.md');
    expect(claims).toContain('365 days');
    expect(claims).toContain('CODEOWNER');
    expect(claims).toContain('npm run validate:data');
  });

  it('links every official pricing source and uses a formula instead of a promise', () => {
    const costModel = read('docs/operations/cost-model.md');
    for (const url of [
      'https://aws.amazon.com/cloudfront/pricing/',
      'https://aws.amazon.com/s3/pricing/',
      'https://aws.amazon.com/route53/pricing/',
      'https://aws.amazon.com/certificate-manager/pricing/',
    ]) {
      expect(costModel).toContain(url);
    }
    expect(costModel).toContain('Monthly estimate =');
    expect(costModel).toContain('before publishing');
    expect(costModel).not.toMatch(/\$\d+(?:\.\d+)?\s*(?:per|\/)[ -]?month/iu);
  });

  it('contains no unfinished markers, dummy domains, credentials, or stale role name', () => {
    const documentation = documentationPaths.map(read).join('\n');
    const forbidden = new RegExp(
      ['TO' + 'DO', 'T' + 'BD', 'FIX' + 'ME', 'YOUR' + '_', 'example' + '\\.com', 'AK' + 'IA'].join(
        '|',
      ),
      'u',
    );
    expect(documentation).not.toMatch(forbidden);
    expect(documentation).not.toContain('AWS_INFRASTRUCTURE_ROLE_ARN');
  });

  it('assigns sensitive paths to the exact repository owner', () => {
    expect(read('CODEOWNERS')).toBe(
      [
        '/infra/ @matthewrstone',
        '/.github/workflows/ @matthewrstone',
        '/src/data/compatibility.yaml @matthewrstone',
        '/src/data/schema/ @matthewrstone',
        '',
      ].join('\n'),
    );
  });
});
