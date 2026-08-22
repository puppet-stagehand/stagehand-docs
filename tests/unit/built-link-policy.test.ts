import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const checker = fileURLToPath(new URL('../../scripts/check-built-links.ts', import.meta.url));

const runChecker = (fixture: string) =>
  spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      checker,
      fileURLToPath(new URL(`../fixtures/links/${fixture}/`, import.meta.url)),
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

describe('built external-link policy', () => {
  it('rejects a protocol-relative link after normalizing its external URL', () => {
    const result = runChecker('protocol-relative-external');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('https://evil.example/path');
  });

  it('preserves internal and non-network links while exactly allowlisting an external URL', () => {
    const result = runChecker('allowed-mixed-links');

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Verified 1 exact external link targets');
  });
});
