import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const environments = {
  testpilots: 'testpilots.puppet-stagehand.com',
  beta: 'beta.puppet-stagehand.com',
  stable: 'www.puppet-stagehand.com',
} as const;

const readRoot = (environment: keyof typeof environments) =>
  readFileSync(
    resolve(import.meta.dirname, `../../infra/environments/${environment}/main.tf`),
    'utf8',
  );

const tagChecker = resolve(import.meta.dirname, '../../scripts/check-tofu-tags.sh');
const temporaryDirectories: string[] = [];

const createTagFixture = () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'stagehand-tofu-tags-'));
  temporaryDirectories.push(directory);

  mkdirSync(resolve(directory, 'infra/modules/static-site'), { recursive: true });
  writeFileSync(
    resolve(directory, 'infra/modules/static-site/main.tf'),
    'resource "aws_s3_bucket" "content" {\n  tags = local.required_tags\n}\n',
  );

  mkdirSync(resolve(directory, 'infra/bootstrap'), { recursive: true });
  writeFileSync(
    resolve(directory, 'infra/bootstrap/main.tf'),
    'resource "aws_iam_openid_connect_provider" "github" {\n  tags = local.required_tags\n}\n',
  );
  writeFileSync(
    resolve(directory, 'infra/bootstrap/providers.tf'),
    'provider "aws" {\n  default_tags {\n    tags = {\n      project = "stagehand"\n    }\n  }\n}\n',
  );

  for (const environment of Object.keys(environments)) {
    const rootDirectory = resolve(directory, `infra/environments/${environment}`);
    mkdirSync(rootDirectory, { recursive: true });
    writeFileSync(
      resolve(rootDirectory, 'main.tf'),
      `provider "aws" {\n  default_tags {\n    tags = {\n      project = "stagehand"\n      environment = "${environment}"\n    }\n  }\n}\nprovider "aws" {\n  alias = "us_east_1"\n  default_tags {\n    tags = {\n      project = "stagehand"\n      environment = "${environment}"\n    }\n  }\n}\nmodule "site" {\n  environment = "${environment}"\n}\n`,
    );
  }

  return directory;
};

const runTagChecker = (cwd: string) =>
  spawnSync(tagChecker, { cwd, encoding: 'utf8', timeout: 10_000 });

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('OpenTofu environment roots', () => {
  it.each(Object.entries(environments))(
    'maps %s to its literal hostname and environment',
    (environment, domainName) => {
      const root = readRoot(environment as keyof typeof environments);

      expect(root).toMatch(new RegExp(`environment\\s+=\\s+"${environment}"`, 'u'));
      expect(root).toMatch(
        new RegExp(`domain_name\\s+=\\s+"${domainName.replaceAll('.', '\\.')}"`, 'u'),
      );
    },
  );

  it('enables the apex alias only in stable while retaining clean-path redirects everywhere', () => {
    const stable = readRoot('stable');

    expect(stable).toMatch(/alternate_domain_names\s+=\s+\["puppet-stagehand\.com"\]/u);

    for (const environment of Object.keys(environments) as (keyof typeof environments)[]) {
      const root = readRoot(environment);
      expect(root).toMatch(/enable_redirect_function\s+=\s+true/u);

      if (environment !== 'stable') {
        expect(root).toMatch(/alternate_domain_names\s+=\s+\[\]/u);
        expect(root).not.toContain('"puppet-stagehand.com"');
      }
    }
  });
});

describe('OpenTofu tag-policy checker', () => {
  it('accepts the three tagged environment providers and authoritative module tags', () => {
    const result = runTagChecker(createTagFixture());

    expect(result.status, result.stderr).toBe(0);
  });

  it('reports an environment provider that omits a required default tag', () => {
    const directory = createTagFixture();
    const root = resolve(directory, 'infra/environments/beta/main.tf');
    writeFileSync(
      root,
      readFileSync(root, 'utf8').replace('project = "stagehand"', 'project = "wrong"'),
    );

    const result = runTagChecker(directory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('infra/environments/beta/main.tf');
  });

  it('reports a fourth environment directory', () => {
    const directory = createTagFixture();
    mkdirSync(resolve(directory, 'infra/environments/development'));

    const result = runTagChecker(directory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('infra/environments');
  });

  it('reports a module tag map that bypasses the authoritative local', () => {
    const directory = createTagFixture();
    const moduleFile = resolve(directory, 'infra/modules/static-site/main.tf');
    writeFileSync(
      moduleFile,
      'resource "aws_s3_bucket" "content" {\n  tags = { project = "other" }\n}\n',
    );

    const result = runTagChecker(directory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('infra/modules/static-site/main.tf');
  });
});
