import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const deployScript = resolve(repositoryRoot, 'scripts/deploy-site.sh');
const promotionScript = resolve(repositoryRoot, 'scripts/assert-promotable-commit.sh');
const temporaryDirectories: string[] = [];

const temporaryDirectory = (prefix: string) => {
  const directory = mkdtempSync(resolve(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
};

const run = (command: string, args: string[], options: { cwd: string; env?: NodeJS.ProcessEnv }) =>
  spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
  });

const initializeRepository = () => {
  const directory = temporaryDirectory('stagehand-promotion-');
  run('git', ['init', '--initial-branch=main'], { cwd: directory });
  run('git', ['config', 'user.email', 'test@example.invalid'], { cwd: directory });
  run('git', ['config', 'user.name', 'Stagehand test'], { cwd: directory });
  writeFileSync(resolve(directory, 'site.txt'), 'main\n');
  run('git', ['add', 'site.txt'], { cwd: directory });
  run('git', ['commit', '-m', 'main'], { cwd: directory });
  run('git', ['remote', 'add', 'origin', directory], { cwd: directory });
  run('git', ['fetch', 'origin', 'main:refs/remotes/origin/main'], { cwd: directory });
  return directory;
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('deploy-site.sh', () => {
  it('uploads immutable assets before revalidated content and invalidates only mutable paths', () => {
    const directory = temporaryDirectory('stagehand-deploy-');
    const binDirectory = resolve(directory, 'bin');
    mkdirSync(resolve(directory, 'dist/assets'), { recursive: true });
    mkdirSync(resolve(directory, 'dist/data'), { recursive: true });
    mkdirSync(binDirectory);
    writeFileSync(resolve(directory, 'dist/assets/site.js'), 'asset');
    writeFileSync(resolve(directory, 'dist/index.html'), 'html');
    writeFileSync(resolve(directory, 'dist/data/compatibility.json'), '{}');
    writeFileSync(
      resolve(binDirectory, 'aws'),
      '#!/bin/sh\nprintf \'%s\\n\' "$*" >> "$AWS_CALL_LOG"\n',
    );
    chmodSync(resolve(binDirectory, 'aws'), 0o755);

    const log = resolve(directory, 'aws.log');
    const result = run('sh', [deployScript], {
      cwd: directory,
      env: {
        AWS_CALL_LOG: log,
        CONTENT_BUCKET: 'stagehand-content-test',
        DEPLOY_ENVIRONMENT: 'beta',
        DISTRIBUTION_ID: 'EDIST123',
        PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual([
      's3 sync dist/assets s3://stagehand-content-test/assets --cache-control public,max-age=31536000,immutable --delete',
      's3 sync dist s3://stagehand-content-test --exclude assets/* --cache-control public,max-age=0,must-revalidate --delete',
      'cloudfront create-invalidation --distribution-id EDIST123 --paths /index.html /tiers/index.html /compatibility/index.html /docs/index.html /docs/getting-started/index.html /docs/security/index.html /support/index.html /404.html /data/*',
    ]);
  });

  it.each([
    ['DEPLOY_ENVIRONMENT', ''],
    ['DEPLOY_ENVIRONMENT', 'production'],
    ['CONTENT_BUCKET', ''],
    ['DISTRIBUTION_ID', ''],
  ])('rejects invalid required input %s=%j before invoking AWS', (name, value) => {
    const directory = temporaryDirectory('stagehand-deploy-invalid-');
    mkdirSync(resolve(directory, 'dist'), { recursive: true });
    const result = run('sh', [deployScript], {
      cwd: directory,
      env: {
        CONTENT_BUCKET: 'stagehand-content-test',
        DEPLOY_ENVIRONMENT: 'stable',
        DISTRIBUTION_ID: 'EDIST123',
        [name]: value,
      },
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).not.toContain('AWS_SECRET');
  });
});

describe('assert-promotable-commit.sh', () => {
  it('accepts a clean full commit reachable from origin/main', () => {
    const directory = initializeRepository();
    const sha = run('git', ['rev-parse', 'HEAD'], { cwd: directory }).stdout.trim();

    const result = run('sh', [promotionScript, 'beta', sha], { cwd: directory });

    expect(result.status, result.stderr).toBe(0);
  });

  it('rejects a commit that is not reachable from origin/main', () => {
    const directory = initializeRepository();
    run('git', ['switch', '-c', 'untrusted'], { cwd: directory });
    writeFileSync(resolve(directory, 'site.txt'), 'untrusted\n');
    run('git', ['commit', '-am', 'untrusted'], { cwd: directory });
    const sha = run('git', ['rev-parse', 'HEAD'], { cwd: directory }).stdout.trim();

    const result = run('sh', [promotionScript, 'beta', sha], { cwd: directory });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('origin/main');
  });

  it('rejects an uncommitted working tree', () => {
    const directory = initializeRepository();
    writeFileSync(resolve(directory, 'site.txt'), 'dirty\n');
    const sha = run('git', ['rev-parse', 'HEAD'], { cwd: directory }).stdout.trim();

    const result = run('sh', [promotionScript, 'stable', sha], { cwd: directory });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('working tree');
  });

  it('rejects an environment outside the three-value enum', () => {
    const directory = initializeRepository();
    const sha = run('git', ['rev-parse', 'HEAD'], { cwd: directory }).stdout.trim();

    const result = run('sh', [promotionScript, 'production', sha], { cwd: directory });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('testpilots, beta, or stable');
  });
});

describe('GitHub Actions contracts', () => {
  const workflow = (name: string) =>
    readFileSync(resolve(repositoryRoot, `.github/workflows/${name}.yml`), 'utf8');

  it('pins validation actions and grants only read access', () => {
    const source = workflow('validate');
    expect(source).toContain('contents: read');
    expect(source).toContain('actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1');
    expect(source).toContain('npm run verify');
    expect(source).toMatch(/tofu[^\n]* test/u);
    expect(source).toContain('scripts/check-tofu-tags.sh');
  });

  it('promotes an explicit full SHA with OIDC, environment vars, and non-cancelling concurrency', () => {
    const source = workflow('deploy');
    expect(source).toMatch(/environment:[\s\S]*type: choice[\s\S]*- beta[\s\S]*- stable/u);
    expect(source).toMatch(/git_sha:[\s\S]*required: true/u);
    expect(source).toContain("stagehand-docs-${{ inputs.environment || 'testpilots' }}");
    expect(source).toContain('cancel-in-progress: false');
    expect(source).toContain('id-token: write');
    expect(source).toContain('role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}');
    expect(source).toContain('fetch-depth: 0');
    expect(source).toContain('AWS_DEPLOY_ROLE_ARN: ${{ vars.AWS_DEPLOY_ROLE_ARN }}');
    expect(source).toContain('CONTENT_BUCKET: ${{ vars.CONTENT_BUCKET }}');
    expect(source).toContain('CLOUDFRONT_DISTRIBUTION_ID: ${{ vars.CLOUDFRONT_DISTRIBUTION_ID }}');
    expect(source).toContain("outputs.configured == 'true'");
  });

  it('keeps infrastructure plans non-secret and requires exact apply confirmation', () => {
    const source = workflow('infrastructure');
    expect(source).toContain('role-to-assume: ${{ vars.AWS_INFRASTRUCTURE_ROLE_ARN }}');
    expect(source).toContain("inputs.confirmation == 'apply'");
    expect(source).toContain('tofu plan -out=tfplan');
    expect(source).toContain('tofu apply tfplan');
    expect(source).not.toMatch(/upload-artifact@[\s\S]{0,500}path:\s*tfplan/u);
    expect(source).toContain('plan-summary.txt');
  });
});
