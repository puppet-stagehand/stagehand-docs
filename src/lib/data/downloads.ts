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
  /** filename -> the release asset's actual GitHub browser_download_url. */
  downloadUrls: Record<string, string>;
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

const RELEASE_CHANNELS: readonly ReleaseChannel[] = ['test-pilots', 'beta', 'stable'];

// Matches `Channel: <name>` and the backtick-wrapped `` Channel: `<name>` `` variant the release
// workflow actually emits (RESEARCH.md Code Examples, verified against the workflow source).
const RELEASE_CHANNEL_PATTERN = /^Channel:\s*`?([\w-]+)`?/m;

const emptyDownloads = (): DownloadsByChannel => ({
  'test-pilots': null,
  beta: null,
  stable: null,
});

// GitHub's Releases list endpoint is sorted newest-first by created_at (documented default), so
// the first body match for a channel IS that channel's latest release.
const findLatestForChannel = (
  releases: GitHubRelease[],
  channel: ReleaseChannel,
): GitHubRelease | undefined =>
  releases.find((candidate) => RELEASE_CHANNEL_PATTERN.exec(candidate.body ?? '')?.[1] === channel);

/**
 * Parses standard `sha256sum` output ("<hex-digest>  <filename>" per line) into a
 * filename -> digest map. Blank or malformed lines are skipped, never thrown.
 */
export const parseChecksums = (text: string): Record<string, string> => {
  const checksums: Record<string, string> = {};
  for (const line of text.trim().split('\n')) {
    const [digest, filename] = line.trim().split(/\s+/);
    if (digest && filename) checksums[filename] = digest;
  }
  return checksums;
};

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
 * pattern) for the public puppet-stagehand/stagehand-release Releases API. Any failure — a
 * thrown error, a non-ok status, or unparseable JSON from the releases-list fetch — resolves
 * every channel to null rather than throwing out of loadDownloads (D-07/Pitfall 8): the Astro
 * build must stay green even though this real repo does not exist yet. A per-channel SHA256SUMS
 * fetch/parse failure degrades only that one channel to null, never its siblings (GATE-07's
 * literal "no silent fallback" wording) — a present channel and an absent channel never share or
 * leak data in the same call.
 */
export const loadDownloads = async (
  fetchImpl: typeof fetch = fetch,
): Promise<DownloadsByChannel> => {
  let releases: GitHubRelease[];
  try {
    const response = await fetchImpl(RELEASES_URL);
    if (!response.ok) return emptyDownloads();
    releases = (await response.json()) as GitHubRelease[];
  } catch {
    return emptyDownloads();
  }

  const result = emptyDownloads();

  for (const channel of RELEASE_CHANNELS) {
    const matchedRelease = findLatestForChannel(releases, channel);
    if (!matchedRelease) continue;

    const checksumsAsset = matchedRelease.assets.find((asset) => asset.name === 'SHA256SUMS');
    if (!checksumsAsset) continue;

    try {
      const checksumsResponse = await fetchImpl(checksumsAsset.browser_download_url);
      if (!checksumsResponse.ok) continue;
      const checksums = parseChecksums(await checksumsResponse.text());
      if (Object.keys(checksums).length === 0) continue;

      const downloadUrls: Record<string, string> = {};
      for (const asset of matchedRelease.assets) {
        if (asset.name === 'SHA256SUMS') continue;
        downloadUrls[asset.name] = asset.browser_download_url;
      }

      result[channel] = {
        version: matchedRelease.tag_name,
        publishedAt: matchedRelease.published_at,
        checksums,
        downloadUrls,
        htmlUrl: matchedRelease.html_url,
      };
    } catch {
      // Leave this channel null — a bad SHA256SUMS for one channel must never affect the others.
      continue;
    }
  }

  return result;
};
