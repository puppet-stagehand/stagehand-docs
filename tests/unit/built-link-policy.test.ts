import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateBuiltLinks } from '../../scripts/check-built-links';

const runCombinedCheck = (fixture: string) => {
  const fixturePath = fileURLToPath(new URL(`../fixtures/links/${fixture}/`, import.meta.url));
  return spawnSync('npm', ['run', 'check:links', '--', fixturePath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      HTTP_PROXY: 'http://127.0.0.1:9',
      HTTPS_PROXY: 'http://127.0.0.1:9',
      NO_PROXY: '127.0.0.1,localhost',
    },
    timeout: 15_000,
  });
};

describe('built external-link policy', () => {
  it('accepts an exact non-GitHub evidence URL from the validated fixture build', async () => {
    const evidenceUrl = 'https://www.puppet.com/docs/puppet/8/release_notes_puppet';
    const build = spawnSync('npm', ['run', 'build'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', STAGEHAND_E2E_FIXTURES: '1' },
      timeout: 30_000,
    });

    expect(build.status, build.stderr).toBe(0);
    expect(readFileSync('.e2e-dist/compatibility/index.html', 'utf8')).toContain(evidenceUrl);

    const originalFixtureFlag = process.env.STAGEHAND_E2E_FIXTURES;
    process.env.STAGEHAND_E2E_FIXTURES = '1';
    try {
      const acceptedExternalLinks = await validateBuiltLinks('.e2e-dist');
      expect(acceptedExternalLinks).toContain(evidenceUrl);
    } finally {
      if (originalFixtureFlag === undefined) delete process.env.STAGEHAND_E2E_FIXTURES;
      else process.env.STAGEHAND_E2E_FIXTURES = originalFixtureFlag;
    }
  }, 50_000);

  it.each([
    ['encoded leading backslashes', 'encoded-backslash-external'],
    ['encoded root backslash', 'encoded-root-backslash-external'],
    ['encoded scheme control character', 'encoded-control-external'],
  ])('rejects %s before linkinator starts', (_description, fixture) => {
    const result = runCombinedCheck(fixture);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('https://evil.example/path');
    expect(result.stdout).not.toContain('→ crawling');
  });

  it('rejects an entity-encoded unapproved HTTP link before linkinator starts', () => {
    const result = runCombinedCheck('entity-encoded-external');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('https://evil.example/path');
    expect(result.stdout).not.toContain('→ crawling');
  });

  it('rejects an entity-encoded unsupported scheme before linkinator starts', () => {
    const result = runCombinedCheck('unsupported-scheme');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('javascript:alert(1)');
    expect(result.stdout).not.toContain('→ crawling');
  });

  it('rejects an invalid decoded URL before linkinator starts', () => {
    const result = runCombinedCheck('invalid-url');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('http://[invalid');
    expect(result.stdout).not.toContain('→ crawling');
  });

  it('skips an approved protocol-relative external URL without requesting the dead proxy', () => {
    const result = runCombinedCheck('allowed-mixed-links');

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Verified 1 exact external link targets');
    expect(result.stdout).toMatch(/Successfully scanned [1-9]\d* internal generated links/u);
    expect(result.stdout).not.toMatch(/\[\d+\].*github\.com/u);
  });

  // WR-01 (04.2-REVIEW.md): parse5 defaults to scriptingEnabled: true, which treats <noscript>
  // content as opaque raw text (mirroring a JS-enabled browser) rather than real child nodes —
  // so a link inside <noscript> (e.g. /downloads/'s manual GitHub fallback) was previously
  // invisible to this checker entirely. These two fixtures prove the fix actually scans in.
  it('rejects an unapproved external link that only appears inside a <noscript> fallback', () => {
    const result = runCombinedCheck('unapproved-noscript-link');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('https://evil.example/path');
    expect(result.stdout).not.toContain('→ crawling');
  });

  it('accepts an allowlisted external link that only appears inside a <noscript> fallback', () => {
    const result = runCombinedCheck('allowed-noscript-link');

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Verified 1 exact external link targets');
  });

  it('rejects a broken entity-encoded canonical URL from the local build before crawling', () => {
    const result = runCombinedCheck('broken-first-party');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Broken canonical first-party built links');
    expect(result.stderr).toContain('https://www.puppet-stagehand.com/missing/');
    expect(result.stdout).not.toContain('→ crawling');
  });

  it('rejects an encoded canonical path that escapes the build root before crawling', () => {
    const result = runCombinedCheck('canonical-path-escape');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Broken canonical first-party built links');
    expect(result.stderr).toContain('%2e%2e%2fallowed-mixed-links/index.html');
    expect(result.stdout).not.toContain('→ crawling');
  });
});
