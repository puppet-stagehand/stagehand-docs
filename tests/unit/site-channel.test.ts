import { describe, expect, it } from 'vitest';
import { resolveSiteChannel } from '../../src/lib/site-channel';

describe('resolveSiteChannel', () => {
  it.each([
    ['testpilots.puppet-stagehand.com', 'testpilots'],
    ['beta.puppet-stagehand.com', 'beta'],
    ['www.puppet-stagehand.com', 'stable'],
    ['puppet-stagehand.com', 'stable'],
    ['localhost', 'unknown'],
    ['d111111abcdef8.cloudfront.net', 'unknown'],
  ] as const)(
    'maps %s to %s via exact hostname match, no substring matching',
    (hostname, expected) => {
      expect(resolveSiteChannel(hostname)).toBe(expected);
    },
  );
});
