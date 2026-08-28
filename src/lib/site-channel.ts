/**
 * Resolves which deployed environment ("channel") a page is being viewed on, purely from
 * `window.location.hostname`. Static-only site + immutable promotion (testpilots -> beta ->
 * stable, one build, no per-environment rebuild) means this can never be a build-time or
 * server-side decision — it must be resolved at runtime in the browser.
 *
 * Deliberately DOM-free and takes the hostname as a plain string argument so it is
 * unit-testable without a browser environment, and reusable anywhere a channel-scoped
 * visibility decision is needed (e.g. Phase 04.2's downloads page) without modification.
 */
export type SiteChannel = 'testpilots' | 'beta' | 'stable' | 'unknown';

export function resolveSiteChannel(hostname: string): SiteChannel {
  if (hostname === 'testpilots.puppet-stagehand.com') return 'testpilots';
  if (hostname === 'beta.puppet-stagehand.com') return 'beta';
  if (hostname === 'www.puppet-stagehand.com' || hostname === 'puppet-stagehand.com') {
    return 'stable';
  }
  return 'unknown';
}
