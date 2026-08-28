import { spawnSync } from 'node:child_process';
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
  it('repository-wide ignores cover every documented saved plan path', () => {
    const paths = [
      'infra/bootstrap/bootstrap.tfplan',
      'infra/environments/testpilots/tfplan',
      'infra/environments/testpilots/plan-summary.txt',
    ];

    for (const path of paths) {
      const result = spawnSync('git', ['check-ignore', '--no-index', '-q', path], {
        cwd: repositoryRoot,
      });
      expect(result.status, `${path} must be ignored`).toBe(0);
    }
  });

  it('treats saved plans as sensitive and gives exact cleanup commands', () => {
    const guide = read('docs/operations/aws-bootstrap.md');

    expect(guide).toContain('Saved plan files are sensitive');
    expect(guide).toContain('rm -f infra/bootstrap/bootstrap.tfplan');
    expect(guide).toContain('rm -f infra/environments/testpilots/tfplan');
  });

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
    for (const environment of ['testpilots-plan', 'beta-plan', 'stable-plan']) {
      expect(guide).toContain(`\`${environment}\``);
      expect(guide).toContain(`repo:puppet-stagehand/stagehand-docs:environment:${environment}`);
    }
    for (const environment of ['testpilots', 'beta', 'stable']) {
      expect(guide).toContain(`repo:puppet-stagehand/stagehand-docs:environment:${environment}`);
    }
    expect(guide).toContain('refs/pull/*/merge');
    expect(guide).toContain('pull_request_target');
    for (const environment of ['testpilots-plan', 'beta-plan', 'stable-plan']) {
      const row = guide
        .split('\n')
        .find((line) => line.split('|').some((cell) => cell.trim() === `\`${environment}\``));
      expect(row?.split('|').map((cell) => cell.trim())).toEqual([
        '',
        `\`${environment}\``,
        'At least one trusted reviewer',
        'Required',
        '`refs/pull/*/merge` only',
        '',
      ]);
    }
    expect(guide).toMatch(/Before approving a plan job,[\s\S]*workflow and infrastructure\s+diff/u);

    const planVariables = guide.match(
      /Define only these variables in each matching plan Environment:([\s\S]*?)Define only these variables in each matching deployment\/apply Environment:/u,
    )?.[1];
    const deploymentVariables = guide.match(
      /Define only these variables in each matching deployment\/apply Environment:([\s\S]*?)The deployment workflow/u,
    )?.[1];
    expect(planVariables).toBeDefined();
    expect(deploymentVariables).toBeDefined();
    expect(planVariables).toContain('AWS_INFRASTRUCTURE_PLAN_ROLE_ARN');
    expect(planVariables).not.toMatch(/AWS_DEPLOY_ROLE_ARN|AWS_INFRASTRUCTURE_APPLY_ROLE_ARN/u);
    expect(deploymentVariables).toContain('AWS_INFRASTRUCTURE_APPLY_ROLE_ARN');
    expect(deploymentVariables).toContain('AWS_DEPLOY_ROLE_ARN');
    expect(deploymentVariables).not.toContain('AWS_INFRASTRUCTURE_PLAN_ROLE_ARN');
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
    expect(guide).toContain('tofu -chdir=infra/bootstrap output -raw github_oidc_provider_arn');
    expect(guide).toContain('tofu -chdir=infra/bootstrap output -json state_bucket_names');
    for (const environment of ['testpilots', 'beta', 'stable']) {
      expect(guide).toContain(`jq -r '.${environment}'`);
    }
    expect(guide).toContain('output -raw content_bucket_name');
    expect(guide).toContain('output -raw distribution_id');
    expect(guide).toContain('output -raw deployment_role_arn');
    expect(guide).toContain('without display quotes');
    expect(guide).toContain('--region "$AWS_REGION"');
    expect(guide).toContain('--region us-east-1');
    expect(guide).toContain('global or unsupported resource types');
    expect(guide).toContain('local bootstrap state');
    expect(guide).toMatch(/one active\s+writer/u);
    expect(guide).toMatch(
      /organization-approved[\s\S]*encrypted[\s\S]*access-controlled[\s\S]*versioned/u,
    );
    expect(guide).toContain('restore test');
    expect(guide).toContain('tofu import');

    const unfilteredAudit =
      'aws resourcegroupstaggingapi get-resources --region "$AWS_REGION" --tag-filters Key=project,Values=stagehand';
    const filteredAudit = `${unfilteredAudit} Key=environment,Values=testpilots`;
    expect(guide.indexOf(unfilteredAudit)).toBeLessThan(guide.indexOf(filteredAudit));
  });

  it('defines promotion, rollback, compatibility evidence, and freshness', () => {
    const release = read('docs/operations/release.md');
    expect(release).toContain('testpilots → beta → stable');
    expect(release).toContain('40-character');
    expect(release).toContain('last known-good SHA');
    expect(release).toContain('Never edit S3 objects manually');
    expect(release).toContain('independently rebuilds the same locked commit');
    expect(release).not.toContain('Do not rebuild');
    expect(release).toMatch(/testpilots[\s\S]*revert or fix[\s\S]*new SHA[\s\S]*automatic/iu);

    const claims = read('docs/operations/compatibility-claims.md');
    expect(claims).toContain('365 days');
    expect(claims).toContain('CODEOWNER');
    expect(claims).toContain('npm run validate:data');
    expect(claims).toMatch(/day 366[\s\S]*re-verified[\s\S]*removed/u);
    expect(claims).toMatch(/Changing status, scope, or version range does not refresh evidence/u);
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
    expect(read('CONTRIBUTING.md')).toMatch(
      /Replace `@matthewrstone` only after[\s\S]*organization team[\s\S]*repository access/u,
    );
  });

  it('requires private vulnerability reporting with a non-public fallback', () => {
    const security = read('SECURITY.md');
    const environments = read('docs/operations/github-environments.md');
    expect(environments).toContain('Enable private vulnerability reporting');
    expect(security).toContain('security@puppet-stagehand.com');
    expect(security).toMatch(/fallback only/u);
    expect(environments).toMatch(
      /security@puppet-stagehand\.com[\s\S]*provision[\s\S]*monitor[\s\S]*test delivery[\s\S]*before publication/iu,
    );
    expect(security).not.toMatch(/(?:is|currently) monitored/iu);
    expect(security).toContain('Do not open a public issue');
    expect(security).toMatch(/Do not open a public\s+issue or discussion/u);
  });
});
