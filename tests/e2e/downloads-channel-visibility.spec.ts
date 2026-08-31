import { chromium, expect, test } from '@playwright/test';

// Closes WR-02 (04.2-REVIEW.md / 04.2-VERIFICATION.md behavior_unverified item): proves
// DownloadsChannelVisibility.astro's actual browser script — resolveSiteChannel() ->
// releaseChannelFor() -> querySelector + removeAttribute('hidden') — reveals exactly the
// [data-channel] section matching the site's hostname, and only that one (DOWN-01). Only the
// pure helper functions this script calls were previously unit-tested; this spec is the first to
// exercise the DOM wiring itself, mirroring tester-guide-visibility.spec.ts's technique.
//
// Runs against the `production` project's baseURL (127.0.0.1:4321, serving `dist/` via
// scripts/serve-static-build.ts, no CloudFront/KVS credential involved — per AUTH-04's recorded
// exclusion, reused here since /downloads/ needs no tester-password gate either).

test.describe('no-JS / script-not-run default (fail closed — no wrong channel shown)', () => {
  test.use({ javaScriptEnabled: false });

  test('Test A: with the toggle script never executing, every channel section stays hidden', async ({
    page,
  }) => {
    await page.goto('/downloads/');

    await expect(page.locator('[data-channel="test-pilots"]')).toBeHidden();
    await expect(page.locator('[data-channel="beta"]')).toBeHidden();
    await expect(page.locator('[data-channel="stable"]')).toBeHidden();
  });
});

// Tests B, C, D need window.location.hostname to genuinely resolve to a specific environment's
// hostname so resolveSiteChannel() (src/lib/site-channel.ts) makes its real channel decision.
// Directly overriding window.location.hostname does not work against this Chromium build (see
// tester-guide-visibility.spec.ts's comment on the same limitation), so each test launches its
// own Chromium instance with --host-resolver-rules mapping the target hostname to 127.0.0.1, then
// navigates to that hostname directly against the already-running `production` project webServer.
async function gotoAsHostname(hostname: string) {
  const browser = await chromium.launch({
    args: [`--host-resolver-rules=MAP ${hostname} 127.0.0.1`],
  });
  const page = await browser.newPage();
  await page.goto(`http://${hostname}:4321/downloads/`);
  return { browser, page };
}

test.describe('working-script behavior — per-hostname channel reveal (DOWN-01)', () => {
  test('Test B: a testpilots-hostname session reveals only the test-pilots section', async () => {
    const { browser, page } = await gotoAsHostname('testpilots.puppet-stagehand.com');
    try {
      await expect(page.locator('[data-channel="test-pilots"]')).toBeVisible();
      await expect(page.locator('[data-channel="beta"]')).toBeHidden();
      await expect(page.locator('[data-channel="stable"]')).toBeHidden();
    } finally {
      await browser.close();
    }
  });

  test('Test C: a beta-hostname session reveals only the beta section', async () => {
    const { browser, page } = await gotoAsHostname('beta.puppet-stagehand.com');
    try {
      await expect(page.locator('[data-channel="beta"]')).toBeVisible();
      await expect(page.locator('[data-channel="test-pilots"]')).toBeHidden();
      await expect(page.locator('[data-channel="stable"]')).toBeHidden();
    } finally {
      await browser.close();
    }
  });

  test('Test D: a stable-hostname session reveals only the stable section', async () => {
    const { browser, page } = await gotoAsHostname('www.puppet-stagehand.com');
    try {
      await expect(page.locator('[data-channel="stable"]')).toBeVisible();
      await expect(page.locator('[data-channel="test-pilots"]')).toBeHidden();
      await expect(page.locator('[data-channel="beta"]')).toBeHidden();
    } finally {
      await browser.close();
    }
  });
});
