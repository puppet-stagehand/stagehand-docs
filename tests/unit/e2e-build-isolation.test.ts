import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('accepts only an empty production build and a five-record E2E build', () => {
  const checker = fileURLToPath(
    new URL('../../scripts/check-e2e-build-isolation.ts', import.meta.url),
  );
  const production = fileURLToPath(
    new URL('../fixtures/build-output/production/', import.meta.url),
  );
  const e2e = fileURLToPath(new URL('../fixtures/build-output/e2e/', import.meta.url));
  const result = spawnSync(process.execPath, ['--import', 'tsx', checker, production, e2e], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('Verified isolated compatibility outputs: production=0, e2e=5');
});
