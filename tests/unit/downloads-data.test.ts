import { describe, expect, it, vi } from 'vitest';
import { loadDownloads, parseChecksums } from '../../src/lib/data/downloads';

const releasesUrl = 'https://api.github.com/repos/puppet-stagehand/stagehand-release/releases';

const checksumsUrl = (tag: string) =>
  `https://github.com/puppet-stagehand/stagehand-release/releases/download/${tag}/SHA256SUMS`;

const sha256sumsText = (tag: string) =>
  `${'a'.repeat(64)}  puppet-installer-linux-amd64\n${'b'.repeat(64)}  puppet-installer-darwin-arm64\n\n${tag}\n`;

const binaryAssetUrl = (tag: string, filename: string) =>
  `https://github.com/puppet-stagehand/stagehand-release/releases/download/${tag}/${filename}`;

const release = (options: {
  tag: string;
  channel: string | null;
  publishedAt?: string;
  withChecksumsAsset?: boolean;
}) => {
  const { tag, channel, publishedAt = '2026-08-28T00:00:00Z', withChecksumsAsset = true } = options;
  return {
    tag_name: tag,
    body:
      channel === null ? 'No channel here.' : `Single-binary installer.\nChannel: \`${channel}\`\n`,
    published_at: publishedAt,
    html_url: `https://github.com/puppet-stagehand/stagehand-release/releases/tag/${tag}`,
    assets: withChecksumsAsset
      ? [
          { name: 'SHA256SUMS', browser_download_url: checksumsUrl(tag) },
          {
            name: 'puppet-installer-linux-amd64',
            browser_download_url: binaryAssetUrl(tag, 'puppet-installer-linux-amd64'),
          },
          {
            name: 'puppet-installer-darwin-arm64',
            browser_download_url: binaryAssetUrl(tag, 'puppet-installer-darwin-arm64'),
          },
        ]
      : [],
  };
};

const buildFetchStub = (
  releases: ReturnType<typeof release>[],
  checksumsBodies: Record<string, string | { status: number }> = {},
) =>
  // Second param kept so the mock's call-arity matches typeof fetch's signature.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = String(input);
    if (url === releasesUrl) return new Response(JSON.stringify(releases), { status: 200 });
    for (const [assetUrl, body] of Object.entries(checksumsBodies)) {
      if (url === assetUrl) {
        if (typeof body === 'string') return new Response(body, { status: 200 });
        return new Response('', { status: body.status });
      }
    }
    // Any release's own checksums URL not explicitly stubbed above still resolves, using the
    // release's own tag to build a valid SHA256SUMS body — keeps fixtures terse per test.
    const matchingRelease = releases.find((candidate) => url === checksumsUrl(candidate.tag_name));
    if (matchingRelease) {
      return new Response(sha256sumsText(matchingRelease.tag_name), { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  });

describe('loadDownloads — channel-body parsing and per-channel data', () => {
  it('resolves a channel whose release body contains the literal backtick-wrapped Channel line', async () => {
    const testPilotsRelease = release({ tag: 'v1.2.0', channel: 'test-pilots' });
    const fetchImpl = buildFetchStub([testPilotsRelease]);

    const downloads = await loadDownloads(fetchImpl);

    expect(downloads['test-pilots']).toEqual({
      version: 'v1.2.0',
      publishedAt: '2026-08-28T00:00:00Z',
      checksums: {
        'puppet-installer-linux-amd64': 'a'.repeat(64),
        'puppet-installer-darwin-arm64': 'b'.repeat(64),
      },
      downloadUrls: {
        'puppet-installer-linux-amd64': binaryAssetUrl('v1.2.0', 'puppet-installer-linux-amd64'),
        'puppet-installer-darwin-arm64': binaryAssetUrl('v1.2.0', 'puppet-installer-darwin-arm64'),
      },
      htmlUrl: 'https://github.com/puppet-stagehand/stagehand-release/releases/tag/v1.2.0',
    });
  });

  it('never matches a release whose body names a different or no channel', async () => {
    const stableRelease = release({ tag: 'v2.0.0', channel: 'stable' });
    const noChannelRelease = release({ tag: 'v0.9.0', channel: null });
    const fetchImpl = buildFetchStub([stableRelease, noChannelRelease]);

    const downloads = await loadDownloads(fetchImpl);

    expect(downloads['test-pilots']).toBeNull();
    expect(downloads.beta).toBeNull();
    expect(downloads.stable).not.toBeNull();
    expect(downloads.stable?.version).toBe('v2.0.0');
  });

  it('resolves a present channel and an absent channel independently in the same call — no silent fallback (GATE-07)', async () => {
    const testPilotsRelease = release({ tag: 'v1.3.0', channel: 'test-pilots' });
    const betaRelease = release({ tag: 'v1.3.0-beta', channel: 'beta' });
    const fetchImpl = buildFetchStub([testPilotsRelease, betaRelease]);

    const downloads = await loadDownloads(fetchImpl);

    expect(downloads['test-pilots']).not.toBeNull();
    expect(downloads['test-pilots']?.version).toBe('v1.3.0');
    expect(downloads.beta).not.toBeNull();
    expect(downloads.beta?.version).toBe('v1.3.0-beta');
    expect(downloads.stable).toBeNull();
  });

  it('degrades exactly one channel to null when its SHA256SUMS asset fetch fails, leaving the others resolved', async () => {
    const testPilotsRelease = release({ tag: 'v1.4.0', channel: 'test-pilots' });
    const betaRelease = release({ tag: 'v1.4.0-beta', channel: 'beta' });
    const fetchImpl = buildFetchStub([testPilotsRelease, betaRelease], {
      [checksumsUrl('v1.4.0-beta')]: { status: 404 },
    });

    const downloads = await loadDownloads(fetchImpl);

    expect(downloads['test-pilots']).not.toBeNull();
    expect(downloads.beta).toBeNull();
  });

  it('degrades exactly one channel to null when its SHA256SUMS asset is unparseable text', async () => {
    const testPilotsRelease = release({ tag: 'v1.5.0', channel: 'test-pilots' });
    const fetchImpl = buildFetchStub([testPilotsRelease], {
      [checksumsUrl('v1.5.0')]: '   \n\n   \n',
    });

    const downloads = await loadDownloads(fetchImpl);

    expect(downloads['test-pilots']).toBeNull();
  });

  it('resolves to all-null, never throws, when the releases-list body is an object instead of an array (CR-01)', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === releasesUrl) {
        return new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
          status: 200,
        });
      }
      return new Response('Not Found', { status: 404 });
    });

    await expect(loadDownloads(fetchImpl)).resolves.toEqual({
      'test-pilots': null,
      beta: null,
      stable: null,
    });
  });

  it('resolves to all-null, never throws, when a matched release’s assets field is null (CR-01)', async () => {
    const malformedRelease = {
      tag_name: 'v9.9.9',
      body: 'Channel: `test-pilots`',
      published_at: '2026-08-30T00:00:00Z',
      html_url: 'https://github.com/puppet-stagehand/stagehand-release/releases/tag/v9.9.9',
      assets: null,
    };
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === releasesUrl) {
        return new Response(JSON.stringify([malformedRelease]), { status: 200 });
      }
      return new Response('Not Found', { status: 404 });
    });

    await expect(loadDownloads(fetchImpl)).resolves.toEqual({
      'test-pilots': null,
      beta: null,
      stable: null,
    });
  });
});

describe('parseChecksums', () => {
  it('parses standard sha256sum output into a filename -> digest map', () => {
    const text = `${'c'.repeat(64)}  puppet-installer-linux-amd64\n${'d'.repeat(64)}  puppet-installer-windows-amd64.exe\n`;

    expect(parseChecksums(text)).toEqual({
      'puppet-installer-linux-amd64': 'c'.repeat(64),
      'puppet-installer-windows-amd64.exe': 'd'.repeat(64),
    });
  });

  it('skips blank or malformed lines without throwing', () => {
    const text = `${'e'.repeat(64)}  puppet-installer-linux-amd64\n\n   \nnot-a-valid-line\n`;

    expect(parseChecksums(text)).toEqual({
      'puppet-installer-linux-amd64': 'e'.repeat(64),
    });
  });

  it('returns an empty map for entirely blank input', () => {
    expect(parseChecksums('   \n\n  ')).toEqual({});
  });
});
