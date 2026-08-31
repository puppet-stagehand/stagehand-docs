import type { SiteChannel } from '../site-channel';

// Corrected public mirror target (D-01/D-02) — the private puppetlabs-seteam/puppet-installer
// repo is never referenced anywhere in this file. As of 2026-08-28 this repo does not exist yet
// (D-07); every failure path below (404, network error, unparseable body) must degrade to the
// same honest-unavailable result, never throw out of loadDownloads (Pitfall 8).
const RELEASES_URL = 'https://api.github.com/repos/puppet-stagehand/stagehand-release/releases';

export interface ChannelRelease {
  version: string;
  publishedAt: string;
  checksums: Record<string, string>;
  htmlUrl: string;
}

/** The release data's own channel keys — deliberately NOT SiteChannel's spelling (Pitfall 3). */
export type ReleaseChannel = 'test-pilots' | 'beta' | 'stable';

export type DownloadsByChannel = Record<ReleaseChannel, ChannelRelease | null>;

interface GitHubRelease {
  tag_name: string;
  body: string | null;
  published_at: string;
  html_url: string;
  assets: { name: string; browser_download_url: string }[];
}

const emptyDownloads = (): DownloadsByChannel => ({
  'test-pilots': null,
  beta: null,
  stable: null,
});

/**
 * The ONE place resolveSiteChannel()'s 'testpilots' output is ever mapped to the release data's
 * 'test-pilots' key (Pitfall 3). Never compare the two vocabularies directly anywhere else.
 */
export const releaseChannelFor = (channel: SiteChannel): ReleaseChannel | undefined => {
  if (channel === 'testpilots') return 'test-pilots';
  if (channel === 'beta') return 'beta';
  if (channel === 'stable') return 'stable';
  return undefined;
};

/**
 * Build-time, injectable-fetch loader (mirrors scripts/check-live-deployment.ts's fetchImpl
 * pattern) for the public puppet-stagehand/stagehand-release Releases API. Task 1 only fetches
 * the releases list and resolves every channel to null — channel-body parsing and SHA256SUMS
 * fetching land in Task 2, without changing this function's fail-closed contract.
 */
export const loadDownloads = async (
  fetchImpl: typeof fetch = fetch,
): Promise<DownloadsByChannel> => {
  try {
    const response = await fetchImpl(RELEASES_URL);
    if (!response.ok) return emptyDownloads();
    // Task 1 does not yet parse `Channel:` bodies or fetch SHA256SUMS — every channel stays
    // null regardless of the parsed body's contents until Task 2 extends this function.
    (await response.json()) as GitHubRelease[];
  } catch {
    return emptyDownloads();
  }

  return emptyDownloads();
};
