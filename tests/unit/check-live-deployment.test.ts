import { describe, expect, it, vi } from 'vitest';
import { verifyLiveDeployment } from '../../scripts/check-live-deployment';

const siteUrl = 'https://d1bl4kbn7rv5h7.cloudfront.net';
const expectedSha = 'a'.repeat(40);
const nonexistentPath = '/this-route-does-not-exist/';
const commitStampPath = '/deployed-commit.txt';

const requiredRoutes = [
  '/',
  '/tiers/',
  '/compatibility/',
  '/docs/',
  '/docs/getting-started/',
  '/docs/security/',
  '/support/',
  '/data/tiers.json',
  '/data/compatibility.json',
] as const;

type StubResponse = { status: number; body?: string };

const passingResponses = (): Record<string, StubResponse> => {
  const responses: Record<string, StubResponse> = {
    [nonexistentPath]: { status: 404, body: '<h1>Page not found</h1>' },
    [commitStampPath]: { status: 200, body: `${expectedSha}\n` },
  };
  for (const route of requiredRoutes) responses[route] = { status: 200, body: 'ok' };
  return responses;
};

const buildFetchStub = (overrides: Record<string, StubResponse | StubResponse[]>) => {
  const responses = { ...passingResponses(), ...overrides };
  const callCounts = new Map<string, number>();
  return vi.fn(async (input: string | URL) => {
    const path = new URL(String(input)).pathname;
    const attempt = callCounts.get(path) ?? 0;
    callCounts.set(path, attempt + 1);
    const entry = responses[path];
    const resolved = Array.isArray(entry) ? (entry[Math.min(attempt, entry.length - 1)] ?? entry.at(-1)) : entry;
    return new Response(resolved?.body ?? '', { status: resolved?.status ?? 200 });
  });
};

describe('verifyLiveDeployment', () => {
  it('resolves without throwing when every route, the branded 404, and the commit stamp all pass', async () => {
    const fetchImpl = buildFetchStub({});

    await expect(
      verifyLiveDeployment({ siteUrl, expectedSha, fetchImpl, maxAttempts: 1 }),
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledWith(`${siteUrl}${nonexistentPath}`);
  });

  it('throws an aggregated error listing every persistently failing check by path, not just the first', async () => {
    const fetchImpl = buildFetchStub({
      '/tiers/': { status: 500 },
      [commitStampPath]: { status: 200, body: 'deadbeef' },
    });

    await expect(
      verifyLiveDeployment({ siteUrl, expectedSha, fetchImpl, maxAttempts: 2, retryDelayMs: 0 }),
    ).rejects.toThrow(/\/tiers\/[\s\S]*deployed-commit\.txt/u);
  });

  it('throws when the nonexistent path does not return a branded 404', async () => {
    const fetchImpl = buildFetchStub({
      [nonexistentPath]: { status: 200, body: 'ok' },
    });

    await expect(
      verifyLiveDeployment({ siteUrl, expectedSha, fetchImpl, maxAttempts: 2, retryDelayMs: 0 }),
    ).rejects.toThrow(nonexistentPath);
  });

  it('throws when the deployed-commit.txt stamp does not match the expected SHA', async () => {
    const fetchImpl = buildFetchStub({
      [commitStampPath]: { status: 200, body: 'deadbeef' },
    });

    await expect(
      verifyLiveDeployment({ siteUrl, expectedSha, fetchImpl, maxAttempts: 2, retryDelayMs: 0 }),
    ).rejects.toThrow(commitStampPath);
  });

  it('does not report a check as failing when a transient failure succeeds on a later retry', async () => {
    const fetchImpl = buildFetchStub({
      '/support/': [{ status: 503 }, { status: 200, body: 'ok' }],
    });

    await expect(
      verifyLiveDeployment({ siteUrl, expectedSha, fetchImpl, maxAttempts: 2, retryDelayMs: 0 }),
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledWith(`${siteUrl}/support/`);
  });
});
