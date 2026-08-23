import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';

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
  beforeAll(() => {
    const build = run('npm', ['run', 'build'], {
      cwd: repositoryRoot,
      env: { ASTRO_TELEMETRY_DISABLED: '1' },
    });
    expect(build.status, build.stderr).toBe(0);
    expect(existsSync(resolve(repositoryRoot, 'dist/assets'))).toBe(true);
  });

  const createAwsStub = (directory: string) => {
    const binDirectory = resolve(directory, 'bin');
    mkdirSync(binDirectory);
    writeFileSync(
      resolve(binDirectory, 'aws'),
      `#!/bin/sh
printf '%s\\n' "$*" >> "$AWS_CALL_LOG"
case "$AWS_FAIL_PHASE:$*" in
  immutable:s3\\ sync\\ dist/assets\\ *) exit 41 ;;
  mutable:s3\\ sync\\ dist\\ *) exit 42 ;;
esac
`,
    );
    chmodSync(resolve(binDirectory, 'aws'), 0o755);
    return binDirectory;
  };

  const deployWithStub = (failPhase = '') => {
    const directory = temporaryDirectory('stagehand-deploy-');
    const binDirectory = createAwsStub(directory);
    const log = resolve(directory, 'aws.log');
    const result = run('sh', [deployScript], {
      cwd: repositoryRoot,
      env: {
        AWS_CALL_LOG: log,
        AWS_FAIL_PHASE: failPhase,
        CONTENT_BUCKET: 'stagehand-content-test',
        DEPLOY_ENVIRONMENT: 'beta',
        DISTRIBUTION_ID: 'EDIST123',
        PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ''}`,
      },
    });
    return { log, result };
  };

  it('uploads real production-build assets before revalidated content and reaches AWS', () => {
    const { log, result } = deployWithStub();

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual([
      's3 sync dist/assets s3://stagehand-content-test/assets --cache-control public,max-age=31536000,immutable --delete',
      's3 sync dist s3://stagehand-content-test --exclude assets/* --cache-control public,max-age=0,must-revalidate --delete',
      'cloudfront create-invalidation --distribution-id EDIST123 --paths /index.html /tiers/index.html /compatibility/index.html /docs/index.html /docs/getting-started/index.html /docs/security/index.html /support/index.html /404.html /data/*',
    ]);
  });

  it('stops before mutable upload and invalidation when immutable upload fails', () => {
    const { log, result } = deployWithStub('immutable');

    expect(result.status).toBe(41);
    expect(readFileSync(log, 'utf8').trim().split('\n')).toHaveLength(1);
    expect(readFileSync(log, 'utf8')).toContain('s3 sync dist/assets');
  });

  it('stops before invalidation when mutable upload fails', () => {
    const { log, result } = deployWithStub('mutable');

    expect(result.status).toBe(42);
    expect(readFileSync(log, 'utf8').trim().split('\n')).toHaveLength(2);
    expect(readFileSync(log, 'utf8')).not.toContain('cloudfront create-invalidation');
  });

  it.each([
    ['DEPLOY_ENVIRONMENT', ''],
    ['DEPLOY_ENVIRONMENT', 'production'],
    ['CONTENT_BUCKET', ''],
    ['DISTRIBUTION_ID', ''],
  ])('rejects invalid required input %s=%j before invoking AWS', (name, value) => {
    const directory = temporaryDirectory('stagehand-deploy-invalid-');
    mkdirSync(resolve(directory, 'dist'), { recursive: true });
    const binDirectory = createAwsStub(directory);
    const log = resolve(directory, 'aws.log');
    const result = run('sh', [deployScript], {
      cwd: directory,
      env: {
        CONTENT_BUCKET: 'stagehand-content-test',
        DEPLOY_ENVIRONMENT: 'stable',
        DISTRIBUTION_ID: 'EDIST123',
        AWS_CALL_LOG: log,
        PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ''}`,
        [name]: value,
      },
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).not.toContain('AWS_SECRET');
    expect(existsSync(log)).toBe(false);
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

  type WorkflowStep = {
    name?: string;
    uses?: string;
    with?: Record<string, unknown>;
  };

  type WorkflowJob = {
    steps?: WorkflowStep[];
  };

  const workflowJobs = (name: string) =>
    (parse(workflow(name)) as { jobs: Record<string, WorkflowJob> }).jobs;

  const setupSiteStep = (name: string, job: string) => {
    const step = workflowJobs(name)[job]?.steps?.find(
      ({ uses }) => uses === './.github/actions/setup-site',
    );
    expect(step, `${name}.yml job ${job} must set up the site`).toBeDefined();
    return step!;
  };

  it('pins validation actions and grants only read access', () => {
    const source = workflow('validate');
    expect(source).toContain('contents: read');
    expect(source).toContain('actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1');
    expect(source).toContain('npm run verify');
    expect(source).toMatch(/tofu[^\n]* test/u);
    expect(source).toContain('scripts/check-tofu-tags.sh');
    expect(source).toContain('tofu_version_file: .opentofu-version');
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
    expect(source).toContain('WORKFLOW_REF: ${{ github.ref }}');
    expect(source).toContain('if [[ "$WORKFLOW_REF" != \'refs/heads/main\' ]]');
  });

  it('keeps plan and apply credentials distinct and excludes forks before environments', () => {
    const source = workflow('infrastructure');
    expect(source).toContain('role-to-assume: ${{ vars.AWS_INFRASTRUCTURE_PLAN_ROLE_ARN }}');
    expect(source).toContain('role-to-assume: ${{ vars.AWS_INFRASTRUCTURE_APPLY_ROLE_ARN }}');
    expect(source).not.toContain('AWS_INFRASTRUCTURE_ROLE_ARN');
    expect(source).toContain(
      "if: github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository",
    );
    expect(source).toContain("inputs.confirmation == 'apply'");
    expect(source).toContain('tofu plan -out=tfplan');
    expect(source).toContain('tofu apply tfplan');
    expect(source).not.toMatch(/upload-artifact@[\s\S]{0,500}path:\s*tfplan/u);
    expect(source).toContain('plan-summary.txt');
    expect(source).toContain("github.ref == 'refs/heads/main'");
    expect(source).toContain('if [[ "$WORKFLOW_REF" != \'refs/heads/main\' ]]');
  });

  it('pins every OpenTofu setup and passes one region to backend and provider', () => {
    const sources = [workflow('validate'), workflow('infrastructure')].join('\n');
    const setups = sources.match(/uses: opentofu\/setup-opentofu@/gu) ?? [];
    const versionFiles = sources.match(/tofu_version_file: \.opentofu-version/gu) ?? [];
    expect(versionFiles).toHaveLength(setups.length);
    expect(readFileSync(resolve(repositoryRoot, '.opentofu-version'), 'utf8')).toBe('1.12.6\n');
    const infrastructure = workflow('infrastructure');
    expect(
      infrastructure.match(/TF_VAR_aws_region: \$\{\{ vars\.AWS_REGION \|\| 'us-east-2' \}\}/gu),
    ).toHaveLength(2);
  });

  it('installs only the pinned Playwright Chromium browser and OS dependencies', () => {
    const source = readFileSync(
      resolve(repositoryRoot, '.github/actions/setup-site/action.yml'),
      'utf8',
    );
    expect(source).toMatch(/inputs:\s+[\s\S]*install-playwright:[\s\S]*default: ['"]true['"]/u);
    expect(source).toContain("if: inputs.install-playwright == 'true'");
    expect(source).toContain('npx playwright install --with-deps chromium');

    expect(setupSiteStep('validate', 'site').with?.['install-playwright']).toBeUndefined();
    expect(setupSiteStep('deploy', 'validate').with?.['install-playwright']).toBeUndefined();
    expect(setupSiteStep('deploy', 'deploy').with?.['install-playwright']).toBe('false');

    const optOuts = ['validate', 'deploy'].flatMap((name) =>
      Object.entries(workflowJobs(name)).flatMap(([job, { steps = [] }]) =>
        steps
          .filter(({ uses, with: inputs }) =>
            Boolean(
              uses === './.github/actions/setup-site' && inputs?.['install-playwright'] === 'false',
            ),
          )
          .map(() => `${name}/${job}`),
      ),
    );
    expect(optOuts).toEqual(['deploy/deploy']);
  });

  it('rejects an invalid apply confirmation before attaching the protected environment', () => {
    const source = workflow('infrastructure');
    const authorizationJob = source.match(/authorize_dispatch:[\s\S]*?\n  apply:/u)?.[0];

    expect(authorizationJob).toBeDefined();
    expect(authorizationJob).not.toMatch(/^\s{4}environment:/mu);
    expect(authorizationJob).toContain('APPLY_CONFIRMATION: ${{ inputs.confirmation }}');
    expect(authorizationJob).toContain(`if [[ "$APPLY_CONFIRMATION" != 'apply' ]]`);
    expect(source).toContain("inputs.confirmation == 'apply'");
  });
});
