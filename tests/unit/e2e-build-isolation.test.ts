import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const checker = fileURLToPath(
  new URL('../../scripts/check-e2e-build-isolation.ts', import.meta.url),
);
const e2e = fileURLToPath(new URL('../fixtures/build-output/e2e/', import.meta.url));
const scale = fileURLToPath(new URL('../fixtures/build-output/scale/', import.meta.url));

const runChecker = (
  productionDir: string,
  e2eDir: string,
  scaleDir: string,
): ReturnType<typeof spawnSync> =>
  spawnSync(process.execPath, ['--import', 'tsx', checker, productionDir, e2eDir, scaleDir], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

it('accepts an empty production build with a five-record E2E build and a 24-record scale build', () => {
  const production = fileURLToPath(
    new URL('../fixtures/build-output/production/', import.meta.url),
  );
  const result = runChecker(production, e2e, scale);

  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('production=0 (0 fixture-derived)');
  expect(result.stdout).toContain('e2e=5');
  expect(result.stdout).toContain('scale=24');
});

it('rejects a production build containing a fixture-derived record', () => {
  const productionLeaked = fileURLToPath(
    new URL('../fixtures/build-output/production-leaked/', import.meta.url),
  );
  const result = runChecker(productionLeaked, e2e, scale);

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('fixture-derived record');
});
