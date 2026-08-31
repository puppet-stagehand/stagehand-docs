import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { loadDownloads, releaseChannelFor } from '../../src/lib/data/downloads';

const emptyChannels = { 'test-pilots': null, beta: null, stable: null };

describe('loadDownloads', () => {
  it('resolves every channel to null when the releases list is an empty JSON array', async () => {
    const fetchImpl = vi.fn(async () => new Response('[]', { status: 200 }));

    await expect(loadDownloads(fetchImpl)).resolves.toEqual(emptyChannels);
  });

  it('resolves every channel to null, never throwing, when the releases fetch 404s (repo does not exist yet)', async () => {
    const fetchImpl = vi.fn(async () => new Response('Not Found', { status: 404 }));

    await expect(loadDownloads(fetchImpl)).resolves.toEqual(emptyChannels);
  });

  it('resolves every channel to null, never throwing, when fetchImpl itself rejects (network failure)', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network failure');
    });

    await expect(loadDownloads(fetchImpl)).resolves.toEqual(emptyChannels);
  });
});

describe('releaseChannelFor', () => {
  it('maps SiteChannel testpilots to the hyphenated release-data key test-pilots', () => {
    expect(releaseChannelFor('testpilots')).toBe('test-pilots');
  });

  it('maps SiteChannel beta to release channel beta', () => {
    expect(releaseChannelFor('beta')).toBe('beta');
  });

  it('maps SiteChannel stable to release channel stable', () => {
    expect(releaseChannelFor('stable')).toBe('stable');
  });

  it('returns undefined for SiteChannel unknown', () => {
    expect(releaseChannelFor('unknown')).toBeUndefined();
  });
});

describe('gated-paths.json', () => {
  it('never gates /downloads or any prefix of it — the downloads page is explicitly ungated (DOWN-03/D-06)', () => {
    const gatedPaths = JSON.parse(
      readFileSync(resolve(process.cwd(), 'infra/modules/static-site/gated-paths.json'), 'utf8'),
    ) as string[];

    for (const path of gatedPaths) {
      expect(path.startsWith('/downloads')).toBe(false);
    }
  });
});
