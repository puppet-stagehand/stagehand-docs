import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function buildSyntheticDist(root: string, { includeHashedAsset = false } = {}): string {
  const distDir = join(root, 'dist');
  const outputs = ['index.html', 'tiers/index.html'];
  for (const output of outputs) {
    const target = join(distDir, output);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, 'fixture');
  }
  const dataTarget = join(distDir, 'data', 'tiers.json');
  mkdirSync(dirname(dataTarget), { recursive: true });
  writeFileSync(dataTarget, '{}');

  if (includeHashedAsset) {
    const assetTarget = join(distDir, 'assets', 'app-a1b2c3.css');
    mkdirSync(dirname(assetTarget), { recursive: true });
    writeFileSync(assetTarget, 'fixture');
  }

  return distDir;
}

function writeFixtureDeployScript(root: string, paths: string[]): string {
  const scriptPath = join(root, 'deploy-fixture.sh');
  const pathsBlock = paths.map((path) => `  '${path}' \\`).join('\n');
  writeFileSync(
    scriptPath,
    `#!/bin/sh
set -eu

aws cloudfront create-invalidation \\
  --distribution-id "$DISTRIBUTION_ID" \\
  --paths \\
${pathsBlock}
`,
  );
  return scriptPath;
}

function runChecker(distDir: string, scriptPath: string) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', resolve('scripts/check-invalidation-coverage.ts'), distDir, scriptPath],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
}

describe('invalidation coverage gate', () => {
  it('flags a built HTML route missing from the invalidation list', () => {
    const root = mkdtempSync(join(tmpdir(), 'stagehand-invalidation-'));
    temporaryRoots.push(root);

    const distDir = buildSyntheticDist(root);
    const scriptPath = writeFixtureDeployScript(root, ['/index.html', '/data/*']);

    const result = runChecker(distDir, scriptPath);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('/tiers/index.html');
  });

  it('passes when every built HTML route is covered by a literal entry or a glob prefix', () => {
    const root = mkdtempSync(join(tmpdir(), 'stagehand-invalidation-'));
    temporaryRoots.push(root);

    const distDir = buildSyntheticDist(root);
    const scriptPath = writeFixtureDeployScript(root, [
      '/index.html',
      '/tiers/index.html',
      '/data/*',
    ]);

    const result = runChecker(distDir, scriptPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/2 route/);
  });

  it('excludes hashed files under dist/assets/ from the coverage requirement', () => {
    const root = mkdtempSync(join(tmpdir(), 'stagehand-invalidation-'));
    temporaryRoots.push(root);

    const distDir = buildSyntheticDist(root, { includeHashedAsset: true });
    const scriptPath = writeFixtureDeployScript(root, [
      '/index.html',
      '/tiers/index.html',
      '/data/*',
    ]);

    const result = runChecker(distDir, scriptPath);

    expect(result.status).toBe(0);
  });
});
